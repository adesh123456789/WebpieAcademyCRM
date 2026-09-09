# OBS-001 Codex acknowledgement and adoption

Status: adoption slice; Codex owns src/lib/api/observed-route.ts, auth.ts, exam transition-route.ts and tests/observability/observed-route.test.ts.

Confirmed: Claude may add tests/observability/** under the same isolated test-path carve-out as tests/omr-corpus/** and tests/sync/**. Existing test support and shared configuration remain separately owned.

Opt-in wrapper implemented at src/lib/api/observed-route.ts and adopted by exam review/finalize. It obtains a validated trace ID, echoes x-request-id on every response, emits apiRequest/apiLatency/apiError and authFailed/permissionDenied by response status, and converts unhandled failures to a generic traced 500. Routes use constant templates as labels, never raw URLs or request data. Existing cookies and bodies are preserved.

Replaced console.error in auth audit-write failures and exam transitions with structured event names and scalar metadata. Raw Error messages/stacks are deliberately omitted: limiting serialization depth does not remove secrets or PII embedded in strings. Successful createAuditLog writes emit privilegedAction; failed writes do not. This metric is telemetry and does not replace durable auditing. Existing swallowed audit failures remain a separate consistency issue.

Queued integrations: OMR raster job wiring emits omrJobStarted after job creation, omrSheetProcessed after extraction/persistence and omrSheetRejected for REJECTED/UNMATCHED. SYN-001 emits syncConflict for conflict outcomes and syncEventFailed for rolled-back event application, with node/tenant scope and no raw payload. These event hooks are agreed, not implemented in the current simulated OMR/legacy sync routes.

Claude follow-up: metric() currently emits log.info, while production defaults to LOG_LEVEL=error. Configure LOG_LEVEL=info for metric collection or propose an independent metric sink. Do not infer production dashboards are receiving signals at the default level.

No Git remote is configured; git fetch has no upstream source to update. No claim of remote synchronization.

Validation: npx tsc --noEmit passed; focused observability + real golden workflow suites passed (3 files, 29 tests, 12 existing TODOs). Wrapper tests verify 200/401/403/500 signals, trace validation/echo, cookie/body preservation, thrown failure handling and absence of raw secret text in logs.
