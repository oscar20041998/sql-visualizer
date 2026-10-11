# Research: SQL Before/After Comparison

**Feature**: `017-sql-before-after-comparison`

## Decisions

### 1. Integrate in the existing Smart Editor page and side-panel rail

**Decision**: Add the comparison workflow to the Smart Editor tab in `/query-input`. Render its result view as a right-side drawer using the existing `SidePanelRail` and `SidePanelTab` pattern. Auto-open the panel when a comparison result becomes ready; closing it only hides the view, and reopening shows the same result unless it has become stale. Extend the shared launcher rank type to accommodate a fourth panel.

**Rationale**: `src/app/query-input/page.tsx` already composes the Smart Editor, `FormatErrorPanel`, `AiSqlExplainer`, and `SidePanelRail`. `FormatErrorPanel` receives open state and diagnostic data from its parent, preserving data while closed. `AiSqlExplainer` uses the same right-side drawer and rail. `SidePanelTab.tsx` currently supports ranks 0 through 2, used by Optimize, Explainer, and Format Error. `SmartSQLEditor.tsx` already uses `DiffEditor` from `@monaco-editor/react`.

**Alternatives considered**:
- A new route or editor tab: rejected because the feature belongs inside the existing editor workflow.
- A permanently visible inline result section: rejected because it consumes editor space and does not meet the requested toggleable-panel behavior.
- A new diff-editor dependency: rejected because the repository already has Monaco's diff editor.

### 2. Keep the baseline in browser-tab session storage

**Decision**: Persist only the explicitly captured baseline SQL in `sessionStorage`; rehydrate it when the editor page mounts in the same tab. The comparison result and in-flight state remain in memory. A comparison snapshot captures the current editor SQL and currently selected dialect at comparison start. The baseline remains fixed for that tab; a new tab is required to capture another baseline.

**Rationale**: The clarified requirement is to preserve the baseline across reloads and in-app navigation in the current tab but clear it when the tab closes. The Zustand store in `src/lib/store.ts` persists settings and dialect but deliberately does not persist SQL. `sessionStorage` matches the clarified lifetime without adding query text to long-lived local storage or server persistence.

**Alternatives considered**:
- Component state only: rejected because it loses the baseline on reload/navigation.
- Persisting through the existing Zustand local-storage store: rejected because it outlives the clarified tab session and broadens storage of sensitive SQL.
- Server-side persistence: rejected because comparison is local to the editing session and no saved-comparison workflow was requested.

**Known browser consideration**: Browsers can copy a page's session storage when a new top-level context is opened with an opener. The implementation must initialize a distinct editor-tab session where feasible and test ordinary new-tab behavior; session storage remains the browser-native tab-lifetime boundary.

### 3. Reuse analyzer and parser services; treat unsupported results as partial

**Decision**: Analyze Before and After independently using the existing `analyzeSql` path, and use existing dialect validation and `parseSql` AST parsing where supported to corroborate structural facts. Build a dedicated pure comparison function over normalized analysis facts; do not add another parser or treat an AST match as semantic equivalence. Preserve parser status, dialect, and evidence in the result. Unsupported or incomplete parses produce partial assessments.

**Rationale**: `src/lib/sql/sqlAnalyzer.ts` is the current regex-based analysis path and provides tables, joins, CTEs, fields, metrics, and structural reports. `src/lib/codegen/parseSql.ts` uses `node-sql-parser` and supports MySQL, PostgreSQL, and SQL Server; Oracle has no grammar there. `src/lib/sql/dialectValidator.ts` uses `dt-sql-parser` as a dialect cross-check for MySQL/PostgreSQL and signature checks for other dialects. Existing `buildRequirementChangeSummary` covers a subset of table/join/field/filter changes but is specific to requirement-driven optimization, so comparison needs its own contract and focused coverage.

**Alternatives considered**:
- Replacing the analyzer with a new AST implementation: rejected as a duplicate parser and out of scope.
- Treating the regex analyzer output as proof of equivalence: rejected because the analyzer is heuristic and schema/data semantics are unavailable.
- Reusing the requirement-optimization summary unchanged: rejected because it does not cover the full comparison contract or all required status/evidence fields.

### 4. Reuse configured AI routing with a validated comparison response

**Decision**: Add comparison-specific prompt and response handling that calls the existing `streamWithAI` adapter with the current `AIModelConfig` and locale. Send bounded structured parser facts, deterministic changes, limitations, and SQL context. Display the explanation as it streams, then validate the complete model response at runtime with a local type guard; malformed/unavailable AI output must leave deterministic results intact. Do not add an API route, AI client, or schema-validation dependency.

**Rationale**: `src/lib/ai/aiService.ts` already routes local and cloud providers through existing provider configuration. The format-error AI module demonstrates the repository's prompt, JSON extraction, response validation, failure classification, and evidence-grounding conventions. AI calls must remain explicit and be skipped for identical SQL.

**Alternatives considered**:
- A second provider client or direct cloud request from the feature: rejected because it would duplicate routing and violate the existing credential boundary.
- Trusting model JSON via a TypeScript cast: rejected because runtime output is untrusted.
- Asking AI to determine equivalence, safety, or performance: rejected because the available evidence cannot prove those conclusions.

### 5. Reuse existing UI and test infrastructure

**Decision**: Use the installed Monaco diff editor, existing i18n dictionaries, existing design tokens, and Vitest with jsdom and Testing Library. Keep deterministic comparison logic pure and test it separately from panel interaction and page wiring.

**Rationale**: The package already includes `@monaco-editor/react`, `vitest`, `jsdom`, `@testing-library/react`, and `vitest-axe`. Existing tests cover the side-panel rail, error panel toggling, and query-input page composition.

**Alternatives considered**:
- Adding a UI or SQL-diff dependency: rejected unless implementation testing demonstrates a gap in current capabilities.
- Testing AI against a live provider: rejected because ordinary tests must be deterministic and must not require credentials or network access.

## Planning Constraints

- SQL comparison is analysis-only; no SQL is executed, saved, or rewritten.
- Cloud AI requests continue through the existing server proxy, and local inference continues through the configured local provider.
- Do not log raw SQL or persist the baseline beyond the browser-tab session.
- Do not claim equivalence, execution safety, or performance without evidence; keep those assessments separate.
- The existing parser contract must be checked for each supported dialect, especially Oracle's unavailable AST path.
