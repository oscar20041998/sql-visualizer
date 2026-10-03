# Research: Microsoft & Google Social Login

## R1: Client-Side Social Sign-In Architecture (No Backend Server)

**Decision**: Implement a direct, lightweight OAuth 2.0 Implicit Flow / PKCE Client integration that supports two modes: **Real Provider Integration** (when environment variables `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `NEXT_PUBLIC_MICROSOFT_CLIENT_ID` are configured) and **Interactive Mock Simulator Mode** (when local development keys are absent).

**Rationale**: Since the application is a client-only Next.js SPA without an active authentication server, we must perform the authentication entirely on the client side. Rather than pulling in heavy, opinionated, and complex library SDKs (like `@react-oauth/google` or `@azure/msal-browser`) which increase bundle size, introduce dependency friction, and are difficult to mock in automated test suites, a direct OAuth 2.0 flow is ideal:
- **Google**: Uses the OAuth 2.0 implicit flow endpoint (`https://accounts.google.com/o/oauth2/v2/auth`) via a secure browser popup or redirect.
- **Microsoft**: Uses the Microsoft identity platform v2.0 endpoint (`https://login.microsoftonline.com/common/oauth2/v2.0/authorize`) with implicit or PKCE flow.
- **Mock Simulator**: When client IDs are not provided, clicking Google/Microsoft opens a beautifully styled, custom in-app modal or popup window simulating the consent flow. This lets developers test the entire sign-in, redirect, token capture, localStorage state updates, and session recovery cycle instantly without needing credentials.

**Alternatives considered**:
- *Integrate NextAuth.js / Auth.js*: Rejected. NextAuth.js requires a server-side Next.js API route (`pages/api/auth/[...nextauth]` or App Router equivalent) and session encryption keys, which conflicts with our client-only static hosting architecture and violates the assumption of keeping the project server-less/credential-free on deploy.
- *Use standard SDKs only*: Rejected. Relying solely on official SDKs makes offline development and testing impossible for external contributors who do not have registered Google Cloud or Azure Active Directory applications.

## R2: Local Storage Session Management & Backward Compatibility

**Decision**: Replace the simple string-based `sqlvisualizer-demo-authenticated` checks with a unified `SessionManager` module in `src/lib/demoAuth.ts`. This module will manage a structured JSON-serialized session in `localStorage` called `sqlvisualizer-user-session`. To guarantee 100% backward compatibility for the existing temporary admin login (FR-010), the `isDemoAuthenticated` check will return `true` if *either* the legacy admin boolean is set *or* a valid, unexpired social session exists.

**Rationale**: The current `isDemoAuthenticated()` function only reads the `'sqlvisualizer-demo-authenticated'` key. By upgrading `src/lib/demoAuth.ts` to manage both keys under a single public interface, we avoid modifying any client-side routes or middleware that already rely on `isDemoAuthenticated()`. The rest of the application remains completely insulated from the underlying session structure changes.

**Alternatives considered**:
- *Migrate everything to the new JSON structure and delete the old admin login*: Rejected. FR-010 explicitly states that the existing temporary admin login must continue to work unchanged alongside the new options. Keeping both tracks open ensures no regressions.

## R3: Popup Blockers & Fallback Experience

**Decision**: Attempt to open the OAuth consent screen in a centered popup window first. If `window.open` returns `null` or has its height/width blocked (detected immediately), catch the state, prevent code execution, and instantly transition to an in-app overlay or a clear instructional message advising the user to either "Allow Popups" or click a direct redirect link.

**Rationale**: Browsers frequently block programmatically opened popups unless they are triggered by a direct user action (like an `onClick` event handler). Even with click handlers, aggressive ad blockers or browser configurations can block them. By detecting blocked popups instantly, we fulfill FR-004 ("clear, non-blocking error message instead of generic toasts") and prevent silent failures.

**Alternatives considered**:
- *Pure Redirect Flow*: Rejected. Changing the current window's URL to Google or Microsoft's consent screen wipes the application state and forces a full reload on return. A popup keeps the application loaded in the background, creating a much smoother, app-like SPA experience. We will use popup as primary and fallback to redirect only if needed or requested.

## R4: Token Lifetime and Automatic Expiry Checks

**Decision**: Store the absolute Unix timestamp of when the session expires (calculated as `Date.now() + (expiresInSeconds * 1000)`) inside the localStorage session object. During the application boot phase (in a React `useEffect` in the layout or ThemeProvider) and on page navigation, read the session. If the current time exceeds the stored timestamp, automatically call `clearDemoAuthenticated()` and trigger a session-expired toast.

**Rationale**: Social identity providers typically issue client-side access tokens with a 1-hour (3600 seconds) lifetime. Storing an absolute Unix timestamp (`expiry`) rather than a relative value ensures that timezone shifts or machine clock variations do not bypass the expiration checks, meeting FR-006 perfectly.

## Summary of resolved unknowns

| Unknown | Resolution |
|---|---|
| OAuth Mechanism | Direct Client OAuth 2.0 Implicit Flow via popups, avoiding heavy external SDKs |
| Offline / Local Dev | Polished Interactive Mock Simulator Mode triggered automatically if client IDs are missing |
| Backward Compatibility | Upgraded `demoAuth.ts` keeping both old admin login and new social session active under the same API |
| Session Expiry | Unix timestamp-based client-side checks on boot and navigation |
| Popup Blockers | Instant detection of `window.open` failures with friendly retry prompts and fallback links |
