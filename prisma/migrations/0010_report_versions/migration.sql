CREATE TABLE "ReportVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "projectionJson" TEXT NOT NULL,
  "sourceResultId" TEXT,
  "sourceMasteryAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ReportVersion_studentId_version_key" ON "ReportVersion"("studentId", "version");
CREATE TABLE "ReportShareLink" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReportShareLink_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ReportVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ReportShareLink_tenantId_studentId_expiresAt_idx" ON "ReportShareLink"("tenantId", "studentId", "expiresAt");
