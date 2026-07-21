# Core POS Module Architecture

## 1. Module Overview
The Core POS Module manages high-speed ordering, item selection, bill calculation, discount application, hold/resume state, bill splitting, and payment processing.

## 2. Order Lifecycle Flow
```mermaid
stateDiagram-v8
    [*] --> Draft: Item Added to Cart
    Draft --> Held: Hold Order
    Held --> Draft: Resume Order
    Draft --> PendingPayment: Checkout Initiated
    PendingPayment --> Paid: Payment Success
    Paid --> KitchenKDS: Send Order Ticket
    KitchenKDS --> Completed: Order Served
    PendingPayment --> Cancelled: Cancel / Refund
```

## 3. Key POS Features
- **Fast Cart Operations**: Instant barcode search, touch grid category navigation.
- **Dynamic Pricing Engine**: Automated tax breakdown (CGST + SGST or IGST) and item/order level discounts.
- **Hold & Resume**: Store pending table orders in local storage/Zustand with table numbering.
- **Split Bill Logic**: Split evenly or split by individual line items.
- **Shift Management**: Opening cash float, cash drawer tracking, closing balance reconciliation.

## 4. State Management Interface (Zustand)
```typescript
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  variantId?: string;
  selectedModifiers: Array<{ id: string; name: string; price: number }>;
  discount: number;
  taxRate: number;
  notes?: string;
}

export interface POSState {
  cart: CartItem[];
  customer: Customer | null;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  tableNumber?: string;
  discountAmount: number;
  discountType: 'PERCENT' | 'FIXED';
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  calculateTotals: () => { subtotal: number; tax: number; total: number };
}
```
