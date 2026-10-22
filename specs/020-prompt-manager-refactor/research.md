# Research: AI Prompt Management Refactor

Phase 0 for `020-prompt-manager-refactor`. Unknowns from plan.md Technical Context were resolved against the live repository. **No NEEDS CLARIFICATION items remain.**

## 1. Template storage: bundled modules vs. filesystem files vs. template library

**Decision**: Extract prompt texts into bundled TypeScript template modules under `src/lib/ai/prompts/templates/` (one module per feature), wired through `src/lib/ai/prompts/registry.ts`. No filesystem reads, no new dependency.

**Rationale**: The repository's established convention is template-literal prompt constants (`src/lib/sql/dashboard/aiPrompts.ts`; `EXPLAIN_SQL_PROMPT`, `SEMANTIC_BRIEF_PROMPT`, `DOCS_CONSULTANT_*` in `aiService.ts`). Several prompts are assembled in the browser before the request is sent, so filesystem loading would force a server round-trip or bundler plugin; fs behavior differs across `next dev` / `next build` / the Netlify plugin in `package.json`, adding deployment risk against constitution principle V.

**Alternatives considered**: (a) `.md` files + server-side fs — rejected: changes where prompts may be built, adds packaging and path-handling surface, gains no behavior; (b) off-the-shelf template engine (Handlebars/Nunjucks-class) — rejected: spec forbids a template framework without clear need and engines risk whitespace/escaping transforms that threaten byte parity (FR-006); (c) leave constants in `aiService.ts` — rejected: fails centralization (FR-002, SC-005).

## 2. Placeholder syntax and validation strategy

**Decision**: `{{paramName}}` (camelCase names). Two-stage validation: (1) registry audit test — every placeholder in every template must belong to that prompt's parameter schema; (2) render-time — missing required parameters raise an actionable error before any provider call. Rendering is a single left-to-right pass; values are inserted verbatim and never re-scanned, so `{{` inside user SQL/XML is content, not a placeholder.

**Rationale**: Verified search — zero `{{` occurrences in any prompt-bearing module (`src/lib/ai/*.ts`, `src/lib/sql/dashboard/aiPrompts.ts`); the only `{{…}}` in the repo is i18n interpolation (`metricsDeepNestingMessage` in `src/locales/en.ts`/`vi.ts` uses `{{level}}`), confirming `{{}}` is the repo's existing placeholder idiom. Single-pass fill makes unresolved-placeholder leakage impossible by construction (SC-003) and preserves multiline/special characters byte-for-byte (FR-006).

**Alternatives considered**: (a) `${...}` interpolation — rejected: collides with existing `${}` usage inside prompt-building code and cannot be audited after render; (b) positional `%s` substitution — rejected: unnamed parameters violate "named and validated"; (c) whole-message post-render `{{` scan — rejected: would falsely flag `{{` arriving inside parameter values.

## 3. Registry and renderer design

**Decision**: A typed registry (`Record<PromptId, entry>` with per-prompt parameter interfaces) plus a pure `renderPrompt(id, params)` function: look up → validate required/optional-with-defaults → single-pass fill → return messages with roles/order taken from the template entry. Error taxonomy: unknown prompt ID, missing required parameter, template/schema placeholder mismatch (audit-time). Renderer does no I/O and never logs SQL/prompt payloads; on runtime failure the caller falls back to the feature's existing provider/request error path while the actionable detail goes to a maintainer-facing log (Clarification Q3).

**Rationale**: Prompt IDs are static call sites, so TypeScript strict mode gives compile-time coverage of required parameters while runtime validation produces the actionable messages SC-006 requires; a pure function keeps unit tests trivial and adds zero latency.

**Alternatives considered**: (a) class-based service/DI container — rejected: disproportionate for a pure mapping layer; (b) validation only at build time — rejected: SC-006 demands actionable runtime errors too.

## 4. Language/locale handling

**Decision**: Preserve each source prompt's existing locale mechanism verbatim. Sources that branch per locale today (`Record<Locale, …>` in `aiService.ts`, `locale` parameters in `aiPrompts.ts`) keep that shape as per-locale templates/entries; the locale passed in is whatever the caller already passes from `src/i18n.ts`. No central locale resolution change, no new default, no template duplication beyond what the source already had.

**Rationale**: FR-009/FR-010 and Clarification Q2 — any behavior change (making a feature follow the app language when it did not, or vice versa) is forbidden in this feature; discrepancies are recorded in the inventory with a proposed separate fix instead.

**Alternatives considered**: (a) one template with an embedded language switch — rejected: changes prompt text composition and would rewrite wording; (b) syncing all prompts to the app locale now — rejected: explicitly out of scope by Q2.

## 5. Characterization baseline technique

**Decision**: Three-layer baseline per feature: (1) **message snapshots** — unit tests capture rendered messages (roles, order, exact strings) through the existing code path before migration; (2) **request snapshots** — existing `fetch` mocks capture request bodies/settings; (3) **response fixtures** — representative mocked responses asserting identical parsing and UI-consumed fields. Baselines come from the pre-change implementation only and are never edited to green a test.

**Rationale**: Model output is nondeterministic (spec Assumptions), so parity is proven at the message/request/application-result layers, matching FR-011/FR-013 and SC-001; mocked `fetch` keeps unit tests network-free (FR-012).

**Alternatives considered**: (a) live-model A/B comparison — rejected: nondeterministic, needs credentials, violates no-network unit tests; (b) hand-written expected outputs — rejected: spec forbids newly designed outputs as baseline.

## 6. Pilot feature and migration order

**Decision**: Pilot on `src/lib/ai/formatErrorAi.ts` (format-error diagnostics): self-contained prompt → parsed contract with existing test coverage and a small blast radius. Order after pilot: `sqlComparisonAi.ts` → `databaseAssistant.ts` → `aiService.ts` constants feature-by-feature (docs consultant → explain SQL/CTE → structured explain → semantic brief/optimize) → remaining inventory rows (SQL code generator, MyBatis/SQL conversion, dashboard builders) → cleanup of obsolete constants → final validation.

**Rationale**: The source task document's Stage 4 requires one representative feature with old-vs-new comparison before continuing; starting the pilot on the largest file (`aiService.ts`, ~3,000 lines) would put the highest-risk code first, violating the incremental risk reduction of Stages 5–6.

**Alternatives considered**: (a) pilot inside `aiService.ts` — rejected: highest blast radius first; (b) no pilot, migrate everything at once — rejected: contradicts FR-014/Stages 4–5.

## 7. Inventory artifact location

**Decision**: `specs/020-prompt-manager-refactor/prompt-inventory.md`, created at implement Stage 1, one row per discovered prompt with all FR-001 fields plus `migration status` using the state set from data-model.md (`discovered → baselined → migrated → verified`, or `deferred-risk`).

**Rationale**: The inventory is feature-scoped audit evidence; keeping it beside plan/spec/tasks makes review and the completion report (FR-017) straightforward, and plain Markdown needs no new tooling.

**Alternatives considered**: (a) `docs/` living documentation — rejected: this is a point-in-time audit, not evergreen docs; (b) comments scattered in source — rejected: not reviewable as a single artifact (FR-001 requires the inventory).

## 8. Already-centralized prompts (dashboard `aiPrompts.ts`)

**Decision**: Treat as in-scope: the inventory records them as "existing builder functions," and Stage 5 extracts their literal texts into registry templates, parameterizing only the genuinely dynamic segments (contributor lines, scores, locations) exactly as the builders do today — parity tests are the judge. They may only remain outside the registry if extraction itself would alter output text, which would then be a documented `deferred-risk` row (Clarification Q1 — deferral requires a specific output-contract risk, not mere convenience).

**Rationale**: Q1 default is migrate-everything; these builders are pure functions with locale branching, so extraction is mechanical and keeps SC-002 achievable.

**Alternatives considered**: (a) exclude them as "already fine" — rejected: SC-002 measures hard-coded prompt text in code, and two systems would remain; (b) rewrite them to a shared bilingual scheme — rejected: changes composition (FR-004).

## 9. Baseline verification and pre-existing failures

**Decision**: Before any edit, run and record verbatim: `npm test`, `npm run type-check`, `npm run lint`, `npm run build`. Any pre-existing failure is documented as baseline debt (which command, which test, symptom) and neither fixed nor attributed to this refactor.

**Rationale**: SC-004 requires zero *new* failures measured against a recorded baseline; spec Assumptions explicitly separate baseline failures.

**Alternatives considered**: fixing baseline failures first — rejected: unrelated changes violate SC-008 and the source document's diff discipline.

## 10. Path traversal, exposure, and dependency budget

**Decision**: No filesystem template loading → path traversal is impossible by construction; the renderer performs no dynamic imports. Templates live in the existing bundle graph, i.e. exactly the exposure prompts have today (they are instructions, not secrets); server-only code stays server-side, and no prompt payload or SQL content is logged. The registry/renderer is plain TypeScript — zero new dependencies (Technical Context constraint).

**Rationale**: Satisfies FR-012 (traversal prevention), FR-015 (no browser exposure of server-only code, no admin UI/storage), and constitution Security & Privacy, without adding machinery the spec forbids (Decision 1).

**Alternatives considered**: fs-based storage with root whitelists — rejected together with Decision 1(a).

## Status: Technical Context resolution

| Technical Context item | Resolved by | Outcome |
|------------------------|-------------|---------|
| Primary Dependencies (no new libs) | Decisions 1, 3, 10 | Plain-TS registry + pure renderer |
| Storage (bundled, no DB) | Decisions 1, 7 | Module templates; inventory is spec-dir Markdown |
| Testing (Vitest, no network) | Decisions 5, 9 | Characterization/parity via `fetch` mocks; baseline recorded first |
| Constraints (zero output change) | Decisions 2, 3, 4, 5, 6, 10 | Single-pass fill, verbatim text, locale preserved, pilot-first |
| Scale/Scope (~7 features) | Decisions 6, 7, 8 | Pilot → bulk → cleanup; every row accounted for |
| Performance | Decision 3 | Pure in-memory render, no I/O |
| **NEEDS CLARIFICATION items** | — | **None remain** |

