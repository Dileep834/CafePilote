-- ==========================================
-- PURCHASES MODULE - SCHEMA UPGRADE
-- ==========================================
-- Run this script in your Supabase SQL Editor

-- 1. Ensure Suppliers table exists and bypass RLS for ease of use during MVP
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
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;

-- 2. Upgrade Purchase Orders Table
-- We are renaming franchise_id to outlet_id, and making sure vendor is a UUID linking to suppliers
DROP TABLE IF EXISTS public.purchase_order_items CASCADE;
DROP TABLE IF EXISTS public.purchase_orders CASCADE;

CREATE TABLE public.purchase_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    outlet_id UUID REFERENCES public.outlets(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Pending, Received, Cancelled
    expected_date DATE,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.purchase_orders DISABLE ROW LEVEL SECURITY;

-- 3. Create Purchase Order Items Table
CREATE TABLE public.purchase_order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    po_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC NOT NULL DEFAULT 0,
    total_price NUMERIC NOT NULL DEFAULT 0,
    received_quantity NUMERIC DEFAULT 0
);
ALTER TABLE public.purchase_order_items DISABLE ROW LEVEL SECURITY;
