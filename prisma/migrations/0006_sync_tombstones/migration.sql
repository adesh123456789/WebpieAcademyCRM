CREATE TABLE "SyncChange" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "branchId" TEXT,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SyncChange_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SyncChange_tenantId_branchId_changedAt_idx" ON "SyncChange"("tenantId", "branchId", "changedAt");
CREATE INDEX "SyncChange_tenantId_entityType_entityId_changedAt_idx" ON "SyncChange"("tenantId", "entityType", "entityId", "changedAt");
