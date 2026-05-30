# Graph Report - mission-control  (2026-05-29)

## Corpus Check
- 64 files · ~68,704 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 529 nodes · 830 edges · 39 communities (31 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `53f91f83`
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
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]

## God Nodes (most connected - your core abstractions)
1. `api()` - 36 edges
2. `navigate()` - 25 edges
3. `compilerOptions` - 19 edges
4. `api()` - 19 edges
5. `DB` - 13 edges
6. `cn()` - 11 edges
7. `formatDate()` - 10 edges
8. `esc()` - 10 edges
9. `renderDaily()` - 8 edges
10. `timeAgo()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `SheetHeader()` --calls--> `cn()`  [EXTRACTED]
  client/src/components/ui/sheet.tsx → client/src/lib/utils.ts
- `DialogHeader()` --calls--> `cn()`  [EXTRACTED]
  client/src/components/ui/dialog.tsx → client/src/lib/utils.ts
- `qk()` --calls--> `api()`  [EXTRACTED]
  client/src/views/Seo.tsx → client/src/lib/api.ts
- `runPollCycle()` --calls--> `computeAgentStatus()`  [EXTRACTED]
  server/src/routes/ws.ts → server/src/lib/helpers.ts
- `runPollCycle()` --calls--> `safeJson()`  [EXTRACTED]
  server/src/routes/ws.ts → server/src/lib/helpers.ts

## Communities (39 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (61): addGoal(), agentPanelExpanded, api(), changeDailyDate(), createAsset(), currentDailyDate, deleteAgent(), deleteAsset() (+53 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (37): getR2File(), getSigningKey(), hmacSha256(), hmacSha256Hex(), isR2Configured(), listR2Files(), OUTPUT_DIR, r2Request() (+29 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (37): dependencies, autoprefixer, class-variance-authority, clsx, gsap, @hookform/resolvers, lucide-react, postcss (+29 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (21): ErrorBoundary, Props, State, queryClient, agentsRoute, dailyRoute, dashboardRoute, galleryRoute (+13 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, baseUrl, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.19
Nodes (12): DB, getDB(), initDB(), contentRoutes, goalsRoutes, scheduledRoutes, r2Routes, serveRoutes (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (8): AuditResult, SeoAuditTabProps, SeoContent, SeoContentTabProps, api(), ContentAsset, formatDate(), TYPE_ICONS

### Community 7 - "Community 7"
Cohesion: 0.19
Nodes (8): DashboardData, getAgentDefaultIcon(), ScheduledTask, Task, timeAgo(), VaultNote, ViewName, StatCardProps

### Community 8 - "Community 8"
Cohesion: 0.17
Nodes (15): AUDIO_EXTS, DIR_MAP, _envCache, FileEntry, getApiKey(), getCloudflareAccountId(), getCloudflareApiToken(), getGeminiKey() (+7 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (12): FormControl, FormDescription, FormField(), FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue (+4 more)

### Community 10 - "Community 10"
Cohesion: 0.21
Nodes (13): AuditUrlInput, auditUrlSchema, ContentGenInput, contentGenSchema, KeywordInput, keywordSchema, RankCheckInput, rankCheckSchema (+5 more)

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
Cohesion: 0.21
Nodes (9): cn(), DialogContent, DialogHeader(), DialogOverlay, DialogTitle, Input, SelectContent, SelectItem (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.23
Nodes (9): safeJson(), broadcast(), clients, handleWsUpgrade(), notifyAgentChange(), notifyTaskChange(), prevStatuses, runPollCycle() (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.18
Nodes (9): NAV_ITEMS, SheetContent, SheetContentProps, SheetHeader(), SheetOverlay, SheetTitle, sheetVariants, Toaster() (+1 more)

### Community 17 - "Community 17"
Cohesion: 0.22
Nodes (6): Props, Agent, AgentLog, AgentPayload, AgentPingResult, formatTime()

### Community 18 - "Community 18"
Cohesion: 0.20
Nodes (8): ASPECT_RATIOS, AssetItem, DEFAULT_VOICES, HistoryItem, ImageModel, SPEED_ICONS, StudioTab, TABS

### Community 19 - "Community 19"
Cohesion: 0.33
Nodes (8): formatSize(), getFileType(), getMime(), listFiles(), listRecentAssets(), SUBDIRS, WORKSPACE_DIR, workspaceRoutes

### Community 20 - "Community 20"
Cohesion: 0.28
Nodes (7): AgentRow, computeAgentStatus(), detectProcessRunning(), logActivity(), agentRoutes, LogRow, dashboardRoutes

### Community 21 - "Community 21"
Cohesion: 0.29
Nodes (6): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle

### Community 22 - "Community 22"
Cohesion: 0.29
Nodes (5): formatSize(), WorkspaceFile, FILE_ICONS, FILTERS, FilterType

### Community 23 - "Community 23"
Cohesion: 0.29
Nodes (5): agents, now, pidResult, pidStr, row

### Community 24 - "Community 24"
Cohesion: 0.29
Nodes (5): timeAgoStr(), fiveMinAgo, now, threeDaysAgo, twoHoursAgo

### Community 26 - "Community 26"
Cohesion: 0.40
Nodes (3): Button, ButtonProps, buttonVariants

### Community 27 - "Community 27"
Cohesion: 0.05
Nodes (38): 0, 1, 10, 11, 12, 13, 14, 15 (+30 more)

### Community 28 - "Community 28"
Cohesion: 0.40
Nodes (3): DailyGoal, today(), MOODS

### Community 29 - "Community 29"
Cohesion: 0.40
Nodes (3): content, envPath, match

## Knowledge Gaps
- **247 isolated node(s):** `0`, `1`, `2`, `3`, `4` (+242 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `Community 6` to `Community 7`, `Community 10`, `Community 17`, `Community 18`, `Community 22`, `Community 26`, `Community 28`, `Community 30`, `Community 31`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `cn()` connect `Community 14` to `Community 16`, `Community 9`, `Community 26`, `Community 21`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `DB` connect `Community 5` to `Community 1`, `Community 8`, `Community 15`, `Community 20`, `Community 23`, `Community 25`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `0`, `1`, `2` to the rest of the system?**
  _247 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.0697980684811238 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08416389811738649 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._