# Phase 0 Research: Database AI Assistant — Persistent Chat History

**Feature**: `014-db-assistant-chat-history` | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

Every item below is resolved. There are **no remaining `NEEDS CLARIFICATION` markers** — the three
spec clarifications (ownership, retention, search scope) were already integrated into `spec.md`, and
the planning-time constraint conflict flagged by the clarification pass is resolved in **R1**.

Research method: the repository was inspected directly (`package.json`, `vitest.config.ts`,
`src/lib/store.ts`, `src/lib/demoAuth.ts`, `src/lib/capabilities.ts`, `src/lib/queryHistoryClient.ts`,
`src/lib/ai/databaseAssistant.ts`, `src/components/ui/QueryHistoryPanel.tsx`,
`src/app/database-ai-assistant/components/DatabaseAIAssistantContent.tsx`, `tests/utils/test-setup.ts`)
so that every decision reuses an existing, confirmed convention rather than an assumed one.

---

## R1 — Storage key: identity-partitioned, namespace preserved

**Decision**: Keep the request's centralised key as a *namespace prefix* and append the owning
identity as a partition suffix:

```
sql-visualizer:database-ai-assistant:chat-history:<identityKey>
```

One payload per identity, still one centralised key *per identity* — never one key per conversation,
which FR-013/FR-042 both rule out. `<identityKey>` is derived in **R2**.

**Pre-existing undifferentiated history** (the conflict the clarification pass flagged): the bare
key `sql-visualizer:database-ai-assistant:chat-history` is treated as a **legacy partition** and
adopted once, under these rules:

1. Adoption runs **only when a real signed-in identity is present** — never for a guest or a
   signed-out browser, because FR-043 forbids an unowned conversation from surfacing in anyone's
   history.
2. It runs **only when that identity's own partition is absent or holds zero valid conversations**,
   so it can never overwrite real data.
3. On adoption the legacy payload is written into the identity's partition and the bare key is then
   removed. No conversation is destroyed — the same conversations continue to exist under the
   partition — so FR-029 ("the application MUST NOT remove… any conversation on its own") holds.
4. After adoption the data belongs to that identity and is never visible to another (FR-030,
   FR-032, SC-017). Conversations are never merged across identities.

Because this feature is new, no production data exists under the bare key today; the rule exists so
that anything written by an early build, or hand-edited by a developer, is attributed rather than
silently orphaned or discarded.

**Rationale**: FR-030 and FR-043 are MUSTs, and the constitution's Security & Privacy section states
that history storage MUST enforce user-level isolation. A single undifferentiated pool cannot
satisfy them. The spec Appendix directs that the requirement wins and that the conflict be raised —
it is raised in `plan.md` → "Constitution conflicts deliberately surfaced" and resolved here.
Adoption-by-current-identity is the only non-destructive attribution available for data that
carries no owner.

**Alternatives considered**:
- *One fixed key with an `ownerId` field inside each conversation, filtered on read.* Rejected:
  every identity's conversations still sit in one payload, so one corrupt or oversized write
  endangers all of them, the payload grows without bound across identities, and any code path that
  forgets the filter leaks another person's history. Isolation by construction beats isolation by
  discipline.
- *Keep the single key, store only the current identity's history, wipe on identity change.*
  Rejected: violates FR-043 (signing back in must restore that identity's conversations unchanged)
  and FR-029 (the application must not remove conversations).
- *One key per conversation.* Rejected by FR-013/FR-042 and by the request; it would also need a
  second key to record which conversation was active last (FR-011).

## R2 — Identity resolution and the partition key

**Decision**: Resolve the identity from the existing client session records in `src/lib/demoAuth.ts`,
after mount, in this precedence order:

| Precedence | Source (already in the repo) | Kind | `identityKey` | History |
|---|---|---|---|---|
| 1 | `getSocialSession()` → `{ provider, email }` | `social` | `social-<fnv1a36(provider + '\|' + normalizeEmail(email))>` | enabled |
| 2 | `isDemoAuthenticated()` (ORs the legacy admin flag with the social session) | `demo` | `demo` | enabled |
| 3 | `isGuestSession()` | `guest` | `guest` | enabled (AI surfaces only) |
| 4 | none of the above | `none` | `null` | **disabled** |

`normalizeEmail` = `trim().toLowerCase()`, so the same account maps to the same partition whatever
casing the provider returned. `identityKey === null` means **no partition exists** — the case of a
visitor who is neither signed in nor a guest: the contract performs no read and no write, the panel
renders its stable placeholder, and the session works purely in memory (FR-031, FR-033, FR-043).

A **guest** is a distinct case and *does* get its own `'guest'` partition. The gate in **R14** still
refuses a guest the assistant itself, so that partition stays empty by construction; granting it means
the guest's conversations persist if `013` ever loosens, without another identity migration. The
module is imported only by the Database Assistant history store and panel, which is what confines
guest history to the AI-backed surface.

The hash is **FNV-1a, 32-bit, rendered as base36** over the canonical descriptor — a small pure
function of about ten lines, synchronous and dependency-free.

**Rationale**: The key's job is *stable partitioning*, not secrecy. `UserSession.email` is already
held in plaintext in `localStorage` under `sqlvisualizer-user-session` by the existing 005 social
login, so hashing adds no confidentiality and must not be documented as a security control
(constitution: never overclaim). It is still used because it keeps the key short, opaque and free
of readable personal data in every storage-key listing, and because it is synchronous — which
matters, since every storage call needs the identity synchronously.

`demo` needs no per-user component: the demo gate is a single shared password with no account
behind it, so every demo sign-in on a device is by construction the same local identity. Recorded
as a known limitation.

**Alternatives considered**:
- *Web Crypto `crypto.subtle.digest('SHA-256', …)`.* Rejected: it is **async**, which would force
  every storage read and identity check to be awaited and ripple through the store and panel; and
  it buys no confidentiality here.
- *Raw `provider:email` in the key.* Rejected: readable personal data in every key name, for no
  functional gain.
- *`crypto.randomUUID()` per session.* Rejected: not stable across reloads, so it would break
  FR-010 and FR-043. It is used only for *conversation* ids (**R5**), where per-item uniqueness is
  exactly what is wanted.
- *A new server endpoint returning a user id.* Rejected: FR-032 forbids transmitting history, the
  feature adds no server surface, and the session record already provides what is needed.

## R3 — Browser-local storage backend

**Decision**: `localStorage`, holding one JSON payload per identity partition, behind the async
contract in **R4**. When `localStorage` is missing, throws on access, or is over quota, the
implementation falls back to an in-memory map for the rest of the session and reports the reason
(FR-031, FR-033).

**Sizing against the measurable criteria**: SC-018 requires 200 conversations to survive reloads and
a browser restart. A representative database-assistant exchange is a ~200-character question plus a
~1.5 KB markdown answer with a small `sources` array; a six-turn conversation serialises to roughly
7 KB, so 200 conversations ≈ **1.4 MB** — comfortably inside the ~5 MB per-origin `localStorage`
budget, with headroom for heavier threads. Only a sustained worst case (200 conversations × ~20
long turns) approaches the cap. FR-029 forbids the application from truncating to fit, so that case
is handled by FR-031 — keep working in memory, notify once, never damage saved data — rather than
by dropping conversations.

**Named successor and switch trigger**: IndexedDB, implementing the *same* contract with no change
to any caller. Switch when either is observed: (a) real users report the quota-exceeded notice, or
(b) the feature is asked to retain attachments or per-message metadata that pushes a typical
payload past ~2 MB. Until then IndexedDB would add an async object-store layer and a test double
for capacity the specified scenarios do not need.

**Rationale**: Zero new dependencies (constitution V); a synchronous primitive behind an async
contract; and it matches the repository's existing persistence convention — `src/lib/queryHistoryClient.ts`,
`src/lib/demoAuth.ts` and `src/lib/sql/complexityScorer.ts` all use `localStorage` with best-effort
try/catch that never throws.

**Alternatives considered**:
- *IndexedDB now.* Rejected for now (above): the larger quota is real, but it needs a new dev
  dependency (`fake-indexeddb`) or a hand-rolled fake to test, and the specified scale does not
  require it. Kept as the documented successor.
- *`sessionStorage`.* Rejected outright: cleared when the tab closes, breaking FR-010 and SC-001.
- *A server-backed store now.* Rejected: FR-030 holds history on the device and FR-032 forbids
  transmitting it; the server-backed variant is explicitly a *later* implementation of the same
  contract (FR-042).
- *The existing `/api/history` Excel-on-disk query-history mechanism.* Rejected: a different
  feature's server-side store; it would transmit conversations off-device (FR-032) and has no
  notion of conversations.

## R4 — Shape of the replaceable storage contract

**Decision**: A single async interface with three operations over the whole partition:

```ts
interface DatabaseAssistantHistoryStorage {
  load(identityKey: string | null): Promise<LoadResult>;
  save(identityKey: string | null, history: StoredHistory): Promise<SaveResult>;
  clear(identityKey: string | null): Promise<SaveResult>;
}
```

`LoadResult` reports `status: 'ok' | 'empty' | 'disabled' | 'corrupt' | 'unavailable'` plus the
validated history; `SaveResult` reports `status: 'ok' | 'disabled' | 'quota' | 'unavailable'`.
Neither ever throws — the caller reads the status and applies FR-031/FR-033/FR-034.

The request's longer operation list (`get`, `delete`, `rename`, `search`) is **not** placed on the
persistence contract. Those are conversation-level operations implemented as pure functions over
the in-memory collection in the store, each followed by exactly one `save`. They are still unit
tested, as the Appendix's verification list requires — at the layer where they actually live.

**Rationale**: FR-042 asks for "a single replaceable mechanism", and the request itself "explicitly
warns against over-engineering this shape". Three whole-partition operations are the minimum that
supports every transition in FR-013, and a future server-backed implementation can satisfy them
with no user-visible change — the `version` marker on each record exists precisely so that
implementation can reconcile. Server-shaped `search`/`get` endpoints now would be speculative API
for a backend that does not exist.

The contract is **async even though the current implementation is synchronous**, because FR-042
requires that a server-backed store can later take its place. Retrofitting `await` onto every call
site afterwards would touch the store and the panel; declaring it now costs one `await` per
transition.

**Alternatives considered**:
- *A six-operation contract (`save/load/get/delete/rename/search`).* Rejected as speculative for a
  browser-local store that already holds everything in memory; it would also duplicate search logic
  between a pure helper and the contract.
- *A synchronous contract.* Rejected: it would have to be broken open the moment FR-042's
  server-backed implementation arrives.
- *Per-conversation `save(id, conversation)`.* Rejected: contradicts "one centralised storage key"
  and would need a separate place for `activeConversationId` (FR-011).

## R5 — Conversation and message identity

**Decision**: `crypto.randomUUID()` when available, falling back to
`dbs-<Date.now().toString(36)>-<counter>-<random base36>` — a fallback that mirrors the existing
`qh-${Date.now()}-${Math.random()…}` convention in `src/lib/queryHistoryClient.ts`. A module-level
counter keeps ids unique even when two are generated in the same millisecond.

Ids are generated once, stored on the record and never recomputed. Nothing derives an id from an
array index (FR-002), and renaming, reopening, appending to or reordering a conversation cannot
change it. Today's `idRef = useRef(Date.now())` counter in `DatabaseAIAssistantContent.tsx` is
replaced by this generator, because a per-mount counter restarts on every mount and can collide
with an already-persisted id.

**Rationale**: FR-002 requires a stable identity "produced by a reliable unique-identifier
generator, never an array index". `crypto.randomUUID()` is built in, collision-free and
dependency-free. `localhost` and any HTTPS deployment are secure contexts, so it is available; the
fallback covers a plain-HTTP deployment.

**Alternatives considered**: *Array index* (forbidden by FR-002); *title-derived slug* (changes on
rename and collides — User Story 4 describes three conversations whose derived titles all begin the
same way); *a new id library such as `nanoid` or `uuid`* (rejected under constitution V: no new
dependency for something the platform already provides).

## R6 — Title derivation (deterministic, free, never empty)

**Decision**: A pure synchronous helper `deriveConversationTitle(firstQuestion: string): string`:

1. Remove fenced code blocks (```` ``` …``` ````) and inline-code backticks, and strip markdown
   link, heading and bullet sigils — a question pasted from an editor must not title itself ```` ``` ````.
2. Collapse every whitespace run to a single space and trim.
3. If the result exceeds `TITLE_MAX = 60` characters, cut at the last space at or after character
   `TITLE_MIN = 40`; if there is no such space, hard-cut at 60. Append `…` when truncated. Never cut
   mid-word when a boundary exists (FR-004).
4. If the result is empty after normalisation, fall back to a hard truncation of the **raw trimmed**
   question at 60 characters. The ask handler already rejects an empty or whitespace-only question
   (`if (!trimmed || isAsking) return`), so a stored first question is always non-empty and the
   title is therefore always non-empty (FR-004) — without baking locale-specific placeholder text
   into storage.

No model call, no network request, no noticeable delay (FR-003). A derived title is computed only
at creation; a manual title sets `titleIsCustom = true` and takes permanent precedence (FR-005). An
empty or whitespace-only manual title is refused and the previous title kept (FR-005).

**Rationale**: FR-003/FR-004 require a deterministic, free derivation that reads well in a list and
is never empty. Word-boundary truncation with a minimum window is the standard readable-ellipsis
approach and is trivially testable. Keeping the fallback language-neutral avoids storing
locale-dependent text that would go stale when the user switches language — FR-038 governs UI
strings, not stored data.

**Alternatives considered**: *Model-generated titles* (forbidden by FR-003); *first N characters
regardless of words* (violates FR-004's "cut at a readable boundary rather than mid-word"); *a
stored locale key as the empty fallback* (would render in the wrong language after a locale switch,
and FR-004 makes the empty case unreachable anyway); *sentence splitting or summarisation
heuristics* (over-engineering for a list label).

## R7 — Failed, stopped and interrupted answers

**Decision**: Align the stop path with the error path that already exists. On **error** *and* on
**abort/stop**, roll the exchange back to the thread state captured before the attempt and restore
the question text into the input draft; persist nothing. Only a fully completed answer is committed
(FR-008) and persisted (FR-013).

The repository already does exactly this for errors — `DatabaseAIAssistantContent.tsx` lines 253-255:

```ts
// Roll the unanswered question back out of the thread so a retry is not duplicated.
setTurns(priorTurns);
setQuestion(trimmed);
```

The `AbortError` branch instead returns early and leaves the partial text on screen. That branch is
changed to take the same rollback, because FR-009 ("MUST NOT save an answer that was stopped,
interrupted or failed… leave the conversation in the state it was in before that attempt"), the spec
edge case "Answer interrupted mid-stream" ("the thread returns to its last complete state and the
question can be asked again"), acceptance scenario 7 and SC-007 all require it.

**Interpretation recorded**: "the state before that attempt" means the state before the *question
was sent* — the whole exchange (question **and** pending answer) rolls back and the question returns
to the input, matching scenario 7's "the failed exchange is not present as a stored message and the
question is available to ask again" and FR-037's "an error rolling the unanswered question back into
the input so it can be retried". This is the assistant's existing observable behaviour, which the
spec makes authoritative ("exactly as the assistant behaves today"). A consequence worth stating:
FR-007's "save the question as soon as it is sent" is satisfied by the in-memory turn appearing
immediately; a *persisted* question exists only once its answer completes, so an interrupted attempt
leaves no stored trace at all — which is exactly what SC-007 measures.

**Rationale**: One rollback rule for both failure modes is simpler than two, removes the only path
that could persist a partial answer, and keeps SC-007 ("zero stored answers are partial") true by
construction rather than by cleanup.

**Alternatives considered**: *Keep the partial answer marked incomplete* (violates FR-009 and
SC-007, and Key Entities states "An answer that never completed is not a message"); *keep the
question with no answer and offer a regenerate control* (contradicts scenario 7 and FR-037's
existing rollback, and invents UX the spec does not ask for); *persist the question at send time
then delete it on failure* (same visible result but two writes instead of none, against FR-013).

## R8 — Write discipline: exactly which transitions persist

**Decision**: Persist on these transitions and no others (FR-013):

| # | Transition | Store action | Writes |
|---|---|---|---|
| 1 | Conversation created *with its first question* | `startConversation` | 1 |
| 2 | Question sent into an existing conversation | `askInConversation` | 1 |
| 3 | Answer completed | `completeAssistantTurn` | 1 |
| 4 | Answer failed / stopped / aborted | `rollbackAttempt` | **0** |
| 5 | Title changed by the user | `renameConversation` | 1 |
| 6 | Conversation deleted | `deleteConversation` | 1 |
| 7 | Whole history cleared | `clearAllConversations` | 1 (`clear`) |
| 8 | Active conversation changed | `selectConversation` | 1 |
| 9 | Identity changed | `bindIdentity` | 0 (reads only) |
| 10 | Streamed fragment / keystroke | — | **0** |

Note on 1 and 2: a conversation is created *lazily, at the moment its first question is sent* — not
when the user presses "New chat". "New chat" only clears the active pointer and the draft, which
costs nothing and satisfies FR-006 (a conversation with no messages is never presented) and FR-001
(creating one never disturbs the others) without ever storing an empty shell. Transition 1 is
therefore the same code path as 2 with a freshly created record.

Note on 8: selecting a conversation writes because `activeConversationId` lives inside the same
payload and FR-011 must restore it on next open. The write is one serialisation of an already
in-memory object, not extra I/O per message.

**Rationale**: FR-013 names the transitions; SC-008 measures that saving happens at most once per
completed answer and never during streaming. Writing on the *transition* rather than on a debounce
timer makes SC-008 provable by counting contract calls in a test, and removes any risk of a pending
debounce losing data when the tab closes (FR-010).

**Alternatives considered**: *Debounced or throttled writes* (rejected: a timer can still fire
between fragments, breaking SC-008's "no storage work between the first and last fragment", and can
be lost on tab close); *writing on every store mutation* (explicitly forbidden by FR-013); *writing
on unmount only* (loses data on crash or forced close, breaking FR-010).

## R9 — Restoring the last-active conversation

**Decision**: `activeConversationId` is a field **inside** the same `StoredHistory` payload — not a
second storage key. On open, the store loads the partition and selects that id if it still exists;
otherwise the most recently used conversation; otherwise the empty conversation state (FR-011). A
dangling id (its conversation was deleted in another tab) falls back the same way, so the user is
never left viewing a deleted conversation (FR-026).

**Rationale**: Keeping it in the payload preserves the request's "one centralised storage key"
literally, keeps the write atomic with the conversation change that caused it, and means a partially
written payload can never leave the pointer referring to a conversation absent from that payload.

**Alternatives considered**: *A separate `…:active-conversation` key* (two keys to keep consistent,
and a second write per selection); *always opening the most recent conversation* (violates FR-011
when the user was working in an older one); *a URL query parameter* (rejected: history is per-device
state, not shareable navigation state, and a conversation id in the URL would leak into logs and
browser history).

## R10 — Search: scope, matching and determinism

**Decision**: A pure in-memory filter over the loaded partition:

```ts
conversationMatches(conversation, term): boolean  // term already trimmed + lower-cased
```

- **Scope** (FR-021, SC-019): `conversation.title` plus the `content` of every message whose
  `role === 'user'`. Assistant `content` is **never** examined. A dedicated test places a unique
  term only inside an answer and requires zero matches.
- **Matching** (FR-022): Unicode NFC-normalise both sides, then `toLowerCase()`, then `includes()` —
  case-insensitive, works on partial words, and returns identical results for identical input.
- **Empty term**: returns the full list in its normal order and groupings (FR-023).
- **No matches**: the list component renders the explicit "no conversations match" state (FR-023).
- **Side effects** (FR-024): none. The filter is pure and read-only; it never creates, renames,
  deletes, reorders or mutates. The search text is transient component state, never persisted
  (Key Entities: "Search query").
- Filters as the user types with no submit step (FR-020), debounced by React's own batching only.

**Rationale**: FR-021/FR-022 fix the scope and demand determinism. A plain substring filter over
200 conversations is a few thousand `includes` calls — microseconds — so SC-004's one-second budget
is met with a very large margin and no index is needed.

**Alternatives considered**: *Semantic/embedding search, as `QueryHistoryPanel` does with
`tryEmbedText` + `cosineSimilarity`.* Rejected deliberately: it needs a model call (against this
feature's "no model spend" economy), it is **not** deterministic across runs (violates FR-022's
"same results every time"), and FR-021 defines an exact textual scope. The existing panel's
behaviour is intentionally not copied here. *A prebuilt inverted index* (rejected: over-engineering
at 200 conversations; revisit only if the target scale grows by an order of magnitude).
*`Intl.Collator`-based fuzzy scoring* (rejected: FR-022 requires identical results, and scoring
implies a ranking the spec does not ask for).

## R11 — Ordering and recency grouping

**Decision**: Order by `lastUsedAt` descending (FR-015). `lastUsedAt` is updated when a conversation
is created, when a question is sent into it, when an answer completes, and when it is selected.
Rename does **not** change it — renaming is not "using" a conversation, and FR-024's spirit
(management actions must not silently reorder) applies.

Grouping is **derived at render time**, never stored (Key Entities: "Recency group … Groups exist
only for presentation and are not stored per conversation"). A pure helper computes local-midnight
boundaries from `lastUsedAt`:

| Group | Rule (local time) |
|---|---|
| `today` | same local calendar day as now |
| `yesterday` | the local calendar day immediately before today |
| `previousSevenDays` | within the 7 local days before today, exclusive of yesterday |
| `older` | everything else |

Empty groups are not rendered. Under an active search the same grouping applies to the filtered
subset (FR-023: clearing restores "its normal order and groupings").

**Rationale**: FR-015 fixes both the ordering key and the four groups. Deriving groups at render
time means a conversation crossing midnight re-groups itself on the next render with no migration,
and no stored field can drift out of sync. Local-timezone boundaries are what a user means by
"today"; UTC boundaries would mis-group evening conversations for users east of Greenwich.

**Limitation to document in code**: grouping uses the device's current timezone, so a user who
changes timezone may see a conversation move group. That is correct for a local, on-device history
and is noted rather than "fixed".

**Alternatives considered**: *Storing a `group` field* (goes stale at midnight, needs migration);
*UTC boundaries* (mis-groups for most users); *ordering by `createdAt`* (violates FR-015's "most
recently used first" and User Story 1's "the order changes when an older one is used again");
*relative labels such as "3 hours ago"* (FR-016 needs an indication of when it was last used, which
the group heading plus a short date provides; ticking relative labels would need a re-render timer
the spec does not require).

## R12 — State management: one source of truth in the existing store

**Decision**: Extend the existing Zustand store (`src/lib/store.ts`) — no new store, no context
provider, no component-local conversation state. The persisted collection is the single source of
truth:

```ts
dbConversations: StoredConversation[];        // the current identity's conversations
dbActiveConversationId: string | null;
dbHistoryStatus: 'idle' | 'loading' | 'ready' | 'unavailable';
dbIdentityKey: string | null;
```

`databaseAssistantHistory` (the active thread) becomes a **derived projection** —
`selectActiveThread(state)` maps the active conversation's messages to the existing
`DatabaseAssistantChatTurn` shape — rather than a second stored array.
`databaseAssistantQuestionDraft` is kept unchanged. `setDatabaseAssistantHistory` and
`resetDatabaseAssistantChat` are replaced by the intent-named transition actions in **R8**.

**Rationale**: The carried-over constraint says conversation state "belongs in the application's
existing client state store, replacing the assistant's current in-memory thread rather than
duplicating it". A projection cannot drift from the collection, which is exactly the duplication the
constraint forbids. Keeping `DatabaseAssistantChatTurn` as the projection's output means the
existing rendering code — markdown and code blocks, copy button, source labels, streaming indicator
— keeps working unchanged, which is what protects SC-015.

**Blast radius confirmed**: a repository-wide search shows `databaseAssistantHistory`,
`setDatabaseAssistantHistory`, `resetDatabaseAssistantChat` and `databaseAssistantQuestionDraft` are
referenced **only** in `src/lib/store.ts` and `DatabaseAIAssistantContent.tsx`. No test file and no
other component depends on them, so replacing the two setters is contained and cannot regress
another feature.

**Alternatives considered**: *A second Zustand store for history* (two stores to keep in sync, and
the request names the existing store); *`useState`/`useReducer` in the panel* (the panel remounts on
navigation — precisely why `chatHistory` already lives in the store, see the existing comment at
`src/lib/store.ts` lines 102-108); *keeping `databaseAssistantHistory` as stored state alongside the
collection* (the duplication the constraint forbids; it can drift when a rename or delete touches the
collection); *Zustand's `persist` middleware* (persists the whole app store on every mutation,
violating FR-013 and SC-008, and it cannot partition by identity).

## R13 — Detecting identity changes (FR-043)

**Decision**: Re-derive the identity **after mount** (browser storage does not exist during
prerender — the same reason `DatabaseAIAssistantContent.tsx` already reads `isGuestSession()` in a
mount effect).

The memoized key is then **re-validated against a signature** built from the three storage markers
that decide identity (`sqlvisualizer-user-session`, `sqlvisualizer-demo-authenticated`,
`sqlvisualizer-guest-session`). Every sign-in, sign-out and session expiry mutates one of them, so a
changed signature means the cached key is stale and is re-derived. Reading three `localStorage` keys
per call is cheap, and it also catches the expiry path: `getSocialSession()` prunes an expired session,
which flips the signature on the next read.

The panel additionally tracks the identity it last hydrated and routes any change through the store's
`resetForIdentity`, which empties the previous partition before loading the new one. Mount and
identity change therefore both go through one code path, and no stale conversations survive a switch.

**Rationale**: Validating against the markers removes the need for each caller to remember to call
`clearCachedHistoryIdentity()`. No call site did — so a key cached before an identity change survived
it and the UI kept showing the previous partition, which is precisely the leak FR-043 forbids. Deriving
correctness from storage rather than from caller discipline closes that hole by construction, and
`clearCachedHistoryIdentity()` stays available for tests and same-tick changes.

**Alternatives considered**: *Listening for `storage` / `focus` / `visibilitychange` events to
re-derive* (rejected: adds listeners and a lifecycle for a signal the storage read already carries,
and `storage` does not fire in the tab that made the change anyway). *Dispatching a custom
`identity-changed` event from `demoAuth`* (rejected: it would modify another feature's module (005/013)
for no measurable gain, since sign-out already navigates and the assistant page remounts; it also
creates a coupling a future auth refactor could silently break). *Polling the session record on an
interval* (rejected: wasted work, and any interval is either too slow for FR-043 or too costly).
*Holding identity in the Zustand store and updating it from the sign-in UI* (rejected: sign-in happens
in `SignInPanel`/OAuth callback, so this would require touching those flows — a larger blast radius).

## R14 — Guest sessions (FR-041, SC-016)

**Decision**: History is **inert** for a guest. The existing gate stays exactly as it is —
`isGuestSession() && isLockedForGuest(getCapability('database-assistant')!, aiConfig)` renders
`LockedFeatureNotice` and nothing else. The history panel is **not rendered in that branch at all**,
so it cannot present, hint at, or enable a way around the refusal. Identity resolution nevertheless
assigns a guest the `'guest'` partition (**R2**), so the guest's conversations are partitioned rather
than discarded; because the gate above refuses every model-backed capability, that partition stays
empty by construction — matching the spec's assumption that "a guest's history is empty by
construction and the history panel must simply render harmlessly beside the refusal notice".

**Rationale**: FR-041 requires the refusal to be unchanged and unhinted; SC-016 requires the panel's
presence or absence to make no difference to the outcome. Not rendering it in the locked branch is the
strongest way to guarantee both. Giving the guest a partition key separately keeps the partition
scheme total — identity resolution never has to answer "guest?" with a special case that means
"disabled" — and leaves guest history ready if `013` ever opens the gate.

**Alternatives considered**: *Render the panel in a disabled state beside the notice* (rejected: it
adds UI for an unreachable state and risks implying that history exists for guests); *give guests a
temporary per-session partition* (rejected outright: FR-043 says a conversation with no owning
identity, "including anything attempted during a guest or signed-out session", must not appear in
any identity's history).

## R15 — Localisation (FR-038, SC-012)

**Decision**: Add a `dbAssistantHistory*` key family to `src/locales/en.ts` and `src/locales/vi.ts`,
following the existing `dbAssistant*` prefix (43 keys today, with exact en/vi parity). Components
resolve them with the established pattern already used by the assistant page:

```ts
const t = getT(settings.locale);   // src/lib/i18n.ts
```

Parity is enforced by the compiler, not by review: `src/lib/i18n.ts` declares
`type TranslationSchema = { [K in keyof typeof en]: string }` and
`export const translations = { en, vi } satisfies Record<Locale, TranslationSchema>`, so a key
present in `en` and missing from `vi` is a **type error** caught by `npm run type-check`. That makes
SC-012 ("zero strings stay in one language") mechanically verifiable.

Keys required (all user-facing text this feature adds): panel open/close, panel heading, "New chat"
(existing `dbAssistantNewChat` is reused), search field label and placeholder, "no conversations
match", empty-history guidance, the four recency group headings, rename action and its input label,
rename refused (empty title), delete action, delete confirmation prompt and its confirm/cancel,
clear-all action, its confirmation prompt and confirm/cancel, "history will not be remembered"
(storage unavailable, FR-033), and conversation count/active-conversation accessible labels.

**Rationale**: FR-038 requires the existing mechanism and both languages; the type-level parity
guarantee is a property the repository already has, so reusing it is both the smallest change and
the strongest verification.

**Alternatives considered**: *A new i18n library* (rejected, constitution V and rule 20: no new
dependency, and `getT` is the established mechanism); *inline English strings with a translation
TODO* (violates FR-038 outright); *storing localised labels in the payload* (rejected in **R6**:
stored data must stay language-neutral so it survives a locale switch).

## R16 — Responsive layout and design-system reuse (FR-014, FR-039, SC-014)

**Decision**: One panel component with two presentations, driven by Tailwind's existing breakpoints
(the repository uses Tailwind 3.4.6 with the default scale; the assistant page already uses `sm:`):

- **Wide (`lg` and up)**: a two-column flex/grid row — a fixed-width history sidebar (~18rem) beside
  the conversation. The conversation column keeps `min-w-0` so long code blocks cannot push the
  sidebar off or squeeze it, and the sidebar is `sticky`/self-scrolling so a long list never grows
  the page.
- **Narrow (below `lg`)**: the sidebar becomes an off-canvas drawer, opened by a header button and
  dismissed by its close button, a backdrop click, or `Escape`. `tailwindcss-animate` (already a
  dev dependency) provides the transition. The conversation column occupies the full width when the
  drawer is closed and is **never rendered underneath a permanently open panel** — which is what
  FR-014's "without hiding, squeezing or breaking the conversation itself" and SC-014 require.

Reuse, do not restyle (FR-039): the existing surface vocabulary already used by
`src/components/ui/QueryHistoryPanel.tsx` and the assistant page — `bg-card`/`bg-background`,
`border-border`, `text-foreground`, `text-muted-foreground`, `rounded-lg`, the existing focus-ring
classes — plus `lucide-react` icons already imported by this feature area (`History`, `Search`,
`Trash2`, `X`, `Loader2`, `Plus`/`Bot`). Dark and light themes come from the existing
`ThemeProvider` CSS variables, so no colour is hardcoded and SC-014's "both themes" is satisfied by
construction.

The assistant page's current `max-w-3xl mx-auto` container is widened to accommodate the sidebar at
`lg`+ while the conversation column itself keeps a comfortable measure. This is a layout change to
the assistant page, not a new visual style.

**Rationale**: FR-014 and SC-014 fix the two presentations and forbid breaking the conversation;
FR-039 forbids a second design system. `QueryHistoryPanel` is the repository's existing precedent
for exactly this kind of list-plus-search-plus-clear panel, so matching it keeps the two history
surfaces coherent.

**Alternatives considered**: *A modal dialog for history on every viewport* (rejected: FR-014
requires it *beside* the conversation on a wide screen); *shrinking the desktop sidebar to fit
mobile* (rejected by rule 40 and by FR-014 — content priority changes, so it becomes a drawer);
*a new headless UI or radix dependency for the drawer* (rejected, constitution V: `tailwindcss-animate`
plus a few elements already covers it); *a resizable split pane* (over-engineering; the spec fixes
two presentations, not a user-adjustable one).

## R17 — Accessibility and confirmation UX (FR-040, SC-013, FR-028)

**Decision**:
- Every control is a native `<button>` or `<input>`, so keyboard reach, visible focus and the
  browser's focus ring come free; each icon-only button carries `aria-label` and `title`, exactly as
  the existing assistant buttons do (`title={t.dbAssistantNewChat} aria-label={t.dbAssistantNewChat}`).
- The active conversation is marked with `aria-current="true"` on its row (FR-016's "visibly
  distinguished", exposed to assistive technology as well).
- The list is a `<nav aria-label={…}>` containing a `<ul>`; recency group headings are real
  headings, so the list can be skimmed by heading navigation.
- The search field is `<input type="search">` with a programmatic label and `aria-describedby` for
  the result count; the "no conversations match" state is announced through an `aria-live="polite"`
  region so it is not silent.
- The narrow drawer is `role="dialog"` + `aria-modal="true"` with a labelled title, focus moved into
  it on open, returned to the opener on close, and `Escape` to dismiss.
- The storage-unavailable notice (FR-031/FR-033) is `role="status"` — non-blocking, announced once,
  never a modal.
- **Confirmations are inline, never `window.confirm`.** Reuse the pattern already in
  `QueryHistoryPanel` (`const [confirmClearAll, setConfirmClearAll] = useState(false)`): the row's
  delete button swaps in place to a Confirm / Cancel pair, and clear-all does the same in the panel
  footer. Both buttons are real buttons, so confirming a deletion without a pointer satisfies
  SC-013. Cancelling, pressing `Escape`, or moving away leaves all stored data untouched (FR-028).

**Rationale**: FR-040 and SC-013 require every history action, including confirming a deletion, to
be operable by keyboard. `window.confirm` is the obvious shortcut and is explicitly rejected: a
repository-wide search confirms it is used **nowhere** in `src/`, it cannot be localised or themed
(FR-038, FR-039), it blocks the main thread, and its button labels are not controllable, which
makes SC-013 unverifiable. The inline pattern is already established in this codebase.

**Alternatives considered**: *`window.confirm`* (rejected above); *a new shared `ConfirmDialog`
component* (deferred: only this feature needs it today, and extracting a shared component from a
single use is premature — if a second feature needs the same confirmation, extract it then);
*undo-toast instead of confirmation* (rejected: FR-025 requires explicit confirmation *before* a
permanent deletion, and `sonner` undo would keep deleted data resident to support the undo, which
FR-025's "permanent" and FR-029's user-managed shrinkage make needlessly subtle).

## R18 — Robustness: blocked storage, corruption and quota

**Decision**: The implementation never throws; it returns a status and the store reacts.

| Situation | Detection | Contract status | Behaviour |
|---|---|---|---|
| Storage blocked / private window / disabled | `typeof window === 'undefined'`, accessing `window.localStorage` throws (Safari private mode, some corporate policies) | `unavailable` | Session works fully in memory; one non-blocking `role="status"` notice per session that conversations will not be remembered (FR-033, SC-009). No dialog, no error page. |
| Payload is not valid JSON, or not an object, or wrong `version` type | `JSON.parse` throws / type guard fails at the top level | `corrupt` | Assistant opens with an **empty** history, no crash, no error surfaced (FR-034, SC-010). The unreadable payload is left alone — it is not deleted, because FR-029 forbids the application removing data on its own and the user may be able to recover it. |
| Payload parses but *some* conversations are invalid | per-conversation type guard (`isStoredConversation`) | `ok` | Valid conversations are shown, invalid ones dropped, nothing surfaced (FR-035). Per-message guard (`isStoredMessage`) drops bad messages inside an otherwise valid conversation. |
| Write exceeds quota | `setItem` throws `QuotaExceededError` (or a `DOMException` with name `QuotaExceededError`/code 22) | `quota` | In-memory state is kept exactly as it is; **one** non-blocking notice per session; previously saved conversations are untouched because the failed `setItem` did not modify them (FR-031, SC-009). No truncation, no eviction (FR-029). |
| Any other storage failure | any other throw | `unavailable` | Same as blocked storage. FR-036 holds: no history failure can prevent asking or answering. |

Validation is `unknown` + type guards, matching the existing `isUserSession` / `isGuestSessionValue`
convention in `src/lib/demoAuth.ts` — no `any`, no `as` casts on untrusted data (constitution Q2).
Guards check: `id`/`title` are non-empty strings, `createdAt`/`lastUsedAt` are finite numbers,
`messages` is an array whose entries pass the message guard, `role` is `'user' | 'assistant'`,
`sources` (when present) is an array of `{ sourceFile: string; section?: string; pageAnchor?: string }`.

**"Once per session" for notices**: a module-level flag, reset when the identity changes, so a user
is not nagged on every transition but is told again in a genuinely new session.

**Rationale**: FR-031/FR-033/FR-034/FR-035/FR-036 and SC-009/SC-010 specify each case exactly; the
status-based design makes every one of them a testable return value instead of an exception path.
Leaving a corrupt payload in place rather than clearing it is the conservative reading of FR-029.

**Alternatives considered**: *try/catch that silently swallows and clears the key* (violates
FR-029's "the application MUST NOT remove… any conversation on its own"); *throwing to the caller*
(violates FR-036 and the repository's best-effort convention); *a toast per failed write* (violates
FR-031's "informed once"); *repairing malformed records by filling in defaults* (rejected: it would
invent content and could resurrect a conversation the user deleted; dropping is honest and matches
FR-035).

## R19 — Long threads (FR-019, SC-005)

**Decision**: Render the whole thread — no virtualisation, no "load more" — and scroll to the latest
exchange on selection. The existing `endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })`
effect in `DatabaseAIAssistantContent.tsx` already does this and is kept; it runs on selection as
well as on append. On selection the jump is immediate (`behavior: 'auto'`) rather than smooth, so a
100-message thread settles at the bottom without animating through all of it, which is what keeps
SC-005's two-second budget comfortable.

Message rendering reuses the existing `MessageContent` / `MarkdownText` / code-fence components
unchanged, so restored threads look identical to live ones (FR-012) and SC-015's rendering
behaviours are preserved by literally not touching that code.

**Rationale**: FR-019 requires the whole thread to be shown and to remain responsive; SC-005 sets a
two-second budget for 100 messages. 100 markdown messages render well inside that on any modern
browser, so virtualisation would add substantial complexity (variable-height measurement, scroll
anchoring, interaction with the streaming append) for a budget that is already met.

**Alternatives considered**: *Windowing/virtualisation (`react-window`, `@tanstack/virtual`)* —
rejected: new dependency (constitution V), and it fights the streaming-append and scroll-to-bottom
behaviours FR-037 requires; revisit only if a real thread length far beyond 100 messages is
observed. *Paginating older messages behind a "show earlier" button* (rejected: FR-019 says "MUST
show the whole thread"). *Memoising every message row* (deferred: rule 60 forbids adding
memoisation without a concrete reason; the measured budget is met without it, and it can be added
if profiling shows a problem).

## R20 — Dependency confirmation: `005-oauth-social-login` and `013-guest-access-mode`

The clarification pass asked that these two dependencies be confirmed during plan generation. Both
were verified against the working tree, not against their spec folders.

**`005-oauth-social-login` — CONFIRMED, depended on for identity.**

| Verified in the tree | What this feature uses it for |
|---|---|
| `src/lib/demoAuth.ts` exports `SOCIAL_AUTH_STORAGE_KEY = 'sqlvisualizer-user-session'` | The partition's existence check |
| `UserSession { provider: 'google' \| 'microsoft'; displayName; email; avatarUrl?; accessToken; expiry }` | `provider` + `email` form the identity descriptor (**R2**) |
| `getSocialSession(): UserSession \| null` — validates with `isUserSession`, honours `expiry`, clears malformed entries | The single read used to resolve identity; expiry-aware, so an expired session correctly yields `null` and history is disabled |
| `setSocialSession()` persists only after the server accepted the token; `clearSocialSession()` / `clearDemoAuthenticated()` remove it | Sign-in and sign-out are the lifecycle edges FR-043 follows |
| `DEMO_AUTH_STORAGE_KEY = 'sqlvisualizer-demo-authenticated'`, `setDemoAuthenticated(password)` (server-verified), `isDemoAuthenticated()` | The `demo` identity kind (**R2**) |
| `tests/utils/test-setup.ts` provides `signInAsSocialUser(overrides)` and `signInAsDemoUser()` | Identity-lifecycle tests need no new fixtures |

*Contract this feature relies on*: `provider` + `email` remain present and stable for a signed-in
social identity. If 005 ever stops persisting `email` client-side, the partition key must move to a
server-issued opaque subject id — recorded as the single cross-spec risk this feature carries.

**`013-guest-access-mode` — CONFIRMED, depended on for the refusal boundary.**

| Verified in the tree | What this feature uses it for |
|---|---|
| `GUEST_AUTH_STORAGE_KEY`, `GuestSession { startedAt, locale }`, `getGuestSession()`, `isGuestSession()` | The `guest` identity kind → `identityKey = 'guest'`, a partition of its own (**R2**, **R14**) |
| `isDemoAuthenticated()` deliberately excludes guests (documented at `demoAuth.ts` lines 45-52) | Confirms a guest is never mistaken for a signed-in identity — exactly the FR-043 guarantee |
| `src/lib/capabilities.ts` capability id `'database-assistant'`; `isLockedForGuest(capability, aiConfig)` ignores the provider and refuses every model-backed capability | The refusal gate is reused verbatim; no new capability is added |
| `DatabaseAIAssistantContent.tsx` line 294 already renders `LockedFeatureNotice` under that gate | FR-041/SC-016 hold by leaving the gate untouched and not rendering the panel in that branch |
| Sign-out clears the guest marker too (`clearDemoAuthenticated()` → `clearGuestSession()`, "the same session, not a parallel one") | One lifecycle, so FR-043 needs no guest-specific sign-out handling |
| `tests/unit/guestAccess.test.tsx` and `guestEntitlement.test.ts` exist | The refusal regression is already covered; this feature must not change those tests' intent (SC-015) |

Neither dependency requires modification. This feature reads their public functions only and adds no
capability, no session field and no auth-flow change — which is what keeps the blast radius inside
the assistant page and the store.

## R21 — Testing strategy

**Decision**: Vitest + `jsdom` + `@testing-library/react`, files in `tests/unit/`, run with
`npm run test` alongside `npm run type-check` and `npm run lint`. No new test tooling: `jsdom`
provides `localStorage`, so no storage double is needed, and quota failure is simulated by stubbing
`Storage.prototype.setItem` to throw — no `fake-indexeddb`-style dependency.

| Test file | Covers | Requirements |
|---|---|---|
| `dbAssistantChatHistoryStorage.test.ts` | save/load/clear round-trip; corrupt payload; partially valid payload; missing or blocked storage; quota exceeded; disabled identity; legacy-key adoption | FR-029–FR-036, FR-042, SC-009, SC-010, SC-018 |
| `dbAssistantChatHistoryHelpers.test.ts` | title derivation (long, code-fenced, one long word, punctuation-only); ordering; the four recency groups incl. midnight boundaries; search scope, case-insensitivity, partial words, determinism | FR-003, FR-004, FR-015, FR-020–FR-024, SC-019 |
| `dbAssistantChatHistoryState.test.ts` | create / select / ask / complete / rollback / rename / delete / clear-all transitions; **write counts per transition** (the SC-008 proof); empty conversations never presented; active restore | FR-001, FR-002, FR-005–FR-013, FR-025–FR-028, SC-007, SC-008 |
| `dbAssistantChatHistoryIdentity.test.ts` | social vs demo vs guest vs none keys; stability across reload; isolation between two identities; sign-out hides; sign-back-in restores; unowned conversations never surface; no merge | FR-030, FR-032, FR-043, SC-017 |
| `dbAssistantHistoryPanel.test.tsx` | empty state, list, active marking, search and no-match, rename (incl. refused empty), delete confirm/cancel, clear-all confirm/cancel, keyboard-only operation, `en`/`vi` switch, narrow-viewport drawer, guest non-render | FR-014, FR-016, FR-018, FR-023, FR-025, FR-027, FR-028, FR-038–FR-041, SC-012–SC-014, SC-016 |
| Existing tests, unchanged | `aiService.test.ts`, `guestAccess.test.tsx`, `guestEntitlement.test.ts`, `demoAuth.test.ts`, `login-route.test.tsx`, `AppLayout.test.tsx` must still pass with their intent unmodified | SC-015, FR-037 |

Tests target observable behaviour — what the user sees and what the contract was asked to do — not
implementation internals, per rule 50. Selectors are accessible/role-based, never CSS-class or
DOM-structure assumptions.

**Alternatives considered**: *Playwright/Cypress end-to-end* (rejected: not present in the
repository, and rule 50 forbids introducing a second framework; the browser-restart criteria
SC-001/SC-005/SC-011 are verified manually through [quickstart.md](./quickstart.md)); *a
`fake-indexeddb` dev dependency* (not needed — **R3** keeps `localStorage`); *snapshot tests of the
panel* (rejected: brittle, and they assert structure rather than behaviour).

---

## Resolution status

| Source of unknown | Status |
|---|---|
| Spec clarification 1 — ownership | Resolved in `spec.md`; implemented by **R1**, **R2**, **R13**, **R20** |
| Spec clarification 2 — retention | Resolved in `spec.md`; implemented by **R3**, **R8**, **R18** |
| Spec clarification 3 — search scope | Resolved in `spec.md`; implemented by **R10** |
| Planning-time conflict — single storage key vs per-identity partitioning | **Resolved** by **R1** (identity-partitioned key plus the legacy adoption rule) |
| Technical Context unknowns | **None.** Every field in `plan.md` → Technical Context is filled from verified repository facts; no field reads `NEEDS CLARIFICATION`. |
| Dependencies on `005-oauth-social-login` and `013-guest-access-mode` | **Confirmed** in **R20** against the working tree |

No open questions remain. Phase 1 design proceeds on these decisions.











