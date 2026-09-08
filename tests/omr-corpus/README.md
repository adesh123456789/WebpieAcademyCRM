# OMR benchmark corpus (CLD-002)

A labelled, **synthetic** regression corpus for the deterministic OMR engine
(`src/lib/omr/omr-engine.ts`). It encodes the PRD Section 26.3 capture / mark
condition matrix as per-option density vectors plus human-verified expectations,
and reports the three metrics the PRD cares about — **extraction accuracy**,
**review rate**, and **false-confidence rate** (the last one always reported
separately, never folded into accuracy) — plus **silent-miss rate** and
fail-safe behaviour on out-of-envelope sheets.

Owned by the Claude lane. Test-only; no `tests/support/**` or existing-suite
changes. See `docs/handoffs/CLD-002-claude.md`.

## Layout

| Path | Purpose |
|---|---|
| `schema.ts` | Zod fixture schema + `loadCorpus()` loader/validator |
| `runner.ts` | `runCorpus()` scoring + `formatMarkdown()` report writer |
| `omr-corpus.test.ts` | Vitest suite: schema validity, safety invariants, regression ceilings; writes `REPORT.md` |
| `fixtures/*.json` | One labelled sheet per file |
| `REPORT.md` | Regenerated on every `npm test`; committed so metric changes show in diffs |

`omr-corpus.test.ts` is picked up by `npm test` automatically (`tests/**/*.test.ts`)
and therefore runs in CI (CLD-001). No `package.json` script was added.

## Fixture format

```jsonc
{
  "id": "clean-flatbed-laser",
  "description": "...",
  "template": "WEBPIE_STANDARD_75Q",
  "totalQuestions": 20,
  "rollNumber": "260001",      // "" => engine must return status UNMATCHED
  "supported": true,           // inside the >=99% supported-conditions envelope (PRD 26.1)?
  "capture": {
    "method":   "flatbed | phone | pdf-batch",
    "print":    "laser | inkjet | photocopy-gen1 | photocopy-gen2",
    "marker":   "blue-pen | black-pen | pencil",
    "angle":    "0 | mild-rotation | perspective",
    "lighting": "even | mild-shadow | low-contrast",
    "condition":"clean | wrinkle-fold | cropped-edge | wrong-set | stray-mark | erasure | light-marks | double-mark"
  },
  "questions": {
    "1": { "densities": [0.88, 0.04, 0.03, 0.05], "truth": "A" },
    "6": { "densities": [0.03, 0.02, 0.04, 0.03], "truth": null },       // genuinely blank
    "2": { "densities": [0.70, 0.04, 0.68, 0.05], "truth": "REVIEW",     // genuinely ambiguous
           "truthReason": "DOUBLE_MARK" }
  }
}
```

`densities` is `[A, B, C, D]`, each `0..1`, the fill values a CV front-end would
hand the engine. `truth`:

- `"A".."D"` — determinate answer; the engine should auto-extract exactly this.
- `null` — blank; the engine should extract nothing and raise no flag.
- `"REVIEW"` — genuinely ambiguous; the engine must **not** auto-accept an
  option. The safe outcome is "no response + flagged".

## Outcome classification

| Outcome | Meaning | Counts toward |
|---|---|---|
| `accurate` / `accurate_but_flagged` | truth matched (right option, correct blank, or correctly deferred REVIEW) | accuracy |
| `false_confident` | engine returned an option that is wrong or should have been REVIEW | **false-confidence** |
| `silent_miss` | determinate answer, engine returned nothing **and did not flag** | silent-miss |
| `unresolved_flagged` | determinate answer, engine could not auto-resolve but did flag it | review rate only |

Rates are computed over **supported** questions only. Unsupported sheets are
excluded from the rate denominators but still checked for fail-safe status
(`CONFIDENT` must not be returned).

## Baseline (current simulated engine)

See `REPORT.md`. Summary: accuracy 88.46%, review 14.74%, false-confidence
1.28%, silent-miss 7.69%, and **2/2 unsupported sheets wrongly finalized as
CONFIDENT**. The regression ceilings in `omr-corpus.test.ts` (`BASELINE`) fail
the suite if any of these worsen — OMR-001 should move them the other way.

Known gaps this corpus documents for OMR-001 / OMR-002:

1. **No stray-mark rejection** — a lone smudge over the fill threshold on a blank
   question is returned as a confident answer.
2. **Sub-threshold marks dropped silently** — faint pencil / over-erased answers
   below `FILL_THRESHOLD` produce no response and no `LOW_CONFIDENCE` flag, so
   they never reach the review queue (PRD OMR-002 wants low confidence → review).
3. **No fail-safe on out-of-envelope sheets** — wrong paper set and cropped-edge
   sheets finalize as `CONFIDENT`; there is no anchor / template / set validation.

## Extending

Add a `fixtures/NN-name.json` file. The schema is enforced on load — an invalid
fixture fails the first test with the offending file named. Keep fixtures
synthetic or approved (Codex ACK constraint); do not add real student sheets.
If a change legitimately shifts a metric, update `BASELINE` in the same commit
and note it in `docs/handoffs/CLD-002-claude.md`.
