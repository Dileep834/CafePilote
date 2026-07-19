import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { cn } from '@/lib/utils';

export function ERPMasterLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-[100dvh] min-h-0 w-full bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <div 
        className={cn(
          "hidden h-full min-h-0 xl:block xl:flex-shrink-0 transition-all duration-300 ease-in-out",
          isSidebarOpen ? "xl:w-72" : "xl:w-0 overflow-hidden"
        )}
      >
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 w-full">
        <Header
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        
        <main className="relative flex flex-col flex-1 overflow-y-auto min-w-0 bg-slate-50 p-4 sm:p-6 lg:p-8">
          {/* Outlet renders the matched child route component */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
