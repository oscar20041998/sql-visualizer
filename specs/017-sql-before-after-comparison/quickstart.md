# Quickstart: SQL Before/After Comparison

## Prerequisites

- Node.js and npm installed with the repository dependencies available (`npm install` if `node_modules` is absent).
- Access to the existing SQL Visualizer workspace and its Smart Editor.
- AI provider configuration is optional for deterministic comparison; an existing local or cloud provider is needed to exercise the AI explanation.

## Automated Validation

Run focused deterministic comparison and snapshot tests:

```powershell
npm test -- tests/unit/sqlComparison.test.ts
```

Run AI response validation using mocked model responses:

```powershell
npm test -- tests/unit/sqlComparisonAi.test.ts
```

Run the panel and Smart Editor integration tests:

```powershell
npm test -- tests/unit/sqlComparisonPanel.test.tsx tests/unit/query-input-sql-comparison.test.tsx
```

Run type checking and the full unit suite:

```powershell
npm run type-check
npm test
```

## Manual Acceptance Walkthrough

1. Start the app with `npm run dev` and open `/query-input` in the current browser tab. Select Smart Editor and choose a SQL dialect.
2. Capture a baseline for a query such as `SELECT id FROM orders WHERE status = 'open';`.
3. Remove or change the filter and activate Compare Changes. Confirm the comparison drawer opens automatically and shows the captured Before and current After SQL.
4. Confirm the diff is readable and the deterministic summary identifies the filter change. Confirm equivalence remains inconclusive and no database execution is reported.
5. Close the result drawer using its close control, reopen it from the right-edge rail, and confirm the same result appears without a second comparison request.
6. Edit the SQL while analysis is in flight or after results render. Confirm the result is marked stale and cannot be mistaken for the current query.
7. Reload the same tab and confirm the baseline remains. Open the app in a fresh browser tab and confirm it asks for a new baseline.
8. Repeat with identical SQL, invalid SQL, unsupported Oracle syntax, and a mocked/unavailable AI provider. Identical SQL must skip AI; other partial or AI failure states must retain deterministic results when available.
9. Switch the app locale between English and Vietnamese. Check the panel launcher, states, findings, and actions in both languages.
10. Confirm the feature does not execute SQL, modify editor content, or save a query.

## Expected Outcome

All focused tests, type checking, and the full unit suite pass. The manual flow verifies explicit baseline capture, tab-session retention, auto-open/toggle panel behavior, stale-result handling, honest partial statuses, AI failure isolation, localization, and analysis-only safety.
