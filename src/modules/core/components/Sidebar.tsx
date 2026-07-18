import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Truck, 
  ChefHat, 
  Users, 
  BarChart3, 
  Store,
  Settings,
  Shield,
  Ticket
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CafePilotsLogo } from '@/components/CafePilotsLogo';
import { APP_NAME, BRAND } from '@/constants';

const navigation = [
  { name: 'Dashboard', href: '/erp', icon: LayoutDashboard },
  { name: 'POS (Billing)', href: '/erp/pos', icon: ShoppingCart },
  { name: 'Table Management', href: '/erp/tables', icon: LayoutDashboard },
  { name: 'Master Data', href: '/masters/products', icon: Package },
  { name: 'Inventory', href: '/erp/inventory', icon: Package },
  { name: 'Purchase', href: '/erp/purchase', icon: Truck },
  { name: 'Kitchen', href: '/erp/kitchen', icon: ChefHat },
  { name: 'CRM', href: '/erp/crm', icon: Users },
  { name: 'Reports', href: '/erp/reports', icon: BarChart3 },
  { name: 'Franchise', href: '/erp/franchise', icon: Store },
  { name: 'Offers & Vouchers', href: '/erp/vouchers', icon: Ticket },
  { name: 'Staff & Users', href: '/erp/users', icon: Shield },
  { name: 'Settings', href: '/erp/settings', icon: Settings },
];

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  return (
    <div className={cn('flex h-full flex-col text-slate-50', className)} style={{ backgroundColor: BRAND.navy }}>
      <div className="flex h-16 items-center px-5 border-b border-white/10">
        <CafePilotsLogo size={34} withWordmark withDivider onDark />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            onClick={onNavigate}
            end={item.href === '/erp'}
            className={({ isActive }) =>
              cn(
                isActive
                  ? 'text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white',
                'group flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors'
              )
            }
            style={({ isActive }) => (isActive ? { backgroundColor: BRAND.orange } : undefined)}
          >
            <item.icon
              className="mr-3 h-5 w-5 flex-shrink-0"
              aria-hidden="true"
            />
            {item.name}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: BRAND.orange }}
          >
            AD
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">Admin User</span>
            <span className="text-xs text-slate-400">{APP_NAME}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
