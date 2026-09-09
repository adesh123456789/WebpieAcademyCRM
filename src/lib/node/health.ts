import { statfsSync } from "node:fs";
import { freemem, totalmem, tmpdir } from "node:os";

/**
 * EDGE-001 / AC-020 - disk & memory guard. The node refuses to start a heavy job
 * (OMR batch, local evaluation) when storage or RAM is unsafe, so a full disk
 * cannot corrupt the local store mid-write.
 */

export interface HealthThresholds {
  diskPauseBytes: number;
  diskPauseRatio: number;
  diskWarnBytes: number;
  memPauseBytes: number;
  memPauseRatio: number;
}

export const DEFAULT_THRESHOLDS: HealthThresholds = {
  diskPauseBytes: 500 * 1024 * 1024, // 500 MB
  diskPauseRatio: 0.03,
  diskWarnBytes: 2 * 1024 * 1024 * 1024, // 2 GB
  memPauseBytes: 200 * 1024 * 1024, // 200 MB
  memPauseRatio: 0.05,
};

export type HealthStatus = "OK" | "WARN" | "PAUSE";

export interface NodeHealth {
  status: HealthStatus;
  diskFreeBytes: number;
  diskFreeRatio: number;
  memFreeBytes: number;
  memFreeRatio: number;
  reasons: string[];
}

export interface HealthProbe {
  disk?: () => { free: number; total: number };
  mem?: () => { free: number; total: number };
}

function realDisk(path: string) {
  const s = statfsSync(path);
  const free = Number(s.bavail) * Number(s.bsize);
  const total = Number(s.blocks) * Number(s.bsize);
  return { free, total };
}

export function checkNodeHealth(
  opts: { path?: string; thresholds?: Partial<HealthThresholds>; probe?: HealthProbe } = {},
): NodeHealth {
  const t = { ...DEFAULT_THRESHOLDS, ...(opts.thresholds ?? {}) };
  const disk = (opts.probe?.disk ?? (() => realDisk(opts.path ?? tmpdir())))();
  const mem = (opts.probe?.mem ?? (() => ({ free: freemem(), total: totalmem() })))();

  const diskFreeRatio = disk.total > 0 ? disk.free / disk.total : 1;
  const memFreeRatio = mem.total > 0 ? mem.free / mem.total : 1;
  const reasons: string[] = [];
  let status: HealthStatus = "OK";

  if (disk.free < t.diskPauseBytes || diskFreeRatio < t.diskPauseRatio) {
    status = "PAUSE";
    reasons.push(`disk critically low (${Math.round(disk.free / 1e6)} MB, ${(diskFreeRatio * 100).toFixed(1)}%)`);
  } else if (disk.free < t.diskWarnBytes) {
    status = "WARN";
    reasons.push(`disk low (${Math.round(disk.free / 1e6)} MB)`);
  }

  // Memory low is WARN, not PAUSE: os.freemem() ignores reclaimable page cache,
  // so it is an unreliable stop signal. Disk-full is the corruption risk AC-020
  // guards against. A deployment can still opt into a mem PAUSE via thresholds.
  if (mem.free < t.memPauseBytes || memFreeRatio < t.memPauseRatio) {
    if (status === "OK") status = "WARN";
    reasons.push(`memory low (${Math.round(mem.free / 1e6)} MB, ${(memFreeRatio * 100).toFixed(1)}%)`);
  }

  return { status, diskFreeBytes: disk.free, diskFreeRatio, memFreeBytes: mem.free, memFreeRatio, reasons };
}

export class NodeHealthError extends Error {
  constructor(public health: NodeHealth) {
    super(`Academic Node paused: ${health.reasons.join("; ")}`);
    this.name = "NodeHealthError";
  }
}

/** Throw before a heavy job if the node is in PAUSE. */
export function assertHealthyForHeavyJob(opts?: Parameters<typeof checkNodeHealth>[0]): NodeHealth {
  const h = checkNodeHealth(opts);
  if (h.status === "PAUSE") throw new NodeHealthError(h);
  return h;
}
