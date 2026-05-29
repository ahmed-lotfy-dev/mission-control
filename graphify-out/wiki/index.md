# Mission Control — Architecture Wiki

## Overview
Mission Control is a full-stack dashboard built with **Bun + Elysia** (server) and **React + Tailwind v4** (client). It includes task management, Kanban, AI agents, content studio with multi-provider image generation, SEO tools, and an Obsidian vault sync.

## Interactive Graph
Open [graphify.html](graphify.html) in your browser for the interactive knowledge graph.

## Core Architecture

### God Nodes (Most Connected)
1. **`api()`** — 36 edges — Central HTTP client; every view calls it
2. **`navigate()`** — 25 edges — Router navigation from Sidebar/Sheet
3. **`DB`** — 13 edges — SQLite database instance (bun:sqlite)
4. **`cn()`** — 11 edges — Class name utility (clsx/tailwind-merge)

### Communities (Key Modules)

| Community | Nodes | Description |
|-----------|-------|-------------|
| State Management & API | 61 | React state, API calls, asset CRUD |
| R2 Cloud Storage | 43 | Cloudflare S3-compatible backup |
| Client Entry & Routing | 35 | main.tsx, router.tsx, ErrorBoundary |
| Database Layer | 19 | SQLite init, auto-migrate, path config |
| Studio & Image Generation | 19 | Multi-provider image gen dispatch |
| WebSocket Connection | 15 | Real-time agent status, broadcast |
| SEO Components | 18 | Audit, keywords, rankings, content |
| UI Primitives | 13 | Button, dialog, input, select, sheet |

### Data Flow
```
User Action → View (React) → api() → Elysia Route → DB / External API
                ↓                              ↓
           navigate()                   WebSocket broadcast
```

### Image Generation Pipeline
```
Studio.tsx → /api/studio/image → Provider dispatch (OpenRouter/Cloudflare/Nvidia/ImageMagick)
                ↓
           Save to ~/agent-outputs/images/
                ↓
           Backup to R2 (if configured)
```

### Key Files
- `server/src/index.ts` — App entry, wires all routes
- `server/src/routes/studio.ts` — Image gen, TTS, R2 upload
- `server/src/lib/r2.ts` — R2 S3 client
- `client/src/router.tsx` — Route definitions
- `client/src/Layout.tsx` — Sidebar navigation
- `client/src/lib/api.ts` — HTTP client wrapper
- `docker-compose.yml` — 3-stage build, R2 volumes

### Surprising Connections
- `SheetHeader()` calls `cn()` — UI sheet uses same class utility as dialog
- SEO's `qk()` calls the central `api()` — SEO tab is fully integrated with the API layer
- WebSocket `runPollCycle()` depends on both `computeAgentStatus()` and `safeJson()` from helpers

## API Routes
| Prefix | File | Purpose |
|--------|------|---------|
| `/api/tasks` | tasks.ts | CRUD, daily journal |
| `/api/kanban` | (tasks.ts) | Kanban columns |
| `/api/agents` | agents.ts | Agent lifecycle |
| `/api/studio` | studio.ts | Image/TTS generation |
| `/api/seo` | seo.ts | SEO audit, keywords |
| `/api/r2` | studio.ts | R2 file proxy |
| `/api/serve` | studio.ts | Static file serving |
| `/api/workspace` | workspace.ts | File browser |

## Environment Variables
| Var | Required For |
|-----|-------------|
| `OPENROUTER_API_KEY` | AI image generation |
| `CLOUDFLARE_API_TOKEN` | Cloudflare AI + R2 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare AI + R2 |
| `NVIDIA_API_KEY` | Nvidia NIM models |
| `GEMINI_API_TOKEN` | Google AI Studio |
| `R2_ACCESS_KEY_ID` | R2 backup |
| `R2_SECRET_ACCESS_KEY` | R2 backup |
| `R2_BUCKET_NAME` | R2 backup |
