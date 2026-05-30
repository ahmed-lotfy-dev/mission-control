import { Elysia, t } from "elysia";
import { dbQuery, dbGet, dbRun } from "../db";

export const goalsRoutes = new Elysia({ prefix: "/api/goals" })
  .get("/:date", async ({ params }) => {
    const goal = await dbGet("SELECT * FROM daily_goals WHERE date = $1", [params.date]);
    if (!goal) {
      const now = new Date().toISOString();
      await dbRun("INSERT INTO daily_goals (date, goals, created_at, updated_at) VALUES ($1, '[]', $2, $3)", [params.date, now, now]);
      return { date: params.date, goals: [], journal: "", mood: "" };
    }
    return { ...goal, goals: JSON.parse(goal.goals) };
  }, {
    params: t.Object({ date: t.String() }),
  })
  .post("/:date", async ({ params, body }) => {
    const now = new Date().toISOString();
    const existing = await dbGet("SELECT id FROM daily_goals WHERE date = $1", [params.date]);
    if (existing) {
      const sets: string[] = [];
      const vals: any[] = [];
      let i = 1;
      if (body.goals !== undefined) { sets.push(`goals = $${i++}`); vals.push(JSON.stringify(body.goals)); }
      if (body.journal !== undefined) { sets.push(`journal = $${i++}`); vals.push(body.journal); }
      if (body.mood !== undefined) { sets.push(`mood = $${i++}`); vals.push(body.mood); }
      sets.push(`updated_at = $${i++}`);
      vals.push(now, params.date);
      await dbRun(`UPDATE daily_goals SET ${sets.join(", ")} WHERE date = $${i}`, vals);
    } else {
      await dbRun(
        "INSERT INTO daily_goals (date, goals, journal, mood, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
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
  .get("/range/:from/:to", async ({ params }) => {
    const rows = await dbQuery("SELECT * FROM daily_goals WHERE date >= $1 AND date <= $2 ORDER BY date", [params.from, params.to]);
    return rows.map((g: any) => ({ ...g, goals: JSON.parse(g.goals) }));
  }, {
    params: t.Object({ from: t.String(), to: t.String() }),
  });
