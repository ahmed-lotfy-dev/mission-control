import { Elysia, t } from "elysia";
import { db } from "../db";

export const goalsRoutes = new Elysia({ prefix: "/api/goals" })
  .get("/:date", ({ params }) => {
    const goal = db.query("SELECT * FROM daily_goals WHERE date = ?").get(params.date) as any;
    if (!goal) {
      const now = new Date().toISOString();
      db.run("INSERT INTO daily_goals (date, goals, created_at, updated_at) VALUES (?, '[]', ?, ?)", [params.date, now, now]);
      return { date: params.date, goals: [], journal: "", mood: "" };
    }
    return { ...goal, goals: JSON.parse(goal.goals) };
  }, {
    params: t.Object({ date: t.String() }),
  })
  .post("/:date", ({ params, body }) => {
    const now = new Date().toISOString();
    const existing = db.query("SELECT id FROM daily_goals WHERE date = ?").get(params.date);
    if (existing) {
      const sets: string[] = [];
      const vals: (string | number)[] = [];
      if (body.goals !== undefined) { sets.push("goals = ?"); vals.push(JSON.stringify(body.goals)); }
      if (body.journal !== undefined) { sets.push("journal = ?"); vals.push(body.journal); }
      if (body.mood !== undefined) { sets.push("mood = ?"); vals.push(body.mood); }
      sets.push("updated_at = ?");
      vals.push(now, params.date);
      db.run(`UPDATE daily_goals SET ${sets.join(", ")} WHERE date = ?`, vals);
    } else {
      db.run(
        "INSERT INTO daily_goals (date, goals, journal, mood, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        [params.date, JSON.stringify(body.goals ?? []), body.journal ?? "", body.mood ?? "", now, now]
      );
    }
    return { date: params.date, goals: body.goals ?? [], journal: body.journal ?? "", mood: body.mood ?? "" };
  }, {
    params: t.Object({ date: t.String() }),
    body: t.Object({
      goals: t.Optional(t.Array(t.Object({ text: t.String(), done: t.Boolean() }))),
      journal: t.Optional(t.String()),
      mood: t.Optional(t.String()),
    }),
  })
  .get("/range/:from/:to", ({ params }) => {
    const rows = db.query("SELECT * FROM daily_goals WHERE date >= ? AND date <= ? ORDER BY date").all(params.from, params.to) as any[];
    return rows.map(g => ({ ...g, goals: JSON.parse(g.goals) }));
  }, {
    params: t.Object({ from: t.String(), to: t.String() }),
  });
