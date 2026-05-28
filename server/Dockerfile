# ── Stage 1: Build client ──────────────────────────────────────
FROM oven/bun:1 AS build-client

WORKDIR /app/client

# Copy client deps + install
COPY client/package.json client/bun.lock ./
RUN bun install --frozen-lockfile

# Copy client source and build
COPY client/ ./
RUN bun run build

# ── Stage 2: Build server ──────────────────────────────────────
FROM oven/bun:1 AS build-server

WORKDIR /app

# Copy server deps + install
COPY server/package.json server/bun.lock ./
RUN bun install --frozen-lockfile

# Copy server source
COPY server/src ./src

# ── Stage 3: Runtime ───────────────────────────────────────────
FROM oven/bun:1

WORKDIR /app

# Copy built client assets from stage 1
COPY --from=build-client /app/client/dist ./client/dist

# Copy server from stage 2
COPY --from=build-server /app/node_modules ./node_modules
COPY --from=build-server /app/src ./src
COPY --from=build-server /app/package.json ./package.json

EXPOSE 3000
CMD ["bun", "run", "start"]
