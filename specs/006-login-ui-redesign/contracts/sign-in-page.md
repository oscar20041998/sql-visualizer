# UI Contract: Sign-In Page

**Feature**: `006-login-ui-redesign` | **Date**: 2026-09-19 | **Type**: Page/route contract (Next.js App Router)

This project exposes no public API for this feature; the interface it exposes is a **page**: a route, a layout contract at named widths, an interaction/state contract, an accessibility contract, and a navigation contract. Each contract is stated so it can be verified directly — manually per SC-012, or automatically per SC-011.

## C1 — Route contract

| Contract | Value |
|---|---|
| Path | `/login` |
| Rendering | Server Component route shell exporting route `metadata`; body rendered by a client feature component (R1) |
| Deep-linkable | MUST render the sign-in form when opened directly with a fresh browser profile (FR-013) |
| Auth requirement | Public — no session required to view |
| Already-authenticated behaviour | MUST NOT render the sign-in form; MUST navigate to `/query-input` (FR-012, SC-008) |
| Home page | MUST NOT render any sign-in input field (FR-011, SC-007) |

## C2 — Layout contract

| Viewport | Required composition |
|---|---|
| `≥ 1024px` | Two columns: brand introduction (left, no interactive controls) + sign-in form (right, bounded max width). Form first in reading and tab order (FR-016) |
| `< 1024px` | Single centered column: sign-in form only. Brand column absent from layout and from the accessibility tree (FR-015) |
| All widths | No horizontal scrollbar; no overlapping interactive elements; vertical scrolling allowed when content exceeds viewport height (US2, SC-001, SC-004) |

**Type-scale contract**: body/label/input text ≥ 12px equivalent (target 14px); exactly one `<h1>` (page title) with the panel heading as `<h2>`; interactive controls ≥ ~40px tall; one consistent vertical spacing rhythm (R4, SC-003).

**Theme contract**: identical structure in both themes; every text/background and control/background pairing meets WCAG 2.1 AA in both (R2, R5, FR-008, SC-010).

## C3 — Interaction/state contract

| Control | Required behaviour | Required visual states |
|---|---|---|
| Mode tabs (sign in / register) | Switch the form region; `role="tab"` + `aria-selected`; only one selected | default, hover, focus, selected |
| Username/email field | Required; submits with the form; existing label + placeholder text preserved | default, focus-within |
| Password field | Required; masked by default; `autocomplete="current-password"` | default, focus-within |
| Password visibility toggle | Flips input type between password/text; carries an `aria-label` naming the action | default, hover, focus |
| Submit (temporary admin) | Validates the existing credentials; on success sets the session and navigates to `/query-input`; on failure shows the existing invalid-credentials message | default, hover, focus |
| Register submit | Shows the existing "registration unavailable" notice; performs no mutation | default, hover, focus |
| Google / Microsoft buttons | Start the existing OAuth popup flow; both disabled while `authenticating` | default, hover, focus, disabled, loading |
| Error region | Visible only in `error` state; `role="alert"`; must not shift layout enough to hide other controls | visible / hidden |
| Temporary-credentials notice | Always visible; credentials rendered as inline code | static |

**State machine**: see `data-model.md` → `AuthUIState`. No transition is added, removed, or reordered by this feature (FR-003, FR-009).

## C4 — Navigation contract

| Trigger | From | To | Toast/message |
|---|---|---|---|
| Primary call-to-action, signed out | `/` | `/login` | existing "please sign in" info toast retained |
| Primary call-to-action, signed in | `/` | `/query-input` | unchanged from today |
| Successful admin sign-in | `/login` | `/query-input` | existing success toast |
| Successful social sign-in | `/login` | `/query-input` | existing success toast |
| Unauthenticated access to a protected page | any protected route | `/login` (was `/`) | unchanged from today |
| Session expiry | any protected route | `/login` (was `/`) | existing "session expired" info toast retained |
| Explicit sign-out | any protected route | `/login` (was `/`) | existing sign-out success toast retained |

**Invariant (SC-013)**: every signed-out destination above presents a way to sign in. No route reached while signed out may be a dead end.

## C5 — Accessibility contract

| Item | Requirement |
|---|---|
| Keyboard operability | Every control reachable and operable by keyboard alone; logical tab order; no keyboard trap (FR-005, SC-002) |
| Focus visibility | A visible focus indicator on every interactive element, meeting ≥ 3:1 against the adjacent background (FR-005, FR-008) |
| Labelling | Every field has a visible `<label>`; every icon-only control has an accessible name; social buttons keep visible text labels (R9) |
| Structure | One `<h1>`; panel heading as `<h2>`; form is a landmark-wrapped labelled section; tabs keep `tablist`/`tab` semantics (R9) |
| Live errors | The error region uses `role="alert"` so it is announced when it appears (R9) |
| Narrow-width parity | Removing the brand column changes neither reading order nor the tab sequence (FR-015, FR-016) |
| Contrast | WCAG 2.1 AA in both themes (FR-008, SC-010) |
| Automated audit | Zero WCAG 2.1 AA violations reported by the automated scan (SC-011) |

## C6 — Localization contract

| Item | Requirement |
|---|---|
| Locales | `en` and `vi` both render the full page with no clipping, overlap, or broken layout (FR-007) |
| Key parity | Every new key exists in both `src/locales/en.ts` and `src/locales/vi.ts` — enforced by the `i18n.ts` schema type (R10) |
| Frozen copy | All existing `auth*` values remain byte-identical (spec Assumptions) |

## C7 — Non-goals (explicitly out of contract)

- No new authentication method, provider, or credential-validation rule.
- No server-side session, cookie, or API endpoint.
- No phone/small-tablet portrait optimization; below ~1024px the page merely degrades safely.
- No changes to copy semantics, form fields, or the register flow's "unavailable" behaviour.
- No new runtime dependency in the shipped bundle (FR-017).