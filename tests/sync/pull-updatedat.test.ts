import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { createTestWorld, type TestWorld } from "../support/fixtures";
import { buildPullDelta } from "../../src/lib/sync";
import type { NodeContext } from "../../src/lib/sync";

/** SYN-001 buildPullDelta on `updatedAt` (migration 0005): edits resurface, soft-deletes become tombstones. */

let world: TestWorld;
let ctx: NodeContext;

beforeAll(async () => {
  world = await createTestWorld();
  ctx = { nodeId: "NODE_PU", tenantId: world.a.tenant.id, branchId: null };
});

describe("incremental pull on updatedAt", () => {
  it("an edited student resurfaces in the delta after a cursor that had already delivered it", async () => {
    const full = await buildPullDelta(ctx, null, 500);
    expect((full.changes.students as { id: string }[]).map((s) => s.id)).toContain(world.a.student.id);

    // nothing changed since -> next page is empty
    const empty = await buildPullDelta(ctx, full.nextCursor, 500);
    expect((empty.changes.students as unknown[]).length).toBe(0);

    await new Promise((r) => setTimeout(r, 5));
    await prisma.student.update({ where: { id: world.a.student.id }, data: { school: "Edited After Sync" } });

    const afterEdit = await buildPullDelta(ctx, empty.nextCursor, 500);
    const edited = (afterEdit.changes.students as { id: string; school: string }[]).find((s) => s.id === world.a.student.id);
    expect(edited?.school).toBe("Edited After Sync");
  });

  it("an archived student is delivered as a tombstone, not a change", async () => {
    const base = await buildPullDelta(ctx, null, 500);
    await new Promise((r) => setTimeout(r, 5));
    await prisma.student.update({ where: { id: world.a.sibling.id }, data: { status: "ARCHIVED" } });

    const delta = await buildPullDelta(ctx, base.nextCursor, 500);
    expect((delta.changes.students as { id: string }[]).some((s) => s.id === world.a.sibling.id)).toBe(false);
    expect(delta.tombstones.some((t) => t.entityType === "students" && t.entityId === world.a.sibling.id)).toBe(true);
  });

  it("a non-active batch becomes a tombstone", async () => {
    const base = await buildPullDelta(ctx, null, 500);
    await new Promise((r) => setTimeout(r, 5));
    await prisma.batch.update({ where: { id: world.a.unassignedBatch.id }, data: { status: "CLOSED" } });

    const delta = await buildPullDelta(ctx, base.nextCursor, 500);
    expect(delta.tombstones.some((t) => t.entityType === "batches" && t.entityId === world.a.unassignedBatch.id)).toBe(true);
  });

  it("consumes a SyncChange DELETE row as a hard-delete tombstone, scoped to the tenant", async () => {
    const base = await buildPullDelta(ctx, null, 500);
    await new Promise((r) => setTimeout(r, 5));
    await prisma.syncChange.create({ data: {
      tenantId: world.a.tenant.id, branchId: null, entityType: "students", entityId: "ghost-student-1", operation: "DELETE",
    } });
    await prisma.syncChange.create({ data: {
      tenantId: world.b.tenant.id, branchId: null, entityType: "students", entityId: "other-tenant-ghost", operation: "DELETE",
    } });

    const delta = await buildPullDelta(ctx, base.nextCursor, 500);
    expect(delta.tombstones.some((t) => t.entityType === "students" && t.entityId === "ghost-student-1")).toBe(true);
    expect(delta.tombstones.some((t) => t.entityId === "other-tenant-ghost")).toBe(false);

    // idempotent: already past that cursor position -> not re-delivered
    const again = await buildPullDelta(ctx, delta.nextCursor, 500);
    expect(again.tombstones.some((t) => t.entityId === "ghost-student-1")).toBe(false);
  });
});
