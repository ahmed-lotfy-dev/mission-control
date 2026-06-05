/**
 * Individual SEO Crawl Report — /seo/:domainSlug/:reportId
 *
 * Ahrefs-style SEO audit report with 11 tabs:
 * Overview, Issues, Content, Technical, Links, Redirects,
 * Hreflang, Social, Images, Performance, Audit
 *
 * Design: Dark SaaS with data-dense tables, clear severity hierarchy,
 * and mobile-first responsive layout.
 */
import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api, formatDate, qk } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Trash2, ArrowLeft, Globe,
  AlertTriangle, AlertCircle, Info, ChevronRight,
  FileText, Gauge, Image, Link2, Share2, Eye, BarChart3, Shield, Zap, Code, ExternalLink, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

interface OverviewData {
  score: number;
  totalPages: number;
  avgResponseTime: number;
  issues: {
    critical: number; high: number; medium: number; low: number;
    notices: number; passed: number; total: number;
  };
  statusCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  topIssues: TopIssue[];
}

interface TopIssue {
  title: string;
  severity: string;
  page_url: string;
  category: string;
  recommendation?: string;
}

type TabKey =
  | "overview" | "issues" | "content" | "technical"
  | "links" | "redirects" | "hreflang" | "social"
  | "images" | "performance";

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { key: "overview",   label: "Overview",   icon: <BarChart3 size={14} /> },
  { key: "issues",     label: "Issues",     icon: <AlertTriangle size={14} /> },
  { key: "content",    label: "Content",    icon: <FileText size={14} /> },
  { key: "technical",  label: "Technical",  icon: <Code size={14} /> },
  { key: "links",      label: "Links",      icon: <Link2 size={14} /> },
  { key: "redirects",  label: "Redirects",  icon: <Share2 size={14} /> },
  { key: "hreflang",   label: "Hreflang",   icon: <Globe size={14} /> },
  { key: "social",     label: "Social",     icon: <Eye size={14} /> },
  { key: "images",     label: "Images",     icon: <Image size={14} /> },
  { key: "performance",label: "Performance", icon: <Gauge size={14} /> },
];

/* ═══════════════════════════════════════════════════════════
   SEVERITY HELPERS
   ════════════════════════════════════════════════════════── */

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  critical: { color: "var(--red)",     bg: "rgba(239,68,68,0.08)",  icon: <XCircle size={12} />, label: "Critical" },
  high:     { color: "var(--orange)",  bg: "rgba(249,115,22,0.08)", icon: <AlertCircle size={12} />, label: "High" },
  medium:   { color: "var(--yellow)",  bg: "rgba(234,179,8,0.08)",  icon: <AlertTriangle size={12} />, label: "Medium" },
  low:      { color: "var(--accent)",  bg: "rgba(168,162,128,0.08)",icon: <Info size={12} />, label: "Low" },
};

function SeverityBadge({ severity }: { severity: string }) {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.low;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCORE RING — Animated SVG
   ═══════════════════════════════════════════════════════════ */

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const [animatedOffset, setAnimatedOffset] = useState(0);
  const radius = 48;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? "var(--green)" : score >= 40 ? "var(--yellow)" : "var(--red)";
  const label = score >= 70 ? "Good" : score >= 40 ? "Needs Work" : "Critical";

  useEffect(() => {
    const t = setTimeout(() => setanimatedOffset(offset), 100);
    return () => clearTimeout(t);
  }, [offset]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 120 120" className="score-ring-svg">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--bg-raise)" strokeWidth="7" />
          <circle
            cx="60" cy="60" r={radius}
            fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={circ} strokeDashoffset={animatedOffset}
            strokeLinecap="round"
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "center",
              transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[28px] font-extrabold leading-none text-text-bright">{score}</span>
          <span className="text-[10px] font-medium text-text-dim tracking-wider">OUT OF 100</span>
        </div>
      </div>
      <span
        className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
        style={{ color, background: `${color}15` }}
      >
        {label}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ISSUE SUMMARY CARD
   ═══════════════════════════════════════════════════════════ */

function IssueCard({ label, value, severity }: { label: string; value: number; severity: string }) {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.low;
  const hasIssues = value > 0;
  return (
    <div
      className="flex-1 rounded-lg p-3 text-center issue-card-sev"
      style={{
        background: hasIssues ? cfg.bg : "var(--bg-raise)",
        border: `1px solid ${hasIssues ? cfg.color + "25" : "var(--border)"}`,
      }}
    >
      <div className="text-[26px] font-extrabold leading-tight" style={{ color: hasIssues ? cfg.color : "var(--text-dim)" }}>
        {value.toLocaleString()}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-dim mt-1">{label}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROGRESS BAR
   ═══════════════════════════════════════════════════════════ */

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-[6px] rounded-full bg-bg-deep overflow-hidden flex-1">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DATA TABLE
   ═══════════════════════════════════════════════════════════ */

function DataTable({
  columns,
  rows,
  maxRows = 50,
  onRowClick,
}: {
  columns: { key: string; label: string; width?: string }[];
  rows: any[];
  maxRows?: number;
  onRowClick?: (row: any) => void;
}) {
  const displayRows = rows.slice(0, maxRows);
  const remaining = rows.length - maxRows;

  return (
    <div className="table-wrap rounded-lg border border-border">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-bg-raise/60">
            {columns.map((c) => (
              <th
                key={c.key}
                className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-text-dim whitespace-nowrap"
                style={c.width ? { width: c.width } : undefined}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, i) => (
            <tr
              key={i}
              className={onRowClick ? "cursor-pointer hover:bg-bg-hover/60" : "hover:bg-bg-hover/40"}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2 border-t border-[var(--border-dim)] text-text max-w-[300px] truncate">
                  {row[c.key] !== null && row[c.key] !== undefined ? String(row[c.key]) : "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {remaining > 0 && (
        <div className="px-3 py-2 text-[11px] text-text-dim border-t border-border bg-bg-raise/30">
          Showing {maxRows} of {rows.length} rows
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STAT CARD (compact)
   ═══════════════════════════════════════════════════════════ */

function StatBadge({ label, value, color, icon }: { label: string; value: string | number; color?: string; icon?: React.ReactNode }) {
  return (
    <div className="stat-card-compact">
      {icon && <div className="stat-icon" style={{ color: color || "var(--accent)" }}>{icon}</div>}
      <div className="stat-info">
        <span className="stat-value" style={{ color: color || "var(--text-bright)" }}>{value}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SECTION WRAPPER
   ═══════════════════════════════════════════════════════════ */

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="seo-section">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="seo-section-title">{title}</h3>
        {count !== undefined && (
          <span className="text-[10px] font-bold text-text-dim bg-bg-raise px-2 py-0.5 rounded">
            {count.toLocaleString()}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function SeoReport() {
  const { domainSlug, reportId } = useParams({ from: "/seo/$domainSlug/$reportId" });
  const navigate = useNavigate();
  const sid = Number(reportId);
  const [tab, setTab] = useState<TabKey>("overview");
  const tabsRef = useRef<HTMLDivElement>(null);

  // ── Main overview query (always polls) ──
  const { data: overview, isLoading, error } = useQuery<OverviewData>({
    queryKey: qk("seo-audit", "overview", sid),
    queryFn: () => api(`/seo-audit/overview/${sid}`),
    enabled: !!sid,
    refetchInterval: 5000,
  });

  // ── Tab-specific queries ──
  const { data: issues = [] } = useQuery({
    queryKey: qk("seo-audit", "issues", sid),
    queryFn: () => api(`/seo-audit/issues/${sid}`),
    enabled: !!sid && tab === "issues",
  });

  const { data: contentData = [] } = useQuery({
    queryKey: qk("seo-audit", "content", sid),
    queryFn: () => api(`/seo-audit/content/${sid}`),
    enabled: !!sid && tab === "content",
  });

  const { data: technicalData } = useQuery({
    queryKey: qk("seo-audit", "technical", sid),
    queryFn: () => api(`/seo-audit/technical/${sid}`),
    enabled: !!sid && tab === "technical",
  });

  const { data: linksData } = useQuery({
    queryKey: qk("seo-audit", "links", sid),
    queryFn: () => api(`/seo-audit/links/${sid}`),
    enabled: !!sid && tab === "links",
  });

  const { data: redirects = [] } = useQuery({
    queryKey: qk("seo-audit", "redirects", sid),
    queryFn: () => api(`/seo-audit/redirects/${sid}`),
    enabled: !!sid && tab === "redirects",
  });

  const { data: hreflangData } = useQuery({
    queryKey: qk("seo-audit", "hreflang", sid),
    queryFn: () => api(`/seo-audit/hreflang/${sid}`),
    enabled: !!sid && tab === "hreflang",
  });

  const { data: socialData } = useQuery({
    queryKey: qk("seo-audit", "social", sid),
    queryFn: () => api(`/seo-audit/social/${sid}`),
    enabled: !!sid && tab === "social",
  });

  const { data: imagesData } = useQuery({
    queryKey: qk("seo-audit", "images", sid),
    queryFn: () => api(`/seo-audit/images/${sid}`),
    enabled: !!sid && tab === "images",
  });

  const { data: perfData } = useQuery({
    queryKey: qk("seo-audit", "performance", sid),
    queryFn: () => api(`/seo-audit/performance/${sid}`),
    enabled: !!sid && tab === "performance",
  });

  // ── Delete handler ──
  const handleDelete = async () => {
    try {
      await api(`/seo-audit/sessions/${sid}`, { method: "DELETE" });
      toast.success(`Session #${sid} deleted`);
      navigate({ to: "/seo" });
    } catch (err: any) {
      toast.error("Failed to delete", { description: err?.message });
    }
  };

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="seo-report">
        <div className="seo-header">
          <div>
            <Button variant="ghost" size="sm" className="mb-2" onClick={() => navigate({ to: "/seo/$domainSlug", params: { domainSlug } })}>
              <ArrowLeft size={14} className="mr-1" />Back
            </Button>
            <h1><Skeleton className="w-56 h-7" /></h1>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="card p-6 flex items-center justify-between">
            <div className="space-y-2"><Skeleton className="w-28 h-4" /><Skeleton className="w-40 h-3" /></div>
            <Skeleton className="w-[100px] h-[100px] rounded-full" />
          </div>
          <div className="card p-5"><Skeleton className="w-24 h-4 mb-3" /><div className="grid grid-cols-4 gap-2">
            {[1,2,3,4].map(i => <Skeleton key={i} className="w-full h-16 rounded-lg" />)}
          </div></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {[1,2,3].map(i => <Skeleton key={i} className="w-full h-16 rounded-lg" />)}
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error || !overview) {
    const errMsg = error instanceof Error ? error.message : String(error || "");
    const is404 = errMsg.includes("Session not found") || errMsg.includes("Not found");
    return (
      <div className="card p-10 text-center max-w-lg mx-auto mt-10">
        <XCircle size={40} className="text-red mx-auto mb-3" />
        <h2 className="text-red font-bold text-lg">{is404 ? "Report Not Found" : "Error Loading Report"}</h2>
        <p className="subtitle mt-2 text-sm">
          {errMsg || `No data found for session #${sid}. The crawl may still be running or the data was deleted.`}
        </p>
        <div className="flex gap-sm justify-center mt-6">
          <Button variant="outline" onClick={() => navigate({ to: "/seo" })}>
            <ArrowLeft size={14} className="mr-1" />Back to History
          </Button>
        </div>
      </div>
    );
  }

  const score = overview.score;

  // ── DATA FOR TABS ──
  const topIssuesColumns = [
    { key: "title", label: "Issue" },
    { key: "severity", label: "Severity", width: "100px" },
    { key: "page_url", label: "URL" },
    { key: "category", label: "Category", width: "110px" },
  ];

  const issueColumns = [
    { key: "severity", label: "Severity", width: "100px" },
    { key: "category", label: "Category", width: "110px" },
    { key: "title", label: "Issue" },
    { key: "page_url", label: "URL" },
    { key: "recommendation", label: "Fix" },
  ];

  const contentColumns = [
    { key: "url", label: "URL" },
    { key: "title", label: "Title" },
    { key: "title_length", label: "Title Len", width: "70px" },
    { key: "meta_description", label: "Meta Desc" },
    { key: "meta_description_length", label: "Desc Len", width: "70px" },
    { key: "h1", label: "H1" },
    { key: "h1_count", label: "H1s", width: "50px" },
    { key: "word_count", label: "Words", width: "60px" },
    { key: "http_status", label: "Status", width: "60px" },
  ];

  return (
    <div className="seo-report">
      {/* ══════════ HEADER ══════════ */}
      <div className="seo-header">
        <div className="seo-header-left">
          <Button variant="ghost" size="sm" className="seo-back-btn" onClick={() => navigate({ to: "/seo/$domainSlug", params: { domainSlug } })}>
            <ArrowLeft size={14} />
            <span>Back to {domainSlug || "Domains"}</span>
          </Button>
          <div className="seo-header-info">
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-accent" />
              <h1 className="seo-title">Crawl Report #{sid}</h1>
            </div>
            <div className="seo-meta">
              <span>{overview.totalPages} pages crawled</span>
              <span className="seo-meta-dot">·</span>
              <span className="seo-score-pill" style={{
                color: score >= 70 ? "var(--green)" : score >= 40 ? "var(--yellow)" : "var(--red)",
                background: score >= 70 ? "rgba(34,197,94,0.08)" : score >= 40 ? "rgba(234,179,8,0.08)" : "rgba(239,68,68,0.08)",
              }}>
                Score: {score}/100
              </span>
            </div>
          </div>
        </div>
        <DeleteConfirmDialog
          title={`Delete Report #${sid}`}
          description={`This will permanently delete crawl report #${sid} and all its data (${overview.totalPages} pages, ${overview.issues.total} issues). This cannot be undone.`}
          confirmLabel="Delete Report"
          trigger={
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 size={14} className="mr-1" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          }
          onConfirm={handleDelete}
        />
      </div>

      {/* ══════════ TAB BAR ══════════ */}
      <div className="seo-tabs-wrapper" ref={tabsRef}>
        <div className="seo-tabs">
          {TABS.map((t) => {
            const isActive = tab === t.key;
            // Show issue count on Issues tab
            const count = t.key === "issues" ? overview.issues.total : undefined;
            return (
              <button
                key={t.key}
                className={`seo-tab${isActive ? " active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                <span className="seo-tab-icon">{t.icon}</span>
                <span className="seo-tab-label">{t.label}</span>
                {count !== undefined && count > 0 && (
                  <span className="seo-tab-count">{count.toLocaleString()}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════ TAB: OVERVIEW ══════════ */}
      {tab === "overview" && (
        <div className="seo-overview">
          {/* Score + Issue Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div className="card seo-score-card">
              <div className="seo-score-card-inner">
                <div>
                  <h3 className="seo-card-title">SEO Health Score</h3>
                  <p className="seo-card-subtitle">
                    {overview.issues.total === 0
                      ? "All checks passed — excellent SEO health"
                      : `${overview.issues.total.toLocaleString()} issues found across ${overview.totalPages} pages`}
                  </p>
                </div>
                <ScoreRing score={score} />
              </div>
            </div>

            <div className="card seo-issues-card">
              <h3 className="seo-card-title">Issue Summary</h3>
              <div className="grid grid-cols-2 gap-2 mt-3 sm:flex">
                <IssueCard label="Critical" value={overview.issues.critical} severity="critical" />
                <IssueCard label="High" value={overview.issues.high} severity="high" />
                <IssueCard label="Medium" value={overview.issues.medium} severity="medium" />
                <IssueCard label="Low" value={overview.issues.low} severity="low" />
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            <StatBadge label="Pages Crawled" value={overview.totalPages} icon={<FileText size={16} />} />
            <StatBadge
              label="Avg Response Time"
              value={`${overview.avgResponseTime}ms`}
              icon={<Clock size={16} />}
              color={overview.avgResponseTime <= 1000 ? "var(--green)" : "var(--yellow)"}
            />
            <StatBadge label="Total Issues" value={overview.issues.total} icon={<AlertTriangle size={16} />} />
          </div>

          {/* Status Codes + Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div className="card">
              <h3 className="seo-card-title">Status Code Distribution</h3>
              <div className="mt-3 space-y-2.5">
                {Object.entries(overview.statusCounts)
                  .filter(([, v]) => v > 0)
                  .map(([k, v]) => {
                    const colors: Record<string, string> = {
                      "2xx": "var(--green)", "3xx": "var(--yellow)",
                      "4xx": "var(--orange)", "5xx": "var(--red)",
                    };
                    const pct = overview.totalPages > 0 ? Math.round((v / overview.totalPages) * 100) : 0;
                    return (
                      <div key={k} className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-text-dim w-8">{k}</span>
                        <ProgressBar value={v} max={overview.totalPages} color={colors[k] || "var(--text-dim)"} />
                        <span className="text-[11px] font-semibold w-16 text-right">
                          {v} <span className="text-text-dim">({pct}%)</span>
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="card">
              <h3 className="seo-card-title">Issues by Category</h3>
              <div className="mt-3 space-y-2.5">
                {Object.entries(overview.categoryCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-text-dim capitalize w-20 truncate">{k}</span>
                      <ProgressBar value={v} max={overview.issues.total} color="var(--accent)" />
                      <span className="text-[11px] font-semibold w-8 text-right">{v}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Top Issues Table */}
          {overview.topIssues.length > 0 && (
            <Section title="Top Issues" count={overview.topIssues.length}>
              <DataTable
                columns={topIssuesColumns}
                rows={overview.topIssues}
                onRowClick={() => setTab("issues")}
              />
            </Section>
          )}
        </div>
      )}

      {/* ══════════ TAB: ISSUES ══════════ */}
      {tab === "issues" && (
        <Section title="All Issues" count={issues.length}>
          {issues.length > 0 ? (
            <DataTable columns={issueColumns} rows={issues} />
          ) : (
            <div className="empty-state py-10">
              <CheckCircle2 size={32} className="text-green mb-2" />
              <p className="text-sm text-text-dim">No issues found — great job!</p>
            </div>
          )}
        </Section>
      )}

      {/* ══════════ TAB: CONTENT ══════════ */}
      {tab === "content" && (
        <Section title="Content Quality" count={contentData.length}>
          {contentData.length > 0 ? (
            <DataTable columns={contentColumns} rows={contentData} />
          ) : (
            <div className="empty-state py-10"><p className="text-sm text-text-dim">No content data available</p></div>
          )}
        </Section>
      )}

      {/* ══════════ TAB: TECHNICAL ══════════ */}
      {tab === "technical" && technicalData && (
        <div className="space-y-4">
          <Section title="Noindex Pages" count={technicalData.noindexPages?.length || 0}>
            {(technicalData.noindexPages?.length || 0) > 0
              ? <DataTable columns={[{ key: "url", label: "URL" }, { key: "http_status", label: "Status", width: "80px" }]} rows={technicalData.noindexPages} />
              : <p className="text-xs text-text-dim py-3">No noindex pages found</p>}
          </Section>
          <Section title="Missing Canonical" count={technicalData.missingCanonical?.length || 0}>
            {(technicalData.missingCanonical?.length || 0) > 0
              ? <DataTable columns={[{ key: "url", label: "URL" }, { key: "http_status", label: "Status", width: "80px" }]} rows={technicalData.missingCanonical} />
              : <p className="text-xs text-text-dim py-3">All pages have canonical tags</p>}
          </Section>
          <Section title="Missing Viewport" count={technicalData.missingViewport?.length || 0}>
            {(technicalData.missingViewport?.length || 0) > 0
              ? <DataTable columns={[{ key: "url", label: "URL" }]} rows={technicalData.missingViewport} />
              : <p className="text-xs text-text-dim py-3">All pages have viewport meta</p>}
          </Section>
          <Section title="Missing HTML Lang" count={technicalData.missingLang?.length || 0}>
            {(technicalData.missingLang?.length || 0) > 0
              ? <DataTable columns={[{ key: "url", label: "URL" }]} rows={technicalData.missingLang} />
              : <p className="text-xs text-text-dim py-3">All pages have lang attribute</p>}
          </Section>
          <Section title="No Structured Data" count={technicalData.noStructuredData?.length || 0}>
            {(technicalData.noStructuredData?.length || 0) > 0
              ? <DataTable columns={[{ key: "url", label: "URL" }]} rows={technicalData.noStructuredData} />
              : <p className="text-xs text-text-dim py-3">All pages have structured data</p>}
          </Section>
          <Section title="Error Pages" count={technicalData.errorPages?.length || 0}>
            {(technicalData.errorPages?.length || 0) > 0
              ? <DataTable columns={[{ key: "url", label: "URL" }, { key: "http_status", label: "Status", width: "80px" }]} rows={technicalData.errorPages} />
              : <p className="text-xs text-text-dim py-3">No error pages found</p>}
          </Section>
        </div>
      )}

      {/* ══════════ TAB: LINKS ══════════ */}
      {tab === "links" && linksData && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatBadge label="Total Links" value={linksData.totalLinks} icon={<Link2 size={16} />} />
            <StatBadge label="Internal" value={linksData.internalLinks} color="var(--accent)" />
            <StatBadge label="External" value={linksData.externalLinks} color="var(--purple)" />
            <StatBadge label="Broken" value={linksData.brokenLinks} color={linksData.brokenLinks > 0 ? "var(--red)" : "var(--green)"} />
          </div>
          <div className="space-y-4">
            <Section title="Orphan Pages" count={linksData.orphanPages?.length || 0}>
              {(linksData.orphanPages?.length || 0) > 0
                ? <DataTable columns={[{ key: "url", label: "URL" }, { key: "http_status", label: "Status", width: "80px" }]} rows={linksData.orphanPages} />
                : <p className="text-xs text-text-dim py-3">No orphan pages</p>}
            </Section>
            <Section title="Pages with Only Nofollow Incoming" count={linksData.nofollowOnlyPages?.length || 0}>
              {(linksData.nofollowOnlyPages?.length || 0) > 0
                ? <DataTable columns={[{ key: "url", label: "URL" }]} rows={linksData.nofollowOnlyPages} />
                : <p className="text-xs text-text-dim py-3">No nofollow-only pages</p>}
            </Section>
            <Section title="Single Dofollow Incoming" count={linksData.singleDofollowPages?.length || 0}>
              {(linksData.singleDofollowPages?.length || 0) > 0
                ? <DataTable columns={[{ key: "url", label: "URL" }, { key: "incomingFrom", label: "Incoming From" }]} rows={linksData.singleDofollowPages} />
                : <p className="text-xs text-text-dim py-3">No single-dofollow pages</p>}
            </Section>
          </div>
        </div>
      )}

      {/* ══════════ TAB: REDIRECTS ══════════ */}
      {tab === "redirects" && (
        <Section title="Redirect Chains" count={redirects.length}>
          {redirects.length > 0 ? (
            <DataTable
              columns={[
                { key: "source_url", label: "Source URL" },
                { key: "chain_length", label: "Hops", width: "60px" },
                { key: "final_url", label: "Final URL" },
                { key: "final_status", label: "Status", width: "70px" },
                { key: "is_loop", label: "Loop", width: "60px" },
              ]}
              rows={redirects}
            />
          ) : (
            <div className="empty-state py-10">
              <CheckCircle2 size={32} className="text-green mb-2" />
              <p className="text-sm text-text-dim">No redirect chains found</p>
            </div>
          )}
        </Section>
      )}

      {/* ══════════ TAB: HREFLANG ══════════ */}
      {tab === "hreflang" && hreflangData && (
        <div className="space-y-4">
          <Section title="Hreflang Annotations" count={hreflangData.hreflangs?.length || 0}>
            {(hreflangData.hreflangs?.length || 0) > 0
              ? <DataTable columns={[
                  { key: "page_url", label: "Page" },
                  { key: "hreflang_value", label: "Lang", width: "70px" },
                  { key: "hreflang_url", label: "Target" },
                  { key: "is_self_reference", label: "Self Ref", width: "70px" },
                ]} rows={hreflangData.hreflangs} />
              : <p className="text-xs text-text-dim py-3">No hreflang annotations found</p>}
          </Section>
          {hreflangData.issues?.length > 0 && (
            <Section title="Hreflang Issues" count={hreflangData.issues.length}>
              <DataTable columns={[{ key: "page_url", label: "Page" }, { key: "issue", label: "Issue" }]} rows={hreflangData.issues} />
            </Section>
          )}
        </div>
      )}

      {/* ══════════ TAB: SOCIAL ══════════ */}
      {tab === "social" && socialData && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatBadge label="Missing og:title" value={socialData.missingOgTitle?.length || 0} color={(socialData.missingOgTitle?.length || 0) > 0 ? "var(--yellow)" : "var(--green)"} />
            <StatBadge label="Missing og:desc" value={socialData.missingOgDesc?.length || 0} color={(socialData.missingOgDesc?.length || 0) > 0 ? "var(--yellow)" : "var(--green)"} />
            <StatBadge label="Missing og:image" value={socialData.missingOgImage?.length || 0} color={(socialData.missingOgImage?.length || 0) > 0 ? "var(--yellow)" : "var(--green)"} />
            <StatBadge label="Missing twitter:card" value={socialData.missingTwCard?.length || 0} color={(socialData.missingTwCard?.length || 0) > 0 ? "var(--yellow)" : "var(--green)"} />
          </div>
          <Section title="Pages Missing OG Tags" count={(socialData.missingOgTitle?.length || 0) + (socialData.missingOgDesc?.length || 0)}>
            {(socialData.allPages?.length || 0) > 0
              ? <DataTable columns={[
                  { key: "url", label: "URL" },
                  { key: "og_title", label: "og:title" },
                  { key: "og_description", label: "og:description" },
                  { key: "og_image", label: "og:image" },
                  { key: "twitter_card", label: "twitter:card" },
                ]} rows={socialData.allPages} />
              : <p className="text-xs text-text-dim py-3">All pages have social meta tags</p>}
          </Section>
        </div>
      )}

      {/* ══════════ TAB: IMAGES ══════════ */}
      {tab === "images" && imagesData && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatBadge label="Total Images" value={imagesData.totalImages} icon={<Image size={16} />} />
            <StatBadge label="Missing Alt" value={imagesData.missingAlt?.length || 0} color={(imagesData.missingAlt?.length || 0) > 0 ? "var(--yellow)" : "var(--green)"} />
            <StatBadge label="Not Lazy Loaded" value={imagesData.notLazy?.length || 0} color={(imagesData.notLazy?.length || 0) > 0 ? "var(--yellow)" : "var(--green)"} />
            <StatBadge label="Broken" value={imagesData.broken?.length || 0} color={(imagesData.broken?.length || 0) > 0 ? "var(--red)" : "var(--green)"} />
          </div>
          {imagesData.missingAlt?.length > 0 && (
            <Section title="Images Missing Alt Text" count={imagesData.missingAlt.length}>
              <DataTable columns={[{ key: "page_url", label: "Page" }, { key: "image_url", label: "Image URL" }]} rows={imagesData.missingAlt} />
            </Section>
          )}
        </div>
      )}

      {/* ══════════ TAB: PERFORMANCE ══════════ */}
      {tab === "performance" && perfData && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            <StatBadge label="Avg Response Time" value={`${perfData.avgResponseTime}ms`} icon={<Clock size={16} />} color={perfData.avgResponseTime <= 1000 ? "var(--green)" : "var(--yellow)"} />
            <StatBadge label="Slow Pages (>2.5s)" value={perfData.slowPages?.length || 0} icon={<Zap size={16} />} color={(perfData.slowPages?.length || 0) > 0 ? "var(--red)" : "var(--green)"} />
            <StatBadge label="PSI Cached" value={perfData.psiCache?.length || 0} />
          </div>
          {perfData.slowPages?.length > 0 && (
            <Section title="Slow Pages" count={perfData.slowPages.length}>
              <DataTable columns={[
                { key: "url", label: "URL" },
                { key: "response_time_ms", label: "Response (ms)", width: "110px" },
                { key: "page_size_kb", label: "Size (KB)", width: "90px" },
              ]} rows={perfData.slowPages} />
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
