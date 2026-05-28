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
