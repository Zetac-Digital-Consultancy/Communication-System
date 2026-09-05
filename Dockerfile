# syntax=docker/dockerfile:1

# ---- Stage 1: install dependencies ----
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
# postinstall runs "prisma generate", which needs the schema
COPY prisma ./prisma
RUN npm ci

# ---- Stage 2: build ----
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Dummy values so route modules can be evaluated during "next build".
# Real values are provided at runtime via docker-compose / -e flags.
ENV SESSION_SECRET=build-time-only-dummy-secret-not-used-at-runtime
ENV DATABASE_URL=file:./build-dummy.db
ENV NEXT_TELEMETRY_DISABLED=1
ENV BUILD_STANDALONE=true

RUN npm run build

# ---- Stage 3: runtime ----
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:/app/data/app.db

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Standalone server + static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Use the exact locked Prisma CLI and its patched dependencies for migrations.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Prisma schema and versioned migrations for the entrypoint
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Writable dirs for the SQLite database and user uploads (mounted as volumes)
RUN mkdir -p /app/data /app/uploads \
    && chown -R nextjs:nodejs /app/data /app/uploads

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
