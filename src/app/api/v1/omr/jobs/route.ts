import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeterministicOMREngine } from "@/lib/omr/omr-engine";
import { checkApiPermission } from "@/lib/permissions";
import { extractSheetFromImage, STANDARD_75Q_GEOMETRY } from "@/lib/omr/raster";
import { objectStorage } from "@/lib/storage/object-storage";
import { MAX_OMR_BATCH_BYTES, OMRUploadError, prepareOMRFiles } from "@/lib/omr-upload/validate";
import { publicOMRJob } from "@/lib/omr-upload/public-scan";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!checkApiPermission(session.role, "omr")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const jobs = await prisma.oMRJob.findMany({
      where: { tenantId: session.tenantId },
      include: {
        exam: true,
        scans: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ jobs: jobs.map(publicOMRJob) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionContext(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!checkApiPermission(session.role, "omr")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const multipart = req.headers.get("content-type")?.includes("multipart/form-data");
    const contentLength = Number(req.headers.get("content-length"));
    if (multipart && contentLength > MAX_OMR_BATCH_BYTES + 10 * 1024 * 1024) {
      return NextResponse.json({ error: "OMR request exceeds upload limit" }, { status: 413 });
    }
    const form = multipart ? await req.formData() : null;
    const body = multipart ? { examId: form!.get("examId"), batchId: form!.get("batchId") } : await req.json();
    const { examId, batchId, simulatedSheets } = body as any;

    if (!examId) {
      return NextResponse.json({ error: "Exam ID is required" }, { status: 400 });
    }

    // Validate and decode every file before creating a job or writing any object.
    const files = multipart ? form!.getAll("files").filter((value): value is File => value instanceof File) : [];
    const prepared = multipart ? await prepareOMRFiles(files) : [];

    const exam = await prisma.exam.findFirst({
      where: { id: examId, tenantId: session.tenantId },
      include: { examQuestions: true },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Create OMR job
    const job = await prisma.oMRJob.create({
      data: {
        tenantId: session.tenantId,
        examId,
        batchId: batchId || null,
        status: "PROCESSING",
        totalSheets: multipart ? prepared.length : simulatedSheets?.length || 5,
      },
    });

    if (multipart) {
      let flaggedCount = 0;
      for (const file of prepared) {
        const storedUrl = await objectStorage.put(file.bytes, file.name);
        const extraction = extractSheetFromImage(file.image, STANDARD_75Q_GEOMETRY, file.name);
        const student = extraction.rollNumber ? await prisma.student.findFirst({ where: { tenantId: session.tenantId, rollNumber: extraction.rollNumber } }) : null;
        if (extraction.status !== "CONFIDENT") flaggedCount++;
        await prisma.oMRScan.create({ data: { jobId: job.id, studentId: student?.id || null, detectedRollNumber: extraction.rollNumber || null, sheetImageUrl: storedUrl, confidenceScore: extraction.overallConfidence, status: extraction.status, detectedResponses: JSON.stringify(extraction.responses), ambiguityFlags: JSON.stringify(extraction.ambiguities) } });
      }
      const updated = await prisma.oMRJob.update({ where: { id: job.id }, data: { totalSheets: prepared.length, processedSheets: prepared.length, flaggedSheets: flaggedCount, status: flaggedCount ? "REVIEW_REQUIRED" : "READY" }, include: { scans: true } });
      return NextResponse.json({ success: true, job: publicOMRJob(updated) });
    }

    // Test-only density-vector path.
    const sheetsToProcess =
      simulatedSheets ||
      [
        { roll: "260001", grid: { 1: [0.88, 0.02, 0.01, 0.01], 2: [0.91, 0.01, 0.02, 0.01], 3: [0.89, 0.02, 0.01, 0.01], 4: [0.87, 0.01, 0.01, 0.02], 5: [0.01, 0.02, 0.01, 0.02] } },
        { roll: "260002", grid: { 1: [0.85, 0.03, 0.01, 0.01], 2: [0.89, 0.02, 0.01, 0.02], 3: [0.84, 0.01, 0.02, 0.01], 4: [0.02, 0.86, 0.01, 0.02], 5: [0.01, 0.02, 0.01, 0.02] } },
        { roll: "260003", grid: { 1: [0.82, 0.01, 0.78, 0.02], 2: [0.89, 0.02, 0.01, 0.02], 3: [0.87, 0.01, 0.02, 0.01], 4: [0.88, 0.01, 0.01, 0.02], 5: [0.01, 0.02, 0.01, 0.02] } }, // Q1 has double mark!
      ];

    let flaggedCount = 0;

    for (let i = 0; i < sheetsToProcess.length; i++) {
      const item = sheetsToProcess[i];
      const student = await prisma.student.findFirst({
        where: { tenantId: session.tenantId, rollNumber: item.roll },
      });

      const extraction = DeterministicOMREngine.extractResponsesFromGrid(
        `sheet-${i + 1}`,
        item.roll,
        exam.totalQuestions,
        item.grid
      );

      if (extraction.ambiguities.length > 0) {
        flaggedCount++;
      }

      await prisma.oMRScan.create({
        data: {
          jobId: job.id,
          studentId: student?.id || null,
          detectedRollNumber: item.roll,
          confidenceScore: extraction.overallConfidence,
          status: extraction.status,
          detectedResponses: JSON.stringify(extraction.responses),
          ambiguityFlags: JSON.stringify(extraction.ambiguities),
        },
      });
    }

    const updatedJob = await prisma.oMRJob.update({
      where: { id: job.id },
      data: {
        status: flaggedCount > 0 ? "REVIEW_REQUIRED" : "FINALIZED",
        processedSheets: sheetsToProcess.length,
        flaggedSheets: flaggedCount,
      },
      include: { scans: true },
    });

    return NextResponse.json({ success: true, job: publicOMRJob(updatedJob) });
  } catch (err: any) {
    if (err instanceof OMRUploadError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
