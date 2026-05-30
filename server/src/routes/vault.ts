import { Elysia, t } from "elysia";
import { dbQuery, dbGet, dbRun } from "../db";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const VAULT_PATH = "/mnt/hdd/home-folder/Obsidian Vault";

export const vaultRoutes = new Elysia({ prefix: "/api/vault" })
  .get("/notes", async () => {
    return await dbQuery("SELECT * FROM vault_notes ORDER BY indexed_at DESC");
  })
  .get("/notes/:folder", async ({ params }) => {
    return await dbQuery("SELECT * FROM vault_notes WHERE folder = $1", [params.folder]);
  }, {
    params: t.Object({ folder: t.String() }),
  })
  .get("/search", async ({ query }) => {
    const q = `%${(query.q ?? "").toLowerCase()}%`;
    if (!q || q === "%%") return [];
    return await dbQuery("SELECT * FROM vault_notes WHERE LOWER(title) LIKE $1 OR LOWER(tags) LIKE $1 OR LOWER(folder) LIKE $1", [q]);
  }, {
    query: t.Object({ q: t.String() }),
  })
  .post("/sync", async () => {
    const now = new Date().toISOString();
    let count = 0;

    async function scanDir(dir: string, folder: string) {
      try {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith(".") || entry.name === "attachments") continue;
          const fullPath = join(dir, entry.name);
          if (entry.isDirectory()) {
            await scanDir(fullPath, folder ? `${folder}/${entry.name}` : entry.name);
          } else if (entry.name.endsWith(".md")) {
            const stats = await stat(fullPath);
            const title = entry.name.replace(".md", "").replace(/_/g, " ");
            const relativePath = fullPath.replace(VAULT_PATH + "/", "");
            const existing = await dbGet("SELECT id FROM vault_notes WHERE path = $1", [relativePath]);
            if (existing) {
              await dbRun("UPDATE vault_notes SET title = $1, last_modified = $2, indexed_at = $3 WHERE path = $4", [title, stats.mtime.toISOString(), now, relativePath]);
            } else {
              await dbRun("INSERT INTO vault_notes (path, title, folder, last_modified, indexed_at) VALUES ($1, $2, $3, $4, $5)", [relativePath, title, folder || "root", stats.mtime.toISOString(), now]);
            }
            count++;
          }
        }
      } catch {
        // skip inaccessible dirs
      }
    }

    await scanDir(VAULT_PATH, "");
    return { synced: count, timestamp: now };
  })
  .get("/stats", async () => {
    const rows = await dbQuery("SELECT folder, COUNT(*) as count FROM vault_notes GROUP BY folder ORDER BY count DESC") as any[];
    const folders: Record<string, number> = {};
    for (const row of rows) {
      folders[row.folder] = row.count;
    }
    const total = await dbGet("SELECT COUNT(*) as c FROM vault_notes") as any;
    return { total: total?.c ?? 0, folders };
  });
