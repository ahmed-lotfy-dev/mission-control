import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";

interface CommandItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  shortcut?: string;
  keywords: string[];
}

const COMMANDS: CommandItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "📊", path: "/", shortcut: "G D", keywords: ["home", "main", "overview"] },
  { id: "kanban", label: "Kanban", icon: "📋", path: "/kanban", shortcut: "G K", keywords: ["tasks", "board", "cards"] },
  { id: "agents", label: "Agents", icon: "🤖", path: "/agents", shortcut: "G A", keywords: ["bots", "status", "processes"] },
  { id: "vault", label: "Vault", icon: "🧠", path: "/vault", shortcut: "G V", keywords: ["notes", "obsidian", "knowledge"] },
  { id: "daily", label: "Daily Journal", icon: "📝", path: "/daily", shortcut: "G J", keywords: ["journal", "goals", "mood"] },
  { id: "scheduled", label: "Scheduled Tasks", icon: "⏰", path: "/scheduled", shortcut: "G S", keywords: ["cron", "timer", "automation"] },
  { id: "workspace", label: "Workspace", icon: "📁", path: "/workspace", shortcut: "G W", keywords: ["files", "gallery", "assets"] },
  { id: "studio", label: "Studio", icon: "🎬", path: "/studio", shortcut: "G U", keywords: ["tts", "image", "audio", "video"] },
  { id: "seo", label: "SEO", icon: "📈", path: "/seo", shortcut: "G E", keywords: ["keywords", "audit", "rankings", "content"] },
];

export default function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navBufferRef = useRef<string>("");
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Cmd+K to open/close ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery("");
        setSelectedIdx(0);
        return;
      }

      // G-prefix navigation (G then letter within 800ms)
      if (!e.metaKey && !e.ctrlKey && !e.altKey && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        if (e.key === "g" || e.key === "G") {
          e.preventDefault();
          navBufferRef.current = "g";
          if (navTimerRef.current) clearTimeout(navTimerRef.current);
          navTimerRef.current = setTimeout(() => { navBufferRef.current = ""; }, 800);
          return;
        }

        if (navBufferRef.current === "g") {
          navBufferRef.current = "";
          if (navTimerRef.current) clearTimeout(navTimerRef.current);
          const navMap: Record<string, string> = {
            d: "/", k: "/kanban", a: "/agents", v: "/vault",
            j: "/daily", s: "/scheduled", w: "/workspace",
            u: "/studio", e: "/seo",
          };
          const path = navMap[e.key.toLowerCase()];
          if (path) {
            e.preventDefault();
            navigate({ to: path });
          }
        }

        // Escape to close palette
        if (e.key === "Escape" && open) {
          setOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, navigate]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = query.trim()
    ? COMMANDS.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.keywords.some((kw) => kw.includes(query.toLowerCase())) ||
          c.id.includes(query.toLowerCase())
      )
    : COMMANDS;

  const execute = useCallback(
    (cmd: CommandItem) => {
      setOpen(false);
      setQuery("");
      navigate({ to: cmd.path });
    },
    [navigate]
  );

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIdx]) execute(filtered[selectedIdx]);
    }
  };

  if (!open) return null;

  return (
    <div
      className="command-overlay"
      onClick={() => setOpen(false)}
      onKeyDown={handleKey}
    >
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="command-input-wrap">
          <span className="command-search-icon">⌕</span>
          <input
            ref={inputRef}
            type="text"
            className="command-input"
            placeholder="Search views, agents, files..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIdx(0);
            }}
            onKeyDown={handleKey}
          />
          <span className="command-esc-hint">ESC</span>
        </div>
        <div className="command-results">
          {filtered.length === 0 ? (
            <div className="command-empty">No results for "{query}"</div>
          ) : (
            filtered.map((cmd, idx) => (
              <div
                key={cmd.id}
                className={`command-item ${idx === selectedIdx ? "selected" : ""}`}
                onClick={() => execute(cmd)}
                onMouseEnter={() => setSelectedIdx(idx)}
              >
                <span className="command-icon">{cmd.icon}</span>
                <span className="command-label">{cmd.label}</span>
                {cmd.shortcut && <span className="command-shortcut">{cmd.shortcut}</span>}
              </div>
            ))
          )}
        </div>
        <div className="command-footer">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  );
}