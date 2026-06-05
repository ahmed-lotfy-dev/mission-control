# SEO Module Architecture
System design and implementation reference for Mission Control SEO.

## Architecture
Frontend: Vite + React + TanStack Router + TanStack Query
Backend: Bun + Elysia + bun:sqlite
Realtime: WebSocket for crawl progress + polling fallback
Tunnel: Cloudflare Tunnel → web.ahmedlotfy.site:3000

## SEO Module Files
server:
- src/routes/seo-audit.ts     (crawl + 11 tab endpoints)
- src/routes/seo.ts           (CRUD for keywords, ranks, audits)
- src/routes/seo-hub.ts       (SEO platform endpoints)
- src/lib/seo-crawler.ts      (crawler logic)
- src/db/index.ts             (SEO tables)

client:
- src/views/Seo.tsx           (main dashboard: history + new crawl)
- src/features/seo/components/SeoDomain.tsx (domain overview)
- src/features/seo/components/SeoReport.tsx (report tabs)
- src/views/SeoHub.tsx        (8-tab platform UI)
- src/lib/api.ts              (frontend API client)

## Schemas
- seo_crawl_sessions
- seo_crawl_pages
- seo_issues
- seo_links
- seo_images
- seo_hreflang
- seo_redirects
- seo_robots
- seo_sitemaps
- seo_keywords
- seo_ranks
- seo_audits
- seo_content
- seo_projects
- seo_rankings
- seo_keywords

## Deployment
- bun run dev: Vite on 3000 + backend on 8000
- Cloudflare Tunnel: web.ahmedlotfy.site → 3000
- No API subdomain tunnel (intentional)

## Known Limitations
- Crawler uses in-memory activeCrawls Map — restarts lose in-flight state
- No PDF export yet
- No real SEO API (Ahrefs/SEMrush) integration — simulated realistic data
- No Google Search Console or GA4 connectors
- No AI content optimizer using NLP on crawl data
