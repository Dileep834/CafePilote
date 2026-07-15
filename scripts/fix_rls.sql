-- Drop existing restricted policies
DROP POLICY IF EXISTS "Allow read access to all authenticated users for categories" ON categories;
DROP POLICY IF EXISTS "Allow read access to all authenticated users for products" ON products;
DROP POLICY IF EXISTS "Allow full access for authenticated users (MVP)" ON categories;
DROP POLICY IF EXISTS "Allow full access for authenticated users (MVP)" ON products;

-- Create open policies for the MVP so the UI can read/write without a real Supabase Auth session
CREATE POLICY "Allow public access to categories" ON categories FOR ALL USING (true);
CREATE POLICY "Allow public access to products" ON products FOR ALL USING (true);
CREATE POLICY "Allow public access to inventory" ON inventory FOR ALL USING (true);
CREATE POLICY "Allow public access to daily_stock" ON daily_stock FOR ALL USING (true);
