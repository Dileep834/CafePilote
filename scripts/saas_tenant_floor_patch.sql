-- ============================================================
-- CafePilots SaaS: company scoping for floors / layouts
-- ============================================================
-- Run after: scripts/floor_layout_schema.sql
--
-- Subscriptions live in scripts/company_subscriptions_schema.sql
-- (or scripts/ensure_hq_company.sql). Do not duplicate here.
-- ============================================================

ALTER TABLE public.floors
  ADD COLUMN IF NOT EXISTS company_id text;

ALTER TABLE public.floor_layouts
  ADD COLUMN IF NOT EXISTS company_id text;

CREATE INDEX IF NOT EXISTS floors_company_idx
  ON public.floors (company_id);

CREATE INDEX IF NOT EXISTS floor_layouts_company_idx
  ON public.floor_layouts (company_id);
