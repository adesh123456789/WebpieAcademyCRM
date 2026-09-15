import * as mupdf from "mupdf";
import type { GrayscaleImage } from "./raster";

/**
 * OMR-001 - portable PDF rasterizer.
 *
 * The Windows `sharp`/libvips build in this environment ships with zero PDF
 * support at all (`sharp.format.pdf.input.buffer === false` - confirmed; every
 * PDF, single-page or not, fails metadata *and* decode with "Input buffer
 * contains unsupported image format"). `sharp` stays the PNG/JPEG decoder
 * (`image-decoder.ts`); PDFs go through this module instead.
 *
 * Chose `mupdf` (the official Artifex WASM build) over `pdfjs-dist`: pdf.js
 * needs a 2D canvas to rasterize into and Node has no built-in one - the
 * options are the native `canvas` package (a build-toolchain dependency,
 * exactly what disqualified `better-sqlite3` for EDGE-001) or a browser-only
 * `OffscreenCanvas` shim. `mupdf` renders straight to a pixel buffer, is pure
 * WASM (no native compile step, same portability class as `sharp`'s prebuilt
 * binaries, works identically on Windows/Linux/the Docker image), and can
 * target `DeviceGray` directly so no separate greyscale pass is needed.
 *
 * Multi-page policy: explicit rejection, not per-page fan-out. `renderPdfPage`
 * always renders index 0; `getPdfInfo` reports the true page count so the
 * upload guard can refuse a multi-page batch before any job/storage write
 * (one physical OMR sheet per uploaded file - a multi-page scan is very
 * unlikely to be one candidate's sheet and fanning it into N job entries
 * would need its own review/ownership model this slice doesn't add).
 */

// A malformed/malicious upload is routine, not exceptional, on a public upload
// endpoint - mupdf's own stderr chatter ("cannot find version marker", xref
// repair attempts) shouldn't spam server logs for it. The thrown PdfDecodeError
// carries the signal instead.
mupdf.setLog(null);

export interface PdfInfo {
  pages: number;
  /** Page 0 bounds in points (1/72in), for a cheap pixel-count estimate before a full render. */
  widthPt: number;
  heightPt: number;
}

export class PdfDecodeError extends Error {}

function openPdf(bytes: Buffer): mupdf.Document {
  try {
    return mupdf.Document.openDocument(bytes, "application/pdf");
  } catch {
    throw new PdfDecodeError("PDF could not be opened (corrupt or not a PDF)");
  }
}

/** Page count + page-0 dimensions, without a full raster render. */
export function getPdfInfo(bytes: Buffer): PdfInfo {
  const doc = openPdf(bytes);
  try {
    const pages = doc.countPages();
    if (pages < 1) throw new PdfDecodeError("PDF has no pages");
    const page = doc.loadPage(0);
    try {
      const [x0, y0, x1, y1] = page.getBounds();
      return { pages, widthPt: x1 - x0, heightPt: y1 - y0 };
    } finally {
      page.destroy();
    }
  } finally {
    doc.destroy();
  }
}

/** Renders one PDF page to a greyscale raster at `dpi` (default matches the OMR artifact's print/scan target). */
export function renderPdfPage(bytes: Buffer, pageIndex = 0, dpi = 200): GrayscaleImage {
  const doc = openPdf(bytes);
  try {
    const pages = doc.countPages();
    if (pageIndex < 0 || pageIndex >= pages) {
      throw new PdfDecodeError(`PDF page ${pageIndex} does not exist (document has ${pages} page(s))`);
    }
    const page = doc.loadPage(pageIndex);
    try {
      const scale = dpi / 72;
      const pixmap = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceGray, false, true);
      try {
        if (pixmap.getNumberOfComponents() !== 1) {
          throw new PdfDecodeError("expected a single-channel greyscale pixmap");
        }
        return { width: pixmap.getWidth(), height: pixmap.getHeight(), data: new Uint8Array(pixmap.getPixels()) };
      } finally {
        pixmap.destroy();
      }
    } finally {
      page.destroy();
    }
  } finally {
    doc.destroy();
  }
}
