# CafePilots — Transaction Flows

Complete guide to how money and orders move through CafePilots POS / ERP.

**Last updated:** 2026-07-21 (Phase 1–3 re-audit)  
**Scope:** Counter POS, table billing, held orders, payments, QR guest ordering, kitchen (KDS), Online Order Hub (demo), refunds, inventory, shifts, audit, BI/Copilot.  
**Readiness:** See `TRANSACTION_FLOW_MATRIX.md` — **68/100** conditional pilot.

---

## Status legend

| Status | Meaning |
|--------|---------|
| **Production** | Live path used in ops; writes to Supabase |
| **Partial** | UI works; persistence incomplete |
| **Demo / stub** | Local or placeholder only |

---

## 1. Shared data model

### Primary tables

| Table | Role |
|-------|------|
| `pos_orders` | Sales, open checks, kitchen tickets, held orders |
| `pos_order_items` | Line items |
| `dining_tables` | Table status + QR tokens |
| `customers` | Optional CRM at checkout (+ loyalty points) |
| `payment_intents` / `payment_transactions` | Checkout idempotency + tender lines |
| `refund_transactions` | Full / partial / item refunds |
| `inventory` / `inventory_transactions` | Stock + ledger movements |
| `shift_headers` / `shift_transactions` | Till open/close + Z |
| `audit_logs` | Immutable sensitive-action trail |
| `order_lifecycle_events` | Kitchen / order state timestamps |
| `purchase_grn` (+ items) | Goods received formalization |
| `app_notifications` | In-app / desktop alerts |

### `pos_orders.status`

| Status | Meaning |
|--------|---------|
| `open` | Unpaid table check (hidden from KDS) |
| `sent` | Kitchen ticket (shown on KDS) |
| `held` | Parked counter order |
| `completed` | Paid sale |
| `refunded` | Fully refunded |

### `kitchen_status`

`pending` → `preparing` → `ready` → `delivered` (bump advances; recall restores to ready)

### Schema scripts

- Phase 1: `scripts/phase1_production_schema.sql`  
- Phase 2: `scripts/phase2_enterprise_schema.sql`  
- Phase 3: `scripts/phase3_saas_schema.sql`  
- Legacy: table billing / KDS / RLS scripts as before  

### External services

- **Supabase** — DB + KDS realtime  
- **Paytm / PhonePe / Amazon Pay** — `server/paymentGateways.js`, `api/payment-gateways/*`  
- **No Razorpay** in codebase today  

---

## 2. End-to-end map

```mermaid
flowchart TD
  subgraph counter [Walk-in POS]
    A[Product grid] --> B[Cart]
    B -->|Charge| C[Checkout]
    B -->|Quick settle| D[processCheckout]
    C --> D
    D --> E[(pos_orders completed)]
  end

  subgraph dinein [Table / QR]
    T[ensureOpenBill] --> O[(pos_orders open)]
    T --> F[fireKitchenTicket]
    F --> S[(pos_orders sent)]
    S --> K[Kitchen KDS]
    O --> P[processCheckout]
    P --> E
    P --> SB[settleBill → table cleaning]
  end

  subgraph qr [Guest QR]
    Q["/menu/.../token"] --> CG[Guest cart submit]
    CG --> T
  end

  subgraph online [Online Order Hub]
    H[Local Zustand demo] -.->|no DB write yet| E
  end
```

---

## 3. Counter POS (walk-in billing)

**Status:** Production  

**Entry**

- `/erp/pos` → `POSDashboard`  
- `/erp/pos/checkout` → `CheckoutPage`

**Key files**

- `src/modules/pos/pages/POSDashboard.tsx`
- `src/modules/pos/components/ProductGrid.tsx`
- `src/modules/pos/components/Cart.tsx`
- `src/modules/pos/pages/CheckoutPage.tsx`
- `src/modules/pos/store/usePOSStore.ts` (`addItem`, `processCheckout`)
- `src/modules/pos/components/ThermalReceipt.tsx`

### Flow

```
Add items → Cart → Charge / Quick settle → Payment → pos_orders (completed)
  → payment intent → stock check → BOM deduct → shift attach → audit → loyalty earn
```

1. Staff adds products → `usePOSStore.addItem`
2. Optional discount, notes, customer on cart (high discount → manager PIN on checkout)
3. **Full checkout:** navigate to `/erp/pos/checkout` → choose method → `handleCompleteOrder` → `processCheckout`
4. **Quick settle:** set method + tender on cart → `processCheckout` → success via `?settled=quick`
5. Tax applied (default 18%), then Phase 1 path:
   - create/reuse `payment_intents` (idempotency key + checkout lock)
   - `checkInventoryForSale` (blocks if tracking disallows negative)
   - insert `pos_orders` / `pos_order_items`
   - `completePaymentIntent` (+ tender lines for split)
   - `deductInventoryForSale` (recipe BOM)
   - `attachSaleToOpenShift` + `writeAuditLog`
   - `earnLoyaltyPoints` when customer phone matches
6. Cart cleared; `lastOrder` set; event `cafepilots:orders-updated` (+ notification for counter kitchen)
7. Success UI → print / WhatsApp receipt (optional)

**Tables:** `pos_orders`, `pos_order_items`, `payment_*`, `inventory_transactions`, `shift_*`, `audit_logs`  
**Note:** Counter completed orders get `kitchen_status: pending` and can appear on KDS.  
**Modules:** `/erp/shifts`, `/erp/refunds`, `/erp/audit`, `/erp/intelligence`, `/erp/copilot`

---

## 4. Table billing (open → kitchen → settle)

**Status:** Production  

**Entry**

- `/erp/tables` → open table → POS  
- Or attach table from POS  
- Pay via Cart Charge / Quick settle / Tables “Pay Bill”

**Key files**

- `src/modules/tables/pages/TablesDashboard.tsx`
- `src/modules/tables/components/TableActionPanel.tsx`
- `src/modules/tables/store/useTableBillStore.ts`
- `src/modules/tables/store/useTableStore.ts`
- `src/modules/pos/store/usePOSStore.ts` (`loadTableBill`, `fireActiveTableKitchen`, `processCheckout` → `settleBill`)

### Flow

```
Seat table → Open bill → Add items → Send to kitchen → Guest eats → Pay → Settle
```

1. `ensureOpenBill` → local bill (`cafepilots-table-bills`) + table status `occupied`
2. Cart edits → `syncBillFromCart` → cloud open order (`status: open`, `payment_method: pending`)
3. **Fire kitchen:** `fireKitchenTicket` → new `pos_orders` row `status: sent`, `kitchen_status: pending`
4. **Settle:** checkout inserts paid `completed` order → `settleBill`:
   - fires any remaining unfired items
   - marks local bill paid
   - closes cloud open check
   - table → `cleaning`

**Tables:** `pos_orders` (`open` / `sent` / `completed`), `pos_order_items`, `dining_tables`

---

## 5. Held orders / resume

**Status:** Production (counter holds)  

**Entry**

- Cart **Hold** / Checkout **Hold Bill**
- POS `?view=held` → `POSHeldOrders`

**Key files**

- `src/modules/pos/store/usePOSStore.ts` — `holdCurrentOrder`, `resumeOrder`, `discardHeldOrder`, `mergeHeldOrders`, `transferHeldTable`
- `src/modules/pos/components/POSHeldOrders.tsx`

### Flow

| Action | Behavior |
|--------|----------|
| Hold (counter) | Insert `pos_orders` `status: held` + items; clear cart |
| Park (table) | Sync open bill + clear cart — **not** a held row |
| Resume | Load items into cart; **delete** held row |
| Merge held | Rewrite target items; delete source |
| Transfer held | Updates notes / table label only — does not open a real table bill |

---

## 6. Split payment & table move / merge

### Split payment — Implemented (intent lines)

**Entry:** Cart Split → `/erp/pos/checkout?split=1`, or Split method on checkout  

**Flow:** Staff enters split lines → sum must cover total → `processCheckout` with `payment_method: 'split'` → `completePaymentIntent` stores **per-method tender lines** on the intent.

**Note:** Order row still stores `payment_method: 'split'`; detailed mix lives on `payment_transactions` / intent lines.

### Table move / merge — Production

**Entry:** Tables board (Move / Merge), Cart Transfer → `/erp/tables`  

**Files:** `useTableBillStore.movePartyToTable`, `useTableStore.mergeTables`  

**Flow:** Move open bill to another table; merge routes bill to primary table id.

---

## 7. Payment methods

| Method | Real money movement | Persisted as |
|--------|---------------------|--------------|
| Cash | Manual tender / change | `payment_method`, `tendered_amount`, `change_due` + intent |
| Card | Manual (terminal outside app) | `card` + intent |
| UPI | Manual “Mark received” | `upi` + intent |
| Wallet / gift / store credit | Prompt only — **no ledger** | method string — **disable in pilot** |
| Split | Multi-line UI | `split` on order + **tender lines on intent** |
| Paytm / PhonePe / Amazon Pay | Live gateway when configured | method + provider IDs in notes + intent |

### Gateway flow (Paytm / PhonePe / Amazon Pay)

**Status:** Production-capable when outlet gateways are configured  

**Files**

- Client: `src/modules/pos/services/paymentGatewayService.ts`
- Server: `server/paymentGateways.js`, `api/payment-gateways/{create,status,settings,callback}.js`
- Settings UI: `src/modules/settings/components/PaymentGatewaySettings.tsx`

```
Select gateway → createGatewayPayment → customer pays
  → checkGatewayPaymentStatus → success
  → processCheckout(paymentReference)
```

**Configure in:** ERP → Settings → Payment gateways (per outlet).

---

## 8. QR menu / guest ordering

**Status:** Production (order-to-kitchen; pay at counter)  

**Entry**

- `/menu/t/:qrToken` or `/menu/:outletId/:qrToken`
- Table QR print from Tables board

**Key files**

- `src/modules/tables/lib/resolveTableByQr.ts`
- `src/modules/customer/store/useCustomerOrderStore.ts`
- `src/modules/customer/pages/CustomerCartModal.tsx`
- `src/modules/customer/pages/GuestOrderStatus.tsx`

### Flow

```
Scan QR → Browse menu → Submit → Open table bill + kitchen ticket → Staff settles on POS
```

1. Resolve table by `dining_tables.qr_code_token`
2. Guest adds items → submit → `addItemsToTable(..., 'qr', { fireKitchen: true })`
3. Upserts open check `order_source: 'qr'` + kitchen `sent` ticket
4. Guest tracks kitchen status  
5. **No guest payment** — staff collects on POS

---

## 9. Kitchen tickets & KDS

**Status:** Production  

**Entry:** `/erp/kitchen` → `KitchenDisplay`

**Key files**

- `useTableBillStore.insertKitchenTicket` / `fireKitchenTicket`
- `src/modules/kitchen/store/useKitchenStore.ts`
- `src/modules/kitchen/` display pages

### How tickets are created

| Trigger | Result |
|---------|--------|
| POS cart **Send** (table bill) | `sent` ticket |
| QR guest submit | `sent` ticket |
| Settle with unfired items | Auto-fire then pay |
| Counter checkout complete | `completed` row with `kitchen_status: pending` (can show on KDS) |

### KDS flow

```
pending → preparing → ready → delivered
```

- Fetches `pos_orders` where kitchen status ≠ `delivered` and status ∉ `{open, held}`
- Realtime channel: `kds_orders_channel`
- Station filter + bump / recall (Phase 2)
- Lifecycle timestamps on `order_lifecycle_events`

---

## 10. Online Order Hub (Swiggy / Zomato / ONDC / etc.)

**Status:** Demo / stub — **do not sell as live**  

**Entry**

- `/erp/online-orders`
- POS → Online tab / sticky Online Orders bar

**Key files**

- `src/modules/pos/onlineOrders/store.ts`
- `src/modules/pos/onlineOrders/seed.ts`
- `src/modules/pos/pages/OnlineOrdersPage.tsx`
- Components under `src/modules/pos/onlineOrders/components/`

### Current flow (not live marketplaces)

```
Seed / Demo simulator → Local Zustand order
  → Accept / Reject / Status updates (memory only)
  → Toast + Alert Center
```

| Step | What happens today |
|------|--------------------|
| Incoming order | Seed data or `createDemoIncomingOrder()` |
| Accept | Local status → preparing; alert says “kitchen ticket” — **no** `pos_orders` insert |
| Reject / expire | Local status only |
| Payment badges | Display only (`prepaid` / `cod` / `online` / `card`) |
| Metrics / refunds | In-memory |

### What to configure later for real orders

1. Aggregator or direct APIs (UrbanPiper / Petpooja / Swiggy / Zomato / ONDC)  
2. Outlet credentials + webhook URL  
3. Backend webhook → `online_orders` / `pos_orders`  
4. Realtime subscribe → POS toast  
5. Accept → real kitchen ticket + optional print  

**Nothing to paste for Swiggy/Zomato today** — Integrations settings page not built yet.

---

## 11. Refunds / voids

**Status:** Refunds **Production** (schema required) · Voids / reopen **Missing**

| Action | Behavior | Status |
|--------|----------|--------|
| `/erp/refunds` | Full / partial / item refund + PIN + inventory restore | **I** |
| Checkout **Void Bill** | Notice only (“manager approval”) | Stub |
| History filters cancelled / refunded | Query filters + refunded status | Partial |
| History **Reorder** | Re-adds lines to cart | Works |
| Discard open table bill | Deletes cloud open check | Ops cancel, not refund |
| Discard held | Deletes held row | Works |
| Online hub `refunded` | Demo status | Demo |
| Reopen paid bill | — | **M** |

Refunds write `refund_transactions`, may set order `refunded`, restore BOM stock, and audit. Gateway reverse is still manual / SOP.

---

## 12. Inventory on sale

**Status:** Wired to POS checkout (Phase 1) when recipes + tracking + schema are on  

| Path | Deducts stock? |
|------|----------------|
| `processCheckout` | **Yes** — check before pay, BOM deduct after pay |
| Refund path | **Yes** — restore on refund |
| Table / QR / kitchen fire | No (deduct on **pay**, not fire) |
| Online hub accept | No (demo) |
| PO receive | GRN + ledger (Phase 2) |
| Product grid OOS | Soft display; hard block via checkout stock check when tracking on |

**Gap:** If deduct fails after payment, sale stays — staff must adjust manually (alert).

---

## 13. Reports & sales recording

**Status:** Production  

**Write:** Every paid checkout → `pos_orders` + `pos_order_items` (`status: completed`) + intent / shift / audit side effects

**Read**

- `src/modules/reports/store/useReportStore.ts` — `status = completed`
- `src/modules/pos/components/POSOrderHistory.tsx`
- `/erp/intelligence` Executive BI · `/erp/copilot` AI Copilot
- Event `cafepilots:orders-updated` after checkout

Open / sent / held rows are **excluded** from sales revenue reports by design.

---

## 14. Quick reference — who gets paid when

| Channel | Order created | Kitchen | Customer pays | Staff settles |
|---------|---------------|---------|---------------|---------------|
| Counter POS | On checkout | Optional (pending on complete) | At counter | Same step (+ deduct/shift) |
| Table dine-in | Open check early | On Send | At counter / table | Checkout |
| QR guest | On submit | Immediate | Later | Staff on POS |
| Online Hub | Demo local only | Simulated alert | N/A (demo) | N/A |

---

## 15. File index (core)

| Area | Path |
|------|------|
| POS store | `src/modules/pos/store/usePOSStore.ts` |
| Checkout | `src/modules/pos/pages/CheckoutPage.tsx` |
| Cart | `src/modules/pos/components/Cart.tsx` |
| Table bills | `src/modules/tables/store/useTableBillStore.ts` |
| Tables UI | `src/modules/tables/pages/TablesDashboard.tsx` |
| Kitchen | `src/modules/kitchen/` |
| Ops (refund/shift/audit/inventory) | `src/modules/ops/` |
| SaaS (BI/Copilot/API) | `src/modules/saas/` |
| QR guest | `src/modules/customer/` |
| Online hub | `src/modules/pos/onlineOrders/` |
| Gateways (client) | `src/modules/pos/services/paymentGatewayService.ts` |
| Gateways (server) | `server/paymentGateways.js`, `api/payment-gateways/` |
| Reports | `src/modules/reports/` |
| Schema | `scripts/phase1_production_schema.sql`, `phase2_enterprise_schema.sql`, `phase3_saas_schema.sql` |

---

## 16. Known gaps (roadmap)

1. **Online Order Hub** → real aggregator webhooks + DB  
2. **Voids / reopen bill** → manager-approved write path  
3. **Wallet / gift / credit** → balance ledger (disable until then)  
4. **Loyalty redeem** (earn exists)  
5. **Offline billing** queue  
6. **Guest QR payment** → optional pay-before-fire  
7. **Gateway refund reverse** automation  
8. **Hard OOS policy** as outlet default  

---

## Related

- Scorecard matrix: `TRANSACTION_FLOW_MATRIX.md` (**68/100**)
- Phase docs: `PHASE1_README.md`, `PHASE2_README.md`, `PHASE3_README.md`

---

*Generated from the CafePilots codebase after Phase 1–3. Update when transaction paths change.*
