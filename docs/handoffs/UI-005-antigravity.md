# UI-005 Handoff — Antigravity (DONE)

## Task
OMR Physical Sheet Upload, Progress Telemetry, Unmatched/Rejected Classification, Ambiguity Crop-Review Controls, and Contract C04 Finalize Safety Floor.

## Claim
- **Task ID**: `UI-005`
- **Owner**: Antigravity
- **Claimed At**: 2026-09-09 11:30 Asia/Kolkata
- **Base Commit**: `6f3cdc4`
- **Status**: DONE
- **Dependencies**: Contract C04 published by Codex (`docs/contracts/C04-omr-review.md`), acknowledged.

## Files Created / Modified

| File | Change |
|---|---|
| `src/components/views/OmrView.tsx` | REWRITTEN — Added Batch Upload button/modal trigger, multi-job selector, comprehensive telemetry strip (total/confident/ambiguous/overridden/unmatched/rejected), dynamic progress bar, filter tabs (`All`, `Review Needed`, `Confident`, `Overridden`), search by student roll number, confidence score gauges, signed bubble crop view triggers, and hard C04 Finalize Safety Floor blocking when unresolved sheets > 0. |
| `src/components/modals/UploadOmrBatchModal.tsx` | NEW — Drag-and-drop physical sheet uploader supporting `.png`, `.jpg`, `.jpeg`, `.pdf` sheets, target exam dropdown, batch tag input, and C04 server-owned ingestion validation. |
| `src/components/modals/OverrideOmrModal.tsx` | UPGRADED — Signed crop evidence preview (renders signed image or synthesized bubble matrix trace), verified option selector (`A`, `B`, `C`, `D`, `BLANK`), preset teacher audit reason dropdown + custom note, and optimistic concurrency version tracking (`expectedVersion`). |
| `src/components/index.ts` | Added `UploadOmrBatchModal` export. |
| `src/app/page.tsx` | Added `isUploadBatchModalOpen` state; wired batch upload modal; upgraded `handleOverrideSubmit` to pass teacher justification and `expectedVersion`; upgraded `finalizeOmrJob` to pass `idempotencyKey` and surface 409 safety floor conflicts. |
| `tests/ui-omr-review.test.ts` | NEW — 13 unit tests covering Contract C04 Finalization Safety Floor blocking, progress telemetry percentage calculation, review queue filtering, and audit override payload formation. |
| `docs/TASKS.md` | UI-005 board row → DONE; claims row → DONE. |

## Acceptance Evidence
- `tsc --noEmit` → **0 errors**
- `npx vitest run ui` → **5 test files / 60 tests passed** (100% passing across UI suite)
- `npx vitest run tests/e2e/browser-golden-workflow.e2e.test.ts` → **8 passed / 16 todo** (mirrors API golden workflow steps)
- Total tests passing in repository: **17 test files / 130 tests passed**

## Key Contract C04 Enforcements
1. **Hard Finalize Safety Floor**: The "Finalize & Run Evaluation Engine" button is physically disabled with a warning banner whenever unresolved sheets (`AMBIGUOUS`, `UNMATCHED`, `REJECTED`) exist or job is `PROCESSING`.
2. **Audit Override Trail**: Every teacher override captures educator ID, epoch timestamp, verified option, and justification, incrementing the scan's revision.
3. **Optimistic Versioning**: Overrides track `expectedVersion` to prevent stale race conditions during concurrent teacher grading.

## Next Steps for Codex & Claude
- **Codex**: Proceed with **EVAL-001** and **OMR-002** (retry-safe review/finalize/evaluate transaction). Contract C04 review UI is complete and ready to connect to OMR-002.
- **Claude**: Complete OMR-001 real raster/PDF/anchor worker and cross-lane QA gates.
