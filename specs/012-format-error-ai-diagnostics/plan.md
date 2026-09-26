# Implementation Plan: SQL Format Error Diagnostics with AI

**Branch**: `012-format-error-ai-diagnostics` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-format-error-ai-diagnostics/spec.md` (revised by `/speckit-clarify` on 2026-09-25)

## Summary

Replace the toast-only format-error handling in the Smart SQL Editor with a dedicated, toggleable error panel docked on the right side of the screen. The panel captures a structured format error (message, dialect, location when available) and offers two on-demand, local-Ollama actions: **Explain** (plain-language explanation + root cause, grounded in the actual SQL, the error, and the parser's findings) and **Fix** (a minimal correction shown side-by-side before/after).

Applying a fix is **region-bounded** (FR-017): the system resolves the erroneous region from the captured error location — falling back to the AST cross-check parser when the formatter reports no position (FR-019) — and splices only that region into the editor, leaving every character outside it untouched. A proposal that changes SQL outside the region is rejected with a retry affordance (FR-018), and when no region can be determined at all, no applicable fix is offered (FR-020). Format success behaviour is unchanged.

Technical approach: capture the `sql-formatter` throw in `handleFormatSQL`, resolve a contiguous error region with a small pure module, extract the model's actual change by common-prefix/suffix diff, and gate the splice on region containment. Reuse the existing AI adapter (`aiService.ts`, direct on-device call to Ollama) with two structured prompts and the existing Monaco `DiffEditor` for review.

## Technical Context

**Language/Version**: TypeScript 5 (strict; `npm run type-check`), React 19.0.3, Next.js 15.5.18 (App Router, `src/app/*`; dev port 4028)

**Primary Dependencies**: sql-formatter 15.8.2 (formatting + thrown error shape), dt-sql-parser (AST cross-check parser; fallback source for the error region), @monaco-editor/react + monaco-editor 0.55.1 (editor + DiffEditor), zustand 4.5.5 (`src/lib/store.ts`), sonner 1.7.4 (toasts, retained for success), lucide-react + @heroicons/react (icons), Tailwind CSS 3.4.6 (light/dark themes, cyan accent)

**Storage**: Client only — Zustand `persist` (settings). No new persistent storage; error, region and proposal state are transient component state (session-only), matching the analysis-state lifetime.

**Testing**: Vitest 2.1.9 + @testing-library/react 16 + jsdom (`tests/unit/`, `npm run test`). The new pure modules (region resolution, change-span extraction, containment guard, splice) are unit-tested without a DOM; the panel and apply flow are integration-tested with `aiService` mocked.

**Target Platform**: Web browser (Next.js App Router), single app.

**Project Type**: Web application (Next.js 15, App Router).

**Performance Goals**: Panel opens with the diagnostic <1s after the Format click, excluding AI (SC-001); explanation/fix response <30s on a local machine (SC-004). Plan-added budget: region resolution + change-span extraction + splice run in O(n) over the SQL text and complete in <50 ms for a 1000-line query, so the guard is never felt as a stall.

**Observability**: Each AI request records phase, duration and outcome (ready / unavailable / malformed / rejected-by-guard) through the existing `aiService` failure classification, so SC-004 latency and guard-rejection counts can be measured locally.

**Verification**: `npm run type-check`, `npm run test`, targeted `vitest run` for the new modules, plus the manual `quickstart.md` scenarios S1–S12. SC-005 (≥70% first-proposal fix success) and SC-006 (satisfaction rating) are **not** verifiable as written — a fixture-corpus measurement task plus SC-003/SC-005/006 rewording are carried into `/speckit-tasks` and a follow-up `/speckit-clarify`.

**Constraints**: Local Ollama only (no cloud); an on-device direct call is allowed but no credential may live in the browser (FR-011, FR-014); review-before-apply with a region-bounded splice; out-of-region and undeterminable-region proposals are never applied; a single complete AI response, no streaming (FR-021); TypeScript strict (no unjustified `any`); reuse the existing design system (EN/VI locales, light/dark themes).

**Scale/Scope**: Single-user editor; queries up to several hundred/thousand lines; one error per format attempt (first failure).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Multi-Dialect SQL Analysis** — PASS. The dialect comes from the existing `getFormatterLanguage()` mapping, and dialect-specific error shapes are captured by `captureFormatError()` and pinned by fixtures. The AST cross-check parser (dt-sql-parser) is now the documented **fallback source for the error region**, which strengthens the §I dual cross-check rather than bypassing it.
- **II. Interactive Visualization First** — N/A. This feature is diagnostics, not visualization.
- **III. Real-Time Feedback Loop** — **DEVIATION (accepted, recorded)**. §III expects AI explanations to stream or incrementally refresh; this feature's on-demand diagnostics return one complete response with explicit loading states and no page reloads (FR-021). Accepted during `/speckit-clarify` (2026-09-25) and recorded in the spec's Assumptions; raising the §III amendment is tracked outside this feature (see Complexity Tracking).
- **IV. AI-Grounded Explanations** — PASS. Both prompts embed the captured error message, the dialect, the bounded region snippet and — when the formatter gave no position — the AST parser's error findings (FR-019). Because the model may not change anything outside the region, its output cannot contradict the formatter/parser facts (FR-017, FR-018).
- **V. Minimal Deployment Friction** — PASS. Reuses the existing `aiService` adapter: a direct on-device call to Ollama, no new endpoint, no credential in the browser (FR-011).
- **Security & Privacy** — PASS. On-device Ollama is explicitly permitted; cloud providers remain out of scope for v1, and neither SQL nor credentials leave the machine (FR-014, SC-007).
- **Quality Standards** — PASS. New pure logic (region resolution, change-span extraction, containment guard, splice) plus the panel/apply flow are covered by Vitest unit and integration tests with dialect-specific edge cases; TypeScript strict; inline comments explain the region/guard algorithm and its known limitations.
- **Performance** — PASS. SC-001/SC-004 are met by construction (synchronous local work plus on-device inference) and are instrumented per Observability/Verification above.

*Post-design re-check (Phase 1): unchanged — the only constitution-sensitive choice (§III streaming) was resolved in clarification; the region/guard design introduced no new violation.*

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
├── checklists/
│   └── requirements.md  # specification quality checklist (re-validated by /speckit-clarify)
└── tasks.md             # Phase 2 output (/speckit-tasks - NOT created here)
```

### Source Code (repository root)

```text
src/
├── app/smart-sql-editor/
│   ├── page.tsx                       # panel slot + responsive layout; scoped-apply wiring
│   └── components/
│       ├── SmartSQLEditor.tsx         # capture format error; expose panel; apply region-bounded splice
│       └── FormatErrorPanel.tsx       # toggleable panel; explain/fix; applicability states
├── lib/
│   ├── ai/
│   │   ├── formatErrorAi.ts           # explain/fix prompt builders (region + parser grounding), parsers
│   │   └── aiService.ts               # unchanged (direct on-device Ollama adapter)
│   ├── sql/
│   │   ├── formatError.ts             # FormatError model + capture helper (existing; locationSource added)
│   │   ├── formatErrorRegion.ts       # NEW: resolve the erroneous region (formatter → AST fallback)
│   │   └── formatFixScope.ts          # NEW: change-span extraction, containment guard, splice builder
│   └── store.ts                       # unchanged (no new persisted state)
└── locales/en.ts, vi.ts               # i18n keys for panel, applicability states and region copy

tests/unit/
├── format-error.test.ts               # capture + locationSource (extended)
├── format-error-region.test.ts        # NEW: region resolution, formatter + AST fallback, undeterminable
├── format-fix-scope.test.ts           # NEW: span extraction, out-of-range guard, splice, staleness
├── format-error-panel.test.tsx        # panel toggle, applicability states, apply/dismiss/stale
├── format-error-ai.test.ts            # prompt grounding (region + parser findings) + response parsing
└── smart-sql-editor-format-error-page.test.tsx  # apply path through the editor API (existing; extended)
```

**Structure Decision**: Single Next.js app (existing), consistent with the repository's `src/app/**` for routes and `src/lib/**` for domain logic. Two new **pure, DOM-free** modules are deliberate: `formatErrorRegion.ts` turns a captured error into a bounded range, and `formatFixScope.ts` turns (original, proposed, region) into either a splice or a rejection reason. Keeping them free of React and of the editor makes the safety-critical logic exhaustively unit-testable — the user-visible risk is "AI silently rewrote unrelated SQL", so its guard must not depend on component rendering. The panel component only orchestrates these results and renders states.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Constitution §III "AI explanations MUST stream or incrementally refresh" — this feature returns one complete response with loading states (FR-021) | The panel's explain/fix output is small, structured JSON (`explanation`/`rootCause`/`evidence`, `correctedSql`) rendered as discrete fields. Streaming would require a stream-friendly response format and a partial-JSON assembler, adding parser complexity to a diagnostic panel for no user-visible gain; the panel already conveys progress with explicit loading states and never reloads the page. | *(1) Stream partial JSON fragments* — rejected: raw JSON is not renderable until complete, so it would show parser noise to the user. (2) Add a streaming transport but keep rendering the assembled result — rejected: pays the complexity cost with zero perceived latency improvement. The deviation is recorded in the spec's Assumptions and a §III amendment is to be raised outside this feature. |
