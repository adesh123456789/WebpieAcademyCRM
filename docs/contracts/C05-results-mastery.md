# C05 Results and mastery contract

**Producer:** Codex results/mastery services  
**Consumer:** Antigravity UI-006

## Current result projection

`GET /api/v1/results/exams/:id` requires an authenticated staff session scoped to the tenant. It returns:

```json
{
  "exam": {"id":"...","title":"...","code":"...","examType":"JEE_MAIN","totalMarks":300,"totalQuestions":75,"status":"FINALIZED"},
  "analytics": {"totalStudents":120,"highestScore":286,"lowestScore":42,"averageScore":184.5,"subjectStats":[{"subject":"PHYSICS","averagePercentage":71}]},
  "leaderboard": [{"rank":1,"percentile":100,"studentId":"...","studentName":"...","rollNumber":"...","score":286,"accuracyPercentage":92,"totalAttempted":72,"totalCorrect":66,"totalIncorrect":6,"negativeMarksDeducted":6,"subjectScores":{}}]
}
```

Scores, ranks, percentiles, revisions and answer-key corrections come only from deterministic evaluation. Results are tenant-scoped; student/parent projections must expose only the authenticated student or explicitly linked child and must never expose answer keys.

## Planned OMR-002 / INT-001 extensions

- `GET /api/v1/results/exams/:id/students/:studentId` returns the selected result revision, question-level evidence, concept aggregates, and revision metadata (`revision`, `computedAt`, `supersedesResultId`).
- `GET /api/v1/mastery/students/:studentId` returns `{concepts:[{concept,subject,score,state,confidence,evidenceCount,insufficientEvidence}], updatedAt}`.
- `GET /api/v1/interventions/:id` returns `{id,title,concept,priority,status,verifiedAt?,ladder:[{tier,questionIds}],worksheetUrl?}`. `status` remains `UNVERIFIED` until a retest supplies sufficient evidence.

Pending fields are additive and may be feature-detected. Empty cohorts and insufficient evidence are valid states, not errors. Errors use the existing 401/403/404 envelope and echo `x-request-id`; every projection includes its authoritative `computedAt`/revision so the UI can show when data was last calculated.
