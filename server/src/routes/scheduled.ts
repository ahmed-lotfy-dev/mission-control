import { Elysia, t } from "elysia";
import { db } from "../db";

export const scheduledRoutes = new Elysia({ prefix: "/api/scheduled" })
  .get("/", () => {
    return db.query("SELECT * FROM scheduled_tasks ORDER BY created_at DESC").all();
  })
  .post("/", ({ body }) => {
    const now = new Date().toISOString();
    db.run(
      "INSERT INTO scheduled_tasks (name, description, schedule, type, payload, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [body.name, body.description ?? "", body.schedule, body.type ?? "script", body.payload ?? "", body.enabled ? 1 : 0, now, now]
    );
    const id = db.query("SELECT last_insert_rowid() as id").get() as { id: number };
    return { id: id.id, ...body };
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
  .patch("/:id", ({ params, body }) => {
    const now = new Date().toISOString();
    const sets: string[] = [];
    const vals: (string | number)[] = [];
    if (body.name !== undefined) { sets.push("name = ?"); vals.push(body.name); }
    if (body.description !== undefined) { sets.push("description = ?"); vals.push(body.description); }
    if (body.schedule !== undefined) { sets.push("schedule = ?"); vals.push(body.schedule); }
    if (body.type !== undefined) { sets.push("type = ?"); vals.push(body.type); }
    if (body.payload !== undefined) { sets.push("payload = ?"); vals.push(body.payload); }
    if (body.enabled !== undefined) { sets.push("enabled = ?"); vals.push(body.enabled ? 1 : 0); }
    sets.push("updated_at = ?");
    vals.push(now, Number(params.id));
    db.run(`UPDATE scheduled_tasks SET ${sets.join(", ")} WHERE id = ?`, vals);
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
  .delete("/:id", ({ params }) => {
    db.run("DELETE FROM scheduled_tasks WHERE id = ?", [Number(params.id)]);
    return { deleted: true };
  }, {
    params: t.Object({ id: t.String() }),
  })
  .post("/:id/run", ({ params }) => {
    const task = db.query("SELECT * FROM scheduled_tasks WHERE id = ?").get(Number(params.id)) as any;
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
    db.run("UPDATE scheduled_tasks SET last_run = ?, last_status = ?, updated_at = ? WHERE id = ?", [now, status, now, Number(params.id)]);
    return { executed: true, status };
  }, {
    params: t.Object({ id: t.String() }),
  });
