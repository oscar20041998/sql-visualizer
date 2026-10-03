# Interface Contracts: Guest Access Mode

**Feature**: 013-guest-access-mode
**Date**: 2026-09-26

This project is a Next.js web application, so its external interfaces are **HTTP endpoints** and
**localized UI copy**. Only what this feature changes is documented; everything else is untouched.

---

## 1. Session cookie (new)

The feature's structural addition. FR-022 requires enforcement "independent of browser-held state",
and today the only session is a `localStorage` marker the server never sees.

```text
Set-Cookie: sqlv_session=<opaque>; HttpOnly; SameSite=Lax; Path=/; Max-Age=<ttl>; Secure(prod)
```

| Property | Value | Why |
|---|---|---|
| Name | `sqlv_session` | Distinct from the existing `localStorage` keys so nothing collides. |
| `HttpOnly` | required | A guest must not be able to read or forge the session from script. |
| `SameSite=Lax` | required | Blocks cross-site submission of AI requests while surviving normal navigation. |
| `Secure` | production only | Must be set in production or the cookie is transmissible over plain HTTP. |
| `Path=/` | required | The check runs on `/api/ai/*`, which is not under a per-feature prefix. |
| `Max-Age` | social = token lifetime; demo = session cookie; guest = session cookie | Matches the lifetime the existing client-side model already uses. |

**Request contract**

```http
GET /any-page HTTP/1.1
Cookie: sqlv_session=<opaque>
```

**Value shape**: an opaque, signed token encoding `{ kind, startedAt }`. It is **not** the full session
and must not carry `email`, `displayName` or any credential — the server only needs to answer "is this
a guest, an authenticated user, or nothing?".

**Failure behaviour**: an absent, malformed, or unverifiable cookie is treated as **no session**, not
as an error. It must never throw.

### Critical constraint (R6)

The cookie MUST be written by **all three** session-creating paths:

| Path | Written when | If omitted |
|---|---|---|
| Demo credentials | `setDemoAuthenticated()` succeeds | **Every existing demo user loses all AI features** (violates FR-027) |
| Social OAuth | OAuth callback completes | **Every existing social user loses all AI features** (violates FR-026) |
| Guest confirm | Guest disclosure confirmed | Guest restriction is unenforceable server-side |

The first two rows are the non-obvious ones. Adding the check without them is a regression for the
entire current user base, not just guests.

---

## 2. `/api/ai/*` request contract (changed)

Applies to `generate`, `generate/stream`, `embed`, `docs-context`, `database-knowledge-context`,
`speech`. Request and success bodies are **unchanged** — this feature only adds a gate.

**New required header**

```http
POST /api/ai/generate HTTP/1.1
Cookie: sqlv_session=<opaque>
Content-Type: application/json
```

**Refusal response (FR-024)**

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "Authentication required for this AI capability.",
  "code": "AI_SESSION_REQUIRED",
  "sessionKind": "guest" | "none"
}
```

| Field | Purpose |
|---|---|
| `error` | Human-readable, already safe to show (no secret leakage — consistent with the existing `redactSecrets` helper). |
| `code` | Stable discriminator the client switches on, so it can render the locked-feature explanation rather than a generic failure. |
| `sessionKind` | Lets the client distinguish "sign in to unlock" from "you are a guest, sign in to use shared AI". |

`401` is chosen over `403` because the cause is *authentication*, not authorisation — matching the
existing convention in `generate/route.ts:62-67`, where a missing server credential is deliberately
`503` "rather than 401: the deployment is misconfigured, the caller did nothing wrong". A guest is a
caller who did something legitimate, they simply are not entitled, and `401` states that precisely.

**Ordering guarantee (FR-023)**: the check MUST run before the credential is read and before any

---

## 3. UI contract: sign-in surface

**Guest link** (FR-001, FR-002)

```text
Label (en): "I don't have an account, but still want to use"
Label (vi): "Tôi chưa có tài khoản, nhưng vẫn muốn sử dụng"
Role: <button> — activates the disclosure dialog. Not a link: it does not navigate.
Placement: inside the sign-in form, as a peer of the existing sign-in actions.
```

Keyboard: reachable in DOM order, visible focus indicator, activates on both Enter and Space, matching
the existing form controls (FR-002, SC-007).

**Disclosure dialog** (FR-003..FR-007)

```text
On open : focus moves to the dialog; focus is trapped; Escape and Cancel both dismiss without
          creating a session (FR-007).
Content : which capabilities are unavailable, that AI on the guest's own machine remains
          available, the Docs Consultant exception (R3), and the reason (FR-004, FR-005, FR-006).
Actions : [Continue as guest] (primary, starts the session)  [Cancel] (dismisses, stays signed out)
```

The dialog is a `role="dialog"` with `aria-modal="true"` and a programmatic label, matching the
accessibility bar already established for the sign-in page in specs/006.

**Locked-feature explanation** (FR-011, FR-012)

Shown in place of the capability, never as a spinner or generic error. It must carry the reason, a
one-click sign-in path, and the list of retained capabilities — and must be renderable with no network
call (FR-014), so it cannot depend on a server round-trip to appear.

---

## 4. Localization contract

New copy keys follow the project's existing flat-key convention (`src/locales/{en,vi}.ts`, resolved via
`getT(locale)`), with no second i18n system. Every key below MUST exist in **both** locales (SC-005,
FR-021), and every key added to one file must be added to the other in the same change.

| Key group | Purpose |
|---|---|
| `guestAccessLink` | The sign-in link label. |
| `guestAccessDialog*` | Title, body, capability list, reason, confirm, cancel. |
| `guestAccessLocked*` | The locked-feature explanation: title, reason, sign-in action, retained list. |
| `guestAccessBadge*` | Persistent guest indicator in the chrome (FR-010). |
| `guestAccessResume*` | Resume-offer on returning to `/login` (FR-020). |
| `guestAccessServerError` | Fallback if a server refusal reaches the UI despite the client gate. |

Capability names inside the dialog and the locked explanation reuse the existing feature names already
present in the locale files (e.g. the Docs Consultant, Database AI Assistant labels), so the guest
sees the same product vocabulary used elsewhere in the app.

provider call, so a refused request consumes no quota.

**Per-route notes**

| Route | Gate behaviour for a guest |
|---|---|
| `generate`, `generate/stream`, `embed` | Refuse only when `provider` is a cloud provider. A request carrying `provider: 'ollama'` is already rejected at the route boundary today, so the guest case here is always a refusal. |
| `docs-context` | **Always refuse** a guest (R3). The route is hard-wired to the operator's OpenAI embedding key and the caller cannot redirect it. |
| `database-knowledge-context` | **No gate** — it reads no credential and performs local vector search. |
| `speech` | Decide from `AI_SPEECH_PROVIDER`: refuse when the resolved engine is a cloud engine, allow when it is a local voice engine (R4). |
