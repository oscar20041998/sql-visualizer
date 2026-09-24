# Implementation Plan: SQL Format Error Diagnostics with AI

**Branch**: `012-format-error-ai-diagnostics` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-format-error-ai-diagnostics/spec.md`

## Summary

Replace the toast-only format-error handling in the Smart SQL Editor with a dedicated, toggleable error panel docked on the right side of the screen. The panel captures a structured format error (message, dialect, location, snippet) and offers two on-demand, local-Ollama-powered actions: **Explain** (plain-language explanation + root cause, grounded in the actual SQL and error) and **Fix** (a minimal, semantics-preserving corrected SQL shown side-by-side before/after and applied only on explicit confirmation). Format success behavior is unchanged.

Technical approach: capture the `sql-formatter` throw in `handleFormatSQL`, normalize it into a structured `FormatError`, and render it in a new collapsible right-side component. Reuse the existing AI adapter (`aiService.ts`, direct browser→Ollama `/v1/chat/completions`) with two new structured prompts (explain, fix) and reuse the existing Monaco `DiffEditor` for the before/after review.

## Technical Context

**Language/Version**: TypeScript 5 (strict; `npm run type-check`), React 19.0.3, Next.js 15.5.18 (App Router, `src/app/*`; dev port 4028)

**Primary Dependencies**: sql-formatter 15.8.2 (formatting + thrown error shape), @monaco-editor/react + monaco-editor 0.55.1 (editor + DiffEditor), zustand 4.5.5 (`src/lib/store.ts`), sonner 1.7.4 (toasts, retained for success), lucide-react + @heroicons/react (icons), Tailwind CSS 3.4.6 (dark theme default, cyan accent)

**Storage**: Client only — Zustand `persist` (settings). No new persistent storage; error panel state is transient component state (session-only), consistent with the analysis-state lifetime.

**Testing**: Vitest 2.1.9 + @testing-library/react 16 + jsdom (existing `tests/unit/`, `npm run test`). Add unit tests for error capture/modeling, panel toggle, stale-proposal invalidation, and AI prompt building (mocked fetch).

**Target Platform**: Web browser (Next.js App Router), single app.

**Project Type**: Web application (Next.js 15, App Router).

**Performance Goals**: Error panel opens with diagnostic <1s after the Format click (excluding AI); grounded explanation <30s on a local machine (SC-004); zero regression to the format success flow (SC-002).

**Constraints**: Local Ollama only for v1 (no cloud); no SQL transmitted off-device; review-before-apply with a minimal semantics-preserving fix; TypeScript strict (no `any`); reuse the existing design system (dark theme, EN/VI locales).

**Scale/Scope**: Single-user editor; queries up to several hundred lines (the formatter already handles large SQL); one error per format attempt (first failure).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Multi-Dialect SQL Analysis** — PASS. Reuse `getFormatterLanguage()` (mysql/postgresql/tsql/plsql) to format and to tag the error and the prompt with the active dialect.
- **II. Interactive Visualization First** — N/A. This feature is diagnostics, not a visualization.
- **III. Real-Time Feedback Loop** — PASS. Explanation/fix stream or incrementally refresh within the panel (reuse existing streaming helpers in `aiService.ts`); no full page reload.
- **IV. AI-Grounded Explanations** — PASS. The explain prompt embeds the exact error message, offending SQL, and dialect; the output must reference them and never contradict the formatter (FR-008).
- **V. Minimal Deployment Friction** — PASS. Local Ollama only, direct browser→Ollama (no key, no cloud), model config read from existing `settings.aiConfig` (FR-011).
- **Security & Privacy** — PASS. No SQL leaves the device (FR-014); no credentials exposed to the browser.
- **Quality Standards** — PASS. Unit + integration tests (Vitest) for new logic; TypeScript strict; inline comments documenting dialect behavior.
- **Performance** — PASS. SC-001 (<1s panel) and SC-004 (<30s explanation) are within existing targets.

No violations → Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/012-format-error-ai-diagnostics/
├── plan.md              # this file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── format-error-ai-contract.md
└── tasks.md             # Phase 2 output (/speckit-tasks - NOT created here)
```

### Source Code (repository root)

```text
src/
├── app/smart-sql-editor/
│   ├── page.tsx                       # add right-side panel slot + responsive layout
│   └── components/
│       ├── SmartSQLEditor.tsx         # capture format error; expose to panel + apply fix
│       └── FormatErrorPanel.tsx       # NEW: toggleable right-side panel
├── lib/
│   ├── ai/
│   │   └── formatErrorAi.ts           # NEW: explain/fix prompt builders + response parsing
│   ├── sql/
│   │   └── formatError.ts             # NEW: FormatError model + capture helper
│   └── store.ts                       # unchanged (no new persisted state)
└── locales/en.ts, vi.ts               # NEW i18n keys for panel + states

tests/unit/
├── format-error.test.ts               # NEW: error capture/modeling
├── format-error-panel.test.tsx        # NEW: toggle + stale proposal + states
└── format-error-ai.test.ts            # NEW: prompt building + response parsing
```

**Structure Decision**: Single Next.js app (existing). Add one panel component, one error-model helper (`src/lib/sql/formatError.ts`, beside the analyzer), and AI prompt/response logic (`src/lib/ai/formatErrorAi.ts`, beside `aiService.ts`). The panel is composed into `page.tsx` beside the editor; error and AI state live in local component state (not the persisted store).
