# Implementation Plan: AI Prompt Management Refactor (Centralized Prompt Templates)

**Branch**: `020-prompt-manager-refactor` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/020-prompt-manager-refactor/spec.md`

**Note**: Filled by `/speckit-plan`. Phase 0 → [research.md](./research.md); Phase 1 → [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md).

## Summary

Inventory every hard-coded AI prompt in the application (FR-001), record output-contract baselines with characterization tests, then extract the prompt texts verbatim into a centralized, typed prompt registry with a validating renderer, migrating one feature at a time (pilot first) so outgoing prompt messages and provider request settings stay byte-identical and AI outputs do not change. Templates are bundled code modules — the repository's existing convention (`src/lib/sql/dashboard/aiPrompts.ts`, prompt constants in `src/lib/ai/aiService.ts`) — with named parameters, pre-validated placeholders, and no new dependencies. Runtime render failures reuse each feature's existing error/fallback path (Clarification Q3); language behavior is preserved exactly and any discrepancy is documented, never changed (Q2); only prompts whose migration would risk an output contract may remain hard-coded, and only with documented risk (Q1).

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), React 19, Next.js 15.5 (App Router)

**Primary Dependencies**: Existing only — `src/lib/ai/aiService.ts` (provider adapter for Ollama/OpenAI/Anthropic/Gemini + hard-coded prompt constants: `EXPLAIN_SQL_PROMPT`, `EXPLAIN_CTE_PROMPT`, `EXPLAIN_SQL_STRUCTURED_PROMPT`, `SEMANTIC_BRIEF_PROMPT`, `DOCS_CONSULTANT_*`), `src/lib/ai/databaseAssistant.ts`, `src/lib/ai/formatErrorAi.ts`, `src/lib/ai/sqlComparisonAi.ts`, `src/lib/ai/aiSqlContext.ts` (context brief, unchanged), precedent builder `src/lib/sql/dashboard/aiPrompts.ts`, i18n via `src/i18n.ts` + `src/locales/{en,vi}.ts`; **no new dependencies**

**Storage**: N/A — prompt templates ship as bundled modules with the application; no database, no runtime-editable store (spec Assumptions)

**Testing**: Vitest (`npm test` = `vitest run`), `vitest.config.ts`, tests in `tests/unit/` (65 files) and colocated; providers mocked via `fetch` mocks — no network calls in unit tests

**Target Platform**: Web (browser) + Next.js server for `/api/ai/generate` and `/api/ai/generate/stream` proxy routes (keys stay server-side, unchanged)

**Project Type**: Web application (single Next.js app; no separate frontend/backend split)

**Performance Goals**: Rendering is a synchronous in-memory fill (microseconds, no I/O); constitution targets unchanged (analysis/graph >50 tables < 1s; streaming perceived latency unchanged)

**Constraints**: Zero output-contract change (SC-001/SC-008); no template framework or new library without proven need; TypeScript strict (no `any` without documented justification); no real network in unit tests; render errors must not log SQL/prompt payloads; templates are not secrets but server-only code stays server-side

**Scale/Scope**: ~7 AI features in scope (SQL Explainer, Optimize, Database Assistant, before/after comparison, SQL code generator, MyBatis/SQL conversion assistance, format-error diagnostics; final list from FR-001 inventory); prompt definitions concentrated in `aiService.ts` (~3,000 lines) plus 3 sibling modules; expected tens of templates; baseline = 65 unit test files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Pre-Phase-0 verdict: PASS** (no violations; nothing for Complexity Tracking).

| Principle | Status | Justification |
|-----------|--------|---------------|
| I. Multi-Dialect SQL Analysis | PASS | Parser/`dt-sql-parser` untouched; per-dialect prompt parameters and text preserved verbatim; characterization tests include dialect-specific inputs |
| II. Interactive Visualization First | PASS (N/A) | No UI or ReactFlow changes; SC-008 forbids layout/presentation changes |
| III. Real-Time Feedback Loop | PASS | Streaming message assembly and incremental refresh paths behave identically; US1 scenario 3 covers streaming parity |
| IV. AI-Grounded Explanations | PASS | Grounding instructions, context-brief composition (`aiSqlContext.ts`), and RAG citation wording extracted verbatim — no prompt may contradict parser facts because no prompt text changes |
| V. Minimal Deployment Friction | PASS (design constraint) | Templates bundled as modules → identical behavior for local Ollama and cloud proxy flows with no filesystem/build packaging risk; API keys remain server-side, unchanged |
| Security & Privacy | PASS | No new client exposure; no client-to-cloud LLM calls added; render errors logged without SQL/prompt payloads |
| Quality Standards | PASS | Vitest characterization + renderer + per-feature regression tests (constitution requires tests for AI integrations); TS strict types for registry/params (no `any`); no performance impact; inline comments on registry/renderer semantics |

**Post-Phase-1 re-check: PASS** — data model and contracts add no storage, no network surface, no UI, and no provider changes; renderer is a pure function (no I/O), preserving all gates above.

## Project Structure

### Documentation (this feature)

```text
specs/020-prompt-manager-refactor/
├── plan.md               # This file (/speckit-plan output)
├── research.md           # Phase 0 output — all Technical Context unknowns resolved
├── data-model.md         # Phase 1 output — prompt entities + inventory lifecycle
├── quickstart.md         # Phase 1 output — end-to-end validation guide
├── contracts/
│   ├── prompt-manager.md # Phase 1 output — renderer/registry interface contract
│   └── output-parity.md  # Phase 1 output — byte-parity invariants per feature
├── prompt-inventory.md   # FR-001 audit output (created at implement Stage 1, NOT by /speckit-plan)
└── tasks.md              # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/lib/ai/
├── prompts/                        # NEW — prompt management core (registry + renderer)
│   ├── registry.ts                 # NEW — typed PromptId → template + parameter schema map
│   ├── render.ts                   # NEW — renderPrompt(): validate → single-pass fill → unresolved scan
│   └── templates/                  # NEW — extracted prompt texts, verbatim, grouped by feature
│       ├── sqlExplainer.ts         # NEW (migrated from aiService.ts)
│       ├── optimize.ts             # NEW (migrated from aiService.ts: semantic brief/optimize)
│       ├── docsConsultant.ts       # NEW (migrated from aiService.ts: DOCS_CONSULTANT_*)
│       ├── databaseAssistant.ts    # NEW (migrated from databaseAssistant.ts)
│       ├── formatError.ts          # NEW (pilot — migrated from formatErrorAi.ts)
│       └── sqlComparison.ts        # NEW (migrated from sqlComparisonAi.ts)
├── aiService.ts                    # EXISTING — prompt constants removed; calls registry (main migration bulk)
├── databaseAssistant.ts            # EXISTING — system-message assembly via registry
├── formatErrorAi.ts                # EXISTING — pilot migration target
├── sqlComparisonAi.ts              # EXISTING — migrate after pilot
└── aiSqlContext.ts                 # EXISTING — unchanged (context brief builder)

src/lib/sql/dashboard/aiPrompts.ts  # EXISTING — already-centralized bilingual builders; register or document as-is per FR-001 inventory

src/app/api/ai/                     # EXISTING — proxy routes unchanged
src/locales/{en,vi}.ts              # EXISTING — unchanged (no language behavior changes, Q2)

tests/unit/
├── promptRender.test.ts            # NEW — renderer: params, defaults, multiline/special chars, path/placeholder safety
├── promptRegistry.test.ts          # NEW — registry ↔ inventory completeness, placeholder-name audit
└── promptParity.<feature>.test.ts  # NEW — characterization/parity per migrated feature (fixtures + fetch mocks)
```

**Structure Decision**: Single-project web app (the repository's actual layout). The prompt management core is a new sub-feature area under the existing `src/lib/ai/` module — `src/lib/ai/prompts/` — because every in-scope prompt consumer already lives under `src/lib/ai/` (plus the already-centralized dashboard builders in `src/lib/sql/dashboard/aiPrompts.ts`, which the FR-001 inventory will either register or document as-is). Tests follow the established Vitest convention in `tests/unit/` (65 existing files). No new top-level directories, no backend/frontend split, no changes to `src/app/api/ai/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**None — the Constitution Check passes with zero violations, so no complexity exceptions are recorded.**
