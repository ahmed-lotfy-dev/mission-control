import { useState } from "react";
import type { ViewName } from "./lib/api";
import Dashboard from "./views/Dashboard";
import Kanban from "./views/Kanban";
import Agents from "./views/Agents";
import Vault from "./views/Vault";
import Daily from "./views/Daily";
import Scheduled from "./views/Scheduled";
import Workspace from "./views/Workspace";
import Studio from "./views/Studio";
import Seo from "./views/Seo";
import AgentSidebar from "./components/AgentSidebar";

const NAV_ITEMS: Array<{ view: ViewName; icon: string; label: string }> = [
  { view: "dashboard", icon: "📊", label: "Dashboard" },
  { view: "kanban", icon: "📋", label: "Kanban" },
  { view: "agents", icon: "🤖", label: "Agents" },
  { view: "vault", icon: "🧠", label: "Vault" },
  { view: "daily", icon: "📝", label: "Daily" },
  { view: "scheduled", icon: "⏰", label: "Scheduled" },
  { view: "workspace", icon: "📁", label: "Workspace" },
  { view: "studio", icon: "🎬", label: "Studio" },
  { view: "seo", icon: "📈", label: "SEO" },
];

const VIEW_COMPONENTS: Record<ViewName, React.FC> = {
  dashboard: Dashboard,
  kanban: Kanban,
  agents: Agents,
  vault: Vault,
  daily: Daily,
  scheduled: Scheduled,
  workspace: Workspace,
  studio: Studio,
  seo: Seo,
};

export default function App() {
  const [view, setView] = useState<ViewName>("dashboard");
  const ViewComponent = VIEW_COMPONENTS[view];

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
              key={item.view}
              className={`nav-item${view === item.view ? " active" : ""}`}
              onClick={() => setView(item.view)}
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
      <main className="main-content" key={view}>
        <ViewComponent />
      </main>
      <AgentSidebar />
    </div>
  );
}