-- ==========================================
-- CAFE OPERATIONS - MISSING INVENTORY SCHEMA
-- ==========================================
-- Run this script in your Supabase SQL Editor
-- to add the missing Purchase Orders, Waste, and Adjustment tables.

-- 1. PURCHASE ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    po_number VARCHAR(100) NOT NULL,
    vendor TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT DEFAULT 'Draft',
    total_amount NUMERIC DEFAULT 0,
    outlet_id UUID REFERENCES public.outlets(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(po_number, company_id)
);

-- 2. PURCHASE ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    po_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC NOT NULL,
    total NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. WASTE LOGS TABLE
CREATE TABLE IF NOT EXISTS public.waste_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    reason TEXT,
    logged_by TEXT,
    outlet_id UUID REFERENCES public.outlets(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. STOCK ADJUSTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.stock_adjustments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    adjustment NUMERIC NOT NULL, -- CAN BE POSITIVE OR NEGATIVE
    reason TEXT,
    approved_by TEXT,
    outlet_id UUID REFERENCES public.outlets(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users for now
CREATE POLICY "Allow read access to all authenticated users" ON public.purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access to all authenticated users" ON public.purchase_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access to all authenticated users" ON public.waste_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access to all authenticated users" ON public.stock_adjustments FOR SELECT TO authenticated USING (true);

-- Allow all access to all authenticated users for now (MVP)
CREATE POLICY "Allow all access to authenticated users" ON public.purchase_orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all access to authenticated users" ON public.purchase_order_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all access to authenticated users" ON public.waste_logs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all access to authenticated users" ON public.stock_adjustments FOR ALL TO authenticated USING (true);
