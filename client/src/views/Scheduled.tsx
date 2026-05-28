import { useEffect, useState } from "react";
import { api, type ScheduledTask, timeAgo } from "../lib/api";

export default function Scheduled() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", description: "", schedule: "", type: "command", payload: "" });

  const load = () => {
    setLoading(true);
    api<ScheduledTask[]>("/scheduled").then(setTasks).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => {
    setEditId(null);
    setForm({ name: "", description: "", schedule: "", type: "command", payload: "" });
    setShowModal(true);
  };

  const openEdit = (t: ScheduledTask) => {
    setEditId(t.id);
    setForm({ name: t.name, description: t.description, schedule: t.schedule, type: t.type, payload: t.payload });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.schedule.trim()) return;
    const body = JSON.stringify(form);
    if (editId) {
      await api(`/scheduled/${editId}`, { method: "PATCH", body });
    } else {
      await api("/scheduled", { method: "POST", body });
    }
    setShowModal(false);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this scheduled task?")) return;
    await api(`/scheduled/${id}`, { method: "DELETE" });
    load();
  };

  const toggle = async (id: number, enabled: boolean) => {
    await api(`/scheduled/${id}`, { method: "PATCH", body: JSON.stringify({ enabled }) });
    load();
  };

  const run = async (id: number) => {
    await api(`/scheduled/${id}/run`, { method: "POST" });
    load();
  };

  if (loading) return <div className="loading-state"><div className="loading-spinner" />Loading...</div>;

  const active = tasks.filter((t) => t.enabled).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Scheduled Tasks</h1>
          <div className="subtitle">{active}/{tasks.length} active</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ New Schedule</button>
      </div>

      <div className="card">
        {tasks.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Schedule</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Last Run</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="font-semibold text-[13px]">{t.name}</div>
                      {t.description && <div className="text-[11px] text-[var(--text-dim)]">{t.description}</div>}
                    </td>
                    <td><code className="text-xs">{t.schedule}</code></td>
                    <td><span className="badge badge-medium">{t.type}</span></td>
                    <td>
                      <label className="flex gap-xs cursor-pointer items-center">
                        <input type="checkbox" checked={!!t.enabled} onChange={(e) => toggle(t.id, e.target.checked)} />
                        <span className="text-xs">{t.enabled ? "Active" : "Paused"}</span>
                      </label>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text-dim)" }}>
                      {t.last_run ? (
                        <>{timeAgo(t.last_run)} <span className={`badge badge-${t.last_status === "success" ? "low" : "urgent"}`}>{t.last_status}</span></>
                      ) : "Never"}
                    </td>
                    <td>
                      <div className="flex gap-xs">
                        <button className="btn btn-sm btn-ghost" onClick={() => run(t.id)}>▶ Run</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => openEdit(t)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => remove(t.id)}>×</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="icon">⏰</div>
            <p>No scheduled tasks</p>
            <button className="btn btn-primary mt-16" onClick={openNew}>Create your first schedule</button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editId ? "Edit Schedule" : "New Scheduled Task"}</h2>
            <div className="form-group">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Daily backup" />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What does this do?" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Schedule (cron)</label>
                <input value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="0 6 * * *" />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="command">Command</option>
                  <option value="script">Script</option>
                  <option value="webhook">Webhook</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Payload</label>
              <textarea value={form.payload} onChange={(e) => setForm({ ...form, payload: e.target.value })} placeholder="bun run backup.sh" />
            </div>
            <div className="form-actions">
              <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{editId ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}