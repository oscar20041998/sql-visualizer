# Implementation Plan: Professional & Responsive Sign-In Page UI

**Branch**: `006-login-ui-redesign` | **Date**: 2026-09-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-login-ui-redesign/spec.md`

## Summary

Move the sign-in/register surface out of the marketing home page into a dedicated, deep-linkable `/login` page, and rebuild its presentation to a professional, PC/laptop-responsive standard: a two-column layout (brand introduction left, sign-in form right) that collapses to a centered form-only column below the wide-desktop threshold, a readable typography scale (replacing the current 8–11px labels and controls), consistent spacing, explicit hover/focus/disabled/loading/error states, and WCAG 2.1 AA contrast across both light and dark themes.

The existing client-side session model, OAuth popup flow, temporary admin credentials, and the locale/theme design system are reused unchanged (FR-009). The work is confined to: a new `/login` route, a themed page shell, a restyled sign-in surface extracted from the current in-page panel, home-page call-to-action retargeting, and retargeting the three existing signed-out redirects from `/` to `/login` (FR-019). Automated behaviour and accessibility checks are added on top of the repo's existing Vitest + jsdom setup using dev-only test tooling (FR-017).

## Technical Context

**Language/Version**: TypeScript 5.x (`strict: true`), React 19.0.3, Next.js 15.5.18 (App Router)

**Primary Dependencies** (all existing, reused — no new runtime dependency):
- Tailwind CSS 3.4.6 + `@tailwindcss/typography`; design tokens are CSS custom properties in `src/styles/tailwind.css`
- `lucide-react` 1.7.0 (icons)
- `sonner` 1.7.4 (toasts)
- `zustand` 4.5.5 (`src/lib/store.ts` — settings, locale, theme, navigation state)

**New dev-only dependencies** (test tooling only, approved in clarification Q5; MUST NOT be imported by shipped code):
- A React component-rendering test library plus its DOM matcher companion
- An automated accessibility scanner compatible with the existing jsdom environment

**Storage**: Browser `localStorage` — existing keys `sqlvisualizer-demo-authenticated` and `sqlvisualizer-user-session` (`src/lib/demoAuth.ts`). Unchanged by this feature.

**Testing**: Vitest 2.1.9 with `jsdom` 30.0.1 (`vitest.config.ts`; conventions follow `src/lib/demoAuth.test.ts`) plus the two dev-only tools above

**Target Platform**: Desktop/laptop browsers at viewport widths ~1024px and above (phones and small tablets are explicitly out of scope per spec Assumptions). Both `en`/`vi` locales and both dark/light themes.

**Project Type**: Single Next.js App Router web application (frontend only; no backend service is introduced)

**Performance Goals**:
- The sign-in form renders and becomes usable within the same budget as the current home page's first meaningful render (SC-009).
- The responsive reflow is achieved with CSS only, so resizing triggers no JavaScript re-render (SC-004).

**Constraints**:
- FR-009: authentication logic, session persistence, and provider integration MUST NOT change.
- FR-017: no new runtime dependency may enter the shipped bundle.
- FR-008: WCAG 2.1 AA contrast in both themes (text ≥ 4.5:1; UI boundaries, states, focus indicators ≥ 3:1).
- Labels and control text MUST be ≥ 12px-equivalent (SC-003), up from today's 8–11px.
- Existing copy and form structure are preserved (spec Assumptions); only page-level framing copy may be added.

**Scale/Scope**: 1 new page route, 1 extracted form component, 1 themed page shell, 1 home-page change, 3 redirect retargets, plus unit/behaviour/accessibility test coverage. The sign-in surface is a single screen with roughly ten interactive controls.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined from `.specify/memory/constitution.md` — see gate table below]

| Principle / Rule | Applicability | Status |
|---|---|---|
| I. Multi-Dialect SQL Analysis | N/A — no parser, dialect, or AST cross-check code is touched | Pass (N/A) |
| II. Interactive Visualization First | N/A — no ReactFlow/graph/visualization component is touched | Pass (N/A) |
| III. Real-Time Feedback Loop | N/A — no Monaco editor or analysis-refresh path is touched | Pass (N/A) |
| IV. AI-Grounded Explanations | N/A — no explainer, RAG index, or assistant path is touched | Pass (N/A) |
| V. Minimal Deployment Friction | N/A — no Ollama/cloud provider configuration is touched | Pass (N/A) |
| Security & Privacy — credentials never exposed to the browser | **Applicable.** `src/lib/demoAuth.ts` already holds the session flag and the provider access token in `localStorage`, i.e. browser-visible. This is a **pre-existing** deviation introduced by feature 005, not by this feature. FR-009 bars this feature from altering auth logic; FR-014 adds a firm no-new-exposure requirement. | **Pass with documented deviation** — see Complexity Tracking |
| Quality Standards — Testing (Vitest for new logic/components) | **Applicable.** Satisfied by SC-011: automated behaviour checks plus an automated accessibility scan, runnable via the existing `npm test`. | Pass |
| Quality Standards — Type Safety (`strict`, `any` justified) | **Applicable.** New components are typed; no `any` is introduced. | Pass |
| Quality Standards — Performance (>50-table graph < 1s) | N/A — no graph rendering involved. The relevant goal here is SC-009's page render budget. | Pass (N/A) |
| Quality Standards — Documentation (inline comments for non-obvious logic) | **Applicable.** The theme-application decision and the layout/breakpoint contract must be commented where non-obvious. | Pass |

**Gate result**: PASS. The single deviation is pre-existing and explicitly outside this feature's remit; it is recorded below rather than silently accepted. No `NEEDS CLARIFICATION` remains — all five were resolved during `/speckit-clarify`, so Phase 0 has no open unknowns to research, only design decisions to justify.

## Project Structure

### Documentation (this feature)

```text
specs/006-login-ui-redesign/
├── spec.md              # Feature requirements and user scenarios (complete)
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Phase 0 output (design decisions + rationale)
├── data-model.md        # Phase 1 output (session + view-state model)
├── quickstart.md        # Phase 1 output (manual + automated validation guide)
├── contracts/
│   └── sign-in-page.md  # Phase 1 output (route, layout, state, a11y, redirect contracts)
├── checklists/
│   └── requirements.md  # Spec quality checklist (complete)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

This is a single Next.js App Router project. The feature touches only the public/marketing shell and the shared component/lib layer; no backend or API route is added.

```text
src/
├── app/
│   ├── page.tsx                     # MODIFY: remove in-page sign-in panel; retarget CTA to /login;
│   │                                #         theme the public shell
│   ├── login/
│   │   └── page.tsx                 # CREATE: dedicated, deep-linkable sign-in route
│   ├── query-input/page.tsx         # MODIFY: signed-out guard redirects to /login (was /)
│   └── oauth/                       # UNCHANGED: existing OAuth callback handler + mock popup
├── components/
│   ├── auth/
│   │   └── SignInPanel.tsx          # CREATE: extracted, restyled sign-in/register surface
│   ├── ThemeProvider.tsx            # MODIFY: currently dead code; make it apply light/dark
│   │                                #         explicitly, then use it on the public shell
│   ├── AppLayout.tsx                # MODIFY: session-expiry redirect retargeted to /login
│   │                                #         (its own theme logic stays untouched)
│   └── Sidebar.tsx                  # MODIFY: sign-out redirect retargeted to /login
├── lib/
│   ├── demoAuth.ts                  # UNCHANGED (FR-009)
│   ├── oauthUtils.ts                # UNCHANGED (FR-009)
│   └── i18n.ts                      # UNCHANGED (consumed as-is)
├── locales/
│   ├── en.ts                        # MODIFY: add page-level framing copy keys only
│   └── vi.ts                        # MODIFY: same keys, Vietnamese
└── styles/
    └── tailwind.css                 # UNCHANGED unless a contrast fix is required (research R5)

src/components/auth/SignInPanel.test.tsx   # CREATE: behaviour + keyboard/focus tests
src/app/login/login-a11y.test.tsx          # CREATE: automated accessibility scan
```

**Structure Decision**: Single project (Next.js App Router), following the existing convention that page routes live under `src/app/**` and reusable UI lives under `src/components/**`. The sign-in surface moves into `src/components/auth/` because it is now consumed by a route instead of being embedded in `src/app/page.tsx`. No new architectural layer, store, service, or API route is introduced.

## Phase 0 → Phase 1 Outputs

| Artifact | Purpose |
|---|---|
| [`research.md`](./research.md) | R1–R10 design decisions with rationale and rejected alternatives; zero open unknowns |
| [`data-model.md`](./data-model.md) | Read-only view of the existing session model, plus the new transient view-state and declarative layout model |
| [`contracts/sign-in-page.md`](./contracts/sign-in-page.md) | C1–C7: route, layout, interaction/state, navigation, accessibility, localization contracts, and explicit non-goals |
| [`quickstart.md`](./quickstart.md) | 11 runnable validation scenarios mapping to SC-001 … SC-013, plus the automated/manual split |

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design (research, data model, contracts, quickstart).*

| Gate | Pre-design | Post-design | Change rationale |
|---|---|---|---|
| I. Multi-Dialect SQL Analysis | Pass (N/A) | Pass (N/A) | Confirmed: R1–R10 touch no parser, dialect, or AST code. |
| II. Interactive Visualization First | Pass (N/A) | Pass (N/A) | Confirmed: no graph/ReactFlow component appears in the structure or contracts. |
| III. Real-Time Feedback Loop | Pass (N/A) | Pass (N/A) | Confirmed: no Monaco or analysis-refresh path is touched. |
| IV. AI-Grounded Explanations | Pass (N/A) | Pass (N/A) | Confirmed: no explainer/RAG/assistant path is touched. |
| V. Minimal Deployment Friction | Pass (N/A) | Pass (N/A) | Confirmed: the mock OAuth popup already keeps local runs credential-free (quickstart prerequisites). |
| Security & Privacy | Pass with documented deviation | Pass with documented deviation | Unchanged, and strengthened in one respect: C7/FR-014 state that no new credential exposure is added, and the data model marks the existing session shape strictly read-only. |
| Testing | Pass | Pass | Reinforced: R8 and the quickstart's split make the Vitest obligation concrete — automated behaviour + accessibility checks via the existing `npm test`. |
| Type Safety | Pass | Pass | Reinforced: R10 notes the type checker itself enforces locale-key parity via `i18n.ts`, so the `strict` obligation is mechanically verifiable. |
| Documentation | Pass | Pass | Satisfied by research.md's rationale sections plus the requirement that non-obvious theme/breakpoint decisions carry inline comments. |

**Post-design gate result**: PASS — no new violations, no change in status for any gate, and the new dev-only test tooling is consistent with FR-017 (test tooling only; never imported by shipped code).

## Complexity Tracking

> The Constitution Check has one justified deviation (pre-existing, not introduced here).

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Provider access tokens and the session flag live in browser `localStorage` (`src/lib/demoAuth.ts`), which the constitution's Security & Privacy section says must never reach the browser. | It already exists as shipped behaviour from feature 005, and FR-009 explicitly forbids this feature from altering authentication logic, session persistence, or provider integration. Unilaterally "fixing" it here would be an unrequested auth change that breaks the existing session contract and feature 005's acceptance criteria. | Moving credential handling server-side requires a backend auth service that this app does not have (confirmed by feature 005's assumptions) and is therefore not a "simpler alternative" inside this feature's scope. Removing `localStorage` persistence would break FR-005 of feature 005 and the sign-in-again behaviours in this spec. |

**Follow-up (outside this feature)**: consolidating `src/components/AppLayout.tsx` onto the revived `ThemeProvider` and migrating session handling server-side are both recorded as deferred cleanups. They are deliberately not attempted here to keep the change reviewable and to respect FR-009.
