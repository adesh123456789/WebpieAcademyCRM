import {
  STANDARD_75Q_GEOMETRY,
  projectiveFrom,
  questionBubbleUV,
  rollBubbleUV,
  type GrayscaleImage,
  type SheetGeometry,
} from "../../src/lib/omr/raster";

/**
 * CLD-002 raster-fixture builder for OMR-001. Renders a synthetic grayscale OMR
 * sheet from an answer spec, using the SAME geometry helpers the sampler uses,
 * so a round-trip proves the pipeline (binarize -> fiducials -> deskew -> sample)
 * without needing a real image decoder.
 */

export const TEST_30Q_GEOMETRY: SheetGeometry = {
  ...STANDARD_75Q_GEOMETRY,
  templateId: "TEST_30Q",
  totalQuestions: 30,
};

export interface SheetSpec {
  geom?: SheetGeometry;
  width?: number;
  height?: number;
  /** "260001" -> filled roll bubbles; "" -> roll block left blank */
  roll: string;
  /** question number -> option letter */
  answers?: Record<number, "A" | "B" | "C" | "D">;
  /** question number -> fill density 0..1 (default 1) */
  fills?: Record<number, number>;
  /** extra faint marks: question -> [option letter, density] */
  strays?: Record<number, ["A" | "B" | "C" | "D", number]>;
  rotationDeg?: number;
  /** keystone: >0 narrows the top edge (perspective skew from an angled phone shot) */
  perspective?: number;
  /** downscale the render (low-DPI capture) */
  scale?: number;
  /** drop one fiducial (0=TL,1=TR,2=BR,3=BL) to simulate a torn corner */
  omitFiducial?: number;
  /** blank the bottom fraction of the page (cropped scan) */
  clipBottomFrac?: number;
}

export function renderSheet(spec: SheetSpec): GrayscaleImage {
  const geom = spec.geom ?? TEST_30Q_GEOMETRY;
  const s = spec.scale ?? 1;
  const width = Math.round((spec.width ?? 480) * s);
  const height = Math.round((spec.height ?? 640) * s);
  const data = new Uint8Array(width * height).fill(255);

  const rad = ((spec.rotationDeg ?? 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const persp = spec.perspective ?? 0; // 0..~0.3, narrows the top edge
  const cx = width / 2;
  const cy = height / 2;
  const halfW = (width * 0.9) / 2;
  const halfH = (height * 0.9) / 2;

  // Build a real projective sheet->pixel map from 4 rotated corner points with a
  // keystone on the top edge. Using projectiveFrom keeps `place` exactly the
  // inverse of what the raster pipeline fits, so a round-trip is lossless.
  const rot = (x: number, y: number) => ({ x: cx + x * cos - y * sin, y: cy + x * sin + y * cos });
  const topSqueeze = 1 - persp;
  const corners = [
    rot(-halfW * topSqueeze, -halfH), // TL
    rot(halfW * topSqueeze, -halfH), // TR
    rot(halfW, halfH), // BR
    rot(-halfW, halfH), // BL
  ];
  const place = projectiveFrom(
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
    corners,
  );

  const set = (x: number, y: number, val: number) => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= width || yi >= height) return;
    data[yi * width + xi] = val;
  };

  // deterministic dither so a rendered disc measures ~= target density
  const fillDisc = (u: number, v: number, rNorm: number, density: number) => {
    const c = place(u, v);
    const e = place(u + rNorm, v);
    const rPx = Math.max(2, Math.hypot(e.x - c.x, e.y - c.y));
    const r = Math.ceil(rPx);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > rPx * rPx) continue;
        const px = c.x + dx;
        const py = c.y + dy;
        const keep = (((Math.round(px) * 73 + Math.round(py) * 179) % 100) + 100) % 100;
        if (keep < density * 100) set(px, py, 14);
      }
    }
  };

  // fiducials
  const inset = geom.layout.fiducialInset;
  const fidR = geom.layout.fiducialRadius;
  const anchors = [
    [inset, inset],
    [1 - inset, inset],
    [1 - inset, 1 - inset],
    [inset, 1 - inset],
  ];
  anchors.forEach(([u, v], i) => {
    if (spec.omitFiducial === i) return;
    // solid square marker
    const c = place(u, v);
    const e = place(u + fidR, v);
    const rPx = Math.max(3, Math.hypot(e.x - c.x, e.y - c.y));
    for (let dy = -rPx; dy <= rPx; dy++) for (let dx = -rPx; dx <= rPx; dx++) set(c.x + dx, c.y + dy, 14);
  });

  // answers
  for (const [qStr, letter] of Object.entries(spec.answers ?? {})) {
    const q = Number(qStr);
    const opt = letter.charCodeAt(0) - 65;
    const { x: u, y: v } = questionBubbleUV(geom, q, opt);
    fillDisc(u, v, geom.layout.bubbleRadius, spec.fills?.[q] ?? 1);
  }
  for (const [qStr, [letter, density]] of Object.entries(spec.strays ?? {})) {
    const q = Number(qStr);
    const opt = letter.charCodeAt(0) - 65;
    const { x: u, y: v } = questionBubbleUV(geom, q, opt);
    fillDisc(u, v, geom.layout.bubbleRadius, density);
  }

  // roll digits
  if (spec.roll) {
    for (let d = 0; d < geom.rollNumberDigits && d < spec.roll.length; d++) {
      const n = Number(spec.roll[d]);
      if (Number.isNaN(n)) continue;
      const { x: u, y: v } = rollBubbleUV(geom, d, n);
      fillDisc(u, v, geom.layout.bubbleRadius, 1);
    }
  }

  // cropped scan: blank the bottom band (also erases the bottom fiducials)
  if (spec.clipBottomFrac && spec.clipBottomFrac > 0) {
    const cut = Math.round(height * (1 - spec.clipBottomFrac));
    for (let y = cut; y < height; y++) for (let x = 0; x < width; x++) data[y * width + x] = 255;
  }

  return { width, height, data };
}
