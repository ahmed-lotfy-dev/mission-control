import { Elysia, t } from "elysia";
import { dbQuery, dbGet, dbRun, dbInsert } from "../db";

function handleError(set: any, operation: string, err: any): { error: string; detail: string } {
  const msg = err?.message || err?.toString() || "Unknown error";
  console.error(`[seo] ${operation} error:`, msg);
  set.status = 500;
  return { error: `${operation} failed`, detail: msg };
}

export const seoRoutes = new Elysia({ prefix: "/api/seo" })
  // Keywords
  .get("/keywords", ({ set }) => {
    try { return dbQuery("SELECT * FROM seo_keywords ORDER BY created_at DESC"); }
    catch (err: any) { return handleError(set, "List keywords", err); }
  })
  .post("/keywords", ({ body, set }) => {
    try {
      const now = new Date().toISOString();
      const id = dbInsert(
        "INSERT INTO seo_keywords (keyword, volume, difficulty, related, notes, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [body.keyword, body.volume ?? 0, body.difficulty ?? 0, JSON.stringify(body.related ?? []), body.notes ?? "", now, now]
      );
      return { id, ...body };
    } catch (err: any) { return handleError(set, "Create keyword", err); }
  }, {
    body: t.Object({
      keyword: t.String(),
      volume: t.Optional(t.Number()),
      difficulty: t.Optional(t.Number()),
      related: t.Optional(t.Array(t.String())),
      notes: t.Optional(t.String()),
    }),
  })
  .patch("/keywords/:id", ({ params, body, set }) => {
    try {
      const now = new Date().toISOString();
      const sets: string[] = [];
      const vals: any[] = [];
      let i = 1;
      if (body.keyword !== undefined) { sets.push(`keyword = $${i++}`); vals.push(body.keyword); }
      if (body.volume !== undefined) { sets.push(`volume = $${i++}`); vals.push(body.volume); }
      if (body.difficulty !== undefined) { sets.push(`difficulty = $${i++}`); vals.push(body.difficulty); }
      if (body.related !== undefined) { sets.push(`related = $${i++}`); vals.push(JSON.stringify(body.related)); }
      if (body.notes !== undefined) { sets.push(`notes = $${i++}`); vals.push(body.notes); }
      sets.push(`updated_at = $${i++}`);
      vals.push(now, Number(params.id));
      dbRun(`UPDATE seo_keywords SET ${sets.join(", ")} WHERE id = $${i}`, vals);
      return { id: Number(params.id), updatedAt: now };
    } catch (err: any) { return handleError(set, "Update keyword", err); }
  }, {
    params: t.Object({ id: t.String() }),
  })
  .delete("/keywords/:id", ({ params, set }) => {
    try { dbRun("DELETE FROM seo_keywords WHERE id = $1", [Number(params.id)]); return { deleted: true }; }
    catch (err: any) { return handleError(set, "Delete keyword", err); }
  }, {
    params: t.Object({ id: t.String() }),
  })
  // Content
  .get("/content", ({ set }) => {
    try { return dbQuery("SELECT * FROM seo_content ORDER BY created_at DESC"); }
    catch (err: any) { return handleError(set, "List content", err); }
  })
  .post("/content", ({ body, set }) => {
    try {
      const now = new Date().toISOString();
      const id = dbInsert(
        "INSERT INTO seo_content (keyword, target_url, title, meta_description, headings, body, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [body.keyword, body.targetUrl ?? "", body.title ?? "", body.metaDescription ?? "", JSON.stringify(body.headings ?? []), body.body ?? "", body.status ?? "generated", now, now]
      );
      return { id, ...body };
    } catch (err: any) { return handleError(set, "Create content", err); }
  }, {
    body: t.Object({
      keyword: t.String(),
      targetUrl: t.Optional(t.String()),
      title: t.Optional(t.String()),
      metaDescription: t.Optional(t.String()),
      headings: t.Optional(t.Array(t.String())),
      body: t.Optional(t.String()),
      status: t.Optional(t.String()),
    }),
  })
  .delete("/content/:id", ({ params, set }) => {
    try { dbRun("DELETE FROM seo_content WHERE id = $1", [Number(params.id)]); return { deleted: true }; }
    catch (err: any) { return handleError(set, "Delete content", err); }
  }, {
    params: t.Object({ id: t.String() }),
  })
  // Ranks
  .get("/ranks", ({ set }) => {
    try { return dbQuery("SELECT * FROM seo_ranks ORDER BY check_date DESC"); }
    catch (err: any) { return handleError(set, "List ranks", err); }
  })
  .post("/ranks", ({ body, set }) => {
    try {
      const now = new Date().toISOString();
      const id = dbInsert(
        "INSERT INTO seo_ranks (keyword, position, url, check_date, notes) VALUES ($1, $2, $3, $4, $5)",
        [body.keyword, body.position ?? 0, body.url ?? "", body.checkDate ?? now, body.notes ?? ""]
      );
      return { id, ...body };
    } catch (err: any) { return handleError(set, "Create rank", err); }
  }, {
    body: t.Object({
      keyword: t.String(),
      position: t.Optional(t.Number()),
      url: t.Optional(t.String()),
      checkDate: t.Optional(t.String()),
      notes: t.Optional(t.String()),
    }),
  })
  .delete("/ranks/:id", ({ params, set }) => {
    try { dbRun("DELETE FROM seo_ranks WHERE id = $1", [Number(params.id)]); return { deleted: true }; }
    catch (err: any) { return handleError(set, "Delete rank", err); }
  }, {
    params: t.Object({ id: t.String() }),
  })
  // Audits
  .get("/audits", ({ set }) => {
    try { return dbQuery("SELECT * FROM seo_audits ORDER BY created_at DESC"); }
    catch (err: any) { return handleError(set, "List audits", err); }
  })
  .post("/audits", ({ body, set }) => {
    try {
      const now = new Date().toISOString();
      const id = dbInsert(
        "INSERT INTO seo_audits (url, score, title, meta_description, headings_count, links_count, has_meta, has_title, page_size, issues, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
        [body.url, body.score ?? 0, body.title ?? "", body.metaDescription ?? "", body.headingsCount ?? 0, body.linksCount ?? 0, body.hasMeta ? 1 : 0, body.hasTitle ? 1 : 0, body.pageSize ?? 0, JSON.stringify(body.issues ?? []), now]
      );
      return { id, ...body };
    } catch (err: any) { return handleError(set, "Create audit", err); }
  }, {
    body: t.Object({
      url: t.String(),
      score: t.Optional(t.Number()),
      title: t.Optional(t.String()),
      metaDescription: t.Optional(t.String()),
      headingsCount: t.Optional(t.Number()),
      linksCount: t.Optional(t.Number()),
      hasMeta: t.Optional(t.Boolean()),
      hasTitle: t.Optional(t.Boolean()),
      pageSize: t.Optional(t.Number()),
      issues: t.Optional(t.Array(t.String())),
    }),
  })
  .delete("/audits/:id", ({ params, set }) => {
    try { dbRun("DELETE FROM seo_audits WHERE id = $1", [Number(params.id)]); return { deleted: true }; }
    catch (err: any) { return handleError(set, "Delete audit", err); }
  }, {
    params: t.Object({ id: t.String() }),
  });
