/**
 * Generates public/sitemap.xml and public/robots.txt from the marketing site config.
 * Run: node scripts/generate-sitemap.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const SITE = 'https://cafepilots.com';
const today = new Date().toISOString().slice(0, 10);

const pages = [
  ['/', 1.0, 'weekly'],
  ['/features', 0.9, 'weekly'],
  ['/pricing', 0.9, 'weekly'],
  ['/about', 0.7, 'monthly'],
  ['/contact', 0.8, 'monthly'],
  ['/support', 0.7, 'monthly'],
  ['/blog', 0.85, 'weekly'],
  ['/inventory', 0.85, 'weekly'],
  ['/billing', 0.85, 'weekly'],
  ['/kds', 0.85, 'weekly'],
  ['/qr-ordering', 0.85, 'weekly'],
  ['/multi-outlet', 0.85, 'weekly'],
  ['/reports', 0.8, 'weekly'],
  ['/restaurant-pos', 0.95, 'weekly'],
  ['/cafe-pos', 0.95, 'weekly'],
  ['/bakery-pos', 0.9, 'weekly'],
  ['/cloud-kitchen-pos', 0.95, 'weekly'],
  ['/bar-pos', 0.9, 'weekly'],
  ['/retail-pos', 0.75, 'monthly'],
  ['/gst-billing', 0.9, 'weekly'],
  ['/restaurant-erp', 0.9, 'weekly'],
];

const blogSlugs = [
  'best-restaurant-pos-in-india',
  'how-qr-ordering-works',
  'inventory-management-guide',
  'restaurant-billing-software',
  'restaurant-erp-guide',
  'cloud-kitchen-software',
  'gst-billing-guide',
  'restaurant-analytics',
  'how-kds-improves-kitchen-speed',
  'restaurant-automation',
  'cafe-pos-buying-guide',
  'bakery-pos-tips',
  'multi-outlet-pos-checklist',
  'offline-pos-for-restaurants',
  'table-management-and-pos',
  'food-cost-control-with-recipes',
  'staff-roles-in-restaurant-pos',
  'qr-menu-design-tips',
  'peak-hour-pos-playbook',
  'choosing-kds-stations',
];

for (const slug of blogSlugs) {
  pages.push([`/blog/${slug}`, 0.7, 'monthly']);
}

const urlEntries = pages
  .map(
    ([loc, priority, changefreq]) => `  <url>
    <loc>${SITE}${loc === '/' ? '/' : loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`
  )
  .join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Disallow: /api/
Disallow: /dashboard/
Disallow: /admin/
Disallow: /login
Disallow: /app
Disallow: /erp
Disallow: /settings
Disallow: /forgot-password
Disallow: /menu/

Sitemap: ${SITE}/sitemap.xml
`;

fs.writeFileSync(path.join(root, 'public', 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(root, 'public', 'robots.txt'), robots);
console.log(`Wrote sitemap (${pages.length} URLs) and robots.txt`);
