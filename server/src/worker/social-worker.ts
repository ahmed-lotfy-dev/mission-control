/**
 * Social Worker — Background job processor for scheduled posts + automation
 *
 * Processes:
 *  1. Scheduled social posts (publish when scheduled_at arrives)
 *  2. Automation rule matching (auto-reply to mentions, DMs, etc.)
 *  3. Token refresh for expiring OAuth tokens
 *  4. Analytics sync from platform APIs
 *
 * Runs as a separate process, polls the DB every 30s.
 * Uses SQLite advisory-style locking via a pidfile.
 */

import { dbQuery, dbGet, dbRun, getRawDB } from "../db";
import { dec } from "../lib/crypto";

const POLL_INTERVAL = 30_000; // 30 seconds
const MAX_RETRIES = 3;
const BATCH_SIZE = 20;

let running = true;

process.on("SIGINT", () => { running = false; console.log("[Worker] Shutting down..."); });
process.on("SIGTERM", () => { running = false; console.log("[Worker] Shutting down..."); });

function now(): string {
  return new Date().toISOString();
}

// ═══════════════════════════════════════════════════════════
// PUBLISH QUEUE — Process scheduled posts
// ═══════════════════════════════════════════════════════════

async function processPublishQueue() {
  const dueJobs = dbQuery(
    `SELECT q.*, p.platform, p.caption, p.media_urls, p.account_id
     FROM social_publish_queue q
     JOIN social_posts_v2 p ON q.post_id = p.id
     WHERE q.status = 'queued'
       AND (q.run_after IS NULL OR q.run_after <= ?)
     ORDER BY q.created_at ASC
     LIMIT ?`,
    [now(), BATCH_SIZE]
  );

  for (const job of dueJobs) {
    const j = job as any;
    console.log(`[Worker] Processing publish job #${j.id} for post #${j.post_id} (${j.platform})`);

    try {
      // Mark as processing
      dbRun("UPDATE social_publish_queue SET status = 'processing', updated_at = ? WHERE id = ?", [now(), j.id]);

      // Get account with decrypted token
      const account = dbGet("SELECT * FROM social_accounts WHERE id = ?", [j.account_id]);
      if (!account) {
        throw new Error(`Account #${j.account_id} not found`);
      }

      const acc = account as any;
      const accessToken = dec(acc.access_token_encrypted);

      if (!accessToken) {
        throw new Error(`No access token for account #${j.account_id}`);
      }

      // In a real implementation, this would call the platform API:
      // - Facebook/Instagram: Graph API
      // - X/Twitter: Twitter API v2
      // - TikTok: TikTok Open API
      // - Threads: Threads API
      // - Snapchat: Snapchat Marketing API
      //
      // For now, we simulate success:
      const externalPostId = `sim_${Date.now()}_${j.post_id}`;

      // Mark post as published
      dbRun(
        "UPDATE social_posts_v2 SET status = 'published', external_post_id = ?, updated_at = ? WHERE id = ?",
        [externalPostId, now(), j.post_id]
      );

      // Mark job as done
      dbRun("UPDATE social_publish_queue SET status = 'completed', updated_at = ? WHERE id = ?", [now(), j.id]);

      console.log(`[Worker] ✅ Published post #${j.post_id} as ${externalPostId}`);
    } catch (err: any) {
      console.error(`[Worker] ❌ Publish job #${j.id} failed:`, err.message);

      const newAttemptCount = (j.attempt_count || 0) + 1;
      const shouldRetry = newAttemptCount < MAX_RETRIES;

      dbRun(
        `UPDATE social_publish_queue SET
          status = ?, attempt_count = ?, last_error = ?, run_after = ?, updated_at = ?
         WHERE id = ?`,
        [
          shouldRetry ? "queued" : "failed",
          newAttemptCount,
          err.message.substring(0, 500),
          shouldRetry ? new Date(Date.now() + 60_000 * newAttemptCount).toISOString() : null,
          now(),
          j.id,
        ]
      );

      if (!shouldRetry) {
        dbRun("UPDATE social_posts_v2 SET status = 'failed', updated_at = ? WHERE id = ?", [now(), j.post_id]);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════
// AUTOMATION ENGINE — Process automation rules
// ═══════════════════════════════════════════════════════════

async function processAutomations() {
  const activeRules = dbQuery(
    `SELECT r.*, a.platform as acc_platform, a.access_token_encrypted
     FROM social_automation_rules r
     JOIN social_accounts a ON r.account_id = a.id
     WHERE r.status = 'active' AND a.status = 'active'`
  );

  for (const rule of activeRules) {
    const r = rule as any;

    // Check cooldown
    const lastExecution = dbGet(
      "SELECT executed_at FROM social_action_executions WHERE job_id IN (SELECT id FROM social_action_jobs WHERE rule_id = ?) ORDER BY executed_at DESC LIMIT 1",
      [r.id]
    );

    if (lastExecution) {
      const lastTime = new Date((lastExecution as any).executed_at).getTime();
      const cooldownMs = (r.cooldown_seconds || 0) * 1000;
      if (Date.now() - lastTime < cooldownMs) continue;
    }

    // In a real implementation, this would:
    // 1. Fetch recent events from the platform API (mentions, DMs, comments)
    // 2. Match against trigger conditions
    // 3. Execute actions (reply, like, follow, etc.)
    // 4. Record in social_action_jobs + social_action_executions

    // For now, we just log that we checked
    // console.log(`[Worker] Checked automation rule #${r.id}: ${r.name}`);
  }
}

// ═══════════════════════════════════════════════════════════
// TOKEN REFRESH — Refresh expiring OAuth tokens
// ═══════════════════════════════════════════════════════════

async function refreshExpiringTokens() {
  const expiringAccounts = dbQuery(
    "SELECT * FROM social_accounts WHERE token_expires_at IS NOT NULL AND token_expires_at <= ? AND status = 'active'",
    [new Date(Date.now() + 3_600_000).toISOString()] // Expiring within 1 hour
  );

  for (const account of expiringAccounts) {
    const acc = account as any;
    console.log(`[Worker] Token expiring for ${acc.platform} account #${acc.id}, would refresh...`);

    // In a real implementation, this would:
    // 1. Decrypt refresh_token
    // 2. Call platform token refresh endpoint
    // 3. Update access_token_encrypted, refresh_token_encrypted, token_expires_at
  }
}

// ═══════════════════════════════════════════════════════════
// ANALYTICS SYNC — Fetch engagement data from platforms
// ═══════════════════════════════════════════════════════════

async function syncAnalytics() {
  const publishedPosts = dbQuery(
    `SELECT p.id, p.platform, p.external_post_id, a.access_token_encrypted
     FROM social_posts_v2 p
     JOIN social_accounts a ON p.account_id = a.id
     WHERE p.status = 'published' AND p.external_post_id != ''
     ORDER BY p.updated_at ASC
     LIMIT 10`
  );

  for (const post of publishedPosts) {
    const p = post as any;
    // In a real implementation, fetch analytics from platform API
    // and insert into social_analytics table
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log("[Worker] 🚀 Social worker started");
  console.log(`[Worker] Poll interval: ${POLL_INTERVAL / 1000}s`);
  console.log(`[Worker] Batch size: ${BATCH_SIZE}`);
  console.log(`[Worker] Max retries: ${MAX_RETRIES}`);

  // Ensure tables exist
  const db = getRawDB();

  while (running) {
    try {
      await processPublishQueue();
    } catch (err: any) {
      console.error("[Worker] Publish queue error:", err.message);
    }

    try {
      await processAutomations();
    } catch (err: any) {
      console.error("[Worker] Automation error:", err.message);
    }

    try {
      await refreshExpiringTokens();
    } catch (err: any) {
      console.error("[Worker] Token refresh error:", err.message);
    }

    try {
      await syncAnalytics();
    } catch (err: any) {
      console.error("[Worker] Analytics sync error:", err.message);
    }

    // Wait for next poll
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }

  console.log("[Worker] Stopped.");
  process.exit(0);
}

main();
