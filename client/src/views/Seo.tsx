/**
 * SEO Dashboard — /seo
 *
 * Shows crawl history grouped by domain.
 * Routes:
 *   /seo                    → This page (history + new crawl)
 *   /seo/:domainSlug        → Domain overview (list of reports)
 *   /seo/:domainSlug/:reportId → Individual report with tabs
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { api, formatDate } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "../components/ui/delete-confirm-dialog";
import { Play, Globe, ExternalLink, Trash2 } from "lucide-react";

export interface CrawlSession {
  id: number;
  site_url: string;
  domain_slug: string;
  status: string;
  pages_crawled: number;
  total_pages: number;
  created_at: string;
  started_at: string;
  finished_at: string;
}

interface DomainGroup {
  domain_slug: string;
  site_url: string;
  reports: CrawlSession[];
}

export default function Seo() {
  const [crawlUrl, setCrawlUrl] = useState("https://ahmedlotfy.site");
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<CrawlSession[]>({
    queryKey: ["seo-audit", "sessions"],
    queryFn: () => api("/seo-audit/sessions"),
    refetchInterval: 5000,
  });

  const hasRunning = sessions.some(s => s.status === "running");

  const domainGroups = sessions.reduce<Record<string, DomainGroup>>((acc, s) => {
    const slug = s.domain_slug || "unknown";
    if (!acc[slug]) acc[slug] = { domain_slug: slug, site_url: s.site_url, reports: [] };
    acc[slug].reports.push(s);
    return acc;
  }, {});

  const startCrawlMut = useMutation({
    mutationFn: async () => api("/seo-audit/crawl", { method: "POST", body: JSON.stringify({ siteUrl: crawlUrl }) }),
    onSuccess: (data) => {
      toast.success(`Crawl started — Session #${data.sessionId}`);
      qc.invalidateQueries({ queryKey: ["seo-audit", "sessions"] });
      if (data.domainSlug) navigate({ to: "/seo/$domainSlug", params: { domainSlug: data.domainSlug } });
    },
    onError: (err: any) => toast.error("Failed to start crawl", { description: err?.message }),
  });

  const deleteSessionMut = useMutation({
    mutationFn: async (id: number) => api(`/seo-audit/sessions/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => { toast.success(`Deleted #${id}`); qc.invalidateQueries({ queryKey: ["seo-audit", "sessions"] }); },
    onError: (err: any, id) => toast.error(`Failed to delete #${id}`, { description: err?.message }),
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>🔍 SEO Audit Dashboard</h1>
          <div className="subtitle">Full-scope site audit — crawl, analyze, fix & monitor</div>
        </div>
      </div>

      <div className="card mb-24">
        <h3 className="mb-3">🕷️ Start New Crawl</h3>
        <div className="flex gap-sm">
          <Input value={crawlUrl} onChange={(e) => setCrawlUrl(e.target.value)} placeholder="https://your-site.com" className="flex-1" />
          <Button onClick={() => startCrawlMut.mutate()} disabled={startCrawlMut.isPending || !crawlUrl.trim()}>
            {startCrawlMut.isPending ? "Starting..." : <><Play className="w-3.5 h-3.5 mr-1" />Start Crawl</>}
          </Button>
        </div>
        {hasRunning && <div className="mt-3 flex items-center gap-2 text-xs text-accent"><span className="w-2 h-2 rounded-full bg-accent animate-pulse" />A crawl is running...</div>}
      </div>

      <div className="card">
        <div className="flex-between mb-3">
          <h3>📋 Crawl History</h3>
          {sessions.length > 0 && <span className="text-xs text-text-dim">{sessions.length} sessions · {Object.keys(domainGroups).length} domains</span>}
        </div>

        {sessionsLoading ? (
          <div className="loading-state p-5"><div className="loading-spinner" /></div>
        ) : sessions.length === 0 ? (
          <div className="empty-state p-8"><div className="icon">📭</div><p>No crawl sessions yet.</p></div>
        ) : (
          Object.values(domainGroups).map((group) => (
            <div key={group.domain_slug} className="mb-16">
              <div className="flex items-center gap-3 py-3 px-3 mb-2 rounded-lg bg-bg-deep/50 cursor-pointer hover:bg-bg-deep transition-colors"
                onClick={() => navigate({ to: "/seo/$domainSlug", params: { domainSlug: group.domain_slug } })}>
                <Globe className="w-4 h-4 text-accent" />
                <div className="flex-1">
                  <div className="text-sm font-semibold">{group.site_url.replace(/^https?:\/\//, "")}</div>
                  <div className="text-[11px] text-text-dim">{group.reports.length} report{group.reports.length !== 1 ? "s" : ""} · /seo/{group.domain_slug}</div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-text-dim" />
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th className="w-[50px]">#</th><th className="w-[90px]">Status</th><th>Pages</th><th>Started</th><th>Finished</th><th>Actions</th></tr></thead>
                  <tbody>
                    {group.reports.map((r, idx) => (
                      <tr key={r.id}>
                        <td className="font-semibold text-sm">{idx + 1}</td>
                        <td><StatusBadge status={r.status} /></td>
                        <td className="text-xs">{r.pages_crawled}{r.total_pages > 0 ? ` / ${r.total_pages}` : ""}</td>
                        <td className="text-xs text-text-dim">{formatDate(r.started_at || r.created_at)}</td>
                        <td className="text-xs text-text-dim">{r.finished_at ? formatDate(r.finished_at) : "—"}</td>
                        <td>
                          <div className="flex gap-[4px]">
                            {(r.status === "completed" || r.pages_crawled > 0) && (
                              <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/seo/$domainSlug/$reportId", params: { domainSlug: group.domain_slug, reportId: String(r.id) } })}>
                                <ExternalLink className="w-3.5 h-3.5 mr-1" />View
                              </Button>
                            )}
                            <DeleteConfirmDialog
                              title={`Delete Report #${idx + 1}`}
                              description={`Permanently delete report #${r.id} for ${group.site_url} (${r.pages_crawled} pages, issues, links). Cannot be undone.`}
                              confirmLabel="Delete"
                              loading={deleteSessionMut.isPending}
                              trigger={<Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></Button>}
                              onConfirm={() => deleteSessionMut.mutate(r.id)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c: Record<string, { label: string; cls: string }> = {
    completed: { label: "Done", cls: "badge-low" },
    running: { label: "Running", cls: "badge-medium" },
    error: { label: "Error", cls: "badge-urgent" },
    aborted: { label: "Aborted", cls: "badge-low" },
  };
  const cfg = c[status] || { label: status, cls: "badge-low" };
  return <span className={`badge ${cfg.cls} text-[10px] uppercase font-bold py-[1px] px-[6px] rounded`}>{cfg.label}</span>;
}
