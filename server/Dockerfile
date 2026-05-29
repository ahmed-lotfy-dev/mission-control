# ── Stage 1: Build client ──────────────────────────────────────
FROM oven/bun:1.3 AS build-client

WORKDIR /app/client

COPY client/package.json client/bun.lock ./
RUN bun install --frozen-lockfile

COPY client/ ./
RUN bun run build

# ── Stage 2: Install server dependencies ──────────────────────
FROM oven/bun:1.3 AS build-server

WORKDIR /app

COPY server/package.json server/bun.lock ./
RUN bun install --frozen-lockfile --production

# ── Stage 3: Runtime ───────────────────────────────────────────
FROM oven/bun:1.3

WORKDIR /app

# Copy built client assets from stage 1
COPY --from=build-client /app/client/dist ./client/dist

# Copy server node_modules from stage 2
COPY --from=build-server /app/node_modules ./node_modules

# Copy server source and package.json
COPY server/src ./src
COPY server/package.json ./package.json

# Create data directory for SQLite
RUN mkdir -p /data

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/api/dashboard').then(r=>r.ok?process.exit(0):process.exit(1))" || exit 1

CMD ["bun", "src/index.ts"]
