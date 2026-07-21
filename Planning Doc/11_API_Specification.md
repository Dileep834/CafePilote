# REST API Specification

## 1. Standards & Conventions
- **Base URL**: `/api/v1`
- **Authentication**: Bearer Token (`Authorization: Bearer <JWT>`)
- **Headers**: `Content-Type: application/json`, `X-Company-ID: <uuid>`, `X-Outlet-ID: <uuid>`

## 2. Core Endpoints Table
| Endpoint | Method | Description |
|---|---|---|
| `/auth/login` | POST | Authenticate user & receive JWT token |
| `/products` | GET | Fetch product catalog with categories & pricing |
| `/pos/orders` | POST | Submit new order & trigger receipt/KDS |
| `/pos/orders/:id/hold` | POST | Put order on hold |
| `/kds/tickets` | GET | Fetch active kitchen orders |
| `/kds/tickets/:id/status` | PATCH | Update KDS ticket status (`PREPARING`, `READY`) |
| `/inventory/stock` | GET | Retrieve stock levels for current outlet |

## 3. Order Creation Payload Example
```json
{
  "outletId": "out_987654321",
  "orderType": "DINE_IN",
  "tableNumber": "T-04",
  "customerId": "cust_123456",
  "items": [
    {
      "productId": "prod_espresso",
      "quantity": 2,
      "unitPrice": 120.00,
      "discount": 0.00,
      "notes": "Extra hot"
    }
  ],
  "payment": {
    "method": "UPI",
    "transactionId": "UPI129847192847",
    "amountPaid": 240.00
  }
}
```
