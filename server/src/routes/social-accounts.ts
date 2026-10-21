import { Elysia } from "elysia";
import {
  getSocialAccounts,
  getSocialTotalPosts,
  getSocialEngagementStats,
  getSocialRecentPosts,
} from "../lib/social-db";

export const socialAccountsRoutes = new Elysia({ prefix: "/api/social-accounts" })

  // Get all connected social accounts with real metrics
  .get("", async () => {
    try {
      const [accounts, totalPosts, stats, recentPosts] = await Promise.all([
        getSocialAccounts(),
        getSocialTotalPosts(),
        getSocialEngagementStats(30),
        getSocialRecentPosts(7),
      ]);

      return {
        accounts,
        totalPosts,
        stats: {
          totalImpressions: stats.totalImpressions,
          totalReach: stats.totalReach,
          totalEngagement: stats.totalEngagement,
          totalLikes: stats.totalLikes,
          totalComments: stats.totalComments,
          totalShares: stats.totalShares,
          avgEngagementRate: stats.avgEngagementRate,
        },
        recentPosts,
      };
    } catch (e: any) {
      console.error("[social-accounts] Error:", e.message);
      return { accounts: [], totalPosts: 0, stats: null, recentPosts: 0 };
    }
  });
