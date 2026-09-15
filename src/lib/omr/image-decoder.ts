import sharp from "sharp";
import type { GrayscaleImage } from "./raster";
import { getPdfInfo, renderPdfPage } from "./pdf-render";

/**
 * OMR-001 - decodes an uploaded OMR file to a GrayscaleImage. PNG/JPEG go
 * through sharp (unchanged); PDF goes through the mupdf-based renderer in
 * `pdf-render.ts` - this Windows sharp/libvips build has no PDF support at
 * all (see that file's doc comment). A multi-page PDF is rejected here too,
 * not just in the upload guard, so decodeGrayscale is safe to call directly.
 */
export async function decodeGrayscale(input: Buffer, mimeType: string): Promise<GrayscaleImage> {
  if (mimeType === "application/pdf") {
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
