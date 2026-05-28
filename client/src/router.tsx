import { createRouter, createRootRoute, createRoute, Outlet } from "@tanstack/react-router";
import Layout from "./Layout";
import Dashboard from "./views/Dashboard";
import Kanban from "./views/Kanban";
import Agents from "./views/Agents";
import Vault from "./views/Vault";
import Daily from "./views/Daily";
import Scheduled from "./views/Scheduled";
import Workspace from "./views/Workspace";
import Studio from "./views/Studio";
import Seo from "./views/Seo";
import SeoReport from "./features/seo/components/SeoReport";
import SeoContentPreview from "./features/seo/components/SeoContentPreview";

// ── Route-level error fallback ──
function RouteErrorComponent({ error }: { error: Error }) {
  return (
    <div className="card" style={{ padding: 32, textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <h2>Route Error</h2>
      <p style={{ color: "var(--red)", fontSize: 13, marginTop: 8 }}>
        {error.message || "An unexpected error occurred while rendering this view"}
      </p>
      <button
        className="btn btn-primary mt-16"
        onClick={() => window.location.reload()}
      >
        Reload
      </button>
    </div>
  );
}

const rootRoute = createRootRoute({
  component: Layout,
  errorComponent: RouteErrorComponent,
  notFoundComponent: () => (
    <div className="card" style={{ padding: 48, textAlign: "center" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🛸</div>
      <h1 style={{ margin: 0 }}>404</h1>
      <p style={{ color: "var(--text-dim)", marginTop: 8 }}>
        This page drifted off into deep space.
      </p>
    </div>
  ),
});

const dashboardRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: Dashboard });
const kanbanRoute = createRoute({ getParentRoute: () => rootRoute, path: "/kanban", component: Kanban });
const agentsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/agents", component: Agents });
const vaultRoute = createRoute({ getParentRoute: () => rootRoute, path: "/vault", component: Vault });
const dailyRoute = createRoute({ getParentRoute: () => rootRoute, path: "/daily", component: Daily });
const scheduledRoute = createRoute({ getParentRoute: () => rootRoute, path: "/scheduled", component: Scheduled });
const workspaceRoute = createRoute({ getParentRoute: () => rootRoute, path: "/workspace", component: Workspace });
const studioRoute = createRoute({ getParentRoute: () => rootRoute, path: "/studio", component: Studio });
const seoRoute = createRoute({ getParentRoute: () => rootRoute, path: "/seo", component: Seo });
const seoReportRoute = createRoute({ getParentRoute: () => rootRoute, path: "/seo/report/$auditId", component: SeoReport });
const seoContentPreviewRoute = createRoute({ getParentRoute: () => rootRoute, path: "/seo/content/$contentId", component: SeoContentPreview });

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  kanbanRoute,
  agentsRoute,
  vaultRoute,
  dailyRoute,
  scheduledRoute,
  workspaceRoute,
  studioRoute,
  seoRoute,
  seoReportRoute,
  seoContentPreviewRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register { router: typeof router; }
}