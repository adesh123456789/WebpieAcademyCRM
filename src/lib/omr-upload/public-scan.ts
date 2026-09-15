import type { OMRScan } from "@prisma/client";

/** API projection: the persisted storage location never leaves the server. */
export function publicOMRScan<T extends OMRScan>(scan: T): T {
  return {
    ...scan,
    sheetImageUrl: scan.sheetImageUrl ? `/api/v1/omr/scans/${scan.id}/image` : null,
  };
}

export function publicOMRJob<T extends { scans: OMRScan[] }>(job: T): T {
  return { ...job, scans: job.scans.map(publicOMRScan) };
}
