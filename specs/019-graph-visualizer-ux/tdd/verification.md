# TDD Verification: 019-graph-visualizer-ux

## Verdict

Automated verification **green** as of 2026-10-15: feature command 7 files / 43 tests passed, full suite 74 files / 691 tests / 0 failed, `npm run type-check` 0 errors, and every test-list row (A1–A30, U1–U33) maps to a passing test. Layout has a recorded red-then-green cycle; later behaviors were admitted test-after with named mutants (cycle-log sessions 2026-10-11 and 2026-10-15).

Not yet fully verified: the T026 manual walk (1366×768 pixel fit, physical touch dismiss) is outstanding, and a measured light-theme contrast gap is recorded below. The feature must not be called done until those are resolved.

## Evidence reviewed

- `specs/019-graph-visualizer-ux/tdd/cycle-log.md` (sessions 2026-10-11 and 2026-10-15)
- Feature tests under `tests/unit/relationshipGraph*.test.ts(x)`
- Full `npm test` on 2026-10-15: **74 files, 691 tests, 0 failed**. The previously blocking `tests/unit/sqlComparisonPanel.test.tsx` failure was confirmed pre-existing and unrelated to 019; root cause (commit `bc0c4bd` added `Thông tin thêm N:` heading assertions the component never rendered and no locale/spec ever contained that string) and its test-side fix are recorded in the cycle log. It is now 14 passed.
- `npm run type-check`: **0 errors** after restructuring `reducePlacement` in `src/app/relationship-graph-visualizer/lib/graphLayout.ts` to an exhaustive switch — 13× TS2339 came from a TypeScript limitation (negative if-checks cannot remove a union member whose discriminant is a union of literals), not from a behavior bug.

## Acceptance coverage

Covered by automated tests: layout difference, spacing, drag survival, neighbor visibility, category-only baseline, category text on cards, locale key parity, diagram category text, SVG export failure message, one toolbar search, Fit/Rearrange labels, neighbor default.

Not covered as specified:

- Separate test-first red evidence for visibility, identity, page, and export (admitted test-after with named mutants in the 2026-10-11 session).
- Suggestion activation, keyboard dismiss, join display names, empty analysis, and empty filter are now covered — A17/U26/U27, A18, A29/U28, U23–U25, A22, A28 in `relationshipGraphPage.test.tsx` (added 2026-10-11, after this section was first written).
- The identity file covers cards only; list rows and search results are asserted in the page test (A5, A15).
- T026: 1366×768 pixel fit and physical touch dismiss are not proven in jsdom. Contrast is measured below.

## Test quality

Assertions check visible text, coordinates, and export markup rather than private layout functions only. The identity test depends on React Flow's provider. The page test mocks `next/dynamic`.

## Mutation testing

Unavailable. `.specify/memory/tdd-profile.md` has no verified mutation command. None was installed.

## Contrast measurements (T026 automated portion, 2026-10-15)

WCAG 2.x ratios computed from the exact colors in `TableNode.tsx` (`cardBg`, `bodyText`, `subText`, `mutedText`, `nodeColor` with the composited `${nodeColor}28` header and `${nodeColor}22` chip backgrounds) and `src/styles/tailwind.css` theme variables:

| Pair | Light | Dark |
|---|---|---|
| body column text on card | 10.35:1 AA | 11.95:1 AA |
| sub text (fields / alias) on card | 4.76:1 AA | 6.92:1 AA |
| muted text (`+N more`) on card | **2.56:1 FAIL** | 3.73:1 AA-large only |
| node name on header bg (5 categories) | **1.54–2.37:1 FAIL** | 5.08–7.66:1 AA |
| category chip label on chip bg (5 categories) | **1.55–2.42:1 FAIL** | 5.32–8.14:1 AA |
| toolbar/panel text on card/muted | 13.55–15.80:1 AA | 12.88–14.64:1 AA |

Gap recorded against the test list (A27 / SC-007 readability): **light-theme node names and category chips fail WCAG AA — even the 3:1 large-text threshold.** Dark theme passes everywhere, and toolbar/panel labels pass in both themes. Not fixed in this pass: choosing replacement light-mode heading/chip colors is a UX decision, and T026 only requires the gap to be recorded.

## Remaining manual checks (T026)

- 1366×768 pixel walk of quickstart steps (drag persistence, Fit/Rearrange, all-panels-open toolbar/map visibility). Automated proxies exist (A16/A30 shared 45vh budget, A1–A3 layout behavior) but jsdom cannot prove pixels.
- Physical touch-device dismissal of suggestions. Automated proxy: A29/U28 asserts a real button without a hover-only class.
- A decision on the light-theme contrast gap above.

## Remediation

1. ~~Re-run `npm test` after the unrelated comparison-panel failure is fixed~~ — done 2026-10-15: full suite green (691/691).
2. ~~Add page assertions for suggestion activation, dismiss, and join display names~~ — done in cycle-log session 2026-10-11 (A17/U26/U27, A29/U28, U23–U25).
3. Decide whether to darken light-theme `nodeColor` heading/chip text (measured gap above).
4. Walk quickstart at 1366×768 and on a physical touch device before checking T026.
