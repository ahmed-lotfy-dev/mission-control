import { useEffect, useState } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { api, formatDate } from "../../../lib/api";

export default function SeoReport() {
  const navigate = useNavigate();
  const { auditId } = useParams({ from: "/seo/report/$auditId" });
  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auditId) {
      setError("No audit specified");
      setLoading(false);
      return;
    }
    setLoading(true);
    api(`/seo/audits/${auditId}`)
      .then((data) => setAudit(data))
      .catch((err) => setError(err.message || "Failed to load audit"))
      .finally(() => setLoading(false));
  }, [auditId]);

  const handleBack = () => {
    navigate({ to: "/seo" });
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        Loading Report...
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="card text-center" style={{ padding: 40 }}>
        <h2 style={{ color: "var(--red)" }}>Error Loading Report</h2>
        <p className="subtitle mt-8">{error || "Audit data is missing."}</p>
        <button className="btn btn-primary mt-24" onClick={handleBack}>
          Back to SEO Toolkit
        </button>
      </div>
    );
  }

  const issuesList = JSON.parse(audit.issues || "[]") as string[];
  const scoreColor = audit.score >= 70 ? "var(--green)" : audit.score >= 40 ? "var(--yellow)" : "var(--red)";

  return (
    <div className="stagger">
      <div className="page-header">
        <div>
          <button className="btn btn-sm btn-ghost mb-8" onClick={handleBack}>
            ← Back
          </button>
          <h1>🔍 SEO Audit Report</h1>
          <div className="subtitle" style={{ fontSize: 14, color: "var(--accent)" }}>
            {audit.url}
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
          Audited on {formatDate(audit.created_at)}
        </div>
      </div>

      <div className="grid-2 mb-24">
        <div className="card flex-between" style={{ alignItems: "center" }}>
          <div>
            <h2>SEO Score</h2>
            <div className="subtitle" style={{ maxWidth: 220 }}>
              Overall optimization health score based on key on-page elements.
            </div>
          </div>
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: "50%",
              border: `5px solid ${scoreColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 700,
              color: "var(--text-bright)",
              boxShadow: `0 0 20px ${scoreColor}40`,
            }}
          >
            {audit.score}
          </div>
        </div>

        <div className="card grid-2" style={{ gap: 16 }}>
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
            <div className="value">{audit.score >= 70 ? "Good" : audit.score >= 40 ? "Fair" : "Poor"}</div>
            <div className="label">Rating</div>
          </div>
        </div>
      </div>

      <div className="card-raise">
        <h2>Detailed Audit Findings</h2>
        <div className="section-divider">On-Page Elements</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-bright)", marginBottom: 6 }}>
              Page Title {audit.has_title ? "✅" : "❌"}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", fontFamily: "monospace", wordBreak: "break-all" }}>
              {audit.title || "(no title tag detected)"}
            </div>
          </div>

          <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-bright)", marginBottom: 6 }}>
              Meta Description {audit.has_meta ? "✅" : "❌"}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", fontFamily: "monospace", wordBreak: "break-all" }}>
              {audit.meta_description || "(no meta description tag detected)"}
            </div>
          </div>
        </div>

        <div className="section-divider">Action Items & Issues</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {issuesList.map((issue, index) => {
            const isPass = issue.includes("passed");
            return (
              <div
                key={index}
                className="flex gap-sm"
                style={{
                  padding: "10px 12px",
                  borderRadius: 6,
                  background: isPass ? "oklch(0.55 0.09 155 / 0.05)" : "oklch(0.50 0.11 25 / 0.05)",
                  border: `1px solid ${isPass ? "oklch(0.55 0.09 155 / 0.15)" : "oklch(0.50 0.11 25 / 0.15)"}`,
                  fontSize: 12.5,
                  color: isPass ? "var(--green)" : "var(--text)",
                }}
              >
                <span style={{ fontWeight: "bold" }}>{isPass ? "✓" : "✗"}</span>
                <span>{issue}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
