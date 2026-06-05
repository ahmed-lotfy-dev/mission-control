# Graph Report - mission-control  (2026-06-05)

## Corpus Check
- 83 files · ~88,021 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 666 nodes · 1038 edges · 40 communities (35 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `898edd59`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 49|Community 49]]

## God Nodes (most connected - your core abstractions)
1. `api()` - 25 edges
2. `dbQuery()` - 23 edges
3. `compilerOptions` - 19 edges
4. `dbGet()` - 18 edges
5. `dbRun()` - 17 edges
6. `formatDate()` - 15 edges
7. `dbInsert()` - 15 edges
8. `DB` - 13 edges
9. `cn()` - 12 edges
10. `crawlSite()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `saveImageAsset()` --calls--> `dbInsert()`  [EXTRACTED]
  server/src/routes/studio.ts → server/src/db/index.ts
- `trackAsset()` --calls--> `dbInsert()`  [EXTRACTED]
  server/src/routes/studio.ts → server/src/db/index.ts
- `SheetHeader()` --calls--> `cn()`  [EXTRACTED]
  client/src/components/ui/sheet.tsx → client/src/lib/utils.ts
- `SeoContentPreview()` --calls--> `formatDate()`  [EXTRACTED]
  client/src/features/seo/components/SeoContentPreview.tsx → client/src/lib/api.ts
- `generateAIContent()` --calls--> `getOpenRouterKey()`  [EXTRACTED]
  server/src/routes/content-gen.ts → server/src/lib/helpers.ts

## Communities (40 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (26): getGeminiKey(), getNvidiaKey(), ALL_IMAGE_MODELS, backupToR2(), CF_ACCOUNT_ID, CF_API_TOKEN, contentRoutes, ensureDirs() (+18 more)

### Community 1 - "Community 1"
Cohesion: 0.14
Nodes (8): now, RateLimitEntry, RateLimitOptions, relaxedLimiter, standardLimiter, stores, strictLimiter, seoHubRoutes

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (37): dependencies, autoprefixer, class-variance-authority, clsx, gsap, @hookform/resolvers, lucide-react, postcss (+29 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (21): agentsRoute, analyticsRoute, calendarRoute, contentWriterRoute, dailyRoute, dashboardRoute, galleryRoute, kanbanRoute (+13 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, baseUrl, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (54): convertSQL(), DB, dbGet(), dbInsert(), dbQuery(), dbRun(), ensureTables(), getDB() (+46 more)

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (16): AUDIO_EXTS, DIR_MAP, _envCache, FileEntry, formatSize(), getFileType(), getMime(), IMAGE_EXTS (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.33
Nodes (7): getApiKey(), getCloudflareAccountId(), getCloudflareApiToken(), getOpenRouterKey(), loadEnv(), generateAIContent(), generateImageCloudflare()

### Community 8 - "Community 8"
Cohesion: 0.17
Nodes (23): countMatches(), CrawlIssue, CrawlPage, CrawlProgressCallback, CrawlResult, crawlSite(), detectIssues(), detectRedirectChain() (+15 more)

### Community 9 - "Community 9"
Cohesion: 0.29
Nodes (5): timeAgoStr(), fiveMinAgo, now, threeDaysAgo, twoHoursAgo

### Community 10 - "Community 10"
Cohesion: 0.06
Nodes (34): SeoKeyword, SeoKeywordsTabProps, api(), AuditUrlInput, auditUrlSchema, ContentGenInput, contentGenSchema, KeywordInput (+26 more)

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (9): connect(), getWsUrl(), listeners, LiveAgent, LiveDashboardStats, subscribe(), wsApi, WsListener (+1 more)

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (13): dependencies, elysia, description, devDependencies, bun-types, name, scripts, db:push (+5 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (12): aliases, components, utils, rsc, $schema, style, tailwind, baseColor (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.05
Nodes (37): CommandItem, COMMANDS, CrawlProgress, DomainData, cn(), FLAT_NAV, NAV_GROUPS, NAV_ITEMS (+29 more)

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, db:push, db:seed, dev, workspaces

### Community 16 - "Community 16"
Cohesion: 0.11
Nodes (18): `/api/seo`, `/api/seo-audit`, `/api/seo-hub` (broad SEO platform), Backlinks, Competitors, Crawl Pages, Crawl Sessions, Data Model (+10 more)

### Community 18 - "Community 18"
Cohesion: 0.20
Nodes (8): ASPECT_RATIOS, AssetItem, DEFAULT_VOICES, HistoryItem, ImageModel, SPEED_ICONS, StudioTab, TABS

### Community 20 - "Community 20"
Cohesion: 0.05
Nodes (37): Props, Agent, AgentLog, AgentPayload, AgentPingResult, connectWs(), ContentAsset, DailyGoal (+29 more)

### Community 23 - "Community 23"
Cohesion: 0.17
Nodes (10): Alert, AuditIssue, Backlink, BacklinkStats, Competitor, KeywordData, Project, Ranking (+2 more)

### Community 25 - "Community 25"
Cohesion: 0.20
Nodes (5): ErrorBoundary, Props, State, queryClient, router

### Community 26 - "Community 26"
Cohesion: 0.06
Nodes (17): AuditResult, SeoAuditTabProps, SeoContentPreview(), SeoContent, SeoContentTabProps, RankEntry, SeoRankingsTabProps, OverviewData (+9 more)

### Community 27 - "Community 27"
Cohesion: 0.05
Nodes (38): 0, 1, 10, 11, 12, 13, 14, 15 (+30 more)

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (9): Backlink Explorer, Competitor Analysis, Content Optimization, Keyword Research, Rank Tracking, Reporting, Selected Gaps To Close, SEO Competitor Feature Scan (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.40
Nodes (3): content, envPath, match

### Community 39 - "Community 39"
Cohesion: 0.29
Nodes (4): AnalyticsData, AnalyticsOverview, PLATFORM_COLORS, TYPE_COLORS

### Community 40 - "Community 40"
Cohesion: 0.29
Nodes (6): Architecture, Deployment, Known Limitations, Schemas, SEO Module Architecture, SEO Module Files

### Community 41 - "Community 41"
Cohesion: 0.29
Nodes (6): Goals, Problem, Scope, SEO Hub — PRD, Success Metrics, User Stories

### Community 43 - "Community 43"
Cohesion: 0.33
Nodes (4): CalendarEvent, EVENT_TYPES, PLATFORM_COLORS, PLATFORM_ICONS

### Community 44 - "Community 44"
Cohesion: 0.40
Nodes (4): Completed, In Progress, Not Started, SEO Implementation Progress

## Knowledge Gaps
- **344 isolated node(s):** `0`, `1`, `2`, `3`, `4` (+339 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `Community 10` to `Community 39`, `Community 43`, `Community 14`, `Community 18`, `Community 20`, `Community 23`, `Community 26`, `Community 30`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `formatDate()` connect `Community 26` to `Community 10`, `Community 43`, `Community 14`, `Community 18`, `Community 20`, `Community 23`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `cn()` connect `Community 14` to `Community 10`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `0`, `1`, `2` to the rest of the system?**
  _344 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.10846560846560846 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._