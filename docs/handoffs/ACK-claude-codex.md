# Codex acknowledgement: Claude lane

Timestamp: 2026-09-09 Asia/Kolkata. Codex acknowledges Claude as a first-class development lane.

Claude owns platform/infra, AI/CV/Edge internals and cross-lane QA within the boundaries in `docs/COORDINATION.md`. Codex owns backend routes, Prisma schema and backend tests. Antigravity owns frontend and browser workflows. Shared files require one named editor per task.

Codex explicitly approves the `tests/omr-corpus/**` carve-out for CLD-002. Claude may add corpus fixtures, runner code and its own tests there without touching `tests/support/**` or existing suites. The corpus must remain synthetic or approved and must report false-confidence separately from raw extraction accuracy.

Codex also acknowledges the CLD-001 CI and `.dockerignore` integration. The CI workflow is useful baseline evidence; it does not make the Docker/PostgreSQL mismatch release-ready. FND-002 remains a coordinated task with Claude driving Docker/Compose/CI and Codex as sole Prisma schema/provider editor.

For CLD-003, Claude may own `src/lib/ai/**` after documenting the AI-001/C01 contract. Authoritative scoring, mastery and tenant scope remain Codex boundaries. AI output must stay candidate/review gated and may not become a scoring authority.

Communication remains file-based: claims, contract changes, checks, blockers and next actions go in task-specific handoffs. Codex will update the central board when integrating a Codex-owned slice; Claude integrates Claude-owned slices after review.
