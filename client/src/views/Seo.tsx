import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api, formatDate } from "../lib/api";
import { auditUrlSchema, keywordSchema, contentGenSchema, rankCheckSchema } from "../lib/schemas";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "../components/ui/form";
import type { AuditUrlInput, KeywordInput, ContentGenInput } from "../lib/schemas";

type SeoTab = "keywords" | "content" | "ranks" | "audit";
const TABS: Array<{ key: SeoTab; label: string; icon: string }> = [
  { key: "keywords", label: "Keywords", icon: "🔑" },
  { key: "content", label: "Content", icon: "✍️" },
  { key: "ranks", label: "Rankings", icon: "📊" },
  { key: "audit", label: "Audit", icon: "🔍" },
];

interface AuditResult {
  id: number; url: string; score: number; title: string; meta_description: string;
  headings_count: number; links_count: number; has_meta: number; has_title: number;
  page_size: number; issues: string[]; created_at: string;
}

// ── Hooks ──
const qk = (k: string[]) => ({ queryKey: k, queryFn: () => api(`/seo/${k[1]}`) });

export default function Seo() {
  const [tab, setTab] = useState<SeoTab>("audit");
  const navigate = useNavigate();
  const qc = useQueryClient();
  const inv = (keys: string[]) => qc.invalidateQueries({ queryKey: keys });

  // Queries
  const { data: keywords = [] } = useQuery(qk(["seo", "keywords"]));
  const { data: contentList = [] } = useQuery(qk(["seo", "content"]));
  const { data: ranks = [] } = useQuery(qk(["seo", "ranks"]));
  const { data: auditHistory = [], isLoading: auditLoading } = useQuery<AuditResult[]>(qk(["seo", "audits"]));

  // ── Audit Form (shadcn + zod) ──
  const auditForm = useForm<AuditUrlInput>({ resolver: zodResolver(auditUrlSchema) as any, defaultValues: { url: "", force: false } });
  const [auditCachedMsg, setAuditCachedMsg] = useState("");
  const auditMut = useMutation({
    mutationFn: (d: AuditUrlInput) => api(`/seo/audit?force=${d.force ? "true" : "false"}`, { method: "POST", body: JSON.stringify({ url: d.url }) }),
    onSuccess: (data) => {
      inv(["seo", "audits"]);
      if (data.cached) {
        setAuditCachedMsg(data.message);
        toast.info(data.message, { duration: 6000 });
      } else {
        setAuditCachedMsg("");
        toast.success(`Audit complete — score: ${data.score}/100`);
        navigate({ to: "/seo/report/$auditId", params: { auditId: String(data.id) } });
      }
    },
    onError: (e: Error) => toast.error(`Audit failed: ${e.message}`),
  });
  const delAuditMut = useMutation({
    mutationFn: (id: number) => api(`/seo/audits/${id}`, { method: "DELETE" }),
    onSuccess: () => { inv(["seo", "audits"]); toast.success("Audit deleted"); },
  });

  // ── Keyword Form ──
  const kwForm = useForm<KeywordInput>({ resolver: zodResolver(keywordSchema), defaultValues: { keyword: "", notes: "" } });
  const kwMut = useMutation({
    mutationFn: (d: KeywordInput) => api("/seo/keywords", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => { kwForm.reset(); inv(["seo", "keywords"]); toast.success("Keyword researched"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delKwMut = useMutation({
    mutationFn: (id: number) => api(`/seo/keywords/${id}`, { method: "DELETE" }),
    onSuccess: () => { inv(["seo", "keywords"]); toast.success("Keyword deleted"); },
  });

  // ── Content Form ──
  const cForm = useForm<ContentGenInput>({ resolver: zodResolver(contentGenSchema), defaultValues: { keyword: "", targetUrl: "" } });
  const cMut = useMutation({
    mutationFn: (d: ContentGenInput) => api("/seo/content", { method: "POST", body: JSON.stringify({ keyword: d.keyword, targetUrl: d.targetUrl || undefined }) }),
    onSuccess: () => { inv(["seo", "content"]); toast.success("Content generated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delContentMut = useMutation({
    mutationFn: (id: number) => api(`/seo/content/${id}`, { method: "DELETE" }),
    onSuccess: () => { inv(["seo", "content"]); toast.success("Content deleted"); },
  });

  // ── Rank Form ──
  const rForm = useForm<{ keyword: string; url?: string }>({ resolver: zodResolver(rankCheckSchema), defaultValues: { keyword: "", url: "" } });
  const [rankResult, setRankResult] = useState<any>(null);
  const rMut = useMutation({
    mutationFn: (d: { keyword: string; url?: string }) => api("/seo/ranks/check", { method: "POST", body: JSON.stringify({ ...d, currentPosition: 15 }) }),
    onSuccess: (data) => { setRankResult(data); inv(["seo", "ranks"]); toast.success(`Position: #${data.position}`); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [rankFilter, setRankFilter] = useState("");
  const filteredRanks = rankFilter ? ranks.filter((r: any) => r.keyword.toLowerCase().includes(rankFilter.toLowerCase())) : ranks;
  const busy = kwMut.isPending || cMut.isPending || rMut.isPending || auditMut.isPending;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>📈 SEO Toolkit</h1>
          <div className="subtitle">Keyword research, content generation, rank tracking & site audits</div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="card filter-bar mb-24">
        {TABS.map((t) => (
          <button key={t.key} className={`filter-pill${tab === t.key ? " active" : ""}`} onClick={() => { setTab(t.key); setRankResult(null); setAuditCachedMsg(""); }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ══════ KEYWORDS ══════ */}
      {tab === "keywords" && (
        <div className="grid-2">
          <div className="card">
            <h3>Add Keyword</h3>
            <Form {...kwForm}>
              <form onSubmit={kwForm.handleSubmit((d) => kwMut.mutate(d))} className="mt-12 space-y-3">
                <FormField name="keyword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keyword</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. seo tools" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" disabled={busy}>{kwMut.isPending ? "Researching..." : "Research"}</Button>
              </form>
            </Form>
          </div>
          <div className="card" style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            <h3>Saved Keywords</h3>
            {keywords.length > 0 ? keywords.map((k: any) => {
              const related = JSON.parse(k.related || "[]");
              return (
                <div key={k.id} className="border-b border-border py-3">
                  <div className="flex-between mb-8">
                    <span className="font-semibold text-[14px] text-text-bright">{k.keyword}</span>
                    <Button variant="ghost" size="sm" onClick={() => delKwMut.mutate(k.id)}>×</Button>
                  </div>
                  <div className="flex gap-lg text-xs text-text-dim mb-2">
                    <span>Volume: <strong className="text-text-bright">{k.volume?.toLocaleString()}</strong></span>
                    <span>Difficulty: <strong className={k.difficulty > 70 ? "text-red" : k.difficulty > 40 ? "text-yellow" : "text-green"}>{k.difficulty}%</strong></span>
                  </div>
                  <div className="flex flex-wrap gap-xs">{related.slice(0, 4).map((r: any, i: number) => (<span key={i} className="task-tag">{r.keyword}</span>))}</div>
                </div>
              );
            }) : <div className="empty-state p-5"><p>No keywords yet.</p></div>}
          </div>
        </div>
      )}

      {/* ══════ CONTENT ══════ */}
      {tab === "content" && (
        <div>
          <div className="card mb-24">
            <h3>Generate SEO Content</h3>
            <Form {...cForm}>
              <form onSubmit={cForm.handleSubmit((d) => cMut.mutate(d))} className="mt-12 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <FormField name="keyword" render={({ field }) => (
                    <FormItem><FormLabel>Keyword</FormLabel><FormControl><Input {...field} placeholder="e.g. seo tools" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField name="targetUrl" render={({ field }) => (
                    <FormItem><FormLabel>Target URL (optional)</FormLabel><FormControl><Input {...field} placeholder="https://example.com" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <Button type="submit" disabled={busy}>{cMut.isPending ? "⏳ Generating..." : "✍️ Generate Content"}</Button>
              </form>
            </Form>
            {cMut.data && (
              <div className="card-raise mt-16" style={{ animation: "statEnter 0.3s ease-out" }}>
                <div className="font-semibold text-[14px] text-text-bright mb-1">{cMut.data.title}</div>
                <div className="text-xs text-text-dim mb-3">{cMut.data.metaDescription}</div>
                <div className="text-[11px] text-accent mb-2 uppercase tracking-widest font-semibold">Headings</div>
                {(cMut.data.headings || []).map((h: string, i: number) => (<div key={i} className="text-xs text-text py-[3px]">H{Math.min(i + 1, 3)}: {h}</div>))}
                <div className="text-[11px] text-text-dim mt-3">Words: ~{cMut.data.wordCount}</div>
              </div>
            )}
          </div>
          <div className="card">
            <h3>Generated Content History</h3>
            {contentList.length > 0 ? (
              <div className="table-wrap mt-12"><table>
                <thead><tr><th>Keyword</th><th>Title</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>{contentList.map((c: any) => (
                  <tr key={c.id}>
                    <td className="font-semibold">{c.keyword}</td>
                    <td className="text-xs max-w-[300px] truncate">{c.title}</td>
                    <td><span className="badge badge-low">{c.status}</span></td>
                    <td className="text-xs text-text-dim">{formatDate(c.created_at)}</td>
                    <td>
                      <div className="table-actions flex gap-[6px]">
                        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/seo/content/$contentId", params: { contentId: String(c.id) } })}>View</Button>
                        <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); delContentMut.mutate(c.id); }}>×</Button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table></div>
            ) : <div className="empty-state p-5"><p>No content generated yet.</p></div>}
          </div>
        </div>
      )}

      {/* ══════ RANKINGS ══════ */}
      {tab === "ranks" && (
        <div>
          <div className="card mb-24">
            <h3>Track Keyword Ranking</h3>
            <Form {...rForm}>
              <form onSubmit={rForm.handleSubmit((d) => rMut.mutate(d))} className="mt-12 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <FormField name="keyword" render={({ field }) => (
                    <FormItem><FormLabel>Keyword</FormLabel><FormControl><Input {...field} placeholder="e.g. seo tools" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField name="url" render={({ field }) => (
                    <FormItem><FormLabel>URL (optional)</FormLabel><FormControl><Input {...field} value={field.value || ""} placeholder="https://example.com" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <Button type="submit" disabled={busy}>{rMut.isPending ? "⏳ Checking..." : "📊 Check Ranking"}</Button>
              </form>
            </Form>
            {rankResult?.history && (
              <div className="card-raise mt-16">
                <h3>Position — #{rankResult.position}</h3>
                <div className="flex gap-sm mt-12 items-end min-h-[80px]">
                  {rankResult.history.map((r: any, i: number) => (
                    <div key={i} className="flex-col flex-1 items-center gap-[2px]">
                      <div style={{ width: "100%", height: `${Math.max(8, 80 - r.position * 2.5)}px`, background: r.position <= 3 ? "var(--green)" : r.position <= 10 ? "var(--accent)" : "var(--text-dim)", borderRadius: "4px 4px 0 0", minHeight: 4 }} />
                      <span className="text-[8px] text-text-dim whitespace-nowrap">{r.date?.slice(5)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="card">
            <div className="flex-between mb-12">
              <h3>Ranking History</h3>
              <Input placeholder="Filter..." value={rankFilter} onChange={(e) => setRankFilter(e.target.value)} className="max-w-[200px] h-8 text-xs" />
            </div>
            {filteredRanks.length > 0 ? (
              <div className="table-wrap"><table>
                <thead><tr><th>Keyword</th><th>Position</th><th>Date</th><th>URL</th></tr></thead>
                <tbody>{filteredRanks.map((r: any) => (
                  <tr key={r.id}>
                    <td className="font-semibold">{r.keyword}</td>
                    <td><span className={`badge badge-${r.position <= 3 ? "low" : r.position <= 10 ? "medium" : "high"}`}>#{r.position}</span></td>
                    <td className="text-xs text-text-dim">{formatDate(r.check_date)}</td>
                    <td className="text-xs text-text-dim max-w-[20px] overflow-hidden text-ellipsis">{r.url}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            ) : <div className="empty-state p-5"><p>No ranking data yet.</p></div>}
          </div>
        </div>
      )}

      {/* ══════ AUDIT ══════ */}
      {tab === "audit" && (
        <div>
          <div className="card mb-24">
            <h3>Site Audit</h3>
            <Form {...auditForm}>
              <form onSubmit={auditForm.handleSubmit((d) => { setAuditCachedMsg(""); auditMut.mutate(d); })} className="mt-12 space-y-3">
                <FormField name="url" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website URL</FormLabel>
                    <FormControl><Input {...field} placeholder="https://example.com" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex items-center gap-4">
                  <Button type="submit" disabled={busy}>{auditMut.isPending ? "⏳ Scanning..." : "🔍 Run Audit"}</Button>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={auditForm.watch("force")} onChange={(e) => auditForm.setValue("force", e.target.checked)} />
                    ⚡ Force re-audit
                  </label>
                </div>
              </form>
            </Form>
            {auditCachedMsg && (
              <div className="mt-4 p-3 rounded-md border bg-yellow-950/20 border-yellow-800/30 text-yellow-500 text-sm flex items-center gap-3">
                <span>⚠️</span>
                <span className="flex-1">{auditCachedMsg}</span>
                <Button variant="outline" size="sm" onClick={() => { auditForm.setValue("force", true); setAuditCachedMsg(""); auditMut.mutate({ url: auditForm.getValues("url"), force: true }); }}>
                  Force anyway
                </Button>
              </div>
            )}
          </div>
          <div className="card">
            <h3>Audit History</h3>
            {auditLoading ? (
              <div className="loading-state p-5"><div className="loading-spinner" /></div>
            ) : auditHistory.length > 0 ? (
              <div className="table-wrap mt-12"><table>
                <thead><tr><th>URL</th><th>Score</th><th>Issues</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>{auditHistory.map((a) => (
                  <tr
                    key={a.id}
                    className="cursor-pointer transition-[background] duration-150"
                    onClick={() => navigate({ to: "/seo/report/$auditId", params: { auditId: String(a.id) } })}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-surface)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <td className="font-semibold truncate whitespace-nowrap max-w-[250px]">{a.url}</td>
                    <td><span className={`badge badge-${a.score >= 70 ? "low" : a.score >= 40 ? "medium" : "urgent"}`}>{a.score}/100</span></td>
                    <td className="text-xs text-text-dim">{(a.issues || []).length} issues</td>
                    <td className="text-xs text-text-dim">{formatDate(a.created_at)}</td>
                    <td>
                      <div className="flex gap-[6px]" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/seo/report/$auditId", params: { auditId: String(a.id) } })}>View</Button>
                        <Button variant="destructive" size="sm" onClick={() => delAuditMut.mutate(a.id)}>×</Button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table></div>
            ) : <div className="empty-state p-5"><p>No audits yet. Run one above.</p></div>}
          </div>
        </div>
      )}
    </div>
  );
}
