# Tasks: Microsoft & Google Social Login

**Input**: Design documents from `/specs/005-oauth-social-login/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Required. Unit tests in `src/lib/demoAuth.test.ts` are mandatory to verify core authentication state resolution, session saving/parsing, and automatic expiry checks.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Review the existing code structure and plan implementation points without mutating files.

- [ ] T001 Audit the codebase: inspect `src/lib/demoAuth.ts`, `src/app/page.tsx`, and `src/components/Sidebar.tsx` in full to align surgical changes with the established context.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the types and core session management utilities that all subsequent social login stories build upon.

**⚠️ CRITICAL**: This phase must be completed before any UI work begins.

- [ ] T002 [P] Create and export TypeScript definitions for `UserSession`, `AuthProviderConfig`, `OAuthCallbackPayload`, and `AuthUIState` inside a new or existing module (recommended: `src/lib/demoAuth.ts` or a shared types file).
- [ ] T003 Upgrade session management in `src/lib/demoAuth.ts`:
  - Keep legacy `sqlvisualizer-demo-authenticated` handling intact.
  - Implement `getSocialSession(): UserSession | null` to read and parse the `sqlvisualizer-user-session` key.
  - Implement `setSocialSession(session: UserSession): void` to serialize and save.
  - Implement `clearSocialSession(): void` to clear keys.
  - Update `isDemoAuthenticated()` to return `true` if *either* the legacy admin flag is set *or* `getSocialSession()` returns a valid, unexpired session (FR-010).
- [ ] T004 [P] Add required i18n keys to `src/locales/en.ts` and `src/locales/vi.ts`:
  - `authSocialLoginSuccess`: *"Signed in via {provider} as {name}."*
  - `authSocialLoginCancelled`: *"Authentication cancelled or rejected by the provider."*
  - `authSocialLoginFailed`: *"Authentication failed: {error}."*
  - `authSessionExpiredMessage`: *"Session expired. Please sign in again."*
  - `authSignOutSuccess`: *"Successfully signed out."*

**Checkpoint**: Core auth types and session retrieval logic are implemented and compile successfully.

---

## Phase 3: User Story 1 - Sign in with Google (Priority: P1) 🎯 MVP

**Goal**: Permit visitors to click the "Google" button, authorize via a consent popup (or Mock Simulator if keys are absent), save the resulting profile/session, and access the workspace.

**Independent Test**: Remove/omit `.env` client IDs, click "Google", select a mock Google profile in the popup, and confirm you are logged in, see a success toast, and land on `/query-input`.

### Tests for User Story 1

- [ ] T005 [P] Create a comprehensive unit test suite in `src/lib/demoAuth.test.ts` verifying `isDemoAuthenticated` under multiple cases:
  - Admin login flag set.
  - No active logins.
  - Valid social session in localStorage.
  - Expired social session in localStorage (verify it reports false).
  - Session serialization and cleanup.

### Implementation for User Story 1

- [ ] T006 [P] Implement OAuth callback URL parsing and state tracking in `src/lib/oauthUtils.ts` (or directly within `src/lib/demoAuth.ts`) to extract access tokens, CSRF state, and error fields from the callback.
- [ ] T007 Implement the **Interactive OAuth Mock Simulator**:
  - Create a custom interactive handler or a static simulator page/modal that opens when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is absent.
  - Show a styled card allowing developers to select a mock Google profile (*Duy VT* or *Google Developer*) or click "Cancel".
  - On select, postMessage or return the mock callback parameters (access token, name, email, avatar, expiry).
- [ ] T008 Update the "Google" button in `src/app/page.tsx`:
  - Trigger the Google OAuth consent flow or mock simulator in a secure centered popup.
  - Detect blocked popups immediately and show an instructional notice to "Allow Popups".
  - Display loading state and disable the button during active authorization.
- [ ] T009 Handle successful login in `src/app/page.tsx`:
  - Capture the returned OAuth parameters.
  - Retrieve the user profile (fetch from Google UserInfo endpoint if real client ID used; resolve static profile if in mock mode).
  - Store the `UserSession` to local storage, show a localized success toast, and trigger router redirect to `/query-input`.

**Checkpoint**: Google social login works end-to-end, and session is saved to local storage upon successful completion.

---

## Phase 4: User Story 2 - Sign in with Microsoft (Priority: P2)

**Goal**: Permit visitors to click the "Microsoft" button, authorize via a consent popup (or Mock Simulator if keys are absent), and access the workspace.

**Independent Test**: Click "Microsoft", select a mock Microsoft profile, and confirm you are successfully logged in and redirected.

### Implementation for User Story 2

- [ ] T010 Extend the interactive mock simulator popup to support Microsoft profiles (*Duy VT* or *Microsoft Consultant*).
- [ ] T011 Update the "Microsoft" button in `src/app/page.tsx`:
  - Trigger the Microsoft OAuth consent flow (using `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`) or mock simulator in a popup.
  - Show loading state and handle popup blocker fallbacks identically to Google.
- [ ] T012 Handle successful Microsoft login callback in `src/app/page.tsx`:
  - Retrieve the user profile (fetch from Microsoft Graph API if real; resolve static profile if mock).
  - Call `setSocialSession()` with Microsoft details, show success toast, and redirect.

**Checkpoint**: Microsoft login is fully operational.

---

## Phase 5: User Story 3 - Persisted session and sign-out (Priority: P3)

**Goal**: Social sessions survive tab reloads; users are automatically signed out once sessions expire; users can explicitly log out to clear all session flags.

**Independent Test**: Sign in via a social provider, reload the page (still authenticated), change local storage expiry to the past, reload (forces sign-out and shows expired toast), sign in again, click "Sign out" (redirects and deletes keys).

### Implementation for User Story 3

- [ ] T013 Implement automatic session expiration checks on application boot:
  - Inside a global component or layout (e.g. `src/app/layout.tsx` or `src/components/ThemeProvider.tsx`), add a `useEffect` checking if the active social session is expired.
  - If expired, automatically trigger `clearSocialSession()`, notify the user with an expiry warning toast, and redirect to the login screen.
- [ ] T014 Upgrade `src/components/Sidebar.tsx` to display social profile details:
  - If a social session is active, read the name, email, and avatar from local storage.
  - Render the user's avatar (or user icon placeholder) at the bottom or top of the sidebar.
  - Render a small provider badge (colored Google "G" icon or Microsoft logo) next to the user name.
- [ ] T015 Wire the "Sign out" button in `src/components/Sidebar.tsx`:
  - On click, clear both legacy admin keys and active social session keys from local storage.
  - Redirect the browser to the login page (`src/app/page.tsx`) immediately.

**Checkpoint**: Social sessions are fully persistent, auto-expire appropriately, and can be terminated via the Sidebar Sign-out action.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify the codebase compiles with zero TypeScript errors and all tests pass.

- [ ] T016 Run `npx tsc --noEmit` and fix any compiler warnings or type mismatches.
- [ ] T017 Run `npx vitest run` to ensure both `src/lib/demoAuth.test.ts` and all existing project unit tests pass.
