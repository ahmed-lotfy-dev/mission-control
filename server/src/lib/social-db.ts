/**
 * Social data queries backed by Neon PostgreSQL.
 * Replace numoai-pg imports with this when using your own Neon database.
 */
import { sql } from "../lib/neon";

// ── Account Queries ──

export interface SocialAccountRow {
  id: number;
  platform: string;
  displayName: string;
  avatarUrl: string | null;
  followers: number;
  following: number;
  mediaCount: number;
  status: string;
  lastSyncedAt: string | null;
}

export async function getSocialAccounts(): Promise<SocialAccountRow[]> {
  const rows = await sql`
    SELECT id, platform, display_name, avatar_url, followers, following,
           media_count, status, last_synced_at
    FROM social_accounts
    WHERE status = 'active'
    ORDER BY platform ASC
  `;
  return rows.map(r => ({
    id: r.id,
    platform: r.platform,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
    followers: r.followers,
    following: r.following,
    mediaCount: r.media_count,
    status: r.status,
    lastSyncedAt: r.last_synced_at,
  }));
}

export async function getSocialTotalPosts(): Promise<number> {
  const result = await sql`SELECT COUNT(*) as count FROM social_posts`;
  return result[0]?.count ?? 0;
}

// ── Analytics Queries ──

export interface EngagementStats {
  totalImpressions: number;
  totalReach: number;
  totalEngagement: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  totalViews: number;
  avgEngagementRate: number;
}

export async function getSocialEngagementStats(days = 30): Promise<EngagementStats> {
  const rows = await sql`
    SELECT
      COALESCE(SUM(impressions), 0) as total_impressions,
      COALESCE(SUM(reach), 0) as total_reach,
      COALESCE(SUM(likes + comments + shares + saves), 0) as total_engagement,
      COALESCE(SUM(likes), 0) as total_likes,
      COALESCE(SUM(comments), 0) as total_comments,
      COALESCE(SUM(shares), 0) as total_shares,
      COALESCE(SUM(saves), 0) as total_saves,
      COALESCE(SUM(views), 0) as total_views,
      COALESCE(AVG(engagement_rate), 0) as avg_engagement_rate
    FROM content_analytics
    WHERE captured_at >= NOW() - INTERVAL '${days} days'
  `;
  return {
    totalImpressions: Number(rows[0]?.total_impressions ?? 0),
    totalReach: Number(rows[0]?.total_reach ?? 0),
    totalEngagement: Number(rows[0]?.total_engagement ?? 0),
    totalLikes: Number(rows[0]?.total_likes ?? 0),
    totalComments: Number(rows[0]?.total_comments ?? 0),
    totalShares: Number(rows[0]?.total_shares ?? 0),
    totalSaves: Number(rows[0]?.total_saves ?? 0),
    totalViews: Number(rows[0]?.total_views ?? 0),
    avgEngagementRate: Number(rows[0]?.avg_engagement_rate ?? 0),
  };
}

export interface TimeSeriesPoint {
  date: string;
  posts: number;
  engagement: number;
  reach: number;
}

export async function getSocialTimeSeries(days = 30): Promise<TimeSeriesPoint[]> {
  const rows = await sql`
    SELECT
      captured_at::text as date,
      COUNT(*)::int as posts,
      COALESCE(SUM(likes + comments + shares + saves), 0)::int as engagement,
      COALESCE(SUM(reach), 0)::int as reach
    FROM content_analytics
    WHERE captured_at >= NOW() - INTERVAL '${days} days'
    GROUP BY captured_at
    ORDER BY captured_at ASC
  `;
  return rows.map(r => ({
    date: r.date?.split("T")[0] || r.date,
    posts: r.posts,
    engagement: r.engagement,
    reach: r.reach,
  }));
}

export async function getSocialRecentPosts(days = 7): Promise<number> {
  const result = await sql`
    SELECT COUNT(*) as count
    FROM social_posts
    WHERE created_at >= NOW() - INTERVAL '${days} days'
  `;
  return result[0]?.count ?? 0;
}
