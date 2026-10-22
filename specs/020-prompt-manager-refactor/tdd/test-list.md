---
feature: 020-prompt-manager-refactor
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 22
planned_at: a931f41
updated_at: a931f41
suite_baseline: green
---

# Test List: AI Prompt Management Refactor (Centralized Prompt Templates)

## Outer loop: acceptance behaviors

One per acceptance criterion in `spec.md` (14 acceptance scenarios across US1–US3 plus the 8 success criteria SC-001…SC-008). Each stays red until the feature works end to end through its real entry point.

**Runner note**: the stack profile records `acceptance: null` — this repository has no end-to-end acceptance runner. Outer behaviors are therefore hosted at the highest level the repo can actually test: Vitest integration tests that drive each feature's entry function with `fetch` mocked (WEAKER than a true E2E test — recorded as such per the template rule). A15–A17 are executed as recorded commands/inspections per `quickstart.md` Scenarios 6–7 and live in `specs/020-prompt-manager-refactor/validation-results.md` / `baseline-results.md`.

| id | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| A1 | With identical input and config, a migrated feature sends byte-identical prompt messages to the provider path (roles, ordering, wording, whitespace, delimiters, parameter values) as the pre-change baseline | SC-001, FR-004 | example | DONE | `tests/unit/promptParity.formatError.test.ts` (pilot; per-feature files after) |
| A2 | Given a provider response captured pre-change, the migrated feature parses it into an identical application result with identical UI-consumed fields | SC-001, FR-008 | example | DONE | `tests/unit/promptParity.<feature>.test.ts` |
| A3 | For a feature that streams, partial-response and final behavior after migration match the pre-change baseline | FR-007, FR-008 | example | DONE | `tests/unit/promptParity.databaseAssistant.test.ts` (stream cases; pilot too if it streams) |
| A4 | On provider failure or prompt-render failure, the user-visible error and fallback match the feature's pre-change behavior | FR-005, FR-008 | example | DONE | `tests/unit/promptParity.formatError.test.ts` (error path) |
| A5 | Editing one template's instruction text changes all subsequent requests of that feature, with no other file needing edits | SC-005, FR-002 | example | DONE | `specs/020-prompt-manager-refactor/validation-results.md` (edit drill, T025) |
| A6 | A missing required parameter produces an actionable error and no request is sent to the provider | SC-006, FR-005 | example | DONE | `tests/unit/promptRender.test.ts` |
| A7 | Multiline SQL/XML containing quotes, braces, and backticks reaches the provider message byte-identical | FR-006 | example | DONE | `tests/unit/promptRender.test.ts` |
| A8 | An unknown prompt identifier produces an actionable error and no provider call occurs | SC-006, FR-005 | example | DONE | `tests/unit/promptRender.test.ts` |
| A9 | No template access outside the registered prompt ids occurs, and no unresolved placeholder reaches a provider message | SC-003, FR-005, FR-012 | example | DONE | `tests/unit/promptRender.test.ts`, `tests/unit/promptRegistry.test.ts` |
| A10 | Empty-string values and omitted optionals render exactly as pre-change (empty stays empty; a default applies only when the parameter is omitted) | FR-003, FR-006 | example | DONE | `tests/unit/promptRender.test.ts` |
| A11 | With the application language set, each AI request's language context matches the pre-change behavior for that feature | FR-009 | example | DONE | `tests/unit/promptParity.locales.test.ts` |
| A12 | After the user changes the application language, subsequent requests follow the newly selected language exactly as before the change | FR-009 | example | DONE | `tests/unit/promptParity.locales.test.ts` |
| A13 | A feature that does not follow the application language is documented with a proposal while zero language behavior changes ship | SC-007, FR-010 | example | DONE | `specs/020-prompt-manager-refactor/prompt-inventory.md` review + `tests/unit/promptParity.locales.test.ts` |
| A14 | Conversation-history storage format and content are unchanged after migration | FR-008 | example | DONE | `tests/unit/dbAssistantChatHistoryHelpers.test.ts` (re-run post-migration) |
| A15 | After cleanup, extracted prompt texts exist only under `src/lib/ai/prompts/templates/`, and every remaining hard-coded prompt carries a documented output-contract risk | SC-002, FR-002, FR-017 | example | DONE | `specs/020-prompt-manager-refactor/validation-results.md` (quickstart Scenario 7) |
| A16 | The final change set contains zero out-of-scope changes (wording, schemas, providers/models, UI, unrelated refactoring) | SC-008 | example | DONE | `specs/020-prompt-manager-refactor/validation-results.md` (T032 diff review) |
| A17 | The full suite, static checks, lint, and build show zero new failures versus the recorded baseline | SC-004, FR-016 | example | DONE | `specs/020-prompt-manager-refactor/baseline-results.md` comparison (T030) |
## Inner loop: unit behaviors

Grouped by the component from `plan.md` that owns them. Each line names one observable result. No property/approval/contract tooling exists in the profile, so invariants are recorded as `example` tests sampled at both sides of each boundary.

### `src/lib/ai/prompts/render.ts`

| id | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| U1 | An unknown prompt id raises an actionable error naming the id and returns no messages | FR-005, SC-006 | example | DONE | `tests/unit/promptRender.test.ts` |
| U2 | A missing required parameter raises an actionable error naming that parameter | FR-005, SC-006 | example | DONE | `tests/unit/promptRender.test.ts` |
| U3 | An omitted optional parameter renders with the pre-change default value | FR-003 | example | DONE | `tests/unit/promptRender.test.ts` |
| U4 | An empty-string value renders as empty — the default is NOT substituted (boundary pair with U3) | FR-003, FR-006 | example | DONE | `tests/unit/promptRender.test.ts` (renders an empty-string value as empty without substituting the default (U4)) |
| U5 | Multiline SQL/XML with quotes, braces, and backticks is inserted byte-identical (no trim/escape/normalize) | FR-006 | example | DONE | `tests/unit/promptRender.test.ts` (preserves multiline SQL and special characters byte-for-byte (U5)) |
| U6 | `{{…}}` arriving inside a parameter value is treated as content: never substituted, never re-scanned | FR-006, SC-003 | example | DONE | `tests/unit/promptRender.test.ts` (treats {{…}} inside a parameter value as content, never re-scanning (U6)) |
| U7 | Message roles and ordering come from the registry entry; the renderer never reorders or rewrites content | FR-004 | example | DONE | `tests/unit/promptRender.test.ts` (takes the message role from the registry entry and never rewrites it (U7)) |
| U8 | The same id and params render byte-identical messages on every call (determinism invariant) | SC-001 | example | DONE | `tests/unit/promptRender.test.ts` (renders byte-identical messages for the same id and params on every call (U8)) |
| U9 | The render path performs no network and no filesystem access (I/O boundary: absent, not stubbed) | FR-012, FR-015 | example | DONE | `tests/unit/promptRender.test.ts` (performs no network or filesystem access on the render path (U9)) |

### `src/lib/ai/prompts/registry.ts`

| id | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| U10 | Every `{{placeholder}}` in every registered template belongs to that prompt's declared parameter schema | FR-005, SC-003 | example | DONE | `tests/unit/promptRegistry.test.ts` (every {{placeholder}} in every registered template belongs to its schema (U10)) |
| U11 | Every inventory row has at least one registry entry or a `deferred-risk` row carrying a specific output-contract risk | SC-002 | example | DONE | `tests/unit/promptRegistry.test.ts` — unblocked once T005 wrote `prompt-inventory.md`; the audit now pins the exact 36-id set, the 20 migrated rows and the 2 documented `deferred-risk` rows |
| U12 | Every registered prompt id resolves to exactly one entry (identity/lookup invariant) | FR-002 | example | DONE | `tests/unit/promptRegistry.test.ts` (resolves every registered prompt id to exactly one entry (U12)) |

### `src/lib/ai/formatErrorAi.ts`

| id | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| U13 | Current request behavior: prompt text, message order, provider request settings, and parsed result for a response fixture (pre-migration baseline) | FR-011, SC-001 | characterization | DONE | `tests/unit/promptParity.formatError.test.ts` |

### `src/lib/ai/sqlComparisonAi.ts`

| id | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| U14 | Current prompt messages and request settings for the before/after comparison feature (pre-migration baseline) | FR-011, SC-001 | characterization | DONE| `tests/unit/promptParity.sqlComparison.test.ts` |

### `src/lib/ai/databaseAssistant.ts`

| id | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| U15 | Current system-message assembly with trimmed conversation history yields the exact messages sent today (pre-migration baseline) | FR-011, SC-001 | characterization | DONE| `tests/unit/promptParity.databaseAssistant.test.ts` |

### `src/lib/ai/aiService.ts`

| id | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| U16 | Current SQL Explainer / CTE / structured-explain prompt outputs per locale (pre-migration baseline) | FR-011, FR-004 | characterization | DONE| `tests/unit/promptParity.sqlExplainer.test.ts` |
| U17 | Current semantic-brief/optimize prompt output with and without the optional user instruction (pre-migration baseline) | FR-011, FR-003 | characterization | DONE| `tests/unit/promptParity.optimize.test.ts` |
| U18 | Current docs-consultant composition: context branch appends retrieved documentation; no-context branch uses the no-context prompt (pre-migration baseline) | FR-011, FR-004 | characterization | DONE| `tests/unit/promptParity.docsConsultant.test.ts` |
| U19 | Provider request bodies receive messages, roles, and the resolved system prompt exactly as given (mapping unchanged by this feature) | FR-007 | example | DONE | `tests/unit/aiService.test.ts` (asserts exact provider request bodies) |

### `src/lib/sql/dashboard/aiPrompts.ts`

| id | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| U20 | Current bilingual builder outputs (vi and en) for dashboard insight prompts, including computed contributor lines (pre-migration baseline) | FR-011, FR-009 | characterization | DONE| `tests/unit/promptParity.dashboard.test.ts` |

### `src/lib/ai/databaseAssistant/` (existing chat history modules)

| id | behavior | traces | kind | state | test |
| --- | -------- | ------ | ---- | ----- | ---- |
| U21 | Conversation-history storage format, version, and message content round-trip unchanged by the refactor | FR-008 | example | DONE | `tests/unit/dbAssistantChatHistoryHelpers.test.ts` (existing coverage) |
## Invariants and edge cases still to place

Behaviors that belong to the feature but do not yet have a home component. Each must become a numbered line above before the feature is done, or be dropped with a reason.

- Characterization baselines for every REMAINING inventory row found by the FR-001 audit (SQL code generator, MyBatis/SQL conversion, any others): their owning source files are unknown until `prompt-inventory.md` (T005) names them — they become U22+ on a refresh of this list before their rows migrate (T022).
- Provider timeout/retry/cancellation behavior stays identical after migration (FR-007): outer A3 traces it; place an inner line if a cycle touches `aiService.ts` request paths.

## Out of scope

Things a reader may expect on this list and the one-line reason they are absent.

- Prompt wording/quality improvements and output-schema redesign: spec Assumptions "No prompt engineering" + SC-008 forbid it.
- Provider, model, temperature, token-limit, or streaming-setting changes: FR-007, out of scope by design.
- Language behavior changes or prompt translation: Clarification Q2 + FR-010 — discrepancies are documented only (A13 covers the documentation).
- Prompt administration UI or database-backed prompt storage: FR-015 forbids both.
- Fixing pre-existing baseline failures: spec Assumptions "Baseline failures" — recorded, never fixed here (A17 compares against the baseline).
- UI layout or presentation changes: SC-008.
- Live-model response equivalence checks: spec Assumptions "Verification method" — models are nondeterministic; parity is proven at message/request/result layers with mocked providers, never with network calls.
- Renderer latency budgets: no spec success criterion covers rendering performance (pure in-memory fill; constitution perf targets apply to analysis, not prompt rendering).

## Verification commands

Copied verbatim from `.specify/memory/tdd-profile.md` at planning time, so this file is readable on its own:

- Single test: `npm test -- tests/unit/sqlSourceClassification.test.ts`
- File: `npm test -- tests/unit/sqlSourceClassification.test.ts`
- Full suite: `npm test`
- Watch: `null` (unavailable)
- Coverage: `null` (unavailable)
- Mutation: `null` (unavailable)
- Acceptance runner: `null` — outer behaviors hosted at integration level (see Runner note above)
- Property library: `null` — invariants are example tests sampled at boundaries
- Approval: `null`; Contract: `null`
- Test glob: `tests/**/*.test.{ts,tsx}`
- Exemplars: unit `tests/unit/sqlSourceClassification.test.ts`, component `tests/unit/SignInPage.test.tsx`; helper `tests/utils/test-setup.ts`

Baseline at planning time (commit `a931f41`): `npm test` → **74 files, 691 tests, all passing, 56.00s** — `suite_baseline: green`.