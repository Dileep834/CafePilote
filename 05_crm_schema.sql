-- ==========================================
-- CRM MODULE - SCHEMA UPGRADE
-- ==========================================
-- Run this script in your Supabase SQL Editor

-- 1. Create Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    loyalty_points NUMERIC DEFAULT 0,
    total_spend NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;

-- 2. Alter pos_orders to support Customer Profile Linking
ALTER TABLE public.pos_orders 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;
