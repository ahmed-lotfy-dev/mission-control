import { Elysia } from "elysia";
import { db } from "../db";

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

    const agents = db.query("SELECT * FROM agent_snapshots ORDER BY last_active DESC").all();

    const scheduled = db.query("SELECT * FROM scheduled_tasks").all() as any[];

    const recentContent = db.query("SELECT * FROM content_assets ORDER BY created_at DESC LIMIT 5").all();

    const vaultTotal = db.query("SELECT COUNT(*) as c FROM vault_notes").get() as any;

    return {
      date: today,
      tasks: taskStats,
      goals: todayGoals ? { ...todayGoals, goals: JSON.parse(todayGoals.goals) } : { date: today, goals: [], journal: "", mood: "" },
      agents,
      scheduled: { total: scheduled.length, enabled: scheduled.filter(s => s.enabled).length },
      recentContent,
      vault: { total: vaultTotal?.c ?? 0 },
    };
  });
