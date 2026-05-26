import { useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, formatDate } from "../../../lib/api";

export default function SeoReport() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { auditId } = useParams({ from: "/seo/report/$auditId" });

  const { data: audit, isLoading, error } = useQuery({
    queryKey: ["seo", "audits", auditId],
    queryFn: () => api(`/seo/audits/${auditId}`),
    enabled: !!auditId,
    staleTime: 0,
  });

  const delMutation = useMutation({
    mutationFn: () => api(`/seo/audits/${auditId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seo", "audits"] });
      navigate({ to: "/seo" });
    },
  });

  const handleBack = () => navigate({ to: "/seo" });
  const handleDelete = () => { if (confirm("Delete this audit report?")) delMutation.mutate(); };

  if (isLoading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        Loading report...
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="card" style={{ padding: 40, textAlign: "center" }}>
        <h2 style={{ color: "var(--red)" }}>Report Not Found</h2>
        <p className="subtitle" style={{ marginTop: 8 }}>
          {(error as any)?.message || "This audit may have been deleted."}
        </p>
        <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={handleBack}>
          Back to SEO Toolkit
        </button>
      </div>
    );
  }

  const issuesList = (audit.issues || []) as string[];
  const scoreColor = audit.score >= 70 ? "var(--green)" : audit.score >= 40 ? "var(--yellow)" : "var(--red)";
  const scoreLabel = audit.score >= 70 ? "Good" : audit.score >= 40 ? "Fair" : "Poor";

  return (
    <div className="stagger">
      <div className="page-header">
        <div>
          <button className="btn btn-sm btn-ghost" style={{ marginBottom: 12 }} onClick={handleBack}>
            ← Back to SEO
          </button>
          <h1>🔍 SEO Audit Report</h1>
          <div className="subtitle" style={{ fontSize: 14, color: "var(--accent)", marginTop: 6 }}>
            {audit.url}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", paddingTop: 4 }}>
          <span style={{ fontSize: 11, color: "var(--text-dim)", alignSelf: "center" }}>
            Audited {formatDate(audit.created_at)}
          </span>
          <button className="btn btn-sm btn-danger" onClick={handleDelete} disabled={delMutation.isPending}>
            {delMutation.isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      <div className="grid-2 mb-24">
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2>Overall Score</h2>
            <div className="subtitle" style={{ marginTop: 6, maxWidth: 200 }}>
              Based on title, meta, headings, links, and page size.
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 16, fontSize: 12 }}>
              <span style={{ color: "var(--text-dim)" }}>
                H1s: <strong style={{ color: "var(--text-bright)" }}>{audit.headings_count}</strong>
              </span>
              <span style={{ color: "var(--text-dim)" }}>
                Links: <strong style={{ color: "var(--text-bright)" }}>{audit.links_count}</strong>
              </span>
              <span style={{ color: "var(--text-dim)" }}>
                Size: <strong style={{ color: "var(--text-bright)" }}>{audit.page_size} KB</strong>
              </span>
            </div>
          </div>
          <div style={{
            width: 110, height: 110, borderRadius: "50%",
            border: `5px solid ${scoreColor}`,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 28px ${scoreColor}40`, flexShrink: 0,
          }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: "var(--text-bright)", lineHeight: 1 }}>
              {audit.score}
            </span>
            <span style={{ fontSize: 10, color: scoreColor, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>
              {scoreLabel}
            </span>
          </div>
        </div>

        <div className="card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="stat-card">
            <div className="value">{audit.headings_count}</div>
            <div className="label">H1 Headings</div>
          </div>
          <div className="stat-card">
            <div className="value">{audit.links_count}</div>
            <div className="label">Total Links</div>
          </div>
          <div className="stat-card">
            <div className="value">{audit.page_size} KB</div>
            <div className="label">Page Size</div>
          </div>
          <div className="stat-card">
            <div className="value" style={{ color: scoreColor, fontSize: 20 }}>{scoreLabel}</div>
            <div className="label">Rating</div>
          </div>
        </div>
      </div>

      <div className="card-raise">
        <h2>Audit Findings</h2>
        <div className="section-divider">On-Page Elements</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
            <span style={{ color: "var(--text-dim)", fontSize: 12, minWidth: 140 }}>Page Title</span>
            <span style={{ color: audit.has_title ? "var(--green)" : "var(--red)", fontSize: 12, textAlign: "right", maxWidth: "65%", wordBreak: "break-all" }}>
              {audit.has_title ? "✅" : "❌"} {audit.title || "(not detected)"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 0" }}>
            <span style={{ color: "var(--text-dim)", fontSize: 12, minWidth: 140 }}>Meta Description</span>
            <span style={{ color: audit.has_meta ? "var(--green)" : "var(--red)", fontSize: 12, textAlign: "right", maxWidth: "65%", wordBreak: "break-all" }}>
              {audit.has_meta ? "✅" : "❌"} {audit.meta_description || "(not detected)"}
            </span>
          </div>
        </div>

        <div className="section-divider">Checks & Issues</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {issuesList.map((issue, i) => {
            const isPass = issue.toLowerCase().includes("passed");
            return (
              <div
                key={i}
                style={{
                  display: "flex", gap: 10, alignItems: "flex-start",
                  padding: "10px 14px", borderRadius: 6, fontSize: 13,
                  background: isPass ? "oklch(0.55 0.09 155 / 0.06)" : "oklch(0.50 0.11 25 / 0.06)",
                  border: `1px solid ${isPass ? "oklch(0.55 0.09 155 / 0.18)" : "oklch(0.50 0.11 25 / 0.18)"}`,
                  color: isPass ? "var(--green)" : "var(--text)",
                }}
              >
                <span style={{ fontWeight: 700, flexShrink: 0 }}>{isPass ? "✓" : "✗"}</span>
                <span>{issue}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
