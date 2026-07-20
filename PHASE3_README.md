# CafePilots Phase 3 — SaaS Platform & Enterprise Intelligence

Phase 3 begins after Phase 1 and Phase 2. This release delivers the **SaaS operating-system foundation** — not every item in the full Phase 3 vision.

## Deploy order

```
scripts/phase1_production_schema.sql
scripts/phase2_enterprise_schema.sql
scripts/phase3_saas_schema.sql
```

Then deploy the app build.

## What shipped

| Area | Status |
|------|--------|
| Outlet hierarchy columns | Schema: `parent_outlet_id`, `hierarchy_level`, region/city |
| Franchise royalty tables | Schema + ledger (UI later) |
| Inter-store stock transfer | Service + Platform ops UI |
| Feature flags | Zustand + `feature_flags` table |
| Open API keys / webhooks | Hashed keys, revoke, webhook endpoints UI |
| Executive BI | `/erp/intelligence` — live sales, hourly, top items, branch compare |
| AI Copilot | `/erp/copilot` — rule-based NL queries (no LLM required) |
| Accounting export queue | CSV now; Tally/Zoho/QB/Xero job stubs |
| Document vault / health events | Schema + health panel |
| Subscription extensions | Trial / billing_status / usage columns |
| Permissions | `saas.bi`, `saas.ai`, `saas.api`, `saas.platform` |

## Routes (plan-gated)

| Path | Plan module |
|------|-------------|
| `/erp/intelligence` | `aiReports` (Professional+) |
| `/erp/copilot` | `aiCoach` (Professional+) |
| `/erp/api-platform` | `api` (Professional+) |
| `/erp/platform` | `centralInventory` (Enterprise) |

## Module layout

```
src/modules/saas/
  types.ts
  services/   bi, ai, api keys, stock transfer, accounting, flags
  pages/      Executive BI, Copilot, API Platform, Platform Ops
```

## Honest gaps (next increments)

- Native mobile apps (Manager / Waiter / Kitchen / Delivery / Customer)
- Live Swiggy/Zomato/ONDC + payment aggregator webhooks
- JWT-bound RLS multi-tenancy (today: app-layer filters)
- Stripe/Razorpay subscription billing checkout
- Full franchise royalty UI + compliance scoring
- LLM-backed copilot + demand forecasting models
- Docker/K8s production topology, Redis workers, blue-green CI
- Offline-first sync engine
- White-label domain mapping beyond `companies.subdomain` field

## Architecture notes

- Domain module `saas` sits beside `ops` — does not redesign POS/KDS/CRM.
- BI reads operational tables (`pos_orders`, items, inventory ledger) — no separate warehouse yet.
- API keys are stored as SHA-256 hashes; plaintext shown once at creation.
- Public REST gateway + rate-limit middleware is the next API milestone (keys/UI ready).

## Success criteria progress

CafePilots now has Phase 1 integrity, Phase 2 operations scaffolding, and Phase 3 SaaS intelligence/API/platform foundations suitable for multi-outlet Professional/Enterprise tenants — while remaining modular and deployable incrementally.
