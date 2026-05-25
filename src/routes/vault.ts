import { Elysia, t } from "elysia";
import { db } from "../db";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const VAULT_PATH = "/mnt/hdd/home-folder/Obsidian Vault";

export const vaultRoutes = new Elysia({ prefix: "/api/vault" })
  .get("/notes", () => {
    return db.query("SELECT * FROM vault_notes ORDER BY indexed_at DESC").all();
  })
  .get("/notes/:folder", ({ params }) => {
    return db.query("SELECT * FROM vault_notes WHERE folder = ?").all(params.folder);
  }, {
    params: t.Object({ folder: t.String() }),
  })
  .get("/search", ({ query }) => {
    const q = `%${(query.q ?? "").toLowerCase()}%`;
    if (!q || q === "%%") return [];
    return db.query("SELECT * FROM vault_notes WHERE LOWER(title) LIKE ? OR LOWER(tags) LIKE ? OR LOWER(folder) LIKE ?").all(q, q, q);
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
            const existing = db.query("SELECT id FROM vault_notes WHERE path = ?").get(relativePath);
            if (existing) {
              db.run("UPDATE vault_notes SET title = ?, last_modified = ?, indexed_at = ? WHERE path = ?", [title, stats.mtime.toISOString(), now, relativePath]);
            } else {
              db.run("INSERT INTO vault_notes (path, title, folder, last_modified, indexed_at) VALUES (?, ?, ?, ?, ?)", [relativePath, title, folder || "root", stats.mtime.toISOString(), now]);
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
  .get("/stats", () => {
    const rows = db.query("SELECT folder, COUNT(*) as count FROM vault_notes GROUP BY folder ORDER BY count DESC").all() as any[];
    const folders: Record<string, number> = {};
    for (const row of rows) {
      folders[row.folder] = row.count;
    }
    const total = db.query("SELECT COUNT(*) as c FROM vault_notes").get() as any;
    return { total: total.c, folders };
  });
