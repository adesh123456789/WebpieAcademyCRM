# C05 results/mastery contract acknowledgement

Status: PUBLISHED; UI-006 is unblocked to build against the current result projection and additive OMR-002/INT-001 shapes.

The current endpoint is live at `GET /api/v1/results/exams/:id`. Student drilldown, mastery evidence and intervention ladder fields are reserved for the OMR-002 and INT-001 implementations; Antigravity should render explicit loading/empty/pending states until those endpoints land.

Security requirements: server-resolved tenant and record scope, linked-child-only parent access, deterministic authoritative values, immutable revision metadata, and no answer-key exposure in student/parent views.
