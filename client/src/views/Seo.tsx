import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, formatDate } from "../lib/api";

type SeoTab = "keywords" | "content" | "ranks" | "audit";
const TABS: Array<{ key: SeoTab; label: string; icon: string }> = [
  { key: "keywords", label: "Keywords", icon: "🔑" },
  { key: "content", label: "Content", icon: "✍️" },
  { key: "ranks", label: "Rankings", icon: "📊" },
  { key: "audit", label: "Audit", icon: "🔍" },
];

interface AuditResult {
  id: number; url: string; score: number; title: string; meta_description: string;
  headings_count: number; links_count: number; has_meta: number; has_title: number;
  page_size: number; issues: string; created_at: string;
}

// ── Hooks ──

function useKeywords() {
  return useQuery<any[]>({ queryKey: ["seo", "keywords"], queryFn: () => api("/seo/keywords") });
}

function useContentList() {
  return useQuery<any[]>({ queryKey: ["seo", "content"], queryFn: () => api("/seo/content") });
}

function useRanks() {
  return useQuery<any[]>({ queryKey: ["seo", "ranks"], queryFn: () => api("/seo/ranks") });
}

function useAuditHistory() {
  return useQuery<AuditResult[]>({ queryKey: ["seo", "audits"], queryFn: () => api("/seo/audits") });
}

// ── View ──

export default function Seo() {
  const [tab, setTab] = useState<SeoTab>("audit");
  const queryClient = useQueryClient();
  const inval = (keys: string[]) => queryClient.invalidateQueries({ queryKey: keys });

  // Keywords
  const [newKeyword, setNewKeyword] = useState("");
  const kwMutation = useMutation({
    mutationFn: (kw: string) => api("/seo/keywords", { method: "POST", body: JSON.stringify({ keyword: kw }) }),
    onSuccess: () => { setNewKeyword(""); inval(["seo", "keywords"]); },
  });

  // Content
  const [contentKeyword, setContentKeyword] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const contentMutation = useMutation({
    mutationFn: (data: { keyword: string; targetUrl?: string }) =>
      api("/seo/content", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => inval(["seo", "content"]),
  });

  // Ranks
  const [rankFilter, setRankFilter] = useState("");
  const [rankKeyword, setRankKeyword] = useState("");
  const [rankUrl, setRankUrl] = useState("");
  const rankMutation = useMutation({
    mutationFn: (data: { keyword: string; url?: string }) =>
      api("/seo/ranks/check", { method: "POST", body: JSON.stringify({ ...data, currentPosition: 15 }) }),
    onSuccess: () => inval(["seo", "ranks"]),
  });

  // Audit
  const [auditUrl, setAuditUrl] = useState("");
  const [selectedAudit, setSelectedAudit] = useState<AuditResult | null>(null);
  const auditMutation = useMutation({
    mutationFn: (url: string) => api("/seo/audit", { method: "POST", body: JSON.stringify({ url }) }),
    onSuccess: (data) => { setSelectedAudit(data); inval(["seo", "audits"]); },
  });

  const { data: keywords = [], isLoading: kwLoading } = useKeywords();
  const { data: contentList = [] } = useContentList();
  const { data: ranks = [] } = useRanks();
  const { data: auditHistory = [], isLoading: auditLoading } = useAuditHistory();

  const filteredRanks = rankFilter ? ranks.filter((r: any) => r.keyword.toLowerCase().includes(rankFilter.toLowerCase())) : ranks;

  const activeMutation = kwMutation.isPending || contentMutation.isPending || rankMutation.isPending || auditMutation.isPending;

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
          <button key={t.key} className={`filter-pill${tab === t.key ? " active" : ""}`} onClick={() => { setTab(t.key); setSelectedAudit(null); }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ══════ KEYWORDS ══════ */}
      {tab === "keywords" && (
        <div className="grid-2">
          <div className="card">
            <h3>Add Keyword</h3>
            <div className="flex gap-sm mt-12">
              <input value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && newKeyword.trim() && kwMutation.mutate(newKeyword.trim())}
                placeholder="Enter a keyword..." />
              <button className="btn btn-primary" onClick={() => newKeyword.trim() && kwMutation.mutate(newKeyword.trim())} disabled={activeMutation}>
                {kwMutation.isPending ? "..." : "Research"}
              </button>
            </div>
          </div>
          <div className="card" style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            <h3>Saved Keywords</h3>
            {keywords.length > 0 ? keywords.map((k: any) => {
              const related = JSON.parse(k.related || "[]");
              return (
                <div key={k.id} style={{ borderBottom: "1px solid var(--border)", padding: "12px 0" }}>
                  <div className="flex-between mb-8">
                    <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-bright)" }}>{k.keyword}</span>
                  </div>
                  <div className="flex gap-lg" style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8 }}>
                    <span>Volume: <strong style={{ color: "var(--text-bright)" }}>{k.volume?.toLocaleString()}</strong></span>
                    <span>Difficulty: <strong style={{ color: k.difficulty > 70 ? "var(--red)" : k.difficulty > 40 ? "var(--yellow)" : "var(--green)" }}>{k.difficulty}%</strong></span>
                  </div>
                  <div className="flex flex-wrap gap-xs">
                    {related.slice(0, 4).map((r: any, i: number) => (
                      <span key={i} className="task-tag">{r.keyword}</span>
                    ))}
                  </div>
                </div>
              );
            }) : <div className="empty-state" style={{ padding: 20 }}><p>{kwLoading ? "Loading..." : "No keywords yet."}</p></div>}
          </div>
        </div>
      )}

      {/* ══════ CONTENT ══════ */}
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
            <button className="btn btn-primary mt-12" onClick={() => contentKeyword.trim() && contentMutation.mutate({ keyword: contentKeyword.trim(), targetUrl: contentUrl.trim() || undefined })} disabled={activeMutation}>
              {contentMutation.isPending ? "⏳ Generating..." : "✍️ Generate Content"}
            </button>
            {contentMutation.data && (
              <div className="card-raise mt-16" style={{ animation: "statEnter 0.3s ease-out" }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-bright)", marginBottom: 4 }}>{contentMutation.data.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12 }}>{contentMutation.data.metaDescription}</div>
                <div style={{ fontSize: 11, color: "var(--accent)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Headings</div>
                {(contentMutation.data.headings || []).map((h: string, i: number) => (
                  <div key={i} style={{ fontSize: 12, color: "var(--text)", padding: "3px 0" }}>H{Math.min(i + 1, 3)}: {h}</div>
                ))}
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 12 }}>Words: ~{contentMutation.data.wordCount}</div>
              </div>
            )}
          </div>
          <div className="card">
            <h3>Generated Content History</h3>
            {contentList.length > 0 ? (
              <div className="table-wrap mt-12">
                <table>
                  <thead><tr><th>Keyword</th><th>Title</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>{contentList.map((c: any) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.keyword}</td>
                      <td style={{ fontSize: 12, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</td>
                      <td><span className="badge badge-low">{c.status}</span></td>
                      <td style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatDate(c.created_at)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <div className="empty-state" style={{ padding: 20 }}><p>No content generated yet.</p></div>}
          </div>
        </div>
      )}

      {/* ══════ RANKINGS ══════ */}
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
            <button className="btn btn-primary mt-12" onClick={() => rankKeyword.trim() && rankMutation.mutate({ keyword: rankKeyword.trim(), url: rankUrl.trim() || undefined })} disabled={activeMutation}>
              {rankMutation.isPending ? "⏳ Checking..." : "📊 Check Ranking"}
            </button>
            {rankMutation.data?.history && (
              <div className="card-raise mt-16">
                <h3>Position — #{rankMutation.data.position}</h3>
                <div className="flex gap-sm mt-12" style={{ alignItems: "flex-end", minHeight: 80 }}>
                  {rankMutation.data.history.map((r: any, i: number) => (
                    <div key={i} className="flex-col" style={{ flex: 1, alignItems: "center", gap: 2 }}>
                      <div style={{ width: "100%", height: `${Math.max(8, 80 - r.position * 2.5)}px`,
                        background: r.position <= 3 ? "var(--green)" : r.position <= 10 ? "var(--accent)" : "var(--text-dim)",
                        borderRadius: "4px 4px 0 0", minHeight: 4, transition: "height 0.3s ease" }} />
                      <span style={{ fontSize: 8, color: "var(--text-dim)", whiteSpace: "nowrap" }}>{r.date.slice(5)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="card">
            <div className="flex-between mb-12">
              <h3>Ranking History</h3>
              <input placeholder="Filter by keyword..." value={rankFilter} onChange={(e) => setRankFilter(e.target.value)} style={{ maxWidth: 200, fontSize: 12, padding: "4px 8px" }} />
            </div>
            {filteredRanks.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Keyword</th><th>Position</th><th>Date</th><th>URL</th></tr></thead>
                  <tbody>{filteredRanks.map((r: any) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.keyword}</td>
                      <td><span className={`badge badge-${r.position <= 3 ? "low" : r.position <= 10 ? "medium" : "high"}`}>#{r.position}</span></td>
                      <td style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatDate(r.check_date)}</td>
                      <td style={{ fontSize: 12, color: "var(--text-dim)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{r.url}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <div className="empty-state" style={{ padding: 20 }}><p>No ranking data yet.</p></div>}
          </div>
        </div>
      )}

      {/* ══════ AUDIT ══════ */}
      {tab === "audit" && (
        <div>
          <div className="card mb-24">
            <h3>Site Audit</h3>
            <div className="flex gap-sm mt-12">
              <input value={auditUrl} onChange={(e) => setAuditUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && auditUrl.trim() && auditMutation.mutate(auditUrl.trim())}
                placeholder="https://example.com" />
              <button className="btn btn-primary" onClick={() => auditUrl.trim() && auditMutation.mutate(auditUrl.trim())} disabled={activeMutation}>
                {auditMutation.isPending ? "⏳ Scanning..." : "🔍 Run Audit"}
              </button>
            </div>

            {/* Current / selected audit report */}
            {auditMutation.data && (
              <AuditReportCard audit={auditMutation.data} />
            )}
            {selectedAudit && !auditMutation.data && (
              <AuditReportCard audit={selectedAudit} />
            )}
          </div>

          <div className="card">
            <h3>Audit History</h3>
            {auditLoading ? (
              <div className="loading-state" style={{ padding: 20 }}><div className="loading-spinner" /></div>
            ) : auditHistory.length > 0 ? (
              <div className="table-wrap mt-12">
                <table>
                  <thead><tr><th>URL</th><th>Score</th><th>Issues</th><th>Date</th><th></th></tr></thead>
                  <tbody>
                    {auditHistory.map((a) => (
                      <tr key={a.id}
                        onClick={() => setSelectedAudit(a)}
                        style={{ cursor: "pointer" }}
                        className={selectedAudit?.id === a.id ? "" : ""}>
                        <td style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 250 }}>{a.url}</td>
                        <td><span className={`badge badge-${a.score >= 70 ? "low" : a.score >= 40 ? "medium" : "urgent"}`}>{a.score}/100</span></td>
                        <td style={{ fontSize: 12, color: "var(--text-dim)" }}>{(JSON.parse(a.issues || "[]") as string[]).length} issues</td>
                        <td style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatDate(a.created_at)}</td>
                        <td><button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); setSelectedAudit(a); }}>View</button></td>
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

// ── Audit Report Component ──

function AuditReportCard({ audit }: { audit: AuditResult }) {
  const issues: string[] = JSON.parse(audit.issues || "[]");
  return (
    <div className="card-raise mt-16" style={{ animation: "statEnter 0.3s ease-out" }}>
      <div className="flex-between mb-16">
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-bright)" }}>{audit.url}</div>
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>{formatDate(audit.created_at)}</div>
        </div>
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          border: `4px solid ${audit.score >= 70 ? "var(--green)" : audit.score >= 40 ? "var(--yellow)" : "var(--red)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, fontWeight: 700, color: "var(--text-bright)",
          flexShrink: 0,
        }}>
          {audit.score}
        </div>
      </div>

      <div className="grid-2" style={{ fontSize: 12 }}>
        <div className="flex-between" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
          <span style={{ color: "var(--text-dim)" }}>Title</span>
          <span style={{ color: audit.has_title ? "var(--green)" : "var(--red)", maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {audit.has_title ? "✅ " : "❌ "}{audit.title?.slice(0, 50)}
          </span>
        </div>
        <div className="flex-between" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
          <span style={{ color: "var(--text-dim)" }}>Meta Description</span>
          <span style={{ color: audit.has_meta ? "var(--green)" : "var(--red)", maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {audit.has_meta ? "✅" : "❌"} {audit.meta_description?.slice(0, 50)}
          </span>
        </div>
        <div className="flex-between" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
          <span style={{ color: "var(--text-dim)" }}>Headings</span>
          <span>{audit.headings_count} found</span>
        </div>
        <div className="flex-between" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
          <span style={{ color: "var(--text-dim)" }}>Links</span>
          <span>{audit.links_count} found</span>
        </div>
        <div className="flex-between" style={{ padding: "6px 0" }}>
          <span style={{ color: "var(--text-dim)" }}>Page Size</span>
          <span>{audit.page_size} KB</span>
        </div>
      </div>

      <div className="mt-12">
        <h3>Issues Found</h3>
        {issues.map((issue, i) => (
          <div key={i} className="flex gap-sm" style={{ padding: "4px 0", fontSize: 12, color: issue.includes("passed") ? "var(--green)" : "var(--red)" }}>
            <span>{issue.includes("passed") ? "✓" : "✗"}</span> {issue}
          </div>
        ))}
      </div>
    </div>
  );
}