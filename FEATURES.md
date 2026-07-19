# CafePilots Features

CafePilots is a complete restaurant operating system for cafes, restaurants, pubs, bars, bakeries, QSRs, food courts, cloud kitchens, and multi-outlet food businesses.

It combines POS billing, QR ordering, KDS, table management, floor planning, inventory, purchasing, CRM, staff permissions, subscriptions, payments, and reporting in one cloud-ready ERP.

## Product Positioning

CafePilots is built for high-speed food operations where staff need simple screens and owners need control.

- Cashiers get fast billing.
- Kitchen teams get live tickets.
- Managers get tables, stock, orders, and staff activity.
- Owners get sales, reporting, branches, and financial visibility.
- Super Admins get company and subscription control.

## Core Workflow

1. Customer arrives.
2. Table or counter order starts.
3. Waiter, cashier, or QR menu captures items.
4. Order is sent to KDS when preparation is required.
5. Kitchen prepares and marks items ready.
6. Order is served or picked up.
7. Checkout collects payment.
8. Receipt is printed or shared digitally.
9. Table is cleaned and released.
10. Reports and inventory are updated.

## Feature Areas

### Operations Dashboard

- Operations Command Center for daily service.
- KPI cards for sales, table load, kitchen queue, open checks, stock watch, and follow-up.
- Quick actions for new bill, table board, kitchen display, daily report, and stock.
- Priority queue and service snapshot.
- Role-aware work areas.

### POS Billing

- Product grid with photos.
- Category filters.
- Search.
- Favorites, history, and held orders.
- Dine-in table attachment.
- Order cart and running bill.
- Add-ons and modifiers.
- Checkout handoff.

### Checkout

- Cashier-focused bill workspace.
- Cash, card, UPI, wallet, gift card, credit, split payment, and store credit UI support.
- Promo code support.
- Tendered cash keypad and change due.
- Configurable payment gateway flow.
- Receipt and completion workflow.

### QR Ordering

- QR-based guest menu.
- Guest sign-in.
- Table-aware order placement.
- Customer order status view.
- Branch and table token resolution.

### Kitchen Display System

- Pending, Preparing, and Ready for Pickup queues.
- Live sync indicator.
- Order status movement.
- Mobile-friendly dark kitchen layout.
- Empty states for quiet service periods.

### Tables And Floor Management

- Table board.
- Floor Designer.
- Visual table layout.
- Table QR print and preview.
- Table move and merge tools.
- Floor plan templates mapped per branch.

### Menu And Catalog

- Products.
- Categories.
- Recipes.
- Product limits by plan.
- Veg and non-veg indicators.
- Price, category, availability, and stock-friendly setup.

### Inventory And Purchase

- Current inventory.
- Stock status.
- Daily stock update.
- Stock adjustments.
- Waste log.
- Purchase orders.
- Supplier management.
- Outlet-scoped inventory records.

### CRM And Marketing

- Customer database.
- Guest profiles.
- Live QR guest sessions.
- Order history.
- Offers and vouchers.
- Customer retention workflows.

### Reports

- Order history.
- Sales visibility.
- Inventory reporting.
- Payment and settlement review.
- Date and outlet-aware analysis where supported.

### Staff, Roles, And Permissions

- Role-based module access.
- Staff and user management.
- Login logs.
- Normal users see only relevant options.
- Direct route protection by role and plan.

### Companies And Subscriptions

- Super Admin company management.
- Subscription plan assignment.
- Plan-aware navigation.
- Plan-aware direct URL protection.
- Enterprise support for branch and franchise workflows.

### Payment Gateways

- Gateway settings are configurable per outlet.
- UI supports common payment methods such as Paytm, PhonePe, Amazon Pay style wallet flows, UPI, card, and cash.
- Gateway credentials are handled through configuration, not hardcoded into public UI.

## Subscription Plans

### Lite

Best for tea stalls, juice shops, food trucks, cloud kitchens, and very small cafes.

- Monthly price: INR 299.
- Annual price: INR 2,999/year.
- Mobile billing.
- QR menu.
- Digital receipts.
- UPI payment tracking.
- Basic sales report.
- Product management up to 100 items.
- Basic customer database.
- One user.

Not included:

- Inventory.
- Purchase.
- Suppliers.
- KOT / KDS.
- Printer and barcode.
- Recipes.
- Staff management.
- Multi-outlet.

### Starter

Best for small cafes and bakeries with one outlet.

- Monthly price: INR 699.
- Annual price: INR 6,999/year.
- Unlimited products.
- Up to 3 users.
- Inventory management.
- Purchase management.
- Supplier management.
- Customer database.
- KOT / KDS.
- Thermal printer support.
- Barcode support.
- Tables and Floor Designer.
- Email support.
- Optional white label.

### Professional

Best for busy cafes and restaurants needing costing and staff controls.

- Monthly price: INR 999.
- Annual price: INR 9,999/year.
- Up to 10 users.
- All Starter features.
- Recipe management.
- Food costing.
- Expense tracking.
- Staff management.
- White label.
- Limited API access.
- AI reports and AI business coach marked as coming soon.
- WhatsApp priority support.
- Optional multi-outlet.

### Enterprise

Best for restaurant chains, franchises, pubs, bars, food courts, and multi-outlet brands.

- Monthly price: Custom / configured.
- Annual price: Custom quotation.
- Unlimited users.
- Up to 999 outlets.
- All Professional features.
- Multi-outlet.
- Franchise management.
- Central inventory.
- Full API access.
- AI reports.
- AI business coach.
- Dedicated priority support.

## Module Visibility By Plan

- Lite: Dashboard, POS, Checkout, QR Menu, receipts, payment tracking, products, basic CRM, reports, settings, payment gateway settings.
- Starter: Lite modules plus inventory, purchase, suppliers, KDS, printer, barcode, tables, and floor designer.
- Professional: Starter modules plus recipes, food costing, expenses, staff, white label, limited API, AI report placeholders, and AI coach placeholders.
- Enterprise: Professional modules plus multi-outlet, franchise, central inventory, full API, AI reports, AI coach, and dedicated support.

## Admin Configuration

Admins and Super Admins can configure:

- Company profile.
- Active outlet.
- Staff access.
- Role permissions.
- Payment gateways.
- Subscription plan.
- Floor plan mapping.
- Products and menu setup.

Super Admin can manage subscriptions across companies.

## SEO And Public Landing Features

- Public landing page for CafePilots.
- SEO metadata.
- Sitemap.
- Robots file.
- Product screenshots.
- Contact CTA.
- Get Started CTA.
- Favicon and app icons.

## Technical Stack

- React.
- Vite.
- TypeScript.
- Tailwind CSS.
- shadcn/ui-style components.
- Supabase data layer.
- Modular ERP routing.
- Role and plan route protection.

## Security And Access

- Authenticated ERP routes.
- Session expiry handling.
- Staff session tracking.
- Role permission checks.
- Plan module checks.
- Company and outlet scoping.
- Super Admin override for platform operations.

## Roadmap Ideas

- Deeper sales dashboard charts.
- Drag-and-drop KDS tickets.
- Advanced table reservations.
- Split bill and merge bill workflows.
- Vendor comparison and purchase suggestions.
- Food cost variance reports.
- GST reports.
- WhatsApp receipt automation.
- Payment provider reconciliation.
- AI sales and stock insights.
