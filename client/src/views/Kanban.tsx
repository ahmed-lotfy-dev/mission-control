import { useEffect, useState, useRef } from "react";
import { api, type Task } from "../lib/api";

const COLUMNS = [
  { key: "backlog" as const, label: "Backlog", icon: "📥" },
  { key: "todo" as const, label: "To Do", icon: "📌" },
  { key: "in_progress" as const, label: "In Progress", icon: "🔄" },
  { key: "done" as const, label: "Done", icon: "✅" },
];

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export default function Kanban() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", description: "", status: "backlog", priority: "medium", project: "", tags: "", dueDate: "" });
  const dragRef = useRef<number | null>(null);

  const load = () => {
    setLoading(true);
    api<Task[]>("/tasks")
      .then(setTasks)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => {
    setEditId(null);
    setForm({ title: "", description: "", status: "backlog", priority: "medium", project: "", tags: "", dueDate: "" });
    setShowModal(true);
  };

  const openEdit = (t: Task) => {
    setEditId(t.id);
    setForm({ title: t.title, description: t.description, status: t.status, priority: t.priority, project: t.project, tags: t.tags, dueDate: t.due_date });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    const body = JSON.stringify(form);
    if (editId) {
      await api(`/tasks/${editId}`, { method: "PATCH", body });
    } else {
      await api("/tasks", { method: "POST", body });
    }
    setShowModal(false);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this task?")) return;
    await api(`/tasks/${id}`, { method: "DELETE" });
    load();
  };

  const move = async (id: number, status: string) => {
    await api(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  };

  const onDragStart = (id: number) => {
    dragRef.current = id;
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (status: string) => {
    if (dragRef.current != null) {
      move(dragRef.current, status);
      dragRef.current = null;
    }
  };

  if (error) return <div className="loading-state">Error: {error}</div>;
  if (loading) return <div className="loading-state"><div className="loading-spinner" />Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Kanban Board</h1>
          <div className="subtitle">{tasks.length} tasks</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ New Task</button>
      </div>

      <div className="kanban-board">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="kanban-col">
              <div className="kanban-col-header">
                <div className="flex gap-xs" style={{ alignItems: "center" }}>
                  <span>{col.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-bright)" }}>{col.label}</span>
                </div>
                <span className="count">{colTasks.length}</span>
              </div>
              <div
                className="kanban-col-tasks"
                onDragOver={onDragOver}
                onDrop={() => onDrop(col.key)}
              >
                {colTasks.map((t) => (
                  <div
                    key={t.id}
                    className="task-card"
                    draggable
                    onDragStart={() => onDragStart(t.id)}
                  >
                    <div className="task-title">{t.title}</div>
                    {t.description && <div className="task-desc">{t.description}</div>}
                    <div className="task-meta">
                      <div className="task-tags">
                        {t.project && <span className="task-tag task-project-tag">{t.project}</span>}
                        <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                      </div>
                      <div className="flex gap-xs">
                        <button className="btn btn-sm btn-ghost" onClick={() => openEdit(t)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => remove(t.id)}>×</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editId ? "Edit Task" : "New Task"}</h2>
            <div className="form-group">
              <label>Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What needs to be done?" />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Details..." />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Project</label>
                <input value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="Project name" />
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Tags</label>
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="frontend, bug, urgent" />
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