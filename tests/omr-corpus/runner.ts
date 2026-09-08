import { DeterministicOMREngine, type SheetExtractionResult } from "../../src/lib/omr/omr-engine";
import type { CorpusSheet, LoadedFixture } from "./schema";

/**
 * Per-question comparison of engine output against corpus truth.
 *
 * FALSE CONFIDENCE = the engine returned a concrete option that is wrong or that
 * should have gone to review. It is reported as its own metric, never folded into
 * extraction accuracy (per the CLD-002 carve-out acknowledgement).
 */
export type QuestionOutcome =
  | "accurate" //            truth matched exactly (right option / correctly blank / correctly deferred)
  | "accurate_but_flagged" // right option, but the engine also raised a review flag
  | "false_confident" //     engine returned an option that is wrong or should have been REVIEW
  | "silent_miss" //         determinate truth, engine returned nothing AND did not flag
  | "unresolved_flagged"; // determinate truth, engine could not auto-resolve but did flag it (safe)

export interface QuestionRecord {
  sheetId: string;
  file: string;
  question: number;
  densities: number[];
  truth: CorpusSheet["questions"][string]["truth"];
  extracted: string | null;
  flagged: boolean;
  flagReason: string | null;
  outcome: QuestionOutcome;
  supported: boolean;
}

export interface ConditionBreakdown {
  condition: string;
  supportedQuestions: number;
  extractionAccuracy: number;
  reviewRate: number;
  falseConfidenceRate: number;
  silentMissRate: number;
}

export interface SheetRecord {
  file: string;
  id: string;
  supported: boolean;
  rollNumber: string;
  status: SheetExtractionResult["status"];
  expectedUnmatched: boolean;
  statusOk: boolean; // unsupported/unmatched sheets must not come back CONFIDENT
}

export interface CorpusReport {
  generatedAt: string;
  sheetCount: number;
  supportedSheetCount: number;
  totalQuestions: number;
  supportedQuestions: number;

  // The three metrics named in the CLD-002 deliverable, plus silent-miss.
  extractionAccuracy: number; // accurate / supported questions
  reviewRate: number; // flagged / supported questions
  falseConfidenceRate: number; // false_confident / supported questions
  silentMissRate: number; // silent_miss / supported questions

  unsupportedConfidentLeaks: number; // unsupported sheets returned CONFIDENT (should be 0)
  unmatchedDetectionMisses: number; // rollNumber "" but status !== UNMATCHED (should be 0)

  byCondition: ConditionBreakdown[];
  sheets: SheetRecord[];
  falseConfidentQuestions: QuestionRecord[];
  silentMissQuestions: QuestionRecord[];
}

function classify(
  truth: QuestionRecord["truth"],
  extracted: string | null,
  flagged: boolean,
): QuestionOutcome {
  if (truth === "REVIEW") {
    if (extracted !== null) return "false_confident"; // auto-accepted a genuinely ambiguous item
    return flagged ? "accurate" : "silent_miss"; // no option: good only if it was flagged
  }
  if (truth === null) {
    if (extracted !== null) return "false_confident"; // invented a mark on a blank question
    return flagged ? "accurate_but_flagged" : "accurate";
  }
  // truth is a concrete option letter
  if (extracted === truth) return flagged ? "accurate_but_flagged" : "accurate";
  if (extracted !== null) return "false_confident"; // returned a different option
  return flagged ? "unresolved_flagged" : "silent_miss";
}

function runSheet(fixture: LoadedFixture): { sheet: SheetRecord; questions: QuestionRecord[] } {
  const { sheet, file } = fixture;
  const densityMap: Record<number, number[]> = {};
  for (const [q, def] of Object.entries(sheet.questions)) {
    densityMap[Number(q)] = def.densities;
  }

  const result = DeterministicOMREngine.extractResponsesFromGrid(
    sheet.id,
    sheet.rollNumber,
    sheet.totalQuestions,
    densityMap,
    { supported: sheet.supported },
  );

  const flaggedByQ = new Map<number, string>();
  for (const a of result.ambiguities) flaggedByQ.set(a.questionNumber, a.reason);

  const questions: QuestionRecord[] = Object.entries(sheet.questions).map(([q, def]) => {
    const question = Number(q);
    const extracted = result.responses[question] ?? null;
    const flagReason = flaggedByQ.get(question) ?? null;
    const flagged = flagReason !== null;
    return {
      sheetId: sheet.id,
      file,
      question,
      densities: def.densities,
      truth: def.truth,
      extracted,
      flagged,
      flagReason,
      outcome: classify(def.truth, extracted, flagged),
      supported: sheet.supported,
    };
  });

  const expectedUnmatched = sheet.rollNumber === "";
  const statusOk =
    (!sheet.supported || expectedUnmatched ? result.status !== "CONFIDENT" : true) &&
    (expectedUnmatched ? result.status === "UNMATCHED" : true);

  return {
    sheet: {
      file,
      id: sheet.id,
      supported: sheet.supported,
      rollNumber: sheet.rollNumber,
      status: result.status,
      expectedUnmatched,
      statusOk,
    },
    questions,
  };
}

const rate = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 10000) / 10000);

export function runCorpus(fixtures: LoadedFixture[]): CorpusReport {
  const allQuestions: QuestionRecord[] = [];
  const sheets: SheetRecord[] = [];

  for (const fixture of fixtures) {
    const { sheet, questions } = runSheet(fixture);
    sheets.push(sheet);
    allQuestions.push(...questions);
  }

  const supported = allQuestions.filter((q) => q.supported);
  const count = (list: QuestionRecord[], ...o: QuestionOutcome[]) =>
    list.filter((q) => o.includes(q.outcome)).length;

  const accurate = count(supported, "accurate", "accurate_but_flagged");
  const flagged = supported.filter((q) => q.flagged).length;
  const falseConfident = count(supported, "false_confident");
  const silentMiss = count(supported, "silent_miss");

  const conditions = Array.from(new Set(fixtures.map((f) => f.sheet.capture.condition))).sort();
  const byCondition: ConditionBreakdown[] = conditions
    .map((condition) => {
      const files = new Set(
        fixtures.filter((f) => f.sheet.capture.condition === condition).map((f) => f.file),
      );
      const list = supported.filter((q) => files.has(q.file));
      return {
        condition,
        supportedQuestions: list.length,
        extractionAccuracy: rate(count(list, "accurate", "accurate_but_flagged"), list.length),
        reviewRate: rate(list.filter((q) => q.flagged).length, list.length),
        falseConfidenceRate: rate(count(list, "false_confident"), list.length),
        silentMissRate: rate(count(list, "silent_miss"), list.length),
      };
    })
    .filter((c) => c.supportedQuestions > 0);

  return {
    generatedAt: new Date().toISOString(),
    sheetCount: sheets.length,
    supportedSheetCount: sheets.filter((s) => s.supported).length,
    totalQuestions: allQuestions.length,
    supportedQuestions: supported.length,

    extractionAccuracy: rate(accurate, supported.length),
    reviewRate: rate(flagged, supported.length),
    falseConfidenceRate: rate(falseConfident, supported.length),
    silentMissRate: rate(silentMiss, supported.length),

    unsupportedConfidentLeaks: sheets.filter((s) => !s.supported && s.status === "CONFIDENT").length,
    unmatchedDetectionMisses: sheets.filter((s) => s.expectedUnmatched && s.status !== "UNMATCHED")
      .length,

    byCondition,
    sheets,
    falseConfidentQuestions: supported.filter((q) => q.outcome === "false_confident"),
    silentMissQuestions: supported.filter((q) => q.outcome === "silent_miss"),
  };
}

const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

export function formatMarkdown(report: CorpusReport): string {
  const L: string[] = [];
  L.push("# OMR benchmark corpus - baseline report (CLD-002)");
  L.push("");
  L.push(
    "_Regenerated by `tests/omr-corpus/omr-corpus.test.ts` on every `npm test` run. " +
      "The timestamp is intentionally omitted so re-runs are byte-identical unless the " +
      "corpus or the engine changes - use `git log` for history._",
  );
  L.push("");
  L.push(
    "Engine under test: `DeterministicOMREngine` (`src/lib/omr/omr-engine.ts`) - the current " +
      "**simulated** engine. It consumes per-option density vectors, not image pixels, so these " +
      "numbers measure decision logic on the PRD 26.3 condition matrix, not real extraction. " +
      "OMR-001 replaces the front-end with actual raster processing.",
  );
  L.push("");
  L.push("## Headline metrics (supported-condition sheets only)");
  L.push("");
  L.push("| Metric | Value | Notes |");
  L.push("|---|---|---|");
  L.push(
    `| Extraction accuracy | ${pct(report.extractionAccuracy)} | correct auto-extraction / supported questions |`,
  );
  L.push(`| Review rate | ${pct(report.reviewRate)} | questions routed to human review |`);
  L.push(
    `| **False-confidence rate** | **${pct(report.falseConfidenceRate)}** | wrong option returned with confidence - reported separately, target ~0 |`,
  );
  L.push(
    `| Silent-miss rate | ${pct(report.silentMissRate)} | determinate answer dropped with no flag |`,
  );
  L.push("");
  L.push(
    `Corpus: ${report.sheetCount} sheets (${report.supportedSheetCount} supported), ` +
      `${report.totalQuestions} questions (${report.supportedQuestions} supported).`,
  );
  L.push("");
  L.push("## Fail-safe behaviour on out-of-envelope sheets");
  L.push("");
  L.push(
    `- Unsupported sheets returning \`CONFIDENT\`: **${report.unsupportedConfidentLeaks}** ` +
      `of ${report.sheetCount - report.supportedSheetCount} (should be 0).`,
  );
  L.push(
    `- Sheets with no roll number not resolving to \`UNMATCHED\`: **${report.unmatchedDetectionMisses}** (should be 0).`,
  );
  L.push("");
  L.push("## By capture / mark condition");
  L.push("");
  L.push("| Condition | Supported Qs | Accuracy | Review rate | False-confidence | Silent miss |");
  L.push("|---|---|---|---|---|---|");
  for (const c of report.byCondition) {
    L.push(
      `| ${c.condition} | ${c.supportedQuestions} | ${pct(c.extractionAccuracy)} | ${pct(
        c.reviewRate,
      )} | ${pct(c.falseConfidenceRate)} | ${pct(c.silentMissRate)} |`,
    );
  }
  L.push("");
  L.push("## Per-sheet status");
  L.push("");
  L.push("| Sheet | Supported | Roll | Engine status | Fail-safe OK |");
  L.push("|---|---|---|---|---|");
  for (const s of report.sheets) {
    L.push(
      `| ${s.id} | ${s.supported ? "yes" : "no"} | ${s.rollNumber || "(none)"} | ${s.status} | ${
        s.statusOk ? "yes" : "**no**"
      } |`,
    );
  }
  L.push("");
  L.push("## False-confidence findings");
  L.push("");
  if (report.falseConfidentQuestions.length === 0) {
    L.push("_None._");
  } else {
    L.push("| Sheet | Q | Densities [A,B,C,D] | Truth | Engine returned |");
    L.push("|---|---|---|---|---|");
    for (const q of report.falseConfidentQuestions) {
      L.push(
        `| ${q.sheetId} | ${q.question} | [${q.densities.join(", ")}] | ${
          q.truth ?? "blank"
        } | ${q.extracted} |`,
      );
    }
  }
  L.push("");
  L.push("## Silent-miss findings");
  L.push("");
  if (report.silentMissQuestions.length === 0) {
    L.push("_None._");
  } else {
    L.push("| Sheet | Q | Densities [A,B,C,D] | Truth | Engine returned |");
    L.push("|---|---|---|---|---|");
    for (const q of report.silentMissQuestions) {
      L.push(
        `| ${q.sheetId} | ${q.question} | [${q.densities.join(", ")}] | ${q.truth ?? "blank"} | ${
          q.extracted ?? "(nothing, no flag)"
        } |`,
      );
    }
  }
  L.push("");
  return L.join("\n");
}
