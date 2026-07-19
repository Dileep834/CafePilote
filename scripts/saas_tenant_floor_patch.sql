-- CafePilots SaaS: company scoping for floors + subscription plans
-- Run in Supabase SQL editor after floor_layout_schema.sql

-- Floors / layouts: tenant company
alter table public.floors add column if not exists company_id text;
alter table public.floor_layouts add column if not exists company_id text;

create index if not exists floors_company_idx on public.floors (company_id);
create index if not exists floor_layouts_company_idx on public.floor_layouts (company_id);

-- Optional: company subscription (plan gates)
create table if not exists public.company_subscriptions (
  company_id text primary key,
  plan_id text not null default 'professional'
    check (plan_id in ('lite', 'starter', 'professional', 'growth', 'enterprise')),
  status text not null default 'active'
    check (status in ('active', 'trialing', 'past_due', 'canceled')),
  seats int,
  updated_at timestamptz not null default now()
);

alter table public.company_subscriptions
  drop constraint if exists company_subscriptions_plan_id_check;

alter table public.company_subscriptions
  add constraint company_subscriptions_plan_id_check
  check (plan_id in ('lite', 'starter', 'professional', 'growth', 'enterprise'));

alter table public.company_subscriptions
  alter column plan_id set default 'professional';

alter table public.company_subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'company_subscriptions' and policyname = 'company_subscriptions_all'
  ) then
    create policy company_subscriptions_all on public.company_subscriptions
      for all using (true) with check (true);
  end if;
end $$;

-- Seed default professional plan for demo company if present
insert into public.company_subscriptions (company_id, plan_id, status)
values ('c1000000-0000-0000-0000-000000000001', 'professional', 'active')
on conflict (company_id) do nothing;
