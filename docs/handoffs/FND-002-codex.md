# FND-002 / Codex coordination handoff

- Status: READY FOR COORDINATED IMPLEMENTATION; 2026-09-09 Asia/Kolkata.
- Codex owner: `prisma/schema.prisma`, Prisma provider/migration strategy, database test contract and review of the integrated result. Claude owns `Dockerfile`, `docker-compose.yml`, `.github/**`, runtime env and observability files. Do not edit these surfaces concurrently.
- Current baseline: `cd23d28` plus SEC-001 `598b7dd`; master currently includes the documentation commits after those slices. Codex must rebase/fast-forward before the schema portion starts.
- Problem: Prisma schema is SQLite while Compose supplies PostgreSQL. Docker currently copies `/app/public` although no tracked `public/` directory exists. Compose contains static credentials. Local isolated Vitest databases depend on SQLite and must remain usable.

## Proposed implementation boundary

1. Keep SQLite as the local/test provider during this slice so `npm test` remains zero-dependency and isolated. Add a documented PostgreSQL production schema/migration path only after verifying Prisma's generated client strategy; do not silently change `schema.prisma` and break CI.
2. Claude changes Compose/Docker to consume runtime secrets and a provider-appropriate database URL, adds a safe public asset strategy, and extends CI with a fresh-build/container smoke check. No committed passwords or fallback production secrets.
3. Codex reviews any schema/provider changes, runs Prisma generate/db push or migrations against fresh temporary databases, and documents rollback/forward-fix behavior. Destructive migration requires explicit product approval.
4. Acceptance is a fresh checkout: install, generate, initialize test DB, typecheck, full isolated tests, build, and container build/start smoke without touching `prisma/dev.db` or requiring demo seed data. Record exact commands and environment assumptions.

## Contract with Claude

Claude may request schema changes in this handoff or a follow-up, but must not edit `prisma/schema.prisma`. Codex will acknowledge each requested field/model before implementation. Claude must preserve `DATABASE_URL`, `JWT_SECRET`, AI keys and public app URL as runtime inputs and avoid emitting secrets into logs.

## Known follow-up after FND-002

STU-001 will add explicit `User.studentProfileId` / `User.parentProfileId` (or an equivalent normalized account-link model) with unique relations, backfill/seed strategy and route tests. Do not add those relations as an incidental infrastructure migration. The present SEC-001 email compatibility bridge is documented and temporary.

## Checks available before the coordinated slice

FND-001 provides isolated per-suite SQLite DBs and real handler requests. CLD-001 provides CI commands. CLD-002 provides an OMR baseline (88.46% accuracy, 1.28% false-confidence, and unsupported sheets leaking `CONFIDENT`) that remains an explicit pre-OMR-001 measurement; infrastructure work must not hide or rewrite it.

Next action: Claude claims the infra files in a task-specific handoff and proposes the container/provider patch. Codex reviews that proposal, then implements the schema/provider portion and integrates the complete FND-002 slice.
