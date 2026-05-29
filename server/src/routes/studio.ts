import { Elysia, t } from "elysia";
import { mkdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { homedir } from "node:os";
import { spawn, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { getNvidiaKey, getOpenRouterKey, getGeminiKey, getCloudflareAccountId, getCloudflareApiToken, formatSize, getMime, listRecentAssets } from "../lib/helpers";
import { uploadToR2, isR2Configured } from "../lib/r2";
import { db } from "../db";
import { standardLimiter } from "../lib/rate-limit";

const OUTPUT_DIR = join(homedir(), "agent-outputs");
const NVIDIA_KEY = getNvidiaKey();
const OPENROUTER_KEY = getOpenRouterKey();
const GEMINI_KEY = getGeminiKey();
const CF_ACCOUNT_ID = getCloudflareAccountId();
const CF_API_TOKEN = getCloudflareApiToken();
const R2_ENABLED = isR2Configured();

// ── Model Status ──
// NVIDIA's hosted images/generations API endpoint has been deprecated (404).
// Only chat completions work on the integrate.api.nvidia.com/v1/ path.
// Image generation falls back to ImageMagick (`magick`) which is installed locally.
// For future real AI image gen, options: ComfyUI (local), OpenRouter API, or local GGUF models.
// ── Image Models ──
// Local: ImageMagick (always available, no API key)
// AI: OpenRouter /v1/images/generations (SDXL, Flux, Playground v2.5, etc.)
// Set OPENROUTER_API_KEY in .env to enable AI image generation.

export interface ImageModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  speed: "fast" | "medium" | "slow";
  status: "available" | "deprecated" | "external";
  recommendedFor: string;
  needsAuth?: boolean;
  free?: boolean;
}

// All possible models — filtered at runtime based on which API keys are configured
const ALL_IMAGE_MODELS: ImageModel[] = [
  {
    id: "imagemagick", name: "ImageMagick", provider: "Local",
    description: "Built-in image generation via ImageMagick — no API key needed. Works offline.",
    speed: "fast", status: "available", recommendedFor: "Always available, quick mockups",
  },
  {
    id: "openrouter/openai/gpt-5-image-mini", name: "GPT-5 Image Mini", provider: "OpenRouter",
    description: "OpenAI GPT-5 Image Mini via OpenRouter. Fast, good quality image generation.",
    speed: "fast", status: "available", needsAuth: true, recommendedFor: "Fast, affordable image gen",
  },
  {
    id: "openrouter/google/gemini-2.5-flash-image", name: "Gemini 2.5 Flash Image", provider: "OpenRouter",
    description: "Google Gemini 2.5 Flash Image via OpenRouter. Good quality, fast generation.",
    speed: "fast", status: "available", needsAuth: true, recommendedFor: "Balanced speed and quality",
  },
  {
    id: "openrouter/google/gemini-2.5-flash-image", name: "Gemini 2.5 Flash Image", provider: "OpenRouter",
    description: "Google Gemini 2.5 Flash Image via OpenRouter. Good quality, fast generation.",
    speed: "fast", status: "available", needsAuth: true, recommendedFor: "Balanced speed and quality",
  },

  {
    id: "@cf/black-forest-labs/flux-1-schnell", name: "FLUX.1 Schnell", provider: "Cloudflare",
    description: "Fast image generation via Cloudflare Workers AI. Free daily quota.",
    speed: "fast", status: "available", needsAuth: true, free: true, recommendedFor: "Fast generation, free tier",
  },
  {
    id: "@cf/stabilityai/stable-diffusion-xl-base-1.0", name: "SDXL 1.0", provider: "Cloudflare",
    description: "Stable Diffusion XL via Cloudflare Workers AI. Free daily quota.",
    speed: "fast", status: "available", needsAuth: true, free: true, recommendedFor: "General purpose, free tier",
  },
];

// Filter models based on which API keys are actually configured at runtime
export function getAvailableImageModels(): ImageModel[] {
  return ALL_IMAGE_MODELS.filter(m => {
    if (!m.needsAuth) return true;
    if (m.provider === "OpenRouter") return !!OPENROUTER_KEY;
    if (m.provider === "Google") return !!GEMINI_KEY;
    if (m.provider === "Cloudflare") return !!CF_ACCOUNT_ID && !!CF_API_TOKEN;
    if (m.provider === "Nvidia") return !!NVIDIA_KEY;
    return false;
  });
}

export interface VideoModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  status: "active" | "preview" | "coming_soon";
}

export const VIDEO_MODELS: VideoModel[] = [
  { id: "nvidia/cosmos-predict1", name: "Cosmos Predict1", provider: "NVIDIA", description: "World model for video prediction — requires NVIDIA API authorization", status: "preview" },
];

// ── Ensure subdirectories ──
async function ensureDirs() {
  for (const dir of ["audio", "images", "videos", "documents"]) {
    await mkdir(join(OUTPUT_DIR, dir), { recursive: true });
  }
}

// ── Generate meaningful filename from prompt ──
// Takes first 5 meaningful words, cleans them, creates slug like "sunset-mountain-lake"
function slugifyPrompt(prompt: string, maxWords: number = 5): string {
  const stopWords = new Set(["a", "an", "the", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "shall", "can", "need", "dare", "ought", "used", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "out", "off", "over", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "each", "every", "both", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "just", "because", "but", "and", "or", "if", "while", "although", "though", "that", "this", "these", "those", "it", "its", "i", "me", "my", "we", "our", "you", "your", "he", "him", "his", "she", "her", "they", "them", "their", "what", "which", "who", "whom", "image", "picture", "photo", "drawing", "painting", "art", "style", "make", "create", "generate", "show", "with", "without", "high", "quality", "detailed", "realistic", "hd", "4k", "8k", "resolution"]);
  const words = prompt
    .replace(/[^a-zA-Z0-9\u0600-\u06FF ]/g, "")
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 1 && !stopWords.has(w.toLowerCase()))
    .slice(0, maxWords);
  return words.join("-").toLowerCase().slice(0, 50) || "generated-image";
}

// ── TTS via edge-tts ──
async function generateTTS(text: string, voice: string): Promise<string> {
  const hash = createHash("md5").update(text + voice).digest("hex").slice(0, 8);
  const slug = text.replace(/[^a-zA-Z0-9_\u0600-\u06FF ]/g, "").trim().slice(0, 40).replace(/\s+/g, "-");
  const filename = `tts-${slug || "speech"}-${hash}.mp3`;
  const outputPath = join(OUTPUT_DIR, "audio", filename);
  await ensureDirs();

  return new Promise((resolve, reject) => {
    const proc = spawn("edge-tts", ["--voice", voice, "--text", text, "--write-media", outputPath], { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });
    proc.on("close", (code) => code === 0 ? resolve(outputPath) : reject(new Error(`edge-tts exited ${code}: ${stderr.slice(0, 300)}`)));
    proc.on("error", reject);
  });
}

// ── Image via ImageMagick (local, always works) ──
async function generateImageLocal(
  prompt: string,
  width: number = 1024,
  height: number = 768,
  count: number = 1,
): Promise<string[]> {
  await ensureDirs();
  const outputPaths: string[] = [];

  for (let i = 0; i < count; i++) {
    const promptSlug = slugifyPrompt(prompt);
    const filename = "img-" + promptSlug + "-magick-" + (i + 1) + ".png";
    const outputPath = join(OUTPUT_DIR, "images", filename);

    const label = prompt.replace(/'/g, "'\\''").slice(0, 80);

    // Generate a gradient background with the prompt text overlaid
    // Uses ImageMagick 7's `magick` command
    const palette = [
      '"#1a1a2e,#16213e,#0f3460"',  // Deep ocean
      '"#2d1b2e,#1a0a1e,#3d2b4e"',  // Dark violet
      '"#1b2e1a,#0e1a0d,#2e4e2b"',  // Dark forest
      '"#2e1a1a,#1a0d0d,#4e2b2b"',  // Dark rust
    ];
    const gradient = palette[i % palette.length];

    try {
      execSync(
        `magick -size ${width}x${height} gradient:${gradient} -gravity center \\`
        + ` \\( -size ${Math.round(width * 0.9)}x${Math.round(height * 0.6)} -background none -fill "#e8dcc8" -font Helvetica -pointsize 22 caption:"${label}" -trim \\) -composite \\`
        + ` -font Helvetica -pointsize 12 -fill "#8b8b7a" -gravity southeast -annotate +20+15 "Generated by Mission Control Studio — ImageMagick" \\`
        + ` "${outputPath}"`,
        { timeout: 15000 }
      );
      outputPaths.push(outputPath);
    } catch (e: any) {
      // Fallback: simpler image if caption fails
      execSync(
        `magick -size ${width}x${height} gradient:"#1a1a2e-#0f3460" -font Helvetica -pointsize 24 -fill "#c9a84c" -gravity center -annotate 0 "${label.slice(0, 40)}" "${outputPath}"`,
        { timeout: 10000 }
      );
      outputPaths.push(outputPath);
    }
  }

  return outputPaths;
}

// ── Image via Google AI Studio (Imagen API) ──
async function generateImageGoogle(prompt: string, model: string, count: number): Promise<string[]> {
  if (!GEMINI_KEY) throw new Error("Missing GEMINI_API_TOKEN");
  await ensureDirs();
  const results: string[] = [];
  const modelId = model.replace("google/", "");
  for (let i = 0; i < count; i++) {
    const resp = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + modelId + ":predict?key=" + GEMINI_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instances: [{ content: prompt }] }),
        signal: AbortSignal.timeout(120_000),
      }
    );
    if (!resp.ok) {
      const e = await resp.text().catch(() => "unknown");
      throw new Error("Google AI Studio API error " + resp.status + ": " + e.slice(0, 500));
    }
    const data = (await resp.json()) as any;
    const predictions = data?.predictions;
    if (!predictions || !predictions.length) {
      throw new Error("Google AI Studio returned no image: " + JSON.stringify(data).slice(0, 500));
    }
    for (let j = 0; j < predictions.length; j++) {
      const base64 = predictions[j]?.bytesBase64Encoded;
      if (!base64) continue;
      const promptSlug = slugifyPrompt(prompt);
      const modelSlug = modelId.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
      const filename = "img-" + promptSlug + "-" + modelSlug + "-" + (i + 1) + ".png";
      const outputPath = join(OUTPUT_DIR, "images", filename);
      await writeFile(outputPath, Buffer.from(base64, "base64"));
      backupToR2(outputPath, filename);
      results.push(outputPath);
    }
  }
  return results;
}

// ── Image via Nvidia NIM (Qwen Image) ──
async function generateImageNvidiaNIM(prompt: string, model: string, width: number, height: number, count: number): Promise<string[]> {
  if (!NVIDIA_KEY) throw new Error("Missing NVIDIA_API_KEY from build.nvidia.com");
  await ensureDirs();
  const results: string[] = [];
  for (let i = 0; i < count; i++) {
    const resp = await fetch(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": "Bearer " + NVIDIA_KEY,
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 4096,
        }),
        signal: AbortSignal.timeout(120_000),
      }
    );
    if (!resp.ok) {
      const e = await resp.text().catch(() => "unknown");
      throw new Error("Nvidia NIM API error " + resp.status + ": " + e.slice(0, 300));
    }
    const data = (await resp.json()) as any;
    const imgUrl = data?.choices?.[0]?.message?.content;
    if (!imgUrl) throw new Error("Nvidia NIM returned no image URL: " + JSON.stringify(data).slice(0, 300));
    const imgResp = await fetch(imgUrl, { signal: AbortSignal.timeout(60_000) });
    const buf = Buffer.from(await imgResp.arrayBuffer());
    const promptSlug = slugifyPrompt(prompt);
    const modelSlug = model.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    const filename = "img-" + promptSlug + "-" + modelSlug + "-" + (i + 1) + ".png";
    const outputPath = join(OUTPUT_DIR, "images", filename);
    await writeFile(outputPath, buf);
    backupToR2(outputPath, filename);
    results.push(outputPath);
  }
  return results;
}

// ── Image via Cloudflare Workers AI ──
async function generateImageCloudflare(prompt: string, model: string, count: number): Promise<string[]> {
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) throw new Error("Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN");
  await ensureDirs();
  const results: string[] = [];
  for (let i = 0; i < count; i++) {
    const resp = await fetch(
      "https://api.cloudflare.com/client/v4/accounts/" + CF_ACCOUNT_ID + "/ai/run/" + model,
      {
        method: "POST",
        headers: { Authorization: "Bearer " + CF_API_TOKEN },
        body: JSON.stringify({ prompt }),
        signal: AbortSignal.timeout(120_000),
      }
    );
    if (!resp.ok) {
      const e = await resp.text().catch(() => "unknown");
      throw new Error("Cloudflare AI error " + resp.status + ": " + e.slice(0, 300));
    }
    const contentType = resp.headers.get("content-type") || "";
    let buffer: Buffer;
    if (contentType.startsWith("image/")) {
      // SDXL and some models return raw image binary
      buffer = Buffer.from(await resp.arrayBuffer());
    } else {
      // JSON response with base64 image
      const res = (await resp.json()) as any;
      const imageBase64 = res?.result?.image;
      if (!imageBase64) throw new Error("Cloudflare AI returned no image: " + JSON.stringify(res).slice(0, 300));
      buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
    }
    const promptSlug = slugifyPrompt(prompt);
    const modelSlug = model.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    const filename = "img-" + promptSlug + "-" + modelSlug + "-" + (i + 1) + ".png";
    const outputPath = join(OUTPUT_DIR, "images", filename);
    await writeFile(outputPath, buffer);
    const fname = outputPath.split("/").pop() || "image.png";
    backupToR2(outputPath, fname);
    results.push(outputPath);
  }
  return results;
}

async function generateImageOpenRouter(
  prompt: string,
  model: string,
  width: number = 1024,
  height: number = 1024,
  count: number = 1,
  negativePrompt?: string,
): Promise<string[]> {
  if (!OPENROUTER_KEY) {
    throw new Error("OPENROUTER_API_KEY not set. Add it to .env or ~/.hermes/.env");
  }

  await ensureDirs();
  const outputPaths: string[] = [];

  const results: string[] = [];

  for (let i = 0; i < count; i++) {
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://control.ahmedlotfy.site",
        "X-Title": "Mission Control Studio",
      },
      body: JSON.stringify({
        model: model.replace("openrouter/", ""),
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "unknown error");
      throw new Error(`OpenRouter API error ${resp.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await resp.json()) as any;
    const imageUrl = data?.choices?.[0]?.message?.content;

    if (!imageUrl || typeof imageUrl !== "string") {
      throw new Error(`OpenRouter returned no image URL. Response: ${JSON.stringify(data).slice(0, 300)}`);
    }

    const promptSlug = slugifyPrompt(prompt);
    const modelSlug = model.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    const filename = "img-" + promptSlug + "-" + modelSlug + "-" + (i + 1) + ".png";
    const outputPath = join(OUTPUT_DIR, "images", filename);

    const imgResp = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
    const buffer = Buffer.from(await imgResp.arrayBuffer());
    await writeFile(outputPath, buffer);
    const fname = outputPath.split("/").pop() || "image.png";
    backupToR2(outputPath, fname);
    results.push(outputPath);
  }

  return results;
}

// ── Track in content_assets ──
function trackAsset(type: string, title: string, prompt: string, filePath: string, status: string, metadata: Record<string, any> = {}) {
  const now = new Date().toISOString();
  db.run(
    "INSERT INTO content_assets (type, title, prompt, file_path, status, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [type, title.slice(0, 60), prompt, filePath, status, JSON.stringify(metadata), now, now]
  );
}

// ── Routes ──

export const studioRoutes = new Elysia({ prefix: "/api/studio" })
  .use(standardLimiter)

  // ── List available models ──
  .get("/models", () => ({
    image: getAvailableImageModels(),
    video: VIDEO_MODELS,
    note: "NVIDIA hosted images/generations API deprecated. Using ImageMagick for local generation. For AI image gen, setup ComfyUI or use OpenRouter.",
  }))

  // ── TTS ──
  .post("/tts", async ({ body }) => {
    try {
      const audioPath = await generateTTS(body.text, body.voice ?? "en-US-GuyNeural");
      const rel = audioPath.replace(OUTPUT_DIR, "").replace(/^\//, "");
      trackAsset("audio", body.text, body.text, audioPath, "done", { voice: body.voice, provider: "edge-tts" });
      return { status: "done", file: audioPath, filename: audioPath.split("/").pop(), serveUrl: `/api/serve/${rel}` };
    } catch (e: any) {
      return { status: "error", error: e.message };
    }
  }, { body: t.Object({ text: t.String({ minLength: 1, maxLength: 5000 }), voice: t.Optional(t.String()) }) })

  // ── Image ──
  .post("/image", async ({ body }) => {
    try {
      const numImages = body.numImages || 1;
      const model = body.model || "imagemagick";
      const isAiModel = model !== "imagemagick";

      let outputPaths: string[];
      let method: string;

      if (model === "imagemagick" || model === "local") {
        outputPaths = await generateImageLocal(body.prompt, body.width, body.height, numImages);
        method = "imagemagick";
      } else if (model.startsWith("google/")) {
        outputPaths = await generateImageGoogle(body.prompt, model, numImages);
        method = "google/" + model;
      } else if (model.startsWith("@cf/")) {
        outputPaths = await generateImageCloudflare(body.prompt, model, numImages);
        method = "cloudflare/" + model;
      } else if (model.startsWith("qwen/") || model.startsWith("nvidia/")) {
        outputPaths = await generateImageNvidiaNIM(body.prompt, model, body.width, body.height, numImages);
        method = "nvidia/" + model;
      } else {
        outputPaths = await generateImageOpenRouter(body.prompt, model, body.width, body.height, numImages, body.negativePrompt);
        method = "openrouter/" + model;
      }

      const results = outputPaths.map((p) => {
        const rel = p.replace(OUTPUT_DIR, "").replace(/^\//, "");
        trackAsset("image", body.prompt, body.prompt, p, "done", { method, model, width: body.width, height: body.height });
        return {
          file: p,
          filename: p.split("/").pop(),
          serveUrl: `/api/serve/${rel}`,
        };
      });

      return { status: "done", images: results, count: results.length, method };
    } catch (e: any) {
      return { status: "error", error: e.message };
    }
  }, {
    body: t.Object({
      prompt: t.String({ minLength: 1, maxLength: 4000 }),
      model: t.Optional(t.String()),
      numImages: t.Optional(t.Number()),
      width: t.Optional(t.Number()),
      height: t.Optional(t.Number()),
      negativePrompt: t.Optional(t.String()),
    }),
  })

  // ── Video generation ──
  .post("/video", async ({ body }) => {
    try {
      const hash = createHash("md5").update(body.prompt).digest("hex").slice(0, 8);
      const filename = `vid-${hash}.mp4`;
      const outputPath = join(OUTPUT_DIR, "videos", filename);
      await ensureDirs();

      // Try NVIDIA Cosmos via NVCF — requires authorization
      let videoGenerated = false;
      if (NVIDIA_KEY) {
        try {
          const resp = await fetch("https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/eef816a3-3940-413b-93c9-513ae29f34f9", {
            method: "POST",
            headers: { Authorization: `Bearer ${NVIDIA_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: body.prompt }),
            signal: AbortSignal.timeout(60000),
          });
          if (resp.ok) {
            const data = await resp.json() as any;
            const videoUrl = data?.video?.url || data?.data?.[0]?.url;
            if (videoUrl) {
              const vidResp = await fetch(videoUrl);
              const buffer = await vidResp.arrayBuffer();
              await writeFile(outputPath, Buffer.from(buffer));
              videoGenerated = true;
            }
          }
        } catch { /* fall through */ }
      }

      if (!videoGenerated) {
        await writeFile(outputPath.replace(".mp4", ".txt"),
          `Mission Control Video Generation — Placeholder\n\n` +
          `Prompt: ${body.prompt}\n` +
          `Requested: ${new Date().toISOString()}\n\n` +
          `Video generation requires:\n` +
          `- NVIDIA Cosmos NIM authorization (api.nvcf.nvidia.com)\n` +
          `- Or local setup: ComfyUI + video diffusion workflow\n`
        );
      }

      trackAsset("video", body.prompt, body.prompt, outputPath, videoGenerated ? "done" : "pending", {
        generated: videoGenerated,
      });

      return {
        status: videoGenerated ? "done" : "pending",
        file: outputPath,
        filename,
        serveUrl: videoGenerated ? `/api/serve/videos/${filename}` : null,
        message: videoGenerated ? "Video generated!" : "Placeholder created — real video needs NVCF authorization",
      };
    } catch (e: any) {
      return { status: "error", error: e.message };
    }
  }, {
    body: t.Object({
      prompt: t.String({ minLength: 1, maxLength: 4000 }),
      duration: t.Optional(t.Number()),
    }),
  })

  // ── Voices ──
  .get("/voices", async () => {
    try {
      const result = execSync("edge-tts --list-voices", { timeout: 10000, encoding: "utf-8" });
      const lines = result.trim().split("\n");
      const voices = lines.slice(1).map((line) => {
        const parts = line.trim().split(/\s+/);
        return { name: parts[0] || "", gender: parts[1] || "", locale: parts[0]?.split("-").slice(0, 2).join("-") || "" };
      }).filter((v) => v.name);
      return { voices, source: "edge-tts" };
    } catch {
      return {
        voices: [
          { name: "en-US-GuyNeural", gender: "Male", locale: "en-US" },
          { name: "en-US-JennyNeural", gender: "Female", locale: "en-US" },
          { name: "en-GB-RyanNeural", gender: "Male", locale: "en-GB" },
          { name: "en-GB-SoniaNeural", gender: "Female", locale: "en-GB" },
          { name: "ar-EG-ShakirNeural", gender: "Male", locale: "ar-EG" },
          { name: "ar-SA-HamedNeural", gender: "Male", locale: "ar-SA" },
        ],
        source: "built-in",
      };
    }
  })

  // ── Generation history from content_assets ──
  .get("/history", ({ query }) => {
    const type = query.type || "";
    const limit = Math.min(query.limit || 50, 200);
    if (type && type !== "all") {
      return db.query("SELECT * FROM content_assets WHERE type = ? ORDER BY created_at DESC LIMIT ?").all(type, limit);
    }
    return db.query("SELECT * FROM content_assets ORDER BY created_at DESC LIMIT ?").all(limit);
  }, {
    query: t.Object({
      type: t.Optional(t.String()),
      limit: t.Optional(t.Number()),
    }),
  })

  .delete("/history/:id", ({ params }) => {
    db.run("DELETE FROM content_assets WHERE id = ?", [Number(params.id)]);
    return { deleted: true };
  }, {
    params: t.Object({ id: t.String() }),
  })

  // ── Recent assets from disk ──
  .get("/recent/:type", async ({ params }) => {
    const assets = await listRecentAssets(params.type, OUTPUT_DIR);
    return { assets, count: assets.length };
  }, { params: t.Object({ type: t.String() }) })

  .get("/recent", async () => {
    const [audio, image] = await Promise.all([listRecentAssets("audio", OUTPUT_DIR), listRecentAssets("image", OUTPUT_DIR)]);
    return { audio, image };
  });

// ── Static file serving from agent-outputs ──

export const serveRoutes = new Elysia()
  .get("/api/serve/:type/:filename", async ({ params, query }) => {
    const safeType = params.type.replace(/[^a-z]/g, "");
    const safeFile = params.filename.replace(/[^a-zA-Z0-9._-]/g, "");
    if (!safeFile) return new Response("Invalid filename", { status: 400 });
    const filePath = join(OUTPUT_DIR, safeType, safeFile);
    if (!filePath.startsWith(OUTPUT_DIR)) return new Response("Forbidden", { status: 403 });
    try {
      const file = Bun.file(filePath);
      const exists = await file.exists();
      if (!exists) return new Response("Not found", { status: 404 });
      const ext = extname(safeFile).toLowerCase();
      const headers: Record<string, string> = { "Content-Type": getMime(ext), "Cache-Control": "public, max-age=3600" };
      if (query.download) {
        headers["Content-Disposition"] = "attachment; filename=\"" + safeFile + "\"";
        delete headers["Cache-Control"];
      }
      return new Response(file, { headers });
    } catch {
      return new Response("Error", { status: 500 });
    }
  }, { params: t.Object({ type: t.String(), filename: t.String() }) });

// ── R2 proxy routes (serves files from Cloudflare R2) ─────────────────

import { listR2Files, getR2File } from "../lib/r2";

export const r2Routes = new Elysia({ prefix: "/api/r2" })
  // List files in R2 bucket, grouped by model
  .get("/files", async ({ query }) => {
    try {
      const prefix = query.prefix || "images/";
      const files = await listR2Files(prefix, 200);
      // Group by model slug
      const grouped: Record<string, any[]> = {};
      for (const f of files) {
        const model = f.modelSlug || "unknown";
        if (!grouped[model]) grouped[model] = [];
        grouped[model].push(f);
      }
      return { files, grouped, count: files.length, r2Enabled: R2_ENABLED };
    } catch (e: any) {
      return { files: [], grouped: {}, count: 0, r2Enabled: R2_ENABLED, error: e.message };
    }
  })

  // Get a single file from R2
  .get("/file", async ({ query }) => {
    const key = query.key as string;
    if (!key) return new Response("Missing key", { status: 400 });
    try {
      const result = await getR2File(key);
      if (!result) return new Response("Not found", { status: 404 });
      return new Response(result.data, {
        headers: { "Content-Type": result.contentType, "Cache-Control": "public, max-age=86400" },
      });
    } catch (e: any) {
      return new Response("Error: " + e.message, { status: 500 });
    }
  });

// ── Hook R2 upload after every image generation ─────────────────────────

async function backupToR2(localPath: string, filename: string): Promise<void> {
  if (!R2_ENABLED) return;
  try {
    await uploadToR2(localPath, filename);
  } catch (e: any) {
    console.error("[R2] Backup failed:", e.message);
  }
}