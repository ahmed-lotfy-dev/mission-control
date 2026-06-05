import { useEffect, useState, useRef } from "react";
import { api, formatDate, timeAgo } from "../lib/api";

type Tab = "overview" | "rankings" | "keywords" | "backlinks" | "competitors" | "audit" | "content" | "reports";
const TABS: Array<{ key: Tab; label: string; icon: string; desc: string }> = [
  { key: "overview", label: "Overview", icon: "📊", desc: "Dashboard summary" },
  { key: "rankings", label: "Rank Tracker", icon: "🏆", desc: "Keyword positions" },
  { key: "keywords", label: "Keywords", icon: "🔑", desc: "Keyword research" },
  { key: "backlinks", label: "Backlinks", icon: "🔗", desc: "Link analysis" },
  { key: "competitors", label: "Competitors", icon: "🎯", desc: "Competitor analysis" },
  { key: "audit", label: "Site Audit", icon: "🔍", desc: "Technical SEO issues" },
  { key: "content", label: "Content", icon: "✍️", desc: "Content optimizer" },
  { key: "reports", label: "Reports", icon: "📄", desc: "White-label reports" },
];

interface Project { id: number; name: string; domain: string; favicon: string; status: string; added_at: string; last_crawled: string; }
interface Ranking { id: number; keyword: string; url: string; position: number; prev_position: number; position_change: number; serp_features: string; device: string; location: string; created_at: string; }
interface KeywordData { keyword: string; volume: number; difficulty: number; cpc: number; competition: number; trend: number[]; related: string[]; questions: string[]; suggestions?: KeywordData[]; }
interface Backlink { id: number; source_domain: string; source_url: string; domain_rating: number; link_type: string; anchor_text: string; is_new: number; is_lost: number; created_at: string; }
interface BacklinkStats { domain_rating: number; ref_domains: number; backlinks: number; dofollow: number; nofollow: number; edu_gov: number; totalBacklinks: number; newBacklinks: number; lostBacklinks: number; }
interface Competitor { id: number; competitor_domain: string; traffic_estimate: number; keywords_count: number; common_keywords: number; overlap_score: number; }
interface AuditIssue { id: number; type: string; severity: string; title: string; description: string; url: string; affected_count: number; }
interface Alert { id: number; type: string; message: string; severity: string; is_read: number; created_at: string; }

export default function SeoHub() {
  const [tab, setTab] = useState<Tab>("overview");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showAddProject, setShowAddProject] = useState(false);
  const [newDomain, setNewDomain] = useState("");

  // Rankings
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [rankingOverview, setRankingOverview] = useState<any>(null);
  const [newKeyword, setNewKeyword] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Keywords
  const [keywordSearch, setKeywordSearch] = useState("");
  const [keywordResults, setKeywordResults] = useState<KeywordData | null>(null);
  const [keywordResearching, setKeywordResearching] = useState(false);
  const [savedKeywords, setSavedKeywords] = useState<any[]>([]);

  // Backlinks
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [backlinkStats, setBacklinkStats] = useState<BacklinkStats | null>(null);
  const [anchorText, setAnchorText] = useState<any[]>([]);
  const [refreshingBacklinks, setRefreshingBacklinks] = useState(false);

  // Competitors
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [newCompetitor, setNewCompetitor] = useState("");

  // Audit
  const [auditIssues, setAuditIssues] = useState<AuditIssue[]>([]);
  const [auditSummary, setAuditSummary] = useState<any>(null);
  const [auditRunning, setAuditRunning] = useState(false);

  // Alerts
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Content
  const [contentUrl, setContentUrl] = useState("");
  const [contentKeyword, setContentKeyword] = useState("");
  const [contentAnalysis, setContentAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Reports
  const [reports, setReports] = useState<any[]>([]);
  const [showNewReport, setShowNewReport] = useState(false);
  const [reportForm, setReportForm] = useState({ name: "", type: "full", scheduled: false, scheduleCron: "" });

  const chartRef = useRef<HTMLCanvasElement>(null);

  // ── Load data ──
  const loadProjects = () => api<Project[]>("/seo-hub/projects").then(setProjects);
  const loadAlerts = () => { if (!selectedProject) return; api<any>(`/seo-hub/alerts/${selectedProject.id}`).then(d => { setAlerts(d.alerts || []); setUnreadCount(d.unreadCount || 0); }); };
  const loadRankings = () => { if (!selectedProject) return; api<Ranking[]>(`/seo-hub/rankings/${selectedProject.id}`).then(setRankings); api<any>(`/seo-hub/rankings/overview/${selectedProject.id}`).then(setRankingOverview); };
  const loadBacklinks = () => { if (!selectedProject) return; api<Backlink[]>(`/seo-hub/backlinks/${selectedProject.id}`).then(setBacklinks); api<any>(`/seo-hub/backlinks/stats/${selectedProject.id}`).then(setBacklinkStats); api<any>(`/seo-hub/backlinks/anchors/${selectedProject.id}`).then(setAnchorText); };
  const loadCompetitors = () => { if (!selectedProject) return; api<Competitor[]>(`/seo-hub/competitors/${selectedProject.id}`).then(setCompetitors); };
  const loadAudit = () => { if (!selectedProject) return; api<any>(`/seo-hub/audit/${selectedProject.id}`).then(d => { setAuditIssues(d.issues || []); setAuditSummary(d.summary || null); }); };
  const loadReports = () => { if (!selectedProject) return; api<any[]>(`/seo-hub/reports/${selectedProject.id}`).then(setReports); };
  const loadSavedKeywords = () => api<any[]>("/seo-hub/keywords/saved").then(setSavedKeywords);

  useEffect(() => { loadProjects(); loadSavedKeywords(); }, []);
  useEffect(() => { if (selectedProject) { loadRankings(); loadBacklinks(); loadCompetitors(); loadAudit(); loadReports(); loadAlerts(); } }, [selectedProject]);

  // ── Actions ──
  const addProject = async () => {
    if (!newDomain.trim()) return;
    await api("/seo-hub/projects", { method: "POST", body: JSON.stringify({ domain: newDomain }) });
    setNewDomain(""); setShowAddProject(false); loadProjects();
  };

  const deleteProject = async (id: number) => { if (!confirm("Delete project and all data?")) return; await api(`/seo-hub/projects/${id}`, { method: "DELETE" }); if (selectedProject?.id === id) setSelectedProject(null); loadProjects(); };

  const addKeyword = async () => {
    if (!newKeyword.trim() || !selectedProject) return;
    await api(`/seo-hub/rankings/${selectedProject.id}`, { method: "POST", body: JSON.stringify({ keyword: newKeyword }) });
    setNewKeyword(""); loadRankings();
  };

  const refreshRankings = async () => { if (!selectedProject) return; setRefreshing(true); const r = await api<any>(`/seo-hub/rankings/refresh/${selectedProject.id}`); loadRankings(); setRefreshing(false); };

  const researchKeyword = async () => {
    if (!keywordSearch.trim()) return;
    setKeywordResearching(true);
    const result = await api<KeywordData>("/seo-hub/keywords/research", { method: "POST", body: JSON.stringify({ keyword: keywordSearch }) });
    setKeywordResults(result.error ? null : result);
    setKeywordResearching(false);
  };

  const saveKeyword = async (kw: string) => { await api("/seo-hub/keywords/save", { method: "POST", body: JSON.stringify({ keyword: kw }) }); loadSavedKeywords(); };

  const refreshBacklinks = async () => { if (!selectedProject) return; setRefreshingBacklinks(true); await api<any>(`/seo-hub/backlinks/refresh/${selectedProject.id}`); loadBacklinks(); loadAlerts(); setRefreshingBacklinks(false); };

  const addCompetitor = async () => { if (!newCompetitor.trim() || !selectedProject) return; await api(`/seo-hub/competitors/add/${selectedProject.id}`, { method: "POST", body: JSON.stringify({ domain: newCompetitor }) }); setNewCompetitor(""); loadCompetitors(); };
  const deleteCompetitor = async (id: number) => { await api(`/seo-hub/competitors/${id}`, { method: "DELETE" }); loadCompetitors(); };

  const runAudit = async () => { if (!selectedProject) return; setAuditRunning(true); await api<any>(`/seo-hub/audit/run/${selectedProject.id}`); loadAudit(); setAuditRunning(false); };

  const analyzeContent = async () => { if (!contentUrl.trim()) return; setAnalyzing(true); const result = await api<any>("/seo-hub/content/analyze", { method: "POST", body: JSON.stringify({ url: contentUrl, keyword: contentKeyword }) }); setContentAnalysis(result.error ? null : result); setAnalyzing(false); };

  const createReport = async () => { if (!selectedProject) return; await api(`/seo-hub/reports/${selectedProject.id}`, { method: "POST", body: JSON.stringify({ projectId: selectedProject.id, ...reportForm }) }); setShowNewReport(false); setReportForm({ name: "", type: "full", scheduled: false, scheduleCron: "" }); loadReports(); };

  const markAlertsRead = async () => { if (!selectedProject) return; await api(`/seo-hub/alerts/mark-read/${selectedProject.id}`, { method: "POST" }); loadAlerts(); };

  const serpIcon = (f: string) => ({ featured_snippet: "⭐", people_also_ask: "❓", local_pack: "📍", video: "🎬", news: "📰", images: "🖼️", shopping: "🛒", reviews: "⭐" }[f] || "📌");

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>🎯 SEO Hub</h1>
          <div className="subtitle">All-in-one SEO platform — Rank Tracker, Keywords, Backlinks, Audit, Content & Reports</div>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button className="btn btn-ghost" onClick={markAlertsRead}>🔔 {unreadCount} new</button>
          )}
          <button className="btn btn-primary" onClick={() => setShowAddProject(true)}>+ Add Project</button>
        </div>
      </div>

      {/* Project Selector */}
      <div className="card mb-24">
        <div className="flex gap-2 flex-wrap">
          {projects.length === 0 && <span className="text-[12px] text-text-dim">No projects — add one to get started</span>}
          {projects.map(p => (
            <button
              key={p.id}
              className={`card-raise px-3 py-[6px] rounded-lg flex items-center gap-2 cursor-pointer border ${selectedProject?.id === p.id ? "border-[var(--accent)] bg-bg-raise" : "border-transparent"}`}
              onClick={() => setSelectedProject(p)}
            >
              <img src={p.favicon} alt="" className="w-4 h-4" onError={(e) => (e.currentTarget.style.display = "none")} />
              <span className="text-[12px] font-semibold">{p.domain}</span>
              <button className="text-[10px] text-red ml-1" onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}>✕</button>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="card filter-bar mb-24 flex gap-[4px] overflow-x-auto pb-[4px]">
        {TABS.map(t => (
          <button key={t.key} className={`filter-pill${tab === t.key ? " active" : ""} flex-shrink-0`} onClick={() => setTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW TAB ═══ */}
      {tab === "overview" && selectedProject && (
        <div className="grid-4 mb-24">
          {rankingOverview && (
            <>
              <div className="stat-card accent-purple">
                <span className="value">{rankingOverview.total || 0}</span>
                <div className="label">Tracked Keywords</div>
              </div>
              <div className="stat-card accent-gold">
                <span className="value">{rankingOverview.top10 || 0}</span>
                <div className="label">In Top 10</div>
              </div>
              <div className="stat-card accent-green">
                <span className="value">{rankingOverview.trafficEstimate?.toLocaleString() || 0}</span>
                <div className="label">Est. Monthly Visits</div>
              </div>
              <div className="stat-card" style={{ borderTop: "2px solid var(--yellow)" }}>
                <span className="value">{backlinkStats?.ref_domains || 0}</span>
                <div className="label">Ref. Domains</div>
              </div>
            </>
          )}
          {rankingOverview && (
            <div className="stat-card accent-gold" style={{ borderTop: "2px solid var(--red)" }}>
              <span className="value" style={{ color: rankingOverview.avgPosition > 10 ? "var(--red)" : "var(--green)" }}>{rankingOverview.avgPosition}</span>
              <div className="label">Avg Position</div>
            </div>
          )}
        </div>
      )}
      {tab === "overview" && selectedProject && (
        <div className="grid-2">
          {/* Recent Alerts */}
          <div className="card">
            <div className="section-label">Recent Alerts</div>
            {alerts.length === 0 ? (
              <div className="text-[12px] text-text-dim py-3">No alerts</div>
            ) : (
              <div className="space-y-2 mt-3">
                {alerts.slice(0, 10).map(a => (
                  <div key={a.id} className={`flex gap-2 items-start text-[12px] p-2 rounded ${!a.is_read ? "bg-bg-raise" : ""}`}>
                    <span>{a.severity === "error" ? "🔴" : a.severity === "warning" ? "🟡" : "🔵"}</span>
                    <span className="flex-1">{a.message}</span>
                    <span className="text-[10px] text-text-dim flex-shrink-0">{timeAgo(a.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Quick Actions */}
          <div className="card">
            <div className="section-label">Quick Actions</div>
            <div className="grid-2 gap-3 mt-3">
              <button className="btn btn-ghost card-raise" onClick={() => setTab("rankings")}>🏆 Add Keywords</button>
              <button className="btn btn-ghost card-raise" onClick={refreshBacklinks} disabled={refreshingBacklinks}>🔗 Refresh Backlinks</button>
              <button className="btn btn-ghost card-raise" onClick={() => setTab("keywords")}>🔑 Keyword Research</button>
              <button className="btn btn-ghost card-raise" onClick={runAudit} disabled={auditRunning}>🔍 Run Site Audit</button>
              <button className="btn btn-ghost card-raise" onClick={refreshRankings} disabled={refreshing}>📈 Refresh Rankings</button>
              <button className="btn btn-ghost card-raise" onClick={() => setTab("competitors")}>🎯 Add Competitor</button>
            </div>
          </div>
        </div>
      )}
      {tab === "overview" && !selectedProject && (
        <div className="empty-state">
          <div className="icon text-[48px]">🎯</div>
          <p>Add a project to get started</p>
          <button className="btn btn-primary mt-4" onClick={() => setShowAddProject(true)}>+ Add Your First Project</button>
        </div>
      )}

      {/* ═══ RANK TRACKER TAB ═══ */}
      {tab === "rankings" && (
        <div>
          <div className="card mb-16">
            <h3>Track Keywords</h3>
            <div className="flex gap-2 mt-3">
              <input
                className="flex-1"
                value={newKeyword}
                onChange={e => setNewKeyword(e.target.value)}
                placeholder="Enter keyword to track..."
                onKeyDown={e => e.key === "Enter" && addKeyword()}
              />
              <button className="btn btn-primary" onClick={addKeyword} disabled={!newKeyword.trim()}>+ Track</button>
              <button className="btn btn-ghost" onClick={refreshRankings} disabled={refreshing || !selectedProject}>
                {refreshing ? "⏳" : "🔄"} Refresh
              </button>
            </div>
          </div>
          {rankingOverview && (
            <div className="grid-4 mb-16">
              <div className="stat-card">
                <span className="value">{rankingOverview.top3 || 0}</span><div className="label">Top 3</div>
              </div>
              <div className="stat-card accent-green">
                <span className="value">{rankingOverview.improved || 0}</span><div className="label">Improved</div>
              </div>
              <div className="stat-card accent-red">
                <span className="value">{rankingOverview.dropped || 0}</span><div className="label">Dropped</div>
              </div>
              <div className="stat-card">
                <span className="value">{rankingOverview.serpFeatures || 0}</span><div className="label">SERP Features</div>
              </div>
            </div>
          )}
          {rankings.length === 0 ? (
            <div className="empty-state"><div className="icon">🏆</div><p>No keywords tracked yet</p></div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Keyword</th><th>Position</th><th>Change</th><th>SERP Features</th><th>URL</th><th></th></tr></thead>
                  <tbody>
                    {rankings.map(r => {
                      const change = r.position_change;
                      const serpFeatures = (() => { try { return JSON.parse(r.serp_features || "[]"); } catch { return []; } })();
                      return (
                        <tr key={r.id}>
                          <td className="font-semibold">{r.keyword}</td>
                          <td className="text-center"><span className={`badge badge-${r.position <= 3 ? "low" : r.position <= 10 ? "medium" : "high"}`}>{r.position > 0 ? `#${r.position}` : "—"}</span></td>
                          <td className="text-center">
                            {change !== 0 && <span className={change > 0 ? "text-green" : "text-red"}>{change > 0 ? "▲" : "▼"} {Math.abs(change)}</span>}
                          </td>
                          <td className="text-[14px]">{serpFeatures.map((f: string) => serpIcon(f)).join(" ")}</td>
                          <td className="text-[10px] text-text-dim max-w-[200px] truncate">{r.url || "—"}</td>
                          <td><button className="btn btn-sm btn-ghost" onClick={() => api(`/seo-hub/rankings/${r.id}`, { method: "DELETE" }).then(loadRankings)}>✕</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ KEYWORD RESEARCH TAB ═══ */}
      {tab === "keywords" && (
        <div>
          <div className="card mb-16">
            <h3>🔑 Keyword Research</h3>
            <small className="text-text-dim">Search volume, difficulty, CPC, related keywords, and questions</small>
            <div className="flex gap-2 mt-3">
              <input className="flex-1" value={keywordSearch} onChange={e => setKeywordSearch(e.target.value)} placeholder="e.g. react hooks tutorial" onKeyDown={e => e.key === "Enter" && researchKeyword()} />
              <button className="btn btn-primary" onClick={researchKeyword} disabled={keywordResearching || !keywordSearch.trim()}>
                {keywordResearching ? "⏳ Researching..." : "🔍 Research"}
              </button>
            </div>
          </div>

          {keywordResults && !keywordResults.error && (
            <div className="grid-3 mb-16">
              <div className="stat-card accent-purple">
                <span className="value">{keywordResults.volume?.toLocaleString() || 0}</span><div className="label">Search Volume</div>
              </div>
              <div className="stat-card accent-gold">
                <span className="value">{keywordResults.difficulty || 0}</span>
                <div className="label">Difficulty {keywordResults.difficulty < 30 ? "(Easy)" : keywordResults.difficulty < 60 ? "(Medium)" : "(Hard)"}</div>
              </div>
              <div className="stat-card accent-green">
                <span className="value">${keywordResults.cpc || 0}</span><div className="label">CPC ($)</div>
              </div>
            </div>
          )}
          {keywordResults && !keywordResults.error && (
            <div className="grid-2">
              <div className="card">
                <div className="flex justify-between items-center"><h3>Related Keywords</h3><button className="btn btn-sm btn-ghost" onClick={() => saveKeyword(keywordResults.keyword)}>💾 Save</button></div>
                <div className="mt-3">
                  {keywordResults.related?.map((k, i) => (
                    <div key={i} className="flex gap-2 items-center py-[6px] border-b border-border text-[12px]">
                      <span className="flex-1">{k}</span>
                      <button className="btn btn-sm btn-ghost text-[9px]" onClick={() => { setKeywordSearch(k); researchKeyword(); }}>Research →</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <h3>Questions (PAA)</h3>
                <div className="mt-3">
                  {keywordResults.questions?.map((q, i) => (
                    <div key={i} className="flex gap-2 py-[6px] border-b border-border text-[12px]">
                      <span>❓</span><span className="flex-1">{q}</span>
                    </div>
                  ))}
                </div>
                {keywordResults.suggestions?.length > 0 && (
                  <>
                    <h3 className="mt-4">Keyword Suggestions</h3>
                    <div className="mt-2">
                      {keywordResults.suggestions.slice(0, 10).map((s, i) => (
                        <div key={i} className="flex justify-between py-[6px] border-b border-border text-[11px]">
                          <span>{s.keyword}</span>
                          <span className="text-text-dim">{s.volume?.toLocaleString()} / KD {s.difficulty}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {savedKeywords.length > 0 && (
            <div className="card mt-16">
              <h3>💾 Saved Keywords</h3>
              <div className="table-wrap mt-3">
                <table>
                  <thead><tr><th>Keyword</th><th>Volume</th><th>KD</th><th>CPC</th><th>Last Updated</th></tr></thead>
                  <tbody>
                    {savedKeywords.map(k => (
                      <tr key={k.id}>
                        <td className="font-semibold text-xs">{k.keyword}</td>
                        <td className="text-[11px]">{k.volume?.toLocaleString()}</td>
                        <td className="text-[11px]">{k.difficulty}</td>
                        <td className="text-[11px]">${k.cpc}</td>
                        <td className="text-[10px] text-text-dim">{timeAgo(k.last_updated)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ BACKLINKS TAB ═══ */}
      {tab === "backlinks" && (
        <div>
          <div className="flex gap-3 mb-16">
            <div className="card flex-1">
              <h3>🔗 Backlink Stats</h3>
              {backlinkStats ? (
                <div className="mt-3">
                  <div className="text-[32px] font-bold" style={{ color: backlinkStats.domain_rating > 50 ? "var(--green)" : backlinkStats.domain_rating > 30 ? "var(--yellow)" : "var(--red)" }}>{backlinkStats.domain_rating || 0}</div>
                  <div className="text-[10px] text-text-dim mb-3">Domain Rating</div>
                  <div className="grid-3 gap-3 text-center mt-3">
                    <div><div className="font-bold text-[18px]">{backlinkStats.ref_domains || 0}</div><div className="text-[9px] text-text-dim">Ref. Domains</div></div>
                    <div><div className="font-bold text-[18px]">{backlinkStats.backlinks || 0}</div><div className="text-[9px] text-text-dim">Backlinks</div></div>
                    <div><div className="font-bold text-[18px]" style={{ color: "var(--green)" }}>+{backlinkStats.newBacklinks || 0}</div><div className="text-[9px] text-text-dim">New</div></div>
                  </div>
                  <div className="grid-2 gap-2 mt-3 text-[11px]">
                    <div className="flex justify-between"><span>Dofollow</span><span className="font-bold">{backlinkStats.dofollow || 0}</span></div>
                    <div className="flex justify-between"><span>Nofollow</span><span className="font-bold">{backlinkStats.nofollow || 0}</span></div>
                    <div className="flex justify-between"><span>Edu/Gov</span><span className="font-bold">{backlinkStats.edu_gov || 0}</span></div>
                  </div>
                </div>
              ) : <div className="text-[12px] text-text-dim mt-2">Add a project and refresh to see stats</div>}
            </div>
            <div className="card flex-1">
              <div className="flex justify-between"><h3>Backlink Distribution</h3><button className="btn btn-sm btn-ghost" onClick={refreshBacklinks} disabled={refreshingBacklinks}>{refreshingBacklinks ? "⏳" : "🔄"} Refresh</button></div>
              {backlinkStats && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 text-[11px] mb-2">
                    <div className="h-3 flex-1 rounded-sm overflow-hidden bg-bg-raise">
                      <div className="h-full bg-green" style={{ width: `${backlinkStats.dofollow / (backlinkStats.backlinks || 1) * 100}%` }} />
                    </div>
                    <span>Dofollow {Math.round(backlinkStats.dofollow / (backlinkStats.backlinks || 1) * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <div className="h-3 flex-1 rounded-sm overflow-hidden bg-bg-raise">
                      <div className="h-full bg-yellow" style={{ width: `${backlinkStats.nofollow / (backlinkStats.backlinks || 1) * 100}%` }} />
                    </div>
                    <span>Nofollow {Math.round(backlinkStats.nofollow / (backlinkStats.backlinks || 1) * 100)}%</span>
                  </div>
                  <div className="mt-3 text-[11px] text-text-dim">New: +{backlinkStats.newBacklinks} · Lost: -{backlinkStats.lostBacklinks}</div>
                </div>
              )}
            </div>
          </div>
          {/* Anchor Text */}
          {anchorText.length > 0 && (
            <div className="card mb-16">
              <h3>🔤 Top Anchor Texts</h3>
              <div className="table-wrap mt-3">
                <table>
                  <thead><tr><th>Anchor Text</th><th>Count</th></tr></thead>
                  <tbody>
                    {anchorText.map((a, i) => (
                      <tr key={i}><td className="text-xs">{a.anchor_text}</td><td className="text-[11px]">{a.count}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {backlinks.length === 0 && (
            <div className="empty-state"><div className="icon">🔗</div><p>No backlinks found — add a project and refresh</p></div>
          )}
        </div>
      )}

      {/* ═══ COMPETITORS TAB ═══ */}
      {tab === "competitors" && (
        <div>
          <div className="card mb-16">
            <h3>🎯 Competitor Analysis</h3>
            <div className="flex gap-2 mt-3">
              <input className="flex-1" value={newCompetitor} onChange={e => setNewCompetitor(e.target.value)} placeholder="Competitor domain (e.g. semrush.com)" onKeyDown={e => e.key === "Enter" && addCompetitor()} />
              <button className="btn btn-primary" onClick={addCompetitor} disabled={!newCompetitor.trim()}>+ Add</button>
            </div>
          </div>
          {competitors.length === 0 ? (
            <div className="empty-state"><div className="icon">🎯</div><p>No competitors added yet</p></div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Domain</th><th>Est. Traffic</th><th>Keywords</th><th>Shared Keywords</th><th>Overlap</th><th></th></tr></thead>
                  <tbody>
                    {competitors.map(c => (
                      <tr key={c.id}>
                        <td className="font-semibold text-xs">{c.competitor_domain}</td>
                        <td className="text-[11px]">{c.traffic_estimate?.toLocaleString()}</td>
                        <td className="text-[11px]">{c.keywords_count?.toLocaleString()}</td>
                        <td className="text-[11px]">{c.common_keywords}</td>
                        <td className="text-[11px]">{c.overlap_score}%</td>
                        <td><button className="btn btn-sm btn-ghost" onClick={() => deleteCompetitor(c.id)}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ SITE AUDIT TAB ═══ */}
      {tab === "audit" && (
        <div>
          <div className="flex gap-3 mb-16">
            <div className="card flex-1">
              <div className="flex justify-between"><h3>🔍 Site Audit</h3><button className="btn btn-primary" onClick={runAudit} disabled={auditRunning || !selectedProject}>{auditRunning ? "⏳ Running..." : "▶️ Run Audit"}</button></div>
              {auditSummary && (
                <div className="mt-3">
                  <div className="grid-3 text-center gap-3">
                    <div><div className="font-bold text-[20px] text-red">{auditSummary.errors || 0}</div><div className="text-[9px] text-text-dim">Errors</div></div>
                    <div><div className="font-bold text-[20px] text-yellow">{auditSummary.warnings || 0}</div><div className="text-[9px] text-text-dim">Warnings</div></div>
                    <div><div className="font-bold text-[20px]">{auditSummary.notices || 0}</div><div className="text-[9px] text-text-dim">Notices</div></div>
                  </div>
                </div>
              )}
            </div>
            <div className="card flex-1">
              <h3>Issues by Type</h3>
              {auditSummary?.byType && Object.keys(auditSummary.byType).length > 0 ? (
                <div className="mt-3">
                  {Object.entries(auditSummary.byType).map(([type, count]) => (
                    <div key={type} className="flex justify-between py-[6px] border-b border-border text-[12px]">
                      <span>{type}</span><span className="font-bold">{count as number}</span>
                    </div>
                  ))}
                </div>
              ) : <div className="text-[12px] text-text-dim mt-2">Run an audit to see issues</div>}
            </div>
          </div>
          {auditIssues.length === 0 ? (
            <div className="empty-state"><div className="icon">🔍</div><p>No audit issues found</p></div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Severity</th><th>Issue</th><th>URL</th><th>Count</th></tr></thead>
                  <tbody>
                    {auditIssues.map(i => (
                      <tr key={i.id}>
                        <td><span className={`badge badge-${i.severity === "error" ? "urgent" : i.severity === "warning" ? "medium" : "low"}`}>{i.severity}</span></td>
                        <td className="text-xs">{i.title}</td>
                        <td className="text-[10px] text-text-dim max-w-[200px] truncate">{i.url || "—"}</td>
                        <td className="text-[11px]">{i.affected_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ CONTENT TAB ═══ */}
      {tab === "content" && (
        <div>
          <div className="card mb-16">
            <h3>✍️ Content Optimizer</h3>
            <small className="text-text-dim">AI-powered content analysis and SEO recommendations</small>
            <div className="form-group mt-3">
              <label>URL to analyze</label>
              <input value={contentUrl} onChange={e => setContentUrl(e.target.value)} placeholder="https://example.com/blog-post" />
            </div>
            <div className="form-group">
              <label>Target Keyword <span className="text-[9px] text-text-dim">(optional)</span></label>
              <input value={contentKeyword} onChange={e => setContentKeyword(e.target.value)} placeholder="e.g. react hooks tutorial" />
            </div>
            <button className="btn btn-primary" onClick={analyzeContent} disabled={analyzing || !contentUrl.trim()}>
              {analyzing ? "⏳ Analyzing..." : "✨ Analyze Content"}
            </button>
          </div>
          {contentAnalysis && !contentAnalysis.error && (
            <div className="grid-3 mb-16">
              <div className="stat-card" style={{ borderTop: `3px solid ${contentAnalysis.score > 70 ? "var(--green)" : contentAnalysis.score > 50 ? "var(--yellow)" : "var(--red)"}` }}>
                <span className="value">{contentAnalysis.score || 0}</span><div className="label">Content Score</div>
              </div>
              <div className="stat-card">
                <span className="value">{contentAnalysis.wordCount || 0}</span><div className="label">Words</div>
              </div>
              <div className="stat-card">
                <span className="value">{contentAnalysis.readabilityScore || 0}</span><div className="label">Readability</div>
              </div>
            </div>
          )}
          {contentAnalysis?.recommendations?.length > 0 && (
            <div className="card">
              <h3>💡 Recommendations</h3>
              <div className="mt-3 space-y-2">
                {contentAnalysis.recommendations.map((r: string, i: number) => (
                  <div key={i} className="flex gap-2 text-[12px] p-2 card-raise rounded">
                    <span>💡</span><span>{r}</span>
                  </div>
                ))}
              </div>
              {contentAnalysis.keywordsFound?.length > 0 && (
                <>
                  <h3 className="mt-4">✅ Keywords Found</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {contentAnalysis.keywordsFound.map((k: string, i: number) => (
                      <span key={i} className="badge badge-low text-[10px]">{k}</span>
                    ))}
                  </div>
                </>
              )}
              {contentAnalysis.keywordsMissing?.length > 0 && (
                <>
                  <h3 className="mt-4">❌ Keywords Missing</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {contentAnalysis.keywordsMissing.map((k: string, i: number) => (
                      <span key={i} className="badge badge-urgent text-[10px]">{k}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ REPORTS TAB ═══ */}
      {tab === "reports" && (
        <div>
          <div className="flex justify-between items-center mb-16">
            <h3>📄 Reports</h3>
            <button className="btn btn-primary" onClick={() => setShowNewReport(true)}>+ Create Report</button>
          </div>
          {reports.length === 0 ? (
            <div className="empty-state"><div className="icon">📄</div><p>No reports yet</p></div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Name</th><th>Type</th><th>Format</th><th>Scheduled</th><th>Last Sent</th><th></th></tr></thead>
                  <tbody>
                    {reports.map(r => (
                      <tr key={r.id}>
                        <td className="font-semibold text-xs">{r.name}</td>
                        <td className="text-[11px]">{r.type}</td>
                        <td className="text-[11px]">{r.format?.toUpperCase()}</td>
                        <td><span className={`badge badge-${r.scheduled ? "low" : "medium"}`}>{r.scheduled ? "Yes" : "Manual"}</span></td>
                        <td className="text-[10px] text-text-dim">{r.last_sent ? formatDate(r.last_sent) : "Never"}</td>
                        <td><button className="btn btn-sm btn-ghost" onClick={() => api(`/seo-hub/reports/${r.id}`, { method: "DELETE" }).then(loadReports)}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Project Modal */}
      {showAddProject && (
        <div className="modal-overlay" onClick={() => setShowAddProject(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>🎯 Add SEO Project</h2>
            <div className="form-group">
              <label>Domain</label>
              <input value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="example.com" onKeyDown={e => e.key === "Enter" && addProject()} autoFocus />
              <small className="text-[10px] text-text-dim mt-1">Enter the domain without https:// or www.</small>
            </div>
            <div className="form-actions">
              <button className="btn" onClick={() => setShowAddProject(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addProject} disabled={!newDomain.trim()}>+ Add Project</button>
            </div>
          </div>
        </div>
      )}

      {/* New Report Modal */}
      {showNewReport && (
        <div className="modal-overlay" onClick={() => setShowNewReport(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>📄 Create Report</h2>
            <div className="form-group"><label>Report Name</label><input value={reportForm.name} onChange={e => setReportForm({ ...reportForm, name: e.target.value })} placeholder="Monthly SEO Report" /></div>
            <div className="form-group">
              <label>Type</label>
              <select value={reportForm.type} onChange={e => setReportForm({ ...reportForm, type: e.target.value })}>
                <option value="full">Full SEO Report</option>
                <option value="rankings">Rankings Only</option>
                <option value="backlinks">Backlinks Only</option>
                <option value="audit">Site Audit Only</option>
              </select>
            </div>
            <div className="form-group">
              <label>Format</label>
              <select value={reportForm.format} onChange={e => setReportForm({ ...reportForm, format: e.target.value })}>
                <option value="pdf">PDF</option>
                <option value="html">HTML</option>
                <option value="csv">CSV</option>
              </select>
            </div>
            <div className="form-actions">
              <button className="btn" onClick={() => setShowNewReport(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createReport} disabled={!reportForm.name.trim()}>Create Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}