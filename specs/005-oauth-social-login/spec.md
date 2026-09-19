# Feature Specification: Microsoft & Google Social Login

**Feature Branch**: `005-oauth-social-login`

**Created**: 2026-09-09

**Status**: Draft

**Input**: User description: "tôi muốn sử dụng tính năng login bằng account của microsoft hoặc google, thực hiện chức năng đăng nhập bằng 2 provider này và lưu thông tin đăng nhập vào localstorage"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in with Google (Priority: P1)

A visitor on the workspace-access panel clicks "Google" and completes Google's sign-in flow in place of the current temporary admin/password form, landing back in the app already authenticated with their Google profile info displayed.

**Why this priority**: Google is the most commonly available account for the target audience and currently shows only a placeholder "unavailable" toast — this is the most requested, highest-value gap to close first.

**Independent Test**: Can be fully tested by clicking "Google", completing the provider consent screen, and confirming the app treats the session as authenticated (redirects to `/query-input`, shows the account's name/email) without touching the Microsoft path at all.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor on the home page, **When** they click the "Google" button, **Then** they are sent through Google's OAuth consent flow and, on success, returned to the app in an authenticated state.
2. **Given** a visitor who cancels or denies the Google consent screen, **When** they return to the app, **Then** they remain unauthenticated and see a clear, non-blocking error message.
3. **Given** an already-authenticated Google session recorded in the browser, **When** the visitor reloads the app, **Then** they remain signed in without repeating the OAuth flow.

---

### User Story 2 - Sign in with Microsoft (Priority: P2)

Same as User Story 1, but for the "Microsoft" button, using Microsoft's identity platform instead of Google.

**Why this priority**: Second most common provider for this audience; ships right after Google using the same underlying session mechanism, so it only needs its own provider wiring.

**Independent Test**: Can be fully tested by clicking "Microsoft", completing the provider consent screen, and confirming the app treats the session as authenticated — independent of whether Google was ever used in the same test run.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor on the home page, **When** they click the "Microsoft" button, **Then** they are sent through Microsoft's OAuth consent flow and, on success, returned to the app in an authenticated state.
2. **Given** a visitor who cancels or denies the Microsoft consent screen, **When** they return to the app, **Then** they remain unauthenticated and see a clear, non-blocking error message.

---

### User Story 3 - Persisted session and sign-out (Priority: P3)

An authenticated visitor closes the browser tab and reopens the app later; they are still signed in because their session info was saved locally. They can also explicitly sign out, which clears that saved session and returns them to the sign-in panel.

**Why this priority**: Without persistence and an explicit way to clear it, every reload would force a fresh OAuth round-trip (or, worse, no way to ever log out) — this rounds out the feature into something usable, but it depends on Stories 1/2 existing first.

**Independent Test**: Can be fully tested by signing in with either provider, reloading the page (still signed in), then clicking sign-out (returned to the sign-in panel, and a subsequent reload no longer restores the session).

**Acceptance Scenarios**:

1. **Given** a visitor signed in via Google or Microsoft, **When** they reload or revisit the app in the same browser, **Then** they remain authenticated without re-consenting, until the session expires or they sign out.
2. **Given** an authenticated visitor, **When** they click "Sign out", **Then** their saved session is removed and they are returned to the unauthenticated sign-in panel.
3. **Given** a saved session that has expired (per provider token lifetime), **When** the visitor revisits the app, **Then** they are treated as unauthenticated and prompted to sign in again.

---

### Edge Cases

- What happens when the OAuth popup/redirect is blocked by the browser or closed mid-flow? → Treated as a cancelled sign-in; user stays unauthenticated with an explanatory message, no crash.
- What happens when the same browser has both a Google and a Microsoft session saved (e.g., user tried both)? → Only one active session is kept at a time; starting a new provider's sign-in replaces the previous session.
- How does the system handle a corrupted or manually-edited localStorage entry? → Treated as unauthenticated; the entry is cleared and the user is prompted to sign in again.
- What happens if the existing temporary admin/password form is used at the same time this feature ships? → Out of scope to remove it in this feature; it continues to exist side-by-side unless a follow-up explicitly retires it (see Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let a visitor start a sign-in flow with Google from the existing "Google" button on the workspace-access panel.
- **FR-002**: The system MUST let a visitor start a sign-in flow with Microsoft from the existing "Microsoft" button on the workspace-access panel.
- **FR-003**: On successful provider consent, the system MUST mark the visitor as authenticated and grant access to the query workspace (`/query-input`) the same way the current temporary admin login does.
- **FR-004**: On a cancelled, denied, or failed provider consent, the system MUST keep the visitor unauthenticated and show a clear, localized error/notice instead of the current generic "unavailable" placeholder toast.
- **FR-005**: The system MUST save the authenticated session's identifying info (at minimum: provider name, display name/email, and an expiry marker) to `localStorage` so the session survives a page reload or new tab in the same browser.
- **FR-006**: The system MUST treat a saved session as no longer valid once its expiry marker has passed, clear it, and require the visitor to sign in again.
- **FR-007**: The system MUST provide a visible "Sign out" action for authenticated visitors that clears the saved session from `localStorage` and returns them to the sign-in panel.
- **FR-008**: The system MUST only keep one active session at a time; starting a new sign-in with either provider replaces any previously saved session.
- **FR-009**: The system MUST NOT persist the provider's raw password or long-lived secret credentials — only the minimum identifying/session info needed to keep the user signed in client-side.
- **FR-010**: The existing temporary username/password admin login MUST continue to work unchanged alongside the two new provider options.

### Key Entities

- **Session Record**: The authenticated visitor's saved sign-in state — provider ('google' | 'microsoft'), display name, email, and an expiry timestamp; stored client-side and read on every app load to decide authenticated vs. unauthenticated state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can go from clicking "Google" or "Microsoft" to landing on the authenticated query workspace in under 30 seconds of interactive time (excluding the time spent on the provider's own consent screen).
- **SC-002**: 100% of page reloads within an unexpired session restore the authenticated state without requiring the visitor to sign in again.
- **SC-003**: 100% of cancelled or denied provider consent attempts leave the visitor in a clear, unauthenticated state with an understandable message, with zero unhandled errors.
- **SC-004**: Signing out completes in under 2 seconds and, on the next reload, never restores the cleared session.

## Assumptions

- This app has no backend/auth server today (confirmed: `src/lib/demoAuth.ts` is a client-only boolean flag); this feature is scoped to client-side OAuth flows (e.g., provider-hosted redirect/popup that returns tokens directly to the browser) with no new backend service introduced.
- "Save login info to localStorage" means the visitor's own session/profile data for this app, not the OAuth provider's password or refresh/access secrets beyond what's minimally needed to keep the client-side session alive.
- The existing temporary admin/password form (`username: admin`, `password: 1234@`) stays in place; this feature only replaces the current placeholder behavior behind the "Google" and "Microsoft" buttons, per FR-010.
- Session expiry follows the lifetime the provider naturally issues for its client-side token (no custom "remember me" duration is specified by the user); exact duration is provider-dependent and treated as an implementation detail for the planning phase.
- Only one social account may be linked/active per browser session at a time (no multi-account switching in this feature).
