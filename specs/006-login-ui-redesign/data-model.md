# Phase 1 Data Model: Professional & Responsive Sign-In Page UI

**Feature**: `006-login-ui-redesign` | **Date**: 2026-09-19

## Scope note

This feature introduces **no new persisted data entity** and **no schema change**. The spec's Key Entities section correctly records this as "not applicable". What follows documents the two *existing* models the sign-in page reads (so the implementation does not accidentally alter them) and the one genuinely new model — the page's UI state — which is transient and in-memory only.

## Persisted model (existing, READ-ONLY for this feature — FR-009)

Source: `src/lib/demoAuth.ts`. Owned by feature 005. Values, shapes, validation, and expiry semantics MUST NOT change.

### `sqlvisualizer-demo-authenticated`

| Property | Value |
|---|---|
| Storage key | `sqlvisualizer-demo-authenticated` (exported as `DEMO_AUTH_STORAGE_KEY`) |
| Type | Raw string; the literal `'true'` means authenticated |
| Written by | Temporary admin sign-in (`setDemoAuthenticated()`) |
| Read by | `isDemoAuthenticated()` |
| Cleared by | `clearDemoAuthenticated()`, explicit sign-out |

### `sqlvisualizer-user-session`

| Field | Type | Notes |
|---|---|---|
| `provider` | `'google' \| 'microsoft'` | Social provider |
| `displayName` | `string` | From the provider profile |
| `email` | `string` | From the provider profile |
| `avatarUrl` | `string?` | Optional |
| `accessToken` | `string` | Provider token — see the constitution deviation in `plan.md` |
| `expiry` | `number` | Absolute Unix ms timestamp (`Date.now() + expiresIn * 1000`) |

**Validation rules (existing, must be preserved verbatim)**: `isUserSession()` requires a valid `provider`, string `displayName`, string `email`, string `accessToken`, and a finite numeric `expiry`. `getSocialSession()` returns the session only while `Date.now() < expiry`; otherwise it clears the key and returns `null`. Malformed JSON is treated as unauthenticated and cleared.

**Relationship**: The session flag and the social session are alternatives; `isDemoAuthenticated()` returns true when *either* is present/valid. There is no multi-user or multi-account concept (one active session per browser), and this feature does not add one.

## Transient model (new, in-memory only)

### View-state: `AuthUIState` (existing union, reused unchanged)

Source: `src/lib/demoAuth.ts` (R6). `type AuthUIState = 'idle' | 'authenticating' | 'error'`.

| From | Event | To | Visual contract |
|---|---|---|---|
| `idle` | User submits the admin form with invalid credentials | `idle` | Error toast; no state change (existing behaviour preserved) |
| `idle` | User submits the admin form with valid credentials | — | `setDemoAuthenticated()`; navigate to `/query-input`; state not transitioned |
| `idle` | User activates a social button | `authenticating` | Both social buttons disabled; loading affordance shown on the activated one |
| `authenticating` | Provider callback succeeds and a profile resolves | `idle` | Success toast; session written; navigate to `/query-input` |
| `authenticating` | Provider callback reports cancellation/denial | `error` | `role="alert"` error region visible; toast |
| `authenticating` | Profile fetch fails / payload unusable | `error` | `role="alert"` error region visible; toast |
| `authenticating` | Popup closed without a callback | `error` | Cancellation message; toast |
| `error` | User activates a social button again | `authenticating` | Error cleared as part of starting a new attempt |

### View-state: sign-in / register `mode`

| Property | Value |
|---|---|
| Type | `'login' \| 'register'` |
| Initial value | `'login'` |
| Transitions | Toggled by the two tabs only |
| Effect on behaviour | `login` submits the admin credential check; `register` shows the informational "registration unavailable" toast and performs no mutation |
| Persistence | None — resets on reload |

### View-state: `showPassword`

Boolean, initial `false`; toggles the password input's `type` between `password` and `text`. Never persisted, never logged.

### View-state: authorization gate (new, page-level)

| Property | Value |
|---|---|
| Type | `boolean \| null` |
| Initial value | `null` (unresolved) |
| Resolution | On mount: if `isDemoAuthenticated()` → navigate to `/query-input`; else set `true` |
| Rendering contract | While `null`, render nothing (R7) — no sign-in form is shown to an authenticated visitor |

## Responsive layout model (declarative, no persisted state)

This is a pure function of the viewport width and is therefore not stored anywhere (R3):

| Viewport width | Brand-introduction column | Sign-in form column | Reading/tab order |
|---|---|---|---|
| `≥ 1024px` (`lg` and up) | Visible, flexible width | Visible, bounded max width (~28–32rem) | Form first (FR-016) |
| `< 1024px` | **Absent from the DOM layout**, not reachable by keyboard | Visible, centered, bounded | Form first (unchanged) |

**Invariants across all widths**: no horizontal scrolling; the brand column never contains an interactive control (FR-015); the sign-in form is the first meaningful content (FR-016).

## Explicitly not modelled

- **No new storage keys, cookies, or server-side session.** The session model is unchanged (FR-009, FR-014).
- **No user/profile entity changes.** No new fields on `UserSession`.
- **No migration or data cleanup.** Existing keys keep their current shapes, so no migration path is required.
- **No analytics/telemetry model.** The feature adds no tracking.