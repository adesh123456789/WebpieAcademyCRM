# UI-010 Completion Handoff — Antigravity (DONE)

## Task
CBT online examination simulator with server-authoritative timer, NTA-style question palette, review/clear/resume controls, heartbeat autosave, and deterministic evaluation (Contract CBT-001 / `/api/v1/cbt/attempts`).

## Claim & Execution
- **Task ID**: `UI-010`
- **Owner**: Antigravity
- **Claimed At**: 2026-09-15 17:00 Asia/Kolkata
- **Completed At**: 2026-09-15 17:55 Asia/Kolkata
- **Base Commit**: `d0cad23`
- **Status**: DONE
- **Dependencies**: Contract CBT-001 landed in `5e1d99b` and `81342fe` (`/api/v1/cbt/attempts`), fulfilled.

## Implemented Deliverables
1. **`src/components/views/CbtView.tsx`**:
   - **Server-Authoritative Clock**:
     - Computes remaining seconds strictly from `expiresAt` offset by `serverTime`. Client clock shifts cannot tamper with examination duration.
     - Visual urgency transition (amber warning when <= 5 min remaining; red pulse and auto-submission when expired).
   - **NTA Question Palette**:
     - Color-coded question states: Answered (emerald), Not Answered (slate), Marked for Review (purple), Answered & Marked for Review (amber/purple ring), and Current active ring.
     - Live count summary in palette legend.
     - Direct grid navigation by question number.
     - Section / subject grouping tabs (Physics, Chemistry, Mathematics).
   - **Question Interaction Types**:
     - `SINGLE_CHOICE`: Radio selection with option highlighting.
     - `MULTIPLE_CHOICE`: Checkbox multi-select without item duplication.
     - `NUMERICAL`: Strict decimal/integer input field.
   - **Action Bar Controls**:
     - "Save & Next", "Mark for Review & Next", "Clear Response", and "Previous".
   - **Autosave Heartbeat**:
     - Sends `PUT /api/v1/cbt/attempts` every 25 seconds with current `responses` and `markedForReview`.
     - Displays live connection status ("Server Heartbeat Active" / "Syncing...").
   - **Submission Confirmation Modal**:
     - Pre-submission overview table with question count breakdowns (Total, Answered, Unanswered, Marked for Review, Answered & Marked for Review).
     - Confirmation trigger before final submission.
   - **Instant Post-Submission Scorecard**:
     - Displays deterministic evaluation results: Total Marks, Accuracy Percentage, Correct/Incorrect counts, and Percentile Rank.

2. **`src/app/page.tsx`**:
   - Expanded `cbtState` to track `attemptId`, `startTime`, `serverTime`, `expiresAt`, `responses`, and `markedForReview`.
   - Wired `startCbtSimulation(examId)` to call `POST /api/v1/cbt/attempts`, populating sanitized questions and resuming in-progress attempts.
   - Wired `submitCbtSimulation()` to dispatch `PUT /api/v1/cbt/attempts` with `isFinalSubmit: true`.
   - Wired `heartbeatCbtSimulation()` to handle 25-second autosave cycles and server expiry detection.

3. **`tests/ui-cbt-simulator.test.ts`**:
   - 7 automated tests verifying:
     - NTA palette status classification (Answered, Not Answered, Marked, Answered & Marked).
     - Submit confirmation modal summary tallies.
     - Authoritative remaining-time calculation independent of local clock drift.
     - Multiple choice option toggles without duplication.
     - Clean response clearing.
     - Heartbeat payload contract conformance.
     - In-progress session resumption.

## Checks Run and Exact Results
- `npx vitest run tests/ui-cbt-simulator.test.ts`: 7/7 passed.
- `npx vitest run ui`: 10 test files, **102/102 passed**.
- `npx vitest run tests/e2e/golden-workflow.e2e.test.ts`: 30/30 passed.
- `npx vitest run tests/e2e/browser-golden-workflow.e2e.test.ts`: 8 passed, 16 todo (all 16 remaining browser todos untouched as instructed).
- `npx tsc --noEmit`: Clean, 0 errors.
- Dev server: Healthy on `http://localhost:3000` (`HTTP 200 OK`).

## Next Actions
- Antigravity: Wait on Codex for `CMS-001` (unblocks `UI-009` Institute Website CMS Editor).
- Cross-lane: Ready for final launch gate coordination (`REL-001`) led by Claude.
