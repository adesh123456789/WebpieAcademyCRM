import type { SyncEventEnvelope } from "@/lib/sync";

/**
 * EDGE-001 - the Academic Node's local store. Everything the node needs to keep
 * working with the cloud unreachable: node identity, a cache of the roster /
 * exams pulled from the cloud, locally captured OMR scans, a durable outbox of
 * sync events, and the resumable pull cursor.
 *
 * `NodeStore` is the contract; `MemoryNodeStore` is the reference implementation
 * used by tests. `SqliteNodeStore` (./sqlite-store.ts) is the durable
 * implementation per `docs/contracts/NODE-STORE-SQLITE.md`, over `node:sqlite`.
 */

export interface NodePairing {
  nodeId: string;
  tenantId: string;
  branchId: string | null;
  token: string;
}

export interface CachedExam {
  id: string;
  totalQuestions: number;
  markingRules: Record<string, unknown>;
  questions: {
    examQuestionId: string;
    questionId: string;
    orderIndex: number;
    sectionName: string;
    subject: string;
    concept: string;
    type: string;
    correctAnswer: unknown;
    numericalTolerance?: number;
    marksCorrect: number;
    marksIncorrect: number;
  }[];
}

export interface CachedStudent {
  id: string;
  rollNumber: string;
  name: string;
  branchId: string;
}

export interface LocalScan {
  id: string;
  jobId: string;
  studentId: string | null;
  detectedRollNumber: string | null;
  status: string;
  detectedResponses: Record<string, string>;
  verifiedResponses?: Record<string, string>;
  confidenceScore: number;
}

export interface PullDeltaLike {
  changes: Record<string, unknown[]>;
  tombstones: { entityType: string; entityId: string }[];
  nextCursor: string;
  hasMore: boolean;
}

export interface NodeStore {
  getPairing(): NodePairing | null;
  setPairing(p: NodePairing): void;

  putExam(exam: CachedExam): void;
  getExam(id: string): CachedExam | null;

  putStudent(s: CachedStudent): void;
  getStudentByRoll(roll: string): CachedStudent | null;
  listStudents(): CachedStudent[];

  putScan(scan: LocalScan): void;
  getScan(id: string): LocalScan | null;
  listScans(jobId: string): LocalScan[];

  enqueue(event: SyncEventEnvelope): void;
  outbox(): SyncEventEnvelope[];
  dequeue(eventIds: string[]): void;

  getPullCursor(): string | null;
  setPullCursor(cursor: string | null): void;

  /** Merge a pulled delta: upsert changed rows, drop tombstoned ones. */
  applyDelta(delta: PullDeltaLike): void;
}

export class MemoryNodeStore implements NodeStore {
  private pairing: NodePairing | null = null;
  private exams = new Map<string, CachedExam>();
  private students = new Map<string, CachedStudent>();
  private scans = new Map<string, LocalScan>();
  private _outbox: SyncEventEnvelope[] = [];
  private cursor: string | null = null;

  getPairing() {
    return this.pairing;
  }
  setPairing(p: NodePairing) {
    this.pairing = p;
  }

  putExam(exam: CachedExam) {
    this.exams.set(exam.id, exam);
  }
  getExam(id: string) {
    return this.exams.get(id) ?? null;
  }

  putStudent(s: CachedStudent) {
    this.students.set(s.id, s);
  }
  getStudentByRoll(roll: string) {
    for (const s of Array.from(this.students.values())) if (s.rollNumber === roll) return s;
    return null;
  }
  listStudents() {
    return Array.from(this.students.values());
  }

  putScan(scan: LocalScan) {
    this.scans.set(scan.id, scan);
  }
  getScan(id: string) {
    return this.scans.get(id) ?? null;
  }
  listScans(jobId: string) {
    return Array.from(this.scans.values()).filter((s) => s.jobId === jobId);
  }

  enqueue(event: SyncEventEnvelope) {
    if (!this._outbox.some((e) => e.eventId === event.eventId)) this._outbox.push(event);
  }
  outbox() {
    return [...this._outbox];
  }
  dequeue(eventIds: string[]) {
    const drop = new Set(eventIds);
    this._outbox = this._outbox.filter((e) => !drop.has(e.eventId));
  }

  getPullCursor() {
    return this.cursor;
  }
  setPullCursor(cursor: string | null) {
    this.cursor = cursor;
  }

  applyDelta(delta: PullDeltaLike) {
    for (const raw of delta.changes.students ?? []) {
      const s = raw as { id: string; rollNumber: string; name: string; branchId: string };
      this.students.set(s.id, { id: s.id, rollNumber: s.rollNumber, name: s.name, branchId: s.branchId });
    }
    for (const t of delta.tombstones) {
      if (t.entityType === "students") this.students.delete(t.entityId);
      if (t.entityType === "exams") this.exams.delete(t.entityId);
    }
  }
}
