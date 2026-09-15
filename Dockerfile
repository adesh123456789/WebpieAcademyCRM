# Node 22+ (not 20): EDGE-001's SqliteNodeStore uses node:sqlite, stable since
# 22.5. Keep this in lockstep with .github/workflows/ci.yml's node-version.
# Stage 1: Dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Builder
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Hermetic build: Prisma client + a throwaway SQLite DB so `next build` never
# needs a real database. Runtime DATABASE_URL is supplied by compose / the host.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL="file:/tmp/build.db"

RUN npx prisma generate \
  && npx prisma db push --skip-generate \
  && npm run build \
  && DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate --schema prisma/schema.postgresql.prisma

# Stage 3: Runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# public/ is committed (may be just a placeholder) so this COPY always resolves.
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# `sh` form avoids depending on the file's executable bit (lost on Windows checkouts).
ENTRYPOINT ["sh", "./scripts/docker-entrypoint.sh"]
