import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkApiPermission } from "@/lib/permissions";
import { objectStorage } from "@/lib/storage/object-storage";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!checkApiPermission(session.role, "omr")) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
  }

  const scan = await prisma.oMRScan.findFirst({
    where: { id: params.id, job: { tenantId: session.tenantId } },
    select: { sheetImageUrl: true },
  });
  if (!scan?.sheetImageUrl) return NextResponse.json({ error: "Image not found" }, { status: 404 });

  try {
    const bytes = await objectStorage.get(scan.sheetImageUrl);
    const mime = /\.png$/i.test(scan.sheetImageUrl) ? "image/png"
      : /\.jpe?g$/i.test(scan.sheetImageUrl) ? "image/jpeg"
      : /\.pdf$/i.test(scan.sheetImageUrl) ? "application/pdf" : "application/octet-stream";
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "content-type": mime,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
}
