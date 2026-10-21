FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN bun install --frozen-lockfile

COPY client/ ./client/
RUN cd client && bun run build

FROM nginx:alpine
COPY --from=0 /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]