import { useState } from "react";
import { api, formatDate } from "../../../lib/api";

interface SeoContent {
  id: number; keyword: string; target_url: string; title: string;
  meta_description: string; headings: string; body: string; status: string; created_at: string;
}

interface SeoContentTabProps {
  contentList: SeoContent[];
  onRefresh: () => void;
}

export default function SeoContentTab({ contentList, onRefresh }: SeoContentTabProps) {
  const [contentKeyword, setContentKeyword] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<any>(null);

  const generateContent = async () => {
    if (!contentKeyword.trim()) return;
    setGenerating(true); setGenerated(null);
    try {
      const result = await api("/seo/content", { method: "POST", body: JSON.stringify({ keyword: contentKeyword.trim(), targetUrl: contentUrl.trim() || undefined }) });
      setGenerated(result); onRefresh();
    } catch (e: any) { alert("Error: " + e.message); }
    finally { setGenerating(false); }
  };

  return (
    <div>
      <div className="card mb-24">
        <h3>Generate SEO Content</h3>
        <div className="form-row mt-12">
          <div className="form-group">
            <label>Keyword</label>
            <input value={contentKeyword} onChange={(e) => setContentKeyword(e.target.value)} placeholder="e.g. seo tools" />
          </div>
          <div className="form-group">
            <label>Target URL (optional)</label>
            <input value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} placeholder="https://example.com/page" />
          </div>
        </div>
        <button className="btn btn-primary mt-12" onClick={generateContent} disabled={generating}>
          {generating ? "⏳ Generating..." : "✍️ Generate Content"}
        </button>

        {generated && (
          <div className="card-raise mt-16" style={{ animation: "statEnter 0.3s ease-out" }}>
            <div className="font-semibold text-[14px] text-text-bright mb-1">{generated.title}</div>
            <div className="text-xs text-text-dim mb-3">{generated.metaDescription}</div>
            <div className="text-[11px] text-accent mb-2 uppercase tracking-widest font-semibold">Headings</div>
            {generated.headings?.map((h: string, i: number) => (
              <div key={i} className="text-xs text-text py-[3px]">H{Math.min(i + 1, 3)}: {h}</div>
            ))}
            <div className="text-[11px] text-text-dim mt-3">Words: ~{generated.wordCount}</div>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Generated Content History</h3>
        {contentList.length > 0 ? (
          <div className="table-wrap mt-12">
            <table>
              <thead><tr><th>Keyword</th><th>Title</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {contentList.map((c) => (
                  <tr key={c.id}>
                    <td className="font-semibold">{c.keyword}</td>
                    <td className="text-xs max-w-[300px] truncate">{c.title}</td>
                    <td><span className="badge badge-low">{c.status}</span></td>
                    <td className="text-xs text-text-dim">{formatDate(c.created_at)}</td>
                    <td>
                      <button className="btn btn-sm btn-ghost" onClick={async () => { if (!confirm("Delete this content?")) return; try { await api(`/seo/content/${c.id}`, { method: "DELETE" }); onRefresh(); } catch (e: any) { alert("Error: " + e.message); } }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state p-5"><p>No content generated yet.</p></div>
        )}
      </div>
    </div>
  );
}
