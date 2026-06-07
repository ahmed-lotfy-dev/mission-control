import { useEffect, useState } from "react"
import { Search, RefreshCw, FileText, X, Folder } from "lucide-react"
import { api, type VaultNote, type DashboardData, timeAgo } from "../lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { StatCard } from "@/components/StatCard"
import { PageHeader } from "@/components/PageHeader"
import { LoadingState } from "@/components/LoadingState"
import { EmptyState } from "@/components/EmptyState"

export default function Vault() {
  const [notes, setNotes] = useState<VaultNote[]>([])
  const [stats, setStats] = useState<DashboardData["vault"] & { folders: Record<string, number> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<VaultNote[] | null>(null)

  const load = () => {
    setLoading(true)
    Promise.all([
      api<VaultNote[]>("/vault/notes"),
      api<any>("/vault/stats"),
    ]).then(([n, s]) => {
      setNotes(n)
      setStats(s)
    }).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const sync = async () => {
    setSyncing(true)
    try {
      await api("/vault/sync", { method: "POST" })
      load()
    } finally {
      setSyncing(false)
    }
  }

  const handleSearch = (q: string) => {
    setSearch(q)
    if (!q.trim()) { setResults(null); return }
    api<VaultNote[]>(`/vault/search?q=${encodeURIComponent(q)}`).then(setResults)
  }

  if (loading) return <LoadingState text="Loading vault..." />

  const display = results ?? notes
  const topFolders = stats ? Object.entries(stats.folders).slice(0, 8) : []

  return (
    <div className="main-content-inner page-enter">
      <PageHeader
        title="Obsidian Vault"
        subtitle={`${stats?.total ?? 0} notes indexed`}
        action={{
          label: syncing ? "Syncing..." : "Sync Vault",
          icon: <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />,
          onClick: sync,
        }}
      />

      {/* Folder Stats */}
      {topFolders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 stagger">
          {topFolders.map(([folder, count]) => (
            <Card key={folder} className="card-hoverable cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-bold text-text-bright">
                      {count}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-text-dim mt-1 truncate flex items-center gap-1">
                      <Folder className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{folder}</span>
                    </div>
                  </div>
                  <FileText className="h-4 w-4 text-text-dim/40 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Search Bar */}
      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <Search className="h-4 w-4 text-text-dim flex-shrink-0" />
            <Input
              placeholder="Search notes..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 px-0 h-8"
            />
            {search && (
              <Button variant="ghost" size="sm" onClick={() => handleSearch("")} className="h-7 px-2">
                <X className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}
            {results && (
              <Badge variant="secondary" className="text-[10px]">
                {results.length} result{results.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes List */}
      <Card className="card-raise">
        {display.length > 0 ? (
          <div className="stagger">
            {display.slice(0, 100).map((n, idx) => (
              <div
                key={n.id}
                className="flex items-center gap-3 py-3 px-4 transition-all duration-150 hover:bg-bg-hover border-b border-border last:border-b-0 card-hoverable rounded-none"
                style={{ animationDelay: `${idx * 0.03}s` }}
              >
                <span className="text-lg flex-shrink-0">📄</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-text-bright truncate">{n.title}</div>
                  <div className="text-[11px] text-text-dim truncate">
                    {n.folder}/{n.path.split("/").pop()}
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">
                  {timeAgo(n.last_modified)}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="🧠"
            title={results ? "No notes found" : "No notes indexed"}
            description={results ? "Try a different search term" : 'Click "Sync Vault" to index your Obsidian vault'}
            action={!results ? { label: "Sync Vault", onClick: sync } : undefined}
          />
        )}
      </Card>
    </div>
  )
}
