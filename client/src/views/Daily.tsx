import { useEffect, useState, useCallback } from "react";
import { api, today, type DailyGoal } from "../lib/api";
import { Plus, Trash2, Check, ChevronLeft, ChevronRight, Calendar as CalIcon, Smile, BookOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const MOODS = ["😀", "😊", "😐", "😤", "😴", "🤔", "💪", "🎉"];

export default function Daily() {
  const [date, setDate] = useState(today());
  const [data, setData] = useState<DailyGoal>({ date: today(), goals: [], journal: "", mood: "" });
  const [loading, setLoading] = useState(true);
  const [newGoal, setNewGoal] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api<DailyGoal>(`/goals/${date}`).then(setData).finally(() => setLoading(false));
  }, [date]);

  useEffect(load, [load]);

  const changeDate = useCallback((offset: number) => {
    if (offset === 0) {
      setDate(today());
      return;
    }
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    setDate(d.toISOString().split("T")[0]);
  }, [date]);

  const handlePrev = useCallback(() => changeDate(-1), [changeDate]);
  const handleNext = useCallback(() => changeDate(1), [changeDate]);
  const handleToday = useCallback(() => changeDate(0), [changeDate]);
  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) setDate(e.target.value);
  }, []);

  const addGoal = useCallback(() => {
    if (!newGoal.trim() || adding) return;
    setAdding(true);
    api<DailyGoal>(`/goals/${date}`, {
      method: "POST",
      body: JSON.stringify({ goals: [...data.goals, { text: newGoal.trim(), done: false }] }),
    }).finally(() => {
      setNewGoal("");
      setAdding(false);
      load();
    });
  }, [date, data.goals, newGoal, adding, load]);

  const toggleGoal = useCallback(async (index: number) => {
    const goals = data.goals.map((g, i) => i === index ? { ...g, done: !g.done } : g);
    await api(`/goals/${date}`, { method: "POST", body: JSON.stringify({ goals }) });
    load();
  }, [date, data.goals, load]);

  const removeGoal = useCallback(async (index: number) => {
    const goals = data.goals.filter((_, i) => i !== index);
    await api(`/goals/${date}`, { method: "POST", body: JSON.stringify({ goals }) });
    load();
  }, [date, data.goals, load]);

  const setMood = useCallback(async (mood: string) => {
    await api(`/goals/${date}`, { method: "POST", body: JSON.stringify({ mood }) });
    load();
  }, [date, load]);

  const saveJournal = useCallback(() => {
    api(`/goals/${date}`, { method: "POST", body: JSON.stringify({ journal: data.journal }) });
  }, [date, data.journal]);

  const displayDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  if (loading) {
    return (
      <div className="main-content-inner">
        <div className="flex flex-col items-center justify-center py-12 text-text-dim">
          <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin mb-3" />
          <div className="text-[13px]">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content-inner page-enter">
      <div className="page-header flex-col items-stretch gap-3 sm:flex-row">
        <div>
          <h1>Daily Journal</h1>
          <div className="subtitle">{displayDate}</div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="ghost" size="sm" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <div className="relative">
            <CalIcon className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
            <Input
              type="date"
              value={date}
              onChange={handleDateChange}
              className="h-8 pl-8 w-[160px] text-[12px]"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={handleNext}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={handleToday} size="sm">Today</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goals Card */}
        <Card className="card-raise">
          <CardHeader className="pb-3">
            <CardTitle className="text-[14px] flex items-center gap-2">
              <Check className="h-4 w-4" />
              Goals
              {data.goals.length > 0 && (
                <span className="text-[10px] text-text-dim font-normal">
                  ({data.goals.filter(g => g.done).length}/{data.goals.length} done)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {data.goals.length > 0 ? (
              <div className="space-y-1 stagger">
                {data.goals.map((g, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all duration-150 card-hoverable",
                      g.done
                        ? "opacity-60 bg-bg-deep/30"
                        : "hover:bg-bg-hover"
                    )}
                    style={{ animationDelay: `${i * 0.04}s` }}
                  >
                    <input
                      type="checkbox"
                      checked={g.done}
                      onChange={() => toggleGoal(i)}
                      className="accent-accent w-4 h-4 cursor-pointer"
                    />
                    <span
                      className={cn(
                        "flex-1 text-[13px]",
                        g.done && "line-through text-text-dim"
                      )}
                    >
                      {g.text}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-text-dim hover:text-destructive"
                      onClick={() => removeGoal(i)}
                      title="Remove goal"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[13px] text-text-dim mb-3 py-2">
                No goals yet. Add one below.
              </div>
            )}
            <div className="flex gap-2 mt-4 pt-3 border-t border-border">
              <Input
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addGoal()}
                placeholder="Add a goal..."
                className="flex-1"
              />
              <Button onClick={addGoal} disabled={!newGoal.trim() || adding}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Mood + Journal */}
        <div className="space-y-4">
          {/* Mood Card */}
          <Card className="card-raise">
            <CardHeader className="pb-3">
              <CardTitle className="text-[14px] flex items-center gap-2">
                <Smile className="h-4 w-4" />
                Mood
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {MOODS.map((m) => {
                  const isActive = data.mood === m;
                  return (
                    <button
                      key={m}
                      className={cn(
                        "text-xl w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-150",
                        isActive
                          ? "bg-accent-surface ring-2 ring-accent/40 scale-110"
                          : "bg-bg-raise border border-border hover:bg-bg-hover hover:border-border-bright"
                      )}
                      onClick={() => setMood(m)}
                      title={m}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Journal Card */}
          <Card className="card-raise">
            <CardHeader className="pb-3">
              <CardTitle className="text-[14px] flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Journal
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Textarea
                className="min-h-[200px]"
                value={data.journal}
                onChange={(e) => setData({ ...data, journal: e.target.value })}
                placeholder="What happened today? Thoughts, decisions, ideas..."
              />
              <Button onClick={saveJournal} className="mt-3">Save Journal</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
