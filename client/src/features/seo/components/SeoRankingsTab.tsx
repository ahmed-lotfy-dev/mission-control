import { useState } from "react";
import { api, formatDate } from "../../../lib/api";

interface RankEntry {
  id: number;
  keyword: string;
  position: number;
  url: string;
  check_date: string;
  notes: string;
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

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRankKeyword(e.target.value);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRankUrl(e.target.value);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRankFilter(e.target.value);
  };

  const checkRank = async () => {
    if (!rankKeyword.trim()) return;
    setCheckingRank(true);
    setRankHistory(null);
    try {
      const result = await api("/seo/ranks/check", {
        method: "POST",
        body: JSON.stringify({
          keyword: rankKeyword.trim(),
          url: rankUrl.trim() || undefined,
          currentPosition: 15,
        }),
      });
      setRankHistory(result.history);
      onRefresh();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setCheckingRank(false);
    }
  };

  const filteredRanks = rankFilter
    ? ranks.filter((r) => r.keyword.toLowerCase().includes(rankFilter.toLowerCase()))
    : ranks;

  return (
    <div>
      <div className="card mb-24">
        <h3>Track Keyword Ranking</h3>
        <div className="form-row mt-12">
          <div className="form-group">
            <label>Keyword</label>
            <input
              value={rankKeyword}
              onChange={handleKeywordChange}
              placeholder="e.g. seo tools"
            />
          </div>
          <div className="form-group">
            <label>URL (optional)</label>
            <input
              value={rankUrl}
              onChange={handleUrlChange}
              placeholder="https://example.com"
            />
          </div>
        </div>
        <button className="btn btn-primary mt-12" onClick={checkRank} disabled={checkingRank}>
          {checkingRank ? "⏳ Checking..." : "📊 Check Ranking"}
        </button>

        {rankHistory && (
          <div className="card-raise mt-16">
            <h3>Position History (30 days)</h3>
            <div className="flex gap-sm mt-12" style={{ alignItems: "flex-end", minHeight: 80 }}>
              {rankHistory.map((r, i) => (
                <div key={i} className="flex-col" style={{ flex: 1, alignItems: "center", gap: 2 }}>
                  <div
                    style={{
                      width: "100%",
                      height: `${Math.max(8, 80 - r.position * 2.5)}px`,
                      background:
                        r.position <= 3
                          ? "var(--green)"
                          : r.position <= 10
                          ? "var(--accent)"
                          : "var(--text-dim)",
                      borderRadius: "4px 4px 0 0",
                      minHeight: 4,
                      transition: "height 0.3s ease",
                    }}
                  />
                  <span style={{ fontSize: 8, color: "var(--text-dim)", transform: "rotate(-45deg)", whiteSpace: "nowrap" }}>
                    {r.date?.slice(5) || ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex-between mb-12">
          <h3>Ranking History</h3>
          <input
            placeholder="Filter by keyword..."
            value={rankFilter}
            onChange={handleFilterChange}
            style={{ maxWidth: 200, fontSize: 12, padding: "4px 8px" }}
          />
        </div>
        {filteredRanks.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>Position</th>
                  <th>Date</th>
                  <th>URL</th>
                </tr>
              </thead>
              <tbody>
                {filteredRanks.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.keyword}</td>
                    <td>
                      <span className={`badge badge-${r.position <= 3 ? "low" : r.position <= 10 ? "medium" : "high"}`}>
                        #{r.position}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text-dim)" }}>
                      {formatDate(r.check_date)}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text-dim)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.url}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: 20 }}>
            <p>No ranking data yet. Check a keyword above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
