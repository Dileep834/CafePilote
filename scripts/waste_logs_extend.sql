-- Extend waste_logs for Waste Log redesign (safe to run multiple times).
-- Does NOT modify Backbenchers product data.

ALTER TABLE public.waste_logs
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_loss NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Optional: keep franchise_id as branch key (existing app convention).
CREATE INDEX IF NOT EXISTS idx_waste_logs_franchise_date ON public.waste_logs (franchise_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_waste_logs_status ON public.waste_logs (status);
