# ---- Build Stage: Client ----
FROM oven/bun:1 AS build

WORKDIR /client

COPY client/package.json client/bun.lock ./
RUN bun install

COPY client/src ./src
COPY client/index.html client/vite.config.ts client/tsconfig.json client/postcss.config.js client/tailwind.config.js client/components.json ./

RUN bun run build

# ---- Runtime Stage: Server ----
FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY src/ ./src/
COPY public/ ./public/
COPY --from=build /client/dist/ ./client/dist/

COPY .env.example ./.env

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]