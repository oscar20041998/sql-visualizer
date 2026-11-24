# Quickstart: Validation Guide

This guide describes validation **after implementation**; none of the new feature commands or flows is represented as already passing.

## Prerequisites

- Existing project dependencies and a test browser; no live database or external AI credentials are required for automated tests.
- For visual review, obtain user permission before starting or accessing an application server. Use synthetic SQL only.
- Record browser/viewport, theme/locale, fixture revision and any permission restrictions. Use stubbed provider requests.

## Current baseline

From the repository root, the following ran on 2026-11-22 and passed 26 tests in four files:

```powershell
npm test -- tests\unit\query-input-workflow.test.tsx tests\unit\AppLayout.test.tsx tests\unit\query-history-page.test.tsx tests\unit\codegen\TabNavigation.test.tsx
```

Nonfatal Vite deprecation and Next image-quality warnings occurred. This is not a full-suite or browser baseline.

On 2026-11-22, a subsequent current full-suite baseline `npm test` passed 87 files and 844 tests in 82.46 seconds. This is not a browser, comprehensive capability-matrix or performance baseline; the inventory below identifies representative tests and remaining coverage gaps.

Baseline test inventory: `tests/unit/query-input-workflow.test.tsx` covers query analysis and tab navigation; `tests/unit/query-input-parameters.test.tsx` covers MyBatis parameter resolution; `tests/unit/sqlSourceClassification.test.ts` covers a CTE/table fixture in each dialect; `tests/unit/relationshipGraphPage.test.tsx` covers graph controls and navigation; `tests/unit/query-history-page.test.tsx` covers history; `tests/unit/home-preferences.test.tsx` covers theme/language; `tests/unit/guestAccess.test.tsx` covers guest access; and `tests/unit/aiService.test.ts` covers provider behavior. These are representative automated checks, not a proof of all real-browser or end-to-end journeys. Confirm coverage of each changed integration point before modifying it.

## After implementing each behavior

1. Use the verified TDD runner in `.specify/memory/tdd-profile.md`: write a focused failing test, run `npm test -- <test-file>`, record the failure, implement, rerun and record the pass. Do not send real SQL or secrets to providers.
2. Exercise pasted multi-object input and multiple SQL files, duplicate keep/replace, ambiguous object identities, cyclic and missing dependencies, in-app navigation and reload. Verify source offsets, actual full/partial/unsupported status, graph/list parity and impact direction against fixtures.
3. Use a stub external provider: confirm that cancellation sends nothing, first confirmation permits the intended provider, a provider change requests confirmation again, errors preserve analysis, and applying a stale suggestion cannot overwrite edits. Exercise existing guest/auth policies.
4. Run the existing targeted command above plus new related test files; run `npm run type-check`, then the verified full suite `npm test`. Run `npm run build` separately from type-check to avoid generated Next type-file races. Record actual outputs.
5. With permission, review desktop/tablet/mobile, both locales/themes, keyboard focus, graph/list, reduced motion and error states. Run Hallmark `node .github\skills\hallmark\scripts\sloplint.mjs <changed-files> --scope app --render --url <local-url>` when an approved running app is available; distinguish static from rendered checks. Get the user's style confirmation.
6. Measure SC-007 on the specified single-GPU reference hardware with a reproducible >50-table fixture. Record hardware, conditions and timing; ≤1 second for analysis and graph rendering is required. Conduct the five-user review and record the results. Do not declare completion based on automated tests alone.

See [workspace contract](contracts/workspace.md), [validation matrix](contracts/validation-matrix.md) and [data model](data-model.md).
