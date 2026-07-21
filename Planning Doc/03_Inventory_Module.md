# Inventory & Recipe Management Module

## 1. Overview
Tracks raw ingredients, finished products, stock movements, and automatic stock deduction based on recipe mappings upon order completion.

```mermaid
sequenceDiagram
    participant POS as POS Billing
    participant Order as Order Engine
    participant Recipe as Recipe Service
    participant Inventory as Stock Ledger

    POS->>Order: Complete Order (Item X)
    Order->>Recipe: Fetch Recipe for Item X
    Recipe-->>Order: [Ingredient A: 50g, Ingredient B: 10ml]
    Order->>Inventory: Deduct Stock (Ingredient A -50g, Ingredient B -10ml)
    Inventory-->>Order: Stock Updated / Low Stock Alert Triggered
```

## 2. Stock Ledger & Movement Types
- **INWARD**: Goods received via Purchase Order (GRN).
- **OUTWARD**: Automatic consumption via POS sales.
- **WASTAGE**: Manual adjustment for expired or damaged items.
- **TRANSFER**: Stock movement between central warehouse and outlet kitchens.

## 3. Key TypeScript Schemas
```typescript
export interface Ingredient {
  id: string;
  name: string;
  unit: 'KG' | 'GRAM' | 'LITER' | 'ML' | 'PIECE';
  currentStock: number;
  minStockLevel: number;
  costPerUnit: number;
}

export interface Recipe {
  productId: string;
  ingredients: Array<{
    ingredientId: string;
    quantityRequired: number;
  }>;
}
```
