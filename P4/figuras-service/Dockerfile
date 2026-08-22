FROM node:22-slim

WORKDIR /app

# better-sqlite3 compila código nativo, necesita build tools
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json .
RUN npm install --omit=dev

COPY src ./src

EXPOSE 8002

CMD ["node", "src/index.js"]
