/**
 * SEO Audit Dashboard — Route-based architecture
 *
 * /seo            → History + new crawl form (this file)
 * /seo/report/:id → Individual report with nested tabs (SeoReport.tsx)
 *
 * Each crawl session gets its own URL so data persists on navigation.
 * Tabs are sub-routes within the report, not local state.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { api, formatDate } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "../components/ui/delete-confirm-dialog";
import { Trash2, Play, ExternalLink } from "lucide-react";

interface CrawlSession {
  id: number;
  site_url: string;
  status: string;
  pages_crawled: number;
  total_pages: number;
  created_at: string;
  started_at: string;
  finished_at: string;
}

export default function Seo() {
  const [crawlUrl, setCrawlUrl] = useState("https://ahmedlotfy.site");
  const navigate = useNavigate();
  const qc = useQueryClient();

  // ── Queries ──
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<CrawlSession[]>({
    queryKey: ["seo-audit", "sessions"],
    queryFn: () => api("/seo-audit/sessions"),
    refetchInterval: 5000,
  });

  // Check if any session is still running
  const hasRunning = sessions.some(s => s.status === "running");

  // ── Mutations ──
  const startCrawlMut = useMutation({
    mutationFn: async () => {
      const res = await api("/seo-audit/crawl", {
        method: "POST",
        body: JSON.stringify({ siteUrl: crawlUrl }),
      });
      return res;
    },
    onSuccess: (data) => {
      toast.success(`Crawl started — Session #${data.sessionId}`);
      qc.invalidateQueries({ queryKey: ["seo-audit", "sessions"] });
      // Navigate to the new report
      navigate({ to: "/seo/report/$sessionId", params: { sessionId: String(data.sessionId) } });
    },
    onError: (err: any) => {
      toast.error("Failed to start crawl", { description: err?.message });
    },
  });

  const deleteSessionMut = useMutation({
    mutationFn: async (id: number) => {
      return api(`/seo-audit/sessions/${id}`, { method: "DELETE" });
    },
    onSuccess: (_, id) => {
      toast.success(`Session #${id} deleted`);
      qc.invalidateQueries({ queryKey: ["seo-audit", "sessions"] });
    },
    onError: (err: any, id) => {
      toast.error(`Failed to delete session #${id}`, {
        description: err?.message || "Server error",
      });
    },
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>🔍 SEO Audit Dashboard</h1>
          <div className="subtitle">Full-scope site audit — crawl, analyze, fix & monitor</div>
        </div>
      </div>

      {/* ── New Crawl Form ── */}
      <div className="card mb-24">
        <h3 className="mb-3">🕷️ Start New Crawl</h3>
        <div className="flex gap-sm">
          <Input
            value={crawlUrl}
            onChange={(e) => setCrawlUrl(e.target.value)}
            placeholder="https://your-site.com"
            className="flex-1"
          />
          <Button
            onClick={() => startCrawlMut.mutate()}
            disabled={startCrawlMut.isPending || !crawlUrl.trim()}
          >
            {startCrawlMut.isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Starting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Play className="w-3.5 h-3.5" />
                Start Crawl
              </span>
            )}
          </Button>
        </div>
        {hasRunning && (
          <div className="mt-3 flex items-center gap-2 text-xs text-accent">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            A crawl is currently running...
          </div>
        )}
      </div>

      {/* ── Crawl History ── */}
      <div className="card">
        <div className="flex-between mb-3">
          <h3>📋 Crawl History</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => qc.invalidateQueries({ queryKey: ["seo-audit", "sessions"] })}
          >
            ↻ Refresh
          </Button>
        </div>

        {sessionsLoading ? (
          <div className="loading-state p-5"><div className="loading-spinner" /></div>
        ) : sessions.length === 0 ? (
          <div className="empty-state p-8">
            <div className="icon">📭</div>
            <p>No crawl sessions yet. Start one above.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Site</th>
                  <th>Status</th>
                  <th>Pages</th>
                  <th>Started</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="font-semibold">#{s.id}</td>
                    <td className="text-xs max-w-[250px] truncate">{s.site_url}</td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="text-xs">
                      {s.pages_crawled}
                      {s.total_pages > 0 ? ` / ${s.total_pages}` : ""}
                    </td>
                    <td className="text-xs text-text-dim">
                      {formatDate(s.started_at || s.created_at)}
                    </td>
                    <td>
                      <div className="flex gap-[4px]">
                        {(s.status === "completed" || s.pages_crawled > 0) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate({
                              to: "/seo/report/$sessionId",
                              params: { sessionId: String(s.id) },
                            })}
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                            View
                          </Button>
                        )}
                        <DeleteConfirmDialog
                          title={`Delete Session #${s.id}`}
                          description={`This will permanently delete crawl session #${s.id} for ${s.site_url} and all its data (${s.pages_crawled} pages, issues, links, images). This cannot be undone.`}
                          confirmLabel="Delete"
                          loading={deleteSessionMut.isPending}
                          trigger={
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          }
                          onConfirm={() => deleteSessionMut.mutate(s.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Status Badge ──
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
