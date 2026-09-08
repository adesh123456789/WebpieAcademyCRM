# C02 Students and import contract

**Producer:** Codex API  
**Consumer:** Antigravity UI-003

## Endpoints

- `GET /api/v1/students?branchId=&batchId=&search=&page=1&pageSize=25` returns `{items:[{id,name,email,phone,status,branchId,batchId,batchName,parentCount}], page, pageSize, total}`.
- `POST /api/v1/students/import/preview` accepts `{fileName, rows:[{name,email?,phone?,branchId?,batchId?,parentEmail?}]}` and returns `{importId, rows:[{row, action:"CREATE"|"UPDATE"|"REJECT", studentId?, errors:[{code,message}]}], summary:{create,update,reject}}`.
- `POST /api/v1/students/import/:importId/commit` accepts `{idempotencyKey}` and returns `{importId,status:"COMMITTED",created,updated,rejected}`. Repeating the key is a no-op with the original result.

All responses are tenant-scoped and include a correlation `traceId` header. Pagination is stable by `id` after filtering. Branch, batch, and parent references are checked against the authenticated tenant and capability; client-supplied tenant IDs are ignored. Preview has no side effects; commit writes an audit event and rejects stale previews.

Errors use the existing route envelope, with codes `SCOPE_DENIED`, `VALIDATION_ERROR`, `DUPLICATE_STUDENT`, `IMPORT_EXPIRED`, and `IDEMPOTENCY_CONFLICT`.
