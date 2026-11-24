# Implementation Plan: Database Object Intelligence

**Branch**: `develop` (actual Git branch); Spec Kit feature identifier: `022-database-object-intelligence` | **Date**: 2026-11-22 | **Spec**: [spec.md](spec.md)

**Input**: Full master-prompt vision, restricted to missing capabilities; preserve all existing features and confirm Hallmark styling with the user.

## Summary

Inventory actual dialect/object support and existing behavior first. Incrementally extend the existing SQL analysis, source/graph UI and AI workflows with session-only multi-object input, evidence-backed object/statement analysis, directed dependency/impact views, and optional consent-gated AI. Label partial/unsupported results; never replace existing flows or claim unsupported capability. The full initiative is complete only when targets are validated or exclusions explicitly approved.

## Technical Context

**Language/Version**: TypeScript (strict, ES2017 target), React 19, Next.js 15 App Router.

**Primary Dependencies**: Existing `dt-sql-parser`, `node-sql-parser`, SQL analyzer and MyBatis conversion, React Flow / `@xyflow/react`, Monaco, Zustand, existing AI providers and prompt registry; no new dependencies planned without demonstrated need.

**Storage**: Ephemeral in-memory session state for supplied definitions, analyses and consent; existing persisted settings/dialect and history stay unchanged.

**Testing**: Vitest + Testing Library/jsdom, existing fixtures; verified `npm test` commands in `.specify/memory/tdd-profile.md`. Add focused TDD, parser matrices, contract/integration, security, accessibility and browser review.

**Target Platform**: Existing browser-based application and its server-side AI routes; desktop, tablet and mobile, Vietnamese/English, light/dark.

**Project Type**: Existing Next.js web application and server routes.

**Performance Goals**: Constitution/SC-007 require query analysis and graph rendering for >50 tables within 1 second on the specified single-GPU reference machine. Actual hardware, measurement and large-object responsiveness baseline must be recorded before release; no result is assumed.

**Constraints**: No SQL execution or implicit database connection; current access restrictions and workflows unchanged; non-persistent analysis session; provider-scoped, cancellable consent for new external AI sends; untrusted input and no secrets in context or logs.

**Scale/Scope**: Four dialects; query, CTE, view, procedure, function and trigger; multi-file/multi-definition sessions. Actual syntax scope is established by tested capability matrix, with unsupported coverage explicit.

## Constitution Check

| Principle | Design disposition | Evidence/gate |
|---|---|---|
| I. Multi-dialect and AST cross-check | Planned, **not yet satisfied**. Preserve current analyzer and extend cross-checks where absent; verify four dialects and disclose unsupported constructs. | Current validator cross-check is incomplete for SQL Server/Oracle (`research.md`); block release of claims without validated cross-check. |
| II. Visualization first | Reuse existing graph system, preserve query graph behavior, add evidence-backed object graph and source navigation, plus accessible list. | Cycle, direction, graph/list consistency and source link tests. |
| III. Real-time feedback | Preserve existing editor feedback and incremental/streaming presentation; new AI is explicitly requested, not sent on every edit. | Regression tests and browser validation; no full reload, no extra per-keystroke AI calls. |
| IV. AI grounding | Reuse parsed facts and prompt registry; distinguish static evidence and suggestions; cite sources where available. | Grounding/adversarial tests and visible limitations; unsupported constructs never become asserted facts. |
| V. Deployment and security | Existing Ollama/cloud configuration and server-side authorization retained; add consent for new external sends; isolate guest/access rules and secrets. | Provider/guest/failure/consent tests; no new dependency or service assumed. |
| Quality and performance | TDD/unit/integration, dialect cases, type-check/build, feature docs, accessibility, user review and SC-007 benchmark. | All are pending; verified reference hardware and actual timings required before release. |

**Pre-research design gate**: No proposed constitutional exception. Existing evidence reveals incomplete dialect cross-checks, so this is a required implementation/release gate rather than a waiver or a claimed pass.

**Post-design gate**: Contracts preserve the same obligations; no design-time violation justified. Cross-check implementation, exact hardware benchmark, browser review and five-user evaluation remain unverified and block relevant release/completion.

## Project Structure

### Documentation

```text
specs/022-database-object-intelligence/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   ├── workspace.md
│   └── validation-matrix.md
├── quickstart.md
└── tasks.md             # generated separately by /speckit-tasks
```

### Existing and proposed source locations

```text
src/app/query-input/                         # preserve current workflow; add entry only as approved
src/app/cte-analysis/                        # preserve existing CTE experience
src/app/relationship-graph-visualizer/        # reuse graph presentation where appropriate
src/app/smart-sql-editor/                    # preserve editor, explanation and compare flows
src/components/WorkspaceLayout.tsx           # persistent shell and protected routes
src/lib/sql/                                 # extend existing analysis/validation, source mapping
src/lib/sql/mybatis/                         # existing conversion; no replacement
src/lib/codegen/parseSql.ts                  # existing parser adapter, bounded by actual support
src/lib/store.ts                             # existing state; non-persisted session slice if needed
src/lib/ai/                                  # provider, prompts, comparison and guard reuse
src/app/api/ai/                              # existing authenticated provider routes
src/locales/en.ts, src/locales/vi.ts          # both languages
tests/unit/ and tests/fixtures/              # focused behavior and dialect evidence
```

**Structure Decision**: Extend existing modules and shared workspace. Add focused object-analysis modules/components under existing directories only after the inventory establishes the missing responsibilities; no parallel parser, state system, AI layer, graph engine or shell. Exact new files follow the capability audit and approved visual direction.

## Delivery Plan and Gates

1. **Baseline and capability audit** (FR-001–003): capture existing critical journeys, parser/graph/AI boundaries and reproducible baseline; build the four-dialect × six-object matrix with fixture-level evidence. Distinguish current behavior, target and unknown. Identify prerequisite fixes to constitutional cross-check coverage; do not claim support from grammar presence.
2. **Session and ingestion** (FR-004–005, FR-027–030): add session-only multi-paste/file ingestion, dialect provenance and conservative identity; implement explicit keep/replace, unresolved ambiguity, revision invalidation, navigation/reload/sign-out behavior and local-only input handling. Preserve MyBatis and history.
3. **Analysis foundations and object slices** (FR-006–012, FR-015–016): incrementally add evidenced detection, statuses, source locations and view, procedure, function and trigger extraction. Reuse existing analyzer on reliably extracted statements; add four-dialect golden tests, cross-checks, partial/unsupported handling and metadata/findings with provenance.
4. **Graph, impact and workspace** (FR-010–016, FR-023–025): share directed evidenced dependency model across graph/list, cycle-safe traversal and reverse impact. Extend workspace with source/statement selection, empty/error/partial states and accessible responsive interaction. Preserve approved Query Input design; obtain user style confirmation at design and review.
5. **AI integration** (FR-017–022): reuse provider configuration, server authorization, prompts and comparison. Implement per-session provider-specific confirmation for new external sends, bounded context, clear attribution, safe explicit apply, cancellation and failure isolation without changing existing flows.
6. **Hardening and release** (SC-001–009): complete targeted and full regression, type-check/build, secure input/consent tests, locale/accessibility/browser checks, Hallmark sweep and user acceptance. Record performance on the reference machine, five-user outcomes and per-capability evidence. Release incrementally with transparent limitations; overall completion requires all targets validated or explicit user-approved exclusions.

Each slice follows RED → GREEN → REFACTOR with evidence, preserving existing behavior. [Validation matrix](contracts/validation-matrix.md) maps requirements to tests; [quickstart](quickstart.md) defines commands. The current 26-test UI baseline is partial and does not prove full regression.

## Complexity Tracking

No constitutional exception is proposed. Existing incomplete cross-checks, unmeasured performance and browser/user validation are explicit release blockers, not accepted violations.
