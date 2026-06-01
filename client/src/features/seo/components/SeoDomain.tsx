/**
 * Domain Overview — /seo/:domainSlug
 * Shows all crawl reports for a specific domain with live progress.
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api, formatDate, onWs } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { toast } from "sonner";
import { Trash2, ExternalLink, ArrowLeft, Globe } from "lucide-react";

interface DomainData { domain: string; site_url: string; report_count: number; reports: any[] }
interface CrawlProgress { sessionId: number; domainSlug: string; status: string; pagesCrawled: number; totalPages: number; currentUrl: string; score?: number; }

export default function SeoDomain() {
  const { domainSlug } = useParams({ from: "/seo/$domainSlug" });
  const navigate = useNavigate();
  const [crawlProgress, setCrawlProgress] = useState<CrawlProgress | null>(null);

  // Listen for real-time crawl progress via WebSocket
  useEffect(() => {
    const unsub = onWs("crawl_progress", (data: CrawlProgress) => {
      if (data.domainSlug === domainSlug) {
        setCrawlProgress(data);
        // When crawl completes, clear progress and refetch
        if (data.status === "completed") {
          setTimeout(() => setCrawlProgress(null), 2000);
        }
      }
    });
    return unsub;
  }, [domainSlug]);

  const { data: domainData, isLoading, refetch } = useQuery<DomainData>({
    queryKey: ["seo-audit", "domain", domainSlug],
    queryFn: () => api(`/seo-audit/domain/${domainSlug}`),
    enabled: !!domainSlug,
    refetchInterval: (data) => {
      const hasRunning = data?.reports?.some((r: any) => r.status === "running");
      return hasRunning ? 3000 : false;
    },
  });

  // Refetch when crawl completes via WS
  useEffect(() => {
    if (crawlProgress?.status === "completed") refetch();
  }, [crawlProgress?.status, refetch]);

  const hasRunning = domainData?.reports?.some((r: any) => r.status === "running") || crawlProgress?.status === "running" || false;

  const handleDelete = async (reportId: number) => {
    try { await api(`/seo-audit/sessions/${reportId}`, { method: "DELETE" }); toast.success(`Report #${reportId} deleted`); refetch(); }
    catch (err: any) { toast.error("Failed to delete", { description: err?.message }); }
  };

  if (isLoading) return <div className="loading-state p-10"><div className="loading-spinner" /><p className="text-text-dim mt-3">Loading domain reports...</p></div>;
  if (!domainData || domainData.report_count === 0) return (
    <div className="card p-10 text-center"><h2 className="text-text-dim">📭 No Reports Found</h2><p className="subtitle mt-2">No crawl reports for <strong>{domainSlug}</strong></p>
      <Button className="mt-6" onClick={() => navigate({ to: "/seo" })}><ArrowLeft className="w-3.5 h-3.5 mr-1" />Back to SEO Dashboard</Button></div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <Button variant="ghost" size="sm" className="mb-2" onClick={() => navigate({ to: "/seo" })}><ArrowLeft className="w-3.5 h-3.5 mr-1" />All Domains</Button>
          <h1 className="flex items-center gap-2"><Globe className="w-5 h-5 text-accent" />{domainData.site_url}</h1>
          <div className="subtitle">{domainData.report_count} crawl report{domainData.report_count !== 1 ? "s" : ""} · Domain: {domainSlug}</div>
        </div>
      </div>

      {/* ── Live Crawl Progress ── */}
      {crawlProgress?.status === "running" && (
        <div className="card mb-16 border-accent/30 bg-accent/5">
          <div className="flex-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-accent animate-pulse" />
              <span className="text-sm font-semibold text-accent">Crawl in progress — Session #{crawlProgress.sessionId}</span>
            </div>
            <span className="text-xs text-text-dim">{crawlProgress.pagesCrawled} / {crawlProgress.totalPages} pages</span>
          </div>
          <div className="h-[6px] rounded-sm bg-bg-deep overflow-hidden mb-2">
            <div className="h-full bg-accent rounded-sm transition-all duration-300" style={{ width: `${crawlProgress.totalPages > 0 ? (crawlProgress.pagesCrawled / crawlProgress.totalPages) * 100 : 5}%` }} />
          </div>
          <div className="text-[11px] text-text-dim truncate">{crawlProgress.currentUrl || "Initializing..."}</div>
        </div>
      )}

      {/* ── Completion Banner ── */}
      {crawlProgress?.status === "completed" && (
        <div className="card mb-16 border-green-500/30 bg-green-500/5">
          <div className="flex items-center gap-2 text-green-400">
            <span className="text-lg">✅</span>
            <span className="text-sm font-semibold">Crawl complete! {crawlProgress.pagesCrawled} pages analyzed.</span>
          </div>
        </div>
      )}

      {/* ── Reports List ── */}
      <div className="card">
        <div className="flex-between mb-3"><h3>📋 Crawl Reports</h3></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th className="w-[50px]">#</th><th className="w-[90px]">Status</th><th>Pages</th><th>Started</th><th>Finished</th><th>Actions</th></tr></thead>
            <tbody>
              {domainData.reports.map((r: any, idx: number) => (
                <tr key={r.id}>
                  <td className="font-semibold text-sm">{idx + 1}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="text-xs">{r.pages_crawled}{r.total_pages > 0 ? ` / ${r.total_pages}` : ""}</td>
                  <td className="text-xs text-text-dim">{formatDate(r.started_at || r.created_at)}</td>
                  <td className="text-xs text-text-dim">{r.finished_at ? formatDate(r.finished_at) : "—"}</td>
                  <td>
                    <div className="flex gap-[4px]">
                      {(r.status === "completed" || r.pages_crawled > 0) && (
                        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/seo/$domainSlug/$reportId", params: { domainSlug, reportId: String(r.id) } })}>
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />View Report
                        </Button>
                      )}
                      <DeleteConfirmDialog
                        title={`Delete Report #${idx + 1}`}
                        description={`Permanently delete report #${r.id} for ${r.site_url} (${r.pages_crawled} pages). Cannot be undone.`}
                        confirmLabel="Delete"
                        trigger={<Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></Button>}
                        onConfirm={() => handleDelete(r.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c: Record<string, { label: string; cls: string }> = { completed: { label: "Done", cls: "badge-low" }, running: { label: "Running", cls: "badge-medium" }, error: { label: "Error", cls: "badge-urgent" }, aborted: { label: "Aborted", cls: "badge-low" } };
  const cfg = c[status] || { label: status, cls: "badge-low" };
  return <span className={`badge ${cfg.cls} text-[10px] uppercase font-bold py-[1px] px-[6px] rounded`}>{cfg.label}</span>;
}
