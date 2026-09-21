# Implementation Plan: SQL Intelligence Dashboard

**Branch**: `010-sql-intelligence-dashboard` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-sql-intelligence-dashboard/spec.md`

## Summary

Transform the existing SQL metrics dashboard (`src/app/sql-metrics-dashboard`) from a grid of SQL counters into a SQL Intelligence Dashboard answering: what is the state of this SQL, why is it complex, which structures contribute most, where are the important findings, and what should the developer inspect next. The analysis pipeline (analyzer, weights, dialects, MyBatis) is preserved. The one proven data-contract defect — the complexity denominator being a dynamic median of the user's localStorage score history (producing "483 / 95" displays and >100% percentages) — is fixed at the analysis layer by adding a deterministic normalized score (0–100) and fixed level thresholds using the analyzer's existing vocabulary (LOW / MEDIUM / HIGH / SUPER_HIGH). A pure dashboard adapter (`AnalysisResult` → `SqlAnalysisDashboardData`) feeds a sectioned shell — Health Summary → Top Findings → Top Complexity Contributors → grouped Structural Overview with capability-state-aware tabs → optional AI Insights → Advanced Details — with drill-down reusing the existing `pendingEditorJump` / line-number plumbing and graph routes. All new strings use the existing flat-key i18n (`getT`) with full vi/en coverage, and the normalized score replaces complexity displays on every surface that shows complexity.

## Technical Context

**Language/Version**: TypeScript 5 (strict; `npm run type-check`), React 19.0.3, Next.js 15.5.18 (App Router, `src/app/*`; dev port 4028)

**Primary Dependencies**: Zustand 4.5.5 (`src/lib/store.ts` — `useAppStore` + `persist`; holds `settings`, `analysisResult`, `isAnalyzing`, `pendingEditorJump`); dt-sql-parser 4.3.1 (AST cross-check behind guarded `require`, regex fallback); `@monaco-editor/react` (editor); ReactFlow + `@xyflow/react` (relationship & CTE graphs); Recharts 2.15.2 (charts); lucide-react + `@heroicons/react` (icons); sonner (toasts); Tailwind CSS 3.4.6 (dark theme default, cyan accent `#6ee7f7`); sql-formatter

**Storage**: Client — Zustand `persist` (settings; analysis state is **session-only** — `analysisResult` is dropped by `persist.migrate`, see [data-model.md](./data-model.md) "Analysis state lifetime") + localStorage score history (`complexityScoreList`, input to today's dynamic-median denominator). Server — query history via `/api/history` (Excel workbook on disk, `src/lib/queryHistory.ts`, `QueryHistoryEntry`) — the "Apply as New Version" integration point. No database.

**Testing**: Vitest 2.1.9 + jsdom; `vitest.config.ts` (`@` alias, jsx automatic, 30s timeout for dt-sql-parser cold load, setup `tests/utils/test-setup.ts`); conventions `tests/unit/*.test.ts(x)` (RTL-style component tests; an axe accessibility test already exists), fixtures in `tests/fixtures/`. Commands: `npm test`, `npm run type-check`, `npm run lint`, `npm run dev`.

**Target Platform**: Web browser; desktop-first developer tool (usable on smaller viewports; mobile-first out of scope per spec).

**Project Type**: web-app (single Next.js App Router application)

**Performance Goals**: Dashboard presentation completes within 1 second of analysis completion for 50+ table statements (constitution standard); no analysis recomputation inside render — analysis is computed once and the adapter derives presentation data.

**Constraints**: Reuse the existing i18n (flat typed keys in `src/locales/{en,vi}.ts` via `getT(locale)`; no second i18n system); reuse the existing AI service (`src/lib/ai/aiService.ts`, server-proxied `/api/ai/generate`, cloud credentials server-side only, Ollama default `qwen2.5-coder:7b`); do not change parser / dialect / MyBatis / finding semantics or complexity weights (FR-024) except the proven denominator defect (FR-008); preserve the dark developer-tool aesthetic.

**Scale/Scope**: One dashboard route (~14 existing components regrouped/extended) + shared complexity surfaces (`components/ui/ComplexityDashboard`, `ComplexityBreakdown`, guideline `ScoreWeightTable`, smart-sql-editor comparison panels); one new pure adapter module (`src/lib/sql/dashboard/`); new sections: Health Summary, Top Findings, Top Complexity Contributors, Structural Overview + tabs, AI Insights, Advanced Details.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Verdict | How this plan complies |
|-----------|---------|------------------------|
| I. Multi-Dialect SQL Analysis | PASS | Dashboard consumes `AnalysisResult` per dialect; no parser/dialect behavior change (FR-024); adapter is dialect-agnostic; dialect edge cases covered in adapter tests. |
| II. Interactive Visualization First | PASS | Findings, locations and metrics drill into SQL source via the existing `pendingEditorJump {sql, line}` mechanism and existing graph routes (`/cte-analysis`, relationship graph); new sections render as interactive components, not text dumps. |
| III. Real-Time Feedback Loop | PASS | Dashboard reads `useAppStore().analysisResult` written by the existing re-analysis flow; no page reloads introduced; the health summary refreshes in place. |
| IV. AI-Grounded Explanations | PASS | AI Insights call the existing `aiService` with grounded prompts and the `fitContextBrief` parser-facts brief; outputs are visibly labeled and must not contradict deterministic facts; deterministic analysis remains the source of truth. |
| V. Minimal Deployment Friction | PASS | Ollama stays the default provider; no new providers or browser credentials; AI unavailability never blocks deterministic analysis. |
| Security & Privacy | PASS | No new credential exposure; cloud AI remains server-side (env + `AI_ALLOWED_BASE_URLS`); SQL/analysis data stays local or app-server-side as today. |
| Testing standard (Vitest, dialect edge cases) | PASS | New normalization/adapter/capability logic and components get `tests/unit` coverage; dialect edge cases documented in tests. |
| Type Safety (strict; justified `any` only) | PASS | New modules fully typed; no new `any`. |
| Performance (>50 tables < 1s) | PASS | Normalization and adapter are pure O(n) functions over the computed result; no re-parsing in UI. |
| Documentation standard | PASS | Normalization curve, capability resolution and known limitations documented inline. |

**Gate evaluation**: No violations — the Complexity Tracking section stays empty.

*Post-Phase-1 re-check (2026-09-21): design artifacts ([data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)) reviewed against all gates — additive model changes, a pure adapter, and reused AI/i18n/history surfaces introduce no violations. All gates remain PASS.*

## Project Structure

### Documentation (this feature)

```text
specs/010-sql-intelligence-dashboard/
├── plan.md               # This file
├── research.md           # Phase 0 — design decisions & rationale
├── data-model.md         # Phase 1 — entities & data contracts
├── quickstart.md         # Phase 1 — end-to-end validation guide
├── contracts/
│   ├── dashboard-data.md   # SqlAnalysisDashboardData adapter contract
│   └── ai-insights.md      # AI insight request/response contract
└── tasks.md              # Phase 2 (/speckit-tasks) — not created by /speckit-plan
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── store.ts                       # unchanged contract (analysisResult, isAnalyzing, pendingEditorJump)
│   ├── i18n.ts                        # unchanged mechanism; new flat keys in locales/{en,vi}.ts
│   ├── queryHistory.ts                # "Apply as New Version" appends a new history version here
│   ├── sql/
│   │   ├── sqlAnalyzer.ts             # AnalysisResult: additive normalized-score fields
│   │   ├── complexityScorer.ts        # deterministic normalization + fixed thresholds; dynamic fields → advanced metadata
│   │   └── dashboard/                 # NEW pure adapter layer (business logic outside components)
│   │       ├── types.ts               # SqlAnalysisDashboardData (contracts/dashboard-data.md)
│   │       ├── capability.ts          # CapabilityStatus resolution per section / object type
│   │       ├── buildDashboardData.ts  # AnalysisResult → SqlAnalysisDashboardData
│   │       └── aiPrompts.ts           # vi/en prompts: explain complexity / finding / optimizations
│   └── ai/aiService.ts                # reused as-is (AIGenerateRequest, SqlExplanation)
├── app/
│   ├── sql-metrics-dashboard/
│   │   ├── page.tsx                   # unchanged shell
│   │   └── components/
│   │       ├── MetricsDashboardContent.tsx   # adapter-fed; section order; loading/error/partial states
│   │       ├── AnalysisHealthSummary.tsx     # NEW
│   │       ├── TopFindings.tsx               # NEW
│   │       ├── TopComplexityContributors.tsx # NEW
│   │       ├── StructuralOverview.tsx        # NEW (grouped metrics)
│   │       ├── AnalysisTabs.tsx              # NEW (JOIN / CTE / Predicates / SELECT / Functions / Dependencies)
│   │       ├── AdvancedDetails.tsx           # NEW (raw score, analyzer/parser metadata, rule IDs, AST stats)
│   │       ├── AiInsights.tsx                # NEW (labeled AI panel; compare / copy / apply-as-new-version)
│   │       └── (existing detail components regrouped under tabs)
│   ├── common/sqlAnalyzerUtils.ts    # normalization constants added beside existing complexity constants
│   └── guideline/                    # ScoreWeightTable context shows the normalized score
├── components/ui/                    # shared complexity surfaces updated to the normalized score
└── locales/{en,vi}.ts                # new flat translation keys

tests/unit/
├── complexityNormalization.test.ts  # normalized score, fixed thresholds, raw consistency
├── dashboardData.test.ts            # adapter: health, findings ranking/grouping, contributors
├── dashboardCapability.test.ts      # supported / partial / unsupported per object type
└── sqlMetricsDashboard.test.tsx     # sections, states, i18n switching, drill-down
```

**Structure Decision**: Single Next.js App Router app (repo default — no new projects). The only new module is the pure adapter `src/lib/sql/dashboard/`, which keeps business logic out of presentation components (FR-026); dashboard components stay in the existing route folder following current conventions; shared UI complexity surfaces are updated in place rather than duplicated.

## Complexity Tracking

No constitution violations to justify.
