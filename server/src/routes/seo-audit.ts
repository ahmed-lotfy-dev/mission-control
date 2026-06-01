import { Elysia, t } from "elysia";
import { dbQuery, dbGet, dbRun, dbInsert } from "../db";
import { crawlSite } from "../lib/seo-crawler";

// ── In-memory crawl state (for progress tracking) ──
const activeCrawls = new Map<number, { status: string; done: number; total: number; currentUrl: string }>();

export const seoAuditRoutes = new Elysia({ prefix: "/api/seo-audit" })

  // ── Start Crawl ──
  .post("/crawl", async ({ body }) => {
    const siteUrl = (body as any).siteUrl;
    if (!siteUrl) return { error: "siteUrl is required" };

    const now = new Date().toISOString();
    console.log(`[SEO-AUDIT] Starting crawl session`, { siteUrl });
    const sessionId = dbInsert(
      "INSERT INTO seo_crawl_sessions (site_url, status, started_at, created_at) VALUES ($1, $2, $3, $4)",
      [siteUrl, "running", now, now]
    );
    console.log(`[SEO-AUDIT] Session created`, { sessionId, siteUrl });

    // Start crawl in background
    (async () => {
      try {
        console.log(`[SEO-AUDIT] Background crawl started`, { sessionId, siteUrl });
        const result = await crawlSite(siteUrl, (done, total, url) => {
          activeCrawls.set(sessionId, { status: "running", done, total, currentUrl: url });
        });
        console.log(`[SEO-AUDIT] Crawl finished, storing results`, {
          sessionId,
          pagesFound: result.pages.length,
          issuesFound: result.issues.length,
          sitemapUrls: result.sitemapUrls.length,
        });

        // Store pages
        for (const page of result.pages) {
          const pageId = dbInsert(
            `INSERT INTO seo_crawl_pages (
              session_id, url, path, http_status, response_time_ms, page_size_kb,
              word_count, title, title_length, meta_description, meta_description_length,
              h1, h1_count, h2_count, h3_count, h4_count, h5_count, h6_count,
              canonical, is_self_canonical, robots_meta, has_noindex, has_nofollow,
              html_lang, viewport_meta, content_type,
              og_title, og_description, og_image, og_url, og_type, og_locale,
              twitter_card, twitter_title, twitter_description, twitter_image, twitter_creator,
              has_structured_data, structured_data_types,
              internal_links_count, external_links_count, nofollow_links_count,
              created_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43)`,
            [
              sessionId, page.url, page.path, page.httpStatus, page.responseTimeMs,
              Math.round(page.pageSizeBytes / 1024), page.wordCount,
              page.title, page.titleLength, page.metaDescription, page.metaDescLength,
              page.h1, page.h1Count, page.h2Count, page.h3Count, page.h4Count, page.h5Count, page.h6Count,
              page.canonical, page.isSelfCanonical ? 1 : 0, page.robotsMeta,
              page.hasNoindex ? 1 : 0, page.hasNofollow ? 1 : 0,
              page.htmlLang, page.viewportMeta ? 1 : 0, page.contentType,
              page.ogTitle, page.ogDescription, page.ogImage, page.ogUrl, page.ogType, page.ogLocale,
              page.twitterCard, page.twitterTitle, page.twitterDescription, page.twitterImage, page.twitterCreator,
              page.hasStructuredData ? 1 : 0, JSON.stringify(page.structuredDataTypes),
              page.links.filter(l => l.isInternal).length,
              page.links.filter(l => !l.isInternal).length,
              page.links.filter(l => l.isNofollow).length,
              now,
            ]
          );

          // Store links
          for (const link of page.links) {
            dbInsert(
              "INSERT INTO seo_links (session_id, source_page_id, source_url, target_url, is_internal, is_nofollow, anchor_text, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
              [sessionId, pageId, page.url, link.url, link.isInternal ? 1 : 0, link.isNofollow ? 1 : 0, link.anchorText, now]
            );
          }

          // Store images
          for (const img of page.images) {
            dbInsert(
              "INSERT INTO seo_images (session_id, page_id, page_url, image_url, alt_text, has_alt, is_lazy_loaded, file_format, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
              [sessionId, pageId, page.url, img.url, img.altText, img.hasAlt ? 1 : 0, img.isLazyLoaded ? 1 : 0, img.format, now]
            );
          }

          // Store hreflang
          for (const hl of page.hreflangs) {
            dbInsert(
              "INSERT INTO seo_hreflang (session_id, page_id, page_url, hreflang_value, hreflang_url, is_self_reference, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
              [sessionId, pageId, page.url, hl.lang, hl.url, hl.url === page.url ? 1 : 0, now]
            );
          }
        }

        // Store issues
        for (const issue of result.issues) {
          const page = result.pages.find(p => p.url === issue.pageUrl);
          const pageId = page ? dbGet("SELECT id FROM seo_crawl_pages WHERE session_id = $1 AND url = $2", [sessionId, issue.pageUrl]) : null;
          dbInsert(
            "INSERT INTO seo_issues (session_id, page_id, page_url, category, severity, title, description, recommendation, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
            [sessionId, pageId?.id || 0, issue.pageUrl, issue.category, issue.severity, issue.title, issue.description, issue.recommendation, now]
          );
        }

        // Store sitemap URLs
        for (const su of result.sitemapUrls) {
          const isCrawled = result.pages.some(p => p.url === su);
          dbInsert(
            "INSERT INTO seo_sitemaps (session_id, url, is_crawled, created_at) VALUES ($1,$2,$3,$4)",
            [sessionId, su, isCrawled ? 1 : 0, now]
          );
        }

        // Store redirects
        for (const rd of result.redirects) {
          dbInsert(
            "INSERT INTO seo_redirects (session_id, source_url, chain, chain_length, final_url, final_status, is_loop, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
            [sessionId, rd.sourceUrl, JSON.stringify(rd.chain), rd.chainLength, rd.finalUrl, rd.finalStatus, rd.isLoop ? 1 : 0, now]
          );
        }

        // Store robots
        if (result.robotsContent !== null) {
          const robotsIssues: string[] = [];
          if (!result.robotsContent.toLowerCase().includes('sitemap:')) robotsIssues.push('missing-sitemap-directive');
          const disallowRules = result.robotsContent.split('\n').filter(l => l.toLowerCase().startsWith('disallow:')).map(l => l.trim());
          const allowRules = result.robotsContent.split('\n').filter(l => l.toLowerCase().startsWith('allow:')).map(l => l.trim());
          const sitemapDirectives = result.robotsContent.split('\n').filter(l => l.toLowerCase().startsWith('sitemap:')).map(l => l.trim().replace(/^sitemap:\s*/i, ''));
          dbInsert(
            "INSERT INTO seo_robots (session_id, content, has_sitemap_directive, sitemap_urls, disallow_rules, allow_rules, issues, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
            [sessionId, result.robotsContent, sitemapDirectives.length > 0 ? 1 : 0, JSON.stringify(sitemapDirectives), JSON.stringify(disallowRules), JSON.stringify(allowRules), JSON.stringify(robotsIssues), now]
          );
        }

        // Update session
        dbRun("UPDATE seo_crawl_sessions SET status = $1, pages_crawled = $2, total_pages = $3, finished_at = $4 WHERE id = $5", ["completed", result.pages.length, result.pages.length, now, sessionId]);
        activeCrawls.set(sessionId, { status: "completed", done: result.pages.length, total: result.pages.length, currentUrl: "" });
        console.log(`[SEO-AUDIT] Session completed successfully`, {
          sessionId,
          pagesStored: result.pages.length,
          issuesStored: result.issues.length,
          redirectsStored: result.redirects.length,
          sitemapEntriesStored: result.sitemapUrls.length,
        });
      } catch (err: any) {
        console.error(`[SEO-AUDIT] Crawl failed`, { sessionId, error: err.message, stack: err.stack });
        dbRun("UPDATE seo_crawl_sessions SET status = $1, finished_at = $2 WHERE id = $3", ["error", now, sessionId]);
        activeCrawls.set(sessionId, { status: "error", done: 0, total: 0, currentUrl: err.message });
      }
    })();

    return { sessionId, message: "Crawl started" };
  }, {
    body: t.Object({ siteUrl: t.String() }),
  })

  // ── Crawl Progress ──
  .get("/crawl/:sessionId/progress", async ({ params }) => {
    const sessionId = Number(params.sessionId);
    const state = activeCrawls.get(sessionId);
    if (state) return state;

    const session = dbGet("SELECT * FROM seo_crawl_sessions WHERE id = $1", [sessionId]);
    if (!session) return { error: "Session not found" };

    return {
      status: session.status,
      done: session.pages_crawled,
      total: session.total_pages,
      currentUrl: "",
    };
  }, {
    params: t.Object({ sessionId: t.String() }),
  })

  // ── Crawl Sessions List ──
  .get("/sessions", async () => {
    return dbQuery("SELECT * FROM seo_crawl_sessions ORDER BY created_at DESC LIMIT 50");
  })

  // ── Delete Session ──
  .delete("/sessions/:sessionId", async ({ params }) => {
    const sessionId = Number(params.sessionId);
    dbRun("DELETE FROM seo_issues WHERE session_id = $1", [sessionId]);
    dbRun("DELETE FROM seo_links WHERE session_id = $1", [sessionId]);
    dbRun("DELETE FROM seo_images WHERE session_id = $1", [sessionId]);
    dbRun("DELETE FROM seo_hreflang WHERE session_id = $1", [sessionId]);
    dbRun("DELETE FROM seo_redirects WHERE session_id = $1", [sessionId]);
    dbRun("DELETE FROM seo_sitemaps WHERE session_id = $1", [sessionId]);
    dbRun("DELETE FROM seo_robots WHERE session_id = $1", [sessionId]);
    dbRun("DELETE FROM seo_crawl_pages WHERE session_id = $1", [sessionId]);
    dbRun("DELETE FROM seo_crawl_sessions WHERE id = $1", [sessionId]);
    activeCrawls.delete(sessionId);
    return { deleted: true };
  }, {
    params: t.Object({ sessionId: t.String() }),
  })

  // ── Overview (Dashboard) ──
  .get("/overview/:sessionId", async ({ params }) => {
    const sessionId = Number(params.sessionId);
    const pages = dbQuery("SELECT * FROM seo_crawl_pages WHERE session_id = $1", [sessionId]);
    const issues = dbQuery("SELECT * FROM seo_issues WHERE session_id = $1", [sessionId]);

    const critical = issues.filter((i: any) => i.severity === "critical").length;
    const high = issues.filter((i: any) => i.severity === "high").length;
    const medium = issues.filter((i: any) => i.severity === "medium").length;
    const low = issues.filter((i: any) => i.severity === "low").length;
    const notices = issues.filter((i: any) => i.severity === "notice").length;
    const passed = Math.max(0, pages.length * 15 - issues.length);

    // Calculate health score
    const totalWeight = pages.length * 15;
    const issueWeight = critical * 10 + high * 5 + medium * 2 + low * 1;
    const score = Math.max(0, Math.min(100, Math.round(100 - (issueWeight / Math.max(1, totalWeight)) * 100)));

    const avgResponseTime = pages.length > 0
      ? Math.round(pages.reduce((sum: number, p: any) => sum + (p.response_time_ms || 0), 0) / pages.length)
      : 0;

    const statusCounts = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0, other: 0 };
    for (const p of pages) {
      const s = p.http_status;
      if (s >= 200 && s < 300) statusCounts["2xx"]++;
      else if (s >= 300 && s < 400) statusCounts["3xx"]++;
      else if (s >= 400 && s < 500) statusCounts["4xx"]++;
      else if (s >= 500) statusCounts["5xx"]++;
      else statusCounts.other++;
    }

    const categoryCounts: Record<string, number> = {};
    for (const i of issues) {
      categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1;
    }

    return {
      score,
      totalPages: pages.length,
      avgResponseTime,
      issues: { critical, high, medium, low, notices, passed, total: issues.length },
      statusCounts,
      categoryCounts,
      topIssues: issues.slice(0, 10),
    };
  }, {
    params: t.Object({ sessionId: t.String() }),
  })

  // ── All Issues ──
  .get("/issues/:sessionId", async ({ params, query }) => {
    const sessionId = Number(params.sessionId);
    let sql = "SELECT * FROM seo_issues WHERE session_id = $1";
    const p: any[] = [sessionId];

    if (query.severity) { sql += ` AND severity = $${p.length + 1}`; p.push(query.severity); }
    if (query.category) { sql += ` AND category = $${p.length + 1}`; p.push(query.category); }
    if (query.status) { sql += ` AND status = $${p.length + 1}`; p.push(query.status); }
    if (query.search) { sql += ` AND (page_url LIKE $${p.length + 1} OR title LIKE $${p.length + 1})`; p.push(`%${query.search}%`); }

    sql += " ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END, created_at DESC";

    if (query.limit) { sql += ` LIMIT $${p.length + 1}`; p.push(Number(query.limit)); }
    if (query.offset) { sql += ` OFFSET $${p.length + 1}`; p.push(Number(query.offset)); }

    return dbQuery(sql, p);
  }, {
    params: t.Object({ sessionId: t.String() }),
  })

  // ── Update Issue Status ──
  .patch("/issues/:issueId", async ({ params, body }) => {
    const issueId = Number(params.issueId);
    const b = body as any;
    if (b.status) dbRun("UPDATE seo_issues SET status = $1 WHERE id = $2", [b.status, issueId]);
    if (b.is_ignored !== undefined) dbRun("UPDATE seo_issues SET is_ignored = $1 WHERE id = $2", [b.is_ignored ? 1 : 0, issueId]);
    if (b.is_fixed !== undefined) dbRun("UPDATE seo_issues SET is_fixed = $1 WHERE id = $2", [b.is_fixed ? 1 : 0, issueId]);
    return { updated: true };
  }, {
    params: t.Object({ issueId: t.String() }),
  })

  // ── Content Quality ──
  .get("/content/:sessionId", async ({ params, query }) => {
    const sessionId = Number(params.sessionId);
    let sql = "SELECT id, url, path, title, title_length, meta_description, meta_description_length, h1, h1_count, word_count, http_status FROM seo_crawl_pages WHERE session_id = $1 AND http_status = 200";
    const p: any[] = [sessionId];

    if (query.filter === "missing-title") sql += " AND (title IS NULL OR title = '' OR title_length < 20 OR title_length > 70)";
    if (query.filter === "missing-meta") sql += " AND (meta_description IS NULL OR meta_description = '' OR meta_description_length < 70 OR meta_description_length > 170)";
    if (query.filter === "thin-content") sql += " AND word_count < 300";
    if (query.filter === "missing-h1") sql += " AND (h1 IS NULL OR h1 = '' OR h1_count != 1)";

    sql += " ORDER BY url";
    return dbQuery(sql, p);
  }, {
    params: t.Object({ sessionId: t.String() }),
  })

  // ── Technical SEO ──
  .get("/technical/:sessionId", async ({ params }) => {
    const sessionId = Number(params.sessionId);
    const pages = dbQuery("SELECT * FROM seo_crawl_pages WHERE session_id = $1", [sessionId]);

    const noindexPages = pages.filter((p: any) => p.has_noindex === 1);
    const nofollowPages = pages.filter((p: any) => p.has_nofollow === 1);
    const missingCanonical = pages.filter((p: any) => !p.canonical && p.http_status === 200);
    const nonSelfCanonical = pages.filter((p: any) => p.canonical && !p.is_self_canonical && p.http_status === 200);
    const missingViewport = pages.filter((p: any) => !p.viewport_meta);
    const missingLang = pages.filter((p: any) => !p.html_lang);
    const noStructuredData = pages.filter((p: any) => !p.has_structured_data && p.http_status === 200);
    const errorPages = pages.filter((p: any) => p.http_status >= 400);

    return {
      noindexPages,
      nofollowPages,
      missingCanonical,
      nonSelfCanonical,
      missingViewport,
      missingLang,
      noStructuredData,
      errorPages,
      totalPages: pages.length,
    };
  }, {
    params: t.Object({ sessionId: t.String() }),
  })

  // ── Links ──
  .get("/links/:sessionId", async ({ params }) => {
    const sessionId = Number(params.sessionId);
    const links = dbQuery("SELECT * FROM seo_links WHERE session_id = $1", [sessionId]);
    const pages = dbQuery("SELECT id, url FROM seo_crawl_pages WHERE session_id = $1", [sessionId]);

    const pageUrlMap = new Map<number, string>();
    for (const p of pages) pageUrlMap.set(p.id, p.url);

    const internalLinks = links.filter((l: any) => l.is_internal === 1);
    const externalLinks = links.filter((l: any) => l.is_internal === 0);
    const brokenLinks = links.filter((l: any) => l.is_broken === 1);
    const brokenInternal = internalLinks.filter((l: any) => l.is_broken === 1);

    // Orphan pages: pages with no incoming internal links
    const incomingCount = new Map<string, number>();
    for (const l of internalLinks) {
      incomingCount.set(l.target_url, (incomingCount.get(l.target_url) || 0) + 1);
    }
    const crawledUrls = new Set(pages.map((p: any) => p.url));
    const orphanPages = pages.filter((p: any) => !incomingCount.has(p.url) && p.url !== pages[0]?.url);

    // Pages with only nofollow incoming links
    const nofollowOnlyPages: any[] = [];
    for (const p of pages) {
      const incoming = internalLinks.filter((l: any) => l.target_url === p.url);
      if (incoming.length > 0 && incoming.every((l: any) => l.is_nofollow === 1)) {
        nofollowOnlyPages.push(p);
      }
    }

    // Pages with only 1 dofollow incoming link
    const singleDofollowPages: any[] = [];
    for (const p of pages) {
      const dofollowIncoming = internalLinks.filter((l: any) => l.target_url === p.url && l.is_nofollow === 0);
      if (dofollowIncoming.length === 1) {
        singleDofollowPages.push({ ...p, incomingFrom: dofollowIncoming[0].source_url });
      }
    }

    // Anchor text analysis
    const anchorTexts = new Map<string, number>();
    for (const l of internalLinks) {
      const text = (l.anchor_text || "").trim().toLowerCase();
      if (text) anchorTexts.set(text, (anchorTexts.get(text) || 0) + 1);
    }
    const overOptimizedAnchors = [...anchorTexts.entries()]
      .filter(([, count]) => count > 5)
      .map(([text, count]) => ({ text, count }));
    const genericAnchors = ["click here", "read more", "here", "link", "this page", "more", "learn more"];
    const genericAnchorLinks = internalLinks.filter((l: any) => genericAnchors.includes((l.anchor_text || "").trim().toLowerCase()));

    return {
      totalLinks: links.length,
      internalLinks: internalLinks.length,
      externalLinks: externalLinks.length,
      brokenLinks: brokenLinks.length,
      brokenInternal: brokenInternal.length,
      orphanPages,
      nofollowOnlyPages,
      singleDofollowPages,
      overOptimizedAnchors,
      genericAnchorLinks: genericAnchorLinks.slice(0, 50),
      topLinkedPages: [...incomingCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([url, count]) => ({ url, incomingLinks: count })),
    };
  }, {
    params: t.Object({ sessionId: t.String() }),
  })

  // ── Redirects ──
  .get("/redirects/:sessionId", async ({ params, query }) => {
    const sessionId = Number(params.sessionId);
    let sql = "SELECT * FROM seo_redirects WHERE session_id = $1";
    const p: any[] = [sessionId];

    if (query.type === "loop") sql += " AND is_loop = 1";
    if (query.type === "long") sql += " AND chain_length > 2";
    if (query.type === "broken") sql += " AND final_status >= 400";

    sql += " ORDER BY chain_length DESC";
    return dbQuery(sql, p);
  }, {
    params: t.Object({ sessionId: t.String() }),
  })

  // ── Hreflang ──
  .get("/hreflang/:sessionId", async ({ params }) => {
    const sessionId = Number(params.sessionId);
    const hreflangs = dbQuery("SELECT * FROM seo_hreflang WHERE session_id = $1 ORDER BY page_url, hreflang_value", [sessionId]);

    // Build matrix
    const pages = [...new Set(hreflangs.map((h: any) => h.page_url))];
    const langs = [...new Set(hreflangs.map((h: any) => h.hreflang_value))];
    const matrix: Record<string, Record<string, string>> = {};
    for (const p of pages) {
      matrix[p] = {};
      for (const h of hreflangs.filter((hl: any) => hl.page_url === p)) {
        matrix[p][h.hreflang_value] = h.hreflang_url;
      }
    }

    // Detect issues
    const issues: any[] = [];
    for (const h of hreflangs) {
      if (!h.is_valid) issues.push({ ...h, issue: "Invalid language code" });
      if (h.target_http_status >= 400) issues.push({ ...h, issue: `Target returns ${h.target_http_status}` });
    }

    // Check for missing self-references
    const pagesWithSelfRef = new Set(hreflangs.filter((h: any) => h.is_self_reference === 1).map((h: any) => h.page_url));
    for (const p of pages) {
      if (!pagesWithSelfRef.has(p)) {
        issues.push({ page_url: p, issue: "Missing self-referencing hreflang" });
      }
    }

    return { hreflangs, matrix, pages, langs, issues };
  }, {
    params: t.Object({ sessionId: t.String() }),
  })

  // ── Social Tags ──
  .get("/social/:sessionId", async ({ params }) => {
    const sessionId = Number(params.sessionId);
    const pages = dbQuery("SELECT id, url, og_title, og_description, og_image, og_url, og_type, og_locale, twitter_card, twitter_title, twitter_description, twitter_image, twitter_creator FROM seo_crawl_pages WHERE session_id = $1 AND http_status = 200", [sessionId]);

    const missingOgTitle = pages.filter((p: any) => !p.og_title);
    const missingOgDesc = pages.filter((p: any) => !p.og_description);
    const missingOgImage = pages.filter((p: any) => !p.og_image);
    const missingOgUrl = pages.filter((p: any) => !p.og_url);
    const missingTwCard = pages.filter((p: any) => !p.twitter_card);
    const missingTwTitle = pages.filter((p: any) => !p.twitter_title);
    const missingTwDesc = pages.filter((p: any) => !p.twitter_description);
    const missingTwImage = pages.filter((p: any) => !p.twitter_image);

    return {
      totalPages: pages.length,
      missingOgTitle,
      missingOgDesc,
      missingOgImage,
      missingOgUrl,
      missingTwCard,
      missingTwTitle,
      missingTwDesc,
      missingTwImage,
      allPages: pages,
    };
  }, {
    params: t.Object({ sessionId: t.String() }),
  })

  // ── Images ──
  .get("/images/:sessionId", async ({ params }) => {
    const sessionId = Number(params.sessionId);
    const images = dbQuery("SELECT * FROM seo_images WHERE session_id = $1", [sessionId]);

    const missingAlt = images.filter((i: any) => !i.has_alt);
    const emptyAlt = images.filter((i: any) => i.has_alt && (!i.alt_text || i.alt_text.trim() === ""));
    const notLazy = images.filter((i: any) => !i.is_lazy_loaded);
    const broken = images.filter((i: any) => i.is_broken === 1);
    const largeImages = images.filter((i: any) => i.estimated_size_kb > 200);

    return {
      totalImages: images.length,
      missingAlt,
      emptyAlt,
      notLazy,
      broken,
      largeImages,
      byPage: groupBy(images, "page_url"),
    };
  }, {
    params: t.Object({ sessionId: t.String() }),
  })

  // ── Performance ──
  .get("/performance/:sessionId", async ({ params }) => {
    const sessionId = Number(params.sessionId);
    const pages = dbQuery("SELECT id, url, http_status, response_time_ms, page_size_kb, word_count FROM seo_crawl_pages WHERE session_id = $1", [sessionId]);
    const psiCache = dbQuery("SELECT * FROM seo_psi_cache");

    const slowPages = pages.filter((p: any) => p.response_time_ms > 2500);
    const avgResponseTime = pages.length > 0
      ? Math.round(pages.reduce((s: number, p: any) => s + (p.response_time_ms || 0), 0) / pages.length)
      : 0;

    const responseTimeDistribution = {
      "< 500ms": pages.filter((p: any) => p.response_time_ms > 0 && p.response_time_ms < 500).length,
      "500ms - 1s": pages.filter((p: any) => p.response_time_ms >= 500 && p.response_time_ms < 1000).length,
      "1s - 2.5s": pages.filter((p: any) => p.response_time_ms >= 1000 && p.response_time_ms < 2500).length,
      "> 2.5s": pages.filter((p: any) => p.response_time_ms >= 2500).length,
    };

    return {
      pages,
      psiCache,
      slowPages,
      avgResponseTime,
      responseTimeDistribution,
    };
  }, {
    params: t.Object({ sessionId: t.String() }),
  })

  // ── PSI API (on-demand) ──
  .post("/psi", async ({ body }) => {
    const { url } = body as any;
    if (!url) return { error: "url is required" };

    // Check cache (24h)
    const cached = dbGet("SELECT * FROM seo_psi_cache WHERE url = $1 AND created_at > datetime('now', '-1 day')", [url]);
    if (cached) return { ...cached, cached: true };

    const apiKey = process.env.PSI_API_KEY || "";
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO&strategy=mobile${apiKey ? `&key=${apiKey}` : ""}`;

    try {
      const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(120000) });
      if (!resp.ok) return { error: `PSI API error: ${resp.status}` };
      const data = await resp.json();

      const lighthouse = data.lighthouseResult || {};
      const categories = lighthouse.categories || {};
      const audits = lighthouse.audits || {};

      const result = {
        url,
        performance: Math.round((categories.performance?.score || 0) * 100),
        accessibility: Math.round((categories.accessibility?.score || 0) * 100),
        bestPractices: Math.round((categories["best-practices"]?.score || 0) * 100),
        seo: Math.round((categories.seo?.score || 0) * 100),
        lcp: parseFloat((audits["largest-contentful-paint"]?.numericValue || 0).toFixed(1)),
        inp: parseFloat((audits["interaction-to-next-paint"]?.numericValue || 0).toFixed(1)),
        cls: parseFloat((audits["cumulative-layout-shift"]?.numericValue || 0).toFixed(3)),
        ttfb: parseFloat((audits["server-response-time"]?.numericValue || 0).toFixed(0)),
        fcp: parseFloat((audits["first-contentful-paint"]?.numericValue || 0).toFixed(1)),
        tti: parseFloat((audits["interactive"]?.numericValue || 0).toFixed(1)),
        tbt: parseFloat((audits["total-blocking-time"]?.numericValue || 0).toFixed(0)),
        speedIndex: parseFloat((audits["speed-index"]?.numericValue || 0).toFixed(1)),
        opportunities: JSON.stringify(Object.values(audits).filter((a: any) => a.score !== null && a.score < 1 && a.details?.type === "opportunity").map((a: any) => ({ id: a.id, title: a.title, savings: a.details?.overallSavingsMs || 0 }))),
        diagnostics: JSON.stringify(Object.values(audits).filter((a: any) => a.score !== null && a.score < 1 && a.details?.type !== "opportunity").slice(0, 10).map((a: any) => ({ id: a.id, title: a.title }))),
      };

      // Cache result
      const now = new Date().toISOString();
      const existing = dbGet("SELECT id FROM seo_psi_cache WHERE url = $1", [url]);
      if (existing) {
        dbRun("UPDATE seo_psi_cache SET performance_score=$1, accessibility_score=$2, best_practices_score=$3, seo_score=$4, lcp=$5, inp=$6, cls=$7, ttfb=$8, fcp=$9, tti=$10, tbt=$11, speed_index=$12, opportunities=$13, diagnostics=$14, created_at=$15 WHERE url=$16",
          [result.performance, result.accessibility, result.bestPractices, result.seo, result.lcp, result.inp, result.cls, result.ttfb, result.fcp, result.tti, result.tbt, result.speedIndex, result.opportunities, result.diagnostics, now, url]);
      } else {
        dbInsert("INSERT INTO seo_psi_cache (url, performance_score, accessibility_score, best_practices_score, seo_score, lcp, inp, cls, ttfb, fcp, tti, tbt, speed_index, opportunities, diagnostics, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)",
          [url, result.performance, result.accessibility, result.bestPractices, result.seo, result.lcp, result.inp, result.cls, result.ttfb, result.fcp, result.tti, result.tbt, result.speedIndex, result.opportunities, result.diagnostics, now]);
      }

      return result;
    } catch (err: any) {
      return { error: `PSI request failed: ${err.message}` };
    }
  }, {
    body: t.Object({ url: t.String() }),
  })

  // ── GSC API ──
  .get("/gsc/:sessionId", async ({ params, query }) => {
    const sessionId = Number(params.siteUrl || params.sessionId);
    const siteUrl = (query.siteUrl as string) || "https://ahmedlotfy.site";

    // Check cache
    const cached = dbQuery("SELECT * FROM seo_gsc_cache WHERE page LIKE $1 ORDER BY date DESC LIMIT 100", [`%${siteUrl}%`]);
    if (cached.length > 0) return { data: cached, cached: true };

    // GSC requires OAuth2 service account — return placeholder if not configured
    const gscKey = process.env.GSC_SERVICE_ACCOUNT_KEY;
    if (!gscKey) {
      return { data: [], message: "GSC not configured. Set GSC_SERVICE_ACCOUNT_KEY env var." };
    }

    try {
      const keyData = JSON.parse(gscKey);
      // JWT token for GSC API
      const token = await getGSCToken(keyData);
      const gscResp = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
        {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            startDate: query.startDate || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
            endDate: query.endDate || new Date().toISOString().split("T")[0],
            dimensions: ["page", "query"],
            rowLimit: 25000,
          }),
        }
      );

      if (!gscResp.ok) return { error: `GSC API error: ${gscResp.status}` };
      const gscData = await gscResp.json();

      const rows = (gscData.rows || []).map((row: any) => ({
        query: row.keys?.[0] || "",
        page: row.keys?.[1] || "",
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      }));

      // Cache
      const now = new Date().toISOString();
      for (const row of rows.slice(0, 500)) {
        dbInsert("INSERT INTO seo_gsc_cache (query, page, clicks, impressions, ctr, position, date, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
          [row.query, row.page, row.clicks, row.impressions, row.ctr, row.position, now.split("T")[0], now]);
      }

      return { data: rows };
    } catch (err: any) {
      return { error: `GSC request failed: ${err.message}` };
    }
  }, {
    params: t.Object({ sessionId: t.String() }),
  })

  // ── Sitemap Analysis ──
  .get("/sitemap-analysis/:sessionId", async ({ params }) => {
    const sessionId = Number(params.sessionId);
    const sitemaps = dbQuery("SELECT * FROM seo_sitemaps WHERE session_id = $1", [sessionId]);
    const pages = dbQuery("SELECT url FROM seo_crawl_pages WHERE session_id = $1", [sessionId]);
    const crawledUrls = new Set(pages.map((p: any) => p.url));

    const inSitemapNotCrawled = sitemaps.filter((s: any) => !s.is_crawled);
    const crawledNotInSitemap = pages.filter((p: any) => !sitemaps.some((s: any) => s.url === p.url));

    return {
      totalSitemapUrls: sitemaps.length,
      crawled: sitemaps.filter((s: any) => s.is_crawled).length,
      inSitemapNotCrawled,
      crawledNotInSitemap,
    };
  }, {
    params: t.Object({ sessionId: t.String() }),
  })

  // ── Robots.txt ──
  .get("/robots/:sessionId", async ({ params }) => {
    const sessionId = Number(params.sessionId);
    const robots = dbGet("SELECT * FROM seo_robots WHERE session_id = $1", [sessionId]);
    return robots || { error: "No robots.txt data for this session" };
  }, {
    params: t.Object({ sessionId: t.String() }),
  })

  // ── Export CSV ──
  .get("/export/:sessionId", async ({ params, query }) => {
    const sessionId = Number(params.sessionId);
    const type = (query.type as string) || "issues";

    if (type === "issues") {
      const issues = dbQuery("SELECT page_url, category, severity, title, description, recommendation, status FROM seo_issues WHERE session_id = $1 ORDER BY severity, page_url", [sessionId]);
      const header = "URL,Category,Severity,Title,Description,Recommendation,Status\n";
      const rows = issues.map((i: any) =>
        `"${i.page_url}","${i.category}","${i.severity}","${(i.title || "").replace(/"/g, '""')}","${(i.description || "").replace(/"/g, '""')}","${(i.recommendation || "").replace(/"/g, '""')}","${i.status}"`
      ).join("\n");
      return new Response(header + rows, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="seo-issues-${sessionId}.csv"` } });
    }

    if (type === "pages") {
      const pages = dbQuery("SELECT url, http_status, response_time_ms, title, title_length, meta_description, meta_description_length, h1, h1_count, word_count, canonical, has_noindex, has_nofollow, html_lang, viewport_meta, og_title, og_description, og_image, twitter_card, internal_links_count, external_links_count FROM seo_crawl_pages WHERE session_id = $1 ORDER BY url", [sessionId]);
      const header = "URL,Status,Response Time,Title,Title Length,Meta Desc,Meta Desc Length,H1,H1 Count,Word Count,Canonical,Noindex,Nofollow,HTML Lang,Viewport,OG Title,OG Desc,OG Image,Twitter Card,Internal Links,External Links\n";
      const rows = pages.map((p: any) =>
        `"${p.url}","${p.http_status}","${p.response_time_ms}","${(p.title || "").replace(/"/g, '""')}","${p.title_length}","${(p.meta_description || "").replace(/"/g, '""')}","${p.meta_description_length}","${(p.h1 || "").replace(/"/g, '""')}","${p.h1_count}","${p.word_count}","${p.canonical || ""}","${p.has_noindex}","${p.has_nofollow}","${p.html_lang}","${p.viewport_meta}","${p.og_title || ""}","${p.og_description || ""}","${p.og_image || ""}","${p.twitter_card || ""}","${p.internal_links_count}","${p.external_links_count}"`
      ).join("\n");
      return new Response(header + rows, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="seo-pages-${sessionId}.csv"` } });
    }

    return { error: "Invalid export type" };
  }, {
    params: t.Object({ sessionId: t.String() }),
  });

// ── Helpers ──

function groupBy(arr: any[], key: string): Record<string, any[]> {
  const result: Record<string, any[]> = {};
  for (const item of arr) {
    const k = item[key] || "unknown";
    if (!result[k]) result[k] = [];
    result[k].push(item);
  }
  return result;
}

async function getGSCToken(keyData: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    iss: keyData.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));
  const signatureInput = `${header}.${payload}`;
  // Note: In production, use a proper JWT library. This is a simplified version.
  // For now, return empty to indicate GSC needs proper implementation
  return "";
}
