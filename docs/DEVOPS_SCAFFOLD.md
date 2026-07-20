# CafePilots — Docker (Phase 3 scaffold)

This compose file is a **starting point** for self-hosted staging. Production still commonly uses Supabase + Vercel/static hosting.

```yaml
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "4173:4173"
    environment:
      VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
      VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY}
    restart: unless-stopped

  # Optional: local Redis for future queue workers / rate limits
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
```

## Suggested Dockerfile (SPA)

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Wire CI to build → push image → blue/green swap once the gateway and workers exist.
