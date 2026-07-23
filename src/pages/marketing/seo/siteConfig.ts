/** CafePilots public site SEO configuration (marketing host). */

export const SITE_URL = 'https://cafepilots.com';
export const SITE_NAME = 'CafePilots';
export const SITE_EMAIL = 'singhdileep834@gmail.com';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og.png`;
export const TWITTER_HANDLE = '@cafepilots';

export type MarketingPageMeta = {
  path: string;
  title: string;
  description: string;
  keywords: string[];
  priority?: number;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  type?: 'website' | 'article' | 'product';
};

/** Public indexable routes (exclude login, dashboard, admin, api, settings, erp). */
export const PUBLIC_PAGES: MarketingPageMeta[] = [
  {
    path: '/',
    title: 'Restaurant POS Software for Cafes & Restaurants | CafePilots',
    description:
      'CafePilots is cloud-based restaurant POS software with billing, inventory, QR ordering, KDS, reports and multi outlet management for cafes, restaurants, bakeries and cloud kitchens.',
    keywords: [
      'restaurant POS software',
      'cafe POS',
      'restaurant operating system',
      'QR ordering',
      'kitchen display system',
    ],
    priority: 1,
    changefreq: 'weekly',
  },
  {
    path: '/features',
    title: 'Restaurant POS Features — Billing, KDS, Inventory | CafePilots',
    description:
      'Explore CafePilots features: POS billing, QR ordering, kitchen display, inventory, GST billing, CRM, reports and multi-outlet control for F&B businesses.',
    keywords: ['POS features', 'restaurant software features', 'KDS', 'inventory management'],
    priority: 0.9,
  },
  {
    path: '/pricing',
    title: 'Restaurant POS Pricing Plans — Lite to Enterprise | CafePilots',
    description:
      'Transparent CafePilots pricing for Lite, Standard, Professional and Enterprise restaurant POS plans. Compare modules for cafes, QSRs and multi-outlet brands.',
    keywords: ['restaurant POS pricing', 'cafe POS cost', 'POS subscription India'],
    priority: 0.9,
  },
  {
    path: '/about',
    title: 'About CafePilots — Restaurant Operating System Built for F&B',
    description:
      'Learn why CafePilots builds restaurant POS, QR ordering, KDS and inventory tools for cafes, bakeries, cloud kitchens and multi-outlet food brands in India.',
    keywords: ['about CafePilots', 'restaurant software company'],
    priority: 0.7,
  },
  {
    path: '/contact',
    title: 'Contact CafePilots — Demo, Sales & Support',
    description:
      'Contact CafePilots for a restaurant POS demo, pricing help, onboarding support or multi-outlet rollout planning.',
    keywords: ['contact CafePilots', 'POS demo', 'restaurant software support'],
    priority: 0.8,
  },
  {
    path: '/support',
    title: 'CafePilots Support — Help for Restaurant POS Teams',
    description:
      'Get CafePilots support for POS billing, QR ordering, kitchen display, inventory sync and outlet setup. Guides and contact options for F&B operators.',
    keywords: ['CafePilots support', 'POS help', 'restaurant software support'],
    priority: 0.7,
  },
  {
    path: '/blog',
    title: 'Restaurant POS Blog — Guides for Cafes & Cloud Kitchens | CafePilots',
    description:
      'Practical guides on restaurant POS, QR ordering, inventory, GST billing, KDS and restaurant ERP for cafes, bakeries and cloud kitchens.',
    keywords: ['restaurant POS blog', 'QR ordering guide', 'inventory management'],
    priority: 0.85,
    changefreq: 'weekly',
  },
  {
    path: '/inventory',
    title: 'Restaurant Inventory Management Software | CafePilots',
    description:
      'Track stock, recipes, waste and purchase orders with CafePilots restaurant inventory management. Reduce overselling and control food cost across outlets.',
    keywords: ['restaurant inventory management', 'food cost control', 'recipe inventory'],
    priority: 0.85,
  },
  {
    path: '/billing',
    title: 'Restaurant Billing Software & GST Billing | CafePilots',
    description:
      'Fast restaurant billing software with GST-ready invoices, split payments, cash/card/UPI and offline-capable checkout for cafes and restaurants.',
    keywords: ['restaurant billing software', 'GST billing', 'POS billing'],
    priority: 0.85,
  },
  {
    path: '/kds',
    title: 'Kitchen Display System (KDS) for Restaurants | CafePilots',
    description:
      'CafePilots kitchen display system keeps kitchen, bar and pickup queues in sync so tickets never get lost and service speed stays high.',
    keywords: ['kitchen display system', 'KDS software', 'restaurant KDS'],
    priority: 0.85,
  },
  {
    path: '/qr-ordering',
    title: 'QR Ordering System for Restaurants & Cafes | CafePilots',
    description:
      'Let guests scan, browse the menu and order from the table with CafePilots QR ordering. Reduce wait times and capture dine-in demand.',
    keywords: ['QR ordering system', 'QR menu restaurant', 'contactless ordering'],
    priority: 0.85,
  },
  {
    path: '/multi-outlet',
    title: 'Multi Outlet POS Software for Restaurant Chains | CafePilots',
    description:
      'Run multiple cafes or cloud kitchens with CafePilots multi outlet POS — shared catalogs, branch switching, staff roles and consolidated reports.',
    keywords: ['multi outlet POS', 'restaurant chain software', 'franchise POS'],
    priority: 0.85,
  },
  {
    path: '/reports',
    title: 'Restaurant Reports & Analytics Software | CafePilots',
    description:
      'Owner-ready restaurant reports for sales, items, outlets and kitchen performance. Make faster decisions with CafePilots analytics.',
    keywords: ['restaurant reports', 'POS analytics', 'sales reports'],
    priority: 0.8,
  },
  {
    path: '/restaurant-pos',
    title: 'Restaurant POS Software — Complete Billing & Operations | CafePilots',
    description:
      'CafePilots restaurant POS software covers billing, tables, KDS, inventory, QR ordering and reports for full-service and QSR restaurants in India.',
    keywords: ['restaurant POS software', 'best restaurant POS India', 'restaurant POS system'],
    priority: 0.95,
  },
  {
    path: '/cafe-pos',
    title: 'Cafe POS Software for Coffee Shops & Cafes | CafePilots',
    description:
      'Cafe POS software built for coffee shops and cafes — fast billing, QR menus, inventory, favorites and daily stock with CafePilots.',
    keywords: ['cafe POS software', 'coffee shop POS', 'cafe billing software'],
    priority: 0.95,
  },
  {
    path: '/bakery-pos',
    title: 'Bakery POS Software — Billing & Inventory | CafePilots',
    description:
      'Bakery POS software for counter sales, recipes, waste tracking and GST billing. Run bakery outlets smoothly with CafePilots.',
    keywords: ['bakery POS software', 'bakery billing', 'bakery inventory'],
    priority: 0.9,
  },
  {
    path: '/cloud-kitchen-pos',
    title: 'Cloud Kitchen POS & Kitchen Software | CafePilots',
    description:
      'Cloud kitchen POS with KDS, inventory, multi-brand menus and reports. Fulfil online and QR orders faster with CafePilots.',
    keywords: ['cloud kitchen POS', 'cloud kitchen software', 'ghost kitchen POS'],
    priority: 0.95,
  },
  {
    path: '/bar-pos',
    title: 'Bar POS Software for Pubs & Bars | CafePilots',
    description:
      'Bar POS software with open tabs, table service, stock control and kitchen/bar queues for pubs and nightlife venues.',
    keywords: ['bar POS software', 'pub POS', 'bar billing software'],
    priority: 0.9,
  },
  {
    path: '/retail-pos',
    title: 'Retail POS Adjacent Tools for F&B Counters | CafePilots',
    description:
      'Use CafePilots for packaged F&B retail counters — fast billing, stock and GST-ready sales alongside cafe and bakery operations.',
    keywords: ['retail POS', 'F&B retail billing', 'counter POS'],
    priority: 0.75,
  },
  {
    path: '/gst-billing',
    title: 'GST Billing Software for Restaurants | CafePilots',
    description:
      'GST billing for restaurants and cafes with tax-ready invoices, payment tracking and outlet-wise sales reports in CafePilots.',
    keywords: ['GST billing software', 'restaurant GST', 'GST POS India'],
    priority: 0.9,
  },
  {
    path: '/restaurant-erp',
    title: 'Restaurant ERP Software — POS to Inventory | CafePilots',
    description:
      'Restaurant ERP capabilities in CafePilots: POS, inventory, purchasing, staff, CRM and multi-outlet reporting in one operating system.',
    keywords: ['restaurant ERP', 'F&B ERP', 'restaurant management ERP'],
    priority: 0.9,
  },
];

export const NAV_LINKS = [
  { to: '/features', label: 'Features' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/restaurant-pos', label: 'Restaurant POS' },
  { to: '/qr-ordering', label: 'QR Ordering' },
  { to: '/blog', label: 'Blog' },
  { to: '/contact', label: 'Contact' },
] as const;

export const FOOTER_LINK_GROUPS: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { to: '/features', label: 'Features' },
      { to: '/pricing', label: 'Pricing' },
      { to: '/billing', label: 'Billing' },
      { to: '/inventory', label: 'Inventory' },
      { to: '/kds', label: 'Kitchen Display' },
      { to: '/qr-ordering', label: 'QR Ordering' },
      { to: '/multi-outlet', label: 'Multi Outlet' },
      { to: '/reports', label: 'Reports' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { to: '/restaurant-pos', label: 'Restaurant POS' },
      { to: '/cafe-pos', label: 'Cafe POS' },
      { to: '/bakery-pos', label: 'Bakery POS' },
      { to: '/cloud-kitchen-pos', label: 'Cloud Kitchen POS' },
      { to: '/bar-pos', label: 'Bar POS' },
      { to: '/gst-billing', label: 'GST Billing' },
      { to: '/restaurant-erp', label: 'Restaurant ERP' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/about', label: 'About' },
      { to: '/blog', label: 'Blog' },
      { to: '/support', label: 'Support' },
      { to: '/contact', label: 'Contact' },
    ],
  },
];

export function absoluteUrl(path: string): string {
  if (!path || path === '/') return `${SITE_URL}/`;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getPageMeta(path: string): MarketingPageMeta | undefined {
  const normalized = path === '' ? '/' : path.replace(/\/$/, '') || '/';
  return PUBLIC_PAGES.find((p) => p.path === normalized);
}
