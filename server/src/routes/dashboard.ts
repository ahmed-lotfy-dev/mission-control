import { Elysia, t } from "elysia";
import { dbQuery, dbGet } from "../db";

export const dashboardRoutes = new Elysia({ prefix: "/api/dashboard" })
  .get("/stats", async () => {
    const total = await dbGet("SELECT COUNT(*) as c FROM tasks") as any;
    const backlog = await dbGet("SELECT COUNT(*) as c FROM tasks WHERE status = 'backlog'") as any;
    const todo = await dbGet("SELECT COUNT(*) as c FROM tasks WHERE status = 'todo'") as any;
    const inProgress = await dbGet("SELECT COUNT(*) as c FROM tasks WHERE status = 'in_progress'") as any;
    const done = await dbGet("SELECT COUNT(*) as c FROM tasks WHERE status = 'done'") as any;
    const assets = await dbGet("SELECT COUNT(*) as c FROM content_assets") as any;
    const agents = await dbGet("SELECT COUNT(*) as c FROM agent_snapshots") as any;
    const notes = await dbGet("SELECT COUNT(*) as c FROM vault_notes") as any;
    return {
      tasks: { total: total?.c ?? 0, backlog: backlog?.c ?? 0, todo: todo?.c ?? 0, inProgress: inProgress?.c ?? 0, done: done?.c ?? 0 },
      assets: assets?.c ?? 0,
      agents: agents?.c ?? 0,
      notes: notes?.c ?? 0,
    };
  })
  .get("/activity", async () => {
    const tasks = await dbQuery("SELECT * FROM tasks ORDER BY updated_at DESC LIMIT 5");
    const assets = await dbQuery("SELECT * FROM content_assets ORDER BY created_at DESC LIMIT 5");
    const logs = await dbQuery("SELECT * FROM agent_logs ORDER BY created_at DESC LIMIT 10");
    return { recentTasks: tasks, recentAssets: assets, recentLogs: logs };
  });
