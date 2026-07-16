-- 1. Rename the primary table
ALTER TABLE public.franchises RENAME TO outlets;

-- 2. Rename the constraints on the primary table
ALTER TABLE public.outlets RENAME CONSTRAINT franchises_pkey TO outlets_pkey;
ALTER TABLE public.outlets RENAME CONSTRAINT franchises_code_company_unique TO outlets_code_company_unique;

-- 3. Rename foreign key columns in other tables
ALTER TABLE public.users RENAME COLUMN franchise_id TO outlet_id;
ALTER TABLE public.inventory RENAME COLUMN franchise_id TO outlet_id;
ALTER TABLE public.daily_stock RENAME COLUMN franchise_id TO outlet_id;
ALTER TABLE public.sales RENAME COLUMN franchise_id TO outlet_id;

-- 4. Rename the Enum value for the roles
-- PostgreSQL 10+ supports RENAME VALUE
ALTER TYPE user_role RENAME VALUE 'Franchise Owner' TO 'Outlet Owner';

-- 5. (Optional but recommended) Re-create any triggers or functions if they explicitly referenced table names
-- Our update trigger was named update_franchises_modtime
ALTER TRIGGER update_franchises_modtime ON public.outlets RENAME TO update_outlets_modtime;
