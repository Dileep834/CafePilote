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

## Canonical ownership (avoid duplicates)

| Concern | Canonical script |
|---------|------------------|
| HQ / Backbenchers companies + Super Admin attach | `ensure_hq_company.sql` |
| `company_subscriptions` table + plan CHECK | `company_subscriptions_schema.sql` (also embedded in `ensure_hq_company.sql`) |
| Floor `company_id` columns | `saas_tenant_floor_patch.sql` |
| Notifications / audit / KDS enterprise | `phase2_enterprise_schema.sql` |
| Payment gateways | `payment_gateway_settings_schema.sql` |

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
