# System Settings & Hardware Integration

## 1. Configuration Matrix
- **Tax Configuration**: Enable/Disable GST, set CGST (9%), SGST (9%), IGST (18%), or Service Charge %.
- **Print Settings**: Thermal Printer IP address, USB ESC/POS integration, receipt header/footer text, logo upload.
- **Currency & Localization**: Select currency symbol (`₹`, `$`, `€`), date formatting, and language.

## 2. ESC/POS Printing Standard Architecture
```
+----------------------------------------+
|             CAFE PILOTE POS            |
|       123 Main Street, Tech City       |
|            GSTIN: 27AAAAA0000A1Z5      |
+----------------------------------------+
| Receipt #: INV-2026-00421              |
| Date: 2026-07-21 17:35                 |
+----------------------------------------+
| Item               Qty   Price   Total |
| Espresso            2    120.00 240.00 |
| Cheese Croissant    1    180.00 180.00 |
+----------------------------------------+
| Subtotal:                       420.00 |
| CGST (9%):                       37.80 |
| SGST (9%):                       37.80 |
| Grand Total:                    495.60 |
+----------------------------------------+
|       Thank you for visiting us!       |
+----------------------------------------+
```
