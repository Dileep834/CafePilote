-- ============================================================
-- CafePilots Product Availability Engine
-- ============================================================
-- Safe to re-run in Supabase SQL Editor.
-- Self-contained: creates outlet_ops_settings if Phase 1 was never applied.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Ops settings (required dependency; Lite default = inventory OFF)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outlet_ops_settings (
  outlet_id UUID PRIMARY KEY,
  inventory_tracking_enabled BOOLEAN NOT NULL DEFAULT false,
  allow_negative_stock BOOLEAN NOT NULL DEFAULT false,
  discount_pin_threshold_pct NUMERIC(5,2) NOT NULL DEFAULT 10,
  manager_pin_hash TEXT,
  inventory_enforcement_mode TEXT NOT NULL DEFAULT 'strict',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Existing Phase 1 installs still defaulted inventory ON — flip default for new rows.
ALTER TABLE public.outlet_ops_settings
  ALTER COLUMN inventory_tracking_enabled SET DEFAULT false;

-- Add enforcement column when table already existed without it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'outlet_ops_settings'
      AND column_name = 'inventory_enforcement_mode'
  ) THEN
    ALTER TABLE public.outlet_ops_settings
      ADD COLUMN inventory_enforcement_mode TEXT NOT NULL DEFAULT 'strict';
  END IF;
END $$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'outlet_ops_settings'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%inventory_enforcement_mode%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.outlet_ops_settings DROP CONSTRAINT IF EXISTS %I',
      r.conname
    );
  END LOOP;
END $$;

ALTER TABLE public.outlet_ops_settings
  DROP CONSTRAINT IF EXISTS outlet_ops_settings_inventory_enforcement_mode_check;

ALTER TABLE public.outlet_ops_settings
  ADD CONSTRAINT outlet_ops_settings_inventory_enforcement_mode_check
  CHECK (inventory_enforcement_mode IN ('track', 'warn', 'strict'));

-- ------------------------------------------------------------
-- 2) Product availability tables
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_availability_policy (
  outlet_id UUID PRIMARY KEY,
  inventory_tracking_enabled BOOLEAN NOT NULL DEFAULT false,
  availability_mode TEXT NOT NULL DEFAULT 'manual'
    CHECK (availability_mode IN (
      'manual',
      'always_available',
      'show_oos',
      'hide',
      'move_category',
      'warn_sale'
    )),
  inventory_enforcement TEXT NOT NULL DEFAULT 'strict'
    CHECK (inventory_enforcement IN ('track', 'warn', 'strict')),
  low_stock_threshold_pct NUMERIC(6,2) NOT NULL DEFAULT 15,
  low_stock_servings NUMERIC(12,4) NOT NULL DEFAULT 3,
  out_of_stock_category_id UUID NULL,
  auto_mark_unavailable BOOLEAN NOT NULL DEFAULT true,
  auto_restore BOOLEAN NOT NULL DEFAULT true,
  auto_notify BOOLEAN NOT NULL DEFAULT true,
  auto_sync BOOLEAN NOT NULL DEFAULT false,
  auto_category_move BOOLEAN NOT NULL DEFAULT false,
  warn_sale_requires_pin BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NULL
);

CREATE TABLE IF NOT EXISTS public.product_outlet_availability (
  outlet_id UUID NOT NULL,
  product_id UUID NOT NULL,
  computed_status TEXT NOT NULL DEFAULT 'available'
    CHECK (computed_status IN ('available', 'low_stock', 'out_of_stock', 'hidden')),
  manual_status TEXT NULL
    CHECK (manual_status IN ('available', 'out_of_stock', 'hidden', 'seasonal', 'discontinued')),
  manual_reason TEXT NULL,
  manual_until TIMESTAMPTZ NULL,
  manual_by UUID NULL,
  available_servings NUMERIC(12,4) NULL,
  low_stock_at NUMERIC(12,4) NULL,
  effective_status TEXT NOT NULL DEFAULT 'available'
    CHECK (effective_status IN (
      'available',
      'low_stock',
      'out_of_stock',
      'hidden',
      'inactive',
      'discontinued',
      'seasonal'
    )),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (outlet_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_outlet_availability_status
  ON public.product_outlet_availability (outlet_id, effective_status);

CREATE TABLE IF NOT EXISTS public.product_manual_override (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL,
  product_id UUID NOT NULL,
  manual_status TEXT NOT NULL
    CHECK (manual_status IN ('available', 'out_of_stock', 'hidden', 'seasonal', 'discontinued')),
  reason TEXT NULL,
  valid_until TIMESTAMPTZ NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cleared_at TIMESTAMPTZ NULL,
  cleared_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_product_manual_override_open
  ON public.product_manual_override (outlet_id, product_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.product_channel_visibility (
  outlet_id UUID NOT NULL,
  product_id UUID NOT NULL,
  channel TEXT NOT NULL
    CHECK (channel IN ('pos', 'qr', 'website', 'swiggy', 'zomato', 'ondc', 'whatsapp', 'api', 'kitchen')),
  visibility_mode TEXT NOT NULL DEFAULT 'inherit'
    CHECK (visibility_mode IN ('inherit', 'show', 'hide', 'oos_badge', 'unavailable_api')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NULL,
  PRIMARY KEY (outlet_id, product_id, channel)
);

CREATE TABLE IF NOT EXISTS public.product_availability_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL,
  product_id UUID NOT NULL,
  old_status TEXT NULL,
  new_status TEXT NOT NULL,
  reason TEXT NULL,
  source TEXT NOT NULL
    CHECK (source IN (
      'automatic',
      'manual',
      'sale',
      'refund',
      'purchase',
      'adjustment',
      'transfer',
      'waste',
      'recipe_update',
      'opening',
      'sync',
      'system'
    )),
  channel TEXT NULL,
  user_id UUID NULL,
  meta JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_availability_log_product
  ON public.product_availability_log (outlet_id, product_id, created_at DESC);

-- Seed policy rows from any existing ops settings (no-op if empty).
INSERT INTO public.product_availability_policy (
  outlet_id,
  inventory_tracking_enabled,
  availability_mode,
  inventory_enforcement,
  warn_sale_requires_pin,
  updated_at
)
SELECT
  s.outlet_id,
  COALESCE(s.inventory_tracking_enabled, false),
  CASE
    WHEN COALESCE(s.inventory_tracking_enabled, false) = false THEN 'manual'
    ELSE 'show_oos'
  END,
  COALESCE(s.inventory_enforcement_mode, 'strict'),
  false,
  now()
FROM public.outlet_ops_settings s
ON CONFLICT (outlet_id) DO NOTHING;
