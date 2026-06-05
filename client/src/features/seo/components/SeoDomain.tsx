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
import { Trash2, ExternalLink, ArrowLeft, Globe, CheckCircle2, Clock } from "lucide-react";

interface DomainData { domain: string; site_url: string; report_count: number; reports: any[] }
interface CrawlProgress { sessionId: number; domainSlug: string; status: string; pagesCrawled: number; totalPages: number; currentUrl: string; score?: number; }

export default function SeoDomain() {
  const { domainSlug } = useParams({ from: "/seo/$domainSlug" });
  const navigate = useNavigate();
  const [crawlProgress, setCrawlProgress] = useState<CrawlProgress | null>(null);

  useEffect(() => {
    const unsub = onWs("crawl_progress", (data: CrawlProgress) => {
      if (data.domainSlug === domainSlug) {
        setCrawlProgress(data);
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
      const hasRunning = (data as any)?.reports?.some((r: any) => r.status === "running");
      return hasRunning ? 3000 : false;
    },
  });

  useEffect(() => {
    if (crawlProgress?.status === "completed") refetch();
  }, [crawlProgress?.status, refetch]);

  const handleDelete = async (reportId: number) => {
    try { await api(`/seo-audit/sessions/${reportId}`, { method: "DELETE" }); toast.success(`Report #${reportId} deleted`); refetch(); }
    catch (err: any) { toast.error("Failed to delete", { description: err?.message || "Unknown error" }); }
  };

  if (isLoading) return (
    <div className="loading-state p-10">
      <div className="loading-spinner" />
      <p className="text-text-dim mt-3 text-sm">Loading domain reports...</p>
    </div>
  );

  if (!domainData || domainData.report_count === 0) return (
    <div className="card p-10 text-center max-w-lg mx-auto mt-10">
      <h2 className="text-text-dim font-bold text-lg">No Reports Found</h2>
      <p className="subtitle mt-2">No crawl reports for <strong>{domainSlug}</strong></p>
      <Button className="mt-6" onClick={() => navigate({ to: "/seo" })}>
        <ArrowLeft size={14} className="mr-1" />Back to SEO Dashboard
      </Button>
    </div>
  );

  return (
    <div className="seo-report">
      {/* Header */}
      <div className="seo-header">
        <div className="seo-header-left">
          <Button variant="ghost" size="sm" className="seo-back-btn" onClick={() => navigate({ to: "/seo" })}>
            <ArrowLeft size={14} />
            <span>All Domains</span>
          </Button>
          <div className="seo-header-info">
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-accent" />
              <h1 className="seo-title">{domainData.site_url}</h1>
            </div>
            <div className="seo-meta">
              <span>{domainData.report_count} crawl report{domainData.report_count !== 1 ? "s" : ""}</span>
              <span className="seo-meta-dot">·</span>
              <span>Domain: {domainSlug}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Crawl Progress */}
      {crawlProgress?.status === "running" && (
        <div className="card mb-5 border-accent/30 bg-accent/5">
          <div className="flex-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-accent animate-pulse" />
              <span className="text-sm font-semibold text-accent">Crawl in progress — Session #{crawlProgress.sessionId}</span>
            </div>
            <span className="text-xs text-text-dim font-semibold">{crawlProgress.pagesCrawled} / {crawlProgress.totalPages} pages</span>
          </div>
          <div className="h-[6px] rounded-full bg-bg-deep overflow-hidden mb-2">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${crawlProgress.totalPages > 0 ? (crawlProgress.pagesCrawled / crawlProgress.totalPages) * 100 : 5}%` }}
            />
          </div>
          <div className="text-[11px] text-text-dim truncate">{crawlProgress.currentUrl || "Initializing..."}</div>
        </div>
      )}

      {/* Completion Banner */}
      {crawlProgress?.status === "completed" && (
        <div className="card mb-5 border-green-500/30 bg-green-500/5">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle2 size={18} />
            <span className="text-sm font-semibold">Crawl complete! {crawlProgress.pagesCrawled} pages analyzed.</span>
          </div>
        </div>
      )}

      {/* Reports List */}
      <div className="card">
        <h3 className="seo-card-title mb-3">Crawl Reports</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="w-[50px]">#</th>
                <th className="w-[90px]">Status</th>
                <th>Pages</th>
                <th>Started</th>
                <th className="hidden sm:table-cell">Finished</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {domainData.reports.map((r: any, idx: number) => (
                <tr key={r.id}>
                  <td className="font-semibold text-sm">{idx + 1}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="text-xs">{r.pages_crawled}{r.total_pages > 0 ? ` / ${r.total_pages}` : ""}</td>
                  <td className="text-xs text-text-dim">{formatDate(r.started_at || r.created_at)}</td>
                  <td className="text-xs text-text-dim hidden sm:table-cell">{r.finished_at ? formatDate(r.finished_at) : "—"}</td>
                  <td>
                    <div className="flex gap-1">
                      {(r.status === "completed" || r.pages_crawled > 0) && (
                        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/seo/$domainSlug/$reportId", params: { domainSlug, reportId: String(r.id) } })}>
                          <ExternalLink size={14} className="mr-1" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                      )}
                      <DeleteConfirmDialog
                        title={`Delete Report #${idx + 1}`}
                        description={`Permanently delete report #${r.id} for ${r.site_url} (${r.pages_crawled} pages). Cannot be undone.`}
                        confirmLabel="Delete"
                        trigger={<Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 size={14} /></Button>}
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
  const c: Record<string, { label: string; color: string; bg: string }> = {
    completed: { label: "Done", color: "var(--green)", bg: "rgba(34,197,94,0.08)" },
    running: { label: "Running", color: "var(--accent)", bg: "rgba(168,162,128,0.08)" },
    error: { label: "Error", color: "var(--red)", bg: "rgba(239,68,68,0.08)" },
    aborted: { label: "Aborted", color: "var(--text-dim)", bg: "var(--bg-raise)" },
  };
  const cfg = c[status] || { label: status, color: "var(--text-dim)", bg: "var(--bg-raise)" };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}
