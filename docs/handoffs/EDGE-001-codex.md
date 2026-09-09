# EDGE-001 Codex Handoff

## SQLite dependency decision

Use the existing `@prisma/client` Prisma-SQLite path for the Academic Node rather than adding `better-sqlite3`.

`better-sqlite3` was evaluated as the named dependency, but installation fails on the current Windows/Node 24 toolchain: no compatible prebuilt binary is published for this runtime and the local environment has no usable Python for `node-gyp`. Adding it would make CI and the Windows node non-reproducible.

The node runtime should generate a dedicated SQLite Prisma client from `prisma/schema.prisma` (provider `sqlite`) into a node-specific output directory, while the server continues using the PostgreSQL mirror/client. `NodeStore` remains the persistence abstraction, so the implementation can swap its memory adapter for that generated client without changing `OfflineSession`.

## Remaining packaging decisions

- Windows process host and localhost/LAN service boundary.
- Signed updater manifest, verification key distribution, rollback, and update channel.
- Disk/RAM health thresholds and installer/service lifecycle.
