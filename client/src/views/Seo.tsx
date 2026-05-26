import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
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

export default function Seo() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<SeoTab>("audit");
  const qc = useQueryClient();
  const inv = (key: string[]) => qc.invalidateQueries({ queryKey: key });

  const [newKeyword, setNewKeyword] = useState("");
  const kwMutation = useMutation({
    mutationFn: (kw: string) => api("/seo/keywords", { method: "POST", body: JSON.stringify({ keyword: kw }) }),
    onSuccess: () => { setNewKeyword(""); inv(["seo", "keywords"]); },
  });
  const delKwMutation = useMutation({
    mutationFn: (id: number) => api(`/seo/keywords/${id}`, { method: "DELETE" }),
    onSuccess: () => inv(["seo", "keywords"]),
  });

  const [contentKeyword, setContentKeyword] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const contentMutation = useMutation({
    mutationFn: (d: { keyword: string; targetUrl?: string }) =>
      api("/seo/content", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => inv(["seo", "content"]),
  });

  const [rankFilter, setRankFilter] = useState("");
  const [rankKeyword, setRankKeyword] = useState("");
  const [rankUrl, setRankUrl] = useState("");
  const rankMutation = useMutation({
    mutationFn: (d: { keyword: string; url?: string }) =>
      api("/seo/ranks/check", { method: "POST", body: JSON.stringify({ ...d, currentPosition: 15 }) }),
    onSuccess: () => inv(["seo", "ranks"]),
  });

  const [auditUrl, setAuditUrl] = useState("");
  const [auditForce, setAuditForce] = useState(false);
  const [auditCachedMsg, setAuditCachedMsg] = useState("");
  const auditMutation = useMutation({
    mutationFn: ({ url, force }: { url: string; force?: boolean }) =>
      api(`/seo/audit?force=${force ? "true" : "false"}`, { method: "POST", body: JSON.stringify({ url }) }),
    onSuccess: (data) => {
      inv(["seo", "audits"]);
      if (data.cached) {
        setAuditCachedMsg(data.message);
      } else {
        setAuditCachedMsg("");
        navigate({ to: "/seo/report/$auditId", params: { auditId: String(data.id) } });
      }
    },
  });
  const delAuditMutation = useMutation({
    mutationFn: (id: number) => api(`/seo/audits/${id}`, { method: "DELETE" }),
    onSuccess: () => inv(["seo", "audits"]),
  });

  const { data: keywords = [], isLoading: kwLoading } = useKeywords();
  const { data: contentList = [] } = useContentList();
  const { data: ranks = [] } = useRanks();
  const { data: auditHistory = [], isLoading: auditLoading } = useAuditHistory();

  const busy = kwMutation.isPending || contentMutation.isPending || rankMutation.isPending || auditMutation.isPending;
  const filteredRanks = rankFilter ? ranks.filter((r: any) => r.keyword.toLowerCase().includes(rankFilter.toLowerCase())) : ranks;

  const handleTabChange = (key: SeoTab) => () => setTab(key);
  const handleNewKwChange = (e: React.ChangeEvent<HTMLInputElement>) => setNewKeyword(e.target.value);
  const handleKwKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter" && newKeyword.trim()) kwMutation.mutate(newKeyword.trim()); };
  const handleKwResearch = () => { if (newKeyword.trim()) kwMutation.mutate(newKeyword.trim()); };
  const createDelKwHandler = (id: number) => () => { if (confirm("Delete this keyword?")) delKwMutation.mutate(id); };

  const handleCkwChange = (e: React.ChangeEvent<HTMLInputElement>) => setContentKeyword(e.target.value);
  const handleCurlChange = (e: React.ChangeEvent<HTMLInputElement>) => setContentUrl(e.target.value);
  const handleGenerate = () => { if (contentKeyword.trim()) contentMutation.mutate({ keyword: contentKeyword.trim(), targetUrl: contentUrl.trim() || undefined }); };

  const handleRkwChange = (e: React.ChangeEvent<HTMLInputElement>) => setRankKeyword(e.target.value);
  const handleRurlChange = (e: React.ChangeEvent<HTMLInputElement>) => setRankUrl(e.target.value);
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => setRankFilter(e.target.value);
  const handleCheckRank = () => { if (rankKeyword.trim()) rankMutation.mutate({ keyword: rankKeyword.trim(), url: rankUrl.trim() || undefined }); };

  const handleAuditUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => setAuditUrl(e.target.value);
  const handleAuditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter" && auditUrl.trim()) auditMutation.mutate({ url: auditUrl.trim(), force: auditForce }); };
  const handleRunAudit = () => { if (auditUrl.trim()) auditMutation.mutate({ url: auditUrl.trim(), force: auditForce }); };
  const handleAuditForceToggle = () => setAuditForce((p) => !p);
  const createViewHandler = (id: number) => () => navigate({ to: "/seo/report/$auditId", params: { auditId: String(id) } });
  const createDelAuditHandler = (id: number) => (e: React.MouseEvent) => { e.stopPropagation(); if (confirm("Delete this audit?")) delAuditMutation.mutate(id); };

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
          <button key={t.key} className={`filter-pill${tab === t.key ? " active" : ""}`} onClick={handleTabChange(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "keywords" && (
        <div className="grid-2">
          <div className="card">
            <h3>Add Keyword</h3>
            <div className="flex gap-sm mt-12">
              <input value={newKeyword} onChange={handleNewKwChange} onKeyDown={handleKwKeyDown} placeholder="Enter a keyword..." />
              <button className="btn btn-primary" onClick={handleKwResearch} disabled={busy}>{kwMutation.isPending ? "..." : "Research"}</button>
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
                    <button className="btn btn-sm btn-ghost" onClick={createDelKwHandler(k.id)}>×</button>
                  </div>
                  <div className="flex gap-lg" style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8 }}>
                    <span>Volume: <strong style={{ color: "var(--text-bright)" }}>{k.volume?.toLocaleString()}</strong></span>
                    <span>Difficulty: <strong style={{ color: k.difficulty > 70 ? "var(--red)" : k.difficulty > 40 ? "var(--yellow)" : "var(--green)" }}>{k.difficulty}%</strong></span>
                  </div>
                  <div className="flex flex-wrap gap-xs">
                    {related.slice(0, 4).map((r: any, i: number) => (<span key={i} className="task-tag">{r.keyword}</span>))}
                  </div>
                </div>
              );
            }) : <div className="empty-state" style={{ padding: 20 }}><p>{kwLoading ? "Loading..." : "No keywords yet."}</p></div>}
          </div>
        </div>
      )}

      {tab === "content" && (
        <div>
          <div className="card mb-24">
            <h3>Generate SEO Content</h3>
            <div className="form-row mt-12">
              <div className="form-group"><label>Keyword</label><input value={contentKeyword} onChange={handleCkwChange} placeholder="e.g. seo tools" /></div>
              <div className="form-group"><label>Target URL (optional)</label><input value={contentUrl} onChange={handleCurlChange} placeholder="https://example.com/page" /></div>
            </div>
            <button className="btn btn-primary mt-12" onClick={handleGenerate} disabled={busy}>{contentMutation.isPending ? "⏳ Generating..." : "✍️ Generate Content"}</button>
            {contentMutation.data && (
              <div className="card-raise mt-16" style={{ animation: "statEnter 0.3s ease-out" }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-bright)", marginBottom: 4 }}>{contentMutation.data.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12 }}>{contentMutation.data.metaDescription}</div>
                <div style={{ fontSize: 11, color: "var(--accent)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Headings</div>
                {(contentMutation.data.headings || []).map((h: string, i: number) => (<div key={i} style={{ fontSize: 12, color: "var(--text)", padding: "3px 0" }}>H{Math.min(i + 1, 3)}: {h}</div>))}
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 12 }}>Words: ~{contentMutation.data.wordCount}</div>
              </div>
            )}
          </div>
          <div className="card">
            <h3>Generated Content History</h3>
            {contentList.length > 0 ? (
              <div className="table-wrap mt-12"><table>
                <thead><tr><th>Keyword</th><th>Title</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>{contentList.map((c: any) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.keyword}</td>
                    <td style={{ fontSize: 12, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</td>
                    <td><span className="badge badge-low">{c.status}</span></td>
                    <td style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatDate(c.created_at)}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            ) : <div className="empty-state" style={{ padding: 20 }}><p>No content generated yet.</p></div>}
          </div>
        </div>
      )}

      {tab === "ranks" && (
        <div>
          <div className="card mb-24">
            <h3>Track Keyword Ranking</h3>
            <div className="form-row mt-12">
              <div className="form-group"><label>Keyword</label><input value={rankKeyword} onChange={handleRkwChange} placeholder="e.g. seo tools" /></div>
              <div className="form-group"><label>URL (optional)</label><input value={rankUrl} onChange={handleRurlChange} placeholder="https://example.com" /></div>
            </div>
            <button className="btn btn-primary mt-12" onClick={handleCheckRank} disabled={busy}>{rankMutation.isPending ? "⏳ Checking..." : "📊 Check Ranking"}</button>
            {rankMutation.data?.history && (
              <div className="card-raise mt-16">
                <h3>Position — #{rankMutation.data.position}</h3>
                <div className="flex gap-sm mt-12" style={{ alignItems: "flex-end", minHeight: 80 }}>
                  {rankMutation.data.history.map((r: any, i: number) => (
                    <div key={i} className="flex-col" style={{ flex: 1, alignItems: "center", gap: 2 }}>
                      <div style={{ width: "100%", height: `${Math.max(8, 80 - r.position * 2.5)}px`, background: r.position <= 3 ? "var(--green)" : r.position <= 10 ? "var(--accent)" : "var(--text-dim)", borderRadius: "4px 4px 0 0", minHeight: 4, transition: "height 0.3s ease" }} />
                      <span style={{ fontSize: 8, color: "var(--text-dim)", whiteSpace: "nowrap" }}>{r.date?.slice(5)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="card">
            <div className="flex-between mb-12">
              <h3>Ranking History</h3>
              <input placeholder="Filter by keyword..." value={rankFilter} onChange={handleFilterChange} style={{ maxWidth: 200, fontSize: 12, padding: "4px 8px" }} />
            </div>
            {filteredRanks.length > 0 ? (
              <div className="table-wrap"><table>
                <thead><tr><th>Keyword</th><th>Position</th><th>Date</th><th>URL</th></tr></thead>
                <tbody>{filteredRanks.map((r: any) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.keyword}</td>
                    <td><span className={`badge badge-${r.position <= 3 ? "low" : r.position <= 10 ? "medium" : "high"}`}>#{r.position}</span></td>
                    <td style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatDate(r.check_date)}</td>
                    <td style={{ fontSize: 12, color: "var(--text-dim)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{r.url}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            ) : <div className="empty-state" style={{ padding: 20 }}><p>No ranking data yet.</p></div>}
          </div>
        </div>
      )}

      {tab === "audit" && (
        <div>
          <div className="card mb-24">
            <h3>Site Audit</h3>
            <div className="flex gap-sm mt-12">
              <input value={auditUrl} onChange={handleAuditUrlChange} onKeyDown={handleAuditKeyDown} placeholder="https://example.com" />
              <button className="btn btn-primary" onClick={handleRunAudit} disabled={busy}>{auditMutation.isPending ? "⏳ Scanning..." : "🔍 Run Audit"}</button>
              <label className="flex gap-xs" style={{ alignItems: "center", cursor: "pointer", fontSize: 11, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                <input type="checkbox" checked={auditForce} onChange={handleAuditForceToggle} />
                ⚡ Force
              </label>
            </div>
            {auditCachedMsg && (
              <div className="mt-12" style={{ padding: "10px 14px", borderRadius: 6, background: "oklch(0.60 0.10 80 / 0.08)", border: "1px solid oklch(0.60 0.10 80 / 0.2)", fontSize: 12, color: "var(--yellow)", display: "flex", alignItems: "center", gap: 10 }}>
                <span>⚠️</span>
                <span style={{ flex: 1 }}>{auditCachedMsg}</span>
                <button className="btn btn-sm" onClick={() => { setAuditForce(true); setAuditCachedMsg(""); auditMutation.mutate({ url: auditUrl, force: true }); }}>Force re-audit</button>
              </div>
            )}
          </div>
          <div className="card">
            <h3>Audit History</h3>
            {auditLoading ? (
              <div className="loading-state" style={{ padding: 20 }}><div className="loading-spinner" /></div>
            ) : auditHistory.length > 0 ? (
              <div className="table-wrap mt-12"><table>
                <thead><tr><th>URL</th><th>Score</th><th>Issues</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>{auditHistory.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 250 }}>{a.url}</td>
                    <td><span className={`badge badge-${a.score >= 70 ? "low" : a.score >= 40 ? "medium" : "urgent"}`}>{a.score}/100</span></td>
                    <td style={{ fontSize: 12, color: "var(--text-dim)" }}>{((a.issues || []) as string[]).length} issues</td>
                    <td style={{ fontSize: 12, color: "var(--text-dim)" }}>{formatDate(a.created_at)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-sm btn-ghost" onClick={createViewHandler(a.id)}>View</button>
                        <button className="btn btn-sm btn-danger" onClick={createDelAuditHandler(a.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table></div>
            ) : <div className="empty-state" style={{ padding: 20 }}><p>No audits yet. Run one above.</p></div>}
          </div>
        </div>
      )}
    </div>
  );
}