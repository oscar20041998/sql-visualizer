# Implementation Plan: SQL Before/After Comparison

**Branch**: `017-sql-before-after-comparison` | **Date**: 2026-10-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/017-sql-before-after-comparison/spec.md`; planning direction: show comparison results in a toggleable panel consistent with the existing error and AI Explainer panels.

## Summary

Add an analysis-only Before/After comparison to the Smart Editor in `/query-input`. Keep the explicitly captured baseline in tab-scoped session storage; capture the current editor SQL and active dialect when comparison starts. Reuse the current SQL analyzer, dialect validation, AST parser where supported, configured AI provider adapter, Monaco diff editor, and `SidePanelRail`. Deterministic results open in a right-side drawer with an accessible rail toggle; AI explanation is a separately labeled, optional result section. Unsupported analysis remains partial, stale runs cannot replace newer results, and no SQL is executed or rewritten.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 15.

**Primary Dependencies**: Existing `@monaco-editor/react` and Monaco `DiffEditor`; `node-sql-parser`; lazy `dt-sql-parser` dialect cross-check; existing `aiService.streamWithAI`; Zustand; Vitest 2, jsdom, Testing Library, and vitest-axe. No new package is planned.

**Storage**: Browser `sessionStorage` for the explicit Before snapshot only. Comparison run/results and AI state remain in memory. No new server persistence or endpoint.

**Testing**: Vitest unit, component, and page-integration tests. Planned commands: `npm test -- <focused test paths>`, `npm run type-check`, and `npm test`.

**Target Platform**: Existing SQL Visualizer Next.js web app in supported desktop and mobile browsers.

**Project Type**: Full-stack web application; this feature is implemented in the existing client-side SQL Editor and reuses the existing AI proxy for configured cloud providers.

**Performance Goals**: Keep deterministic comparison within the constitution's existing target of 1 second for representative analysis with more than 50 tables on the stated single-GPU test configuration. AI network/model latency is provider-dependent, explicitly triggered, cancellable where supported, and excluded from that deterministic target. Any prompt truncation/context omission is reported.

**Constraints**: No SQL execution, automatic save, editor replacement, AI-applied rewrite, or automatic dialect change. Preserve exact source SQL. English and Vietnamese strings are required. Regex analysis and AST support differ by dialect; Oracle has no `node-sql-parser` grammar. Never infer semantic equivalence from static similarity.

**Scale/Scope**: One developer and one active comparison run per editor tab. A new run supersedes/aborts an older AI request. SQL input size follows browser/editor capacity; AI context follows the existing provider budget and must disclose omissions. Baseline lifetime is one browser-tab session.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Gate

| Principle / gate | Status | Evidence and constraint |
|---|---|---|
| Multi-dialect analysis | PASS | Use the current dialect validator and analyzer; compare only emitted facts; test all four app dialects and report unavailable AST/parser support as partial. |
| Interactive visualization first | PASS | Use the existing Monaco diff capability and evidence-linked findings in the toggleable result panel; this supplements rather than replaces graph analysis. |
| Real-time feedback loop | PASS | Comparison AI streams its explanation after an explicit request; it is not invoked per keystroke. Editing during a run marks its result stale. |
| AI-grounded explanations | PASS | Supply deterministic facts, active dialect, and limitations; label model interpretation separately; runtime-validate output. |
| Minimal deployment friction and security | PASS | Reuse configured local/cloud provider routing; cloud requests remain behind the existing server proxy; do not store credentials or log raw SQL. |
| Testing, type safety, documentation | PASS | Add pure logic and UI tests under Vitest/Testing Library; preserve strict TypeScript; document parser and uncertainty limits. |

No constitutional violation requires an exception.

## Phase 0: Research

Completed in [research.md](research.md). Research confirms the integration point, existing parser capabilities, panel rail ranks and behavior, test tools, provider routing, and storage tradeoffs. There are no unresolved technical-context questions blocking design.

## Phase 1: Design and Contracts

- [data-model.md](data-model.md) defines baseline, immutable comparison snapshots, evidence-bearing changes/findings, separate assessments, and lifecycle states.
- [contracts/comparison-panel.md](contracts/comparison-panel.md) defines the user-facing panel/result contract. No new public API is introduced.
- [quickstart.md](quickstart.md) defines automated and manual end-to-end validation scenarios.
- The user-requested panel opens when deterministic comparison results are ready; AI may continue asynchronously. Closing hides the drawer only; reopening preserves the result unless stale. Add a fourth launcher rank to the shared panel rail and cover four-launcher ordering/accessibility.
- Implement a dedicated pure structural comparison module over existing `AnalysisResult` and parsed models. Use `analyzeSql` for existing cross-dialect facts, `validateSqlDialect` for dialect mismatch checks, and `parseSql` for supported AST facts. Do not add or replace a parser. A parser failure or unsupported AST path produces partial status and an explicit limitation.
- Add a comparison-specific AI adapter over `streamWithAI`. Use a bounded, injection-resistant prompt containing deterministic facts, existing settings/provider routing, runtime guards for the response, and cancellation/stale-run checks. Stream explanation text into the panel; AI failures leave deterministic results visible.
- Capture baseline SQL explicitly in `sessionStorage`; compare an immutable Before/After/dialect snapshot; reject stale responses using run identity and current editor/dialect/baseline checks. Handle unavailable/quota storage without claiming reload persistence succeeded.
- Localize every new user-facing string in `src/locales/en.ts` and `src/locales/vi.ts`.

### Post-Design Constitution Gate

| Principle / gate | Status | Design evidence |
|---|---|---|
| Multi-dialect analysis | PASS | Dialect checks and analyzer facts are reused; parser capability is attached to partial results; dialect fixtures are included in the validation plan. |
| Interactive visualization first | PASS | Monaco diff plus source evidence is surfaced through the shared panel rail; existing query graph/dashboard remains unchanged. |
| Real-time feedback loop | PASS | The user explicitly triggers comparison; AI explanation streams incrementally; stale editor changes invalidate captured results. |
| AI-grounded explanations | PASS | Model receives structured parser facts and limitations; deterministic/AI origins and verification statuses remain separate. |
| Minimal deployment friction and security | PASS | No dependency, route, database, or provider client is added; session-scoped SQL storage and existing proxy boundaries are retained. |
| Testing, type safety, documentation | PASS | Unit, component, page-flow, i18n, and type-check coverage are specified; research and quickstart record known limitations. |

No post-design constitutional violation requires an exception.

## Project Structure

### Documentation (this feature)

```text
specs/017-sql-before-after-comparison/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── comparison-panel.md
├── checklists/
│   └── requirements.md
└── tasks.md                         # Created by /speckit-tasks, not by this plan
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── query-input/page.tsx                         # Baseline/run ownership and editor integration
│   └── smart-sql-editor/components/
│       ├── SqlComparisonPanel.tsx                   # New toggleable diff/findings drawer
│       ├── SidePanelTab.tsx                         # Extend launcher rank for comparison panel
│       ├── SmartSQLEditor.tsx                        # Existing editor SQL and Monaco diff patterns
│       ├── FormatErrorPanel.tsx                     # Existing toggle-panel reference
│       └── AiSqlExplainer.tsx                       # Existing AI drawer reference
├── lib/
│   ├── sql/
│   │   ├── sqlAnalyzer.ts                           # Existing deterministic analysis
│   ├── codegen/parseSql.ts                          # Existing AST adapter
│   │   ├── dialectValidator.ts                     # Existing dialect cross-check
│   │   ├── sqlComparison.ts                         # New structural diff and deterministic findings
│   │   └── sqlComparisonStorage.ts                  # New tab-session baseline storage/validation
│   └── ai/
│       ├── aiService.ts                             # Existing provider adapter
│       └── sqlComparisonAi.ts                       # New prompt and runtime response validation
└── locales/
    ├── en.ts
    └── vi.ts

tests/unit/
├── sqlComparison.test.ts
├── sqlComparisonAi.test.ts
├── sqlComparisonPanel.test.tsx
├── query-input-sql-comparison.test.tsx
└── side-panel-tab.test.tsx                         # Extend four-launcher coverage
```

**Structure Decision**: Keep the feature in the existing Next.js application. Parent-owned lifecycle state belongs in `/query-input`; reusable panel rendering belongs beside the existing Smart Editor panels; pure comparison/storage/AI adapters remain in `src/lib`; focused tests follow the existing `tests/unit` conventions.

## Complexity Tracking

No constitution violations or new architectural layers are proposed. The plan adds one comparison model/service boundary and one panel, reuses the existing rail/parser/AI/editor infrastructure, and introduces no new runtime dependency or API.
