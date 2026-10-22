# Quickstart: Validation Guide (AI Prompt Management Refactor)

End-to-end validation scenarios proving the feature works. Design detail lives in [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/](./contracts/); implementation steps belong to `tasks.md` (not created by `/speckit-plan`).

## Prerequisites

- Node.js + npm installed; dependencies installed (`npm install`).
- **No AI credentials needed** — all scenarios use the existing mocked-`fetch` patterns; unit tests must not hit the network (FR-012).
- Working tree may contain pre-existing test failures; they are baseline debt, recorded not fixed (research.md Decision 9).

## Scenario 0 — Record the baseline (before any code edit)

```bash
npm test
npm run type-check
npm run lint
npm run build
```

**Expected**: verbatim outputs saved (pass/fail per command, failing test names). Any failure recorded here is pre-existing and excluded from this feature's verdict (SC-004).

## Scenario 1 — Prompt inventory exists (FR-001)

**Check**: `specs/020-prompt-manager-refactor/prompt-inventory.md` lists every discovered prompt with all FR-001 fields and a `migration status`.
**Expected**: no AI feature with a hard-coded prompt is missing a row; statuses use only the data-model lifecycle values.

## Scenario 2 — Output parity per migrated feature (SC-001, FR-013)

```bash
npx vitest run tests/unit/promptParity.formatError.test.ts   # pilot
npx vitest run tests/unit/promptParity.*.test.ts             # all features
```

**Expected**: every invariant in [contracts/output-parity.md](./contracts/output-parity.md) green per feature — byte-identical messages, unchanged request settings, identical parsed/UI results against fixtures, unchanged streaming/error/locale behavior. **Zero diffs unexplained.**

## Scenario 3 — Renderer safety (SC-003, SC-006, FR-005/FR-006)

```bash
npx vitest run tests/unit/promptRender.test.ts tests/unit/promptRegistry.test.ts
```

**Expected**:
- Missing required parameter / unknown prompt id → actionable error, no provider call.
- Registry audit: every `{{placeholder}}` in every template is in its schema; registry ↔ inventory complete.
- Multiline SQL/XML, quotes, braces, backticks, empty values round-trip byte-for-byte; `{{` inside values is treated as content.
- No filesystem/network access in the render path (path traversal impossible by construction).

## Scenario 4 — Single-location edit drill (SC-005)

Temporarily change one template's wording in `src/lib/ai/prompts/templates/`, run the feature's parity test (expect it to catch the diff), revert.

**Expected**: exactly one file changed to affect all usages of that prompt; no request-handling code touched; parity test fails on the change (proving it is observed), passes after revert.

## Scenario 5 — Language behavior preserved (SC-007, Q2)

```bash
npx vitest run tests/unit/promptParity.*.test.ts -t "locale"   # en + vi coverage
```

**Expected**: identical behavior per locale vs baseline; every discovered language discrepancy appears in the inventory as documented — **no** behavior change shipped in this feature.

## Scenario 6 — Full gate (SC-004, SC-008, FR-016/FR-017)

```bash
npm test
npm run type-check
npm run lint
npm run build
git diff --stat
```

**Expected**: zero new failures vs Scenario 0; diff touches only prompt-management, migration, test, and spec-dir files — no provider/model/UI/output changes; final report lists migrated prompts, remaining `deferred-risk` items with reasons, and residual risks.

## Scenario 7 — Cleanup completeness (SC-002)

**Check**: repo-wide search for the extracted prompt texts finds them only under `src/lib/ai/prompts/templates/`; any exception is a `deferred-risk` inventory row with a specific output-contract risk (Q1).
**Expected**: zero undocumented hard-coded prompts remain.
