# CafePilots Super Admin Company Onboarding

Goal: onboard a restaurant/cafe so the owner can take the **first paid order in under 10 minutes**.

## Prerequisites

1. Run in Supabase SQL Editor (after HQ + subscriptions scripts):

```
scripts/super_admin_onboarding_schema.sql
```

Also ensure dining tables exist if you will auto-generate floors/QR:

```
scripts/dining_tables_schema.sql
```

2. Sign in as **Super Admin** (permission `companies.manage`).

### Schema alignment (verified)

| Object | Current CafePilots shape | Onboarding script |
|--------|--------------------------|-------------------|
| `companies.id` | UUID | Extended with onboarding columns only |
| `company_subscriptions.company_id` | TEXT | `trial_ends_at`, `billing_status` (also in phase3) |
| `onboarding_drafts.company_id` | — | TEXT (same convention as subscriptions) |
| `dining_tables` | `table_number`, no `name`/`zone` | App inserts `table_number` + `qr_code_token` |
| `outlet_ops_settings` | inventory flags only | App upserts known columns only |

## Navigation

Sidebar → **Super Admin**

| Item | Path |
|------|------|
| Dashboard | `/erp/super-admin` |
| Companies | `/erp/super-admin/companies` |
| Create Company | `/erp/super-admin/create-company` |
| Trial Requests | `/erp/super-admin/trials` |
| Subscription Plans | `/erp/super-admin/plans` |
| Integrations | `/erp/super-admin/integrations` |
| Billing | `/erp/super-admin/billing` |
| Notifications | `/erp/super-admin/notifications` |
| Settings | `/erp/super-admin/settings` |

Legacy master list remains at `/erp/companies`.

## Architecture

```
UI (wizard / dashboard)
  → CompanyProvisioningService (validation, orchestration)
    → CompanyOnboardingRepository (Supabase writes)
```

- **DTOs / types:** `src/modules/superAdmin/types.ts`
- **Validation:** Zod `businessInfoSchema` in `validation.ts`
- **Codes:** `generateCompanyCode` → `CP-CAF-4821`
- **Drafts:** `onboarding_drafts` table + Zustand persist + localStorage fallback
- **Progress:** `companies.onboarding_progress` jsonb + status color (red / yellow / green)

## 14-step wizard (Create Company)

| # | Step | What happens |
|---|------|----------------|
| 1 | Business | Name, type, owner, mobile, GST/FSSAI, locale, plan, trial, logo |
| 2 | Provision | Company, outlet, admin user, kitchen, cash counter, roles, taxes, subscription, company code |
| 3 | Setup progress | Checklist of remaining work |
| 4 | Menu | AI scanner / Excel / manual / clone from existing company |
| 5 | Layout | Dining/takeaway/delivery + auto-generate tables by floor/zone |
| 6 | QR | Mark QR ready (Tables module for download/print/share) |
| 7 | Payments | Cash, UPI, Card, Wallet, PhonePe, Razorpay, Cashfree, Stripe + default |
| 8 | Printers | Billing / kitchen / label — or skip |
| 9 | Staff | Roles seeded; invite via Users |
| 10 | Inventory | Enable suppliers / stock / units |
| 11 | KDS | Enable kitchen stations |
| 12 | Hours | Open/close + weekly holidays |
| 13 | Notifications | WhatsApp / SMS / Email / Push |
| 14 | Go Live | Checklist → **START BILLING** → `/erp/pos` |

## 10-minute happy path

1. **0–2 min** — Fill Step 1 (required fields only) → Provision.
2. **2–5 min** — Paste menu text into AI scanner, approve items, import; or skip and add 3 SKUs manually.
3. **5–7 min** — Generate tables (1 floor × 8) → mark QR.
4. **7–9 min** — Enable Cash + UPI → skip printers → mark staff.
5. **9–10 min** — Go Live → Start Billing → first order on POS.

## AI assistant

The wizard sidebar tips when:

- Menu empty → upload / paste printed menu
- No tables → generate floors
- No QR → generate after tables
- No printer → skip for now

## Dashboard cards

Total / Active / Trial / Paid companies, revenue placeholder, today’s orders & sales, total users, recent companies, pending setup, recent trials.

Company status colors:

- **Red** &lt; 40% milestones
- **Yellow** 40–84%
- **Green** ≥ 85%

## Tests

```bash
npx vitest run src/modules/superAdmin/__tests__/onboarding.test.ts
```

## Seeded defaults on provision

- Unique `company_code`
- Default outlet + kitchen + cash counter label
- Roles: Admin, Outlet Manager, Cashier, Kitchen, Staff
- Taxes: CGST 2.5%, SGST 2.5%, GST 5%
- Subscription row with trial window
- Onboarding progress with `companyCreated` + `taxesConfigured`
