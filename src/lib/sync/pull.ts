import { prisma } from "@/lib/prisma";
import { decodeCursor, encodeCursor, scopeKeyFor } from "./cursor";
import type { NodeContext, PullDelta } from "./types";

/**
 * SYN-001 / C06 s4 - cloud -> node delta, scoped to the node's tenant and (when
 * set) branch.
 *
 * Cursored on `updatedAt` (added to Student/Batch/Exam/Enrollment in migration
 * `0005`), so edited rows resurface. `CurriculumNode` has no `updatedAt` and is
 * effectively immutable, so it is cursored on `createdAt`.
 *
 * Tombstones: soft-deletes surface as `{ entityType: <stream>, entityId, deletedAt }`
 * - archived students, non-active batches, dropped enrollments. Genuine hard
 * deletes still need a `SyncChange` append-only log (C06 A.6) - not present yet.
 */

interface CursorPos {
  ts: string; // ISO updatedAt/createdAt high-water mark; "" = full snapshot
  boundaryIds: string[]; // ids already delivered whose ts === this, to avoid re-delivery/skip
}

function parsePosition(raw: string | undefined): CursorPos {
  if (!raw) return { ts: "", boundaryIds: [] };
  try {
    const p = JSON.parse(raw) as Partial<CursorPos>;
    return { ts: typeof p.ts === "string" ? p.ts : "", boundaryIds: Array.isArray(p.boundaryIds) ? p.boundaryIds : [] };
  } catch {
    return { ts: "", boundaryIds: [] };
  }
}

type Stream = "students" | "batches" | "exams" | "curriculum";

interface Row {
  stream: Stream;
  id: string;
  changedAt: Date;
  data: Record<string, unknown>;
  tombstone: boolean;
}

const STUDENT_DEAD = new Set(["ARCHIVED"]);
const BATCH_DEAD = (s: string) => s !== "ACTIVE";

export async function buildPullDelta(
  ctx: NodeContext,
  cursorToken: string | null | undefined,
  limit: number,
): Promise<PullDelta> {
  const take = Math.min(Math.max(1, Math.trunc(limit || 100)), 500);
  const decoded = cursorToken ? decodeCursor(cursorToken, ctx) : null;
  const pos = parsePosition(decoded?.position);
  const snapshotBoundary = new Date().toISOString();
  const boundaryDate = new Date(snapshotBoundary);
  const after = pos.ts ? new Date(pos.ts) : null;

  const branch = ctx.branchId ? { branchId: ctx.branchId } : {};
  const updWin = after ? { updatedAt: { gte: after, lte: boundaryDate } } : { updatedAt: { lte: boundaryDate } };
  const crtWin = after ? { createdAt: { gte: after, lte: boundaryDate } } : { createdAt: { lte: boundaryDate } };

  const [students, batches, exams, curriculum] = await Promise.all([
    prisma.student.findMany({
      where: { tenantId: ctx.tenantId, ...branch, ...updWin },
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
      take: take + 1,
    }),
    prisma.batch.findMany({
      where: { tenantId: ctx.tenantId, ...branch, ...updWin },
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
      take: take + 1,
    }),
    prisma.exam.findMany({
      where: { tenantId: ctx.tenantId, ...(ctx.branchId ? { branchId: ctx.branchId } : {}), ...updWin },
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
      take: take + 1,
    }),
    prisma.curriculumNode.findMany({
      where: { OR: [{ tenantId: ctx.tenantId }, { tenantId: null }], ...crtWin },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: take + 1,
    }),
  ]);

  const rows: Row[] = [
    ...students.map((r) => ({ stream: "students" as Stream, id: r.id, changedAt: r.updatedAt, data: r, tombstone: STUDENT_DEAD.has(r.status) })),
    ...batches.map((r) => ({ stream: "batches" as Stream, id: r.id, changedAt: r.updatedAt, data: r, tombstone: BATCH_DEAD(r.status) })),
    ...exams.map((r) => ({ stream: "exams" as Stream, id: r.id, changedAt: r.updatedAt, data: r, tombstone: false })),
    ...curriculum.map((r) => ({ stream: "curriculum" as Stream, id: r.id, changedAt: r.createdAt, data: r, tombstone: false })),
  ]
    .filter((r) => !(pos.ts && r.changedAt.toISOString() === pos.ts && pos.boundaryIds.includes(r.id)))
    .sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const page = rows.slice(0, take);
  const hasMore = rows.length > take;

  const changes: Record<string, unknown[]> = { students: [], batches: [], exams: [], curriculum: [] };
  const tombstones: PullDelta["tombstones"] = [];
  for (const r of page) {
    if (r.tombstone) {
      tombstones.push({ entityType: r.stream, entityId: r.id, deletedAt: r.changedAt.toISOString() });
    } else {
      changes[r.stream].push(r.data);
    }
  }

  const last = page[page.length - 1];
  const nextTs = last ? last.changedAt.toISOString() : pos.ts;
  const boundaryIds = page.filter((r) => r.changedAt.toISOString() === nextTs).map((r) => r.id);

  return {
    changes,
    tombstones,
    nextCursor: encodeCursor({
      tenantId: ctx.tenantId,
      scopeKey: scopeKeyFor(ctx),
      streamKey: "all",
      position: JSON.stringify({ ts: nextTs, boundaryIds } satisfies CursorPos),
      snapshotBoundary,
    }),
    hasMore,
    snapshotBoundary,
  };
}
