-- CafePilots: full dine-in table billing + kitchen tickets
-- Run once in Supabase SQL editor (safe to re-run).

-- Open checks + kitchen tickets live on pos_orders
alter table public.pos_orders
  add column if not exists table_id text,
  add column if not exists table_number text,
  add column if not exists order_source text default 'pos',
  add column if not exists notes text,
  add column if not exists kitchen_status varchar(50) default 'pending';

create index if not exists pos_orders_table_open_idx
  on public.pos_orders (outlet_id, table_id, status);

create index if not exists pos_orders_kitchen_idx
  on public.pos_orders (kitchen_status, created_at);

-- Status meanings:
--   open      = unpaid table check (not shown on KDS)
--   sent      = kitchen ticket for a table (shown on KDS)
--   held      = parked counter order
--   completed = paid sale

comment on column public.pos_orders.table_id is 'Dining table id for open/paid dine-in bills';
comment on column public.pos_orders.table_number is 'Display label e.g. T-01 or T-01 + T-03';
comment on column public.pos_orders.order_source is 'pos | qr';

-- Allow guest QR / anon inserts for kitchen tickets (tighten later)
alter table public.pos_orders disable row level security;
alter table public.pos_order_items disable row level security;
