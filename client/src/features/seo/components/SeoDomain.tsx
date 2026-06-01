/**
 * Domain Overview — /seo/:domainSlug
 *
 * Shows all crawl reports for a specific domain.
 * Example: /seo/ahmedlotfy-site → lists all reports for ahmedlotfy.site
 */
import { useParams, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api, formatDate } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { toast } from "sonner";
import { Trash2, ExternalLink, Plus, ArrowLeft, Globe } from "lucide-react";

interface DomainData {
  domain: string;
  site_url: string;
  report_count: number;
  reports: Array<{
    id: number;
    site_url: string;
    domain_slug: string;
    status: string;
    pages_crawled: number;
    total_pages: number;
    started_at: string;
    finished_at: string;
    created_at: string;
  }>;
}

export default function SeoDomain() {
  const { domainSlug } = useParams({ from: "/seo/$domainSlug" });
  const navigate = useNavigate();

  const { data: domainData, isLoading, refetch } = useQuery<DomainData>({
    queryKey: ["seo-audit", "domain", domainSlug],
    queryFn: () => api(`/seo-audit/domain/${domainSlug}`),
    enabled: !!domainSlug,
    refetchInterval: (data) => {
      // Poll every 3s if any report is still running
      const hasRunning = data?.reports?.some(r => r.status === "running");
      return hasRunning ? 3000 : false;
    },
  });

  // Check if any report is currently running (for UI indicator)
  const hasRunning = domainData?.reports?.some(r => r.status === "running") || false;

  const handleDelete = async (reportId: number) => {
    try {
      await api(`/seo-audit/sessions/${reportId}`, { method: "DELETE" });
      toast.success(`Report #${reportId} deleted`);
      refetch();
    } catch (err: any) {
      toast.error("Failed to delete", { description: err?.message });
    }
  };

  if (isLoading) {
    return (
      <div className="loading-state p-10">
        <div className="loading-spinner" />
        <p className="text-text-dim mt-3">Loading domain reports...</p>
      </div>
    );
  }

  if (!domainData || domainData.report_count === 0) {
    return (
      <div className="card p-10 text-center">
        <h2 className="text-text-dim">📭 No Reports Found</h2>
        <p className="subtitle mt-2">No crawl reports for <strong>{domainSlug}</strong></p>
        <Button className="mt-6" onClick={() => navigate({ to: "/seo" })}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to SEO Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <Button variant="ghost" size="sm" className="mb-2" onClick={() => navigate({ to: "/seo" })}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            All Domains
          </Button>
          <h1 className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-accent" />
            {domainData.site_url}
          </h1>
          <div className="subtitle">
            {domainData.report_count} crawl report{domainData.report_count !== 1 ? "s" : ""} · Domain: {domainSlug}
          </div>
        </div>
      </div>

      {/* ── Reports List ── */}
      {hasRunning && (
        <div className="card mb-16 border-accent/30 bg-accent/5">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-accent animate-pulse" />
            <span className="text-sm text-accent">Crawl in progress... Results will appear automatically when complete.</span>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex-between mb-3">
          <h3>📋 Crawl Reports</h3>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Status</th>
                <th>Pages</th>
                <th>Started</th>
                <th>Finished</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {domainData.reports.map((report, idx) => (
                <tr key={report.id}>
                  <td className="font-semibold">{idx + 1}</td>
                  <td>
                    <StatusBadge status={report.status} />
                  </td>
                  <td className="text-xs">
                    {report.pages_crawled}
                    {report.total_pages > 0 ? ` / ${report.total_pages}` : ""}
                  </td>
                  <td className="text-xs text-text-dim">
                    {formatDate(report.started_at || report.created_at)}
                  </td>
                  <td className="text-xs text-text-dim">
                    {report.finished_at ? formatDate(report.finished_at) : "—"}
                  </td>
                  <td>
                    <div className="flex gap-[4px]">
                      {(report.status === "completed" || report.pages_crawled > 0) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate({
                            to: "/seo/$domainSlug/$reportId",
                            params: { domainSlug, reportId: String(report.id) },
                          })}
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                          View Report
                        </Button>
                      )}
                      <DeleteConfirmDialog
                        title={`Delete Report #${idx + 1}`}
                        description={`This will permanently delete crawl report #${report.id} for ${report.site_url} and all its data (${report.pages_crawled} pages, issues, links, images). This cannot be undone.`}
                        confirmLabel="Delete"
                        trigger={
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        }
                        onConfirm={() => handleDelete(report.id)}
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
  const config: Record<string, { label: string; cls: string }> = {
    completed: { label: "Completed", cls: "badge-low" },
    running: { label: "Running", cls: "badge-medium" },
    error: { label: "Error", cls: "badge-urgent" },
    aborted: { label: "Aborted", cls: "badge-low" },
    idle: { label: "Idle", cls: "badge-low" },
  };
  const c = config[status] || { label: status, cls: "badge-low" };
  return <span className={`badge ${c.cls} text-[10px] uppercase font-bold py-[1px] px-[6px] rounded`}>{c.label}</span>;
}
