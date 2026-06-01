# Graph Report - mission-control  (2026-06-01)

## Corpus Check
- 65 files · ~72,928 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 509 nodes · 795 edges · 34 communities (29 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `277e41ff`
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
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 19 edges
2. `api()` - 19 edges
3. `dbQuery()` - 18 edges
4. `dbGet()` - 16 edges
5. `dbRun()` - 15 edges
6. `dbInsert()` - 13 edges
7. `DB` - 13 edges
8. `formatDate()` - 12 edges
9. `cn()` - 11 edges
10. `crawlSite()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `SeoReport()` --calls--> `formatDate()`  [EXTRACTED]
  client/src/features/seo/components/SeoReport.tsx → client/src/lib/api.ts
- `saveImageAsset()` --calls--> `dbInsert()`  [EXTRACTED]
  server/src/routes/studio.ts → server/src/db/index.ts
- `trackAsset()` --calls--> `dbInsert()`  [EXTRACTED]
  server/src/routes/studio.ts → server/src/db/index.ts
- `DialogHeader()` --calls--> `cn()`  [EXTRACTED]
  client/src/components/ui/dialog.tsx → client/src/lib/utils.ts
- `SheetHeader()` --calls--> `cn()`  [EXTRACTED]
  client/src/components/ui/sheet.tsx → client/src/lib/utils.ts

## Communities (34 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (28): AUDIO_EXTS, DIR_MAP, _envCache, FileEntry, formatSize(), getApiKey(), getCloudflareAccountId(), getCloudflareApiToken() (+20 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (29): now, RateLimitEntry, RateLimitOptions, relaxedLimiter, standardLimiter, stores, strictLimiter, ALL_IMAGE_MODELS (+21 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (37): dependencies, autoprefixer, class-variance-authority, clsx, gsap, @hookform/resolvers, lucide-react, postcss (+29 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (22): ErrorBoundary, Props, State, queryClient, agentsRoute, dailyRoute, dashboardRoute, galleryRoute (+14 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, baseUrl, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (46): convertSQL(), DB, dbGet(), dbInsert(), dbQuery(), dbRun(), ensureTables(), getDB() (+38 more)

### Community 6 - "Community 6"
Cohesion: 0.20
Nodes (6): AuditResult, SeoAuditTabProps, SeoContentPreview(), SeoContent, SeoContentTabProps, formatDate()

### Community 7 - "Community 7"
Cohesion: 0.19
Nodes (8): DashboardData, getAgentDefaultIcon(), ScheduledTask, Task, timeAgo(), VaultNote, ViewName, StatCardProps

### Community 8 - "Community 8"
Cohesion: 0.19
Nodes (21): countMatches(), CrawlIssue, CrawlPage, CrawlResult, crawlSite(), detectIssues(), detectRedirectChain(), extractAllMatches() (+13 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (12): FormControl, FormDescription, FormField(), FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue (+4 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (18): AuditUrlInput, auditUrlSchema, ContentGenInput, contentGenSchema, KeywordInput, keywordSchema, RankCheckInput, rankCheckSchema (+10 more)

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
Cohesion: 0.14
Nodes (14): cn(), DialogContent, DialogHeader(), DialogOverlay, DialogTitle, Input, SelectContent, SelectItem (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, db:push, db:seed, dev, workspaces

### Community 16 - "Community 16"
Cohesion: 0.20
Nodes (6): CommandItem, COMMANDS, NAV_ITEMS, SheetContent, Toaster(), ToasterProps

### Community 17 - "Community 17"
Cohesion: 0.22
Nodes (6): Props, Agent, AgentLog, AgentPayload, AgentPingResult, formatTime()

### Community 18 - "Community 18"
Cohesion: 0.20
Nodes (8): ASPECT_RATIOS, AssetItem, DEFAULT_VOICES, HistoryItem, ImageModel, SPEED_ICONS, StudioTab, TABS

### Community 19 - "Community 19"
Cohesion: 0.80
Nodes (4): getRawDB(), applyAll(), createIndexIfMissing(), runMigration()

### Community 20 - "Community 20"
Cohesion: 0.50
Nodes (4): DailyGoal, today(), Daily(), MOODS

### Community 21 - "Community 21"
Cohesion: 0.29
Nodes (6): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle

### Community 22 - "Community 22"
Cohesion: 0.29
Nodes (5): formatSize(), WorkspaceFile, FILE_ICONS, FILTERS, FilterType

### Community 26 - "Community 26"
Cohesion: 0.40
Nodes (4): SeoReport(), Button, ButtonProps, buttonVariants

### Community 27 - "Community 27"
Cohesion: 0.05
Nodes (38): 0, 1, 10, 11, 12, 13, 14, 15 (+30 more)

### Community 29 - "Community 29"
Cohesion: 0.40
Nodes (3): content, envPath, match

### Community 30 - "Community 30"
Cohesion: 0.29
Nodes (3): SeoKeyword, SeoKeywordsTabProps, api()

## Knowledge Gaps
- **261 isolated node(s):** `0`, `1`, `2`, `3`, `4` (+256 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `Community 30` to `Community 6`, `Community 7`, `Community 10`, `Community 17`, `Community 18`, `Community 20`, `Community 22`, `Community 23`, `Community 24`, `Community 26`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `cn()` connect `Community 14` to `Community 9`, `Community 26`, `Community 21`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `formatDate()` connect `Community 6` to `Community 7`, `Community 10`, `Community 18`, `Community 22`, `Community 23`, `Community 24`, `Community 26`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `0`, `1`, `2` to the rest of the system?**
  _261 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.0967741935483871 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._