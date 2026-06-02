import { Elysia, t } from "elysia";
import { mkdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { homedir } from "node:os";
import { spawn, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { getNvidiaKey, getOpenRouterKey, getGeminiKey, getCloudflareAccountId, getCloudflareApiToken, formatSize, getMime, listRecentAssets } from "../lib/helpers";
import { dbRun, dbQuery, dbInsert, dbGet } from "../db";
import { standardLimiter } from "../lib/rate-limit";

const OUTPUT_DIR = join(homedir(), "agent-outputs");
const NVIDIA_KEY = getNvidiaKey();
const OPENROUTER_KEY = getOpenRouterKey();
const GEMINI_KEY = getGeminiKey();
const CF_ACCOUNT_ID = getCloudflareAccountId();
const CF_API_TOKEN = getCloudflareApiToken();

// ── Image Models ──
// Local: ImageMagick (always available, no API key)
// AI: OpenRouter /v1/chat/completions (Gemini 2.5 Flash, GPT-5 Image Mini, etc.)
// Cloudflare Workers AI (FLUX.1 Schnell, SDXL)
// Set OPENROUTER_API_KEY or CLOUDFLARE_API_TOKEN in .env to enable AI image generation.

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
    id: "@cf/black-forest-labs/flux-1-schnell", name: "FLUX.1 Schnell", provider: "Cloudflare",
    description: "Fast image generation via Cloudflare Workers AI. Free daily quota.",
    speed: "fast", status: "available", needsAuth: true, free: true, recommendedFor: "Fast generation, free tier",
  },
  {
    id: "@cf/stabilityai/stable-diffusion-xl-base-1.0", name: "SDXL 1.0", provider: "Cloudflare",
    description: "Stable Diffusion XL via Cloudflare Workers AI. Free daily quota.",
    speed: "fast", status: "available", needsAuth: true, free: true, recommendedFor: "General purpose, free tier",
  },
  {
    id: "nvidia/qwen-image", name: "Qwen Image (NIM)", provider: "Nvidia",
    text: true, recommendedFor: "Free tier via NVIDIA NIM",
  },
  {
    id: "nvidia/qwen-image-edit", name: "Qwen Image Edit (NIM)", provider: "Nvidia",
    description: "Edit existing images via Qwen Image Edit NIM. Free tier at build.nvidia.com.",
    speed: "fast", status: "available", needsAuth: true, recommendedFor: "Image editing, free tier via NVIDIA NIM",
  },
];

// Filter models based on which API keys are actually configured at runtime
export function getAvailableImageModels(): ImageModel[] {
  // Use getApiKey() which checks process.env at call time, not module-level constants
  // This is critical for Docker/Dokplain where env vars are injected at container start
  return ALL_IMAGE_MODELS.filter(m => {
    if (!m.needsAuth) return true;
    if (m.provider === "OpenRouter") return !!getOpenRouterKey();
    if (m.provider === "Google") return !!getGeminiKey();
    if (m.provider === "Cloudflare") return !!getCloudflareAccountId() && !!getCloudflareApiToken();
    if (m.provider === "Nvidia") return !!getNvidiaKey();
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
  if (!getGeminiKey()) throw new Error("Missing GEMINI_API_TOKEN");
  await ensureDirs();
  const results: string[] = [];
  const modelId = model.replace("google/", "");
  for (let i = 0; i < count; i++) {
    const resp = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + modelId + ":predict?key=" + getGeminiKey(),
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
      results.push(outputPath);
    }
  }
  return results;
}

// ── Image via NVIDIA NIM (Qwen Image / Qwen Image Edit) ──
// Uses the proper NIM endpoint: ai.api.nvidia.com/v1/image-generation
// Docs: https://docs.nvidia.com/nim/qwen-image/latest/
async function generateImageNvidiaNIM(prompt: string, model: string, width: number, height: number, count: number): Promise<string[]> {
  if (!getNvidiaKey()) throw new Error("Missing NVIDIA_API_KEY from build.nvidia.com");
  await ensureDirs();
  const results: string[] = [];

  // Map model IDs to NIM model names
  const nimModelMap: Record<string, string> = {
    "nvidia/qwen-image": "qwen-image",
    "nvidia/qwen-image-edit": "qwen-image-edit",
  };
  const nimModel = nimModelMap[model] || model.replace("nvidia/", "");

  for (let i = 0; i < count; i++) {
    const resp = await fetch(
      "https://ai.api.nvidia.com/v1/image-generation",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": "Bearer " + getNvidiaKey(),
        },
        body: JSON.stringify({
          model: nimModel,
          prompt: prompt,
          ...(width && height ? { width, height } : {}),
        }),
        signal: AbortSignal.timeout(120_000),
      }
    );

    if (!resp.ok) {
      // Fallback: try the integrate API endpoint (older NIM versions)
      const fallbackResp = await fetch(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": "Bearer " + getNvidiaKey(),
          },
          body: JSON.stringify({
            model: model.startsWith("nvidia/") ? model.slice(7) : model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 4096,
          }),
          signal: AbortSignal.timeout(120_000),
        }
      );

      if (!fallbackResp.ok) {
        const e = await fallbackResp.text().catch(() => "unknown");
        throw new Error("NVIDIA NIM error " + fallbackResp.status + ": " + e.slice(0, 300));
      }

      const fallbackData = (await fallbackResp.json()) as any;
      const imgUrl = fallbackData?.choices?.[0]?.message?.content;
      if (!imgUrl) throw new Error("NVIDIA NIM returned no image URL: " + JSON.stringify(fallbackData).slice(0, 300));
      const imgResp = await fetch(imgUrl, { signal: AbortSignal.timeout(60_000) });
      const buffer = Buffer.from(await imgResp.arrayBuffer());
      const promptSlug = slugifyPrompt(prompt);
      const modelSlug = model.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
      const filename = "img-" + promptSlug + "-" + modelSlug + "-" + (i + 1) + ".png";
      const outputPath = join(OUTPUT_DIR, "images", filename);
      await writeFile(outputPath, buffer);
      results.push(outputPath);
      continue;
    }

    // Primary endpoint returns image directly or as base64
    const contentType = resp.headers.get("content-type") || "";
    let buffer: Buffer;
    if (contentType.startsWith("image/")) {
      buffer = Buffer.from(await resp.arrayBuffer());
    } else {
      const data = (await resp.json()) as any;
      // NIM may return base64 image in various formats
      const b64 = data?.image || data?.images?.[0] || data?.data?.[0]?.b64_json || data?.result?.image;
      if (!b64) throw new Error("NVIDIA NIM returned no image: " + JSON.stringify(data).slice(0, 300));
      buffer = Buffer.from(b64.replace(/^data:image\/\w+;base64,/, ""), "base64");
    }

    const promptSlug = slugifyPrompt(prompt);
    const modelSlug = model.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    const filename = "img-" + promptSlug + "-" + modelSlug + "-" + (i + 1) + ".png";
    const outputPath = join(OUTPUT_DIR, "images", filename);
    await writeFile(outputPath, buffer);
    results.push(outputPath);
  }

  return results;
}

// ── Image via Cloudflare Workers AI ──
async function generateImageCloudflare(prompt: string, model: string, count: number): Promise<string[]> {
  if (!getCloudflareAccountId() || !getCloudflareApiToken()) throw new Error("Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN");
  await ensureDirs();
  const results: string[] = [];
  for (let i = 0; i < count; i++) {
    const resp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${getCloudflareAccountId()}/ai/run/${model}`,
      {
        method: "POST",
        headers: { Authorization: "Bearer " + getCloudflareApiToken() },
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
  if (!getOpenRouterKey()) {
    throw new Error("OPENROUTER_API_KEY not set. Add it to .env or ~/.hermes/.env");
  }

  await ensureDirs();
  const outputPaths: string[] = [];

  const results: string[] = [];

  for (let i = 0; i < count; i++) {
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getOpenRouterKey()}`,
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

    const imgResp = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
    const buffer = Buffer.from(await imgResp.arrayBuffer());
    const promptSlug = slugifyPrompt(prompt);
    const modelSlug = model.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    const filename = "img-" + promptSlug + "-" + modelSlug + "-" + (i + 1) + ".png";
    const outputPath = join(OUTPUT_DIR, "images", filename);
    await writeFile(outputPath, buffer);
    results.push(outputPath);
  }

  return results;
}

// ── Save image to content_assets (filesystem + base64 in DB) ──
// This ensures images persist in Docker volume (via DB) and are viewable in Gallery.
async function saveImageAsset(
  title: string,
  prompt: string,
  filePath: string,
  metadata: Record<string, any> = {},
): Promise<number> {
  const now = new Date().toISOString();
  let base64 = "";
  try {
    const file = Bun.file(filePath);
    const buffer = await file.arrayBuffer();
    base64 = Buffer.from(buffer).toString("base64");
  } catch {
    // File may not exist yet (race condition) — store without base64
  }
  const id = await dbInsert(
    "INSERT INTO content_assets (type, title, prompt, file_path, image_data, status, metadata, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
    ["image", title.slice(0, 60), prompt, filePath, base64, "done", JSON.stringify(metadata), now, now]
  );
  return id;
}

// ── Track non-image assets (audio, video) without base64 ──
async function trackAsset(type: string, title: string, prompt: string, filePath: string, status: string, metadata: Record<string, any> = {}) {
  const now = new Date().toISOString();
  await dbInsert(
    "INSERT INTO content_assets (type, title, prompt, file_path, status, metadata, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
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
    note: "Images saved to local filesystem + base64 in DB for Gallery persistence.",
  }))

  // ── TTS ──
  .post("/tts", async ({ body }) => {
    try {
      const audioPath = await generateTTS(body.text, body.voice ?? "en-US-GuyNeural");
      const rel = audioPath.replace(OUTPUT_DIR, "").replace(/^\//, "");
      await trackAsset("audio", body.text, body.text, audioPath, "done", { voice: body.voice, provider: "edge-tts" });
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

      const results = await Promise.all(outputPaths.map(async (p) => {
        const rel = p.replace(OUTPUT_DIR, "").replace(/^\//, "");
        const id = await saveImageAsset(body.prompt, body.prompt, p, { method, model, width: body.width, height: body.height });
        return {
          id,
          file: p,
          filename: p.split("/").pop(),
          serveUrl: `/api/serve/${rel}`,
        };
      }));

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
      if (getNvidiaKey()) {
        try {
          const resp = await fetch("https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/eef816a3-3940-413b-93c9-513ae29f34f9", {
            method: "POST",
            headers: { Authorization: `Bearer ${getNvidiaKey()}`, "Content-Type": "application/json" },
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

      await trackAsset("video", body.prompt, body.prompt, outputPath, videoGenerated ? "done" : "pending", {
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
          { name: "ar-SA-HamedNeural", gender: "Female", locale: "ar-SA" },
        ],
        source: "built-in",
      };
    }
  })

  // ── Generation history from content_assets ──
  .get("/history", async ({ query }) => {
    const type = query.type || "";
    const limit = Math.min(query.limit || 50, 200);
    // Exclude image_data from listing (too large), load separately via /content/asset/:id/image
    if (type && type !== "all") {
      return await dbQuery(
        "SELECT id, type, title, prompt, file_path, status, metadata, created_at, updated_at FROM content_assets WHERE type = $1 ORDER BY created_at DESC LIMIT $2",
        [type, limit]
      );
    }
    return await dbQuery(
      "SELECT id, type, title, prompt, file_path, status, metadata, created_at, updated_at FROM content_assets ORDER BY created_at DESC LIMIT $1",
      [limit]
    );
  }, {
    query: t.Object({
      type: t.Optional(t.String()),
      limit: t.Optional(t.Number()),
    }),
  })

  .delete("/history/:id", async ({ params }) => {
    await dbRun("DELETE FROM content_assets WHERE id = $1", [Number(params.id)]);
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

// ── Image serving from content_assets (base64) + file fallback ──
// This is the primary way the Gallery loads images — works both locally and on Dokploy.

export const contentRoutes = new Elysia({ prefix: "/api/content" })
  .get("/asset/:id/image", async ({ params }) => {
    const id = Number(params.id);
    if (!id) return new Response("Invalid id", { status: 400 });
    const asset = dbGet("SELECT id, image_data, file_path, title FROM content_assets WHERE id = $1", [id]) as any;
    if (!asset) return new Response("Not found", { status: 404 });

    // Try base64 first (always available when generated via Studio)
    if (asset.image_data) {
      const buf = Buffer.from(asset.image_data, "base64");
      return new Response(buf, {
        headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
      });
    }

    // Fallback to filesystem
    if (asset.file_path) {
      try {
        const file = Bun.file(asset.file_path);
        const exists = await file.exists();
        if (!exists) return new Response("Not found", { status: 404 });
        const ext = extname(asset.file_path).toLowerCase();
        return new Response(file, {
          headers: { "Content-Type": getMime(ext), "Cache-Control": "public, max-age=86400" },
        });
      } catch {}
    }

    return new Response("Not found", { status: 404 });
  }, {
    params: t.Object({ id: t.String() }),
  });

// ── Track images for gallery ──
// Gallery fetches from /api/studio/history?type=image and displays via /api/content/asset/:id/image
