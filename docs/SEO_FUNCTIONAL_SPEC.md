# Mission Control SEO — Functional Spec
Reference doc for implementation. Includes data model, endpoints, UI state, and behavior.

## Data Model

### Crawl Sessions
Fields: id, site_url, domain_slug, status, pages_crawled, total_pages, started_at, finished_at, created_at
States: running | completed | error
Rules: one session id per crawl; pages are independent contexts inside it.

### Crawl Pages
Fields: url, path, http_status, response_time_ms, page_size_kb, word_count, title, meta_description, h1, h1_count, h2..h6_count, canonical, robots_meta, has_noindex, has_nofollow, html_lang, viewport_meta, content_type, og_*, twitter_*, structured_data_types, links_count, images_count, created_at

### Issues
Fields: session_id, page_id, page_url, category, severity, title, description, recommendation, created_at
Severities: critical → high → medium → low → notice

### Links / Images / Redirects / Hreflang
Belong to a session. Created per crawl. Used for per-tab tables.

### Rankings
Fields: keyword, position, url, check_date, notes
Used for Rank Tracker trends.

### Keywords (research)
Fields: keyword, volume, difficulty, cpc, related, created_at
Used for Keyword Research and Content Optimizer.

### Backlinks
Fields: domain, dr, ref_domains, backlinks, new_links, lost_links, anchor_text_distribution, created_at

### Competitors
Fields: domain, traffic_estimate, shared_keywords, content_gap_keywords, created_at

### SEO Projects
Fields: name, domain, target_keywords, competitors, created_at
Groups crawls and tracked metrics by project.

## Endpoints

### `/api/seo-audit`
- `POST /crawl` — Start crawl. Returns `sessionId`, `domainSlug`
- `GET /sessions` — List last 50 sessions
- `GET /domain/:domainSlug` — Grouped reports
- `GET /crawl/:sessionId/progress` — Poll progress
- `GET /overview/:sessionId` — Score + stats (404 if missing)
- `GET /issues/:sessionId` — Filterable issues
- `GET /content/:sessionId` — Content/Titles/Meta
- `GET /technical/:sessionId` — Noindex, canonicals, language
- `GET /links/:sessionId` — Internal/external links + orphans
- `GET /redirects/:sessionId` — Redirect chains
- `GET /hreflang/:sessionId` — Hreflang table + issues
- `GET /social/:sessionId` — OG + Twitter completeness
- `GET /images/:sessionId` — Alt text and lazy loading stats
- `GET /performance/:sessionId` — Response time stats
- `DELETE /sessions/:sessionId` — Hard delete

### `/api/seo`
- `GET /keywords` — Keyword research collection
- `POST /keywords` — Create
- `PATCH /keywords/:id` — Update
- `DELETE /keywords/:id` — Remove
- `GET /content` — SEO content drafts
- `POST /content` — Create
- `DELETE /content/:id` — Remove
- `GET /ranks` — Rank tracking history
- `POST /ranks` — Add check
- `DELETE /ranks/:id` — Remove
- `GET /audits` — Saved audits
- `POST /audits` — Save audit
- `DELETE /audits/:id` — Remove

### `/api/seo-hub` (broad SEO platform)
- Projects, rankings, ranking history, keyword research, backlinks, backlink stats, competitor analysis, site audit, content analysis, reports, alerts

## Frontend Routes
- `/seo` — Crawl history grouped by domain
- `/seo/$domainSlug` — Domain overview with live progress
- `/seo/$domainSlug/$reportId` — 10-tab crawl report
- `/seo-hub` — Full SEO platform (8 tabs)

## Scoring Rules
- exponential decay: `score = 100 * exp(-0.5 * penaltyPerPage)`
- penalty: critical=4, high=2, medium=1, low=0.5
- `penaltyPerPage = weightedSum / max(1, pages)`

## Error Contract
Success: HTTP 200, body data.
Missing: HTTP 404 with `{ error, detail }`.
Bad input: HTTP 400 with `{ error, detail }`.
Server failure: HTTP 500 with `{ error, detail }`.
Frontend must show `detail` in toast / error pane.
