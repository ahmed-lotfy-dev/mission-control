import { readFileSync } from "node:fs";
import { join, extname } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";

// ── JSON safe parse ──

export function safeJson(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}

// ── MIME type mapping ──

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
  ".aac": "audio/aac",
  ".m4a": "audio/mp4",
  ".md": "text/markdown",
  ".txt": "text/plain",
  ".json": "application/json",
  ".yaml": "application/x-yaml",
  ".yml": "application/x-yaml",
  ".xml": "application/xml",
  ".csv": "text/csv",
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".ts": "application/x-typescript",
  ".pdf": "application/pdf",
};

export function getMime(ext: string): string {
  return MIME_MAP[ext.toLowerCase()] ?? "application/octet-stream";
}

// ── File type detection ──

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp"]);
const VIDEO_EXTS = new Set([".mp4", ".webm", ".mov", ".avi", ".mkv"]);
const AUDIO_EXTS = new Set([".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a"]);

export function getFileType(ext: string): string {
  const e = ext.toLowerCase();
  if (IMAGE_EXTS.has(e)) return "image";
  if (VIDEO_EXTS.has(e)) return "video";
  if (AUDIO_EXTS.has(e)) return "audio";
  return "document";
}

// ── Size formatting ──

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Time formatting ──

export function timeAgoStr(iso: string): string {
  if (!iso) return "never";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ── API Key reading (with .env fallback) ──

let _envLoaded = false;
let _envCache: Record<string, string> = {};

function loadEnv(): Record<string, string> {
  if (_envLoaded) return _envCache;
  
  // Try project .env first, then ~/.hermes/.env
  const paths = [
    join(process.cwd(), ".env"),
    join(homedir(), ".hermes", ".env"),
  ];

  for (const envPath of paths) {
    try {
      const content = readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        // Strip quotes if present
        const clean = value.replace(/^["']|["']$/g, "");
        _envCache[key] = clean;
        // Also set process.env so it's available everywhere
        process.env[key] = process.env[key] || clean;
      }
    } catch {
      // skip if file doesn't exist
    }
  }

  _envLoaded = true;
  return _envCache;
}

export function getApiKey(keyName: string): string | null {
  // Check process.env first (for runtime-set values or Docker env)
  if (process.env[keyName]) return process.env[keyName];
  // Fall back to .env files
  const env = loadEnv();
  return env[keyName] ?? null;
}

export function getNvidiaKey(): string | null {
  return getApiKey("NVIDIA_API_KEY");
}

export function getOpenRouterKey(): string | null {
  return getApiKey("OPENROUTER_API_KEY");
}

export function getGeminiKey(): string | null {
  return getApiKey("GEMINI_API_TOKEN");
}

export function getCloudflareAccountId(): string | null {
  return getApiKey("CLOUDFLARE_ACCOUNT_ID");
}

export function getCloudflareApiToken(): string | null {
  return getApiKey("CLOUDFLARE_API_TOKEN");
}

// ── Agent process detection ──

const PROCESS_MAP: Record<string, { pattern: string; detect: "pid" | "proc" | "pgrep" }> = {
  Hermes: { pattern: "hermes", detect: "pgrep" },
  Antigravity: { pattern: "antigravity", detect: "pgrep" },
  Antigravity2: { pattern: "antigravity", detect: "pgrep" },
  "Claude Code": { pattern: "claude", detect: "pgrep" },
  Codex: { pattern: "codex", detect: "pgrep" },
};

export function detectProcessRunning(
  name: string
): { running: boolean; pid: number | null } {
  const cfg = PROCESS_MAP[name];
  if (!cfg) return { running: false, pid: null };
  try {
    const result = Bun.spawnSync(["pgrep", "-f", "-n", cfg.pattern], {});
    if (result.exitCode === 0) {
      const pid = parseInt(result.stdout.toString().trim(), 10);
      return { running: !isNaN(pid), pid: isNaN(pid) ? null : pid };
    }
  } catch {}
  return { running: false, pid: null };
}

export type AgentRow = {
  id: number;
  name: string;
  model: string;
  version: string;
  icon: string;
  status: string;
  last_active: string;
  pid: number | null;
  endpoint: string;
  metadata: string;
  created_at: string;
};

export function computeAgentStatus(
  agent: AgentRow
): { status: string; pid: number | null } {
  // 1) Check if a matching process is running
  const proc = detectProcessRunning(agent.name);
  if (proc.running) return { status: "working", pid: proc.pid };

  // 2) Check if it was active in the last 5 minutes
  if (agent.last_active) {
    const ago = Date.now() - new Date(agent.last_active).getTime();
    if (ago < 300_000) return { status: "online", pid: null };
  }

  // 3) Check stored PID
  if (agent.pid) {
    try {
      const result = Bun.spawnSync(["kill", "-0", String(agent.pid)], {});
      if (result.exitCode === 0) return { status: "working", pid: agent.pid };
    } catch {}
  }

  return { status: "offline", pid: null };
}

// ── Logging ──

import { db } from "../db";

export function logActivity(
  agentId: number,
  event: string,
  message: string,
  level = "info"
) {
  const now = new Date().toISOString();
  db.run(
    "INSERT INTO agent_logs (agent_id, event, message, level, created_at) VALUES (?, ?, ?, ?, ?)",
    [agentId, event, message, level, now]
  );
  db.run(
    "UPDATE agent_snapshots SET last_active = ?, status = ? WHERE id = ?",
    [now, level === "error" ? "error" : "working", agentId]
  );
}

// ── File listing helper ──

import { readdir, stat } from "node:fs/promises";

export interface FileEntry {
  name: string;
  path: string;
  relativePath: string;
  subdir: string;
  type: string;
  mime: string;
  size: number;
  sizeFormatted: string;
  createdAt: string;
  modifiedAt: string;
}

export async function listFiles(
  workspaceDir: string,
  subdirs: string[],
  filter?: string,
  limit = 200
): Promise<FileEntry[]> {
  const allFiles: FileEntry[] = [];

  for (const subdir of subdirs) {
    const dirPath = join(workspaceDir, subdir);
    try {
      const entries = await readdir(dirPath);
      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        const stats = await stat(fullPath);
        if (!stats.isFile()) continue;
        const ext = extname(entry);
        const fileType = getFileType(ext);
        if (filter && filter !== "all" && fileType !== filter) continue;

        allFiles.push({
          name: entry,
          path: fullPath,
          relativePath: `${subdir}/${entry}`,
          subdir,
          type: fileType,
          mime: getMime(ext),
          size: stats.size,
          sizeFormatted: formatSize(stats.size),
          createdAt: stats.birthtime?.toISOString() ?? stats.mtime.toISOString(),
          modifiedAt: stats.mtime.toISOString(),
        });
      }
    } catch {
      // directory doesn't exist — skip silently
    }
  }

  allFiles.sort(
    (a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
  );

  if (limit > 0 && allFiles.length > limit) {
    return allFiles.slice(0, limit);
  }

  return allFiles;
}

// ── Studio asset listing (simplified, with type grouping) ──

const DIR_MAP: Record<string, string> = {
  audio: "audio",
  image: "images",
  video: "videos",
};

export async function listRecentAssets(
  type: string,
  outputDir: string,
  limit = 30
): Promise<
  Array<{
    name: string;
    path: string;
    type: string;
    sizeFormatted: string;
    createdAt: string;
    mime: string;
  }>
> {
  const subdir = DIR_MAP[type] || type;
  const dirPath = join(outputDir, subdir);
  const results: Array<{
    name: string;
    path: string;
    type: string;
    sizeFormatted: string;
    createdAt: string;
    mime: string;
  }> = [];

  try {
    const entries = await readdir(dirPath);
    for (const entry of entries.slice().reverse().slice(0, limit)) {
      const fullPath = join(dirPath, entry);
      const stats = await stat(fullPath);
      if (!stats.isFile()) continue;
      const ext = extname(entry).toLowerCase();
      results.push({
        name: entry,
        path: fullPath,
        type: subdir,
        sizeFormatted: formatSize(stats.size),
        createdAt: stats.birthtime?.toISOString() ?? stats.mtime.toISOString(),
        mime: getMime(ext),
      });
    }
  } catch {}

  return results.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}