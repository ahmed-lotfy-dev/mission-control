import { useEffect, useState, useRef } from "react";
import { api, type DashboardData, getAgentDefaultIcon, timeAgo } from "../lib/api";
import gsap from "gsap";

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<DashboardData>("/dashboard")
      .then((d) => {
        setData(d);
        // GSAP stagger entrance for stat cards
        requestAnimationFrame(() => {
          if (gridRef.current) {
            gsap.fromTo(
              gridRef.current.querySelectorAll(".stat-card"),
              { opacity: 0, y: 24 },
              { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: "power3.out" }
            );
          }
        });
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="loading-state">Error: {error}</div>;
  if (!data) return <div className="loading-state"><div className="loading-spinner" />Loading dashboard...</div>;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <div className="subtitle">{today}</div>
        </div>
      </div>

      <div className="grid-4 stagger mb-24" ref={gridRef}>
        <div className="stat-card">
          <div className="value">{data.tasks.total}</div>
          <div className="label">Total Tasks</div>
        </div>
        <div className="stat-card" style={{ animationDelay: "0.06s" }}>
          <div className="value" style={{ color: "var(--accent)" }}>{data.tasks.inProgress}</div>
          <div className="label">In Progress</div>
        </div>
        <div className="stat-card" style={{ animationDelay: "0.10s" }}>
          <div className="value" style={{ color: "var(--green)" }}>{data.tasks.done}</div>
          <div className="label">Done</div>
        </div>
        <div className="stat-card" style={{ animationDelay: "0.14s" }}>
          <div className="value" style={{ color: "var(--purple)" }}>{data.vault.total}</div>
          <div className="label">Vault Notes</div>
        </div>
      </div>

      <div className="grid-2 mb-24">
        <div className="card">
          <h3>Task Pipeline</h3>
          <div className="pipeline-bar">
            {([
              { v: data.tasks.backlog, c: "var(--text-dim)" },
              { v: data.tasks.todo, c: "var(--accent)" },
              { v: data.tasks.inProgress, c: "var(--yellow)" },
              { v: data.tasks.done, c: "var(--green)" },
            ] as const).map((seg, i) => (
              <div
                key={i}
                className="pipeline-segment"
                style={{
                  width: `${(seg.v / (data.tasks.total || 1)) * 100}%`,
                  background: seg.c,
                }}
              />
            ))}
          </div>
          <div className="flex gap-lg mt-12" style={{ fontSize: 12, color: "var(--text-dim)" }}>
            <span>Backlog: {data.tasks.backlog}</span>
            <span>Todo: {data.tasks.todo}</span>
            <span>In Progress: {data.tasks.inProgress}</span>
            <span>Done: {data.tasks.done}</span>
          </div>
        </div>

        <div className="card">
          <h3>Today's Goals</h3>
          <div className="mt-12">
            {data.goals.goals.length > 0
              ? data.goals.goals.map((g, i) => (
                  <div key={i} className={`goal-item${g.done ? " done" : ""}`}>
                    <input type="checkbox" checked={g.done} readOnly />
                    <span style={{ fontSize: 13 }}>{g.text}</span>
                  </div>
                ))
              : <div style={{ fontSize: 13, color: "var(--text-dim)" }}>No goals for today.</div>
            }
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Active Agents</h3>
          <div className="mt-12">
            {data.agents.length > 0
              ? data.agents.map((a) => (
                  <div key={a.id} className="flex gap-sm" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
                    <span style={{ fontSize: 16 }}>{a.icon || getAgentDefaultIcon(a.name)}</span>
                    <div style={{ flex: 1 }}>
                      <div className="agent-name" style={{ fontSize: 13 }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{a.model} · {timeAgo(a.last_active)}</div>
                    </div>
                    <div className="agent-status-dot" style={{ background: statusColor(a.status) }} />
                  </div>
                ))
              : <div style={{ fontSize: 13, color: "var(--text-dim)" }}>No agents registered.</div>
            }
          </div>
        </div>
        <div className="card">
          <h3>Scheduled Tasks</h3>
          <div className="mt-12">
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-bright)" }}>
              {data.scheduled.enabled}/{data.scheduled.total}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>Active / Total</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case "online": return "var(--green)";
    case "working": return "var(--accent)";
    case "idle": return "var(--yellow)";
    case "error": return "var(--red)";
    default: return "var(--text-dim)";
  }
}