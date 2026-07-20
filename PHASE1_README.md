# CafePilots Phase 1 — Production Readiness

## What shipped

Modular ops layer under `src/modules/ops/` plus SQL schema `scripts/phase1_production_schema.sql`.

| P0 | Status |
|----|--------|
| Inventory BOM deduction on paid sale | Wired in `processCheckout` |
| Inventory restore on refund | Wired in `processRefund` |
| Inventory ledger (`inventory_transactions`) | Service writes on each movement |
| Refunds (full / partial / item) | `/erp/refunds` + dialog + manager PIN |
| Shift open/close + cash movements + Z variance | `/erp/shifts` |
| Audit logs (immutable) | `/erp/audit` + writers on checkout/refund/shift/PIN |
| Manager PIN | Dialog + hash storage (local + `outlet_ops_settings`) |
| Payment validation + idempotency | Cash/split validators, payment intents, checkout lock |

## Deploy steps

1. Run SQL in Supabase:
   ```
   scripts/phase1_production_schema.sql
   ```
2. Deploy app build.
3. Open **Shift / Cash** → set Manager PIN (or bootstrap `0000` once).
4. Open a shift before taking cash sales (recommended).
5. Ensure recipes exist for menu items so stock deducts correctly.

## Behaviour notes

- If Phase 1 tables are missing, checkout still completes (legacy path) but inventory/shift/audit/refund features log warnings.
- Inventory check runs **before** payment capture when tracking is enabled and negative stock is disallowed.
- If deduction fails **after** payment, the sale is kept and staff are alerted to adjust stock manually.
- High discounts above outlet threshold require manager PIN at checkout.
- Wallet / gift / store credit methods remain UI-only (no ledger yet) — disable operationally until Phase 2.

## Navigation

- Front of house → **Shift / Cash**, **Refunds**, **Audit log**

## Permissions

- `pos.shift`, `pos.audit` (plus existing `pos.refund`)

## Self-test

```ts
import { runPhase1SelfTests } from '@/modules/ops/lib/phase1SelfTest';
console.log(runPhase1SelfTests());
```
