# Purchase & Vendor Management Module

## 1. Procurement Workflow
```mermaid
graph LR
    Requisition[Stock Requisition] --> PO[Purchase Order Created]
    PO --> SupplierSent[PO Sent to Supplier]
    SupplierSent --> GRN[Goods Received Note - GRN]
    GRN --> StockUpdate[Inventory Auto-Inward]
    GRN --> Payment[Vendor Invoice & Payment]
```

## 2. Key Features
- **Vendor Directory**: Manage supplier contact information, GST numbers, payment terms, and lead times.
- **Purchase Order (PO)**: Generate POs with auto-calculated total costs, tax rates, and delivery dates.
- **GRN Processing**: Match received items against PO quantities; log partial deliveries and damaged goods.
- **Accounts Payable**: Track unpaid supplier invoices and record payment receipts.
