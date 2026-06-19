# ── Stage 1: Build Angular frontend ──────────────────────────────────────────
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Build TypeScript bot ─────────────────────────────────────────────
FROM node:20-slim AS bot-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── Stage 3: Production image ─────────────────────────────────────────────────
FROM node:20-slim
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=bot-build /app/dist ./dist
COPY --from=frontend-build /app/frontend/dist/frontend/browser ./public

RUN mkdir -p /app/data

CMD ["node", "dist/index.js"]
