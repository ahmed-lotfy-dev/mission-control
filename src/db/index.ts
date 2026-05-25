import { Database } from "bun:sqlite";

export const db = new Database("mission-control.db", { create: true });

// Enable WAL mode for better concurrent access
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

export type DB = typeof db;
