# Cycle Log: AI Prompt Management Refactor (Centralized Prompt Templates)

Append only. Newest last. Every entry's `red` block is the evidence that the test
existed and failed before the implementation.

## Baseline

- suite: `npm test` -> 691 passed, 0 failed (74 test files, 56.00s)
- commit: `a931f41`
- recorded: cycle 0, before any change
- note: the stack profile (detected 2026-10-09) recorded 574 tests / 63 files green;
  the suite has since grown to 691 / 74 and is still green. `package.json` and
  `vitest.config.ts` are unchanged since the profile was detected, so the profile's
  commands remain valid.
## Cycle 1: U13 pins the current format-error prompt, request settings, and parsed result (characterization)

- test: `tests/unit/promptParity.formatError.test.ts` (new: 3 tests — stable explain-prompt determinism + byte-exact baseline, request settings snapshot, fixture parse contract)
- red: none, and none is claimed. Per the playbook brownfield path, characterization captures existing behavior and is expected to pass against untouched code: `npm test -- tests/unit/promptParity.formatError.test.ts` -> `1 passed (1 file), 3 tests, ~59ms` on first run (7d55a0-era `formatErrorAi.ts`, unmodified).
- mutant check (the evidence the suite is not vacuous): inserting ` MUTANT` into the explain-prompt opening line of `src/lib/ai/formatErrorAi.ts:113` gave `npm test -- tests/unit/promptParity.formatError.test.ts -t "stable explain prompt"` -> `AssertionError: expected ''A SQL formatter failed to parse a que…'' to be ''…que…'' // Object.is equality (1 failed, 2 skipped)`; the mutant was then reverted byte-exactly via `git checkout` (verified clean). Four earlier mutant placements produced no failure because they touched only the unused fix-prompt branch or identical-string artifacts — recorded here as discarded, not evidence.
- green: test file committed as new; suite remainder untouched. Full-suite re-run deferred to cycle close per below (targeted file green: `1 passed (1)`).
- refactor: none needed (new file only).
- commit: none — repo convention deviates from stock git flow and the user has not approved a convention; tree left dirty per report (uncommitted: `tests/unit/promptParity.formatError.test.ts`, `tdd/` artifacts, `tasks.md` checkbox).
- notes: U13 set to BASELINE in the test list; T006 ticked `[X]`. The `seen[0]).not.toContain(''MUTANT'')` line in the new test exists to fail loudly on sentinel leakage, and stands as a deliberate-mutant detector, not a tautology guard for the pinned baseline itself.
## Cycle 2: U1 rejects an unknown prompt id with an actionable error

- test: `tests/unit/promptRender.test.ts::rejects an unknown prompt id with an actionable error (U1)` (new, first renderer behavior; test file created this cycle)
- red: `npm test -- tests/unit/promptRender.test.ts -t "unknown prompt id"` -> `AssertionError: expected [Function] to throw error matching /does\.not\.exist/ but got ''renderPrompt is not implemented yet''` (1 failed). Valid red: the assertion ran; only the error text was wrong.
- green: `src/lib/ai/prompts/render.ts` gained the registry lookup that throws `Unknown prompt id: <id>` (smallest move; parameter validation deliberately left for later cycles). File run: `1 passed (1)`.
- refactor: none needed (12-line unit).
- commit: none (no approved commit convention on this branch; tree left dirty, reported).
- notes: scaffold T002 landed alongside (new `src/lib/ai/prompts/` modules + `templates/` dir): types and the render stub were the minimum the cycle needed to compile, so no revert was required; T001 baseline evidence = cycle-0 suite (691 passed / 74 files / 56.00s), report still to be written into `baseline-results.md` as T001''s own task.
## Cycle 3: U2 rejects a missing required parameter with an actionable error

- test: `tests/unit/promptRender.test.ts::rejects a missing required parameter with an actionable error (U2)` (new; registers a `cycle.probe` entry in-test and deletes it in `finally`)
- red: `npm test -- tests/unit/promptRender.test.ts -t "missing required parameter"` -> `AssertionError: expected [Function] to throw an error` (1 failed, 1 skipped). Valid red: assertion ran against the U1-only implementation.
- green: `src/lib/ai/prompts/render.ts` gained the required-parameter loop throwing `Prompt ''<id>'' is missing required parameter: <name>`. File run: `1 passed (1)` (both U1 and U2 green).
- refactor: none needed.
- commit: none (same standing instruction as Cycle 2; user has not approved commits).
- notes: U2 set to DONE in the test list. The in-test `cycle.probe` registration is test scaffolding, not production seeding — production registry wiring arrives with the migrations.
## Cycle 4: U3 applies the pre-change default when an optional parameter is omitted

- test: `tests/unit/promptRender.test.ts::applies the pre-change default when an optional parameter is omitted (U3)` (new)
- red: `npm test -- tests/unit/promptRender.test.ts -t "pre-change default"` -> `AssertionError: expected ''Dialect: {{dialect}}'' to be ''Dialect: mysql'' // Object.is equality` (1 failed, 1 skipped). Valid red: the fill step did not exist yet, so text came back raw.
- green: `src/lib/ai/prompts/render.ts` gained value resolution (supplied ?? default ?? '''') plus a single left-to-right `{{name}}` fill pass; values act only on declared schema names. File run: `1 passed (1)` (U1–U3 all green).
- refactor: none needed.
- commit: none (standing instruction).
- notes: U3 set to DONE in the test list. Single-pass fill (no re-scan of inserted values) already implements the U6 rule structurally; U6 gets its own pinning test next.
## Cycle 5 (resume): U5 inserts multiline SQL/special characters byte-for-byte

- context (deviation, resumed an interrupted session): `tests/unit/promptRender.test.ts` was found corrupted — the U5 test existed as four conflicting duplicate assertions with broken quote escapes; the file failed to transform (`ERROR: Syntax error "'"` at 30:70) and collected 0 tests, so no red had ever been observed and no log entry existed. The corrupted write had ALSO destroyed the U2 and U3 tests recorded as DONE in Cycles 3–4. Repair (stated reason, taken before any run): the file was rewritten with U1 preserved verbatim, U2/U3 reconstructed from the cycle-log records that pin their assertions, and U5 reduced to its single intended assertion (`n` value `{z}`, `m` value `x"y`, no empty-string case — that boundary belongs to U4's own cycle). Nothing deleted was ever-executed test code.
- test: `tests/unit/promptRender.test.ts::preserves multiline SQL and special characters byte-for-byte (U5)` (repaired; registry fixture `cycle.probe` with quotes/braces/backticks/newlines in values, deleted in `finally`)
- red: passed on first run — the single-pass fill from Cycle 4 pre-exists, so per the playbook the red evidence is the deliberate-mutant check: `render.ts` fill step mutated with a trailing `.replace(/\s+/g, ' ')` (whitespace normalization) -> `npm test -- tests/unit/promptRender.test.ts` -> `AssertionError: expected 'Dialect: psql Within quotes: SELECT *…' to be 'Dialect: psql\\nWithin quotes: SELECT …' // Object.is equality` (1 failed | 3 passed). Mutant then reverted byte-exactly; file re-run `4 passed (4)`.
- green: no implementation change needed (Cycle 4's fill already satisfies U5). File run `npm test -- tests/unit/promptRender.test.ts` -> `4 passed (4)`, ~1.7s.
- full suite: `npm test` (detached run, `suite-run.log`) -> `76 files, 698 tests: 1 failed | 697 passed`, 58.66s. The one failure — `smart-sql-editor-format-error-page.test.tsx::resolves the region from the cross-check parser when the formatter reports no position` — is unrelated to this feature (UI page composition test, dt-sql-parser cold-load), not touched by any file in this feature; re-run of that file in isolation -> `6 passed (6)`, so it is a load-sensitive flake, matching the known warning recorded in `vitest.config.ts`. Deliberately not fixed (out of scope).
- refactor: none needed.
- commit: none (standing instruction from Cycles 1–4; user has not approved a commit convention).
- notes: U5 set to DONE in the test list. No task ticked: T003/T004 cover [U1]–[U10]/[U12] as a block and several of their behaviors (U4, U6–U10, U12) are still PENDING.
## Cycle 6: U4 renders an empty-string value as empty — the default is NOT substituted

- test: `tests/unit/promptRender.test.ts::renders an empty-string value as empty without substituting the default (U4)` (new; boundary pair with U3 — same fixture shape, `dialect: ''` supplied against `default: 'mysql'`)
- red: passed on first run — the `supplied ?? schema.default ?? ''` resolution from Cycle 4 pre-exists, so per the playbook the red evidence is the deliberate-mutant check: `render.ts:21` mutated `??` -> `||` (the classic empty-string-swallowed-by-default bug) -> `npm test -- tests/unit/promptRender.test.ts` -> `AssertionError: expected 'Dialect: [mysql]' to be 'Dialect: []' // Object.is equality` (1 failed | 4 passed; U3 still passed under the mutant, confirming the two sides of the boundary are pinned independently). Mutant reverted byte-exactly; file re-run `5 passed (5)`.
- green: no implementation change needed. File run `npm test -- tests/unit/promptRender.test.ts` -> `5 passed (5)`.
- full suite: `npm test` (detached) -> `76 files, 699 tests: 699 passed | 0 failed`, 59.28s — fully green, including the Cycle-5 flake (`smart-sql-editor-format-error-page.test.tsx`), confirming it was load-sensitive, not a regression.
- refactor: none needed.
- commit: none (standing instruction).
- notes: U4 set to DONE in the test list. No task ticked (T003/T004 block still open: U6–U10, U12 pending).
## Cycle 7: U6 treats `{{…}}` inside a parameter value as content, never re-scanned

- test: `tests/unit/promptRender.test.ts::treats {{…}} inside a parameter value as content, never re-scanning (U6)` (new; fixture declares `dialect` with a default so a re-scan would visibly substitute it into the inserted value)
- red: passed on first run — the single-pass fill from Cycle 4 pre-exists, so per the playbook the red evidence is the deliberate-mutant check: `render.ts` fill mutated to a double pass `fill(fill(entry.text))` -> `npm test -- tests/unit/promptRender.test.ts` -> `AssertionError: expected 'Question: What is mysql?' to be 'Question: What is {{dialect}}?' // Object.is equality` (1 failed | 5 passed). Mutant reverted byte-exactly; file re-run `6 passed (6)`.
- green: no implementation change needed. File run -> `6 passed (6)`.
- refactor (while green): the register/try/finally/delete scaffolding had grown to five copies; extracted `withProbeEntry(entry, run)` in the test file and rewrote the five probe-based tests through it. File re-run after the refactor -> `6 passed (6)`.
- full suite: `npm test` (detached) -> `76 files, 700 tests: 700 passed | 0 failed`, 57.02s.
- commit: none (standing instruction).
- notes: U6 set to DONE in the test list. No task ticked (T003/T004 block still open: U7–U10, U12 pending).
## Cycle 8: U7 message role comes from the registry entry, never rewritten

- test: `tests/unit/promptRender.test.ts::takes the message role from the registry entry and never rewrites it (U7)` (new; loops the three contract roles `system | user | assistant`, asserting `message.role` passthrough and unchanged filled content)
- red: passed on first run — `return [{ role: entry.role, content }]` pre-exists, so per the playbook the red evidence is the deliberate-mutant check: `render.ts:26` mutated to `role: 'user' as PromptMessage['role']` -> `npm test -- tests/unit/promptRender.test.ts` -> `AssertionError: expected 'user' to be 'system' // Object.is equality` (1 failed | 6 passed). Mutant reverted byte-exactly; file re-run `7 passed (7)`.
- green: no implementation change needed. File run -> `7 passed (7)`.
- refactor (while green): `render.ts`'s docstring still described the Cycle-2 scaffold ("id lookup only… arrive in their own cycles"); replaced with the current semantics (error paths, defaults vs empty strings, single-pass fill, role/content passthrough, all with their FR/SC ids). Note for T033: this overlaps the Polish documentation task, which remains open for the registry side.
- full suite: `npm test` (detached) -> `76 files, 701 tests: 701 passed | 0 failed`, 59.15s.
- commit: none (standing instruction).
- notes: U7 set to DONE in the test list. Ordering half of U7 is vacuous under the contract's single-message `PromptEntry` (see contracts/prompt-manager.md); the role passthrough is the observable, pinned for all three roles. No task ticked (T003/T004 block still open: U8–U10, U12 pending).
## Cycle 9: U8 renders byte-identical messages for the same id and params on every call

- test: `tests/unit/promptRender.test.ts::renders byte-identical messages for the same id and params on every call (U8)` (new; renders twice with the same params object, `toEqual` between calls plus a pinned content anchor)
- red: passed on first run — the renderer is a pure function over the registry, so per the playbook the red evidence is the deliberate-mutant check. Two mutants tried:
  - discarded: a module-level call counter appending a space on calls after the first broke 5 tests at once (U4/U5/U6/U7/U8) — too broad to attribute the red to U8 specifically; recorded as discarded, not evidence.
  - decisive: a `WeakSet` of previously-seen params objects appending a space only on a repeated render of the same object -> `npm test -- tests/unit/promptRender.test.ts` -> `AssertionError: expected [ { role: 'user', …(1) } ] to deeply equal [ { role: 'user', …(1) } ]` (diff: `"content": "A=SELECT 1 B=x "` vs `"A=SELECT 1 B=x"`), 1 failed | 7 passed — U8's determinism assertion fired, only U8 failed.
  - Mutant reverted byte-exactly (verified by re-reading `render.ts`); file re-run `8 passed (8)`.
- green: no implementation change needed. File run -> `8 passed (8)`.
- refactor: none needed.
- full suite: `npm test` (detached) -> `76 files, 702 tests: 702 passed | 0 failed`, 58.77s.
- commit: none (standing instruction).
- notes: U8 set to DONE in the test list. No task ticked (T003/T004 block still open: U9, U10, U12 pending).
## Cycle 10: U9 the render path performs no network and no filesystem access

- test: `tests/unit/promptRender.test.ts::performs no network or filesystem access on the render path (U9)` (new; doubles the I/O boundaries only — `vi.spyOn(globalThis, 'fetch')` per the repo convention in `query-input-sql-comparison.test.tsx`, plus a `vi.mock('node:fs')` factory recording `readFileSync`/`writeFileSync`; the renderer itself is never doubled)
- red: passed on first run — the renderer imports nothing and calls no I/O, so per the playbook the red evidence is the deliberate-mutant check. Two attempts:
  - discarded: a `fetch('/u9-mutant')` mutant would have hit the real network (or thrown synchronously on the relative URL) — not a controlled experiment; reverted without evidence value.
  - decisive: `render.ts` given `import { readFileSync } from 'node:fs'` + `readFileSync('/u9-mutant')` before the return (intercepted by the test's fs mock, no real I/O) -> first run failed as a scaffold gap, not a red: `Error: [vitest] No "default" export is defined on the "node:fs" mock` — fixed the mock factory to expose `default` (scaffold repair, taken before evidence); re-run -> `AssertionError: expected "spy" to not be called at all, but actually been called 2 times` (1st/2nd spy call: `["/u9-mutant"]`), 1 failed | 8 passed — U9's fs-boundary assertion fired, only U9 failed.
  - Mutant reverted byte-exactly (verified by reading `render.ts`); file re-run `9 passed (9)`.
- green: no implementation change needed. File run -> `9 passed (9)`.
- refactor: none needed.
- full suite: `npm test` (detached) -> `76 files, 703 tests: 1 failed | 702 passed`, 96.50s. The one failure is the SAME pre-existing load-sensitive flake as Cycle 5 — `smart-sql-editor-format-error-page.test.tsx::resolves the region from the cross-check parser when the formatter reports no position` (this test file does not import anything this feature changed); isolated re-run -> `6 passed (6)`. No new failures attributable to the change.
- commit: none (standing instruction).
- notes: U9 set to DONE in the test list. The fs half of the boundary depends on the `node:fs` mock staying in the file; a future cycle that makes the renderer import fs for real would be caught by this test in CI. No task ticked (T003/T004 block still open: U10, U12 pending).
## Cycle 11: U10 every `{{placeholder}}` in a registered template belongs to its schema

- test: `tests/unit/promptRegistry.test.ts::every {{placeholder}} in every registered template belongs to its schema (U10)` (new file, per the list; iterates `PROMPT_REGISTRY` with the same placeholder grammar the renderer fills, asserting each name is declared in that entry's `params`, with an actionable per-id failure message)
- red: passes vacuously on first run — the production registry is empty until the US1/US2 migrations (T007+) register entries — so per the playbook the red evidence is the deliberate-mutant check: `registry.ts` seeded with `'u10.mutant': { role: 'user', text: 'Value: {{undeclared}}', params: {} }` -> `npm test -- tests/unit/promptRegistry.test.ts` -> `AssertionError: prompt 'u10.mutant' uses undeclared placeholder 'undeclared': expected false to be true // Object.is equality` (1 failed). Mutant reverted byte-exactly (registry back to `{}`); file re-run `1 passed (1)`.
- green: no implementation change needed. File run -> `1 passed (1)`.
- refactor: none needed.
- full suite: `npm test` (detached) -> `77 files, 704 tests: 704 passed | 0 failed`, 115.51s (77th file = the new registry audit; machine was loaded this run but no flake this time).
- commit: none (standing instruction).
- notes: U10 set to DONE. The audit is vacuous-but-forward-catching until migrations add entries; its mutant check proves it is not assertion-free. U11 marked BLOCKED this cycle: it needs T005's `prompt-inventory.md`, which does not exist yet, and this command does not write docs (hard rule 6) — whoever runs T005 must unblock it. No task ticked (T003/T004 block still open: U12 pending).
## Cycle 12: U12 every registered prompt id resolves to exactly one entry

- test: `tests/unit/promptRegistry.test.ts::resolves every registered prompt id to exactly one entry (U12)` (new; registers two probe entries with distinct texts/roles, asserts key uniqueness, per-id lookup identity (`toBe` the enumerated entry), and each id resolving to its OWN entry)
- red: passes on first run — a plain object map already gives unique keys — so per the playbook the red evidence is the deliberate-mutant check: `registry.ts` mutated to a `Proxy` whose `get` aliases every id to the first registered entry (simulating a lookup that silently ignores the id) -> `npm test -- tests/unit/promptRegistry.test.ts` -> `AssertionError: expected 'A' to be 'B' // Object.is equality` (1 failed | 1 passed — U10 unaffected, only U12 failed). Mutant reverted byte-exactly (verified by reading `registry.ts`); file re-run `2 passed (2)`.
- green: no implementation change needed. File run -> `2 passed (2)`.
- refactor: none needed.
- full suite: `npm test` (detached) -> `77 files, 705 tests: 1 failed | 704 passed`, 111.33s. The one failure is again the SAME pre-existing load-sensitive flake (`smart-sql-editor-format-error-page.test.tsx::resolves the region from the cross-check parser…`, 3rd occurrence this session, all on loaded full-suite runs); isolated re-run -> `6 passed (6)`. No new failures attributable to the change.
- commit: none (standing instruction).
- notes: U12 set to DONE. **T004 ticked `[X]`**: its behavior block [U1]–[U9] is now entirely DONE. T003 stays open because its markers include the outer acceptance behaviors [A6]–[A10], which are still PENDING.
## Cycle 13: T018/T019/T020 — aiService.ts routed through the registry (wiring + SC-005 drill)

- context (blocker found and closed): before this cycle the seven aiService template modules (`sqlExplainer`, `semanticBrief`, `optimize`, `requirement`, `repair`, `followUp`, `docsConsultant`) were DUPLICATES of text still hard-coded in `src/lib/ai/aiService.ts` — `EXPLAIN_SQL_PROMPT:25`, `EXPLAIN_CTE_PROMPT:31`, `EXPLAIN_SQL_STRUCTURED_PROMPT:62`, `SEMANTIC_BRIEF_PROMPT:1565`, `OPTIMIZE_SQL_STRUCTURED_PROMPT:1764`, `REQUIREMENT_CANDIDATE_PROMPT:2418`, `REPAIR_PROPOSALS_PROMPT:2657`, `FOLLOW_UP_SYSTEM_PROMPT:2800`, `DOCS_CONSULTANT_SYSTEM_PROMPT:2897`, `DOCS_CONSULTANT_NO_CONTEXT_PROMPT:2902` — which violated SC-002/SC-005 while every existing parity suite still passed, because `promptParity.aiServiceCore/Flow` never import `aiService.ts` and compare the registry against test-local `OLD_*` copies only.
- test: `tests/unit/promptParity.aiServiceWiring.test.ts` (new, 19 tests) — drives the REAL exported service functions (`explainSqlWithAI`, `explainCteWithAI`, `analyzeSqlSemantics`, `optimizeSqlWithAI`, `generateRequirementCandidate`, `repairInvalidProposals`, `askFollowUp`, `askDocsConsultant`) through the stubbed global `fetch` seam and asserts the exact provider request body equals `renderPrompt(...)` output, for `en` + `vi`, plus the docs no-context branch and the SC-005 registry-edit drill.
- red (deliberate-mutant evidence, stated as such): the suite was written after the wiring edits in the same session, so its red evidence is the mutant check rather than a first run. `aiService.ts` mutated at `:2686` from `explainSqlParams(sql)` to `explainSqlParams(sql + ' MUTANT')` (simulating a private copy that ignores the registry) -> `npx vitest run tests/unit/promptParity.aiServiceWiring.test.ts` -> `4 failed | 15 passed (19)`, `Cannot read properties of undefined (reading 'body')` on the repair cases plus byte mismatches on the explain cases. Mutant reverted byte-exactly from a pre-mutation copy (verified: no `MUTANT` remains in `aiService.ts`); re-run -> `19 passed (19)`.
- green: `src/lib/ai/aiService.ts` now imports the registry render path (`renderPrompt` + `localizedPromptId` + each feature's id map and param builder), the ten constant declarations were removed (3085 -> 2739 lines before formatting), and every call site renders through `renderPrompt`. File run -> `19 passed (19)`; with the two existing aiService parity suites -> `3 files, 62 passed (62)`.
- two test-authoring defects were fixed inside the new file during this cycle (not production code): missing `Locale` annotations on `it.each` callbacks (TS7006), and a repair fixture whose `find` occurred only once so no repair call was issued — replaced with `REPAIR_SQL` where `id` occurs twice.
- refactor: none needed.
- full suite: `npx vitest run` (detached) -> `82 files, 789 tests: 789 passed | 0 failed`, 106.98s. The long-standing load-sensitive flake did NOT reproduce this run. No new failures attributable to the change.
- type-check: `npx tsc --noEmit` -> CLEAN (zero diagnostics), restoring the recorded baseline.
- commit: none (standing instruction).
- notes: T018/T019/T020 implemented. Their behavior markers U16/U17/U18 stay PENDING in the test list only because the outer acceptance gates (A1–A17) have not been run yet; the inner parity + wiring evidence is green. The new wiring suite also satisfies the intent of T025's edit drill at service level (registry edit -> wire bytes change, no other file touched).
