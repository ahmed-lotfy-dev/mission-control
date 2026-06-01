import { getRawDB } from "./index";

export function runMigration(name: string, sql: string) {
  const db = getRawDB();
  try {
    db.exec(sql);
    console.log(`[migration] ${name} — OK`);
  } catch (e: any) {
    if (e.message?.includes("duplicate column") || e.message?.includes("already exists")) {
      console.log(`[migration] ${name} — already applied`);
    } else {
      console.error(`[migration] ${name} — ERROR:`, e.message);
    }
  }
}

export function applyAll() {
  // ── Crawl Sessions ──
  runMigration("crawl_sessions", `
    CREATE TABLE IF NOT EXISTS crawl_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'idle',
      total_pages INTEGER DEFAULT 0,
      crawled_pages INTEGER DEFAULT 0,
      started_at TEXT DEFAULT '',
      finished_at TEXT DEFAULT '',
      config TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ── Crawled Pages ──
  runMigration("crawl_pages", `
    CREATE TABLE IF NOT EXISTS crawl_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      http_status INTEGER DEFAULT 0,
      response_time_ms INTEGER DEFAULT 0,
      page_size_bytes INTEGER DEFAULT 0,
      title TEXT DEFAULT '',
      title_length INTEGER DEFAULT 0,
      meta_description TEXT DEFAULT '',
      meta_desc_length INTEGER DEFAULT 0,
      h1_text TEXT DEFAULT '',
      h1_count INTEGER DEFAULT 0,
      h2_count INTEGER DEFAULT 0,
      h3_count INTEGER DEFAULT 0,
      h4_count INTEGER DEFAULT 0,
      h5_count INTEGER DEFAULT 0,
      h6_count INTEGER DEFAULT 0,
      canonical_url TEXT DEFAULT '',
      is_self_referencing_canonical INTEGER DEFAULT 0,
      has_robots_noindex INTEGER DEFAULT 0,
      has_robots_nofollow INTEGER DEFAULT 0,
      html_lang TEXT DEFAULT '',
      viewport_meta INTEGER DEFAULT 0,
      word_count INTEGER DEFAULT 0,
      content_hash TEXT DEFAULT '',
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
      images_without_alt INTEGER DEFAULT 0,
      total_images INTEGER DEFAULT 0,
      large_images INTEGER DEFAULT 0,
      images_without_lazy INTEGER DEFAULT 0,
      has_sitemap_entry INTEGER DEFAULT 0,
      is_orphan INTEGER DEFAULT 0,
      crawled_at TEXT DEFAULT '',
      FOREIGN KEY (session_id) REFERENCES crawl_sessions(id) ON DELETE CASCADE
    )
  `);

  // ── SEO Issues ──
  runMigration("seo_issues", `
    CREATE TABLE IF NOT EXISTS seo_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      page_id INTEGER,
      url TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'technical',
      severity TEXT NOT NULL DEFAULT 'warning',
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      recommendation TEXT DEFAULT '',
      element TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      ignored INTEGER DEFAULT 0,
      created_at TEXT DEFAULT '',
      FOREIGN KEY (session_id) REFERENCES crawl_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (page_id) REFERENCES crawl_pages(id) ON DELETE SET NULL
    )
  `);

  createIndexIfMissing("seo_issues", "idx_seo_issues_session", "CREATE INDEX IF NOT EXISTS idx_seo_issues_session ON seo_issues(session_id)");
  createIndexIfMissing("seo_issues", "idx_seo_issues_severity", "CREATE INDEX IF NOT EXISTS idx_seo_issues_severity ON seo_issues(severity)");
  createIndexIfMissing("seo_issues", "idx_seo_issues_category", "CREATE INDEX IF NOT EXISTS idx_seo_issues_category ON seo_issues(category)");
  createIndexIfMissing("seo_issues", "idx_seo_issues_status", "CREATE INDEX IF NOT EXISTS idx_seo_issues_status ON seo_issues(status)");

  // ── Links ──
  runMigration("seo_links", `
    CREATE TABLE IF NOT EXISTS seo_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      source_page_id INTEGER NOT NULL,
      target_url TEXT NOT NULL,
      anchor_text TEXT DEFAULT '',
      is_internal INTEGER DEFAULT 1,
      is_nofollow INTEGER DEFAULT 0,
      http_status INTEGER DEFAULT 0,
      is_broken INTEGER DEFAULT 0,
      created_at TEXT DEFAULT '',
      FOREIGN KEY (session_id) REFERENCES crawl_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (source_page_id) REFERENCES crawl_pages(id) ON DELETE CASCADE
    )
  `);

  createIndexIfMissing("seo_links", "idx_seo_links_session", "CREATE INDEX IF NOT EXISTS idx_seo_links_session ON seo_links(session_id)");
  createIndexIfMissing("seo_links", "idx_seo_links_broken", "CREATE INDEX IF NOT EXISTS idx_seo_links_broken ON seo_links(is_broken) WHERE is_broken = 1");

  // ── Redirect Chains ──
  runMigration("seo_redirects", `
    CREATE TABLE IF NOT EXISTS seo_redirects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      start_url TEXT NOT NULL,
      end_url TEXT NOT NULL,
      chain_length INTEGER DEFAULT 0,
      chain_codes TEXT DEFAULT '[]',
      chain_urls TEXT DEFAULT '[]',
      is_loop INTEGER DEFAULT 0,
      leads_to_broken INTEGER DEFAULT 0,
      created_at TEXT DEFAULT '',
      FOREIGN KEY (session_id) REFERENCES crawl_sessions(id) ON DELETE CASCADE
    )
  `);

  // ── Hreflang ──
  runMigration("seo_hreflang", `
    CREATE TABLE IF NOT EXISTS seo_hreflang (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      page_id INTEGER NOT NULL,
      source_url TEXT NOT NULL,
      hreflang_value TEXT NOT NULL,
      target_url TEXT NOT NULL,
      target_http_status INTEGER DEFAULT 0,
      is_self_reference INTEGER DEFAULT 0,
      has_reciprocal INTEGER DEFAULT 0,
      is_valid_code INTEGER DEFAULT 1,
      issue TEXT DEFAULT '',
      created_at TEXT DEFAULT '',
      FOREIGN KEY (session_id) REFERENCES crawl_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (page_id) REFERENCES crawl_pages(id) ON DELETE CASCADE
    )
  `);

  // ── Images ──
  runMigration("seo_images", `
    CREATE TABLE IF NOT EXISTS seo_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      page_id INTEGER NOT NULL,
      page_url TEXT NOT NULL,
      image_url TEXT NOT NULL,
      alt_text TEXT DEFAULT '',
      has_alt INTEGER DEFAULT 0,
      is_empty_alt INTEGER DEFAULT 0,
      is_lazy_loaded INTEGER DEFAULT 0,
      format TEXT DEFAULT '',
      estimated_size INTEGER DEFAULT 0,
      http_status INTEGER DEFAULT 0,
      is_broken INTEGER DEFAULT 0,
      width INTEGER DEFAULT 0,
      height INTEGER DEFAULT 0,
      created_at TEXT DEFAULT '',
      FOREIGN KEY (session_id) REFERENCES crawl_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (page_id) REFERENCES crawl_pages(id) ON DELETE CASCADE
    )
  `);

  // ── Sitemap URLs ──
  runMigration("seo_sitemap_urls", `
    CREATE TABLE IF NOT EXISTS seo_sitemap_urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      lastmod TEXT DEFAULT '',
      changefreq TEXT DEFAULT '',
      priority REAL DEFAULT 0,
      is_crawled INTEGER DEFAULT 0,
      http_status INTEGER DEFAULT 0,
      created_at TEXT DEFAULT '',
      FOREIGN KEY (session_id) REFERENCES crawl_sessions(id) ON DELETE CASCADE
    )
  `);

  // ── Robots.txt ──
  runMigration("seo_robots", `
    CREATE TABLE IF NOT EXISTS seo_robots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      content TEXT DEFAULT '',
      has_sitemap_directive INTEGER DEFAULT 0,
      sitemap_urls TEXT DEFAULT '[]',
      disallow_rules TEXT DEFAULT '[]',
      allow_rules TEXT DEFAULT '[]',
      crawl_delay INTEGER DEFAULT 0,
      has_host_directive INTEGER DEFAULT 0,
      host_value TEXT DEFAULT '',
      issues TEXT DEFAULT '[]',
      created_at TEXT DEFAULT '',
      FOREIGN KEY (session_id) REFERENCES crawl_sessions(id) ON DELETE CASCADE
    )
  `);

  // ── PSI Cache ──
  runMigration("psi_cache", `
    CREATE TABLE IF NOT EXISTS psi_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL UNIQUE,
      performance INTEGER DEFAULT 0,
      accessibility INTEGER DEFAULT 0,
      best_practices INTEGER DEFAULT 0,
      seo INTEGER DEFAULT 0,
      lcp REAL DEFAULT 0,
      inp REAL DEFAULT 0,
      cls REAL DEFAULT 0,
      ttfb REAL DEFAULT 0,
      fcp REAL DEFAULT 0,
      tti REAL DEFAULT 0,
      speed_index REAL DEFAULT 0,
      total_blocking_time REAL DEFAULT 0,
      opportunities TEXT DEFAULT '[]',
      diagnostics TEXT DEFAULT '[]',
      raw_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT DEFAULT ''
    )
  `);

  // ── GSC Cache ──
  runMigration("gsc_cache", `
    CREATE TABLE IF NOT EXISTS gsc_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_url TEXT NOT NULL,
      query TEXT DEFAULT '',
      page TEXT DEFAULT '',
      country TEXT DEFAULT '',
      device TEXT DEFAULT '',
      clicks INTEGER DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      ctr REAL DEFAULT 0,
      position REAL DEFAULT 0,
      date TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ── Crawl queue for progress tracking ──
  runMigration("crawl_progress", `
    CREATE TABLE IF NOT EXISTS crawl_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      current_url TEXT DEFAULT '',
      pages_done INTEGER DEFAULT 0,
      pages_total INTEGER DEFAULT 0,
      eta_seconds INTEGER DEFAULT 0,
      log_message TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES crawl_sessions(id) ON DELETE CASCADE
    )
  `);

  console.log("[migration] all done");
}

function createIndexIfMissing(table: string, name: string, sql: string) {
  try {
    const db = getRawDB();
    db.exec(sql);
  } catch (e: any) {
    // ignore
  }
}
