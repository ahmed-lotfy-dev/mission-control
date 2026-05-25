import { Elysia } from "elysia";
import { db } from "../db";

type AgentRow = {
  id: number;
  name: string;
  model: string;
  version: string;
  icon: string;
  status: string;
  last_active: string;
  pid: number | null;
  endpoint: string;
  metadata: string;
  created_at: string;
};

function computeAgentStatus(agent: AgentRow): { status: string; pid: number | null } {
  // Check if a matching process is running
  const proc = (() => {
    try {
      const result = Bun.spawnSync(["pgrep", "-f", "-n", agent.name], {});
      if (result.exitCode === 0) {
        const pid = parseInt(result.stdout.toString().trim(), 10);
        return { running: !isNaN(pid), pid: isNaN(pid) ? null : pid };
      }
    } catch {}
    return { running: false, pid: null };
  })();
  if (proc.running) return { status: "working", pid: proc.pid };
  if (agent.last_active) {
    const ago = Date.now() - new Date(agent.last_active).getTime();
    if (ago < 300_000) return { status: "online", pid: null };
  }
  if (agent.pid) {
    try {
      const result = Bun.spawnSync(["kill", "-0", String(agent.pid)], {});
      if (result.exitCode === 0) return { status: "working", pid: agent.pid };
    } catch {}
  }
  return { status: "offline", pid: null };
}

export const dashboardRoutes = new Elysia({ prefix: "/api/dashboard" })
  .get("/", () => {
    const today = new Date().toISOString().split("T")[0];

    const allTasks = db.query("SELECT * FROM tasks").all() as any[];
    const taskStats = {
      total: allTasks.length,
      backlog: allTasks.filter(t => t.status === "backlog").length,
      todo: allTasks.filter(t => t.status === "todo").length,
      inProgress: allTasks.filter(t => t.status === "in_progress").length,
      done: allTasks.filter(t => t.status === "done").length,
    };

    const todayGoals = db.query("SELECT * FROM daily_goals WHERE date = ?").get(today) as any;

    // Enhanced agent data with live status
    const agents = db.query("SELECT * FROM agent_snapshots ORDER BY id ASC").all() as AgentRow[];
    const enhancedAgents = agents.map(a => {
      const { status, pid } = computeAgentStatus(a);
      return {
        ...a,
        icon: a.icon || "",
        metadata: safeJson(a.metadata),
        status,
        pid,
      };
    });

    const scheduled = db.query("SELECT * FROM scheduled_tasks").all() as any[];
    const recentContent = db.query("SELECT * FROM content_assets ORDER BY created_at DESC LIMIT 5").all();
    const vaultTotal = db.query("SELECT COUNT(*) as c FROM vault_notes").get() as any;

    return {
      date: today,
      tasks: taskStats,
      goals: todayGoals ? { ...todayGoals, goals: JSON.parse(todayGoals.goals) } : { date: today, goals: [], journal: "", mood: "" },
      agents: enhancedAgents,
      scheduled: { total: scheduled.length, enabled: scheduled.filter(s => s.enabled).length },
      recentContent,
      vault: { total: vaultTotal?.c ?? 0 },
    };
  });

function safeJson(str: string): any {
  try { return JSON.parse(str); } catch { return {}; }
}