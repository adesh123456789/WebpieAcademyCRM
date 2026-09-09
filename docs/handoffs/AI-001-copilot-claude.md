# AI-001 / Claude - scoped Teacher Copilot

- **Status**: Claude half DONE (`7e8fb9d`). Route wiring is Codex.
- **Base**: `7d08af4`. Contract: `docs/contracts/AI-001-ai-gateway.md`.

## Landed (`src/lib/ai/copilot.ts`)

`copilotWeaknessPlan(input: { batchId, subject? }, ctx: AIContext & { scopes, branchId? })` -> `AIResult<CopilotActionPlan | null>`:

- **Scope (AC-018)**: `resolveCopilotScope(role, session.scopes)` - `TEACHER` gets `scopes.batchIds`; `OWNER` / `BRANCH_ADMIN` / `INDIVIDUAL_TEACHER` / `WEBPIE_ADMIN` get every batch in tenant/branch. A `batchId` outside that set -> `AIScopeError` before any read. Another tenant's batch -> `AIScopeError` (AC-015).
- **Evidence**: `MasteryScore` rows (`state in CRITICAL/WEAK`) for students **enrolled in the in-scope batch only**, filtered to `ctx.tenantId`. Groups by concept, ranks by students-affected then lowest average.
- **Output**: a deterministic `CopilotActionPlan` with `status: "PROPOSED"`, `retrievalScope: "TENANT_PRIVATE"`, templated `recommendedActions` (remedial worksheet + doubt session), `evidenceSummary` citing counts/averages, `confidenceScore` from evidence density, `aiRequestId`. **No side effects** - confirming the plan (creating the worksheet/intervention) is a separate authorized call. `data: null` when no weak concept in scope.
- Deterministic (analytics + templates); a model may later rephrase `evidenceSummary` through the gateway (timeout+fallback), numbers stay authoritative.
- Provenance: one `AIRequest` per call, `task: "copilot.query"`, `provider: "webpie-analytics"`. Metrics: `aiRequest{task:copilot.query}`, `permissionDenied{route:ai.copilot}` on scope refusal.
- `schemas.ts`: `copilotActionPlanSchema` (matches UI-012's `CopilotActionPlan` + a `status: "PROPOSED"` field), `AITask += "copilot.query"`. `AIGateway.copilotWeaknessPlan` delegate.
- `tests/ai-gateway.test.ts` +5 (carve-out): scope denied, in-scope-only plan with zero `Intervention` writes, null-when-no-weakness, owner-any-batch, cross-tenant denied. tsc + 270 tests / 29 todo.

## Codex - route wiring

`POST /api/v1/ai/copilot` (new): `getSessionContext` -> build `ctx` (`{ tenantId, userId, role, traceId: x-request-id, branchId, scopes: session.scopes }`) -> `AIGateway.copilotWeaknessPlan(body, ctx)`. Map `AIScopeError` -> `403 { error: { code: "AI_SCOPE_DENIED", ... } }`. A separate confirm endpoint turns `plan.id` into a real `Intervention` (that write is authoritative and audited - not the Copilot's job).

## Antigravity - UI-012

The returned plan matches `CopilotActionPreviewModal`'s `CopilotActionPlan` exactly, plus `status: "PROPOSED"`. `data === null` means "no weaknesses in this batch's scope" - show an empty state, not an error. Wire the modal's `onConfirmPlan(planId)` to the future confirm endpoint.

## Remaining AI-001

- `tutor.query` (Student Tutor) stays behind a Beta flag - not in this slice.
- Copilot "explain batch performance" as a second tool (read-only) once there's a UI ask.
