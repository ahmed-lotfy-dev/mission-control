# Graph Report - .  (2026-05-29)

## Corpus Check
- Corpus is ~35,468 words - fits in a single context window. You may not need a graph.

## Summary
- 490 nodes · 792 edges · 38 communities (31 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_State Management & API|State Management & API]]
- [[_COMMUNITY_R2 Cloud Storage|R2 Cloud Storage]]
- [[_COMMUNITY_Client Config & Dependencies|Client Config & Dependencies]]
- [[_COMMUNITY_Client Entry & Routing|Client Entry & Routing]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Database Layer|Database Layer]]
- [[_COMMUNITY_SEO Components|SEO Components]]
- [[_COMMUNITY_API Client & Dashboard|API Client & Dashboard]]
- [[_COMMUNITY_Helpers & Constants|Helpers & Constants]]
- [[_COMMUNITY_UI Form Components|UI Form Components]]
- [[_COMMUNITY_SEO Schemas & Types|SEO Schemas & Types]]
- [[_COMMUNITY_WebSocket Connection|WebSocket Connection]]
- [[_COMMUNITY_Server Package Config|Server Package Config]]
- [[_COMMUNITY_Path Aliases & Utils|Path Aliases & Utils]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_WebSocket Helpers|WebSocket Helpers]]
- [[_COMMUNITY_Layout & Navigation|Layout & Navigation]]
- [[_COMMUNITY_Agents Module|Agents Module]]
- [[_COMMUNITY_Studio & Image Generation|Studio & Image Generation]]
- [[_COMMUNITY_File Utilities|File Utilities]]
- [[_COMMUNITY_Agent Monitoring|Agent Monitoring]]
- [[_COMMUNITY_Card Components|Card Components]]
- [[_COMMUNITY_Workspace View|Workspace View]]
- [[_COMMUNITY_Agent Status|Agent Status]]
- [[_COMMUNITY_Issue Categorization|Issue Categorization]]
- [[_COMMUNITY_SEO Crawler|SEO Crawler]]
- [[_COMMUNITY_Button & SEO Report|Button & SEO Report]]
- [[_COMMUNITY_Sheet Component|Sheet Component]]
- [[_COMMUNITY_Daily Goals|Daily Goals]]
- [[_COMMUNITY_Environment & Config|Environment & Config]]
- [[_COMMUNITY_SEO Keywords|SEO Keywords]]
- [[_COMMUNITY_SEO Rankings|SEO Rankings]]
- [[_COMMUNITY_DB Migrations|DB Migrations]]
- [[_COMMUNITY_Docker Config|Docker Config]]
- [[_COMMUNITY_Client HTML|Client HTML]]
- [[_COMMUNITY_Public HTML|Public HTML]]

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

## Communities (38 total, 7 thin omitted)

### Community 0 - "State Management & API"
Cohesion: 0.07
Nodes (61): addGoal(), agentPanelExpanded, api(), changeDailyDate(), createAsset(), currentDailyDate, deleteAgent(), deleteAsset() (+53 more)

### Community 1 - "R2 Cloud Storage"
Cohesion: 0.08
Nodes (37): getR2File(), getSigningKey(), hmacSha256(), hmacSha256Hex(), isR2Configured(), listR2Files(), OUTPUT_DIR, r2Request() (+29 more)

### Community 2 - "Client Config & Dependencies"
Cohesion: 0.05
Nodes (37): dependencies, autoprefixer, class-variance-authority, clsx, gsap, @hookform/resolvers, lucide-react, postcss (+29 more)

### Community 3 - "Client Entry & Routing"
Cohesion: 0.07
Nodes (21): ErrorBoundary, Props, State, queryClient, agentsRoute, dailyRoute, dashboardRoute, galleryRoute (+13 more)

### Community 4 - "TypeScript Config"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, baseUrl, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module (+13 more)

### Community 5 - "Database Layer"
Cohesion: 0.19
Nodes (12): DB, getDB(), initDB(), contentRoutes, goalsRoutes, scheduledRoutes, r2Routes, serveRoutes (+4 more)

### Community 6 - "SEO Components"
Cohesion: 0.13
Nodes (8): AuditResult, SeoAuditTabProps, SeoContent, SeoContentTabProps, api(), ContentAsset, formatDate(), TYPE_ICONS

### Community 7 - "API Client & Dashboard"
Cohesion: 0.19
Nodes (8): DashboardData, getAgentDefaultIcon(), ScheduledTask, Task, timeAgo(), VaultNote, ViewName, StatCardProps

### Community 8 - "Helpers & Constants"
Cohesion: 0.17
Nodes (15): AUDIO_EXTS, DIR_MAP, _envCache, FileEntry, getApiKey(), getCloudflareAccountId(), getCloudflareApiToken(), getGeminiKey() (+7 more)

### Community 9 - "UI Form Components"
Cohesion: 0.14
Nodes (12): FormControl, FormDescription, FormField(), FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue (+4 more)

### Community 10 - "SEO Schemas & Types"
Cohesion: 0.21
Nodes (13): AuditUrlInput, auditUrlSchema, ContentGenInput, contentGenSchema, KeywordInput, keywordSchema, RankCheckInput, rankCheckSchema (+5 more)

### Community 11 - "WebSocket Connection"
Cohesion: 0.15
Nodes (9): connect(), getWsUrl(), listeners, LiveAgent, LiveDashboardStats, subscribe(), wsApi, WsListener (+1 more)

### Community 12 - "Server Package Config"
Cohesion: 0.14
Nodes (13): dependencies, elysia, description, devDependencies, bun-types, name, scripts, db:push (+5 more)

### Community 13 - "Path Aliases & Utils"
Cohesion: 0.15
Nodes (12): aliases, components, utils, rsc, $schema, style, tailwind, baseColor (+4 more)

### Community 14 - "UI Primitives"
Cohesion: 0.21
Nodes (9): cn(), DialogContent, DialogHeader(), DialogOverlay, DialogTitle, Input, SelectContent, SelectItem (+1 more)

### Community 15 - "WebSocket Helpers"
Cohesion: 0.23
Nodes (9): safeJson(), broadcast(), clients, handleWsUpgrade(), notifyAgentChange(), notifyTaskChange(), prevStatuses, runPollCycle() (+1 more)

### Community 16 - "Layout & Navigation"
Cohesion: 0.20
Nodes (6): CommandItem, COMMANDS, NAV_ITEMS, SheetContent, Toaster(), ToasterProps

### Community 17 - "Agents Module"
Cohesion: 0.22
Nodes (6): Props, Agent, AgentLog, AgentPayload, AgentPingResult, formatTime()

### Community 18 - "Studio & Image Generation"
Cohesion: 0.20
Nodes (8): ASPECT_RATIOS, AssetItem, DEFAULT_VOICES, HistoryItem, ImageModel, SPEED_ICONS, StudioTab, TABS

### Community 19 - "File Utilities"
Cohesion: 0.33
Nodes (8): formatSize(), getFileType(), getMime(), listFiles(), listRecentAssets(), SUBDIRS, WORKSPACE_DIR, workspaceRoutes

### Community 20 - "Agent Monitoring"
Cohesion: 0.28
Nodes (7): AgentRow, computeAgentStatus(), detectProcessRunning(), logActivity(), agentRoutes, LogRow, dashboardRoutes

### Community 21 - "Card Components"
Cohesion: 0.29
Nodes (6): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle

### Community 22 - "Workspace View"
Cohesion: 0.29
Nodes (5): formatSize(), WorkspaceFile, FILE_ICONS, FILTERS, FilterType

### Community 23 - "Agent Status"
Cohesion: 0.29
Nodes (5): agents, now, pidResult, pidStr, row

### Community 24 - "Issue Categorization"
Cohesion: 0.29
Nodes (5): timeAgoStr(), fiveMinAgo, now, threeDaysAgo, twoHoursAgo

### Community 26 - "Button & SEO Report"
Cohesion: 0.40
Nodes (3): Button, ButtonProps, buttonVariants

### Community 27 - "Sheet Component"
Cohesion: 0.33
Nodes (5): SheetContentProps, SheetHeader(), SheetOverlay, SheetTitle, sheetVariants

### Community 28 - "Daily Goals"
Cohesion: 0.40
Nodes (3): DailyGoal, today(), MOODS

### Community 29 - "Environment & Config"
Cohesion: 0.40
Nodes (3): content, envPath, match

## Knowledge Gaps
- **209 isolated node(s):** `envPath`, `content`, `match`, `$schema`, `style` (+204 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `SEO Components` to `API Client & Dashboard`, `SEO Schemas & Types`, `Agents Module`, `Studio & Image Generation`, `Workspace View`, `Button & SEO Report`, `Daily Goals`, `SEO Keywords`, `SEO Rankings`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `cn()` connect `UI Primitives` to `UI Form Components`, `Button & SEO Report`, `Sheet Component`, `Card Components`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `DB` connect `Database Layer` to `R2 Cloud Storage`, `Helpers & Constants`, `WebSocket Helpers`, `Agent Monitoring`, `Agent Status`, `SEO Crawler`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `envPath`, `content`, `match` to the rest of the system?**
  _209 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `State Management & API` be split into smaller, more focused modules?**
  _Cohesion score 0.0697980684811238 - nodes in this community are weakly interconnected._
- **Should `R2 Cloud Storage` be split into smaller, more focused modules?**
  _Cohesion score 0.08416389811738649 - nodes in this community are weakly interconnected._
- **Should `Client Config & Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._