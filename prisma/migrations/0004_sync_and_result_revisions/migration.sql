ALTER TABLE "AcademicNode" ADD COLUMN "revokedAt" TIMESTAMP(3);
ALTER TABLE "AcademicNode" ADD COLUMN "pullCursor" TEXT;
ALTER TABLE "MasteryEvidence" ADD COLUMN "sourceEventId" TEXT;
CREATE INDEX "MasteryEvidence_sourceEventId_idx" ON "MasteryEvidence"("sourceEventId");

CREATE TABLE "SyncEvent" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "nodeId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "branchId" TEXT,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "entityVersion" INTEGER NOT NULL,
  "op" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "conflictReason" TEXT,
  "appliedVersion" INTEGER,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "appliedAt" TIMESTAMP(3),
  CONSTRAINT "SyncEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SyncEvent_eventId_key" ON "SyncEvent"("eventId");
CREATE INDEX "SyncEvent_nodeId_receivedAt_idx" ON "SyncEvent"("nodeId", "receivedAt");
CREATE INDEX "SyncEvent_tenantId_entityType_entityId_entityVersion_idx" ON "SyncEvent"("tenantId", "entityType", "entityId", "entityVersion");

CREATE TABLE "ExamResultRevision" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "supersedesResultId" TEXT,
  "revision" INTEGER NOT NULL,
  "resultSnapshot" TEXT NOT NULL,
  "reason" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExamResultRevision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExamResultRevision_examId_studentId_revision_key" ON "ExamResultRevision"("examId", "studentId", "revision");
CREATE INDEX "ExamResultRevision_tenantId_examId_studentId_idx" ON "ExamResultRevision"("tenantId", "examId", "studentId");
