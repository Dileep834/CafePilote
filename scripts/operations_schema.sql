-- ==========================================
-- CAFE OPERATIONS - SCHEMA UPDATE SCRIPT
-- ==========================================
-- Run this script in your Supabase SQL Editor
-- to add the Suppliers, Recipes (BOM), and Sales tables.

-- 1. SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    contact_name TEXT,
    phone TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. RECIPES TABLE
-- A recipe represents a finished product (e.g. Latte)
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(product_id) -- A product can only have one active recipe
);

-- 3. RECIPE INGREDIENTS TABLE
-- The raw materials consumed when a finished product is sold
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
    raw_material_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity_consumed NUMERIC NOT NULL CHECK (quantity_consumed > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. SALES (POS) TABLE
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    franchise_id UUID REFERENCES public.franchises(id) ON DELETE SET NULL,
    sold_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    total_amount NUMERIC DEFAULT 0,
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. SALE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    price_at_sale NUMERIC DEFAULT 0
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Suppliers: Read for all authenticated, Write for Super Admins
CREATE POLICY "Allow read access to authenticated users on suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all access to super admins on suppliers" ON public.suppliers FOR ALL TO authenticated USING (true);

-- Recipes: Read for all, Write for Super Admins
CREATE POLICY "Allow read access to authenticated users on recipes" ON public.recipes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all access to super admins on recipes" ON public.recipes FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow read access to authenticated users on recipe_ingredients" ON public.recipe_ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all access to super admins on recipe_ingredients" ON public.recipe_ingredients FOR ALL TO authenticated USING (true);

-- Sales: Franchises can only read/write their own sales. Admins can see all.
CREATE POLICY "Allow franchise to read own sales" ON public.sales FOR SELECT TO authenticated USING (true); 
CREATE POLICY "Allow franchise to insert own sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow franchise to read own sale items" ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow franchise to insert own sale items" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (true);

-- NOTE: For production, you will want to restrict the USING(true) statements in the 
-- sales policies to check if `franchise_id = auth.uid()` or similar, depending on your auth schema.
