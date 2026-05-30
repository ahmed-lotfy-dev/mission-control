import { Elysia, t } from "elysia";
import { dbQuery, dbGet, dbRun, dbInsert } from "../db";
import { spawn } from "child_process";
import { detectProcessRunning, computeAgentStatus, logActivity, safeJson, type AgentRow } from "../lib/helpers";

type LogRow = {
  id: number;
  agent_id: number;
  event: string;
  message: string;
  level: string;
  created_at: string;
};

export const agentRoutes = new Elysia({ prefix: "/api/agents" })
  .get("/", async () => {
    const rows = await dbQuery("SELECT * FROM agent_snapshots ORDER BY id ASC") as AgentRow[];
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
  .get("/:id", async ({ params }) => {
    const agent = await dbGet("SELECT * FROM agent_snapshots WHERE id = $1", [Number(params.id)]) as AgentRow | null;
    if (!agent) return { error: "Agent not found" };
    const { status, pid } = computeAgentStatus(agent);
    const logs = await dbQuery(
      "SELECT * FROM agent_logs WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 50",
      [Number(params.id)]
    ) as LogRow[];
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
  .post("/", async ({ body }) => {
    const now = new Date().toISOString();
    const existing = await dbGet("SELECT id FROM agent_snapshots WHERE name = $1", [body.name]) as { id: number } | null;
    if (existing) {
      await dbRun(
        "UPDATE agent_snapshots SET model = $1, version = $2, icon = $3, status = $4, endpoint = $5, metadata = $6, last_active = $7 WHERE id = $8",
        [body.model ?? "", body.version ?? "", body.icon ?? "", body.status ?? "idle", body.endpoint ?? "", JSON.stringify(body.metadata ?? {}), now, existing.id]
      );
      logActivity(existing.id, "registered", `Agent ${body.name} re-registered`);
      return { id: existing.id, ...body };
    }

    const id = await dbInsert(
      "INSERT INTO agent_snapshots (name, model, version, icon, status, last_active, endpoint, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [body.name, body.model ?? "", body.version ?? "", body.icon ?? "", body.status ?? "idle", now, body.endpoint ?? "", JSON.stringify(body.metadata ?? {}), now]
    );
    logActivity(id, "registered", `Agent ${body.name} registered`);
    return { id, ...body };
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
  .patch("/:id", async ({ params, body }) => {
    const now = new Date().toISOString();
    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (body.name !== undefined) { sets.push(`name = $${i++}`); vals.push(body.name); }
    if (body.model !== undefined) { sets.push(`model = $${i++}`); vals.push(body.model); }
    if (body.version !== undefined) { sets.push(`version = $${i++}`); vals.push(body.version); }
    if (body.icon !== undefined) { sets.push(`icon = $${i++}`); vals.push(body.icon); }
    if (body.status !== undefined) { sets.push(`status = $${i++}`); vals.push(body.status); }
    if (body.endpoint !== undefined) { sets.push(`endpoint = $${i++}`); vals.push(body.endpoint); }
    if (body.pid !== undefined) { sets.push(`pid = $${i++}`); vals.push(body.pid); }
    if (body.metadata !== undefined) { sets.push(`metadata = $${i++}`); vals.push(JSON.stringify(body.metadata)); }
    sets.push(`last_active = $${i++}`);
    vals.push(now, Number(params.id));
    await dbRun(`UPDATE agent_snapshots SET ${sets.join(", ")} WHERE id = $${i}`, vals);
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
  .delete("/:id", async ({ params }) => {
    await dbRun("DELETE FROM agent_snapshots WHERE id = $1", [Number(params.id)]);
    return { deleted: true };
  }, {
    params: t.Object({ id: t.String() }),
  })
  .post("/:id/ping", async ({ params }) => {
    const agent = await dbGet("SELECT * FROM agent_snapshots WHERE id = $1", [Number(params.id)]) as AgentRow | null;
    if (!agent) return { error: "Agent not found" };

    const now = new Date().toISOString();
    let responsive = false;
    let responseTime = 0;
    let details: string[] = [];

    const proc = detectProcessRunning(agent.name);
    if (proc.running) {
      responsive = true;
      details.push(`process running (PID ${proc.pid})`);
    }

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

    if (!responsive && agent.pid) {
      try {
        const result = Bun.spawnSync(["kill", "-0", String(agent.pid)], {});
        if (result.exitCode === 0) {
          responsive = true;
          details.push(`PID ${agent.pid} still alive`);
        }
      } catch {}
    }

    const newStatus = responsive ? "online" : "offline";
    await dbRun(
      "UPDATE agent_snapshots SET status = $1, last_active = $2, pid = $3 WHERE id = $4",
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
  .post("/:id/log", async ({ params, body }) => {
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
  .get("/:id/logs", async ({ params }) => {
    const logs = await dbQuery(
      "SELECT * FROM agent_logs WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 100",
      [Number(params.id)]
    ) as LogRow[];
    return logs;
  }, {
    params: t.Object({ id: t.String() }),
  })
  .delete("/:id/logs", async ({ params }) => {
    await dbRun("DELETE FROM agent_logs WHERE agent_id = $1", [Number(params.id)]);
    return { cleared: true };
  }, {
    params: t.Object({ id: t.String() }),
  });
