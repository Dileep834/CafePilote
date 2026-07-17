-- POS Orders Tables
-- Run this in your Supabase SQL Editor

-- 1. Create pos_orders table
CREATE TABLE IF NOT EXISTS public.pos_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outlet_id UUID REFERENCES public.outlets(id) ON DELETE CASCADE,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
    tendered_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    change_due DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create pos_order_items table
CREATE TABLE IF NOT EXISTS public.pos_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.pos_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.pos_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_order_items ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Allow authenticated users to insert and select)
CREATE POLICY "Allow authenticated access to pos_orders" ON public.pos_orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access to pos_order_items" ON public.pos_order_items FOR ALL TO authenticated USING (true);

-- 5. Trigger for updated_at
CREATE TRIGGER update_pos_orders_modtime BEFORE UPDATE ON public.pos_orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
