import { useEffect, useState, useRef } from "react";
import { api, type DashboardData, getAgentDefaultIcon, timeAgo } from "../lib/api";
import gsap from "gsap";

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);
  const countersRef = useRef<Map<string, HTMLSpanElement>>(new Map());
  const pipelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<DashboardData>("/dashboard")
      .then((d) => {
        setData(d);
        requestAnimationFrame(() => {
          // GSAP stagger stat cards
          if (gridRef.current) {
            gsap.fromTo(
              gridRef.current.querySelectorAll(".stat-card"),
              { opacity: 0, y: 28, scale: 0.95 },
              { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.09, ease: "back.out(1.4)" }
            );
          }
          // GSAP counter animation for stat values
          countersRef.current.forEach((el, key) => {
            const target = parseInt(el.dataset.target || "0", 10);
            if (target === 0) return;
            gsap.fromTo(
              { val: 0 },
              { val: target, duration: 1.2, ease: "power2.out",
                onUpdate: function() {
                  el.textContent = Math.round(this.targets()[0].val).toString();
                }
              }
            );
          });
          // Pipeline bar — animate width
          if (pipelineRef.current) {
            gsap.fromTo(
              pipelineRef.current.querySelectorAll(".pipeline-segment"),
              { scaleX: 0 },
              { scaleX: 1, duration: 0.8, stagger: 0.1, ease: "power2.out", transformOrigin: "left center" }
            );
          }
        });
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return (
    <div className="empty-state">
      <div className="icon">⚠️</div>
      <p>Failed to load dashboard: {error}</p>
    </div>
  );
  if (!data) return (
    <div className="loading-state">
      <div className="loading-spinner" />
      <span>Loading mission control...</span>
    </div>
  );

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const tasks = data.tasks;
  const totalTasks = tasks.total || 1;
  const doneRatio = tasks.done / totalTasks;

  const registerCounter = (key: string, el: HTMLSpanElement | null) => {
    if (el) countersRef.current.set(key, el);
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <div className="subtitle">{today}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="status-indicator">
            <span className="status-dot online w-2 h-2" />
            <span className="text-[11px] text-text-dim">All systems operational</span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-4 stagger" ref={gridRef}>
        <StatCard
          label="Total Tasks"
          value={tasks.total}
          accentClass="accent-gold"
          ringValue={tasks.total / Math.max(tasks.total, 1)}
          refEl={(el) => registerCounter("total", el)}
        />
        <StatCard
          label="In Progress"
          value={tasks.inProgress}
          accentClass="accent-gold"
          ringValue={tasks.inProgress / Math.max(totalTasks, 1)}
          refEl={(el) => registerCounter("inProgress", el)}
        />
        <StatCard
          label="Completed"
          value={tasks.done}
          accentClass="accent-green"
          ringValue={doneRatio}
          refEl={(el) => registerCounter("done", el)}
        />
        <StatCard
          label="Vault Notes"
          value={data.vault.total}
          accentClass="accent-purple"
          ringValue={Math.min(data.vault.total / 100, 1)}
          refEl={(el) => registerCounter("vault", el)}
        />
      </div>

      {/* Pipeline + Goals */}
      <div className="grid-2 mb-24 mt-spacing-xl">
        {/* Task Pipeline */}
        <div className="card" ref={pipelineRef}>
          <div className="section-label">Task Pipeline</div>
          <div className="pipeline-bar mt-spacing-md">
            {([
              { v: tasks.backlog, c: "var(--text-dim)" },
              { v: tasks.todo, c: "var(--accent)" },
              { v: tasks.inProgress, c: "var(--yellow)" },
              { v: tasks.done, c: "var(--green)" },
            ] as const).map((seg, i) => (
              <div
                key={i}
                className="pipeline-segment"
                style={{
                  width: `${(seg.v / totalTasks) * 100}%`,
                  background: seg.c,
                }}
              />
            ))}
          </div>
          <div className="pipeline-legend">
            {[
              { label: "Backlog", val: tasks.backlog, color: "var(--text-dim)" },
              { label: "To Do", val: tasks.todo, color: "var(--accent)" },
              { label: "In Progress", val: tasks.inProgress, color: "var(--yellow)" },
              { label: "Done", val: tasks.done, color: "var(--green)" },
            ].map((item) => (
              <div key={item.label} className="pipeline-legend-item">
                <span className="pipeline-dot" style={{ background: item.color }} />
                <span className="pipeline-legend-label">{item.label}</span>
                <span className="pipeline-legend-val">{item.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Goals */}
        <div className="card">
          <div className="section-label">Today's Goals</div>
          <div className="mt-spacing-md">
            {data.goals.goals.length > 0 ? (
              <>
                <div className="mb-spacing-sm text-[11px] text-text-dim">
                  {data.goals.goals.filter(g => g.done).length} / {data.goals.goals.length} completed
                </div>
                <div className="h-1 rounded-sm overflow-hidden mb-spacing-lg bg-border">
                  <div style={{
                    height: "100%",
                    width: `${(data.goals.goals.filter(g => g.done).length / Math.max(data.goals.goals.length, 1)) * 100}%`,
                    background: "linear-gradient(90deg, var(--accent), var(--green))",
                    borderRadius: 2,
                    transition: "width 0.6s var(--ease-out)",
                  }} />
                </div>
                {data.goals.goals.map((g, i) => (
                  <div key={i} className={`goal-item${g.done ? " done" : ""}`}>
                    <input type="checkbox" checked={g.done} readOnly />
                    <span className="text-[13px]">{g.text}</span>
                  </div>
                ))}
              </>
            ) : (
              <div className="empty-state py-spacing-xl">
                <div className="icon text-[32px]">🎯</div>
                <p className="text-xs">No goals for today. Set some to stay on track.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Agents + Scheduled */}
      <div className="grid-2">
        <div className="card">
          <div className="section-label">Active Agents</div>
          <div className="mt-spacing-md">
            {data.agents.length > 0 ? (
              data.agents.map((a) => (
                <div key={a.id} className="agent-row">
                  <div className="agent-row-avatar">{a.icon || getAgentDefaultIcon(a.name)}</div>
                  <div className="agent-row-info">
                    <div className="agent-row-name">{a.name}</div>
                    <div className="agent-row-meta">{a.model} · {timeAgo(a.last_active)}</div>
                  </div>
                  <div className={`agent-s-badge ${a.status}`}>{a.status}</div>
                </div>
              ))
            ) : (
              <div className="empty-state py-spacing-xl">
                <div className="icon text-[32px]">🤖</div>
                <p className="text-xs">No agents registered yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="section-label">Scheduled Tasks</div>
          <div className="mt-spacing-lg">
            <div className="flex items-baseline gap-2">
              <span className="font-[Unbounded] text-4xl font-bold text-text-bright tracking-tight leading-none">
                {data.scheduled.enabled}
              </span>
              <span className="text-xl text-text-dim">/ {data.scheduled.total}</span>
            </div>
            <div className="text-[11px] text-text-dim mt-1">
              Active / Total scheduled jobs
            </div>
            <div className="mt-spacing-lg h-1.5 rounded-sm overflow-hidden bg-border">
              <div style={{
                height: "100%",
                width: `${(data.scheduled.enabled / Math.max(data.scheduled.total, 1)) * 100}%`,
                background: data.scheduled.enabled === data.scheduled.total ? "var(--green)" : "var(--accent)",
                borderRadius: 3,
                transition: "width 0.8s var(--ease-out)",
              }} />
            </div>
            {data.scheduled.total === 0 ? (
              <div className="mt-spacing-md text-xs text-text-dim">No scheduled tasks configured.</div>
            ) : (
              <div className="mt-spacing-sm text-xs text-text-accent">
                {Math.round((data.scheduled.enabled / Math.max(data.scheduled.total, 1)) * 100)}% of jobs active
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Content */}
      {data.recentContent.length > 0 && (
        <div className="mt-spacing-xl">
          <div className="section-label mb-spacing-md">Recent Content</div>
          <div className="content-row">
            {data.recentContent.slice(0, 4).map((asset) => (
              <div key={asset.id} className="content-chip">
                <span className="content-chip-icon">
                  {asset.type === "image" ? "🖼️" : asset.type === "audio" ? "🔊" : "📄"}
                </span>
                <span className="content-chip-title">{asset.title}</span>
                <span className={`badge badge-${asset.status === "done" ? "low" : asset.status === "failed" ? "urgent" : "medium"}`}>
                  {asset.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stat Card Component ──
interface StatCardProps {
  label: string;
  value: number;
  accentClass?: string;
  ringValue?: number;
  refEl?: (el: HTMLSpanElement | null) => void;
}

function StatCard({ label, value, accentClass, ringValue, refEl }: StatCardProps) {
  const r = 18; // radius for SVG ring
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - (ringValue ?? 0));

  return (
    <div className={`stat-card ${accentClass ?? ""}`}>
      {/* Progress ring */}
      {ringValue !== undefined && (
        <div className="ring-wrap">
          <svg width="44" height="44" viewBox="0 0 44 44">
            <circle className="ring-bg" cx="22" cy="22" r={r} />
            <circle
              className="ring-fill"
              cx="22" cy="22" r={r}
              style={{ strokeDasharray: circ, strokeDashoffset: offset }}
            />
          </svg>
        </div>
      )}
      <span
        className="value"
        data-target={value}
        ref={refEl}
      >
        {value}
      </span>
      <div className="label">{label}</div>
    </div>
  );
}
