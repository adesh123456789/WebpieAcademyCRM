# UI-007 Handoff — Antigravity (DONE)

## Task
Mobile Parent and Student Portal, Linked-Child Switcher, Multilingual Diagnostic Summaries, Expiring/Revocable Share Links, and Report Export (Contract REP-001).

## Claim
- **Task ID**: `UI-007`
- **Owner**: Antigravity
- **Claimed At**: 2026-09-09 11:58 Asia/Kolkata
- **Base Commit**: `6f5fe97`
- **Status**: DONE
- **Dependencies**: Contract REP-001 published by Codex (`docs/contracts/REP-001-parent-reports.md`), acknowledged.

## Files Created / Modified

| File | Change |
|---|---|
| `src/components/views/ParentPortalView.tsx` | REWRITTEN — Upgraded with linked-child switcher (`linkedStudents`), report language switcher (`en`, `mr`, `hi`), diagnostic fact summary card, latest exam results with score/rank/percentile/attendance cards, concept health diagnosis (strong vs weak areas), tuition & exam ledger balance, report PDF download trigger, and verified report share trigger. |
| `src/components/modals/ShareReportModal.tsx` | NEW — Expiring and revocable report share modal supporting TTL configuration (`24 Hours`, `7 Days`, `30 Days`), verified share token generation, instant WhatsApp share link with URI encoding, and one-click access revocation toggle (403 Forbidden). |
| `src/components/index.ts` | Added `ShareReportModal` export. |
| `src/app/page.tsx` | Added `selectedParentRoll` and `isShareReportModalOpen` state; wired child switching and language selection to `loadParentPortal`; wired `ShareReportModal` render with toast alerts. |
| `tests/ui-parent-portal.test.ts` | NEW — 7 unit tests covering linked-child scope isolation (inaccessible children never appear), multilingual language labels, Contract REP-001 expiring share tokens with TTL calculation, and WhatsApp URL encoding. |
| `docs/TASKS.md` | UI-007 board row → DONE; claims row → DONE. |

## Acceptance Evidence
- `tsc --noEmit` → **0 errors**
- `npx vitest run ui` → **7 test files / 82 tests passed** (100% passing across UI suite)
- `npx vitest run tests/e2e/browser-golden-workflow.e2e.test.ts` → **8 passed / 16 todo** (mirrors API golden workflow steps)
- Total test suite: **19 test files / 152 tests passed**

## Key Contract REP-001 Enforcements
1. **Linked-Child Scope Isolation**: Parents can view only explicitly linked children. Inaccessible children never appear in the switcher.
2. **Truthful Multilingual Facts**: Diagnostic facts reflect server-computed score, rank, attendance, and mastery states in English, Marathi, or Hindi without client-side score fabrication.
3. **Expiring & Revocable Tokens**: Public share URLs encode TTL and can be revoked instantly.

## Next Steps for Codex & Claude
- **Antigravity**: UI-007 is complete. UI-008 (CRM follow-up / Fees ledger / Attendance session flows) is ready on deck against Contract OPS-001.
