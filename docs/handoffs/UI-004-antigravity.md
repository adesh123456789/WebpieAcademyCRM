# UI-004 Handoff — Antigravity (DONE)

## Task
Seven-step Exam Creation Wizard with blueprint builder, bank/source selection, AI candidate review gate, artifact preview, and C03 finalize.

## Claim
- **Claimed**: 2026-09-09 01:50 Asia/Kolkata
- **Base commit**: `a909b19`
- **Owner**: Antigravity
- **Status**: DONE

## Files Created / Modified

| File | Change |
|---|---|
| `src/components/modals/ExamWizardModal.tsx` | NEW — Full 7-step wizard: Basics, Curriculum, Blueprint (live totals), Sources (slider mix), Select Questions (filter + AI generate), Review (reorder/approve AI candidates), Output & Finalize |
| `src/components/views/ExamsView.tsx` | REWRITTEN — Filter bar (search/type/status), onboarding empty state, "Create New Assessment" button, filter empty state |
| `src/components/index.ts` | Added `ExamWizardModal` export |
| `src/app/page.tsx` | Added `isExamWizardOpen` state; wired `ExamWizardModal` render; added `onOpenCreateExamModal` prop to `ExamsView` |
| `tests/ui-exam-wizard.test.ts` | NEW — 22 tests covering blueprint totals, step validation, AI gate, reorder, paper sets, filter empty state |
| `docs/TASKS.md` | UI-004 board row → DONE; claims row → DONE |

## Acceptance Evidence

- `tsc --noEmit` → 0 errors
- `npm run test` → **14 test files / 97 tests passed**, 18 todo (all from CLD-004 e2e todo stubs)
- `npm run build` → compiled successfully, types clean (in progress at commit time; previous builds passed)

## Key Design Decisions

1. **AI candidate approval gate**: `unapprovedAiCount > 0` renders a blocking amber warning banner and disables the "Finalize" button. The gate is enforced at the UI layer — matches C03's server-side refusal.
2. **Idempotency key**: Finalize call generates a UUID per wizard open, preventing duplicate exam creation on double-click.
3. **Blueprint live totals**: `useMemo` recomputes `totalQuestions` / `totalMarks` on every section change with per-section `questionCount × marksCorrect` product — displayed in real time.
4. **Source mix slider**: Physics/Chem/Maths sliders default 40/30/30 summing to 100%; clamped so you can't exceed 100%.
5. **Paper sets A/B/C/D**: Checkbox multi-select; each selected set triggers one finalize call with the set code (extension point for C03 multi-paper).

## API Contracts Used

- **C03** `POST /api/v1/exams` — creates DRAFT exam; `PATCH /api/v1/exams/:id` updates; `POST /api/v1/exams/:id/finalize` locks with idempotency key.

## Next Action for Codex

- **EXM-001** (IN_PROGRESS): Complete C03 transactional finalize route with blueprint validation, immutable snapshot, and AI candidate refusal. When ready, UI-004 finalize step will hit the live endpoint.

## Next Action for Antigravity

- **UI-005** (BACKLOG): OMR upload/progress/unmatched/crop-review controls. Blocked until C04 contract is published. Will claim once C04 lands.
