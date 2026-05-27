import { useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, formatDate } from "../../../lib/api";

export default function SeoContentPreview() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { contentId } = useParams({ from: "/seo/content/$contentId" });

  const { data: content, isLoading, error } = useQuery({
    queryKey: ["seo", "content", contentId],
    queryFn: () => api(`/seo/content/${contentId}`),
    enabled: !!contentId,
    staleTime: 0,
  });

  const delMutation = useMutation({
    mutationFn: () => api(`/seo/content/${contentId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seo", "content"] });
      navigate({ to: "/seo" });
    },
  });

  const handleBack = () => navigate({ to: "/seo" });
  const handleDelete = () => {
    if (confirm("Delete this content?")) delMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        Loading content...
      </div>
    );
  }

  if (error || !content || content.error) {
    return (
      <div className="card" style={{ padding: 40, textAlign: "center" }}>
        <h2 style={{ color: "var(--red)" }}>Content Not Found</h2>
        <p className="subtitle" style={{ marginTop: 8 }}>
          {(error as any)?.message || content?.error || "This content may have been deleted."}
        </p>
        <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={handleBack}>
          Back to SEO Toolkit
        </button>
      </div>
    );
  }

  const headings: string[] = content.headings || [];
  const bodyText: string = content.body || "";

  return (
    <div className="stagger">
      <div className="page-header">
        <div>
          <button className="btn btn-sm btn-ghost" style={{ marginBottom: 12 }} onClick={handleBack}>
            ← Back to SEO
          </button>
          <h1>✍️ Content Preview</h1>
          <div className="subtitle" style={{ fontSize: 14, color: "var(--accent)", marginTop: 6 }}>
            {content.keyword}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", paddingTop: 4 }}>
          <span style={{ fontSize: 11, color: "var(--text-dim)", alignSelf: "center" }}>
            Generated {formatDate(content.created_at)}
          </span>
          <button className="btn btn-sm btn-danger" onClick={handleDelete} disabled={delMutation.isPending}>
            {delMutation.isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      {/* Metadata Card */}
      <div className="grid-2 mb-24">
        <div className="card">
          <h2>SEO Metadata</h2>
          <div style={{ marginTop: 16 }}>
            <div className="section-divider">Title</div>
            <p style={{ color: "var(--text-bright)", fontSize: 15, fontWeight: 600, marginTop: 8 }}>
              {content.title}
            </p>
            <div className="section-divider" style={{ marginTop: 20 }}>Meta Description</div>
            <p style={{ color: "var(--text)", fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
              {content.meta_description}
            </p>
          </div>
          {content.target_url && (
            <div style={{ marginTop: 16, fontSize: 12, color: "var(--text-dim)" }}>
              Target URL: <span style={{ color: "var(--accent)" }}>{content.target_url}</span>
            </div>
          )}
        </div>
        <div className="card">
          <h2>Content Stats</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <div className="stat-card">
              <div className="value">{headings.length}</div>
              <div className="label">Headings</div>
            </div>
            <div className="stat-card">
              <div className="value">{content.word_count || bodyText.split(/\s+/).filter(Boolean).length}</div>
              <div className="label">Words</div>
            </div>
            <div className="stat-card">
              <div className="value">
                {Math.ceil((bodyText.length || 0) / 1000)} KB
              </div>
              <div className="label">Size</div>
            </div>
            <div className="stat-card">
              <div className="value" style={{ color: "var(--green)", fontSize: 20 }}>{content.status}</div>
              <div className="label">Status</div>
            </div>
          </div>
        </div>
      </div>

      {/* Headings Outline */}
      <div className="card-raise mb-24">
        <h2>Article Outline</h2>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
          {headings.map((h: string, i: number) => {
            const isH1 = h.startsWith("H1:");
            const isH2 = h.startsWith("H2:");
            const isH3 = h.startsWith("H3:");
            const label = isH1 ? "H1" : isH2 ? "H2" : "H3";
            const color = isH1 ? "var(--accent)" : isH2 ? "var(--text-bright)" : "var(--text-dim)";
            const text = h.replace(/^H[123]:\s*/, "");
            return (
              <div
                key={i}
                style={{
                  display: "flex", gap: 10, alignItems: "center",
                  padding: "8px 14px", borderRadius: 6, fontSize: 13,
                  background: "oklch(0.50 0.02 250 / 0.04)",
                  border: "1px solid oklch(0.50 0.02 250 / 0.08)",
                  marginLeft: isH3 ? 24 : isH2 ? 12 : 0,
                }}
              >
                <span style={{
                  fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.08em", color, flexShrink: 0,
                  background: `${color}18`, padding: "2px 6px", borderRadius: 4,
                }}>
                  {label}
                </span>
                <span style={{ color: "var(--text)" }}>{text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Body */}
      <div className="card-raise">
        <h2>Full Article</h2>
        <div className="section-divider">Body Content</div>
        <div
          style={{
            marginTop: 16, fontSize: 14, lineHeight: 1.8,
            color: "var(--text)", maxWidth: 720,
          }}
        >
          {bodyText.split("\n").map((para: string, i: number) => (
            para.trim() ? (
              <p key={i} style={{ marginBottom: 12, textIndent: para.trim().length > 50 ? "1.5em" : 0 }}>
                {para}
              </p>
            ) : <br key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}