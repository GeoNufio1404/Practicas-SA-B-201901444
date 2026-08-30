# ---- deps: instala solo dependencias de produccion ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ---- final: runtime minimo (alpine), usuario no-root ----
FROM node:22-alpine AS final
RUN addgroup -g 10001 app && adduser -u 10001 -G app -S -D -s /sbin/nologin app
WORKDIR /app
COPY --from=deps --chown=10001:10001 /app/node_modules ./node_modules
COPY --chown=10001:10001 package.json ./
COPY --chown=10001:10001 src ./src
USER 10001
EXPOSE 8000
ENTRYPOINT ["node", "src/index.js"]
