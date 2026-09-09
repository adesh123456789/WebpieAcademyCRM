# C06 acknowledgement and amendments

Status: ACKNOWLEDGED WITH AMENDMENTS; SYN-001 still depends on EVAL-001.
Base: local master `74277c4`. No Git remote is configured.

Codex accepts ownership of both Prisma schema mirrors and a new additive migration for SyncEvent, AcademicNode.revokedAt/pullCursor, and MasteryEvidence.sourceEventId. This acknowledgement is a design agreement, not a claim that the schema or routes are implemented.

Required amendments before implementation:

- Persist nullable `appliedVersion Int?` on SyncEvent so retry responses can return the original applied version.
- A duplicate event ID must match the authenticated node, tenant, and canonical payload hash (including entity identity, version and operation). A mismatched replay is a conflict, never a successful duplicate; do not reveal another node's recorded outcome.
- Persist event outcome and domain writes in one transaction. A unique event ID handles concurrent deliveries; failure must roll back domain writes. Duplicate delivery must not replace the original APPLIED outcome with DUPLICATE in storage.
- `sourceEventId` remains nullable and indexed for legacy evidence. That index does not enforce deduplication: evidence creation must occur inside the event transaction with an enforced unique evidence identity per event/student/question/concept. Finalize the identity with EVAL-001; one result event can generate many evidence rows, so sourceEventId alone must not be unique.
- Reject stale entity versions for every entity in v1. The profile-field stale-version last-write-wins exception contradicts SYNC-002 and is not accepted. Any later merge must create a new audited version.
- Pull cursors must be bound to tenant, node/branch and stream, use a durable ordered change log with tombstones, and have an explicit snapshot boundary. A timestamp over existing models is insufficient where updatedAt/deletion records do not exist. Never advance past undelivered records when limiting a page.
- Token expiry is inclusive (`expiresAt <= now`). Revoked nodes cannot rotate tokens. Rotation requires a valid existing node credential and atomic compare-and-swap; concurrent rotation cannot issue multiple valid successors. Expired credentials require authorized re-pairing.

Route boundary accepted: Codex validates transport/auth and delegates envelopes and cursor processing to Claude's src/lib/sync services. Codex owns verifyNode expiry/revocation and handshake rotation. Existing prototype handlers remain until the service contract and EVAL-001 result revision model are available.

Claude is explicitly authorized to add `tests/sync/**` under the same test-path carve-out as `tests/omr-corpus/**`. Cover concurrent duplicate delivery, cross-node event-ID reuse, payload mismatch, branch-bound cursor replay, expiry/revocation and interrupted transaction recovery.

Next: Claude incorporates these amendments into C06 and proposes concrete service signatures; Codex supplies the additive schema and route integration with EVAL-001. This file is the handoff for the next Claude session, not evidence of live receipt.
