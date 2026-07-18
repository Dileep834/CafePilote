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
  Settings,
  Shield,
  Ticket,
  LayoutGrid,
  Map,
  UtensilsCrossed,
  Tags,
  BookOpen,
  Boxes,
  Building2,
  type LucideIcon,
} from 'lucide-react';
import { BRAND } from '@/constants';
import { cn } from '@/lib/utils';

type ModuleCard = {
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
};

type ModuleSection = {
  id: string;
  label: string;
  items: ModuleCard[];
};

const sections: ModuleSection[] = [
  {
    id: 'service',
    label: 'Front of house',
    items: [
      {
        title: 'POS (Billing)',
        description: 'Orders, cart, payments & history',
        icon: ShoppingCart,
        path: '/erp/pos',
      },
      {
        title: 'Tables',
        description: 'Seating status, bills & QR',
        icon: LayoutGrid,
        path: '/erp/tables',
      },
      {
        title: 'Floor Designer',
        description: 'Layout, table placement & links',
        icon: Map,
        path: '/erp/floor',
      },
      {
        title: 'Kitchen (KDS)',
        description: 'Tickets and prep status',
        icon: ChefHat,
        path: '/erp/kitchen',
      },
    ],
  },
  {
    id: 'menu',
    label: 'Menu & catalog',
    items: [
      {
        title: 'Products',
        description: 'Sellable items & prices',
        icon: UtensilsCrossed,
        path: '/erp/menu/products',
      },
      {
        title: 'Categories',
        description: 'Menu groups for POS & QR',
        icon: Tags,
        path: '/erp/menu/categories',
      },
      {
        title: 'Recipes',
        description: 'BOM / recipe costing',
        icon: BookOpen,
        path: '/erp/menu/recipes',
      },
    ],
  },
  {
    id: 'stock',
    label: 'Inventory & purchase',
    items: [
      {
        title: 'Stock on hand',
        description: 'Live inventory levels',
        icon: Boxes,
        path: '/erp/inventory',
      },
      {
        title: 'Purchase orders',
        description: 'Ordering from suppliers',
        icon: Truck,
        path: '/erp/purchase',
      },
      {
        title: 'Adjustments',
        description: 'Corrections & transfers',
        icon: Package,
        path: '/erp/inventory/adjustments',
      },
    ],
  },
  {
    id: 'growth',
    label: 'Customers & business',
    items: [
      {
        title: 'CRM',
        description: 'Guests, loyalty, feedback',
        icon: Users,
        path: '/erp/crm',
      },
      {
        title: 'Offers & vouchers',
        description: 'Promo codes & campaigns',
        icon: Ticket,
        path: '/erp/vouchers',
      },
      {
        title: 'Reports',
        description: 'Sales & order analytics',
        icon: BarChart3,
        path: '/erp/reports',
      },
      {
        title: 'Outlets / Branches',
        description: 'Locations & floor plan mapping',
        icon: Building2,
        path: '/erp/franchise',
      },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    items: [
      {
        title: 'Staff & users',
        description: 'Accounts and access',
        icon: Shield,
        path: '/erp/users',
      },
      {
        title: 'Settings',
        description: 'Receipts, printers, floor plans',
        icon: Settings,
        path: '/erp/settings',
      },
    ],
  },
];

export function ERPHome() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: BRAND.navy }}>
          Welcome to CafePilots
        </h1>
        <p className="text-slate-500 mt-2">
          Modules are grouped by job — service floor, menu, stock, then admin.
        </p>
      </div>

      {sections.map((section) => (
        <section key={section.id} className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-0.5">
            {section.label}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {section.items.map((mod) => (
              <Card
                key={mod.title}
                className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-slate-200"
                onClick={() => navigate(mod.path)}
              >
                <CardContent className="p-5 flex flex-col h-full">
                  <div
                    className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center mb-3 text-white'
                    )}
                    style={{ backgroundColor: BRAND.navy }}
                  >
                    <mod.icon className="h-5 w-5" style={{ color: BRAND.orange }} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">{mod.title}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2">{mod.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
