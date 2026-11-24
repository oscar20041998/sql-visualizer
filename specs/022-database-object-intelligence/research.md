# Phase 0 Research: Database Object Intelligence

## Evidence and capability baseline

The audit below is a **planning snapshot**, not the required released capability matrix. The matrix must be completed from executable fixtures for each type/dialect/construct before any status is advertised (FR-001, SC-001).

| Area | Evidence | Planning conclusion |
|---|---|---|
| Current query analyzer | `src/lib/sql/sqlAnalyzer.ts:26-36,236-255` says its main extraction path is regex-based; it derives query tables, joins and CTEs. | Reuse current behavior; do not call its output an AST fact without cross-checking. |
| Dialect cross-check | `src/lib/sql/dialectValidator.ts:1-9,76-80,104-150` documents signature checks and a MySQL/PostgreSQL cross-check; SQL Server/Oracle do not have equivalent cross-checks in that path. | The constitutional four-dialect cross-check is a **release gate**, not an already-satisfied claim. Add tests and implementation where required; report unsupported instead of false certainty. |
| AST pipeline | `src/lib/codegen/parseSql.ts:1-21`; `tests/unit/codegen/parseSql.test.ts:32-110,194-234` cover selected MySQL, PostgreSQL and SQL Server grammar behavior and unavailable Oracle statistics. | Grammar availability is not evidence that object bodies are supported; exercise each actual construct. |
| CTE/graph | `src/lib/sql/sqlAnalyzer.ts:247-255,381-437` derives query graph and inferred CTE links; `tests/unit/cteExplanation.test.ts:7-32` covers explanation context. | Preserve existing query graph; object read/write/call edges and impact need explicit evidence and distinct semantics. |
| MyBatis | `src/lib/sql/mybatis/dynamicEvaluator.ts:1-14,80-109,190-230` records unresolved dynamic constructs; Query Input invokes existing conversion and analysis at `src/app/query-input/page.tsx:180-206,285-304`. | Keep conversion and its unresolved state; never classify placeholder output as fully resolved. |
| AI and access | `src/lib/ai/aiProviders.ts:6-25`, `src/app/api/ai/generate/route.ts:29-56`, `src/lib/sessionCookie.ts:135-178`, `src/lib/ai/prompts/render.ts:31,61`. | Reuse provider selection, prompts, session guards and transport; existing authorization is not consent. |
| User workspace | `src/app/query-input/page.tsx:700-710,803-866`, `src/app/query-input/components/TabNavigation.tsx:49-87`, `src/components/WorkspaceLayout.tsx:7-20`. | Keep approved icon tabs, adjacent dialect/Tips, 50/50 input/review, route persistence and existing history. New presentation requires user confirmation. |
| Existing state | `src/lib/store.ts:98-105,211-228,324-326` keeps navigation and current source out of persisted selection; settings and dialect are persisted. | Add a non-persisted session slice or equivalent in-memory state, never add definitions or consent to `partialize`. |

Object coverage evidence at planning time: existing query and CTE workflows have targeted tests; view, procedure, function and trigger **body analysis across all four dialects is not established by this audit**. No cell is declared supported, partial or unsupported solely from a dependency name. The implementation baseline must produce a per-cell matrix with source, test name, tested constructs, limitations and date; unknown cells are not advertised as supported.

Existing workspace baseline executed 2026-11-22: `npm test -- tests\\unit\\query-input-workflow.test.tsx tests\\unit\\AppLayout.test.tsx tests\\unit\\query-history-page.test.tsx tests\\unit\\codegen\\TabNavigation.test.tsx` — 4 files, 26 tests passed. Next image-quality and Vite deprecation warnings were nonfatal. This does not constitute a full regression, parser, browser, performance or acceptance baseline.

Implementation audit, 2026-11-22: `viewAnalyzer.ts`, `functionAnalyzer.ts`, `storeprocedureAnalyzer.ts` and `triggerAnalyzer.ts` are empty files and have no source imports; their names do not establish object support. `analyzeSql` is the current regex-based query/CTE path, while `parseSql.ts` provides a separate `node-sql-parser` adapter. `dialectValidator.ts` uses `dt-sql-parser` for MySQL/PostgreSQL dialect mismatch checks, not a four-dialect extraction cross-check. The installed `dt-sql-parser` declarations export MySQL and PostgreSQL but no SQL Server or Oracle parser. A direct Node 24 `require('dt-sql-parser')` probe failed with `ERR_UNSUPPORTED_DIR_IMPORT`; this does not establish whether the configured Vitest/Next bundling path can use it. Treat SQL Server/Oracle AST verification as an unresolved constitutional gate, not a passing result.

## Decisions

### R1: Evidence-first additive object analysis

- **Decision**: Capture current behavior and run dialect/object fixtures first. Extend existing analysis and parser adapters only for proven constructs; parse/extract once where possible and pass safely extracted statements through the existing query analyzer. Preserve distinct provenance and failure status for every source.
- **Rationale**: Reuse avoids competing semantics and prevents grammar support from masquerading as complete analysis.
- **Alternatives considered**: Rewrite the query analyzer or implement a second parser (rejected: conflicts with compatibility and the master prompt); infer full support from installed libraries (rejected: no evidence).

### R2: Conservative analysis session and identity

- **Decision**: Keep session definitions and consent in memory scoped to a browser document; preserve across in-app navigation, reset on reload/tab close, sign-out or identity change, and do not persist or add to query history merely for import. Accept multiple pasted definitions and multiple SQL text files, maintaining source provenance. Existing MyBatis import remains unchanged. Dialect is explicit per imported batch/object.
- **Identity**: Use proven dialect-aware qualified identifiers, object kind and routine signature where available. Never assume a default schema, case folding, overload equivalence or cross-dialect identity when not evidenced. Known duplicates require keep/replace; ambiguous identity remains unresolved and prompts the user rather than overwriting or merging.
- **Rationale**: Prevents privacy regressions and accidental cross-schema or overloaded-routine collisions.
- **Alternatives considered**: Browser persistence (rejected by clarification), last-write-wins (rejected), merging all same-name objects (unsafe).

### R3: Dependency and impact semantics

- **Decision**: Model directed source-to-target edges with provenance, operation and confidence; use the existing graph infrastructure for display but not its join-edge semantics as object dependency facts. Resolve references only against known identities in the session. Use cycle-safe traversal and reverse edges for impact; show missing definitions, ambiguous names, cycles and incomplete coverage.
- **Rationale**: Impact can only cover supplied definitions and must never imply a live database or guaranteed breakage.
- **Alternatives considered**: Assume a catalog or infer missing nodes as complete (rejected); reuse JOIN edges as dependency edges without conversion/evidence (rejected).

### R4: AI trust and consent

- **Decision**: Add object-specific prompt templates through the existing registry and use existing authenticated provider routes and access policies. Gate new external-provider actions with a cancellable confirmation before the first send in the in-memory session; show provider and data scope and re-confirm if the provider changes. No request on cancellation. Local AI and existing AI workflows retain their established behavior. Bind consent to the current session and provider; clear on reload/sign-out/identity change.
- **Rationale**: Enabled configuration or an authenticated account is not proof of consent for newly supplied SQL. Context must be minimized, bounded and treated as untrusted data; do not log source or secrets.
- **Alternatives considered**: Reuse enabled settings as implicit consent (rejected by clarification); modify all existing AI flows (rejected by compatibility requirement).
- **Risk control**: The new action boundary must ensure all its outbound paths apply consent and server-side authorization; do not rely on labels alone. Validate unauthorized and guest access, cancellation, provider switch, untrusted SQL, failures, and source-free logs.

### R5: Hallmark and interaction

- **Decision**: Extend existing workspace and its design tokens, not a second application shell. Keep current accepted Query Input UX intact; present object-specific navigation, evidence and status in a shared analysis area with responsive graph/list alternatives. Ask for explicit visual direction and approval during design before finalizing layouts.
- **Initial user direction, 2026-11-22**: Add an icon-only tab to Query Input; use a minimal split workspace with SQL source on the left and analysis on the right. Continue requesting visual confirmation as work progresses.
- **Dialect decision, 2026-11-22**: Continue incrementally with MySQL/PostgreSQL first; clearly disclose that SQL Server/Oracle remain unverified against the four-dialect AST gate.
- **Rationale**: `design.md` is locked, and user explicitly requires no conflicting feature changes and ongoing style confirmation.
- **Alternatives considered**: Six separate object pages or replacing the existing shell (rejected: duplicated flows and sidebar reload risk).

### R6: Verification and constitutional gates

- **Decision**: Red/green focused Vitest tests before each behavior; then related regression tests, type-check, build and appropriate full suite, plus browser accessibility/visual checks with user approval, Hallmark sweep and recorded evidence. Preserve current editor feedback; new AI is explicit, never invoked on every edit. Continue streaming/incremental presentation of requested AI results without a page reload where the existing flow supports it.
- **Rationale**: Meets user safety requirements and preserves Constitution III without requiring AI calls on every keystroke. `spec.md` FR-026 and constitutional responsiveness do not require new per-edit AI calls.
- **Performance**: SC-007 is a hard release gate: document the exact single-GPU reference machine, fixture with >50 tables, cold/warm conditions, timer boundaries and results. Its machine and result are not yet established. Large-object limits and responsiveness thresholds must be derived and documented during baseline work, with explicit refusal/partial status on exceeded safe limits; no unmeasured pass.
- **Alternatives considered**: Claiming existing performance based on unit tests (rejected), weakening the threshold (not authorized).
