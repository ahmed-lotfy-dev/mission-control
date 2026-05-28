import { Database } from "bun:sqlite";

let _db: Database | null = null;

function initDB(): Database {
  if (!_db) {
    const dbPath = process.env.DB_PATH || "/data/mission-control.db";
    const dir = dbPath.substring(0, dbPath.lastIndexOf("/"));
    if (dir && dir !== "/data" && !Bun.file(dir).exists()) {
      try { Bun.write(dir + "/.keep", ""); } catch {}
    }
    _db = new Database(dbPath, { create: true });
    _db.exec("PRAGMA journal_mode = WAL");
    _db.exec("PRAGMA foreign_keys = ON");
  }
  return _db;
}

export const db = new Proxy({} as Database, {
  get(_, prop) {
    return (initDB() as any)[prop];
  },
});

export function getDB(): Database {
  return initDB();
}

export type DB = Database;
