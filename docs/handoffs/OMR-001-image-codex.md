# OMR-001 image access / Codex claim

- Status: DONE for the Codex image-access slice; 2026-09-15 Asia/Kolkata. Integrated on `master` as `dbc7456`; OMR-001 remains IN_PROGRESS.
- Base: `6b2c97d`; branch `codex/omr-001-secure-image`; worktree `C:/Users/Admin/.codex/worktrees/webpie-omr-image`.
- Scope: `src/app/api/v1/omr/**` image route and job response projection, `src/lib/storage/object-storage.ts`, backend route test, `docs/contracts/C04-omr-review.md`, OMR-001 board row and this handoff. No edits to Claude CV internals or Antigravity UI.
- Dependencies: OMR PNG/JPEG upload route, C04 and existing UI review image field.
- What works: `GET /api/v1/omr/scans/:id/image` requires a live session, OMR permission and matching scan-job tenant. It reads the original via `ObjectStorage.get`, returns private/no-store bytes, and gives 404 for another tenant or missing image. Job list/create and override responses project `sheetImageUrl` to this endpoint; the persisted `/uploads/<key>` is not returned there. C04 records the same-field URL change for Antigravity.
- Checks: TypeScript passed; multipart route 3/3, UI OMR review 13/13 and golden API loop 30/30 passed; `git diff --check` passed. The route test verifies byte-exact image retrieval, 401 without a session, 404 across tenants and no raw `/uploads/` key in the job list. A cookie-based browser image assertion was added and rerun before integration.
- Boundary: this serves the full sheet through the current local-disk seam. Real per-question crop rendering, short-lived signed crop URLs, production-durable storage and async 50-sheet processing remain separate OMR-001 release work. Claude's portable PDF rasterizer and physical labelled corpus request are in `OMR-001-upload-guard-codex.md`.
- Integration: the unrelated Academic Node commit `5ccfbe5` landed between base and cherry-pick; Git merged the OMR board row cleanly. No Node files were edited by this slice.
