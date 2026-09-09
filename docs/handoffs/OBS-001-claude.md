# OBS-001 / Claude - observability layer

- **Task / owner**: OBS-001 (structured logging + correlation id + monitoring signal catalog) / Claude. Platform lane; supports PRD Section 41-42 and release gate 5 / the launch war-room (Section 61).
- **Timestamp + timezone**: 2026-09-09 Asia/Kolkata
- **Status**: DONE (Claude-owned slice, integrated on `master`). Adoption in routes/services is opt-in follow-up per lane.
- **Base**: `1740324`.

## Files (new `src/lib/observability/**`)

- `logger.ts` - JSON-per-line structured logger. `log.{error,warn,info,debug}(event, fields?, err?)` + `log.child(bound)`. Level from `LOG_LEVEL` (`silent<error<warn<info<debug`), default `info`, `error` in production, `silent` under `NODE_ENV=test`. Callers pass **explicit scalar fields only** - no deep object serialization, so raw PII cannot leak (OBS-003). Errors reduced to `errName`/`errMessage`/truncated `errStack`. `setSink()` for tests; logging never throws into the caller.
- `trace.ts` - `getTraceId(headers)` reads `x-request-id` / `x-correlation-id` (accepts a `Headers` or a plain bag), else mints a uuid; `TRACE_HEADER` constant; `traceLogger(traceId, scope?)` returns a bound child logger (OBS-001).
- `signals.ts` - `SIGNALS` catalog: every PRD Section 42 dashboard (cloud / omr / ai / sync / product / security) with key, unit and operator alert thresholds; `metric(name, value, fields?)` emits a structured `metric` line a collector can scrape until a real metrics backend lands.
- `index.ts` - re-exports.

## Wired now

- `src/lib/ai/ai-gateway.ts` - the three `console.error` calls replaced with `traceLogger(ctx.traceId).warn(...)`; emits `aiRequest` / `aiLatency` / `aiFallback` / `aiInvalidOutput` on each outcome branch.
- `src/lib/ai/provenance.ts` - provenance-write failure now `traceLogger(...).error("ai.provenance_write_failed", ...)`.

## Checks

- `npx tsc --noEmit` -> exit 0.
- `npm test` -> 18 files / 138 pass + 32 todo (added 12 observability tests; no existing test changed).

## Carve-out request (Codex)

New `tests/observability/**` subtree, same test-path carve-out already granted for `tests/omr-corpus/**` and `tests/sync/**`. It touches nothing in `tests/support/**` or existing suites. Please confirm in a handoff.

## Adoption path (other lanes, opt-in)

- **Route wrapper (Codex):** at the top of each `src/app/api/v1/**` handler, `const traceId = getTraceId(req.headers)`, set it on the response as `x-request-id`, and emit `metric("apiRequest", 1, { route, method })` + `metric("apiLatency", ms, { route })`; on the 500 catch, `metric("apiError", 1, { route })` + `traceLogger(traceId).error(...)`. Replace the remaining ad-hoc `console.error` in `src/lib/auth.ts` and `src/lib/exams/transition-route.ts`.
- **Security signals (Codex):** `authFailed` on 401 from login/session, `permissionDenied` on 403, `privilegedAction` on result unlock / fee reversal / OMR override / permission change / node pairing (SEC-005 / OBS).
- **OMR (Codex route half of OMR-001):** `omrJobStarted`, `omrSheetProcessed`, `omrSheetRejected` when `extractSheetFromImage` returns `REJECTED`/`UNMATCHED`.
- **Sync (SYN-001):** `syncConflict` per rejected event, `syncEventFailed` per rolled-back transaction, `syncNodesOnline` / `syncQueueSize` from the fleet endpoint.
- **Product funnel (REL-001):** `goldenStepCompleted` as each `Sn` step in `tests/e2e/` turns live; `interventionVerified` from INT-001.

## Next

Claude: hold for EVAL-001 -> SYN-001 (`src/lib/sync/**`, spec is turnkey in `docs/contracts/C06-node-sync.md` section 11). Available meanwhile to wire the route wrapper if Codex wants Claude to own that shared helper.
