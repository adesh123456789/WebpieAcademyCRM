import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { decodeGrayscale } from "../../src/lib/omr/image-decoder";
import { extractSheetFromImage, type GrayscaleImage } from "../../src/lib/omr/raster";
import { renderSheet, TEST_30Q_GEOMETRY } from "./raster-fixtures";

/**
 * OMR-001 - real image decoder seam (`146ecc5`). The multipart route does exactly
 * `decodeGrayscale(bytes, mime)` -> `extractSheetFromImage(...)`; this proves the
 * sharp PNG decode round-trips losslessly into the raster front-end, so a real
 * uploaded sheet reaches the same deterministic result as a raw buffer would.
 */

const geom = TEST_30Q_GEOMETRY;
const answers: Record<number, "A" | "B" | "C" | "D"> = {};
for (let q = 1; q <= 30; q++) answers[q] = (["A", "B", "C", "D"] as const)[q % 4];
delete answers[5];
delete answers[19];

async function toPng(img: GrayscaleImage): Promise<Buffer> {
  const raw = Buffer.from(Uint8Array.from(img.data));
  return sharp(raw, { raw: { width: img.width, height: img.height, channels: 1 } })
    .png()
    .toBuffer();
}

describe("OMR image decoder", () => {
  it("decodes a PNG upload to the same GrayscaleImage the raster pipeline expects", async () => {
    const rendered = renderSheet({ roll: "260031", answers });
    const decoded = await decodeGrayscale(await toPng(rendered), "image/png");

    expect(decoded.width).toBe(rendered.width);
    expect(decoded.height).toBe(rendered.height);
    expect(decoded.data.length).toBe(rendered.data.length);
    // PNG is lossless for a single grey channel - pixels survive exactly
    expect(Buffer.compare(Buffer.from(decoded.data), Buffer.from(rendered.data))).toBe(0);
  });

  it("a decoded upload extracts identically to the in-memory sheet", async () => {
    const rendered = renderSheet({ roll: "260031", answers });
    const decoded = await decodeGrayscale(await toPng(rendered), "image/png");

    const direct = extractSheetFromImage(rendered, geom, "direct", { supported: true });
    const viaUpload = extractSheetFromImage(decoded, geom, "upload", { supported: true });

    expect(viaUpload.status).toBe("CONFIDENT");
    expect(viaUpload.rollNumber).toBe(direct.rollNumber);
    expect(viaUpload.rollNumber).toBe("260031");
    expect(viaUpload.responses).toEqual(direct.responses);
    for (const [qStr, letter] of Object.entries(answers)) {
      expect(viaUpload.responses[Number(qStr)]).toBe(letter);
    }
    for (const q of [5, 19]) expect(viaUpload.responses[q]).toBeUndefined();
  });

  it("rejects an unsupported file type before touching the raster stage", async () => {
    await expect(decodeGrayscale(Buffer.from("not an image"), "image/gif")).rejects.toThrow(
      /unsupported/i,
    );
  });
});
