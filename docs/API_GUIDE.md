# CafePilots Public API (Phase 3 preview)

Authentication (planned gateway):

```
Authorization: Bearer cp_live_<secret>
```

Keys are created in **ERP → API Platform**. Secrets are hashed at rest.

## Planned resources

| Method | Path | Scope |
|--------|------|-------|
| GET | `/v1/orders` | `orders:read` |
| POST | `/v1/orders` | `orders:write` |
| GET | `/v1/products` | `products:read` |
| GET | `/v1/inventory` | `inventory:read` |
| PATCH | `/v1/inventory` | `inventory:write` |
| GET | `/v1/customers` | `customers:read` |
| GET | `/v1/tables` | `tables:read` |
| GET | `/v1/kitchen/tickets` | `kitchen:read` |
| GET | `/v1/reports/sales` | `reports:read` |

## Webhooks

Register HTTPS endpoints in API Platform. Planned events:

- `order.created`
- `order.updated`
- `order.ready`
- `inventory.low`
- `refund.created`

Delivery attempts are logged in `webhook_deliveries` (Phase 3 schema).

## Rate limits

Per-key `rate_limit_per_min` (default 60). Exceeding returns `429`.

## Status

Key management UI + schema are live. The HTTP gateway worker is a follow-on deployable (`api/` or edge functions).
