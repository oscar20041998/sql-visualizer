# Completion Report — Feature 020: AI Prompt Management Refactor

**Spec**: `specs/020-prompt-manager-refactor/spec.md` · **Plan**: `plan.md` · **Tasks**: `tasks.md`
**Branch**: `develop` · **Baseline commit**: `a931f41`

## 1. Outcome

All in-scope hard-coded AI prompts are now externalized into a single centralized, validated prompt
core at `src/lib/ai/prompts/`. Every feature obtains its prompt text through `renderPrompt(...)`;
zero prompt text remains hard-coded in request or service code except two explicitly documented
`deferred-risk` rows. Output behavior is provably unchanged: 826 tests pass, the type-checker is
clean, and the production build succeeds.

## 2. Files changed

### New — prompt core (13 files)

| File | Role |
|------|------|
| `src/lib/ai/prompts/registry.ts` | `PromptId`/`PromptEntry`/`ParamSchema` types + the assembled `PROMPT_REGISTRY` (36 entries) |
| `src/lib/ai/prompts/render.ts` | `renderPrompt(id, params)` — pure, validated, single-pass fill; `localizedPromptId(base, locale)` |
| `src/lib/ai/prompts/templates/formatError.ts` | 3 entries (pilot) |
| `src/lib/ai/prompts/templates/sqlExplainer.ts` | 6 entries |
| `src/lib/ai/prompts/templates/semanticBrief.ts` | 2 entries |
| `src/lib/ai/prompts/templates/optimize.ts` | 2 entries |
| `src/lib/ai/prompts/templates/requirement.ts` | 2 entries |
| `src/lib/ai/prompts/templates/repair.ts` | 2 entries |
| `src/lib/ai/prompts/templates/followUp.ts` | 2 entries |
| `src/lib/ai/prompts/templates/docsConsultant.ts` | 4 entries |
| `src/lib/ai/prompts/templates/databaseAssistant.ts` | 6 entries |
| `src/lib/ai/prompts/templates/sqlComparison.ts` | 1 entry |
| `src/lib/ai/prompts/templates/dashboard.ts` | 6 entries |

### Modified — migrated services (5 files)

| File | Change |
|------|--------|
| `src/lib/ai/aiService.ts` | 10 prompt constants removed (3085 → 2739 lines); 9 call sites now render via `renderPrompt` |
| `src/lib/ai/formatErrorAi.ts` | prompt text relocated; exported builder signatures preserved |
| `src/lib/ai/sqlComparisonAi.ts` | builders delegate to `renderPrompt`; SQL/facts bounds moved with the text |
| `src/lib/ai/databaseAssistant.ts` | 3 constants removed; system-message assembly wired to `renderPrompt` |
| `src/lib/sql/dashboard/aiPrompts.ts` | 3 builders delegate to `renderPrompt` |

### New — tests (10 suites, 121 tests)

`promptRender.test.ts` (14) · `promptRegistry.test.ts` (6) · `promptParity.formatError.test.ts` (3) ·
`promptParity.databaseAssistant.test.ts` (8) · `promptParity.comparison.test.ts` (15) ·
`promptParity.dashboard.test.ts` (18) · `promptParity.aiServiceCore.test.ts` (26) ·
`promptParity.aiServiceFlow.test.ts` (17) · `promptParity.aiServiceWiring.test.ts` (19) ·
`promptParity.locales.test.ts` (9)

### New — spec artifacts

`spec.md` · `plan.md` · `research.md` · `data-model.md` · `contracts/` · `quickstart.md` ·
`tasks.md` · `checklists/requirements.md` · `prompt-inventory.md` · `baseline-results.md` ·
`validation-results.md` · `tdd/test-list.md` · `tdd/cycle-log.md` · this report.

## 3. Prompts migrated, with final status

**36 registry entries from 20 inventory rows — all `verified`.**

| Rows | Feature | Entries | Status |
|------|---------|---------|--------|
| 1–3 | sqlExplainer | 6 (`.en`/`.vi` × 3) | verified |
| 4 | semanticBrief | 2 | verified |
| 5 | optimize | 2 | verified |
| 6 | requirement | 2 | verified |
| 7 | repair | 2 | verified |
| 8 | followUp | 2 | verified |
| 9–10 | docsConsultant | 4 | verified |
| 11–13 | databaseAssistant | 6 | verified |
| 14–16 | formatError (pilot) | 3 (shared) | verified |
| 17 | sqlComparison | 1 (shared) | verified |
| 18–20 | dashboard | 6 | verified |

## 4. Remaining hard-coded prompts (documented risks)

| Row | Prompt | Location | Why deferred | Risk if migrated now |
|-----|--------|----------|--------------|----------------------|
| 21 | `DEFAULT_AI_CONFIG.systemPrompt` | `src/lib/store.ts:165` | It is **persisted user configuration**, not just prompt text; `normalizePersistedAiConfig` migrates stored values against it | Migrating would either re-introduce a frozen copy of the default in the settings object (defeating the refactor) or change the exported settings contract (FR-007/FR-008, SC-008) |
| 22 | `SPEECH_INSTRUCTIONS` | `src/lib/ai/aiSpeech.ts:55` | It is the OpenAI `/v1/audio/speech` `instructions` field, not a chat message; it has no `AIRole`, and the field is dropped for `tts-1` models | Registering it would force a fake role and change the request-body shape (FR-007) |

Both are single static, parameter-free strings, so neither can drift out of sync with a template.
Both carry a smallest-backward-compatible proposal and proposed tests in `prompt-inventory.md`.
**Zero undocumented hard-coded prompts remain** (SC-002).

## 5. Tests executed — actual results

| Command | Baseline (`a931f41`) | Final | Verdict |
|---------|----------------------|-------|---------|
| `npx vitest run` | 77 files / 705 tests / 0 failed | **84 files / 826 tests / 0 failed** (94.74s) | 0 new failures |
| `npx tsc --noEmit` | no diagnostics | **no diagnostics** | PASS |
| `npx next lint` | 59 errors / 98 warnings | **58 errors / 98 warnings** | 1 fewer error, 0 new |
| `npm run build` | compiled + 24/24 pages | **compiled + 24/24 pages** | PASS |

Independent gates that caught real defects during implementation (all reverted byte-exactly):

- **Registry-edit drill** (`DRILLSENTINEL` in one template): caught by `promptParity.formatError.test.ts`
  → proves SC-005 (one location) and that the gate is not vacuous.
- **Service-level mutation** (`explainSqlParams(sql + ' MUTANT')`): caught by 4 failures in
  `promptParity.aiServiceWiring.test.ts` → proves the real service path, not just the registry, is pinned.

## 6. Unresolved compatibility risks

| Risk | Assessment |
|------|------------|
| `promptParity.aiServiceCore/Flow` compare the registry against **test-local** `OLD_*` copies rather than against `aiService.ts` | **Mitigated.** `promptParity.aiServiceWiring.test.ts` (19 tests) drives the real exported service functions through a stubbed `fetch` and asserts the exact provider request equals `renderPrompt` output, so a private copy inside `aiService.ts` can no longer hide |
| The `no-useless-escape` lint errors now reported in `optimize.ts` could be mistaken for new | **Non-issue, documented.** They are relocated from the baseline `aiService.ts` (same `\"instruction_status\"` escapes), verified with `git show a931f41:src/lib/ai/aiService.ts`; the total error count did not increase |
| `npm run build`'s docs-index step intermittently fails with `UNKNOWN: open 'docsIndex.json'` | **Environmental, pre-existing.** The 29 MB file was temporarily locked at the same path while sibling writes succeeded; `npx next build` always passed, and `npm run build` passed once the lock cleared. No feature file touches it |
| English strings inside otherwise-localized prompts (L1/L4/L5 in the inventory) | **Documented, not fixed** per FR-010. Each has a proposed smallest backward-compatible change; none is a regression introduced by this refactor |
| Model output is nondeterministic | **Out of scope by design.** Parity is proven with recorded baselines, request snapshots and mocked provider responses, not live-model response equality |

## 7. Traceability summary

Requirement → test coverage:

| Requirement | Covered by |
|-------------|------------|
| FR-001 (inventory) | `prompt-inventory.md` (22 rows); audited by `promptRegistry.test.ts` |
| FR-002 / SC-002 (no undocumented hard-coded prompts) | `promptRegistry.test.ts` completeness + template-module checks; `validation-results.md` T026 sweep |
| FR-003/FR-004/FR-006 (params, verbatim text, byte preservation) | `promptRender.test.ts` U3–U6; all `promptParity.*` suites |
| FR-005 / SC-006 (actionable errors, no provider call) | `promptRender.test.ts` T024 block (every registered id) |
| FR-007/FR-008 (provider & output contracts) | `promptParity.aiServiceWiring.test.ts` request snapshots; existing feature suites |
| FR-009/FR-010 / SC-007 (language) | `promptParity.locales.test.ts`; inventory audit L1–L6 |
| FR-011/FR-012/FR-013 (characterization tests, no network) | `tdd/test-list.md` + `tdd/cycle-log.md`; all parity suites use mocked `fetch` |
| FR-016/FR-017 / SC-004 (zero new failures, report) | `validation-results.md` T030; this report |
| SC-005 (single-location edit) | `validation-results.md` T025 drill + the wiring suite's registry-edit case |
| SC-008 (no out-of-scope changes) | `validation-results.md` T032 diff review |

## 8. Commits

None. The repository has no commit convention approved by the user for this branch, so the working
tree is left dirty and reported rather than committed (consistent with the standing instruction
recorded across `tdd/cycle-log.md` cycles 1–13).


