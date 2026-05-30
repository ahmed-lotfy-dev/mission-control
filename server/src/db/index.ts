import { Database } from "bun:sqlite";
import { join } from "node:path";

let _db: Database | null = null;

function getDB(): Database {
  if (!_db) {
    const envPath = process.env.DB_PATH;
    const defaultPath = join(import.meta.dir, "../../../mission-control.db");
    const dbPath = envPath || defaultPath;

    // Ensure parent dir exists (skip for Docker paths that mount volumes)
    const dir = dbPath.substring(0, dbPath.lastIndexOf("/"));
    if (dir && !dir.startsWith("/data") && !dir.startsWith("/app")) {
      try { Bun.write(join(dir, ".keep"), ""); } catch {}
    }

    _db = new Database(dbPath, { create: true });
    _db.exec("PRAGMA journal_mode = WAL");
    _db.exec("PRAGMA foreign_keys = ON");
    _db.exec("PRAGMA busy_timeout = 5000");
    ensureTables(_db);
  }
  return _db;
}

function ensureTables(db: Database) {
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
      prompt TEXT DEFAULT '', file_path TEXT DEFAULT '', image_data TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending', metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT ''
    )`,
    `CREATE TABLE IF NOT EXISTS vault_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
      folder TEXT NOT NULL, tags TEXT DEFAULT '', last_modified TEXT DEFAULT '',
      indexed_at TEXT NOT NULL DEFAULT ''
    )`,
    `CREATE TABLE IF NOT EXISTS seo_keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT, keyword TEXT NOT NULL UNIQUE,
      volume INTEGER DEFAULT 0, difficulty REAL DEFAULT 0,
      related TEXT DEFAULT '[]', notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT ''
    )`,
    `CREATE TABLE IF NOT EXISTS seo_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT, keyword TEXT NOT NULL,
      target_url TEXT DEFAULT '', title TEXT DEFAULT '', meta_description TEXT DEFAULT '',
      headings TEXT DEFAULT '[]', body TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'draft',
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
    try { db.exec(sql); } catch (e) {
      console.error("[db] create table error:", e);
    }
  }
}

// ── Convert $N PostgreSQL-style params to SQLite ? ──
// All route files use $1, $2, $3 etc. SQLite uses ? for positional.
// We do a single pass: replace $N with ?, preserving position order.
function convertSQL(sql: string): string {
  return sql.replace(/\$(\d+)/g, "?");
}

// ── Query helpers ──

export function dbQuery(text: string, params?: any[]): any[] {
  const db = getDB();
  const sql = convertSQL(text);
  const stmt = db.prepare(sql);
  const result = params && params.length > 0 ? stmt.all(...params) : stmt.all();
  return result;
}

export function dbGet(text: string, params?: any[]): any | null {
  const rows = dbQuery(text, params);
  return rows[0] ?? null;
}

export function dbRun(text: string, params?: any[]): { rows: any[]; rowCount: number } {
  const db = getDB();
  const sql = convertSQL(text);
  const stmt = db.prepare(sql);
  if (params && params.length > 0) {
    stmt.run(...params);
  } else {
    stmt.run();
  }
  return { rows: [], rowCount: stmt.changes };
}

export function dbInsert(text: string, params?: any[]): number {
  const db = getDB();
  // Remove RETURNING id if present (SQLite doesn't support it in INSERT)
  const sql = convertSQL(text).replace(/\s+RETURNING\s+\w+/i, "");
  const stmt = db.prepare(sql);
  if (params && params.length > 0) {
    stmt.run(...params);
  } else {
    stmt.run();
  }
  return Number(db.lastInsertRowId);
}

// Direct access to raw Database for advanced usage
export function getRawDB(): Database {
  return getDB();
}
