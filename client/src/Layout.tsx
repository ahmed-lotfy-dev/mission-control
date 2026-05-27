import { useNavigate, useLocation } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";
import AgentSidebar from "./components/AgentSidebar";
import CommandPalette from "./components/CommandPalette";
import { Toaster } from "./components/ui/sonner";

const NAV_ITEMS: Array<{ path: string; icon: string; label: string }> = [
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

  return (
    <div className="app-layout">
      <div className="ambient-glow" />
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">🚀</span>
            Mission Control
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.path}
              className={`nav-item${currentPath === item.path ? " active" : ""}`}
              onClick={() => navigate({ to: item.path })}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="status-dot online" />
          Connected
        </div>
      </aside>
      <main className="main-content" key={currentPath}>
        <Outlet />
      </main>
      <AgentSidebar />
      <CommandPalette />
      <Toaster />
    </div>
  );
}