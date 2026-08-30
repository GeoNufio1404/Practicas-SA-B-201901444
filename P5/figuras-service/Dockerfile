# ---- builder: toolchain solo para compilar better-sqlite3 ----
FROM node:22-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ---- final: runtime minimo (alpine), sin toolchain, usuario no-root ----
FROM node:22-alpine AS final
RUN addgroup -g 10001 app && adduser -u 10001 -G app -S -D -s /sbin/nologin app
WORKDIR /app
COPY --from=builder --chown=10001:10001 /app/node_modules ./node_modules
COPY --chown=10001:10001 package.json ./
COPY --chown=10001:10001 src ./src
# /data queda para el PVC/emptyDir montado (rootfs es read-only en el pod)
RUN mkdir -p /data && chown 10001:10001 /data
USER 10001
EXPOSE 8002
ENTRYPOINT ["node", "src/index.js"]
