import { Elysia, t } from "elysia";
import { dbQuery, dbGet, dbRun, dbInsert } from "../db";
import { crawlSite } from "../lib/seo-crawler";
import { urlToDomainSlug } from "../lib/helpers";
import { broadcastCrawlProgress } from "../routes/ws";

const activeCrawls = new Map<number, { status: string; done: number; total: number; currentUrl: string }>();

/** Wrap handler errors into a consistent JSON response with proper HTTP status */
function handleError(set: any, operation: string, err: any): { error: string; detail: string } {
  const msg = err?.message || err?.toString() || "Unknown error";
  console.error(`[seo-audit] ${operation} error:`, msg);
  set.status = 500;
  return { error: `${operation} failed`, detail: msg };
}

export const seoAuditRoutes = new Elysia({ prefix: "/api/seo-audit" })

  // ── Start Crawl ──
  .post("/crawl", ({ body, set }) => {
    try {
      const siteUrl = (body as any).siteUrl;
      if (!siteUrl) return { error: "siteUrl is required", detail: "The siteUrl field is missing from the request body" };
      const now = new Date().toISOString();
      const domainSlug = urlToDomainSlug(siteUrl);
      let sessionId: number;
      try {
        sessionId = dbInsert(
          "INSERT INTO seo_crawl_sessions (site_url, domain_slug, status, started_at, created_at) VALUES ($1,$2,$3,$4,$5)",
          [siteUrl, domainSlug, "running", now, now]
        );
      } catch (err: any) {
        return handleError(set, "Create crawl session", err);
      }

      // Background crawl with real-time progress
      (async () => {
        try {
          const result = await crawlSite(siteUrl, (done, total, url) => {
            activeCrawls.set(sessionId, { status: "running", done, total, currentUrl: url });
            broadcastCrawlProgress({ sessionId, domainSlug, status: "running", pagesCrawled: done, totalPages: total, currentUrl: url });
            dbRun("UPDATE seo_crawl_sessions SET pages_crawled=$1, total_pages=$2 WHERE id=$3", [done, total, sessionId]);
          });

          // Store all results
          for (const page of result.pages) {
            try {
            const pid = dbInsert("INSERT INTO seo_crawl_pages (session_id,url,path,http_status,response_time_ms,page_size_kb,word_count,title,title_length,meta_description,meta_description_length,h1,h1_count,h2_count,h3_count,h4_count,h5_count,h6_count,canonical,is_self_canonical,robots_meta,has_noindex,has_nofollow,html_lang,viewport_meta,content_type,og_title,og_description,og_image,og_url,og_type,og_locale,twitter_card,twitter_title,twitter_description,twitter_image,twitter_creator,has_structured_data,structured_data_types,internal_links_count,external_links_count,nofollow_links_count,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43)", [sessionId,page.url,page.path,page.httpStatus,page.responseTimeMs,Math.round(page.pageSizeBytes/1024),page.wordCount,page.title,page.titleLength,page.metaDescription,page.metaDescLength,page.h1,page.h1Count,page.h2Count,page.h3Count,page.h4Count,page.h5Count,page.h6Count,page.canonical,page.isSelfCanonical?1:0,page.robotsMeta,page.hasNoindex?1:0,page.hasNofollow?1:0,page.htmlLang,page.viewportMeta?1:0,page.contentType,page.ogTitle,page.ogDescription,page.ogImage,page.ogUrl,page.ogType,page.ogLocale,page.twitterCard,page.twitterTitle,page.twitterDescription,page.twitterImage,page.twitterCreator,page.hasStructuredData?1:0,JSON.stringify(page.structuredDataTypes),page.links.filter(l=>l.isInternal).length,page.links.filter(l=>!l.isInternal).length,page.links.filter(l=>l.isNofollow).length,now]);
            for (const link of page.links) { try { dbInsert("INSERT INTO seo_links (session_id,source_page_id,source_url,target_url,is_internal,is_nofollow,anchor_text,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [sessionId,pid,page.url,link.url,link.isInternal?1:0,link.isNofollow?1:0,link.anchorText,now]); } catch(e:any) { console.error("[seo-audit] link insert error:", e.message); } }
            for (const img of page.images) { try { dbInsert("INSERT INTO seo_images (session_id,page_id,page_url,image_url,alt_text,has_alt,is_lazy_loaded,file_format,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [sessionId,pid,page.url,img.url,img.altText,img.hasAlt?1:0,img.isLazyLoaded?1:0,img.format,now]); } catch(e:any) { console.error("[seo-audit] image insert error:", e.message); } }
            for (const hl of page.hreflangs) { try { dbInsert("INSERT INTO seo_hreflang (session_id,page_id,page_url,hreflang_value,hreflang_url,is_self_reference,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)", [sessionId,pid,page.url,hl.lang,hl.url,hl.url===page.url?1:0,now]); } catch(e:any) { console.error("[seo-audit] hreflang insert error:", e.message); } }
            } catch(e:any) { console.error("[seo-audit] page insert error:", e.message); }
          }
          for (const issue of result.issues) {
            try {
            const pg = result.pages.find(p=>p.url===issue.pageUrl);
            const pid = pg ? dbGet("SELECT id FROM seo_crawl_pages WHERE session_id=$1 AND url=$2",[sessionId,issue.pageUrl]) : null;
            dbInsert("INSERT INTO seo_issues (session_id,page_id,page_url,category,severity,title,description,recommendation,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [sessionId,pid?.id||0,issue.pageUrl,issue.category,issue.severity,issue.title,issue.description,issue.recommendation,now]);
            } catch(e:any) { console.error("[seo-audit] issue insert error:", e.message); }
          }
          for (const rd of result.redirects) { try { dbInsert("INSERT INTO seo_redirects (session_id,source_url,chain,chain_length,final_url,final_status,is_loop,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [sessionId,rd.sourceUrl,JSON.stringify(rd.chain),rd.chainLength,rd.finalUrl,rd.finalStatus,rd.isLoop?1:0,now]); } catch(e:any) { console.error("[seo-audit] redirect insert error:", e.message); } }
          if (result.robotsContent!==null) {
            try {
            const sm = result.robotsContent.split("\n").filter(l=>l.toLowerCase().startsWith("sitemap:")).map(l=>l.trim().replace(/^sitemap:\s*/i,""));
            dbInsert("INSERT INTO seo_robots (session_id,content,has_sitemap_directive,sitemap_urls,disallow_rules,allow_rules,issues,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [sessionId,result.robotsContent,sm.length>0?1:0,JSON.stringify(sm),"[]","[]","[]",now]);
            } catch(e:any) { console.error("[seo-audit] robots insert error:", e.message); }
          }
          for (const su of result.sitemapUrls) { try { dbInsert("INSERT INTO seo_sitemaps (session_id,url,is_crawled,created_at) VALUES ($1,$2,$3,$4)", [sessionId,su,result.pages.some(p=>p.url===su)?1:0,now]); } catch(e:any) { console.error("[seo-audit] sitemap insert error:", e.message); } }

          dbRun("UPDATE seo_crawl_sessions SET status='completed',pages_crawled=$1,total_pages=$1,finished_at=$2 WHERE id=$3", [result.pages.length,now,sessionId]);
          activeCrawls.set(sessionId,{status:"completed",done:result.pages.length,total:result.pages.length,currentUrl:""});
          broadcastCrawlProgress({sessionId,domainSlug,status:"completed",pagesCrawled:result.pages.length,totalPages:result.pages.length,currentUrl:""});
        } catch(err:any) {
          const errMsg = err?.message || "Unknown crawl error";
          console.error("[seo-audit] Background crawl error:", errMsg);
          try { dbRun("UPDATE seo_crawl_sessions SET status='error',finished_at=$1 WHERE id=$2",[now,sessionId]); } catch {}
          activeCrawls.set(sessionId,{status:"error",done:0,total:0,currentUrl:errMsg});
          broadcastCrawlProgress({sessionId,domainSlug,status:"error",pagesCrawled:0,totalPages:0,currentUrl:"",error:errMsg});
        }
      })();

      return { sessionId, domainSlug, message: "Crawl started" };
    } catch (err: any) {
      return handleError(set, "Start crawl", err);
    }
  }, { body: t.Object({ siteUrl: t.String() }) })

  // ── Crawl Progress (polling fallback) ──
  .get("/crawl/:sessionId/progress", ({ params, set }) => {
    try {
      const sid = Number(params.sessionId);
      if (isNaN(sid) || sid <= 0) return { error: "Invalid session ID", detail: `Session ID must be a positive number, got: ${params.sessionId}` };
      const state = activeCrawls.get(sid);
      if (state) return state;
      const session = dbGet("SELECT * FROM seo_crawl_sessions WHERE id=$1",[sid]);
      if (!session) return { error: "Session not found", detail: `No crawl session found with ID ${sid}` };
      return { status: session.status, done: session.pages_crawled, total: session.total_pages, currentUrl: "" };
    } catch (err: any) {
      return handleError(set, "Get crawl progress", err);
    }
  }, { params: t.Object({ sessionId: t.String() }) })

  // ── Sessions List ──
  .get("/sessions", ({ set }) => {
    try {
      return dbQuery("SELECT * FROM seo_crawl_sessions ORDER BY created_at DESC LIMIT 50");
    } catch (err: any) {
      return handleError(set, "List sessions", err);
    }
  })

  // ── Domain Reports ──
  .get("/domain/:domainSlug", ({ params, set }) => {
    try {
      const sessions = dbQuery("SELECT id,site_url,domain_slug,status,pages_crawled,total_pages,started_at,finished_at,created_at FROM seo_crawl_sessions WHERE domain_slug=$1 ORDER BY created_at DESC",[params.domainSlug]);
      if (!sessions.length) return { domain: params.domainSlug, site_url: "", reports: [] };
      return { domain: params.domainSlug, site_url: sessions[0].site_url, report_count: sessions.length, reports: sessions };
    } catch (err: any) {
      return handleError(set, "Get domain reports", err);
    }
  })

  // ── Delete Session ──
  .delete("/sessions/:sessionId", ({ params, set }) => {
    try {
      const sid = Number(params.sessionId);
      if (isNaN(sid) || sid <= 0) return { error: "Invalid session ID", detail: `Session ID must be a positive number, got: ${params.sessionId}` };
      dbRun("DELETE FROM seo_issues WHERE session_id=$1",[sid]);
      dbRun("DELETE FROM seo_links WHERE session_id=$1",[sid]);
      dbRun("DELETE FROM seo_images WHERE session_id=$1",[sid]);
      dbRun("DELETE FROM seo_hreflang WHERE session_id=$1",[sid]);
      dbRun("DELETE FROM seo_redirects WHERE session_id=$1",[sid]);
      dbRun("DELETE FROM seo_sitemaps WHERE session_id=$1",[sid]);
      dbRun("DELETE FROM seo_robots WHERE session_id=$1",[sid]);
      dbRun("DELETE FROM seo_crawl_pages WHERE session_id=$1",[sid]);
      dbRun("DELETE FROM seo_crawl_sessions WHERE id=$1",[sid]);
      activeCrawls.delete(sid);
      return { deleted: true };
    } catch (err: any) {
      return handleError(set, "Delete session", err);
    }
  }, { params: t.Object({ sessionId: t.String() }) })

  // ── Overview ──
  .get("/overview/:sessionId", ({ params, set }) => {
    try {
      const sid = Number(params.sessionId);
      if (isNaN(sid) || sid <= 0) { set.status = 400; return { error: "Invalid session ID", detail: `Session ID must be a positive number, got: ${params.sessionId}` }; }
      const session = dbGet("SELECT id FROM seo_crawl_sessions WHERE id=$1",[sid]);
      if (!session) { set.status = 404; return { error: "Session not found", detail: `No crawl session found with ID ${sid}. It may have been deleted or the ID is incorrect.` }; }
      const pages = dbQuery("SELECT * FROM seo_crawl_pages WHERE session_id=$1",[sid]);
      const issues = dbQuery("SELECT * FROM seo_issues WHERE session_id=$1",[sid]);
      const critical = issues.filter((i:any)=>i.severity==="critical").length;
      const high = issues.filter((i:any)=>i.severity==="high").length;
      const medium = issues.filter((i:any)=>i.severity==="medium").length;
      const low = issues.filter((i:any)=>i.severity==="low").length;
      // Score: weighted penalty normalized per page
      // critical=4pts, high=2pts, medium=1pt, low=0.5pt
      // Max healthy = 0 penalty → 100 score
      // 2+ penalty per page → approaches 0
      const penaltyPerPage = (critical * 4 + high * 2 + medium * 1 + low * 0.5) / Math.max(1, pages.length);
      const score = Math.max(0, Math.min(100, Math.round(100 * Math.exp(-0.5 * penaltyPerPage))));
      const avgResponseTime = pages.length > 0 ? Math.round(pages.reduce((s:number,p:any)=>s+(p.response_time_ms||0),0)/pages.length) : 0;
      const statusCounts = {"2xx":0,"3xx":0,"4xx":0,"5xx":0,other:0};
      for (const p of pages) { const s=p.http_status; if(s>=200&&s<300)statusCounts["2xx"]++; else if(s>=300&&s<400)statusCounts["3xx"]++; else if(s>=400&&s<500)statusCounts["4xx"]++; else if(s>=500)statusCounts["5xx"]++; else statusCounts.other++; }
      const categoryCounts: Record<string,number> = {};
      for (const i of issues) categoryCounts[i.category] = (categoryCounts[i.category]||0)+1;
      return { score, totalPages: pages.length, avgResponseTime, issues: {critical,high,medium,low,notices:0,passed:Math.max(0,pages.length*15-issues.length),total:issues.length}, statusCounts, categoryCounts, topIssues: issues.slice(0,10) };
    } catch (err: any) {
      return handleError(set, "Get overview", err);
    }
  }, { params: t.Object({ sessionId: t.String() }) })

  // ── Issues ──
  .get("/issues/:sessionId", ({ params, query, set }) => {
    try {
      const sid = Number(params.sessionId);
      if (isNaN(sid) || sid <= 0) return { error: "Invalid session ID", detail: `Session ID must be a positive number, got: ${params.sessionId}` };
      let sql = "SELECT * FROM seo_issues WHERE session_id=$1";
      const p: any[] = [sid];
      if (query.severity) { sql+=` AND severity=$${p.length+1}`; p.push(query.severity); }
      if (query.category) { sql+=` AND category=$${p.length+1}`; p.push(query.category); }
      sql+=" ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END, created_at DESC";
      return dbQuery(sql,p);
    } catch (err: any) {
      return handleError(set, "Get issues", err);
    }
  }, { params: t.Object({ sessionId: t.String() }) })

  // ── Content ──
  .get("/content/:sessionId", ({ params, query, set }) => {
    try {
      const sid = Number(params.sessionId);
      if (isNaN(sid) || sid <= 0) return { error: "Invalid session ID", detail: `Session ID must be a positive number, got: ${params.sessionId}` };
      let sql = "SELECT id,url,path,title,title_length,meta_description,meta_description_length,h1,h1_count,word_count,http_status FROM seo_crawl_pages WHERE session_id=$1 AND http_status=200";
      if (query.filter==="missing-title") sql+=" AND (title IS NULL OR title='' OR title_length<20 OR title_length>70)";
      if (query.filter==="missing-meta") sql+=" AND (meta_description IS NULL OR meta_description='' OR meta_description_length<70 OR meta_description_length>170)";
      if (query.filter==="thin-content") sql+=" AND word_count<300";
      if (query.filter==="missing-h1") sql+=" AND (h1 IS NULL OR h1='' OR h1_count!=1)";
      sql+=" ORDER BY url";
      return dbQuery(sql,[sid]);
    } catch (err: any) {
      return handleError(set, "Get content data", err);
    }
  }, { params: t.Object({ sessionId: t.String() }) })

  // ── Technical ──
  .get("/technical/:sessionId", ({ params, set }) => {
    try {
      const sid = Number(params.sessionId);
      if (isNaN(sid) || sid <= 0) return { error: "Invalid session ID", detail: `Session ID must be a positive number, got: ${params.sessionId}` };
      const pages = dbQuery("SELECT * FROM seo_crawl_pages WHERE session_id=$1",[sid]);
      return {
        noindexPages: pages.filter((p:any)=>p.has_noindex===1),
        nofollowPages: pages.filter((p:any)=>p.has_nofollow===1),
        missingCanonical: pages.filter((p:any)=>!p.canonical&&p.http_status===200),
        nonSelfCanonical: pages.filter((p:any)=>p.canonical&&!p.is_self_canonical&&p.http_status===200),
        missingViewport: pages.filter((p:any)=>!p.viewport_meta),
        missingLang: pages.filter((p:any)=>!p.html_lang),
        noStructuredData: pages.filter((p:any)=>!p.has_structured_data&&p.http_status===200),
        errorPages: pages.filter((p:any)=>p.http_status>=400),
        totalPages: pages.length,
      };
    } catch (err: any) {
      return handleError(set, "Get technical data", err);
    }
  }, { params: t.Object({ sessionId: t.String() }) })

  // ── Links ──
  .get("/links/:sessionId", ({ params, set }) => {
    try {
      const sid = Number(params.sessionId);
      if (isNaN(sid) || sid <= 0) return { error: "Invalid session ID", detail: `Session ID must be a positive number, got: ${params.sessionId}` };
      const links = dbQuery("SELECT * FROM seo_links WHERE session_id=$1",[sid]);
      const pages = dbQuery("SELECT id,url FROM seo_crawl_pages WHERE session_id=$1",[sid]);
      const internal = links.filter((l:any)=>l.is_internal===1);
      const incoming = new Map<string,number>();
      for (const l of internal) incoming.set(l.target_url,(incoming.get(l.target_url)||0)+1);
      const crawledUrls = new Set(pages.map((p:any)=>p.url));
      const orphanPages = pages.filter((p:any)=>!incoming.has(p.url)&&p.url!==pages[0]?.url);
      return { totalLinks:links.length, internalLinks:internal.length, externalLinks:links.filter((l:any)=>l.is_internal===0).length, brokenLinks:links.filter((l:any)=>l.is_broken===1).length, orphanPages, singleDofollowPages: pages.filter((p:any)=>{
        const df = internal.filter((l:any)=>l.target_url===p.url&&l.is_nofollow===0);
        return df.length===1 ? {...p,incomingFrom:df[0].source_url} : null;
      }).filter(Boolean), topLinkedPages: [...incoming.entries()].sort((a,b)=>b[1]-a[1]).slice(0,20).map(([url,count])=>({url,incomingLinks:count})) };
    } catch (err: any) {
      return handleError(set, "Get links data", err);
    }
  }, { params: t.Object({ sessionId: t.String() }) })

  // ── Redirects ──
  .get("/redirects/:sessionId", ({ params, query, set }) => {
    try {
      const sid = Number(params.sessionId);
      if (isNaN(sid) || sid <= 0) return { error: "Invalid session ID", detail: `Session ID must be a positive number, got: ${params.sessionId}` };
      let sql = "SELECT * FROM seo_redirects WHERE session_id=$1";
      if (query.type==="loop") sql+=" AND is_loop=1";
      if (query.type==="long") sql+=" AND chain_length>2";
      sql+=" ORDER BY chain_length DESC";
      return dbQuery(sql,[sid]);
    } catch (err: any) {
      return handleError(set, "Get redirects", err);
    }
  }, { params: t.Object({ sessionId: t.String() }) })

  // ── Hreflang ──
  .get("/hreflang/:sessionId", ({ params, set }) => {
    try {
      const sid = Number(params.sessionId);
      if (isNaN(sid) || sid <= 0) return { error: "Invalid session ID", detail: `Session ID must be a positive number, got: ${params.sessionId}` };
      const hreflangs = dbQuery("SELECT * FROM seo_hreflang WHERE session_id=$1 ORDER BY page_url,hreflang_value",[sid]);
      const pagesList = [...new Set(hreflangs.map((h:any)=>h.page_url))];
      const matrix: Record<string,Record<string,string>> = {};
      for (const p of pagesList) { matrix[p]={}; for (const h of hreflangs.filter((hl:any)=>hl.page_url===p)) matrix[p][h.hreflang_value]=h.hreflang_url; }
      const issues: any[] = [];
      for (const h of hreflangs) { if(!h.is_valid) issues.push({...h,issue:"Invalid language code"}); if(h.target_http_status>=400) issues.push({...h,issue:`Target returns ${h.target_http_status}`}); }
      const selfRef = new Set(hreflangs.filter((h:any)=>h.is_self_reference===1).map((h:any)=>h.page_url));
      for (const p of pagesList) if(!selfRef.has(p)) issues.push({page_url:p,issue:"Missing self-referencing hreflang"});
      return { hreflangs, matrix, pages:pagesList, langs:[...new Set(hreflangs.map((h:any)=>h.hreflang_value))], issues };
    } catch (err: any) {
      return handleError(set, "Get hreflang data", err);
    }
  }, { params: t.Object({ sessionId: t.String() }) })

  // ── Social ──
  .get("/social/:sessionId", ({ params, set }) => {
    try {
      const sid = Number(params.sessionId);
      if (isNaN(sid) || sid <= 0) return { error: "Invalid session ID", detail: `Session ID must be a positive number, got: ${params.sessionId}` };
      const pages = dbQuery("SELECT id,url,og_title,og_description,og_image,og_url,og_type,og_locale,twitter_card,twitter_title,twitter_description,twitter_image,twitter_creator FROM seo_crawl_pages WHERE session_id=$1 AND http_status=200",[sid]);
      return { totalPages:pages.length, missingOgTitle:pages.filter((p:any)=>!p.og_title), missingOgDesc:pages.filter((p:any)=>!p.og_description), missingOgImage:pages.filter((p:any)=>!p.og_image), missingTwCard:pages.filter((p:any)=>!p.twitter_card), allPages:pages };
    } catch (err: any) {
      return handleError(set, "Get social data", err);
    }
  }, { params: t.Object({ sessionId: t.String() }) })

  // ── Images ──
  .get("/images/:sessionId", ({ params, set }) => {
    try {
      const sid = Number(params.sessionId);
      if (isNaN(sid) || sid <= 0) return { error: "Invalid session ID", detail: `Session ID must be a positive number, got: ${params.sessionId}` };
      const images = dbQuery("SELECT * FROM seo_images WHERE session_id=$1",[sid]);
      return { totalImages:images.length, missingAlt:images.filter((i:any)=>!i.has_alt), notLazy:images.filter((i:any)=>!i.is_lazy_loaded), broken:images.filter((i:any)=>i.is_broken===1) };
    } catch (err: any) {
      return handleError(set, "Get images data", err);
    }
  }, { params: t.Object({ sessionId: t.String() }) })

  // ── Performance ──
  .get("/performance/:sessionId", ({ params, set }) => {
    try {
      const sid = Number(params.sessionId);
      if (isNaN(sid) || sid <= 0) return { error: "Invalid session ID", detail: `Session ID must be a positive number, got: ${params.sessionId}` };
      const pages = dbQuery("SELECT id,url,http_status,response_time_ms,page_size_kb FROM seo_crawl_pages WHERE session_id=$1",[sid]);
      const avgRt = pages.length>0 ? Math.round(pages.reduce((s:number,p:any)=>s+(p.response_time_ms||0),0)/pages.length) : 0;
      return { avgResponseTime:avgRt, slowPages:pages.filter((p:any)=>p.response_time_ms>2500), totalPages:pages.length };
    } catch (err: any) {
      return handleError(set, "Get performance data", err);
    }
  }, { params: t.Object({ sessionId: t.String() }) });
