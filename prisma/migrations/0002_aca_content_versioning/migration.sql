CREATE TABLE "QuestionVersion" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "tenantId" TEXT,
  "snapshot" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "QuestionVersion_questionId_version_key" ON "QuestionVersion"("questionId", "version");
CREATE INDEX "QuestionVersion_tenantId_status_idx" ON "QuestionVersion"("tenantId", "status");

CREATE TABLE "CurriculumQuestionMapping" (
  "id" TEXT NOT NULL,
  "curriculumCode" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "tenantId" TEXT,
  "mappingType" TEXT NOT NULL DEFAULT 'PRIMARY',
  "source" TEXT NOT NULL DEFAULT 'PLATFORM',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CurriculumQuestionMapping_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CurriculumQuestionMapping_curriculumCode_questionId_tenantId_key" ON "CurriculumQuestionMapping"("curriculumCode", "questionId", "tenantId");
CREATE INDEX "CurriculumQuestionMapping_tenantId_curriculumCode_idx" ON "CurriculumQuestionMapping"("tenantId", "curriculumCode");
