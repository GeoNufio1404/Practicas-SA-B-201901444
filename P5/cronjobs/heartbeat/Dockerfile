FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

FROM node:22-alpine AS final
RUN addgroup -g 10001 app && adduser -u 10001 -G app -S -D -s /sbin/nologin app
WORKDIR /app
COPY --from=deps --chown=10001:10001 /app/node_modules ./node_modules
COPY --chown=10001:10001 package.json ./
COPY --chown=10001:10001 index.js ./
USER 10001
ENTRYPOINT ["node", "index.js"]
