import { Elysia } from "elysia";
import { existsSync } from "fs";
import { tasksRoutes } from "./routes/tasks";
import { goalsRoutes } from "./routes/goals";
import { scheduledRoutes } from "./routes/scheduled";
import { agentRoutes } from "./routes/agents";
import { contentRoutes as studioContentRoutes } from "./routes/content";
import { vaultRoutes } from "./routes/vault";
import { dashboardRoutes } from "./routes/dashboard";
import { workspaceRoutes } from "./routes/workspace";
import { studioRoutes, serveRoutes, contentRoutes } from "./routes/studio";
import { seoRoutes } from "./routes/seo";
import { seoAuditRoutes } from "./routes/seo-audit";
import { flagsRoutes } from "./routes/flags";
import { handleWsUpgrade } from "./routes/ws";

const distBase = (() => {
  const rel = ["client/dist", "../client/dist", "../../client/dist"];
  for (const p of rel) {
    if (existsSync(p)) return p;
  }
  return "../client/dist";
})();

const app = new Elysia()
  .onRequest(({ request }) => {
    // WebSocket upgrade — intercept before Elysia routing
    const wsResp = handleWsUpgrade(request);
    if (wsResp) return wsResp;

    // CORS headers
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
  .use(studioContentRoutes)
  .use(vaultRoutes)
  .use(dashboardRoutes)
  .use(workspaceRoutes)
  .use(studioRoutes)
  .use(serveRoutes)
  .use(contentRoutes)    // /api/content/asset/:id/image — serves Gallery images from DB base64
  .use(seoRoutes)
  .use(seoAuditRoutes)
  .use(flagsRoutes)
  // Serve React build
  .get("/assets/*", ({ path }) => {
    return Bun.file(`${distBase}/${path}`);
  })
  .get("/static/*", ({ path }) => {
    return Bun.file(`${distBase}/${path}`);
  })
  // SPA fallback — serve index.html for any non-API route
  .get("/*", () => {
    return Bun.file(`${distBase}/index.html`);
  })
  .listen(8000);

console.log(`🚀 Mission Control running at http://localhost:8000`);
