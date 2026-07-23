import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { cn } from '@/lib/utils';

/** Routes that need edge-to-edge workspace (no main padding, nav as overlay). */
function isFullBleedPath(pathname: string) {
  return /^\/erp\/(pos|online-orders|kitchen|tables|floor)(\/|$)/.test(pathname);
}

/**
 * Stacking (high → low):
 * 100  User menu / command palette
 *  80  Header chrome
 *  75  Overlay sidebar drawer
 *  70  Overlay backdrop
 *  10  Online Orders strip / in-page sticky UI
 */
export function ERPMasterLayout() {
  const location = useLocation();
  const fullBleed = isFullBleedPath(location.pathname);
  // Never start open on ops screens — avoids sidebar covering Online Orders strip on first paint
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (fullBleed) {
      setIsSidebarOpen(false);
      return;
    }
    // Dashboard / settings: dock open only on very wide desktops
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1536px)').matches) {
      setIsSidebarOpen(true);
    } else {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, fullBleed]);

  const toggleSidebar = () => setIsSidebarOpen((v) => !v);
  const closeSidebar = () => setIsSidebarOpen(false);

  const overlayNav = fullBleed;

  return (
    <div className="flex h-[100dvh] min-h-0 w-full overflow-hidden bg-slate-50">
      {/* Docked desktop sidebar (non–full-bleed pages only) */}
      {!overlayNav && (
        <div
          className={cn(
            'hidden h-full min-h-0 shrink-0 overflow-hidden transition-[width] duration-200 ease-out xl:block',
            isSidebarOpen ? 'xl:w-72' : 'xl:w-0'
          )}
        >
          <div className="h-full w-72">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Overlay nav: sits BELOW header so Online strip + user menu never fight it */}
      {overlayNav && isSidebarOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-x-0 bottom-0 top-14 z-[70] bg-slate-950/45 backdrop-blur-[1px] sm:top-16"
            onClick={closeSidebar}
          />
          <div
            className="fixed bottom-0 left-0 top-14 z-[75] flex w-[min(18rem,86vw)] flex-col shadow-2xl sm:top-16"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <Sidebar onNavigate={closeSidebar} />
          </div>
        </>
      )}

      {/* Main column */}
      <div className="relative z-0 flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
        <Header
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
          forceMenuButton={overlayNav}
        />

        <main
          className={cn(
            'relative z-0 flex min-h-0 min-w-0 flex-1 flex-col bg-slate-50 font-sans erp-crisp-text',
            fullBleed ? 'overflow-hidden p-0' : 'overflow-y-auto p-4 sm:p-6 lg:p-8'
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
