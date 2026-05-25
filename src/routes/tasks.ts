import { Elysia, t } from "elysia";
import { db } from "../db";

export const tasksRoutes = new Elysia({ prefix: "/api/tasks" })
  .get("/", () => {
    return db.query("SELECT * FROM tasks ORDER BY created_at DESC").all();
  })
  .post("/", ({ body }) => {
    const now = new Date().toISOString();
    db.run(
      "INSERT INTO tasks (title, description, status, priority, project, tags, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [body.title, body.description ?? "", body.status ?? "backlog", body.priority ?? "medium", body.project ?? "", body.tags ?? "", body.dueDate ?? "", now, now]
    );
    const id = db.query("SELECT last_insert_rowid() as id").get() as { id: number };
    return { id: id.id, ...body };
  }, {
    body: t.Object({
      title: t.String(),
      description: t.Optional(t.String()),
      status: t.Optional(t.String()),
      priority: t.Optional(t.String()),
      project: t.Optional(t.String()),
      tags: t.Optional(t.String()),
      dueDate: t.Optional(t.String()),
    }),
  })
  .patch("/:id", ({ params, body }) => {
    const now = new Date().toISOString();
    const sets: string[] = [];
    const vals: (string | number)[] = [];
    if (body.title !== undefined) { sets.push("title = ?"); vals.push(body.title); }
    if (body.description !== undefined) { sets.push("description = ?"); vals.push(body.description); }
    if (body.status !== undefined) { sets.push("status = ?"); vals.push(body.status); }
    if (body.priority !== undefined) { sets.push("priority = ?"); vals.push(body.priority); }
    if (body.project !== undefined) { sets.push("project = ?"); vals.push(body.project); }
    if (body.tags !== undefined) { sets.push("tags = ?"); vals.push(body.tags); }
    if (body.dueDate !== undefined) { sets.push("due_date = ?"); vals.push(body.dueDate); }
    sets.push("updated_at = ?");
    vals.push(now, Number(params.id));
    db.run(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`, vals);
    return { id: Number(params.id), updatedAt: now };
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      title: t.Optional(t.String()),
      description: t.Optional(t.String()),
      status: t.Optional(t.String()),
      priority: t.Optional(t.String()),
      project: t.Optional(t.String()),
      tags: t.Optional(t.String()),
      dueDate: t.Optional(t.String()),
    }),
  })
  .delete("/:id", ({ params }) => {
    db.run("DELETE FROM tasks WHERE id = ?", [Number(params.id)]);
    return { deleted: true };
  }, {
    params: t.Object({ id: t.String() }),
  });
