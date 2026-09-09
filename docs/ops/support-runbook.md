# Support and escalation runbook

**Primary owner:** Product Operations (assign before pilot). **Engineering escalation:** on-call backend engineer. **Security escalation:** security owner for tenant-isolation, auth, or node-signing incidents.

## Triage

1. Capture the UTC time, tenant, route, user role, and `x-request-id`.
2. Check structured API error and latency signals, then inspect the relevant job status (OMR, sync, or report).
3. For a failed OMR/sync job, preserve the job/event IDs and do not retry destructive operations; idempotency keys make safe retries possible.
4. Escalate suspected data exposure, repeated 5xx responses, signature failures, or backup failures immediately to Engineering and Security.

## Recovery

- OMR: leave rejected/ambiguous sheets in review; use an audited override and retry with the same finalize key.
- Sync: retain conflicted outbox events, verify node token/revocation, and retry after connectivity returns.
- Database: stop writes if corruption is suspected and follow `docs/ops/backup-restore.md`.

Every incident closes with impact, timeline, request/job IDs, corrective action, and owner sign-off. Monitoring backend integration and named ownership remain launch prerequisites.
