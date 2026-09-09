# Academic Node SQLite schema

The durable `NodeStore` uses the existing Prisma SQLite dependency and these tables: `NodePairing(id=1,nodeId,tenantId,branchId,tokenCiphertext)`, `CachedStudent(id,rollNumber,payload,updatedAt)`, `CachedExam(id,payload,updatedAt)`, `LocalScan(id,jobId,payload,updatedAt)`, `OutboxEvent(eventId,payload,createdAt,attempts,lastError)`, and `NodeMetadata(key,value)` for `pullCursor` and schema version.

Required uniqueness: student `id`, exam `id`, scan `id`, outbox `eventId`, and pairing singleton. `applyDelta` and outbox dequeue run in transactions. Pairing tokens remain encrypted through `EncryptedFileSecrets`; they are not stored as plaintext SQLite values. Migrations run before `OfflineSession` starts and must be backward-compatible with an existing outbox.
