# ============================================
# Stage 1: Build Frontend (Vite + React)
# ============================================
# Base image is a build arg so a deploy can point at a reachable mirror without
# editing this file: Docker Hub answers Iranian datacenter IPs with 403, which
# aborted CD #109 with "failed to resolve source metadata for node:20-alpine".
# The default stays canonical for normal environments.
ARG NODE_IMAGE=node:20-alpine

FROM ${NODE_IMAGE} AS frontend-builder

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.ts tsconfig.json ./
COPY public/ public/
COPY src/ src/

RUN npm run build

# ============================================
# Stage 2: Build Backend (esbuild)
# ============================================
FROM ${NODE_IMAGE} AS backend-builder

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY src/ src/
COPY src/server/assets/ dist/assets/
COPY --from=frontend-builder /app/dist/ dist/

RUN npx esbuild src/server/index.ts \
  --bundle \
  --platform=node \
  --format=cjs \
  --packages=external \
  --outfile=dist/server.cjs

# ============================================
# Stage 3: Production Runtime
# ============================================
FROM ${NODE_IMAGE} AS runtime

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

RUN apk add --no-cache tzdata postgresql-client fontconfig

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=backend-builder /app/dist/ dist/

RUN mkdir -p /usr/share/fonts \
    && cp dist/assets/fonts/Vazirmatn-Bold.ttf /usr/share/fonts/ \
    && fc-cache -f

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN mkdir -p uploads backups && chown -R appuser:appgroup /app

USER appuser

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "dist/server.cjs"]
