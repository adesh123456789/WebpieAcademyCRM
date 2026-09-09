import { prisma } from "@/lib/prisma";
import { decodeCursor, encodeCursor, scopeKeyFor } from "./cursor";
import type { NodeContext, PullDelta } from "./types";

/**
 * SYN-001 / C06 s4 - cloud -> node delta, scoped to the node's tenant and (when
 * set) branch.
 *
 * v1 limitation: the pull-stream models (Student, Batch, Exam, Enrollment) have
 * `createdAt` but no `updatedAt` and there is no durable change log, so this
 * delivers a full snapshot on the first pull and then only NEW rows incrementally
 * (`createdAt` high-water mark). Edited rows and hard deletes are NOT yet tracked
 * - C06 A.6's ordered change log with tombstones is a Codex schema follow-up
 * (add `updatedAt` to the stream models, or a `SyncChange` table). Soft-deletes
 * surface as status changes once `updatedAt` exists.
 */

const STREAMS = ["students", "batches", "exams", "curriculum"] as const;
type Stream = (typeof STREAMS)[number];

interface CursorPos {
  /** ISO createdAt high-water mark; "" = from the beginning (full snapshot) */
  ts: string;
  /** ids already delivered whose createdAt === ts, to avoid re-delivery/skip at the boundary */
  boundaryIds: string[];
}

function parsePosition(raw: string | undefined): CursorPos {
  if (!raw) return { ts: "", boundaryIds: [] };
  try {
    const p = JSON.parse(raw);
    return { ts: typeof p.ts === "string" ? p.ts : "", boundaryIds: Array.isArray(p.boundaryIds) ? p.boundaryIds : [] };
  } catch {
    return { ts: "", boundaryIds: [] };
  }
}

interface Row {
  stream: Stream;
  id: string;
  createdAt: Date;
  data: Record<string, unknown>;
}

export async function buildPullDelta(
  ctx: NodeContext,
  cursorToken: string | null | undefined,
  limit: number,
): Promise<PullDelta> {
  const take = Math.min(Math.max(1, Math.trunc(limit || 100)), 500);
  const decoded = cursorToken ? decodeCursor(cursorToken, ctx) : null;
  const pos = parsePosition(decoded?.position);
  const snapshotBoundary = new Date().toISOString();
  const after = pos.ts ? new Date(pos.ts) : null;

  const branchScope = ctx.branchId ? { branchId: ctx.branchId } : {};
  const createdFilter = after
    ? { createdAt: { gte: after, lte: new Date(snapshotBoundary) } }
    : { createdAt: { lte: new Date(snapshotBoundary) } };

  const [students, batches, exams, curriculum] = await Promise.all([
    prisma.student.findMany({
      where: { tenantId: ctx.tenantId, ...branchScope, ...createdFilter },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: take + 1,
    }),
    prisma.batch.findMany({
      where: { tenantId: ctx.tenantId, ...branchScope, ...createdFilter },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: take + 1,
    }),
    prisma.exam.findMany({
      where: { tenantId: ctx.tenantId, ...(ctx.branchId ? { branchId: ctx.branchId } : {}), ...createdFilter },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: take + 1,
    }),
    prisma.curriculumNode.findMany({
      where: { OR: [{ tenantId: ctx.tenantId }, { tenantId: null }], ...createdFilter },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: take + 1,
    }),
  ]);

  const rows: Row[] = [
    ...students.map((r) => ({ stream: "students" as Stream, id: r.id, createdAt: r.createdAt, data: r })),
    ...batches.map((r) => ({ stream: "batches" as Stream, id: r.id, createdAt: r.createdAt, data: r })),
    ...exams.map((r) => ({ stream: "exams" as Stream, id: r.id, createdAt: r.createdAt, data: r })),
    ...curriculum.map((r) => ({ stream: "curriculum" as Stream, id: r.id, createdAt: r.createdAt, data: r })),
  ]
    .filter((r) => !(pos.ts && r.createdAt.toISOString() === pos.ts && pos.boundaryIds.includes(r.id)))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const page = rows.slice(0, take);
  const hasMore = rows.length > take;

  const changes: Record<string, unknown[]> = { students: [], batches: [], exams: [], curriculum: [] };
  for (const r of page) changes[r.stream].push(r.data);

  // nextCursor never advances past an undelivered record: its ts is the last
  // DELIVERED row's createdAt, with every id delivered at that ts recorded so the
  // next page resumes without re-delivering or skipping.
  const last = page[page.length - 1];
  const nextTs = last ? last.createdAt.toISOString() : pos.ts;
  const boundaryIds = page.filter((r) => r.createdAt.toISOString() === nextTs).map((r) => r.id);

  return {
    changes,
    tombstones: [], // hard-delete tracking needs the change log (see file header)
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
