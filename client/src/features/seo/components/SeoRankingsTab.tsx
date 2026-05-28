import { useState } from "react";
import { api, formatDate } from "../../../lib/api";

interface RankEntry {
  id: number; keyword: string; position: number; url: string; check_date: string; notes: string;
}

interface SeoRankingsTabProps {
  ranks: RankEntry[];
  onRefresh: () => void;
}

export default function SeoRankingsTab({ ranks, onRefresh }: SeoRankingsTabProps) {
  const [rankKeyword, setRankKeyword] = useState("");
  const [rankUrl, setRankUrl] = useState("");
  const [checkingRank, setCheckingRank] = useState(false);
  const [rankHistory, setRankHistory] = useState<Array<{ date: string; position: number }> | null>(null);
  const [rankFilter, setRankFilter] = useState("");

  const checkRank = async () => {
    if (!rankKeyword.trim()) return;
    setCheckingRank(true); setRankHistory(null);
    try {
      const result = await api("/seo/ranks/check", { method: "POST", body: JSON.stringify({ keyword: rankKeyword.trim(), url: rankUrl.trim() || undefined, currentPosition: 15 }) });
      setRankHistory(result.history); onRefresh();
    } catch (e: any) { alert("Error: " + e.message); }
    finally { setCheckingRank(false); }
  };

  const filteredRanks = rankFilter ? ranks.filter((r) => r.keyword.toLowerCase().includes(rankFilter.toLowerCase())) : ranks;

  return (
    <div>
      <div className="card mb-24">
        <h3>Track Keyword Ranking</h3>
        <div className="form-row mt-12">
          <div className="form-group">
            <label>Keyword</label>
            <input value={rankKeyword} onChange={(e) => setRankKeyword(e.target.value)} placeholder="e.g. seo tools" />
          </div>
          <div className="form-group">
            <label>URL (optional)</label>
            <input value={rankUrl} onChange={(e) => setRankUrl(e.target.value)} placeholder="https://example.com" />
          </div>
        </div>
        <button className="btn btn-primary mt-12" onClick={checkRank} disabled={checkingRank}>
          {checkingRank ? "⏳ Checking..." : "📊 Check Ranking"}
        </button>

        {rankHistory && (
          <div className="card-raise mt-16">
            <h3>Position History (30 days)</h3>
            <div className="flex gap-sm mt-12 items-end min-h-[80px]">
              {rankHistory.map((r, i) => (
                <div key={i} className="flex-col flex-1 items-center gap-[2px]">
                  <div style={{ width: "100%", height: `${Math.max(8, 80 - r.position * 2.5)}px`, background: r.position <= 3 ? "var(--green)" : r.position <= 10 ? "var(--accent)" : "var(--text-dim)", borderRadius: "4px 4px 0 0", minHeight: 4, transition: "height 0.3s ease" }} />
                  <span className="text-[8px] text-text-dim whitespace-nowrap" style={{ transform: "rotate(-45deg)" }}>{r.date?.slice(5) || ""}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex-between mb-12">
          <h3>Ranking History</h3>
          <input placeholder="Filter by keyword..." value={rankFilter} onChange={(e) => setRankFilter(e.target.value)} className="max-w-[200px] text-xs py-[4px] px-2" />
        </div>
        {filteredRanks.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Keyword</th><th>Position</th><th>Date</th><th>URL</th></tr></thead>
              <tbody>
                {filteredRanks.map((r) => (
                  <tr key={r.id}>
                    <td className="font-semibold">{r.keyword}</td>
                    <td><span className={`badge badge-${r.position <= 3 ? "low" : r.position <= 10 ? "medium" : "high"}`}>#{r.position}</span></td>
                    <td className="text-xs text-text-dim">{formatDate(r.check_date)}</td>
                    <td className="text-xs text-text-dim max-w-[200px] overflow-hidden text-ellipsis">{r.url}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state p-5"><p>No ranking data yet. Check a keyword above.</p></div>
        )}
      </div>
    </div>
  );
}
