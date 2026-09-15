import { describe, expect, it } from "vitest";
import { jsPDF } from "jspdf";
import { WebPiePDFGenerator } from "../../src/lib/omr/pdf-generator";
import { getPdfInfo, renderPdfPage, PdfDecodeError } from "../../src/lib/omr/pdf-render";
import { decodeGrayscale } from "../../src/lib/omr/image-decoder";
import { rasterToDensityMap, STANDARD_75Q_GEOMETRY } from "../../src/lib/omr/raster";

/**
 * OMR-001 - the portable PDF rasterizer (mupdf), picked up after Codex's
 * upload-guard handoff found sharp has zero PDF support on this Windows
 * build. Renders the *real* branded artifact PDFGenerator produces - not a
 * synthetic fixture - proving the print pipeline (pdf-generator.ts) and the
 * decode pipeline (pdf-render.ts) agree on geometry end to end.
 */

const BRANDING = {
  instituteName: "Synthetic Academy",
  examTitle: "PDF Decoder Test",
  examCode: "PDFDEC",
  durationMinutes: 60,
  totalMarks: 300,
  totalQuestions: 75,
};

function realArtifactBytes(): Buffer {
  const doc = WebPiePDFGenerator.generateOMRSheet(BRANDING);
  return Buffer.from(doc.output("arraybuffer"));
}

describe("getPdfInfo", () => {
  it("reports one page and A4-sized bounds for the real branded artifact", () => {
    const info = getPdfInfo(realArtifactBytes());
    expect(info.pages).toBe(1);
    // A4 in points is 595.28 x 841.89 - allow rounding slack
    expect(info.widthPt).toBeGreaterThan(590);
    expect(info.widthPt).toBeLessThan(600);
    expect(info.heightPt).toBeGreaterThan(835);
    expect(info.heightPt).toBeLessThan(848);
  });

  it("reports the true page count for a multi-page PDF", () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.text("page 1", 10, 10);
    doc.addPage();
    doc.text("page 2", 10, 10);
    const bytes = Buffer.from(doc.output("arraybuffer"));
    expect(getPdfInfo(bytes).pages).toBe(2);
  });

  it("throws PdfDecodeError for bytes that aren't a PDF", () => {
    expect(() => getPdfInfo(Buffer.from("not a pdf at all"))).toThrow(PdfDecodeError);
  });
});

describe("renderPdfPage", () => {
  it("rasterizes the real branded artifact at 200dpi with its 4-corner fiducials readable by the raster front-end", () => {
    const image = renderPdfPage(realArtifactBytes(), 0, 200);
    // A4 @ 200dpi ~ 1654 x 2339
    expect(image.width).toBeGreaterThan(1600);
    expect(image.width).toBeLessThan(1700);
    expect(image.height).toBeGreaterThan(2300);
    expect(image.height).toBeLessThan(2400);

    const raster = rasterToDensityMap(image, STANDARD_75Q_GEOMETRY);
    expect(raster.templateValid).toBe(true);
    expect(raster.fiducials).toHaveLength(4);
  });
});

describe("decodeGrayscale (application/pdf)", () => {
  it("dispatches PDFs to the mupdf renderer and produces the same result as calling it directly", async () => {
    const bytes = realArtifactBytes();
    const viaDecoder = await decodeGrayscale(bytes, "application/pdf");
    const direct = renderPdfPage(bytes, 0, 200);
    expect(viaDecoder.width).toBe(direct.width);
    expect(viaDecoder.height).toBe(direct.height);
    expect(Buffer.compare(Buffer.from(viaDecoder.data), Buffer.from(direct.data))).toBe(0);
  });

  it("rejects a multi-page PDF with an explicit message, not a silent first-page decode", async () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    doc.text("page 1", 10, 10);
    doc.addPage();
    doc.text("page 2", 10, 10);
    const bytes = Buffer.from(doc.output("arraybuffer"));
    await expect(decodeGrayscale(bytes, "application/pdf")).rejects.toThrow(/multi-page/i);
  });

  it("still rejects non-PNG/JPEG/PDF types", async () => {
    await expect(decodeGrayscale(Buffer.from("x"), "image/gif")).rejects.toThrow(/unsupported/i);
  });
});
