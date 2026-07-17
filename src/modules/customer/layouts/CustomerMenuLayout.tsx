import React from 'react';
import { Outlet } from 'react-router-dom';

export function CustomerMenuLayout() {
  return (
    <div className="flex min-h-[100dvh] w-full bg-slate-50 flex-col font-sans antialiased text-slate-900 overflow-hidden">
      {/* 
        This is a public facing layout. It has no sidebars or ERP headers.
        It is fully optimized for mobile devices (100dvh).
      */}
      <div className="flex-1 overflow-y-auto relative w-full h-full max-w-md mx-auto bg-white shadow-2xl">
        <Outlet />
      </div>
    </div>
  );
}
