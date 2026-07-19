# CafePilots User Guide

CafePilots is a restaurant operating system for cafes, restaurants, pubs, bars, bakeries, QSRs, cloud kitchens, food courts, and multi-outlet food businesses.

This guide explains the daily operating flow for owners, managers, cashiers, kitchen teams, inventory users, and Super Admins.

## Quick Start

1. Sign in from the Login page.
2. Select the correct outlet from the header branch switcher.
3. Open Dashboard to review service health, alerts, open checks, kitchen queue, and stock watch.
4. Use POS or QR ordering to create orders.
5. Send items to KDS when kitchen preparation is required.
6. Complete payment from Checkout.
7. Review stock, reports, customer history, and staff activity.

## Main Navigation

CafePilots shows modules based on the logged-in user's role and the company's subscription plan. Normal users only see the tools they need.

- Front of house: Dashboard, POS, Tables, Floor Designer, Kitchen Display.
- Menu and catalog: Products, Categories, Recipes.
- Inventory and purchase: Stock on hand, Daily stock update, Adjustments, Waste log, Purchase orders, Suppliers.
- Customers and offers: CRM / Guests, Offers and vouchers.
- Business: Reports, Outlets / Branches.
- Admin: Staff and users, Login logs, Companies, Settings.

## Roles

- Super Admin: Platform owner access. Can manage companies, subscription plans, global settings, and all modules.
- Admin / Owner: Business owner access for their company and outlets.
- Manager: Day-to-day operations, reports, staff supervision, service flow, inventory oversight.
- Cashier: POS billing, checkout, payments, receipts, held orders.
- Kitchen Staff: Kitchen Display System and order status updates.
- Inventory User: Stock, daily updates, adjustments, purchase, suppliers, and waste logs.
- Accountant: Reports, payments, order history, tax and settlement review.
- Staff: Focused operational access based on assigned permissions.

## Dashboard

Use the Dashboard as the Operations Command Center.

Check:

- Today's sales and order performance.
- Table load and open checks.
- Kitchen queue and service delays.
- Low stock and daily stock status.
- Priority queue, recent activity, and quick actions.

Common actions:

- Start a new bill.
- Open table board.
- Open kitchen display.
- Review daily report.
- Review stock status.

## POS Billing

Use POS for counter, dine-in, takeaway, bar, and quick-service billing.

1. Go to POS.
2. Select a category or use product search.
3. Tap a product card to add it to the current order.
4. Attach a table for dine-in orders when required.
5. Add notes, modifiers, add-ons, or custom instructions where available.
6. Hold the order, send it to KDS, or move to checkout.

Product cards can show:

- Veg or non-veg indicator.
- Stock status.
- Preparation time.
- Popular, new, or chef-special labels.
- Out-of-stock state.

## Checkout

Use Checkout as the cashier workspace.

Review the bill before completion:

- Subtotal.
- Discount and coupon.
- Tax.
- Service charge.
- Round off.
- Grand total.
- Paid, remaining, and change due.

Supported payment options in the UI include:

- Cash.
- Card.
- UPI.
- Wallet.
- Gift card.
- Credit.
- Split payment.
- Store credit.

Admin-configured payment gateways can be enabled per outlet from Settings.

Receipt options may include print, WhatsApp, email, SMS, or no receipt depending on configuration.

## Tables And Floor

Use Tables and Floor Designer for dine-in operations.

Typical table workflow:

1. Customer arrives.
2. Assign a table.
3. Assign waiter and guest count.
4. Start or attach an order.
5. Send items to KDS.
6. Add more orders as needed.
7. Checkout the bill.
8. Mark the table for cleaning.
9. Return the table to available status.

Floor Designer supports outlet-level layouts and table mapping when available in the subscription plan.

## Kitchen Display System

Use KDS to manage order preparation.

KDS columns:

- Pending.
- Preparing.
- Ready for pickup.

Kitchen staff can move tickets through the workflow. Delayed or priority orders should be handled first.

KDS cards may include:

- Table number.
- Order timer.
- Preparation time.
- Special notes.
- Modifiers.
- Waiter or service source.
- Customer notes.

## Inventory

Use Inventory to control stock movement and reduce wastage.

Stock on hand:

- Review current quantity.
- Check low stock and out-of-stock items.
- Review item status such as Optimal, Low Stock, Out of Stock, or Not Counted.

Daily stock update:

- Enter counted stock.
- Keep daily inventory records.

Adjustments:

- Correct stock differences.
- Record reasons for variance.

Waste log:

- Record damaged, expired, spilled, or wasted items.

Purchase orders:

- Create purchase orders.
- Track supplier purchases.
- Receive stock.

Suppliers:

- Maintain vendor names, contacts, and supply categories.

## Menu And Recipes

Products:

- Add menu items and stock items.
- Set category, price, tax, food type, and availability.
- Lite plan supports up to 100 products.

Categories:

- Organize menu items for faster POS ordering.

Recipes:

- Link finished menu items to raw materials.
- Enable recipe costing and stock deduction where available.
- Available from Professional plan and above.

## CRM And Offers

CRM helps track guests and repeat customers.

Use it to review:

- Customer profile.
- Contact details.
- Order history.
- Visit frequency.
- Lifetime spend.
- Live table guests.

Offers and vouchers support customer engagement, discounts, and repeat visits.

## Reports

Reports help owners and managers understand business performance.

Common report areas:

- Sales.
- Order history.
- Payments.
- Inventory.
- Kitchen.
- Cashier.
- Customer.
- Discount and tax.
- Fast-moving and slow-moving items.
- Table turnover.

Use date range, outlet, and employee filters where available.

## Outlets And Branches

Enterprise users can manage multiple outlets and branches.

Use Outlets / Branches to:

- Create or disable outlets.
- Switch active branch.
- Map floor plan templates to outlets.
- Keep each outlet's tables and operations scoped correctly.

## Settings

Settings control company and outlet configuration.

Use Settings for:

- Company profile.
- Subscription plan selection by Super Admin.
- Roles and permissions.
- Payment gateway settings.
- Receipt and operational preferences.

Only Super Admins can manage platform-level subscriptions.

## Payment Gateway Setup

Payment gateway options are configurable by outlet admin when enabled.

Typical setup:

1. Go to Settings.
2. Open Payment Gateway Settings.
3. Enable the required provider.
4. Enter provider credentials.
5. Save settings.
6. Test payment status before using in live billing.

Keep gateway credentials private and never commit secret files to Git.

## Subscription Plans

CafePilots supports four plans:

- Lite: Phone-first billing for very small food businesses.
- Starter: Small cafes and bakeries with kitchen tickets, inventory, and purchasing.
- Professional: Busy restaurants needing recipes, food costing, staff controls, and deeper analytics.
- Enterprise: Restaurant chains, franchises, pubs, bars, and multi-outlet brands.

Plan controls decide which modules appear in navigation and which direct URLs are allowed.

## Daily Operating Checklist

Opening:

- Confirm active outlet.
- Check dashboard alerts.
- Review low stock.
- Confirm printers and payment modes.
- Open tables and counters.

During service:

- Take POS or QR orders.
- Send KOT to kitchen.
- Monitor KDS delays.
- Track open checks and running tables.
- Complete payments accurately.

Closing:

- Review order history.
- Reconcile payments.
- Enter daily stock count.
- Record waste.
- Review sales and inventory reports.

## Troubleshooting

If a module is missing:

- Check the user's role permissions.
- Check the company's subscription plan.
- Ask a Super Admin or Admin to update access.

If inventory looks wrong:

- Confirm the correct outlet is selected.
- Check whether items were counted.
- Review daily updates, adjustments, and purchase receipts.

If checkout payment fails:

- Try another payment method.
- Check payment gateway status.
- Ask an admin to verify gateway settings.

If the app shows a route error:

- Reload the page.
- Sign out and sign in again.
- Report the error details to the technical team.
