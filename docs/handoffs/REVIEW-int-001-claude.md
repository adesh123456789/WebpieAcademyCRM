# Review - INT-001 (Claude, 2026-09-09)

Rotating-integrator review of `ee6156f` + `2bc80e2`. Closed loop works end to end (golden-workflow S9/S10/S11 live, green). **One real finding.**

## Finding - cross-tenant question leak in `createIntervention`

`src/lib/intervention/intervention-service.ts` `createIntervention`:

```ts
const practiceQuestions = await prisma.question.findMany({
  where: { concept: params.concept },
  take: 6,
});
```

No tenant / owner-scope / status filter. A tenant's remedial practice ladder can include **another tenant's `TENANT_PRIVATE` questions**, and unapproved (`DRAFT` / `AI_CANDIDATE`) ones. Same class of bug fixed earlier in exam creation (`draft.ts`) and the AI bank fallback (`bank-fallback.ts`). Fix:

```ts
where: {
  concept: params.concept,
  status: { in: ["REVIEWED", "VERIFIED"] },
  OR: [{ ownerScope: "PLATFORM", tenantId: null }, { ownerScope: "TENANT_PRIVATE", tenantId: params.tenantId }],
}
```

## Non-blocking notes

- `detectWeaknessQueue(tenantId)` has no branch / assigned-batch scope - a teacher or branch admin sees every weak student in the tenant. Should narrow by `branchId` / the caller's `scopes.batchIds` (as `AIGateway.copilotWeaknessPlan` already does).
- Practice-ladder tiers are assigned by array index, not by `declaredDifficulty` - order questions EASY -> MEDIUM -> HARD so "Foundation -> Application -> Exam-level" is real.
- Retest route: auth + `interventions_manage` + tenant scope + input validation + audit + `observedRoute` wrapper - all good. Empty `results` -> 422 (AC-009) - good.

## State

`tsc` + `npm test` 34 files / 288 pass + 26 todo. golden-workflow 30 pass / 6 todo (S9-S11 flipped by Codex in `2bc80e2`). Remaining golden todos: REP-001 (S12a/b), STU-001 (S2a), EVAL-001 (S8a/b).
