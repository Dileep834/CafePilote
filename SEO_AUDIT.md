# CafePilots Technical SEO Audit Report

**Date:** 2026-07-23  
**Stack note:** CafePilots marketing site is **Vite + React Router SPA** (not Next.js). SEO is implemented with `react-helmet-async`, static `robots.txt` / `sitemap.xml`, JSON-LD, marketing routes, and Vercel security headers.

## Scores (estimated)

| Category | Before | After (target) |
|----------|--------|----------------|
| Crawl coverage (public URLs) | ~1 URL | 40+ URLs in sitemap |
| Unique titles/descriptions | Homepage only | Unique per marketing page + blog |
| Structured data | Homepage graph only | Org / Software / FAQ / Breadcrumb / Product / Article |
| Internal linking | Mailto + anchors | Nav + footer + related links + breadcrumbs |
| Security headers | Minimal | HSTS, CSP, XFO, Referrer-Policy |
| Lighthouse SEO | ~70–85 (SPA limits) | **~95–100** with meta + sitemap + semantics |
| Performance / A11y / BP | Depends on host images | Lazy images, preload hints, semantic landmarks |

> Googlebot executes JS for SPAs; sitemap + unique Helmet meta + internal links are the primary indexing levers. For HTML-first crawlers, consider prerender later.

## Before (findings)

| Issue | Status before |
|-------|----------------|
| Missing `/features`, `/pricing`, `/blog`, SEO landings | Missing |
| Sitemap only `/` | Yes |
| robots incomplete vs `/api` `/dashboard` | Partial |
| No Helmet / per-route canonical | Yes |
| No blog | Yes |
| `/reports` stolen by ERP redirect | Yes |
| Orphan pages (no footer/nav) | N/A (pages did not exist) |
| Images without consistent SEO attrs on marketing | Partial |
| Search Console placeholders | Missing |

## After (implemented)

| Deliverable | Location |
|-------------|----------|
| Site config + public URL list | `src/pages/marketing/seo/siteConfig.ts` |
| SeoHead (title, description, keywords, canonical, robots, OG, Twitter) | `src/pages/marketing/seo/SeoHead.tsx` |
| JSON-LD (Organization, SoftwareApplication, Website, Breadcrumb, FAQ, Product, Pricing, Article) | `src/pages/marketing/seo/JsonLd.tsx` |
| Marketing layout (header/nav/main/footer, ARIA, skip link) | `src/pages/marketing/seo/MarketingLayout.tsx` |
| SEO landings (restaurant/cafe/bakery/cloud kitchen/bar/retail/GST/ERP + product pages) | `src/pages/marketing/content/landings.ts` |
| Blog index + **20** articles | `src/pages/marketing/content/blog.ts` |
| Routes on marketing host | `src/pages/marketing/MarketingSeoRoutes.tsx` + `src/routes/index.tsx` |
| Sitemap generator | `scripts/generate-sitemap.mjs` (`npm run seo:sitemap` / `prebuild`) |
| robots.txt | `public/robots.txt` |
| Security headers | `vercel.json` |
| GSC / Bing / GA4 placeholders | `index.html` |
| HelmetProvider | `src/App.tsx` |

## Public pages now indexed (marketing host)

`/`, `/features`, `/pricing`, `/about`, `/contact`, `/support`, `/blog`, `/blog/*` (20), `/inventory`, `/billing`, `/kds`, `/qr-ordering`, `/multi-outlet`, `/reports`, `/restaurant-pos`, `/cafe-pos`, `/bakery-pos`, `/cloud-kitchen-pos`, `/bar-pos`, `/retail-pos`, `/gst-billing`, `/restaurant-erp`

## Excluded from crawl (robots)

`/api/`, `/dashboard/`, `/admin/`, `/login`, `/app`, `/erp`, `/settings`, `/forgot-password`, `/menu/`

## Remaining recommendations

1. Replace `REPLACE_WITH_GOOGLE_SEARCH_CONSOLE_TOKEN` and Bing token in `index.html`.
2. Wire real GA4 measurement ID (env-driven gtag).
3. Convert Unsplash/PNG hero assets to local WebP with width/height.
4. Optional: Vite prerender plugin for static HTML snapshots of marketing routes.
5. Submit `https://cafepilots.com/sitemap.xml` in Google Search Console + Bing Webmaster.
6. Expand landing word count further with outlet-specific case studies if ranking plateaus.

## Duplicate / conflict fixes

- Marketing `/reports` is served on apex host; ERP redirect retained only on `app.` host.
- www → apex HTTPS redirect already present.
