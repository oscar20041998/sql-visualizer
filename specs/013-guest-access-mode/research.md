# Phase 0 Research: Guest Access Mode

**Feature**: 013-guest-access-mode
**Date**: 2026-09-26
**Spec**: [spec.md](./spec.md)

This document resolves the open design question the spec deferred to planning — *which existing AI
capabilities are shared-capacity and therefore locked for a guest* — and the enforcement seam.

---

## R1 — The guest restriction is a cost boundary, not an "AI" boundary

**Decision**: Classify every capability by **who bears the cost**, evaluated at the moment the target
provider is known:

- **non-AI** — deterministic parser/formatter/scorer, no model. Always available to a guest.
- **local-AI** — the request goes to a model the guest themselves operates. Available to a guest.
- **shared-capacity** — the request consumes a credential or quota held by the operator. Locked.

**Rationale**: The spec's clarification 4 replaced the "is it AI?" test with the cost test. Both the
client and the server need one shared classification, otherwise the UI will promise something the
server refuses (or vice versa). Cost is also the only criterion that is stable — a user can change
their provider at any time, so a feature cannot be permanently "AI" or permanently "local".

**Alternatives considered**:
- *Label-based ("anything that calls a model")* — rejected **at the time**, because clarification 4
  allowed a guest's own Ollama. It was later adopted in practice by the 2026-09-27 decision below.
- *Per-user allowlist* — rejected as out of scope; there is no server-side account to attach it to.

---

## R2 — Capability classification (the table the spec asked planning to produce)

Verified against the actual call sites. "Follows config" means the target comes from the
user-configured `settings.aiConfig.provider`; "hard-wired" means no user setting can change it.

| # | Capability | Provider source | Bucket | Guest sees (superseded) | Guest sees (final) |
|---|---|---|---|---|---|
| 1 | SQL Explainer | follows config | shared | local → available | **locked** |
| 2 | Optimize Query | follows config | shared | local → available | **locked** |
| 3 | AI CTE batch explain | follows config | shared | local → available | **locked** |
| 4 | SQL semantic analysis | follows config | shared | local → available | **locked** |
| 5 | Proposal repair | follows config | shared | local → available | **locked** |
| 6 | NL requirement generation | follows config | shared | local → available | **locked** |
| 7 | Follow-up chat | follows config | shared | local → available | **locked** |
| 8 | Database AI Assistant — answer | follows config | shared | local → available | **locked** |
| 9 | Database AI Assistant — RAG embedding | **hard-wired local Ollama** (`all-minilm`) | local-AI | always available | always available |
| 10 | Query-history semantic search | follows config | shared | local → available | **locked** |
| 11 | **Docs Consultant — retrieval step** | **hard-wired OpenAI** | shared | always locked | always locked |
| 12 | Docs Consultant — answer step | follows config | shared | unreachable (see R3) | **locked** |
| 13 | Format-error explain / AI fix | **hard-wired local Ollama** | local-AI | always available | always available |
| 14 | Read-aloud (speech) | server env `AI_SPEECH_PROVIDER` | server-decided | per deployment (see R4) | per deployment (see R4) |
| 15 | `database-knowledge-context` route | no credential at all | non-AI | always available | always available |
| 16 | Parsing, formatting, graph, metrics, CTE, exports | no model | non-AI | always available | always available |

**Rationale (superseded column)**: 11 of 16 capabilities follow the user's own provider, so a guest with
a local model kept them. Four are decided by the server regardless of user settings, and those are the
cases where the UI cannot simply ask "which provider?" — the route must decide.

**Rationale (final column)**: see R9. The final column is identical for every `follows config` row
regardless of provider, which is precisely the point.

---

## R9 — FINDING: the cost-based rule was a no-op, because ollama is the default

**Decision**: Option C. A guest is refused every model-backed capability whatever provider is
selected. The only exceptions are `hardwired-local` (format-error explain/fix) and `none` (the local
vector index).

**Evidence**: the rule resolved a `follows config` row to "available" when
`aiConfig.provider === LOCAL_PROVIDER`, and `LOCAL_PROVIDER` is `'ollama'`. The default configuration
ships `provider: 'ollama'` (`src/lib/ai/aiConfig.ts`). A brand-new guest therefore received 11 of 16
capabilities — the exact opposite of the restriction's intent.

A second, independent leak: `assertGuestEntitled` in `src/lib/ai/aiService.ts` opened with
`if (config.provider === 'ollama') return;` *before* the capability lookup, so even a corrected
`isLockedForGuest` would have been bypassed on the client. Both were fixed together; neither fix alone
would have held.

**Rationale**: a restriction that depends on a user-changeable setting, where the setting happens to
have the permissive value by default, is not a restriction. Option C removes the dependency entirely:
`isLockedForGuest` no longer reads `aiConfig` at all.

**Residual risk**: a guest who genuinely runs a local model now loses features they could have used at
no cost. That is a deliberate product trade — the alternative was a lock that did not lock. It is
reversible in one place (`isLockedForGuest`) if the product owner prefers a per-capability gate.

---

## R3 — FINDING: the Docs Consultant is not local even in local mode

**Decision**: The Docs Consultant is classified **shared-capacity and always locked** for a guest,
regardless of the user's selected provider.

**Evidence**: `src/app/api/ai/docs-context/route.ts:36` reads
`process.env.OPENAI_EMBEDDING_API_KEY || process.env.OPENAI_API_KEY` and embeds the user's question
with a hard-coded model (`DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-large'`,
`src/lib/ai/aiProviders.ts:75`). The request body carries only `{ question }` (`:18-20`) — the caller
**cannot** redirect it. So a guest who has correctly configured their own Ollama would still have
every question's text sent to OpenAI on the operator's key, and the operator billed for it.


---

## R4 — Speech is decided by the deployment, not the user

**Decision**: Treat read-aloud as **shared-capacity when the deployment's speech engine is a cloud
engine, and local-AI when it is a local voice engine**. The check lives in the speech route, which is
the only place that knows `AI_SPEECH_PROVIDER`.

**Evidence**: `src/lib/ai/aiSpeechEngine.ts:51-59` resolves the engine from the server env; the
default is a local Piper voice, and the OpenAI engine reads
`OPENAI_SPEECH_API_KEY || OPENAI_API_KEY` (`aiSpeechEngine.ts:240-252`). The request body
(`{ text, model, voice, locale, gender }`) does not select the engine — `model`/`voice` are
allow-listed server-side (`src/app/api/ai/speech/route.ts:63-77`).

**Rationale**: A blanket block would remove a genuinely local feature from the default deployment; a
blanket allow would expose a cloud deployment. The route already knows which, so the decision is free
there and the client can be told the outcome.

---

## R5 — Enforcement seam: the client helper already branches on provider

**Decision**: Introduce one shared capability/entitlement module consumed by both the client and the
server, and place the server guard on the six `/api/ai/*` routes. Do not add scattered per-component
checks.

**Rationale**: `generateWithAI` and `streamWithAI` already branch on
`config.provider === 'ollama'` → direct local call, otherwise the cloud proxy
(`src/lib/ai/aiService.ts:1084-1093`, `:1099-1114`), and `embedWithAI` does the same (`:676-680`).
That existing branch *is* the cost boundary, expressed in code today. A single guard keyed on the same
condition keeps the UI and the server in agreement instead of letting each guess.

**Alternatives considered**:
- *Per-component `if (isGuest)` checks* — rejected: ~10 call sites, and it would drift from the
  provider branch that actually decides the cost.
- *Hide AI buttons entirely for guests* — rejected: violates FR-011's requirement to explain, and
  breaks the local-AI case in R2.

---

## R6 — Server-verifiable session requires a cookie on BOTH existing sign-in paths

**Decision**: Add a server-verifiable session cookie, written on **both** the demo-credential path and
the social-OAuth path, and required by every `/api/ai/*` route.

**Rationale**: FR-022 demands enforcement "independent of browser-held state", but the only session
today is a `localStorage` marker (`src/lib/demoAuth.ts:1-3`) that the server never sees. There is no
`src/middleware.ts` and no route reads a cookie or session, so nothing is verifiable server-side
today — confirmed by audit.

**The non-obvious consequence**: if only the *guest* path wrote a cookie, every existing demo-admin
and social user would fail the new server check and lose all AI features — a direct violation of
FR-026 and FR-027. So the cookie must be written by the two existing sign-in paths as well, otherwise
this feature silently breaks every current user. This is called out in the plan as a first-class
task, not an afterthought.

---

## R7 — Refusal records use the existing structured logger

**Decision**: Emit refusals through the existing logging module rather than adding new persistence.

**Rationale**: The repo already has `src/lib/logging/logger.ts` and `logger-setup.ts`; FR-025 asks only
for refusals to be "recorded in a form the operator can review", not persisted to a database. Reusing
the logger satisfies SC-009/SC-010 without introducing storage or a new failure mode.

**Alternatives considered**: a new table or file — rejected; the spec explicitly excludes analytics
persistence, and refusal records are operational, not user data.

---

## Open items carried into Phase 1

None. Every NEEDS CLARIFICATION implied by the spec is resolved above.

**Resolved product decisions since**: R9 (Option C — block every model-backed capability for guests)
and R10 (signed, server-issued `HttpOnly` session). Both were open questions at planning time; R9
supersedes the cost-based rule recorded in R1/R2, and R10 supersedes the "presence signal" cookie.

**Rationale**: This is the one place where "follows the user's provider" is false, and it is precisely
the case the cost-based rule exists to catch. Locking only the answer step would still leak the
question text and the cost. The spec's clarification 4 asks for the restriction to follow cost, and
cost here is always the operator's.

**Alternatives considered**:
- *Allow the Docs Consultant for guests in local mode* — rejected: it would send guest-authored
  content to a third-party cloud service on the operator's credential. That is a privacy and cost
  regression, not a feature.
- *Make the retrieval provider configurable and default it to local* — rejected as out of scope; it
  changes an existing RAG pipeline and the pre-embedded corpus, and is not required by the spec.

**Consequence for the UI**: the locked-feature explanation for this feature must not claim the guest
"keeps local AI" without qualification — the Docs Consultant is the visible exception, and the
disclosure dialog (FR-005) must say so plainly.

---

## R10 — FINDING: signing the cookie is necessary but NOT sufficient

**Decision**: the session cookie is HMAC-signed, `HttpOnly`, and issued only by `POST /api/session`,
which verifies a credential before minting `demo` or `social`. A forged cookie now yields "no session",
and the AI routes refuse.

**Evidence — the original hole**: `sqlv_session` was unsigned JSON written by the browser
(`document.cookie` in `demoAuth.ts`, `httpOnly: false`). Any caller could send
`sqlv_session={"kind":"demo"}` and pass `evaluateSession`, spending the operator's metered quota. A
dedicated test reproduced this.

**Evidence — why signing alone would not have closed it**: the app has **no server-side
authentication of any kind**. The demo credentials were compared in the browser
(`SignInPanel.handleLogin`, against a literal `admin` / `1234@`), and the OAuth callback is a
`postMessage` mock with no server round trip. Had `/api/session` simply signed whatever `kind` the
client asked for, an attacker would have asked for `demo` and received a *validly signed* demo cookie.
The signature proves the server issued the value; only the credential check proves it had grounds to.

**What the server checks**:
| Kind | Server-side check | Failure direction |
|---|---|---|
| `guest` | none — granted freely | grants the least, so it costs nothing |
| `demo` | constant-time compare against `DEMO_ADMIN_PASSWORD` (default `1234@`) | refuse → 401 |
| `social` | access token presented to the provider's userinfo endpoint | refuse → 401 (incl. network failure) |

**Key handling**: `SESSION_SECRET`, server-only, never in the client bundle. When unset, a random
per-process key is used, so cookies stop verifying after a restart. That is deliberate fail-closed
behaviour — a key derived from anything guessable would reopen the hole.

**Residual risk**: the default `1234@` password is still published in the UI notice and in the
fallback, so on a deployment that has not set `DEMO_ADMIN_PASSWORD`, anyone who reads the sign-in page
can sign in. **Setting `DEMO_ADMIN_PASSWORD` and `SESSION_SECRET` is required before production.**
This is a pre-existing property of the app (the credentials were already shown on screen), not one
introduced here, but it caps how much the signing actually buys.
