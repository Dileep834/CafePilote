# CafePilots SQL scripts

Run these in the **Supabase SQL Editor**. Prefer the numbered order below for a fresh or partially migrated project.

## Fix subscription plan changes (Lite / Professional failing)

```
scripts/ensure_hq_company.sql
```

Or only the subscriptions piece:

```
scripts/company_subscriptions_schema.sql
```

Both refresh the `company_subscriptions.plan_id` CHECK so allowed values are:

`lite` | `starter` | `professional` | `growth` | `enterprise`

(UI label **Standard** = DB `starter`.)

## Tenant map

| Company | UUID | Role |
|---------|------|------|
| **CafePilots HQ** (`cafepilots-hq`) | `a1000000-0000-4000-8000-000000000001` | **Demo + platform owner** (Super Admin) |
| **Backbenchers Cafeteria** (`backbenchers`) | `c1000000-0000-0000-0000-000000000001` | **Real customer — protect** |

## Protect Backbenchers (real customer)

Company id: `c1000000-0000-0000-0000-000000000001`

Demo / sandbox work belongs on **CafePilots HQ**, not Backbenchers.

| Safe to run | Avoid unless you understand impact |
|-------------|-------------------------------------|
| `ensure_hq_company.sql` | `assign_orphans_to_hq.sql` (moves NULL `company_id` rows to HQ) |
| `super_admin_onboarding_schema.sql` | `merge_duplicate_hq_company.sql` |
| `company_subscriptions_schema.sql` | `clear_demo_pos_qr_orders.sql` optional full wipe |
| `dining_tables_schema.sql` | `operations_saas_patch.sql` (assigns nulls to Backbenchers historically) |

`ensure_hq_company.sql` and `super_admin_onboarding_schema.sql` are written to **not** overwrite Backbenchers name, menu, outlets, orders, or subscription plan.

## Recommended run order

| Step | Script | Purpose |
|------|--------|---------|
| 1 | `database_schema.sql` / `fix_database.sql` | Core tables (if empty project) |
| 2 | `phase1_production_schema.sql` | Production POS / ops foundation |
| 3 | `phase2_enterprise_schema.sql` | `app_notifications`, KDS, GRN, etc. |
| 4 | `phase3_saas_schema.sql` | SaaS extensions on subscriptions |
| 5 | `floor_layout_schema.sql` | Floors / layouts |
| 6 | `saas_tenant_floor_patch.sql` | `company_id` on floors |
| 7 | **`ensure_hq_company.sql`** | HQ + Backbenchers + **subscriptions CHECK** |
| 8 | `assign_orphans_to_hq.sql` | Attach orphan rows to HQ |
| 9 | `payment_gateway_settings_schema.sql` | `outlet_payment_gateways` |
| 10 | Seed scripts as needed | `seed_*.sql` |
| 11 | **`offline_idempotency_schema.sql`** | Offline POS `client_uuid` / unique idempotency (Pro/Enterprise sync) |
| 12 | **`super_admin_onboarding_schema.sql`** | Onboarding drafts, trial requests, company onboarding columns |

## Canonical ownership (avoid duplicates)

| Concern | Canonical script |
|---------|------------------|
| HQ / Backbenchers companies + Super Admin attach | `ensure_hq_company.sql` |
| `company_subscriptions` table + plan CHECK | `company_subscriptions_schema.sql` (also embedded in `ensure_hq_company.sql`) |
| Floor `company_id` columns | `saas_tenant_floor_patch.sql` |
| Notifications / audit / KDS enterprise | `phase2_enterprise_schema.sql` |
| Payment gateways | `payment_gateway_settings_schema.sql` |
| Super Admin onboarding drafts / trials | `super_admin_onboarding_schema.sql` |

## Quick verify

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.company_subscriptions'::regclass
  AND contype = 'c';

-- Expect plan_id IN ('lite','starter','professional','growth','enterprise')

SELECT company_id, plan_id, status
FROM public.company_subscriptions;
```
