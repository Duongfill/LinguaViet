# ---- Build client ----
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci
COPY . .
RUN npm run build

# ---- Runtime ----
FROM node:20-bookworm-slim
WORKDIR /app
# Cổng: dùng PORT do nền tảng cấp (Render/Railway/Fly), mặc định 3101
ENV NODE_ENV=production \
    PORT=3101 \
    DB_PATH=/data/langapp.db
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev -w server && npm cache clean --force
COPY server server
COPY --from=build /app/client/dist client/dist
# /data chứa DB + vapid.json: gắn volume vào đây để không mất dữ liệu khi deploy lại
VOLUME ["/data"]
EXPOSE 3101
CMD ["node", "server/src/index.js"]
