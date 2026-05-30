import { Elysia, t } from "elysia";
import { dbQuery, dbGet, dbRun, dbInsert } from "../db";
import { notifyTaskChange } from "./ws";

export const tasksRoutes = new Elysia({ prefix: "/api/tasks" })
  .get("/", async () => {
    return await dbQuery("SELECT * FROM tasks ORDER BY created_at DESC");
  })
  .post("/", async ({ body }) => {
    const now = new Date().toISOString();
    const id = await dbInsert(
      "INSERT INTO tasks (title, description, status, priority, project, tags, due_date, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [body.title, body.description ?? "", body.status ?? "backlog", body.priority ?? "medium", body.project ?? "", body.tags ?? "", body.dueDate ?? "", now, now]
    );
    const newTask = { id, ...body };
    notifyTaskChange("created", newTask);
    return { id, ...body };
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
  .patch("/:id", async ({ params, body }) => {
    const now = new Date().toISOString();
    const sets: string[] = [];
    const vals: (string | number)[] = [];
    let i = 1;
    if (body.title !== undefined) { sets.push(`title = $${i++}`); vals.push(body.title); }
    if (body.description !== undefined) { sets.push(`description = $${i++}`); vals.push(body.description); }
    if (body.status !== undefined) { sets.push(`status = $${i++}`); vals.push(body.status); }
    if (body.priority !== undefined) { sets.push(`priority = $${i++}`); vals.push(body.priority); }
    if (body.project !== undefined) { sets.push(`project = $${i++}`); vals.push(body.project); }
    if (body.tags !== undefined) { sets.push(`tags = $${i++}`); vals.push(body.tags); }
    if (body.dueDate !== undefined) { sets.push(`due_date = $${i++}`); vals.push(body.dueDate); }
    sets.push(`updated_at = $${i++}`);
    vals.push(now, Number(params.id));
    sets.push(`id = $${i}`);
    await dbRun(`UPDATE tasks SET ${sets.join(", ")} WHERE id = $${i}`, vals);
    notifyTaskChange("updated", { id: Number(params.id), ...body, status: body.status });
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
  .delete("/:id", async ({ params }) => {
    await dbRun("DELETE FROM tasks WHERE id = $1", [Number(params.id)]);
    notifyTaskChange("deleted", { id: Number(params.id) });
    return { deleted: true };
  }, {
    params: t.Object({ id: t.String() }),
  });
