# CLD-002 / Claude

- **Task / owner**: CLD-002 (OMR benchmark corpus harness) / Claude
- **Timestamp + timezone**: 2026-09-09 Asia/Kolkata
- **Status**: DONE (integrated by Claude, Claude-owned test-only slice)
- **Base commit / branch / worktree**: base `2983b1e`; staged on `master` active checkout (new `tests/omr-corpus/**` subtree, no shared-file edits beyond own board rows + this handoff).
- **Files owned or changed**:
  - `tests/omr-corpus/schema.ts` [NEW] - zod fixture schema (`corpusSheetSchema`), `loadCorpus()` validator/loader.
  - `tests/omr-corpus/runner.ts` [NEW] - `runCorpus()` metrics engine + `formatMarkdown()` report writer.
  - `tests/omr-corpus/omr-corpus.test.ts` [NEW] - vitest suite: schema validity, safety invariants, regression ceilings; writes `REPORT.md`.
  - `tests/omr-corpus/fixtures/01..11-*.json` [NEW] - 11 synthetic labelled sheets across the PRD 26.3 capture/mark matrix.
  - `tests/omr-corpus/README.md` [NEW] - fixture format, outcome taxonomy, extension rules.
  - `tests/omr-corpus/REPORT.md` [NEW, generated] - baseline report, regenerated (deterministically, no timestamp) on every `npm test`.
  - `docs/TASKS.md` - CLD-002 row + its Claims row only.
- **What works now**:
  - `npm test` picks up `tests/omr-corpus/omr-corpus.test.ts` automatically (`tests/**/*.test.ts`), so this runs in CI (CLD-001) with no `package.json` change. Full suite: **8 files / 41 tests pass** (36 prior + 5 new). `npx tsc --noEmit` passes.
  - Corpus: 11 sheets (9 supported), 188 questions (156 supported). Conditions: clean, photocopy-speckle, light-marks, erasure, double-mark, stray-mark, wrong-set (unsupported), cropped-edge (unsupported), plus an unmatched-roll sheet.
  - Metrics reported, false-confidence kept strictly separate from accuracy (per Codex ACK constraint).
- **Baseline on the current simulated `DeterministicOMREngine`** (`tests/omr-corpus/REPORT.md`):
  - Extraction accuracy **88.46%**, review rate **14.74%**, false-confidence rate **1.28%**, silent-miss rate **7.69%**.
  - Fail-safe: **2 of 2 unsupported sheets returned `CONFIDENT`** (wrong-set, cropped-edge). 0 unmatched-roll detection misses.
  - Per condition: clean 100% acc / 0 review; double-mark 100% acc / 43.75% review (correct defer); erasure 87.5% acc / 12.5% silent-miss; light-marks 44.4% acc / 55.6% silent-miss; photocopy-speckle 90% acc / 35% review; stray-mark 77.8% acc / 11.1% false-confidence.
  - Regression ceilings baked into `omr-corpus.test.ts` `BASELINE`: accuracy >= 0.88, review <= 0.16, false-confidence <= 0.02, silent-miss <= 0.08, unsupported leaks <= 2. Suite fails if OMR-001 regresses any of them.
- **Findings for OMR-001 / OMR-002** (documented in `REPORT.md` and `README.md`):
  1. **No stray-mark rejection** - a lone smudge over `FILL_THRESHOLD` on a blank question is returned as a confident answer (stray-marks sheet Q3, Q11).
  2. **Sub-threshold marks dropped silently** - faint pencil / over-erased answers below `FILL_THRESHOLD` (0.42) yield no response and no `LOW_CONFIDENCE` ambiguity, so they never reach review. PRD OMR-002 wants low confidence -> review. 12 questions across light-marks + erasure.
  3. **No fail-safe on out-of-envelope sheets** - the engine has no anchor / template / paper-set validation, so `supported: false` sheets finalize as `CONFIDENT`. OMR-001 must add rejection + `UNMATCHED`/review routing.
- **API/schema/contract changes**: none. No `prisma`, route, `src/lib`, `tests/support/**` or existing-suite edits.
- **Checks run and exact results**:
  - `npx tsc --noEmit` -> exit 0.
  - `npm test` -> 8 files, 41 tests passed.
  - `REPORT.md` byte-identical across consecutive runs (verified by diff).
- **Known gaps / blockers**:
  - Corpus is synthetic density vectors, not images - it exercises engine decision logic only. Real labelled sheets + image ingest come with OMR-001 (Claude owns `src/lib/omr/**` CV internals + corpus; Codex owns job routes + object storage).
  - `tsconfig.tsbuildinfo` is emitted by `tsc --incremental` and is untracked/ungitignored. Recommend Codex (as `.gitignore` named editor) add `tsconfig.tsbuildinfo` to `.gitignore` in a future infra/FND-002 change; not touched here.
- **Next action and recipient**:
  - Codex/Antigravity: no action required - Claude-owned test-only slice, integrated. Note the three findings above feed OMR-001/OMR-002.
  - Claude: hold on FND-002 until Codex reaches it (needs Codex as `prisma`/provider editor); CLD-003 waits on the AI-001 contract off C01.
- **Review acknowledgement / integrated commit**: self-reviewed against acceptance; integrated on `master` with commit `feat(qa): OMR benchmark corpus harness + simulated-engine baseline (CLD-002)`.
