#!/bin/sh
# Container entrypoint: bring the schema up to date, then start Next.
# Prefers committed migrations; falls back to `db push` when none exist yet
# (FND-002 keeps SQLite migration-less for local/test; Codex owns the
# PostgreSQL migration path in prisma/).
set -e

case "${DATABASE_URL:-}" in
  postgresql://*|postgres://*)
    echo "[entrypoint] applying PostgreSQL migrations"
    npx prisma migrate deploy --schema prisma/schema.postgresql.prisma
    ;;
  *)
    echo "[entrypoint] syncing SQLite schema"
    npx prisma db push --skip-generate --schema prisma/schema.prisma
    ;;
esac

echo "[entrypoint] starting server"
exec npm run start
