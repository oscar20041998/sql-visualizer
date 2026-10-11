# Run all 152 PENDING TDD — red-green-refactor per behavior

Role: TDD runner, repo sql-visualizer (Next.js + Vitest + jsdom).
Goal: run TDD for ALL PENDING in specs 016, 012, 011, 010, 013.
Each behavior = RED -> GREEN -> REFACTOR + evidence in tdd/cycle-log.md.

Commands (.specify/memory/tdd-profile.md):
- single: npx vitest run {file} -t "{name}"
- file: npx vitest run {file}
- suite: npm test
- coverage/mutation/acceptance: null — do not invent.

## Phase 1 — 016-ast-statistics (21 PENDING, test names ready)

RED first:
npx vitest run tests/unit/codegen/astStatistics.test.ts
npx vitest run tests/unit/codegen/parseSql.test.ts
npx vitest run tests/unit/dashboardData.test.ts
npx vitest run tests/unit/sqlMetricsDashboard.test.tsx

IDs in order:
U1 counts typed AST nodes | U2 reports statement kind | U3 counts CTE nesting
U4 counts subquery depth | U5 counts AST operators | U6 counts AST functions
U7 computes supported dialect stats | U8 keeps stats for partial model
U9 returns unavailable stats | U10 rejects multiple roots for stats
U11 projects supplied AST statistics | U12 keeps advanced partial without stats
A1 shows AST statistics | A3 keeps dashboard on fallback
A4 sets capability per query | A5 meets AST timing budget
A6 renders both locales | U13 omits unavailable AST rows
U14 localizes AST statistics | U15 uses resolved MyBatis SQL
U16 clears stale query statistics
Single-test form: npx vitest run <file> -t "<name>".
Log each cycle to specs/016-ast-statistics/tdd/cycle-log.md.

## Phase 2 — 012-format-error-ai-diagnostics (4 PENDING, test names ready)

npx vitest run tests/unit/smart-sql-editor-format-error-page.test.tsx -t "valid SQL formats with no panel"
npx vitest run tests/unit/smart-sql-editor-format-error-page.test.tsx -t "format error opens the panel beside the editor"
npx vitest run tests/unit/format-error-region.test.ts -t "returns null when the cross-check parser cannot run"
npx vitest run tests/unit/format-error-ai.test.ts -t "grounds the request in the cross-check parser findings"
IDs: A1, A2, U14, U44. Log to specs/012-format-error-ai-diagnostics/tdd/cycle-log.md.

## Phase 3 — 011-upgrade-sql-explainer (19 PENDING, no tests yet — write red first)

File specs/011-upgrade-sql-explainer/tdd/test-list.md.
For each ID write smallest test (exemplars tests/unit/SignInPage.test.tsx + tests/unit/demoAuth.test.ts, helper tests/utils/test-setup.ts), run single-test cmd, confirm FAIL, then GREEN.
Order: A1 A2 A3 A4 A5 A6 A7 A8 A9 U21 U22 U23 U24 U25 U26 U27 U28 U29 U30.
Log to specs/011-upgrade-sql-explainer/tdd/cycle-log.md.

## Phase 4 — 010-sql-intelligence-dashboard (35 PENDING, no tests yet)

File specs/010-sql-intelligence-dashboard/tdd/test-list.md.
Order: A5 A6 A7 A8 A9 A10 A11 A12 A13 A14 A15 A16 A17 A18 A19 A20 A21 A22 A23 A24 A25 A26 A27 U28 U30 U31 U32 U33 U34 U36 U37 U38 U40 U41 U42.
Log to specs/010-sql-intelligence-dashboard/tdd/cycle-log.md.

## Phase 5 — 013-guest-access-mode (73 PENDING, no tests yet — LAST)

File specs/013-guest-access-mode/tdd/test-list.md.
Confirm clean tree first. Baseline C1-C7 green before T1:
npm test -- tests/unit/AppLayout.test.tsx tests/unit/login-route.test.tsx tests/unit/SignInPanel.test.tsx tests/unit/SignInPage.axe.test.tsx tests/unit/demoAuth.test.ts tests/unit/aiService.test.ts
Order: A1-A20 then U2-U54 (U1 DONE). Log to specs/013-guest-access-mode/tdd/cycle-log.md.

## Hard rules

One behavior per cycle. Invalid RED (setup/import/fixture) fixes setup first. Never weaken tests or change criteria. No new deps. After each spec: npm test + npm run type-check. Final: full npm test, report 152 DONE + green suite.

## Phase 0 — Preflight

Order: 016 -> 012 -> 011 -> 010 -> 013.
Read tdd-profile.md + tests/utils/test-setup.ts, run npm test baseline, check git status. If dirty tree, ask before 013.
