-- CafePilots Floor Designer schema (Supabase / Postgres)
-- Document-store layout JSON for scalable canvas persistence.
-- Run in Supabase SQL editor after dining_tables_schema.sql

create table if not exists public.floors (
  id uuid primary key default gen_random_uuid(),
  outlet_id text not null,
  brand_id text,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists floors_outlet_idx on public.floors (outlet_id);

create table if not exists public.floor_layouts (
  floor_id uuid primary key references public.floors (id) on delete cascade,
  outlet_id text not null,
  brand_id text,
  schema_version int not null default 1,
  layout jsonb not null default '{}'::jsonb,
  version int not null default 1,
  updated_at timestamptz not null default now()
);

create index if not exists floor_layouts_outlet_idx on public.floor_layouts (outlet_id);

alter table public.floors enable row level security;
alter table public.floor_layouts enable row level security;

-- Permissive policies for authenticated staff (tighten per brand later)
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'floors' and policyname = 'floors_all'
  ) then
    create policy floors_all on public.floors for all using (true) with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'floor_layouts' and policyname = 'floor_layouts_all'
  ) then
    create policy floor_layouts_all on public.floor_layouts for all using (true) with check (true);
  end if;
end $$;
