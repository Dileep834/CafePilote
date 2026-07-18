import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_DOMAIN, APP_NAME, APP_TAGLINE } from '@/constants';
import { CafePilotsLogo } from '@/components/CafePilotsLogo';
import { loginPath } from '@/lib/appHost';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  BarChart3,
  ChefHat,
  CheckCircle2,
  Clock3,
  Mail,
  MonitorSmartphone,
  Package,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

const CONTACT_EMAIL = 'singhdileep834@gmail.com';
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=2400';

const PRODUCT_AREAS = [
  {
    icon: MonitorSmartphone,
    label: 'POS',
    title: 'Fast counter and table billing',
    body: 'Favorites, held bills, checkout, and order flow designed for busy service hours.',
  },
  {
    icon: QrCode,
    label: 'QR',
    title: 'Guest ordering from the table',
    body: 'Customers scan, sign in, browse the menu, and send orders without waiting for staff.',
  },
  {
    icon: ChefHat,
    label: 'KDS',
    title: 'Kitchen tickets stay organized',
    body: 'Live kitchen status helps the counter, floor, and kitchen move as one team.',
  },
  {
    icon: Package,
    label: 'Stock',
    title: 'Inventory without daily guesswork',
    body: 'Daily stock updates, adjustments, waste, suppliers, and purchase orders per branch.',
  },
  {
    icon: Users,
    label: 'CRM',
    title: 'Guest and customer memory',
    body: 'Track customers, live table guests, and repeat visits across the business.',
  },
  {
    icon: BarChart3,
    label: 'Reports',
    title: 'Owner-ready business views',
    body: 'Branch filters and order history show what is selling and where attention is needed.',
  },
] as const;

const PRODUCT_SCREENSHOTS = [
  {
    title: 'Operations dashboard',
    body: 'Owners get service health, open checks, branch status, and role-aware work areas in one command view.',
    src: '/landing/screenshots/dashboard.png',
    alt: 'CafePilots operations dashboard with sales, table load, kitchen queue, and branch modules',
  },
  {
    title: 'Fast POS billing',
    body: 'Counter teams can search products, filter categories, attach tables, and build orders quickly.',
    src: '/landing/screenshots/pos.png',
    alt: 'CafePilots POS screen with menu items, product photos, filters, and current order panel',
  },
  {
    title: 'Simple checkout',
    body: 'Cash, card, UPI, promo code, tendered amount, and change due stay clear for the cashier.',
    src: '/landing/screenshots/checkout.png',
    alt: 'CafePilots checkout screen with payment method, tendered amount, keypad, and complete order button',
  },
  {
    title: 'Kitchen display',
    body: 'Kitchen staff see pending, preparing, and ready tickets without navigating through admin tools.',
    src: '/landing/screenshots/kitchen.png',
    alt: 'CafePilots kitchen display system with pending, preparing, and ready for pickup columns',
  },
  {
    title: 'Floor designer',
    body: 'Managers can map tables, seating, counters, walls, and branch floor plans visually.',
    src: '/landing/screenshots/floor-designer.png',
    alt: 'CafePilots floor designer with tables, component library, grid, and floor settings',
  },
  {
    title: 'Multi-branch setup',
    body: 'Branch owners can create outlets and apply ready-made floor templates per active branch.',
    src: '/landing/screenshots/branches.png',
    alt: 'CafePilots outlets and branches screen with branch list and floor plan mapping',
  },
] as const;

const OPERATING_FLOW = [
  'Create company, outlets, roles, and branch access.',
  'Build menu, recipes, stock items, tables, and QR codes.',
  'Take POS or QR orders and move tickets through the kitchen.',
  'Review sales, stock movement, waste, customers, and branch performance.',
] as const;

const TRUST_POINTS = [
  'Company-wise data isolation',
  'Role-based staff access',
  'Branch switching for owners',
  'Google-ready public landing page',
] as const;

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function MetricStrip() {
  const metrics = [
    ['6+', 'core modules'],
    ['24/7', 'cloud-ready workflow'],
    ['100%', 'branch scoped'],
  ];

  return (
    <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-lg border border-slate-200 bg-white shadow-sm">
      {metrics.map(([value, label]) => (
        <div key={label} className="px-3 py-4 text-center sm:px-5">
          <div className="text-xl font-extrabold text-slate-950 sm:text-2xl">{value}</div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-normal text-slate-500">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const appHref = loginPath();
  const [heroReady, setHeroReady] = useState(false);
  const mailHref = useMemo(() => {
    const subject = encodeURIComponent('CafePilots enquiry');
    return `mailto:${CONTACT_EMAIL}?subject=${subject}`;
  }, []);

  useEffect(() => {
    document.title = `${APP_NAME} - Cafe POS, QR Ordering, Inventory and CRM`;
    const description =
      'CafePilots is a smart cafe management platform for POS billing, QR ordering, kitchen display, inventory, CRM, reports, and multi-branch operations.';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', description);

    const timer = window.setTimeout(() => setHeroReady(true), 60);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-950 font-sans antialiased">
      <header className="relative isolate overflow-hidden bg-brand-navy text-white">
        <div
          className={cn(
            'absolute inset-0 bg-cover bg-center transition-transform duration-1000 ease-out',
            heroReady ? 'scale-100' : 'scale-[1.03]'
          )}
          style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(13,27,42,0.96)_0%,rgba(13,27,42,0.88)_45%,rgba(13,27,42,0.38)_100%)]" />

        <nav className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <CafePilotsLogo size={40} withWordmark withDivider onDark />
          <div className="flex items-center gap-2">
            <a
              href={mailHref}
              className="hidden rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/45 hover:bg-white/10 sm:inline-flex"
            >
              Contact us
            </a>
            <Link
              to={appHref}
              className="rounded-md bg-brand-orange px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:bg-brand-orange-light hover:text-brand-navy"
            >
              Login
            </Link>
          </div>
        </nav>

        <div className="relative z-10 mx-auto grid min-h-[88svh] max-w-7xl items-center gap-10 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-12">
          <section
            className={cn(
              'max-w-3xl transition-all duration-700 ease-out',
              heroReady ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
            )}
          >
            <p className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-normal text-brand-orange-light backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Smart cafe operating system
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-extrabold leading-[1.02] text-white sm:text-6xl lg:text-7xl">
              {APP_NAME}
            </h1>
            <p className="mt-5 max-w-2xl text-xl font-semibold text-white sm:text-2xl">
              {APP_TAGLINE}
            </p>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/78 sm:text-lg">
              One clean platform for POS billing, QR ordering, kitchen display, table management,
              stock control, CRM, and branch-wise reporting.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to={appHref}
                className="group inline-flex items-center gap-2 rounded-md bg-brand-orange px-6 py-3 text-base font-bold text-white shadow-xl shadow-black/25 transition hover:bg-brand-orange-light hover:text-brand-navy"
              >
                Open dashboard
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <a
                href={mailHref}
                className="inline-flex items-center gap-2 rounded-md border border-white/25 bg-white/10 px-6 py-3 text-base font-semibold text-white backdrop-blur transition hover:border-white/45 hover:bg-white/15"
              >
                <Mail className="h-4 w-4" />
                Contact us
              </a>
            </div>
          </section>

          <aside className="hidden lg:block">
            <div className="max-w-md rounded-lg border border-white/16 bg-white/12 p-5 shadow-2xl shadow-black/25 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-sm font-semibold text-white">Today at Main Branch</p>
                  <p className="mt-1 text-xs text-white/55">Live operating view</p>
                </div>
                <span className="rounded-md bg-emerald-400/15 px-2.5 py-1 text-xs font-bold text-emerald-200">
                  Active
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  ['Orders', '128'],
                  ['QR guests', '34'],
                  ['Open tables', '12'],
                  ['Low stock', '8'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md bg-white/10 p-4">
                    <div className="text-2xl font-extrabold text-white">{value}</div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-normal text-white/50">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-3">
                {[
                  ['Kitchen', '18 tickets in progress'],
                  ['Inventory', 'Daily stock update pending'],
                  ['CRM', '7 repeat guests today'],
                ].map(([label, body]) => (
                  <div key={label} className="flex items-center gap-3 rounded-md bg-white/10 p-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-orange-light" />
                    <div>
                      <div className="text-sm font-semibold text-white">{label}</div>
                      <div className="text-xs text-white/55">{body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-slate-50 px-5 py-5 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1fr_420px] lg:items-center">
          <p className="text-sm font-semibold uppercase tracking-normal text-slate-500">
            Built for cafe owners, outlet managers, counter teams, kitchen staff, and inventory
            teams working from one shared truth.
          </p>
          <MetricStrip />
        </div>
      </section>

      <main>
        <section id="features" className="px-5 py-20 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-normal text-brand-orange">
                Complete control
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-normal text-slate-950 sm:text-5xl">
                Run service, stock, staff, and guests from one place.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
                CafePilots keeps day-to-day operations simple for staff while giving owners a clean
                view of every branch.
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {PRODUCT_AREAS.map(({ icon: Icon, label, title, body }) => (
                <article
                  key={title}
                  className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-4">
                    <Icon className="h-7 w-7 text-brand-orange" />
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                      {label}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-slate-950">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="product-screens" className="bg-slate-50 px-5 py-20 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-normal text-brand-orange">
                  Product screens
                </p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-normal text-slate-950 sm:text-5xl">
                  See the real CafePilots workflow before your team signs in.
                </h2>
              </div>
              <p className="text-base leading-7 text-slate-600 sm:text-lg">
                These are live product views from the CafePilots ERP: dashboard, POS, checkout,
                kitchen display, floor planning, and branch setup. The sales page now shows the
                product workflow clearly for buyers and staff reviewers.
              </p>
            </div>

            <figure className="mt-12 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-950/10">
              <img
                src={PRODUCT_SCREENSHOTS[0].src}
                alt={PRODUCT_SCREENSHOTS[0].alt}
                className="block w-full"
                loading="eager"
              />
              <figcaption className="border-t border-slate-200 px-5 py-4 sm:px-6">
                <p className="text-base font-bold text-slate-950">{PRODUCT_SCREENSHOTS[0].title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {PRODUCT_SCREENSHOTS[0].body}
                </p>
              </figcaption>
            </figure>

            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
              {PRODUCT_SCREENSHOTS.slice(1).map((screen) => (
                <article
                  key={screen.title}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                >
                  <img
                    src={screen.src}
                    alt={screen.alt}
                    className="block aspect-[16/9] w-full bg-slate-100 object-contain"
                    loading="lazy"
                  />
                  <div className="p-5">
                    <h3 className="text-base font-bold text-slate-950">{screen.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{screen.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-950 px-5 py-20 text-white sm:px-8 lg:px-12">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-normal text-brand-orange-light">
                Operating flow
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-normal text-white sm:text-5xl">
                From setup to service to insight.
              </h2>
              <p className="mt-4 text-base leading-7 text-white/68">
                The system follows how a cafe actually runs: branches, menus, staff, tables, orders,
                kitchen, inventory, reports.
              </p>
            </div>

            <ol className="grid gap-4">
              {OPERATING_FLOW.map((item, index) => (
                <li key={item} className="grid grid-cols-[48px_1fr] gap-4 rounded-lg bg-white/8 p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-orange text-sm font-extrabold text-white">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="font-semibold text-white">{item}</p>
                    <p className="mt-1 text-sm text-white/55">
                      Each step stays company and branch scoped, so normal users only see the work
                      that belongs to them.
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 lg:px-12">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-normal text-brand-orange">
                Smart access
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-normal text-slate-950 sm:text-5xl">
                Powerful for owners. Simple for staff.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Super Admins can manage the platform. Admins and owners can manage their business.
                Cashiers, kitchen, and inventory teams get focused screens without confusing admin
                options.
              </p>
            </div>

            <div className="grid gap-3">
              {TRUST_POINTS.map((point) => (
                <div key={point} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
                  <span className="font-semibold text-slate-800">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#F6F2EC] px-5 py-20 sm:px-8 lg:px-12">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Clock3 className="h-6 w-6 text-brand-orange" />
                <div>
                  <p className="font-bold text-slate-950">Ready for your next branch</p>
                  <p className="text-sm text-slate-500">One platform, multiple outlets.</p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                {['POS', 'KDS', 'QR menu', 'Inventory', 'CRM', 'Reports'].map((item) => (
                  <div key={item} className="rounded-md bg-slate-50 px-3 py-2 font-semibold text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-normal text-brand-orange">
                Contact
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-normal text-slate-950 sm:text-5xl">
                Want CafePilots for your cafe?
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Share your outlet count, current billing setup, and what you want to improve first.
                We will help you plan the cleanest setup.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={mailHref}
                  className="inline-flex items-center gap-2 rounded-md bg-brand-orange px-6 py-3 font-bold text-white transition hover:bg-brand-orange-light hover:text-brand-navy"
                >
                  <Mail className="h-4 w-4" />
                  {CONTACT_EMAIL}
                </a>
                <button
                  type="button"
                  onClick={() => scrollToId('features')}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-6 py-3 font-bold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  View features
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-5 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CafePilotsLogo size={34} withWordmark withDivider />
            <p className="mt-3 max-w-md text-sm text-slate-500">
              Cafe management software for POS, QR ordering, inventory, CRM, and multi-branch
              reporting.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-600">
            <button type="button" onClick={() => scrollToId('features')} className="hover:text-slate-950">
              Features
            </button>
            <a href={mailHref} className="hover:text-slate-950">
              Contact
            </a>
            <Link to={appHref} className="hover:text-slate-950">
              Login
            </Link>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-7xl text-xs text-slate-400">
          Copyright {new Date().getFullYear()} {APP_NAME}. Built for smart cafe operations on {APP_DOMAIN}.
        </p>
      </footer>
    </div>
  );
}
