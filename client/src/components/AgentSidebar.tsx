import { useEffect, useState, useRef } from "react";
import {
  api,
  type Agent,
  type AgentLog,
  timeAgo,
  formatTime,
  getAgentDefaultIcon,
} from "../lib/api";

interface Props {
  onMobileOpen?: () => void;
}

export default function AgentSidebar({ onMobileOpen }: Props) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [logCache, setLogCache] = useState<Record<number, AgentLog[]>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined!);

  const load = () => {
    api<Agent[]>("/agents").then(setAgents).catch(() => {});
  };

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 15_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const toggleExpand = async (id: number) => {
    const nowExpanded = !expanded[id];
    setExpanded((prev) => ({ ...prev, [id]: nowExpanded }));
    if (nowExpanded && !logCache[id]) {
      try {
        const agent = await api<Agent>(`/agents/${id}`);
        setLogCache((prev) => ({ ...prev, [id]: agent.logs || [] }));
      } catch {}
    }
  };

  const ping = async (id: number) => {
    try {
      await api(`/agents/${id}/ping`, { method: "POST" });
      load();
    } catch {}
  };

  if (collapsed) {
    return (
      <aside className="agent-panel collapsed" onClick={() => setCollapsed(false)}>
        <div className="agent-panel-collapsed-label">
          🤖 Agents
        </div>
      </aside>
    );
  }

  return (
    <aside className="agent-panel">
      <div className="agent-panel-header">
        <h3>🤖 Agents</h3>
        <button className="agent-panel-toggle" onClick={() => setCollapsed(true)}>◀</button>
      </div>
      <div className="agent-panel-list">
        {agents.length === 0 ? (
          <div className="loading">No agents</div>
        ) : (
          agents.map((a) => {
            const icon = a.icon || getAgentDefaultIcon(a.name);
            const isExpanded = expanded[a.id];
            const logs = logCache[a.id];
            const meta = (a.metadata || {}) as Record<string, string>;

            return (
              <div
                key={a.id}
                className={`agent-s-card status-${a.status}${isExpanded ? " expanded" : ""}`}
              >
                <div className="agent-s-header" onClick={() => toggleExpand(a.id)}>
                  <div className="agent-s-avatar">{icon}</div>
                  <div className="agent-s-info">
                    <div className="agent-s-name">{a.name}</div>
                    <div className="agent-s-meta">{a.model} · {timeAgo(a.last_active)}</div>
                  </div>
                  <span className={`agent-s-badge ${a.status}`}>{a.status}</span>
                </div>

                {isExpanded && (
                  <div className="agent-s-detail">
                    <div className="agent-s-row">
                      <span className="s-label">Version</span>
                      <span className="s-value">{a.version || "N/A"}</span>
                    </div>
                    <div className="agent-s-row">
                      <span className="s-label">Status</span>
                      <span className="s-value" style={{ color: statusColor(a.status) }}>{a.status}</span>
                    </div>
                    {meta.provider && (
                      <div className="agent-s-row">
                        <span className="s-label">Provider</span>
                        <span className="s-value">{meta.provider}</span>
                      </div>
                    )}
                    {a.pid && (
                      <div className="agent-s-row">
                        <span className="s-label">PID</span>
                        <span className="s-value">{a.pid}</span>
                      </div>
                    )}

                    <div className="agent-s-actions">
                      <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); ping(a.id); }}>
                        📡 Ping
                      </button>
                      <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); toggleExpand(a.id); }}>
                        🔄 Refresh
                      </button>
                    </div>

                    <div className="agent-s-section">
                      <div className="s-heading">Recent Activity</div>
                      {!logs ? (
                        <div className="agent-s-no-logs">Loading...</div>
                      ) : logs.length === 0 ? (
                        <div className="agent-s-no-logs">No activity yet.</div>
                      ) : (
                        logs.slice(0, 12).map((log) => (
                          <div key={log.id} className="agent-s-log">
                            <span className="agent-s-log-time">{formatTime(log.created_at)}</span>
                            <span className={`agent-s-log-level ${log.level}`}>{log.level}</span>
                            <span className="agent-s-log-msg">
                              {log.event}{log.message ? `: ${log.message.substring(0, 60)}` : ""}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
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