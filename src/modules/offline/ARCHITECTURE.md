# CafePilots Enterprise Offline POS Architecture

## Guarantee

**Restaurant orders are never lost.** Local IndexedDB (`CafePilotsOfflineDB` via Dexie) is the durable source of truth while offline. Server ACK is required before `SYNCED`. Pending rows are never deleted.

## Plan matrix

| Plan | Capability |
|------|------------|
| Lite | Online only |
| Standard | Online only |
| Professional | Offline billing |
| Enterprise | Full offline (billing + kitchen + inventory cache + Sync Center) |

Runtime kill-switch: feature flag `offline.billing` (default on; plan gate still applies).

## Layering (no duplicated business logic)

```mermaid
flowchart TB
  UI[UI Components]
  SVC[Services: Order Payment Inventory Kitchen Sync]
  REPO[Repositories]
  ON[Online Repository - Supabase]
  OFF[Offline Repository - Dexie]
  Q[sync_queue FIFO]
  UI --> SVC --> REPO
  REPO --> ON
  REPO --> OFF
  OFF --> Q
  Q -->|ACK then SYNCED| ON
```

## Offline checkout path

```mermaid
sequenceDiagram
  participant Cashier
  participant POS as usePOSStore
  participant OS as OrderService
  participant IDB as CafePilotsOfflineDB
  participant Print as Receipt/KOT
  participant Sync as SyncService

  Cashier->>POS: Checkout (offline)
  POS->>OS: checkoutOffline
  OS->>IDB: orders + items + payments PENDING
  OS->>IDB: inventory delta + kot_queue
  OS->>IDB: enqueue CreateOrder → CreatePayment
  OS-->>POS: TMP-000001
  POS->>Print: Print immediately (non-blocking)
  Note over Sync: Internet restored / interval / manual
  Sync->>IDB: FIFO oldest first
  Sync->>Sync: Upload order (client_uuid idempotent)
  Sync->>IDB: Mark SYNCED + map ORD-… (receipt TMP unchanged)
```

## Folder structure

```
src/modules/offline/
  db/CafePilotsOfflineDB.ts
  types/entities.ts
  lib/{ids,capabilities}.ts
  security/localEncryption.ts
  repositories/{Offline*,Online*,SyncQueue,AuditLog}*
  services/{Order,Payment,Inventory,Kitchen,Sync,Connectivity,Conflict,Cache}*
  pages/SyncCenterPage.tsx
  sql/offline_idempotency_schema.sql
  __tests__/
  bootstrap.ts
  index.ts
  ARCHITECTURE.md
```

## Sync status

`PENDING | SYNCING | SYNCED | FAILED | CONFLICT`

## Job retry backoff

10s → 30s → 1m → 5m → 15m → 1h

## Data safety rules

1. Never delete local order until server ACK
2. Keep local history after sync (mapping only)
3. Printed `TMP-*` numbers never change
4. Dependent jobs wait (Order before Payment)
5. No localStorage for transactional data
6. No passwords / tokens / card PAN in IndexedDB
