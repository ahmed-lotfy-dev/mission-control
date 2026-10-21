/**
 * Temporal client — connects to the Temporal server.
 *
 * Uses TEMPORAL_ADDRESS from env (default: temporal:7233).
 * Falls back gracefully if Temporal is unreachable, so the API
 * server can still start and serve non-Temporal routes.
 */

export function getTemporalAddress(): string {
  return process.env.TEMPORAL_ADDRESS || "temporal:7233";
}

export function getTemporalNamespace(): string {
  return process.env.TEMPORAL_NAMESPACE || "default";
}

export function getTemporalTaskQueue(): string {
  return process.env.TEMPORAL_TASK_QUEUE || "mission-control";
}
