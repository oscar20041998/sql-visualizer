# Implementation Plan: Requirement-Driven Query Optimization

**Branch**: `004-nl-requirement-optimize` | **Date**: 2026-09-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-nl-requirement-optimize/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Add a new "requirement-driven" optimize mode to the existing Smart SQL Editor Optimize workflow: the user types a plain-language requirement (optionally naming tables), the system generates a candidate query via the existing AI-optimize pipeline (new prompt/result path), computes a parser-based structural diff against the original query to label it as a semantic change when applicable, and only applies it to the editor after explicit user confirmation — all while leaving the existing lint/alert-driven automatic optimizer and the existing semantics-preserving NL instruction mode untouched.

## Technical Context

**Language/Version**: TypeScript (Next.js 14 App Router), strict mode

**Primary Dependencies**: React, Zustand (`src/lib/store.ts`), Monaco Editor, existing `aiService.ts`/`aiProviders.ts` AI call layer, `sqlAnalyzer.ts` (regex-based parser), `dt-sql-parser` (AST cross-check per constitution I)

**Storage**: N/A — all new entities (`RequirementInput`, `CandidateQuery`, `SemanticChangeSummary`) are runtime-only state, not persisted (matches existing `SqlOptimizationResult` handling)

**Testing**: Vitest (`vitest.config.ts`), colocated `*.test.ts` files, following existing patterns in `src/lib/sql/*.test.ts`

**Target Platform**: Web (browser), Next.js server for AI proxy routes only (`/api/ai/generate`)

**Project Type**: Web application (single Next.js app, no separate frontend/backend split)

**Performance Goals**: Candidate generation streams incrementally like the existing optimize call (no new fixed latency budget beyond the existing AI-call streaming UX); structural diff computation must stay well under the constitution's 1s/50-table analysis budget since it reuses existing `analyzeSql`

**Constraints**: No live database schema/catalog exists in this codebase (see research.md R3) — table validation is best-effort against the analyzed query's own tables plus the generic DB-knowledge RAG index, not an authoritative schema check; existing lint-driven optimizer and NL-instruction mode must remain byte-for-byte behaviorally unchanged (FR-008, US3)

**Scale/Scope**: Single new modal mode + one new `aiService.ts` function + one new diff-summary utility function; no new pages, routes, or persisted data

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Multi-Dialect SQL Analysis**: Satisfied — candidate generation and its diff both go through the existing `analyzeSql()` parser, which already covers all 4 dialects; no new dialect-specific parsing is introduced.
- **II. Interactive Visualization First**: Satisfied — the change summary and candidate are surfaced in the existing modal/editor-diff UI (reused, not a new text-only output).
- **III. Real-Time Feedback Loop**: Satisfied — candidate generation streams via the existing streaming call plumbing, consistent with current Optimize UX.
- **IV. AI-Grounded Explanations**: Satisfied — semantic-change labeling is grounded in `analyzeSql` parser output (R2), not solely the model's self-report; unresolved table references are explicitly reported rather than guessed (R3).
- **V. Minimal Deployment Friction**: Satisfied — no new server-side credentials, no new external service; reuses existing AI provider proxy.
- **Quality Standards (Testing/Type Safety)**: New pure functions (`buildRequirementChangeSummary`) and the new `aiService.ts` path require unit tests and strict typing per constitution Quality Standards — tracked in quickstart.md and to be enumerated in tasks.md.

No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/004-nl-requirement-optimize/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory: this feature adds no new external interface (no new API route, no new public library surface) — it extends existing internal `aiService.ts` functions and an existing UI modal, consistent with how spec 002's NL-instruction mode was implemented.

### Source Code (repository root)

```text
src/
├── lib/
│   ├── ai/
│   │   └── aiService.ts               # + generateRequirementCandidate(), + RequirementCandidateResult type
│   └── sql/
│       ├── sqlAnalyzer.ts             # unchanged — reused as-is
│       └── optimizeRegression.ts      # + buildRequirementChangeSummary()
└── app/
    └── smart-sql-editor/
        └── components/
            ├── SmartSQLEditor.tsx          # + requirement-mode state, submit handler, staleness guard
            └── OptimizeQueryModal.tsx      # + requirement-mode tab/section, change-summary display

# Tests (colocated, matching existing project convention)
src/lib/sql/optimizeRegression.test.ts   # + cases for buildRequirementChangeSummary
src/lib/ai/aiService.test.ts             # + cases for candidate prompt/result parsing (if such a test file exists; otherwise colocate per nearest existing pattern)
```

**Structure Decision**: Single Next.js application (no separate frontend/backend). This feature is implemented entirely within the existing `src/lib/ai`, `src/lib/sql`, and `src/app/smart-sql-editor` directories — no new top-level modules, routes, or projects.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations — table omitted.
