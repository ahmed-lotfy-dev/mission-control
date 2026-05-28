import { useEffect, useState } from "react";
import { api, today, type DailyGoal } from "../lib/api";

const MOODS = ["😀", "😊", "😐", "😤", "😴", "🤔", "💪", "🎉"];

export default function Daily() {
  const [date, setDate] = useState(today());
  const [data, setData] = useState<DailyGoal>({ date: today(), goals: [], journal: "", mood: "" });
  const [loading, setLoading] = useState(true);
  const [newGoal, setNewGoal] = useState("");

  const load = () => {
    setLoading(true);
    api<DailyGoal>(`/goals/${date}`).then(setData).finally(() => setLoading(false));
  };

  useEffect(load, [date]);

  const addGoal = async () => {
    if (!newGoal.trim()) return;
    const goals = [...data.goals, { text: newGoal.trim(), done: false }];
    await api(`/goals/${date}`, { method: "POST", body: JSON.stringify({ goals }) });
    setNewGoal("");
    load();
  };

  const toggleGoal = async (index: number) => {
    const goals = data.goals.map((g, i) => i === index ? { ...g, done: !g.done } : g);
    await api(`/goals/${date}`, { method: "POST", body: JSON.stringify({ goals }) });
    load();
  };

  const removeGoal = async (index: number) => {
    const goals = data.goals.filter((_, i) => i !== index);
    await api(`/goals/${date}`, { method: "POST", body: JSON.stringify({ goals }) });
    load();
  };

  const setMood = async (mood: string) => {
    await api(`/goals/${date}`, { method: "POST", body: JSON.stringify({ mood }) });
    load();
  };

  const saveJournal = async () => {
    await api(`/goals/${date}`, { method: "POST", body: JSON.stringify({ journal: data.journal }) });
  };

  const changeDate = (offset: number) => {
    const d = new Date(date);
    if (offset === 0) {
      setDate(today());
    } else {
      d.setDate(d.getDate() + offset);
      setDate(d.toISOString().split("T")[0]);
    }
  };

  if (loading) return <div className="loading-state"><div className="loading-spinner" />Loading...</div>;

  const displayDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Daily Journal</h1>
          <div className="subtitle">{displayDate}</div>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-ghost" onClick={() => changeDate(-1)}>← Prev</button>
          <button className="btn btn-ghost" onClick={() => changeDate(1)}>Next →</button>
          <button className="btn btn-primary" onClick={() => changeDate(0)}>Today</button>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Goals</h3>
          <div className="mt-12">
            {data.goals.length > 0
              ? data.goals.map((g, i) => (
                  <div key={i} className={`goal-item${g.done ? " done" : ""}`}>
                    <input type="checkbox" checked={g.done} onChange={() => toggleGoal(i)} />
                    <span className="flex-1 text-[13px]">{g.text}</span>
                    <button className="btn btn-sm btn-ghost" onClick={() => removeGoal(i)}>✕</button>
                  </div>
                ))
              : <div className="text-[13px] text-text-dim mb-3">No goals yet.</div>
            }
          </div>
          <div className="flex gap-sm mt-12">
            <input
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addGoal()}
              placeholder="Add a goal..."
            />
            <button className="btn btn-primary" onClick={addGoal}>+ Add</button>
          </div>
        </div>

        <div>
          <div className="card mb-16">
            <h3>Mood</h3>
            <div className="flex flex-wrap gap-sm mt-12">
              {MOODS.map((m) => (
                <button
                  key={m}
                  className={`mood-btn${data.mood === m ? " active" : ""}`}
                  onClick={() => setMood(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>Journal</h3>
            <textarea
              className="mt-12 min-h-[200px]"
              value={data.journal}
              onChange={(e) => setData({ ...data, journal: e.target.value })}
              placeholder="What happened today? Thoughts, decisions, ideas..."
            />
            <button className="btn btn-primary mt-12" onClick={saveJournal}>Save Journal</button>
          </div>
        </div>
      </div>
    </div>
  );
}
