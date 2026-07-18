import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import AuthLayout from '../layouts/AuthLayout';
import ErrorBoundary from '../components/ErrorBoundary';
import { isAppHost, loginPath } from '../lib/appHost';

import { ERPMasterLayout } from '../modules/core/layouts/ERPMasterLayout';
import { ERPHome } from '../modules/core/pages/ERPHome';
import { POSDashboard } from '../modules/pos/pages/POSDashboard';
import { CheckoutPage } from '../modules/pos/pages/CheckoutPage';
import { CurrentInventory as ERPCurrentInventory } from '../modules/inventory/pages/CurrentInventory';
import { KitchenDisplay } from '../modules/kitchen/pages/KitchenDisplay';
import { OrderHistory } from '../modules/reports/pages/OrderHistory';
import { PurchaseOrders as ERPPurchaseOrders } from '../modules/purchase/pages/PurchaseOrders';
import { SuppliersList } from '../modules/purchase/pages/SuppliersList';
import { FranchiseManagement } from '../modules/franchise/pages/FranchiseManagement';
import { CustomerManagement } from '../modules/crm/pages/CustomerManagement';
import { SystemSettings as ERPSystemSettings } from '../modules/settings/pages/SystemSettings';
import { UserManagement } from '../modules/users/pages/UserManagement';
import { UserLogs } from '../modules/users/pages/UserLogs';
import { VoucherManagement } from '../modules/marketing/pages/VoucherManagement';
import { TablesDashboard } from '../modules/tables/pages/TablesDashboard';
import { CustomerMenuLayout } from '../modules/customer/layouts/CustomerMenuLayout';
import { CustomerMenu } from '../modules/customer/pages/CustomerMenu';

const FloorDesignerPage = React.lazy(() =>
  import('../modules/floordesigner/pages/FloorDesignerPage').then((m) => ({
    default: m.FloorDesignerPage,
  }))
);

const Login = React.lazy(() => import('../pages/Login'));
const LandingPage = React.lazy(() => import('../pages/marketing/LandingPage'));
const Products = React.lazy(() => import('../pages/Masters/Products'));
const Categories = React.lazy(() => import('../pages/Masters/Categories'));
const Companies = React.lazy(() => import('../pages/Masters/Companies'));
const Recipes = React.lazy(() => import('../pages/Masters/Recipes'));

const DailyStockUpdate = React.lazy(() => import('../pages/Inventory/DailyStockUpdate'));
const StockAdjustments = React.lazy(() => import('../pages/Inventory/StockAdjustments'));
const WasteEntry = React.lazy(() => import('../pages/Waste/WasteEntry'));
const NotFound = React.lazy(() => import('../pages/NotFound'));

const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to={loginPath()} replace />;
  }

  if (user.role === 'Super Admin') {
    return <>{children}</>;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/erp" replace />;
  }

  return <>{children}</>;
};

/** Apex `/` — landing for guests; signed-in users go to ERP. */
const MarketingHome = () => {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated && user) {
    return <Navigate to="/erp" replace />;
  }
  return <LandingPage />;
};

const AppRoutes = () => {
  const appHost = isAppHost();

  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <Routes>
        {/* Host-aware home */}
        {appHost ? (
          <Route element={<AuthLayout />}>
            <Route path="/" element={<Login />} />
          </Route>
        ) : (
          <Route path="/" element={<MarketingHome />} />
        )}

        {/* Staff auth */}
        <Route element={<AuthLayout />}>
          <Route
            path="/app"
            element={appHost ? <Navigate to="/" replace /> : <Login />}
          />
          <Route path="/login" element={<Navigate to={loginPath()} replace />} />
          <Route path="/forgot-password" element={<div>Forgot Password</div>} />
        </Route>

        {/* Modular ERP */}
        <Route
          path="/erp"
          element={
            <ProtectedRoute>
              <ERPMasterLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ERPHome />} />
          <Route path="pos" element={<POSDashboard />} />
          <Route path="pos/checkout" element={<CheckoutPage />} />

          <Route path="menu/products" element={<Products />} />
          <Route path="menu/categories" element={<Categories />} />
          <Route
            path="menu/recipes"
            element={
              <ProtectedRoute allowedRoles={['Super Admin', 'Admin']}>
                <Recipes />
              </ProtectedRoute>
            }
          />
          <Route path="menu" element={<Navigate to="/erp/menu/products" replace />} />

          <Route path="inventory" element={<ERPCurrentInventory />} />
          <Route path="inventory/daily" element={<DailyStockUpdate />} />
          <Route path="inventory/adjustments" element={<StockAdjustments />} />
          <Route path="inventory/waste" element={<WasteEntry />} />
          <Route path="purchase" element={<ERPPurchaseOrders />} />
          <Route path="purchase/suppliers" element={<SuppliersList />} />

          <Route path="kitchen" element={<KitchenDisplay />} />
          <Route path="crm" element={<CustomerManagement />} />
          <Route path="reports" element={<OrderHistory />} />
          <Route path="franchise" element={<FranchiseManagement />} />
          <Route path="vouchers" element={<VoucherManagement />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="users/logs" element={<UserLogs />} />
          <Route path="tables" element={<TablesDashboard />} />
          <Route
            path="floor"
            element={
              <ErrorBoundary area="floor designer">
                <FloorDesignerPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="floor/:floorId"
            element={
              <ErrorBoundary area="floor designer">
                <FloorDesignerPage />
              </ErrorBoundary>
            }
          />
          <Route path="settings" element={<ERPSystemSettings />} />
          <Route
            path="companies"
            element={
              <ProtectedRoute allowedRoles={['Super Admin']}>
                <Companies />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Legacy URL redirects */}
        <Route path="/masters/companies" element={<Navigate to="/erp/companies" replace />} />
        <Route path="/masters/products" element={<Navigate to="/erp/menu/products" replace />} />
        <Route path="/masters/categories" element={<Navigate to="/erp/menu/categories" replace />} />
        <Route path="/masters/recipes" element={<Navigate to="/erp/menu/recipes" replace />} />
        <Route path="/masters/suppliers" element={<Navigate to="/erp/purchase/suppliers" replace />} />
        <Route path="/masters/outlets" element={<Navigate to="/erp/franchise" replace />} />
        <Route path="/inventory/daily-update" element={<Navigate to="/erp/inventory/daily" replace />} />
        <Route path="/inventory/adjustments" element={<Navigate to="/erp/inventory/adjustments" replace />} />
        <Route path="/inventory/current" element={<Navigate to="/erp/inventory" replace />} />
        <Route path="/waste" element={<Navigate to="/erp/inventory/waste" replace />} />
        <Route path="/purchase/orders" element={<Navigate to="/erp/purchase" replace />} />
        <Route path="/dashboard" element={<Navigate to="/erp" replace />} />
        <Route path="/reports" element={<Navigate to="/erp/reports" replace />} />
        <Route path="/settings" element={<Navigate to="/erp/settings" replace />} />
        <Route path="/users" element={<Navigate to="/erp/users" replace />} />
        <Route path="/sales/entry" element={<Navigate to="/erp/pos" replace />} />

        {/* Guest QR menu */}
        <Route path="/menu" element={<CustomerMenuLayout />}>
          <Route path="t/:qrToken" element={<CustomerMenu />} />
          <Route path=":outletId/:qrToken" element={<CustomerMenu />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </React.Suspense>
  );
};

export default AppRoutes;
