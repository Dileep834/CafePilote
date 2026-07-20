# CafePilots Phase 2 — Enterprise Operations

Phase 2 builds on Phase 1. Run `scripts/phase1_production_schema.sql` first, then Phase 2 SQL.

## What shipped (P0 foundation)

| Area | Status |
|------|--------|
| Order lifecycle events + timestamps | `orderLifecycleService` + schema columns |
| Kitchen Display upgrades | Stations, bump/recall, all-day count, completed queue, delay colors |
| Notification center | Header bell + badge + desktop permission + local/server store |
| Online Order Hub bridge | Accept/reject/ready/delivered push into notification center (still **demo data**) |
| Purchase GRN / returns | `createGrn` / `createPurchaseReturn`; PO **Received** prefers GRN path |
| Inventory automation helpers | Low stock fetch/notify, theoretical consumption proxy |
| Loyalty earn on checkout | 1 point / ₹100 when customer phone matches `customers` |

## Not live yet (honest scope)

- Swiggy / Zomato / ONDC **webhooks** — hub remains seed + simulator
- Full CRM UI, tiers, coupons engine, delivery GPS, advanced report packs
- Multi-kitchen config from DB (keyword stations ship; `kitchen_stations` table ready)

## Deploy steps

1. Supabase SQL (in order):
   ```
   scripts/phase1_production_schema.sql
   scripts/phase2_enterprise_schema.sql
   ```
2. Deploy app build.
3. Allow desktop notifications when prompted (Header bell).
4. Open **Kitchen** — filter by station, bump tickets, recall from completed queue.
5. Mark a PO **Received** — GRN + stock ledger when Phase 2 tables exist; otherwise legacy inventory upsert.

## Key paths

| Feature | Where |
|---------|--------|
| KDS | `/erp/kitchen` |
| Online hub | `/erp/online-orders` or POS `?view=online` |
| Notifications | Header bell |
| Purchase receive | Purchase Orders → Received |
| Services | `src/modules/ops/services/*` |

## Success criteria progress

CafePilots now has production-safe Phase 1 money/stock integrity **plus** Phase 2 operational scaffolding for lifecycle, KDS, notifications, GRN, and loyalty earn. Aggregator APIs and full CRM/loyalty/promotions UX remain follow-on work.
