import sharp from "sharp";
import type { GrayscaleImage } from "./raster";

export async function decodeGrayscale(input: Buffer, mimeType: string): Promise<GrayscaleImage> {
  if (!(["image/png", "image/jpeg", "application/pdf"].includes(mimeType))) throw new Error("Unsupported OMR file type");
  const { data, info } = await sharp(input, { density: 200, page: 0 }).greyscale().raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data };
}
