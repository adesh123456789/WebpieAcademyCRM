# UI-011 Handoff — Antigravity (DONE)

## Task
Academic Node Fleet & Offline Sync Hub UI (Contract C06 / PRD Sec 32-35).

## Claim & Status
- **Claimed**: 2026-09-09 10:25 Asia/Kolkata
- **Base commit**: `0d9cd7f` on `master`
- **Owner**: Antigravity
- **Status**: DONE

## Acknowledgement of Contract C06 & Codex Amendments
Antigravity incorporates:
- `docs/contracts/C06-node-sync.md` (Claude)
- `docs/handoffs/C06-codex.md` (Codex)
Specifically:
- Idempotent `eventId` delivery and causal monotonic `entityVersion`.
- Finalized exam results and payments are strictly immutable / append-only (stale version attempts rejected with `STALE_VERSION`).
- Branch-scoped pull delta and resumable cursors (`cur_...`).
- 90-day pairing token TTL and node revocation (`revokedAt`).

## Files Created / Modified
| File | Change |
|---|---|
| `src/components/modals/NodeSyncModal.tsx` | REWRITTEN — 3-tab hub (Terminal Fleet, Outbox Event Queue, Conflicts & Invariant Resolution); live status classifier (`ONLINE`, `OFFLINE`, `TOKEN_EXPIRING_SOON`, `TOKEN_EXPIRED`, `REVOKED`); 90-day token TTL bar; token copy/reveal; token rotation trigger; revocation toggle; causal event queue table; JSON payload inspector drawer; conflict resolution explanation |
| `src/components/modals/PairNodeModal.tsx` | UPGRADED — Branch selection (branch-scoped pull delta per C06); hardware machine UUID generator helper; 90-day pairing token security notice |
| `src/app/page.tsx` | Added `onRotateToken` and `onRevokeNode` handlers to `NodeSyncModal` with live toasts and automatic node reload |
| `tests/ui-node-sync.test.ts` | NEW — 12 unit tests verifying operational status derivation, 90-day token TTL calculations, event filtering, conflict detection, and search |
| `docs/TASKS.md` | UI-011 board row -> DONE; claims table -> DONE |

## Acceptance Evidence
- `npx tsc --noEmit` -> 0 errors.
- `npx vitest run tests/ui-node-sync.test.ts` -> **12 / 12 passed**.
- `npm test` -> **16 test files / 117 passed tests**, 17 todo.
- `npm run build` -> exit 0, all 24 static and dynamic routes compiled successfully.

## Next Steps for Other Lanes
- **Codex**: Continue `EXM-001` (C03 transactional finalize) and pick up `SyncEvent` table + `revokedAt/pullCursor` migration per C06.
- **Claude**: Complete `OMR-001` raster front-end and integrate with OMR finalize route.
- **Antigravity**: Ready for `UI-005` (OMR upload/crop review controls) once C04 lands, or browser E2E foundation for REL-001.
