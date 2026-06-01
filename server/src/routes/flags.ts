import { Elysia } from "elysia";

/**
 * Feature Flags API
 *
 * Reads flags from FEATURE_FLAGS env var (JSON string).
 * Bun auto-loads .env so process.env.FEATURE_FLAGS is available.
 *
 * Example .env:
 *   FEATURE_FLAGS={"maintenance":false,"newDashboard":true,"aiAssistant":false}
 *
 * Big company pattern: backend owns the truth, frontend consumes.
 * Flags can be updated by changing .env and restarting (self-hosted)
 * or via a dashboard (SaaS like LaunchDarkly/Flagsmith).
 */

function parseFlags(): Record<string, boolean> {
  try {
    const raw = process.env.FEATURE_FLAGS;
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Record<string, boolean>;
    }
    return {};
  } catch {
    console.error("[flags] Failed to parse FEATURE_FLAGS env var — expected valid JSON object");
    return {};
  }
}

export const flagsRoutes = new Elysia({ prefix: "/api/flags" })
  .get("/", () => {
    const flags = parseFlags();
    return {
      flags,
      maintenance: flags.maintenance === true,
      // Convenience: always expose maintenance as a top-level boolean
      // so the frontend doesn't need to know flag names
    };
  });
