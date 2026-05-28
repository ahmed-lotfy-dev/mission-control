import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { api, formatDate } from "../../../lib/api";

interface AuditResult {
  id: number; url: string; score: number; title: string; meta_description: string;
  headings_count: number; links_count: number; has_meta: number; has_title: number;
  page_size: number; issues: string; created_at: string;
}

interface SeoAuditTabProps {
  auditHistory: AuditResult[];
  onRefresh: () => void;
}

export default function SeoAuditTab({ auditHistory, onRefresh }: SeoAuditTabProps) {
  const navigate = useNavigate();
  const [auditUrl, setAuditUrl] = useState("");
  const [auditing, setAuditing] = useState(false);

  const runAudit = async () => {
    if (!auditUrl.trim()) return;
    setAuditing(true);
    try {
      const result = await api("/seo/audit", { method: "POST", body: JSON.stringify({ url: auditUrl.trim() }) });
      onRefresh();
      navigate({ to: "/seo/report/$auditId", params: { auditId: String(result.id) } });
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setAuditing(false);
    }
  };

  return (
    <div>
      <div className="card mb-24">
        <h3>Site Audit</h3>
        <div className="flex gap-sm mt-12">
          <input value={auditUrl} onChange={(e) => setAuditUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runAudit()} placeholder="https://example.com" />
          <button className="btn btn-primary" onClick={runAudit} disabled={auditing}>
            {auditing ? "⏳ Scanning..." : "🔍 Run Audit"}
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Audit History</h3>
        {auditHistory.length > 0 ? (
          <div className="table-wrap mt-12">
            <table>
              <thead><tr><th>URL</th><th>Score</th><th>Issues</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {auditHistory.map((a) => {
                  let issuesCount = 0;
                  try { issuesCount = (JSON.parse(a.issues || "[]") as string[]).length; } catch {}
                  return (
                    <tr key={a.id}>
                      <td className="font-semibold truncate whitespace-nowrap max-w-[250px]">{a.url}</td>
                      <td><span className={`badge badge-${a.score >= 70 ? "low" : a.score >= 40 ? "medium" : "urgent"}`}>{a.score}/100</span></td>
                      <td className="text-xs text-text-dim">{issuesCount} issues</td>
                      <td className="text-xs text-text-dim">{formatDate(a.created_at)}</td>
                      <td>
                        <div className="flex gap-[6px]">
                          <button className="btn btn-sm btn-ghost" onClick={() => navigate({ to: "/seo/report/$auditId", params: { auditId: String(a.id) } })}>View</button>
                          <button className="btn btn-sm btn-danger" onClick={async () => { if (!confirm("Delete this audit report?")) return; try { await api(`/seo/audits/${a.id}`, { method: "DELETE" }); onRefresh(); } catch (e: any) { alert("Error: " + e.message); } }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state p-5"><p>No audits yet. Run one above.</p></div>
        )}
      </div>
    </div>
  );
}
