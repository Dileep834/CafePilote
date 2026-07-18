import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_NAME, APP_TAGLINE, APP_DOMAIN, BRAND } from '@/constants';
import { CafePilotsLogo } from '@/components/CafePilotsLogo';
import { loginPath } from '@/lib/appHost';
import { cn } from '@/lib/utils';
import {
  MonitorSmartphone,
  ChefHat,
  LayoutGrid,
  QrCode,
  Package,
  Users,
  TicketPercent,
  BarChart3,
  ShieldCheck,
  Building2,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=2400';

const CAPABILITIES = [
  {
    icon: MonitorSmartphone,
    title: 'Point of sale',
    body: 'Fast counter & table orders, held bills, favorites, and checkout built for busy café service.',
  },
  {
    icon: ChefHat,
    title: 'Kitchen display',
    body: 'Live tickets by status so the bar and kitchen stay in sync without paper tickets.',
  },
  {
    icon: LayoutGrid,
    title: 'Tables & floor',
    body: 'Map floors, link tables, and run open bills from the floor board to settlement.',
  },
  {
    icon: QrCode,
    title: 'QR guest menu',
    body: 'Guests scan, browse, and order from their phone — presence shows up in your CRM.',
  },
  {
    icon: Package,
    title: 'Inventory & purchase',
    body: 'Stock levels, daily updates, waste, suppliers, and purchase orders per outlet.',
  },
  {
    icon: Users,
    title: 'CRM & live guests',
    body: 'Customer directory and who’s signed in at the table right now.',
  },
  {
    icon: TicketPercent,
    title: 'Vouchers & promos',
    body: 'Create and validate promo codes scoped to your company.',
  },
  {
    icon: BarChart3,
    title: 'Reports',
    body: 'Completed-order history and outlet filters so owners see what each branch sells.',
  },
  {
    icon: ShieldCheck,
    title: 'Roles & access',
    body: 'Super Admin, Admin, Outlet Owner, and Staff — each with the right branch scope.',
  },
] as const;

const STEPS = [
  { n: '01', title: 'Set up outlets', body: 'Add branches, menus, and staff under your company.' },
  { n: '02', title: 'Take orders', body: 'POS, tables, or QR — every order flows to the kitchen.' },
  { n: '03', title: 'Settle & learn', body: 'Close bills, track stock, and read branch reports.' },
] as const;

const AUDIENCES = [
  { title: 'Café owners', body: 'One platform for every outlet — sales, stock, and guests.' },
  { title: 'Outlet managers', body: 'Run the floor, kitchen, and inventory for your branch.' },
  { title: 'Counter & kitchen staff', body: 'Simple POS and KDS screens built for speed.' },
  { title: 'Multi-branch brands', body: 'Company isolation so each tenant only sees their data.' },
] as const;

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function LandingPage() {
  const appHref = loginPath();
  const [heroReady, setHeroReady] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setHeroReady(true), 40);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-brand-navy text-white font-sans antialiased">
      {/* —— Hero (first viewport only: brand, headline, support, CTAs, full-bleed image) —— */}
      <header className="relative isolate min-h-[100svh] overflow-hidden">
        <div
          className={cn(
            'absolute inset-0 scale-105 bg-cover bg-center transition-transform duration-[12s] ease-out',
            heroReady && 'scale-100'
          )}
          style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
          aria-hidden
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(115deg, ${BRAND.navy}f2 0%, ${BRAND.navy}cc 42%, ${BRAND.steel}99 70%, transparent 100%)`,
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 70% 40%, ${BRAND.orange}33, transparent 55%)`,
          }}
          aria-hidden
        />

        <nav className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <CafePilotsLogo size={40} withWordmark withDivider onDark />
          <Link
            to={appHref}
            className="rounded-md bg-brand-orange px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:bg-brand-orange-light hover:text-brand-navy"
          >
            Open app
          </Link>
        </nav>

        <div className="relative z-10 flex min-h-[calc(100svh-5.5rem)] flex-col justify-center px-5 pb-16 pt-8 sm:px-8 lg:px-12">
          <div
            className={cn(
              'max-w-2xl transition-all duration-700 ease-out',
              heroReady ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            )}
          >
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange-light">
              {APP_NAME}
            </p>
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              {APP_TAGLINE}
            </h1>
            <p
              className={cn(
                'mt-5 max-w-lg text-base leading-relaxed text-white/80 sm:text-lg transition-all delay-150 duration-700',
                heroReady ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              )}
            >
              The operating system for café chains — POS, kitchen, floors, QR menus, inventory, and
              CRM in one place, with every company kept separate.
            </p>
            <div
              className={cn(
                'mt-8 flex flex-wrap items-center gap-3 transition-all delay-300 duration-700',
                heroReady ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              )}
            >
              <Link
                to={appHref}
                className="group inline-flex items-center gap-2 rounded-md bg-brand-orange px-6 py-3 text-base font-semibold text-white shadow-xl shadow-black/30 transition hover:bg-brand-orange-light hover:text-brand-navy"
              >
                Open app
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <button
                type="button"
                onClick={() => scrollToId('capabilities')}
                className="inline-flex items-center gap-2 rounded-md border border-white/25 bg-white/5 px-6 py-3 text-base font-medium text-white backdrop-blur-sm transition hover:border-white/50 hover:bg-white/10"
              >
                See features
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* What it is */}
      <section className="relative border-t border-white/10 bg-brand-steel px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Built for multi-outlet cafés
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-white/75">
              {APP_NAME} is a SaaS platform for Indian F&amp;B brands that run more than one counter.
              Each company gets its own catalog, outlets, staff, and guests — so your data never
              mixes with another tenant.
            </p>
          </div>
          <div className="flex items-start gap-4 rounded-lg border border-white/10 bg-brand-navy/50 p-6">
            <Building2 className="mt-1 h-8 w-8 shrink-0 text-brand-orange" />
            <div>
              <p className="font-semibold text-white">Company-scoped by design</p>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Platform HQ manages the product. Your brand runs its own branches, menus, and
                reports — isolated from every other customer on {APP_DOMAIN}.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section
        id="capabilities"
        className="scroll-mt-8 border-t border-white/10 bg-brand-navy px-5 py-20 sm:px-8 lg:px-12"
      >
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to run</h2>
          <p className="mt-3 max-w-2xl text-white/70">
            From the first order to stock and guest presence — one stack for floor, kitchen, and
            back office.
          </p>
          <ul className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="group">
                <Icon className="h-7 w-7 text-brand-orange transition group-hover:text-brand-orange-light" />
                <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="border-t border-white/10 bg-gradient-to-b from-brand-steel to-brand-navy px-5 py-20 sm:px-8 lg:px-12"
      >
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
          <p className="mt-3 max-w-xl text-white/70">
            A clear path from opening a branch to daily service and insights.
          </p>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="relative border-l-2 border-brand-orange/60 pl-5">
                <span className="text-xs font-bold tracking-widest text-brand-orange">{step.n}</span>
                <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-white/65">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Built for */}
      <section className="border-t border-white/10 bg-brand-navy px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Who it&apos;s for</h2>
          <p className="mt-3 max-w-xl text-white/70">
            Roles that match how café teams actually work.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            {AUDIENCES.map((a) => (
              <div key={a.title}>
                <h3 className="text-lg font-semibold text-brand-orange-light">{a.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-t border-white/10 bg-brand-steel px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-brand-orange" />
          <h2 className="mt-4 text-3xl font-bold tracking-tight">Your brand. Your data.</h2>
          <p className="mt-4 text-base leading-relaxed text-white/75">
            {APP_NAME} HQ runs the platform. Every customer company is a separate tenant — menus,
            outlets, staff, orders, and guests stay inside that company. Switch branches without
            leaking data across brands.
          </p>
          <Link
            to={appHref}
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-brand-orange px-6 py-3 font-semibold text-white transition hover:bg-brand-orange-light hover:text-brand-navy"
          >
            Sign in to {APP_NAME}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-brand-navy px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CafePilotsLogo size={32} withWordmark withDivider onDark />
            <p className="mt-3 max-w-xs text-sm text-white/55">{APP_TAGLINE}</p>
          </div>
          <div className="flex flex-wrap gap-8 text-sm">
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-white/90">Product</span>
              <button
                type="button"
                className="text-left text-white/55 hover:text-white"
                onClick={() => scrollToId('capabilities')}
              >
                Features
              </button>
              <button
                type="button"
                className="text-left text-white/55 hover:text-white"
                onClick={() => scrollToId('how-it-works')}
              >
                How it works
              </button>
              <Link to={appHref} className="text-white/55 hover:text-white">
                Open app
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-white/90">Contact</span>
              <a
                href={`mailto:hello@${APP_DOMAIN}`}
                className="text-white/55 hover:text-white"
              >
                hello@{APP_DOMAIN}
              </a>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl text-xs text-white/40">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
