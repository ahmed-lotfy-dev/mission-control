import { useState } from "react";
import { api } from "../../../lib/api";

interface SeoKeyword {
  id: number; keyword: string; volume: number; difficulty: number; related: string; notes: string; created_at: string;
}

interface SeoKeywordsTabProps {
  keywords: SeoKeyword[];
  onRefresh: () => void;
}

export default function SeoKeywordsTab({ keywords, onRefresh }: SeoKeywordsTabProps) {
  const [newKeyword, setNewKeyword] = useState("");
  const [addingKeyword, setAddingKeyword] = useState(false);

  const addKeyword = async () => {
    if (!newKeyword.trim()) return;
    setAddingKeyword(true);
    try {
      await api("/seo/keywords", { method: "POST", body: JSON.stringify({ keyword: newKeyword.trim() }) });
      setNewKeyword(""); onRefresh();
    } catch (e: any) { alert("Error: " + e.message); }
    finally { setAddingKeyword(false); }
  };

  return (
    <div className="grid-2">
      <div className="card">
        <h3>Add Keyword</h3>
        <div className="flex gap-sm mt-12">
          <input value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addKeyword()} placeholder="Enter a keyword..." />
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
            try { related = JSON.parse(k.related || "[]"); } catch {}
            return (
              <div key={k.id} className="border-b border-border py-3">
                <div className="flex-between mb-8">
                  <span className="font-semibold text-[14px] text-text-bright">{k.keyword}</span>
                  <button className="btn btn-sm btn-ghost" onClick={async () => { if (!confirm("Delete this keyword?")) return; try { await api(`/seo/keywords/${k.id}`, { method: "DELETE" }); onRefresh(); } catch (e: any) { alert("Error: " + e.message); } }}>×</button>
                </div>
                <div className="flex gap-lg text-xs text-text-dim mb-2">
                  <span>Volume: <strong className="text-text-bright">{k.volume.toLocaleString()}</strong></span>
                  <span>Difficulty: <strong className={k.difficulty > 70 ? "text-red" : k.difficulty > 40 ? "text-yellow" : "text-green"}>{k.difficulty}%</strong></span>
                </div>
                <div className="flex flex-wrap gap-xs">
                  {related.slice(0, 4).map((r: any, i: number) => (<span key={i} className="task-tag">{r.keyword}</span>))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-state p-5"><p>No keywords yet. Add one above.</p></div>
        )}
      </div>
    </div>
  );
}
