# CafePilots — Complete Transaction Flow Matrix

**Document type:** Pre-production audit (Solution Architecture · QA · Product)  
**System:** CafePilots Restaurant POS / ERP  
**Audit date:** 2026-07-21  
**Code baseline:** `master` (Online Order Hub UI + POS / Tables / KDS / Purchase / Inventory modules)

---

## Status legend

| Code | Meaning |
|------|---------|
| **I** | Implemented (production path writes real data) |
| **P** | Partial (UI or one side only; gaps remain) |
| **D** | Demo / stub (local or placeholder) |
| **M** | Missing (not built) |
| **N/A** | Not applicable for current product scope |

**Risk:** Critical · High · Medium · Low  

**Launch Blocker:** Yes = financial loss, inventory corruption, legal/tax, or unsafe ops if launched without fix.

---

## Executive summary

| Dimension | Score (0–100) | Verdict |
|-----------|---------------|---------|
| Core dine-in + counter billing | 78 | Launchable with controls |
| Payments (cash/card/UPI + gateways) | 62 | Launchable with training; gateway config required |
| Kitchen / KDS | 72 | Launchable for single kitchen |
| Inventory integrity on sale | 28 | **Blocker** for stock-led restaurants |
| Refunds / voids / reopen | 15 | **Blocker** for cash control |
| Online aggregators | 20 | Demo only — do not sell as live |
| Shift / till / Z-report | 5 | **Blocker** for multi-shift cash |
| Audit trail | 10 | **Blocker** for enterprise / franchise |
| Offline resilience | 5 | High risk for unstable networks |
| Accounting / tax integrity | 55 | Partial — split tender & refunds weak |
| **Overall production readiness** | **42 / 100** | **Not ready for unattended multi-branch production** |

**Top financial-loss risks**

1. No real refunds / voids with inventory restore  
2. POS sale does **not** deduct recipe/inventory  
3. No shift / cash-drawer reconciliation  
4. No audit log for discounts, voids, reopen  
5. Split payment stored as single method (reporting skew)  
6. Duplicate payment not idempotent at DB layer  
7. Online hub demo can be mistaken for live orders  

---

# PART A — Transaction Matrix by Section

> Format per flow: **Status | Roles | Preconditions | Actions | System | DB | Inventory | Financial | Notify | Failures | Recovery | Audit | Validations | Tests | API**

---

## SECTION 1 — Dine-in order flow

| Flow | St | Roles | Preconditions | User Actions | System Actions | DB Updates | Inventory | Financial | Notify | Failure Cases | Recovery | Audit | Validations | Test Cases | API Events |
|------|----|-------|---------------|--------------|----------------|------------|-----------|-----------|--------|----------------|----------|-------|-------------|------------|------------|
| Walk-in order (counter) | I | Cashier | Auth + POS permission | Add items → Pay | `processCheckout` | `pos_orders` completed + items | **None** | +Sales, +Tax, +Cash/method | orders-updated | Gateway fail, empty cart | Retry pay; discard cart | **Missing** | Cart not empty; tender ≥ total (cash) | Happy path cash/UPI/card; tax calc | Insert order |
| Attach table | I | Cashier/Waiter | Table free or allow occupy | Open table on POS | `ensureOpenBill` / `openTableOnPOS` | `pos_orders` open; table occupied | — | Open check (unpaid) | — | Table already billed | Move/merge or discard | Missing | Table exists; outlet match | Attach occupied vs free | Upsert open order |
| Move table | I | Waiter/Manager | Open bill | Move party | `movePartyToTable` | Update `table_id` on open order | — | No change | — | Target occupied | Unmerge/choose free | Missing | Target free/valid | Move mid-prep | Update open order |
| Merge tables | I | Waiter/Manager | ≥2 tables | Merge | `mergeTables` | Route bill to primary | — | Combined open check | — | Conflicting bills | Abort merge | Missing | Same outlet | Merge with KOTs fired | Update tables + bill |
| Split table (by seat) | M | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| Split payment (tender) | P | Cashier | Checkout open | Enter split lines | Sum ≥ total → pay as `split` | Single `payment_method=split` | — | Sales OK; method mix **lost** | — | Sum &lt; total | Fix lines | Missing | Sum ≥ total | 2-way / 3-way split | processCheckout |
| Transfer waiter | M | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| Add items | I | Cashier/Waiter | Open cart/bill | Tap product | `addItem` / sync bill | Open order items (table) | Display OOS only | Open liability ↑ | — | OOS product | Block add | Missing | Product active | Add with modifiers | Upsert items |
| Remove items | I | Cashier | Unfired / allowed | Remove line | Update cart/bill | Update items | — | Open ↓ | — | Fired item remove | Void flow (missing) | Missing | Permission | Remove unfired | Update |
| Qty +/- | I | Cashier | Line exists | Stepper | Update qty | Update | — | Open Δ | — | Qty &lt; 1 | Remove line | Missing | Qty ≥ 1 | Inc/dec | Update |
| Add/remove modifier | P | Cashier | Product supports | Addon modal | Cart notes/modifiers | Notes on items | — | Price Δ | — | Invalid combo | Reset | Missing | Recipe rules | Addon price | — |
| Kitchen instruction | P | Cashier | Line exists | Notes | Store notes | Item notes | — | — | KOT print notes | Lost notes | Reprint | Missing | Length limit | Special instr. | — |
| Hold order | I | Cashier | Counter cart | Hold | Insert held order | `status=held` | — | Deferred | — | Hold fail | Retry | Missing | Cart not empty | Hold/resume | Insert held |
| Resume order | I | Cashier | Held exists | Resume | Load cart; delete held | Delete held | — | — | — | Concurrent resume | Refresh list | Missing | Held still exists | Resume twice | Delete held |
| Print KOT | P | Cashier | Table bill | Send / Print | `fireKitchenTicket` + print | `status=sent` ticket | — | — | KDS | Print fail | Reprint UI | Missing | Items to fire | Fire once | Insert sent |
| Reprint KOT | P | Cashier | Ticket exists | Print again | `window.print` / Thermal | No new row ideally | — | — | — | Printer offline | Retry | Missing | Ticket id | Duplicate print | — |
| Fire course | M | — | Courses model | — | — | — | — | — | — | — | — | — | — | — | — |
| Void item | M | Manager | Fired/paid rules | — | Stub “approval” only | — | Should restore | Should reverse | — | — | — | Required | PIN + reason | — | — |
| Void order | M | Manager | Open/completed rules | — | Stub | — | Restore | Reverse sale | — | — | — | Required | — | — | — |
| Apply discount | P | Cashier+perm | Checkout | Enter %/amt | Apply to total | Stored on order fields | — | Sales ↓ | — | Over-discount | Cap | Missing | Max % / role | Cap 100% | — |
| Apply coupon | P | Cashier | Valid voucher | Apply code | `useVoucherStore` validate | Order notes/discount | — | Sales ↓ | — | Expired/used | Reject | Missing | One-time / outlet | Valid/invalid | Voucher API |
| Service charge | P | Cashier | Checkout | Toggle/rate | Add to total | On order | — | +SC | — | Wrong rate | Correct | Missing | Config rate | SC on/off | — |
| Taxes | I | System | Tax rate set | Auto | Compute tax | Tax on order | — | +Tax | — | Wrong rate | Recalc | Missing | Inclusive/excl | GST cases | — |
| Partial payment | M | — | — | — | — | Balance due | — | Partial AR | — | — | — | — | — | — | — |
| Cash / Card / UPI | I | Cashier | Checkout | Select method | Complete | Method + tender | — | Till impact | Receipt | Wrong tender | Adjust | Missing | Tender ≥ total | Each method | Insert |
| Wallet / Gift / Store credit | P | Cashier | Checkout | Select | Prompt only | Method string | — | **No ledger** | — | Fake settle | Block launch | Required | Balance check | — | Ledger API |
| Loyalty redeem | M | — | Points balance | — | Display only | — | — | — | — | — | — | — | — | — | — |
| Round off | P | System | Checkout | Auto/option | Adjust paise | On total | — | ±Round | — | Policy mismatch | Config | Missing | Policy | ±0.50 | — |
| Complete payment | I | Cashier | Valid tender | Complete | `processCheckout` | completed | **No deduct** | Close sale | Event | Double click | UI guard only | Missing | Idempotency | Double submit | Insert |
| Print receipt | P | Cashier | Paid | Print | Thermal/`print` | — | — | — | — | Offline printer | Retry | Missing | — | Print | — |
| WhatsApp receipt | P | Cashier | Paid + phone | Share | `wa.me` draft | — | — | — | WA draft | No phone | Ask phone | Missing | Phone format | With/without # | — |
| Email receipt | D | Cashier | Paid | Email | UI “queued” | — | — | — | Fake | — | — | — | Email valid | — | Email API |
| Reopen bill | M | Manager | Completed | — | — | Reverse/reopen | Reverse | Reverse | — | Abuse | PIN | Required | Time window | — | — |
| Refund | M | Manager | Completed | — | Filters only | — | Restore | Reverse | — | Fraud | — | Required | — | — | — |
| Exchange | M | — | — | — | — | — | Net Δ | Net Δ | — | — | — | — | — | — | — |
| Cancel bill (open) | I | Cashier | Open check | Discard | `discardBill` | Delete open | — | No sale | — | Fired KOTs orphan | Cancel KOTs | Missing | Confirm | Discard after fire | Delete |

---

## SECTION 2 — Takeaway flow

| Flow | St | Notes / Gap |
|------|----|-------------|
| Walk-in takeaway | P | Counter POS works; **no order_type=takeaway** flag |
| Phone takeaway | D | Online hub Phone platform demo only |
| QR takeaway | P | QR is dine-in table-bound today |
| Website takeaway | D | Hub Website demo |
| Pickup scheduling | M | — |
| Packing charges | D | Online seed only |
| Customer notes | P | Cart notes / guest instructions |
| Customer arrival | M | — |
| Complete pickup | M | No pickup state machine |

**Launch:** Counter takeaway operable as unlabeled walk-in. Do **not** market channel takeaway until types + packing + pickup states exist.

---

## SECTION 3 — Delivery flow

| Flow | St | Notes |
|------|----|-------|
| Restaurant own delivery | M | No rider assignment on POS |
| Swiggy / Zomato / ONDC | D | UI + simulator only |
| Website / WhatsApp / Phone delivery | D | Hub demo |
| Partner assign / arrived / picked / delivered | D | Seeded partner fields |
| Failed delivery / unreachable | D | Alert kinds exist; no ops write |
| Refund / cancellation (live) | D/M | Local status only |

**Launch blocker:** Selling “live Swiggy/Zomato” without webhook + accept SLA = order loss and chargebacks.

---

## SECTION 4 — Online order flow

| Flow | St | System today | Production need |
|------|----|--------------|-----------------|
| New order | D | Seed / simulator | Webhook → DB → realtime |
| Accept | D | Local → preparing | Persist + KOT + print |
| Reject | D | Local rejected | Platform API reject |
| Auto accept / reject | P | Settings flags local | Server-side + SLA |
| Preparing / Ready / Picked / Delivered | D | Local status | Sync to aggregator |
| Cancelled / Expired | D | Local / timeout tick | Platform + refund rules |
| Payment failed | D | Alert kind only | Webhook handling |
| Refund | D | Status only | Finance + inventory |

**API events (target):** `order.created`, `order.accepted`, `order.rejected`, `order.status_changed`, `payment.updated`, `rider.updated`

---

## SECTION 5 — Kitchen flow

| Flow | St | Evidence |
|------|----|----------|
| KOT creation | I | `fireKitchenTicket` → `pos_orders` sent |
| KOT modification | P | New items = new fire; no amend ticket |
| KOT cancellation | M | No cancel-KOT with inventory |
| Course firing | M | — |
| Item completed | P | Ticket-level KDS status, not item-level |
| Kitchen delay | D | Online alert kind |
| Priority order | D | Online `priority` flag |
| Multiple kitchens | M | Single KDS |
| Kitchen reassignment | M | — |

---

## SECTION 6 — Inventory flow

| Flow | St | Impact if launched as-is |
|------|----|--------------------------|
| Recipe deduction on POS sale | M | **Stock stays high; COGS wrong** |
| Raw material deduction | M | Same |
| Stock adjustment | I | Manual adjustments module |
| Daily stock | I | Daily stock update module |
| Stock transfer | P | Transfer in/out adjustments |
| Wastage / spoilage | I | Waste log module |
| Purchase receiving | I | PO receive updates stock |
| Supplier return | M | — |
| Stock reconciliation | P | Manual only |
| Negative inventory | P | OOS display; no hard block everywhere |

---

## SECTION 7 — Purchase flow

| Flow | St |
|------|----|
| Create supplier | I |
| Purchase order | I |
| Approve PO | I |
| Receive goods / partial | I / P |
| Reject goods | P |
| Supplier invoice | P |
| Supplier payment | P |
| Purchase return | M |

---

## SECTION 8 — Customer flow

| Flow | St |
|------|----|
| Walk-in / create / lookup | I / P |
| Membership | M |
| Loyalty earn / redeem | M (display only) |
| Customer credit / payment / refund | M |

---

## SECTION 9 — Payment flow

| Flow | St | Risk |
|------|----|------|
| Cash / UPI / Card | I | Medium — no till reconciliation |
| Split | P | High — method mix not stored |
| Wallet / Credit / Gift / Store credit | P | **Critical** — can “pay” without balance |
| Manual payment | I | — |
| Payment retry / status check | P | Gateways have status poll |
| Reversal / failure / timeout | P | Gateway paths partial |
| Duplicate payment | P | UI debounce only — **no idempotency key** |

---

## SECTION 10 — Refund flow

| Flow | St | Launch Blocker |
|------|----|----------------|
| Item / partial / full refund | M | **Yes** |
| Cash / gateway / wallet / credit refund | M | **Yes** |
| Inventory restoration | M | **Yes** |
| Kitchen reversal | M | **Yes** |

---

## SECTION 11 — Admin / shift flow

| Flow | St | Launch Blocker |
|------|----|----------------|
| Shift open / close | M | **Yes** (multi-cashier) |
| Cash drawer / adjustment | M | **Yes** |
| Expense / income / petty cash | M | High |
| Day closing / Z / X report | M | **Yes** |

---

## SECTION 12 — User / security flow

| Flow | St |
|------|----|
| Login / logout | I |
| Session timeout | P |
| Permission denied | I |
| Role validation | I |
| Manager override / PIN | M |

---

## SECTION 13 — Printer flow

| Flow | St |
|------|----|
| Receipt / kitchen via browser print | P |
| Label / QR print | P (QR preview/print) |
| Printer offline / retry queue / ESC-POS | M |
| Duplicate print control | M |

---

## SECTION 14 — Offline flow

| Flow | St | Risk |
|------|----|------|
| Detect disconnect | M | High |
| Offline billing queue | M | **Critical** for unstable net |
| Sync / conflict resolution | M | **Critical** |

LocalStorage table bills help resilience but are **not** a full offline POS.

---

## SECTION 15 — Notification flow

| Event | St |
|-------|----|
| New online order toast | D |
| Kitchen ready (KDS) | I (visual) |
| Driver arrived | D |
| Payment success UI | I |
| Payment failed gateway | P |
| Refund notify | M |
| Stock low | P / M |
| Order delayed | D |

---

## SECTION 16 — Validations matrix

| Validation | St | Launch Blocker |
|------------|----|----------------|
| Prevent duplicate orders | P | Medium |
| Prevent duplicate payment | P | **Yes** |
| Prevent negative stock | P | High |
| Prevent over-discount | P | High |
| Prevent deleting paid bills | P | High |
| Prevent editing completed orders | P | High |
| Prevent invalid split | P | Medium |
| Prevent invalid merge | P | Medium |
| Prevent invalid transfer | P | Medium |
| Prevent stock mismatch | M | **Yes** if inventory sold |
| Prevent recipe mismatch | M | High |
| Manager PIN on void/discount | M | **Yes** |

---

## SECTION 17 — Audit log requirements

**Current:** Missing dedicated audit store.

**Required on every sensitive op:**

| Field | Required |
|-------|----------|
| User id / name / role | Yes |
| Timestamp (UTC + local) | Yes |
| Branch / outlet / terminal | Yes |
| Action type | Yes |
| Entity (order/item/payment) | Yes |
| Old value / new value | Yes |
| Reason / PIN approver | Yes |
| IP / device / user-agent | Yes |

**Must-audit actions:** discount, void, refund, reopen, price override, discard after fire, cash adjust, stock adjust, permission override, gateway reverse.

---

## SECTION 18 — Report impact map

| Transaction | Sales | Tax | Inventory | Recipe | Supplier | Customer | Cash | Shift | Profit | Loyalty | Analytics |
|-------------|-------|-----|-----------|--------|----------|----------|------|-------|--------|---------|-----------|
| Completed POS pay | ↑ | ↑ | **Should ↓ (now no)** | Should fire | — | Optional | ↑ method | Should ↑ | ↑ | Should earn | ↑ |
| Open table bill | — | — | — | — | — | — | — | — | — | — | Open checks |
| KOT fire | — | — | Should reserve | — | — | — | — | — | — | — | Kitchen SLA |
| Discard open | — | — | — | — | — | — | — | — | — | — | Cancelled open |
| Hold | — | — | — | — | — | — | — | — | — | — | Held count |
| Refund (target) | ↓ | ↓ | ↑ restore | Reverse | — | History | ↓ | ↓ | ↓ | Reverse | Refunds |
| PO receive | — | — | ↑ | — | ↑ liability | — | — | — | — | — | Purchases |
| Waste | — | — | ↓ | — | — | — | — | — | ↓ | — | Waste |
| Online demo | Fake metrics | — | — | — | — | — | — | — | — | — | **Exclude from live** |

---

## SECTION 19 — Edge cases

| Edge case | Current handling | Required |
|-----------|------------------|----------|
| Power failure mid-pay | Unclear; may orphan gateway session | Idempotent pay + resume |
| Internet loss | Soft fail / local bills | Offline queue + sync |
| Printer failure | Browser error | Queue + retry + alert |
| Duplicate clicks | `isCompleting` UI | DB unique payment intent |
| Browser refresh | Cart may persist partially | Recover open bill |
| Multiple tabs | Race on table bill | Optimistic lock / version |
| Concurrent users same table | Last write wins | Lock / claim |
| Simultaneous payment | Possible double complete | Idempotency key |
| Kitchen offline | Ticket still inserted | Queue + KDS reconnect |
| Gateway timeout | Status check path | Auto reconcile job |

---

# PART B — Detailed flow cards (critical paths)

### B1. Counter cash sale — **I** (inventory gap)

| Field | Detail |
|-------|--------|
| **Flow name** | Counter cash complete |
| **User role** | Cashier (`POS_ACCESS`, `POS_CHECKOUT`) |
| **Preconditions** | Logged in; cart has sellable items; outlet selected |
| **User actions** | Add items → Charge/Checkout → Cash → Enter tender → Complete |
| **System actions** | Tax/SC/round → insert completed order → clear cart → receipt UI |
| **Database** | `pos_orders`, `pos_order_items` |
| **Inventory** | **None today** — must deduct recipe BOM |
| **Financial** | +Gross, +Tax, +Cash tender, +Change |
| **Notifications** | `cafepilots:orders-updated` |
| **Failures** | Empty cart; tender &lt; total; DB insert fail |
| **Recovery** | Re-open cart; retry insert; do not double-charge |
| **Audit** | Missing — log amount, tender, change, user |
| **Validations** | Qty&gt;0; price≥0; tender≥total; permission |
| **Tests** | Exact tender; over-tender change; tax 18%; double-click |
| **API** | Supabase insert; optional gateway N/A |

### B2. Table dine-in settle — **I**

| Field | Detail |
|-------|--------|
| **Flow name** | Table open → fire → settle |
| **Roles** | Waiter + Cashier |
| **Preconditions** | Table available; schema deployed |
| **Actions** | Open table → add → Send KOT → guest → Pay |
| **System** | Open order upsert; sent tickets; settle closes open; table cleaning |
| **DB** | open / sent / completed rows; `dining_tables` |
| **Inventory** | Not deducted |
| **Financial** | Sale on settle only |
| **Failures** | Fire with no items; settle with gateway fail |
| **Recovery** | Refire; retry pay; discard with manager |
| **Audit** | Missing |
| **Tests** | Fire twice (only unfired); settle auto-fires remainder |

### B3. QR guest order — **I** (pay staff-side)

| Field | Detail |
|-------|--------|
| **Flow** | Guest QR → kitchen → staff pay |
| **Roles** | Guest + Staff |
| **System** | `order_source=qr`; fire kitchen; guest polls status |
| **Financial** | No guest payment |
| **Gap** | No pay-at-table |

### B4. Online accept — **D**

| Field | Detail |
|-------|--------|
| **Flow** | Demo accept |
| **System** | Zustand only; alert claims KOT |
| **DB** | None |
| **Do not** | Enable for real restaurants without integrator |

### B5. Refund — **M** (blocker)

| Field | Detail |
|-------|--------|
| **Required** | Manager PIN → reason → reverse payment → restore stock → cancel/adjust KOT → audit → reports |
| **Tests** | Partial/full; same-day; gateway reverse; cash out of drawer |

---

# PART C — Implementation checklist

| Priority | Module | Flow | Validation | Status | Risk | Complexity | Owner | Testing | Dependencies | Launch Blocker |
|----------|--------|------|------------|--------|------|------------|-------|---------|--------------|----------------|
| P0 | Payments | Idempotent complete | Unique payment_intent | P | Critical | M | Backend | Load + double click | DB constraint | **Yes** |
| P0 | Refunds | Full/partial refund | PIN + reason | M | Critical | L | POS+Finance | Cash/gateway cases | Audit, inventory | **Yes** |
| P0 | Inventory | Deduct on sale | Non-negative / allow oversell flag | M | Critical | L | Inventory | Recipe + modifiers | Recipes BOM | **Yes*** |
| P0 | Shift | Open/close + Z | Drawer variance | M | Critical | L | Ops | Multi-cashier | Payments | **Yes** |
| P0 | Audit | Write audit_log | Immutable | M | Critical | M | Platform | Tamper attempt | Auth | **Yes** |
| P0 | Online | Hide/disable demo in prod | Feature flag | D | High | S | Product | Flag off | Config | **Yes** if marketed |
| P1 | Payments | Split tender lines | Sum = total | P | High | M | POS | 3-way split | Reports | No |
| P1 | Voids | Void item/order | PIN + KOT reverse | M | High | L | POS+KDS | Fired vs unfired | Audit | **Yes** |
| P1 | Discount | Cap + role | Max % | P | High | S | POS | Over-cap | Permissions | No |
| P1 | Locking | Bill version | Optimistic lock | M | High | M | Tables | 2 tabs | Realtime | No |
| P1 | Wallet/Gift | Ledger balances | Sufficient funds | P | Critical | L | Finance | Overdraw | Customers | **Yes** if enabled |
| P1 | Printer | ESC/POS queue | Retry | P | Medium | L | Ops | Offline printer | Hardware | No |
| P2 | Online | Aggregator webhooks | Signature verify | D | Critical | XL | Integrations | SLA accept | Secrets | When selling |
| P2 | Loyalty | Earn/redeem | Balance | M | Medium | L | CRM | Points math | Customers | No |
| P2 | Takeaway | order_type + packing | Type required | M | Medium | M | POS | Packing | Menu | No |
| P2 | Kitchen | Courses / stations | Route rules | M | Medium | L | KDS | Multi-station | Menu tags | No |
| P2 | Offline | Queue sync | Conflict UI | M | High | XL | Platform | Airplane mode | Local DB | Market-dependent |
| P3 | Waiter transfer | Assign waiter | Role | M | Low | S | Tables | Transfer | Users | No |
| P3 | Email receipt | Send email | Valid email | D | Low | M | Comms | Delivery | Provider | No |
| P3 | Purchase return | Return to supplier | Qty | M | Medium | M | Purchase | Partial return | Stock | No |

\*Blocker if restaurant relies on live stock/COGS; waive only with written ops policy (manual daily stock).

---

# PART D — Deliverables

## 1. Complete Transaction Matrix

See **PART A** (Sections 1–15). Count of tracked flows: **120+**.

## 2. Validation Checklist (QA gate)

- [ ] Empty cart cannot complete  
- [ ] Cash tender ≥ total  
- [ ] Discount ≤ role max  
- [ ] Voucher expiry / one-time / outlet  
- [ ] Split sum ≥ total; persist lines  
- [ ] Double Complete does not create 2 sales  
- [ ] Completed bill not editable without reopen+PIN  
- [ ] Paid bill not deletable  
- [ ] Merge/move only valid tables same outlet  
- [ ] Fire only unfired lines  
- [ ] Stock cannot go negative (or flagged oversell)  
- [ ] Recipe exists before deduct  
- [ ] Gateway success required before complete  
- [ ] Online accept only when connected + within SLA  
- [ ] Manager PIN on void/refund/reopen/high discount  

## 3. QA Checklist

| Suite | Cases |
|-------|-------|
| Smoke | Login → POS cash sale → history → logout |
| Table | Open → add → KOT → KDS advance → pay → cleaning |
| QR | Scan → order → KDS → staff pay |
| Payments | Cash/UPI/Card/gateway happy + fail |
| Held | Hold → resume → pay |
| Merge/Move | Two tables; mid-KOT move |
| Negative | Double pay; over-discount; discard after fire |
| Inventory | (After fix) sale deducts; refund restores |
| Shift | (After fix) open → sales → close → Z matches |
| Concurrency | Two devices same table |
| Print | Receipt + KOT browser/device |
| Permissions | Cashier vs manager vs kitchen |

## 4. Missing Features List (launch-critical first)

1. Refunds + voids + reopen with PIN  
2. Inventory/recipe deduction on POS sale  
3. Shift / cash drawer / Z-X reports  
4. Immutable audit log  
5. Payment idempotency  
6. Wallet/gift/store-credit ledgers (or disable methods)  
7. Split tender line persistence  
8. Live online aggregator integration  
9. Offline billing sync  
10. Manager override PIN  
11. Optimistic locking on open bills  
12. Order types (dine-in / takeaway / delivery)  
13. Partial payments / balance due  
14. Course-based firing / multi-kitchen  
15. Waiter assignment transfer  
16. Purchase returns  
17. Loyalty earn/redeem  
18. Real email receipts + printer queue  

## 5. Production Readiness Score

| Area | Score | Weight | Weighted |
|------|------:|-------:|---------:|
| Billing accuracy | 70 | 15% | 10.5 |
| Payment integrity | 55 | 15% | 8.3 |
| Inventory integrity | 28 | 15% | 4.2 |
| Kitchen ops | 72 | 10% | 7.2 |
| Refunds/voids | 15 | 10% | 1.5 |
| Shift/cash control | 5 | 10% | 0.5 |
| Audit/security | 25 | 10% | 2.5 |
| Online channels | 20 | 5% | 1.0 |
| Reporting | 65 | 5% | 3.3 |
| Offline/resilience | 15 | 5% | 0.8 |
| **TOTAL** | | **100%** | **≈ 40 / 100** |

**Rounded readiness: 42/100 — Conditional pilot only** (single branch, trained staff, inventory manual, online hub off, no wallet methods).

## 6. Security Review

| Finding | Severity |
|---------|----------|
| No manager PIN on void/discount | High |
| No audit trail for money events | Critical |
| RLS often disabled (MVP) | High |
| Gateway secrets must stay server-side | OK if followed |
| Demo online orders could confuse staff | Medium |
| Permission model exists but override missing | Medium |

## 7. Performance Review

| Area | Assessment |
|------|------------|
| POS grid | Acceptable; watch image load |
| Table hydrate interval | 15s poll — OK for mid volume |
| Online simulator timers | Disable in prod |
| KDS realtime | Good pattern |
| 1000+ online orders/day | **Not ready** without DB + indexing + virtualization hardening |

## 8. Data Integrity Review

| Issue | Severity |
|-------|----------|
| Split method loses tender breakdown | High |
| Counter sale may appear on KDS as pending | Medium |
| Held transfer does not bind real table bill | Medium |
| No payment idempotency key | Critical |
| Open bill last-write-wins | High |

## 9. Inventory Integrity Review

| Issue | Severity |
|-------|----------|
| POS sale does not consume stock | **Critical** |
| Refund cannot restore (no refund) | Critical |
| Waste/PO receive work in isolation | OK |
| OOS is soft | Medium |

## 10. Accounting Integrity Review

| Issue | Severity |
|-------|----------|
| No shift Z to prove cash | Critical |
| Wallet/gift can record sale without asset move | Critical |
| Tax computed but inclusive/exclusive policy unclear | Medium |
| Service charge / round-off partial | Medium |
| Refunds absent → books irreversible without manual JV | Critical |
| Online demo metrics must not enter finance | High |

---

# PART E — Recommended launch waves

### Wave 0 — Pilot (single outlet) — 2–4 weeks
- Disable Online Hub in production UI (or label DEMO)  
- Disable wallet/gift/store credit methods  
- Document manual inventory closing  
- Train: no voids except discard open before pay  
- Cash/UPI/Card + table + KDS + QR only  

### Wave 1 — Cash control — **must before multi-shift**
- Shift open/close + Z report  
- Refunds/voids + PIN  
- Audit log  
- Payment idempotency  

### Wave 2 — Stock integrity
- Recipe deduct on complete  
- Restore on refund  
- Hard OOS policy  

### Wave 3 — Channels
- Aggregator webhooks  
- Order types takeaway/delivery  
- Real rider states  

### Wave 4 — Resilience
- Offline queue  
- Printer service  
- Multi-kitchen / courses  

---

# PART F — API event catalog (target)

| Event | When | Payload essentials |
|-------|------|--------------------|
| `order.created` | Open/held/online | id, outlet, source, items |
| `order.updated` | Items change | version, items |
| `kot.fired` | Kitchen send | ticket_id, items |
| `kot.cancelled` | Void after fire | ticket_id, reason |
| `payment.initiated` | Gateway start | intent_id, amount |
| `payment.succeeded` | Paid | intent_id, method, refs |
| `payment.failed` | Fail/timeout | intent_id, code |
| `payment.refunded` | Refund | amount, method |
| `inventory.adjusted` | Deduct/restore | sku, qty, reason |
| `shift.opened` / `shift.closed` | Till | expected vs actual |
| `audit.recorded` | Sensitive op | actor, before/after |

---

## Sign-off

| Role | Question | Sign |
|------|----------|------|
| Product | Accept Wave 0 scope? | ____ |
| Engineering | P0 backlog estimated? | ____ |
| QA | Validation checklist automated? | ____ |
| Finance | Inventory & refund gaps accepted for pilot? | ____ |
| Ops | Staff SOPs for no-void / manual stock? | ____ |

---

*This matrix is grounded in the current CafePilots codebase. Re-score after each Wave. Companion narrative: `TRANSACTION_FLOWS.md`.*
