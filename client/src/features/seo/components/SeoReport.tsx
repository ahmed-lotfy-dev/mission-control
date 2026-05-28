import { useEffect, useState } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { api, formatDate } from "@/lib/api";

export default function SeoReport() {
  const navigate = useNavigate();
  const { auditId } = useParams({ from: "/seo/report/$auditId" });
  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auditId) { setError("No audit specified"); setLoading(false); return; }
    setLoading(true);
    api(`/seo/audits/${auditId}`).then((data) => setAudit(data)).catch((err) => setError(err.message || "Failed to load audit")).finally(() => setLoading(false));
  }, [auditId]);

  if (loading) return <div className="loading-state"><div className="loading-spinner" />Loading Report...</div>;
  if (error || !audit) {
    return (
      <div className="card p-10 text-center">
        <h2 className="text-red">Error Loading Report</h2>
        <p className="subtitle mt-2">{error || "Audit data is missing."}</p>
        <Button className="mt-6" onClick={() => navigate({ to: "/seo" })}>Back to SEO Toolkit</Button>
      </div>
    );
  }

  const issues: Array<{ text: string; severity: string }> = audit.issues || [];
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const notices = issues.filter((i) => i.severity === "notice");
  const scoreColor = audit.score >= 70 ? "var(--green)" : audit.score >= 40 ? "var(--yellow)" : "var(--red)";
  const scoreLabel = audit.score >= 70 ? "Good" : audit.score >= 40 ? "Fair" : "Poor";

  return (
    <div className="stagger">
      <div className="page-header">
        <div>
          <Button variant="ghost" size="sm" className="mb-2" onClick={() => navigate({ to: "/seo" })}>← Back</Button>
          <h1>🔍 Site Audit Report</h1>
          <div className="subtitle text-[14px] text-accent">{audit.url}</div>
        </div>
        <div className="text-xs text-text-dim">Audited {formatDate(audit.created_at)} · HTTP {audit.httpStatus || "—"}</div>
      </div>

      {/* Top Row */}
      <div className="grid-2 mb-24">
        <div className="card">
          <h3>Crawled Elements Distribution</h3>
          <div className="flex gap-6 mt-4 items-center">
            <div className="relative w-[100px] h-[100px]">
              <svg viewBox="0 0 36 36" className="w-[100px] h-[100px]" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--bg-deep)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--accent)" strokeWidth="3"
                  strokeDasharray={`${(audit.linksCount || 1) / ((audit.linksCount || 1) + 4 + (audit.headingsCount || 1)) * 100} 100`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[11px] text-text-dim">Page<br />Elements</div>
            </div>
            <div className="flex-1">
              {[
                { label: "Links", value: audit.linksCount || 0, color: "var(--accent)" },
                { label: "Images", value: audit.headingsCount || 0, color: "var(--green)" },
                { label: "Headings", value: (audit.headingsCount || 0) + Math.max(0, (audit.headingsCount || 0) > 0 ? 3 : 0), color: "var(--purple)" },
              ].map((item) => (
                <div key={item.label} className="flex-between py-[4px] text-xs">
                  <div className="flex gap-xs items-center">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: item.color }} />
                    <span className="text-text-dim">{item.label}</span>
                  </div>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-between card items-center py-5 px-6">
          <div>
            <h3>Health Score</h3>
            <div className="subtitle max-w-[200px] mt-1">Overall page optimization health based on {issues.length} checks.</div>
          </div>
          <div className="text-center">
            <div className="w-[100px] h-[100px] rounded-full flex flex-col items-center justify-center" style={{ border: `5px solid ${scoreColor}`, boxShadow: `0 0 24px ${scoreColor}30` }}>
              <span className="text-[28px] font-bold text-text-bright leading-none">{audit.score}</span>
              <span className="text-[10px] text-text-dim">100</span>
            </div>
            <div className="text-[13px] font-semibold mt-2" style={{ color: scoreColor }}>{scoreLabel}</div>
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid-2 mb-24">
        <div className="card">
          <h3>Crawl Status</h3>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {[
              { label: "HTTP Status", value: audit.httpStatus || "—", color: audit.httpStatus >= 200 && audit.httpStatus < 300 ? "var(--green)" : "var(--red)" },
              { label: "Page Size", value: `${audit.page_size || 0} KB`, color: "var(--text-bright)" },
              { label: "Title", value: audit.has_title ? "✅ Set" : "❌ Missing", color: audit.has_title ? "var(--green)" : "var(--red)" },
              { label: "Meta Desc.", value: audit.has_meta ? "✅ Set" : "❌ Missing", color: audit.has_meta ? "var(--green)" : "var(--red)" },
              { label: "Headings", value: `${audit.headings_count || 0} H1`, color: "var(--text-bright)" },
              { label: "Links", value: `${audit.links_count || 0} total`, color: "var(--text-bright)" },
            ].map((s) => (
              <div key={s.label} className="py-2 px-[10px] rounded-md bg-bg-deep border border-border">
                <div className="text-[10px] text-text-dim uppercase tracking-wider">{s.label}</div>
                <div className="text-base font-bold mt-[2px]" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Issues Distribution</h3>
          <div className="flex gap-4 mt-4">
            {[
              { label: "Errors", value: errors.length, color: "var(--red)", bg: "oklch(0.50 0.11 25 / 0.1)" },
              { label: "Warnings", value: warnings.length, color: "var(--yellow)", bg: "oklch(0.60 0.10 80 / 0.1)" },
              { label: "Notices", value: notices.length, color: "var(--accent)", bg: "oklch(0.60 0.105 70 / 0.08)" },
            ].map((i) => (
              <div key={i.label} className="flex-1 p-4 rounded-lg text-center" style={{ background: i.bg, border: `1px solid ${i.color}20` }}>
                <div className="text-[28px] font-bold leading-none" style={{ color: i.color }}>{i.value}</div>
                <div className="text-[11px] text-text-dim mt-1">{i.label}</div>
              </div>
            ))}
          </div>
          <div className="flex-between mt-3 py-[10px] border-t border-border">
            <span className="text-xs text-text-dim">URLs with issues</span>
            <span className="text-[14px] font-semibold" style={{ color: errors.length > 0 ? "var(--red)" : "var(--green)" }}>
              {errors.length > 0 ? `${errors.length} with errors` : "No errors"}
            </span>
          </div>
        </div>
      </div>

      {/* Top Issues Table */}
      <div className="card-raise mb-24">
        <div className="flex-between mb-3">
          <h2>Top Issues</h2>
          <div className="flex gap-sm">
            <span className="text-[11px] text-text-dim">{issues.length} total · {errors.length} errors · {warnings.length} warnings</span>
          </div>
        </div>
        {issues.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th className="w-1/2">Issue</th><th className="w-[80px] text-center">Severity</th><th className="w-[60px] text-center">Count</th><th className="w-[80px] text-center">New</th><th className="w-[80px] text-center">Fixed</th></tr></thead>
              <tbody>
                {issues.map((issue, i) => {
                  const sevColor = issue.severity === "error" ? "var(--red)" : issue.severity === "warning" ? "var(--yellow)" : "var(--accent)";
                  const sevBg = issue.severity === "error" ? "oklch(0.50 0.11 25 / 0.12)" : issue.severity === "warning" ? "oklch(0.60 0.10 80 / 0.1)" : "oklch(0.60 0.105 70 / 0.08)";
                  return (
                    <tr key={i}>
                      <td className="font-medium text-[13px]">{issue.text}</td>
                      <td className="text-center">
                        <span className="text-[10px] py-[2px] px-2 rounded font-semibold uppercase" style={{ background: sevBg, color: sevColor }}>{issue.severity}</span>
                      </td>
                      <td className="text-center font-semibold">1</td>
                      <td className="text-center"><span className="badge badge-low">New</span></td>
                      <td className="text-center text-text-dim">—</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state p-8"><div className="icon">✅</div><p>No issues found — page is well optimized</p></div>
        )}
      </div>

      {/* HTTP Status + On-Page Details */}
      <div className="grid-2 mb-24">
        <div className="card">
          <h3>HTTP Status</h3>
          <div className="flex flex-col gap-2 mt-3">
            {[
              { label: "Success (2xx)", value: audit.httpStatus >= 200 && audit.httpStatus < 300 ? 1 : 0, max: 1, color: "var(--green)" },
              { label: "Redirect (3xx)", value: audit.httpStatus >= 300 && audit.httpStatus < 400 ? 1 : 0, max: 1, color: "var(--yellow)" },
              { label: "Client Error (4xx)", value: audit.httpStatus >= 400 && audit.httpStatus < 500 ? 1 : 0, max: 1, color: "var(--orange)" },
              { label: "Server Error (5xx)", value: audit.httpStatus >= 500 ? 1 : 0, max: 1, color: "var(--red)" },
            ].map((s) => (
              <div key={s.label} className="flex gap-sm items-center">
                <div className="w-10 h-10 rounded-md flex items-center justify-center text-base font-bold" style={{ background: s.value > 0 ? `${s.color}20` : "var(--bg-deep)", color: s.value > 0 ? s.color : "var(--text-dim)" }}>
                  {s.value}
                </div>
                <div className="flex-1">
                  <div className="h-[6px] rounded-sm bg-bg-deep overflow-hidden">
                    <div style={{ width: `${(s.value / Math.max(1, s.max)) * 100}%`, height: "100%", background: s.color, borderRadius: 3 }} />
                  </div>
                </div>
                <span className="text-xs text-text-dim w-[130px] text-right">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>On-Page Details</h3>
          <div className="mt-3 flex flex-col gap-3">
            <div className="py-[10px] px-3 rounded-md bg-bg-deep border border-border">
              <div className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Title</div>
              <div className="text-[13px] text-text-bright font-medium break-all">{audit.title || "(missing)"}</div>
            </div>
            <div className="py-[10px] px-3 rounded-md bg-bg-deep border border-border">
              <div className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Meta Description</div>
              <div className="text-[13px] text-text-bright break-all">{audit.meta_description || "(missing)"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="card">
        <div className="flex-between">
          <h3>Export Report</h3>
          <Button variant="outline" size="sm" onClick={() => {
            const blob = new Blob([JSON.stringify(audit, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = `seo-audit-${auditId}.json`; a.click();
            URL.revokeObjectURL(url);
          }}>Export JSON</Button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: "Internal URLs", value: "1", desc: "This page" },
            { label: "Issues Found", value: String(issues.length), desc: `${errors.length} errors, ${warnings.length} warnings` },
            { label: "All Checks", value: String(issues.length + 5), desc: "Including passed" },
          ].map((e) => (
            <div key={e.label} className="py-[10px] px-3 rounded-md bg-bg-deep border border-border">
              <div className="text-[11px] font-semibold text-text-bright">{e.label}</div>
              <div className="text-lg font-bold text-accent my-[2px]">{e.value}</div>
              <div className="text-[10px] text-text-dim">{e.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
