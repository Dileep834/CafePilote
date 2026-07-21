-- 06_enterprise_checkout.sql

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id UUID REFERENCES public.outlets(id) ON DELETE CASCADE,
    user_id UUID,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated access to audit_logs" ON public.audit_logs;
CREATE POLICY "Allow authenticated access to audit_logs" ON public.audit_logs FOR ALL TO authenticated USING (true);

-- 2. Expand pos_order_items for snapshots
ALTER TABLE public.pos_order_items ADD COLUMN IF NOT EXISTS snapshot_tax_rate DECIMAL(10, 2);
ALTER TABLE public.pos_order_items ADD COLUMN IF NOT EXISTS snapshot_tax_amount DECIMAL(10, 2);
ALTER TABLE public.pos_order_items ADD COLUMN IF NOT EXISTS snapshot_discount_amount DECIMAL(10, 2);
ALTER TABLE public.pos_order_items ADD COLUMN IF NOT EXISTS snapshot_recipe_version VARCHAR(50);

-- 3. Expand pos_orders for held order snapshots
ALTER TABLE public.pos_orders ADD COLUMN IF NOT EXISTS snapshot_data JSONB;

-- 4. Create the Enterprise Checkout RPC
CREATE OR REPLACE FUNCTION public.checkout_order(
    p_outlet_id UUID,
    p_customer_name VARCHAR,
    p_customer_phone VARCHAR,
    p_total_amount DECIMAL,
    p_tax_amount DECIMAL,
    p_tendered_amount DECIMAL,
    p_change_due DECIMAL,
    p_payment_method VARCHAR,
    p_items JSONB, -- Array of items: [{product_id, name, qty, price, total, tax_rate, tax_amount}]
    p_inventory_mode VARCHAR, -- 'strict', 'track', 'disabled'
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_qty DECIMAL;
    v_price DECIMAL;
    v_inv_qty DECIMAL;
BEGIN
    -- Basic Validation
    IF p_total_amount < 0 THEN
        RAISE EXCEPTION 'Negative total amount is not allowed';
    END IF;

    -- Create Order
    INSERT INTO public.pos_orders (
        outlet_id, customer_name, customer_phone, total_amount, tax_amount,
        payment_method, tendered_amount, change_due, status
    ) VALUES (
        p_outlet_id, p_customer_name, p_customer_phone, p_total_amount, p_tax_amount,
        p_payment_method, p_tendered_amount, p_change_due, 'completed'
    ) RETURNING id INTO v_order_id;

    -- Process Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::DECIMAL;
        v_price := (v_item->>'unit_price')::DECIMAL;

        IF v_qty <= 0 THEN
            RAISE EXCEPTION 'Quantity must be greater than zero for product %', v_product_id;
        END IF;

        IF v_price < 0 THEN
            RAISE EXCEPTION 'Price cannot be negative for product %', v_product_id;
        END IF;

        -- Inventory Deduction
        IF p_inventory_mode = 'strict' OR p_inventory_mode = 'track' THEN
            -- Lock the row for update to prevent race conditions
            SELECT current_quantity INTO v_inv_qty
            FROM public.inventory
            WHERE outlet_id = p_outlet_id AND product_id = v_product_id
            FOR UPDATE;

            IF NOT FOUND THEN
                IF p_inventory_mode = 'strict' THEN
                    RAISE EXCEPTION 'Inventory not found for product %', v_product_id;
                ELSE
                    -- Upsert 0 in track mode
                    INSERT INTO public.inventory (outlet_id, product_id, current_quantity)
                    VALUES (p_outlet_id, v_product_id, 0 - v_qty);
                    v_inv_qty := 0;
                END IF;
            END IF;

            IF p_inventory_mode = 'strict' AND v_inv_qty < v_qty THEN
                RAISE EXCEPTION 'Insufficient inventory for product % (Have %, Need %)', v_product_id, v_inv_qty, v_qty;
            END IF;

            -- Update Inventory
            IF FOUND THEN
                UPDATE public.inventory
                SET current_quantity = current_quantity - v_qty
                WHERE outlet_id = p_outlet_id AND product_id = v_product_id;
            END IF;

            -- Create Inventory Transaction Log
            INSERT INTO public.inventory_transactions (
                outlet_id, product_id, movement_type, quantity_delta,
                quantity_before, quantity_after, reference_type, reference_id, created_by
            ) VALUES (
                p_outlet_id, v_product_id, 'sale', -v_qty,
                COALESCE(v_inv_qty, 0), COALESCE(v_inv_qty, 0) - v_qty, 'pos_order', v_order_id, p_user_id
            );
        END IF;

        -- Create Order Item with Snapshots
        INSERT INTO public.pos_order_items (
            order_id, product_id, product_name, quantity, unit_price, total_price,
            snapshot_tax_rate, snapshot_tax_amount
        ) VALUES (
            v_order_id, v_product_id, v_item->>'product_name', v_qty, v_price, (v_item->>'total_price')::DECIMAL,
            COALESCE((v_item->>'tax_rate')::DECIMAL, 0), COALESCE((v_item->>'tax_amount')::DECIMAL, 0)
        );
    END LOOP;

    -- Audit Log
    INSERT INTO public.audit_logs (
        outlet_id, user_id, action, entity_type, entity_id, new_value
    ) VALUES (
        p_outlet_id, p_user_id, 'checkout', 'pos_order', v_order_id,
        jsonb_build_object('total', p_total_amount, 'items_count', jsonb_array_length(p_items))
    );

    RETURN jsonb_build_object('success', true, 'order_id', v_order_id);
END;
$$;
