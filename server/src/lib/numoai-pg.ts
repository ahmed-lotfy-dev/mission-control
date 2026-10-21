/**
 * Read-only PostgreSQL connection to numoai's database.
 * This lets Mission Control read social analytics data that numoai
 * collects via its OAuth connectors and platform providers.
 *
 * The actual OAuth flows, token refresh, and data collection run
 * through numoai's backend — Mission Control only reads the results.
 */
import postgres from "postgres";

const NUMOAI_DATABASE_URL = process.env.NUMOAI_DATABASE_URL;
const NUMOAI_FRONTEND_URL = process.env.NUMOAI_FRONTEND_URL || "http://localhost:3000";

let sql: postgres.Sql | null = null;

function getSql(): postgres.Sql {
  if (!sql) {
    if (!NUMOAI_DATABASE_URL) {
      throw new Error(
        "NUMOAI_DATABASE_URL not set. Add it to .env with numoai's PostgreSQL connection string."
      );
    }
    sql = postgres(NUMOAI_DATABASE_URL, {
      max: 2, // keep it light — read-only analytics queries
      idle_timeout: 30,
      connect_timeout: 10,
    });
  }
  return sql;
}

/** Safely close the connection pool */
export async function closeNumoaiPg(): Promise<void> {
  if (sql) {
    await sql.end();
    sql = null;
  }
}

// ── Type definitions matching numoai's schema ──

export interface NumoaiSocialAccount {
  id: string;
  platform: string;
  platform_account_id: string;
  display_name: string;
  account_type: string;
  status: string;
  metadata_json: Record<string, any> | null;
  created_at: Date;
}

export interface NumoaiContentAnalytics {
  id: string;
  social_account_id: string;
  platform: string;
  platform_content_id: string | null;
  snapshot_type: "content" | "account";
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  engagement_rate: number;
  metadata_json: Record<string, any> | null;
  captured_at: Date;
}

// ── Queries ──

/** Full NUMOAI_FRONTEND_URL for OAuth redirects */
export function getNumoaiFrontendUrl(): string {
  return NUMOAI_FRONTEND_URL;
}

/**
 * Get all connected social accounts with follower/media counts.
 */
export async function getSocialAccounts(): Promise<
  Array<{
    platform: string;
    displayName: string;
    followers: number;
    mediaCount: number;
    status: string;
  }>
> {
  try {
    const db = getSql();
    const rows = await db<NumoaiSocialAccount[]>`
      SELECT * FROM social_accounts
      WHERE status = 'active'
      ORDER BY platform
    `;

    return rows.map((r) => {
      const meta = (r.metadata_json || {}) as Record<string, any>;
      let followers = 0;
      let mediaCount = 0;

      // Different platforms store counts in different metadata keys
      if (r.platform === "tiktok") {
        followers = meta.tiktokFollowerCount ?? 0;
        mediaCount = meta.tiktokVideoCount ?? 0;
      } else if (r.platform === "x") {
        followers = meta.followersCount ?? 0;
        mediaCount = meta.tweetCount ?? 0;
      } else if (r.platform === "facebook") {
        followers = meta.followersCount ?? meta.fanCount ?? 0;
        mediaCount = meta.mediaCount ?? 0;
      } else {
        followers = meta.followersCount ?? 0;
        mediaCount = meta.mediaCount ?? 0;
      }

      return {
        platform: r.platform,
        displayName: r.display_name,
        followers,
        mediaCount,
        status: r.status,
      };
    });
  } catch (e: any) {
    console.warn("[numoai-pg] getSocialAccounts failed:", e.message);
    return [];
  }
}

/**
 * Get aggregated engagement stats (30-day lookback).
 */
export async function getSocialEngagementStats(days = 30): Promise<{
  totalImpressions: number;
  totalReach: number;
  totalEngagement: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  totalViews: number;
  avgEngagementRate: number;
}> {
  try {
    const db = getSql();
    const cutoff = new Date(Date.now() - days * 86400000);

    const [row] = await db`
      SELECT
        COALESCE(SUM(impressions), 0)::int as total_impressions,
        COALESCE(SUM(reach), 0)::int as total_reach,
        COALESCE(SUM(likes + comments + shares + saves), 0)::int as total_engagement,
        COALESCE(SUM(likes), 0)::int as total_likes,
        COALESCE(SUM(comments), 0)::int as total_comments,
        COALESCE(SUM(shares), 0)::int as total_shares,
        COALESCE(SUM(saves), 0)::int as total_saves,
        COALESCE(SUM(views), 0)::int as total_views,
        COALESCE(AVG(engagement_rate), 0)::int as avg_engagement_rate
      FROM content_analytics
      WHERE captured_at >= ${cutoff}
        AND snapshot_type = 'content'
    `;

    return {
      totalImpressions: row?.total_impressions ?? 0,
      totalReach: row?.total_reach ?? 0,
      totalEngagement: row?.total_engagement ?? 0,
      totalLikes: row?.total_likes ?? 0,
      totalComments: row?.total_comments ?? 0,
      totalShares: row?.total_shares ?? 0,
      totalSaves: row?.total_saves ?? 0,
      totalViews: row?.total_views ?? 0,
      avgEngagementRate: row?.avg_engagement_rate ?? 0,
    };
  } catch (e: any) {
    console.warn("[numoai-pg] getSocialEngagementStats failed:", e.message);
    return {
      totalImpressions: 0, totalReach: 0, totalEngagement: 0,
      totalLikes: 0, totalComments: 0, totalShares: 0,
      totalSaves: 0, totalViews: 0, avgEngagementRate: 0,
    };
  }
}

/**
 * Get time-series data (daily aggregation) for the past N days.
 */
export async function getSocialTimeSeries(
  days = 30
): Promise<
  Array<{
    date: string;
    content: number;
    posts: number;
    engagement: number;
    reach: number;
  }>
> {
  try {
    const db = getSql();
    const cutoff = new Date(Date.now() - days * 86400000);

    const rows = await db`
      SELECT
        DATE(captured_at) as day,
        COUNT(DISTINCT CASE WHEN snapshot_type = 'content' THEN platform_content_id END)::int as posts,
        COALESCE(SUM(impressions), 0)::int as total_impressions,
        COALESCE(SUM(reach), 0)::int as total_reach,
        COALESCE(SUM(likes + comments + shares + saves), 0)::int as total_engagement
      FROM content_analytics
      WHERE captured_at >= ${cutoff}
      GROUP BY DATE(captured_at)
      ORDER BY day ASC
    `;

    // Fill in missing days with zeros
    const series: Array<{
      date: string;
      content: number;
      posts: number;
      engagement: number;
      reach: number;
    }> = [];

    const dataMap = new Map<string, any>();
    for (const row of rows) {
      dataMap.set(row.day, row);
    }

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().split("T")[0];
      const row = dataMap.get(key);
      series.push({
        date: key,
        content: 0,
        posts: row?.posts ?? 0,
        engagement: row?.total_engagement ?? 0,
        reach: row?.total_reach ?? 0,
      });
    }

    return series;
  } catch (e: any) {
    console.warn("[numoai-pg] getSocialTimeSeries failed:", e.message);
    return [];
  }
}

/**
 * Get recent posts count (last 7 days).
 */
export async function getSocialRecentPosts(days = 7): Promise<number> {
  try {
    const db = getSql();
    const cutoff = new Date(Date.now() - days * 86400000);

    const [row] = await db`
      SELECT COUNT(DISTINCT platform_content_id)::int as count
      FROM content_analytics
      WHERE captured_at >= ${cutoff}
        AND snapshot_type = 'content'
    `;

    return row?.count ?? 0;
  } catch (e: any) {
    console.warn("[numoai-pg] getSocialRecentPosts failed:", e.message);
    return 0;
  }
}

/**
 * Get total unique posts tracked.
 */
export async function getSocialTotalPosts(): Promise<number> {
  try {
    const db = getSql();
    const [row] = await db`
      SELECT COUNT(*)::int as count FROM social_contents
    `;
    return row?.count ?? 0;
  } catch (e: any) {
    console.warn("[numoai-pg] getSocialTotalPosts failed:", e.message);
    return 0;
  }
}
