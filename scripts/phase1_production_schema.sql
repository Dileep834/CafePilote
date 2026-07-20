-- CafePilots Phase 1 — Production Readiness Schema
-- Run in Supabase SQL editor after backup.
-- Safe to re-run (IF NOT EXISTS).

-- =========================================================
-- OPS SETTINGS (per outlet)
-- =========================================================
CREATE TABLE IF NOT EXISTS outlet_ops_settings (
  outlet_id UUID PRIMARY KEY,
  inventory_tracking_enabled BOOLEAN NOT NULL DEFAULT true,
  allow_negative_stock BOOLEAN NOT NULL DEFAULT false,
  discount_pin_threshold_pct NUMERIC(5,2) NOT NULL DEFAULT 10,
  manager_pin_hash TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

-- =========================================================
-- INVENTORY LEDGER
-- =========================================================
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL,
  product_id UUID NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'opening','purchase','adjustment','sale','refund','waste','transfer_in','transfer_out'
  )),
  quantity_delta NUMERIC(14,4) NOT NULL,
  quantity_before NUMERIC(14,4),
  quantity_after NUMERIC(14,4),
  reference_type TEXT,
  reference_id TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_txn_outlet_created
  ON inventory_transactions (outlet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_txn_product
  ON inventory_transactions (outlet_id, product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_txn_ref
  ON inventory_transactions (reference_type, reference_id);

-- =========================================================
-- PAYMENT INTENTS (idempotency)
-- =========================================================
CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  outlet_id UUID,
  order_id UUID,
  amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','succeeded','failed','cancelled','refunded')),
  split_payload JSONB,
  gateway_payload JSONB,
  error_message TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_order
  ON payment_intents (order_id);

-- =========================================================
-- PAYMENT TRANSACTIONS (tender lines)
-- =========================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id UUID REFERENCES payment_intents(id),
  order_id UUID,
  outlet_id UUID,
  method TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  tendered_amount NUMERIC(12,2),
  change_due NUMERIC(12,2),
  provider_ref TEXT,
  status TEXT NOT NULL DEFAULT 'captured',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_txn_order
  ON payment_transactions (order_id);

-- =========================================================
-- REFUND TRANSACTIONS
-- =========================================================
CREATE TABLE IF NOT EXISTS refund_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL,
  order_id UUID NOT NULL,
  payment_intent_id UUID,
  refund_type TEXT NOT NULL CHECK (refund_type IN ('full','partial','item')),
  amount NUMERIC(12,2) NOT NULL,
  reason_code TEXT NOT NULL,
  reason_notes TEXT,
  method TEXT NOT NULL,
  items_payload JSONB,
  inventory_restored BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refund_outlet_created
  ON refund_transactions (outlet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refund_order
  ON refund_transactions (order_id);

-- =========================================================
-- SHIFT HEADERS & TRANSACTIONS
-- =========================================================
CREATE TABLE IF NOT EXISTS shift_headers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL,
  terminal_id TEXT NOT NULL DEFAULT 'default',
  opened_by UUID,
  closed_by UUID,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  opening_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_cash_counted NUMERIC(12,2),
  expected_cash NUMERIC(12,2),
  variance NUMERIC(12,2),
  total_sales NUMERIC(12,2) DEFAULT 0,
  total_refunds NUMERIC(12,2) DEFAULT 0,
  total_cash_in NUMERIC(12,2) DEFAULT 0,
  total_cash_out NUMERIC(12,2) DEFAULT 0,
  total_expenses NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_one_open_per_terminal
  ON shift_headers (outlet_id, terminal_id)
  WHERE status = 'open';

CREATE TABLE IF NOT EXISTS shift_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES shift_headers(id) ON DELETE CASCADE,
  txn_type TEXT NOT NULL CHECK (txn_type IN (
    'sale','refund','cash_in','cash_out','expense','petty_cash','adjustment'
  )),
  amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT,
  reference_id TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shift_txn_shift
  ON shift_transactions (shift_id, created_at);

-- =========================================================
-- AUDIT LOGS (immutable — no UPDATE/DELETE via app)
-- =========================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID,
  user_id UUID,
  user_name TEXT,
  user_role TEXT,
  terminal_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  manager_approval_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_outlet_created
  ON audit_logs (outlet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action
  ON audit_logs (action, created_at DESC);

-- Prevent deletes (best-effort; bypass with service role if needed)
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs are immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_no_update ON audit_logs;
CREATE TRIGGER trg_audit_no_update
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

-- =========================================================
-- MANAGER APPROVALS
-- =========================================================
CREATE TABLE IF NOT EXISTS manager_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  requested_by UUID,
  approved_by UUID,
  approved_by_name TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- POS ORDERS: idempotency + refund tracking columns
-- =========================================================
ALTER TABLE pos_orders
  ADD COLUMN IF NOT EXISTS payment_intent_id UUID,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shift_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_orders_idempotency
  ON pos_orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON TABLE inventory_transactions IS 'Phase 1 inventory ledger — every stock movement';
COMMENT ON TABLE payment_intents IS 'Phase 1 payment idempotency + lifecycle';
COMMENT ON TABLE refund_transactions IS 'Phase 1 refunds with inventory restore flag';
COMMENT ON TABLE shift_headers IS 'Phase 1 cash drawer shifts — one open per terminal';
COMMENT ON TABLE audit_logs IS 'Phase 1 immutable audit trail';
