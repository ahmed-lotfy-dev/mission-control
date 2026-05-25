import { Elysia } from "elysia";
import { tasksRoutes } from "./routes/tasks";
import { goalsRoutes } from "./routes/goals";
import { scheduledRoutes } from "./routes/scheduled";
import { agentRoutes } from "./routes/agents";
import { contentRoutes } from "./routes/content";
import { vaultRoutes } from "./routes/vault";
import { dashboardRoutes } from "./routes/dashboard";

const app = new Elysia()
  .onRequest(({ request }) => {
    // CORS headers
    const origin = request.headers.get("origin") ?? "";
    if (origin) {
      request.headers.set("access-control-allow-origin", origin);
      request.headers.set("access-control-allow-methods", "GET,POST,PATCH,DELETE,OPTIONS");
      request.headers.set("access-control-allow-headers", "Content-Type");
    }
  })
  .get("/", () => Bun.file("public/index.html"))
  .get("/static/*", ({ path }) => {
    const filePath = path.replace("/static/", "public/");
    return Bun.file(filePath);
  })
  .use(tasksRoutes)
  .use(goalsRoutes)
  .use(scheduledRoutes)
  .use(agentRoutes)
  .use(contentRoutes)
  .use(vaultRoutes)
  .use(dashboardRoutes)
  .listen(3000);

console.log(`🚀 Mission Control running at http://localhost:3000`);
