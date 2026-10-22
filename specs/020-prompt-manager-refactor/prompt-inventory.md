# Prompt Inventory — Feature 020 (T005 / FR-001)

Complete audit of every AI prompt instruction in the codebase, recorded **before migration**.
This is the ground truth for SC-002 (no hard-coded duplicates left) and for registry-completeness
Invariant 3 in `contracts/prompt-manager.md`: every row below must map to ≥1 registry entry or to
a documented `deferred-risk` record.

Fields follow `data-model.md → PromptInventoryRecord`. Lifecycle states follow `data-model.md`:
`discovered → baselined → migrated → verified`, with `deferred-risk` as the documented terminal
alternative.

## Discovery method

```
Get-ChildItem -Recurse -Path src -Include *.ts,*.tsx |
  Select-String -Pattern "export function build[A-Za-z]*Prompt|export const [A-Z_]*PROMPT|^const [A-Z_]*PROMPT"
```
plus a manual sweep of `src/lib/ai/**` and `src/lib/sql/dashboard/**` for prompt-bearing consts
that do not follow the `*_PROMPT` convention (e.g. `DATABASE_KNOWLEDGE_ADDENDUM`).

**Result: 22 prompt sources across 7 files** — 20 chat prompts (rows 1–20, all migrated) plus 2
non-chat/deferred sources (rows 21–22, documented as `deferred-risk`). No other prompt text exists
in `src/` (verified by a repo-wide sweep for chat-prompt openers such as `You are`, `Reply with
ONLY`, `Return only a JSON`, `Explain the following` excluding `src/lib/ai/prompts/**`).


## Inventory table

| # | Feature | Source location | Purpose | Locale-variant | Role | Input parameters |
|---|---------|-----------------|---------|----------------|------|------------------|
| 1 | sqlExplainer | `aiService.ts:25` `EXPLAIN_SQL_PROMPT` | Plain-language SQL explanation (text) | Yes (whole text) | user | `sql` |
| 2 | sqlExplainer | `aiService.ts:31` `EXPLAIN_CTE_PROMPT` | Explain one CTE, Markdown-only | Yes (whole text) | user | `name`, `sql`, `dependencies` (optional block) |
| 3 | sqlExplainer | `aiService.ts:62` `EXPLAIN_SQL_STRUCTURED_PROMPT` | Business explanation as JSON sections | Yes (whole text) | user | `sql` |
| 4 | semanticBrief | `aiService.ts:1565` `SEMANTIC_BRIEF_PROMPT` | Read-only understanding pass | Yes (whole text) | user | `sql`, `userInstruction` (optional block) |
| 5 | optimize | `aiService.ts:1764` `OPTIMIZE_SQL_STRUCTURED_PROMPT` | Targeted fixes as JSON proposals | Yes (whole text) | user | `sql`, `userInstruction` (optional block + conditional JSON keys) |
| 6 | requirement | `aiService.ts:2418` `REQUIREMENT_CANDIDATE_PROMPT` | Add a new requirement to a query | Yes (whole text) | user | `sql`, `requirementText`, `hintedTables` (optional line) |
| 7 | repair | `aiService.ts:2657` `REPAIR_PROPOSALS_PROMPT` | Repair invalid optimizer proposals | Yes (whole text) | user | `sql`, invalid-proposal payload |
| 8 | followUp | `aiService.ts:2800` `FOLLOW_UP_SYSTEM_PROMPT` | Follow-up questioning system prompt | Yes (whole text) | **system** | none (static) |
| 9 | docsConsultant | `aiService.ts:2897` `DOCS_CONSULTANT_SYSTEM_PROMPT` | Docs-consultant system prompt | Yes (whole text) | **system** | none (static) |
| 10 | docsConsultant | `aiService.ts:2902` `DOCS_CONSULTANT_NO_CONTEXT_PROMPT` | Fallback when no docs context | Yes (whole text) | user | none (static) |
| 11 | databaseAssistant | `databaseAssistant.ts:26` `DATABASE_ASSISTANT_SYSTEM_PROMPT` | Chat assistant system prompt | Yes (whole text) | **system** | none (static) |
| 12 | databaseAssistant | `databaseAssistant.ts:32` `DATABASE_KNOWLEDGE_ADDENDUM` | RAG addendum when excerpts found | Yes (whole text) | system (appended) | none (static) |
| 13 | databaseAssistant | `databaseAssistant.ts:44` `FOLLOW_UP_SUGGESTIONS_PROMPT` | 4 follow-up questions as JSON array | Yes (whole text) | user | `question`, `answer` |
| 14 | formatError | `formatErrorAi.ts:93` `buildExplainFormatErrorPrompt` | Explain failure + bounded replacement | No — shared text | user | `grounding`, `regionBlock`, `sqlContext`, `replacementRule`, `correctionScope`, `languageInstruction`, `replacementSqlHint`, `replacementReasonHint` |
| 15 | formatError | `formatErrorAi.ts:141` `buildFormatFixPrompt` | Minimal syntax correction | No — shared text | user | `grounding`, `regionBlock`, `confinementRule`, `sql`, `dialect` |
| 16 | formatError | `formatErrorAi.ts:174` `buildFormatFixRetryPrompt` | Retry with new formatter feedback | No — shared text | user | `dialect`, `message`, `formatterMessage`, `originalSql`, `rejectedSql` |
| 17 | sqlComparison | `sqlComparisonAi.ts:54` `buildSqlComparisonPrompt` | Before/After verdict as JSON | No — shared text | user | `languageInstruction`, `dialect`, `facts`, `beforeSql`, `afterSql` |
| 18 | dashboard | `dashboard/aiPrompts.ts:16` `buildExplainComplexityPrompt` | Explain a complexity score | Yes (whole text) | user | `normalizedScore`, `level`, `contributorLines` |
| 19 | dashboard | `dashboard/aiPrompts.ts:36` `buildExplainFindingPrompt` | Explain one lint finding | Yes (whole text) | user | `rule`, `message`, `location` (optional) |
| 20 | dashboard | `dashboard/aiPrompts.ts:48` `buildOptimizationOpportunitiesPrompt` | Optimization opportunities as JSON | Yes (whole text) | user | `sql` |
| 21 | settings | `store.ts:165` `DEFAULT_AI_CONFIG.systemPrompt` | Default system prompt for every AI request | No — single text | system (prepended by `resolveMessages`) | none (static) |
| 22 | speech | `aiSpeech.ts:55` `SPEECH_INSTRUCTIONS` | TTS narration delivery notes | No — single text (locale-invariant) | **none** (OpenAI `instructions` field) | none (static) |

All source paths are relative to `src/lib/` (`aiService.ts`, `databaseAssistant.ts`,
`formatErrorAi.ts`, `sqlComparisonAi.ts` → `src/lib/ai/`; `dashboard/aiPrompts.ts` →
`src/lib/sql/dashboard/`).

## Shared record fields

Apply to every row unless a per-feature note says otherwise.

- **Prompt text**: held in the source file at the listed line and captured byte-for-byte by the
  characterization suite named below (FR-011). Never paraphrased in this document — the code is
  the verifiable reference (`data-model.md` allows "prompt text (or verifiable reference)").
- **Parameter defaults**: only rows 2, 4, 5, 6, 14, 15 and 19 have optional parameters. Every
  default is the empty string `''`, matching the pre-change `cond ? '...' : ''` shape exactly
  (FR-003). No parameter may be added, renamed or re-semantized for cosmetic consistency.
- **Provider / model configuration**: unchanged. Every call goes through the existing
  `generateWithAI` / `streamWithAI` adapter with the Settings `AIModelConfig` as-is. `renderPrompt`
  never reads or mutates provider, model, temperature, streaming mode or token budgets (FR-007).
- **Expected output format**: fixed by each prompt's own wording (JSON object, JSON array, or
  Markdown) and enforced by the feature's existing parser. Parsers are out of scope here.
- **Output consumers**: the owning feature panel/component. Response shapes and UI fields are
  unchanged (FR-008).
- **Language resolution**: rows marked "Locale-variant" branch on the existing `Locale` from
  `src/lib/i18n` only. No new language preference or default is introduced (FR-009).

## Per-feature notes

| Feature | Relevant tests (baseline) | Notes |
|---------|---------------------------|-------|
| formatError | `promptParity.formatError.test.ts` (3), `format-error-ai.test.ts`, `format-error-ai-fix.test.ts`, `format-fix-scope.test.ts` (14) | **Pilot** (US1). `buildExplainFormatErrorPrompt` / `buildFormatFixPrompt` are exported and imported by tests — signatures must survive. Prompts travel via `generateWithAI({ prompt })`, which maps to `{ role: 'user' }` (verified at `aiService.ts:191`). |
| sqlExplainer | `explainerContract.test.ts` (21) | Rows 1–3. Row 3's JSON key set/order is a UI contract; row 2 must stay Markdown-only. |
| semanticBrief / optimize | `optimizeAiInstructionStatus.test.ts`, `aiOptimizeGuard.test.ts`, `semanticPreservation.test.ts` | Rows 4–5. Row 5 conditionally adds the `instruction_status` / `instruction_note` JSON keys — that conditional block is part of the prompt text and must be preserved as a parameter. Call sites prefix a semantic brief (`brief ? \`${brief}\n\n${prompt}\` : prompt`); that prefixing is **call-site composition**, not template text. |
| requirement / repair | `requirementAi.test.ts`, `optimizeAi.test.ts` | Rows 6–7. Same brief-prefix composition caveat. |
| followUp / docsConsultant | `followUpSuggestions.test.ts` (4) | Rows 8–10. Row 8 is a **system** message (`aiService.ts:2838`); role must be preserved (FR-004). |
| databaseAssistant | `databaseAssistant.test.ts` | Rows 11–13. Row 12 is appended to row 11 only when RAG found excerpts — the concatenation must stay byte-identical. |
| sqlComparison | `sqlComparisonAi.test.ts` (10) | Row 17. Exported builder imported by tests. `fitSql` truncation and facts-bounding produce prompt text. |
| dashboard | `dashboardAiPrompts.test.ts` | Rows 18–20. All three builders are exported and imported by tests. Whole text differs per locale → `.en`/`.vi` pairs. |

## Registry mapping and completeness audit (Invariant 3)

Target registry ids. Locale-variant rows register a `.en` + `.vi` pair; shared rows register one id.

| Rows | Registry ids | Template module |
|------|--------------|-----------------|
| 1–3 | `sqlExplainer.explainSql.{en,vi}`, `sqlExplainer.explainCte.{en,vi}`, `sqlExplainer.explainSqlStructured.{en,vi}` | `templates/sqlExplainer.ts` |
| 4 | `semanticBrief.brief.{en,vi}` | `templates/semanticBrief.ts` |
| 5 | `optimize.optimizeSqlStructured.{en,vi}` | `templates/optimize.ts` |
| 6 | `requirement.requirementCandidate.{en,vi}` | `templates/requirement.ts` |
| 7 | `repair.repairProposals.{en,vi}` | `templates/repair.ts` |
| 8 | `followUp.system.{en,vi}` | `templates/followUp.ts` |
| 9–10 | `docsConsultant.system.{en,vi}`, `docsConsultant.noContext.{en,vi}` | `templates/docsConsultant.ts` |
| 11–13 | `databaseAssistant.system.{en,vi}`, `databaseAssistant.knowledgeAddendum.{en,vi}`, `databaseAssistant.followUpSuggestions.{en,vi}` | `templates/databaseAssistant.ts` |
| 14–16 | `formatError.explain`, `formatError.fix`, `formatError.fixRetry` | `templates/formatError.ts` |
| 17 | `sqlComparison.review` | `templates/sqlComparison.ts` |
| 18–20 | `dashboard.explainComplexity.{en,vi}`, `dashboard.explainFinding.{en,vi}`, `dashboard.optimizationOpportunities.{en,vi}` | `templates/dashboard.ts` |
| 21–22 | **deferred-risk** — not registered; see "Deferred-risk records" below | — |

**Expected total: 36 registry entries from rows 1–20** (locale-variant rows contribute an `.en` +
`.vi` pair; shared rows contribute one id). Rows 21–22 are documented `deferred-risk` records with
no registry entry, per FR-002's escape clause.

**Expected total: 37 registry entries from 20 prompt sources.**

`deferred-risk` rows: **rows 21 and 22**, documented below. Rows 1–20 are all migratable without
touching an output contract, because the renderer only re-locates text — it never changes wording,
ordering, roles, provider settings or parsers.

### Deferred-risk records (Clarification Q1)

**Row 21 — `DEFAULT_AI_CONFIG.systemPrompt` (`src/lib/store.ts:165`)**

- *Affected feature*: every AI feature, because `resolveMessages` (`aiService.ts:187`) prepends this
  value as a `system` message whenever a request supplies neither `messages[].role === 'system'` nor
  an explicit `systemPrompt`.
- *Specific compatibility risk*: this string is not only prompt text — it is **persisted user
  configuration**. It is the default value of `aiConfig.systemPrompt`, written into
  `localStorage`/Zustand persistence and read back by the Settings page, and
  `normalizePersistedAiConfig` (`store.ts:284`+) migrates stored values against it. Routing it
  through the registry would either (a) require the persisted settings object to keep a frozen copy
  of the pre-migration default, reintroducing the very duplication this feature removes, or (b)
  change what `DEFAULT_AI_CONFIG` exports, which is an output/settings contract change forbidden by
  FR-007/FR-008 and SC-008. Migration is therefore deferred rather than risked.
- *Proposed follow-up*: a separate, explicitly approved change that separates "shipped default
  prompt text" from "persisted user setting" and migrates stored configs, with its own tests.
- *Interim guarantee*: the text is a single static string with no parameters and no locale branch,
  so it cannot drift out of sync with a template — there is nothing to keep in sync.

**Row 22 — `SPEECH_INSTRUCTIONS` (`src/lib/ai/aiSpeech.ts:55`)**

- *Affected feature*: text-to-speech narration (`aiSpeechEngine.ts:278`).
- *Specific compatibility risk*: this text is not sent as a chat message at all. It is the OpenAI
  `/v1/audio/speech` `instructions` field, and the route drops the field entirely for the `tts-1`
  model family. It also has no `AIRole` — `PromptEntry.role` is typed `AIRole`, so registering it
  would force a fake role and change the request body's shape (FR-007 forbids changing request
  construction). It is additionally outside the FR-001 inventory's discovery pattern, which targets
  chat-prompt builders.
- *Proposed follow-up*: extend the registry's `PromptEntry` with a non-chat delivery channel (or a
  dedicated TTS-instructions map) in a separate approved change, with its own parity test.
- *Interim guarantee*: one static, locale-invariant string with no parameters — no drift risk.


## Language behavior audit (T028 / FR-010, Q2)

Every in-scope feature was audited against the existing i18n mechanism (`src/lib/i18n.ts`,
`src/locales/en.ts`, `src/locales/vi.ts`). The authoritative source of request language is
`settings.locale` (the `Locale` type is exactly `'en' | 'vi'`), which callers pass into the service
functions; the registry resolves it via `localizedPromptId`, reproducing the pre-migration
`PROMPT[locale] ?? PROMPT.en` lookup.

**Result: zero language-behavior changes were made, and the following discrepancies are documented
rather than fixed (FR-010 forbids shipping a fix here).**

| # | Feature / prompt | Observed behavior | Discrepancy | Smallest backward-compatible proposal | Proposed tests |
|---|------------------|-------------------|-------------|---------------------------------------|----------------|
| L1 | docsConsultant (`docsConsultant.system.{en,vi}`) | The **retrieved-documentation heading** is the literal English string `Retrieved documentation:` in BOTH locales, because it was hard-coded once at the call site before the migration and the migration preserved it byte-for-byte (FR-004). The rest of the vi text is Vietnamese. | A Vietnamese user sees one English label inside an otherwise Vietnamese system message. | Add a `{{retrievedHeading}}` parameter whose value is `Tài liệu truy xuất:` for `vi` and `Retrieved documentation:` for `en`, keeping the en bytes identical. | A `promptParity.locales.test.ts` case asserting the vi heading is Vietnamese and the en heading is unchanged; plus a request-snapshot test on `askDocsConsultant`/`streamDocsConsultant`. |
| L2 | formatError (`formatError.explain`) | Locale changes the model's **output** language via the `languageInstruction` parameter (`Write the "explanation" … in Vietnamese (tiếng Việt)`), not the instruction language itself. | A Vietnamese user reads English instructions but gets Vietnamese field values. | None recommended: this is the feature's deliberate design (the JSON keys must stay English for the parser), and changing it would alter the output contract. | Existing `formatError` parity tests already pin both branches; no change proposed. |
| L3 | sqlComparison (`sqlComparison.review`) | Uses a `languageInstruction` parameter rather than an `.en`/`.vi` pair (inventory row 17), and the shared template text stays English. | Same shape as L2: output language varies, instruction language does not. | None recommended — deliberate design; the deterministic-facts blocks must stay machine-readable. | Already pinned by `promptParity.comparison.test.ts` (`switches only the language instruction for the vi locale`). |
| L4 | settings default system prompt (inventory row 21) | `DEFAULT_AI_CONFIG.systemPrompt` is a single English string with no locale branch, so it is sent as-is for both locales. | A Vietnamese user's default system prompt is English. | Make the default locale-aware (or empty) when the user has never overridden it — but this touches persisted settings, so it is the same deferred change as row 21. | New test on `resolveMessages`/`DEFAULT_AI_CONFIG` once the settings/prompt separation lands. |
| L5 | speech narration (inventory row 22) | `SPEECH_INSTRUCTIONS` is a single English string; narration voice is selected server-side by locale. | Delivery notes are English regardless of locale. | Extend the registry with a non-chat channel (same deferred change as row 22). | A parity test on the `/v1/audio/speech` request body once the channel exists. |
| L6 | All locale-variant features (rows 1–13, 18–20) | Language follows `settings.locale` on every request, including after a locale switch (the value is read from the store per call). | **None** — behavior matches pre-change exactly. | None needed. | `promptParity.locales.test.ts` (9 tests) asserts the pair, the resolution, the `en` fallback, and that no shared prompt gained a locale. |

Rows L2 and L3 are *intentional* designs (output-language vs instruction-language), not defects.
Rows L1, L4 and L5 are genuine discrepancies; each has a smallest-backward-compatible proposal above
and **none is implemented in this feature**, per FR-010/SC-007.

### Decision log: L2 — English template text for Vietnamese users (ACCEPTED, keep as-is)

L2 was raised explicitly during review ("why is `formatError.ts` always English — where is the
Vietnamese version?"). The question was investigated and the behavior verified by rendering both
locales: `renderPrompt(FORMAT_ERROR_PROMPTS.explain, explainFormatErrorParams(err, 'vi'))` produces
`… in Vietnamese (tiếng Việt) …` while `'en'` produces `… in English …`, and the two rendered strings
are not equal. Vietnamese IS present; it lives in the `{{languageInstruction}}` parameter because the
pre-migration source branched only on that one sentence (FR-003), not because text was lost.

**Decision: option A — keep the current behavior unchanged.** Rationale:

1. It is byte-identical to the pre-migration implementation (FR-004), which the parity suite pins.
2. `fix` and `fixRetry` correctly have no language instruction at all — their output is SQL, and the
   pre-migration builders never accepted a `locale` argument.
3. Translating the instructions would risk the model translating the JSON keys, breaking
   `parseFormatExplanation` (FR-008).
4. Changing prompt wording is explicitly out of scope ("No prompt engineering") and FR-010 forbids
   shipping a language-behavior change inside this feature.

Rejected alternatives: **(B)** add `formatError.explain.en`/`.vi` pairs — carries the JSON-key
translation risk above and needs its own spec; **(C)** reword the single `languageInstruction` line —
allowed by SC-005 (one location) but is prompt engineering and would break the pinned parity test.

To make the intent discoverable in code, the reasoning is documented in the header comment of
`src/lib/ai/prompts/templates/formatError.ts` (above `FORMAT_ERROR_TEMPLATES`).


## Migration status ledger

Updated as tasks complete. States per `data-model.md`.

| Rows | Feature | State | Evidence |
|------|---------|-------|----------|
| 14–16 | formatError | **verified** | `promptParity.formatError.test.ts` + `format-error-ai*.test.ts` + `format-fix-scope.test.ts` green (79 tests) after migration; zero wording change |
| 1–3 | sqlExplainer | **verified** | `promptParity.aiServiceCore.test.ts` (26) + `promptParity.aiServiceWiring.test.ts` (19) green; `aiService.ts` renders via `renderPrompt`; 10 constants removed |
| 4 | semanticBrief | **verified** | same suites; T019 |
| 5 | optimize | **verified** | same suites; T019 |
| 6 | requirement | **verified** | `promptParity.aiServiceFlow.test.ts` (17) + wiring suite; T020 |
| 7 | repair | **verified** | same suites; T020 |
| 8 | followUp | **verified** | same suites; T020 |
| 9–10 | docsConsultant | **verified** | same suites; T020 (context + no-context branches pinned separately) |
| 11–13 | databaseAssistant | **verified** | `promptParity.databaseAssistant.test.ts` (8) green; service wired to `renderPrompt` |
| 17 | sqlComparison | **verified** | `promptParity.comparison.test.ts` (15) green; `sqlComparisonAi.ts` wired |
| 18–20 | dashboard | **verified** | `promptParity.dashboard.test.ts` (18) green; `dashboard/aiPrompts.ts` wired |
| 21–22 | settings, speech | **deferred-risk** | documented above with specific compatibility risk; no registry entry (FR-002 escape clause) |


