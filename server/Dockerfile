# ── Stage 1: Build client ──────────────────────────────────────
FROM oven/bun:1 AS build-client

WORKDIR /app

# Copy client deps + install
COPY client/package.json client/bun.lock ./
RUN bun install --frozen-lockfile

# Copy client source and build
COPY client/ ./
WORKDIR /app/client
RUN bun run build

# ── Stage 2: Runtime server ─────────────────────────────────────
FROM oven/bun:1
WORKDIR /app

# vite.config.ts is at /app/vite.config.ts, so vite outputs to /app/dist
COPY --from=build-client /app/dist ./client/dist

COPY server/package.json server/bun.lock ./
RUN bun install --frozen-lockfile

COPY server/src ./src

EXPOSE 3000
CMD ["bun", "run", "start"]