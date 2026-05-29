import { Elysia, t } from "elysia";
import { mkdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { homedir } from "node:os";
import { spawn, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { getNvidiaKey, getOpenRouterKey, formatSize, getMime, listRecentAssets, getApiKey } from "../lib/helpers";
import { db } from "../db";
import { standardLimiter } from "../lib/rate-limit";

const OUTPUT_DIR = join(homedir(), "agent-outputs");
const NVIDIA_KEY = getNvidiaKey();
const OPENROUTER_KEY = getOpenRouterKey();
const CLOUDFLARE_ACCOUNT_ID = getApiKey("CLOUDFLARE_ACCOUNT_ID");
const CLOUDFLARE_API_TOKEN = getApiKey("CLOUDFLARE_API_TOKEN");

// ── Image Models ──
// Local: ImageMagick (always available, no API key)
// API key env vars:
//   OPENROUTER_API_KEY  — openrouter.ai (Gemini, GPT image models)
//   NVIDIA_API_KEY      — build.nvidia.com (Qwen Image, free tier)
//   CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN — workers.ai (FLUX, SDXL)

export interface ImageModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  speed: "fast" | "medium" | "slow";
  status: "available" | "deprecated" | "external";
  recommendedFor: string;
  needsAuth: string[];  // env var names needed
}

export const IMAGE_MODELS: ImageModel[] = [
  // ── Local (no API key) ──
  {
    id: "imagemagick",
    name: "ImageMagick",
    provider: "Local",
    description: "Built-in image generation via ImageMagick — no API key needed. Works offline.",
    speed: "fast",
    status: "available",
    recommendedFor: "Always available, quick mockups",
    needsAuth: [],
  },

  // ── OpenRouter (needs OPENROUTER_API_KEY) ──
  {
    id: "google/gemini-2.5-flash-image",
    name: "Gemini 2.5 Flash Image",
    provider: "OpenRouter",
    description: "Google's fast image model. ~$0.0000003/token prompt. Best value.",
    speed: "fast",
    status: "available",
    recommendedFor: "Best value, fast generation",
    needsAuth: ["OPENROUTER_API_KEY"],
  },
  {
    id: "google/gemini-3.1-flash-image-preview",
    name: "Gemini 3.1 Flash Image (Nano Banana 2)",
    provider: "OpenRouter",
    description: "Google's latest image model. Pro-level quality at Flash speed. Image generation + editing.",
    speed: "fast",
    status: "available",
    recommendedFor: "Latest quality, image editing",
    needsAuth: ["OPENROUTER_API_KEY"],
  },
  {
    id: "openai/gpt-5-image-mini",
    name: "GPT-5 Image Mini",
    provider: "OpenRouter",
    description: "OpenAI's compact image model. High quality text-to-image.",
    speed: "medium",
    status: "available",
    recommendedFor: "OpenAI ecosystem, reliable output",
    needsAuth: ["OPENROUTER_API_KEY"],
  },

  // ── Nvidia NIM (needs NVIDIA_API_KEY from build.nvidia.com, free tier) ──
  {
    id: "qwen/qwen-image",
    name: "Qwen Image",
    provider: "NVIDIA NIM",
    description: "Qwen text-to-image model. Excellent multilingual text rendering in images. Free tier available via build.nvidia.com.",
    speed: "medium",
    status: "available",
    recommendedFor: "Free AI generation, text in images",
    needsAuth: ["NVIDIA_API_KEY"],
  },
  {
    id: "qwen/qwen-image-edit",
    name: "Qwen Image Edit",
    provider: "NVIDIA NIM",
    description: "Qwen image editing model. Style transfer, object add/remove, pose manipulation. Free tier available.",
    speed: "medium",
    status: "available",
    recommendedFor: "Image editing, style transfer",
    needsAuth: ["NVIDIA_API_KEY"],
  },

  // ── Cloudflare Workers AI (needs CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN) ──
  {
    id: "@cf/black-forest-labs/flux-1-schnell",
    name: "FLUX.1 [Schnell]",
    provider: "Cloudflare AI",
    description: "Black Forest Labs' fast text-to-image model. 1-4 step generation. Free daily quota on Cloudflare Workers AI.",
    speed: "fast",
    status: "available",
    recommendedFor: "Fast free AI generation (12M+ free tokens/day)",
    needsAuth: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"],
  },
  {
    id: "@cf/stabilityai/stable-diffusion-xl-base-1.0",
    name: "Stable Diffusion XL",
    provider: "Cloudflare AI",
    description: "Stability AI's SDXL model hosted on Cloudflare. High quality, classic text-to-image. Free daily quota.",
    speed: "medium",
    status: "available",
    recommendedFor: "Classic SDXL quality, free tier",
    needsAuth: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"],
  },
,

  // ── Google Imagen (needs GEMINI_API_TOKEN from aistudio.google.com) ──
  {
    id: "google/imagen-3.0-generate-002",
    name: "Imagen 3",
    provider: "Google AI",
    description: "Google Imagen 3 text-to-image. Excellent quality, photorealism, text rendering. Free tier: 1500 req/day.",
    speed: "medium",
    status: "available",
    recommendedFor: "Photorealism, text in images, free daily quota",
    needsAuth: ["GEMINI_API_TOKEN"],
  },
];

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
    const hash = createHash("md5").update(prompt + i + Date.now()).digest("hex").slice(0, 8);
    const slug = prompt.replace(/[^a-zA-Z0-9_ ]/g, "").trim().slice(0, 40).replace(/\s+/g, "-");
    const filename = `img-${slug || "image"}-magick-${hash}.png`;
    const outputPath = join(OUTPUT_DIR, "images", filename);

    const label = prompt.replace(/'/g, "'\\''").slice(0, 80);

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
      execSync(
        `magick -size ${width}x${height} gradient:"#1a1a2e-#0f3460" -font Helvetica -pointsize 24 -fill "#c9a84c" -gravity center -annotate 0 "${label.slice(0, 40)}" "${outputPath}"`,
        { timeout: 10000 }
      );
      outputPaths.push(outputPath);
    }
  }

  return outputPaths;
}

// ── Image via OpenRouter API ──
async function generateImageOpenRouter(
  prompt: string,
  model: string,
  width: number,
  height: number,
  count: number,
  negativePrompt?: string,
): Promise<string[]> {
  if (!OPENROUTER_KEY) {
    throw new Error("OPENROUTER_API_KEY not set. Add it to .env");
  }

  await ensureDirs();
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
        model,
        messages: [{ role: "user", content: prompt }],
        ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "unknown error");
      throw new Error(`OpenRouter API error ${resp.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await resp.json()) as any;
    let imageUrl: string | undefined;
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      imageUrl = content;
    } else if (Array.isArray(content)) {
      const imagePart = content.find((p: any) => p?.type === "image_url" || p?.image_url);
      if (imagePart) {
        imageUrl = imagePart.image_url?.url || imagePart.image_url;
      }
    }

    if (!imageUrl) {
      throw new Error(`OpenRouter returned no image URL. Response: ${JSON.stringify(data).slice(0, 300)}`);
    }

    const hash = createHash("md5").update(prompt + i + Date.now()).digest("hex").slice(0, 8);
    const slug = prompt.replace(/[^a-zA-Z0-9_ ]/g, "").trim().slice(0, 40).replace(/\s+/g, "-");
    const filename = `img-${slug || "image"}-or-${hash}.png`;
    const outputPath = join(OUTPUT_DIR, "images", filename);

    const imgResp = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
    const buffer = Buffer.from(await imgResp.arrayBuffer());
    await writeFile(outputPath, buffer);
    results.push(outputPath);
  }

  return results;
}

// ── Image via Nvidia NIM (integrate.api.nvidia.com) ──
async function generateImageNvidiaNIM(
  prompt: string,
  model: string,
  width: number,
  height: number,
  count: number,
): Promise<string[]> {
  if (!NVIDIA_KEY) {
    throw new Error("NVIDIA_API_KEY not set. Get a free key from build.nvidia.com");
  }

  await ensureDirs();
  const results: string[] = [];

  for (let i = 0; i < count; i++) {
    const resp = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NVIDIA_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2048,
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "unknown error");
      throw new Error(`Nvidia NIM API error ${resp.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await resp.json()) as any;
    let imageUrl: string | undefined;
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      imageUrl = content;
    } else if (Array.isArray(content)) {
      const imagePart = content.find((p: any) => p?.type === "image_url" || p?.image_url);
      if (imagePart) {
        imageUrl = imagePart.image_url?.url || imagePart.image_url;
      }
    }

    if (!imageUrl) {
      throw new Error(`Nvidia NIM returned no image URL. Response: ${JSON.stringify(data).slice(0, 300)}`);
    }

    const hash = createHash("md5").update(prompt + i + Date.now()).digest("hex").slice(0, 8);
    const slug = prompt.replace(/[^a-zA-Z0-9_ ]/g, "").trim().slice(0, 40).replace(/\s+/g, "-");
    const filename = `img-${slug || "image"}-nvidia-${hash}.png`;
    const outputPath = join(OUTPUT_DIR, "images", filename);

    const imgResp = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
    const buffer = Buffer.from(await imgResp.arrayBuffer());
    await writeFile(outputPath, buffer);
    results.push(outputPath);
  }

  return results;
}

// ── Image via Cloudflare Workers AI ──
async function generateImageCloudflare(
  prompt: string,
  model: string,
  count: number,
): Promise<string[]> {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN not set. Get them from dash.cloudflare.com > Workers AI.");
  }

  await ensureDirs();
  const results: string[] = [];

  for (let i = 0; i < count; i++) {
    const resp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
        signal: AbortSignal.timeout(120_000),
      }
    );

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "unknown error");
      throw new Error(`Cloudflare AI error ${resp.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await resp.json()) as any;

    // Cloudflare returns: { result: { image: "<base64>" } } for image models
    // or SFW wrapper with image as base64 string
    let imageBase64: string | undefined;

    if (data?.result?.image) {
      imageBase64 = data.result.image;
    } else if (typeof data?.result === "string") {
      // Sometimes the image comes as a raw base64 string
      imageBase64 = data.result;
    }

    if (!imageBase64) {
      throw new Error(`Cloudflare AI returned no image. Response: ${JSON.stringify(data).slice(0, 300)}`);
    }

    const hash = createHash("md5").update(prompt + i + Date.now()).digest("hex").slice(0, 8);
    const slug = prompt.replace(/[^a-zA-Z0-9_ ]/g, "").trim().slice(0, 40).replace(/\s+/g, "-");
    const filename = `img-${slug || "image"}-cf-${hash}.png`;
    const outputPath = join(OUTPUT_DIR, "images", filename);

    // Decode base64 image
    const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
    await writeFile(outputPath, buffer);
    results.push(outputPath);
  }

  return results;
}

// ── Image via Google Imagen API ──
async function generateImageGoogle(prompt: string, model: string, count: number): Promise<string[]> {
  if (!GEMINI_API_TOKEN) throw new Error("GEMINI_API_TOKEN not set. Get a free key from aistudio.google.com/apikey");
  await ensureDirs();
  const results: string[] = [];
  for (let i = 0; i < count; i++) {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=***      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1 } }),
        signal: AbortSignal.timeout(120_000),
      }
    );
    if (!resp.ok) { const e = await resp.text().catch(() => "unknown"); throw new Error(`Google Imagen API error ${resp.status}: ${e.slice(0, 300)}`); }
    const data = (await resp.json()) as any;
    const base64 = data?.predictions?.[0]?.bytesBase64Encoded;
    if (!base64) throw new Error(`Google Imagen returned no image. Response: ${JSON.stringify(data).slice(0, 300)}`);
    const hash = createHash("md5").update(prompt + i + Date.now()).digest("hex").slice(0, 8);
    const slug = prompt.replace(/[^a-zA-Z0-9_ ]/g, "").trim().slice(0, 40).replace(/\s+/g, "-");
    const filename = `img-${slug || "image"}-google-${hash}.png`;
    const outputPath = join(OUTPUT_DIR, "images", filename);
    await writeFile(outputPath, Buffer.from(base64, "base64"));
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
    image: IMAGE_MODELS,
    video: VIDEO_MODELS,
    note: "Set corresponding API keys in .env to enable AI providers. ImageMagick is always available.",
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

      let outputPaths: string[];
      let method: string;

      if (model === "imagemagick") {
        // Local
        outputPaths = await generateImageLocal(body.prompt, body.width ?? 1024, body.height ?? 768, numImages);
        method = "imagemagick";
      } else if (model.startsWith("@cf/")) {
        // Cloudflare Workers AI
        outputPaths = await generateImageCloudflare(body.prompt, model, numImages);
        method = `cloudflare/${model}`;
      } else if (model.startsWith("qwen/") || model.startsWith("nvidia/")) {
        // Nvidia NIM
        outputPaths = await generateImageNvidiaNIM(body.prompt, model, body.width ?? 1024, body.height ?? 1024, numImages);
        method = `nvidia/${model}`;
      } else if (model.startsWith("google/")) {
        // Google Imagen
        outputPaths = await generateImageGoogle(body.prompt, model, numImages);
        method = `google/${model}`;
      } else {
        // OpenRouter (everything else)
        outputPaths = await generateImageOpenRouter(body.prompt, model, body.width ?? 1024, body.height ?? 1024, numImages, body.negativePrompt);
        method = `openrouter/${model}`;
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
  .get("/api/serve/:type/:filename", async ({ params }) => {
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
      return new Response(file, { headers: { "Content-Type": getMime(ext), "Cache-Control": "public, max-age=3600" } });
    } catch {
      return new Response("Error", { status: 500 });
    }
  }, { params: t.Object({ type: t.String(), filename: t.String() }) });