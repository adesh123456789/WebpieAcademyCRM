import { DeterministicEvaluationEngine, type ExamQuestionConfig, type StudentEvaluationResult } from "@/lib/academic/evaluation-engine";
import { extractSheetFromImage, type GrayscaleImage, type SheetGeometry } from "@/lib/omr/raster";
import type { SyncEventEnvelope, PullDelta } from "@/lib/sync";
import { drainOutbox, processOfflineScan, type PushFn } from "./offline-pipeline";
import { assertHealthyForHeavyJob, type NodeHealth } from "./health";
import type { CachedExam, LocalScan, NodeStore } from "./local-store";

/**
 * EDGE-001 - one offline working session on the Academic Node, over a NodeStore.
 *
 *   reconnect(pull)  -> refresh the local roster/exam cache + pull cursor
 *   ingestScan()     -> raster + deterministic extraction, stored locally, an
 *                       OMR_SCAN event queued in the durable outbox
 *   evaluateExamLocally() -> local deterministic score for the offline teacher
 *                       view (NOT authoritative - the cloud re-evaluates on sync)
 *   reconnect(push)  -> drain the outbox to POST /api/v1/sync/push
 *
 * Every heavy step is disk/RAM guarded (AC-020).
 */

export interface IngestArgs {
  image: GrayscaleImage;
  geometry: SheetGeometry;
  scanId: string;
  jobId: string;
  entityVersion: number;
  supported?: boolean;
}

export interface ReconnectResult {
  pulled: number;
  tombstoned: number;
  cursorAdvanced: boolean;
  delivered: string[];
  retained: number;
}

type PullFn = (cursor: string | null) => Promise<PullDelta>;

export class OfflineSession {
  constructor(private store: NodeStore, private healthOpts?: Parameters<typeof assertHealthyForHeavyJob>[0]) {}

  /** Health snapshot; throws NodeHealthError if the node is in PAUSE. */
  guard(): NodeHealth {
    return assertHealthyForHeavyJob(this.healthOpts);
  }

  ingestScan(args: IngestArgs): { extraction: LocalScan["status"]; queued: boolean } {
    this.guard();
    const { extraction, outboxEvent } = processOfflineScan(args);
    const roll = extraction.rollNumber || null;
    const student = roll ? this.store.getStudentByRoll(roll) : null;
    this.store.putScan({
      id: args.scanId,
      jobId: args.jobId,
      studentId: student?.id ?? null,
      detectedRollNumber: roll,
      status: extraction.status,
      detectedResponses: mapLetters(extraction.responses),
      confidenceScore: extraction.overallConfidence,
    });
    if (outboxEvent) this.store.enqueue(outboxEvent);
    return { extraction: extraction.status, queued: outboxEvent !== null };
  }

  /** Local, advisory deterministic score for a job's scans. Not synced. */
  evaluateExamLocally(examId: string, jobId: string): StudentEvaluationResult[] {
    this.guard();
    const exam = this.store.getExam(examId);
    if (!exam) throw new Error(`exam ${examId} not in local cache`);

    const questions: ExamQuestionConfig[] = exam.questions.map((q) => ({
      id: q.examQuestionId,
      questionId: q.questionId,
      sectionName: q.sectionName,
      type: q.type as ExamQuestionConfig["type"],
      subject: q.subject,
      concept: q.concept,
      correctAnswer: q.correctAnswer,
      numericalTolerance: q.numericalTolerance,
      marksCorrect: q.marksCorrect,
      marksIncorrect: q.marksIncorrect,
    }));
    const orderToQid = new Map(exam.questions.map((q) => [q.orderIndex, q.questionId]));

    const attempts = this.store
      .listScans(jobId)
      .filter((s) => s.studentId)
      .map((s) => {
        const chosen = s.verifiedResponses ?? s.detectedResponses;
        const responses: Record<string, unknown> = {};
        for (const [order, letter] of Object.entries(chosen)) {
          const qid = orderToQid.get(Number(order));
          if (qid) responses[qid] = letter;
        }
        return { studentId: s.studentId!, rollNumber: s.detectedRollNumber ?? "UNKNOWN", responses };
      });

    return DeterministicEvaluationEngine.evaluateCohort(questions, attempts, {
      multipleCorrectPolicy: (exam.markingRules as { multipleCorrectPolicy?: { partialMarks: number; wrongMarks: number } })
        .multipleCorrectPolicy,
    });
  }

  /** Pull latest reference data into the store, then drain the outbox to the cloud. */
  async reconnect(io: { pull?: PullFn; push?: PushFn; maxPullPages?: number }): Promise<ReconnectResult> {
    let pulled = 0;
    let tombstoned = 0;
    let cursorAdvanced = false;

    if (io.pull) {
      let cursor = this.store.getPullCursor();
      const maxPages = io.maxPullPages ?? 20;
      for (let page = 0; page < maxPages; page++) {
        const delta = await io.pull(cursor);
        this.store.applyDelta(delta);
        pulled += Object.values(delta.changes).reduce((n, arr) => n + arr.length, 0);
        tombstoned += delta.tombstones.length;
        if (delta.nextCursor !== cursor) cursorAdvanced = true;
        cursor = delta.nextCursor;
        this.store.setPullCursor(cursor);
        if (!delta.hasMore) break;
      }
    }

    let delivered: string[] = [];
    let retained = 0;
    if (io.push) {
      const res = await drainOutbox(this.store.outbox(), io.push);
      this.store.dequeue(res.delivered);
      delivered = res.delivered;
      retained = res.retained.length;
    }

    return { pulled, tombstoned, cursorAdvanced, delivered, retained };
  }
}

function mapLetters(responses: Record<number, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [q, l] of Object.entries(responses)) out[String(q)] = l;
  return out;
}

/** Build a CachedExam from a cloud exam row + its examQuestions (with question joined). */
export function toCachedExam(exam: {
  id: string;
  totalQuestions: number;
  markingRules: string;
  examQuestions: {
    id: string;
    questionId: string;
    orderIndex: number;
    sectionName: string;
    marksCorrect: number;
    marksIncorrect: number;
    question: { subject: string; concept: string; type: string; correctAnswer: string; numericalTolerance?: number | null };
  }[];
}): CachedExam {
  return {
    id: exam.id,
    totalQuestions: exam.totalQuestions,
    markingRules: safeJson(exam.markingRules),
    questions: exam.examQuestions.map((eq) => ({
      examQuestionId: eq.id,
      questionId: eq.questionId,
      orderIndex: eq.orderIndex,
      sectionName: eq.sectionName,
      subject: eq.question.subject,
      concept: eq.question.concept,
      type: eq.question.type,
      correctAnswer: safeJson(eq.question.correctAnswer),
      numericalTolerance: eq.question.numericalTolerance ?? undefined,
      marksCorrect: eq.marksCorrect,
      marksIncorrect: eq.marksIncorrect,
    })),
  };
}

function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

export type { SyncEventEnvelope };
