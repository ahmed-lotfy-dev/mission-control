import { Elysia } from "elysia";
import { readdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { homedir } from "node:os";

const WORKSPACE_DIR = join(homedir(), "agent-outputs");

const SUBDIRS = ["images", "videos", "audio", "documents"];

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
  ".aac": "audio/aac",
  ".m4a": "audio/mp4",
  ".md": "text/markdown",
  ".txt": "text/plain",
  ".json": "application/json",
  ".yaml": "application/x-yaml",
  ".yml": "application/x-yaml",
  ".xml": "application/xml",
  ".csv": "text/csv",
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".ts": "application/x-typescript",
  ".pdf": "application/pdf",
};

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp"]);
const VIDEO_EXTS = new Set([".mp4", ".webm", ".mov", ".avi", ".mkv"]);
const AUDIO_EXTS = new Set([".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a"]);

function getFileType(ext: string): string {
  if (IMAGE_EXTS.has(ext)) return "image";
  if (VIDEO_EXTS.has(ext)) return "video";
  if (AUDIO_EXTS.has(ext)) return "audio";
  return "document";
}

function getMime(ext: string): string {
  return MIME_MAP[ext] ?? "application/octet-stream";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const workspaceRoutes = new Elysia({ prefix: "/api/workspace" })
  .get("/files", async ({ request }) => {
    const url = new URL(request.url);
    const filter = url.searchParams.get("type") ?? "all";

    const allFiles: any[] = [];

    for (const subdir of SUBDIRS) {
      const dirPath = join(WORKSPACE_DIR, subdir);
      try {
        const entries = await readdir(dirPath);
        for (const entry of entries) {
          const fullPath = join(dirPath, entry);
          const stats = await stat(fullPath);
          if (!stats.isFile()) continue;
          const ext = extname(entry).toLowerCase();
          const fileType = getFileType(ext);
          if (filter !== "all" && fileType !== filter) continue;

          allFiles.push({
            name: entry,
            path: fullPath,
            relativePath: `${subdir}/${entry}`,
            subdir,
            type: fileType,
            mime: getMime(ext),
            size: stats.size,
            sizeFormatted: formatSize(stats.size),
            createdAt: stats.birthtime?.toISOString() ?? stats.mtime.toISOString(),
            modifiedAt: stats.mtime.toISOString(),
          });
        }
      } catch {
        // directory doesn't exist or can't be read — skip
      }
    }

    allFiles.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

    return {
      files: allFiles,
      counts: {
        total: allFiles.length,
        image: allFiles.filter(f => f.type === "image").length,
        video: allFiles.filter(f => f.type === "video").length,
        audio: allFiles.filter(f => f.type === "audio").length,
        document: allFiles.filter(f => f.type === "document").length,
      },
      workspacePath: WORKSPACE_DIR,
    };
  })
  .get("/file", async ({ request }) => {
    const url = new URL(request.url);
    const filePath = url.searchParams.get("path");
    if (!filePath) return new Response("Missing path", { status: 400 });

    // Security: ensure the path is within the workspace directory
    const resolved = join(filePath);
    if (!resolved.startsWith(WORKSPACE_DIR)) {
      return new Response("Forbidden", { status: 403 });
    }

    try {
      const file = Bun.file(resolved);
      const exists = await file.exists();
      if (!exists) return new Response("Not found", { status: 404 });

      const ext = extname(resolved).toLowerCase();
      const mime = getMime(ext);

      return new Response(file, {
        headers: {
          "Content-Type": mime,
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch {
      return new Response("Error reading file", { status: 500 });
    }
  });