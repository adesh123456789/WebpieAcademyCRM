import { DeterministicOMREngine, type SheetExtractionResult } from "./omr-engine";

/**
 * OMR-001 - raster front-end. Turns an actual pixel image into the per-option
 * density map that the (safety-hardened) DeterministicOMREngine consumes.
 *
 * Stages (PRD 26.2): binarize -> locate 4-corner fiducials -> projective deskew
 * -> sample the bubble grid -> read the roll block -> hand densities + validation
 * flags to the engine.
 *
 * Image decoding (PNG/PDF -> GrayscaleImage) is a separate adapter; this module
 * is dependency-free and works on a raw grayscale buffer so it can be unit
 * tested on synthetic rasters.
 */

export interface GrayscaleImage {
  width: number;
  height: number;
  /** row-major, one byte per pixel, 0 = black .. 255 = white */
  data: Uint8Array | Uint8ClampedArray | number[];
}

export interface SheetGeometry {
  templateId: string;
  totalQuestions: number;
  optionsPerQuestion: number;
  columns: number;
  rollNumberDigits: number;
  /** normalized (0..1) layout on the sheet */
  layout: {
    fiducialInset: number; // centre of each corner marker, as a fraction from the edge
    fiducialRadius: number;
    grid: { top: number; bottom: number; left: number; right: number }; // bubble-grid bounding box
    bubbleRadius: number;
    roll: { top: number; bottom: number; left: number; right: number }; // roll-number block box
  };
}

export const STANDARD_75Q_GEOMETRY: SheetGeometry = {
  templateId: "WEBPIE_STANDARD_75Q",
  totalQuestions: 75,
  optionsPerQuestion: 4,
  columns: 3,
  rollNumberDigits: 6,
  layout: {
    fiducialInset: 0.045,
    fiducialRadius: 0.018,
    grid: { top: 0.28, bottom: 0.96, left: 0.08, right: 0.97 },
    bubbleRadius: 0.011,
    roll: { top: 0.12, bottom: 0.24, left: 0.34, right: 0.66 },
  },
};

export interface RasterResult {
  questionDensityMap: Record<number, number[]>;
  rollNumber: string;
  templateValid: boolean;
  pageComplete: boolean;
  fiducials: Point[]; // detected, in image pixels; [] when detection failed
  threshold: number;
}

export interface Point {
  x: number;
  y: number;
}

// ---------------------------------------------------------------- binarize

function px(img: GrayscaleImage, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return 255;
  return img.data[y * img.width + x] ?? 255;
}

/** Otsu's method over a 256-bin histogram. */
export function otsuThreshold(img: GrayscaleImage): number {
  const hist = new Array(256).fill(0);
  const n = img.width * img.height;
  for (let i = 0; i < n; i++) hist[Math.max(0, Math.min(255, Math.round(img.data[i] ?? 255)))]++;

  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let bestVar = -1;
  let plateauLo = 0;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = n - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > bestVar + 1e-6) {
      bestVar = between;
      plateauLo = t;
      best = t;
    } else if (between >= bestVar - 1e-6) {
      // equal-variance plateau (a clean bimodal page) - aim for its middle
      best = Math.round((plateauLo + t) / 2);
    }
  }
  return best;
}

// ---------------------------------------------------------------- fiducials

/** Centroid of dark pixels inside a rectangular search window, or null. */
function darkCentroid(
  img: GrayscaleImage,
  threshold: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { point: Point; count: number } | null {
  let sx = 0;
  let sy = 0;
  let count = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (px(img, x, y) <= threshold) {
        sx += x;
        sy += y;
        count++;
      }
    }
  }
  if (count === 0) return null;
  return { point: { x: sx / count, y: sy / count }, count };
}

/**
 * Look for a solid marker near each of the 4 corners. Returns the 4 centroids in
 * TL, TR, BR, BL order, or null if any corner window has too little ink to be a
 * marker (torn / cropped / not a WebPie sheet).
 */
export function locateFiducials(img: GrayscaleImage, threshold: number): Point[] | null {
  const w = img.width;
  const h = img.height;
  const winW = Math.max(8, Math.round(w * 0.15));
  const winH = Math.max(8, Math.round(h * 0.15));
  const minInk = Math.max(6, Math.round(winW * winH * 0.008));

  const corners: [number, number, number, number][] = [
    [0, 0, winW, winH],
    [w - winW, 0, w, winH],
    [w - winW, h - winH, w, h],
    [0, h - winH, winW, h],
  ];

  const found: Point[] = [];
  for (const [x0, y0, x1, y1] of corners) {
    const c = darkCentroid(img, threshold, x0, y0, x1, y1);
    if (!c || c.count < minInk) return null;
    found.push(c.point);
  }
  return found;
}

// ---------------------------------------------------------------- projective map

/**
 * Solve the 8-parameter projective transform mapping the 4 `src` points (in
 * normalized sheet coords) to the 4 `dst` points (image pixels), then return a
 * sampler `map(u,v)` for any normalized coord - it extrapolates correctly to the
 * page edges even though the anchors are inset.
 */
export function projectiveFrom(src: Point[], dst: Point[]): (u: number, v: number) => Point {
  // Build 8x8 system for [a b c d e f g h]
  const A: number[][] = [];
  const B: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x: u, y: v } = src[i];
    const { x, y } = dst[i];
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]);
    B.push(x);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]);
    B.push(y);
  }
  const p = solve(A, B); // length 8
  const [a, b, c, d, e, f, g, hh] = p;
  return (u: number, v: number) => {
    const denom = g * u + hh * v + 1 || 1e-9;
    return { x: (a * u + b * v + c) / denom, y: (d * u + e * v + f) / denom };
  };
}

/** Gaussian elimination with partial pivoting. */
function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const m = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    const pv = m[col][col] || 1e-9;
    for (let c = col; c <= n; c++) m[col][c] /= pv;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = m[r][col];
      for (let c = col; c <= n; c++) m[r][c] -= factor * m[col][c];
    }
  }
  return m.map((row) => row[n]);
}

// ---------------------------------------------------------------- sampling

/** Fraction of dark pixels in a disc of the given normalized radius around (u,v). */
function discDensity(
  img: GrayscaleImage,
  threshold: number,
  map: (u: number, v: number) => Point,
  u: number,
  v: number,
  rNorm: number,
): number {
  const c = map(u, v);
  const edge = map(u + rNorm, v);
  const rPx = Math.max(2, Math.hypot(edge.x - c.x, edge.y - c.y));
  let dark = 0;
  let total = 0;
  const r = Math.ceil(rPx);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > rPx * rPx) continue;
      total++;
      if (px(img, Math.round(c.x + dx), Math.round(c.y + dy)) <= threshold) dark++;
    }
  }
  return total === 0 ? 0 : dark / total;
}

function inBounds(img: GrayscaleImage, p: Point, margin = 0): boolean {
  return p.x >= margin && p.y >= margin && p.x < img.width - margin && p.y < img.height - margin;
}

// ---------------------------------------------------------------- pipeline

export function rasterToDensityMap(img: GrayscaleImage, geom: SheetGeometry): RasterResult {
  const threshold = otsuThreshold(img);
  const fiducials = locateFiducials(img, threshold);

  if (!fiducials) {
    return {
      questionDensityMap: {},
      rollNumber: "",
      templateValid: false,
      pageComplete: false,
      fiducials: [],
      threshold,
    };
  }

  // Fiducial centres sit at `inset` from each edge in normalized sheet coords.
  // Map those 4 correspondences; the projective form extrapolates to 0..1.
  const inset = geom.layout.fiducialInset;
  const anchors: Point[] = [
    { x: inset, y: inset },
    { x: 1 - inset, y: inset },
    { x: 1 - inset, y: 1 - inset },
    { x: inset, y: 1 - inset },
  ];
  const map = projectiveFrom(anchors, fiducials);

  const g = geom.layout.grid;
  const pageComplete =
    inBounds(img, map(g.left, g.top), 1) &&
    inBounds(img, map(g.right, g.top), 1) &&
    inBounds(img, map(g.left, g.bottom), 1) &&
    inBounds(img, map(g.right, g.bottom), 1);

  const questionDensityMap = sampleQuestionGrid(img, threshold, map, geom);
  const rollNumber = readRollNumber(img, threshold, map, geom);

  return { questionDensityMap, rollNumber, templateValid: true, pageComplete, fiducials, threshold };
}

/**
 * Normalized sheet coord of one answer bubble. Shared by the sampler and the
 * synthetic fixture renderer so they can never drift apart.
 */
export function questionBubbleUV(geom: SheetGeometry, q: number, option: number): Point {
  const { grid } = geom.layout;
  const perColumn = Math.ceil(geom.totalQuestions / geom.columns);
  const colWidth = (grid.right - grid.left) / geom.columns;
  const optionSpan = colWidth * 0.62;
  const optionStart = colWidth * 0.32;
  const rowSpan = grid.bottom - grid.top;
  const col = Math.floor((q - 1) / perColumn);
  const rowInCol = (q - 1) % perColumn;
  return {
    x: grid.left + col * colWidth + optionStart + (optionSpan * (option + 0.5)) / geom.optionsPerQuestion,
    y: grid.top + (rowSpan * (rowInCol + 0.5)) / perColumn,
  };
}

/** Normalized sheet coord of roll-digit column `d`, value `n` (0-9). */
export function rollBubbleUV(geom: SheetGeometry, d: number, n: number): Point {
  const { roll } = geom.layout;
  const colWidth = (roll.right - roll.left) / geom.rollNumberDigits;
  const rowSpan = roll.bottom - roll.top;
  return { x: roll.left + colWidth * (d + 0.5), y: roll.top + (rowSpan * (n + 0.5)) / 10 };
}

function sampleQuestionGrid(
  img: GrayscaleImage,
  threshold: number,
  map: (u: number, v: number) => Point,
  geom: SheetGeometry,
): Record<number, number[]> {
  const { bubbleRadius } = geom.layout;
  const out: Record<number, number[]> = {};
  for (let q = 1; q <= geom.totalQuestions; q++) {
    const densities: number[] = [];
    for (let o = 0; o < geom.optionsPerQuestion; o++) {
      const { x: u, y: v } = questionBubbleUV(geom, q, o);
      densities.push(round2(discDensity(img, threshold, map, u, v, bubbleRadius)));
    }
    out[q] = densities;
  }
  return out;
}

function readRollNumber(
  img: GrayscaleImage,
  threshold: number,
  map: (u: number, v: number) => Point,
  geom: SheetGeometry,
): string {
  const { bubbleRadius } = geom.layout;
  let digits = "";
  for (let d = 0; d < geom.rollNumberDigits; d++) {
    let bestVal = 0;
    let bestDensity = 0;
    let second = 0;
    for (let n = 0; n <= 9; n++) {
      const { x: u, y: v } = rollBubbleUV(geom, d, n);
      const density = discDensity(img, threshold, map, u, v, bubbleRadius);
      if (density > bestDensity) {
        second = bestDensity;
        bestDensity = density;
        bestVal = n;
      } else if (density > second) {
        second = density;
      }
    }
    // need a clear winner, else the sheet identity is unresolved
    if (bestDensity < 0.35 || bestDensity - second < 0.15) return "";
    digits += String(bestVal);
  }
  return digits;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------- end to end

/** Full pipeline: image -> densities -> the deterministic engine's result. */
export function extractSheetFromImage(
  img: GrayscaleImage,
  geom: SheetGeometry,
  sheetId: string,
  opts: { supported?: boolean } = {},
): SheetExtractionResult {
  const raster = rasterToDensityMap(img, geom);
  return DeterministicOMREngine.extractResponsesFromGrid(
    sheetId,
    raster.rollNumber,
    geom.totalQuestions,
    raster.questionDensityMap,
    {
      supported: opts.supported,
      templateValid: raster.templateValid,
      pageComplete: raster.pageComplete,
    },
  );
}
