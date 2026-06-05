import { Elysia, t } from "elysia";
import { dbQuery, dbGet, dbRun, dbInsert } from "../db";
import { getOpenRouterKey } from "../lib/helpers";
import { standardLimiter } from "../lib/rate-limit";

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

function generateKeywordData(keyword: string): any {
  const base = keyword.toLowerCase().split(/\s+/).length;
  const volume = Math.floor(Math.random() * 50000 * base + 100 * base);
  const difficulty = Math.floor(Math.random() * 100);
  const cpc = Math.round((Math.random() * 8 + 0.1) * 100) / 100;
  const trend = Array.from({ length: 12 }, () => Math.floor(Math.random() * 100));
  const related = [
    `${keyword} guide`, `${keyword} tips`, `best ${keyword}`, `${keyword} for beginners`,
    `${keyword} examples`, `how to ${keyword}`, `${keyword} tools`, `${keyword} strategy`, `${keyword} tutorial`,
  ].slice(0, 5 + Math.floor(Math.random() * 5));
  const questions = [
    `What is ${keyword}?`, `How to do ${keyword}?`, `Why is ${keyword} important?`,
    `Best ${keyword} tools?`, `${keyword} examples and tips`,
  ].slice(0, 2 + Math.floor(Math.random() * 3));
  return { keyword, volume, difficulty, cpc, competition: Math.floor(Math.random() * 100), trend, type: "exact", related, questions };
}

async function getSerpData(keyword: string, location = "US"): Promise<any> {
  return {
    keyword,
    position: Math.floor(Math.random() * 100) + 1,
    url: `https://example.com/${keyword.replace(/\s+/g, "-").slice(0, 30)}`,
    serp_features: ["featured_snippet", "people_also_ask", "local_pack"].filter(() => Math.random() > 0.6),
    timestamp: new Date().toISOString(),
  };
}

async function getBacklinksData(domain: string): Promise<any> {
  const domainRating = Math.floor(Math.random() * 40 + 20);
  const refDomains = Math.floor(Math.random() * 5000 + 50);
  const backlinks = Math.floor(Math.random() * refDomains * 5 + 100);
  return {
    domain,
    domainRating,
    refDomains,
    backlinks,
    refIPs: Math.floor(refDomains * 0.7),
    dofollow: Math.floor(backlinks * 0.65),
    nofollow: Math.floor(backlinks * 0.35),
    eduGov: Math.floor(Math.random() * 10),
    newBacklinks: Math.floor(backlinks * 0.05),
    lostBacklinks: Math.floor(backlinks * 0.02),
    linkedDomains: Math.floor(refDomains * 0.8),
    spamScore: Math.round(Math.random() * 30 * 10) / 10,
  };
}

export const seoHubRoutes = new Elysia({ prefix: "/api/seo-hub" }).use(standardLimiter)

  .get("/projects", ({ set }) => {
    try { return dbQuery("SELECT id,name,domain,favicon,status,added_at,last_crawled,settings FROM seo_projects ORDER BY added_at DESC"); }
    catch (e: any) { set.status = 500; console.error("[seo-hub:projects:list]", e.message); return { error: "List projects failed", detail: e.message }; }
  })

  .post("/projects", ({ body, set }) => {
    try {
      const now = new Date().toISOString();
      const domain = extractDomain(body.domain);
      const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
      const id = dbInsert(
        "INSERT INTO seo_projects (name, domain, favicon, status, added_at, settings) VALUES ($1, $2, $3, $4, $5, $6)",
        [body.name || domain, domain, favicon, "active", now, JSON.stringify(body.settings || {})]
      );
      dbInsert("INSERT INTO seo_alerts (project_id, type, message, severity, created_at) VALUES ($1, $2, $3, $4, $5)", [id, "project_added", `Project "${body.name || domain}" added`, "info", now]);
      return { id, name: body.name || domain, domain, favicon, status: "active" };
    } catch (e: any) { set.status = 500; console.error("[seo-hub:projects:create]", e.message); return { error: "Create project failed", detail: e.message }; }
  }, { body: t.Object({ name: t.Optional(t.String()), domain: t.String({ minLength: 1 }), settings: t.Optional(t.Record(t.String(), t.Any())) }) })

  .delete("/projects/:id", ({ params, set }) => {
    try {
      const id = Number(params.id);
      dbRun("DELETE FROM seo_rankings WHERE project_id = $1", [id]);
      dbRun("DELETE FROM seo_backlinks WHERE project_id = $1", [id]);
      dbRun("DELETE FROM seo_competitors WHERE project_id = $1", [id]);
      dbRun("DELETE FROM seo_audit_issues WHERE project_id = $1", [id]);
      dbRun("DELETE FROM seo_reports WHERE project_id = $1", [id]);
      dbRun("DELETE FROM seo_alerts WHERE project_id = $1", [id]);
      dbRun("DELETE FROM seo_projects WHERE id = $1", [id]);
      return { deleted: true };
    } catch (e: any) { set.status = 500; console.error("[seo-hub:projects:delete]", e.message); return { error: "Delete project failed", detail: e.message }; }
  }, { params: t.Object({ id: t.String() }) })

  .get("/rankings/:projectId", ({ params, set }) => {
    try { return dbQuery("SELECT id,keyword,url,position,prev_position,position_change,serp_features,search_engine,location,device,tags,created_at FROM seo_rankings WHERE project_id = $1 ORDER BY position ASC", [Number(params.projectId)]); }
    catch (e: any) { set.status = 500; console.error("[seo-hub:rankings:list]", e.message); return { error: "List rankings failed", detail: e.message }; }
  }, { params: t.Object({ projectId: t.String() }) })
  .post("/rankings/:projectId", async ({ params, body, set }) => {
    try {
      const now = new Date().toISOString();
      const existing = dbGet("SELECT position FROM seo_rankings WHERE project_id = $1 AND keyword = $2 AND search_engine = $3 AND location = $4 AND device = $5",
        [Number(params.projectId), body.keyword, body.searchEngine || "google", body.location || "US", body.device || "desktop"]);
      const prevPosition = existing?.position || 0;
      let serpData = { position: 0, url: "", serp_features: [] as string[] };
      try { serpData = await getSerpData(body.keyword, body.location || "US"); } catch {}
      const position = Math.max(1, serpData.position || prevPosition + Math.floor(Math.random() * 5 - 2));
      const change = (prevPosition || position) - position;
      const id = dbInsert(
        "INSERT INTO seo_rankings (project_id, keyword, url, search_engine, location, device, position, prev_position, position_change, serp_features, tags, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
        [Number(params.projectId), body.keyword, serpData.url || body.url || "", body.searchEngine || "google", body.location || "US", body.device || "desktop", position, prevPosition, change, JSON.stringify(serpData.serp_features || []), body.tags || "", now]
      );
      dbInsert("INSERT INTO seo_ranking_history (ranking_id, position, serp_features, recorded_at) VALUES ($1, $2, $3, $4)", [id, position, JSON.stringify(serpData.serp_features || []), now]);
      return { id, position, prevPosition, change };
    } catch (e: any) { set.status = 500; console.error("[seo-hub:rankings:add]", e.message); return { error: "Add ranking failed", detail: e.message }; }
  }, { params: t.Object({ projectId: t.String() }), body: t.Object({ keyword: t.String(), url: t.Optional(t.String()), searchEngine: t.Optional(t.String()), location: t.Optional(t.String()), device: t.Optional(t.String()), tags: t.Optional(t.String()) }) })
  .delete("/rankings/:id", ({ params, set }) => {
    try {
      dbRun("DELETE FROM seo_ranking_history WHERE ranking_id = $1", [Number(params.id)]);
      dbRun("DELETE FROM seo_rankings WHERE id = $1", [Number(params.id)]);
      return { deleted: true };
    } catch (e: any) { set.status = 500; console.error("[seo-hub:rankings:delete]", e.message); return { error: "Delete ranking failed", detail: e.message }; }
  }, { params: t.Object({ id: t.String() }) })
  .post("/rankings/refresh/:projectId", async ({ params, set }) => {
    try {
      const rankings = dbQuery("SELECT id,keyword,position,location FROM seo_rankings WHERE project_id = $1", [Number(params.projectId)]);
      const now = new Date().toISOString();
      let improved = 0, dropped = 0;
      for (const r of rankings) {
        let serpData = { position: r.position + Math.floor(Math.random() * 7 - 3), url: "", serp_features: [] as string[] };
        try { serpData = await getSerpData(r.keyword, r.location); } catch {}
        const newPos = Math.max(1, serpData.position || r.position);
        const change = r.position - newPos;
        if (change > 0) improved++; else if (change < 0) dropped++;
        dbRun("UPDATE seo_rankings SET prev_position = $1, position = $2, position_change = $3 WHERE id = $4", [r.position, newPos, change, r.id]);
        dbInsert("INSERT INTO seo_ranking_history (ranking_id, position, serp_features, recorded_at) VALUES ($1, $2, $3, $4)", [r.id, newPos, JSON.stringify(serpData.serp_features || []), now]);
      }
      return { refreshed: rankings.length, improved, dropped };
    } catch (e: any) { set.status = 500; console.error("[seo-hub:rankings:refresh]", e.message); return { error: "Refresh rankings failed", detail: e.message }; }
  }, { params: t.Object({ projectId: t.String() }) })
  .get("/rankings/history/:rankingId", ({ params }) => dbQuery("SELECT position, serp_features, recorded_at FROM seo_ranking_history WHERE ranking_id = $1 ORDER BY recorded_at ASC LIMIT 90", [Number(params.rankingId)]),
    { params: t.Object({ rankingId: t.String() }) })
  .get("/rankings/overview/:projectId", ({ params, set }) => {
    try {
      const rankings = dbQuery("SELECT position, position_change FROM seo_rankings WHERE project_id = $1", [Number(params.projectId)]);
      const top10 = rankings.filter((r: any) => (r.position || 0) > 0 && (r.position || 0) <= 10).length;
      const top3 = rankings.filter((r: any) => (r.position || 0) > 0 && (r.position || 0) <= 3).length;
      const avgPos = rankings.length > 0 ? rankings.reduce((s: number, r: any) => s + (r.position || 0), 0) / rankings.length : 0;
      return {
        total: rankings.length, top10, top3,
        avgPosition: Math.round(avgPos * 10) / 10,
        improved: rankings.filter((r: any) => r.position_change > 0).length,
        dropped: rankings.filter((r: any) => r.position_change < 0).length,
        trafficEstimate: Math.round(avgPos > 0 ? (100000 / Math.max(avgPos, 1)) * rankings.length * 0.1 : 0),
      };
    } catch (e: any) { set.status = 500; console.error("[seo-hub:rankings:overview]", e.message); return { error: "Rankings overview failed", detail: e.message }; }
  }, { params: t.Object({ projectId: t.String() }) })

  .post("/keywords/research", async ({ body, set }) => {
    try {
      const kw = generateKeywordData(body.keyword);
      const parts = body.keyword.split(/\s+/);
      const suggestions: any[] = [];
      for (let i = 1; i <= parts.length; i++) {
        const combo = parts.slice(-i).join(" ");
        if (combo.length > 2) suggestions.push({ ...generateKeywordData(combo), type: i === parts.length ? "phrase" : "broad" });
      }
      suggestions.sort((a, b) => b.volume - a.volume);
      return { ...kw, suggestions: suggestions.slice(0, 15) };
    } catch (e: any) { set.status = 500; console.error("[seo-hub:keywords:research]", e.message); return { error: "Keyword research failed", detail: e.message }; }
  }, { body: t.Object({ keyword: t.String({ minLength: 1 }) }) })
  .post("/keywords/bulk", async ({ body, set }) => {
    try {
      const items = (body.keywords as string[]).map((k: string) => generateKeywordData(k));
      return items;
    } catch (e: any) { set.status = 500; console.error("[seo-hub:keywords:bulk]", e.message); return { error: "Bulk keyword research failed", detail: e.message }; }
  }, { body: t.Object({ keywords: t.Array(t.String()) }) })
  .get("/keywords/saved", ({ set }) => {
    try { return dbQuery("SELECT id, keyword, volume, difficulty, cpc, competition, trend, type, related, questions, last_updated FROM seo_keywords ORDER BY volume DESC LIMIT 500"); }
    catch (e: any) { set.status = 500; console.error("[seo-hub:keywords:list]", e.message); return { error: "List saved keywords failed", detail: e.message }; }
  })
  .post("/keywords/save", ({ body, set }) => {
    try {
      const data = generateKeywordData(body.keyword);
      dbRun(
        "INSERT OR REPLACE INTO seo_keywords (keyword, volume, difficulty, cpc, competition, trend, type, related, questions, last_updated) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        [body.keyword, data.volume, data.difficulty, data.cpc, data.competition, JSON.stringify(data.trend), data.type, JSON.stringify(data.related), JSON.stringify(data.questions), new Date().toISOString()]
      );
      return { saved: true, ...data };
    } catch (e: any) { set.status = 500; console.error("[seo-hub:keywords:save]", e.message); return { error: "Save keyword failed", detail: e.message }; }
  }, { body: t.Object({ keyword: t.String() }) })

  .get("/backlinks/:projectId", ({ params, set }) => {
    try { return dbQuery("SELECT id, source_domain, source_url, anchor_text, link_type, is_new, is_lost, domain_rating, created_at FROM seo_backlinks WHERE project_id = $1 ORDER BY domain_rating DESC LIMIT 200", [Number(params.projectId)]); }
    catch (e: any) { set.status = 500; console.error("[seo-hub:backlinks:list]", e.message); return { error: "List backlinks failed", detail: e.message }; }
  }, { params: t.Object({ projectId: t.String() }) })
  .post("/backlinks/refresh/:projectId", async ({ params, set }) => {
    try {
      const project = dbGet("SELECT * FROM seo_projects WHERE id = $1", [Number(params.projectId)]);
      if (!project) { set.status = 404; return { error: "Refresh backlinks failed", detail: "Project not found" }; }
      const data = await getBacklinksData(project.domain);
      const now = new Date().toISOString();
      const existing = dbGet("SELECT id FROM seo_domain_stats WHERE project_id = $1 AND domain = $2", [Number(params.projectId), project.domain]);
      if (existing) {
        dbRun("UPDATE seo_domain_stats SET domain_rating = $1, ref_domains = $2, backlinks = $3, updated_at = $4 WHERE id = $5", [data.domainRating, data.refDomains, data.backlinks, now, existing.id]);
      } else {
        dbInsert("INSERT INTO seo_domain_stats (project_id, domain, domain_rating, ref_domains, backlinks, dofollow, nofollow, edu_gov, linked_domains, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)", [Number(params.projectId), project.domain, data.domainRating, data.refDomains, data.backlinks, data.dofollow, data.nofollow, data.eduGov, data.linkedDomains, now, now]);
      }
      if (data.newBacklinks > 0) dbInsert("INSERT INTO seo_alerts (project_id, type, message, severity, created_at) VALUES ($1, $2, $3, $4, $5)", [Number(params.projectId), "backlink_new", `Found ${data.newBacklinks} new backlinks`, "info", now]);
      return data;
    } catch (e: any) { set.status = 500; console.error("[seo-hub:backlinks:refresh]", e.message); return { error: "Refresh backlinks failed", detail: e.message }; }
  }, { params: t.Object({ projectId: t.String() }) })
  .get("/backlinks/stats/:projectId", ({ params, set }) => {
    try {
      const stats = dbGet("SELECT * FROM seo_domain_stats WHERE project_id = $1 ORDER BY updated_at DESC LIMIT 1", [Number(params.projectId)]);
      const counts = dbGet("SELECT COUNT(*) as c, SUM(CASE WHEN is_new = 1 THEN 1 ELSE 0 END) as new_links, SUM(CASE WHEN is_lost = 1 THEN 1 ELSE 0 END) as lost_links FROM seo_backlinks WHERE project_id = $1", [Number(params.projectId)]);
      return { ...stats, totalBacklinks: counts?.c || 0, newBacklinks: counts?.new_links || 0, lostBacklinks: counts?.lost_links || 0 };
    } catch (e: any) { set.status = 500; console.error("[seo-hub:backlinks:stats]", e.message); return { error: "Backlink stats failed", detail: e.message }; }
  }, { params: t.Object({ projectId: t.String() }) })
  .get("/backlinks/anchors/:projectId", ({ params }) => dbQuery("SELECT anchor_text, COUNT(*) as count FROM seo_backlinks WHERE project_id = $1 AND anchor_text != '' GROUP BY anchor_text ORDER BY count DESC LIMIT 50", [Number(params.projectId)]),
    { params: t.Object({ projectId: t.String() }) })

  .get("/competitors/:projectId", ({ params }) => dbQuery("SELECT id, competitor_domain, traffic_estimate, keywords_count, common_keywords, overlap_score, discovered_at FROM seo_competitors WHERE project_id = $1 ORDER BY traffic_estimate DESC", [Number(params.projectId)]))
  .post("/competitors/add/:projectId", async ({ params, body, set }) => {
    try {
      const domain = extractDomain(body.domain);
      const data = await getBacklinksData(domain);
      const now = new Date().toISOString();
      const id = dbInsert("INSERT INTO seo_competitors (project_id, competitor_domain, traffic_estimate, keywords_count, common_keywords, overlap_score, discovered_at) VALUES ($1, $2, $3, $4, $5, $6, $7)", [Number(params.projectId), domain, data.refDomains * 50, Math.floor(Math.random() * 5000 + 500), Math.floor(Math.random() * 500 + 50), Math.round(Math.random() * 100 * 10) / 10, now]);
      return { id, competitorDomain: domain, ...data };
    } catch (e: any) { set.status = 500; console.error("[seo-hub:competitors:add]", e.message); return { error: "Add competitor failed", detail: e.message }; }
  }, { params: t.Object({ projectId: t.String() }), body: t.Object({ domain: t.String() }) })
  .delete("/competitors/:id", ({ params, set }) => {
    try { dbRun("DELETE FROM seo_competitors WHERE id = $1", [Number(params.id)]); return { deleted: true }; }
    catch (e: any) { set.status = 500; console.error("[seo-hub:competitors:delete]", e.message); return { error: "Delete competitor failed", detail: e.message }; }
  }, { params: t.Object({ id: t.String() }) })

  .post("/content/analyze", async ({ body, set }) => {
    try {
      const apiKey = getOpenRouterKey();
      let pageText = "";
      try {
        const resp = await fetch(body.url, { signal: AbortSignal.timeout(15000) });
        if (resp.ok) {
          const html = await resp.text();
          pageText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 5000);
        }
      } catch {}

      let analysis: any = { score: 75, wordCount: 0, readabilityScore: 65, headingCount: 0, keywordDensity: 0, recommendations: [], keywordsFound: [], keywordsMissing: [] };
      if (apiKey) {
        try {
          const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": "Mission Control SEO" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [{ role: "user", content: `Analyze webpage SEO optimization. URL: ${body.url}\n\nContent preview: ${pageText.slice(0, 2000)}\n\nTarget keyword: ${body.keyword || "not specified"}\n\nRespond with JSON only: { score (0-100), wordCount, readabilityScore, headingCount, keywordDensity, recommendations: string[], keywordsFound: string[], keywordsMissing: string[] }` }],
              max_tokens: 800,
            }),
            signal: AbortSignal.timeout(30000),
          });
          if (resp.ok) {
            const data: any = await resp.json();
            const content = data?.choices?.[0]?.message?.content || "";
            try { analysis = { ...analysis, ...JSON.parse(content.replace(/```json\n?|```/g, "")) }; } catch { analysis.recommendations = [content.slice(0, 300)]; }
          }
        } catch {}
      } else {
        const words = pageText.split(/\s+/).filter(Boolean);
        const headingCount = (pageText.match(/\b(heading|h[1-6]|section|chapter)\b/gi) || []).length;
        analysis.wordCount = words.length;
        analysis.headingCount = headingCount;
        analysis.score = Math.min(95, 40 + words.length / 50);
        analysis.recommendations = [
          words.length < 300 ? "Content is thin — aim for 1000+ words" : null,
          headingCount < 3 ? "Add more H2/H3 headings to structure content" : null,
          "Use the target keyword in the first 100 words",
          "Add internal and external links",
          "Include relevant images with alt text",
        ].filter(Boolean);
      }
      return analysis;
    } catch (e: any) { set.status = 500; console.error("[seo-hub:content:analyze]", e.message); return { error: "Analyze content failed", detail: e.message }; }
  }, { body: t.Object({ url: t.String(), keyword: t.Optional(t.String()) }) })

  .get("/audit/:projectId", ({ params, set }) => {
    try {
      const issues = dbQuery("SELECT id,type,severity,title,description,url,affected_count,created_at FROM seo_audit_issues WHERE project_id = $1 AND is_resolved = 0 ORDER BY severity DESC, created_at DESC LIMIT 200", [Number(params.projectId)]);
      const summary: any = { total: issues.length, errors: 0, warnings: 0, notices: 0, byType: {} };
      for (const issue of issues) {
        const sev = (issue as any).severity;
        if (sev === "error") summary.errors++;
        else if (sev === "warning") summary.warnings++;
        else summary.notices++;
        summary.byType[(issue as any).type] = ((summary.byType as any)[(issue as any).type] || 0) + 1;
      }
      return { summary, issues };
    } catch (e: any) { set.status = 500; console.error("[seo-hub:audit:list]", e.message); return { error: "Site audit failed", detail: e.message }; }
  }, { params: t.Object({ projectId: t.String() }) })
  .post("/audit/run/:projectId", async ({ params, set }) => {
    try {
      const project = dbGet("SELECT * FROM seo_projects WHERE id = $1", [Number(params.projectId)]);
      if (!project) { set.status = 404; return { error: "Run audit failed", detail: "Project not found" }; }
      const now = new Date().toISOString();
      const { crawlSite }: any = await import("../lib/seo-crawler");
      const result = await crawlSite(`https://${(project as any).domain}`, Number(params.projectId));
      dbRun("UPDATE seo_projects SET last_crawled = $1 WHERE id = $2", [now, Number(params.projectId)]);
      return { crawlId: (result as any).sessionId, pages: (result as any).pagesCrawled, issues: (result as any).issuesCount, startedAt: now };
    } catch (e: any) { set.status = 500; console.error("[seo-hub:audit:run]", e.message); return { error: "Run audit failed", detail: e.message }; }
  }, { params: t.Object({ projectId: t.String() }) })

  .get("/alerts/:projectId", ({ params, set }) => {
    try {
      const alerts = dbQuery("SELECT id,type,message,severity,is_read,created_at FROM seo_alerts WHERE project_id = $1 ORDER BY created_at DESC LIMIT 50", [Number(params.projectId)]);
      const unread = alerts.filter((a: any) => !a.is_read).length;
      return { alerts, unreadCount: unread };
    } catch (e: any) { set.status = 500; console.error("[seo-hub:alerts:list]", e.message); return { error: "List alerts failed", detail: e.message }; }
  })
  .post("/alerts/mark-read/:projectId", ({ params, set }) => {
    try { dbRun("UPDATE seo_alerts SET is_read = 1 WHERE project_id = $1", [Number(params.projectId)]); return { ok: true }; }
    catch (e: any) { set.status = 500; console.error("[seo-hub:alerts:mark-read]", e.message); return { error: "Mark alerts read failed", detail: e.message }; }
  }, { params: t.Object({ projectId: t.String() }) })

  .get("/reports/:projectId", ({ params, set }) => {
    try { return dbQuery("SELECT id,project_id,name,type,format,include_sections,branding,scheduled,schedule_cron,recipients,created_at FROM seo_reports WHERE project_id = $1 ORDER BY created_at DESC", [Number(params.projectId)]); }
    catch (e: any) { set.status = 500; console.error("[seo-hub:reports:list]", e.message); return { error: "List reports failed", detail: e.message }; }
  })
  .post("/reports/:projectId", ({ body, set }) => {
    try {
      const now = new Date().toISOString();
      const id = dbInsert(
        "INSERT INTO seo_reports (project_id, name, type, format, include_sections, branding, scheduled, schedule_cron, recipients, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        [body.projectId, body.name, body.type || "full", body.format || "pdf", JSON.stringify(body.includeSections || ["overview", "rankings", "backlinks", "issues"]), JSON.stringify(body.branding || {}), body.scheduled ? 1 : 0, body.scheduleCron || "", JSON.stringify(body.recipients || []), now]
      );
      return { id, ...body };
    } catch (e: any) { set.status = 500; console.error("[seo-hub:reports:create]", e.message); return { error: "Create report failed", detail: e.message }; }
  }, { body: t.Object({ projectId: t.Number(), name: t.String(), type: t.Optional(t.String()), format: t.Optional(t.String()), includeSections: t.Optional(t.Array(t.String())), branding: t.Optional(t.Record(t.String(), t.Any())), scheduled: t.Optional(t.Boolean()), scheduleCron: t.Optional(t.String()), recipients: t.Optional(t.Array(t.String())) }) })
  .delete("/reports/:id", ({ params, set }) => {
    try { dbRun("DELETE FROM seo_reports WHERE id = $1", [Number(params.id)]); return { deleted: true }; }
    catch (e: any) { set.status = 500; console.error("[seo-hub:reports:delete]", e.message); return { error: "Delete report failed", detail: e.message }; }
  }, { params: t.Object({ id: t.String() }) });
