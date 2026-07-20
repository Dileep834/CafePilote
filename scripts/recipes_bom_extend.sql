-- Optional BOM metadata for CafePilots Recipes
-- Run in Supabase SQL editor if you want recipe name/code/yield/prep/status
-- and ingredient waste/notes to persist. App works without these columns.

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS yield_label TEXT,
  ADD COLUMN IF NOT EXISTS prep_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false;

ALTER TABLE public.recipe_ingredients
  ADD COLUMN IF NOT EXISTS waste_percent NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT;
