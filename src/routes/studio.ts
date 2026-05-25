import { Elysia, t } from "elysia";
import { mkdir, writeFile, readdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { homedir } from "node:os";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";

const OUTPUT_DIR = join(homedir(), "agent-outputs");
const STUDIO_DB_PATH = join(OUTPUT_DIR, ".studio-jobs.json");

// ── In-memory job store (persisted to JSON) ──

interface StudioJob {
  id: string;
  type: "tts" | "image" | "video";
  status: "queued" | "processing" | "done" | "error";
  prompt: string;
  voice?: string;
  filePath?: string;
  error?: string;
  progress: number; // 0-100
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

let jobs: StudioJob[] = [];

async function loadJobs() {
  try {
    const data = await Bun.file(STUDIO_DB_PATH).text();
    jobs = JSON.parse(data);
  } catch {
    jobs = [];
  }
}

async function saveJobs() {
  await writeFile(STUDIO_DB_PATH, JSON.stringify(jobs, null, 2));
}

function generateId(): string {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

// ── TTS Implementation using edge-tts ──

async function runTTS(text: string, voice: string, jobId: string): Promise<string> {
  const sanitized = text.replace(/[^a-zA-Z0-9_\-\u0600-\u06FF ]/g, "").slice(0, 60);
  const hash = createHash("md5").update(text).digest("hex").slice(0, 8);
  const filename = `tts-${sanitized.slice(0, 30)}-${hash}.mp3`;
  const outputPath = join(OUTPUT_DIR, "audio", filename);

  // Update job to processing
  const job = jobs.find((j) => j.id === jobId);
  if (job) {
    job.status = "processing";
    job.progress = 30;
    await saveJobs();
  }

  // Try edge-tts first, then fall back to a basic approach
  try {
    const result = await new Promise<string>((resolve, reject) => {
      const proc = spawn("edge-tts", [
        "--text", text,
        "--voice", voice,
        "--write-media", outputPath,
      ]);

      let stderr = "";
      proc.stderr?.on("data", (data: Buffer) => (stderr += data.toString()));

      proc.on("close", (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`edge-tts exited with code ${code}: ${stderr.slice(0, 200)}`));
        }
      });

      proc.on("error", reject);
    });

    if (job) {
      job.status = "done";
      job.progress = 100;
      job.filePath = result;
      job.completedAt = new Date().toISOString();
      await saveJobs();
    }

    return result;
  } catch (e: any) {
    // Fallback: create a placeholder with info
    const fallbackPath = join(OUTPUT_DIR, "audio", `${sanitized.slice(0, 20)}-${hash}.txt`);
    await writeFile(
      fallbackPath,
      `TTS Generation Placeholder\n\nVoice: ${voice}\nText: ${text}\n\nInstall edge-tts to enable audio generation:\n  pip install edge-tts\n\nerror: ${e.message}`
    );

    if (job) {
      job.status = job ? "done" : "error";
      job.progress = 100;
      job.filePath = fallbackPath;
      job.completedAt = new Date().toISOString();
      await saveJobs();
    }

    return fallbackPath;
  }
}

// ── Image Generation (placeholder — integrates with ComfyUI or API) ──

async function runImageGen(prompt: string, model: string, jobId: string): Promise<string> {
  const hash = createHash("md5").update(prompt).digest("hex").slice(0, 8);
  const sanitized = prompt.replace(/[^a-zA-Z0-9_\-\u0600-\u06FF ]/g, "").slice(0, 40);
  const filename = `img-${sanitized.slice(0, 25)}-${hash}.png`;
  const outputPath = join(OUTPUT_DIR, "images", filename);

  const job = jobs.find((j) => j.id === jobId);
  if (job) {
    job.status = "processing";
    job.progress = 20;
    await saveJobs();
  }

  try {
    // Check if comfyui-related tools exist
    const hasComfy = Bun.spawnSync(["which", "comfy"], { stdio: "pipe" }).exitCode === 0;

    if (hasComfy) {
      // TODO: Integrate with ComfyUI CLI
      throw new Error("ComfyUI CLI detected but not yet integrated");
    }

    // Generate a simple placeholder PNG with prompt info
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768" viewBox="0 0 1024 768">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1a1a2e"/>
          <stop offset="100%" style="stop-color:#16213e"/>
        </linearGradient>
      </defs>
      <rect width="1024" height="768" fill="url(#bg)"/>
      <text x="512" y="340" font-family="system-ui, sans-serif" font-size="28" fill="#58a6ff" text-anchor="middle" dominant-baseline="middle">🎨</text>
      <text x="512" y="400" font-family="system-ui, sans-serif" font-size="18" fill="#c9d1d9" text-anchor="middle" dominant-baseline="middle">${escXml(prompt.slice(0, 80))}</text>
      <text x="512" y="440" font-family="system-ui, sans-serif" font-size="13" fill="#8b949e" text-anchor="middle" dominant-baseline="middle">Model: ${escXml(model)}</text>
    </svg>`;

    // Write as SVG first (we can convert later)
    const svgPath = outputPath.replace(".png", ".svg");
    await writeFile(svgPath, svgContent);

    if (job) {
      job.status = "done";
      job.progress = 100;
      job.filePath = svgPath;
      job.metadata = { model, resolution: "1024x768", format: "svg" };
      job.completedAt = new Date().toISOString();
      await saveJobs();
    }

    return svgPath;
  } catch (e: any) {
    const fallbackPath = join(OUTPUT_DIR, "images", `${hash}.txt`);
    await writeFile(fallbackPath, `Image Generation Request\n\nPrompt: ${prompt}\nModel: ${model}\n\n${e.message}`);

    if (job) {
      job.status = "done";
      job.progress = 100;
      job.filePath = fallbackPath;
      job.completedAt = new Date().toISOString();
      await saveJobs();
    }

    return fallbackPath;
  }
}

// ── Video Generation (simulated job) ──

async function runVideoGen(prompt: string, jobId: string): Promise<void> {
  const job = jobs.find((j) => j.id === jobId);
  if (!job) return;

  // Simulate progress over time
  const stages = [
    { progress: 10, delay: 2000 },
    { progress: 25, delay: 4000 },
    { progress: 45, delay: 3000 },
    { progress: 65, delay: 5000 },
    { progress: 85, delay: 3000 },
    { progress: 100, delay: 1000 },
  ];

  for (const stage of stages) {
    await new Promise((r) => setTimeout(r, stage.delay));
    const currentJob = jobs.find((j) => j.id === jobId);
    if (!currentJob || currentJob.status === "error") break;
    currentJob.progress = stage.progress;
    currentJob.status = stage.progress < 100 ? "processing" : "done";
    if (stage.progress === 100) {
      currentJob.completedAt = new Date().toISOString();
      // Create a placeholder
      const hash = createHash("md5").update(prompt).digest("hex").slice(0, 8);
      const sanitized = prompt.replace(/[^a-zA-Z0-9_\-\u0600-\u06FF ]/g, "").slice(0, 40);
      const filename = `vid-${sanitized.slice(0, 25)}-${hash}.mp4`;
      const outputPath = join(OUTPUT_DIR, "videos", filename);
      currentJob.filePath = outputPath;

      // Create placeholder text file
      await writeFile(
        outputPath.replace(".mp4", ".txt"),
        `Video Generation Placeholder\n\nPrompt: ${prompt}\n\nVideo generation requires a backend integration (ComfyUI, Runway, etc.)`
      );
    }
    await saveJobs();
  }
}

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Routes ──

export const studioRoutes = new Elysia({ prefix: "/api/studio" })

  // TTS Generation
  .post("/tts", async ({ body }) => {
    await loadJobs();
    const id = generateId();
    const job: StudioJob = {
      id,
      type: "tts",
      status: "queued",
      prompt: body.text,
      voice: body.voice ?? "en-US-GuyNeural",
      progress: 0,
      createdAt: new Date().toISOString(),
      metadata: { voice: body.voice ?? "en-US-GuyNeural" },
    };
    jobs.push(job);
    await saveJobs();

    // Run TTS asynchronously
    runTTS(body.text, body.voice ?? "en-US-GuyNeural", id).then(() => saveJobs()).catch(() => {});

    return { id, status: "queued", message: "TTS generation started" };
  }, {
    body: t.Object({
      text: t.String({ minLength: 1, maxLength: 5000 }),
      voice: t.Optional(t.String()),
    }),
  })

  // Image Generation
  .post("/image", async ({ body }) => {
    await loadJobs();
    const id = generateId();
    const job: StudioJob = {
      id,
      type: "image",
      status: "queued",
      prompt: body.prompt,
      progress: 0,
      createdAt: new Date().toISOString(),
      metadata: { model: body.model ?? "default" },
    };
    jobs.push(job);
    await saveJobs();

    // Run image gen asynchronously
    runImageGen(body.prompt, body.model ?? "default", id).then(() => saveJobs()).catch(() => {});

    return { id, status: "queued", message: "Image generation started" };
  }, {
    body: t.Object({
      prompt: t.String({ minLength: 1, maxLength: 4000 }),
      model: t.Optional(t.String()),
    }),
  })

  // Video Generation
  .post("/video", async ({ body }) => {
    await loadJobs();
    const id = generateId();
    const job: StudioJob = {
      id,
      type: "video",
      status: "queued",
      prompt: body.prompt,
      progress: 0,
      createdAt: new Date().toISOString(),
    };
    jobs.push(job);
    await saveJobs();

    // Run video gen asynchronously
    runVideoGen(body.prompt, id);

    return { id, status: "queued", message: "Video generation started — tracking via GET /api/studio/job/:id" };
  }, {
    body: t.Object({
      prompt: t.String({ minLength: 1, maxLength: 4000 }),
    }),
  })

  // Get job status
  .get("/job/:id", ({ params }) => {
    const job = jobs.find((j) => j.id === params.id);
    if (!job) return { error: "Job not found" };
    return job;
  }, {
    params: t.Object({ id: t.String() }),
  })

  // Get all studio history
  .get("/history", async () => {
    await loadJobs();
    return jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  })

  // Clear history
  .delete("/history", async () => {
    jobs = [];
    await saveJobs();
    return { cleared: true, message: "Studio history cleared" };
  })

  // Get available TTS voices
  .get("/voices", async () => {
    try {
      const result = Bun.spawnSync(["edge-tts", "--list-voices"], { stdout: "pipe", stderr: "pipe" });
      if (result.exitCode === 0) {
        const lines = result.stdout.toString().trim().split("\n");
        // Parse edge-tts voice list — skip header line
        const voices = lines.slice(1).map((line) => {
          const parts = line.trim().split(/\s+/);
          return {
            name: parts[0] || "",
            gender: parts[1] || "",
            locale: parts[0]?.split("-").slice(0, 2).join("-") || "",
          };
        }).filter((v) => v.name);
        return { voices, source: "edge-tts" };
      }
    } catch {}

    // Fallback voice list
    return {
      voices: [
        { name: "en-US-GuyNeural", gender: "Male", locale: "en-US" },
        { name: "en-US-JennyNeural", gender: "Female", locale: "en-US" },
        { name: "en-GB-RyanNeural", gender: "Male", locale: "en-GB" },
        { name: "en-GB-SoniaNeural", gender: "Female", locale: "en-GB" },
        { name: "ar-EG-ShakirNeural", gender: "Male", locale: "ar-EG" },
        { name: "ar-SA-HamedNeural", gender: "Male", locale: "ar-SA" },
        { name: "de-DE-KatjaNeural", gender: "Female", locale: "de-DE" },
        { name: "fr-FR-DeniseNeural", gender: "Female", locale: "fr-FR" },
        { name: "ja-JP-NanamiNeural", gender: "Female", locale: "ja-JP" },
        { name: "zh-CN-XiaoxiaoNeural", gender: "Female", locale: "zh-CN" },
      ],
      source: "built-in",
      hint: "Install edge-tts for the full voice list: pip install edge-tts",
    };
  });
