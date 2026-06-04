import { useEffect, useState, useRef } from "react";
import { api } from "../lib/api";

interface AnalyticsOverview {
  contentItems: number; calendarEvents: number; socialPosts: number;
  publishedSocial: number; draftContent: number; publishedContent: number;
  totalWords: number; avgWords: number;
}
interface AnalyticsData {
  overview: AnalyticsOverview;
  byType: Array<{ type: string; count: number }>;
  byPlatform: Array<{ platform: string; count: number }>;
  recentActivity: { contentThisWeek: number; postsThisWeek: number };
  timeseries: Array<{
    date: string; content: number; posts: number;
    engagement: number; reach: number;
  }>;
}

const PLATFORM_COLORS: Record<string, string> = {
  blog: "#3b82f6", x: "#1d9bf0", instagram: "#e1306c",
  linkedin: "#0077b5", tiktok: "#ff0050", facebook: "#1877f2",
  email: "#f59e0b",
};
const TYPE_COLORS: Record<string, string> = {
  blog: "#3b82f6", social: "#8b5cf6", ad: "#f59e0b",
  email: "#10b981", product: "#ef4444",
};

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const engagementRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    api<AnalyticsData>("/content-gen/analytics")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  // Draw charts when data arrives
  useEffect(() => {
    if (!data?.timeseries?.length) return;

    // Content + Posts chart
    if (chartRef.current) {
      drawChart(chartRef.current, data.timeseries, [
        { key: "content", color: "#3b82f6", label: "Content" },
        { key: "posts", color: "#8b5cf6", label: "Posts" },
      ]);
    }

    // Engagement + Reach chart
    if (engagementRef.current) {
      drawChart(engagementRef.current, data.timeseries, [
        { key: "engagement", color: "#10b981", label: "Engagement" },
        { key: "reach", color: "#f59e0b", label: "Reach" },
      ]);
    }
  }, [data]);

  if (loading) return <div className="loading-state"><div className="loading-spinner" />Loading analytics...</div>;
  if (!data) return <div className="empty-state"><div className="icon">📊</div><p>Failed to load analytics</p></div>;

  const o = data.overview;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>📊 Analytics</h1>
          <div className="subtitle">Content performance, engagement metrics, and growth tracking</div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid-4 mb-24">
        <div className="stat-card accent-gold">
          <span className="value">{o.contentItems}</span>
          <div className="label">Content Items</div>
        </div>
        <div className="stat-card accent-purple">
          <span className="value">{o.socialPosts}</span>
          <div className="label">Social Posts</div>
        </div>
        <div className="stat-card accent-green">
          <span className="value">{o.totalWords.toLocaleString()}</span>
          <div className="label">Total Words</div>
        </div>
        <div className="stat-card accent-gold">
          <span className="value">{o.publishedContent + o.publishedSocial}</span>
          <div className="label">Published</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-2 mb-24">
        <div className="card">
          <div className="section-label">Content & Posts (30 days)</div>
          <canvas ref={chartRef} style={{ width: "100%", height: 200 }} />
        </div>
        <div className="card">
          <div className="section-label">Engagement & Reach (30 days)</div>
          <canvas ref={engagementRef} style={{ width: "100%", height: 200 }} />
        </div>
      </div>

      {/* Content Breakdown + Platform Stats */}
      <div className="grid-2 mb-24">
        {/* Content by Type */}
        <div className="card">
          <div className="section-label">Content by Type</div>
          <div className="mt-spacing-md">
            {data.byType.length > 0 ? data.byType.map(item => {
              const pct = o.contentItems > 0 ? (item.count / o.contentItems) * 100 : 0;
              return (
                <div key={item.type} className="mb-3">
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="font-semibold">{item.type}</span>
                    <span className="text-text-dim">{item.count}</span>
                  </div>
                  <div className="h-2 rounded-sm overflow-hidden bg-border">
                    <div style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: TYPE_COLORS[item.type] || "var(--accent)",
                      borderRadius: 3,
                      transition: "width 0.6s var(--ease-out)",
                    }} />
                  </div>
                </div>
              );
            }) : (
              <div className="text-[12px] text-text-dim">No content yet</div>
            )}
          </div>
        </div>

        {/* Posts by Platform */}
        <div className="card">
          <div className="section-label">Posts by Platform</div>
          <div className="mt-spacing-md">
            {data.byPlatform.length > 0 ? data.byPlatform.map(item => {
              const pct = o.socialPosts > 0 ? (item.count / o.socialPosts) * 100 : 0;
              return (
                <div key={item.platform} className="mb-3">
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="font-semibold">{item.platform}</span>
                    <span className="text-text-dim">{item.count}</span>
                  </div>
                  <div className="h-2 rounded-sm overflow-hidden bg-border">
                    <div style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: PLATFORM_COLORS[item.platform] || "var(--accent)",
                      borderRadius: 3,
                      transition: "width 0.6s var(--ease-out)",
                    }} />
                  </div>
                </div>
              );
            }) : (
              <div className="text-[12px] text-text-dim">No posts yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Activity This Week + Pipeline */}
      <div className="grid-2">
        <div className="card">
          <div className="section-label">This Week</div>
          <div className="mt-spacing-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-[36px]">📝</div>
              <div>
                <div className="font-[Unbounded] text-2xl font-bold">{data.recentActivity.contentThisWeek}</div>
                <div className="text-[11px] text-text-dim">content pieces created</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-[36px]">📱</div>
              <div>
                <div className="font-[Unbounded] text-2xl font-bold">{data.recentActivity.postsThisWeek}</div>
                <div className="text-[11px] text-text-dim">social posts created</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-label">Content Pipeline</div>
          <div className="mt-spacing-md">
            <div className="grid-3 gap-3 text-center">
              <div>
                <div className="font-[Unbounded] text-2xl font-bold text-[var(--yellow)]">{o.draftContent}</div>
                <div className="text-[10px] text-text-dim">Drafts</div>
              </div>
              <div>
                <div className="font-[Unbounded] text-2xl font-bold text-[var(--accent)]">{o.calendarEvents}</div>
                <div className="text-[10px] text-text-dim">Scheduled</div>
              </div>
              <div>
                <div className="font-[Unbounded] text-2xl font-bold text-[var(--green)]">{o.publishedContent + o.publishedSocial}</div>
                <div className="text-[10px] text-text-dim">Published</div>
              </div>
            </div>
            <div className="pipeline-bar mt-spacing-lg">
              {[
                { v: o.draftContent, c: "var(--yellow)" },
                { v: o.calendarEvents, c: "var(--accent)" },
                { v: o.publishedContent + o.publishedSocial, c: "var(--green)" },
              ].map((seg, i) => {
                const total = o.draftContent + o.calendarEvents + o.publishedContent + o.publishedSocial || 1;
                return <div key={i} className="pipeline-segment" style={{ width: `${(seg.v / total) * 100}%`, background: seg.c }} />;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Canvas Chart Drawing ──
function drawChart(
  canvas: HTMLCanvasElement,
  data: Array<Record<string, any>>,
  series: Array<{ key: string; color: string; label: string }>,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Set canvas size for retina
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;
  const PAD = { top: 20, right: 10, bottom: 30, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Clear
  ctx.fillStyle = "transparent";
  ctx.fillRect(0, 0, W, H);

  // Find max value across all series
  let maxVal = 0;
  for (const s of series) {
    for (const d of data) {
      maxVal = Math.max(maxVal, d[s.key] || 0);
    }
  }
  maxVal = Math.max(maxVal, 1);

  // Grid lines
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + (chartH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(W - PAD.right, y);
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "10px system-ui";
    ctx.textAlign = "right";
    const val = Math.round(maxVal * (1 - i / 4));
    ctx.fillText(String(val), PAD.left - 6, y + 4);
  }

  // Draw each series
  for (const s of series) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const points: Array<[number, number]> = [];
    for (let i = 0; i < data.length; i++) {
      const x = PAD.left + (chartW * i) / (data.length - 1 || 1);
      const val = data[i][s.key] || 0;
      const y = PAD.top + chartH * (1 - val / maxVal);
      points.push([x, y]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Fill area under curve
    ctx.fillStyle = s.color + "18";
    ctx.beginPath();
    ctx.moveTo(points[0][0], PAD.top + chartH);
    for (const [x, y] of points) ctx.lineTo(x, y);
    ctx.lineTo(points[points.length - 1][0], PAD.top + chartH);
    ctx.closePath();
    ctx.fill();
  }

  // X-axis date labels (show every 5th day)
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "9px system-ui";
  ctx.textAlign = "center";
  for (let i = 0; i < data.length; i += 5) {
    const x = PAD.left + (chartW * i) / (data.length - 1 || 1);
    const label = data[i].date?.slice(5) || ""; // MM-DD
    ctx.fillText(label, x, H - 8);
  }

  // Legend
  let legendX = PAD.left;
  ctx.font = "10px system-ui";
  for (const s of series) {
    ctx.fillStyle = s.color;
    ctx.fillRect(legendX, H - 8, 12, 3);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.textAlign = "left";
    ctx.fillText(s.label, legendX + 16, H - 4);
    legendX += ctx.measureText(s.label).width + 30;
  }
}
