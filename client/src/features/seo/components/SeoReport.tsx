/**
 * Individual SEO Crawl Report — Route-based
 *
 * URL: /seo/:domainSlug/:reportId
 * Tabs are rendered as sub-sections within this single page.
 * Data is loaded by session ID (reportId) from the URL params.
 */
import { useState } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api, formatDate, qk } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, ArrowLeft, Globe } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Skeleton, StatCardSkeleton, IssueTableSkeleton } from "@/components/ui/skeleton";

interface OverviewData {
  score: number;
  totalPages: number;
  avgResponseTime: number;
  issues: { critical: number; high: number; medium: number; low: number; notices: number; passed: number; total: number };
  statusCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  topIssues: any[];
}

type TabKey = "overview" | "issues" | "content" | "technical" | "links" | "redirects" | "hreflang" | "social" | "images" | "performance";

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
];

export default function SeoReport() {
  const { domainSlug, reportId } = useParams({ from: "/seo/$domainSlug/$reportId" });
  const navigate = useNavigate();
  const sid = Number(reportId);
  const [tab, setTab] = useState<TabKey>("overview");

  // ── Main data query (auto-refresh while crawl is running) ──
  const { data: overview, isLoading, error } = useQuery<OverviewData>({
    queryKey: qk("seo-audit", "overview", sid),
    queryFn: () => api(`/seo-audit/overview/${sid}`),
    enabled: !!sid,
    refetchInterval: 5000, // Always poll — overview endpoint is cheap
  });

  // ── Issues ──
  const { data: issues = [] } = useQuery({
    queryKey: qk("seo-audit", "issues", sid),
    queryFn: () => api(`/seo-audit/issues/${sid}`),
    enabled: !!sid && tab === "issues",
  });

  // ── Content ──
  const { data: contentData = [] } = useQuery({
    queryKey: qk("seo-audit", "content", sid),
    queryFn: () => api(`/seo-audit/content/${sid}`),
    enabled: !!sid && tab === "content",
  });

  // ── Technical ──
  const { data: technicalData } = useQuery({
    queryKey: qk("seo-audit", "technical", sid),
    queryFn: () => api(`/seo-audit/technical/${sid}`),
    enabled: !!sid && tab === "technical",
  });

  // ── Links ──
  const { data: linksData } = useQuery({
    queryKey: qk("seo-audit", "links", sid),
    queryFn: () => api(`/seo-audit/links/${sid}`),
    enabled: !!sid && tab === "links",
  });

  // ── Redirects ──
  const { data: redirects = [] } = useQuery({
    queryKey: qk("seo-audit", "redirects", sid),
    queryFn: () => api(`/seo-audit/redirects/${sid}`),
    enabled: !!sid && tab === "redirects",
  });

  // ── Hreflang ──
  const { data: hreflangData } = useQuery({
    queryKey: qk("seo-audit", "hreflang", sid),
    queryFn: () => api(`/seo-audit/hreflang/${sid}`),
    enabled: !!sid && tab === "hreflang",
  });

  // ── Social ──
  const { data: socialData } = useQuery({
    queryKey: qk("seo-audit", "social", sid),
    queryFn: () => api(`/seo-audit/social/${sid}`),
    enabled: !!sid && tab === "social",
  });

  // ── Images ──
  const { data: imagesData } = useQuery({
    queryKey: qk("seo-audit", "images", sid),
    queryFn: () => api(`/seo-audit/images/${sid}`),
    enabled: !!sid && tab === "images",
  });

  // ── Performance ──
  const { data: perfData } = useQuery({
    queryKey: qk("seo-audit", "performance", sid),
    queryFn: () => api(`/seo-audit/performance/${sid}`),
    enabled: !!sid && tab === "performance",
  });

  // ── Delete ──
  const handleDelete = async () => {
    try {
      await api(`/seo-audit/sessions/${sid}`, { method: "DELETE" });
      toast.success(`Session #${sid} deleted`);
      navigate({ to: "/seo" });
    } catch (err: any) {
      toast.error("Failed to delete", { description: err?.message });
    }
  };

  // ── Loading / Error ──
  if (isLoading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <Button variant="ghost" size="sm" className="mb-2" onClick={() => navigate({ to: "/seo/$domainSlug", params: { domainSlug } })}>
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />Back
            </Button>
            <h1><Skeleton className="w-48 h-6" /></h1>
          </div>
        </div>
        <div className="grid-2 mb-24">
          <div className="card flex items-center justify-between py-5 px-6">
            <div><Skeleton className="w-24 h-4 mb-2" /><Skeleton className="w-32 h-3" /></div>
            <Skeleton className="w-[100px] h-[100px] rounded-full" />
          </div>
          <div className="card"><Skeleton className="w-20 h-4 mb-3" /><div className="flex gap-3">
            {[1,2,3,4].map(i => <div key={i} className="flex-1"><Skeleton className="w-full h-10 rounded-lg" /></div>)}
          </div></div>
        </div>
        <div className="grid-3 mb-24">{[1,2,3].map(i => <StatCardSkeleton key={i} />)}</div>
        <div className="card"><Skeleton className="w-24 h-4 mb-3" /><IssueTableSkeleton /></div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="card p-10 text-center">
        <h2 className="text-red">⚠️ Report Not Found</h2>
        <p className="subtitle mt-2">
          {error?.message || `No data found for session #${sid}. The crawl may still be running or the data was deleted.`}
        </p>
        <div className="flex gap-sm justify-center mt-6">
          <Button variant="outline" onClick={() => navigate({ to: "/seo" })}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to History
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <Button variant="ghost" size="sm" className="mb-2" onClick={() => navigate({ to: "/seo/$domainSlug", params: { domainSlug } })}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to {domainSlug}
          </Button>
          <h1>🔍 Crawl Report #{sid}</h1>
          <div className="subtitle text-[14px] text-accent flex items-center gap-2">
            {overview.totalPages} pages crawled
            <span className="text-text-dim">·</span>
            Score: {overview.score}/100
          </div>
        </div>
        <div className="flex gap-sm items-center">
          <DeleteConfirmDialog
            title={`Delete Report #${sid}`}
            description={`This will permanently delete crawl report #${sid} and all its data (${overview.totalPages} pages, ${overview.issues.total} issues). This cannot be undone.`}
            confirmLabel="Delete Report"
            trigger={
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Delete
              </Button>
            }
            onConfirm={handleDelete}
          />
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="card filter-bar mb-24 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`filter-pill${tab === t.key ? " active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════ TAB: OVERVIEW ══════ */}
      {tab === "overview" && (
        <div>
          <div className="grid-2 mb-24">
            <div className="flex-between card items-center py-5 px-6">
              <div>
                <h3>SEO Health Score</h3>
                <div className="subtitle max-w-[200px] mt-1">
                  {overview.issues.total === 0
                    ? "All checks passed — excellent SEO health"
                    : `${overview.issues.total} issues found across ${overview.totalPages} pages`}
                </div>
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

          {overview.topIssues.length > 0 && (
            <div className="card">
              <h3>Top Issues</h3>
              <div className="table-wrap mt-3">
                <table>
                  <thead><tr><th>Issue</th><th>Severity</th><th>URL</th><th>Category</th></tr></thead>
                  <tbody>
                    {overview.topIssues.map((issue: any, i: number) => (
                      <tr key={i} className="cursor-pointer" onClick={() => setTab("issues")}>
                        <td className="font-medium text-[12px]">{issue.title}</td>
                        <td><SeverityBadge severity={issue.severity} /></td>
                        <td className="text-xs text-text-dim max-w-[250px] truncate">{issue.page_url}</td>
                        <td className="text-[10px] text-text-dim capitalize">{issue.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════ TAB: ISSUES ══════ */}
      {tab === "issues" && (
        <div className="card">
          <h3>All Issues ({issues.length})</h3>
          <div className="table-wrap mt-3">
            <table>
              <thead><tr><th>Severity</th><th>Category</th><th>Issue</th><th>URL</th><th>Recommendation</th></tr></thead>
              <tbody>
                {issues.map((issue: any) => (
                  <tr key={issue.id}>
                    <td><SeverityBadge severity={issue.severity} /></td>
                    <td className="text-[10px] text-text-dim capitalize">{issue.category}</td>
                    <td className="font-medium text-[12px]">{issue.title}</td>
                    <td className="text-xs text-text-dim max-w-[200px] truncate">{issue.page_url}</td>
                    <td className="text-[11px] text-text-dim max-w-[250px] truncate">{issue.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════ TAB: CONTENT ══════ */}
      {tab === "content" && (
        <div className="card">
          <h3>Content Quality ({contentData.length} pages)</h3>
          <div className="table-wrap mt-3">
            <table>
              <thead><tr><th>URL</th><th>Title</th><th>Title Len</th><th>Meta Desc</th><th>Desc Len</th><th>H1</th><th>H1 Count</th><th>Words</th><th>Status</th></tr></thead>
              <tbody>
                {contentData.map((p: any, i: number) => (
                  <tr key={i}>
                    <td className="text-xs max-w-[200px] truncate">{p.url}</td>
                    <td className="text-xs max-w-[150px] truncate">{p.title || "—"}</td>
                    <td className="text-xs">{p.title_length}</td>
                    <td className="text-xs max-w-[200px] truncate">{p.meta_description || "—"}</td>
                    <td className="text-xs">{p.meta_description_length}</td>
                    <td className="text-xs max-w-[100px] truncate">{p.h1 || "—"}</td>
                    <td className="text-xs">{p.h1_count}</td>
                    <td className="text-xs">{p.word_count}</td>
                    <td className="text-xs">{p.http_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════ TAB: TECHNICAL ══════ */}
      {tab === "technical" && technicalData && (
        <div>
          <SectionTable title={`Noindex Pages (${technicalData.noindexPages?.length || 0})`} data={technicalData.noindexPages || []} columns={["url", "http_status"]} />
          <SectionTable title={`Missing Canonical (${technicalData.missingCanonical?.length || 0})`} data={technicalData.missingCanonical || []} columns={["url", "http_status"]} />
          <SectionTable title={`Missing Viewport (${technicalData.missingViewport?.length || 0})`} data={technicalData.missingViewport || []} columns={["url"]} />
          <SectionTable title={`Missing HTML Lang (${technicalData.missingLang?.length || 0})`} data={technicalData.missingLang || []} columns={["url"]} />
          <SectionTable title={`No Structured Data (${technicalData.noStructuredData?.length || 0})`} data={technicalData.noStructuredData || []} columns={["url"]} />
          <SectionTable title={`Error Pages (${technicalData.errorPages?.length || 0})`} data={technicalData.errorPages || []} columns={["url", "http_status"]} />
        </div>
      )}

      {/* ══════ TAB: LINKS ══════ */}
      {tab === "links" && linksData && (
        <div>
          <div className="grid-4 mb-24">
            <StatCard label="Total Links" value={linksData.totalLinks} />
            <StatCard label="Internal" value={linksData.internalLinks} />
            <StatCard label="External" value={linksData.externalLinks} />
            <StatCard label="Broken" value={linksData.brokenLinks} color={linksData.brokenLinks > 0 ? "var(--red)" : "var(--green)"} />
          </div>
          <SectionTable title={`Orphan Pages (${linksData.orphanPages?.length || 0})`} data={linksData.orphanPages || []} columns={["url", "http_status"]} />
          <SectionTable title={`Pages with Only Nofollow Incoming (${linksData.nofollowOnlyPages?.length || 0})`} data={linksData.nofollowOnlyPages || []} columns={["url"]} />
          <SectionTable title={`Single Dofollow Incoming (${linksData.singleDofollowPages?.length || 0})`} data={linksData.singleDofollowPages || []} columns={["url", "incomingFrom"]} />
        </div>
      )}

      {/* ══════ TAB: REDIRECTS ══════ */}
      {tab === "redirects" && (
        <div className="card">
          <h3>Redirect Chains ({redirects.length})</h3>
          {redirects.length > 0 ? (
            <div className="table-wrap mt-3">
              <table>
                <thead><tr><th>Source URL</th><th>Chain Length</th><th>Final URL</th><th>Final Status</th><th>Loop</th></tr></thead>
                <tbody>
                  {redirects.map((r: any, i: number) => (
                    <tr key={i}>
                      <td className="text-xs max-w-[250px] truncate">{r.source_url}</td>
                      <td className="text-xs">{r.chain_length}</td>
                      <td className="text-xs max-w-[250px] truncate">{r.final_url}</td>
                      <td className="text-xs">{r.final_status}</td>
                      <td className="text-xs">{r.is_loop ? "⚠️ Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty-state p-5"><p>No redirect chains found</p></div>}
        </div>
      )}

      {/* ══════ TAB: HREFLANG ══════ */}
      {tab === "hreflang" && hreflangData && (
        <div>
          <SectionTable title={`Hreflang Annotations (${hreflangData.hreflangs?.length || 0})`} data={hreflangData.hreflangs || []} columns={["page_url", "hreflang_value", "hreflang_url", "is_self_reference"]} />
          {hreflangData.issues?.length > 0 && (
            <SectionTable title={`Hreflang Issues (${hreflangData.issues.length})`} data={hreflangData.issues} columns={["page_url", "issue"]} />
          )}
        </div>
      )}

      {/* ══════ TAB: SOCIAL ══════ */}
      {tab === "social" && socialData && (
        <div>
          <div className="grid-4 mb-24">
            <StatCard label="Missing og:title" value={socialData.missingOgTitle?.length || 0} color={(socialData.missingOgTitle?.length || 0) > 0 ? "var(--yellow)" : "var(--green)"} />
            <StatCard label="Missing og:desc" value={socialData.missingOgDesc?.length || 0} color={(socialData.missingOgDesc?.length || 0) > 0 ? "var(--yellow)" : "var(--green)"} />
            <StatCard label="Missing og:image" value={socialData.missingOgImage?.length || 0} color={(socialData.missingOgImage?.length || 0) > 0 ? "var(--yellow)" : "var(--green)"} />
            <StatCard label="Missing twitter:card" value={socialData.missingTwCard?.length || 0} color={(socialData.missingTwCard?.length || 0) > 0 ? "var(--yellow)" : "var(--green)"} />
          </div>
          <SectionTable title={`Pages Missing OG Tags (${(socialData.missingOgTitle?.length || 0) + (socialData.missingOgDesc?.length || 0)})`} data={socialData.allPages || []} columns={["url", "og_title", "og_description", "og_image", "twitter_card"]} />
        </div>
      )}

      {/* ══════ TAB: IMAGES ══════ */}
      {tab === "images" && imagesData && (
        <div>
          <div className="grid-4 mb-24">
            <StatCard label="Total Images" value={imagesData.totalImages} />
            <StatCard label="Missing Alt" value={imagesData.missingAlt?.length || 0} color={(imagesData.missingAlt?.length || 0) > 0 ? "var(--yellow)" : "var(--green)"} />
            <StatCard label="Not Lazy Loaded" value={imagesData.notLazy?.length || 0} color={(imagesData.notLazy?.length || 0) > 0 ? "var(--yellow)" : "var(--green)"} />
            <StatCard label="Broken" value={imagesData.broken?.length || 0} color={(imagesData.broken?.length || 0) > 0 ? "var(--red)" : "var(--green)"} />
          </div>
          {imagesData.missingAlt?.length > 0 && (
            <SectionTable title={`Images Missing Alt Text (${imagesData.missingAlt.length})`} data={imagesData.missingAlt} columns={["page_url", "image_url"]} />
          )}
        </div>
      )}

      {/* ══════ TAB: PERFORMANCE ══════ */}
      {tab === "performance" && perfData && (
        <div>
          <div className="grid-3 mb-24">
            <StatCard label="Avg Response Time" value={`${perfData.avgResponseTime}ms`} color={perfData.avgResponseTime <= 1000 ? "var(--green)" : "var(--yellow)"} />
            <StatCard label="Slow Pages (>2.5s)" value={perfData.slowPages?.length || 0} color={(perfData.slowPages?.length || 0) > 0 ? "var(--red)" : "var(--green)"} />
            <StatCard label="PSI Cached" value={perfData.psiCache?.length || 0} />
          </div>
          {perfData.slowPages?.length > 0 && (
            <SectionTable title={`Slow Pages (${perfData.slowPages.length})`} data={perfData.slowPages} columns={["url", "response_time_ms", "page_size_kb"]} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Helper Components ──

function SeverityBadge({ severity }: { severity: string }) {
  const cls = severity === "critical" ? "badge-urgent" : severity === "high" ? "badge-high" : severity === "medium" ? "badge-medium" : severity === "low" ? "badge-low" : "badge-low";
  return <span className={`badge ${cls} text-[10px] uppercase font-bold py-[1px] px-[6px] rounded`}>{severity}</span>;
}

function ScoreRing({ score, size = 100 }: { score: number; size?: number }) {
  const color = score >= 70 ? "var(--green)" : score >= 40 ? "var(--yellow)" : "var(--red)";
  const label = score >= 70 ? "Good" : score >= 40 ? "Fair" : "Poor";
  const radius = 45;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--bg-deep)" strokeWidth="8" />
          <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="8" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transform: "rotate(-90deg)", transformOrigin: "center" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[24px] font-bold text-text-bright">{score}</span>
          <span className="text-[9px] text-text-dim">/100</span>
        </div>
      </div>
      <div className="text-[13px] font-semibold mt-2" style={{ color }}>{label}</div>
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

function SectionTable({ title, data, columns }: { title: string; data: any[]; columns: string[] }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="card mb-16">
      <h3 className="mb-2">{title} ({data.length})</h3>
      <div className="table-wrap">
        <table>
          <thead><tr>{columns.map(c => <th key={c} className="capitalize">{c.replace(/_/g, " ")}</th>)}</tr></thead>
          <tbody>
            {data.slice(0, 50).map((row, i) => (
              <tr key={i}>
                {columns.map(c => (
                  <td key={c} className="text-xs max-w-[25px] truncate">{String(row[c] ?? "—")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
