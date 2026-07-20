-- CafePilots Phase 3 — SaaS Platform & Enterprise Intelligence
-- Run AFTER phase1_production_schema.sql and phase2_enterprise_schema.sql

-- =====================================================
-- Outlet hierarchy (Corporate → Region → City → Store)
-- =====================================================
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS parent_outlet_id UUID;
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS hierarchy_level TEXT DEFAULT 'store';
-- hierarchy_level: corporate | region | city | store
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS region_code TEXT;
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS city_code TEXT;

CREATE INDEX IF NOT EXISTS idx_outlets_parent ON outlets (parent_outlet_id);
CREATE INDEX IF NOT EXISTS idx_outlets_company_level ON outlets (company_id, hierarchy_level);

-- =====================================================
-- Franchise / brand economics
-- =====================================================
CREATE TABLE IF NOT EXISTS franchise_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  brand_name TEXT NOT NULL,
  franchisee_name TEXT,
  royalty_pct NUMERIC(6,3) DEFAULT 0,
  brand_fee_monthly NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS franchise_royalty_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID REFERENCES franchise_agreements(id) ON DELETE CASCADE,
  company_id UUID,
  outlet_id UUID,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  sales_base NUMERIC(14,2) DEFAULT 0,
  royalty_amount NUMERIC(14,2) DEFAULT 0,
  brand_fee NUMERIC(14,2) DEFAULT 0,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- Inter-store stock transfer
-- =====================================================
CREATE TABLE IF NOT EXISTS stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  from_outlet_id UUID NOT NULL,
  to_outlet_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  -- draft | requested | approved | in_transit | received | cancelled
  notes TEXT,
  requested_by UUID,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  quantity NUMERIC(14,3) NOT NULL,
  unit_cost NUMERIC(14,4),
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_company ON stock_transfers (company_id, created_at DESC);

-- =====================================================
-- Feature flags (tenant + outlet overrides)
-- =====================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  outlet_id UUID,
  flag_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  payload JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (company_id, outlet_id, flag_key)
);

-- =====================================================
-- Public API platform
-- =====================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scopes TEXT[] DEFAULT '{}',
  rate_limit_per_min INTEGER DEFAULT 60,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_company ON api_keys (company_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  url TEXT NOT NULL,
  secret TEXT,
  events TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_request_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  api_key_id UUID,
  method TEXT,
  path TEXT,
  status_code INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- BI snapshots + AI query log
-- =====================================================
CREATE TABLE IF NOT EXISTS bi_daily_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  outlet_id UUID,
  snapshot_date DATE NOT NULL,
  gross_sales NUMERIC(14,2) DEFAULT 0,
  net_sales NUMERIC(14,2) DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  avg_ticket NUMERIC(14,2) DEFAULT 0,
  refunds NUMERIC(14,2) DEFAULT 0,
  food_cost NUMERIC(14,2) DEFAULT 0,
  labour_cost NUMERIC(14,2) DEFAULT 0,
  waste_cost NUMERIC(14,2) DEFAULT 0,
  meta JSONB,
  UNIQUE NULLS NOT DISTINCT (company_id, outlet_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_bi_snap_outlet_date ON bi_daily_snapshots (outlet_id, snapshot_date DESC);

CREATE TABLE IF NOT EXISTS ai_query_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  outlet_id UUID,
  user_id UUID,
  query_text TEXT NOT NULL,
  intent TEXT,
  response_summary TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- Accounting export jobs
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting_export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  outlet_id UUID,
  provider TEXT NOT NULL,
  -- tally | zoho | quickbooks | busy | xero | csv
  period_start DATE,
  period_end DATE,
  status TEXT DEFAULT 'queued',
  file_url TEXT,
  error TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- =====================================================
-- Document vault metadata
-- =====================================================
CREATE TABLE IF NOT EXISTS document_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  outlet_id UUID,
  category TEXT NOT NULL,
  -- invoice | purchase_bill | gst | license | staff | other
  title TEXT NOT NULL,
  storage_path TEXT,
  mime_type TEXT,
  version INTEGER DEFAULT 1,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- Observability / health events
-- =====================================================
CREATE TABLE IF NOT EXISTS system_health_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  outlet_id UUID,
  component TEXT NOT NULL,
  -- api | queue | db | printer | realtime | sync
  severity TEXT DEFAULT 'info',
  message TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_health_created ON system_health_events (created_at DESC);

-- =====================================================
-- SaaS subscription extensions
-- =====================================================
ALTER TABLE company_subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE company_subscriptions ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'active';
ALTER TABLE company_subscriptions ADD COLUMN IF NOT EXISTS seat_limit INTEGER;
ALTER TABLE company_subscriptions ADD COLUMN IF NOT EXISTS usage_orders_mtd INTEGER DEFAULT 0;

-- Optional: central menu publish stamps
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_central BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
