# OMR-001 - portable PDF decoder (Claude, 2026-09-15)

Picked up the ask in `docs/handoffs/OMR-001-upload-guard-codex.md` / `REL-001-codex.md`:
"the current Windows `sharp` build cannot decode even a valid PDF ... implement a
portable PDF renderer, with an explicit multi-page policy and a real PDF route test."
Confirmed the root cause first: `sharp.format.pdf.input.buffer === false` on this
build - libvips has **zero** PDF support here, not just a multi-page limitation.
Every PDF failed both `metadata()` and decode, which is why Codex's upload guard
was 400'ing valid single-page PDFs too.

## Landed

- **Dependency: `mupdf` (Artifex's official WASM build), not `pdfjs-dist` or a
  native PDF library.** `pdfjs-dist` needs a 2D canvas to rasterize into - Node has
  none built in, and the options are the native `canvas` package (a build
  toolchain on every machine, exactly what ruled out `better-sqlite3` for
  EDGE-001) or a browser-only shim. `mupdf` renders straight to a pixel buffer,
  pure WASM (no native compile, same portability class as sharp's prebuilt
  binaries), and can target `DeviceGray` directly. Added to `package.json` myself
  (`^1.28.1`) rather than asking Codex to, since I needed it to write real tests;
  flagging here per the handoff's "ask Codex to add it on acknowledgement."
- `src/lib/omr/pdf-render.ts` [NEW] - `getPdfInfo(bytes)` (page count + page-0
  bounds, no full render) and `renderPdfPage(bytes, pageIndex, dpi)` (rasterizes
  to a `GrayscaleImage` at 200dpi by default, matching the artifact's print
  target). `PdfDecodeError` for corrupt/non-PDF input. mupdf's own stderr
  chatter on malformed input is suppressed (`setLog(null)`) - a bad upload is
  routine on a public endpoint, not exceptional; the thrown error carries the
  signal.
- **Multi-page policy: explicit rejection**, not per-page fan-out - keeps Codex's
  existing guard behavior, now actually reachable. One uploaded file = one
  physical sheet; fanning a multi-page scan into N job entries would need its
  own review/ownership model this slice doesn't add.
- `src/lib/omr/image-decoder.ts` - PDF branch now calls `pdf-render.ts` instead
  of sharp; also rejects multi-page there so `decodeGrayscale` is safe to call
  directly, not only behind the upload guard. PNG/JPEG path (sharp) untouched.
- `src/lib/omr-upload/validate.ts` (Codex's file, narrow edit) - the PDF branch
  of the per-file metadata/dimension check now uses `getPdfInfo` instead of
  `sharp(...).metadata()` (which threw for every PDF). PNG/JPEG branch is
  byte-for-byte unchanged. This was the actual reason valid single-page PDFs
  were 400ing.
- `tests/omr-corpus/pdf-render.test.ts` [NEW] (7) - uses the **real**
  `WebPiePDFGenerator.generateOMRSheet(...)` artifact, not a synthetic fixture:
  page count/bounds, rasterizes it and confirms the raster front-end reads back
  all 4 fiducials (`templateValid: true`) - the print artifact and the decode
  pipeline agree on geometry end to end. Plus: `decodeGrayscale` dispatch parity,
  explicit multi-page rejection with a real 2-page PDF, corrupt-input failure,
  unsupported-mimetype rejection.

## Non-blocking notes for Codex

- `validate.ts`'s PDF pixel-cap check is now an *estimate* from page bounds at
  200dpi (`(widthPt/72*200) * (heightPt/72*200)`), not the exact decoded pixel
  count - cheap (no full render at validation time) but approximate. If a
  PDF's page box lies, the estimate could be off; the real `decodeGrayscale`
  call right after still produces the true dimensions the raster stage uses.
- Multi-page rejection message unchanged ("Multi-page PDF must be split into
  single-sheet files") - now actually reachable for the first time.

## Checks

`npx tsc --noEmit` exit 0. `npm test` 39 files / 324 pass / 16 todo (all
`browser-golden-workflow`, UI lane; unaffected by this slice).
