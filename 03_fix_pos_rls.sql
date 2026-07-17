-- Fix POS Row Level Security
-- Run this in your Supabase SQL Editor

-- 1. Create a fully permissive policy for authenticated users on pos_orders
DROP POLICY IF EXISTS "Allow authenticated access to pos_orders" ON public.pos_orders;
CREATE POLICY "Allow authenticated access to pos_orders" ON public.pos_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Create a fully permissive policy for authenticated users on pos_order_items
DROP POLICY IF EXISTS "Allow authenticated access to pos_order_items" ON public.pos_order_items;
CREATE POLICY "Allow authenticated access to pos_order_items" ON public.pos_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Alternatively, if you want to bypass RLS entirely for the MVP phase:
ALTER TABLE public.pos_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_order_items DISABLE ROW LEVEL SECURITY;
