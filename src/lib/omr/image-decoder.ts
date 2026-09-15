import sharp from "sharp";
import type { GrayscaleImage } from "./raster";

/**
 * OMR-001 - decodes an uploaded OMR file to a GrayscaleImage. PNG/JPEG go
 * through sharp (unchanged); PDF goes through the mupdf-based renderer in
 * `pdf-render.ts` - this Windows sharp/libvips build has no PDF support at
 * all (see that file's doc comment). A multi-page PDF is rejected here too,
 * not just in the upload guard, so decodeGrayscale is safe to call directly.
 *
 * `pdf-render.ts` (and mupdf) are imported dynamically, only when a PDF
 * actually shows up, not eagerly at module load: mupdf is real ESM with a
 * top-level await, which esbuild-based tools that eagerly transform the
 * whole require() graph - tsx (the Academic Node runtime's dev/run tool),
 * and previously Next's webpack bundle before `serverComponentsExternalPackages`
 * - choke on if it's a static top-level import.
 */
export async function decodeGrayscale(input: Buffer, mimeType: string): Promise<GrayscaleImage> {
  if (mimeType === "application/pdf") {
    const { getPdfInfo, renderPdfPage } = await import("./pdf-render");
    const info = getPdfInfo(input);
    if (info.pages !== 1) {
      throw new Error(`Multi-page PDF must be split into single-sheet files (${info.pages} pages)`);
    }
    return renderPdfPage(input, 0, 200);
  }
  if (mimeType !== "image/png" && mimeType !== "image/jpeg") throw new Error("Unsupported OMR file type");
  const { data, info } = await sharp(input, { density: 200, page: 0 }).greyscale().raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data };
}
