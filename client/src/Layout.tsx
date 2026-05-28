import { useNavigate, useLocation } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";
import { Menu } from "lucide-react";
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

      {/* ── Mobile Header + Sheet Nav ── */}
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
        <div className="mobile-header-spacer" />
      </header>

      {/* ── Main Content ── */}
      <main className="main-content">
        <Outlet />
      </main>

      <CommandPalette />
      <Toaster />
    </div>
  );
}
