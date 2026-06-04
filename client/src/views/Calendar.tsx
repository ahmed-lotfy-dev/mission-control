import { useEffect, useState } from "react";
import { api, formatDate } from "../lib/api";

const PLATFORM_COLORS: Record<string, string> = {
  blog: "#3b82f6", x: "#1d9bf0", instagram: "#e1306c",
  linkedin: "#0077b5", tiktok: "#ff0050", facebook: "#1877f2",
  email: "#f59e0b", youtube: "#ff0000",
};
const PLATFORM_ICONS: Record<string, string> = {
  blog: "📝", x: "𝕏", instagram: "📷", linkedin: "💼",
  tiktok: "🎵", facebook: "📘", email: "✉️", youtube: "▶️",
};
const EVENT_TYPES = [
  { key: "post", label: "Post", icon: "📝" },
  { key: "story", label: "Story", icon: "📸" },
  { key: "reel", label: "Reel", icon: "🎬" },
  { key: "video", label: "Video", icon: "🎥" },
  { key: "article", label: "Article", icon: "📰" },
  { key: "campaign", label: "Campaign", icon: "🎯" },
];

interface CalendarEvent {
  id: number; title: string; type: string; platform: string;
  status: string; scheduled_at: string; body: string;
  tags: string; created_at: string;
}

export default function Calendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState<"month" | "week">("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Form
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("post");
  const [formPlatform, setFormPlatform] = useState("blog");
  const [formDate, setFormDate] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formTags, setFormTags] = useState("");

  const load = () => {
    setLoading(true);
    api<CalendarEvent[]>("/content-gen/calendar").then(setEvents).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const addEvent = async () => {
    if (!formTitle.trim()) return;
    await api("/content-gen/calendar", {
      method: "POST",
      body: JSON.stringify({
        title: formTitle, type: formType, platform: formPlatform,
        scheduledAt: formDate || undefined, body: formBody,
        tags: formTags.split(",").map(t => t.trim()).filter(Boolean),
      }),
    });
    setShowModal(false);
    setFormTitle(""); setFormBody(""); setFormTags("");
    load();
  };

  const updateStatus = async (id: number, status: string) => {
    await api(`/content-gen/calendar/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  };

  const deleteEvent = async (id: number) => {
    await api(`/content-gen/calendar/${id}`, { method: "DELETE" });
    load();
  };

  // Calendar grid logic
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString("en-US", { month: "long", year: "numeric" });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter(e => e.scheduled_at?.startsWith(dateStr));
  };

  const statusCounts = {
    draft: events.filter(e => e.status === "draft").length,
    scheduled: events.filter(e => e.status === "scheduled").length,
    published: events.filter(e => e.status === "published").length,
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>📅 Content Calendar</h1>
          <div className="subtitle">Plan, schedule, and track your content across all platforms</div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={() => setView(view === "month" ? "week" : "month")}>
            {view === "month" ? "Weekly" : "Monthly"}
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Schedule</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-3 mb-24">
        <div className="stat-card accent-gold">
          <span className="value">{events.length}</span>
          <div className="label">Total Events</div>
        </div>
        <div className="stat-card accent-purple">
          <span className="value">{statusCounts.scheduled}</span>
          <div className="label">Scheduled</div>
        </div>
        <div className="stat-card accent-green">
          <span className="value">{statusCounts.published}</span>
          <div className="label">Published</div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card mb-24">
        <div className="flex items-center justify-between mb-16">
          <button className="btn btn-sm btn-ghost" onClick={prevMonth}>← Prev</button>
          <div className="flex items-center gap-3">
            <h3>{monthName}</h3>
            <button className="btn btn-sm btn-ghost text-[10px]" onClick={goToday}>Today</button>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={nextMonth}>Next →</button>
        </div>

        {/* Day headers */}
        <div className="grid-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-text-dim py-2">{d}</div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid-7 gap-1">
          {/* Empty cells for offset */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[80px] rounded-md bg-bg-deep opacity-30" />
          ))}
          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayEvents = getEventsForDay(day);
            const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
            return (
              <div
                key={day}
                className={`min-h-[80px] rounded-md border p-2 cursor-pointer hover:border-[var(--accent)] transition-colors ${isToday ? "border-[var(--accent)] bg-bg-raise" : "border-[var(--border)] bg-bg"}`}
              >
                <div className={`text-[11px] font-semibold mb-1 ${isToday ? "text-accent" : "text-text-dim"}`}>{day}</div>
                {dayEvents.slice(0, 3).map(ev => (
                  <div
                    key={ev.id}
                    className="text-[9px] rounded px-1 py-[2px] mb-[2px] truncate font-medium"
                    style={{ background: (PLATFORM_COLORS[ev.platform] || "#6366f1") + "22", color: PLATFORM_COLORS[ev.platform] || "#6366f1" }}
                  >
                    {PLATFORM_ICONS[ev.platform] || "📌"} {ev.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[8px] text-text-dim">+{dayEvents.length - 3} more</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Events List */}
      <div className="card">
        <h3>Upcoming</h3>
        {events.length === 0 ? (
          <div className="empty-state py-spacing-lg">
            <div className="icon text-[24px]">📅</div>
            <p className="text-xs">No events scheduled</p>
          </div>
        ) : (
          <div className="table-wrap mt-12">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Platform</th>
                  <th>Scheduled</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id}>
                    <td>
                      <div className="font-semibold text-xs">{ev.title}</div>
                      <div className="text-[10px] text-text-dim">{EVENT_TYPES.find(t => t.key === ev.type)?.icon || "📌"} {ev.type}</div>
                    </td>
                    <td>
                      <span className="text-[11px]" style={{ color: PLATFORM_COLORS[ev.platform] || "var(--text)" }}>
                        {PLATFORM_ICONS[ev.platform] || "📌"} {ev.platform}
                      </span>
                    </td>
                    <td className="text-[11px] text-text-dim whitespace-nowrap">
                      {ev.scheduled_at ? formatDate(ev.scheduled_at) : "No date"}
                    </td>
                    <td>
                      <select
                        className="text-[10px] bg-transparent border border-[var(--border)] rounded px-1 py-[2px]"
                        value={ev.status}
                        onChange={(e) => updateStatus(ev.id, e.target.value)}
                      >
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="published">Published</option>
                      </select>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-ghost text-[10px] py-[3px] px-2" onClick={() => deleteEvent(ev.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>📅 Schedule Content</h2>
            <div className="form-group">
              <label>Title</label>
              <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g. Weekly tip post" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Type</label>
                <select value={formType} onChange={(e) => setFormType(e.target.value)}>
                  {EVENT_TYPES.map(t => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Platform</label>
                <select value={formPlatform} onChange={(e) => setFormPlatform(e.target.value)}>
                  {Object.entries(PLATFORM_ICONS).map(([k, v]) => <option key={k} value={k}>{v} {k}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Schedule Date</label>
              <input type="datetime-local" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Content</label>
              <textarea value={formBody} onChange={(e) => setFormBody(e.target.value)} placeholder="Post content or notes..." style={{ minHeight: 80 }} />
            </div>
            <div className="form-group">
              <label>Tags <span className="text-[9px] text-text-dim font-normal">(comma-separated)</span></label>
              <input value={formTags} onChange={(e) => setFormTags(e.target.value)} placeholder="seo, tips, react" />
            </div>
            <div className="form-actions">
              <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addEvent}>📅 Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
