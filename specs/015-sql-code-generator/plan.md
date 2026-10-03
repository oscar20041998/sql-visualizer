# Implementation Plan: SQL → Code Generator

**Branch**: `015-sql-code-generator` | **Date**: 2026-10-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/015-sql-code-generator/spec.md`

## Summary

Add a SQL → Code Generator input tab to the existing `/query-input` page. Reuse the installed SQL AST parser where its dialect grammar is available, normalize parsed DDL/SELECT facts into a framework-neutral semantic model, classify the statement deterministically, and render Java/JPA Entity or DTO source. Keep generation local and deterministic; unsupported grammar or ambiguous output shape must produce actionable warnings instead of guessed source. The MVP exposes copy, download, regenerate, and reset actions. Additional language renderers remain an architectural extension point, not MVP deliverables.

## Technical Context

**Language/Version**: TypeScript 5, strict mode; React 19

**Primary Dependencies**: Next.js 15.5.18; existing `node-sql-parser` 5.4.0 and `dt-sql-parser` 4.3.1; existing `@monaco-editor/react` 4.7.0 and Monaco 0.55.1; Zustand 4.5.5; Vitest 2.1.9

**Storage**: None. SQL, options, and generated preview remain transient page state; no SQL or generated code persistence is introduced.

**Testing**: Vitest with jsdom and Testing Library; focused unit coverage for parser normalization, classification, type/naming maps, renderers, and UI state transitions.

**Target Platform**: Existing Next.js browser application, desktop and mobile responsive layouts

**Project Type**: Web application (Next.js App Router)

**Performance Goals**: Parse, classify, and render supported statements with a preview visible within 2 seconds for input representing up to 100 relationships; tab selection and reset remain immediate.

**Constraints**: Reuse existing parser dependencies; do not use an LLM for deterministic parsing or code generation; do not persist SQL/generated code; do not invent database constraints or business rules. `node-sql-parser` has verified MySQL, PostgreSQL, and Transact-SQL grammars but no Oracle grammar. Oracle-specific or otherwise unsupported constructs must be reported and must not produce confidently mapped output. Java/JPA is the only MVP renderer.

**Scale/Scope**: One SQL statement per generation run; MVP outputs Java/JPA Entity and DTO/projection source. DML classification is included, but repository/service/controller generation and non-Java renderers are outside this spec's accepted MVP scenarios.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Plan response |
|---|---|---|
| I. Multi-Dialect SQL Analysis | PASS WITH EXPLICIT DIALECT BOUNDARY | Use AST-backed parsing for installed MySQL, PostgreSQL, and SQL Server grammars. Keep dialect-aware normalization and regression cases. Oracle AST support is absent from installed parsers; do not silently claim Oracle generation. Report unsupported Oracle syntax and document/test that boundary. Existing SQL analysis is not replaced or weakened. |
| II. Interactive Visualization First | PASS | The feature is an editor/code-preview workflow, not a replacement for existing relationship visualization. Preserve the existing route, tab accessibility pattern, and interactive SQL Visualizer workflows. |
| III. Real-Time Feedback Loop | PASS | Classification/diagnostics update from the current input; source generation is an explicit Regenerate action, replacing the prior output, per clarification. No full-page reload or AI round trip. |
| IV. AI-Grounded Explanations | PASS / NOT APPLICABLE | No AI call is needed. Warnings and inferred types are derived from parser facts and deterministic rules. |
| V. Minimal Deployment Friction | PASS | No new service, credentials, external API, or runtime dependency is required. |
| Quality: tests and type safety | PASS | Keep strict TypeScript, add Vitest coverage for dialect-specific AST normalization and unsupported cases. |
| Quality: performance and documentation | PASS | Meet the 2-second preview goal; document parser limits and add comments only around non-obvious dialect-specific parsing behavior. |

**Gate result**: Pass with the Oracle limitation explicitly bounded. Full Oracle grammar support is not available in the current dependency set; unsupported Oracle input must be identified rather than treated as valid source for Java generation.

## Project Structure

### Documentation (this feature)

```text
specs/015-sql-code-generator/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── code-generator-ui.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/
│   └── query-input/
│       ├── page.tsx
│       └── components/
│           ├── TabNavigation.tsx
│           └── CodeGeneratorPanel.tsx
├── lib/
│   ├── codegen/
│   │   ├── model.ts
│   │   ├── parseSql.ts
│   │   ├── classifySql.ts
│   │   ├── naming.ts
│   │   ├── typeMapping.ts
│   │   └── javaJpaRenderer.ts
│   └── store.ts
└── locales/
    ├── en.ts
    └── vi.ts

tests/
└── unit/
    └── codegen/
        ├── parseSql.test.ts
        ├── classifySql.test.ts
        ├── typeMapping.test.ts
        ├── naming.test.ts
        ├── javaJpaRenderer.test.ts
        └── CodeGeneratorPanel.test.tsx
```

**Structure Decision**: Extend the existing App Router page and its accessible input-mode tabs; add pure TypeScript domain/generation modules under `src/lib/codegen`, including a renderer registry, plus a dedicated target-controls component and code-generator panel under `src/app/query-input/components`; add focused tests under the established `tests/unit` tree. The selected route is `/query-input` (the repository's canonical route); no `/input-query` alias is introduced. Reuse Monaco for output preview and keep generated preview/options local to the feature UI.

## Design Decisions

- Normalize DDL and SELECT ASTs into one dialect-neutral semantic model before classification or rendering.
- Keep parser/dialect adapters separate from classification, Java type mapping, naming, and Java/JPA rendering.
- Entity output requires table metadata; SELECT output is DTO/projection by default unless a deterministic entity-like shape is proven. Aggregations and unsupported expressions receive warnings and never become Entities silently.
- Relationship mappings are generated only from explicit foreign-key metadata. Generate unidirectional mappings by default; do not infer cascade, fetch, orphan removal, validation rules, or business behavior.
- Unknown SQL types remain explicit unresolved types with warnings; do not coerce them to an unrelated Java type.
- Java/JPA Entity and DTO are the MVP output types. DML is classified and explained, but persistence methods and service/controller layers are deferred because the accepted scenarios do not define their target framework or endpoint behavior.
- The preview uses the existing Monaco dependency, with Copy/Download/Regenerate/Reset. Regeneration replaces prior output; no history or autosave is added.
- Maintain compatibility with the existing input mode union and Zustand state. The new mode must not alter persisted analysis, dialect, or settings semantics.

## Post-Design Constitution Check

- Parser output remains dialect-specific at the boundary and normalized before business rules; tests must pin the three available AST grammars and the Oracle unsupported path.
- The new generator is additive; existing Explain, Analyze, Optimize, and Visualize workflows remain unchanged and must be smoke-tested.
- TypeScript strict mode and deterministic, non-AI generation remain mandatory.

**Post-design gate result**: Pass with the same explicit Oracle grammar boundary stated above. No new service, persistence, or AI dependency is introduced.

## Complexity Tracking

No constitution violations are proposed. The separate parser adapter and semantic model are required to keep SQL parsing independent of language/framework rendering, as specified.
