# Quickstart: AI SQL Comparison Results

**Feature**: [spec.md](spec.md)
**Implementation plan**: [plan.md](plan.md)
**UI/AI contract**: [contracts/comparison-ui-and-ai-contract.md](contracts/comparison-ui-and-ai-contract.md)

## Prerequisites

- Node.js version supported by the repository and installed npm dependencies.
- For provider-independent automated tests, no AI credentials or database are required; AI requests are mocked.
- For manual AI verification, configure a supported provider using the existing Settings/environment flow. Do not put credentials in the browser or test fixtures.

## Focused Automated Validation

From the repository root, run the comparison domain, AI adapter, panel, and query-input integration tests:

```powershell
npm test -- tests/unit/sqlComparison.test.ts tests/unit/sqlComparisonAi.test.ts tests/unit/sqlComparisonPanel.test.tsx tests/unit/query-input-sql-comparison.test.tsx
```

Then run:

```powershell
npm run type-check
npm run lint
```

The full suite and production build are final gates when required:

```powershell
npm test
npm run build
```

## Browser Validation

1. Start the app with `npm run dev` and open `/query-input` in the existing authenticated or demo workspace.
2. Load SQL into the Smart SQL Editor, change one `WHERE` predicate, and run Compare. Confirm Before matches the editor's original SQL and After matches its current SQL in both compare views.
3. Check an `INNER JOIN` to `LEFT JOIN` change and a multi-CTE query. Confirm findings are concise, CTEs are matched individually only when supported, and parser limitations do not become confirmed semantic claims.
4. Compare formatting-only SQL and identical SQL. Confirm the former is not mislabeled as a structural behavior change and the latter does not request AI.
5. Request AI explicitly with a configured provider. Verify the AI Assessment section transitions from not started to analyzing to completed, and displays only validated fields and SQL-grounded evidence.
6. Exercise unavailable/malformed provider results with the existing mocked integration tests. Confirm deterministic findings remain visible and errors/logs do not expose credentials or SQL text.
7. Change the SQL while comparison or AI is running. Confirm the old result is marked stale and an old response does not appear as current.
8. Switch locale to Vietnamese and verify the new labels and lifecycle messages are localized.

## 8,000-Line Diff Check

In PowerShell, create a valid, comment-padded statement and copy it to the editor:

```powershell
$lines = @('SELECT id', 'FROM orders') + (1..7997 | ForEach-Object { "-- filler line $_" }) + @('WHERE active = 1;')
Set-Clipboard ($lines -join "`n")
```

Paste into the Smart SQL Editor, change the final predicate, and run Compare. Verify both sides remain navigable with intentional horizontal/vertical scrolling, labels and line numbers are clear, and the 8,000-line source is not silently clipped. The AI may receive only a bounded context; any truncation must be disclosed and must not affect the local full diff.

## Expected Outcome

- The compared SQL is the exact editor original/current pair captured at run start.
- Deterministic findings remain separate from AI interpretations and disclose parser limits.
- AI/provider failures do not clear comparison results or reveal secrets/query text.
- No comparison action executes SQL or applies a rewrite.