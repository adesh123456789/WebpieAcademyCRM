import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";

/**
 * CLD-002 - OMR benchmark corpus fixture format.
 *
 * Each fixture is one labelled answer sheet. `densities` are the per-option
 * fill values (0..1) the CV front-end would hand to the deterministic engine;
 * `truth` is the human-verified expectation for that question. The corpus is
 * synthetic - it encodes the PRD Section 26.3 test matrix as density vectors
 * rather than shipping real student sheets.
 */

export const CAPTURE_METHODS = ["flatbed", "phone", "pdf-batch"] as const;
export const PRINT_TYPES = ["laser", "inkjet", "photocopy-gen1", "photocopy-gen2"] as const;
export const MARKERS = ["blue-pen", "black-pen", "pencil"] as const;
export const ANGLES = ["0", "mild-rotation", "perspective"] as const;
export const LIGHTING = ["even", "mild-shadow", "low-contrast"] as const;
export const CONDITIONS = [
  "clean",
  "wrinkle-fold",
  "cropped-edge",
  "wrong-set",
  "stray-mark",
  "erasure",
  "light-marks",
  "double-mark",
  "photocopy-speckle",
] as const;

const optionLetter = z.enum(["A", "B", "C", "D"]);

/**
 * truth semantics:
 *  - "A".."D" : a determinate answer. The engine should auto-extract exactly this option.
 *  - null     : genuinely blank. The engine should extract nothing and raise no ambiguity.
 *  - "REVIEW" : genuinely ambiguous (double mark, bad erasure...). The engine must NOT
 *               auto-accept an option; the safe outcome is "no response + flagged".
 */
export const corpusQuestionSchema = z.object({
  densities: z.tuple([
    z.number().min(0).max(1),
    z.number().min(0).max(1),
    z.number().min(0).max(1),
    z.number().min(0).max(1),
  ]),
  truth: z.union([optionLetter, z.literal("REVIEW"), z.null()]),
  truthReason: z.enum(["DOUBLE_MARK", "LOW_CONFIDENCE", "PARTIAL_FILL", "STRAY_MARK"]).optional(),
  note: z.string().optional(),
});

export const corpusSheetSchema = z
  .object({
    id: z.string().min(1),
    description: z.string().min(1),
    template: z.string().min(1),
    totalQuestions: z.number().int().positive(),
    /** "" means the sheet identity is unresolved and the engine must return UNMATCHED. */
    rollNumber: z.string(),
    /** Is this sheet inside the ">=99% supported-conditions" envelope (PRD 26.1)? */
    supported: z.boolean(),
    capture: z.object({
      method: z.enum(CAPTURE_METHODS),
      print: z.enum(PRINT_TYPES),
      marker: z.enum(MARKERS),
      angle: z.enum(ANGLES),
      lighting: z.enum(LIGHTING),
      condition: z.enum(CONDITIONS),
    }),
    questions: z.record(z.string().regex(/^\d+$/), corpusQuestionSchema),
  })
  .superRefine((sheet, ctx) => {
    const keys = Object.keys(sheet.questions);
    if (keys.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "sheet defines no questions" });
    }
    for (const key of keys) {
      const n = Number(key);
      if (n < 1 || n > sheet.totalQuestions) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `question ${key} is outside 1..${sheet.totalQuestions}`,
        });
      }
    }
  });

export type CorpusSheet = z.infer<typeof corpusSheetSchema>;
export type CorpusQuestion = z.infer<typeof corpusQuestionSchema>;

export const FIXTURES_DIR = fileURLToPath(new URL("./fixtures", import.meta.url));

export interface LoadedFixture {
  file: string;
  sheet: CorpusSheet;
}

/** Loads and schema-validates every fixture. Throws with the offending file on failure. */
export function loadCorpus(dir: string = FIXTURES_DIR): LoadedFixture[] {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  return files.map((file) => {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(`${dir}/${file}`, "utf8"));
    } catch (err) {
      throw new Error(`Corpus fixture ${file} is not valid JSON: ${(err as Error).message}`);
    }
    const parsed = corpusSheetSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `Corpus fixture ${file} failed schema validation:\n${JSON.stringify(parsed.error.format(), null, 2)}`,
      );
    }
    return { file, sheet: parsed.data };
  });
}
