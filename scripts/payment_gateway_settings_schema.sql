-- CafePilots: outlet-level payment gateway settings.
-- Run this once in Supabase SQL editor before saving gateway credentials from Settings.

create table if not exists public.outlet_payment_gateway_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid null references public.companies(id) on delete cascade,
  outlet_id text not null,
  gateway text not null check (gateway in ('paytm', 'phonepe', 'amazonpay')),
  is_enabled boolean not null default false,
  mode text not null default 'sandbox' check (mode in ('sandbox', 'production')),
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (outlet_id, gateway)
);

create index if not exists outlet_payment_gateway_settings_outlet_idx
  on public.outlet_payment_gateway_settings (outlet_id);

create index if not exists outlet_payment_gateway_settings_company_idx
  on public.outlet_payment_gateway_settings (company_id);

alter table public.outlet_payment_gateway_settings enable row level security;

drop policy if exists outlet_payment_gateway_settings_deny_client on public.outlet_payment_gateway_settings;
create policy outlet_payment_gateway_settings_deny_client
  on public.outlet_payment_gateway_settings
  for all
  using (false)
  with check (false);

do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'update_updated_at_column'
  ) then
    drop trigger if exists outlet_payment_gateway_settings_modtime
      on public.outlet_payment_gateway_settings;

    create trigger outlet_payment_gateway_settings_modtime
      before update on public.outlet_payment_gateway_settings
      for each row execute procedure update_updated_at_column();
  end if;
end $$;

comment on table public.outlet_payment_gateway_settings is
  'Server-only outlet payment gateway configuration. Read and write through /api/payment-gateways/settings.';
