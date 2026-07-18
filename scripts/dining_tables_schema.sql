-- CafePilots dining tables (floor / QR dine-in)
-- Run in Supabase SQL editor if you want cloud persistence.

create table if not exists public.dining_tables (
  id uuid primary key default gen_random_uuid(),
  outlet_id text not null,
  company_id text,
  table_number text not null,
  capacity int not null default 2 check (capacity > 0 and capacity <= 50),
  status text not null default 'available'
    check (status in ('available', 'occupied', 'reserved', 'cleaning')),
  table_type text not null default 'square'
    check (table_type in ('square', 'round', 'sofa')),
  qr_code_token text unique,
  current_order_id text,
  merge_group_id text,
  merge_primary_id text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (outlet_id, table_number)
);

-- Safe add for existing deployments
alter table public.dining_tables add column if not exists merge_group_id text;
alter table public.dining_tables add column if not exists merge_primary_id text;

create index if not exists dining_tables_qr_token_idx on public.dining_tables (qr_code_token);

alter table public.dining_tables enable row level security;

-- Permissive policies for anon/authenticated app key (tighten later for production)
drop policy if exists "dining_tables_select" on public.dining_tables;
drop policy if exists "dining_tables_insert" on public.dining_tables;
drop policy if exists "dining_tables_update" on public.dining_tables;
drop policy if exists "dining_tables_delete" on public.dining_tables;

create policy "dining_tables_select" on public.dining_tables for select using (true);
create policy "dining_tables_insert" on public.dining_tables for insert with check (true);
create policy "dining_tables_update" on public.dining_tables for update using (true);
create policy "dining_tables_delete" on public.dining_tables for delete using (true);
