import { useEffect, useState, useRef } from "react";
import { api, type ContentAsset, formatDate } from "../lib/api";
import gsap from "gsap";

const TYPE_ICONS: Record<string, string> = { image: "🖼️", video: "🎬", audio: "🔊", text: "📝" };

export default function ContentStudio() {
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState("image");
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");

  const load = () => {
    setLoading(true);
    api<ContentAsset[]>("/content").then((data) => {
      setAssets(data);
      requestAnimationFrame(() => {
        const cards = document.querySelectorAll(".type-card");
        if (cards.length) gsap.fromTo(cards, { opacity: 0, y: 24, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.08, ease: "back.out(1.5)" });
      });
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = (t: string) => {
    setType(t);
    setTitle("");
    setPrompt("");
    setShowModal(true);
  };

  const create = async () => {
    await api("/content", {
      method: "POST",
      body: JSON.stringify({ type, title: title || `New ${type}`, prompt }),
    });
    setShowModal(false);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this asset?")) return;
    await api(`/content/${id}`, { method: "DELETE" });
    load();
  };

  if (loading) return <div className="loading-state"><div className="loading-spinner" />Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Content Studio</h1>
          <div className="subtitle">Generate images, video, audio, and text</div>
        </div>
      </div>

      <div className="grid-4 mb-24 stagger">
        {["image", "video", "audio", "text"].map((t) => (
          <div key={t} className="card card-hover type-card" style={{ cursor: "pointer", textAlign: "center", padding: "24px" }} onClick={() => openNew(t)}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>{TYPE_ICONS[t]}</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{t.charAt(0).toUpperCase() + t.slice(1)}</div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>Generate {t}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Recent Assets</h3>
        {assets.length > 0 ? (
          <div className="table-wrap mt-12">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.id}>
                    <td>{TYPE_ICONS[a.type] || a.type}</td>
                    <td style={{ fontWeight: 600 }}>{a.title}</td>
                    <td><span className={`badge badge-${a.status === "done" ? "low" : a.status === "error" ? "urgent" : "medium"}`}>{a.status}</span></td>
                    <td style={{ color: "var(--text-dim)", fontSize: 12 }}>{formatDate(a.created_at)}</td>
                    <td><button className="btn btn-sm btn-danger" onClick={() => remove(a.id)}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p style={{ marginTop: 12 }}>No assets yet. Click a card above to create one.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{TYPE_ICONS[type]} New {type.charAt(0).toUpperCase() + type.slice(1)}</h2>
            <div className="form-group">
              <label>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${type} name`} />
            </div>
            <div className="form-group">
              <label>Prompt</label>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe what you want to generate..." />
            </div>
            <div className="form-actions">
              <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={create}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}