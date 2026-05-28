import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";
import { Menu, X, Bot } from "lucide-react";
import { api, getAgentDefaultIcon, timeAgo, formatTime } from "./lib/api";
import AgentSidebar from "./components/AgentSidebar";
import CommandPalette from "./components/CommandPalette";
import { Toaster } from "./components/ui/sonner";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "./components/ui/sheet";

const NAV_ITEMS = [
  { path: "/", icon: "📊", label: "Dashboard" },
  { path: "/kanban", icon: "📋", label: "Kanban" },
  { path: "/agents", icon: "🤖", label: "Agents" },
  { path: "/vault", icon: "🧠", label: "Vault" },
  { path: "/daily", icon: "📝", label: "Daily" },
  { path: "/scheduled", icon: "⏰", label: "Scheduled" },
  { path: "/workspace", icon: "📁", label: "Workspace" },
  { path: "/studio", icon: "🎬", label: "Studio" },
  { path: "/seo", icon: "📈", label: "SEO" },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const handleNavClick = (path: string) => {
    navigate({ to: path });
  };

  return (
    <div className="app-layout">
      <div className="ambient-glow" />

      {/* ── Desktop Sidebar ── */}
      <aside className="sidebar" role="navigation">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">🚀</span>
            <span>Mission Control</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.path}
              className={`nav-item${currentPath === item.path ? " active" : ""}`}
              onClick={() => handleNavClick(item.path)}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleNavClick(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="status-dot online" />
          <span>Connected</span>
        </div>
      </aside>

      {/* ── Mobile Header + Sheet ── */}
      <header className="mobile-header">
        <Sheet>
          <SheetTrigger asChild>
            <button className="mobile-menu-trigger" aria-label="Open menu">
              <Menu size={20} />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="mobile-sheet">
            <div className="mobile-sheet-header">
              <div className="sidebar-logo">
                <span className="logo-icon">🚀</span>
                <span>Mission Control</span>
              </div>
            </div>
            <nav className="mobile-sheet-nav">
              {NAV_ITEMS.map((item) => (
                <SheetClose asChild key={item.path}>
                  <div
                    className={`nav-item${currentPath === item.path ? " active" : ""}`}
                    onClick={() => handleNavClick(item.path)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && handleNavClick(item.path)}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                </SheetClose>
              ))}
            </nav>
            <div className="mobile-sheet-footer">
              <span className="status-dot online" />
              <span>Connected</span>
            </div>
          </SheetContent>
        </Sheet>
        <div className="mobile-header-logo">
          <span className="logo-icon">🚀</span>
          Mission Control
        </div>
        <MobileAgentButton />
      </header>

      {/* ── Main Content ── */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* ── Desktop Agent Sidebar ── */}
      <AgentSidebar />

      <CommandPalette />
      <Toaster />
    </div>
  );
}

// ── Mobile Agent Button + Sheet ──
function MobileAgentButton() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="btn btn-ghost btn-icon mobile-agent-btn" aria-label="Open agents panel">
          <Bot size={18} />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="mobile-agent-sheet">
        <MobileAgentContent />
      </SheetContent>
    </Sheet>
  );
}

function MobileAgentContent() {
  const [agents, setAgents] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [logCache, setLogCache] = useState<Record<number, any[]>>({});

  useEffect(() => {
    api("/agents").then((data: unknown) => setAgents(data as any[])).catch(() => {});
  }, []);

  const toggleExpand = async (id: number) => {
    const nowExpanded = !expanded[id];
    setExpanded((prev) => ({ ...prev, [id]: nowExpanded }));
    if (nowExpanded && !logCache[id]) {
      try {
        const agent = await api(`/agents/${id}`) as any;
        setLogCache((prev) => ({ ...prev, [id]: agent.logs || [] }));
      } catch { /* ignore */ }
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "online": return "var(--green)";
      case "working": return "var(--accent)";
      case "idle": return "var(--yellow)";
      case "error": return "var(--red)";
      default: return "var(--text-dim)";
    }
  };

  return (
    <>
      <div className="agent-drawer-header">
        <h3>🤖 Agents</h3>
      </div>
      <div className="agent-panel-list">
        {agents.length === 0 ? (
          <div className="loading" style={{ textAlign: "center", padding: 20, fontSize: 11, color: "var(--text-dim)" }}>No agents</div>
        ) : agents.map((a) => {
          const icon = a.icon || getAgentDefaultIcon(a.name);
          const isExpanded = expanded[a.id];
          const logs = logCache[a.id];
          const meta = (a.metadata || {}) as Record<string, string>;

          return (
            <div key={a.id} className={`agent-s-card status-${a.status}${isExpanded ? " expanded" : ""}`}>
              <div className="agent-s-header" onClick={() => toggleExpand(a.id)}>
                <div className="agent-s-avatar">{icon}</div>
                <div className="agent-s-info">
                  <div className="agent-s-name">{a.name}</div>
                  <div className="agent-s-meta">{a.model} · {timeAgo(a.last_active)}</div>
                </div>
                <span className={`agent-s-badge ${a.status}`}>{a.status}</span>
              </div>
              {isExpanded && (
                <div className="agent-s-detail">
                  <div className="agent-s-row">
                    <span className="s-label">Version</span>
                    <span className="s-value">{a.version || "N/A"}</span>
                  </div>
                  <div className="agent-s-row">
                    <span className="s-label">Status</span>
                    <span className="s-value" style={{ color: statusColor(a.status) }}>{a.status}</span>
                  </div>
                  {meta.provider && (
                    <div className="agent-s-row">
                      <span className="s-label">Provider</span>
                      <span className="s-value">{meta.provider}</span>
                    </div>
                  )}
                  {a.pid && (
                    <div className="agent-s-row">
                      <span className="s-label">PID</span>
                      <span className="s-value">{a.pid}</span>
                    </div>
                  )}
                  <div className="agent-s-section">
                    <div className="s-heading">Recent Activity</div>
                    {!logs ? (
                      <div className="agent-s-no-logs">Loading...</div>
                    ) : logs.length === 0 ? (
                      <div className="agent-s-no-logs">No activity yet.</div>
                    ) : (
                      logs.slice(0, 12).map((log: any) => (
                        <div key={log.id} className="agent-s-log">
                          <span className="agent-s-log-time">{formatTime(log.created_at)}</span>
                          <span className={`agent-s-log-level ${log.level}`}>{log.level}</span>
                          <span className="agent-s-log-msg">{log.event}{log.message ? `: ${log.message.substring(0, 60)}` : ""}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
