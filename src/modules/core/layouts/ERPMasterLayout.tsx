import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

export function ERPMasterLayout() {
  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block lg:w-72 lg:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden w-full">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
          {/* Outlet renders the matched child route component */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
