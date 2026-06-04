import { dbQuery, dbGet } from "../db";

// ── WebSocket Hub ──

interface WsClient {
  socket: WebSocket;
  id: string;
}

const clients = new Map<string, WsClient>();

export function addClient(id: string, socket: WebSocket) {
  clients.set(id, { socket, id });
}

export function removeClient(id: string) {
  clients.delete(id);
}

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

export function notifyTaskChange(action: string, task: any) {
  broadcast("task_update", { action, task });
}

export function notifyAgentChange(agentId: number, action: string) {
  const agent = dbGet("SELECT * FROM agent_snapshots WHERE id = $1", [agentId]);
  if (agent) broadcast("agent_update", { action, agent });
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
