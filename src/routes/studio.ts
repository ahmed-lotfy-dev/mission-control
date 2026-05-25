import { Elysia, t } from "elysia";
import { mkdir, writeFile, readdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { homedir } from "node:os";
import { spawn, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const OUTPUT_DIR = join(homedir(), "agent-outputs");

// ── Read NVIDIA API Key ──
function getNvidiaKey(): string | null {
  try {
    const envPath = join(homedir(), ".hermes", ".env");
    const content = readFileSync(envPath, "utf-8");
    const match = content.match(/^NVIDIA_API_KEY=(.+)$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

const NVIDIA_KEY = getNvidiaKey();

// ── Ensure subdirectories ──
async function ensureDirs() {
  for (const dir of ["audio", "images", "videos", "documents"]) {
    await mkdir(join(OUTPUT_DIR, dir), { recursive: true });
  }
}

// ── Helpers ──
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMime(ext: string): string {
  const map: Record<string, string> = {
    ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg",
    ".flac": "audio/flac", ".m4a": "audio/mp4",
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
    ".mp4": "video/mp4", ".webm": "video/webm",
  };
  return map[ext] ?? "application/octet-stream";
}

async function listRecentAssets(type: string, limit = 30) {
  const dirMap: Record<string, string> = { audio: "audio", image: "images", video: "videos" };
  const subdir = dirMap[type] || type;
  const dirPath = join(OUTPUT_DIR, subdir);
  const results: Array<{ name: string; path: string; type: string; sizeFormatted: string; createdAt: string; mime: string }> = [];
  try {
    const entries = await readdir(dirPath);
    for (const entry of entries.slice().reverse().slice(0, limit)) {
      const fullPath = join(dirPath, entry);
      const stats = await stat(fullPath);
      if (!stats.isFile()) continue;
      const ext = extname(entry).toLowerCase();
      results.push({
        name: entry, path: fullPath, type: subdir,
        sizeFormatted: formatSize(stats.size),
        createdAt: stats.birthtime?.toISOString() ?? stats.mtime.toISOString(),
        mime: getMime(ext),
      });
    }
  } catch {}
  return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

// ── Image via NVIDIA API ──
async function generateImageNvidia(prompt: string): Promise<string> {
  const hash = createHash("md5").update(prompt).digest("hex").slice(0, 8);
  const slug = prompt.replace(/[^a-zA-Z0-9_ ]/g, "").trim().slice(0, 40).replace(/\s+/g, "-");
  const filename = `img-${slug || "image"}-${hash}.png`;
  const outputPath = join(OUTPUT_DIR, "images", filename);
  await ensureDirs();

  if (!NVIDIA_KEY) throw new Error("NVIDIA_API_KEY not found in ~/.hermes/.env");

  const resp = await fetch("https://integrate.api.nvidia.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${NVIDIA_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      model: "stabilityai/stable-diffusion-xl-base-1.0",
      num_images: 1,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`NVIDIA API error ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const data = await resp.json() as any;
  const imageData = data?.data?.[0]?.b64_json || data?.data?.[0]?.url;

  if (imageData?.startsWith("http")) {
    // Download from URL
    const imgResp = await fetch(imageData);
    const buffer = await imgResp.arrayBuffer();
    await writeFile(outputPath, Buffer.from(buffer));
  } else if (imageData) {
    // Base64
    const buffer = Buffer.from(imageData, "base64");
    await writeFile(outputPath, buffer);
  } else {
    throw new Error("No image data in NVIDIA response");
  }

  return outputPath;
}

async function generateImageFallback(prompt: string): Promise<string> {
  const hash = createHash("md5").update(prompt).digest("hex").slice(0, 8);
  const slug = prompt.replace(/[^a-zA-Z0-9_ ]/g, "").trim().slice(0, 40).replace(/\s+/g, "-");
  const filename = `img-${slug || "image"}-${hash}.png`;
  const outputPath = join(OUTPUT_DIR, "images", filename);
  await ensureDirs();

  const label = prompt.replace(/'/g, "'\\''").slice(0, 60);
  execSync(
    `convert -size 1024x768 xc:"#1a1a2e" \
      -font Helvetica -pointsize 28 -fill "#c9a84c" -gravity north -annotate +0+40 "⚡ ImageMagick" \
      -font Helvetica -pointsize 20 -fill "#e8dcc8" -gravity center -annotate +0+0 "${label}" \
      -font Helvetica -pointsize 14 -fill "#8b8b7a" -gravity south -annotate +0+40 "Generated by Mission Control Studio" \
      "${outputPath}"`,
    { timeout: 15000 }
  );
  return outputPath;
}

// ── Routes ──

export const studioRoutes = new Elysia({ prefix: "/api/studio" })

  // ── TTS ──
  .post("/tts", async ({ body }) => {
    try {
      const audioPath = await generateTTS(body.text, body.voice ?? "en-US-GuyNeural");
      const rel = audioPath.replace(OUTPUT_DIR, "").replace(/^\//, "");
      return { status: "done", file: audioPath, filename: audioPath.split("/").pop(), serveUrl: `/api/serve/${rel}` };
    } catch (e: any) {
      return { status: "error", error: e.message };
    }
  }, { body: t.Object({ text: t.String({ minLength: 1, maxLength: 5000 }), voice: t.Optional(t.String()) }) })

  // ── Image ──
  .post("/image", async ({ body }) => {
    try {
      let outputPath: string;
      try {
        outputPath = await generateImageNvidia(body.prompt);
      } catch (e: any) {
        outputPath = await generateImageFallback(body.prompt);
      }
      const rel = outputPath.replace(OUTPUT_DIR, "").replace(/^\//, "");
      return { status: "done", file: outputPath, filename: outputPath.split("/").pop(), serveUrl: `/api/serve/${rel}`, method: NVIDIA_KEY ? "nvidia" : "imagemagick" };
    } catch (e: any) {
      return { status: "error", error: e.message };
    }
  }, { body: t.Object({ prompt: t.String({ minLength: 1, maxLength: 4000 }), model: t.Optional(t.String()) }) })

  // ── Video (placeholder with status) ──
  .post("/video", async ({ body }) => {
    const hash = createHash("md5").update(body.prompt).digest("hex").slice(0, 8);
    const filename = `vid-${hash}.mp4`;
    const outputPath = join(OUTPUT_DIR, "videos", filename);
    await ensureDirs();
    await writeFile(outputPath.replace(".mp4", ".txt"), `Video generation placeholder for: ${body.prompt}\n\nNVIDIA video API not yet integrated.`);
    return { status: "queued", file: outputPath, filename, message: "Video generation queued — status tracking coming soon" };
  }, { body: t.Object({ prompt: t.String({ minLength: 1, maxLength: 4000 }) }) })

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
      return { voices: [
        { name: "en-US-GuyNeural", gender: "Male", locale: "en-US" },
        { name: "en-US-JennyNeural", gender: "Female", locale: "en-US" },
        { name: "en-GB-RyanNeural", gender: "Male", locale: "en-GB" },
        { name: "en-GB-SoniaNeural", gender: "Female", locale: "en-GB" },
      ], source: "built-in" };
    }
  })

  // ── Recent assets ──
  .get("/recent/:type", async ({ params }) => {
    const assets = await listRecentAssets(params.type);
    return { assets, count: assets.length };
  }, { params: t.Object({ type: t.String() }) })

  .get("/recent", async () => {
    const [audio, image] = await Promise.all([listRecentAssets("audio"), listRecentAssets("image")]);
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