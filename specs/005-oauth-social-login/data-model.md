# Data Model: Microsoft & Google Social Login

This document describes the runtime TypeScript structures, local storage definitions, and state representations required to support Google and Microsoft client-side social login.

## Local Storage Keys

To support both the new social login sessions and preserve backward compatibility with the existing administrator login form, two distinct local storage keys are used.

### 1. `sqlvisualizer-user-session` (Social Login)
- **Type**: `string` (JSON-serialized `UserSession` object)
- **Lifetime**: Persistent until explicitly deleted (sign-out), corrupted, or expired (past the inner `expiry` timestamp).
- **Security**: Contains only non-sensitive user profile data and client-side access tokens. No password hashes or refresh tokens are stored.

### 2. `sqlvisualizer-demo-authenticated` (Legacy Admin)
- **Type**: `string` (`"true"` or absent)
- **Lifetime**: Persistent until explicitly signed out.
- **Description**: Kept intact to support the existing temporary `admin / 1234@` credentials (FR-010).

---

## TypeScript Types & Interfaces

### UserSession

The active social session structure containing identity details and expiry markers.

| Field | Type | Description |
|---|---|---|
| `provider` | `'google' \| 'microsoft'` | The OAuth provider used for sign-in (FR-008). |
| `displayName` | `string` | The user's full display name (e.g., `"Jane Doe"`) from the provider. |
| `email` | `string` | The user's primary email address (e.g., `"jane.doe@company.com"`). |
| `avatarUrl` | `string` | Optional. Link to the user's provider avatar or profile picture. |
| `accessToken` | `string` | The temporary client access token issued by the provider. |
| `expiry` | `number` | Unix timestamp (in milliseconds) representing when the session ceases to be valid (FR-006). |

### AuthProviderConfig

Configuration object defining client parameters for starting the OAuth 2.0 flow.

| Field | Type | Description |
|---|---|---|
| `clientId` | `string` | The application ID registered with Google or Microsoft. |
| `authUrl` | `string` | The endpoint where users are sent to consent (e.g., `https://accounts.google.com/o/oauth2/v2/auth`). |
| `redirectUri` | `string` | The callback URL (where the popup/window returns after success). |
| `scopes` | `string[]` | Permission scopes requested (e.g., `['openid', 'profile', 'email']`). |

### OAuthCallbackPayload

The schema representing parameters returned in the redirect URL hash or query string after the provider flow completes.

| Field | Type | Description |
|---|---|---|
| `accessToken` | `string` | The returned access token (if successful). |
| `expiresIn` | `number` | The token's relative lifetime in seconds (e.g., `3600`). |
| `state` | `string` | Cross-Site Request Forgery (CSRF) protection token. |
| `error` | `string` | Error code returned by the provider on failure (if any). |
| `errorDescription` | `string` | Optional. Detailed error description returned by the provider. |

### AuthUIState

Represents the state machine of the login buttons on the workspace access panel.

| State | Allowed Next States | Description |
|---|---|---|
| `'idle'` | `'authenticating'` | No authentication flow is active. Buttons are fully enabled. |
| `'authenticating'` | `'idle'`, `'error'` | OAuth consent screen is currently open in a popup. Buttons show loading states. |
| `'error'` | `'authenticating'`, `'idle'` | Authentication failed or was cancelled. Error message is visible. |

---

## State Transition Diagrams

### 1. Unified Authentication State Resolution (`isDemoAuthenticated`)
```text
                       +---------------------------------------+
                       |          Read LocalStorage            |
                       +---------------------------------------+
                                           |
                    +----------------------+----------------------+
                    |                                             |
     Is "demo-authenticated" === "true"?             Does "user-session" exist?
                    |                                             |
                 [ YES ]                                       [ YES ]
                    |                                             |
                    v                                             v
          (Auth state is VALID)                         Is Date.now() < expiry?
                                                                  |
                                                       +----------+----------+
                                                       |                     |
                                                    [ YES ]               [ NO ]
                                                       |                     |
                                                       v                     v
                                             (Auth state is VALID)     [ EXPIRED ]
                                                                             |
                                                                             v
                                                                   Call clearSession()
                                                                             |
                                                                             v
                                                                  (Auth state is INVALID)
```

### 2. Social Login Flow & Session Replacement (FR-008)
```text
                  +-----------------------------------------+
                  |  User clicks "Google" or "Microsoft"    |
                  +-----------------------------------------+
                                       |
                                       v
                  +-----------------------------------------+
                  | Clear any existing user-session/cookies |  <-- FR-008
                  +-----------------------------------------+
                                       |
                                       v
                  +-----------------------------------------+
                  |  Open Popup with OAuth Consent Screen   |
                  +-----------------------------------------+
                                       |
                +----------------------+----------------------+
                |                                             |
            [ Success ]                                   [ Failure / Cancel ]
                |                                             |
                v                                             v
  Parse OAuth Callback Parameters                 Set Error UI state + Toast
                |                                             |
                v                                             v
Fetch Profile Info from UserInfo Endpoint               Stay on sign-in page
                |
                v
Save UserSession JSON to localStorage
                |
                v
     Redirect to /query-input
```
