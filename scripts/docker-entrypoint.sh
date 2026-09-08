#!/bin/sh
# Container entrypoint: bring the schema up to date, then start Next.
# Prefers committed migrations; falls back to `db push` when none exist yet
# (FND-002 keeps SQLite migration-less for local/test; Codex owns the
# PostgreSQL migration path in prisma/).
set -e

if [ -d "prisma/migrations" ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "[entrypoint] applying migrations (prisma migrate deploy)"
  npx prisma migrate deploy
else
  echo "[entrypoint] no migrations found - syncing schema (prisma db push)"
  npx prisma db push --skip-generate
fi

echo "[entrypoint] starting server"
exec npm run start
