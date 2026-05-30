import { Elysia, t } from "elysia";
import { dbQuery, dbGet, dbRun, dbInsert } from "../db";

export const scheduledRoutes = new Elysia({ prefix: "/api/scheduled" })
  .get("/", async () => {
    return await dbQuery("SELECT * FROM scheduled_tasks ORDER BY created_at DESC");
  })
  .post("/", async ({ body }) => {
    const now = new Date().toISOString();
    const id = await dbInsert(
      "INSERT INTO scheduled_tasks (name, description, schedule, type, payload, enabled, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [body.name, body.description ?? "", body.schedule, body.type ?? "script", body.payload ?? "", body.enabled ? 1 : 0, now, now]
    );
    return { id, ...body };
  }, {
    body: t.Object({
      name: t.String(),
      description: t.Optional(t.String()),
      schedule: t.String(),
      type: t.Optional(t.String()),
      payload: t.Optional(t.String()),
      enabled: t.Optional(t.Boolean()),
    }),
  })
  .patch("/:id", async ({ params, body }) => {
    const now = new Date().toISOString();
    const sets: string[] = [];
    const vals: (string | number)[] = [];
    let i = 1;
    if (body.name !== undefined) { sets.push(`name = $${i++}`); vals.push(body.name); }
    if (body.description !== undefined) { sets.push(`description = $${i++}`); vals.push(body.description); }
    if (body.schedule !== undefined) { sets.push(`schedule = $${i++}`); vals.push(body.schedule); }
    if (body.type !== undefined) { sets.push(`type = $${i++}`); vals.push(body.type); }
    if (body.payload !== undefined) { sets.push(`payload = $${i++}`); vals.push(body.payload); }
    if (body.enabled !== undefined) { sets.push(`enabled = $${i++}`); vals.push(body.enabled ? 1 : 0); }
    sets.push(`updated_at = $${i++}`);
    vals.push(now, Number(params.id));
    await dbRun(`UPDATE scheduled_tasks SET ${sets.join(", ")} WHERE id = $${i}`, vals);
    return { id: Number(params.id), updatedAt: now };
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      name: t.Optional(t.String()),
      description: t.Optional(t.String()),
      schedule: t.Optional(t.String()),
      type: t.Optional(t.String()),
      payload: t.Optional(t.String()),
      enabled: t.Optional(t.Boolean()),
    }),
  })
  .delete("/:id", async ({ params }) => {
    await dbRun("DELETE FROM scheduled_tasks WHERE id = $1", [Number(params.id)]);
    return { deleted: true };
  }, {
    params: t.Object({ id: t.String() }),
  })
  .post("/:id/run", async ({ params }) => {
    const task = await dbGet("SELECT * FROM scheduled_tasks WHERE id = $1", [Number(params.id)]);
    if (!task) return { error: "Not found" };
    const now = new Date().toISOString();
    let status = "success";
    try {
      if (task.type === "command" || task.type === "script") {
        const parts = task.payload.split(" ");
        const result = Bun.spawnSync(parts, { stdout: "pipe", stderr: "pipe" });
        status = result.exitCode === 0 ? "success" : "error";
      }
    } catch {
      status = "error";
    }
    await dbRun("UPDATE scheduled_tasks SET last_run = $1, last_status = $2, updated_at = $3 WHERE id = $4", [now, status, now, Number(params.id)]);
    return { executed: true, status };
  }, {
    params: t.Object({ id: t.String() }),
  });
