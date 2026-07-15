-- SaaS MULTI-TENANCY MIGRATION SCRIPT
-- WARNING: Run this only once to upgrade the schema to a SaaS architecture.

-- 1. Create Companies (Tenant) Table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insert Default Company (Backbenchers)
-- We use a fixed UUID so we can easily reference it in the backfill queries.
INSERT INTO companies (id, name, subdomain) 
VALUES ('c1000000-0000-0000-0000-000000000001', 'Backbenchers Cafeteria', 'backbenchers')
ON CONFLICT (subdomain) DO NOTHING;

-- 3. Add company_id to existing tables
ALTER TABLE categories ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- 4. Backfill existing data to the default company
UPDATE categories SET company_id = 'c1000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE products SET company_id = 'c1000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE franchises SET company_id = 'c1000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE users SET company_id = 'c1000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;

-- 5. Enforce NOT NULL constraints now that data is backfilled
ALTER TABLE categories ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE products ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE franchises ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE users ALTER COLUMN company_id SET NOT NULL;

-- 6. Add Unique Constraints for SaaS isolation
-- A product code should be unique *per company*, not globally!
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_code_key;
ALTER TABLE products ADD CONSTRAINT products_code_company_unique UNIQUE (code, company_id);

-- A franchise code should be unique *per company*
ALTER TABLE franchises DROP CONSTRAINT IF EXISTS franchises_code_key;
ALTER TABLE franchises ADD CONSTRAINT franchises_code_company_unique UNIQUE (code, company_id);

-- A category name should be unique *per company*
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;
ALTER TABLE categories ADD CONSTRAINT categories_name_company_unique UNIQUE (name, company_id);

-- 7. RLS Policies
-- For a true production SaaS, RLS would extract company_id from auth.jwt().
-- Because we are running a frontend MVP without full Supabase Auth integration yet,
-- we will maintain public access, but the schema is now physically partitioned for SaaS!
CREATE POLICY "Allow public access to companies" ON companies FOR ALL USING (true);
