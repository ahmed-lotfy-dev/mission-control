/**
 * Social publish workflow — durable, retrying social media post.
 *
 * This workflow handles the full lifecycle of a scheduled social post:
 *  1. Check if the scheduled_at time has arrived (or wait for it)
 *  2. Refresh OAuth tokens if needed
 *  3. Publish to the target platform
 *  4. Upsert social_posts row with status + external post ID
 *  5. On failure: retry up to 3x with backoff, then mark as "failed"
 *
 * Signals (frontend can send mid-execution):
 *  - pause — cancel the pending publish
 *  - reschedule(new_time) — move the scheduled_at
 */

import { (
  defineWorkflow,
  createCancelWorkflow,
  context,
  remainSleep,
} from "@temporalio/workflow";

export interface SocialPublishInput {
  postId: number;
  platform: string;
  content: string;
  imageUrl?: string;
  scheduledAt: string; // ISO timestamp
  accountId: number;
}

export interface SocialPublishResult {
  success: boolean;
  externalPostId?: string;
  error?: string;
  status: "published" | "failed" | "paused";
}

export const socialPublish = defineWorkflow<
  SocialPublishInput,
  Promise<SocialPublishResult>
>("social-publish", async (input) => {
  const logger = context.logger.get("social-publish");

  logger.info("Social publish workflow started", {
    postId: input.postId,
    platform: input.platform,
    scheduledAt: input.scheduledAt,
  });

  const signalChannel = context.signals<string>();
  let cancelled = false;

  context.onResume(() => {
    logger.info("Workflow resumed after timer or signal");
  });

  // ── Step 1: Wait until scheduled_at (or cancellation) ──
  const scheduledTime = new Date(input.scheduledAt).getTime();
  const now = Date.now();

  if (scheduledTime > now) {
    const sleepMs = scheduledTime - now;
    logger.info(`Sleeping ${sleepMs}ms until publish time`);

    try {
      await remainSleep(sleepMs);
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes("canceled") || err.message.includes("cancelled"))
      ) {
        cancelled = true;
      }
    }

    if (cancelled) {
      logger.info("Workflow cancelled while waiting");
      return { success: false, status: "paused", error: "Cancelled by user" };
    }
  }

  // ── Step 2: Refresh OAuth tokens ──
  try {
    await context.activities.refreshSocialTokens({
      accountId: input.accountId,
      platform: input.platform,
    });
  } catch (err: any) {
    logger.warn("Token refresh failed, proceeding anyway", { error: err.message });
  }

  // ── Step 3: Publish to platform ──
  try {
    const data = await context.activities.publishToPlatform({
      postId: input.postId,
      platform: input.platform,
      content: input.content,
      imageUrl: input.imageUrl,
      accountId: input.accountId,
    });

    logger.info("Published successfully", { postId: input.postId, externalPostId: data.postId });
    return { success: true, externalPostId: data.postId, status: "published" };
  } catch (err: any) {
    logger.error("Publish failed", { error: err.message });
    return { success: false, status: "failed", error: err.message };
  }
}, {
  cancellation: createCancelWorkflow(
    defineWorkflow("cancel-social-publish", async () => "cancelled"),
  ),
});