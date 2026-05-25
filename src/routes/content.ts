import { Elysia, t } from "elysia";
import { db } from "../db";

export const contentRoutes = new Elysia({ prefix: "/api/content" })
  .get("/", () => {
    return db.query("SELECT * FROM content_assets ORDER BY created_at DESC").all();
  })
  .post("/", ({ body }) => {
    const now = new Date().toISOString();
    db.run(
      "INSERT INTO content_assets (type, title, prompt, status, metadata, created_at, updated_at) VALUES (?, ?, ?, 'pending', ?, ?, ?)",
      [body.type, body.title, body.prompt ?? "", JSON.stringify(body.metadata ?? {}), now, now]
    );
    const id = db.query("SELECT last_insert_rowid() as id").get() as { id: number };
    return { id: id.id, ...body, status: "pending" };
  }, {
    body: t.Object({
      type: t.String(),
      title: t.String(),
      prompt: t.Optional(t.String()),
      metadata: t.Optional(t.Record(t.String(), t.Any())),
    }),
  })
  .patch("/:id", ({ params, body }) => {
    const now = new Date().toISOString();
    const sets: string[] = [];
    const vals: (string | number)[] = [];
    if (body.status !== undefined) { sets.push("status = ?"); vals.push(body.status); }
    if (body.filePath !== undefined) { sets.push("file_path = ?"); vals.push(body.filePath); }
    if (body.metadata !== undefined) { sets.push("metadata = ?"); vals.push(JSON.stringify(body.metadata)); }
    sets.push("updated_at = ?");
    vals.push(now, Number(params.id));
    db.run(`UPDATE content_assets SET ${sets.join(", ")} WHERE id = ?`, vals);
    return { id: Number(params.id), updatedAt: now };
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      status: t.Optional(t.String()),
      filePath: t.Optional(t.String()),
      metadata: t.Optional(t.Record(t.String(), t.Any())),
    }),
  })
  .delete("/:id", ({ params }) => {
    db.run("DELETE FROM content_assets WHERE id = ?", [Number(params.id)]);
    return { deleted: true };
  }, {
    params: t.Object({ id: t.String() }),
  });
