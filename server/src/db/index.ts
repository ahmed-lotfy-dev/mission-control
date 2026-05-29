import { Database } from "bun:sqlite";
import { join } from "node:path";

let _db: Database | null = null;

function initDB(): Database {
  if (!_db) {
    // Default: project root (3 levels up from server/src/db/)
    const defaultPath = join(import.meta.dir, "../../../mission-control.db");
    const dbPath = process.env.DB_PATH || defaultPath;
    const dir = dbPath.substring(0, dbPath.lastIndexOf("/"));
    if (dir && !dir.startsWith("/data") && !dir.startsWith("/app")) {
      try { Bun.write(dir + "/.keep", ""); } catch {}
    }
    _db = new Database(dbPath, { create: true });
    _db.exec("PRAGMA journal_mode = WAL");
    _db.exec("PRAGMA foreign_keys = ON");

    // ── Auto-migrate: create tables if they don't exist ──
    // Each table in its own exec so one failure doesn't block the rest
    const tables = [
      `CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'backlog', priority TEXT NOT NULL DEFAULT 'medium',
        project TEXT DEFAULT '', tags TEXT DEFAULT '', due_date TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT ''
      )`,
      `CREATE TABLE IF NOT EXISTS daily_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL UNIQUE,
        goals TEXT NOT NULL DEFAULT '[]', journal TEXT DEFAULT '', mood TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT ''
      )`,
      `CREATE TABLE IF NOT EXISTS scheduled_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT DEFAULT '',
        schedule TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'script', payload TEXT NOT NULL DEFAULT '',
        enabled INTEGER NOT NULL DEFAULT 1, last_run TEXT DEFAULT '', last_status TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT ''
      )`,
      `CREATE TABLE IF NOT EXISTS agent_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, model TEXT DEFAULT '',
        version TEXT DEFAULT '', icon TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'idle',
        last_active TEXT DEFAULT '', pid INTEGER DEFAULT NULL, endpoint TEXT DEFAULT '',
        metadata TEXT DEFAULT '{}', created_at TEXT NOT NULL DEFAULT ''
      )`,
      `CREATE TABLE IF NOT EXISTS agent_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, agent_id INTEGER NOT NULL, event TEXT NOT NULL,
        message TEXT DEFAULT '', level TEXT NOT NULL DEFAULT 'info', created_at TEXT NOT NULL DEFAULT '',
        FOREIGN KEY (agent_id) REFERENCES agent_snapshots(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS content_assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, title TEXT NOT NULL,
        prompt TEXT DEFAULT '', file_path TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'pending',
        metadata TEXT DEFAULT '{}', created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT ''
      )`,
      `CREATE TABLE IF NOT EXISTS vault_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
        folder TEXT NOT NULL, tags TEXT DEFAULT '', last_modified TEXT DEFAULT '',
        indexed_at TEXT NOT NULL DEFAULT ''
      )`,
      // ── SEO tables ──
      `CREATE TABLE IF NOT EXISTS seo_keywords (
        id INTEGER PRIMARY KEY AUTOINCREMENT, keyword TEXT NOT NULL UNIQUE,
        volume INTEGER DEFAULT 0, difficulty INTEGER DEFAULT 0,
        related TEXT DEFAULT '[]', notes TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT ''
      )`,
      `CREATE TABLE IF NOT EXISTS seo_content (
        id INTEGER PRIMARY KEY AUTOINCREMENT, keyword TEXT NOT NULL,
        target_url TEXT DEFAULT '', title TEXT DEFAULT '', meta_description TEXT DEFAULT '',
        headings TEXT DEFAULT '[]', body TEXT DEFAULT '', status TEXT DEFAULT 'generated',
        created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT ''
      )`,
      `CREATE TABLE IF NOT EXISTS seo_ranks (
        id INTEGER PRIMARY KEY AUTOINCREMENT, keyword TEXT NOT NULL,
        position INTEGER DEFAULT 0, url TEXT DEFAULT '',
        check_date TEXT NOT NULL DEFAULT '', notes TEXT DEFAULT ''
      )`,
      `CREATE TABLE IF NOT EXISTS seo_audits (
        id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT NOT NULL,
        score INTEGER DEFAULT 0, title TEXT DEFAULT '', meta_description TEXT DEFAULT '',
        headings_count INTEGER DEFAULT 0, links_count INTEGER DEFAULT 0,
        has_meta INTEGER DEFAULT 0, has_title INTEGER DEFAULT 0,
        page_size INTEGER DEFAULT 0, issues TEXT DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT ''
      )`,
    ];
    for (const sql of tables) {
      try { _db.exec(sql); } catch { /* table may already exist with different schema */ }
    }
  }
  return _db;
}

// Proxy-based db export — delegates all property access to the singleton Database instance.
// bun:sqlite's `.query` is a getter that uses a field accessor, which requires `this`
// to be the real Database instance. We bind methods to preserve context.
export const db: Database = new Proxy({} as Database, {
  get(_, prop) {
    const instance = initDB();
    const value = (instance as any)[prop];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

export function getDB(): Database {
  return initDB();
}

export type DB = Database;
