import { useEffect, useState } from "react";
import { api, type KanbanBoard } from "../lib/api";

export default function Kanban() {
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", description: "", status: "todo", priority: "medium", tags: "" });
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  useEffect(() => {
    api<KanbanBoard>("/kanban").then(setBoard).finally(() => setLoading(false));
  }, []);

  const openNew = () => { setEditId(null); setForm({ title: "", description: "", status: "todo", priority: "medium", tags: "" }); setShowModal(true); };
  const openEdit = (t: typeof board extends null ? never : NonNullable<typeof board>["tasks"][0]) => {
    setEditId(t.id);
    setForm({ title: t.title, description: t.description, status: t.status, priority: t.priority, tags: t.tags?.join(", ") ?? "" });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    const body = JSON.stringify({ ...form, tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [] });
    if (editId) await api(`/tasks/${editId}`, { method: "PATCH", body });
    else await api("/tasks", { method: "POST", body });
    setShowModal(false);
    const b = await api<KanbanBoard>("/kanban");
    setBoard(b);
  };

  const remove = async (id: number) => {
    if (!confirm("Remove this task?")) return;
    await api(`/tasks/${id}`, { method: "DELETE" });
    const b = await api<KanbanBoard>("/kanban");
    setBoard(b);
  };

  const drop = async (status: string) => {
    if (dragging === null) return;
    await api(`/tasks/${dragging}`, { method: "PATCH", body: JSON.stringify({ status }) });
    const b = await api<KanbanBoard>("/kanban");
    setBoard(b);
    setDragging(null);
    setDragOver(null);
  };

  const cols = ["backlog", "todo", "in_progress", "done"] as const;
  const colLabels: Record<string, string> = { backlog: "Backlog", todo: "To Do", in_progress: "In Progress", done: "Done" };
  const colColors: Record<string, string> = { backlog: "var(--text-dim)", todo: "var(--accent)", in_progress: "var(--yellow)", done: "var(--green)" };

  if (loading) return <div className="loading-state"><div className="loading-spinner" /><span>Loading board...</span></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Kanban Board</h1>
          <div className="subtitle">{board?.tasks.length ?? 0} tasks · {board?.tasks.filter(t => t.status === "done").length ?? 0} done</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ New Task</button>
      </div>

      {/* Board */}
      <div className="kanban-board">
        {cols.map((col) => {
          const tasks = board?.tasks.filter(t => t.status === col) ?? [];
          return (
            <div
              key={col}
              className={`kanban-col${dragOver === col ? " drag-over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(col); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => drop(col)}
            >
              <div className="kanban-col-header">
                <span className="kanban-col-indicator" style={{ background: colColors[col] }} />
                <span className="kanban-col-title">{colLabels[col]}</span>
                <span className="kanban-col-count" style={{ background: `${colColors[col]}20`, color: colColors[col] }}>{tasks.length}</span>
              </div>
              <div className="kanban-col-tasks">
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    className="kanban-task"
                    draggable
                    onDragStart={() => { setDragging(t.id); }}
                    onDragEnd={() => { setDragging(null); setDragOver(null); }}
                    onClick={() => openEdit(t)}
                  >
                    <div className="kanban-task-header">
                      <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                      {t.tags?.map(tag => (
                        <span key={tag} className="task-tag text-[10px]">{tag}</span>
                      ))}
                    </div>
                    <div className="kanban-task-title">{t.title}</div>
                    {t.description && <div className="kanban-task-desc">{t.description}</div>}
                    <div className="kanban-task-meta">
                      {t.due_date && (
                        <span className="kanban-task-date">📅 {new Date(t.due_date).toLocaleDateString()}</span>
                      )}
                      <div className="kanban-task-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-sm btn-ghost" onClick={() => openEdit(t)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => remove(t.id)}>Del</button>
                      </div>
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <div className="kanban-empty-col">Drop tasks here</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editId ? "Edit Task" : "New Task"}</h2>
            <div className="form-group">
              <label>Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What needs to be done?" autoFocus />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional details..." rows={3} className="resize-y" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {cols.map(c => <option key={c} value={c}>{colLabels[c]}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Tags (comma-separated)</label>
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="design, frontend, urgent" />
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
