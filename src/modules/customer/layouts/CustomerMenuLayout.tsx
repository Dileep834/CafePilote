import React from 'react';
import { Outlet } from 'react-router-dom';
import { BRAND } from '@/constants';

export function CustomerMenuLayout() {
  return (
    <div
      className="flex h-[100dvh] w-full flex-col font-sans antialiased overflow-hidden"
      style={{ backgroundColor: BRAND.navy, color: BRAND.navy }}
    >
      <div
        className="flex-1 min-h-0 overflow-hidden relative w-full max-w-md mx-auto shadow-2xl flex flex-col"
        style={{ backgroundColor: BRAND.gray }}
      >
        <Outlet />
      </div>
    </div>
  );
}
