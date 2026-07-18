# CafePilots domain setup

How to serve **landing** on `cafepilots.com` and **app login** on `app.cafepilots.com` (same Vercel project).

## What the app does

| URL | Page |
|-----|------|
| `https://cafepilots.com` | Marketing landing |
| `https://cafepilots.com/app` | Staff login |
| `https://app.cafepilots.com` | Staff login |
| `https://app.cafepilots.com/erp/...` | ERP after sign-in |

Host detection lives in `src/lib/appHost.ts`. `/login` redirects to `/app` on the marketing site and to `/` on the app subdomain.

## A. Vercel domains

1. Open the CafePilote project → **Settings → Domains**.
2. Add:
   - `cafepilots.com`
   - `www.cafepilots.com`
   - `app.cafepilots.com`
3. Copy the DNS records Vercel shows (A / ALIAS / CNAME). Wait until each domain shows **Valid** SSL.

## B. DNS at your registrar

Typical records (use Vercel’s exact values if they differ):

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| A or ALIAS | `@` | Vercel apex target | `cafepilots.com` |
| CNAME | `www` | `cname.vercel-dns.com` | www → apex (redirected in `vercel.json`) |
| CNAME | `app` | `cname.vercel-dns.com` | `app.cafepilots.com` |

## C. Supabase Auth allow-list

**Authentication → URL configuration**, add:

- `https://cafepilots.com/**`
- `https://app.cafepilots.com/**`
- `https://*.vercel.app/**`
- `http://localhost:5173/**`

Also add these for Google OAuth / guest redirects (see `scripts/guest_auth_setup.md`).

## D. Local check

```bash
npm run dev
```

- `http://localhost:5173/` → landing  
- `http://localhost:5173/app` → login  

Optional: map `127.0.0.1 app.localhost` and open `http://app.localhost:5173/` to test app-host login at `/`.
