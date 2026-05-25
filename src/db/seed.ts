import { db } from "../db";

const now = new Date().toISOString();

// Clear and re-seed
db.run("DELETE FROM agent_logs");
db.run("DELETE FROM agent_snapshots");

const agents = [
  {
    name: "Hermes",
    model: "deepseek/deepseek-v4-flash:free",
    version: "1.0",
    icon: "🦊",
    status: "idle",
    endpoint: "",
    metadata: { provider: "nous", contextWindow: "200k", type: "chat" },
  },
  {
    name: "Antigravity",
    model: "claude-sonnet-4",
    version: "1.0",
    icon: "🚀",
    status: "idle",
    endpoint: "",
    metadata: { provider: "anthropic", contextWindow: "200k", type: "electron" },
  },
  {
    name: "Antigravity 2",
    model: "claude-sonnet-4",
    version: "2.0",
    icon: "🌟",
    status: "idle",
    endpoint: "",
    metadata: { provider: "anthropic", contextWindow: "200k", type: "electron" },
  },
  {
    name: "Claude Code",
    model: "claude-sonnet-4",
    version: "latest",
    icon: "💻",
    status: "idle",
    endpoint: "",
    metadata: { provider: "anthropic", contextWindow: "200k", type: "cli" },
  },
  {
    name: "Codex",
    model: "gpt-4o",
    version: "latest",
    icon: "📝",
    status: "idle",
    endpoint: "",
    metadata: { provider: "openai", contextWindow: "128k", type: "cli" },
  },
];

for (const a of agents) {
  db.run(
    "INSERT INTO agent_snapshots (name, model, version, icon, status, last_active, endpoint, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [a.name, a.model, a.version, a.icon, a.status, now, a.endpoint, JSON.stringify(a.metadata), now]
  );

  const row = db.query("SELECT id FROM agent_snapshots WHERE name = ?").get(a.name) as { id: number };
  db.run(
    "INSERT INTO agent_logs (agent_id, event, message, level, created_at) VALUES (?, ?, ?, ?, ?)",
    [row.id, "registered", `Agent ${a.name} registered in mission control`, "info", now]
  );
}

console.log(`Seeded ${agents.length} agents with initial activity logs.`);
db.close();