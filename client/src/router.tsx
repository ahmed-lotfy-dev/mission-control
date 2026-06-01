import { createRouter, createRootRoute, createRoute } from "@tanstack/react-router";
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
import Gallery from "./views/Gallery";
import FeatureFlags from "./views/FeatureFlags";
import SeoReport from "./features/seo/components/SeoReport";
import SeoContentPreview from "./features/seo/components/SeoContentPreview";
import ErrorPage from "./components/ErrorPage";
import NotFoundPage from "./components/NotFoundPage";

const rootRoute = createRootRoute({
  component: Layout,
  errorComponent: ({ error }) => <ErrorPage error={error} />,
  notFoundComponent: () => <NotFoundPage />,
});

const dashboardRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: Dashboard });
const kanbanRoute = createRoute({ getParentRoute: () => rootRoute, path: "/kanban", component: Kanban });
const agentsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/agents", component: Agents });
const vaultRoute = createRoute({ getParentRoute: () => rootRoute, path: "/vault", component: Vault });
const dailyRoute = createRoute({ getParentRoute: () => rootRoute, path: "/daily", component: Daily });
const scheduledRoute = createRoute({ getParentRoute: () => rootRoute, path: "/scheduled", component: Scheduled });
const workspaceRoute = createRoute({ getParentRoute: () => rootRoute, path: "/workspace", component: Workspace });
const studioRoute = createRoute({ getParentRoute: () => rootRoute, path: "/studio", component: Studio });
const galleryRoute = createRoute({ getParentRoute: () => rootRoute, path: "/gallery", component: Gallery });
const seoRoute = createRoute({ getParentRoute: () => rootRoute, path: "/seo", component: Seo });
const featureFlagsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/feature-flags", component: FeatureFlags });
const seoReportRoute = createRoute({ getParentRoute: () => rootRoute, path: "/seo/report/$sessionId", component: SeoReport });
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
  galleryRoute,
  seoRoute,
  featureFlagsRoute,
  seoReportRoute,
  seoContentPreviewRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register { router: typeof router; }
}
