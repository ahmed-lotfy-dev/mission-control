import { Elysia, t } from "elysia";
import { dbQuery, dbGet, dbRun, dbInsert } from "../db";

export const contentRoutes = new Elysia({ prefix: "/api/content" })
  .get("/", async () => {
    return await dbQuery("SELECT * FROM content_assets ORDER BY created_at DESC");
  })
  .post("/", async ({ body }) => {
    const now = new Date().toISOString();
    const id = await dbInsert(
      "INSERT INTO content_assets (type, title, prompt, status, metadata, created_at, updated_at) VALUES ($1, $2, $3, 'pending', $4, $5, $6)",
      [body.type, body.title, body.prompt ?? "", JSON.stringify(body.metadata ?? {}), now, now]
    );
    return { id, ...body, status: "pending" };
  }, {
    body: t.Object({
      type: t.String(),
      title: t.String(),
      prompt: t.Optional(t.String()),
      metadata: t.Optional(t.Record(t.String(), t.Any())),
    }),
  })
  .patch("/:id", async ({ params, body }) => {
    const now = new Date().toISOString();
    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (body.status !== undefined) { sets.push(`status = $${i++}`); vals.push(body.status); }
    if (body.filePath !== undefined) { sets.push(`file_path = $${i++}`); vals.push(body.filePath); }
    if (body.metadata !== undefined) { sets.push(`metadata = $${i++}`); vals.push(JSON.stringify(body.metadata)); }
    sets.push(`updated_at = $${i++}`);
    vals.push(now, Number(params.id));
    await dbRun(`UPDATE content_assets SET ${sets.join(", ")} WHERE id = $${i}`, vals);
    return { id: Number(params.id), updatedAt: now };
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      status: t.Optional(t.String()),
      filePath: t.Optional(t.String()),
      metadata: t.Optional(t.Record(t.String(), t.Any())),
    }),
  })
  .delete("/:id", async ({ params }) => {
    await dbRun("DELETE FROM content_assets WHERE id = $1", [Number(params.id)]);
    return { deleted: true };
  }, {
    params: t.Object({ id: t.String() }),
  });
