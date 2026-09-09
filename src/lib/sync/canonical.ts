import { createHash } from "node:crypto";
import type { SyncEventEnvelope } from "./types";

/**
 * Deterministic canonical JSON: object keys sorted recursively, no insignificant
 * whitespace, `undefined` dropped, `-0` normalized. Two logically equal payloads
 * always produce the same string (C06 amendment A.2 - duplicate identity must
 * match the canonical payload hash, not the wire bytes).
 */
export function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "null";
  const t = typeof value;
  if (t === "number") return Object.is(value, -0) ? "0" : JSON.stringify(value);
  if (t === "boolean" || t === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (t === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(",")}}`;
  }
  return "null"; // functions, symbols, bigint - not valid sync payload content
}

/**
 * Canonical identity hash for an event: covers entity identity, version, op and
 * the canonical payload. A replay whose eventId matches but whose hash differs is
 * a divergent conflict, never a successful duplicate.
 */
export function canonicalPayloadHash(e: SyncEventEnvelope): string {
  const identity = {
    entityType: e.entityType,
    entityId: e.entityId,
    entityVersion: e.entityVersion,
    op: e.op,
    payload: e.payload,
  };
  return createHash("sha256").update(canonicalize(identity)).digest("hex");
}
