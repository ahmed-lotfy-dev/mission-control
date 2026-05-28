import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";
import gsap from "gsap";
import { api, getAgentDefaultIcon, timeAgo, formatTime } from "./lib/api";
import AgentSidebar from "./components/AgentSidebar";
import CommandPalette from "./components/CommandPalette";
import { Toaster } from "./components/ui/sonner";

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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [agentDrawerOpen, setAgentDrawerOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // GSAP: open sidebar with slide-in animation
  const openSidebar = () => {
    setSidebarOpen(true);
    document.body.style.overflow = "hidden";
    if (backdropRef.current) {
      gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power2.out" });
    }
    if (sidebarRef.current) {
      gsap.fromTo(sidebarRef.current, { x: -260, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: "expo.out" });
    }
  };

  // GSAP: close sidebar
  const closeSidebar = () => {
    if (backdropRef.current) gsap.to(backdropRef.current, { opacity: 0, duration: 0.2, ease: "power2.in" });
    if (sidebarRef.current) {
      gsap.to(sidebarRef.current, { x: -260, opacity: 0, duration: 0.35, ease: "expo.in",
        onComplete: () => { setSidebarOpen(false); document.body.style.overflow = ""; }
      });
    } else {
      setSidebarOpen(false);
      document.body.style.overflow = "";
    }
  };

  const handleNavClick = (path: string) => {
    navigate({ to: path });
    if (window.innerWidth < 769) closeSidebar();
  };

  // Close sidebar on resize to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 769 && sidebarOpen) closeSidebar(); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [sidebarOpen]);

  return (
    <div className="app-layout">
      <div className="ambient-glow" />

      {/* ── Mobile Header ── */}
      <header className="mobile-header">
        <div className="mobile-header-logo">
          <span className="logo-icon">🚀</span>
          Mission Control
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setAgentDrawerOpen(true)}
            aria-label="Open agents panel"
            style={{ fontSize: 16, padding: "6px" }}
          >
            🤖
          </button>
          <button
            className={`hamburger-btn${sidebarOpen ? " open" : ""}`}
            onClick={sidebarOpen ? closeSidebar : openSidebar}
            aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {/* ── Backdrop (mobile) ── */}
      <div
        ref={backdropRef}
        className="mobile-backdrop"
        onClick={closeSidebar}
        style={{ opacity: 0 }}
      />

      {/* ── Sidebar ── */}
      <aside
        ref={sidebarRef}
        className={`sidebar${sidebarOpen ? " open" : ""}`}
        role="navigation"
        aria-hidden={!sidebarOpen}
      >
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

      {/* ── Main Content ── */}
      <main className="main-content" key={currentPath} ref={(el) => {
        if (el) {
          gsap.fromTo(el, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" });
        }
      }}>
        <Outlet />
      </main>

      {/* ── Desktop Agent Sidebar (hidden on mobile) ── */}
      <AgentSidebar onMobileOpen={() => setAgentDrawerOpen(true)} />

      {/* ── Mobile Agent Drawer ── */}
      {agentDrawerOpen && (
        <MobileAgentDrawer onClose={() => setAgentDrawerOpen(false)} />
      )}

      <CommandPalette />
      <Toaster />
    </div>
  );
}

// ── Mobile Agent Drawer ──
function MobileAgentDrawer({ onClose }: { onClose: () => void }) {
  const [agents, setAgents] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [logCache, setLogCache] = useState<Record<number, any[]>>({});
  const drawerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api("/agents").then((data: unknown) => setAgents(data as any[])).catch(() => {});
    if (backdropRef.current) gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    if (drawerRef.current) {
      gsap.fromTo(drawerRef.current, { x: "100%" }, { x: "0%", duration: 0.4, ease: "expo.out" });
    }
  }, []);

  const closeDrawer = () => {
    if (backdropRef.current) gsap.to(backdropRef.current, { opacity: 0, duration: 0.2 });
    if (drawerRef.current) {
      gsap.to(drawerRef.current, { x: "100%", duration: 0.35, ease: "expo.in", onComplete: onClose });
    } else {
      onClose();
    }
  };

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
      <div ref={backdropRef} className="mobile-backdrop" style={{ display: "block", opacity: 0 }} onClick={closeDrawer} />
      <div ref={drawerRef} className="agent-drawer">
        <div className="agent-drawer-panel">
          <div className="agent-drawer-header">
            <h3>🤖 Agents</h3>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={closeDrawer}>✕</button>
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
        </div>
      </div>
    </>
  );
}