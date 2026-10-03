# Implementation Plan: Optimize Query Workflow Redesign

**Branch**: `002-optimize-query-workflow` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-optimize-query-workflow/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Redesign the existing "Analyze & Optimize" flow in `SmartSQLEditor` so all optimization analysis (semantic brief, structural warnings, suggestions, proposals) renders inside a single modal instead of inline panels; add a natural-language instruction input that feeds the existing semantic-brief step and must never change query semantics; keep the existing explicit confirm/discard gate (no auto-apply on stream completion) but relocate it into the modal; and, on confirmation, immediately switch the underlying editor into the existing `DiffEditor` compare view. This is a UI/flow reorganization plus one new input surface — it reuses the existing `aiService.ts` semantic-brief/optimize/proposal pipeline and structural regression check rather than replacing them.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), React 19, Next.js 15.5 (App Router)

**Primary Dependencies**: `@monaco-editor/react` (`Editor`, `DiffEditor`), `zustand` (app store), `sonner` (toasts), `lucide-react` (icons), existing `src/lib/ai/aiService.ts` (semantic brief, optimize stream, proposal repair), `src/lib/sql/sqlAnalyzer.ts` (parser facts for regression checks)

**Storage**: N/A (no new persisted entities; optimize sessions are client-side component state only, same as today)

**Testing**: Vitest (`vitest.config.ts`, `npm test`) for logic (structural regression, proposal validation, prompt formatting); no existing component-level UI test harness for `SmartSQLEditor` — new modal logic should keep pure/testable helpers separate from JSX where practical

**Target Platform**: Browser (desktop web), Next.js server for AI proxy routes under `src/app/api/ai/`

**Project Type**: Single Next.js web application (frontend + API routes in one project) — Option 1 (single project) structure applies

**Performance Goals**: Modal open/stream updates must not block the Monaco editor's main thread; incremental stream rendering (existing pattern) must continue to update at the same perceived latency as today's inline panel

**Constraints**: No new backend endpoints required (reuses existing `/api/ai/*` proxy routes and `aiService.ts` client functions); modal must be dismissible/abortable mid-stream (FR-013); must not regress existing keyboard/AbortController-based cancellation behavior

**Scale/Scope**: Single component area (`src/app/smart-sql-editor/components/SmartSQLEditor.tsx` and closely related files); no changes to other pages/features

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Multi-Dialect SQL Analysis**: N/A change to parser behavior — regression checks continue to use `analyzeSql` per active dialect. PASS.
- **II. Interactive Visualization First**: Moving analysis into a modal keeps it interactive (expand/collapse, live stream) and improves focus; the diff view remains the primary visualization for the applied change. PASS.
- **III. Real-Time Feedback Loop**: Streaming updates must continue rendering incrementally inside the modal (FR-001, User Story 1 AS3). PASS — no change to streaming mechanism, only its container.
- **IV. AI-Grounded Explanations**: Natural-language instructions must still be grounded in parser-verified facts before any rewrite (FR-003), and the structural regression check (already parser-grounded) is mandatory for every proposal (FR-006). PASS — this principle is reinforced, not weakened, by FR-004/FR-005.
- **V. Minimal Deployment Friction**: No new provider/credential handling introduced; reuses existing server-side AI config. PASS.
- No constitution violations identified. Complexity Tracking section below is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/002-optimize-query-workflow/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command) — skipped, no new external interface
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── smart-sql-editor/
│       └── components/
│           ├── SmartSQLEditor.tsx        # Existing host component — extract analysis UI into modal, add NL input
│           └── OptimizeQueryModal.tsx    # NEW — modal shell hosting semantic brief, NL input, proposals, confirm/discard
├── lib/
│   └── ai/
│       └── aiService.ts                  # Existing — semantic brief, optimize stream, proposal repair (reused, minor prompt-input extension for NL instruction)
├── locales/
│   ├── en.ts                             # Existing — add new modal/NL-instruction strings
│   └── vi.ts                             # Existing — add matching Vietnamese strings
└── styles/ (unchanged)

tests/ (co-located under existing Vitest setup, e.g. src/lib/ai/*.test.ts, src/lib/sql/*.test.ts)
```

**Structure Decision**: Single Next.js project (Option 1). No new top-level directories or backend services. The only new source file is `OptimizeQueryModal.tsx`, extracted from the inline JSX currently in `SmartSQLEditor.tsx`; existing `aiService.ts` functions are extended (not replaced) to accept an optional natural-language instruction alongside the existing lint-driven brief.

## Complexity Tracking

> No constitution violations identified — this section is not applicable.
