-- Expands the existing user_role enum for the app-specific CafePilots roles.
-- Safe to run more than once on PostgreSQL/Supabase.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role'
      AND e.enumlabel = 'Franchise Owner'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role'
      AND e.enumlabel = 'Outlet Owner'
  ) THEN
    ALTER TYPE user_role RENAME VALUE 'Franchise Owner' TO 'Outlet Owner';
  END IF;
END $$;

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Outlet Owner';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Outlet Manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Cashier';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Kitchen Staff';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Inventory Staff';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Accountant';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Staff';
