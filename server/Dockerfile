# ── Stage 1: Build client ──────────────────────────────────────
FROM oven/bun:1 AS build-client

WORKDIR /app

# Install + build client (vite build only, no tsc -b)
COPY client/package.json client/bun.lock ./
RUN bun install --frozen-lockfile

COPY client/ ./
RUN bun run build

# ── Stage 2: Runtime server ─────────────────────────────────────
FROM oven/bun:1
WORKDIR /app

# Copy pre-built client dist into expected location
COPY --from=build-client /app/dist ./client/dist

# Install server dependencies
COPY server/package.json server/bun.lock ./
RUN bun install --frozen-lockfile

# Copy server source
COPY server/src ./src

EXPOSE 3000
CMD ["bun", "run", "start"]