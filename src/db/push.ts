import { Database } from "bun:sqlite";

const db = new Database("mission-control.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'backlog',
    priority TEXT NOT NULL DEFAULT 'medium',
    project TEXT DEFAULT '',
    tags TEXT DEFAULT '',
    due_date TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS daily_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    goals TEXT NOT NULL DEFAULT '[]',
    journal TEXT DEFAULT '',
    mood TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    schedule TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'script',
    payload TEXT NOT NULL DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1,
    last_run TEXT DEFAULT '',
    last_status TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS agent_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    model TEXT DEFAULT '',
    version TEXT DEFAULT '',
    icon TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'idle',
    last_active TEXT DEFAULT '',
    pid INTEGER DEFAULT NULL,
    endpoint TEXT DEFAULT '',
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS agent_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    event TEXT NOT NULL,
    message TEXT DEFAULT '',
    level TEXT NOT NULL DEFAULT 'info',
    created_at TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (agent_id) REFERENCES agent_snapshots(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS content_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    prompt TEXT DEFAULT '',
    file_path TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS vault_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    folder TEXT NOT NULL,
    tags TEXT DEFAULT '',
    last_modified TEXT DEFAULT '',
    indexed_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS seo_keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL UNIQUE,
    volume INTEGER DEFAULT 0,
    difficulty REAL DEFAULT 0,
    related TEXT DEFAULT '[]',
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS seo_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    target_url TEXT DEFAULT '',
    title TEXT DEFAULT '',
    meta_description TEXT DEFAULT '',
    headings TEXT DEFAULT '[]',
    body TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS seo_ranks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    url TEXT DEFAULT '',
    check_date TEXT NOT NULL DEFAULT '',
    notes TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS seo_audits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    title TEXT DEFAULT '',
    meta_description TEXT DEFAULT '',
    headings_count INTEGER DEFAULT 0,
    links_count INTEGER DEFAULT 0,
    has_meta INTEGER DEFAULT 0,
    has_title INTEGER DEFAULT 0,
    page_size INTEGER DEFAULT 0,
    issues TEXT DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT ''
  );
`);

console.log("Database tables created/verified.");
db.close();
