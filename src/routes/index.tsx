import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import DashboardLayout from '../layouts/DashboardLayout';
import AuthLayout from '../layouts/AuthLayout';

// Mock pages for now
import { ERPMasterLayout } from '../modules/core/layouts/ERPMasterLayout';
import { POSDashboard } from '../modules/pos/pages/POSDashboard';

const Login = React.lazy(() => import('../pages/Login'));
const AdminDashboard = React.lazy(() => import('../pages/Dashboard/AdminDashboard'));
const OutletDashboard = React.lazy(() => import('../pages/Dashboard/OutletDashboard'));
const Products = React.lazy(() => import('../pages/Masters/Products'));
const Categories = React.lazy(() => import('../pages/Masters/Categories'));
const Outlets = React.lazy(() => import('../pages/Masters/Outlets'));
const Users = React.lazy(() => import('../pages/Masters/Users'));
const Companies = React.lazy(() => import('../pages/Masters/Companies'));
const Suppliers = React.lazy(() => import('../pages/Masters/Suppliers'));
const Recipes = React.lazy(() => import('../pages/Masters/Recipes'));

const SalesEntry = React.lazy(() => import('../pages/Sales/SalesEntry'));

const CurrentInventory = React.lazy(() => import('../pages/Inventory/CurrentInventory'));
const DailyStockUpdate = React.lazy(() => import('../pages/Inventory/DailyStockUpdate'));
const StockAdjustments = React.lazy(() => import('../pages/Inventory/StockAdjustments'));
const PurchaseOrders = React.lazy(() => import('../pages/Purchase/PurchaseOrders'));
const WasteEntry = React.lazy(() => import('../pages/Waste/WasteEntry'));
const InventoryReport = React.lazy(() => import('../pages/Reports/InventoryReport'));
const SystemSettings = React.lazy(() => import('../pages/Settings/SystemSettings'));
const NotFound = React.lazy(() => import('../pages/NotFound'));

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return <>{children}</>;
};

const RoleBasedDashboard = () => {
  const { user } = useAuthStore();
  if (user?.role === 'Super Admin' || user?.role === 'Admin') {
    return <AdminDashboard />;
  }
  return <OutletDashboard />;
};

const AppRoutes = () => {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<div>Forgot Password</div>} />
        </Route>

        {/* New Modular ERP Routes */}
        <Route path="/erp" element={
          <ProtectedRoute>
            <ERPMasterLayout />
          </ProtectedRoute>
        }>
          <Route index element={<div className="p-8"><h1>ERP Dashboard (Coming Soon)</h1></div>} />
          <Route path="pos" element={<POSDashboard />} />
          <Route path="inventory" element={<div className="p-8"><h1>Inventory Module</h1></div>} />
          <Route path="purchase" element={<div className="p-8"><h1>Purchase Module</h1></div>} />
          <Route path="kitchen" element={<div className="p-8"><h1>Kitchen Module</h1></div>} />
          <Route path="crm" element={<div className="p-8"><h1>CRM Module</h1></div>} />
          <Route path="reports" element={<div className="p-8"><h1>Reports Module</h1></div>} />
          <Route path="franchise" element={<div className="p-8"><h1>Franchise Module</h1></div>} />
          <Route path="settings" element={<div className="p-8"><h1>Settings Module</h1></div>} />
        </Route>

        {/* Legacy MVP Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<RoleBasedDashboard />} />
          
          <Route path="masters/products" element={<Products />} />
          <Route path="masters/categories" element={<Categories />} />
          <Route path="masters/outlets" element={<Outlets />} />
          <Route path="masters/companies" element={
            <ProtectedRoute allowedRoles={['Super Admin']}>
              <Companies />
            </ProtectedRoute>
          } />
          <Route path="masters/suppliers" element={<Suppliers />} />
          <Route path="masters/recipes" element={
            <ProtectedRoute allowedRoles={['Super Admin', 'Admin']}>
              <Recipes />
            </ProtectedRoute>
          } />
          <Route path="sales/entry" element={<SalesEntry />} />
          <Route path="users" element={<Users />} />
          
          {/* Inventory Pages */}
          <Route path="inventory/current" element={<CurrentInventory />} />
          <Route path="inventory/daily-update" element={<DailyStockUpdate />} />
          <Route path="inventory/adjustments" element={<StockAdjustments />} />
          <Route path="purchase/orders" element={<PurchaseOrders />} />
          <Route path="waste" element={<WasteEntry />} />

          {/* Reports & Settings */}
          <Route path="reports" element={<InventoryReport />} />
          <Route path="settings" element={<SystemSettings />} />

          {/* Master Pages */}
          <Route path="*" element={<NotFound />} />
        </Route>
        
        {/* Top-level catch-all route for URLs outside of the dashboard path */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </React.Suspense>
  );
};

export default AppRoutes;
