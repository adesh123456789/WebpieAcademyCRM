# OMR-001 / Claude - CLD-002 findings relay (pre-work note)

- Status: NOTE, not a claim. OMR-001 stays BACKLOG behind EXM-001 + FND-002.
- From: Claude (CLD-002 owner). To: Codex (OMR-001 co-owner, OMR-002 owner).
- Base: `cd23d28`. Source of record: `tests/omr-corpus/REPORT.md`, `tests/omr-corpus/README.md`, `docs/handoffs/CLD-002-claude.md`.

CLD-002 ran 11 synthetic labelled sheets (PRD 26.3 matrix, 156 supported questions) through the current `DeterministicOMREngine`. Three concrete defects came out. They are engine-logic defects, visible without real pixels, so OMR-001 should fix them and OMR-002's finalize path should assume them fixed.

## Finding 1 - no stray-mark rejection (false confidence on blank questions)

- Evidence: `fixtures/08-stray-marks.json` Q3 `[0.08,0.05,0.50,0.06]` truth `null` -> engine returns `C`; Q11 `[0.05,0.06,0.04,0.46]` truth `null` -> returns `D`. No flag.
- Cause: `processQuestionBubbles` treats any single bubble >= `FILL_THRESHOLD` (0.42) as a definite answer with no isolation / shape / stray check.
- Ask (OMR-001): a lone mark just over threshold with no corroborating signal should raise `STRAY_MARK` (or `LOW_CONFIDENCE`), not auto-accept. Drives the corpus `false_confidence_rate` toward 0.
- AC to hold: `AC-004` (no silent confident answer on ambiguous bubble), plus corpus `falseConfidenceRate <= 0.02` ceiling in `omr-corpus.test.ts`.

## Finding 2 - sub-threshold marks dropped silently, never flagged

- Evidence: `fixtures/05-light-pencil-marks.json` + `07-partial-erasure.json` - 12 questions where the intended answer sits at 0.30-0.41 (just under `FILL_THRESHOLD`). Engine returns nothing **and raises no ambiguity**, so the response never reaches review. Corpus `silentMissRate` = 7.69% (55.6% on the light-marks sheet alone).
- Cause: the "0 marked" branch returns `{ chosenOption: null, ambiguityReason: null }` unconditionally.
- Ask (OMR-001): when the top density is inside a configurable band below `FILL_THRESHOLD` (e.g. 0.28-0.42) and clearly above the other options, emit a `LOW_CONFIDENCE` ambiguity with the crop, rather than a silent drop. PRD OMR-001 ("every extracted response stores confidence") + OMR-002 ("review threshold configurable centrally; tenant cannot lower below safety floor").
- AC to hold: corpus `silentMissRate <= 0.08` ceiling; these questions should move to `unresolved_flagged` (review), not stay `silent_miss`.

## Finding 3 - no fail-safe on out-of-envelope sheets

- Evidence: `fixtures/10-wrong-set-unsupported.json` and `11-cropped-edge-unsupported.json` (`supported: false`) both finalize with status `CONFIDENT`. 2 of 2 leaked.
- Cause: `extractResponsesFromGrid` sets status purely from `ambiguities.length` and a non-empty `rollNumber`; there is no anchor / template / paper-set / page-completeness validation.
- Ask (OMR-001): sheet-level validation stage (PRD 26.2 "Locate anchors" / "Validate"). Missing anchors, wrong set, or truncated question grid -> status `UNMATCHED` or a new `REJECTED`, never `CONFIDENT`.
- Ask (OMR-002): `POST /omr/jobs/{id}/finalize` must refuse while any sheet is `REJECTED`/`UNMATCHED`/pending-review (PRD OMR-003 "Finalization blocked while required review items remain").
- AC to hold: corpus `unsupportedConfidentLeaks` ceiling is currently 2 (documents the gap); OMR-001 should drive it to 0 and tighten the ceiling in the same commit.

## Corpus hand-off for OMR-001

- The corpus format (`tests/omr-corpus/schema.ts`) is ready for **real** labelled sheets: add image path + expected responses + quality metadata alongside the synthetic density fixtures. Keep the synthetic ones as fast unit-level regression; real sheets become the acceptance corpus (PRD 60.2).
- `runCorpus()` / `formatMarkdown()` already compute the accuracy / review-rate / false-confidence / silent-miss metrics OMR-001's acceptance report needs - reuse them, do not fork.
- If OMR-001 legitimately shifts a metric, update `BASELINE` in `tests/omr-corpus/omr-corpus.test.ts` in the same commit and note it here. Do not weaken a ceiling without a matching engine improvement.

## Unrelated infra nit

`tsconfig.tsbuildinfo` (from `tsc --incremental`) is untracked and not git-ignored. Codex owns root config - please add it to `.gitignore` during FND-002.
