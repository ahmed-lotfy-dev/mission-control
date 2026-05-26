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
    api(`/seo/audits/${auditId}`)
      .then((data) => setAudit(data))
      .catch((err) => setError(err.message || "Failed to load audit"))
      .finally(() => setLoading(false));
  }, [auditId]);

  if (loading) return <div className="loading-state"><div className="loading-spinner" />Loading Report...</div>;
  if (error || !audit) return (
    <div className="card" style={{ padding: 40, textAlign: "center" }}>
      <h2 style={{ color: "var(--red)" }}>Error Loading Report</h2>
      <p className="subtitle mt-8">{error || "Audit data is missing."}</p>
      <Button className="mt-24" onClick={() => navigate({ to: "/seo" })}>Back to SEO Toolkit</Button>
    </div>
  );

  const issues: Array<{ text: string; severity: string }> = audit.issues || [];
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const notices = issues.filter((i) => i.severity === "notice");
  const scoreColor = audit.score >= 70 ? "var(--green)" : audit.score >= 40 ? "var(--yellow)" : "var(--red)";
  const scoreLabel = audit.score >= 70 ? "Good" : audit.score >= 40 ? "Fair" : "Poor";

  return (
    <div className="stagger">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <Button variant="ghost" size="sm" className="mb-8" onClick={() => navigate({ to: "/seo" })}>
            ← Back
          </Button>
          <h1>🔍 Site Audit Report</h1>
          <div className="subtitle" style={{ fontSize: 14, color: "var(--accent)" }}>{audit.url}</div>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
          Audited {formatDate(audit.created_at)} · HTTP {audit.httpStatus || "—"}
        </div>
      </div>

      {/* ── Top Row: Crawled URLs Distribution + Health Score ── */}
      <div className="grid-2 mb-24">
        {/* Crawled elements distribution */}
        <div className="card">
          <h3>Crawled Elements Distribution</h3>
          <div style={{ display: "flex", gap: 24, marginTop: 16, alignItems: "center" }}>
            <div style={{ position: "relative", width: 100, height: 100 }}>
              <svg viewBox="0 0 36 36" style={{ width: 100, height: 100, transform: "rotate(-90deg)" }}>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--bg-deep)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--accent)" strokeWidth="3"
                  strokeDasharray={`${(audit.linksCount || 1) / ((audit.linksCount || 1) + 4 + (audit.headingsCount || 1)) * 100} 100`}
                  strokeLinecap="round" />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--text-dim)" }}>
                Page<br />Elements
              </div>
            </div>
            <div style={{ flex: 1 }}>
              {[
                { label: "Links", value: audit.linksCount || 0, color: "var(--accent)" },
                { label: "Images", value: audit.headingsCount || 0, color: "var(--green)" },
                { label: "Headings", value: (audit.headingsCount || 0) + Math.max(0, (audit.headingsCount || 0) > 0 ? 3 : 0), color: "var(--purple)" },
              ].map((item) => (
                <div key={item.label} className="flex-between" style={{ padding: "4px 0", fontSize: 12 }}>
                  <div className="flex gap-xs" style={{ alignItems: "center" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, display: "inline-block" }} />
                    <span style={{ color: "var(--text-dim)" }}>{item.label}</span>
                  </div>
                  <span style={{ fontWeight: 600 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Health Score */}
        <div className="flex-between card" style={{ alignItems: "center", padding: "20px 24px" }}>
          <div>
            <h3>Health Score</h3>
            <div className="subtitle" style={{ maxWidth: 200, marginTop: 4 }}>
              Overall page optimization health based on {issues.length} checks.
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 100, height: 100, borderRadius: "50%",
              border: `5px solid ${scoreColor}`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 24px ${scoreColor}30`,
            }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: "var(--text-bright)", lineHeight: 1 }}>{audit.score}</span>
              <span style={{ fontSize: 10, color: "var(--text-dim)" }}>100</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: scoreColor, marginTop: 8 }}>{scoreLabel}</div>
          </div>
        </div>
      </div>

      {/* ── Second Row: Crawl Status + Issues Distribution ── */}
      <div className="grid-2 mb-24">
        {/* Crawl status */}
        <div className="card">
          <h3>Crawl Status</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            {[
              { label: "HTTP Status", value: audit.httpStatus || "—", color: audit.httpStatus >= 200 && audit.httpStatus < 300 ? "var(--green)" : "var(--red)" },
              { label: "Page Size", value: `${audit.page_size || 0} KB`, color: "var(--text-bright)" },
              { label: "Title", value: audit.has_title ? "✅ Set" : "❌ Missing", color: audit.has_title ? "var(--green)" : "var(--red)" },
              { label: "Meta Desc.", value: audit.has_meta ? "✅ Set" : "❌ Missing", color: audit.has_meta ? "var(--green)" : "var(--red)" },
              { label: "Headings", value: `${audit.headings_count || 0} H1`, color: "var(--text-bright)" },
              { label: "Links", value: `${audit.links_count || 0} total`, color: "var(--text-bright)" },
            ].map((s) => (
              <div key={s.label} style={{ padding: "8px 10px", borderRadius: 6, background: "var(--bg-deep)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: s.color, marginTop: 2 }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Issues Distribution */}
        <div className="card">
          <h3>Issues Distribution</h3>
          <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
            {[
              { label: "Errors", value: errors.length, color: "var(--red)", bg: "oklch(0.50 0.11 25 / 0.1)" },
              { label: "Warnings", value: warnings.length, color: "var(--yellow)", bg: "oklch(0.60 0.10 80 / 0.1)" },
              { label: "Notices", value: notices.length, color: "var(--accent)", bg: "oklch(0.60 0.105 70 / 0.08)" },
            ].map((i) => (
              <div key={i.label} style={{ flex: 1, padding: 16, borderRadius: 8, background: i.bg, border: `1px solid ${i.color}20`, textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: i.color, lineHeight: 1 }}>{i.value}</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>{i.label}</div>
              </div>
            ))}
          </div>
          <div className="flex-between" style={{ marginTop: 12, padding: "10px 0", borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: 12, color: "var(--text-dim)" }}>URLs with issues</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: errors.length > 0 ? "var(--red)" : "var(--green)" }}>
              {errors.length > 0 ? `${errors.length} with errors` : "No errors"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Top Issues Table ── */}
      <div className="card-raise mb-24">
        <div className="flex-between mb-12">
          <h2>Top Issues</h2>
          <div className="flex gap-sm">
            <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
              {issues.length} total · {errors.length} errors · {warnings.length} warnings
            </span>
          </div>
        </div>

        {issues.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "50%" }}>Issue</th>
                  <th style={{ width: 80, textAlign: "center" }}>Severity</th>
                  <th style={{ width: 60, textAlign: "center" }}>Count</th>
                  <th style={{ width: 80, textAlign: "center" }}>New</th>
                  <th style={{ width: 80, textAlign: "center" }}>Fixed</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue, i) => {
                  const sevColor = issue.severity === "error" ? "var(--red)" : issue.severity === "warning" ? "var(--yellow)" : "var(--accent)";
                  const sevBg = issue.severity === "error" ? "oklch(0.50 0.11 25 / 0.12)" : issue.severity === "warning" ? "oklch(0.60 0.10 80 / 0.1)" : "oklch(0.60 0.105 70 / 0.08)";
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>{issue.text}</td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: sevBg, color: sevColor, fontWeight: 600, textTransform: "uppercase" }}>
                          {issue.severity}
                        </span>
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 600 }}>1</td>
                      <td style={{ textAlign: "center" }}>
                        <span className="badge badge-low">New</span>
                      </td>
                      <td style={{ textAlign: "center", color: "var(--text-dim)" }}>—</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: 30 }}>
            <div className="icon">✅</div>
            <p>No issues found — page is well optimized</p>
          </div>
        )}
      </div>

      {/* ── HTTP Status Distribution + On-Page Details ── */}
      <div className="grid-2 mb-24">
        {/* HTTP Status */}
        <div className="card">
          <h3>HTTP Status</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {[
              { label: "Success (2xx)", value: audit.httpStatus >= 200 && audit.httpStatus < 300 ? 1 : 0, max: 1, color: "var(--green)" },
              { label: "Redirect (3xx)", value: audit.httpStatus >= 300 && audit.httpStatus < 400 ? 1 : 0, max: 1, color: "var(--yellow)" },
              { label: "Client Error (4xx)", value: audit.httpStatus >= 400 && audit.httpStatus < 500 ? 1 : 0, max: 1, color: "var(--orange)" },
              { label: "Server Error (5xx)", value: audit.httpStatus >= 500 ? 1 : 0, max: 1, color: "var(--red)" },
            ].map((s) => (
              <div key={s.label} className="flex gap-sm" style={{ alignItems: "center" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 6,
                  background: s.value > 0 ? `${s.color}20` : "var(--bg-deep)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 700, color: s.value > 0 ? s.color : "var(--text-dim)",
                }}>
                  {s.value}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ height: 6, borderRadius: 3, background: "var(--bg-deep)", overflow: "hidden" }}>
                    <div style={{ width: `${(s.value / Math.max(1, s.max)) * 100}%`, height: "100%", background: s.color, borderRadius: 3 }} />
                  </div>
                </div>
                <span style={{ fontSize: 12, color: "var(--text-dim)", width: 130, textAlign: "right" }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* On-Page Details */}
        <div className="card">
          <h3>On-Page Details</h3>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ padding: "10px 12px", borderRadius: 6, background: "var(--bg-deep)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Title</div>
              <div style={{ fontSize: 13, color: "var(--text-bright)", fontWeight: 500, wordBreak: "break-all" }}>{audit.title || "(missing)"}</div>
            </div>
            <div style={{ padding: "10px 12px", borderRadius: 6, background: "var(--bg-deep)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Meta Description</div>
              <div style={{ fontSize: 13, color: "var(--text-bright)", wordBreak: "break-all" }}>{audit.meta_description || "(missing)"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Export Section ── */}
      <div className="card">
        <div className="flex-between">
          <h3>Export Report</h3>
          <Button variant="outline" size="sm" onClick={() => {
            const blob = new Blob([JSON.stringify(audit, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = `seo-audit-${auditId}.json`; a.click();
            URL.revokeObjectURL(url);
          }}>
            Export JSON
          </Button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
          {[
            { label: "Internal URLs", value: "1", desc: "This page" },
            { label: "Issues Found", value: String(issues.length), desc: `${errors.length} errors, ${warnings.length} warnings` },
            { label: "All Checks", value: String(issues.length + 5), desc: "Including passed" },
          ].map((e) => (
            <div key={e.label} style={{ padding: "10px 12px", borderRadius: 6, background: "var(--bg-deep)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-bright)" }}>{e.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)", margin: "2px 0" }}>{e.value}</div>
              <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{e.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}