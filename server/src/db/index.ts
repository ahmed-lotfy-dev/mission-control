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
    // ── SEO Dashboard: Crawl Sessions ──
    `CREATE TABLE IF NOT EXISTS seo_crawl_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'idle',
      pages_crawled INTEGER DEFAULT 0,
      total_pages INTEGER DEFAULT 0,
      started_at TEXT DEFAULT '',
      finished_at TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT ''
    )`,
    // ── SEO Dashboard: Crawled Pages ──
    `CREATE TABLE IF NOT EXISTS seo_crawl_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      path TEXT DEFAULT '',
      http_status INTEGER DEFAULT 0,
      response_time_ms INTEGER DEFAULT 0,
      page_size_kb REAL DEFAULT 0,
      word_count INTEGER DEFAULT 0,
      title TEXT DEFAULT '',
      title_length INTEGER DEFAULT 0,
      meta_description TEXT DEFAULT '',
      meta_description_length INTEGER DEFAULT 0,
      h1 TEXT DEFAULT '',
      h1_count INTEGER DEFAULT 0,
      h2_count INTEGER DEFAULT 0,
      h3_count INTEGER DEFAULT 0,
      h4_count INTEGER DEFAULT 0,
      h5_count INTEGER DEFAULT 0,
      h6_count INTEGER DEFAULT 0,
      canonical TEXT DEFAULT '',
      is_self_canonical INTEGER DEFAULT 0,
      robots_meta TEXT DEFAULT '',
      has_noindex INTEGER DEFAULT 0,
      has_nofollow INTEGER DEFAULT 0,
      html_lang TEXT DEFAULT '',
      viewport_meta TEXT DEFAULT '',
      content_type TEXT DEFAULT '',
      og_title TEXT DEFAULT '',
      og_description TEXT DEFAULT '',
      og_image TEXT DEFAULT '',
      og_url TEXT DEFAULT '',
      og_type TEXT DEFAULT '',
      og_locale TEXT DEFAULT '',
      twitter_card TEXT DEFAULT '',
      twitter_title TEXT DEFAULT '',
      twitter_description TEXT DEFAULT '',
      twitter_image TEXT DEFAULT '',
      twitter_creator TEXT DEFAULT '',
      has_structured_data INTEGER DEFAULT 0,
      structured_data_types TEXT DEFAULT '[]',
      internal_links_count INTEGER DEFAULT 0,
      external_links_count INTEGER DEFAULT 0,
      nofollow_links_count INTEGER DEFAULT 0,
      is_orphan INTEGER DEFAULT 0,
      is_in_sitemap INTEGER DEFAULT 0,
      redirect_target TEXT DEFAULT '',
      redirect_type TEXT DEFAULT '',
      redirect_chain_length INTEGER DEFAULT 0,
      redirect_loop INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (session_id) REFERENCES seo_crawl_sessions(id) ON DELETE CASCADE
    )`,
    // ── SEO Dashboard: Issues ──
    `CREATE TABLE IF NOT EXISTS seo_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL DEFAULT 0,
      page_id INTEGER NOT NULL DEFAULT 0,
      page_url TEXT DEFAULT '',
      category TEXT NOT NULL DEFAULT 'technical',
      severity TEXT NOT NULL DEFAULT 'warning',
      title TEXT NOT NULL DEFAULT '',
      description TEXT DEFAULT '',
      recommendation TEXT DEFAULT '',
      is_ignored INTEGER DEFAULT 0,
      is_fixed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (session_id) REFERENCES seo_crawl_sessions(id) ON DELETE CASCADE
    )`,
    // ── SEO Dashboard: Links ──
    `CREATE TABLE IF NOT EXISTS seo_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL DEFAULT 0,
      source_page_id INTEGER NOT NULL DEFAULT 0,
      source_url TEXT DEFAULT '',
      target_url TEXT DEFAULT '',
      is_internal INTEGER DEFAULT 1,
      is_nofollow INTEGER DEFAULT 0,
      anchor_text TEXT DEFAULT '',
      http_status INTEGER DEFAULT 0,
      is_broken INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT ''
    )`,
    // ── SEO Dashboard: Images ──
    `CREATE TABLE IF NOT EXISTS seo_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL DEFAULT 0,
      page_id INTEGER NOT NULL DEFAULT 0,
      page_url TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      alt_text TEXT DEFAULT '',
      has_alt INTEGER DEFAULT 0,
      is_lazy_loaded INTEGER DEFAULT 0,
      file_format TEXT DEFAULT '',
      estimated_size_kb REAL DEFAULT 0,
      http_status INTEGER DEFAULT 0,
      is_broken INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT ''
    )`,
    // ── SEO Dashboard: Hreflang ──
    `CREATE TABLE IF NOT EXISTS seo_hreflang (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL DEFAULT 0,
      page_id INTEGER NOT NULL DEFAULT 0,
      page_url TEXT DEFAULT '',
      hreflang_value TEXT DEFAULT '',
      hreflang_url TEXT DEFAULT '',
      is_self_reference INTEGER DEFAULT 0,
      target_http_status INTEGER DEFAULT 0,
      has_reciprocal INTEGER DEFAULT 0,
      has_x_default INTEGER DEFAULT 0,
      is_valid INTEGER DEFAULT 1,
      issue TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT ''
    )`,
    // ── SEO Dashboard: Redirect Chains ──
    `CREATE TABLE IF NOT EXISTS seo_redirects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL DEFAULT 0,
      source_url TEXT DEFAULT '',
      chain TEXT DEFAULT '[]',
      chain_length INTEGER DEFAULT 0,
      final_url TEXT DEFAULT '',
      final_status INTEGER DEFAULT 0,
      is_loop INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT ''
    )`,
    // ── SEO Dashboard: Sitemap Entries ──
    `CREATE TABLE IF NOT EXISTS seo_sitemaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL DEFAULT 0,
      url TEXT DEFAULT '',
      lastmod TEXT DEFAULT '',
      changefreq TEXT DEFAULT '',
      priority REAL DEFAULT 0,
      is_crawled INTEGER DEFAULT 0,
      is_orphan INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT ''
    )`,
    // ── SEO Dashboard: PSI Cache ──
    `CREATE TABLE IF NOT EXISTS seo_psi_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      performance_score REAL DEFAULT 0,
      accessibility_score REAL DEFAULT 0,
      best_practices_score REAL DEFAULT 0,
      seo_score REAL DEFAULT 0,
      lcp REAL DEFAULT 0,
      inp REAL DEFAULT 0,
      cls REAL DEFAULT 0,
      ttfb REAL DEFAULT 0,
      fcp REAL DEFAULT 0,
      tti REAL DEFAULT 0,
      tbt REAL DEFAULT 0,
      speed_index REAL DEFAULT 0,
      opportunities TEXT DEFAULT '[]',
      diagnostics TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT ''
    )`,
    // ── SEO Dashboard: GSC Cache ──
    `CREATE TABLE IF NOT EXISTS seo_gsc_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT DEFAULT '',
      page TEXT DEFAULT '',
      clicks INTEGER DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      ctr REAL DEFAULT 0,
      position REAL DEFAULT 0,
      date TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT ''
    )`,
    // ── SEO Dashboard: Crawl Progress (for real-time updates) ──
    `CREATE TABLE IF NOT EXISTS seo_crawl_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL UNIQUE,
      pages_crawled INTEGER DEFAULT 0,
      total_pages INTEGER DEFAULT 0,
      current_url TEXT DEFAULT '',
      status TEXT DEFAULT 'idle',
      eta_seconds INTEGER DEFAULT 0,
      started_at TEXT DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
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
