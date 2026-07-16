import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white px-4 shadow-sm sm:px-6">
      <div className="flex items-center gap-4">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="hidden lg:block lg:invisible">
          {/* Placeholder to keep flex spacing balanced if needed */}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="text-slate-500">
          <Bell className="h-5 w-5" />
          <span className="sr-only">View notifications</span>
        </Button>
        <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700 lg:hidden">
          AD
        </div>
      </div>
    </header>
  );
}
