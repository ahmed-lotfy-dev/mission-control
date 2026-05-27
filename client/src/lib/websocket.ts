import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";

export interface WsMessage {
  event: string;
  payload: any;
  timestamp: string;
}

type WsListener = (msg: WsMessage) => void;

const listeners = new Map<string, Set<WsListener>>();
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let isConnecting = false;

function getWsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  // In dev, Vite proxies /api to localhost:3000, but WS needs direct connection
  // Try the same host:port as the page
  return `${proto}//${window.location.host}/ws`;
}

function connect() {
  if (socket?.readyState === WebSocket.OPEN || isConnecting) return;
  isConnecting = true;

  try {
    const url = getWsUrl();
    socket = new WebSocket(url);

    socket.onopen = () => {
      isConnecting = false;
      console.log("[WS] Connected to Mission Control");
    };

    socket.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        const eventListeners = listeners.get(msg.event);
        if (eventListeners) {
          eventListeners.forEach((fn) => fn(msg));
        }
        // Also dispatch to wildcard listeners
        const allListeners = listeners.get("*");
        if (allListeners) {
          allListeners.forEach((fn) => fn(msg));
        }

        // Handle agent offline notifications
        if (msg.event === "agent_offline") {
          const p = msg.payload;
          toast.error(`${p.icon || "🤖"} ${p.name} went ${p.status}`, {
            description: `Was ${p.prevStatus} — now offline`,
            duration: 5000,
          });
        }
        if (msg.event === "agent_online") {
          const p = msg.payload;
          toast.success(`${p.icon || "🤖"} ${p.name} is now ${p.status}`, {
            description: `Was ${p.prevStatus} — now active`,
            duration: 4000,
          });
        }
      } catch {}
    };

    socket.onclose = () => {
      isConnecting = false;
      socket = null;
      // Auto-reconnect after 3s
      reconnectTimer = setTimeout(connect, 3000);
    };

    socket.onerror = () => {
      isConnecting = false;
      socket?.close();
    };
  } catch {
    isConnecting = false;
    reconnectTimer = setTimeout(connect, 5000);
  }
}

function disconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (socket) {
    socket.close();
    socket = null;
  }
}

export function subscribe(event: string, fn: WsListener): () => void {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)!.add(fn);

  // Ensure connection is active
  connect();

  return () => {
    const eventListeners = listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(fn);
      if (eventListeners.size === 0) {
        listeners.delete(event);
      }
    }
  };
}

export function useWebSocket<T = any>(
  event: string,
  onMessage?: (data: T) => void
) {
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);
  const cbRef = useRef(onMessage);
  cbRef.current = onMessage;

  useEffect(() => {
    const unsub = subscribe(event, (msg) => {
      setLastMessage(msg);
      cbRef.current?.(msg.payload);
    });
    return unsub;
  }, [event]);

  return lastMessage;
}

// ── Agent status hook ──

export interface LiveAgent {
  id: number;
  name: string;
  model: string;
  version: string;
  icon: string;
  status: string;
  pid: number | null;
  endpoint: string;
  metadata: Record<string, string>;
  created_at: string;
}

export function useAgentsWs() {
  const [agents, setAgents] = useState<LiveAgent[]>([]);

  useEffect(() => {
    const unsub = subscribe("agents_update", (msg) => {
      setAgents(msg.payload);
    });
    // Also grab initial state
    const unsubInit = subscribe("initial_state", (msg) => {
      setAgents(msg.payload.agents);
    });
    return () => {
      unsub();
      unsubInit();
    };
  }, []);

  return agents;
}

// ── Dashboard stats hook ──

export interface LiveDashboardStats {
  total: number;
  backlog: number;
  todo: number;
  inProgress: number;
  done: number;
}

export function useDashboardStatsWs() {
  const [stats, setStats] = useState<LiveDashboardStats | null>(null);

  useEffect(() => {
    return subscribe("dashboard_stats", (msg) => {
      setStats(msg.payload);
    });
  }, []);

  return stats;
}

// ── Task updates hook ──

export function useTaskUpdatesWs(onChange?: (updates: any) => void) {
  useEffect(() => {
    return subscribe("task_update", (msg) => {
      onChange?.(msg.payload);
    });
  }, [onChange]);
}

// ── Expose connect/disconnect globally ──

export const wsApi = { connect, disconnect, subscribe };