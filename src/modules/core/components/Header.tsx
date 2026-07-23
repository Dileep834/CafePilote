import React from 'react';
import { Menu, LogOut, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '@/store/useAuthStore';
import { Link, useNavigate } from 'react-router-dom';
import { CafePilotsLogo } from '@/components/CafePilotsLogo';
import { BRAND } from '@/constants';
import { cn } from '@/lib/utils';
import { BranchSwitcher } from './BranchSwitcher';
import { useTenantStore } from '@/store/useTenantStore';
import { loginPath } from '@/lib/appHost';
import { CommandPalette } from './CommandPalette';
import { NotificationCenter } from '@/modules/ops/components/NotificationCenter';

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  /** When true, always show the menu button (overlay nav on POS etc.) */
  forceMenuButton?: boolean;
}

function initialsFromName(name?: string | null, email?: string | null) {
  const raw = (name || email || 'U').trim();
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }
  return raw.slice(0, 2).toUpperCase();
}

export function Header({
  onToggleSidebar,
  isSidebarOpen = true,
  forceMenuButton = false,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);
  const { logout, user } = useAuthStore();
  const clearTenant = useTenantStore((s) => s.clear);
  const navigate = useNavigate();
  const initials = initialsFromName(user?.name, user?.email);

  const handleLogout = async () => {
    clearTenant();
    await logout('manual');
    navigate(loginPath(), { replace: true });
  };

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // On overlay pages (POS), desktop toggle drives the overlay — hide the Sheet duplicate.
  const useSheetNav = !forceMenuButton;

  const menuBtnClass =
    'h-10 w-10 shrink-0 rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm touch-manipulation hover:bg-slate-50 hover:text-slate-950 hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-[#FF6A00]/30';

  return (
    <header className="relative z-[80] flex h-14 w-full shrink-0 items-center gap-2 overflow-x-hidden border-b border-slate-200 bg-white px-3 shadow-sm sm:h-16 sm:gap-3 sm:px-6">
      {/* Left: nav + logo */}
      <div className="relative z-[90] flex shrink-0 items-center gap-1.5 sm:gap-3">
        {useSheetNav ? (
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={cn(menuBtnClass, 'xl:hidden')}
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5 text-slate-800" strokeWidth={2.25} />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              }
            />
            <SheetContent
              side="left"
              showCloseButton={false}
              className="h-[100dvh] max-h-[100dvh] w-[82vw] max-w-72 overflow-hidden p-0"
            >
              <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(menuBtnClass, forceMenuButton ? 'flex' : 'hidden xl:flex')}
          onClick={onToggleSidebar}
          aria-expanded={isSidebarOpen}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5 text-slate-800" strokeWidth={2.25} />
          <span className="sr-only">Toggle sidebar</span>
        </Button>

        <Link
          to="/erp"
          aria-label="Go to dashboard"
          className={cn(
            'min-w-0 rounded-md outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-orange-300',
            forceMenuButton
              ? 'flex'
              : isSidebarOpen
                ? 'xl:hidden'
                : 'xl:flex'
          )}
        >
          <CafePilotsLogo
            size={32}
            withWordmark
            withDivider
            className="hidden sm:inline-flex"
          />
          <CafePilotsLogo size={32} withWordmark={false} className="sm:hidden" />
        </Link>
      </div>

      {/* Center: branch — flex-1 but capped so it never bleeds into right actions */}
      <div className="flex min-w-0 flex-1 items-center justify-center overflow-hidden px-1">
        <BranchSwitcher className="min-w-0 max-w-full" />
      </div>

      {/* Right: actions — always above page content; menu portals at z-100 */}
      <div className="relative z-[90] flex shrink-0 items-center gap-0.5 bg-white sm:gap-1.5">
        <Button
          type="button"
          variant="outline"
          className="hidden h-9 rounded-xl border-slate-200 px-3 text-xs font-bold text-slate-500 md:flex"
          onClick={() => setCommandOpen(true)}
        >
          <Search className="mr-2 h-3.5 w-3.5" />
          Search
          <span className="ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-400">
            Ctrl K
          </span>
        </Button>
        <NotificationCenter />
        {/* Avatar with Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Open user menu"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: BRAND.orange }}
            >
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1.5">
                <p className="text-sm font-medium leading-none text-slate-900">{user?.name || 'User'}</p>
                <p className="text-xs leading-none text-slate-500 truncate">
                  {user?.email || 'admin@cafepilots.com'}
                </p>
                <p className="text-[10px] uppercase tracking-wider font-bold mt-1 text-orange-600">
                  {user?.role || 'Staff'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </header>
  );
}
