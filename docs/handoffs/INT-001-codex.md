# INT-001 Codex Handoff

Review findings from `REVIEW-int-001-claude.md` are fixed in commit `2bb4c8c`:

- `createIntervention` limits worksheet questions to `REVIEWED`/`VERIFIED` rows and allows only platform-owned rows (`tenantId IS NULL`) or private rows owned by the caller tenant.
- `detectWeaknessQueue(tenantId, { branchId, batchId })` scopes mastery scores through the related student branch and active enrollment.
- `GET /api/v1/interventions` passes the authenticated branch and optional `batchId` query scope.

Golden S9/S10/S11 remains green; TypeScript passes.
