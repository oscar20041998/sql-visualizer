# TDD Cycle Log: 019-graph-visualizer-ux

Append-only. Each behavior records the verified command and the red reason before production code that satisfies it.

## Hook

speckit-implement `before_implement` invoked `/speckit-tdd-run` (mandatory, non-optional).

## Layout (U1–U11)

- RED: `npm test -- tests/unit/relationshipGraphLayout.test.ts` — 5 failed, 2 passed. Failures were assertion failures (identical coordinates, gap 380 not less than 380, isolated y not greater, `FORCE_ITERATIONS` 0 not 80, selection recomputed). Not an import error.
- GREEN: same command, 7 passed, after `graphLayout.ts`.

## Later behaviors

Visibility, locales, identity, page, and export tests were added after the production code existed. They are green (24 tests across the seven feature files on 2026-10-09). Those greens are not valid test-first evidence. Do not treat them as recorded red cycles.

## Suite

Feature command: 7 files, 24 tests, passed.
Full `npm test`: 1 failed (`tests/unit/sqlComparisonPanel.test.tsx` Vietnamese extra-risk label), 667 passed. Not caused by graph locale keys. T025 remains open because the suite is not green. T026 remains open: 1366×768 fit, contrast, and physical touch were not walked.

## Session 2026-10-11: baseline confirmation before resuming cycles

- Full `npm test` on the working tree: 1 failed | 671 passed (672), 59.44s. The failure is the same `tests/unit/sqlComparisonPanel.test.tsx > renders comparison labels and AI states in English and Vietnamese` case.
- Pre-existing confirmed: `git worktree add <temp> --detach a5a715d` (clean HEAD, no 019 changes) + junction `node_modules`, then `npx vitest run tests/unit/sqlComparisonPanel.test.tsx` -> `1 failed | 13 passed (14)`, same assertion (`Unable to find an element with the text: Thông tin thêm 1: Rủi ro cần kiểm tra`). The red predates this feature; the loop proceeds with it recorded, per the playbook's baseline-red note. Worktree removed after the check.
- Resume mode: behaviors already covered by a real passing test are verified and marked DONE with the test named. Behaviors with no covering test get a new cycle. Because the 019 implementation already exists in this working tree, every new cycle is a **test-after admission**: the test is written, observed passing against existing code, then verified with a deliberate mutant (implementation broken in the smallest way, test confirmed red, code restored exactly). Each entry below names the mutant. No commit: the whole feature is uncommitted user work (`--no-commit`).

## Session 2026-10-11 cycles (resume, test-after admissions)

Each entry: test written -> observed passing on existing code -> deliberate mutant -> observed red -> restored -> green. Red lines are verbatim from the runs.

### U10 / A4 — a different query fingerprint never reuses the previous positions

- test: `tests/unit/relationshipGraphLayout.test.ts::U10 / A4: a different query fingerprint never reuses the previous positions` (new)
- red (mutant `graphLayout.ts` `reducePlacement`: `true ||` replaced the fingerprint comparison) -> `AssertionError: expected 'mysql\nselect 1' to be 'mysql\nselect 2'` (1 failed)
- green: layout file -> 8 passed. Mutant restored; `git diff src/.../graphLayout.ts` empty.

### A5 — every source-list row states its category as text

- test: `tests/unit/relationshipGraphPage.test.tsx::A5: every source-list row states its category as text, not only as color` (new)
- red (mutant: category `<span>` removed from the All Tables list row) -> `Expected element to have text content: CTE`
- green: page file -> 3 passed. Restored.

### A13 — a source hidden by a filter change is deselected

- test: `tests/unit/relationshipGraphPage.test.tsx::A13: a source hidden by a filter change is deselected and its details disappear` (new)
- red (mutant: clearing `useEffect` disabled with `false &&`) -> `expected 'orders' to be null`
- green: restored.

### A15 — choosing a search match selects that source

- test: `tests/unit/relationshipGraphPage.test.tsx::A15: choosing a search match selects that source, clears the query, and adds no second search field` (new)
- red (mutant: `setSelectedNodeId` call dropped from `handleGraphSearchSelect`) -> `expected null to be 'orders'`

### A17 / U26 — activating an isolated-tables suggestion selects its visible related source

- test: `tests/unit/relationshipGraphPage.test.tsx::A17/U26: activating an isolated-tables suggestion selects its visible related source` (new, fixture `resultWithIsolated()`)
- green directly (existing implementation satisfies it). The details-panel assertion scopes to `.glass-node`, because the source name also renders in the sidebar list. The guard this row relies on is proven by the U27 entry.

### U27 — activating a suggestion with a hidden related source selects nothing

- test: `tests/unit/relationshipGraphPage.test.tsx::U27: activating an isolated-tables suggestion with a hidden related source selects nothing` (new)
- red (two mutants together: `relatedSourceIds?.[0]` instead of the visibility-filtered `find`, plus the clearing `useEffect` disabled) -> `expected 'lonely' to be null`. A single mutant does not fail: the behavior is guarded twice (activation-time visibility check and the hidden-selection clearing effect), so both guards were broken to prove the test catches the regression.
- green: both restored.

### A18 — keyboard travel reaches controls, search, list, and dismiss

- test: `tests/unit/relationshipGraphPage.test.tsx::A18: keyboard travel reaches toolbar controls, search results, the source list, and dismiss` (new)
- green directly; asserted with real element roles/tag names (`BUTTON`, `INPUT`) rather than classes. jsdom cannot prove focus visibility; the visual focus state stays in quickstart.

### A29 / U28 — dismiss is a real button, not a hover-only control

- test: `tests/unit/relationshipGraphPage.test.tsx::A29/U28: dismiss is a real button (not a hover-only span) and removes the suggestion` (new)
- red (mutant `SuggestionPanel.tsx`: `<button>` -> hover-only `<span>`, `aria-label` dropped) -> `Unable to find an accessible element with the role "button" and name "Dismiss suggestion"`
- green: restored.

### A22 — no analyzed result explains analysis is required

- test: `tests/unit/relationshipGraphPage.test.tsx::A22: with no analyzed result the page explains analysis is required and links to query input` (new)
- red (mutant: hint paragraph and `/query-input` link removed) -> 1 failed
- green: restored.

### A23 — one source and no relationships is shown without an error

- test: `tests/unit/relationshipGraphPage.test.tsx::A23: one source and no relationships is shown without an error` (new)
- red (mutant: `if (!analysisResult || analysisResult.tables.length <= 1)` treats a single source as empty) -> 1 failed
- green: restored.

### A20 — saving the image stamps the visible ids and the active theme background

- test: `tests/unit/relationshipGraphPage.test.tsx::A20: saving the image stamps the visible ids and the active dark background` (new; stubs `URL.createObjectURL`/`revokeObjectURL`, spies `HTMLAnchorElement.prototype.click`, installs a fake `.react-flow__renderer svg` surface)
- green directly; the blob text is asserted for `data-visible-ids="cte_src,orders"` and `#1a1f2e`. Unit-level `prepareImageExport` already had its own test covering the light/dark and missing-surface branches.

### A21 — a missing surface reports the image unavailable and keeps diagram copy

- test: `tests/unit/relationshipGraphPage.test.tsx::A21: without a surface the page says the image is unavailable and keeps the diagram text` (new)
- green directly.

### A26 / U24 — a short condition is not shown as truncated

- test: `tests/unit/relationshipGraphPage.test.tsx::U24: a condition shorter than the preview limit has no added ellipsis` and `::A26: a short condition is not shown as truncated` (new, rendering `JoinAnalysisPanel` directly)
- red (mutant `graphExport.ts` `conditionPreview`: always append `...`) -> 3 failed: `Unable to find an element with the text: ON: a = b` / `ON: a.id = b.id`
- green: restored.

### U25 — a long condition previews truncated but stays fully available in details

- test: `tests/unit/relationshipGraphPage.test.tsx::U25: a long condition previews truncated but stays fully available in details; an empty one says so` (new)
- red (mutant `JoinAnalysisPanel.tsx`: full-condition `<code>` renders `conditionPreview(...)` instead of the raw condition) -> `Unable to find an element with the text: a.id = b.id AND a.status = b.status AND a.tenant = b.tenant`
- green: restored.

### U23 — relationship ends render display name and alias, not the internal source id

- test: `tests/unit/relationshipGraphPage.test.tsx::U23: relationship ends render display name and alias, not the internal source id` (new)
- red (mutant `JoinAnalysisPanel.tsx` `endpointLabel`: returns the raw id) -> `Unable to find an element with the text: orders (o)`
- green: restored.

### A25 — two sources that share a name with different aliases stay distinguishable

- test: `tests/unit/relationshipGraphIdentity.test.tsx::A25: two sources that share a name with different aliases stay distinguishable` (new)
- red (mutant `TableNode.tsx` `accessibleName`: alias segment dropped) -> 2 failed (the shared accessible name collapses the two cards)
- green: restored.

## Suite

Feature command: 7 files, 43 tests, passed (2026-10-11, after the cycles above; was 24 tests before this session).
Full `npm test`: 1 failed | 671 passed (672). The failure remains the pre-existing `tests/unit/sqlComparisonPanel.test.tsx` case confirmed above to predate this feature. T025 therefore still records a not-green full suite, caused entirely by an unrelated file.

- green: restored.

### A16 / A30 — all panels open keep the map controls inside one shared 45vh budget

- test: `tests/unit/relationshipGraphPage.test.tsx::A16/A30: all panels open keep the map controls inside one shared 45vh budget` (new)
- red (mutant: `maxHeight: '45vh'` -> `'100vh'`) -> `expected null not to be null` at the `[style*="max-height: 45vh"]` assertion
- green: restored.

## Session 2026-10-15: tdd-run completion (T025) and T026 gap record

All commands run from the repository root. Scratch output files at the repository root were deleted after these numbers were recorded here.

### T025 — feature command and full suite

- Feature command: `npm test -- tests/unit/relationshipGraphLayout.test.ts tests/unit/relationshipGraphVisibility.test.ts tests/unit/relationshipGraphLocales.test.ts tests/unit/relationshipGraphIdentity.test.tsx tests/unit/relationshipGraphPage.test.tsx tests/unit/relationshipGraphExport.test.ts tests/unit/relationshipGraphSourceFilter.test.tsx` -> **7 files, 43 tests, all passed** (exit 0). Every test-list row (A1–A30, U1–U33) maps to a passing test in these files; U19, U20, U30 remain intentional `BASELINE` characterization rows and pass in `relationshipGraphSourceFilter.test.tsx`.
- Full suite: `npm test` -> **74 files, 691 tests, 0 failed** (was 1 failed | 690 passed before the fix below).
- Type-check: `npm run type-check` -> **0 errors**.

### Fix 1 (outside 019 scope, requested by the user): pre-existing red in `tests/unit/sqlComparisonPanel.test.tsx`

- Failure: `renders comparison labels and AI states in English and Vietnamese` expected `Thông tin thêm 1: Rủi ro cần kiểm tra` / `Thông tin thêm 2: Khuyến nghị`.
- Root cause: commit `bc0c4bd` added those two assertions while the same commit renders plain uppercase section headings (`<h4>{t.comparisonAiExtraRisk}</h4>`). `git log -S "Thông tin thêm" -- src` shows the prefix string **never existed in `src/`**, no locale key or spec requires it, and the English half of the same test asserts no prefix. The assertions were committed red.
- Fix (test side, not weakened — now asserts the heading role): `expect(screen.getByRole('heading', { name: 'Rủi ro cần kiểm tra' }))` and `... { name: 'Khuyến nghị' })`.
- Evidence: `npm test -- tests/unit/sqlComparisonPanel.test.tsx` -> **14 passed**.

### Fix 2 (019 file): `npm run type-check` reported 13× TS2339 in `src/app/relationship-graph-visualizer/lib/graphLayout.ts`

- Root cause reproduced in a scratch file: negative if-checks (`event.type === 'select' || ...`) **cannot remove** a union member whose discriminant is a union of six literals, so `event` never narrowed to the query/layout member and every property access after the guards errored.
- Fix: `reducePlacement` restructured to an exhaustive `switch (event.type)` with a positive `case 'query'`. Behavior identical (member types are disjoint; branch bodies unchanged).
- Evidence: `npm test -- tests/unit/relationshipGraphLayout.test.ts` -> **8 passed**; `npm run type-check` -> **0 errors**.

### T026 — automated portions walked, gaps recorded

- Quickstart automated validation (source-filter tests, layout tests, type-check): all green above.
- WCAG contrast measured for the graph colors (TableNode card text, node name/category chip over the composited `nodeColor+alpha` header, toolbar/panel text on theme vars). Results and the light-theme failure are recorded in [verification.md](./verification.md).
- Still manual (cannot be proven from this environment): 1366×768 pixel fit walk, physical touch-device dismiss. T026 stays open in `tasks.md` with these gaps noted.
- Suite verdict per the tdd-run playbook: full suite green, feature tests green. Feature remains not "done" until the T026 manual walk is completed.

