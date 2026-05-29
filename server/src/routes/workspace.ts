import { Elysia } from "elysia";
import { join, extname } from "node:path";
import { homedir } from "node:os";
import { formatSize, getMime, getFileType, listFiles } from "../lib/helpers";

const WORKSPACE_DIR = join(homedir(), "agent-outputs");

const SUBDIRS = ["images", "videos", "audio", "documents"];

export const workspaceRoutes = new Elysia({ prefix: "/api/workspace" })
  .get("/files", async ({ request }) => {
    const url = new URL(request.url);
    const filter = url.searchParams.get("type") ?? "all";

    const allFiles = await listFiles(WORKSPACE_DIR, SUBDIRS, filter, 0);

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
          "Cache-Control": url.searchParams.has("download") ? "no-store" : "public, max-age=3600",
          ...(url.searchParams.has("download") ? { "Content-Disposition": "attachment; filename=\"" + resolved.split("/").pop() + "\"" } : {}),
        },
      });
    } catch {
      return new Response("Error reading file", { status: 500 });
    }
  });