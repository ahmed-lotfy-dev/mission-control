import { computeAgentStatus, safeJson, type AgentRow } from "../lib/helpers";
import { dbQuery, dbGet } from "../db";

// ── WebSocket Hub ──

interface WsClient {
  socket: WebSocket;
  id: string;
}

const clients = new Map<string, WsClient>();

export function broadcast(event: string, payload: any) {
  const msg = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
  for (const [, client] of clients) {
    try {
      client.socket.send(msg);
    } catch {
      clients.delete(client.id);
    }
  }
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let prevStatuses: Record<number, string> = {};

function runPollCycle() {
  if (clients.size === 0) return;

  dbQuery("SELECT * FROM agent_snapshots ORDER BY id ASC").then(agents => {
    const enhanced = (agents as AgentRow[]).map((a) => {
      const { status, pid } = computeAgentStatus(a);
      const prev = prevStatuses[a.id];
      const changed = prev !== undefined && prev !== status;

      if (changed) {
        if (prev === "working" && (status === "offline" || status === "idle")) {
          broadcast("agent_offline", {
            agentId: a.id, name: a.name, icon: a.icon || "🤖",
            prevStatus: prev, status,
          });
        }
        if (status === "working" && prev !== "working") {
          broadcast("agent_online", {
            agentId: a.id, name: a.name, icon: a.icon || "🤖",
            prevStatus: prev, status,
          });
        }
      }
      prevStatuses[a.id] = status;

      return { ...a, icon: a.icon || "", metadata: safeJson(a.metadata), status, pid, updated: changed };
    });
    broadcast("agents_update", enhanced);
  });

  dbQuery("SELECT * FROM tasks").then(allTasks => {
    broadcast("dashboard_stats", {
      total: allTasks.length,
      backlog: (allTasks as any[]).filter((t: any) => t.status === "backlog").length,
      todo: (allTasks as any[]).filter((t: any) => t.status === "todo").length,
      inProgress: (allTasks as any[]).filter((t: any) => t.status === "in_progress").length,
      done: (allTasks as any[]).filter((t: any) => t.status === "done").length,
    });
  });

  const today = new Date().toISOString().split("T")[0];
  dbGet("SELECT * FROM daily_goals WHERE date = $1", [today]).then(todayGoals => {
    if (todayGoals) {
      broadcast("goals_update", { ...todayGoals, goals: safeJson((todayGoals as any).goals) });
    }
  });
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(runPollCycle, 10_000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export function notifyTaskChange(action: string, task: any) {
  broadcast("task_update", { action, task });
}

export function notifyAgentChange(agentId: number, action: string) {
  dbGet("SELECT * FROM agent_snapshots WHERE id = $1", [agentId]).then(agent => {
    if (agent) {
      broadcast("agent_update", { action, agent });
    }
  });
}

// ── Crawl Progress Streaming ──
export function broadcastCrawlProgress(data: {
  sessionId: number;
  domainSlug: string;
  status: "running" | "completed" | "error";
  pagesCrawled: number;
  totalPages: number;
  currentUrl: string;
  score?: number;
  error?: string;
}) {
  broadcast("crawl_progress", data);
}

// ── WebSocket upgrade handler ──
// Returns a Response only if we handle it; returns null to let Elysia handle it
export function handleWsUpgrade(req: Request, server: any): Response | null {
  const url = new URL(req.url);
  if (url.pathname !== "/ws") return null;

  const upgrade = req.headers.get("upgrade")?.toLowerCase();
  if (upgrade !== "websocket") return null;

  // Use Bun's native server.upgrade() — compatible with Bun 1.3.x
  const id = crypto.randomUUID();
  const success = server.upgrade(req, { data: { id } });

  if (!success) {
    return new Response("WebSocket upgrade failed", { status: 426 });
  }

  // Set up event handlers on the socket after successful upgrade
  // Note: In Bun 1.3, server.upgrade() doesn't take callbacks.
  // We need to handle this differently — the socket events are managed
  // by the server's websocket handler configuration.
  return new Response(null, { status: 101 });
}
