-- Enterprise Offline POS: idempotency columns for duplicate-safe sync uploads
-- Run in Supabase SQL Editor. Safe to re-run.

ALTER TABLE IF EXISTS public.pos_orders
  ADD COLUMN IF NOT EXISTS client_uuid uuid,
  ADD COLUMN IF NOT EXISTS retry_token uuid,
  ADD COLUMN IF NOT EXISTS order_number text,
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS pos_orders_client_uuid_uidx
  ON public.pos_orders (client_uuid)
  WHERE client_uuid IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pos_orders_idempotency_key_uidx
  ON public.pos_orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.pos_orders.client_uuid IS
  'Client-generated UUID for offline/online idempotent order upload. Server rejects duplicates.';
COMMENT ON COLUMN public.pos_orders.retry_token IS
  'Per-attempt retry token for sync engine; does not change client_uuid.';
COMMENT ON COLUMN public.pos_orders.idempotency_key IS
  'Checkout/sync idempotency key. Unique when present so retries never create duplicate orders.';
