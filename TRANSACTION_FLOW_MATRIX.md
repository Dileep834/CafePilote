# CafePilots — Complete Transaction Flow Matrix

**Document type:** Pre-production audit (Solution Architecture · QA · Product)  
**System:** CafePilots Restaurant POS / ERP  
**Audit date:** 2026-07-21 (updated)  
**Code baseline:** `master` @ `ec5cf48` — Phase 1 ops integrity · Phase 2 kitchen/lifecycle/GRN · Phase 3 BI/Copilot · Online Hub (demo)

**Schema deploy (required for full I paths):**  
`scripts/phase1_production_schema.sql` → `phase2_enterprise_schema.sql` → `phase3_saas_schema.sql`

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
| Core dine-in + counter billing | 82 | Launchable with controls |
| Payments (cash/card/UPI + gateways) | 78 | Intent + idempotency coded; wallet still unsafe |
| Kitchen / KDS | 80 | Stations, bump/recall, lifecycle events |
| Inventory integrity on sale | 72 | Check + BOM deduct + refund restore (needs recipes + schema) |
| Refunds / voids / reopen | 65 | **Refunds I**; voids/reopen still **M** |
| Online aggregators | 22 | Demo only — do not sell as live |
| Shift / till / Z-report | 70 | Open/close/Z + attach sale (schema required) |
| Audit trail | 70 | Immutable `audit_logs` + PIN overrides |
| Offline resilience | 15 | Still high risk |
| Accounting / tax integrity | 68 | Split tender lines on intent; refund gateway reverse weak |
| BI / AI ops intelligence | 75 | Executive BI + Copilot (read-only) |
| **Overall production readiness** | **68 / 100** | **Conditional single-outlet pilot** (schemas on, Online Hub off, wallets disabled) |

**Cleared since prior 42/100 audit**

1. Payment intent + checkout idempotency key + lock  
2. Inventory availability check + recipe BOM deduct on paid sale  
3. Refunds (full/partial/item) + inventory restore + manager PIN  
4. Shift open/close + cash movements + Z variance  
5. Audit log writers on checkout / refund / shift / PIN  
6. Manager PIN on high discount, refund, shift close  
7. Purchase receive prefers GRN + ledger  
8. Loyalty **earn** on checkout (phone match)  
9. Notifications center + kitchen/stock/GRN alerts  
10. KDS station filter, bump/recall, lifecycle timestamps  

**Remaining financial-loss / launch risks**

1. Voids + reopen bill still missing  
2. Wallet / gift / store credit — UI without ledger (disable)  
3. Online hub is demo/simulator — do not market as live  
4. Post-pay inventory failure keeps sale (manual adjust alert)  
5. Loyalty **redeem** missing  
6. Offline billing missing  
7. Phase SQL must be applied or Phase 1 paths soft-fallback  
8. RLS still largely app-layer (not JWT-bound)  

---

# PART A — Transaction Matrix by Section

> Format per flow: **Status | Roles | Preconditions | Actions | System | DB | Inventory | Financial | Notify | Failures | Recovery | Audit | Validations | Tests | API**

---

## SECTION 1 — Dine-in order flow

| Flow | St | Roles | Preconditions | User Actions | System Actions | DB Updates | Inventory | Financial | Notify | Failure Cases | Recovery | Audit | Validations | Test Cases | API Events |
|------|----|-------|---------------|--------------|----------------|------------|-----------|-----------|--------|----------------|----------|-------|-------------|------------|------------|
| Walk-in order (counter) | I | Cashier | Auth + POS permission | Add items → Pay | `processCheckout` | `pos_orders` + intent + items | **BOM deduct after pay** (if tracking on) | +Sales, +Tax, +Cash/method; shift attach | orders-updated + notify | Gateway fail, stock block, empty cart | Retry; do not double-charge (idempotency) | **Audit checkout** | Cart not empty; tender ≥ total; stock check | Happy path cash/UPI/card; tax; double-click | Intent + insert order |
| Attach table | I | Cashier/Waiter | Table free or allow occupy | Open table on POS | `ensureOpenBill` / `openTableOnPOS` | `pos_orders` open; table occupied | — | Open check (unpaid) | — | Table already billed | Move/merge or discard | P | Table exists; outlet match | Attach occupied vs free | Upsert open order |
| Move table | I | Waiter/Manager | Open bill | Move party | `movePartyToTable` | Update `table_id` on open order | — | No change | — | Target occupied | Unmerge/choose free | P | Target free/valid | Move mid-prep | Update open order |
| Merge tables | I | Waiter/Manager | ≥2 tables | Merge | `mergeTables` | Route bill to primary | — | Combined open check | — | Conflicting bills | Abort merge | P | Same outlet | Merge with KOTs fired | Update tables + bill |
| Split table (by seat) | M | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| Split payment (tender) | I/P | Cashier | Checkout open | Enter split lines | Validate sum → `completePaymentIntent` tender lines | Intent + `payment_method=split` + line rows | BOM as sale | Sales OK; method mix **on intent** | — | Sum &lt; total | Fix lines | Audit checkout | Sum ≥ total | 2-way / 3-way split | processCheckout |
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
| Apply discount | I/P | Cashier+perm | Checkout | Enter %/amt | Apply; high discount → manager PIN | Stored on order fields | — | Sales ↓ | — | Over-discount | Cap + PIN | Audit + approval id | Max % / role | Cap 100%; PIN path | — |
| Apply coupon | P | Cashier | Valid voucher | Apply code | `useVoucherStore` validate | Order notes/discount | — | Sales ↓ | — | Expired/used | Reject | P | One-time / outlet | Valid/invalid | Voucher API |
| Service charge | P | Cashier | Checkout | Toggle/rate | Add to total | On order | — | +SC | — | Wrong rate | Correct | P | Config rate | SC on/off | — |
| Taxes | I | System | Tax rate set | Auto | Compute tax | Tax on order | — | +Tax | — | Wrong rate | Recalc | P | Inclusive/excl | GST cases | — |
| Partial payment | M | — | — | — | — | Balance due | — | Partial AR | — | — | — | — | — | — | — |
| Cash / Card / UPI | I | Cashier | Checkout | Select method | Complete + intent | Method + tender + txns | Deduct after pay | Till + shift | Receipt | Wrong tender | Adjust | Audit | Tender ≥ total | Each method | Intent + insert |
| Wallet / Gift / Store credit | P | Cashier | Checkout | Select | Prompt only | Method string | — | **No ledger** | — | Fake settle | **Disable** | Required | Balance check | — | Ledger API |
| Loyalty redeem | M | — | Points balance | — | Earn only today | — | — | — | — | — | — | — | — | — | — |
| Round off | P | System | Checkout | Auto/option | Adjust paise | On total | — | ±Round | — | Policy mismatch | Config | P | Policy | ±0.50 | — |
| Complete payment | I | Cashier | Valid tender | Complete | `processCheckout` | completed + intent succeeded | **BOM deduct** | Close sale + shift | Event + notify | Double click | Idempotency key + lock | Audit | Stock + cash validators | Double submit | Intent + insert |
| Print receipt | P | Cashier | Paid | Print | Thermal/`print` | — | — | — | — | Offline printer | Retry | P | — | Print | — |
| WhatsApp receipt | P | Cashier | Paid + phone | Share | `wa.me` draft | — | — | — | WA draft | No phone | Ask phone | P | Phone format | With/without # | — |
| Email receipt | D | Cashier | Paid | Email | UI “queued” | — | — | — | Fake | — | — | — | Email valid | — | Email API |
| Reopen bill | M | Manager | Completed | — | — | Reverse/reopen | Reverse | Reverse | — | Abuse | PIN | Required | Time window | — | — |
| Refund | I | Manager | Completed | New refund UI | `processRefund` + PIN | `refund_transactions` | **Restore BOM** | Reverse amount + shift refund | Notify/UI | Fraud / over-refund | Cap remaining | Audit refund | Amount ≤ remaining | Full/partial/item | Insert refund |
| Exchange | M | — | — | — | — | — | Net Δ | Net Δ | — | — | — | — | — | — | — |
| Cancel bill (open) | I | Cashier | Open check | Discard | `discardBill` | Delete open | — | No sale | — | Fired KOTs orphan | Cancel KOTs | P | Confirm | Discard after fire | Delete |

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
| Bump / recall | I | `bumpOrder` / `recallOrder` on KDS |
| Station routing filter | P | Keyword stations (Main/Bar/Coffee/Dessert/Tandoor) |
| Lifecycle timestamps | I | `order_lifecycle_events` + kitchen transitions |
| Kitchen delay | P | Age colors + notify on ready; no auto escalation job |
| Priority order | D | Online `priority` flag |
| Multiple kitchens | P | Station filter UI; DB `kitchen_stations` ready |
| Kitchen reassignment | M | — |

---

## SECTION 6 — Inventory flow

| Flow | St | Impact if launched as-is |
|------|----|--------------------------|
| Recipe deduction on POS sale | I | Deduct after pay when tracking on + recipes exist |
| Pre-sale stock check | I | Blocks checkout when insufficient (ops settings) |
| Raw material deduction | I | Via recipe BOM expansion |
| Stock adjustment | I | Manual adjustments module |
| Daily stock | I | Daily stock update module |
| Stock transfer | I/P | Inter-store transfer + ledger (Phase 3); UI product UUID |
| Wastage / spoilage | I | Waste log module |
| Purchase receiving | I | PO Received → GRN preferred + ledger fallback |
| Supplier return | P | `createPurchaseReturn` service; UI light |
| Stock reconciliation | P | Manual + low-stock notify |
| Negative inventory | P | Hard block when tracking disallows; else OOS display |

---

## SECTION 7 — Purchase flow

| Flow | St |
|------|----|
| Create supplier | I |
| Purchase order | I |
| Approve PO | I |
| Receive goods / partial | I / P (GRN formal path) |
| Reject goods | P |
| Supplier invoice | P |
| Supplier payment | P |
| Purchase return | P (service; UI thin) |

---

## SECTION 8 — Customer flow

| Flow | St |
|------|----|
| Walk-in / create / lookup | I / P |
| Membership | M |
| Loyalty earn | I (1 pt / ₹100 when phone matches customer) |
| Loyalty redeem | M |
| Customer credit / payment / refund | M |

---

## SECTION 9 — Payment flow

| Flow | St | Risk |
|------|----|------|
| Cash / UPI / Card | I | Medium — use shifts for till |
| Split | I/P | Tender lines on payment intent; order still stores `split` |
| Wallet / Credit / Gift / Store credit | P | **Critical** — disable until ledger |
| Manual payment | I | — |
| Payment retry / status check | P | Gateways have status poll |
| Reversal / failure / timeout | P | Gateway paths partial; refunds are internal |
| Duplicate payment | I | Idempotency key + checkout lock + intent reuse |

---

## SECTION 10 — Refund flow

| Flow | St | Launch Blocker |
|------|----|----------------|
| Item / partial / full refund | I | No (cash/method path) |
| Cash refund via shift | I | Attach refund txn when shift open |
| Gateway / wallet reverse | M / P | **Yes** if using those methods |
| Inventory restore | I | BOM restore best-effort |
| Manager PIN | I | Required in RefundDialog |
| Enterprise Refunds UI | I | `/erp/refunds` KPIs + drawer |
| Void item / void order / reopen | M | **Yes** for full cash control |
| Kitchen ticket reversal on refund | M | Medium |

---

## SECTION 11 — Admin / shift flow

| Flow | St | Launch Blocker |
|------|----|----------------|
| Shift open / close | I | No (require SOP: open before cash) |
| Cash drawer / adjustment | I/P | Cash in/out on shift page |
| Expense / income / petty cash | P | Shift txn types exist |
| Day closing / Z / X report | I | Z variance on close |

---

## SECTION 12 — User / security flow

| Flow | St |
|------|----|
| Login / logout | I |
| Session timeout | P |
| Permission denied | I |
| Role validation | I |
| Manager override / PIN | I (discount / refund / shift close) |

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
| Kitchen ready (KDS) | I (status + app notification) |
| New kitchen order (checkout) | I |
| Driver arrived | D |
| Payment success UI | I |
| Payment failed gateway | P |
| Stock low | I (dashboard throttle + service) |
| Purchase / GRN received | I |
| Header notification center | I |
| Desktop notification permission | P |
| Refund notify | M |
| Stock low | P / M |
| Order delayed | D |

---

## SECTION 16 — Validations matrix

| Validation | St | Launch Blocker |
|------------|----|----------------|
| Prevent duplicate orders | P | Medium |
| Prevent duplicate payment | I | Cleared (intent + key) |
| Prevent negative stock | I/P | When inventory tracking on |
| Prevent over-discount | I/P | Cap + manager PIN path |
| Prevent deleting paid bills | P | High |
| Prevent editing completed orders | P | High |
| Prevent invalid split | I | Validator |
| Prevent invalid merge | P | Medium |
| Prevent invalid transfer | P | Medium |
| Prevent stock mismatch | P | Ledger + BOM; post-pay fail edge |
| Prevent recipe mismatch | P | Deduct skips / warns without recipe |
| Manager PIN on void/discount | P | Discount/refund/shift **I**; void still **M** |

---

## SECTION 17 — Audit log requirements

**Current:** Implemented — `audit_logs` + `writeAuditLog` on checkout, refund, shift, PIN, purchase GRN.

**Required on every sensitive op:**

| Field | Required | Status |
|-------|----------|--------|
| User id / name / role | Yes | I |
| Timestamp (UTC + local) | Yes | I |
| Branch / outlet / terminal | Yes | I / P |
| Action type | Yes | I |
| Entity (order/item/payment) | Yes | I |
| Old value / new value | Yes | I |
| Reason / PIN approver | Yes | I (approval id when used) |
| IP / device / user-agent | Yes | P (UA stored; IP null client-side) |

**Must-audit actions:** discount ✓, void ✗, refund ✓, reopen ✗, price override ✗, discard after fire ✗, cash adjust ✓ (shift), stock adjust ✓, permission override ✓ (PIN), gateway reverse ✗.

---

## SECTION 18 — Report impact map

| Transaction | Sales | Tax | Inventory | Recipe | Supplier | Customer | Cash | Shift | Profit | Loyalty | Analytics |
|-------------|-------|-----|-----------|--------|----------|----------|------|-------|--------|---------|-----------|
| Completed POS pay | ↑ | ↑ | ↓ (BOM) | Fire deduct | — | Optional | ↑ method | ↑ attach | ↑ | Earn if phone | ↑ BI |
| Open table bill | — | — | — | — | — | — | — | — | — | — | Open checks |
| KOT fire | — | — | — | — | — | — | — | — | — | — | Kitchen SLA |
| Discard open | — | — | — | — | — | — | — | — | — | — | Cancelled open |
| Hold | — | — | — | — | — | — | — | — | — | — | Held count |
| Refund | ↓ | ↓ | ↑ restore | Reverse | — | History | ↓ | ↓ refund txn | ↓ | — | Refunds UI |
| PO receive / GRN | — | — | ↑ | — | ↑ | — | — | — | — | — | Purchases |
| Waste | — | — | ↓ | — | — | — | — | — | ↓ | — | Waste |
| Online demo | Fake metrics | — | — | — | — | — | — | — | — | — | **Exclude from live** |

---

## SECTION 19 — Edge cases

| Edge case | Current handling | Required |
|-----------|------------------|----------|
| Power failure mid-pay | Unclear; may orphan gateway session | Idempotent pay + resume |
| Internet loss | Soft fail / local bills | Offline queue + sync |
| Printer failure | Browser error | Queue + retry + alert |
| Duplicate clicks | `isCompleting` UI | DB unique payment intent + checkout lock |
| Browser refresh | Cart may persist partially | Recover open bill |
| Multiple tabs | Race on table bill | Optimistic lock / version |
| Concurrent users same table | Last write wins | Lock / claim |
| Simultaneous payment | Idempotency key + intent reuse | Keep unique constraint |
| Kitchen offline | Ticket still inserted | Queue + KDS reconnect |
| Gateway timeout | Status check path | Auto reconcile job |

---

# PART B — Detailed flow cards (critical paths)

### B1. Counter cash sale — **I**

| Field | Detail |
|-------|--------|
| **Flow name** | Counter cash complete |
| **User role** | Cashier (`POS_ACCESS`, `POS_CHECKOUT`) |
| **Preconditions** | Logged in; cart has sellable items; outlet selected; prefer open shift |
| **User actions** | Add items → Charge/Checkout → Cash → Enter tender → Complete |
| **System actions** | Validate tender → payment intent + lock → stock check → insert order → complete intent → BOM deduct → shift attach → audit → loyalty earn → notify |
| **Database** | `pos_orders`, `pos_order_items`, `payment_intents`, `payment_transactions`, `inventory_transactions`, `shift_*`, `audit_logs` |
| **Inventory** | Deduct recipe BOM after successful pay (if tracking enabled) |
| **Financial** | +Gross, +Tax, +Cash tender, +Change; shift sale line |
| **Notifications** | `cafepilots:orders-updated` + app notification (counter) |
| **Failures** | Empty cart; tender &lt; total; stock block; DB insert fail; post-pay deduct fail (alert, sale kept) |
| **Recovery** | Re-open cart; retry; idempotent replay if intent succeeded |
| **Audit** | `checkout` action with totals / discount / approval |
| **Validations** | Qty&gt;0; price≥0; tender≥total; permission; stock |
| **Tests** | Exact tender; over-tender change; tax 18%; double-click; stock block |
| **API** | Supabase insert; optional gateway |

### B2. Table dine-in settle — **I**

| Field | Detail |
|-------|--------|
| **Flow name** | Table open → fire → settle |
| **Roles** | Waiter + Cashier |
| **Preconditions** | Table available; schema deployed |
| **Actions** | Open table → add → Send KOT → guest → Pay |
| **System** | Open order upsert; sent tickets; settle closes open; table cleaning; inventory on settle |
| **DB** | open / sent / completed rows; `dining_tables` |
| **Inventory** | Deduct on settle (same checkout path) |
| **Financial** | Sale on settle only |
| **Failures** | Fire with no items; settle with gateway fail |
| **Recovery** | Refire; retry pay; discard with manager |
| **Audit** | Checkout audit on settle |
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
| **System** | Zustand only; bridges to notification center |
| **DB** | None (no aggregator webhooks) |
| **Do not** | Enable for real restaurants without integrator |

### B5. Refund — **I**

| Field | Detail |
|-------|--------|
| **Flow** | `/erp/refunds` → New Refund → PIN → `processRefund` |
| **System** | Insert `refund_transactions` → update order refunded_amount → restore inventory → shift refund → audit |
| **Gaps** | Gateway reverse; void/reopen; KOT cancel on refund |
| **Tests** | Partial/full/item; same-day; remaining balance cap; PIN fail |

---

# PART C — Implementation checklist

| Priority | Module | Flow | Validation | Status | Risk | Complexity | Owner | Testing | Dependencies | Launch Blocker |
|----------|--------|------|------------|--------|------|------------|-------|---------|--------------|----------------|
| P0 | Payments | Idempotent complete | Unique payment_intent | **I** | Critical | M | Backend | Load + double click | Phase1 SQL | Schema deploy |
| P0 | Refunds | Full/partial/item | PIN + reason | **I** | Critical | L | POS+Finance | Cash cases | Audit, inventory | No* |
| P0 | Inventory | Deduct on sale | Non-negative / allow oversell flag | **I** | Critical | L | Inventory | Recipe + modifiers | Recipes BOM | No* |
| P0 | Shift | Open/close + Z | Drawer variance | **I** | Critical | L | Ops | Multi-cashier | Payments | SOP required |
| P0 | Audit | Write audit_log | Immutable | **I** | Critical | M | Platform | Tamper attempt | Auth | Schema deploy |
| P0 | Online | Hide/disable demo in prod | Feature flag | D | High | S | Product | Flag off | Config | **Yes** if marketed |
| P1 | Payments | Split tender lines | Sum = total | **I** | High | M | POS | 3-way split | Reports | No |
| P1 | Voids | Void item/order | PIN + KOT reverse | M | High | L | POS+KDS | Fired vs unfired | Audit | **Yes** |
| P1 | Discount | Cap + role | Max % + PIN | **I**/P | High | S | POS | Over-cap | Permissions | No |
| P1 | Locking | Bill version | Optimistic lock | M | High | M | Tables | 2 tabs | Realtime | No |
| P1 | Wallet/Gift | Ledger balances | Sufficient funds | P | Critical | L | Finance | Overdraw | Customers | **Yes** if enabled |
| P1 | Printer | ESC/POS queue | Retry | P | Medium | L | Ops | Offline printer | Hardware | No |
| P2 | Online | Aggregator webhooks | Signature verify | D | Critical | XL | Integrations | SLA accept | Secrets | When selling |
| P2 | Loyalty | Earn/redeem | Balance | P (earn only) | Medium | L | CRM | Points math | Customers | No |
| P2 | Takeaway | order_type + packing | Type required | M | Medium | M | POS | Packing | Menu | No |
| P2 | Kitchen | Courses / stations | Route rules | P | Medium | L | KDS | Multi-station | Menu tags | No |
| P2 | Offline | Queue sync | Conflict UI | M | High | XL | Platform | Airplane mode | Local DB | Market-dependent |
| P3 | Waiter transfer | Assign waiter | Role | M | Low | S | Tables | Transfer | Users | No |
| P3 | Email receipt | Send email | Valid email | D | Low | M | Comms | Delivery | Provider | No |
| P3 | Purchase return | Return to supplier | Qty | P | Medium | M | Purchase | Partial return | Stock | No |
| P3 | BI / Copilot | Read-only intelligence | Plan gates | **I** | Low | M | SaaS | Outlet scope | Phase3 | No |

\*Not a blocker when Phase 1 SQL is applied, inventory tracking configured, and recipes exist. Waive stock deduct only with written ops policy.

---

# PART D — Deliverables

## 1. Complete Transaction Matrix

See **PART A** (Sections 1–15). Count of tracked flows: **120+**.

## 2. Validation Checklist (QA gate)

- [x] Empty cart cannot complete  
- [x] Cash tender ≥ total  
- [x] Discount ≤ role max / PIN on high discount  
- [ ] Voucher expiry / one-time / outlet  
- [x] Split sum ≥ total; persist lines on intent  
- [x] Double Complete does not create 2 sales (idempotency)  
- [ ] Completed bill not editable without reopen+PIN  
- [ ] Paid bill not deletable  
- [x] Merge/move only valid tables same outlet  
- [x] Fire only unfired lines  
- [x] Stock cannot go negative when tracking disallows  
- [x] Recipe deduct path (warn if missing recipes)  
- [ ] Gateway success required before complete (gateway paths)  
- [ ] Online accept only when connected + within SLA  
- [x] Manager PIN on refund / high discount / shift close (void/reopen still open)

## 3. QA Checklist

| Suite | Cases |
|-------|-------|
| Smoke | Login → POS cash sale → history → logout |
| Table | Open → add → KOT → KDS bump → pay → cleaning |
| QR | Scan → order → KDS → staff pay |
| Payments | Cash/UPI/Card/gateway happy + fail + double-click |
| Held | Hold → resume → pay |
| Merge/Move | Two tables; mid-KOT move |
| Negative | Double pay; over-discount; discard after fire |
| Inventory | Sale deducts; refund restores; stock block |
| Shift | Open → sales → close → Z matches |
| Refunds | Full/partial/item + PIN + inventory chip |
| BI/Copilot | Intelligence KPIs; copilot sales/stock prompts |
| Concurrency | Two devices same table |
| Print | Receipt + KOT browser/device |
| Permissions | Cashier vs manager vs kitchen |

## 4. Remaining gaps (launch-critical first)

1. Voids + reopen with PIN  
2. Wallet/gift/store-credit ledgers (**or disable methods**)  
3. Live online aggregator integration (keep hub labeled demo)  
4. Offline billing sync  
5. Optimistic locking on open bills  
6. Order types (dine-in / takeaway / delivery)  
7. Partial payments / balance due  
8. Course-based firing / full multi-kitchen config UI  
9. Loyalty **redeem**  
10. Gateway refund reverse  
11. Real email receipts + printer queue  
12. JWT-bound RLS multi-tenancy  

**Cleared (Wave 1–2):** refunds, inventory deduct/restore, shifts, audit, payment idempotency, manager PIN, split tender lines, GRN receive, loyalty earn, KDS bump/recall, notifications.

## 5. Production Readiness Score

| Area | Score | Weight | Weighted |
|------|------:|-------:|---------:|
| Billing accuracy | 82 | 15% | 12.3 |
| Payment integrity | 78 | 15% | 11.7 |
| Inventory integrity | 72 | 15% | 10.8 |
| Kitchen ops | 80 | 10% | 8.0 |
| Refunds/voids | 65 | 10% | 6.5 |
| Shift/cash control | 70 | 10% | 7.0 |
| Audit/security | 70 | 10% | 7.0 |
| Online channels | 22 | 5% | 1.1 |
| Reporting / BI | 78 | 5% | 3.9 |
| Offline/resilience | 15 | 5% | 0.8 |
| **TOTAL** | | **100%** | **≈ 69 / 100** |

**Rounded readiness: 68/100 — Conditional single-outlet pilot**  
Schemas applied · inventory tracking on · recipes for sold items · Online Hub simulator off / labeled demo · wallet methods disabled · shifts mandatory SOP · no claim of live Swiggy/Zomato.

## 6. Security Review

| Finding | Severity |
|---------|----------|
| Manager PIN on discount/refund/shift | Mitigated |
| Void/reopen still without PIN flow | High |
| Audit trail for money events | Mitigated (deploy schema) |
| RLS often disabled (MVP) | High |
| Gateway secrets must stay server-side | OK if followed |
| Demo online orders could confuse staff | Medium |
| Permission model + SaaS BI/AI plan gates | OK |

## 7. Performance Review

| Area | Assessment |
|------|------------|
| POS grid | Acceptable; watch image load |
| Table hydrate interval | 15s poll — OK for mid volume |
| Online simulator timers | Disable in prod |
| KDS realtime | Good pattern + station filter |
| BI / Copilot | Client-side enrichment; fine for mid volume |
| 1000+ online orders/day | **Not ready** without live ingest + indexing |

## 8. Data Integrity Review

| Issue | Severity |
|-------|----------|
| Split method on order row still `split` (lines on intent) | Medium |
| Counter sale may appear on KDS as pending | Medium |
| Held transfer does not bind real table bill | Medium |
| Payment idempotency key | Mitigated |
| Open bill last-write-wins | High |
| Post-pay inventory deduct failure | High (manual adjust) |

## 9. Inventory Integrity Review

| Issue | Severity |
|-------|----------|
| BOM deduct on paid sale | Mitigated when recipes + tracking on |
| Refund restore | Mitigated |
| GRN on PO receive | Mitigated (Phase 2 tables) |
| Theoretical vs physical variance UI | Partial |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-21 | Initial matrix — readiness **42/100** |
| 2026-07-21 | Re-audit after Phase 1–3 on `ec5cf48` — readiness **68/100**; Wave 1–2 blockers cleared in code |

## 10. Accounting Integrity Review

| Issue | Severity |
|-------|----------|
| Shift Z available when schema + SOP followed | Mitigated |
| Wallet/gift can record sale without asset move | **Critical** — disable |
| Tax computed but inclusive/exclusive policy unclear | Medium |
| Service charge / round-off partial | Medium |
| Refunds coded; gateway reverse still manual | Medium |
| Online demo metrics must not enter finance | High |

---

# PART E — Recommended launch waves

### Wave 0 — Pilot (single outlet) — now
- Phase 1–3 SQL applied  
- Disable Online Hub simulator / label DEMO  
- Disable wallet/gift/store credit methods  
- Recipes on sold items; inventory tracking on  
- Open shift before cash sales  
- Cash/UPI/Card + table + KDS + QR + refunds  

### Wave 1 — Cash control — **mostly done in code**
- ~~Shift open/close + Z report~~ ✓  
- ~~Refunds + PIN~~ ✓ (voids/reopen still open)  
- ~~Audit log~~ ✓  
- ~~Payment idempotency~~ ✓  

### Wave 2 — Stock integrity — **mostly done in code**
- ~~Recipe deduct on complete~~ ✓  
- ~~Restore on refund~~ ✓  
- Hard OOS policy — configure via ops settings  

### Wave 3 — Channels
- Aggregator webhooks  
- Order types takeaway/delivery  
- Real rider states  

### Wave 4 — Resilience
- Offline queue  
- Printer service  
- Full multi-kitchen / courses  

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
| Product | Accept Wave 0 scope at 68/100? | ____ |
| Engineering | Phase SQL deployed on all envs? | ____ |
| QA | Validation checklist automated? | ____ |
| Finance | Wallet disabled; refund SOP OK? | ____ |
| Ops | Shift open + recipe BOM SOP? | ____ |

---

*This matrix is grounded in the CafePilots codebase after Phase 1–3. Re-score after voids/online/offline waves. Companion narrative: `TRANSACTION_FLOWS.md`.*
