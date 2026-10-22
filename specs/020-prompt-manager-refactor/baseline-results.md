# Baseline Results — Feature 020 (T001)

Recorded **before any migration edit**, on branch `develop`. These four commands are the
pre-migration baseline for FR-016 (zero new failures) and the `converge` gate (FR-017).

Environment: Windows / PowerShell, Node + npm, Next.js 15.5.18, Vitest 2.1.9, TypeScript 5.

## Commands and results

| # | Command | Result | Evidence |
|---|---------|--------|----------|
| 1 | `npm test` (`vitest run`) | **PASS** | `Test Files  77 passed (77)` / `Tests  705 passed (705)` / `Duration 65.26s` — 0 failed |
| 2 | `npm run type-check` (`tsc --noEmit`) | **PASS** | No diagnostics emitted; clean exit |
| 3 | `npm run lint` (`next lint`) | **FAIL (pre-existing debt)** | **59 errors, 98 warnings** across **44 files** |
| 4 | `npm run build` (`next build`) | **PASS** | `✓ Compiled successfully in 43s`, `✓ Generating static pages (24/24)` |

## Baseline lint debt (must NOT be attributed to this feature)

The lint failures exist on the untouched tree and are **out of scope** for feature 020
(SC-008: no unrelated refactoring). None of them are in `src/lib/ai/prompts/` or in any file
this feature migrates for prompt text. Representative samples:

| Rule | Example location |
|------|------------------|
| `no-misleading-character-class` | `src/lib/sql/sqlFormatValidator.ts:41` |
| `no-useless-escape` | `:228` (unnecessary escape `\[`) |
| `react/no-unescaped-entities` | `:31` (unescaped `'`) |
| `prettier/prettier` | many CRLF/indent findings (e.g. `:1001`–`:1018`) |
| `@typescript-eslint/no-unused-vars` | `:2641` (`'tables' is defined but never used`) |

**Gate interpretation**: for FR-016 / FR-017, "lint clean" means **no NEW findings in files this
feature touches**. The 59/98 pre-existing counts above are the comparison baseline; the count
must not increase.

## Baseline test surface relevant to this feature

| Suite | Role in 020 |
|-------|-------------|
| `tests/unit/promptRender.test.ts` (8) | Renderer behavior contract (T003) |
| `tests/unit/promptRegistry.test.ts` (2) | Registry audit + uniqueness (T004). **Vacuous while the registry is empty** — it becomes a real gate as entries are registered |
| `tests/unit/promptParity.formatError.test.ts` (3) | Characterization baseline pinning the exact pre-migration format-error prompt bytes (T006) |
| `tests/unit/format-error-ai.test.ts`, `format-error-ai-fix.test.ts`, `format-fix-scope.test.ts` | Import `buildExplainFormatErrorPrompt` / `buildFormatFixPrompt` — these exported signatures are part of the feature's surface and must survive migration |
| `tests/unit/sqlComparisonAi.test.ts`, `tests/unit/dashboardAiPrompts.test.ts` | Import the comparison + dashboard builders — same constraint |
| `tests/unit/explainerContract.test.ts` (21), `guestAccess.test.tsx` (16) | Downstream output contracts that must not regress |

## Immutability

Per FR-011 and the spec's ground-truth assumption, these numbers are the fixed comparison point.
They are never re-recorded or edited to make a failing post-migration run look clean.
