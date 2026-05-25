import { useState } from "react";
import { api, formatDate } from "../../../lib/api";

interface SeoContent {
  id: number;
  keyword: string;
  target_url: string;
  title: string;
  meta_description: string;
  headings: string;
  body: string;
  status: string;
  created_at: string;
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

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContentKeyword(e.target.value);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContentUrl(e.target.value);
  };

  const generateContent = async () => {
    if (!contentKeyword.trim()) return;
    setGenerating(true);
    setGenerated(null);
    try {
      const result = await api("/seo/content", {
        method: "POST",
        body: JSON.stringify({
          keyword: contentKeyword.trim(),
          targetUrl: contentUrl.trim() || undefined,
        }),
      });
      setGenerated(result);
      onRefresh();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const createDeleteHandler = (id: number) => {
    return async () => {
      if (!confirm("Delete this content?")) return;
      try {
        await api(`/seo/content/${id}`, { method: "DELETE" });
        onRefresh();
      } catch (e: any) {
        alert("Error: " + e.message);
      }
    };
  };

  return (
    <div>
      <div className="card mb-24">
        <h3>Generate SEO Content</h3>
        <div className="form-row mt-12">
          <div className="form-group">
            <label>Keyword</label>
            <input
              value={contentKeyword}
              onChange={handleKeywordChange}
              placeholder="e.g. seo tools"
            />
          </div>
          <div className="form-group">
            <label>Target URL (optional)</label>
            <input
              value={contentUrl}
              onChange={handleUrlChange}
              placeholder="https://example.com/page"
            />
          </div>
        </div>
        <button className="btn btn-primary mt-12" onClick={generateContent} disabled={generating}>
          {generating ? "⏳ Generating..." : "✍️ Generate Content"}
        </button>

        {generated && (
          <div className="card-raise mt-16" style={{ animation: "statEnter 0.3s ease-out" }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-bright)", marginBottom: 4 }}>
              {generated.title}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12 }}>
              {generated.metaDescription}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--accent)",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontWeight: 600,
              }}
            >
              Headings
            </div>
            {generated.headings?.map((h: string, i: number) => (
              <div key={i} style={{ fontSize: 12, color: "var(--text)", padding: "3px 0" }}>
                H{Math.min(i + 1, 3)}: {h}
              </div>
            ))}
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 12 }}>
              Words: ~{generated.wordCount}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Generated Content History</h3>
        {contentList.length > 0 ? (
          <div className="table-wrap mt-12">
            <table>
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contentList.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.keyword}</td>
                    <td style={{ fontSize: 12, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.title}
                    </td>
                    <td>
                      <span className="badge badge-low">{c.status}</span>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text-dim)" }}>
                      {formatDate(c.created_at)}
                    </td>
                    <td>
                      <button className="btn btn-sm btn-ghost" onClick={createDeleteHandler(c.id)}>
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: 20 }}>
            <p>No content generated yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
