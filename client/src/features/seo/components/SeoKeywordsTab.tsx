import { useState } from "react";
import { api } from "../../../lib/api";

interface SeoKeyword {
  id: number;
  keyword: string;
  volume: number;
  difficulty: number;
  related: string;
  notes: string;
  created_at: string;
}

interface SeoKeywordsTabProps {
  keywords: SeoKeyword[];
  onRefresh: () => void;
}

export default function SeoKeywordsTab({ keywords, onRefresh }: SeoKeywordsTabProps) {
  const [newKeyword, setNewKeyword] = useState("");
  const [addingKeyword, setAddingKeyword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewKeyword(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      addKeyword();
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.trim()) return;
    setAddingKeyword(true);
    try {
      await api("/seo/keywords", {
        method: "POST",
        body: JSON.stringify({ keyword: newKeyword.trim() }),
      });
      setNewKeyword("");
      onRefresh();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setAddingKeyword(false);
    }
  };

  const createDeleteHandler = (id: number) => {
    return async () => {
      if (!confirm("Delete this keyword?")) return;
      try {
        await api(`/seo/keywords/${id}`, { method: "DELETE" });
        onRefresh();
      } catch (e: any) {
        alert("Error: " + e.message);
      }
    };
  };

  return (
    <div className="grid-2">
      <div className="card">
        <h3>Add Keyword</h3>
        <div className="flex gap-sm mt-12">
          <input
            value={newKeyword}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter a keyword..."
          />
          <button className="btn btn-primary" onClick={addKeyword} disabled={addingKeyword}>
            {addingKeyword ? "..." : "Research"}
          </button>
        </div>
      </div>

      <div className="card" style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
        <h3>Saved Keywords</h3>
        {keywords.length > 0 ? (
          keywords.map((k) => {
            let related: any[] = [];
            try {
              related = JSON.parse(k.related || "[]");
            } catch {}

            return (
              <div key={k.id} style={{ borderBottom: "1px solid var(--border)", padding: "12px 0" }}>
                <div className="flex-between mb-8">
                  <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-bright)" }}>
                    {k.keyword}
                  </span>
                  <button className="btn btn-sm btn-ghost" onClick={createDeleteHandler(k.id)}>
                    ×
                  </button>
                </div>
                <div className="flex gap-lg" style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8 }}>
                  <span>
                    Volume:{" "}
                    <strong style={{ color: "var(--text-bright)" }}>
                      {k.volume.toLocaleString()}
                    </strong>
                  </span>
                  <span>
                    Difficulty:{" "}
                    <strong
                      style={{
                        color:
                          k.difficulty > 70
                            ? "var(--red)"
                            : k.difficulty > 40
                            ? "var(--yellow)"
                            : "var(--green)",
                      }}
                    >
                      {k.difficulty}%
                    </strong>
                  </span>
                </div>
                <div className="flex flex-wrap gap-xs">
                  {related.slice(0, 4).map((r: any, i: number) => (
                    <span key={i} className="task-tag">
                      {r.keyword}
                    </span>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-state" style={{ padding: 20 }}>
            <p>No keywords yet. Add one above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
