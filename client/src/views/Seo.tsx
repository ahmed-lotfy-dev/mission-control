import { useEffect, useState } from "react";
import { api, formatDate } from "../lib/api";

type SeoTab = "keywords" | "content" | "ranks" | "audit";

interface SeoKeyword {
  id: number;
  keyword: string;
  volume: number;
  difficulty: number;
  related: string;
  notes: string;
  created_at: string;
}

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

interface RankEntry {
  id: number;
  keyword: string;
  position: number;
  url: string;
  check_date: string;
  notes: string;
}

interface AuditResult {
  id: number;
  url: string;
  score: number;
  title: string;
  meta_description: string;
  headings_count: number;
  links_count: number;
  has_meta: number;
  has_title: number;
  page_size: number;
  issues: string;
  created_at: string;
}

const TABS: Array<{ key: SeoTab; label: string; icon: string }> = [
  { key: "keywords", label: "Keywords", icon: "🔑" },
  { key: "content", label: "Content", icon: "✍️" },
  { key: "ranks", label: "Rankings", icon: "📊" },
  { key: "audit", label: "Audit", icon: "🔍" },
];

export default function Seo() {
  const [tab, setTab] = useState<SeoTab>("keywords");
  const [loading, setLoading] = useState(true);

  // Keywords tab
  const [keywords, setKeywords] = useState<SeoKeyword[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [addingKeyword, setAddingKeyword] = useState(false);

  // Content tab
  const [contentList, setContentList] = useState<SeoContent[]>([]);
  const [contentKeyword, setContentKeyword] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<any>(null);

  // Rankings tab
  const [ranks, setRanks] = useState<RankEntry[]>([]);
  const [rankKeyword, setRankKeyword] = useState("");
  const [rankUrl, setRankUrl] = useState("");
  const [checkingRank, setCheckingRank] = useState(false);
  const [rankHistory, setRankHistory] = useState<Array<{ date: string; position: number }> | null>(null);
  const [rankFilter, setRankFilter] = useState("");

  // Audit tab
  const [auditUrl, setAuditUrl] = useState("");
  const [auditing, setAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [auditHistory, setAuditHistory] = useState<AuditResult[]>([]);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      api<SeoKeyword[]>("/seo/keywords").catch(() => []),
      api<SeoContent[]>("/seo/content").catch(() => []),
      api<RankEntry[]>("/seo/ranks").catch(() => []),
      api<AuditResult[]>("/seo/audits").catch(() => []),
    ]).then(([k, c, r, a]) => {
      setKeywords(k);
      setContentList(c);
      setRanks(r);
      setAuditHistory(a);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  // ── Keywords ──

  const addKeyword = async () => {
    if (!newKeyword.trim()) return;
    setAddingKeyword(true);
    await api("/seo/keywords", { method: "POST", body: JSON.stringify({ keyword: newKeyword.trim() }) });
    setNewKeyword("");
    setAddingKeyword(false);
    loadAll();
  };

  const deleteKeyword = async (id: number) => {
    if (!confirm("Delete this keyword?")) return;
    await api(`/seo/keywords/${id}`, { method: "DELETE" });
    loadAll();
  };

  // ── Content ──

  const generateContent = async () => {
    if (!contentKeyword.trim()) return;
    setGenerating(true);
    setGenerated(null);
    try {
      const result = await api("/seo/content", {
        method: "POST",
        body: JSON.stringify({ keyword: contentKeyword.trim(), targetUrl: contentUrl.trim() || undefined }),
      });
      setGenerated(result);
      loadAll();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const deleteContent = async (id: number) => {
    if (!confirm("Delete this content?")) return;
    await api(`/seo/content/${id}`, { method: "DELETE" });
    loadAll();
  };

  // ── Rankings ──

  const checkRank = async () => {
    if (!rankKeyword.trim()) return;
    setCheckingRank(true);
    setRankHistory(null);
    try {
      const result = await api("/seo/ranks/check", {
        method: "POST",
        body: JSON.stringify({ keyword: rankKeyword.trim(), url: rankUrl.trim() || undefined, currentPosition: 15 }),
      });
      setRankHistory(result.history);
      loadAll();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setCheckingRank(false);
    }
  };

  // ── Audit ──

  const runAudit = async () => {
    if (!auditUrl.trim()) return;
    setAuditing(true);
    setAuditResult(null);
    try {
      const result = await api("/seo/audit", {
        method: "POST",
        body: JSON.stringify({ url: auditUrl.trim() }),
      });
      setAuditResult(result);
      loadAll();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setAuditing(false);
    }
  };

  if (loading) return <div className="loading-state"><div className="loading-spinner" />Loading...</div>;

  const filteredRanks = rankFilter ? ranks.filter((r) => r.keyword.toLowerCase().includes(rankFilter.toLowerCase())) : ranks;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>📈 SEO Toolkit</h1>
          <div className="subtitle">Keyword research, content generation, rank tracking & site audits</div>
        </div>
      </div>

      <div className="card filter-bar mb-24">
        {TABS.map((t) => (
          <button key={t.key} className={`filter-pill${tab === t.key ? " active" : ""}`} onClick={() => setTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ══════ KEYWORDS TAB ══════ */}
      {tab === "keywords" && (
        <div className="grid-2">
          <div className="card">
            <h3>Add Keyword</h3>
            <div className="flex gap-sm mt-12">
              <input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                placeholder="Enter a keyword..."
              />
              <button className="btn btn-primary" onClick={addKeyword} disabled={addingKeyword}>
                {addingKeyword ? "..." : "Research"}
              </button>
            </div>
          </div>

          <div className="card" style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            <h3>Saved Keywords</h3>
            {keywords.length > 0 ? keywords.map((k) => {
              const related = JSON.parse(k.related || "[]");
              return (
                <div key={k.id} style={{ borderBottom: "1px solid var(--border)", padding: "12px 0" }}>
                  <div className="flex-between mb-8">
                    <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-bright)" }}>{k.keyword}</span>
                    <button className="btn btn-sm btn-ghost" onClick={() => deleteKeyword(k.id)}>×</button>
                  </div>
                  <div className="flex gap-lg" style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8 }}>
                    <span>Volume: <strong style={{ color: "var(--text-bright)" }}>{k.volume.toLocaleString()}</strong></span>
                    <span>Difficulty: <strong style={{ color: k.difficulty > 70 ? "var(--red)" : k.difficulty > 40 ? "var(--yellow)" : "var(--green)" }}>{k.difficulty}%</strong></span>
                  </div>
                  <div className="flex flex-wrap gap-xs">
                    {related.slice(0, 4).map((r: any, i: number) => (
                      <span key={i} className="task-tag">{r.keyword}</span>
                    ))}
                  </div>
                </div>
              );
            }) : <div className="empty-state" style={{ padding: 20 }}><p>No keywords yet. Add one above.</p></div>}
          </div>
        </div>
      )}

      {/* ══════ CONTENT TAB ══════ */}
      {tab === "content" && (
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
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-bright)", marginBottom: 4 }}>{generated.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12 }}>{generated.metaDescription}</div>
                <div style={{ fontSize: 11, color: "var(--accent)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Headings</div>
                {generated.headings?.map((h: string, i: number) => (
                  <div key={i} style={{ fontSize: 12, color: "var(--text)", padding: "3px 0" }}>H{Math.min(i + 1, 3)}: {h}</div>
                ))}
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 12 }}>Words: ~{generated.wordCount}</div>
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
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {contentList.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.keyword}</td>
                        <td style={{ fontSize: 12, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</td>
                        <td><span className="badge badge-low">{c.status}</span></td>
                        <td style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatDate(c.created_at)}</td>
                        <td><button className="btn btn-sm btn-ghost" onClick={() => deleteContent(c.id)}>×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="empty-state" style={{ padding: 20 }}><p>No content generated yet.</p></div>}
          </div>
        </div>
      )}

      {/* ══════ RANKINGS TAB ══════ */}
      {tab === "ranks" && (
        <div>
          <div className="card mb-24">
            <h3>Track Keyword Ranking</h3>
            <div className="form-row mt-12">
              <div className="form-group">
                <label>Keyword</label>
                <input value={rankKeyword} onChange={(e) => setRankKeyword(e.target.value)} placeholder="e.g. seo tools" />
              </div>
              <div className="form-group">
                <label>URL (optional)</label>
                <input value={rankUrl} onChange={(e) => setRankUrl(e.target.value)} placeholder="https://example.com" />
              </div>
            </div>
            <button className="btn btn-primary mt-12" onClick={checkRank} disabled={checkingRank}>
              {checkingRank ? "⏳ Checking..." : "📊 Check Ranking"}
            </button>

            {rankHistory && (
              <div className="card-raise mt-16">
                <h3>Position History (30 days)</h3>
                <div className="flex gap-sm mt-12" style={{ alignItems: "flex-end", minHeight: 80 }}>
                  {rankHistory.map((r, i) => (
                    <div key={i} className="flex-col" style={{ flex: 1, alignItems: "center", gap: 2 }}>
                      <div
                        style={{
                          width: "100%",
                          height: `${Math.max(8, 80 - r.position * 2.5)}px`,
                          background: r.position <= 3 ? "var(--green)" : r.position <= 10 ? "var(--accent)" : "var(--text-dim)",
                          borderRadius: "4px 4px 0 0",
                          minHeight: 4,
                          transition: "height 0.3s ease",
                        }}
                      />
                      <span style={{ fontSize: 8, color: "var(--text-dim)", transform: "rotate(-45deg)", whiteSpace: "nowrap" }}>
                        {r.date.slice(5)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex-between mb-12">
              <h3>Ranking History</h3>
              <input
                placeholder="Filter by keyword..."
                value={rankFilter}
                onChange={(e) => setRankFilter(e.target.value)}
                style={{ maxWidth: 200, fontSize: 12, padding: "4px 8px" }}
              />
            </div>
            {filteredRanks.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Keyword</th>
                      <th>Position</th>
                      <th>Date</th>
                      <th>URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRanks.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.keyword}</td>
                        <td>
                          <span className={`badge badge-${r.position <= 3 ? "low" : r.position <= 10 ? "medium" : "high"}`}>
                            #{r.position}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatDate(r.check_date)}</td>
                        <td style={{ fontSize: 12, color: "var(--text-dim)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{r.url}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="empty-state" style={{ padding: 20 }}><p>No ranking data yet. Check a keyword above.</p></div>}
          </div>
        </div>
      )}

      {/* ══════ AUDIT TAB ══════ */}
      {tab === "audit" && (
        <div>
          <div className="card mb-24">
            <h3>Site Audit</h3>
            <div className="flex gap-sm mt-12">
              <input
                value={auditUrl}
                onChange={(e) => setAuditUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runAudit()}
                placeholder="https://example.com"
              />
              <button className="btn btn-primary" onClick={runAudit} disabled={auditing}>
                {auditing ? "⏳ Scanning..." : "🔍 Run Audit"}
              </button>
            </div>

            {auditResult && (
              <div className="card-raise mt-16">
                <div className="flex-between mb-16">
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-bright)" }}>{auditResult.url}</div>
                  </div>
                  <div style={{
                    width: 80, height: 80, borderRadius: "50%",
                    border: `4px solid ${auditResult.score >= 70 ? "var(--green)" : auditResult.score >= 40 ? "var(--yellow)" : "var(--red)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, fontWeight: 700, color: "var(--text-bright)",
                  }}>
                    {auditResult.score}
                  </div>
                </div>

                <div className="grid-2" style={{ fontSize: 12 }}>
                  <div className="flex-between" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ color: "var(--text-dim)" }}>Title</span>
                    <span style={{ color: auditResult.has_title ? "var(--green)" : "var(--red)" }}>
                      {auditResult.has_title ? "✅" : "❌"} {auditResult.title.slice(0, 50)}
                    </span>
                  </div>
                  <div className="flex-between" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ color: "var(--text-dim)" }}>Meta Description</span>
                    <span style={{ color: auditResult.has_meta ? "var(--green)" : "var(--red)" }}>
                      {auditResult.has_meta ? "✅" : "❌"} {auditResult.meta_description.slice(0, 50)}
                    </span>
                  </div>
                  <div className="flex-between" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ color: "var(--text-dim)" }}>Headings</span>
                    <span>{auditResult.headings_count} found</span>
                  </div>
                  <div className="flex-between" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ color: "var(--text-dim)" }}>Links</span>
                    <span>{auditResult.links_count} found</span>
                  </div>
                  <div className="flex-between" style={{ padding: "6px 0" }}>
                    <span style={{ color: "var(--text-dim)" }}>Page Size</span>
                    <span>{auditResult.page_size} KB</span>
                  </div>
                </div>

                <div className="mt-12">
                  <h3>Issues Found</h3>
                  {JSON.parse(auditResult.issues || "[]").map((issue: string, i: number) => (
                    <div key={i} className="flex gap-sm" style={{ padding: "4px 0", fontSize: 12, color: issue.includes("passed") ? "var(--green)" : "var(--red)" }}>
                      <span>{issue.includes("passed") ? "✓" : "✗"}</span> {issue}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h3>Audit History</h3>
            {auditHistory.length > 0 ? (
              <div className="table-wrap mt-12">
                <table>
                  <thead>
                    <tr>
                      <th>URL</th>
                      <th>Score</th>
                      <th>Issues</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditHistory.map((a) => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 250 }}>{a.url}</td>
                        <td>
                          <span className={`badge badge-${a.score >= 70 ? "low" : a.score >= 40 ? "medium" : "urgent"}`}>
                            {a.score}/100
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: "var(--text-dim)" }}>{(JSON.parse(a.issues || "[]") as string[]).length} issues</td>
                        <td style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatDate(a.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="empty-state" style={{ padding: 20 }}><p>No audits yet. Run one above.</p></div>}
          </div>
        </div>
      )}
    </div>
  );
}