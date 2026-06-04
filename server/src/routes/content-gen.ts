import { Elysia, t } from "elysia";
import { dbQuery, dbGet, dbRun, dbInsert } from "../db";
import { getOpenRouterKey, getGeminiKey } from "../lib/helpers";
import { standardLimiter } from "../lib/rate-limit";

// ── AI Content Generation via OpenRouter ──
async function generateAIContent(type: string, prompt: string, tone: string, platform: string, keywords: string[]): Promise<string> {
  const apiKey = getOpenRouterKey();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set. Add it to .env");

  const systemPrompts: Record<string, string> = {
    blog: `You are an expert SEO content writer. Write a well-structured blog post with headings, engaging intro, and clear conclusion. Use markdown formatting. Include the target keywords naturally.`,
    social: `You are a social media expert. Write engaging, platform-optimized social media posts. Use relevant hashtags and emojis. Keep within character limits.`,
    ad: `You are a copywriting expert. Write compelling ad copy with clear CTA. Follow the AIDA framework (Attention, Interest, Desire, Action).`,
    email: `You are an email marketing expert. Write compelling emails with subject line, preview text, and body. Use personalization tokens where appropriate.`,
    product: `You are an e-commerce content expert. Write SEO-optimized product descriptions that drive conversions. Include features, benefits, and social proof elements.`,
  };

  const system = systemPrompts[type] || systemPrompts.blog;

  const platformHints: Record<string, string> = {
    x: "X/Twitter: max 280 chars per tweet. Use threads for longer content.",
    instagram: "Instagram: visual-focused. Use line breaks, emojis, 20-30 hashtags at end.",
    linkedin: "LinkedIn: professional tone. 1,300 char limit for posts. Use hashtags sparingly.",
    tiktok: "TikTok: short, punchy captions. Trend-ready. Max 150 chars caption + hashtags.",
    facebook: "Facebook: conversational, medium length. 1-2 hashtags max.",
    blog: "Blog: long-form, SEO-optimized. 1500-2500 words. Use H2/H3 headings.",
  };

  const toneHints: Record<string, string> = {
    professional: "Professional, authoritative, data-backed",
    casual: "Casual, friendly, conversational",
    witty: "Witty, clever, humorous",
    inspirational: "Inspirational, motivational, uplifting",
    educational: "Educational, informative, step-by-step",
    urgent: "Urgent, action-oriented, FOMO-driven",
  };

  const userPrompt = `${prompt}

Tone: ${toneHints[tone] || tone}
Platform: ${platformHints[platform] || "General"}
${keywords.length > 0 ? `Target keywords: ${keywords.join(", ")}` : ""}

Generate the content now.`;

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://control.ahmedlotfy.site",
      "X-Title": "Mission Control Content Writer",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-preview",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "unknown");
    throw new Error(`OpenRouter API error ${resp.status}: ${errText.slice(0, 300)}`);
  }

  const data = await resp.json() as any;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned no content");
  return content;
}

// ── Routes ──
export const contentGenRoutes = new Elysia({ prefix: "/api/content-gen" })
  .use(standardLimiter)

  // List all AI-generated content
  .get("/", () => {
    try {
      return dbQuery("SELECT * FROM ai_content ORDER BY created_at DESC LIMIT 100");
    } catch (e: any) {
      return { error: e.message };
    }
  })

  // Get single content item
  .get("/:id", ({ params }) => {
    try {
      return dbGet("SELECT * FROM ai_content WHERE id = $1", [Number(params.id)]);
    } catch (e: any) {
      return { error: e.message };
    }
  }, { params: t.Object({ id: t.String() }) })

  // Generate new AI content
  .post("/generate", async ({ body }) => {
    try {
      const generated = await generateAIContent(body.type, body.prompt, body.tone, body.platform, body.keywords || []);
      const wordCount = generated.split(/\s+/).length;
      const now = new Date().toISOString();
      const title = body.title || body.prompt.slice(0, 60);
      const id = dbInsert(
        "INSERT INTO ai_content (type, title, body, prompt, tone, platform, keywords, status, word_count, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9, $10)",
        [body.type, title, generated, body.prompt, body.tone || "professional", body.platform || "", JSON.stringify(body.keywords || []), wordCount, now, now]
      );
      return { id, title, body: generated, type: body.type, tone: body.tone, wordCount, status: "draft" };
    } catch (e: any) {
      return { error: e.message };
    }
  }, {
    body: t.Object({
      type: t.String(),
      prompt: t.String({ minLength: 1 }),
      title: t.Optional(t.String()),
      tone: t.Optional(t.String()),
      platform: t.Optional(t.String()),
      keywords: t.Optional(t.Array(t.String())),
    }),
  })

  // Update content (edit generated content)
  .patch("/:id", ({ params, body }) => {
    try {
      const now = new Date().toISOString();
      const sets: string[] = [];
      const vals: any[] = [];
      let i = 1;
      if (body.title !== undefined) { sets.push(`title = $${i++}`); vals.push(body.title); }
      if (body.body !== undefined) { sets.push(`body = $${i++}`); vals.push(body.body); }
      if (body.status !== undefined) { sets.push(`status = $${i++}`); vals.push(body.status); }
      if (body.body !== undefined) { sets.push(`word_count = $${i++}`); vals.push(body.body.split(/\s+/).length); }
      sets.push(`updated_at = $${i++}`);
      vals.push(now, Number(params.id));
      dbRun(`UPDATE ai_content SET ${sets.join(", ")} WHERE id = $${i}`, vals);
      return { id: Number(params.id), updatedAt: now };
    } catch (e: any) {
      return { error: e.message };
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      title: t.Optional(t.String()),
      body: t.Optional(t.String()),
      status: t.Optional(t.String()),
    }),
  })

  // Delete
  .delete("/:id", ({ params }) => {
    try {
      dbRun("DELETE FROM ai_content WHERE id = $1", [Number(params.id)]);
      return { deleted: true };
    } catch (e: any) {
      return { error: e.message };
    }
  }, { params: t.Object({ id: t.String() }) })

  // ── Calendar Events ──
  .get("/calendar", () => {
    try {
      return dbQuery("SELECT * FROM calendar_events ORDER BY scheduled_at ASC LIMIT 200");
    } catch (e: any) {
      return { error: e.message };
    }
  })

  .post("/calendar", ({ body }) => {
    try {
      const now = new Date().toISOString();
      const id = dbInsert(
        "INSERT INTO calendar_events (title, type, platform, status, scheduled_at, body, image_url, tags, notes, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
        [body.title, body.type || "post", body.platform || "", body.status || "draft", body.scheduledAt || "", body.body || "", body.imageUrl || "", JSON.stringify(body.tags || []), body.notes || "", now, now]
      );
      return { id, ...body };
    } catch (e: any) {
      return { error: e.message };
    }
  }, {
    body: t.Object({
      title: t.String({ minLength: 1 }),
      type: t.Optional(t.String()),
      platform: t.Optional(t.String()),
      status: t.Optional(t.String()),
      scheduledAt: t.Optional(t.String()),
      body: t.Optional(t.String()),
      imageUrl: t.Optional(t.String()),
      tags: t.Optional(t.Array(t.String())),
      notes: t.Optional(t.String()),
    }),
  })

  .patch("/calendar/:id", ({ params, body }) => {
    try {
      const now = new Date().toISOString();
      const sets: string[] = [];
      const vals: any[] = [];
      let i = 1;
      if (body.title !== undefined) { sets.push(`title = $${i++}`); vals.push(body.title); }
      if (body.status !== undefined) { sets.push(`status = $${i++}`); vals.push(body.status); }
      if (body.scheduledAt !== undefined) { sets.push(`scheduled_at = $${i++}`); vals.push(body.scheduledAt); }
      if (body.body !== undefined) { sets.push(`body = $${i++}`); vals.push(body.body); }
      sets.push(`updated_at = $${i++}`);
      vals.push(now, Number(params.id));
      dbRun(`UPDATE calendar_events SET ${sets.join(", ")} WHERE id = $${i}`, vals);
      return { id: Number(params.id), updatedAt: now };
    } catch (e: any) {
      return { error: e.message };
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      title: t.Optional(t.String()),
      status: t.Optional(t.String()),
      scheduledAt: t.Optional(t.String()),
      body: t.Optional(t.String()),
    }),
  })

  .delete("/calendar/:id", ({ params }) => {
    try {
      dbRun("DELETE FROM calendar_events WHERE id = $1", [Number(params.id)]);
      return { deleted: true };
    } catch (e: any) {
      return { error: e.message };
    }
  }, { params: t.Object({ id: t.String() }) })

  // ── Social Media Posts ──
  .get("/social", () => {
    try {
      return dbQuery("SELECT * FROM social_posts ORDER BY created_at DESC LIMIT 100");
    } catch (e: any) {
      return { error: e.message };
    }
  })

  .post("/social", ({ body }) => {
    try {
      const now = new Date().toISOString();
      const id = dbInsert(
        "INSERT INTO social_posts (platform, content, image_url, status, scheduled_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [body.platform, body.content, body.imageUrl || "", body.status || "draft", body.scheduledAt || "", now, now]
      );
      return { id, ...body };
    } catch (e: any) {
      return { error: e.message };
    }
  }, {
    body: t.Object({
      platform: t.String(),
      content: t.String({ minLength: 1 }),
      imageUrl: t.Optional(t.String()),
      status: t.Optional(t.String()),
      scheduledAt: t.Optional(t.String()),
    }),
  })

  .patch("/social/:id", ({ params, body }) => {
    try {
      const now = new Date().toISOString();
      const sets: string[] = [];
      const vals: any[] = [];
      let i = 1;
      if (body.content !== undefined) { sets.push(`content = $${i++}`); vals.push(body.content); }
      if (body.status !== undefined) { sets.push(`status = $${i++}`); vals.push(body.status); }
      if (body.scheduledAt !== undefined) { sets.push(`scheduled_at = $${i++}`); vals.push(body.scheduledAt); }
      sets.push(`updated_at = $${i++}`);
      vals.push(now, Number(params.id));
      dbRun(`UPDATE social_posts SET ${sets.join(", ")} WHERE id = $${i}`, vals);
      return { id: Number(params.id), updatedAt: now };
    } catch (e: any) {
      return { error: e.message };
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      content: t.Optional(t.String()),
      status: t.Optional(t.String()),
      scheduledAt: t.Optional(t.String()),
    }),
  })

  .delete("/social/:id", ({ params }) => {
    try {
      dbRun("DELETE FROM social_posts WHERE id = $1", [Number(params.id)]);
      return { deleted: true };
    } catch (e: any) {
      return { error: e.message };
    }
  }, { params: t.Object({ id: t.String() }) })

  // ── Analytics ──
  .get("/analytics", () => {
    try {
      // Return aggregated analytics from various sources
      const contentCount = (dbGet("SELECT COUNT(*) as c FROM ai_content") as any)?.c || 0;
      const calendarCount = (dbGet("SELECT COUNT(*) as c FROM calendar_events") as any)?.c || 0;
      const socialCount = (dbGet("SELECT COUNT(*) as c FROM social_posts") as any)?.c || 0;
      const publishedSocial = (dbGet("SELECT COUNT(*) as c FROM social_posts WHERE status = 'published'") as any)?.c || 0;
      const draftContent = (dbGet("SELECT COUNT(*) as c FROM ai_content WHERE status = 'draft'") as any)?.c || 0;
      const publishedContent = (dbGet("SELECT COUNT(*) as c FROM ai_content WHERE status = 'published'") as any)?.c || 0;

      // Content by type
      const byType = dbQuery("SELECT type, COUNT(*) as count FROM ai_content GROUP BY type") as any[];
      // Posts by platform
      const byPlatform = dbQuery("SELECT platform, COUNT(*) as count FROM social_posts GROUP BY platform") as any[];
      // Recent activity (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const recentContent = (dbGet("SELECT COUNT(*) as c FROM ai_content WHERE created_at > $1", [weekAgo]) as any)?.c || 0;
      const recentPosts = (dbGet("SELECT COUNT(*) as c FROM social_posts WHERE created_at > $1", [weekAgo]) as any)?.c || 0;
      // Word count stats
      const totalWords = (dbGet("SELECT SUM(word_count) as s FROM ai_content") as any)?.s || 0;
      const avgWords = (dbGet("SELECT AVG(word_count) as a FROM ai_content WHERE word_count > 0") as any)?.a || 0;

      return {
        overview: {
          contentItems: contentCount,
          calendarEvents: calendarCount,
          socialPosts: socialCount,
          publishedSocial,
          draftContent,
          publishedContent,
          totalWords,
          avgWords: Math.round(avgWords),
        },
        byType,
        byPlatform,
        recentActivity: {
          contentThisWeek: recentContent,
          postsThisWeek: recentPosts,
        },
        // Simulated time-series for chart (use real data if available)
        timeseries: generateTimeSeries(),
      };
    } catch (e: any) {
      return { error: e.message };
    }
  });

// Generate a realistic-looking time series for the past 30 days
function generateTimeSeries() {
  const days = [];
  const now = Date.now();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseContent = isWeekend ? 1 : 3;
    const baseEngagement = isWeekend ? 15 : 45;
    days.push({
      date: d.toISOString().split("T")[0],
      content: baseContent + Math.floor(Math.random() * 3),
      posts: Math.floor(Math.random() * 4),
      engagement: baseEngagement + Math.floor(Math.random() * 30),
      reach: (baseEngagement + Math.floor(Math.random() * 30)) * (8 + Math.floor(Math.random() * 5)),
    });
  }
  return days;
}
