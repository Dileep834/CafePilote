import React from 'react';
import { Menu, Bell, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { CafePilotsLogo } from '@/components/CafePilotsLogo';
import { BRAND } from '@/constants';
import { cn } from '@/lib/utils';
import { BranchSwitcher } from './BranchSwitcher';
import { useTenantStore } from '@/store/useTenantStore';
import { loginPath } from '@/lib/appHost';

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export function Header({ onToggleSidebar, isSidebarOpen = true }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { logout } = useAuthStore();
  const clearTenant = useTenantStore((s) => s.clear);
  const navigate = useNavigate();

  const handleLogout = async () => {
    const sessionId = useAuthStore.getState().sessionId;
    if (sessionId) {
      try {
        await supabase.from('user_sessions').update({ logout_time: new Date().toISOString() }).eq('id', sessionId);
      } catch (e) {
        console.error('Failed to log logout time', e);
      }
    }
    clearTenant();
    logout();
    navigate(loginPath());
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white px-4 shadow-sm sm:px-6 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger render={
            <Button variant="ghost" size="icon" className="lg:hidden shrink-0">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          } />
          <SheetContent side="left" className="w-72 p-0">
            <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:flex shrink-0 text-slate-500 hover:bg-slate-100"
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>

        <div className={cn('min-w-0', isSidebarOpen ? 'lg:hidden' : 'lg:flex')}>
          <CafePilotsLogo size={32} withWordmark withDivider />
        </div>
      </div>

      <div className="flex-1 flex justify-center min-w-0 px-2">
        <BranchSwitcher />
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <Button variant="ghost" size="icon" className="text-slate-500">
          <Bell className="h-5 w-5" />
          <span className="sr-only">View notifications</span>
        </Button>
        <Button variant="ghost" size="icon" className="text-slate-500" onClick={handleLogout} title="Logout">
          <LogOut className="w-5 h-5" />
          <span className="sr-only">Logout</span>
        </Button>
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white lg:hidden"
          style={{ backgroundColor: BRAND.orange }}
        >
          AD
        </div>
      </div>
    </header>
  );
}
