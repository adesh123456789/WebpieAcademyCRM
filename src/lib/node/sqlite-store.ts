import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type { SyncEventEnvelope } from "@/lib/sync";
import { decryptString, encryptString } from "./crypto";
import type { CachedExam, CachedStudent, LocalScan, NodePairing, NodeStore, PullDeltaLike } from "./local-store";

/**
 * EDGE-001 - the durable `NodeStore`, per `docs/contracts/NODE-STORE-SQLITE.md`.
 *
 * Driver decision (overrides the contract note's "existing Prisma SQLite
 * dependency"): `node:sqlite` (Node's built-in synchronous driver), not
 * `@prisma/client` and not `better-sqlite3`. Two reasons:
 *
 *  1. `NodeStore` is a *synchronous* interface - `OfflineSession.ingestScan` and
 *     `.evaluateExamLocally` call it without awaiting, deliberately, so a bubble
 *     sheet capture on constrained pilot hardware never blocks on I/O scheduling.
 *     Prisma Client is async-only (it talks to its query-engine process over a
 *     pipe); making the store durable through it would force `NodeStore` async
 *     and cascade a breaking change through `OfflineSession`, every test, and
 *     the not-yet-built node runtime. `better-sqlite3` would preserve the sync
 *     contract too, but it is a native module needing a build toolchain on
 *     every pilot machine and in the Docker image - unnecessary risk.
 *  2. `node:sqlite` ships in Node's stdlib (stable, unflagged, since Node 22.5;
 *     this repo runs Node 24) - zero new dependency, zero native compile step,
 *     same binary works in the Docker image and on a bare Windows node. It is
 *     still formally experimental upstream (emits a one-line warning); pin the
 *     Node version the packaged node runtime ships with and re-check this
 *     decision before a Node major bump. Loaded via `process.getBuiltinModule`
 *     rather than a static `import` because it is new enough that Vite/vitest's
 *     builtin-module check doesn't recognise it and tries to resolve it as an
 *     npm package - see node-sqlite.d.ts.
 *
 * Tables mirror the contract: `node_pairing` (singleton, `id = 1`),
 * `cached_student`, `cached_exam`, `local_scan`, `outbox_event`, `node_metadata`
 * (schema version + pull cursor). The pairing token is never written in
 * plaintext - it is AES-256-GCM sealed with `NODE_ENCRYPTION_KEY` (same primitive
 * as `EncryptedFileSecrets`) before it touches the `node_pairing` row.
 */

const SCHEMA_VERSION = "1";

const DDL = `
CREATE TABLE IF NOT EXISTS node_pairing (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  nodeId TEXT NOT NULL,
  tenantId TEXT NOT NULL,
  branchId TEXT,
  tokenIv TEXT NOT NULL,
  tokenTag TEXT NOT NULL,
  tokenData TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cached_student (
  id TEXT PRIMARY KEY,
  rollNumber TEXT NOT NULL UNIQUE,
  payload TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cached_exam (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS local_scan (
  id TEXT PRIMARY KEY,
  jobId TEXT NOT NULL,
  payload TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_local_scan_job ON local_scan(jobId);

CREATE TABLE IF NOT EXISTS outbox_event (
  eventId TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  lastError TEXT
);

CREATE TABLE IF NOT EXISTS node_metadata (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;

export interface SqliteNodeStoreOptions {
  /** Defaults to process.env.NODE_ENCRYPTION_KEY. Only required once a pairing is set/read. */
  encryptionKey?: string;
}

export class SqliteNodeStore implements NodeStore {
  private db: DatabaseSync;
  private encryptionKey: string;

  constructor(path: string, opts: SqliteNodeStoreOptions = {}) {
    if (path !== ":memory:") {
      const dir = dirname(path);
      if (dir && dir !== "." && !existsSync(dir)) mkdirSync(dir, { recursive: true });
    }
    // process.getBuiltinModule (Node 22.3+) isn't typed on the @types/node ^20
    // this repo pins - cast at this one boundary rather than augment global types.
    const sqlite = (process as unknown as { getBuiltinModule(id: "node:sqlite"): typeof import("node:sqlite") }).getBuiltinModule(
      "node:sqlite",
    );
    this.db = new sqlite.DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.encryptionKey = opts.encryptionKey ?? process.env.NODE_ENCRYPTION_KEY ?? "";
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(DDL);
    const row = this.db.prepare("SELECT value FROM node_metadata WHERE key = 'schemaVersion'").get() as
      | { value: string }
      | undefined;
    if (!row) {
      this.db.prepare("INSERT INTO node_metadata (key, value) VALUES ('schemaVersion', ?)").run(SCHEMA_VERSION);
    }
    // Future migrations branch on `row.value` here - backward-compatible with an existing outbox.
  }

  close(): void {
    this.db.close();
  }

  private requireKey(): string {
    if (!this.encryptionKey) {
      throw new Error("SqliteNodeStore requires NODE_ENCRYPTION_KEY to store or read the pairing token");
    }
    return this.encryptionKey;
  }

  // ---- pairing (singleton row, token sealed) --------------------------------

  getPairing(): NodePairing | null {
    const row = this.db
      .prepare("SELECT nodeId, tenantId, branchId, tokenIv, tokenTag, tokenData FROM node_pairing WHERE id = 1")
      .get() as
      | { nodeId: string; tenantId: string; branchId: string | null; tokenIv: string; tokenTag: string; tokenData: string }
      | undefined;
    if (!row) return null;
    const token = decryptString({ iv: row.tokenIv, tag: row.tokenTag, data: row.tokenData }, this.requireKey());
    return { nodeId: row.nodeId, tenantId: row.tenantId, branchId: row.branchId, token };
  }

  setPairing(p: NodePairing): void {
    const enc = encryptString(p.token, this.requireKey());
    this.db
      .prepare(
        `INSERT INTO node_pairing (id, nodeId, tenantId, branchId, tokenIv, tokenTag, tokenData)
         VALUES (1, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           nodeId = excluded.nodeId, tenantId = excluded.tenantId, branchId = excluded.branchId,
           tokenIv = excluded.tokenIv, tokenTag = excluded.tokenTag, tokenData = excluded.tokenData`,
      )
      .run(p.nodeId, p.tenantId, p.branchId, enc.iv, enc.tag, enc.data);
  }

  // ---- cached roster / exams --------------------------------------------------

  putExam(exam: CachedExam): void {
    this.db
      .prepare(
        `INSERT INTO cached_exam (id, payload, updatedAt) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updatedAt = excluded.updatedAt`,
      )
      .run(exam.id, JSON.stringify(exam), new Date().toISOString());
  }
  getExam(id: string): CachedExam | null {
    const row = this.db.prepare("SELECT payload FROM cached_exam WHERE id = ?").get(id) as { payload: string } | undefined;
    return row ? (JSON.parse(row.payload) as CachedExam) : null;
  }

  putStudent(s: CachedStudent): void {
    this.db
      .prepare(
        `INSERT INTO cached_student (id, rollNumber, payload, updatedAt) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET rollNumber = excluded.rollNumber, payload = excluded.payload, updatedAt = excluded.updatedAt`,
      )
      .run(s.id, s.rollNumber, JSON.stringify(s), new Date().toISOString());
  }
  getStudentByRoll(roll: string): CachedStudent | null {
    const row = this.db.prepare("SELECT payload FROM cached_student WHERE rollNumber = ?").get(roll) as
      | { payload: string }
      | undefined;
    return row ? (JSON.parse(row.payload) as CachedStudent) : null;
  }
  listStudents(): CachedStudent[] {
    const rows = this.db.prepare("SELECT payload FROM cached_student").all() as { payload: string }[];
    return rows.map((r) => JSON.parse(r.payload) as CachedStudent);
  }

  // ---- locally captured scans -------------------------------------------------

  putScan(scan: LocalScan): void {
    this.db
      .prepare(
        `INSERT INTO local_scan (id, jobId, payload, updatedAt) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET jobId = excluded.jobId, payload = excluded.payload, updatedAt = excluded.updatedAt`,
      )
      .run(scan.id, scan.jobId, JSON.stringify(scan), new Date().toISOString());
  }
  getScan(id: string): LocalScan | null {
    const row = this.db.prepare("SELECT payload FROM local_scan WHERE id = ?").get(id) as { payload: string } | undefined;
    return row ? (JSON.parse(row.payload) as LocalScan) : null;
  }
  listScans(jobId: string): LocalScan[] {
    const rows = this.db.prepare("SELECT payload FROM local_scan WHERE jobId = ?").all(jobId) as { payload: string }[];
    return rows.map((r) => JSON.parse(r.payload) as LocalScan);
  }

  // ---- durable outbox ----------------------------------------------------------

  enqueue(event: SyncEventEnvelope): void {
    // idempotent on eventId - a re-ingest of the same scan never duplicates the queue
    this.db
      .prepare("INSERT OR IGNORE INTO outbox_event (eventId, payload, createdAt, attempts) VALUES (?, ?, ?, 0)")
      .run(event.eventId, JSON.stringify(event), new Date().toISOString());
  }
  outbox(): SyncEventEnvelope[] {
    const rows = this.db.prepare("SELECT payload FROM outbox_event ORDER BY createdAt ASC").all() as { payload: string }[];
    return rows.map((r) => JSON.parse(r.payload) as SyncEventEnvelope);
  }
  dequeue(eventIds: string[]): void {
    if (!eventIds.length) return;
    this.db.exec("BEGIN");
    try {
      const stmt = this.db.prepare("DELETE FROM outbox_event WHERE eventId = ?");
      for (const id of eventIds) stmt.run(id);
      this.db.exec("COMMIT");
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  // ---- pull cursor ---------------------------------------------------------------

  getPullCursor(): string | null {
    const row = this.db.prepare("SELECT value FROM node_metadata WHERE key = 'pullCursor'").get() as
      | { value: string }
      | undefined;
    return row?.value ?? null;
  }
  setPullCursor(cursor: string | null): void {
    if (cursor === null) {
      this.db.prepare("DELETE FROM node_metadata WHERE key = 'pullCursor'").run();
    } else {
      this.db
        .prepare(
          `INSERT INTO node_metadata (key, value) VALUES ('pullCursor', ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        )
        .run(cursor);
    }
  }

  // ---- pulled delta merge ---------------------------------------------------------

  applyDelta(delta: PullDeltaLike): void {
    this.db.exec("BEGIN");
    try {
      // `changes.students` are raw cloud Student rows - narrow to the cached shape,
      // matching MemoryNodeStore. `changes.exams` are raw cloud Exam rows (unjoined,
      // markingRules still a JSON string) - NOT the joined CachedExam shape putExam()
      // expects, so a full exam refresh goes through toCachedExam() + putExam()
      // explicitly, not the generic sync delta. Only exam *tombstones* apply here.
      for (const raw of delta.changes.students ?? []) {
        const s = raw as { id: string; rollNumber: string; name: string; branchId: string };
        this.putStudent({ id: s.id, rollNumber: s.rollNumber, name: s.name, branchId: s.branchId });
      }
      for (const t of delta.tombstones) {
        if (t.entityType === "students") this.db.prepare("DELETE FROM cached_student WHERE id = ?").run(t.entityId);
        if (t.entityType === "exams") this.db.prepare("DELETE FROM cached_exam WHERE id = ?").run(t.entityId);
      }
      this.db.exec("COMMIT");
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }
}
