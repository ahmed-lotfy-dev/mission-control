import { Elysia, t } from "elysia";
import { db } from "../db";
import { spawn } from "child_process";

type AgentRow = {
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

type LogRow = {
  id: number;
  agent_id: number;
  event: string;
  message: string;
  level: string;
  created_at: string;
};

// ── Process-based status detection ──

const PROCESS_MAP: Record<string, { pattern: string; detect: "pid" | "proc" | "pgrep" }> = {
  "Hermes":        { pattern: "hermes",        detect: "pgrep" },
  "Antigravity":   { pattern: "antigravity",   detect: "pgrep" },
  "Codex":         { pattern: "codex",         detect: "pgrep" },
};

function detectProcessRunning(name: string): { running: boolean; pid: number | null } {
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

function computeAgentStatus(agent: AgentRow): { status: string; pid: number | null } {
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

function logActivity(agentId: number, event: string, message: string, level = "info") {
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

export const agentRoutes = new Elysia({ prefix: "/api/agents" })
  // List all agents with live status
  .get("/", () => {
    const rows = db.query("SELECT * FROM agent_snapshots ORDER BY id ASC").all() as AgentRow[];
    return rows.map(row => {
      const { status, pid } = computeAgentStatus(row);
      return {
        ...row,
        metadata: safeJson(row.metadata),
        status,
        pid,
      };
    });
  })

  // Get single agent + recent activity logs
  .get("/:id", ({ params }) => {
    const agent = db.query("SELECT * FROM agent_snapshots WHERE id = ?").get(Number(params.id)) as AgentRow | null;
    if (!agent) return { error: "Agent not found" };
    const { status, pid } = computeAgentStatus(agent);
    const logs = db.query(
      "SELECT * FROM agent_logs WHERE agent_id = ? ORDER BY created_at DESC LIMIT 50"
    ).all(Number(params.id)) as LogRow[];
    return {
      ...agent,
      metadata: safeJson(agent.metadata),
      status,
      pid,
      logs,
    };
  }, {
    params: t.Object({ id: t.String() }),
  })

  // Register new agent
  .post("/", ({ body }) => {
    const now = new Date().toISOString();
    const existing = db.query("SELECT id FROM agent_snapshots WHERE name = ?").get(body.name) as { id: number } | null;
    if (existing) {
      // Update existing instead
      db.run(
        "UPDATE agent_snapshots SET model = ?, version = ?, icon = ?, status = ?, endpoint = ?, metadata = ?, last_active = ? WHERE id = ?",
        [body.model ?? "", body.version ?? "", body.icon ?? "", body.status ?? "idle", body.endpoint ?? "", JSON.stringify(body.metadata ?? {}), now, existing.id]
      );
      logActivity(existing.id, "registered", `Agent ${body.name} re-registered`);
      return { id: existing.id, ...body };
    }

    db.run(
      "INSERT INTO agent_snapshots (name, model, version, icon, status, last_active, endpoint, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [body.name, body.model ?? "", body.version ?? "", body.icon ?? "", body.status ?? "idle", now, body.endpoint ?? "", JSON.stringify(body.metadata ?? {}), now]
    );
    const row = db.query("SELECT last_insert_rowid() as id").get() as { id: number };
    logActivity(row.id, "registered", `Agent ${body.name} registered`);
    return { id: row.id, ...body };
  }, {
    body: t.Object({
      name: t.String(),
      model: t.Optional(t.String()),
      version: t.Optional(t.String()),
      icon: t.Optional(t.String()),
      status: t.Optional(t.String()),
      endpoint: t.Optional(t.String()),
      metadata: t.Optional(t.Record(t.String(), t.Any())),
    }),
  })

  // Update agent
  .patch("/:id", ({ params, body }) => {
    const now = new Date().toISOString();
    const sets: string[] = [];
    const vals: (string | number)[] = [];
    if (body.name !== undefined) { sets.push("name = ?"); vals.push(body.name); }
    if (body.model !== undefined) { sets.push("model = ?"); vals.push(body.model); }
    if (body.version !== undefined) { sets.push("version = ?"); vals.push(body.version); }
    if (body.icon !== undefined) { sets.push("icon = ?"); vals.push(body.icon); }
    if (body.status !== undefined) { sets.push("status = ?"); vals.push(body.status); }
    if (body.endpoint !== undefined) { sets.push("endpoint = ?"); vals.push(body.endpoint); }
    if (body.pid !== undefined) { sets.push("pid = ?"); vals.push(body.pid); }
    if (body.metadata !== undefined) { sets.push("metadata = ?"); vals.push(JSON.stringify(body.metadata)); }
    sets.push("last_active = ?");
    vals.push(now, Number(params.id));
    db.run(`UPDATE agent_snapshots SET ${sets.join(", ")} WHERE id = ?`, vals);
    logActivity(Number(params.id), "updated", `Agent configuration updated`);
    return { id: Number(params.id), lastActive: now };
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      name: t.Optional(t.String()),
      model: t.Optional(t.String()),
      version: t.Optional(t.String()),
      icon: t.Optional(t.String()),
      status: t.Optional(t.String()),
      endpoint: t.Optional(t.String()),
      pid: t.Optional(t.Number()),
      metadata: t.Optional(t.Record(t.String(), t.Any())),
    }),
  })

  // Delete agent
  .delete("/:id", ({ params }) => {
    db.run("DELETE FROM agent_snapshots WHERE id = ?", [Number(params.id)]);
    return { deleted: true };
  }, {
    params: t.Object({ id: t.String() }),
  })

  // Ping agent — check if responsive
  .post("/:id/ping", async ({ params }) => {
    const agent = db.query("SELECT * FROM agent_snapshots WHERE id = ?").get(Number(params.id)) as AgentRow | null;
    if (!agent) return { error: "Agent not found" };

    const now = new Date().toISOString();
    let responsive = false;
    let responseTime = 0;
    let details: string[] = [];

    // Strategy 1: Process check via pgrep
    const proc = detectProcessRunning(agent.name);
    if (proc.running) {
      responsive = true;
      details.push(`process running (PID ${proc.pid})`);
    }

    // Strategy 2: HTTP endpoint check if configured
    if (agent.endpoint) {
      try {
        const start = performance.now();
        const resp = await fetch(agent.endpoint, { signal: AbortSignal.timeout(5000) });
        responseTime = Math.round(performance.now() - start);
        if (resp.ok || resp.status < 500) {
          responsive = true;
          details.push(`HTTP ${resp.status} in ${responseTime}ms`);
        } else {
          details.push(`HTTP ${resp.status}`);
        }
      } catch (e: any) {
        details.push(`HTTP error: ${e.message || e}`);
      }
    }

    // Strategy 3: Stored PID check
    if (!responsive && agent.pid) {
      try {
        const result = Bun.spawnSync(["kill", "-0", String(agent.pid)], {});
        if (result.exitCode === 0) {
          responsive = true;
          details.push(`PID ${agent.pid} still alive`);
        }
      } catch {}
    }

    // Update status
    const newStatus = responsive ? "online" : "offline";
    db.run(
      "UPDATE agent_snapshots SET status = ?, last_active = ?, pid = ? WHERE id = ?",
      [newStatus, now, proc.pid || agent.pid, Number(params.id)]
    );

    logActivity(
      Number(params.id),
      responsive ? "ping_ok" : "ping_fail",
      responsive
        ? `Ping OK — ${details.join(", ")}`
        : `Ping failed — no process/endpoint responded`,
      responsive ? "info" : "error"
    );

    return {
      agent: agent.name,
      responsive,
      status: newStatus,
      responseTimeMs: responseTime,
      details: details.join("; ") || "No detection method available",
      pid: proc.pid,
      timestamp: now,
    };
  }, {
    params: t.Object({ id: t.String() }),
  })

  // Log activity
  .post("/:id/log", ({ params, body }) => {
    logActivity(Number(params.id), body.event, body.message, body.level ?? "info");
    return { logged: true };
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      event: t.String(),
      message: t.String(),
      level: t.Optional(t.String()),
    }),
  })

  // Get recent logs
  .get("/:id/logs", ({ params }) => {
    const logs = db.query(
      "SELECT * FROM agent_logs WHERE agent_id = ? ORDER BY created_at DESC LIMIT 100"
    ).all(Number(params.id)) as LogRow[];
    return logs;
  }, {
    params: t.Object({ id: t.String() }),
  })

  // Clear logs
  .delete("/:id/logs", ({ params }) => {
    db.run("DELETE FROM agent_logs WHERE agent_id = ?", [Number(params.id)]);
    return { cleared: true };
  }, {
    params: t.Object({ id: t.String() }),
  });

// ── Helpers ──

function safeJson(str: string): any {
  try { return JSON.parse(str); } catch { return {}; }
}