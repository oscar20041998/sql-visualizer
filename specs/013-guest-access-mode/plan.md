# Implementation Plan: Guest Access Mode (Explore Without an Account)

**Branch**: `013-guest-access-mode` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-guest-access-mode/spec.md`

## Summary

Add a "continue without an account" path to the sign-in form that admits a visitor as a **guest** and
lets them use every non-AI capability immediately, while withholding every model-backed capability
regardless of the provider selected. *(Revised 2026-09-27 — the original plan followed cost and let a
guest running their own Ollama keep the AI features; research.md R9 explains why that was withdrawn.)*

Technically this has three parts: a guest marker added to the existing browser-held session, one shared
capability/entitlement module that both the client and the server consult, and an authentication gate
on the six `/api/ai/*` routes. The gate is the part that cannot be skipped: those routes currently
perform no session check at all, so without it this feature would be an open, unmetered proxy for the
operator's paid cloud keys.

**Phase 0 research**: [research.md](./research.md) · **Phase 1 design**: [data-model.md](./data-model.md),
[contracts/api-contracts.md](./contracts/api-contracts.md), [quickstart.md](./quickstart.md)

## Technical Context

**Language/Version**: TypeScript 5, React 19.0.3, Next.js 15.5.18 (App Router, `darkMode: 'class'`)

**Primary Dependencies**: `zustand` 4.5.5 (client state), `sonner` (toasts), `lucide-react` (icons),
`@xyflow/react` + `reactflow` (graph), `monaco-editor` (editor), `marked` (markdown). Server: Next.js
route handlers. No new runtime dependency is required — the session cookie uses the platform's own
cookie API and the capability table is plain data.

**Storage**: No new persistent storage. Session state stays in `localStorage` (existing keys in
`src/lib/demoAuth.ts`) plus one `HttpOnly` cookie for server verification. Refusal records go to the
existing structured logger (`src/lib/logging/logger.ts`), not a database (R7).

**Testing**: Vitest 2.1.9 + React Testing Library + `vitest-axe`, jsdom environment, config in
`vitest.config.ts`. Existing suites to keep green: `demoAuth`, `AppLayout`, `SignInPage`,
`SignInPage.axe`, `login-route`, `home-preferences`.

**Target Platform**: Modern browsers (ES2020+), Node 18+ for the dev server, Windows/PowerShell and
POSIX both in use in this repo. Dev server on port 4028.

**Project Type**: Web application (Next.js full-stack — App Router with client components and route
handlers under `src/app/api/ai/`).

**Performance Goals**: No measurable change to existing non-AI paths. Entitlement is a pure function
over an in-memory table — no network round-trip on the client (FR-014). The server gate is a cookie
parse plus a table lookup, both O(1) and well under a millisecond, and runs *before* any provider call.

**Constraints**:
- No browser credentials in any form (Constitution §Security; FR-028).
- AI requests must remain proxied through the app server, never direct client-to-cloud (Constitution).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence / mitigation |
|---|---|---|
| **I. Multi-Dialect SQL Analysis** | PASS | No parser, dialect or scoring logic is touched. Guest and non-guest parse identically. |
| **II. Interactive Visualization First** | PASS | The relationship graph and CTE views are non-AI and remain fully available to a guest (FR-009), so the constitution's core visualisation mandate is preserved for the widest audience. |
| **III. Real-Time Feedback Loop** | PASS | Streaming analysis is unaffected. Only model calls are gated; deterministic streaming continues. |
| **IV. AI-Grounded Explanations** | PASS | Preserved, not weakened: when an explanation is available it is still parser-grounded. The feature only narrows *who* may request it, never what it may claim. |
| **V. Minimal Deployment Friction** | **PASS with a note** | Local Ollama stays fully functional for guests (clarification 4), so the offline/privacy-sensitive workflow the constitution calls out is preserved. The note: `docs-context` is hard-wired to a cloud embedding key and is therefore locked even for local users (R3) — a pre-existing gap this feature makes *visible* rather than introduces. |
| **Security: credentials server-side only** | PASS | FR-028. The session cookie carries only `{ kind, startedAt }` — never an email, token or key. |
| **Security: no direct client-to-cloud LLM calls** | PASS | The gate sits in the existing proxy routes; no new outbound path is created. |
| **Testing** | PASS | Every behaviour in [quickstart.md](./quickstart.md) maps to a requirement; the shared entitlement function is pure and directly unit-testable. |
| **Type Safety** | PASS | Strict TypeScript; the capability table is a discriminated union, so an unknown bucket is a compile error rather than a silent default. |
| **Performance** | PASS | No measurable change; the `>50` table graph rendering budget is untouched. |
| **Documentation** | PASS | Inlining the cost rule at the capability table and the route guards is required by the spec, not optional. |

**Re-check after Phase 1 design**: still PASS. The Phase 1 artifacts introduced no new dependency, no
new outbound network path, and no credential handling; the capability table is a static module shared
verbatim by client and server, which is the mechanism that keeps the two in agreement.

**Verdict**: all gates pass. No constitutional violation requires a Complexity Tracking entry. The one
item recorded there is a *product* decision, not a constitutional one.

## Project Structure

### Documentation (this feature)

```text
specs/013-guest-access-mode/
├── plan.md                    # This file (/speckit-plan output)

### Source Code (repository root)

```text
src/
├── lib/
│   ├── demoAuth.ts                 # EXTEND: guest marker on the existing session
│   ├── capabilities.ts             # NEW: capability table + entitlement (client & server)
│   ├── sessionCookie.ts            # NEW: sign/verify the HttpOnly cookie
│   ├── store.ts                    # EXTEND: guest flag surfaced to React, cleared on sign-out
│   ├── ai/
│   │   ├── aiService.ts            # REFERENCE: existing ollama-vs-proxy branch is the seam
│   │   ├── aiProviders.ts          # REFERENCE: provider + embedding model constants
│   │   ├── databaseAssistant.ts    # EXTEND: guest-aware RAG retrieval
│   │   └── embeddingService.ts     # EXTEND: skip shared-capacity embedding for guests
│   └── logging/logger.ts           # REUSE: refusal records (R7)
├── components/
│   ├── auth/
│   │   ├── SignInPanel.tsx         # EXTEND: guest link
│   │   └── GuestAccessDialog.tsx   # NEW: disclosure dialog (FR-003..FR-007)
│   ├── ui/
│   │   └── LockedFeatureNotice.tsx # NEW: reusable locked-feature explanation (FR-011/012)
│   ├── Sidebar.tsx                 # EXTEND: persistent guest indicator (FR-010)
│   ├── GlobalChat.tsx              # EXTEND: Docs Consultant locked for guests (R3)
│   └── AppLayout.tsx               # EXTEND: guest admitted to the workspace shell
├── app/
│   ├── login/page.tsx              # EXTEND: resume offer (FR-020)
│   ├── oauth/callback/page.tsx     # EXTEND: write cookie on social sign-in (R6)
│   └── api/ai/*/route.ts           # EXTEND: session gate on six routes (FR-022..FR-025)
├── locales/
│   ├── en.ts                       # EXTEND: guest copy keys
│   └── vi.ts                       # EXTEND: same keys (SC-005)
tests/
└── unit/
    ├── guestAccess.test.tsx            # NEW: guest entry, dialog, session lifecycle
    ├── guestEntitlement.test.ts       # NEW: cost-based bucketing + refusal contract
    └── guestSessionCookie.test.ts     # NEW: cookie issued on all three sign-in paths (R6)
```

**Structure Decision**: keep the existing Next.js App Router layout — no new top-level directory. The
feature is a cross-cutting concern on an established app, so it reuses the current boundaries: auth in
`src/lib/demoAuth.ts` + `src/components/auth/`, AI capability knowledge in `src/lib/ai/`, and shared UI
in `src/components/ui/`. The one genuinely new placement decision is `src/lib/capabilities.ts` at
`lib/` rather than `lib/ai/`, because it is imported by non-AI surfaces (sign-in, sidebar) as well as
the AI layer, and putting it under `ai/` would invert the dependency.

## Implementation Notes (carried into tasks.md)

Three points that are easy to get wrong and are therefore called out rather than left implicit:

1. **The cookie must be written on the two existing sign-in paths too** (R6). Adding the server gate
   without also writing the cookie on demo and social sign-in silently disables AI for every current
   user — a regression far larger than this feature's own scope. Validation check **V5** exists
   specifically to catch it.
2. **The gate must precede the credential read** (FR-023), otherwise a refused request still costs
   nothing but has already read a key into memory and followed a misleading success path.
3. **The Docs Consultant is unconditionally locked** (R3), and the disclosure must say so even for a
   guest with a local model. This is the one place where "local stays available" does not hold, and
   the dialog is the only place a guest can learn it.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Item | Type | Detail |
|---|---|---|
| *(none — no constitutional gate failed)* | — | — |
| `docs-context` is locked for guests even when they run a local model, which is stricter than a reader of clarification 4 might expect. | **Product decision, not a violation** | Its retrieval step is hard-wired to the operator's `AI_PORTAL_EMBEDDING_API_KEY` and the caller cannot redirect it (`route.ts:18-20`, `:36`). Allowing it would send guest-authored question text to OpenAI on the operator's credential — a privacy and cost regression. |
| Making the Docs Consultant retrieval provider configurable and defaulting it to local would be a cleaner long-term fix, but it changes an existing RAG pipeline and its pre-embedded corpus, which the spec places out of scope. Worth raising as a follow-up. | Alternative rejected | — |

├── spec.md                    # Feature specification (/speckit-specify output)
├── research.md                # Phase 0: capability classification + enforcement seam
├── data-model.md              # Phase 1: Session, Capability, RefusalRecord, Entitlement
├── contracts/
│   └── api-contracts.md       # Phase 1: session cookie, /api/ai/* gate, UI + i18n contracts
├── quickstart.md              # Phase 1: V1..V8 end-to-end validation guide
├── checklists/
│   └── requirements.md        # Spec quality checklist
└── tasks.md                   # Phase 2 output (/speckit-tasks — NOT created here)
```

- Server-held API keys must not be applied to guest requests (FR-017).
- The refusal must happen before any quota is consumed (FR-023).
- Both locales must be updated in the same change (SC-005, FR-021) — the locale files are separate
  flat-key modules and drift is silent.

**Scale/Scope**: One new session kind, one shared classification module, one server gate across six
routes, and UI changes on the sign-in surface plus a reusable locked-feature explanation. The blast
radius is concentrated in three places that are already the AI boundary: `src/lib/ai/*`,
`src/app/api/ai/*`, and `src/lib/demoAuth.ts`.
