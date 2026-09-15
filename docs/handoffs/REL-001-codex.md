# REL-001 Codex release handoff — 2026-09-15 Asia/Kolkata

This is an asynchronous proposal for the Claude REL-001 integrator and Antigravity UI lane. It does not claim either agent has accepted or completed work.

## Baseline and Codex work integrated

- `master` baseline after this pass: `181fb70` (also includes the unrelated durable NodeStore commit `5ccfbe5`).
- OMR upload guard `c002231`: invalid/empty/oversized/excessive/malformed uploads fail before any job or object write; 1–50 files, 10 MiB per file, 100 MiB per batch, 24 million pixels. Tests verify no orphan job.
- OMR image serving `dbc7456`: `scan.sheetImageUrl` in job/create/override API responses is now `/api/v1/omr/scans/:id/image`; the endpoint requires the session/OMR permission and matching tenant. It supports browser cookie and bearer authentication. Persisted `/uploads/<key>` stays server-side. C04 documents this same-field URL change.
- Combined baseline: TypeScript clean; OMR route test 3/3 and API golden loop 30/30 green. UI OMR review test 13/13 green in the worktree. No browser `it.todo` was flipped by this backend slice.

## Next acceptance actions by lane

- **Claude / OMR:** the current Windows `sharp` build cannot decode even a valid PDF (`Input buffer contains unsupported image format`). Implement a portable PDF renderer in `src/lib/omr/**`, with an explicit multi-page policy and a real PDF route test. Ask Codex to add a chosen dependency in the shared `package.json` if needed. Generate actual question crops and benchmark labelled physical sheets through the existing `runCorpus()` report; the >=99% target is still unmeasured.
- **Claude / REL-001:** the 16 remaining `tests/e2e/browser-golden-workflow.e2e.test.ts` todos need browser assertions against UI-005/006/007 and the live backend. Do not flip them based only on unit/API evidence. OMR, Golden workflow and Sync gates remain PARTIAL pending physical/browser/pilot proof.
- **Antigravity / UI-005:** use the projected `scan.sheetImageUrl` as the full-sheet preview fallback; browser image fetches use the session cookie. Assert upload -> flagged review -> authenticated image -> override/finalize in the browser harness. UI-006/007 result/mastery/parent steps can proceed against the already-live APIs.
- **Claude + ops / Data & Support:** the disposable PostgreSQL restore drill remains unevidenced. `docker` and PostgreSQL CLIs are unavailable in this local checkout, so use a CI/staging host with an isolated target and record checksum, migration version and row counts. Monitoring backend wiring and a named escalation owner also remain open.
- **Product owner / pilot:** provide labelled physical sheets, representative exam profile, scanner/Windows hardware and pilot staff to measure OMR accuracy/throughput, report latency and teacher activation.

The launch-gate statuses are proposed only; Claude owns the REL-001 scorecard integration. No production deployment or pilot sign-off occurred in this pass.
