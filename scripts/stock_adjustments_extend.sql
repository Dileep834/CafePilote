-- Extend stock_adjustments for Adjustments redesign (safe to re-run).
ALTER TABLE public.stock_adjustments
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS logged_by TEXT,
  ADD COLUMN IF NOT EXISTS previous_stock NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS new_stock NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adjustment_type TEXT;

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_franchise_date
  ON public.stock_adjustments (franchise_id, date DESC);
