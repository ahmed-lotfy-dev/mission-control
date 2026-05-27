import { computeAgentStatus, safeJson, type AgentRow } from "../lib/helpers";
import { db } from "../db";

// ── WebSocket Hub using Bun's native API ──
// Bun.serve() provides first-class WebSocket support without plugins

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

  // ── Agent status updates ──
  const agents = db.query("SELECT * FROM agent_snapshots ORDER BY id ASC").all() as AgentRow[];
  const enhanced = agents.map((a) => {
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

  // ── Dashboard stats ──
  const today = new Date().toISOString().split("T")[0];
  const allTasks = db.query("SELECT * FROM tasks").all() as any[];
  broadcast("dashboard_stats", {
    total: allTasks.length,
    backlog: allTasks.filter((t) => t.status === "backlog").length,
    todo: allTasks.filter((t) => t.status === "todo").length,
    inProgress: allTasks.filter((t) => t.status === "in_progress").length,
    done: allTasks.filter((t) => t.status === "done").length,
  });

  const todayGoals = db.query("SELECT * FROM daily_goals WHERE date = ?").get(today) as any;
  if (todayGoals) {
    broadcast("goals_update", { ...todayGoals, goals: safeJson(todayGoals.goals) });
  }
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

// ── Notify task changes ──

export function notifyTaskChange(action: string, task: any) {
  broadcast("task_update", { action, task });
}

export function notifyAgentChange(agentId: number, action: string) {
  const agent = db.query("SELECT * FROM agent_snapshots WHERE id = ?").get(agentId) as AgentRow | null;
  if (agent) {
    broadcast("agent_update", { action, agent });
  }
}

// ── WS endpoint handler called from index.ts ──

export function handleWsUpgrade(req: Request): Response | null {
  const url = new URL(req.url);
  if (url.pathname !== "/ws") return null;

  // Check if the client is asking to upgrade
  const upgrade = req.headers.get("upgrade")?.toLowerCase();
  if (upgrade !== "websocket") return null;

  // Use Bun's upgrade API
  const success = Bun.upgradeWebSocket(req, {
    data: { id: crypto.randomUUID() },
    open(ws) {
      const id = (ws.data as any).id;
      clients.set(id, { socket: ws as any, id });

      // Send initial state
      const agents = db.query("SELECT * FROM agent_snapshots ORDER BY id ASC").all() as AgentRow[];
      const enhanced = agents.map((a) => ({
        ...a,
        icon: a.icon || "",
        metadata: safeJson(a.metadata),
        ...computeAgentStatus(a),
      }));
      ws.send(JSON.stringify({ event: "initial_state", agents: enhanced, timestamp: new Date().toISOString() }));

      startPolling();
    },
    message(ws, data) {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "resync") {
          const agents = db.query("SELECT * FROM agent_snapshots ORDER BY id ASC").all() as AgentRow[];
          ws.send(JSON.stringify({ event: "agents_update", agents, timestamp: new Date().toISOString() }));
        }
      } catch {}
    },
    close(ws) {
      const id = (ws.data as any).id;
      clients.delete(id);
      if (clients.size === 0) stopPolling();
    },
  });

  return success;
}