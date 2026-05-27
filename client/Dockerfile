FROM oven/bun:1

WORKDIR /app

COPY client/package.json client/bun.lock ./
RUN bun install --frozen-lockfile

COPY client/ ./
RUN bun run build

FROM nginx:alpine
COPY --from=0 /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]