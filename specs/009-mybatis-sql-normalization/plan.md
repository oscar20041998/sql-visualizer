# Implementation Plan: MyBatis XML to Pure SQL Normalization

**Branch**: `duyvt7` (feature dir `009-mybatis-sql-normalization`) | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-mybatis-sql-normalization/spec.md`

## Summary

Replace the current tag-stripping MyBatis path with a dedicated conversion library that reads a mapper XML file into a structural model (statements, reusable fragments, dynamic constructs), evaluates those constructs against the developer's parameter values, and renders pure SQL for the existing analyzer. The library lives in `src/lib/sql/mybatis/` and is reached through the four MyBatis exports that `src/lib/sql/sqlAnalyzer.ts` already publishes, so `src/app/query-input/page.tsx` keeps working while gaining statement selection, conversion findings, and an analysis gate for statements that cannot be converted faithfully. Nothing downstream of the conversion learns about MyBatis.

## Technical Context

**Language/Version**: TypeScript 5 (strict, `noEmit`, `jsx: preserve`), React 19.0.3, Next.js 15.5.18 App Router.

**Primary Dependencies**: no new runtime dependency. Browser `DOMParser` for XML reading; existing `@/lib/sql/sqlAnalyzer` (`analyzeSql`, `SqlDialect`); `@/lib/i18n` with `src/locales/en.ts` + `src/locales/vi.ts`; `zustand` store (shape unchanged); `lucide-react` icons; `QueryInputPanel` / `LintingAlerts` UI building blocks. Dev/test: Vitest 2.1.9, jsdom 30, `@testing-library/react`, existing `tests/utils/test-setup.ts`.

**Storage**: no new persistence. Mapper XML, parameter values and resolved SQL stay in the existing store fields (`myBatisXml`, `myBatisParams`, `resolvedSql`); conversion results are page-local derived state. Query history keeps receiving the analysed SQL exactly as today.

**Testing**: `npm test` (Vitest, jsdom). New unit suites under `tests/unit/mybatis-*.test.ts(x)` plus a golden corpus under `tests/fixtures/mybatis/` (FR-041). The existing `tests/unit/query-input-*.test.tsx` suites are the regression gate for FR-036–FR-038 and must stay green.

**Target Platform**: browser, the existing client-rendered `/query-input` route. Conversion code must stay isomorphic-safe (no Node-only APIs, no server route, no `fs`); it is never imported by a route handler.

**Project Type**: single Next.js web application (`src/app` routes + `src/lib` libraries + `tests/`).

**Performance Goals**: SC-005 — a mapper file of up to 200 mapped statements or 512 KB converts in under 1 second; pathological input (recursive fragments, oversized files) terminates in under 5 seconds; editing a parameter value re-resolves the current statement without re-parsing the XML (FR-035).

**Constraints**: FR-031/FR-032 (untrusted input: no DTD/entity resolution, no expression execution, bounded size, depth and expansion); FR-042 (structural model is mandatory, pattern-based markup removal is not an accepted mechanism); FR-038 (statements without dynamic constructs convert to today's SQL); FR-037 (existing input modes, actions and states preserved); HTML/React escaping only — no `dangerouslySetInnerHTML`.

**Scale/Scope**: mapper files of 1–200 statements; ≥16 golden fixtures covering every named construct, multi-statement, unresolved and hostile cases; 2 new UI surfaces inside the existing page; 1 new library folder (`src/lib/sql/mybatis/`, ~8 modules) and 4 legacy exports converted to delegations.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment |
|-----------|------------|
| I. Multi-Dialect SQL Analysis | PASS — the conversion is dialect-neutral and passes dialect-specific SQL through untouched (FR-033); every converted statement still enters the existing dual cross-check in `sqlAnalyzer` (regex analysis + `dt-sql-parser` AST). The corpus includes MySQL, PostgreSQL, SQL Server and Oracle fixtures, satisfying the "documented and tested per dialect" obligation. |
| II. Interactive Visualization First | PASS — no visualization surface changes. The two new surfaces are workflow controls (statement picker, findings), not analysis visuals. |
| III. Real-Time Feedback Loop | PASS — the resolved SQL and findings refresh on each parameter edit without a reload (FR-035); the model is parsed once per XML text and only the selected statement is re-resolved. |
| IV. AI-Grounded Explanations | PASS — AI features keep consuming parser output. Because the analyzer only ever sees pure SQL (FR-034), AI explanations remain grounded in parser facts rather than XML artefacts. |
| V. Minimal Deployment Friction | PASS — no new dependency, no credential, no server round-trip, no change to provider configuration. |
| Quality Standards — Testing | PASS — Vitest unit suites plus the golden corpus; dialect-specific and edge-case behaviour recorded in fixture expectations. |
| Quality Standards — Type Safety | PASS — strict TypeScript; `any` avoided (ESLint `no-explicit-any` is a warning here, so new `any` would surface in review); model types live in `types.ts` and are reused instead of re-declared. |
| Quality Standards — Performance | PASS — SC-005 matches the constitution's 1-second parser budget; bounds are enforced in `xmlDocument.ts` (size, depth, expansion) and tested. |
| Quality Standards — Documentation | PASS — each new module documents its algorithm, the MyBatis semantics it implements, and its known limitations (unsupported expressions, unresolved-construct policy). |

No violations, so Complexity Tracking is intentionally empty.

## Project Structure

### Documentation (this feature)

```text
specs/009-mybatis-sql-normalization/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── mybatis-conversion.md      # Conversion library contract
│   └── query-input-mybatis-ui.md  # Query Input page contract
├── spec.md
├── checklists/requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── lib/
│   └── sql/
│       ├── sqlAnalyzer.ts          # Analysis engine. Its 4 MyBatis exports become thin delegations to the new library; no analysis behaviour changes.
│       └── mybatis/                # NEW conversion library (pure TS, no 'use client')
│           ├── conversion.ts       # Public entry: parseMapperXml(text) and resolveStatement(model, selection, params, dialect)
│           ├── types.ts            # Model, result, finding and severity types
│           ├── xmlDocument.ts      # Safe XML reading: size guard, DOCTYPE/entity neutralisation, DOMParser wrapper, node helpers
│           ├── mapperModel.ts      # Namespace, statement table, fragment table, statement metadata + source offsets
│           ├── fragmentResolver.ts # <include>/<property> expansion, property substitution, cycle + depth protection
│           ├── dynamicEvaluator.ts # <if>/<choose>/<when>/<otherwise>/<where>/<set>/<trim>/<foreach>/<bind> semantics
│           ├── conditionEvaluator.ts # Safe expression subset for test= expressions (no eval/Function)
│           ├── parameterResolver.ts  # #{...} / ${...} references, value lookup, dialect-aware literal rendering
│           └── renderer.ts         # Node tree → SQL assembly and cosmetic whitespace normalisation
└── app/
    └── query-input/
        ├── page.tsx                # Memoised conversion, statement selection state, findings state, analysis gate
        └── components/
            ├── StatementPicker.tsx     # NEW: choose which mapped statement is analysed
            ├── ConversionFindings.tsx  # NEW: unresolved constructs and warnings from the conversion
            ├── ActionButtons.tsx       # MODIFIED: optional blocked reason for the primary CTA
            └── ...                     # MyBatisPanel / ParameterConfig / PreviewPanel unchanged

src/locales/
├── en.ts                           # MODIFIED: conversion strings
└── vi.ts                           # MODIFIED: same keys in Vietnamese

tests/
├── unit/
│   ├── mybatis-xml.test.ts          # NEW: extraction, CDATA, entities, comments, metadata, selectKey
│   ├── mybatis-dynamic.test.ts      # NEW: if/choose/where/set/trim/foreach/bind semantics
│   ├── mybatis-fragments.test.ts    # NEW: include/property/namespace/nesting/cycles
│   ├── mybatis-parameters.test.ts   # NEW: #{...} vs ${...}, nested paths, options, unsupplied values
│   ├── mybatis-safety.test.ts       # NEW: hostile XML, size/depth/expansion bounds, no execution
│   ├── mybatis-corpus.test.ts       # NEW: golden corpus runner over tests/fixtures/mybatis
│   ├── mybatis-query-input.test.tsx # NEW: statement picker, findings, analysable/blocked states
│   └── query-input-*.test.tsx       # EXISTING regression suites (must stay green)
└── fixtures/
    └── mybatis/                     # NEW golden corpus (FR-041): <case>.xml + <case>.params.json + <case>.expected.sql
```

**Structure Decision**: Option 1 (single project) applies — this repository is one Next.js application with libraries in `src/lib`, route UI in `src/app`, and Vitest suites in `tests/unit`. The conversion therefore becomes a new library folder (`src/lib/sql/mybatis/`) rather than a service, route or package: it must be importable from client components, unit tests and the existing analyzer module alike, and FR-042 forbids embedding the algorithm in a UI component.

## Post-Design Constitution Re-Check

*Re-evaluated after the Phase 0 and Phase 1 artefacts were produced.*

| Principle | Post-design result |
|-----------|--------------------|
| I. Multi-Dialect SQL Analysis | PASS — `data-model.md` keeps the dialect on the resolution input and `contracts/mybatis-conversion.md` requires dialect-neutral pass-through with dialect-specific literal rendering; `quickstart.md` covers all four dialects in the corpus. |
| III. Real-Time Feedback Loop | PASS — the contract fixes a "parse once, resolve per parameter edit" split (`parseMapperXml` vs `resolveStatement`), which is what keeps the preview live without re-parsing. |
| IV. AI-Grounded Explanations | PASS — `contracts/query-input-mybatis-ui.md` states that only `ResolutionResult.sql` reaches `analyzeSql`, so no conversion artefact can reach AI prompts. |
| Quality Standards (tests, types, performance, documentation) | PASS — unit suites plus golden corpus, typed models in `types.ts`, explicit performance bounds, and per-module documentation of semantics and limitations. |

No new violations were introduced by the design, so Complexity Tracking remains empty.

## Complexity Tracking

No constitution violations, so this section is intentionally empty.
