import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ShoppingCart, 
  Package, 
  Truck, 
  ChefHat, 
  Users, 
  BarChart3, 
  Store,
  Settings,
  Shield,
  Ticket,
  LayoutGrid,
  Database
} from 'lucide-react';

const modules = [
  {
    title: 'POS (Billing)',
    description: 'Point of Sale, Orders, Cart, Payments',
    icon: ShoppingCart,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    path: '/erp/pos'
  },
  {
    title: 'Table Management',
    description: 'Dine-in Tables, Floorplan, QR Menus',
    icon: LayoutGrid,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    path: '/erp/tables'
  },
  {
    title: 'Master Data',
    description: 'Products, Categories, Outlets, Companies',
    icon: Database,
    color: 'text-rose-600',
    bgColor: 'bg-rose-100',
    path: '/masters/products'
  },
  {
    title: 'Inventory',
    description: 'Stock Levels, Adjustments, Transfers',
    icon: Package,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    path: '/erp/inventory'
  },
  {
    title: 'Purchase',
    description: 'Purchase Orders, Supplier Management',
    icon: Truck,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    path: '/erp/purchase'
  },
  {
    title: 'Kitchen (KDS)',
    description: 'Kitchen Display System, Recipes',
    icon: ChefHat,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    path: '/erp/kitchen'
  },
  {
    title: 'CRM',
    description: 'Customer Data, Loyalty, Feedback',
    icon: Users,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
    path: '/erp/crm'
  },
  {
    title: 'Reports',
    description: 'Sales, Profit, Analytics',
    icon: BarChart3,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    path: '/erp/reports'
  },
  {
    title: 'Franchise',
    description: 'Multi-outlet Management, Royalties',
    icon: Store,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    path: '/erp/franchise'
  },
  {
    title: 'Offers & Vouchers',
    description: 'Promo Codes, Discounts, Campaigns',
    icon: Ticket,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
    path: '/erp/vouchers'
  },
  {
    title: 'Staff & Users',
    description: 'Manage Employee Accounts & Access',
    icon: Shield,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    path: '/erp/users'
  },
  {
    title: 'Settings',
    description: 'System Config, Receipts, Printers',
    icon: Settings,
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    path: '/erp/settings'
  }
];

export function ERPHome() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome to CafePilots</h1>
        <p className="text-slate-500 mt-2">Select a module below to get started.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-4">
        {modules.map((mod) => (
          <Card 
            key={mod.title}
            className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200 border-slate-200"
            onClick={() => navigate(mod.path)}
          >
            <CardContent className="p-6 flex flex-col items-center text-center h-full">
              <div className={`p-4 rounded-full ${mod.bgColor} mb-4`}>
                <mod.icon className={`h-8 w-8 ${mod.color}`} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{mod.title}</h3>
              <p className="text-sm text-slate-500 line-clamp-2">{mod.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
