import sharp from "sharp";
import { decodeGrayscale } from "@/lib/omr/image-decoder";
import { getPdfInfo } from "@/lib/omr/pdf-render";
import type { GrayscaleImage } from "@/lib/omr/raster";

export const MAX_OMR_FILES = 50;
export const MAX_OMR_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_OMR_BATCH_BYTES = 100 * 1024 * 1024;
const MAX_OMR_PIXELS = 24_000_000;

const allowedFormats: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "application/pdf": "pdf",
};

export class OMRUploadError extends Error {
  constructor(message: string, public readonly status: 400 | 413 = 400) {
    super(message);
  }
}

export interface PreparedOMRFile {
  name: string;
  bytes: Buffer;
  image: GrayscaleImage;
}

/** Validate the whole batch before a job or stored object is created. */
export async function prepareOMRFiles(files: File[]): Promise<PreparedOMRFile[]> {
  if (!files.length) throw new OMRUploadError("At least one OMR file is required");
  if (files.length > MAX_OMR_FILES) throw new OMRUploadError(`At most ${MAX_OMR_FILES} OMR files are allowed`, 413);

  let totalBytes = 0;
  for (const file of files) {
    if (!allowedFormats[file.type]) throw new OMRUploadError(`Unsupported OMR file type: ${file.name}`);
    if (!file.size) throw new OMRUploadError(`Empty OMR file: ${file.name}`);
    if (file.size > MAX_OMR_FILE_BYTES) throw new OMRUploadError(`OMR file exceeds 10 MiB: ${file.name}`, 413);
    totalBytes += file.size;
  }
  if (totalBytes > MAX_OMR_BATCH_BYTES) throw new OMRUploadError("OMR batch exceeds 100 MiB", 413);

  const prepared: PreparedOMRFile[] = [];
  for (const file of files) {
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length !== file.size) throw new OMRUploadError(`OMR file size changed while reading: ${file.name}`);
    try {
      if (file.type === "application/pdf") {
        // sharp/libvips has zero PDF support on this build (metadata() throws for
        // every PDF, not just multi-page ones) - use the mupdf-based reader instead.
        // See src/lib/omr/pdf-render.ts.
        const info = getPdfInfo(bytes);
        if (info.pages !== 1) {
          throw new OMRUploadError(`Multi-page PDF must be split into single-sheet files: ${file.name}`);
        }
        const estimatedPixels = ((info.widthPt / 72) * 200) * ((info.heightPt / 72) * 200);
        if (!info.widthPt || !info.heightPt || estimatedPixels > MAX_OMR_PIXELS) {
          throw new OMRUploadError(`OMR image dimensions are unsupported: ${file.name}`, 413);
        }
      } else {
        const meta = await sharp(bytes, { density: 200, page: 0 }).metadata();
        if (meta.format !== allowedFormats[file.type]) throw new OMRUploadError(`OMR file content does not match its type: ${file.name}`);
        if (!meta.width || !meta.height || meta.width * meta.height > MAX_OMR_PIXELS) {
          throw new OMRUploadError(`OMR image dimensions are unsupported: ${file.name}`, 413);
        }
      }
      prepared.push({ name: file.name, bytes, image: await decodeGrayscale(bytes, file.type) });
    } catch (error) {
      if (error instanceof OMRUploadError) throw error;
      throw new OMRUploadError(`OMR file cannot be decoded: ${file.name}`);
    }
  }
  return prepared;
}
