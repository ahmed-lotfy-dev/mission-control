import { useEffect, useState } from "react";
import { api, type VaultNote, type DashboardData, timeAgo } from "../lib/api";

export default function Vault() {
  const [notes, setNotes] = useState<VaultNote[]>([]);
  const [stats, setStats] = useState<DashboardData["vault"] & { folders: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<VaultNote[] | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api<VaultNote[]>("/vault/notes"),
      api<any>("/vault/stats"),
    ]).then(([n, s]) => {
      setNotes(n);
      setStats(s);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const sync = async () => {
    await api("/vault/sync", { method: "POST" });
    load();
  };

  const handleSearch = (q: string) => {
    setSearch(q);
    if (!q.trim()) { setResults(null); return; }
    api<VaultNote[]>(`/vault/search?q=${encodeURIComponent(q)}`).then(setResults);
  };

  if (loading) return <div className="loading-state"><div className="loading-spinner" />Loading...</div>;

  const display = results ?? notes;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Obsidian Vault</h1>
          <div className="subtitle">{stats?.total ?? 0} notes indexed</div>
        </div>
        <button className="btn btn-primary" onClick={sync}>Sync Vault</button>
      </div>

      {stats && (
        <div className="grid-4 mb-24 stagger">
          {Object.entries(stats.folders).slice(0, 8).map(([folder, count]) => (
            <div key={folder} className="stat-card" style={{ cursor: "pointer" }}>
              <div className="value" style={{ fontSize: 20 }}>{count}</div>
              <div className="label" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{folder}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card mb-16">
        <input
          placeholder="Search notes..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
      </div>

      <div className="card">
        {display.length > 0
          ? display.slice(0, 100).map((n) => (
              <div key={n.id} className="vault-note">
                <span className="note-icon">📄</span>
                <div style={{ flex: 1 }}>
                  <div className="note-title">{n.title}</div>
                  <div className="note-path">{n.folder}/{n.path.split("/").pop()}</div>
                </div>
                <div className="note-time">{timeAgo(n.last_modified)}</div>
              </div>
            ))
          : <div className="empty-state">
              <div className="icon">🧠</div>
              <p>No notes {results ? "found" : "indexed"}</p>
              <p className="hint">{results ? "Try a different search term" : 'Click "Sync Vault" to index your Obsidian vault'}</p>
            </div>
        }
      </div>
    </div>
  );
}