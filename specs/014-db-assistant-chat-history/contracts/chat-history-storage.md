# Contract: Database Assistant Chat-History Storage

**Type**: Internal module contract (client-side). This feature exposes **no** HTTP endpoint, CLI
surface or public library API — FR-030 keeps history on-device and FR-032 forbids transmitting it,
so the interface this feature "exposes" is the replaceable storage mechanism FR-042 requires, plus
the UI contract in [history-ui.md](./history-ui.md).

**Modules**: `src/lib/ai/databaseAssistant/chatHistoryStorage.ts` (contract + types),
`src/lib/ai/databaseAssistant/chatHistoryLocalStorage.ts` (browser-local implementation),
`src/lib/ai/databaseAssistant/chatHistoryIdentity.ts` (identity → partition key).

**Consumers**: the Database Assistant slice of `src/lib/store.ts` only. Per FR-042 and the spec
Appendix, **no storage call may appear in presentation or conversation logic** — that is
`src/app/database-ai-assistant/**` and the assistant's streaming service
`src/lib/ai/databaseAssistant.ts`. This is enforceable by review and by a lint-style test asserting
those files do not import the storage modules.

---

## 1. Storage key

```
NAMESPACE = 'sql-visualizer:database-ai-assistant:chat-history'
key(identityKey) = `${NAMESPACE}:${identityKey}`      // identityKey !== null
LEGACY_KEY = NAMESPACE                                 // bare key, adoption only (research.md R1)
```

One payload per identity partition. Never one key per conversation.

## 2. Identity resolution

```ts
export type HistoryIdentityKind = 'social' | 'demo' | 'guest' | 'none';

export interface HistoryIdentity {
  kind: HistoryIdentityKind;
  /** Partition key, or null when history is disabled (signed out with no session at all). */
  identityKey: string | null;
}

/** Reads the existing client session records. Safe before mount: returns { kind: 'none', identityKey: null }. */
export function resolveHistoryIdentity(): HistoryIdentity;
```

| Precedence | Condition | `kind` | `identityKey` |
|---|---|---|---|
| 1 | `getSocialSession()` returns a session | `social` | `social-<fnv1a36(`${provider}\|${email.trim().toLowerCase()}`)>` |
| 2 | `isDemoAuthenticated()` (ORs the legacy admin flag with the social session) | `demo` | `demo` |
| 3 | `isGuestSession()` | `guest` | `guest` |
| 4 | otherwise | `none` | `null` |

Guest history is scoped to the AI-backed surfaces that read this module (the Database Assistant chat
history). It does not grant the assistant capability itself: the feature `013` gate still refuses a
guest, so the guest partition stays empty by construction.

**Guarantees**
- **G-ID-1** Stability: the same signed-in identity yields the same `identityKey` across reloads,
  route changes and browser restarts (FR-010, FR-043).
- **G-ID-2** Isolation: two different identities yield two different `identityKey` values, and
  neither can read the other's partition (FR-030, SC-017).
- **G-ID-3** Disabled: `identityKey === null` for guests and signed-out users, and the contract
  performs **zero** reads and **zero** writes in that state (FR-032, FR-043).
- **G-ID-4** No egress: resolution reads only `window.localStorage`; it makes no network request.
- **G-ID-5** Not a security control: the hash is an opaque, stable partition label. It must not be
  documented or relied on as protecting the email (research.md **R2**).

## 3. Contract surface

```ts
export type LoadStatus = 'ok' | 'empty' | 'disabled' | 'corrupt' | 'unavailable';
export type SaveStatus = 'ok' | 'disabled' | 'quota' | 'unavailable';

export interface LoadResult {
  status: LoadStatus;
  /** Validated history. Empty (never null) for 'empty' | 'disabled' | 'corrupt' | 'unavailable'. */
  history: StoredHistory;
  /** True when the bare LEGACY_KEY was adopted into this partition during this load. */
  adoptedLegacy: boolean;
}

export interface SaveResult {
  status: SaveStatus;
}

export interface DatabaseAssistantHistoryStorage {
  load(identityKey: string | null): Promise<LoadResult>;
  save(identityKey: string | null, history: StoredHistory): Promise<SaveResult>;
  clear(identityKey: string | null): Promise<SaveResult>;
}

export const databaseAssistantHistoryStorage: DatabaseAssistantHistoryStorage; // browser-local impl
```

**Global guarantees**
- **G-1 Never throws.** Every failure is reported through `status`. A caller cannot be broken by a
  storage failure (FR-036), and no history failure can prevent asking or answering.
- **G-2 Never returns `null`/`undefined` history.** Callers never branch on absence; an unusable
  load yields an empty `StoredHistory`, which is what FR-034 and SC-010 require.
- **G-3 Never mutates on failure.** A failed `save` leaves the stored payload byte-identical, so
  previously saved conversations are not damaged (FR-031).
- **G-4 Never removes data on its own.** No implementation path deletes a conversation. Only `save`
  (with a smaller `conversations` array, produced by a user delete) and `clear` (user clear-all)
  shrink history (FR-029, SC-018). A corrupt payload is left in place, not cleared (research.md **R18**).
- **G-5 Disabled is a no-op.** With `identityKey === null`, `load` returns
  `{ status: 'disabled', history: empty, adoptedLegacy: false }` and `save`/`clear` return
  `{ status: 'disabled' }` — no storage access at all.
- **G-6 Async.** All three operations are `Promise`-returning so a server-backed implementation can
  replace this one without any caller change (FR-042).
- **G-7 SSR-safe.** With `typeof window === 'undefined'`, all three behave as `unavailable` rather
  than throwing, so the module can be imported by a server-rendered path.

## 4. Operation semantics

### `load(identityKey)`

| Step | Condition | Result |
|---|---|---|
| 1 | `identityKey === null` | `{ status: 'disabled', … }` (G-5) |
| 2 | `window` undefined, or accessing `window.localStorage` throws | `{ status: 'unavailable', … }` |
| 3 | `getItem(key(identityKey))` returns `null`/empty | go to step 6 (legacy adoption) |
| 4 | `JSON.parse` throws, or `isStoredHistory` fails, or `payload.ownerId !== identityKey`, or `version` is not a finite number | `{ status: 'corrupt', history: empty }`; the stored payload is **left untouched** (G-4) |
| 5 | payload valid | filter `conversations` through `isStoredConversation` (dropping invalid ones silently, FR-035), apply post-load normalisation, resolve `activeConversationId` per research.md **R9** → `{ status: 'ok' }`, or `'empty'` when zero valid conversations remain |
| 6 | partition absent/empty **and** `LEGACY_KEY` holds a payload valid for this `identityKey` | write it to `key(identityKey)`, `removeItem(LEGACY_KEY)`, return `{ status: 'ok', adoptedLegacy: true }`. If that write fails, return the loaded history with `adoptedLegacy: false` and leave `LEGACY_KEY` in place |
| 7 | partition absent/empty and no adoptable legacy payload | `{ status: 'empty', history: empty }` |

Legacy adoption runs **only** here and **only** for a real identity (research.md **R1**). Removal of
`LEGACY_KEY` happens after its conversations are safely in the partition, so no conversation is ever
lost (G-4, FR-029).

### `save(identityKey, history)`

| Step | Condition | Result |
|---|---|---|
| 1 | `identityKey === null` | `{ status: 'disabled' }` (G-5) |
| 2 | `window` undefined or storage access throws | `{ status: 'unavailable' }` |
| 3 | normalise `history.ownerId = identityKey` and `version = DB_ASSISTANT_HISTORY_VERSION`, then `setItem(key, JSON.stringify(history))` succeeds | `{ status: 'ok' }` |
| 4 | `setItem` throws `QuotaExceededError` (`DOMException.name === 'QuotaExceededError'` or legacy code 22) | `{ status: 'quota' }`; stored payload unchanged (G-3) |
| 5 | `setItem` throws anything else | `{ status: 'unavailable' }` |

`save` is a whole-payload write. It is called once per persisting transition
([data-model.md](../data-model.md) → State transitions) and never per streamed fragment or keystroke
(FR-013, SC-008).

### `clear(identityKey)`

| Step | Condition | Result |
|---|---|---|
| 1 | `identityKey === null` | `{ status: 'disabled' }` |
| 2 | storage inaccessible | `{ status: 'unavailable' }` |
| 3 | `removeItem(key(identityKey))` succeeds | `{ status: 'ok' }` |
| 4 | `removeItem` throws | `{ status: 'unavailable' }`; payload unchanged |

`clear` touches **only** the calling identity's partition. It never removes `LEGACY_KEY` and never
touches another identity's key (FR-027, FR-030).

## 5. Browser-local implementation notes

- Falls back to a module-level `Map<string, StoredHistory>` for the remainder of the session once
  storage is known to be unusable, so the session keeps working in memory (FR-031, FR-033). The
  fallback is per-session and is not presented as persistence.
- Follows the repository's existing best-effort convention (`src/lib/queryHistoryClient.ts`,
  `src/lib/demoAuth.ts`): every storage access is wrapped, nothing propagates.
- Uses `unknown` + the type guards in `chatHistoryTypes.ts` for all parsed data. No `any`, no `as`
  casts on untrusted input (constitution Q2).

## 6. Verification

Contract tests live in `tests/unit/dbAssistantChatHistoryStorage.test.ts` (research.md **R21**).
`jsdom` supplies `localStorage`; blocked storage is simulated by making the `localStorage` getter
throw, and quota by stubbing `Storage.prototype.setItem` to throw a `QuotaExceededError`.

| Test | Guarantee proven |
|---|---|
| save → load round-trip preserves conversations, order, messages, sources, active id | FR-010, FR-012, SC-001 |
| load after `clear` returns `empty`; a deleted conversation never returns | FR-025, FR-027, SC-011 |
| identity A cannot read identity B's partition; keys differ | G-ID-2, FR-030, SC-017 |
| `identityKey === null` performs zero `getItem`/`setItem` calls (spied) | G-5, G-ID-3, FR-032 |
| non-JSON payload → `corrupt`, empty history, payload left in storage | G-2, G-4, FR-034, SC-010 |
| payload with 2 valid + 1 invalid conversation → `ok`, 2 returned, no error surfaced | FR-035 |
| `ownerId` mismatch → `corrupt`, not adopted | FR-030, FR-043 |
| storage getter throws → `unavailable` on all three operations, no throw | G-1, G-7, FR-033 |
| `setItem` throws quota → `quota`, prior payload byte-identical | G-3, FR-031 |
| bare `LEGACY_KEY` + real identity + empty partition → adopted, bare key removed, conversations intact | research.md **R1**, FR-029 |
| bare `LEGACY_KEY` + `identityKey === null` → untouched, not adopted | FR-043 |
| 200 conversations saved then reloaded → all 200 present, same order | SC-004, SC-018 |

