import { Elysia, t } from "elysia";
import { db } from "../db";

export const agentRoutes = new Elysia({ prefix: "/api/agents" })
  .get("/", () => {
    return db.query("SELECT * FROM agent_snapshots ORDER BY last_active DESC").all();
  })
  .post("/", ({ body }) => {
    const now = new Date().toISOString();
    db.run(
      "INSERT INTO agent_snapshots (name, model, version, status, last_active, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [body.name, body.model ?? "", body.version ?? "", body.status ?? "idle", now, JSON.stringify(body.metadata ?? {}), now]
    );
    const id = db.query("SELECT last_insert_rowid() as id").get() as { id: number };
    return { id: id.id, ...body };
  }, {
    body: t.Object({
      name: t.String(),
      model: t.Optional(t.String()),
      version: t.Optional(t.String()),
      status: t.Optional(t.String()),
      metadata: t.Optional(t.Record(t.String(), t.Any())),
    }),
  })
  .patch("/:id", ({ params, body }) => {
    const now = new Date().toISOString();
    const sets: string[] = [];
    const vals: (string | number)[] = [];
    if (body.name !== undefined) { sets.push("name = ?"); vals.push(body.name); }
    if (body.model !== undefined) { sets.push("model = ?"); vals.push(body.model); }
    if (body.version !== undefined) { sets.push("version = ?"); vals.push(body.version); }
    if (body.status !== undefined) { sets.push("status = ?"); vals.push(body.status); }
    if (body.metadata !== undefined) { sets.push("metadata = ?"); vals.push(JSON.stringify(body.metadata)); }
    sets.push("last_active = ?");
    vals.push(now, Number(params.id));
    db.run(`UPDATE agent_snapshots SET ${sets.join(", ")} WHERE id = ?`, vals);
    return { id: Number(params.id), lastActive: now };
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      name: t.Optional(t.String()),
      model: t.Optional(t.String()),
      version: t.Optional(t.String()),
      status: t.Optional(t.String()),
      metadata: t.Optional(t.Record(t.String(), t.Any())),
    }),
  })
  .delete("/:id", ({ params }) => {
    db.run("DELETE FROM agent_snapshots WHERE id = ?", [Number(params.id)]);
    return { deleted: true };
  }, {
    params: t.Object({ id: t.String() }),
  });
