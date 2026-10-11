# Implementation Plan: AI SQL Comparison Results

**Branch**: `018-ai-compare-results` | **Date**: 2026-10-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/018-ai-compare-results/spec.md`

## Summary

Correct the existing SQL Before/After comparison so it uses the main Smart SQL Editor's original/current SQL pair, makes the full diff inspectable at 8,000 lines, reports concise parser-supported structural changes, and renders a validated AI assessment with explicit lifecycle states. Extend the existing comparison panel, `compareSqlSnapshots`, and `requestSqlComparisonExplanation` paths; do not add a parser, AI service, endpoint, persistence layer, or SQL execution path.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 15.5.18 App Router, React 19.0.3

**Primary Dependencies**: `@monaco-editor/react` / Monaco `DiffEditor`, Zustand, existing `analyzeSql` and `parseSql` parser paths, `dt-sql-parser` dialect cross-check, shared `streamWithAI` provider service

**Storage**: N/A; comparison snapshots/results remain in page state and are not persisted

**Testing**: Vitest 2.1.9 with jsdom and Testing Library; focused comparison unit/component tests, mocked AI provider responses, type-check, lint, and build

**Target Platform**: Existing browser-based Next.js application

**Project Type**: Single-project web application

**Performance Goals**: Keep the complete diff navigable for at least 8,000 SQL lines without rendering repeated full-query evidence blocks. Do not add comparison work to per-keystroke analysis. Preserve the constitution's existing analysis/graph budget of 1 second for queries with more than 50 tables.

**Constraints**: Use the editor's original/current SQL and selected dialect as the sole comparison input; keep unsupported parser cases partial; do not execute or rewrite SQL; keep cloud credentials server-side; sanitize provider errors/logs; add no parser or diff dependency. No separate diff-render latency SLA is defined by the spec.

**Scale/Scope**: `src/app/query-input`, `src/app/smart-sql-editor/components/SqlComparisonPanel.tsx`, existing SQL/AI comparison services, English/Vietnamese locales, and focused Vitest coverage. No new route, storage, or unrelated editor redesign.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|-----------|-------|--------|
| I. Multi-Dialect SQL Analysis | Reuse existing regex, normalized AST, and dialect-validation paths; add AST cross-check tests for supported constructs/dialects; explicitly mark SQL Server/Oracle and unsupported shapes partial where grammar evidence is unavailable. | PASS WITH SCOPED PARSER LIMITATIONS |
| II. Interactive Visualization First | Keep the SQL diff as the primary interactive view, retain source line evidence, and support navigation to evidence where feasible. ReactFlow is not appropriate for a textual SQL diff. | PASS |
| III. Real-Time Feedback Loop | Keep structural comparison explicit/on-demand and AI streaming; do not add repeated heavy parsing to editor keystrokes. Abort or mark results stale when editor inputs change. | PASS |
| IV. AI-Grounded Explanations | Send the exact snapshot and deterministic facts; validate the response/evidence; do not let AI override deterministic status or claim unverified equivalence, safety, or performance. | PASS |
| V. Minimal Deployment Friction | Reuse configured provider routing and local inference; add no provider, browser credential, or deployment dependency. | PASS |
| Security & Privacy | Do not expose credentials or SQL in user-facing errors or logs; cloud credentials remain server-side and SQL is sent only through the existing provider path. | PASS, contingent on safe error logging |
| Quality: Testing and Type Safety | Add Vitest regression coverage for all four app dialects and state transitions; preserve strict TypeScript types and document parser limitations. | PASS |
| Quality: Performance and Documentation | Keep the 8,000-line diff inspectable, avoid repeated full SQL DOM output, and preserve the existing one-second analysis/graph budget for >50 tables. | PASS, subject to measured validation |

**Gate result**: Pass with the existing parser capability boundaries documented. The comparison currently combines regex analysis, the `node-sql-parser` normalization path, and `dt-sql-parser` dialect cross-checks; this plan does not add a third parser or claim AST coverage where the installed grammars do not provide it. Safe error logging and the performance checks are implementation acceptance items, not reasons to expand the architecture.

### Post-Design Re-evaluation

**Result**: PASS WITH SCOPED PARSER LIMITATIONS. The Phase 1 data model and UI/AI contract preserve per-dialect limitations and keep unsupported findings partial (Principle I); keep source evidence accessible without replacing the SQL diff with a graph (Principle II); keep comparison on-demand and stale-aware (Principle III); bind validated AI output to deterministic facts without upgrading verification claims (Principle IV); reuse existing provider routing without exposing browser credentials (Principle V); and make safe logging, Vitest coverage, and the 8,000-line browser check explicit validation gates. No new dependencies, service, route, persistence layer, or unjustified constitutional exception was introduced.

## Project Structure

### Documentation (this feature)

```text
specs/018-ai-compare-results/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── comparison-ui-and-ai-contract.md
└── tasks.md                 # Phase 2; not created by /speckit-plan
```

### Source Code (repository root)

```text
src/
├── app/query-input/page.tsx
├── app/smart-sql-editor/components/SqlComparisonPanel.tsx
├── lib/sql/sqlComparison.ts
├── lib/ai/sqlComparisonAi.ts
└── locales/{en,vi}.ts

tests/unit/
├── sqlComparison.test.ts
├── sqlComparisonAi.test.ts
├── sqlComparisonPanel.test.tsx
└── query-input-sql-comparison.test.tsx
```

**Structure Decision**: Use the existing single Next.js project. Keep orchestration in `src/app/query-input/page.tsx`, presentation in `src/app/smart-sql-editor/components/SqlComparisonPanel.tsx`, deterministic comparison in `src/lib/sql/sqlComparison.ts`, AI prompt/validation in `src/lib/ai/sqlComparisonAi.ts`, and localized content in `src/locales/en.ts` and `src/locales/vi.ts`. Add focused tests under `tests/unit/`; no separate frontend/backend project or API route is warranted.

## Complexity Tracking

No unjustified constitution violations or added architectural components. Existing parser coverage exceptions are documented in the gate and research artifacts.
