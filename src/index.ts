import { Elysia } from "elysia";
import { tasksRoutes } from "./routes/tasks";
import { goalsRoutes } from "./routes/goals";
import { scheduledRoutes } from "./routes/scheduled";
import { agentRoutes } from "./routes/agents";
import { contentRoutes } from "./routes/content";
import { vaultRoutes } from "./routes/vault";
import { dashboardRoutes } from "./routes/dashboard";
import { workspaceRoutes } from "./routes/workspace";
import { studioRoutes } from "./routes/studio";
import { seoRoutes } from "./routes/seo";

const app = new Elysia()
  .onRequest(({ request }) => {
    const origin = request.headers.get("origin") ?? "";
    if (origin) {
      request.headers.set("access-control-allow-origin", origin);
      request.headers.set("access-control-allow-methods", "GET,POST,PATCH,DELETE,OPTIONS");
      request.headers.set("access-control-allow-headers", "Content-Type");
    }
  })
  // API routes first
  .use(tasksRoutes)
  .use(goalsRoutes)
  .use(scheduledRoutes)
  .use(agentRoutes)
  .use(contentRoutes)
  .use(vaultRoutes)
  .use(dashboardRoutes)
  .use(workspaceRoutes)
  .use(studioRoutes)
  .use(seoRoutes)
  // Serve React build
  .get("/assets/*", ({ path }) => {
    return Bun.file(`client/dist/${path}`);
  })
  .get("/static/*", ({ path }) => {
    return Bun.file(`client/dist/${path}`);
  })
  // SPA fallback — serve index.html for any non-API route
  .get("/*", () => {
    return Bun.file("client/dist/index.html");
  })
  .listen(3000);

console.log(`🚀 Mission Control running at http://localhost:3000`);
