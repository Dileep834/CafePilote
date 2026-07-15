-- FIX SCRIPT: Database Constraints and RLS

-- 1. Remove the NOT NULL constraint on company_id for Super Admin global products
ALTER TABLE products ALTER COLUMN company_id DROP NOT NULL;
ALTER TABLE categories ALTER COLUMN company_id DROP NOT NULL;

-- 2. Completely disable Row Level Security (RLS) for the MVP phase
-- Since we are using mock logins instead of Supabase Auth, RLS will block our inserts.
-- We will re-enable this when we implement true JWT authentication later.
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE franchises DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE waste_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stock DISABLE ROW LEVEL SECURITY;

-- 3. Drop the conflicting policies just to be clean
DROP POLICY IF EXISTS "Allow public access to products MVP" ON products;
DROP POLICY IF EXISTS "Allow public access to categories MVP" ON categories;
