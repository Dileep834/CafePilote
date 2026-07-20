import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Role, type RoleType } from '../constants';
import { PERMISSIONS, type PermissionId } from '@/constants/permissions';
import { usePermissionsStore } from '../store/usePermissionsStore';
import { useTenantStore } from '@/store/useTenantStore';
import { hasPlanModule, type PlanModuleId } from '@/lib/planLimits';
import AuthLayout from '../layouts/AuthLayout';
import ErrorBoundary from '../components/ErrorBoundary';
import { isAppHost, loginPath } from '../lib/appHost';

import { ERPMasterLayout } from '../modules/core/layouts/ERPMasterLayout';
import { ERPHome } from '../modules/core/pages/ERPHome';
import { POSDashboard } from '../modules/pos/pages/POSDashboard';
import { CheckoutPage } from '../modules/pos/pages/CheckoutPage';
import { OnlineOrdersPage } from '../modules/pos/pages/OnlineOrdersPage';
import { ShiftManagementPage, RefundsPage, AuditLogsPage } from '../modules/ops';
import {
  ExecutiveBiPage,
  AiCopilotPage,
  ApiPlatformPage,
  PlatformOpsPage,
} from '../modules/saas';
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
  requiredPermission,
  requiredPermissions,
  requiredPlanModule,
  requireAll = false,
}: {
  children: React.ReactNode;
  allowedRoles?: RoleType[];
  requiredPermission?: PermissionId;
  requiredPermissions?: PermissionId[];
  requiredPlanModule?: PlanModuleId;
  requireAll?: boolean;
}) => {
  const { isAuthenticated, user, isSessionExpired } = useAuthStore();
  const { hasPermission } = usePermissionsStore();
  const planId = useTenantStore((s) => s.planId);

  if (!isAuthenticated || !user) {
    return <Navigate to={loginPath()} replace />;
  }

  if (isSessionExpired()) {
    return <Navigate to={loginPath()} replace />;
  }

  if (user.role === Role.SUPER_ADMIN) {
    return <>{children}</>;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/erp" replace />;
  }

  if (!hasPlanModule(planId, requiredPlanModule)) {
    return <Navigate to="/erp" replace />;
  }

  const permissions = requiredPermissions || (requiredPermission ? [requiredPermission] : []);
  if (permissions.length > 0) {
    const allowedByPermission = requireAll
      ? permissions.every((permission) => hasPermission(user.role, permission))
      : permissions.some((permission) => hasPermission(user.role, permission));

    if (!allowedByPermission) {
      return <Navigate to="/erp" replace />;
    }
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
          <Route
            path="pos"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.POS_ACCESS} requiredPlanModule="pos">
                <POSDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="online-orders"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.POS_ACCESS} requiredPlanModule="pos">
                <OnlineOrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="shifts"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.POS_SHIFT} requiredPlanModule="pos">
                <ShiftManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="refunds"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.POS_REFUND} requiredPlanModule="pos">
                <RefundsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="audit"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.POS_AUDIT} requiredPlanModule="pos">
                <AuditLogsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="pos/checkout"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.POS_CHECKOUT} requiredPlanModule="posCheckout">
                <CheckoutPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="menu/products"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.MENU_PRODUCTS_MANAGE} requiredPlanModule="products">
                <Products />
              </ProtectedRoute>
            }
          />
          <Route
            path="menu/categories"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.MENU_CATEGORIES_MANAGE} requiredPlanModule="products">
                <Categories />
              </ProtectedRoute>
            }
          />
          <Route
            path="menu/recipes"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.RECIPES_MANAGE} requiredPlanModule="recipes">
                <Recipes />
              </ProtectedRoute>
            }
          />
          <Route path="menu" element={<Navigate to="/erp/menu/products" replace />} />

          <Route
            path="inventory"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.INVENTORY_VIEW} requiredPlanModule="inventory">
                <ERPCurrentInventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="inventory/daily"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.INVENTORY_DAILY} requiredPlanModule="inventory">
                <DailyStockUpdate />
              </ProtectedRoute>
            }
          />
          <Route
            path="inventory/adjustments"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.INVENTORY_ADJUST} requiredPlanModule="inventory">
                <StockAdjustments />
              </ProtectedRoute>
            }
          />
          <Route
            path="inventory/waste"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.INVENTORY_WASTE} requiredPlanModule="inventory">
                <WasteEntry />
              </ProtectedRoute>
            }
          />
          <Route
            path="purchase"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.PURCHASE_MANAGE} requiredPlanModule="purchase">
                <ERPPurchaseOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="purchase/suppliers"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.SUPPLIERS_MANAGE} requiredPlanModule="suppliers">
                <SuppliersList />
              </ProtectedRoute>
            }
          />

          <Route
            path="kitchen"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.KITCHEN_ACCESS} requiredPlanModule="kitchen">
                <KitchenDisplay />
              </ProtectedRoute>
            }
          />
          <Route
            path="crm"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.CRM_MANAGE} requiredPlanModule="crm">
                <CustomerManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.REPORTS_VIEW} requiredPlanModule="reports">
                <OrderHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="intelligence"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.SAAS_BI} requiredPlanModule="aiReports">
                <ExecutiveBiPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="copilot"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.SAAS_AI} requiredPlanModule="aiCoach">
                <AiCopilotPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="api-platform"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.SAAS_API} requiredPlanModule="api">
                <ApiPlatformPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="platform"
            element={
              <ProtectedRoute
                requiredPermission={PERMISSIONS.SAAS_PLATFORM}
                requiredPlanModule="centralInventory"
              >
                <PlatformOpsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="franchise"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.FRANCHISE_MANAGE} requiredPlanModule="franchise">
                <FranchiseManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="vouchers"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.MARKETING_MANAGE} requiredPlanModule="crm">
                <VoucherManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="users"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.USERS_MANAGE} requiredPlanModule="staff">
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="users/logs"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.USERS_LOGS} requiredPlanModule="staff">
                <UserLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="tables"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.TABLES_MANAGE} requiredPlanModule="tables">
                <TablesDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="floor"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.FLOOR_MANAGE} requiredPlanModule="floorDesigner">
                <ErrorBoundary area="floor designer">
                  <FloorDesignerPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="floor/:floorId"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.FLOOR_MANAGE} requiredPlanModule="floorDesigner">
                <ErrorBoundary area="floor designer">
                  <FloorDesignerPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="settings"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.SETTINGS_MANAGE} requiredPlanModule="settings">
                <ERPSystemSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="companies"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.COMPANIES_MANAGE}>
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
