# Feature Specification: AI Prompt Management Refactor (Centralized Prompt Templates)

**Feature Branch**: `020-prompt-manager-refactor`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "implement docs\ui-prompts\20261015\sql-visualizer-prompt-manager-by-specify-template.prompt.md" (source task document: `docs/ui-prompts/20261015/sql-visualizer-prompt-manager-by-specify-template.prompt.md`)

## Clarifications

### Session 2026-10-15

- Q: If the audit discovers hard-coded prompts that are risky to migrate without changing AI outputs, must every discovered prompt still be migrated in this feature, or can some be left in place and documented for later? → A: Migrate all in-scope prompts by default; only prompts whose migration would risk an output contract may remain, and each must be documented with its risk.
- Q: If the audit finds an AI feature whose responses do not follow the application's current language setting, should this feature change that behavior, or only document the discrepancy? → A: Document the discrepancy only — no language behavior changes in this feature; propose the smallest fix as a separate, explicitly approved change.
- Q: If prompt rendering fails while a user is actively running an AI feature at runtime (for example, a missing template or a missing parameter), what should the user experience? → A: Behave exactly like the feature's existing provider/request error — same user-visible fallback; the renderer's actionable error is logged for maintainers, not shown as a new UI state.




## User Scenarios & Testing *(mandatory)*

### User Story 1 - AI Features Behave Identically After Prompt Centralization (Priority: P1)

A user of any AI-powered feature (SQL Explainer, Optimize, Database Assistant, before/after query comparison, SQL/XML conversion assistance, SQL code generation, format-error diagnostics) receives exactly the same responses as before the change: same response structure, same fields and labels, same sections and ordering, same SQL/code blocks, same streaming behavior, same error and fallback behavior.

**Why this priority**: Backward compatibility is the core requirement of this feature. If any AI output contract changes, the refactor is a regression regardless of how much maintainability it improves.

**Independent Test**: Can be fully tested by running characterization (baseline) tests recorded before migration against the migrated implementation for every in-scope feature, using recorded baselines and mocked provider responses, and confirming identical outgoing prompt messages, identical provider request settings, and identical application-level results.

**Acceptance Scenarios**:

1. **Given** an AI feature's recorded pre-change prompt baseline, **When** the same logical input is processed after migration, **Then** the outgoing prompt messages — roles, ordering, wording, whitespace, delimiters, and parameter values — are identical to the baseline.
2. **Given** a provider response captured before the change, **When** the feature processes it after migration (provider mocked), **Then** the parsed result, output structure, and fields consumed by the UI are unchanged.
3. **Given** an AI feature that streams responses, **When** a streamed response is rendered after migration, **Then** partial-response and final behavior match the pre-change baseline.
4. **Given** an AI feature with error/fallback handling, **When** a provider error occurs after migration, **Then** the user-visible error and fallback behavior are unchanged.

---

### User Story 2 - Maintainer Edits Prompts in One Centralized, Validated Place (Priority: P2)

A maintainer can locate and edit any feature's prompt in a single centralized location, expressed as a template with named parameters, without touching request-handling logic. Missing parameters, unknown prompts, or unresolved placeholders are caught with an actionable error before anything is sent to the AI provider.

**Why this priority**: Centralized, parameterized prompt maintenance is the primary value of the feature; it depends on User Story 1's parity guarantee being in place first.

**Independent Test**: Can be fully tested by editing one template and confirming every usage of that prompt picks up the change with no other edits, and by attempting renders with missing required parameters, unknown prompt references, and incomplete substitutions to confirm actionable errors and that no provider call occurs.

**Acceptance Scenarios**:

1. **Given** a registered prompt template, **When** a maintainer updates its instruction text, **Then** all subsequent requests for that feature use the updated text without modifying request-handling code or duplicating the text elsewhere.
2. **Given** a template with a required parameter, **When** a render is attempted without that parameter, **Then** an actionable error identifying the missing parameter is raised and no request is sent to the provider.
3. **Given** multiline SQL or MyBatis XML content containing quotes, braces, backticks, and special characters, **When** it is supplied as a parameter value, **Then** the rendered prompt preserves it exactly — no trimming, escaping, normalization, or reordering.
4. **Given** a request for a prompt identifier that is not registered, **When** rendering is attempted, **Then** an actionable error is raised and no provider call is made.
5. **Given** any template or parameter input, **When** rendering is attempted, **Then** no access outside the approved prompt template locations is possible and no unresolved placeholder can reach the provider.
6. **Given** an empty or default parameter value, **When** rendering is attempted, **Then** the result matches the pre-change behavior for that value (empty values and defaults are preserved as-is).

---

### User Story 3 - Language Behavior Preserved and Synchronized (Priority: P3)

The application's existing language setting (Vietnamese and English) remains the single authoritative source for AI request language. Features that already follow the application language keep doing so; any feature that does not is documented rather than silently changed.

**Why this priority**: Important for consistency and user trust, but must never override the parity requirement — a language behavior change without approval would violate the output contract.

**Independent Test**: Can be fully tested by switching the application language between the supported locales and confirming each AI feature's requests behave exactly as they did before the change, plus a documentation review confirming any mismatch between a feature and the application language is recorded with a proposed, separately-approved fix.

**Acceptance Scenarios**:

1. **Given** the application language is set to a supported locale, **When** an AI request is issued, **Then** the language context passed to the AI service matches the pre-change behavior for that feature.
2. **Given** the user changes the application language, **When** subsequent AI requests are issued, **Then** they follow the newly selected language exactly as they did before the change.
3. **Given** a feature that does not currently follow the application language setting, **When** migration occurs, **Then** the discrepancy is documented (feature, prompt, affected behavior, smallest backward-compatible proposal) and no language behavior change is made in this feature — any fix is proposed as a separate, explicitly approved change.
4. **Given** either supported locale, **When** conversation history is continued, **Then** its existing storage format and content are preserved unchanged.

---

### Edge Cases

- Empty parameter values, omitted optional parameters, and parameters whose value is an empty string must render exactly as they did before the change.
- Multiline SQL and MyBatis XML inputs containing blank lines, indentation, quotes, braces, and backticks must survive rendering byte-for-byte.
- Prompts assembled dynamically from fragments spread across multiple files must be captured in full by the inventory before extraction.
- Prompt features with no dynamic values must still be externalized without introducing unnecessary parameters.
- A missing, renamed, or unreadable template must produce an actionable error, never a silently degraded prompt; at runtime the user sees the feature's existing error/fallback behavior while the actionable renderer error goes to maintainer logs, not a new UI state.
- Any unresolved placeholder detected at render time must block the provider call.
- Pre-existing test failures must be recorded as baseline failures and not attributed to this refactor.
- Model responses are nondeterministic: exact response equality must not be claimed without controlled conditions; parity is proven through recorded prompt/request baselines, golden fixtures, and mocked provider responses.
- Provider request settings (model, provider, generation parameters, streaming mode, timeouts, retries, cancellation, error mapping, response parsing) must remain untouched even while prompts move.
- Prompt content and user SQL/XML payloads must not be written to logs unnecessarily.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Before any implementation file is modified, the system's existing AI prompts MUST be inventoried, capturing for each: feature name, location, message role, prompt text (or verifiable reference), input parameters, parameter defaults, provider and model configuration, expected output format, output consumers, relevant tests, and migration status.
- **FR-002**: All in-scope hard-coded AI prompts MUST be externalized into centralized prompt templates organized by actual AI feature, replacing hard-coded prompt text inside request handlers and service implementations; the default is that every discovered prompt is migrated, and only a prompt whose migration would risk changing an output contract MAY remain hard-coded, and only when it and its specific compatibility risk are documented — zero undocumented hard-coded prompts may remain.
- **FR-003**: Only genuinely dynamic values MUST become explicit named parameters; original parameter values, defaults, and conditional behavior MUST be preserved, and no new parameters or semantic changes may be introduced for cosmetic consistency.
- **FR-004**: Extracting a prompt into a template MUST preserve its original instruction text, instruction ordering, examples, output schemas, delimiters, formatting requirements, constraints, negative instructions, message composition and ordering, and its existing language — no paraphrasing, summarizing, translating, optimizing, simplifying, expanding, or removing "redundant" instructions.
- **FR-005**: Prompt rendering MUST validate required parameters, support optional parameters with their existing defaults, report actionable errors for missing templates or parameters, detect unresolved placeholders, and prevent any unresolved placeholder from reaching the AI provider; if a render failure reaches runtime while a user is running a feature, the user MUST see exactly the feature's existing provider/request error and fallback behavior, with the renderer's actionable error recorded for maintainers rather than surfaced as a new user-facing state.
- **FR-006**: Rendering MUST preserve whitespace, multiline content, and special characters exactly, and MUST NOT introduce any new transformation (trimming, escaping, normalization) of user-provided or prompt content.
- **FR-007**: Existing AI provider integrations and request construction MUST remain unchanged: providers, model identifiers, message roles, generation parameters, streaming and non-streaming behavior, timeouts, retries, cancellation, error mapping, response parsing, and structured-output modes.
- **FR-008**: Existing service interfaces, frontend output contracts (response structure, JSON keys, markdown sections and ordering, labels, terminology, SQL/code blocks, score/severity/confidence conventions, UI consumption, streaming behavior) MUST remain compatible; where an AI feature's real output contract differs from assumptions, the actual discovered contract governs.
- **FR-009**: The application's existing language setting MUST remain the authoritative source for AI request language; supported locales and regional variants MUST be handled consistently with the existing internationalization configuration, and language changes MUST take effect on subsequent requests exactly as they do today.
- **FR-010**: Any feature that does not currently follow the application language setting MUST have the discrepancy documented (affected feature and prompt, proposed smallest backward-compatible change, tests for the proposed behavior); no language behavior change may be made in this feature — any fix MUST be proposed as a separate, explicitly approved change with its own tests.
- **FR-011**: Characterization tests MUST be created or extended before refactoring to capture existing rendered messages, message roles and ordering, parameter interpolation, provider request configuration, representative response fixtures, output schema and parsing behavior, UI assumptions about response fields, and error/fallback behavior, with a representative fixture for every migrated feature and the pre-change implementation as the baseline.
- **FR-012**: Automated tests MUST cover template lookup, required/optional parameter validation and defaults, missing-template errors, unresolved-placeholder detection, multiline SQL/XML preservation, special characters, message ordering, path-traversal prevention, locale propagation, empty-value handling, and absence of unintended provider-configuration changes; unit tests MUST NOT perform real network calls.
- **FR-013**: For every migrated feature, integration/regression tests MUST verify equivalent prompt messages for the same logical input, unchanged provider request settings, identical application-level results against mocked provider responses, preserved parsing/frontend contracts, and preserved error/fallback behavior.
- **FR-014**: Migration MUST proceed incrementally: audit (no functional changes) → baseline tests → prompt-management core with tests → pilot migration of one representative feature with old-vs-new comparison → remaining features → cleanup of obsolete hard-coded prompts only after all references are migrated and verified → final validation.
- **FR-015**: Prompt templates and prompt-management logic MUST remain server-side where required by the existing deployment, MUST NOT expose private prompt files or server-only code to the browser, and MUST NOT require a prompt administration UI or database-backed prompt storage.
- **FR-016**: Baseline test, static-check, lint, and build results MUST be recorded before and after the change; pre-existing failures MUST be documented separately and not attributed to this refactor; no claim of passing verification may be made without actually executed results.
- **FR-017**: Upon completion, a report MUST list files changed, prompts migrated, tests executed with results, any remaining hard-coded prompts, unresolved compatibility risks, and remaining risks — and the final change set MUST contain no unrelated feature, output, provider, UI, or refactor changes.
- **FR-018**: If any architectural decision would require changing existing output behavior, work on that decision MUST stop and explicit approval MUST be obtained before proceeding.

### Key Entities *(include if feature involves data)*

- **Prompt Template**: The instruction text for one message role of one AI feature, stored as a readable template organized by feature; may contain named placeholders for dynamic values; carries its original wording, ordering, and formatting unchanged.
- **Prompt Parameter Set**: The named dynamic values a template expects, each marked required or optional with existing defaults preserved; includes values such as the SQL text, dialect, language, schema context, original/modified SQL, conversation history, and additional context as discovered per feature.
- **Prompt Inventory Record**: The audit entry produced before migration for each hard-coded prompt: feature, location, role, text reference, parameters, defaults, provider/model configuration, expected output format, output consumers, tests, migration status.
- **Language Context**: The resolved active application locale passed to AI requests, sourced from the existing language mechanism, supporting the existing Vietnamese and English locales.
- **Output Contract Baseline**: The recorded pre-change behavior of a feature — outgoing prompt messages, provider request settings, representative response fixtures, parsed output structure, and UI-consumed fields — used as the parity reference for migration verification.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For 100% of migrated features, the outgoing prompt messages and provider request settings produced for representative inputs match the recorded pre-change baselines (byte-for-byte where content is deterministic), verified by automated comparison over the feature's fixtures.
- **SC-002**: 100% of in-scope hard-coded prompts are inventoried before work begins, every discovered prompt is migrated by default, and after cleanup zero migrated prompt texts remain hard-coded in request or service code — any remaining hard-coded prompt is explicitly documented together with its specific output-contract compatibility risk, so zero undocumented hard-coded prompts remain.
- **SC-003**: Zero unresolved placeholders, missing parameters, or unknown prompt references reach the AI provider across all registered prompts, as demonstrated by automated checks covering every registered prompt.
- **SC-004**: The project's verification suite (tests, static checks, linting, production build) shows zero new failures compared with the recorded baseline, with actual commands and results recorded; pre-existing failures remain documented separately.
- **SC-005**: For every migrated feature, a prompt wording update can be made in exactly one location and take effect for all of that feature's requests without modifying request-handling logic or any other file — demonstrated for each migrated feature.
- **SC-006**: Every parameter-handling failure mode (missing required parameter, unknown prompt, unresolved placeholder, unreadable template) is surfaced as an actionable error before any provider call, demonstrated by tests covering all registered prompts.
- **SC-007**: Language behavior for every feature matches pre-change behavior in both supported locales; 100% of discovered language discrepancies are documented before completion, with 0 undocumented discrepancies and 0 language behavior changes made within this feature.
- **SC-008**: The final change set contains 0 unrelated changes: no output-schema changes, no prompt-wording improvements, no provider/model/setting changes, no UI changes, no unrelated refactoring, verified by final diff review against the out-of-scope list.

## Assumptions

- **Scope**: All AI features that construct prompts for an AI provider are in scope (based on the repository: SQL Explainer, Optimize, Database Assistant, before/after query comparison, SQL code generation, MyBatis/SQL conversion assistance, and format-error diagnostics); the definitive list is produced by the FR-001 inventory before editing begins.
- **Ground truth**: Existing implementation and tests define correct behavior. Where the source task document's assumed output formats differ from reality, the actual discovered contract governs.
- **Baseline failures**: The verification suite may already have failures; they are documented as pre-existing and are neither fixed nor attributed to this refactor.
- **No prompt engineering**: Prompt wording, output schemas, and response quality are explicitly out of scope — this is an extraction and integration refactor only.
- **No infrastructure changes**: Providers, models, UI layouts, database dialect support, deployment architecture, and libraries remain unchanged; no prompt administration UI or database-backed prompt storage is added.
- **Storage of templates**: Prompt templates ship with the application package as readable files; there is no runtime-editable prompt store.
- **Language**: The existing internationalization mechanism (Vietnamese and English) is authoritative; templates are not duplicated per language unless the existing architecture genuinely requires it.
- **Verification method**: Because model output is nondeterministic, parity is proven with recorded baselines, golden fixtures, request snapshots, and mocked provider responses — not by claiming exact live-model response equality.
- **Source of truth**: The task document `docs/ui-prompts/20261015/sql-visualizer-prompt-manager-by-specify-template.prompt.md` is the authoritative description of this feature; where it conflicts with anything else, its "do not change existing outputs" requirement takes precedence.
