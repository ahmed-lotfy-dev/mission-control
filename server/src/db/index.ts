import { Database } from "bun:sqlite";

let _db: Database | null = null;

function initDB(): Database {
  if (!_db) {
    _db = new Database("mission-control.db", { create: true });
    _db.exec("PRAGMA journal_mode = WAL");
    _db.exec("PRAGMA foreign_keys = ON");
  }
  return _db;
}

// Lazy Proxy — db.query(), db.run(), db.exec() all trigger init on first use
// NOT at import time, so the Bun event loop isn't blocked on cold start
export const db = new Proxy({} as Database, {
  get(_, prop) {
    return (initDB() as any)[prop];
  },
});

export function getDB(): Database {
  return initDB();
}

export type DB = Database;
