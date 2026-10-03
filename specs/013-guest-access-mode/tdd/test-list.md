---
feature: 013-guest-access-mode
loop: outer-inner
planned_at: 9ee579317e9cc5a0dffee10b89131bc1e23ebb0a
updated_at: 9ee579317e9cc5a0dffee10b89131bc1e23ebb0a
spec: ../spec.md
plan: ../plan.md
---

# Test List: Guest Access Mode

Derived from `spec.md` and `plan.md`. Behaviors are observable results, not implementation steps.
This file plans; `/speckit.tdd.run` converts each row into a failing test.

## Verification commands

Copied verbatim from `.specify/memory/tdd-profile.md` (typescript / vitest).

| Purpose | Command |
|---|---|
| single behavior | `npx vitest run {file} -t "{name}"` |
| one file | `npx vitest run {file}` |
| full suite | `npm test` |
| watch | `npx vitest` |
| typecheck | `npm run type-check` |

Suite baseline: **green — 39 files, 282 tests, 28.93s** at commit `9ee5793`.
Coverage, mutation, property and contract runners are `null` in the profile: not available, so no
behavior below is claimed against them.

## Behavior state key

`PENDING` → `RED` (test written, observed failing) → `GREEN` (implementation passes) → `DONE`
(cycle closed, refactor step taken). `BASELINE` = pinned current behavior, already green.

---

## Outer loop — acceptance behaviors

One per acceptance scenario in `spec.md`. `A#` maps to the scenario number in the story.

| id | story | behavior (observable result) | traces to | state | test |
|---|---|---|---|---|---|
| A1 | US1 | The sign-in form shows a guest link labelled "I don't have an account, but still want to use" in the active display language, reachable by keyboard with a visible focus indicator. | US1-AS1, FR-001, FR-002 | PENDING | |
| A2 | US1 | Activating the guest link opens a dialog naming which capabilities are unavailable and why, and no workspace content is shown before confirming. | US1-AS2, FR-003, FR-004, FR-006 | PENDING | |
| A3 | US1 | Dismissing the dialog leaves the visitor signed out with no session created; confirming admits them to the SQL workspace with no credential entry. | US1-AS2, FR-007, FR-008 | PENDING | |
| A4 | US1 | A guest can run SQL analysis, view the relationship graph, read complexity metrics and export results. | US1-AS3, FR-009 | PENDING | |
| A5 | US1 | The application chrome shows a persistent guest indicator and identifies which capabilities are locked. | US1-AS4, FR-010 | PENDING | |
| A6 | US2 | Activating a locked shared-capacity capability shows a message stating it requires an account, with a one-click sign-in path and the retained capabilities. | US2-AS1, FR-011, FR-012 | PENDING | |
| A7 | US2 | Activating a locked capability as a guest sends no request to shared AI capacity and shows no spinner, generic error, or empty result. | US2-AS2, FR-013, FR-014 | PENDING | |
| A8 | US2 | A guest whose provider targets their own local model can complete that AI task with no restriction notice. | US2-AS3, research.md R1 | PENDING | |
| A9 | US2 | A guest's provider settings show shared-capacity fields as unusable with the reason stated, while their own local endpoint stays editable. | US2-AS4, FR-016 | PENDING | |
| A10 | US2 | A signed-in user (social or demo credentials) meets no guest restriction on any AI capability. | US2-AS5, FR-026, FR-027 | PENDING | |
| A11 | US3 | A shared-capacity AI request with no valid session is refused with an authentication-required response and consumes no shared model capacity. | US3-AS1, FR-022, FR-023, FR-024 | PENDING | |
| A12 | US3 | A request presenting a cleared or forged browser marker is refused identically to the no-session case, because the refusal does not read browser state. | US3-AS2, FR-022, SC-004 | PENDING | |
| A13 | US3 | A request to the guest's own local model is not treated as shared capacity and is not refused on session grounds. | US3-AS3, research.md R1/R3 | PENDING | |
| A14 | US3 | Each refused shared-capacity request is recorded with route, session kind and reason, and never with prompt text or credentials. | US3-AS4, FR-025, SC-009, SC-010 | PENDING | |
| A15 | US3 | A signed-in user's shared-capacity AI request succeeds exactly as before the feature. | US3-AS5, FR-026 | PENDING | |
| A16 | US1 | The guest link, dialog and every locked explanation follow a display-language change with no reload, and every guest string exists in each supported locale. | FR-021, SC-005, SC-007 | PENDING | |
| A17 | US1 | The guest link and the disclosure dialog are fully operable by keyboard, and the dialog traps focus and announces its purpose. | FR-002, SC-007 | PENDING | |
| A18 | US1 | Returning to the sign-in page with an active guest session offers to resume rather than appearing signed out. | FR-020 | PENDING | |
| A19 | US1 | Signing in from a locked-feature explanation clears the guest marker and leaves no guest state behind. | FR-018 | PENDING | |
| A20 | US1 | Ending a guest session returns to the sign-in page and fully clears guest state. | FR-019 | PENDING | |

---

## Inner loop — unit behaviors

Grouped by component. `U#` ids are stable and must never be reused.

### `src/lib/capabilities.ts` — capability table and entitlement

| id | behavior | traces to | state | test |
|---|---|---|---|---|
| U1 | `isLockedForGuest` returns false for a `non-ai` capability regardless of provider. | FR-009 | DONE | tests/unit/guestEntitlement.test.ts -> "U1 leaves a non-ai capability unlocked" |
| U2 | `isLockedForGuest` returns false for a `local-ai` capability regardless of provider. | research.md R1 | PENDING | |
| U3 | `isLockedForGuest` returns true for a `shared-capacity` capability even when the guest's provider is a local model. | FR-011 | PENDING | |
| U4 | `isLockedForGuest` returns false for a `config` capability when `aiConfig.provider` is the local model. | US2-AS3, research.md R1 | PENDING | |
| U5 | `isLockedForGuest` returns true for a `config` capability on any cloud provider. | FR-011 | PENDING | |
| U6 | A `hardwired-local` capability is available to a guest regardless of provider. | research.md R2 | PENDING | |
| U7 | A `hardwired-cloud` capability is locked for a guest even on the local model — the Docs Consultant case. | research.md R3 | PENDING | |
| U8 | A `server-env` capability delegates its decision rather than resolving from `aiConfig`. | research.md R4 | PENDING | |
| U9 | A `none` capability is available to a guest. | FR-009 | PENDING | |
| U10 | `entitlement` returns `allowed` for a demo session and for a valid social session. | FR-026, FR-027 | PENDING | |
| U11 | `entitlement` returns `no-session` when no session is present. | FR-022 | PENDING | |
| U12 | Every capability row has a `labelKey` that resolves in every supported locale. | SC-005 | PENDING | |
| U13 | An unknown capability bucket is rejected rather than defaulting silently. | Constitution — Type Safety | PENDING | |

### `src/lib/demoAuth.ts` — guest marker on the existing session

| id | behavior | traces to | state | test |
|---|---|---|---|---|
| U14 | Starting a guest session makes `isDemoAuthenticated` report true. | FR-008 | PENDING | |
| U15 | A guest session carries no identity fields — no email, display name, provider or expiry. | data-model.md §1 | PENDING | |
| U16 | Starting a guest session discards a stale social session rather than restoring it. | Edge case 1 | PENDING | |
| U17 | `clearDemoAuthenticated` clears the guest marker. | FR-019 | PENDING | |
| U18 | A guest session and a social session are mutually exclusive — the later action wins. | FR-018 | PENDING | |

### `src/lib/sessionCookie.ts` — server-verifiable session

| id | behavior | traces to | state | test |
|---|---|---|---|---|
| U19 | `verifySession` returns no session for an absent cookie, and never throws. | FR-022, SC-004 | PENDING | |
| U20 | `verifySession` returns no session for a malformed or forged cookie value, and never throws. | US3-AS2, SC-004 | PENDING | |
| U21 | The issued cookie is `HttpOnly`, `SameSite=Lax` and `Path=/`, and `Secure` in production. | contracts §1, FR-028 | PENDING | |
| U22 | The cookie value carries session kind and start time only — never an email, token or key. | FR-028, Constitution — credentials server-side | PENDING | |
| U23 | `requireAiSession` returns 401 with `code: 'AI_SESSION_REQUIRED'` and a `sessionKind` field. | FR-024 | PENDING | |

### `src/app/api/ai/*` — route guards

| id | behavior | traces to | state | test |
|---|---|---|---|---|
| U24 | `generate`, `generate/stream` and `embed` refuse a guest and a no-session caller with 401. | US3-AS1, FR-022 | PENDING | |
| U25 | Each of those routes evaluates the guard before reading the credential or calling the provider. | FR-023 | PENDING | |
| U26 | `docs-context` refuses a guest unconditionally, including one on the local model. | research.md R3, US3-AS1 | PENDING | |
| U27 | `database-knowledge-context` is not gated and still answers a guest. | FR-009, research.md R2 | PENDING | |
| U28 | `speech` refuses a guest only when the resolved engine is a cloud engine, and allows a local voice engine. | research.md R4 | PENDING | |
| U29 | A signed-in user passes the guard and the provider call proceeds. | FR-026, US3-AS5 | PENDING | |
| U30 | The demo-credential path issues a session cookie on sign-in. | FR-027, research.md R6 | PENDING | |
| U31 | The social-OAuth callback issues a session cookie on sign-in. | FR-026, research.md R6 | PENDING | |

> **U30 and U31 are the highest-risk behaviors in this list.** Omitting them satisfies the letter of
> FR-022 while silently disabling every AI feature for every existing user. They are pinned here
> before any implementation exists precisely so the regression cannot hide.

### Refusal records

| id | behavior | traces to | state | test |
|---|---|---|---|---|
| U32 | Each refusal emits a record containing route, session kind and reason. | FR-025, SC-009 | PENDING | |
| U33 | A refusal record never contains prompt text, SQL or credential material. | FR-025, SC-009, Constitution — credentials server-side | PENDING | |
| U34 | A guest and an unauthenticated caller are distinguishable in the refusal record. | SC-010 | PENDING | |


### `src/components/auth/GuestAccessDialog.tsx` — disclosure dialog

| id | behavior | traces to | state | test |
|---|---|---|---|---|
| U35 | The dialog is a `role="dialog"` with `aria-modal="true"` and an accessible name. | SC-007 | PENDING | |
| U36 | Focus moves into the dialog on open and is trapped while it is open. | SC-007, FR-002 | PENDING | |
| U37 | Escape and the cancel action both dismiss without creating a session. | FR-007 | PENDING | |
| U38 | The dialog names the specific unavailable capabilities, not a generic reference. | FR-005 | PENDING | |
| U39 | The dialog states the reason the restriction exists. | FR-006 | PENDING | |
| U40 | The dialog states that AI on the guest's own machine remains available. | FR-005, US2-AS3 | PENDING | |
| U41 | The dialog names the Docs Consultant as unavailable even when a local model is configured. | research.md R3 | PENDING | |

### `src/components/ui/LockedFeatureNotice.tsx` — locked explanation

| id | behavior | traces to | state | test |
|---|---|---|---|---|
| U42 | The notice states the feature requires an account and offers a one-click sign-in action. | FR-011 | PENDING | |
| U43 | The notice lists the capabilities the guest retains. | FR-012 | PENDING | |
| U44 | The notice renders with no network call, so it works offline. | FR-014 | PENDING | |
| U45 | The notice never renders a spinner, a generic error, or an empty result. | FR-013 | PENDING | |

### Sign-in surface, chrome and lifecycle

| id | behavior | traces to | state | test |
|---|---|---|---|---|
| U46 | The guest link is a button inside the form, not a navigating link. | FR-001 | PENDING | |
| U47 | The guest link is reachable in DOM order and activates on Enter and Space. | FR-002, SC-007 | PENDING | |
| U48 | The app layout admits a guest to the workspace shell instead of redirecting. | FR-008 | PENDING | |
| U49 | The layout still renders nothing while the session check is unresolved. | Existing behaviour, preserved | PENDING | |
| U50 | The chrome shows the guest indicator for the whole guest session. | FR-010 | PENDING | |
| U51 | The sign-in page offers to resume an active guest session. | FR-020 | PENDING | |
| U52 | Signing in from the notice clears the guest marker in the same action. | FR-018 | PENDING | |
| U53 | Sign-out clears guest state and returns to the sign-in page. | FR-019 | PENDING | |
| U54 | Guest copy keys exist in every supported locale, with none falling back to a key. | FR-021, SC-005 | PENDING | |

---

## Characterization baselines

Behaviors that must not change. They pin current behavior so the guest work cannot silently alter it.
All are expected to be **green before any implementation task runs**.

| id | behavior | pins | state | test |
|---|---|---|---|---|
| C1 | An unauthenticated visitor is redirected away from the workspace by the layout gate. | `AppLayout.test.tsx` | BASELINE | `tests/unit/AppLayout.test.tsx` |
| C2 | A signed-in visitor is redirected away from `/login`. | `login-route.test.tsx` | BASELINE | `tests/unit/login-route.test.tsx` |
| C3 | The sign-in form's existing interactions (tabs, password visibility, submit) are unchanged. | `SignInPanel.test.tsx` | BASELINE | `tests/unit/SignInPanel.test.tsx` |
| C4 | The sign-in page has no axe WCAG 2.1 A/AA violations. | `SignInPage.axe.test.tsx` | BASELINE | `tests/unit/SignInPage.axe.test.tsx` |
| C5 | Demo-credential and social session storage semantics are unchanged. | `demoAuth.test.ts` | BASELINE | `tests/unit/demoAuth.test.ts` |
| C6 | A social session past its expiry is discarded. | `demoAuth.test.ts` | BASELINE | `tests/unit/demoAuth.test.ts` |
| C7 | A signed-in user's cloud AI request still reaches the provider proxy. | `aiService.test.ts` | BASELINE | `tests/unit/aiService.test.ts` |

**C3, C5 and C7 are the ones this feature is most likely to break** — all three cover surfaces the
guest work modifies. They must be run before the first implementation task, not only at the end.

---

## Out of scope

Behaviors deliberately **not** tested here, with the reason. Recorded so their absence reads as a
decision rather than an oversight.

| item | why not tested |
|---|---|
| Rate limiting or abuse controls beyond refusal records | Explicitly out of scope in the spec's Assumptions |
| Analytics of guest behaviour | Out of scope — no guest query content is stored server-side |
| Making the Docs Consultant retrieval provider configurable | A larger RAG change; research.md R3 records it as a follow-up |
| Server-side accounts or full session infrastructure | Out of scope; the spec keeps the browser-held model |
| Monetisation, trial conversion or upgrade paths | Out of scope in the spec's Assumptions |
| Detection or probing of a local model on the guest's machine | Out of scope — a guest is assumed local-capable only if they configured it |


---

## Spec coverage check

Every acceptance scenario in `spec.md` maps to at least one behavior.

| spec scenario | behavior | note |
|---|---|---|
| US1-AS1 | A1, U46, U47 | link present, localised, keyboard-operable |
| US1-AS2 | A2, A3, U37 | dialog appears; dismissal creates no session |
| US1-AS3 | A3, A4, U48 | confirm → workspace; non-AI work available |
| US1-AS4 | A5, U50 | persistent chrome indicator |
| US2-AS1 | A6, U42, U43 | reason + sign-in path + retained list |
| US2-AS2 | A7, U44, U45 | no request, no spinner, no generic error |
| US2-AS3 | A8, U4, U40 | local model stays usable |
| US2-AS4 | A9 | shared fields unusable, local endpoint editable |
| US2-AS5 | A10, U10 | signed-in users unaffected |
| US3-AS1 | A11, U24, U25, U26 | 401, no quota consumed |
| US3-AS2 | A12, U20 | forged/cleared marker refused identically |
| US3-AS3 | A13, U28 | local-model request not refused |
| US3-AS4 | A14, U32, U33, U34 | refusal recorded, reviewable, no secrets |
| US3-AS5 | A15, U29 | signed-in request succeeds as before |

Success criteria SC-001..SC-011 are covered by A1-A20 and U1-U54: SC-002/SC-003 by U24-U28; SC-004 by
U19-U20; SC-005 by U12/U54; SC-006 by U42-U43; SC-007 by A16-A17/U35-U36/U47; SC-008 by U29; SC-009 and
SC-010 by U32-U34; SC-011 by U4 and A8.

**No acceptance criterion is left without a behavior.**

---

## Open questions carried to `/speckit.tdd.run`

1. **The working tree is not clean.** T009-T031 touch `src/lib/demoAuth.ts`, `src/components/Sidebar.tsx`,
   `src/app/oauth/callback/page.tsx` and the AI routes — but `src/app/query-input/page.tsx` and five
   `src/app/smart-sql-editor/**` files already carry uncommitted changes from earlier work, and
   `SidePanelTab.tsx` is an untracked file imported by the modified editor page. Per-cycle commits
   would capture that unrelated work. **The tree must be committed or stashed before the first
   cycle.**
2. **Branch.** HEAD is `duyvt7`, not `013-guest-access-mode`. No `before_specify` git hook was ever
   registered, so the feature branch does not exist. Decide before the first commit.

