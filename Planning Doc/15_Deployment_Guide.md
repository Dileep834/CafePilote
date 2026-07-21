# Deployment & Operations Guide

## 1. Frontend Web App Deployment (Vercel / Netlify / Nginx)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Single Page Application Rewrite**: Route all requests to `/index.html`.

## 2. Database & Backend Deployment
- **Database**: Azure SQL Database or PostgreSQL on Supabase.
- **Connection Pooling**: Use PgBouncer or Azure SQL Connection Manager for high concurrency during peak dining hours.
- **Backups**: Daily automated snapshots with 30-day point-in-time recovery (PITR).

## 3. Recommended Health Monitoring
- Sentry for real-time frontend crash reporting.
- Uptime Kuma / Datadog for API endpoint monitoring.
