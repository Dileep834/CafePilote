# User Management & RBAC Module

## 1. Role Definitions
| Role | Scope | Key Permissions |
|---|---|---|
| **SUPER_ADMIN** | Platform Level | Full access to all companies, billing, and global settings |
| **FRANCHISE_OWNER** | Company Level | Financial reports, franchise outlet management, user creation |
| **OUTLET_MANAGER** | Single Outlet | Inventory control, refunds, void bills, shift closure audit |
| **CASHIER** | POS Terminal | Take orders, process payments, print receipts, hold/resume |
| **KITCHEN_STAFF** | KDS Station | View kitchen tickets, mark items preparing/ready |

## 2. Permission Evaluation Logic
```typescript
export type Permission = 
  | 'pos:create_order' 
  | 'pos:apply_discount' 
  | 'pos:void_bill' 
  | 'inventory:adjust_stock' 
  | 'reports:view_financials';

export function hasPermission(userRole: string, permission: Permission): boolean {
  // Evaluation logic matching user role permissions map
  return rolePermissionMap[userRole]?.includes(permission) ?? false;
}
```
