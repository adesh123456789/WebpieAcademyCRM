CREATE TABLE "AIRequest" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "task" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "promptTemplateId" TEXT NOT NULL,
  "promptTemplateVersion" TEXT NOT NULL,
  "inputHash" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "latencyMs" INTEGER NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AIRequest_tenantId_task_createdAt_idx" ON "AIRequest"("tenantId", "task", "createdAt");

CREATE TABLE "AIFeedback" (
  "id" TEXT NOT NULL,
  "aiRequestId" TEXT NOT NULL,
  "verdict" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIFeedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AIFeedback_aiRequestId_fkey" FOREIGN KEY ("aiRequestId") REFERENCES "AIRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AIFeedback_aiRequestId_createdAt_idx" ON "AIFeedback"("aiRequestId", "createdAt");
