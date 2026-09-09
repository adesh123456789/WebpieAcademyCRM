# CBT-001 + OMR-001 decoder - integrator pass (Claude, 2026-09-09)

Rotating-integrator review of `5e1d99b` (CBT clock/eligibility/common results) and `146ecc5`
(sharp multipart decoder + storage seam). Base `146ecc5`. **No blocking findings.** tsc clean;
`npm test` 35 files / 301 pass / 16 todo (all `browser-golden-workflow`).

## CBT-001 (`5e1d99b`) - flipped the 4 e2e todos

`tests/e2e/cbt-ownership.e2e.test.ts` is now **8 live tests, 0 todo**. New `it(...)`:

1. **Server-authoritative clock.** `POST` returns `serverTime` + a derived `expiresAt` (= `startTime + durationMinutes`); the client sends no clock. Backdating the attempt's `startTime` past the duration makes a non-final `PUT` return `409 /expired/i` and flips the row to `TIMED_OUT`.
2. **Autosave + reconnect (AC-011).** A heartbeat `PUT` persists `responses` + `markedForReview` and echoes `serverTime`; a fresh `POST` for the same in-progress attempt (the "reconnect") returns the same `attemptId` and the saved responses/marks verbatim.
3. **Eligibility + attempt-limit.** `blueprint.cbtEligibility` `opensAt` future -> `403 /not opened/i`; `closesAt` past -> `403 /closed/i`; exam bound to a batch the student is not enrolled in -> `403 /not eligible/i`; `attemptLimit: 1` -> second `POST` after a submit -> `409 /limit/i`.
4. **Common pipeline (EVAL-001).** Final submit writes an `isFinal: true` `ExamResult` (`resultId` in the response matches the row) via the same `persistEvaluationResult` the OMR finalize path uses, plus one `MasteryEvidence` row per question (`concept`, `wasCorrect`). Attempt closes to `SUBMITTED`. Not a side path.

Each test builds its own finalized CBT exam (`makeCbtExam`) so it is independent of the shared-attempt ownership tests above it.

### Non-blocking notes on `src/app/api/v1/cbt/attempts/route.ts`

- **Expiry uses `attempt.startTime`, which the client can't move - good.** But `PUT` recomputes `expired` from `attempt.exam.durationMinutes` on every call and `POST` never persists `expiresAt`; if an admin edits `durationMinutes` mid-window every in-flight attempt's deadline shifts. Consider snapshotting the deadline onto the attempt at create time.
- `serverClockTime` is written on create, timeout and heartbeat but never on the `isFinalSubmit` branch (that path sets `submitTime` only). Minor inconsistency, not wrong.
- Timed-out final submit grades `JSON.parse(attempt.responses)` (last heartbeat) and ignores the late `responses` body - correct, worth a comment.
- `catch (err)` returns `err.message` with `500`. Fine for now; a zod/`observedRoute` wrapper like the OMR routes would be tidier.
- Eligibility reads `blueprint.cbtEligibility || blueprint.cbt` - two spellings. Pick one in the contract so the UI writes the key the route reads.

## OMR-001 decoder (`146ecc5`) - verified wired to the raster front-end

New `tests/omr-corpus/image-decoder.test.ts` (3 tests) exercises the exact call the multipart
route makes - `decodeGrayscale(bytes, mime)` -> `extractSheetFromImage(...)`:

- A rendered sheet -> PNG (via `sharp`) -> `decodeGrayscale("image/png")` returns a `GrayscaleImage` with identical dims and **byte-identical** pixels (PNG is lossless for one grey channel).
- Extraction via the decoded upload === extraction from the in-memory sheet (`status CONFIDENT`, same roll, same responses).
- `decodeGrayscale(_, "image/gif")` rejects with `/unsupported/i` before the raster stage.

### Non-blocking notes

- `image-decoder.ts` passes `sharp(input, { density: 200, page: 0 })` - `density` only affects PDF/SVG rasterization and `page: 0` only PDF/TIFF; harmless for PNG/JPEG. For multi-page PDFs only page 0 is read - fine for a single OMR sheet, but a multi-sheet PDF upload silently drops pages 2+. Worth a 400 or a per-page loop later.
- `object-storage.ts` `LocalObjectStorage` writes to `./uploads` and returns `/uploads/<uuid>-<name>`. That's a dev seam - the route stores the URL on `OMRScan.sheetImageUrl` but nothing serves `/uploads/*` yet, and it won't survive a container restart. Fine for pilot-on-one-box; flag before any multi-node deploy. The `ObjectStorage` interface is the right seam for S3/GCS later.
- Route's multipart branch has no file-size or count cap and decodes sequentially in the request - a 50-sheet upload will hold the connection open. OMR-002's async job/telemetry path (UI-005) is where this should move.

## State

`git`: tip `146ecc5` + this commit. `tsc` exit 0. `npm test` 35 files / 301 pass / 16 todo.
Remaining e2e todos: all `tests/e2e/browser-golden-workflow.e2e.test.ts` (UI-005/006/007).
