import { Link, Outlet } from 'react-router-dom';
import { CafePilotsLogo } from '@/components/CafePilotsLogo';
import { loginPath } from '@/lib/appHost';
import { APP_NAME } from '@/constants';
import { FOOTER_LINK_GROUPS, NAV_LINKS, SITE_EMAIL } from './siteConfig';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function MarketingLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#F7F4EF]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2" aria-label={`${APP_NAME} home`}>
            <CafePilotsLogo className="h-8 w-8" />
            <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-sm font-medium text-slate-700 hover:text-brand-orange"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              to={loginPath()}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              Login
            </Link>
            <Link
              to="/contact"
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Get a demo
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex rounded-lg p-2 md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <div className={cn('border-t border-slate-200 md:hidden', open ? 'block' : 'hidden')}>
          <nav className="flex flex-col gap-1 px-4 py-3" aria-label="Mobile">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-white"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link to={loginPath()} className="rounded-lg px-3 py-2 text-sm" onClick={() => setOpen(false)}>
              Login
            </Link>
            <Link
              to="/contact"
              className="rounded-lg bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-white"
              onClick={() => setOpen(false)}
            >
              Get a demo
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <Outlet />
      </main>

      <footer className="mt-16 border-t border-slate-200 bg-[#0D1B2A] text-slate-200" role="contentinfo">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 text-white" aria-label={`${APP_NAME} home`}>
              <CafePilotsLogo className="h-8 w-8" />
              <span className="text-lg font-semibold">{APP_NAME}</span>
            </Link>
            <p className="mt-3 text-sm text-slate-400">
              Cloud restaurant POS for cafes, restaurants, bakeries, bars and cloud kitchens — billing,
              inventory, QR ordering, KDS and reports.
            </p>
            <p className="mt-4 text-sm">
              <a className="underline hover:text-white" href={`mailto:${SITE_EMAIL}`}>
                {SITE_EMAIL}
              </a>
            </p>
          </div>
          {FOOTER_LINK_GROUPS.map((group) => (
            <div key={group.title}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-white">{group.title}</h2>
              <ul className="mt-3 space-y-2">
                {group.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-sm text-slate-400 hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default MarketingLayout;
