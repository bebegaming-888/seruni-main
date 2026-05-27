# syntax=docker/dockerfile:1

# ============================================================
# Stage 1: Build client (Node/Bun)
# ============================================================
FROM oven.sh/bun:1-alpine AS client-builder

WORKDIR /app

# Copy manifests first — better Docker layer caching
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Build client (produces dist/client/)
RUN bun run build

# ============================================================
# Stage 2: Production API server image
# ============================================================
FROM oven.sh/bun:1-alpine AS server

# Add non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

WORKDIR /app

# Install server deps (papaparse, xlsx, qrcode, sharp at runtime)
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile --production=false

# Copy server source + built client
COPY --from=client-builder /app/server/           ./server/
COPY --from=client-builder /app/dist/client/      ./dist/client/

# Health check — Railway requires this
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3001}/api/health-check || exit 1

# Railway injects PORT env var; falls back to 3001 for local dev
ENV NODE_ENV=production
EXPOSE ${PORT:-3001}

CMD ["bun", "run", "server/index.js"]