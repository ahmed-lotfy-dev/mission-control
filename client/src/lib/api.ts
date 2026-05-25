const BASE = "/api";

export async function api<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function today(): string {
  return new Date().toISOString().split("T")[0];
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function timeAgo(iso: string): string {
  if (!iso) return "never";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


export function formatTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function getAgentDefaultIcon(name: string): string {
  const map: Record<string, string> = {
    "Hermes": "🦊",
    "Antigravity": "🚀",
    "Antigravity 2": "🌟",
    "Claude Code": "💻",
    "Codex": "📝",
  };
  return map[name] || "🤖";
}

// Types
export interface Task {
  id: number;
  title: string;
  description: string;
  status: "backlog" | "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  project: string;
  tags: string;
  due_date: string;
  created_at: string;
  updated_at: string;
}

export interface DailyGoal {
  date: string;
  goals: Array<{ text: string; done: boolean }>;
  journal: string;
  mood: string;
}

export interface Agent {
  id: number;
  name: string;
  model: string;
  version: string;
  icon?: string;
  status: "online" | "working" | "idle" | "offline" | "error";
  last_active: string;
  pid?: number | null;
  endpoint?: string;
  metadata: string;
  logs?: AgentLog[];
  created_at: string;
}

export interface AgentLog {
  id: number;
  agent_id: number;
  event: string;
  level: string;
  message: string;
  created_at: string;
}

export interface AgentPingResult {
  agent: string;
  responsive: boolean;
  status: string;
  responseTimeMs?: number;
  details?: string;
  pid?: number | null;
  timestamp: string;
}

export interface AgentPayload {
  name: string;
  model?: string;
  version?: string;
  icon?: string;
  status?: string;
  endpoint?: string;
  metadata?: Record<string, string>;
}

export interface ScheduledTask {
  id: number;
  name: string;
  description: string;
  schedule: string;
  type: string;
  payload: string;
  enabled: boolean | number;
  last_run: string;
  last_status: string;
  created_at: string;
  updated_at: string;
}

export interface ContentAsset {
  id: number;
  type: string;
  title: string;
  prompt: string;
  file_path: string;
  status: string;
  metadata: string;
  created_at: string;
}

export interface VaultNote {
  id: number;
  path: string;
  title: string;
  folder: string;
  tags: string;
  last_modified: string;
  indexed_at: string;
}

export interface WorkspaceFile {
  name: string;
  path: string;
  relativePath: string;
  subdir: string;
  type: "image" | "video" | "audio" | "document";
  mime: string;
  size: number;
  sizeFormatted: string;
  createdAt: string;
  modifiedAt: string;
}

export interface DashboardData {
  date: string;
  tasks: { total: number; backlog: number; todo: number; inProgress: number; done: number };
  goals: DailyGoal;
  agents: Agent[];
  scheduled: { total: number; enabled: number };
  recentContent: ContentAsset[];
  vault: { total: number };
}

export type ViewName = "dashboard" | "kanban" | "agents" | "vault" | "daily" | "scheduled" | "workspace" | "studio" | "seo";