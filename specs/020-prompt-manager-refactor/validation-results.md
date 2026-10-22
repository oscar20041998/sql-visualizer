# Validation Results — Feature 020

Evidence for the acceptance gates, recorded as each task runs. Newest sections last.
Commands are run from the repository root on branch `develop`.

Baseline for comparison: `specs/020-prompt-manager-refactor/baseline-results.md`.

## T025 — Single-location edit drill (SC-005)

**Question**: does changing one prompt's wording in exactly one location take effect for all of
that feature's requests, with no other file edited?

**Method**: appended the sentinel `DRILLSENTINEL` to the format-error explain prompt text inside
`src/lib/ai/prompts/templates/formatError.ts` only (the entry's own `text` field). No other file was
touched. Then ran the pilot's parity + feature suites.

**Command**: `npx vitest run tests/unit/promptParity.formatError.test.ts tests/unit/format-error-ai.test.ts tests/unit/format-fix-scope.test.ts`

**Result**: `Test Files 1 failed | 2 passed (3)` / `Tests 1 failed | 49 passed (50)`

```
× format-error parity baseline (feature 020, characterization of the pre-migration implementation)
    > sends a stable explain prompt message for the same input (U13, characterization)
  → expected 'A SQL formatter failed to parse a que…' to be 'A SQL formatter failed to parse a que…'
  - A SQL formatter failed to parse a query. Explain the failure and provide only a bounded SQL replacement fragment in one response.
  + A SQL formatter failed to parse a query. DRILLSENTINEL Explain the failure and provide only a bounded SQL replacement fragment in one response.
```

**Conclusion**: PASS. The one-line template edit propagated to the real service request and was
caught by the parity gate, proving (a) the edit needs exactly one location and (b) the gate is not
vacuous. Reverted byte-exactly from a pre-edit copy; `git diff` on the template shows no residue and
`DRILLSENTINEL` no longer appears anywhere in `src/`.

**Service-level drill**: `tests/unit/promptParity.aiServiceWiring.test.ts` repeats the same drill
programmatically for `sqlExplainer.explainSql` in both locales — mutating only `PROMPT_REGISTRY[id].text`
changes the bytes the real `explainSqlWithAI` sends.

## T026 — Cleanup completeness (Stage 6, SC-002)

**Question**: after cleanup, do extracted prompt texts exist only under
`src/lib/ai/prompts/templates/`, with no undocumented hard-coded prompt left?

**Method**: repo-wide sweep of `src/**/*.ts,*.tsx` for the distinctive opening lines of every
inventoried prompt, excluding the template directory.

**Command**:
```powershell
Get-ChildItem -Recurse -Include *.ts,*.tsx -Path src |
  Select-String -Pattern 'Reply with ONLY|Return only a JSON|Chỉ trả về|You are the SQL Visualizer|You are an expert database assistant|You are a SQL expert|Optimize the following SQL|Explain the following SQL|Explain the SQL query step|You translate SQL into plain business language' |
  Where-Object { $_.Path -notlike '*\ai\prompts\templates\*' }
```

**Result**: exactly one hit.

| File | Line | Finding |
|------|------|---------|
| `src/lib/store.ts` | 165 | `DEFAULT_AI_CONFIG.systemPrompt` — inventory **row 21**, documented `deferred-risk` |

**Removed from `src/lib/ai/aiService.ts`** (10 constant declarations, 3085 → 2739 lines before formatting):
`EXPLAIN_SQL_PROMPT`, `EXPLAIN_CTE_PROMPT`, `EXPLAIN_SQL_STRUCTURED_PROMPT`, `SEMANTIC_BRIEF_PROMPT`,
`OPTIMIZE_SQL_STRUCTURED_PROMPT`, `REQUIREMENT_CANDIDATE_PROMPT`, `REPAIR_PROPOSALS_PROMPT`,
`FOLLOW_UP_SYSTEM_PROMPT`, `DOCS_CONSULTANT_SYSTEM_PROMPT`, `DOCS_CONSULTANT_NO_CONTEXT_PROMPT`.
Every one of those call sites now renders through `renderPrompt`.

**Conclusion**: PASS. Zero undocumented hard-coded prompts remain. The single remaining source is
explicitly documented with its specific output-contract compatibility risk (FR-002 escape clause),
and `tests/unit/promptRegistry.test.ts` asserts that accounting automatically.

## T027 — Locale parity for every locale-variant prompt (US3, FR-009, SC-007)

**Command**: `npx vitest run tests/unit/promptParity.locales.test.ts`

**Result**: `Test Files 1 passed (1)` / `Tests 9 passed (9)`, 29ms

What the suite proves, for the 16 locale-variant bases and the 4 shared bases:

| Assertion | Outcome |
|-----------|---------|
| Every locale-variant base has an `.en` + `.vi` entry declaring the matching locale | PASS (32 entries) |
| The locale-variant count matches the inventory (16 bases × 2) | PASS |
| `en` and `vi` text differ for every pair (a true per-language branch, not a duplicate) | PASS |
| `localizedPromptId(base, locale)` resolves to that locale's entry, never the other | PASS |
| An unexpected locale (`fr`) falls back to the `en` entry, as `PROMPT[locale] ?? PROMPT.en` did | PASS |
| Shared prompts (formatError ×3, sqlComparison) have no locale and no `.en`/`.vi` variant | PASS |
| Only `en`/`vi` appear anywhere in the registry | PASS |
| Message role is identical between the two halves of every pair | PASS |
| Declared parameter names are identical between the two halves of every pair | PASS |

**Conclusion**: PASS. Language behavior matches the pre-change baseline in both locales; no feature
started or stopped following `settings.locale`.

## T028 — Language-discrepancy audit (US3, FR-010, SC-007)

**Method**: traced the language source for every in-scope feature (`settings.locale` → service
function `locale` argument → `localizedPromptId`), and compared the pre-migration locale handling
with the registry's.

**Result**: recorded in `prompt-inventory.md` → "Language behavior audit (T028 / FR-010, Q2)" as
six rows (L1–L6).

- **Genuine discrepancies documented, none fixed**: L1 (English `Retrieved documentation:` heading
  inside the Vietnamese docs-consultant message), L4 (English default system prompt), L5 (English TTS
  delivery notes).
- **Intentional designs, not defects**: L2 (formatError) and L3 (sqlComparison) vary the model's
  *output* language through a `languageInstruction` parameter while the instructions stay English, so
  the JSON keys remain parseable.
- **No discrepancy**: L6 — every locale-variant feature follows `settings.locale` exactly as before.

**Conclusion**: PASS. 100% of discovered discrepancies are documented with a smallest
backward-compatible proposal and proposed tests; **0 language-behavior changes were made** in this
feature (SC-007).

## T029 — Conversation-history format unchanged (US3, FR-008, A14)

**Command**: `npx vitest run tests/unit/dbAssistantChatHistoryHelpers.test.ts tests/unit/dbAssistantChatHistoryIdentity.test.ts`

**Result**: `Test Files 2 passed (2)` / `Tests 43 passed (43)`, 3.03s

**Corroborating evidence**: `git status` shows no file matching `ChatHistory`/`history` is modified by
this feature — the conversation-history helpers, storage version and message shape were never touched.
The `databaseAssistant` migration (T017) changed only how the system prompt *text* is obtained; the
message array assembly and the persisted history record are unchanged, which these 43 tests confirm.

**Conclusion**: PASS. History storage format, version and content round-trip unchanged.

## T030 — Full gates vs baseline (SC-004, FR-016)

Baseline is `baseline-results.md` (recorded on the untouched tree, commit `a931f41`).

| # | Command | Baseline | After feature 020 | Verdict |
|---|---------|----------|-------------------|---------|
| 1 | `npx vitest run` | PASS — 77 files / 705 tests / 0 failed | **PASS — 84 files / 826 tests / 0 failed** (94.74s) | PASS — 0 new failures; +7 files / +121 tests are this feature's new suites |
| 2 | `npx tsc --noEmit` | PASS — no diagnostics | **PASS — no diagnostics** | PASS |
| 3 | `npx next lint` | FAIL (pre-existing debt) — 59 errors / 98 warnings / 44 files | **58 errors / 98 warnings** | PASS — 1 FEWER error, 0 new warnings |
| 4 | `npm run build` | PASS — compiled + 24/24 static pages | **PASS — `✓ Compiled successfully` + `✓ Generating static pages (24/24)`** | PASS |

**New test files added by this feature** (all green):

| Suite | Tests | Purpose |
|-------|-------|---------|
| `promptRender.test.ts` | 14 | renderer contract (U1–U9) + T024 per-id error paths |
| `promptRegistry.test.ts` | 6 | registry audit (U10, U12) + T023 completeness vs inventory |
| `promptParity.formatError.test.ts` | 3 | pilot characterization (US1) |
| `promptParity.databaseAssistant.test.ts` | 8 | databaseAssistant parity (T011) |
| `promptParity.comparison.test.ts` | 15 | sqlComparison parity (T010) |
| `promptParity.dashboard.test.ts` | 18 | dashboard parity (T015) |
| `promptParity.aiServiceCore.test.ts` | 26 | sqlExplainer / semanticBrief / optimize parity (T012, T013) |
| `promptParity.aiServiceFlow.test.ts` | 17 | requirement / repair / followUp / docsConsultant parity (T014) |
| `promptParity.aiServiceWiring.test.ts` | 19 | real-service wiring + SC-005 drill (closes the duplicate-text gap) |
| `promptParity.locales.test.ts` | 9 | locale parity in `en` + `vi` (T027) |

**Lint delta explanation (no new findings)**: the count went from 59 → 58 errors. The 16
`no-useless-escape` errors now reported in `src/lib/ai/prompts/templates/optimize.ts` (lines 65–69)
are **relocated, not new** — the identical `\"instruction_status\"` escape sequence exists in the
baseline `src/lib/ai/aiService.ts` (verified with `git show a931f41:src/lib/ai/aiService.ts`), and the
migration moved that text verbatim into the template. The one fewer error is a `prettier/prettier`
finding in `src/lib/sql/dashboard/aiPrompts.ts` that the migration removed along with the file's old
builder formatting.

**Build note**: the `docs-index` step (`npm run build:docs-index`) intermittently failed with
`Error: UNKNOWN: unknown error, open 'src\lib\ai\docsIndex.json'` (`errno -4094`) on this Windows
host. Diagnosis: the 29 MB `docsIndex.json` was temporarily unwritable **at the same path** while a
sibling-file write succeeded and `open(r+)` succeeded — i.e. an OS-level lock/AV scanner holding the
file, not a code problem. `npx next build` (the actual compile+prerender step) passed on the first
attempt every time, and `npm run build` passed once the lock cleared. This is environmental and
pre-existing; no source file in this feature touches `docsIndex.json` or the docs-index script.

**Conclusion**: PASS. Zero new failures across all four gates; the pre-existing lint debt is
documented separately and was not increased.

## T031 — Quickstart Scenarios 0–7 (FR-017)

| Scenario | What it checks | Outcome |
|----------|----------------|---------|
| 0 — Baseline recorded | four commands captured before any edit | PASS — `baseline-results.md` (77 files / 705 tests; tsc clean; lint 59 err / 98 warn; build OK) |
| 1 — Inventory exists | every discovered prompt has an FR-001 row + status | PASS — `prompt-inventory.md`: 22 rows, 20 migrated, 2 `deferred-risk` with specific risks |
| 2 — Output parity per feature | byte-identical messages/requests/results per feature | PASS — all 8 `promptParity.*` suites green (see T030 table) |
| 3 — Renderer safety | actionable errors, no I/O, byte-exact special chars | PASS — `promptRender.test.ts` (14) + `promptRegistry.test.ts` (6) |
| 4 — Single-location edit drill | one template edit, no other file | PASS — see T025 above |
| 5 — Language preserved | `en` + `vi` parity, discrepancies documented | PASS — `promptParity.locales.test.ts` (9) + inventory L1–L6 |
| 6 — Full gate | zero new failures vs Scenario 0 | PASS — see T030 above |
| 7 — Cleanup completeness | prompt text only under `templates/` | PASS — see T026 above; one documented `deferred-risk` row |

**Conclusion**: all seven scenarios PASS.

## T032 — Final diff review against the out-of-scope list (SC-008)

**Command**: `git --no-pager diff --numstat -- src ':!src/lib/ai/docsIndex.json'`

**Modified source files** (5):

| File | +/- | Nature of change |
|------|-----|------------------|
| `src/lib/ai/aiService.ts` | 77 / 413 | 10 prompt constants deleted; imports + 9 call sites switched to `renderPrompt` |
| `src/lib/ai/formatErrorAi.ts` | 441 / 521 | pilot migration (US1) |
| `src/lib/ai/sqlComparisonAi.ts` | 20 / 79 | builders delegate to `renderPrompt`; bound helpers relocated |
| `src/lib/ai/databaseAssistant.ts` | 19 / 33 | 3 constants deleted; system-message assembly wired to `renderPrompt` |
| `src/lib/sql/dashboard/aiPrompts.ts` | 60 / 53 | 3 builders delegate to `renderPrompt` |

**New files**: `src/lib/ai/prompts/{registry,render}.ts` + `templates/*.ts` (11 modules), and 10
test suites under `tests/unit/`.

**Out-of-scope list check** — all clear:

| Forbidden change | Evidence | Verdict |
|------------------|----------|---------|
| Prompt-wording improvements | Every parity suite compares registry output against verbatim pre-migration copies; all green. The relocation diff shows removed constants re-appearing byte-identically in `templates/` | CLEAR |
| JSON/schema/field renames | No `optimized_sql`, `query_objective`, `proposals`, `instruction_status`, … renamed; `OPTIMIZE_PLACEHOLDER_ECHOES` still matches the same literals | CLEAR |
| Markdown-section changes | No section heading or ordering changed | CLEAR |
| Provider/model/setting changes | `git diff` over `src/lib/ai` shows no `provider:`, `modelId`, `ollamaModel`, `temperature:`, `maxOutputTokens`, `contextTokens`, `DEFAULT_CHAT_MODELS` or `stream:` edits | CLEAR |
| UI changes | `git diff --numstat -- src/components src/app` is **empty** | CLEAR |
| Unrelated refactoring | Diff is confined to prompt relocation + the new prompt core; no unrelated module touched | CLEAR |
| Debug code / temp artifacts | All `tmp-*` probe files removed; working tree contains only feature files, spec artifacts and the pre-existing `docsIndex.json` regeneration | CLEAR |

**Known, non-code diff noise**: `src/lib/ai/docsIndex.json` is regenerated by `npm run build`
(1,014,613 lines). It is a build output, was already modified before this session, and is not
touched by any feature-020 source file. It is excluded from the table above and called out here so
the diff reviewer does not mistake it for a feature change.

**Conclusion**: PASS — zero out-of-scope changes.



