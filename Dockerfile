# ============================================
# Stage 1: Build Frontend (Vite + React)
# ============================================
FROM node:20-alpine AS frontend-builder

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.ts tsconfig.json ./
COPY src/ src/

RUN npm run build

# ============================================
# Stage 2: Build Backend (esbuild)
# ============================================
FROM node:20-alpine AS backend-builder

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY src/ src/
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
FROM node:20-alpine AS runtime

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

RUN apk add --no-cache tzdata

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=backend-builder /app/dist/ dist/

RUN mkdir -p uploads

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "dist/server.cjs"]
