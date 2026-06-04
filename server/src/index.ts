import { Elysia } from "elysia";
import { existsSync } from "fs";
import { tasksRoutes } from "./routes/tasks";
import { goalsRoutes } from "./routes/goals";
import { scheduledRoutes } from "./routes/scheduled";
import { agentRoutes } from "./routes/agents";
import { contentRoutes as studioContentRoutes } from "./routes/content";
import { vaultRoutes } from "./routes/vault";
import { dashboardRoutes } from "./routes/dashboard";
import { workspaceRoutes } from "./routes/workspace";
import { studioRoutes, serveRoutes, contentRoutes } from "./routes/studio";
import { seoRoutes } from "./routes/seo";
import { seoAuditRoutes } from "./routes/seo-audit";
import { broadcast, addClient, removeClient } from "./routes/ws";
import { computeAgentStatus, safeJson } from "./lib/helpers";
import { dbQuery } from "./db";
import type { AgentRow } from "./lib/helpers";

const distBase = (() => {
  const rel = ["client/dist", "../client/dist", "../../client/dist"];
  for (const p of rel) {
    if (existsSync(p)) return p;
  }
  return "../client/dist";
})();

let pollTimer: ReturnType<typeof setInterval> | null = null;

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    try {
      const agents = dbQuery("SELECT * FROM agent_snapshots ORDER BY id ASC");
      const enhanced = (agents as AgentRow[]).map((a) => ({
        ...a, icon: a.icon || "", metadata: safeJson(a.metadata), ...computeAgentStatus(a),
      }));
      broadcast("agents_update", enhanced);
    } catch {}
    try {
      const allTasks = dbQuery("SELECT * FROM tasks") as any[];
      broadcast("dashboard_stats", {
        total: allTasks.length,
        backlog: allTasks.filter((t: any) => t.status === "backlog").length,
        todo: allTasks.filter((t: any) => t.status === "todo").length,
        inProgress: allTasks.filter((t: any) => t.status === "in_progress").length,
        done: allTasks.filter((t: any) => t.status === "done").length,
      });
    } catch {}
  }, 10_000);
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

function getEnhancedAgents() {
  const agents = dbQuery("SELECT * FROM agent_snapshots ORDER BY id ASC");
  return (agents as AgentRow[]).map((a) => ({
    ...a, icon: a.icon || "", metadata: safeJson(a.metadata), ...computeAgentStatus(a),
  }));
}

const app = new Elysia()
  .onError(({ code, error, set }) => {
    const msg = (error as any)?.message || error?.toString() || "Unknown error";
    console.error(`[server] Unhandled error (${code}):`, msg);
    set.status = 500;
    return { error: "Internal server error", detail: msg };
  })
  .onRequest(({ request }) => {
    const origin = request.headers.get("origin") ?? "";
    if (origin) {
      request.headers.set("access-control-allow-origin", origin);
      request.headers.set("access-control-allow-methods", "GET,POST,PATCH,DELETE,OPTIONS");
      request.headers.set("access-control-allow-headers", "Content-Type");
    }
  })
  .use(tasksRoutes)
  .use(goalsRoutes)
  .use(scheduledRoutes)
  .use(agentRoutes)
  .use(studioContentRoutes)
  .use(vaultRoutes)
  .use(dashboardRoutes)
  .use(workspaceRoutes)
  .use(studioRoutes)
  .use(serveRoutes)
  .use(contentRoutes)
  .use(seoRoutes)
  .use(seoAuditRoutes)
  .ws("/ws", {
    open(ws) {
      const id = crypto.randomUUID();
      addClient(id, ws as any);
      (ws as any).data = { id };
      startPolling();
      const enhanced = getEnhancedAgents();
      ws.send(JSON.stringify({ event: "initial_state", agents: enhanced, timestamp: new Date().toISOString() }));
    },
    message(ws, data) {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "resync") {
          const enhanced = getEnhancedAgents();
          ws.send(JSON.stringify({ event: "agents_update", agents: enhanced, timestamp: new Date().toISOString() }));
        }
      } catch {}
    },
    close(ws) {
      const id = (ws as any).data?.id;
      if (id) removeClient(id);
      stopPolling();
    },
  })
  .get("/assets/*", ({ path }) => Bun.file(`${distBase}/${path}`))
  .get("/static/*", ({ path }) => Bun.file(`${distBase}/${path}`))
  .get("/*", () => Bun.file(`${distBase}/index.html`))
  .listen(8000);

console.log(`🚀 Mission Control running at http://localhost:8000`);
