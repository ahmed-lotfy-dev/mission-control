import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { api, formatDate } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

// ── Types ──
interface CrawlSession {
  id: number;
  site_url: string;
  status: string;
  pages_crawled: number;
  total_pages: number;
  created_at: string;
  started_at: string;
  finished_at: string;
}

interface OverviewData {
  score: number;
  totalPages: number;
  avgResponseTime: number;
  issues: { critical: number; high: number; medium: number; low: number; notices: number; passed: number; total: number };
  statusCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  topIssues: any[];
}

interface Issue {
  id: number;
  page_url: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  recommendation: string;
  status: string;
  is_ignored: number;
}

type TabKey = "overview" | "issues" | "content" | "technical" | "links" | "redirects" | "hreflang" | "social" | "images" | "performance" | "history";

const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: "overview", label: "Overview", icon: "🏠" },
  { key: "issues", label: "Issues", icon: "🚨" },
  { key: "content", label: "Content", icon: "📝" },
  { key: "technical", label: "Technical", icon: "⚙️" },
  { key: "links", label: "Links", icon: "🔗" },
  { key: "redirects", label: "Redirects", icon: "↪️" },
  { key: "hreflang", label: "Hreflang", icon: "🌐" },
  { key: "social", label: "Social", icon: "📣" },
  { key: "images", label: "Images", icon: "🖼️" },
  { key: "performance", label: "Performance", icon: "⚡" },
  { key: "history", label: "History", icon: "📋" },
];

// ── Helpers ──
function SeverityBadge({ severity }: { severity: string }) {
  const cls = severity === "critical" ? "badge-urgent" : severity === "high" ? "badge-high" : severity === "medium" ? "badge-medium" : severity === "low" ? "badge-low" : "badge-low";
  return <span className={`badge ${cls} text-[10px] uppercase font-bold py-[1px] px-[6px] rounded`}>{severity}</span>;
}

function ScoreRing({ score, size = 100 }: { score: number; size?: number }) {
  const color = score >= 70 ? "var(--green)" : score >= 40 ? "var(--yellow)" : "var(--red)";
  const radius = 45;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--bg-deep)" strokeWidth="8" />
        <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="8" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 0.5s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[24px] font-bold text-text-bright">{score}</span>
        <span className="text-[9px] text-text-dim">/100</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: string | number; color?: string; icon?: string }) {
  return (
    <div className="py-[10px] px-3 rounded-md bg-bg-deep border border-border">
      <div className="text-[10px] text-text-dim uppercase tracking-wider">{icon} {label}</div>
      <div className="text-lg font-bold mt-[2px]" style={{ color: color || "var(--text-bright)" }}>{value}</div>
    </div>
  );
}

// ── Main Component ──
export default function Seo() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [crawlUrl, setCrawlUrl] = useState("https://ahmedlotfy.site");
  const [crawling, setCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState<{ done: number; total: number; currentUrl: string; status: string } | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Filters
  const [issueFilter, setIssueFilter] = useState({ severity: "", category: "", search: "" });
  const [contentFilter, setContentFilter] = useState("");
  const [psiUrl, setPsiUrl] = useState("");
  const [psiLoading, setPsiLoading] = useState(false);
  const [psiResult, setPsiResult] = useState<any>(null);

  // ── Queries ──
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<CrawlSession[]>({
    queryKey: ["seo-audit", "sessions"],
    queryFn: () => api("/seo-audit/sessions"),
    refetchInterval: crawling ? 3000 : false,
  });

  // Auto-select latest completed session
  useEffect(() => {
    if (!selectedSession && sessions.length > 0) {
      const latest = sessions.find(s => s.status === "completed") || sessions[0];
      setSelectedSession(latest.id);
    }
  }, [sessions, selectedSession]);

  const sid = selectedSession;

  const { data: overview } = useQuery<OverviewData>({
    queryKey: ["seo-audit", "overview", sid],
    queryFn: () => api(`/seo-audit/overview/${sid}`),
    enabled: !!sid,
  });

  const { data: issues = [], isLoading: issuesLoading } = useQuery<any[]>({
    queryKey: ["seo-audit", "issues", sid, issueFilter],
    queryFn: () => api(`/seo-audit/issues/${sid}?severity=${issueFilter.severity}&category=${issueFilter.category}&search=${issueFilter.search}`),
    enabled: !!sid,
  });

  const { data: contentData = [], isLoading: contentLoading } = useQuery<any[]>({
    queryKey: ["seo-audit", "content", sid, contentFilter],
    queryFn: () => api(`/seo-audit/content/${sid}?filter=${contentFilter}`),
    enabled: !!sid,
  });

  const { data: technicalData, isLoading: technicalLoading } = useQuery<any>({
    queryKey: ["seo-audit", "technical", sid],
    queryFn: () => api(`/seo-audit/technical/${sid}`),
    enabled: !!sid,
  });

  const { data: linksData, isLoading: linksLoading } = useQuery<any>({
    queryKey: ["seo-audit", "links", sid],
    queryFn: () => api(`/seo-audit/links/${sid}`),
    enabled: !!sid,
  });

  const { data: redirects = [], isLoading: redirectsLoading } = useQuery<any[]>({
    queryKey: ["seo-audit", "redirects", sid],
    queryFn: () => api(`/seo-audit/redirects/${sid}`),
    enabled: !!sid,
  });

  const { data: hreflangData, isLoading: hreflangLoading } = useQuery<any>({
    queryKey: ["seo-audit", "hreflang", sid],
    queryFn: () => api(`/seo-audit/hreflang/${sid}`),
    enabled: !!sid,
  });

  const { data: socialData, isLoading: socialLoading } = useQuery<any>({
    queryKey: ["seo-audit", "social", sid],
    queryFn: () => api(`/seo-audit/social/${sid}`),
    enabled: !!sid,
  });

  const { data: imagesData, isLoading: imagesLoading } = useQuery<any>({
    queryKey: ["seo-audit", "images", sid],
    queryFn: () => api(`/seo-audit/images/${sid}`),
    enabled: !!sid,
  });

  const { data: perfData, isLoading: perfLoading } = useQuery<any>({
    queryKey: ["seo-audit", "performance", sid],
    queryFn: () => api(`/seo-audit/performance/${sid}`),
    enabled: !!sid,
  });

  // ── Mutations ──
  const startCrawlMut = useMutation({
    mutationFn: () => api("/seo-audit/crawl", { method: "POST", body: JSON.stringify({ siteUrl: crawlUrl }) }),
    onSuccess: (data) => {
      setCrawling(true);
      setSelectedSession(data.sessionId);
      qc.invalidateQueries({ queryKey: ["seo-audit", "sessions"] });
    },
  });

  const deleteSessionMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await api(`/seo-audit/sessions/${id}`, { method: "DELETE" });
      return res;
    },
    onMutate: (id) => {
      toast.loading("Deleting crawl session...", { id: `delete-${id}` });
    },
    onSuccess: (_, id) => {
      toast.success(`Session #${id} deleted`, { id: `delete-${id}` });
      qc.invalidateQueries({ queryKey: ["seo-audit", "sessions"] });
      setSelectedSession(null);
    },
    onError: (err: any, id) => {
      toast.error(`Failed to delete session #${id}`, {
        id: `delete-${id}`,
        description: err?.message || "Server error — check console for details",
      });
    },
  });

  const toggleIssueMut = useMutation({
    mutationFn: ({ id, isIgnored }: { id: number; isIgnored: boolean }) =>
      api(`/seo-audit/issues/${id}`, { method: "PATCH", body: JSON.stringify({ is_ignored: isIgnored }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["seo-audit", "issues"] }),
  });

  // Poll crawl progress
  useEffect(() => {
    if (!crawling || !sid) return;
    const interval = setInterval(async () => {
      try {
        const prog = await api(`/seo-audit/crawl/${sid}/progress`);
        setCrawlProgress(prog);
        if (prog.status === "completed" || prog.status === "error") {
          setCrawling(false);
          clearInterval(interval);
          qc.invalidateQueries({ queryKey: ["seo-audit"] });
        }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [crawling, sid, qc]);

  // ── PSI on-demand ──
  const runPsi = async () => {
    if (!psiUrl.trim()) return;
    setPsiLoading(true);
    setPsiResult(null);
    try {
      const result = await api("/seo-audit/psi", { method: "POST", body: JSON.stringify({ url: psiUrl.trim() }) });
      setPsiResult(result);
    } catch (e: any) {
      alert("PSI error: " + e.message);
    } finally {
      setPsiLoading(false);
    }
  };

  // ── Export ──
  const exportCsv = (type: string) => {
    if (!sid) return;
    window.open(`/api/seo-audit/export/${sid}?type=${type}`, "_blank");
  };

  // ── Render helpers ──
  const isLoading = issuesLoading || contentLoading || technicalLoading || linksLoading || redirectsLoading || hreflangLoading || socialLoading || imagesLoading || perfLoading;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>🔍 SEO Audit Dashboard</h1>
          <div className="subtitle">Full-scope site audit — crawl, analyze, fix & monitor</div>
        </div>
      </div>

      {/* ── Crawl Control Panel ── */}
      <div className="card mb-24">
        <div className="flex-between mb-3">
          <h3>🕷️ Site Crawler</h3>
          {sessions.length > 0 && (
            <select value={sid || ""} onChange={(e) => setSelectedSession(Number(e.target.value))} className="max-w-[250px] text-xs py-[4px] px-2 bg-bg-deep border border-border rounded">
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  #{s.id} — {s.site_url} ({s.status}) — {s.pages_crawled} pages
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-sm">
          <Input value={crawlUrl} onChange={(e) => setCrawlUrl(e.target.value)} placeholder="https://your-site.com" className="flex-1" />
          <Button onClick={() => startCrawlMut.mutate()} disabled={crawling || startCrawlMut.isPending}>
            {crawling ? "⏳ Crawling..." : "🕷️ Start Crawl"}
          </Button>
        </div>
        {crawlProgress && crawling && (
          <div className="mt-3">
            <div className="flex-between text-xs text-text-dim mb-1">
              <span>{crawlProgress.currentUrl || "Initializing..."}</span>
              <span>{crawlProgress.done} / {crawlProgress.total}</span>
            </div>
            <div className="h-[6px] rounded-sm bg-bg-deep overflow-hidden">
              <div className="h-full bg-accent rounded-sm transition-all duration-500" style={{ width: `${crawlProgress.total > 0 ? (crawlProgress.done / crawlProgress.total) * 100 : 5}%` }} />
            </div>
          </div>
        )}
        {!crawlProgress && crawling && (
          <div className="loading-state p-3 mt-3"><div className="loading-spinner" />Crawl in progress...</div>
        )}
        {sid && overview && (
          <div className="mt-2 text-[11px] text-text-dim">
            Session #{sid} — {overview.totalPages} pages — Score: {overview.score}/100
          </div>
        )}
      </div>

      {/* ── PSI On-Demand ── */}
      <div className="card mb-24">
        <h3>⚡ PageSpeed Insights (On-Demand)</h3>
        <div className="flex gap-sm mt-3">
          <Input value={psiUrl} onChange={(e) => setPsiUrl(e.target.value)} placeholder="Enter URL to analyze..." className="flex-1" onKeyDown={(e) => e.key === "Enter" && runPsi()} />
          <Button onClick={runPsi} disabled={psiLoading}>{psiLoading ? "⏳ Analyzing..." : "⚡ Analyze"}</Button>
        </div>
        {psiResult && !psiResult.error && (
          <div className="grid grid-cols-4 gap-3 mt-4">
            <StatCard label="Performance" value={psiResult.performance} color={psiResult.performance >= 70 ? "var(--green)" : psiResult.performance >= 40 ? "var(--yellow)" : "var(--red)"} />
            <StatCard label="Accessibility" value={psiResult.accessibility} color={psiResult.accessibility >= 70 ? "var(--green)" : "var(--yellow)"} />
            <StatCard label="Best Practices" value={psiResult.bestPractices} color={psiResult.bestPractices >= 70 ? "var(--green)" : "var(--yellow)"} />
            <StatCard label="SEO" value={psiResult.seo} color={psiResult.seo >= 70 ? "var(--green)" : "var(--yellow)"} />
            <StatCard label="LCP" value={`${psiResult.lcp}s`} color={psiResult.lcp <= 2.5 ? "var(--green)" : "var(--red)"} />
            <StatCard label="INP" value={`${psiResult.inp}ms`} color={psiResult.inp <= 200 ? "var(--green)" : "var(--red)"} />
            <StatCard label="CLS" value={psiResult.cls} color={psiResult.cls <= 0.1 ? "var(--green)" : "var(--red)"} />
            <StatCard label="TTFB" value={`${psiResult.ttfb}ms`} color={psiResult.ttfb <= 800 ? "var(--green)" : "var(--red)"} />
          </div>
        )}
      </div>

      {/* ── Tab Bar ── */}
      <div className="card filter-bar mb-24 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {TABS.map((t) => (
            <button key={t.key} className={`filter-pill${tab === t.key ? " active" : ""}`} onClick={() => setTab(t.key)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading State ── */}
      {isLoading && !overview && (
        <div className="loading-state p-10"><div className="loading-spinner" />Loading audit data...</div>
      )}

      {/* ══════ TAB: OVERVIEW ══════ */}
      {tab === "overview" && overview && (
        <div>
          <div className="grid-2 mb-24">
            <div className="flex-between card items-center py-5 px-6">
              <div>
                <h3>SEO Health Score</h3>
                <div className="subtitle max-w-[200px] mt-1">{oversightsText(overview)}</div>
              </div>
              <ScoreRing score={overview.score} />
            </div>
            <div className="card">
              <h3>Issue Summary</h3>
              <div className="flex gap-3 mt-3">
                {[
                  { label: "Critical", value: overview.issues.critical, color: "var(--red)", bg: "oklch(0.50 0.11 25 / 0.12)" },
                  { label: "High", value: overview.issues.high, color: "var(--orange)", bg: "oklch(0.60 0.10 50 / 0.1)" },
                  { label: "Medium", value: overview.issues.medium, color: "var(--yellow)", bg: "oklch(0.60 0.10 80 / 0.1)" },
                  { label: "Low", value: overview.issues.low, color: "var(--accent)", bg: "oklch(0.60 0.105 70 / 0.08)" },
                ].map((i) => (
                  <div key={i.label} className="flex-1 p-3 rounded-lg text-center" style={{ background: i.bg, border: `1px solid ${i.color}20` }}>
                    <div className="text-[22px] font-bold" style={{ color: i.color }}>{i.value}</div>
                    <div className="text-[10px] text-text-dim">{i.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid-3 mb-24">
            <StatCard label="Pages Crawled" value={overview.totalPages} icon="📄" />
            <StatCard label="Avg Response Time" value={`${overview.avgResponseTime}ms`} icon="⏱️" color={overview.avgResponseTime <= 1000 ? "var(--green)" : "var(--yellow)"} />
            <StatCard label="Total Issues" value={overview.issues.total} icon="🚨" />
          </div>

          <div className="grid-2 mb-24">
            <div className="card">
              <h3>Status Code Distribution</h3>
              <div className="mt-3">
                {Object.entries(overview.statusCounts).filter(([, v]) => v > 0).map(([k, v]) => {
                  const colors: Record<string, string> = { "2xx": "var(--green)", "3xx": "var(--yellow)", "4xx": "var(--orange)", "5xx": "var(--red)" };
                  const pct = overview.totalPages > 0 ? Math.round((v / overview.totalPages) * 100) : 0;
                  return (
                    <div key={k} className="flex gap-2 items-center mb-2">
                      <span className="text-xs text-text-dim w-[50px]">{k}</span>
                      <div className="flex-1 h-[6px] rounded-sm bg-bg-deep overflow-hidden">
                        <div className="h-full rounded-sm" style={{ width: `${pct}%`, background: colors[k] || "var(--text-dim)" }} />
                      </div>
                      <span className="text-xs font-semibold w-[40px] text-right">{v} <span className="text-text-dim">({pct}%)</span></span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <h3>Issues by Category</h3>
              <div className="mt-3">
                {Object.entries(overview.categoryCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                  <div key={k} className="flex gap-2 items-center mb-2">
                    <span className="text-xs text-text-dim capitalize w-[90px]">{k}</span>
                    <div className="flex-1 h-[6px] rounded-sm bg-bg-deep overflow-hidden">
                      <div className="h-full rounded-sm bg-accent" style={{ width: `${Math.min(100, (v / overview.issues.total) * 100)}%` }} />
                    </div>
                    <span className="text-xs font-semibold w-[30px] text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Issues */}
          <div className="card">
            <h3>Top Issues</h3>
            {overview.topIssues.length > 0 ? (
              <div className="table-wrap mt-3">
                <table>
                  <thead><tr><th>Issue</th><th>Severity</th><th>URL</th><th>Category</th></tr></thead>
                  <tbody>
                    {overview.topIssues.map((issue: any, i: number) => (
                      <tr key={i} className="cursor-pointer" onClick={() => { setTab("issues"); setIssueFilter(f => ({ ...f, search: issue.title })); }}>
                        <td className="font-medium text-[12px]">{issue.title}</td>
                        <td><SeverityBadge severity={issue.severity} /></td>
                        <td className="text-xs text-text-dim max-w-[250px] truncate">{issue.page_url}</td>
                        <td className="text-[10px] text-text-dim capitalize">{issue.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="empty-state p-5"><p>No issues found! 🎉</p></div>}
          </div>
        </div>
      )}

      {/* ══════ TAB: ISSUES ══════ */}
      {tab === "issues" && sid && (
        <div>
          <div className="card mb-16">
            <div className="flex gap-sm flex-wrap">
              <select value={issueFilter.severity} onChange={(e) => setIssueFilter(f => ({ ...f, severity: e.target.value }))} className="text-xs py-[4px] px-2 bg-bg-deep border border-border rounded">
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select value={issueFilter.category} onChange={(e) => setIssueFilter(f => ({ ...f, category: e.target.value }))} className="text-xs py-[4px] px-2 bg-bg-deep border border-border rounded">
                <option value="">All Categories</option>
                <option value="content">Content</option>
                <option value="technical">Technical</option>
                <option value="links">Links</option>
                <option value="redirects">Redirects</option>
                <option value="social">Social</option>
                <option value="hreflang">Hreflang</option>
                <option value="sitemap">Sitemap</option>
                <option value="images">Images</option>
                <option value="performance">Performance</option>
              </select>
              <Input value={issueFilter.search} onChange={(e) => setIssueFilter(f => ({ ...f, search: e.target.value }))} placeholder="Search issues..." className="max-w-[200px] h-8 text-xs" />
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => exportCsv("issues")}>📥 Export CSV</Button>
            </div>
          </div>

          <div className="card">
            <h3>All Issues ({issues.length})</h3>
            {issuesLoading ? <div className="loading-state p-5"><div className="loading-spinner" /></div> : issues.length > 0 ? (
              <div className="table-wrap mt-3">
                <table>
                  <thead><tr><th>Severity</th><th>Category</th><th>Issue</th><th>URL</th><th>Recommendation</th><th>Actions</th></tr></thead>
                  <tbody>
                    {issues.map((issue: any) => (
                      <tr key={issue.id}>
                        <td><SeverityBadge severity={issue.severity} /></td>
                        <td className="text-[10px] text-text-dim capitalize">{issue.category}</td>
                        <td className="font-medium text-[12px]">{issue.title}</td>
                        <td className="text-xs text-text-dim max-w-[200px] truncate">{issue.page_url}</td>
                        <td className="text-[11px] text-text-dim max-w-[250px] truncate">{issue.recommendation}</td>
                        <td>
                          <div className="flex gap-[4px]">
                            <Button variant="ghost" size="sm" onClick={() => toggleIssueMut.mutate({ id: issue.id, isIgnored: !issue.is_ignored })}>
                              {issue.is_ignored ? "👁️" : "🚫"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="empty-state p-5"><p>No issues match your filters. 🎉</p></div>}
          </div>
        </div>
      )}

      {/* ══════ TAB: CONTENT ══════ */}
      {tab === "content" && sid && (
        <div>
          <div className="card mb-16">
            <div className="flex gap-sm flex-wrap">
              <select value={contentFilter} onChange={(e) => setContentFilter(e.target.value)} className="text-xs py-[4px] px-2 bg-bg-deep border border-border rounded">
                <option value="">All Pages</option>
                <option value="missing-title">Title Issues</option>
                <option value="missing-meta">Meta Desc Issues</option>
                <option value="thin-content">Thin Content</option>
                <option value="missing-h1">H1 Issues</option>
              </select>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => exportCsv("pages")}>📥 Export CSV</Button>
            </div>
          </div>
          <div className="card">
            <h3>Content Quality ({contentData.length} pages)</h3>
            {contentLoading ? <div className="loading-state p-5"><div className="loading-spinner" /></div> : contentData.length > 0 ? (
              <div className="table-wrap mt-3">
                <table>
                  <thead><tr><th>URL</th><th>Title</th><th>Title Len</th><th>Meta Desc</th><th>Desc Len</th><th>H1</th><th>Words</th></tr></thead>
                  <tbody>
                    {contentData.map((p: any) => (
                      <tr key={p.id}>
                        <td className="text-xs max-w-[200px] truncate font-medium">{p.url}</td>
                        <td className="text-[12px] max-w-[200px] truncate" title={p.title}>{p.title || <span className="text-red">Missing</span>}</td>
                        <td className="text-xs">{p.title_length > 0 ? <span className={p.title_length >= 20 && p.title_length <= 70 ? "text-green" : "text-red"}>{p.title_length}</span> : "—"}</td>
                        <td className="text-[11px] max-w-[200px] truncate" title={p.meta_description}>{p.meta_description || <span className="text-red">Missing</span>}</td>
                        <td className="text-xs">{p.meta_description_length > 0 ? <span className={p.meta_description_length >= 70 && p.meta_description_length <= 170 ? "text-green" : "text-yellow"}>{p.meta_description_length}</span> : "—"}</td>
                        <td className="text-[11px] max-w-[150px] truncate">{p.h1 || <span className="text-red">Missing</span>}</td>
                        <td className="text-xs">{p.word_count < 300 ? <span className="text-yellow">{p.word_count}</span> : p.word_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="empty-state p-5"><p>No content data. Run a crawl first.</p></div>}
          </div>
        </div>
      )}

      {/* ══════ TAB: TECHNICAL ══════ */}
      {tab === "technical" && sid && (
        <div>
          {technicalLoading ? <div className="loading-state p-5"><div className="loading-spinner" /></div> : technicalData && (
            <>
              <div className="grid-3 mb-24">
                <StatCard label="Noindex Pages" value={technicalData.noindexPages?.length || 0} color="var(--yellow)" />
                <StatCard label="Missing Canonical" value={technicalData.missingCanonical?.length || 0} color="var(--orange)" />
                <StatCard label="Error Pages (4xx/5xx)" value={technicalData.errorPages?.length || 0} color="var(--red)" />
                <StatCard label="Missing Viewport" value={technicalData.missingViewport?.length || 0} color="var(--yellow)" />
                <StatCard label="Missing Lang" value={technicalData.missingLang?.length || 0} color="var(--yellow)" />
                <StatCard label="No Structured Data" value={technicalData.noStructuredData?.length || 0} color="var(--text-dim)" />
              </div>

              {technicalData.noindexPages?.length > 0 && <SectionTable title="🚫 Noindex Pages" data={technicalData.noindexPages} columns={["url", "title"]} />}
              {technicalData.missingCanonical?.length > 0 && <SectionTable title="🔗 Missing Canonical" data={technicalData.missingCanonical} columns={["url", "title"]} />}
              {technicalData.errorPages?.length > 0 && <SectionTable title="❌ Error Pages" data={technicalData.errorPages} columns={["url", "http_status", "title"]} />}
              {technicalData.missingViewport?.length > 0 && <SectionTable title="📱 Missing Viewport" data={technicalData.missingViewport} columns={["url"]} />}
              {technicalData.nonSelfCanonical?.length > 0 && <SectionTable title="🔀 Canonical Points Elsewhere" data={technicalData.nonSelfCanonical} columns={["url", "canonical", "title"]} />}
            </>
          )}
        </div>
      )}

      {/* ══════ TAB: LINKS ══════ */}
      {tab === "links" && sid && (
        <div>
          {linksLoading ? <div className="loading-state p-5"><div className="loading-spinner" /></div> : linksData && (
            <>
              <div className="grid-4 mb-24">
                <StatCard label="Total Links" value={linksData.totalLinks || 0} />
                <StatCard label="Internal" value={linksData.internalLinks || 0} color="var(--accent)" />
                <StatCard label="External" value={linksData.externalLinks || 0} color="var(--purple)" />
                <StatCard label="Broken" value={linksData.brokenLinks || 0} color="var(--red)" />
                <StatCard label="Orphan Pages" value={linksData.orphanPages?.length || 0} color="var(--yellow)" />
                <StatCard label="Nofollow Only" value={linksData.nofollowOnlyPages?.length || 0} color="var(--text-dim)" />
                <StatCard label="Single Dofollow" value={linksData.singleDofollowPages?.length || 0} color="var(--text-dim)" />
              </div>

              {linksData.brokenInternal > 0 && (
                <div className="card mb-16">
                  <h3>🔴 Broken Internal Links</h3>
                  <p className="text-xs text-text-dim mb-2">{linksData.brokenInternal} broken links</p>
                </div>
              )}

              {linksData.orphanPages?.length > 0 && <SectionTable title="🏝️ Orphan Pages" data={linksData.orphanPages} columns={["url"]} />}

              <div className="card mb-16">
                <h3>🏆 Top Linked Pages</h3>
                <div className="mt-2">
                  {(linksData.topLinkedPages || []).slice(0, 15).map((p: any, i: number) => (
                    <div key={i} className="flex-between py-[6px] border-b border-border/50 text-xs">
                      <span className="truncate max-w-[70%]">{p.url}</span>
                      <span className="font-semibold text-accent">{p.incomingLinks} links</span>
                    </div>
                  ))}
                </div>
              </div>

              {linksData.overOptimizedAnchors?.length > 0 && (
                <div className="card">
                  <h3>⚠️ Over-Optimized Anchors</h3>
                  <div className="mt-2">
                    {linksData.overOptimizedAnchors.map((a: any, i: number) => (
                      <div key={i} className="flex-between py-[4px] text-xs">
                        <span className="truncate max-w-[70%]">"{a.text}"</span>
                        <span className="text-yellow font-semibold">{a.count}×</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════ TAB: REDIRECTS ══════ */}
      {tab === "redirects" && sid && (
        <div>
          {redirectsLoading ? <div className="loading-state p-5"><div className="loading-spinner" /></div> : redirects.length > 0 ? (
            <div className="card">
              <h3>Redirect Chains ({redirects.length})</h3>
              <div className="mt-3 flex flex-col gap-3">
                {redirects.map((rd: any, i: number) => {
                  const chain = typeof rd.chain === "string" ? JSON.parse(rd.chain) : rd.chain;
                  return (
                    <div key={i} className="p-3 rounded-md bg-bg-deep border border-border">
                      <div className="flex-between mb-2">
                        <span className="text-[10px] text-text-dim">Chain #{i + 1}</span>
                        <div className="flex gap-2">
                          {rd.is_loop ? <SeverityBadge severity="critical" /> : rd.chain_length > 2 ? <SeverityBadge severity="medium" /> : <span className="badge badge-low text-[10px]">OK</span>}
                          <span className="text-[10px] text-text-dim">{rd.chain_length} hops</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 text-[11px]">
                        {chain.map((c: any, j: number) => (
                          <span key={j} className="flex items-center gap-1">
                            <span className="px-2 py-[2px] rounded bg-bg-base border border-border font-mono text-[10px] truncate max-w-[200px]">{c.url}</span>
                            <span className="text-[10px] text-text-dim">({c.status})</span>
                            {j < chain.length - 1 && <span className="text-accent mx-1">→</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : <div className="empty-state p-5 card"><p>No redirect chains detected.</p></div>}
        </div>
      )}

      {/* ══════ TAB: HREFLANG ══════ */}
      {tab === "hreflang" && sid && (
        <div>
          {hreflangLoading ? <div className="loading-state p-5"><div className="loading-spinner" /></div> : hreflangData && (
            <>
              {hreflangData.issues?.length > 0 && (
                <div className="card mb-16">
                  <h3>⚠️ Hreflang Issues ({hreflangData.issues.length})</h3>
                  <div className="table-wrap mt-2">
                    <table>
                      <thead><tr><th>Page</th><th>Issue</th></tr></thead>
                      <tbody>
                        {hreflangData.issues.map((iss: any, i: number) => (
                          <tr key={i}>
                            <td className="text-xs max-w-[300px] truncate">{iss.page_url}</td>
                            <td className="text-xs text-yellow">{iss.issue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {hreflangData.hreflangs?.length > 0 && (
                <div className="card">
                  <h3>Hreflang Annotations ({hreflangData.hreflangs.length})</h3>
                  <div className="table-wrap mt-2">
                    <table>
                      <thead><tr><th>Page</th><th>Lang</th><th>Target</th><th>Self Ref</th></tr></thead>
                      <tbody>
                        {hreflangData.hreflangs.map((h: any, i: number) => (
                          <tr key={i}>
                            <td className="text-xs max-w-[250px] truncate">{h.page_url}</td>
                            <td><span className="badge badge-low text-[10px]">{h.hreflang_value}</span></td>
                            <td className="text-[11px] max-w-[250px] truncate font-mono">{h.hreflang_url}</td>
                            <td className="text-xs">{h.is_self_reference ? "✅" : "❌"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════ TAB: SOCIAL ══════ */}
      {tab === "social" && sid && (
        <div>
          {socialLoading ? <div className="loading-state p-5"><div className="loading-spinner" /></div> : socialData && (
            <>
              <div className="grid-4 mb-24">
                <StatCard label="Missing og:title" value={socialData.missingOgTitle?.length || 0} color="var(--yellow)" />
                <StatCard label="Missing og:desc" value={socialData.missingOgDesc?.length || 0} color="var(--yellow)" />
                <StatCard label="Missing og:image" value={socialData.missingOgImage?.length || 0} color="var(--yellow)" />
                <StatCard label="Missing tw:card" value={socialData.missingTwCard?.length || 0} color="var(--purple)" />
              </div>

              {socialData.missingOgTitle?.length > 0 && <SectionTable title="📣 Missing og:title" data={socialData.missingOgTitle} columns={["url"]} />}
              {socialData.missingOgImage?.length > 0 && <SectionTable title="🖼️ Missing og:image" data={socialData.missingOgImage} columns={["url"]} />}
              {socialData.missingTwCard?.length > 0 && <SectionTable title="🐦 Missing twitter:card" data={socialData.missingTwCard} columns={["url"]} />}

              {/* Social Preview Cards */}
              {socialData.allPages?.length > 0 && (
                <div className="card">
                  <h3>Social Preview Samples</h3>
                  <div className="grid-2 mt-3 gap-4">
                    {socialData.allPages.slice(0, 3).map((p: any, i: number) => (
                      <div key={i} className="rounded-lg border border-border overflow-hidden">
                        {p.og_image && <div className="h-[120px] bg-bg-deep flex items-center justify-center text-4xl">🖼️</div>}
                        <div className="p-3">
                          <div className="text-[10px] text-text-dim uppercase">{p.url}</div>
                          <div className="text-sm font-semibold mt-1">{p.og_title || p.twitter_title || "No OG Title"}</div>
                          <div className="text-xs text-text-dim mt-1 line-clamp-2">{p.og_description || p.twitter_description || "No description"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════ TAB: IMAGES ══════ */}
      {tab === "images" && sid && (
        <div>
          {imagesLoading ? <div className="loading-state p-5"><div className="loading-spinner" /></div> : imagesData && (
            <>
              <div className="grid-3 mb-24">
                <StatCard label="Total Images" value={imagesData.totalImages || 0} />
                <StatCard label="Missing Alt" value={imagesData.missingAlt?.length || 0} color="var(--yellow)" />
                <StatCard label="Not Lazy Loaded" value={imagesData.notLazy?.length || 0} color="var(--text-dim)" />
                <StatCard label="Broken" value={imagesData.broken?.length || 0} color="var(--red)" />
                <StatCard label="Large (>200KB)" value={imagesData.largeImages?.length || 0} color="var(--orange)" />
              </div>

              {imagesData.missingAlt?.length > 0 && (
                <div className="card">
                  <h3>🖼️ Images Missing Alt Text ({imagesData.missingAlt.length})</h3>
                  <div className="table-wrap mt-2">
                    <table>
                      <thead><tr><th>Image URL</th><th>Page</th></tr></thead>
                      <tbody>
                        {imagesData.missingAlt.slice(0, 50).map((img: any, i: number) => (
                          <tr key={i}>
                            <td className="text-[11px] max-w-[300px] truncate font-mono">{img.image_url}</td>
                            <td className="text-xs max-w-[200px] truncate">{img.page_url}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {imagesData.missingAlt.length > 50 && <p className="text-xs text-text-dim p-2">Showing 50 of {imagesData.missingAlt.length}</p>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════ TAB: PERFORMANCE ══════ */}
      {tab === "performance" && sid && (
        <div>
          {perfLoading ? <div className="loading-state p-5"><div className="loading-spinner" /></div> : perfData && (
            <>
              <StatCard label="Avg Response Time" value={`${perfData.avgResponseTime || 0}ms`} color={perfData.avgResponseTime <= 1000 ? "var(--green)" : "var(--yellow)"} icon="⏱️" />

              {perfData.responseTimeDistribution && (
                <div className="card mt-16">
                  <h3>Response Time Distribution</h3>
                  <div className="mt-3">
                    {Object.entries(perfData.responseTimeDistribution).map(([k, v]) => {
                      const total = perfData.pages?.length || 1;
                      const pct = Math.round(((v as number) / total) * 100);
                      return (
                        <div key={k} className="flex gap-2 items-center mb-2">
                          <span className="text-xs text-text-dim w-[100px]">{k}</span>
                          <div className="flex-1 h-[8px] rounded-sm bg-bg-deep overflow-hidden">
                            <div className="h-full rounded-sm bg-accent" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-semibold w-[60px] text-right">{v} <span className="text-text-dim">({pct}%)</span></span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {perfData.slowPages?.length > 0 && (
                <div className="card mt-16">
                  <h3>🐌 Slow Pages (&gt;2.5s)</h3>
                  <div className="table-wrap mt-2">
                    <table>
                      <thead><tr><th>URL</th><th>Response Time</th><th>Size</th></tr></thead>
                      <tbody>
                        {perfData.slowPages.map((p: any, i: number) => (
                          <tr key={i}>
                            <td className="text-xs max-w-[300px] truncate">{p.url}</td>
                            <td className="text-xs text-red font-semibold">{p.response_time_ms}ms</td>
                            <td className="text-xs text-text-dim">{p.page_size_kb}KB</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════ TAB: HISTORY ══════ */}
      {tab === "history" && (
        <div>
          <div className="card">
            <h3>Crawl History</h3>
            {sessionsLoading ? <div className="loading-state p-5"><div className="loading-spinner" /></div> : sessions.length > 0 ? (
              <div className="table-wrap mt-3">
                <table>
                  <thead><tr><th>ID</th><th>Site</th><th>Status</th><th>Pages</th><th>Started</th><th>Finished</th><th>Actions</th></tr></thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.id} className={sid === s.id ? "bg-accent-surface" : ""}>
                        <td className="font-semibold">#{s.id}</td>
                        <td className="text-xs max-w-[200px] truncate">{s.site_url}</td>
                        <td>
                          <span className={`badge badge-${s.status === "completed" ? "low" : s.status === "running" ? "medium" : s.status === "error" ? "urgent" : "low"} text-[10px]`}>{s.status}</span>
                        </td>
                        <td className="text-xs">{s.pages_crawled}{s.total_pages > 0 ? ` / ${s.total_pages}` : ""}</td>
                        <td className="text-xs text-text-dim">{formatDate(s.started_at || s.created_at)}</td>
                        <td className="text-xs text-text-dim">{s.finished_at ? formatDate(s.finished_at) : "—"}</td>
                        <td>
                          <div className="flex gap-[4px]">
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedSession(s.id); setTab("overview"); }}>View</Button>
                            <Button variant="destructive" size="sm" onClick={() => { if (confirm(`Delete session #${s.id}?`)) deleteSessionMut.mutate(s.id); }}>×</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="empty-state p-5"><p>No crawl sessions yet. Start one above.</p></div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper Components ──
  const [expanded, setExpanded] = useState(false);
  const display = expanded ? data : data.slice(0, 10);

  return (
    <div className="card mb-16">
      <div className="flex-between mb-2">
        <h3>{title} ({data.length})</h3>
        {data.length > 10 && (
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Show less" : `Show all (${data.length})`}
          </Button>
        )}
      </div>
      <div className="table-wrap mt-2">
        <table>
          <thead><tr>{columns.map(c => <th key={c} className="capitalize">{c.replace(/_/g, " ")}</th>)}</tr></thead>
          <tbody>
            {display.map((row, i) => (
              <tr key={i}>
                {columns.map(c => (
                  <td key={c} className={`text-xs max-w-[25px] truncate ${c === "http_status" ? "font-semibold" : ""} ${c === "http_status" && row[c] >= 400 ? "text-red" : c === "http_status" && row[c] >= 200 && row[c] < 300 ? "text-green" : ""}`}>
                    {String(row[c] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function oversightsText(overview: OverviewData): string {
  if (overview.issues.critical > 0) return `${overview.issues.critical} critical issues need immediate attention`;
  if (overview.issues.high > 0) return `${overview.issues.high} high-priority issues to fix`;
  if (overview.issues.total > 0) return `${overview.issues.total} minor issues — room for improvement`;
  return "All checks passed — excellent SEO health";
}
