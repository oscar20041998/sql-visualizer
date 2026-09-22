# Implementation Plan: SQL Explainer Upgrade

**Branch**: `011-upgrade-sql-explainer` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-upgrade-sql-explainer/spec.md`

**Note**: The active git branch is `duyvt7`; `011-upgrade-sql-explainer` is the spec-workflow name used for artifact paths.

## Summary

Refactor the AI SQL Explainer from its current five-field shape (`objective` / `filters` / `output` / `tables` / `field_meanings` in `src/lib/ai/aiService.ts`) to the spec's business-focused five-section contract — Query Objective, What You Get Back (bullets), mandatory Report Grain, categorized Filters & Constraints, Data Sources with business purpose. Enforce the 500–1,000 human-readable-character budget with bounded validate-and-retry (per clarification), ban execution topics (CTE internals, joins, execution logic, calculations, lineage, performance), and render the new sections in the Smart SQL Editor panel — while reusing the existing provider routing, streaming, context-budget, history, and en/vi i18n pipeline unchanged.

## Technical Context

**Language/Version**: TypeScript 5 with Next.js 15.5 / React 19 (App Router; `AiSqlExplainer.tsx` is a client component).

**Primary Dependencies**: `aiService.ts` (provider routing, streaming, structured parsing), `sqlAnalyzer.ts` (regex + `dt-sql-parser` AST cross-check feeding the context brief), `zustand` store (AI config), `getT` en/vi i18n (`src/locales/en.ts`, `src/locales/vi.ts`), `aiSpeech.ts` narration, existing `/api/ai/generate` + `/api/ai/generate/stream` proxy routes.

**Storage**: N/A — no new persistence; explanation history behaviour unchanged (in-memory run thread).

**Testing**: Vitest (`npm test` → `vitest run`, jsdom, 30s timeout for the ANTLR cold-load) for prompt-contract and parsing unit tests; React Testing Library for panel rendering of the new sections.

**Target Platform**: Web app (desktop-first Smart SQL Editor panel); responsive/touch conventions already established in the codebase.

**Project Type**: Web application (Next.js frontend + API-route backend-for-frontend).

**Performance Goals**: Explanation generation bounded by one initial attempt plus a small bounded retry count (e.g. max 2 retries) so the length budget does not cause unbounded latency; relationship-graph rendering of >50-table queries still completes within 1s per constitution.

**Constraints**: Server-side-only keys (constitution privacy rule — no new client-to-cloud calls); TypeScript strict mode (no unjustified `any`); streaming UX preserved — sections may render progressively but the final output must satisfy FR-001–FR-007; Analyze-feature behaviour unchanged.

**Scale/Scope**: Single-user local + cloud-provider flow; 5 fixed sections, 2 locales, English + Vietnamese character budget identical.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Multi-Dialect SQL Analysis** — PASS. No parser changes; grounding still uses `sqlAnalyzer` facts (tables, JOINs, CTE graph) with regex-vs-AST dual cross-check already in place. Dialect-specific tests required only if new parser-dependent logic is added (none planned).
- **II. Interactive Visualization First** — PASS. Change is confined to the Explain result panel; no graph/visualization surfaces affected, and source-line drill-down behaviour is untouched.
- **III. Real-Time Feedback Loop** — PASS. Streaming explanation UX is explicitly preserved (final output must satisfy FR-001–FR-007 after assembly).
- **IV. AI-Grounded Explanations** — PASS (strengthened). Spec FR-010 codifies grounding: never contradict parser facts, mark unverifiable claims unknown, CTE name-plus-role only.
- **V. Minimal Deployment Friction** — PASS. No new providers or credentials; server-side keys and Ollama fallback untouched.
- **Security & Privacy** — PASS. No new network paths; explanation content flows through the existing server proxy only.
- **Testing** — PASS. Plan adds Vitest unit tests (contract parse/validate, length-budget retry) plus rendering tests for the new sections.
- **Type Safety** — PASS. Strict TypeScript; new `SqlExplanation` shape fully typed, no `any`.
- **Performance** — PASS. Bounded retries (max ~2) keep generation latency finite; no >50-table rendering path touched.
- **Documentation** — PASS. New prompt contract and schema get inline comments covering algorithm, dialect notes, and limitations.

No gate violations; no Complexity Tracking entries required.

*Post-design re-check (2026-09-21, after Phase 1): all gates still PASS. Design adds no parser changes, no new providers or network paths, no visualization changes, and no Analyze changes. New artifacts: `research.md`, `data-model.md`, `contracts/explainer-output-contract.md`, `quickstart.md`. Strict typing and Vitest coverage carry into `tasks.md`.*

## Project Structure

### Documentation (this feature)

```text
specs/011-upgrade-sql-explainer/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── smart-sql-editor/
│   │   └── components/
│   │       └── AiSqlExplainer.tsx   # result panel: render new 5 sections
│   └── api/ai/
│       ├── generate/                # unchanged proxy routes
│       └── generate/stream/         # unchanged streaming proxy
├── lib/
│   ├── ai/
│   │   ├── aiService.ts             # prompt contract, SqlExplanation type, parse/validate, length retry
│   │   └── aiSpeech.ts              # narration script follows new sections
│   ├── sql/
│   │   └── sqlAnalyzer.ts           # unchanged grounding source
│   └── store.ts / i18n.ts           # unchanged config + locale plumbing
├── locales/
│   ├── en.ts / vi.ts                # new section labels + notices
└── sample/                          # sample queries for quickstart validation

tests/
└── unit/
    └── aiService.test.ts            # extended: contract + length-budget tests
```

**Structure Decision**: Single-project Next.js layout. The feature touches only the existing AI-explain vertical (`lib/ai` → Smart SQL Editor panel → en/vi locales); no new top-level directories, backends, or mobile targets.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations — table intentionally left empty.
