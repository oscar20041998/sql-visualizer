# Cycle Log: SQL Explainer Upgrade

Append only. Newest last. Every entry's `red` block is the evidence that the test existed and failed before the implementation.

## Baseline

- suite: `npm test` -> 23 files, 117 passed, 0 failed
- commit: `124084c`
- recorded: cycle 0, before any change

## Cycle 1: U1 parses a valid five-key payload preserving key order

- test: `tests/unit/explainerContract.test.ts::parses the JSON string keys in contract order into a structured explanation` (new)
- red: `npx vitest run tests/unit/explainerContract.test.ts` -> `Error: Cannot find module '@/lib/ai/aiService' ... parseExplainerPayload` (import resolution failure: symbol did not exist; 1 failed)
- green: `src/lib/ai/aiService.ts` added `parseExplainerPayload` with `EXPLAINER_CONTRACT_KEYS` order check plus `ExplainerSections`/`ExplainerPayload` types. Suite `npm test` -> 118 passed, 0 failed
- refactor: none needed, new additive export alongside existing `parseSqlExplanation`
- commit: uncommitted per session rule (shared branch `duyvt7`, spec work untracked)

## Cycle 2: U2 rejects a payload missing report_grain

- test: `tests/unit/explainerContract.test.ts::marks the payload unstructured when report_grain is absent` (new)
- red: recorded via deliberate-mutant check — the new test passed on first run because a 4-key payload already fails the 5-key shape check, so the `report_grain` requirement was unproven; mutant (temporarily removed the shape length check) still passed, confirming the test was worthless as written. Restored code exactly and added the explicit `asText(parsed.report_grain) !== ''` requirement to `parseExplainerPayload`.
- green: `src/lib/ai/aiService.ts` shape check now requires non-empty `report_grain`. Suite `npm test` -> 119 passed, 0 failed
- refactor: none needed, one predicate added to the existing shape guard
- commit: uncommitted per session rule (shared branch `duyvt7`, spec work untracked)

## Cycle 3: U3 rejects a payload with an extra top-level key

- test: `tests/unit/explainerContract.test.ts::marks the payload unstructured when an unknown sixth key is present` (new)
- red: valid on first run per deliberate-mutant check — temporarily removing the shape length check made the new test pass while U1/U2 stayed green, proving the test pins the exact-5-key rule (restored exactly).
- green: no source change needed — the `EXPLAINER_CONTRACT_KEYS` exact-length check from Cycle 1 already enforces it. Suite file run -> 7 passed at the time (U1–U7).
- refactor: none needed
- commit: uncommitted per session rule (shared branch `duyvt7`, spec work untracked)

## Cycle 4: U4 rejects an empty result_bullets array

- test: `tests/unit/explainerContract.test.ts::marks the payload unstructured when result_bullets is empty` (new)
- red: `npx vitest run tests/unit/explainerContract.test.ts -t "marks the payload unstructured when result_bullets is empty"` -> `FAIL ... AssertionError: expected true to be false // Object.is equality` (1 failed)
- green: `src/lib/ai/aiService.ts` `parseExplainerPayload` now builds `sections` first and gates `structured` on non-empty `query_objective`, non-empty `result_bullets`, non-empty `report_grain`. Suite file run -> 4 passed at the time.
- refactor: none needed; folded the Cycle 2 grain predicate into the unified `contentOk` guard (behavior preserved, U2 still green)
- commit: uncommitted per session rule (shared branch `duyvt7`, spec work untracked)

## Cycle 5: U5 accepts a filterless query as one no-filter category

- test: `tests/unit/explainerContract.test.ts::parses an explicit no-filters category as structured` (new)
- red: `npx vitest run tests/unit/explainerContract.test.ts -t "parses an explicit no-filters category as structured"` -> `FAIL ... AssertionError: expected [] to deeply equal [ { …(2) } ]` (1 failed; `filter_categories` parsed as `[]`)
- green: `src/lib/ai/aiService.ts` added `asFilterCategory`/`asFilterCategories`/`asDataSource`/`asDataSources` parsers and gated `structured` on both parsing non-null. Suite file run -> 5 passed at the time.
- refactor: none needed
- commit: uncommitted per session rule (shared branch `duyvt7`, spec work untracked)

## Cycle 6: U6 rejects a filter category with empty items

- test: `tests/unit/explainerContract.test.ts::marks the payload unstructured when a category has no items` (new)
- red: valid on first run per deliberate-mutant check — temporarily requiring a raw non-empty `items` array made the new test pass while U5 stayed green, proving the test pins the non-empty-items rule (restored exactly).
- green: restored `asFilterCategory` to require a raw non-empty `items` array that parses to non-empty items. Suite file run -> 6 passed at the time.
- refactor: none needed
- commit: uncommitted per session rule (shared branch `duyvt7`, spec work untracked)

## Cycle 7: U7 accepts a CTE entry with name plus one-phrase role

- test: `tests/unit/explainerContract.test.ts::parses a named query step with a one-phrase role as structured` (new)
- red: valid on first run per deliberate-mutant check — temporary `U7_MUTANT_PROBE` forcing `asDataSources` to null made the new test fail with `AssertionError: expected false to be true // Object.is equality` (1 failed); probe fully removed afterward (`git diff --stat` shows only `aiService.ts` contract additions, no probe residue).
- green: no source change needed — `asDataSource`/`asDataSources` from Cycle 5 already accept well-formed entries. Suite file run -> 7 passed.
- refactor: none needed
- commit: uncommitted per session rule (shared branch `duyvt7`, spec work untracked)

## Cycle 8: U8 rejects a CTE entry describing inner query logic

- test: `tests/unit/explainerContract.test.ts::marks the payload unstructured when a purpose narrates inner logic` (new)
- red: `npx vitest run tests/unit/explainerContract.test.ts -t "marks the payload unstructured when a purpose narrates inner logic"` -> `AssertionError: expected true to be false // Object.is equality` (1 failed)
- green: `src/lib/ai/aiService.ts` added `BANNED_TOPIC_PATTERNS` (six banned families, word-boundary, case-insensitive), `containsBannedTopic`, `payloadHasBannedTopic`; `structured` now also gated on the banned check. Suite file run -> 8 passed; `npm run type-check` clean.
- refactor: none needed
- commit: uncommitted per session rule (shared branch `duyvt7`, spec work untracked)

## Cycle 9: U9 marks an unsupported data-source purpose as unknown

- test: `tests/unit/explainerContract.test.ts::keeps a literal unknown purpose as a valid structured entry` (new)
- red: valid on first run per deliberate-mutant check — temporary `if (purpose === 'unknown') return null` in `asDataSource` made the new test fail with `AssertionError: expected false to be true // Object.is equality` (1 failed); mutant removed exactly, U9 green again.
- green: no source change needed — `asDataSource` already preserves the literal `unknown` purpose, so the honest-prompt behavior is accepted rather than rejected or rewritten.
- refactor: none needed
- commit: uncommitted per session rule (shared branch `duyvt7`, spec work untracked)

## Cycle 10: U10 rejects a payload contradicting parser sources

- test: `tests/unit/explainerContract.test.ts::marks the payload unstructured when a data source is absent from parser facts` (new)
- red: `npx vitest run tests/unit/explainerContract.test.ts -t "marks the payload unstructured when a data source is absent from parser facts"` -> `AssertionError: expected true to be false // Object.is equality` (1 failed)
- green: `src/lib/ai/aiService.ts` `parseExplainerPayload(raw, knownSources?)` gained `matchesParserSources` (case-insensitive name match; no knownSources -> no check). File run -> 10 passed; type-check clean.
- refactor: none needed
- commit: uncommitted per session rule (shared branch `duyvt7`, spec work untracked)

## Cycle 11: U11 counts exactly 500 human-readable characters as within budget

- test: `tests/unit/explainerContract.test.ts::accepts a 500-character explanation` (new)
- red: minimal stubs (`countHumanChars` -> 0, `isWithinLengthBudget` -> false) added first; `npx vitest run ... -t "accepts a 500-character explanation"` -> `AssertionError: expected false to be true // Object.is equality` (1 failed)
- green: implemented `countHumanChars` (visible text joined with single spaces, whitespace-collapsed, trimmed) and `isWithinLengthBudget` (500..1000 inclusive). File run -> 11 passed; type-check clean.
- refactor: none needed
- commit: uncommitted per session rule (shared branch `duyvt7`, spec work untracked)

## Cycle 12: U12 counts 499 human-readable characters as below budget

- test: `tests/unit/explainerContract.test.ts::rejects a 499-character explanation` (new)
- red: valid on first run per deliberate-mutant check — `isWithinLengthBudget` forced to `return true` made the new test fail with `AssertionError: expected true to be false // Object.is equality` (1 failed); mutant restored exactly.
- green: no source change needed — the 500..1000 range from Cycle 11 already rejects 499.
- refactor: none needed
- commit: uncommitted per session rule (shared branch `duyvt7`, spec work untracked)

## Cycle 13: U15 excludes whitespace padding from the character count

- test: `tests/unit/explainerContract.test.ts::counts only visible text when the grain is whitespace-padded` (new)
- red: valid on first run per deliberate-mutant check — removing the final `.trim()` from `countHumanChars` made the new test fail with `AssertionError: expected 500 to be 498 // Object.is equality` (1 failed); trim restored exactly.
- green: no source change needed — the trim/whitespace-collapse from Cycle 11 already excludes padding.
- refactor: none needed
- commit: uncommitted per session rule (shared branch `duyvt7`, spec work untracked)

## Cycle 14: U13 counts exactly 1,000 human-readable characters as within budget

- test: `tests/unit/explainerContract.test.ts::accepts a 1000-character explanation` (new)
- red: valid on first run per deliberate-mutant check — upper bound tightened to `count < 1000` made the new test fail with `AssertionError: expected false to be true // Object.is equality` (1 failed; only U13 red, all others green); restored exactly.
- green: no source change needed — the inclusive `<= 1000` from Cycle 11 already accepts exactly 1000.
- refactor: none needed
- commit: uncommitted per session rule (shared branch `duyvt7`, spec work untracked)

## Cycle 15: U14 counts 1,001 human-readable characters as above budget

- test: `tests/unit/explainerContract.test.ts::rejects a 1001-character explanation` (new)
- red: valid on first run per deliberate-mutant check — upper bound loosened to `count <= 1001` made the new test fail with `AssertionError: expected true to be false // Object.is equality` (1 failed; only U14 red); restored exactly.
- green: no source change needed — the inclusive `<= 1000` already rejects 1001. File run after restore -> 15 passed; type-check clean.
- refactor: none needed
- commit: uncommitted per session rule (shared branch `duyvt7`, spec work untracked)

## Cycle 16: U16 retries generation with length steering within the bounded attempts

- test: `tests/unit/explainerLengthBudget.test.ts::regenerates when the first attempt is below budget and stops at the fitting retry` (new file; interaction double on the injected generate fn — the call count IS the behavior)
- red (missing seam): first run failed with `AIServiceError: Ollama base URL is not configured.` — the real provider path ran because the double was never called. Minimal seam stub added: `explainSqlStructured(options, generateFn: typeof generateWithAI = generateWithAI)` plumbing only.
- red (assertion): re-run -> `AssertionError: expected "spy" to be called 2 times, but got 1 times` (1 failed)
- green: `src/lib/ai/aiService.ts` `explainSqlStructured` now loops 1 attempt + `MAX_LENGTH_RETRIES = 2`, gating each attempt on `parseExplainerPayload(...).structured && isWithinLengthBudget(countHumanChars(...))`, appending a `LENGTH_STEERING_HINT` (names the 500–1,000 budget) to retry prompts; non-fitting last attempt falls through to existing handling (U17 notice next cycle).
- verification: length-budget file 1/1, contract file 15/15, type-check clean.
- refactor: none needed
- commit: uncommitted per session rule (shared branch `duyvt7`, spec work untracked)

## Notes and deviations

- Cycle 15 log consumed the Notes heading by accident at session end; restacked now.


- Cycle-log entry for Cycle 8 was initially written by replacing Cycle 7's `green` line (edit tooling matched the wrong occurrence). Restored within the same session: Cycle 7's original four lines re-inserted above and the Cycle 8 entry moved under its own heading. No cycle facts changed.
