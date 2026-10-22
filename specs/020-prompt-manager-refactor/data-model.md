# Data Model: AI Prompt Management Refactor

No new persistence is introduced (spec Assumptions: bundled templates, no database, no runtime store). All entities are in-memory code structures typed under TypeScript strict mode. Field lists below are design-level; implementation types live in `src/lib/ai/prompts/`.

## PromptTemplate

Represents one extracted prompt instruction text for one message role of one AI feature.

| Field | Type / Rule |
|-------|-------------|
| `id` | Unique, stable prompt identifier (e.g. `sqlExplainer.explainSql`, suffixed per locale variant where the source is locale-dependent). Identity rule: exactly one template per `(feature, purpose, locale)`; IDs are unique across the registry |
| `feature` | Owning AI feature (SQL Explainer, Optimize, Database Assistant, comparison, format-error, …) — links to the inventory record |
| `role` | `system` / `user` / `assistant` — preserved exactly as in the source (FR-004) |
| `locale` | `en` \| `vi` \| shared — reflects the source's existing locale branching; templates are not duplicated per language unless the source already was (Assumptions) |
| `text` | Verbatim source string including whitespace, ordering, examples, delimiters, negative instructions (FR-004). Must be byte-identical to the recorded baseline |
| `placeholders` | Derived set of `{{paramName}}` occurrences; every name must exist in the parameter schema (audit test) |

**Validation**: verbatim-text check against baseline; placeholder names ⊆ schema; no renderer-introduced transformations (FR-006).
**Relationships**: 1:1 with a `PromptInventoryRecord` after migration; N:1 with feature.

## PromptParameterSet (per template)

| Field | Rule |
|-------|------|
| `name` | Matches a placeholder in the template text |
| `required` | Missing required name → actionable render error before any provider call (FR-005, SC-006) |
| `default` | Optional parameters keep the pre-change default exactly (FR-003) |
| `value` at render time | Any string — empty allowed if pre-change behavior allowed it; multiline SQL/XML, quotes, braces, backticks preserved verbatim; values are never re-scanned for placeholders (FR-006, spec Edge Cases) |

No parameter may be added, renamed, or re-semantized for cosmetic consistency (FR-003).

## PromptRegistryEntry

| Field | Rule |
|-------|------|
| `id` | PromptId — the only lookup key (SC-005) |
| `template` | Reference to the `PromptTemplate` |
| `paramSchema` | Typed parameter definition (names, required flags, defaults) |
| `sourceLocation` | Pre-migration file/line for traceability to the inventory record |

The registry is the single resolution point: no prompt text may be reachable outside it after migration (SC-002).

## PromptInventoryRecord (FR-001 audit artifact → `prompt-inventory.md`)

Fields: feature, existing prompt location, message role, prompt text (or verifiable reference), input parameters, parameter defaults, provider/model configuration, expected output format, output consumers, relevant tests, migration status.

**Lifecycle / state transitions**:

```text
discovered ──► baselined ──► migrated ──► verified
                  │              │
                  └──────────────┴──► deferred-risk   (terminal for this feature; requires documented
                                                        compatibility risk — Clarification Q1)
```

- **discovered**: identified during audit; no code changed yet.
- **baselined**: characterization test/fixture captures pre-change behavior (FR-011).
- **migrated**: service calls `renderPrompt(...)`; hard-coded text removed.
- **verified**: parity + regression tests green for that feature.
- **deferred-risk**: migration would risk an output contract; prompt stays hard-coded and is documented with its specific risk (never the default).

## LanguageContext

| Field | Rule |
|-------|------|
| `locale` | `en` \| `vi` — resolved by the existing i18n mechanism only (`src/i18n.ts`); no new preference, no new default (FR-009) |

Passed to templates exactly as today; no language behavior may change in this feature (Clarification Q2).

## OutputContractBaseline (immutable)

| Field | Rule |
|-------|------|
| `feature` | Owning AI feature |
| `messageSnapshot` | Recorded pre-change rendered messages (roles, order, bytes) |
| `requestSnapshot` | Recorded provider request settings (model, params, streaming mode) |
| `responseFixture` | Representative captured/mocked provider response |
| `uiExpectations` | Fields/sections the frontend consumes from the response |

**Immutability rule**: baselines are captured from the pre-change implementation once and MUST never be edited to make a failing test pass (FR-011; spec Ground-truth assumption).

## Relationships (summary)

- `PromptInventoryRecord` 1—1 `PromptTemplate` (after migration; record stays for traceability)
- `PromptRegistryEntry` 1—1 template + parameter schema
- `OutputContractBaseline` 1—1 feature
- `LanguageContext` is consumed by locale-variant templates; never stored
