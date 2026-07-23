/** Long-form SEO landing content for public marketing pages. */

export type LandingSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LandingContent = {
  path: string;
  h1: string;
  intro: string;
  sections: LandingSection[];
  comparison?: { title: string; rows: [string, string, string][] };
  faqs: { question: string; answer: string }[];
  related: { to: string; label: string }[];
  cta: { title: string; body: string };
};

function expand(
  topic: string,
  audience: string,
  capabilities: string[]
): LandingSection[] {
  return [
    {
      heading: `Why ${audience} choose cloud POS in India`,
      paragraphs: [
        `${topic} is no longer just a billing terminal. Modern F&B teams need one system that connects the counter, kitchen, inventory store and owner reports so tickets never get lost and food cost stays visible.`,
        `CafePilots is built as a restaurant operating system: POS billing, QR ordering, kitchen display, inventory, GST-ready invoices, staff roles and multi-outlet reporting work together instead of living in disconnected apps.`,
        `Whether you run a single cafe or a multi-city brand, operators need software that stays fast on busy evenings, works when connectivity dips, and gives clear numbers the next morning.`,
      ],
      bullets: capabilities,
    },
    {
      heading: `Core capabilities for ${audience}`,
      paragraphs: [
        `CafePilots focuses on the workflows that actually move covers and tickets: quick item search, favorites, held orders, table attach, split payments, and kitchen routing.`,
        `Inventory and recipes connect to sales so stock movements reflect what was sold. QR ordering lets guests browse and order from the table while staff stay focused on hospitality.`,
        `Reports surface sales, item mix and outlet performance so managers can adjust menus, staffing and purchasing with evidence—not guesswork.`,
      ],
    },
    {
      heading: 'How CafePilots fits daily service',
      paragraphs: [
        `Before service, teams refresh the catalog and stock levels. During service, cashiers bill quickly while KDS keeps the kitchen moving. After service, managers review sales and inventory exceptions.`,
        `Multi-outlet brands switch branches without losing company isolation. Staff permissions keep discounts, refunds and settings behind the right roles.`,
        `Because CafePilots is cloud-based, owners can check performance from anywhere while the floor remains focused on guests.`,
      ],
    },
    {
      heading: 'Implementation and onboarding',
      paragraphs: [
        `Most teams start with POS billing and menu setup, then enable QR ordering and KDS, then turn on inventory and recipes once the counter rhythm is stable.`,
        `Our Lite-to-Enterprise plans scale modules as you grow—from a single cafe counter to Professional offline billing and Enterprise multi-outlet control.`,
        `Support covers setup questions, training pointers and rollout planning so your team is not left alone after go-live.`,
      ],
    },
    {
      heading: 'SEO-friendly operations checklist',
      paragraphs: [
        `Publish a clean digital menu, keep product names consistent across POS and QR, and train staff to use held orders and KOT properly so kitchen tickets stay accurate.`,
        `Review waste and adjustments weekly. Use reports to find top sellers and slow movers. Align GST settings with your accountant before peak season.`,
        `Link your public website CTA to a demo or contact page, and keep outlet details consistent for local discovery while CafePilots runs the back-of-house system of record.`,
      ],
    },
  ];
}

const defaultFaqs = (topic: string) => [
  {
    question: `What is ${topic}?`,
    answer: `${topic} helps restaurants and cafes take orders, print or send kitchen tickets, accept payments, track inventory and review sales reports from one system.`,
  },
  {
    question: 'Does CafePilots support GST billing?',
    answer:
      'Yes. CafePilots supports GST-oriented tax configuration, invoice-ready billing flows and outlet-wise sales visibility for Indian F&B businesses.',
  },
  {
    question: 'Can I run multiple outlets?',
    answer:
      'Enterprise plans support multi-outlet operations with branch switching, shared catalogs where appropriate, staff roles and consolidated reporting.',
  },
  {
    question: 'Is QR ordering included?',
    answer:
      'QR ordering is available so guests can scan, browse the menu and place dine-in orders that flow into kitchen and billing workflows.',
  },
  {
    question: 'How do I get a demo?',
    answer: 'Visit the Contact page or email singhdileep834@gmail.com to schedule a CafePilots walkthrough for your cafe, restaurant or cloud kitchen.',
  },
];

export const LANDING_PAGES: Record<string, LandingContent> = {
  features: {
    path: '/features',
    h1: 'Restaurant POS features that run the whole floor',
    intro:
      'CafePilots combines POS billing, QR ordering, kitchen display, inventory, CRM and reports so cafes and restaurants operate from one system instead of five apps.',
    sections: expand('CafePilots', 'restaurant and cafe teams', [
      'Counter and table billing with favorites and held orders',
      'QR guest ordering and digital menus',
      'Kitchen display and ticket status',
      'Inventory, recipes, waste and purchasing',
      'CRM, vouchers and outlet reports',
    ]),
    faqs: defaultFaqs('CafePilots restaurant POS'),
    related: [
      { to: '/pricing', label: 'Pricing' },
      { to: '/restaurant-pos', label: 'Restaurant POS' },
      { to: '/qr-ordering', label: 'QR Ordering' },
      { to: '/kds', label: 'KDS' },
      { to: '/inventory', label: 'Inventory' },
      { to: '/contact', label: 'Contact' },
    ],
    cta: {
      title: 'See features on a live demo',
      body: 'Tell us your outlet type and we will walk through billing, KDS, QR and inventory in one session.',
    },
  },
  pricing: {
    path: '/pricing',
    h1: 'Simple restaurant POS pricing that scales with you',
    intro:
      'Choose Lite for essential billing, Standard for kitchen and tables, Professional for recipes and offline billing, or Enterprise for multi-outlet control.',
    sections: [
      ...expand('CafePilots pricing', 'growing F&B brands', [
        'Lite — essential POS and tables',
        'Standard — kitchen, purchase, floor designer',
        'Professional — recipes, CRM depth, offline billing',
        'Enterprise — multi-outlet and platform controls',
      ]),
      {
        heading: 'What affects plan choice',
        paragraphs: [
          'Single-counter cafes often start on Lite or Standard. Bakeries adding recipes and food cost move to Professional. Chains and franchises need Enterprise multi-outlet features.',
          'Always match modules to real workflows: if kitchen tickets matter, enable KDS; if stockouts hurt service, enable inventory tracking carefully.',
        ],
      },
    ],
    comparison: {
      title: 'Plan comparison snapshot',
      rows: [
        ['Capability', 'Lite / Standard', 'Professional / Enterprise'],
        ['POS billing', 'Yes', 'Yes'],
        ['KDS / KOT', 'Standard+', 'Yes'],
        ['Recipes & food cost', 'Limited', 'Yes'],
        ['Offline billing', 'No', 'Professional+'],
        ['Multi-outlet', 'Limited', 'Enterprise'],
      ],
    },
    faqs: defaultFaqs('CafePilots pricing'),
    related: [
      { to: '/features', label: 'Features' },
      { to: '/restaurant-pos', label: 'Restaurant POS' },
      { to: '/multi-outlet', label: 'Multi Outlet' },
      { to: '/contact', label: 'Contact sales' },
    ],
    cta: {
      title: 'Get a pricing recommendation',
      body: 'Share outlet count and must-have modules — we will suggest the right CafePilots plan.',
    },
  },
  about: {
    path: '/about',
    h1: 'About CafePilots',
    intro:
      'CafePilots builds restaurant operating software for Indian cafes, restaurants, bakeries, bars and cloud kitchens that need POS, kitchen and inventory in one place.',
    sections: expand('CafePilots', 'operators who live on the floor', [
      'Designed for F&B service speed',
      'Cloud delivery with outlet isolation',
      'Progressive plans from Lite to Enterprise',
    ]),
    faqs: defaultFaqs('CafePilots'),
    related: [
      { to: '/features', label: 'Features' },
      { to: '/blog', label: 'Blog' },
      { to: '/contact', label: 'Contact' },
    ],
    cta: { title: 'Talk to the team', body: 'Ask about onboarding, demos and rollout for your brand.' },
  },
  contact: {
    path: '/contact',
    h1: 'Contact CafePilots',
    intro:
      'Request a demo, ask about pricing, or get help planning a multi-outlet rollout. We respond to cafe, restaurant, bakery and cloud kitchen inquiries.',
    sections: [
      {
        heading: 'How to reach us',
        paragraphs: [
          'Email singhdileep834@gmail.com with your city, outlet type and whether you need POS only or POS + KDS + inventory.',
          'Include approximate daily order volume and number of outlets so we can recommend the right plan and onboarding path.',
        ],
        bullets: ['Demo requests', 'Pricing questions', 'Onboarding support', 'Partner inquiries'],
      },
      ...expand('CafePilots support contact', 'new CafePilots customers', [
        'Clear next steps after first email',
        'Plan guidance for Lite through Enterprise',
      ]),
    ],
    faqs: defaultFaqs('CafePilots contact'),
    related: [
      { to: '/pricing', label: 'Pricing' },
      { to: '/support', label: 'Support' },
      { to: '/features', label: 'Features' },
    ],
    cta: {
      title: 'Email us today',
      body: 'Write to singhdileep834@gmail.com — include outlet count and must-have modules.',
    },
  },
  support: {
    path: '/support',
    h1: 'CafePilots support for POS teams',
    intro:
      'Get help with billing, QR ordering, kitchen display, inventory sync and staff permissions so your floor stays online during peak hours.',
    sections: expand('CafePilots support', 'managers and cashiers', [
      'Billing and payment troubleshooting',
      'QR menu and ordering setup',
      'KDS queue guidance',
      'Inventory and recipe checks',
    ]),
    faqs: defaultFaqs('CafePilots support'),
    related: [
      { to: '/contact', label: 'Contact' },
      { to: '/blog', label: 'Guides' },
      { to: '/features', label: 'Features' },
    ],
    cta: { title: 'Need help now?', body: 'Email singhdileep834@gmail.com with screenshots and outlet name.' },
  },
  inventory: {
    path: '/inventory',
    h1: 'Restaurant inventory management software',
    intro:
      'Track stock, recipes, waste and purchasing with CafePilots so food cost stays visible and the POS does not oversell what the store cannot make.',
    sections: expand('Restaurant inventory management', 'chefs and store managers', [
      'Stock on hand by outlet',
      'Recipe deductions on sale',
      'Waste and adjustment logs',
      'Purchase order workflows',
    ]),
    faqs: defaultFaqs('restaurant inventory management'),
    related: [
      { to: '/billing', label: 'Billing' },
      { to: '/restaurant-erp', label: 'Restaurant ERP' },
      { to: '/reports', label: 'Reports' },
      { to: '/pricing', label: 'Pricing' },
      { to: '/contact', label: 'Contact' },
    ],
    cta: {
      title: 'Control food cost with inventory',
      body: 'Book a demo to see recipe deductions and stock reports on CafePilots.',
    },
  },
  billing: {
    path: '/billing',
    h1: 'Restaurant billing software built for speed',
    intro:
      'Bill dine-in, takeaway and counter orders quickly with GST-aware totals, split payments and kitchen tickets that keep service moving.',
    sections: expand('Restaurant billing software', 'cashiers and floor managers', [
      'Cash, card, UPI and split tender',
      'Held orders and favorites',
      'GST-oriented tax settings',
      'Receipt and kitchen ticket flow',
    ]),
    faqs: defaultFaqs('restaurant billing software'),
    related: [
      { to: '/gst-billing', label: 'GST Billing' },
      { to: '/restaurant-pos', label: 'Restaurant POS' },
      { to: '/kds', label: 'KDS' },
      { to: '/qr-ordering', label: 'QR Ordering' },
      { to: '/contact', label: 'Contact' },
    ],
    cta: { title: 'Speed up the counter', body: 'See CafePilots billing on a guided demo.' },
  },
  kds: {
    path: '/kds',
    h1: 'Kitchen Display System (KDS) for faster tickets',
    intro:
      'Route orders to kitchen and bar queues, update status in real time, and reduce lost tickets with CafePilots KDS.',
    sections: expand('Kitchen display system', 'chefs and expeditors', [
      'Live ticket boards',
      'Station-aware queues',
      'Status from pending to delivered',
      'Works with POS and QR orders',
    ]),
    faqs: defaultFaqs('kitchen display system'),
    related: [
      { to: '/qr-ordering', label: 'QR Ordering' },
      { to: '/restaurant-pos', label: 'Restaurant POS' },
      { to: '/cloud-kitchen-pos', label: 'Cloud Kitchen POS' },
      { to: '/contact', label: 'Contact' },
    ],
    cta: { title: 'Unblock the kitchen', body: 'Demo KDS with your sample menu and stations.' },
  },
  'qr-ordering': {
    path: '/qr-ordering',
    h1: 'QR ordering system for restaurants and cafes',
    intro:
      'Guests scan, browse the digital menu and place orders that flow into CafePilots kitchen and billing workflows.',
    sections: expand('QR ordering', 'dine-in restaurants and cafes', [
      'Table QR menus',
      'Guest cart and submit',
      'Kitchen ticket creation',
      'Less wait for order taking',
    ]),
    faqs: defaultFaqs('QR ordering'),
    related: [
      { to: '/kds', label: 'KDS' },
      { to: '/cafe-pos', label: 'Cafe POS' },
      { to: '/billing', label: 'Billing' },
      { to: '/contact', label: 'Contact' },
    ],
    cta: { title: 'Launch QR ordering', body: 'We will help map tables and menu categories for your outlet.' },
  },
  'multi-outlet': {
    path: '/multi-outlet',
    h1: 'Multi outlet POS for restaurant chains',
    intro:
      'Operate multiple cafes or kitchens with shared standards, branch switching, staff permissions and consolidated reports.',
    sections: expand('Multi outlet POS', 'multi-branch F&B brands', [
      'Company and outlet isolation',
      'Branch switching for managers',
      'Role-based permissions',
      'Consolidated reporting',
    ]),
    faqs: defaultFaqs('multi outlet POS'),
    related: [
      { to: '/restaurant-erp', label: 'Restaurant ERP' },
      { to: '/reports', label: 'Reports' },
      { to: '/pricing', label: 'Pricing' },
      { to: '/contact', label: 'Contact' },
    ],
    cta: { title: 'Scale beyond one outlet', body: 'Talk to us about Enterprise multi-outlet setup.' },
  },
  reports: {
    path: '/reports',
    h1: 'Restaurant reports and analytics',
    intro:
      'See sales, item performance and outlet trends so owners and managers can act the same day.',
    sections: expand('Restaurant reports', 'owners and shift managers', [
      'Order history and sales views',
      'Outlet filters',
      'Item mix insights',
      'Operational visibility',
    ]),
    faqs: defaultFaqs('restaurant reports'),
    related: [
      { to: '/restaurant-pos', label: 'Restaurant POS' },
      { to: '/inventory', label: 'Inventory' },
      { to: '/multi-outlet', label: 'Multi Outlet' },
      { to: '/contact', label: 'Contact' },
    ],
    cta: { title: 'Make decisions with data', body: 'Ask for a reports walkthrough on CafePilots.' },
  },
  'restaurant-pos': {
    path: '/restaurant-pos',
    h1: 'Restaurant POS software for modern F&B teams',
    intro:
      'CafePilots restaurant POS software covers billing, tables, QR ordering, KDS, inventory and reports for full-service and QSR restaurants.',
    sections: expand('Restaurant POS software', 'restaurants across India', [
      'Dine-in and takeaway billing',
      'Tables and open checks',
      'Kitchen tickets and KDS',
      'Inventory and GST billing',
    ]),
    comparison: {
      title: 'Restaurant POS vs spreadsheets / basic billing',
      rows: [
        ['Need', 'Basic billing app', 'CafePilots'],
        ['Kitchen sync', 'Manual', 'KDS + tickets'],
        ['Inventory', 'Separate sheet', 'Linked recipes'],
        ['QR ordering', 'Rare', 'Built-in'],
        ['Multi-outlet', 'Hard', 'Enterprise ready'],
      ],
    },
    faqs: defaultFaqs('restaurant POS software'),
    related: [
      { to: '/cafe-pos', label: 'Cafe POS' },
      { to: '/pricing', label: 'Pricing' },
      { to: '/kds', label: 'KDS' },
      { to: '/inventory', label: 'Inventory' },
      { to: '/contact', label: 'Contact' },
    ],
    cta: { title: 'Upgrade your restaurant POS', body: 'Book a CafePilots restaurant demo today.' },
  },
  'cafe-pos': {
    path: '/cafe-pos',
    h1: 'Cafe POS software for coffee shops and cafes',
    intro:
      'Fast cafe billing, QR menus, favorites, daily stock and guest CRM designed for coffee counters and casual dining cafes.',
    sections: expand('Cafe POS software', 'cafe owners and baristas', [
      'Speed-focused item grid',
      'QR menus for tables',
      'Daily stock routines',
      'Offers and repeat guests',
    ]),
    faqs: defaultFaqs('cafe POS software'),
    related: [
      { to: '/bakery-pos', label: 'Bakery POS' },
      { to: '/qr-ordering', label: 'QR Ordering' },
      { to: '/billing', label: 'Billing' },
      { to: '/contact', label: 'Contact' },
    ],
    cta: { title: 'Run a faster cafe counter', body: 'See CafePilots cafe POS in a short demo.' },
  },
  'bakery-pos': {
    path: '/bakery-pos',
    h1: 'Bakery POS software for counters and production',
    intro:
      'Sell fresh items quickly while tracking recipes, waste and stock so bakery margins stay under control.',
    sections: expand('Bakery POS software', 'bakery operators', [
      'Counter billing',
      'Recipe awareness',
      'Waste tracking',
      'GST-ready sales',
    ]),
    faqs: defaultFaqs('bakery POS software'),
    related: [
      { to: '/inventory', label: 'Inventory' },
      { to: '/gst-billing', label: 'GST Billing' },
      { to: '/cafe-pos', label: 'Cafe POS' },
      { to: '/contact', label: 'Contact' },
    ],
    cta: { title: 'Modernize bakery billing', body: 'Request a bakery-focused CafePilots walkthrough.' },
  },
  'cloud-kitchen-pos': {
    path: '/cloud-kitchen-pos',
    h1: 'Cloud kitchen POS and kitchen software',
    intro:
      'Fulfil delivery and QR orders with KDS, inventory and multi-brand menus built for cloud kitchens and ghost brands.',
    sections: expand('Cloud kitchen POS', 'cloud kitchen operators', [
      'Kitchen display priority',
      'Inventory for prep',
      'Multi-brand menus',
      'Outlet reports',
    ]),
    faqs: defaultFaqs('cloud kitchen POS'),
    related: [
      { to: '/kds', label: 'KDS' },
      { to: '/multi-outlet', label: 'Multi Outlet' },
      { to: '/inventory', label: 'Inventory' },
      { to: '/contact', label: 'Contact' },
    ],
    cta: { title: 'Equip your cloud kitchen', body: 'Demo CafePilots for multi-brand kitchen ops.' },
  },
  'bar-pos': {
    path: '/bar-pos',
    h1: 'Bar POS software for pubs and bars',
    intro:
      'Open tabs, table service, stock watch and bar/kitchen queues help pubs run smoother late-night service.',
    sections: expand('Bar POS software', 'pub and bar managers', [
      'Open checks and tabs',
      'Fast modifiers',
      'Stock visibility',
      'Role-aware discounts',
    ]),
    faqs: defaultFaqs('bar POS software'),
    related: [
      { to: '/restaurant-pos', label: 'Restaurant POS' },
      { to: '/kds', label: 'KDS' },
      { to: '/inventory', label: 'Inventory' },
      { to: '/contact', label: 'Contact' },
    ],
    cta: { title: 'Run a tighter bar service', body: 'Schedule a CafePilots bar POS demo.' },
  },
  'retail-pos': {
    path: '/retail-pos',
    h1: 'Retail-ready billing for F&B counters',
    intro:
      'Use CafePilots for packaged goods and cafe retail counters alongside food service billing and stock control.',
    sections: expand('Retail POS for F&B', 'cafe retail counters', [
      'Fast SKU billing',
      'Stock awareness',
      'GST invoices',
      'Shared outlet reports',
    ]),
    faqs: defaultFaqs('retail POS'),
    related: [
      { to: '/billing', label: 'Billing' },
      { to: '/inventory', label: 'Inventory' },
      { to: '/gst-billing', label: 'GST Billing' },
      { to: '/contact', label: 'Contact' },
    ],
    cta: { title: 'Unify cafe and retail sales', body: 'Ask how CafePilots handles mixed counters.' },
  },
  'gst-billing': {
    path: '/gst-billing',
    h1: 'GST billing software for restaurants',
    intro:
      'Configure tax-aware billing, keep invoices consistent and review outlet sales with CafePilots GST-oriented workflows.',
    sections: expand('GST billing for restaurants', 'owners and accountants', [
      'Tax settings for POS',
      'Invoice-ready bills',
      'Payment method tracking',
      'Outlet sales visibility',
    ]),
    faqs: defaultFaqs('GST billing software'),
    related: [
      { to: '/billing', label: 'Billing' },
      { to: '/restaurant-pos', label: 'Restaurant POS' },
      { to: '/reports', label: 'Reports' },
      { to: '/contact', label: 'Contact' },
    ],
    cta: { title: 'Set up GST-ready billing', body: 'We will review tax settings on a short call.' },
  },
  'restaurant-erp': {
    path: '/restaurant-erp',
    h1: 'Restaurant ERP software from POS to inventory',
    intro:
      'CafePilots brings restaurant ERP-style coverage: POS, inventory, purchasing, staff, CRM and multi-outlet reports in one OS.',
    sections: expand('Restaurant ERP', 'multi-outlet F&B groups', [
      'Unified operations data',
      'Inventory and purchasing',
      'Staff roles',
      'Enterprise reporting',
    ]),
    faqs: defaultFaqs('restaurant ERP'),
    related: [
      { to: '/multi-outlet', label: 'Multi Outlet' },
      { to: '/inventory', label: 'Inventory' },
      { to: '/reports', label: 'Reports' },
      { to: '/pricing', label: 'Pricing' },
      { to: '/contact', label: 'Contact' },
    ],
    cta: {
      title: 'Move beyond disconnected tools',
      body: 'See how CafePilots replaces fragmented restaurant apps.',
    },
  },
};
