import { db } from "../db";

const now = new Date().toISOString();

db.run("INSERT INTO tasks (title, description, status, priority, project, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ["Review SelfTracker food database PR", "Check the food DB import and API routes", "todo", "high", "SelfTracker", "code-review,food-db", now, now]);
db.run("INSERT INTO tasks (title, description, status, priority, project, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ["Set up Traefik for new service", "Configure reverse proxy", "backlog", "medium", "Infrastructure", "devops,traefik", now, now]);
db.run("INSERT INTO tasks (title, description, status, priority, project, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ["Write blog post about PG upgrade", "Document the zero-downtime upgrade process", "done", "low", "Drive Center", "blog,postgresql", now, now]);
db.run("INSERT INTO tasks (title, description, status, priority, project, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ["Build mission control dashboard", "Kanban, agents, content studio, vault integration", "in_progress", "urgent", "Mission Control", "dashboard,bun", now, now]);

db.run("INSERT INTO scheduled_tasks (name, description, schedule, type, payload, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)",
  ["Daily vault index sync", "Sync Obsidian vault notes to local cache", "0 6 * * *", "command", "cd /mnt/hdd/projects/mission-control && bun run src/scripts/sync-vault.ts", now, now]);
db.run("INSERT INTO scheduled_tasks (name, description, schedule, type, payload, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)",
  ["Weekly backup reminder", "Remind to backup databases", "0 10 * * 0", "webhook", "http://localhost:3000/api/reminders/backup", now, now]);

db.run("INSERT INTO agent_snapshots (name, model, version, status, last_active, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ["OWL (Hermes)", "openrouter/owl-alpha", "1.0", "running", now, JSON.stringify({ provider: "openrouter", contextWindow: "200k" }), now]);

console.log("Seed data inserted.");
