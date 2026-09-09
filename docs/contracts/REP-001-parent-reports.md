# REP-001 Parent and student reports contract

**Producer:** Codex report services  
**Consumer:** Antigravity UI-007

`GET /api/v1/parent/portal?roll=<roll>&lang=en|hi|mr` returns a tenant and linked-child scoped report containing `{institute,student,summary,latestResult,conceptHealth,attendance,fees}`. Parents can select only explicitly linked children; student sessions can select only their own profile. `summary` is generated from persisted score/rank/cohort/mastery facts and includes the requested language.

Planned report endpoints: `POST /api/v1/reports/:id/publish` creates an immutable version; `POST /api/v1/reports/:id/share` creates a tenant/child-scoped expiring token; `GET /api/v1/reports/share/:token` requires an unexpired, unrevoked token and exposes only the published projection. A report version records its source result/mastery revisions and cannot change after publish. UI must render unavailable/pending states for unverified mastery and never infer scores client-side.
