/**
 * Social Media Routes — accounts, posts, publishing, automation, analytics
 */

import { Elysia } from "elysia";
import { dbQuery, dbGet, dbRun, dbInsert } from "../db";
import { enc, dec } from "../lib/crypto";

function now(): string {
  return new Date().toISOString();
}

// ═══════════════════════════════════════════════════════════
// PLATFORM CONFIG — OAuth endpoints, scopes, API bases
// ═══════════════════════════════════════════════════════════

const PLATFORMS: Record<string, {
  name: string;
  icon: string;
  oauthUrl: string;
  tokenUrl: string;
  scopes: string[];
  apiBase: string;
}> = {
  facebook: {
    name: "Facebook",
    icon: "📘",
    oauthUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    scopes: ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "publish_video"],
    apiBase: "https://graph.facebook.com/v18.0",
  },
  instagram: {
    name: "Instagram",
    icon: "📸",
    oauthUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    scopes: ["instagram_basic", "instagram_content_publish", "pages_show_list"],
    apiBase: "https://graph.facebook.com/v18.0",
  },
  twitter: {
    name: "X (Twitter)",
    icon: "🐦",
    oauthUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    apiBase: "https://api.twitter.com/2",
  },
  tiktok: {
    name: "TikTok",
    icon: "🎵",
    oauthUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scopes: ["user.info.basic", "video.publish", "video.list"],
    apiBase: "https://open.tiktokapis.com/v2",
  },
  threads: {
    name: "Threads",
    icon: "🧵",
    oauthUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    scopes: ["threads_basic", "threads_content_publish"],
    apiBase: "https://graph.facebook.com/v18.0",
  },
  snapchat: {
    name: "Snapchat",
    icon: "👻",
    oauthUrl: "https://accounts.snapchat.com/login/oauth2/authorize",
    tokenUrl: "https://accounts.snapchat.com/login/oauth2/access_token",
    scopes: ["snapchat-marketing-api"],
    apiBase: "https://adsapi.snapchat.com/v1",
  },
};

// ═══════════════════════════════════════════════════════════
// SOCIAL ACCOUNTS ROUTES
// ═══════════════════════════════════════════════════════════

export const socialRoutes = new Elysia({ prefix: "/api/social" })

  // ── Get platform config (for frontend OAuth flow) ──
  .get("/platforms", () => {
    return PLATFORMS;
  })

  // ── Get all connected accounts ──
  .get("/accounts", () => {
    const accounts = dbQuery(
      "SELECT id, platform, platform_account_id, display_name, username, avatar_url, account_type, status, followers, following, media_count, last_synced_at, webhook_status, metadata, created_at, updated_at FROM social_accounts ORDER BY platform ASC"
    );
    return accounts.map((a: any) => ({
      ...a,
      metadata: JSON.parse(a.metadata || "{}"),
    }));
  })

  // ── Get single account ──
  .get("/accounts/:id", ({ params }) => {
    const account = dbGet("SELECT * FROM social_accounts WHERE id = ?", [params.id]);
    if (!account) return { error: "Account not found" };
    return {
      ...account,
      access_token: dec((account as any).access_token_encrypted),
      refresh_token: dec((account as any).refresh_token_encrypted),
    };
  })

  // ── Connect account (store OAuth tokens) ──
  .post("/accounts/connect", ({ body }: any) => {
    const { platform, platform_account_id, display_name, username, avatar_url, access_token, refresh_token, token_expires_at, account_type, metadata } = body;

    if (!platform || !access_token) {
      return { error: "Platform and access_token are required" };
    }

    // Check if already exists
    const existing = dbGet(
      "SELECT id FROM social_accounts WHERE platform = ? AND platform_account_id = ?",
      [platform, platform_account_id || ""]
    );

    const ts = now();

    if (existing) {
      // Update existing
      dbRun(
        `UPDATE social_accounts SET
          display_name = ?, username = ?, avatar_url = ?,
          access_token_encrypted = ?, refresh_token_encrypted = ?,
          token_expires_at = ?, account_type = ?, metadata = ?,
          status = 'active', updated_at = ?
         WHERE id = ?`,
        [display_name || "", username || "", avatar_url || "",
         enc(access_token), enc(refresh_token || ""), token_expires_at || "",
         account_type || "business", JSON.stringify(metadata || {}),
         ts, (existing as any).id]
      );
      return { success: true, id: (existing as any).id, action: "updated" };
    }

    // Insert new
    const id = dbInsert(
      `INSERT INTO social_accounts
        (platform, platform_account_id, display_name, username, avatar_url,
         access_token_encrypted, refresh_token_encrypted, token_expires_at,
         account_type, status, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      [platform, platform_account_id || "", display_name || "", username || "",
       avatar_url || "", enc(access_token), enc(refresh_token || ""),
       token_expires_at || "", account_type || "business",
       JSON.stringify(metadata || {}), ts, ts]
    );

    return { success: true, id, action: "created" };
  })

  // ── Disconnect account ──
  .delete("/accounts/:id", ({ params }) => {
    dbRun("DELETE FROM social_accounts WHERE id = ?", [params.id]);
    return { success: true };
  })

  // ── Sync account (fetch latest stats) ──
  .post("/accounts/:id/sync", ({ params }) => {
    const account = dbGet("SELECT * FROM social_accounts WHERE id = ?", [params.id]);
    if (!account) return { error: "Account not found" };

    // In a real implementation, this would call the platform API
    // For now, update the sync timestamp
    dbRun(
      "UPDATE social_accounts SET last_synced_at = ?, updated_at = ? WHERE id = ?",
      [now(), now(), params.id]
    );

    return { success: true, message: "Account synced" };
  })

  // ═══════════════════════════════════════════════════════════
  // SOCIAL POSTS ROUTES
  // ═══════════════════════════════════════════════════════════

  // ── Get posts (with filters) ──
  .get("/posts", ({ query }: any) => {
    const { status, platform, account_id, limit = "50", offset = "0" } = query;
    let sql = "SELECT * FROM social_posts_v2 WHERE 1=1";
    const params: any[] = [];

    if (status) { sql += " AND status = ?"; params.push(status); }
    if (platform) { sql += " AND platform = ?"; params.push(platform); }
    if (account_id) { sql += " AND account_id = ?"; params.push(account_id); }

    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const posts = dbQuery(sql, params);
    return posts.map((p: any) => ({
      ...p,
      hashtags: JSON.parse(p.hashtags || "[]"),
      media_urls: JSON.parse(p.media_urls || "[]"),
      engagement: JSON.parse(p.engagement || "{}"),
      metadata: JSON.parse(p.metadata || "{}"),
    }));
  })

  // ── Create post ──
  .post("/posts", ({ body }: any) => {
    const { account_id, platform, content_type, title, caption, hashtags, media_urls, publish_mode, scheduled_at } = body;

    if (!account_id || !platform) {
      return { error: "account_id and platform are required" };
    }

    const ts = now();
    const id = dbInsert(
      `INSERT INTO social_posts_v2
        (account_id, platform, content_type, title, caption, hashtags, media_urls,
         publish_mode, scheduled_at, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [account_id, platform, content_type || "post", title || "", caption || "",
       JSON.stringify(hashtags || []), JSON.stringify(media_urls || []),
       publish_mode || "direct", scheduled_at || "",
       scheduled_at ? "scheduled" : "draft", ts, ts]
    );

    return { success: true, id };
  })

  // ── Update post ──
  .patch("/posts/:id", ({ params, body }: any) => {
    const post = dbGet("SELECT * FROM social_posts_v2 WHERE id = ?", [params.id]);
    if (!post) return { error: "Post not found" };

    const { title, caption, hashtags, media_urls, scheduled_at, status } = body;
    const ts = now();

    dbRun(
      `UPDATE social_posts_v2 SET
        title = COALESCE(?, title),
        caption = COALESCE(?, caption),
        hashtags = COALESCE(?, hashtags),
        media_urls = COALESCE(?, media_urls),
        scheduled_at = COALESCE(?, scheduled_at),
        status = COALESCE(?, status),
        updated_at = ?
       WHERE id = ?`,
      [title, caption,
       hashtags ? JSON.stringify(hashtags) : null,
       media_urls ? JSON.stringify(media_urls) : null,
       scheduled_at, status, ts, params.id]
    );

    return { success: true };
  })

  // ── Delete post ──
  .delete("/posts/:id", ({ params }) => {
    dbRun("DELETE FROM social_posts_v2 WHERE id = ?", [params.id]);
    return { success: true };
  })

  // ── Publish post immediately ──
  .post("/posts/:id/publish", ({ params }) => {
    const post = dbGet("SELECT * FROM social_posts_v2 WHERE id = ?", [params.id]);
    if (!post) return { error: "Post not found" };

    const ts = now();

    // In a real implementation, this would call the platform API
    // For now, mark as published and create a queue entry
    dbRun(
      "UPDATE social_posts_v2 SET status = 'processing', updated_at = ? WHERE id = ?",
      [ts, params.id]
    );

    // Add to publish queue
    dbInsert(
      "INSERT INTO social_publish_queue (post_id, job_type, status, run_after, created_at, updated_at) VALUES (?, 'publish', 'queued', ?, ?, ?)",
      [params.id, ts, ts, ts]
    );

    return { success: true, message: "Post queued for publishing" };
  })

  // ═══ Get queue status ──
  .get("/queue", () => {
    const queue = dbQuery(
      `SELECT q.*, p.platform, p.caption, p.account_id
       FROM social_publish_queue q
       JOIN social_posts_v2 p ON q.post_id = p.id
       ORDER BY q.created_at DESC LIMIT 100`
    );
    return queue;
  })

  // ═══════════════════════════════════════════════════════════
  // SOCIAL AUTOMATION ROUTES
  // ═══════════════════════════════════════════════════════════

  // ── Get automation rules ──
  .get("/automations", () => {
    const rules = dbQuery("SELECT * FROM social_automation_rules ORDER BY priority DESC, created_at DESC");
    return rules.map((r: any) => ({
      ...r,
      trigger_config: JSON.parse(r.trigger_config || "{}"),
      scope_config: JSON.parse(r.scope_config || "{}"),
    }));
  })

  // ── Create automation rule ──
  .post("/automations", ({ body }: any) => {
    const { account_id, name, platform, trigger_type, trigger_config, scope_type, scope_config, priority, cooldown_seconds } = body;

    if (!account_id || !name || !platform || !trigger_type) {
      return { error: "account_id, name, platform, and trigger_type are required" };
    }

    const ts = now();
    const id = dbInsert(
      `INSERT INTO social_automation_rules
        (account_id, name, platform, trigger_type, trigger_config, scope_type, scope_config, priority, cooldown_seconds, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [account_id, name, platform, trigger_type,
       JSON.stringify(trigger_config || {}), scope_type || "all",
       JSON.stringify(scope_config || {}), priority || 100,
       cooldown_seconds || 0, ts, ts]
    );

    return { success: true, id };
  })

  // ── Toggle automation rule ──
  .patch("/automations/:id/toggle", ({ params }) => {
    const rule = dbGet("SELECT status FROM social_automation_rules WHERE id = ?", [params.id]);
    if (!rule) return { error: "Rule not found" };

    const newStatus = (rule as any).status === "active" ? "paused" : "active";
    dbRun("UPDATE social_automation_rules SET status = ?, updated_at = ? WHERE id = ?", [newStatus, now(), params.id]);
    return { success: true, status: newStatus };
  })

  // ── Delete automation rule ──
  .delete("/automations/:id", ({ params }) => {
    dbRun("DELETE FROM social_automation_rules WHERE id = ?", [params.id]);
    return { success: true };
  })

  // ═══════════════════════════════════════════════════════════
  // SOCIAL ANALYTICS ROUTES
  // ═══════════════════════════════════════════════════════════

  // ── Get analytics for a post ──
  .get("/analytics/:postId", ({ params }) => {
    const analytics = dbQuery(
      "SELECT * FROM social_analytics WHERE post_id = ? ORDER BY captured_at DESC",
      [params.postId]
    );
    return analytics;
  })

  // ── Get aggregated analytics ──
  .get("/analytics", ({ query }: any) => {
    const { platform, days = "30" } = query;
    const since = new Date(Date.now() - parseInt(days) * 86400000).toISOString();

    let sql = `
      SELECT
        p.platform,
        COUNT(DISTINCT p.id) as total_posts,
        COALESCE(SUM(a.impressions), 0) as total_impressions,
        COALESCE(SUM(a.reach), 0) as total_reach,
        COALESCE(SUM(a.likes), 0) as total_likes,
        COALESCE(SUM(a.comments), 0) as total_comments,
        COALESCE(SUM(a.shares), 0) as total_shares,
        COALESCE(SUM(a.saves), 0) as total_saves,
        COALESCE(SUM(a.views), 0) as total_views,
        COALESCE(SUM(a.clicks), 0) as total_clicks,
        COALESCE(AVG(a.engagement_rate), 0) as avg_engagement_rate
      FROM social_posts_v2 p
      LEFT JOIN social_analytics a ON p.id = a.post_id
      WHERE p.created_at >= ?
    `;
    const params: any[] = [since];

    if (platform) {
      sql += " AND p.platform = ?";
      params.push(platform);
    }

    sql += " GROUP BY p.platform";

    const stats = dbQuery(sql, params);
    return stats;
  })

  // ── Get time series analytics ──
  .get("/analytics/timeseries", ({ query }: any) => {
    const { platform, days = "30" } = query;
    const since = new Date(Date.now() - parseInt(days) * 86400000).toISOString();

    let sql = `
      SELECT
        date(a.captured_at) as date,
        SUM(a.impressions) as impressions,
        SUM(a.reach) as reach,
        SUM(a.likes + a.comments + a.shares + a.saves) as engagement,
        SUM(a.views) as views
      FROM social_analytics a
      JOIN social_posts_v2 p ON a.post_id = p.id
      WHERE a.captured_at >= ?
    `;
    const params: any[] = [since];

    if (platform) {
      sql += " AND p.platform = ?";
      params.push(platform);
    }

    sql += " GROUP BY date(a.captured_at) ORDER BY date ASC";

    return dbQuery(sql, params);
  })

  // ═══════════════════════════════════════════════════════════
  // MEDIA ASSETS ROUTES
  // ═══════════════════════════════════════════════════════════

  // ── Get media assets ──
  .get("/media", ({ query }: any) => {
    const { media_type, limit = "50" } = query;
    let sql = "SELECT * FROM social_media_assets";
    const params: any[] = [];

    if (media_type) {
      sql += " WHERE media_type = ?";
      params.push(media_type);
    }

    sql += " ORDER BY created_at DESC LIMIT ?";
    params.push(parseInt(limit));

    return dbQuery(sql, params);
  })

  // ── Register media asset ──
  .post("/media", ({ body }: any) => {
    const { storage_key, media_type, mime_type, file_size, title, duration_seconds, width, height, thumbnail_key, metadata } = body;

    if (!storage_key || !media_type) {
      return { error: "storage_key and media_type are required" };
    }

    const id = dbInsert(
      `INSERT INTO social_media_assets
        (storage_key, media_type, mime_type, file_size, title, duration_seconds, width, height, thumbnail_key, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [storage_key, media_type, mime_type || "", file_size || 0, title || "",
       duration_seconds || 0, width || 0, height || 0, thumbnail_key || "",
       JSON.stringify(metadata || {}), now()]
    );

    return { success: true, id };
  })

  // ── Delete media asset ──
  .delete("/media/:id", ({ params }) => {
    dbRun("DELETE FROM social_media_assets WHERE id = ?", [params.id]);
    return { success: true };
  })

  // ═══════════════════════════════════════════════════════════
  // DASHBOARD OVERVIEW
  // ═══════════════════════════════════════════════════════════

  .get("/overview", () => {
    const accounts = dbQuery("SELECT COUNT(*) as count FROM social_accounts WHERE status = 'active'")[0];
    const posts = dbQuery("SELECT status, COUNT(*) as count FROM social_posts_v2 GROUP BY status");
    const scheduled = dbQuery("SELECT COUNT(*) as count FROM social_posts_v2 WHERE status = 'scheduled'")[0];
    const automations = dbQuery("SELECT COUNT(*) as count FROM social_automation_rules WHERE status = 'active'")[0];
    const recentPosts = dbQuery(
      "SELECT id, platform, caption, status, scheduled_at, created_at FROM social_posts_v2 ORDER BY created_at DESC LIMIT 5"
    );
    const queueSize = dbQuery("SELECT COUNT(*) as count FROM social_publish_queue WHERE status = 'queued'")[0];

    return {
      accounts: (accounts as any)?.count || 0,
      posts: posts.reduce((acc: any, p: any) => ({ ...acc, [p.status]: p.count }), {}),
      scheduled: (scheduled as any)?.count || 0,
      automations: (automations as any)?.count || 0,
      queueSize: (queueSize as any)?.count || 0,
      recentPosts,
    };
  });
