# Data Model: Guest Access Mode

**Feature**: 013-guest-access-mode
**Date**: 2026-09-26

Entities and state introduced by this feature. The existing session model is **extended, not
replaced** (see R6 in [research.md](./research.md)) — the guest is a marker on the session that
already exists.

---

## 1. Session (extended)

The authoritative record of "who is using the app right now", and the single thing every entitlement
check consults. Today it exists only in `localStorage`; this feature adds a server-verifiable copy.

```text
Session
├── kind            : 'guest' | 'demo' | 'social'     // which of the three access levels
├── startedAt       : number                          // epoch ms, when this session began
├── locale          : 'en' | 'vi'                     // display language at session start
├── displayName?    : string                          // social only
├── email?          : string                          // social only
├── provider?       : 'google' | 'microsoft'          // social only
└── expiresAt?      : number                          // social only
```

**Validation rules**

| Field | Rule |
|---|---|
| `kind` | Required, one of the three literals. Unknown/absent ⇒ treated as unauthenticated. |
| `startedAt` | Required finite number, not in the future. Used for the age display and refusal records. |
| `locale` | Required, must be a supported locale; otherwise falls back to the store default. |
| `expiresAt` | Social only. A session past this instant is discarded and treated as unauthenticated. |
| `email` | Social only. Must look like an email; malformed ⇒ session discarded (existing behaviour). |

**Invariants**

- `kind === 'guest'` and `kind === 'social'` are mutually exclusive — the later action wins, and the
  former session's data is cleared (FR-018, FR-019).
- A guest session never carries `displayName`, `email`, `provider` or `expiresAt`. There is no
  identity to attach; this is what makes it non-authenticating.
- `kind` is the **only** input to entitlement. No capability decision reads anything else.

**State transitions**

```text
                 ┌──────────────┐
   (none) ──────▶│  /login      │
     ▲            └──────┬───────┘
     │                   │ demo credentials          ┌───────────┐
     │                   │ social OAuth              │  guest    │
     │                   ├──────────────────────────▶│  session  │
     │                   │ guest link + confirm      └─────┬─────┘
     │                   │                                 │ sign in
     │                   │                                 │ sign out
     │                   ▼                                 ▼
     │            ┌──────────────┐   sign out   ┌──────────────┐
     └────────────│ authenticated│◀────────────│  /login      │
                  └──────────────┘             └──────────────┘
```

Rules on the edges:

- *(none) → guest* only via guest link + confirm (FR-003, FR-007). A stale social session is discarded
  rather than silently restored.

---

## 2. Capability (static classification)

The single source of truth consulted by both the client (to decide what to explain) and the server
(to decide what to refuse). One table, imported by both — never duplicated per component.

```text
Capability
├── id            : string        // stable key, e.g. 'docs-consultant'
├── bucket        : 'non-ai' | 'local-ai' | 'shared-capacity'
├── providerSource: 'config' | 'hardwired-local' | 'hardwired-cloud' | 'server-env' | 'none'
└── labelKey      : string        // i18n key for the user-facing name
```

**The bucket rule** (R1): `bucket` is decided by *who bears the cost*, evaluated when the target
provider is known — not by whether the feature is labelled "AI".

**Resolution** — *superseded 2026-09-27 (research.md R9).* The pseudocode below was the cost-based
rule from spec clarification 4. `isLockedForGuest` no longer reads `aiConfig`:

```text
isLockedForGuest(capability) =
    capability.bucket === 'non-ai'           → false
    capability.bucket === 'local-ai'         → false
    capability.providerSource === 'hardwired-local'  → false
    capability.providerSource === 'none'     → false
    capability.providerSource === 'hardwired-cloud' → true
    capability.providerSource === 'server-env'      → (the owning route decides)
    otherwise  // providerSource === 'config' → true
```

So every `config`-driven capability is locked for a guest **regardless of provider**. The previous rule
returned `false` for `aiConfig.provider === 'ollama'`, which is the default provider, so it locked
almost nothing. The `aiConfig` parameter is retained at the call sites so the rule can be revisited
without touching them.

**The rows that are not config-driven** (R2, R3, R4) — these cannot be resolved by asking about
`aiConfig`, so the owning component or route decides and the client is told the outcome:

| `providerSource` | Capability | Behaviour for a guest |
|---|---|---|
| `hardwired-local` | Database-assistant RAG embedding, format-error explain/fix | always available |
| `hardwired-cloud` | **Docs Consultant retrieval** | **always locked** (R3) |
| `server-env` | Read-aloud | decided in the speech route from `AI_SPEECH_PROVIDER` (R4) |
| `none` | `database-knowledge-context` | always available |

**Validation rules**: every capability in the app must appear exactly once; `labelKey` must resolve in
every supported locale (SC-005); `bucket` may not change without a spec amendment.

---

## 3. Refusal record (operational, not user data)

Written whenever a shared-capacity request is refused for want of a valid session (FR-025, R7).

```text
RefusalRecord
├── at            : number    // epoch ms
├── route         : string    // which endpoint refused
├── sessionKind   : 'guest' | 'none' | 'social' | 'demo'
├── capabilityId? : string    // resolved capability, when known
└── reason        : 'no-session' | 'guest-not-entitled'
```

**Rules**

- Emitted through the existing logger (`createLogger`), not a new store — persistence is explicitly
  out of scope per the spec's Assumptions.
- `sessionKind` is always present so the operator can tell guests from other anonymous callers with
  100% accuracy (SC-010).
- Never contains prompt text, credentials, or the guest's SQL. It records *that* a call was refused,
  not what it would have said.

---

## 4. Entitlement (derived, never stored)

The answer to "may this session use this capability right now?" — a pure function, not persisted, so
it cannot drift from the session or the capability table.

```text
entitlement(session, capability, aiConfig) → 'allowed' | 'locked' | 'no-session'

  session.kind === 'guest'        → resolve the guest rule from the capability bucket (above)
  session.kind in ('demo','social') → 'allowed'
  no session                      → 'no-session'
```

Both client and server compute this from the same inputs. The client uses it to render the
locked-feature explanation (FR-011, FR-012); the server uses it to refuse (FR-022..FR-024). They must
agree, which is why the logic is not written twice.

- *authenticated → guest* is **not** reachable by the UI. A user signs out first. This prevents
  "downgrading" a real session into a guest one and confusing the operator's refusal records.
- *guest → authenticated* clears the guest marker in the same action (FR-018) — never two steps.
- Any edge into *(none)* clears the marker (FR-019).
