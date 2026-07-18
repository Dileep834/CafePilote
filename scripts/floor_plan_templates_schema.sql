-- CafePilots: ready-to-use floor plan templates + outlet mapping
-- Run in Supabase SQL editor after floor_layout_schema.sql / saas_tenant_floor_patch.sql

-- Catalog of reusable floor layouts (admin picks one per branch)
create table if not exists public.floor_plan_templates (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text,
  category text not null default 'cafe'
    check (category in ('cafe', 'bar', 'patio', 'fast_casual', 'custom')),
  table_count int not null default 0,
  seats int not null default 0,
  preview_hint text,
  -- Layout JSON without floorId/outletId (applied when mapped to a branch)
  layout jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists floor_plan_templates_active_idx
  on public.floor_plan_templates (is_active, sort_order);

-- Which template each outlet/branch uses
create table if not exists public.outlet_floor_plan_maps (
  outlet_id text primary key,
  company_id text,
  template_id text not null references public.floor_plan_templates (id),
  applied_at timestamptz,
  applied_floor_id uuid,
  updated_at timestamptz not null default now()
);

create index if not exists outlet_floor_plan_maps_company_idx
  on public.outlet_floor_plan_maps (company_id);
create index if not exists outlet_floor_plan_maps_template_idx
  on public.outlet_floor_plan_maps (template_id);

alter table public.floor_plan_templates enable row level security;
alter table public.outlet_floor_plan_maps enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'floor_plan_templates' and policyname = 'floor_plan_templates_all'
  ) then
    create policy floor_plan_templates_all on public.floor_plan_templates
      for all using (true) with check (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'outlet_floor_plan_maps' and policyname = 'outlet_floor_plan_maps_all'
  ) then
    create policy outlet_floor_plan_maps_all on public.outlet_floor_plan_maps
      for all using (true) with check (true);
  end if;
end $$;

-- Seed note: app also ships built-in templates in code.
-- Inserts below are optional cloud catalog rows (layout filled by app sync or leave empty to use code templates).
insert into public.floor_plan_templates
  (id, slug, name, description, category, table_count, seats, preview_hint, sort_order)
values
  (
    'tpl-cafe-standard',
    'cafe_standard',
    'Standard Café',
    '8 tables, counter, entrance — classic café floor',
    'cafe', 8, 32, '12×10 m · 8 tables', 10
  ),
  (
    'tpl-cafe-compact',
    'cafe_compact',
    'Compact Café',
    '4 tables for small shops / kiosks',
    'cafe', 4, 12, '8×7 m · 4 tables', 20
  ),
  (
    'tpl-cafe-bar',
    'cafe_bar',
    'Bar & High Seating',
    'Bar counter with high stools and a few lounge tables',
    'bar', 6, 18, '10×8 m · bar + lounge', 30
  ),
  (
    'tpl-cafe-patio',
    'cafe_patio',
    'Patio / Outdoor',
    'Open layout with outdoor-style seating rows',
    'patio', 6, 24, '14×10 m · patio rows', 40
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  table_count = excluded.table_count,
  seats = excluded.seats,
  preview_hint = excluded.preview_hint,
  updated_at = now();
