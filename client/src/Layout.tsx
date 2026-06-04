import { useNavigate, useLocation } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";
import { Menu, X, Search, Bell, Settings, ChevronDown, LogOut, User, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Button } from "./components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "./components/ui/sheet";
import CommandPalette from "./components/CommandPalette";
import { Toaster } from "./components/ui/sonner";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { path: "/", icon: "📊", label: "Dashboard" },
      { path: "/analytics", icon: "📈", label: "Analytics" },
    ],
  },
  {
    label: "Content",
    items: [
      { path: "/content", icon: "✍️", label: "Content Writer" },
      { path: "/calendar", icon: "📅", label: "Calendar" },
      { path: "/social", icon: "📱", label: "Social Hub" },
    ],
  },
  {
    label: "Productivity",
    items: [
      { path: "/kanban", icon: "📋", label: "Kanban" },
      { path: "/daily", icon: "📝", label: "Daily Journal" },
      { path: "/scheduled", icon: "⏰", label: "Scheduler" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { path: "/agents", icon: "🤖", label: "AI Agents" },
      { path: "/vault", icon: "🧠", label: "Knowledge Vault" },
      { path: "/seo", icon: "🔍", label: "SEO Audit" },
    ],
  },
  {
    label: "Creation",
    items: [
      { path: "/studio", icon: "🎬", label: "AI Studio" },
      { path: "/gallery", icon: "🖼️", label: "Gallery" },
      { path: "/workspace", icon: "📁", label: "Workspace" },
    ],
  },
];

const FLAT_NAV = NAV_GROUPS.flatMap((g) => g.items);

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const handleNavClick = (path: string) => {
    navigate({ to: path });
  };

  return (
    <div className="app-layout">
      {/* ── Desktop Sidebar ── */}
      <aside className="sidebar" role="navigation" aria-label="Main navigation">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <span>🚀</span>
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">Mission Control</span>
            <span className="sidebar-brand-version">v2.0</span>
          </div>
        </div>

        <div className="sidebar-scroll">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="nav-group">
              <div className="nav-group-label">{group.label}</div>
              {group.items.map((item) => {
                const isActive = currentPath === item.path || (item.path !== "/" && currentPath.startsWith(item.path));
                return (
                  <button
                    key={item.path}
                    className={`nav-item${isActive ? " active" : ""}`}
                    onClick={() => handleNavClick(item.path)}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className="nav-item-icon">{item.icon}</span>
                    <span className="nav-item-label">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-footer-btn">
            <div className="sidebar-footer-avatar">A</div>
            <div className="sidebar-footer-info">
              <span className="sidebar-footer-name">Ahmed</span>
              <span className="sidebar-footer-status">
                <span className="status-dot online" />
                Connected
              </span>
            </div>
            <Settings size={14} className="sidebar-footer-settings" />
          </button>
        </div>
      </aside>

      {/* ── Mobile Top Bar ── */}
      <header className="mobile-top-bar">
        <Sheet>
          <SheetTrigger asChild>
            <button className="mobile-menu-btn" aria-label="Open menu">
              <Menu size={20} />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="mobile-nav-sheet">
            <div className="mobile-nav-header">
              <div className="sidebar-brand">
                <div className="sidebar-brand-icon"><span>🚀</span></div>
                <div className="sidebar-brand-text">
                  <span className="sidebar-brand-name">Mission Control</span>
                  <span className="sidebar-brand-version">v2.0</span>
                </div>
              </div>
            </div>
            <div className="mobile-nav-scroll">
              {NAV_GROUPS.map((group) => (
                <div key={group.label} className="nav-group">
                  <div className="nav-group-label">{group.label}</div>
                  {group.items.map((item) => {
                    const isActive = currentPath === item.path || (item.path !== "/" && currentPath.startsWith(item.path));
                    return (
                      <SheetClose asChild key={item.path}>
                        <button
                          className={`nav-item${isActive ? " active" : ""}`}
                          onClick={() => handleNavClick(item.path)}
                        >
                          <span className="nav-item-icon">{item.icon}</span>
                          <span className="nav-item-label">{item.label}</span>
                        </button>
                      </SheetClose>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mobile-nav-footer">
              <div className="sidebar-footer-avatar">A</div>
              <div className="sidebar-footer-info">
                <span className="sidebar-footer-name">Ahmed Shoman</span>
                <span className="sidebar-footer-status"><span className="status-dot online" />Connected</span>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <div className="mobile-top-title">
          {FLAT_NAV.find((n) => n.path !== "/" && currentPath.startsWith(n.path))?.label || "Dashboard"}
        </div>

        <div className="mobile-top-actions">
          <button className="mobile-top-action-btn" aria-label="Search (Cmd+K)">
            <Search size={18} />
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="main-content">
        <div className="main-content-inner">
          <Outlet />
        </div>
      </main>

      <CommandPalette />
      <Toaster position="top-right" />
    </div>
  );
}
