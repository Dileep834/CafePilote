-- Create the purchase_order_items table
CREATE TABLE public.purchase_order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    po_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Enable all access for authenticated users" ON public.purchase_order_items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
