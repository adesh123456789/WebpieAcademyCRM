# OPS-001 CRM follow-up and fees ledger contract

**Producer:** Codex operations APIs  
**Consumer:** Antigravity UI-008

CRM: `GET/POST/PATCH /api/v1/crm/leads` lists or creates tenant/branch-scoped leads and advances `{stage,nextFollowUpAt,lostReason}`. Allowed stages are `ENQUIRY`, `FOLLOW_UP`, `DEMO`, `ADMISSION`, and `LOST`; every transition is audited and counsellors cannot mutate another tenant or branch.

Fees: `GET /api/v1/fees` returns tenant-scoped `{metrics,payments,feePlans}`. Payment creation accepts `{studentId,feePlanId,amount,paymentMode,transactionRef,remarks,idempotencyKey}` and validates positive amount, student/plan ownership, and available balance. A repeated idempotency key returns the original payment; a different payload conflicts. Reversal is append-only, preserves the original receipt, requires fees permission, and emits an audit event. UI must show pending/error states and never calculate authoritative balances from local edits.
