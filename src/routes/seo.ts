import { Elysia, t } from "elysia";
import { db } from "../db";

// ── Helpers ──

function simulateRelated(keyword: string): Array<{ keyword: string; volume: number; difficulty: number }> {
  const base = keyword.toLowerCase().trim();
  const suffixes = ["guide", "tools", "best", "vs", "review", "pricing", "alternative", "tutorial", "software", "tips"];
  return suffixes.map((s, i) => ({
    keyword: `${base} ${s}`,
    volume: Math.floor(Math.random() * 8000) + 200,
    difficulty: Math.min(100, Math.round(Math.random() * 85 + 10)),
  }));
}

function simulateRankHistory(keyword: string): Array<{ date: string; position: number }> {
  const history: Array<{ date: string; position: number }> = [];
  let pos = Math.floor(Math.random() * 30) + 5;
  for (let i = 14; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 2);
    pos = Math.max(1, pos + Math.floor(Math.random() * 5) - 2);
    history.push({ date: d.toISOString().split("T")[0], position: pos });
  }
  return history;
}

function generateContent(keyword: string, url?: string) {
  const baseTitle = keyword.charAt(0).toUpperCase() + keyword.slice(1);
  const variants = [
    `The Ultimate ${baseTitle} Guide for 2026`,
    `${baseTitle}: Everything You Need to Know`,
    `Top 10 ${baseTitle} Tools & Resources`,
    `${baseTitle} Explained: A Complete Overview`,
    `How to Master ${baseTitle} in 5 Steps`,
  ];

  const headings = [
    `What is ${baseTitle}?`,
    `Why ${baseTitle} Matters in 2026`,
    `Key Benefits of ${baseTitle}`,
    `How to Get Started with ${baseTitle}`,
    `Common ${baseTitle} Mistakes to Avoid`,
    `Frequently Asked Questions About ${baseTitle}`,
  ];

  const desc = `Discover everything about ${keyword}. Our comprehensive guide covers benefits, tools, best practices, and expert tips to help you succeed in 2026.`;

  return {
    title: variants[Math.floor(Math.random() * variants.length)],
    metaDescription: desc,
    headings,
    body: `[Generated content placeholder for "${keyword}"]\n\nThis section would contain comprehensive, SEO-optimized content about ${keyword}. Topics include industry insights, actionable strategies, tool comparisons, and expert recommendations. Target URL: ${url || "N/A"}.`,
    wordCount: Math.floor(Math.random() * 800 + 400),
  };
}

function runBasicAudit(url: string) {
  const issues: string[] = [];
  let score = 60;

  // Simulate checks
  const hasTitle = Math.random() > 0.15;
  const hasMeta = Math.random() > 0.2;
  const h1Count = Math.floor(Math.random() * 3);
  const linkCount = Math.floor(Math.random() * 30) + 2;
  const pageSize = Math.floor(Math.random() * 500) + 50;

  if (!hasTitle) { score -= 15; issues.push("Missing <title> tag"); }
  if (!hasMeta) { score -= 10; issues.push("Missing meta description"); }
  if (h1Count === 0) { score -= 10; issues.push("No H1 heading found"); }
  if (h1Count > 1) { score -= 5; issues.push("Multiple H1 headings"); }
  if (linkCount < 3) { score -= 5; issues.push("Very few internal/external links"); }
  if (pageSize > 300) { score -= 5; issues.push("Page size over 300KB — consider optimization"); }

  if (issues.length === 0) issues.push("All basic checks passed");

  return {
    url,
    score: Math.max(0, score),
    title: hasTitle ? `${url.split("/").pop() || "Page Title"} — SEO Title` : "(missing)",
    metaDescription: hasMeta ? `Learn about ${url} with our expert guide and resources.` : "(missing)",
    headingsCount: h1Count,
    linksCount: linkCount,
    hasMeta: hasMeta ? 1 : 0,
    hasTitle: hasTitle ? 1 : 0,
    pageSize,
    issues,
  };
}

// ── Routes ──

export const seoRoutes = new Elysia({ prefix: "/api/seo" })

  // ── Keywords ──

  .get("/keywords", () => {
    return db.query("SELECT * FROM seo_keywords ORDER BY created_at DESC").all();
  })

  .post("/keywords", ({ body }) => {
    const now = new Date().toISOString();
    const related = JSON.stringify(simulateRelated(body.keyword));
    const volume = Math.floor(Math.random() * 12000 + 100);
    const difficulty = Math.min(100, Math.round(Math.random() * 85 + 5));

    const existing = db.query("SELECT id FROM seo_keywords WHERE keyword = ?").get(body.keyword) as { id: number } | null;
    if (existing) {
      db.run("UPDATE seo_keywords SET volume = ?, difficulty = ?, related = ?, notes = ?, updated_at = ? WHERE id = ?",
        [volume, difficulty, related, body.notes ?? "", now, existing.id]);
      return { id: existing.id, keyword: body.keyword, volume, difficulty, related: JSON.parse(related), notes: body.notes };
    }

    db.run("INSERT INTO seo_keywords (keyword, volume, difficulty, related, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [body.keyword, volume, difficulty, related, body.notes ?? "", now, now]);
    const id = db.query("SELECT last_insert_rowid() as id").get() as { id: number };
    return { id: id.id, keyword: body.keyword, volume, difficulty, related: JSON.parse(related), notes: body.notes };
  }, {
    body: t.Object({ keyword: t.String({ minLength: 1 }), notes: t.Optional(t.String()) }),
  })

  .delete("/keywords/:id", ({ params }) => {
    db.run("DELETE FROM seo_keywords WHERE id = ?", [Number(params.id)]);
    return { deleted: true };
  }, {
    params: t.Object({ id: t.String() }),
  })

  .patch("/keywords/:id", ({ params, body }) => {
    const now = new Date().toISOString();
    if (body.notes !== undefined) {
      db.run("UPDATE seo_keywords SET notes = ?, updated_at = ? WHERE id = ?", [body.notes, now, Number(params.id)]);
    }
    return { id: Number(params.id), notes: body.notes };
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ notes: t.Optional(t.String()) }),
  })

  // ── Content ──

  .get("/content", () => {
    return db.query("SELECT * FROM seo_content ORDER BY created_at DESC").all();
  })

  .post("/content", ({ body }) => {
    const now = new Date().toISOString();
    const generated = generateContent(body.keyword, body.targetUrl);

    db.run("INSERT INTO seo_content (keyword, target_url, title, meta_description, headings, body, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'generated', ?, ?)",
      [body.keyword, body.targetUrl ?? "", generated.title, generated.metaDescription, JSON.stringify(generated.headings), generated.body, now, now]);
    const id = db.query("SELECT last_insert_rowid() as id").get() as { id: number };

    return {
      id: id.id,
      keyword: body.keyword,
      targetUrl: body.targetUrl,
      ...generated,
    };
  }, {
    body: t.Object({ keyword: t.String({ minLength: 1 }), targetUrl: t.Optional(t.String()) }),
  })

  .delete("/content/:id", ({ params }) => {
    db.run("DELETE FROM seo_content WHERE id = ?", [Number(params.id)]);
    return { deleted: true };
  }, {
    params: t.Object({ id: t.String() }),
  })

  // ── Ranks ──

  .get("/ranks", ({ query }) => {
    const keyword = query?.keyword;
    if (keyword) {
      return db.query("SELECT * FROM seo_ranks WHERE keyword = ? ORDER BY check_date ASC").all(keyword);
    }
    return db.query("SELECT * FROM seo_ranks ORDER BY check_date DESC").all();
  }, {
    query: t.Object({ keyword: t.Optional(t.String()) }),
  })

  .post("/ranks/check", ({ body }) => {
    const now = new Date().toISOString();
    const position = Math.max(1, body.currentPosition + Math.floor(Math.random() * 3) - 1);
    db.run("INSERT INTO seo_ranks (keyword, position, url, check_date, notes) VALUES (?, ?, ?, ?, ?)",
      [body.keyword, position, body.url ?? "", now, body.notes ?? ""]);
    return { keyword: body.keyword, position, date: now, history: simulateRankHistory(body.keyword) };
  }, {
    body: t.Object({ keyword: t.String({ minLength: 1 }), url: t.Optional(t.String()), currentPosition: t.Optional(t.Number()), notes: t.Optional(t.String()) }),
  })

  // ── Audit ──

  .post("/audit", ({ body }) => {
    const now = new Date().toISOString();
    const audit = runBasicAudit(body.url);

    db.run("INSERT INTO seo_audits (url, score, title, meta_description, headings_count, links_count, has_meta, has_title, page_size, issues, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [audit.url, audit.score, audit.title, audit.metaDescription, audit.headingsCount, audit.linksCount, audit.hasMeta, audit.hasTitle, audit.pageSize, JSON.stringify(audit.issues), now]);
    const id = db.query("SELECT last_insert_rowid() as id").get() as { id: number };

    return { id: id.id, ...audit };
  }, {
    body: t.Object({ url: t.String({ minLength: 1 }) }),
  })

  .get("/audits", () => {
    return db.query("SELECT * FROM seo_audits ORDER BY created_at DESC").all();
  })
  ;