-- CafePilots Phase 2 — Enterprise Operations Schema
-- Run after phase1_production_schema.sql

-- Order lifecycle event log
CREATE TABLE IF NOT EXISTS order_lifecycle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  outlet_id UUID,
  channel TEXT,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_id UUID,
  actor_name TEXT,
  duration_seconds INTEGER,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lifecycle_order ON order_lifecycle_events (order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_lifecycle_outlet ON order_lifecycle_events (outlet_id, created_at DESC);

-- App notifications
CREATE TABLE IF NOT EXISTS app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID,
  user_id UUID,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  entity_type TEXT,
  entity_id TEXT,
  severity TEXT DEFAULT 'info',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_app_notif_outlet ON app_notifications (outlet_id, created_at DESC);

-- Kitchen stations config
CREATE TABLE IF NOT EXISTS kitchen_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  UNIQUE (outlet_id, code)
);

-- Purchase GRN
CREATE TABLE IF NOT EXISTS purchase_grn (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL,
  po_id UUID,
  supplier_id UUID,
  grn_number TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  notes TEXT,
  received_by UUID,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_grn_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id UUID NOT NULL REFERENCES purchase_grn(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  quantity NUMERIC(14,4) NOT NULL,
  unit_cost NUMERIC(12,2),
  batch_number TEXT,
  expiry_date DATE
);

-- Purchase returns
CREATE TABLE IF NOT EXISTS purchase_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL,
  po_id UUID,
  supplier_id UUID,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  debit_note_amount NUMERIC(12,2) DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  quantity NUMERIC(14,4) NOT NULL,
  unit_cost NUMERIC(12,2)
);

-- Loyalty ledger
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID,
  customer_id UUID,
  customer_phone TEXT,
  points_delta INTEGER NOT NULL,
  balance_after INTEGER,
  reason TEXT,
  reference_type TEXT,
  reference_id TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inventory automation helpers
CREATE TABLE IF NOT EXISTS inventory_reorder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL,
  product_id UUID NOT NULL,
  reorder_level NUMERIC(14,4) NOT NULL DEFAULT 0,
  reorder_qty NUMERIC(14,4) NOT NULL DEFAULT 0,
  UNIQUE (outlet_id, product_id)
);

ALTER TABLE pos_orders
  ADD COLUMN IF NOT EXISTS channel TEXT,
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS preparing_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS served_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS kitchen_station TEXT,
  ADD COLUMN IF NOT EXISTS track_expiry BOOLEAN DEFAULT false;

COMMENT ON TABLE order_lifecycle_events IS 'Phase 2 order state transitions with actor + duration';
COMMENT ON TABLE app_notifications IS 'Phase 2 notification center';
COMMENT ON TABLE kitchen_stations IS 'Phase 2 multi-station KDS routing';
