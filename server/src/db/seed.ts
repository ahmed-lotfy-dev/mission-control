import { dbRun, dbQuery, dbInsert } from "../db";

const now = new Date().toISOString();

// Clear and re-seed with agents that are actually running
await dbRun("DELETE FROM agent_logs");
await dbRun("DELETE FROM agent_snapshots");

// Detect what's actually running
function isRunning(pattern: string): boolean {
  try {
    const r = Bun.spawnSync(["pgrep", "-f", pattern], { stdout: "pipe" });
    return r.exitCode === 0;
  } catch { return false }
}

const agents = [
  {
    name: "Hermes",
    model: "openrouter/owl-alpha",
    version: "1.0",
    icon: "🦊",
    status: isRunning("hermes") ? "working" : "idle",
    endpoint: "",
    metadata: { provider: "openrouter", contextWindow: "200k", type: "agent" },
  },
  {
    name: "Antigravity",
    model: "claude-sonnet-4-20250514",
    version: "7.2.49",
    icon: "🚀",
    status: isRunning("antigravity") ? "working" : "idle",
    endpoint: "",
    metadata: { provider: "anthropic", contextWindow: "200k", type: "electron", platform: "linux" },
  },
  {
    name: "Codex",
    model: "gpt-4o",
    version: "26.5519.32039",
    icon: "📝",
    status: isRunning("codex") ? "working" : "idle",
    endpoint: "",
    metadata: { provider: "openai", contextWindow: "128k", type: "vscode-extension" },
  },
];

for (const a of agents) {
  const pidResult = Bun.spawnSync(["pgrep", "-f", "-n", a.name.toLowerCase()], { stdout: "pipe" });
  const pidStr = pidResult.stdout.toString().trim();
  const pid = pidStr && !isNaN(parseInt(pidStr)) ? parseInt(pidStr) : null;

  const id = await dbInsert(
    "INSERT INTO agent_snapshots (name, model, version, icon, status, last_active, pid, endpoint, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
    [a.name, a.model, a.version, a.icon, a.status, now, pid, a.endpoint, JSON.stringify(a.metadata), now]
  );

  await dbRun(
    "INSERT INTO agent_logs (agent_id, event, message, level, created_at) VALUES ($1, $2, $3, $4, $5)",
    [id, "registered", `Agent ${a.name} auto-detected via pgrep — ${a.status}`, "info", now]
  );
}

console.log(`Seeded ${agents.length} agents from live process detection.`);
