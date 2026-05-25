import { useEffect, useState } from "react";
import {
  api,
  type Agent,
  type AgentPayload,
  type AgentPingResult,
  type AgentLog,
  timeAgo,
  formatTime,
  getAgentDefaultIcon,
} from "../lib/api";

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<AgentPayload>({ name: "", model: "", version: "", icon: "", status: "idle", endpoint: "" });
  const [expandedLogs, setExpandedLogs] = useState<Record<number, boolean>>({});
  const [pingResults, setPingResults] = useState<Record<number, AgentPingResult | "loading">>({});
  const [logCache, setLogCache] = useState<Record<number, AgentLog[]>>({});

  const load = () => {
    setLoading(true);
    api<Agent[]>("/agents").then(setAgents).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => {
    setEditId(null);
    setForm({ name: "", model: "", version: "", icon: "", status: "idle", endpoint: "" });
    setShowModal(true);
  };

  const openEdit = (a: Agent) => {
    setEditId(a.id);
    setForm({
      name: a.name,
      model: a.model,
      version: a.version,
      icon: a.icon || getAgentDefaultIcon(a.name),
      status: a.status,
      endpoint: a.endpoint || "",
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    const body = JSON.stringify(form);
    if (editId) {
      await api(`/agents/${editId}`, { method: "PATCH", body });
    } else {
      await api("/agents", { method: "POST", body });
    }
    setShowModal(false);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("Remove this agent?")) return;
    await api(`/agents/${id}`, { method: "DELETE" });
    load();
  };

  const ping = async (id: number) => {
    setPingResults((prev) => ({ ...prev, [id]: "loading" }));
    try {
      const result = await api<AgentPingResult>(`/agents/${id}/ping`, { method: "POST" });
      setPingResults((prev) => ({ ...prev, [id]: result }));
      // Refresh agent list to show updated status
      load();
    } catch (e: any) {
      setPingResults((prev) => ({
        ...prev,
        [id]: { agent: "", responsive: false, status: "error", responseTimeMs: 0, details: e.message, pid: null, timestamp: "" },
      }));
    }
  };

  const toggleLogs = async (id: number) => {
    const nowExpanded = !expandedLogs[id];
    setExpandedLogs((prev) => ({ ...prev, [id]: nowExpanded }));
    if (nowExpanded && !logCache[id]) {
      try {
        const agent = await api<Agent>(`/agents/${id}`);
        setLogCache((prev) => ({ ...prev, [id]: agent.logs || [] }));
      } catch {}
    }
  };

  const activeCount = agents.filter((a) => a.status === "working" || a.status === "online").length;

  if (loading) return <div className="loading-state"><div className="loading-spinner" />Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Agent Status</h1>
          <div className="subtitle">{agents.length} agents · {activeCount} active</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Register Agent</button>
      </div>

      {agents.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🤖</div>
          <p>No agents registered</p>
          <button className="btn btn-primary mt-16" onClick={openNew}>Register your first agent</button>
        </div>
      ) : (
        <div className="agent-grid stagger">
          {agents.map((a) => {
            const icon = a.icon || getAgentDefaultIcon(a.name);
            const meta = (a.metadata || {}) as Record<string, string>;
            const pingRes = pingResults[a.id];
            const logs = logCache[a.id];

            return (
              <div key={a.id} className="agent-card card-hover">
                {/* Header */}
                <div className="agent-card-header">
                  <div className="agent-card-avatar">{icon}</div>
                  <div className="agent-card-info">
                    <div className="agent-card-name">{a.name}</div>
                    <div className="agent-card-model">{a.model}</div>
                  </div>
                  <span className={`agent-s-badge ${a.status}`}>{a.status}</span>
                </div>

                {/* Detail rows */}
                <div className="agent-card-detail-row">
                  <span className="acd-label">Version</span>
                  <span className="acd-value">{a.version || "N/A"}</span>
                </div>
                <div className="agent-card-detail-row">
                  <span className="acd-label">Last Active</span>
                  <span className="acd-value">{timeAgo(a.last_active)}</span>
                </div>
                {a.pid && (
                  <div className="agent-card-detail-row">
                    <span className="acd-label">PID</span>
                    <span className="acd-value">{a.pid}</span>
                  </div>
                )}
                {meta.provider && (
                  <div className="agent-card-detail-row">
                    <span className="acd-label">Provider</span>
                    <span className="acd-value">{meta.provider}</span>
                  </div>
                )}
                {meta.contextWindow && (
                  <div className="agent-card-detail-row">
                    <span className="acd-label">Context</span>
                    <span className="acd-value">{meta.contextWindow}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="agent-card-actions">
                  <button className="btn btn-sm btn-ghost" onClick={() => ping(a.id)} disabled={pingRes === "loading"} style={{ flex: 1 }}>
                    {pingRes === "loading" ? "⏳" : "📡"} Ping
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={() => toggleLogs(a.id)} style={{ flex: 1 }}>
                    {expandedLogs[a.id] ? "▲" : "▼"} Logs
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={() => openEdit(a)}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(a.id)}>Remove</button>
                </div>

                {/* Ping result */}
                {pingRes && pingRes !== "loading" && (
                  <div
                    className="agent-ping-result"
                    style={{ borderColor: pingRes.responsive ? "var(--green)" : "var(--red)" }}
                  >
                    <span style={{ color: pingRes.responsive ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
                      {pingRes.responsive ? "✓ ONLINE" : "✗ OFFLINE"}
                    </span>
                    <span style={{ color: "var(--text-dim)" }}>
                      {" · "}{pingRes.details}
                      {pingRes.responseTimeMs != null && pingRes.responseTimeMs > 0 && ` · ${pingRes.responseTimeMs}ms`}
                    </span>
                  </div>
                )}

                {/* Expanded logs */}
                {expandedLogs[a.id] && (
                  <div className="agent-card-logs-section">
                    <h4>Activity Log</h4>
                    {!logs ? (
                      <div className="agent-s-no-logs">Loading...</div>
                    ) : logs.length === 0 ? (
                      <div className="agent-s-no-logs">No activity recorded yet.</div>
                    ) : (
                      logs.slice(0, 30).map((log) => (
                        <div key={log.id} className="agent-card-log">
                          <span className="agent-card-log-time">{formatTime(log.created_at)}</span>
                          <span className={`agent-card-log-level ${log.level}`}>{log.level}</span>
                          <span className="agent-card-log-msg">
                            {log.event}{log.message ? `: ${log.message}` : ""}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editId ? "Edit Agent" : "Register Agent"}</h2>
            <div className="form-group">
              <label>Name</label>
              <input
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  if (!form.icon) {
                    setForm((prev) => ({ ...prev, icon: getAgentDefaultIcon(e.target.value) }));
                  }
                }}
                placeholder="e.g. Hermes"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Icon</label>
                <input value={form.icon || ""} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="e.g. 🦊" />
              </div>
              <div className="form-group">
                <label>Model</label>
                <input value={form.model || ""} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="e.g. claude-sonnet-4" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Version</label>
                <input value={form.version || ""} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="1.0" />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status || "idle"} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="idle">Idle</option>
                  <option value="working">Working</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="error">Error</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Endpoint (optional — for HTTP ping)</label>
              <input value={form.endpoint || ""} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} placeholder="http://localhost:8080/health" />
            </div>
            <div className="form-actions">
              <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{editId ? "Update" : "Register"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}