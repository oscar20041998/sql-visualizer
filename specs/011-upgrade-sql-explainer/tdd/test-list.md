# Test List: SQL Explainer Upgrade

---
feature: 011-upgrade-sql-explainer
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 9
planned_at: 124084c
updated_at: 124084c
suite_baseline: green
---

Suite baseline at planning time: `npm test` -> 23 files, 117 tests, all passing (15.11s).

## Outer loop: acceptance behaviors

One per acceptance scenario in `spec.md`. The profile has no acceptance runner, so these are recorded at the highest level the repository can actually test: jsdom component/integration tests against the composed panel + service modules.

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| A1 | A SELECT query with JOINs, WHERE filters, and grouping explained through the panel yields all five sections with query-grounded content | US1-S1, FR-001 | example | PENDING | |
| A2 | A completed structured explanation renders the five sections in fixed order with What You Get Back as a bullet list | US1-S2, FR-001, FR-003 | example | PENDING | |
| A3 | A contract-violating model response still shows the raw answer with a visible structured-unavailable notice | US1-S3, FR-011 | example | PENDING | |
| A4 | Any supported SELECT query explained through the panel measures 500-1,000 human-readable characters across all five sections | US2-S1, FR-007, SC-002 | example | PENDING | |
| A5 | A trivially simple query below 500 natural characters expands with query-grounded detail and invents nothing | US2-S2, FR-007, FR-010 | example | PENDING | |
| A6 | A highly complex query above 1,000 natural characters summarizes within budget without dropping any section | US2-S3, FR-007, FR-001 | example | PENDING | |
| A7 | A CTE/JOIN/calculation query explained through the panel contains none of the six banned topics | US3-S1, FR-008, SC-004 | example | PENDING | |
| A8 | After the upgrade, the Analyze feature output is byte-identical to its pre-change baseline | US3-S2, FR-009 | example | PENDING | |
| A9 | The full five-section explanation reads identically structured in Vietnamese with the same 500-1,000 budget | FR-012, SC-002 | example | PENDING | |

## Inner loop: unit behaviors

Grouped by the component from `plan.md` that owns them. Each line names one observable result.

### `src/lib/ai/aiService.ts` - prompt contract, parsing, validation, retry

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U1 | Parses a valid five-key payload preserving key order into a structured explanation | FR-001, FR-011 | contract | DONE | tests/unit/explainerContract.test.ts parses keys in contract order |
| U2 | Rejects a payload missing `report_grain` as a contract violation | FR-004, FR-011 | contract | DONE | tests/unit/explainerContract.test.ts marks unstructured when report_grain absent |
| U3 | Rejects a payload with an extra top-level key as a contract violation | FR-011 | contract | DONE | tests/unit/explainerContract.test.ts marks unstructured when sixth key present |
| U4 | Rejects an empty `result_bullets` array as a contract violation | FR-003, FR-011 | contract | DONE | tests/unit/explainerContract.test.ts marks unstructured when result_bullets empty |
| U5 | Accepts a filterless query as one category explicitly stating no filters | FR-005, FR-011 | example | DONE | tests/unit/explainerContract.test.ts parses explicit no-filters category |
| U6 | Rejects a filter category with an empty `items` array as a contract violation | FR-005, FR-011 | contract | DONE | tests/unit/explainerContract.test.ts marks unstructured when category has no items |
| U7 | Accepts a CTE entry with name plus one-phrase role and no inner logic | FR-006, FR-008 | example | DONE | tests/unit/explainerContract.test.ts parses named query step with role |
| U8 | Rejects a CTE entry whose purpose describes inner query logic | FR-006, FR-008 | example | DONE | tests/unit/explainerContract.test.ts marks unstructured when purpose narrates inner logic |
| U9 | Marks a data-source purpose unsupported by the query as `unknown` instead of inventing one | FR-006, FR-010 | example | DONE | tests/unit/explainerContract.test.ts keeps literal unknown purpose as valid entry |
| U10 | Rejects a payload contradicting parser tables/CTEs as ungrounded | FR-010 | example | DONE | tests/unit/explainerContract.test.ts marks unstructured when data source absent from parser facts |
| U11 | Counts exactly 500 human-readable characters as within budget | FR-007 | example | DONE | tests/unit/explainerContract.test.ts accepts a 500-character explanation |
| U12 | Counts 499 human-readable characters as below budget | FR-007 | example | DONE | tests/unit/explainerContract.test.ts rejects a 499-character explanation |
| U13 | Counts exactly 1,000 human-readable characters as within budget | FR-007 | example | DONE | tests/unit/explainerContract.test.ts accepts a 1000-character explanation |
| U14 | Counts 1,001 human-readable characters as above budget | FR-007 | example | DONE | tests/unit/explainerContract.test.ts rejects a 1001-character explanation |
| U15 | Excludes JSON syntax, section labels, and whitespace-only padding from the character count | FR-007 | example | DONE | tests/unit/explainerContract.test.ts counts only visible text when grain is whitespace-padded |
| U16 | Retries generation with length steering until the output fits, within 1 attempt plus at most 2 retries | FR-007 | example | DONE | tests/unit/explainerLengthBudget.test.ts regenerates below-budget first attempt |
| U17 | Shows the closest-length attempt with a length notice when all retries are exhausted | FR-007, FR-011 | example | DONE | tests/unit/explainerLengthBudget.test.ts stops at 3 calls and keeps last non-fitting attempt as raw |
| U18 | Rejects each of the six banned topics wherever it appears in the payload | FR-008 | example | DONE | tests/unit/explainerContract.test.ts rejects each banned topic anywhere in payload |
| U19 | Rejects empty or whitespace-only SQL before any generation call | Edge Cases | example | DONE | tests/unit/explainerLengthBudget.test.ts throws before calling generation for whitespace-only SQL |
| U20 | Returns no invented sections for unparsable SQL | Edge Cases, FR-010 | example | DONE | tests/unit/explainerLengthBudget.test.ts marks plain-prose answer unstructured with raw preserved |

### `src/app/smart-sql-editor/components/AiSqlExplainer.tsx` - panel rendering, fallback, streaming

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U21 | Renders the five sections in contract order with What You Get Back as bullets | FR-001, FR-003 | example | PENDING | |
| U22 | Always renders the Report Grain block even for ungrouped queries | FR-004 | example | PENDING | |
| U23 | Renders filter groups under their category labels | FR-005 | example | PENDING | |
| U24 | Visibly marks `unknown` data-source purposes | FR-006 | example | PENDING | |
| U25 | Renders the raw answer with a structured-unavailable notice when `structured=false` and still records the run | FR-011 | example | PENDING | |
| U26 | Progressively renders partial sections for the new keys while streaming | FR-001 | example | PENDING | |
| U27 | Shows a length-miss notice naming the budget when the retry path exhausts | FR-007 | example | PENDING | |

### `src/lib/ai/aiSpeech.ts` plus clipboard - dependent surfaces

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U28 | Clipboard text follows the new five-section order | FR-001 | example | PENDING | |
| U29 | Read-aloud script follows the new five-section order including the empty-filter sentence | FR-001, FR-005 | example | PENDING | |

### `src/locales/en.ts`, `src/locales/vi.ts` - labels and notices

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U30 | All five section labels plus fallback, retry, and length notices resolve in both locales | FR-011, FR-012 | example | PENDING | |

## Invariants and edge cases still to place

None - every edge case from `spec.md` is placed above (U19 empty SQL, U20 unparsable SQL, U10 parser-wins grounding, U25/U27 fallback notices, U5 filterless query).

## Out of scope

- Follow-up chat changes: spec Assumptions exclude it unless the type change forces a compile fix.
- CTE batch panel changes: same exclusion as above.
- Analyze feature changes: read-only verification only (FR-009); no tests for new Analyze behavior.
- Load behavior / latency percentiles: no requirement, no test (retry bound of 1+2 is a fixed design decision, tested as a count in U16).
- Old `field_meanings`, `output`, `tables` keys: removed schema, no backward-compatibility tests.

## Verification commands

Copied verbatim from `.specify/memory/tdd-profile.md` at planning time, so this file stands alone:

- Single test: `npx vitest run {file} -t "{name}"`
- File: `npx vitest run {file}`
- Full suite: `npm test`
- Watch: `npx vitest`
- Helpers: `tests/utils/test-setup.ts`
- Test glob: `tests/**/*.test.{ts,tsx}`
- Coverage: unverified (`null`) - no coverage gate for this feature.
- Mutation: unverified (`null`) - no mutation gate for this feature.
- Property/approval/contract runners: none configured - all behaviors use `kind: example` or `kind: contract` executed by the Vitest file runner above.

