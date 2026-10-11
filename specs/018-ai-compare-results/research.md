# Research: AI SQL Comparison Results

**Feature**: [spec.md](spec.md)
**Branch**: `018-ai-compare-results`
**Date**: 2026-10-10

## R1: Comparison input and request lifecycle

- **Decision**: Capture one immutable `ComparisonSnapshot` from `SmartSQLEditorApi.getOriginalSql()` and `getSql()` plus the selected dialect when the developer runs Compare. Keep AI explanation as a separate explicit action using that exact snapshot and its deterministic facts.
- **Rationale**: `src/app/query-input/page.tsx` already owns both editor accessors and comparison state. Its run handler creates immutable snapshot values, compares them, and opens the result panel. Its AI handler streams against the captured snapshot, aborts a superseded request, and checks the result is still current before committing the response. This matches the clarified source-of-truth behavior and existing explicit AI action.
- **Alternatives considered**: A separately captured/persisted baseline was rejected because it would create a second source of truth. Starting AI automatically with every deterministic comparison was rejected because the existing UX has a separate AI request action.

## R2: Long SQL diff presentation

- **Decision**: Keep `@monaco-editor/react` `DiffEditor` as the only diff renderer. Replace its fixed 256px viewport and fixed side-by-side behavior with a viewport-aware, responsive layout that can inspect at least 8,000 lines. Keep full SQL in the editor model, use Monaco's line virtualization, and avoid repeating full SQL in finding text.
- **Rationale**: The current panel already uses Monaco's diff model, but `SqlComparisonPanel.tsx` fixes it to `h-64`/`256px`, hides overflow, and always requests side-by-side mode inside a narrow drawer. Monaco is already the repository's editor dependency; adding another diff or virtualization package would duplicate capabilities.
- **Alternatives considered**: Arbitrary excerpt-only rendering was rejected because the full diff must remain inspectable. Rendering complete evidence as repeated `<pre>` blocks was rejected because it duplicates large SQL in the DOM. A new diff dependency was rejected because Monaco already supplies the required editor model.
- **Validation boundary**: Unit/component tests can verify labels, options, responsive state selection, and exact source strings with the existing Monaco mock. A browser check with generated 8,000-line SQL is required to verify actual scrolling, layout, and usable editor height.

## R3: Structural comparison and parser coverage

- **Decision**: Extend the existing `compareSqlSnapshots` pipeline rather than introducing a parser. Use existing `analyzeSql` facts and `parseSql` AST-derived facts for supported constructs; match CTEs individually using existing CTE analysis data when parsing confirms a supported shape. Preserve text diff when a structural match is unavailable and label the result partial/unsupported instead of calling a whole `WITH` clause a confirmed semantic change. Bound collapsed evidence excerpts and retain the full source in the diff.
- **Rationale**: `src/lib/sql/sqlComparison.ts` currently combines a top-level clause scanner, regex analyzer facts, `parseSql` projection facts, and dialect validation. It currently treats `WITH` as one top-level clause and stores its full text as evidence. `analyzeSql` already returns CTE identities and bodies; `parseSql` uses the installed `node-sql-parser` AST path for MySQL, PostgreSQL, and SQL Server, while Oracle is explicitly unsupported. No normalized CTE model is currently exposed by `parseSql`.
- **Constitution cross-check**: Keep the existing `dt-sql-parser` dialect cross-check and add test-time AST cross-checks for parser-supported structural fixtures, following the repository precedent in `specs/003-query-analysis-consistency/research.md`. Do not represent regex-only facts as AST-confirmed. Record unsupported grammar/construct cases as partial and test the fallback. `dt-sql-parser` currently supplies the dialect cross-check for MySQL/PostgreSQL; SQL Server and Oracle need explicit capability/limitation coverage rather than a fabricated AST result.
- **Alternatives considered**: Adding another parser dependency was rejected. Treating whitespace-canonicalized top-level clauses as proof of semantic change was rejected because it produces noisy CTE findings. Reporting every parser gap as a structural finding was rejected in favor of an explicit text-only fallback.

## R4: AI response contract and lifecycle

- **Decision**: Reuse `requestSqlComparisonExplanation` and `streamWithAI`; evolve the existing validated JSON contract and `ComparisonResult.ai` presentation only as needed to render a typed, dedicated assessment. Keep deterministic `ComparisonAssessment` authoritative for static status; AI may explain implications but cannot upgrade verification, equivalence, safety, or performance conclusions. Derive visible states from comparison status, AI request status, and staleness.
- **Rationale**: `sqlComparisonAi.ts` already sends the exact snapshot, dialect, deterministic changes/findings/limitations, streams JSON, validates required fields and a SQL-grounded evidence quote, and applies a provider-aware context budget. The current result's AI value is only `{status, explanation}` and the panel hides its AI section while status is `skipped`, so an unrequested state is invisible and the response contract cannot express all requested assessment categories.
- **Alternatives considered**: A new AI endpoint/service was rejected because the shared streaming service already handles configured providers. Rendering raw model output without validation was rejected. Allowing AI text to change deterministic assessment statuses was rejected because it would violate the AI-grounding principle.

## R5: Provider errors, privacy, and logs

- **Decision**: Never log request prompts, SQL snapshots, provider response bodies, or raw unknown exception objects for this flow. Log only safe operational metadata and a sanitized error category; continue to sanitize user-facing errors and keep provider credentials server-side for proxied cloud requests.
- **Rationale**: The existing shared cloud streaming route redacts secrets in returned errors, but logs unknown exceptions with `console.error`. Comparison prompts contain both SQL snapshots, so generic provider exceptions must not be assumed free of sensitive SQL. The feature requirement explicitly prohibits exposing credentials or sensitive SQL in logs or UI errors.
- **Alternatives considered**: Logging full provider exceptions for easier diagnosis was rejected because exceptions may include request/response details. Silently replacing all errors with success-like output was rejected because users need an accurate unavailable/failed state.

## R6: Performance and validation approach

- **Decision**: Reuse one analysis result per SQL side within a comparison, avoid redundant full-query DOM copies, and benchmark the existing comparison path against the constitution's one-second analysis budget for queries with more than 50 tables. Treat 8,000-line editor inspection as a functional acceptance floor; the spec does not define a separate render-latency SLA.
- **Rationale**: `compareSqlSnapshots` currently analyzes both sides, parses both sides, and validates both dialects; parsing work is already bounded to the explicit comparison action, not the real-time editor loop. Vitest/jsdom and Testing Library are already configured, while Monaco is mocked in component tests, so an actual browser check is needed for large-editor behavior.
- **Alternatives considered**: Inventing an unrequested p95 latency target was rejected. Moving AST or comparison work into every editor keystroke was rejected because it would add unnecessary work to the real-time analysis path.

## R7: Existing test and localization stack

- **Decision**: Add focused Vitest domain and component tests in `tests/unit/`, mock the existing AI provider path, and add comparison strings to both `src/locales/en.ts` and `src/locales/vi.ts`. Run the three comparison test files, `npm run type-check`, and the repository's lint/build gates as available.
- **Rationale**: `package.json` defines Vitest, type-check, lint, and build scripts. `vitest.config.ts` configures jsdom and shared Testing Library setup. Existing comparison coverage is in `sqlComparison.test.ts`, `sqlComparisonAi.test.ts`, `sqlComparisonPanel.test.tsx`, and `query-input-sql-comparison.test.tsx`.
- **Alternatives considered**: Requiring live AI credentials or a database for automated tests was rejected; deterministic mocked responses cover provider states reproducibly.

## Resolved Planning Unknowns

- **AI service and provider contract**: Reuse the existing shared streaming path; no new provider, credential surface, or endpoint.
- **Parser choice**: Reuse installed analysis/parser paths and test-time `dt-sql-parser` cross-checks; no new parser dependency. Unsupported dialect/construct claims remain partial.
- **Large-query acceptance**: At least 8,000 lines must remain inspectable. No separate latency SLA was specified; retain the existing constitutional analysis budget.
- **Persistence**: Comparison and AI results remain in page state; no new persistence or storage schema.