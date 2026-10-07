# Phase 1 Data Model: Database AI Assistant — Persistent Chat History

**Feature**: `014-db-assistant-chat-history` | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

This document defines the persisted shapes, their validation rules and the state transitions that
mutate them. It is the authority for `src/lib/ai/databaseAssistant/chatHistoryTypes.ts`. Field
names are deliberately few — the source request "explicitly warns against over-engineering this
shape" — and every field traces to a requirement.

Storage location and key derivation are specified in [contracts/chat-history-storage.md](./contracts/chat-history-storage.md)
and research.md **R1**/**R2**; they are not repeated here.

## Entity map

```text
History (one per identity partition)
 ├── version                    reconcile marker for a future server-backed store
 ├── ownerId                    the identityKey that owns this payload
 ├── activeConversationId ──────┐  (FR-011 restore; nullable, may dangle → fallback)
 └── conversations[]            │
      └── Conversation ─────────┘
           ├── id                stable, never an index (FR-002)
           ├── ownerId           denormalised copy, for cross-checking on load
           ├── title             derived or manual, never empty (FR-004, FR-005)
           ├── titleIsCustom     manual title wins forever (FR-005)
           ├── createdAt
           ├── lastUsedAt        ordering + recency group source (FR-015)
           ├── version
           └── messages[]
                └── Message
                     ├── id
                     ├── role     'user' | 'assistant'
                     ├── content
                     ├── createdAt
                     ├── sources[]   assistant only: grounding labels (FR-012)
                     ├── grounded    assistant only: was RAG grounding used
                     └── model       assistant only: provider/model that produced it

Derived, never persisted:
  RecencyGroup   today | yesterday | previousSevenDays | older   (from lastUsedAt, local time)
  SearchQuery    transient filter text + filtered subset         (component state only)
```

Relationships: one History owns zero-or-more Conversations; one Conversation owns zero-or-more
Messages in strict chronological order. There is no cross-conversation reference and no shared
message — a conversation is self-contained (Key Entities), which is what makes FR-017's "shows no
awareness of any other conversation" structural rather than a filtering rule.

## `StoredMessage`

One contribution inside one conversation. Key Entities: "An answer that never completed is not a
message" — so no `isStreaming`, `status` or `partial` field exists. A pending answer lives only in
the in-memory projection (`DatabaseAssistantChatTurn.isStreaming`) and is never written (research.md **R7**).

| Field | Type | Required | Requirement | Notes |
|---|---|---|---|---|
| `id` | `string` | yes | FR-002 | Generated once (**R5**); unique within the conversation |
| `role` | `'user' \| 'assistant'` | yes | FR-012, FR-021 | Restores question/answer roles exactly; also selects search scope |
| `content` | `string` | yes | FR-012 | The full markdown answer or the question text as sent (trimmed) |
| `createdAt` | `number` (epoch ms, finite) | yes | Key Entities | "when it was produced" |
| `sources` | `DatabaseKnowledgeSource[]` | assistant only | FR-012 | Reuses the **existing** exported type from `src/lib/ai/databaseAssistant.ts`: `{ sourceFile: string; section?: string; pageAnchor?: string }`. Restored verbatim; retrieval is never re-run |
| `grounded` | `boolean` | assistant only | FR-012, Key Entities | "whether grounding was used". Distinguishes *no sources found* from *grounding unavailable*, so a restored answer does not misrepresent itself |
| `model` | `string` | assistant only | Key Entities | "which model/provider produced it" — e.g. `ollama:qwen2.5-coder:3b`, `openai:gpt-4o`. Informational on restore; never used to re-route a request |

**Validation (`isStoredMessage`)**: object; `id` non-empty string; `role` exactly `'user'` or
`'assistant'`; `content` a string (empty is rejected for `assistant`, since a completed answer is
non-empty, and rejected for `user`, since the ask handler refuses an empty question); `createdAt` a
finite number. When `sources` is present it must be an array whose every entry has a string
`sourceFile` and, when present, string `section`/`pageAnchor`. A message failing any check is
**dropped**; the conversation around it survives if it is otherwise valid (FR-035).

## `StoredConversation`

One self-contained question-and-answer thread.

| Field | Type | Required | Requirement | Notes |
|---|---|---|---|---|
| `id` | `string` | yes | FR-002 | Stable across rename, reopen, append, reload and reorder. Never derived from list position |
| `ownerId` | `string` | yes | FR-030, FR-043 | The `identityKey` that owns it. Denormalised from the partition so a misplaced payload can be detected on load; conversations are never merged across identities |
| `title` | `string` | yes | FR-004, FR-005 | Never empty. Either derived from the first question (**R6**) or given by the user |
| `titleIsCustom` | `boolean` | yes | FR-005 | `true` once the user renames. A custom title takes precedence permanently and is never re-derived |
| `messages` | `StoredMessage[]` | yes | FR-012 | Chronological, oldest first. Order is part of the restored fidelity |
| `createdAt` | `number` (epoch ms, finite) | yes | Key Entities | Set once at creation, never updated |
| `lastUsedAt` | `number` (epoch ms, finite) | yes | FR-015, FR-016 | Updated on create, question sent, answer completed and selection. **Not** on rename (**R11**) |
| `version` | `number` | yes | Appendix constraint | Record-level reconcile marker for a future server-backed history. Set to `DB_ASSISTANT_HISTORY_VERSION` |

Deliberately **absent**: a `recencyGroup` field (derived at render time, **R11**), a `messageCount`
or `preview` field (both derivable, and a cached copy can drift), an `archived`/`pinned` flag
(FR-029 forbids the application archiving; the spec asks for no pinning), and any `updatedAt`
distinct from `lastUsedAt` (one field, one meaning).

**Validation (`isStoredConversation`)**: object; `id`, `ownerId`, `title` non-empty strings;
`titleIsCustom` a boolean; `messages` an array (possibly empty after invalid entries are dropped);
`createdAt` and `lastUsedAt` finite numbers; `version` a finite number. A conversation failing any
check is dropped from the loaded list without surfacing an error (FR-035).

**Post-load normalisation** (applied after validation, never persisted on its own):
- `lastUsedAt < createdAt` → clamp `lastUsedAt` to `createdAt` (a hand-edited or clock-skewed record
  must not sort before its own creation).
- Duplicate `id` within the partition → keep the first occurrence, drop later ones (a duplicate is a
  corruption artefact; keeping both would show the same conversation twice).
- `messages.length === 0` → the conversation is **not presented** in the list (FR-006). It is not
  deleted from the payload, because FR-029 forbids the application removing conversations.

## `StoredHistory`

The unit loaded when the assistant opens and written when a conversation changes (Key Entities).
One payload per identity partition.

| Field | Type | Required | Requirement | Notes |
|---|---|---|---|---|
| `version` | `number` | yes | Appendix constraint | Payload-level marker. `DB_ASSISTANT_HISTORY_VERSION = 1`. A payload whose `version` is not a finite number is treated as corrupt (**R18**); a *higher* known-major version is also treated as corrupt rather than guessed at |
| `ownerId` | `string` | yes | FR-030, FR-043 | Must equal the `identityKey` being loaded. A mismatch means the payload is in the wrong partition: treat as `corrupt` for that identity and leave it untouched — never adopt another identity's data |
| `conversations` | `StoredConversation[]` | yes | FR-029 | Unbounded. The application never truncates, expires or archives (FR-029); only user delete/clear-all shrinks it |
| `activeConversationId` | `string \| null` | yes | FR-011 | Which conversation was active last. May be `null` and may dangle; both fall back per **R9** |

**Validation (`isStoredHistory`)**: object; `version` finite number; `ownerId` non-empty string;
`conversations` an array whose entries are filtered through `isStoredConversation`;
`activeConversationId` a string or `null`/absent (absent normalises to `null`).

**Empty history is a valid state**, not an error: `{ version: 1, ownerId, conversations: [],
activeConversationId: null }`. FR-018's empty state and SC-010's "showing an empty history rather
than an error" both depend on this being representable.

## Derived entities (never persisted)

### `RecencyGroup`

```ts
type RecencyGroup = 'today' | 'yesterday' | 'previousSevenDays' | 'older';
function recencyGroupOf(lastUsedAt: number, now: number): RecencyGroup;
```

Computed from `lastUsedAt` against **local-timezone** midnight boundaries (**R11**). Exists only for
presentation (Key Entities: "Groups exist only for presentation and are not stored per
conversation"). Group headings are localised (FR-038). Empty groups are not rendered.

### `SearchQuery`

```ts
// Component state only — never written to storage, never part of StoredHistory.
const [query, setQuery] = useState('');
function conversationMatches(conversation: StoredConversation, term: string): boolean;
```

Scope is `title` plus every `role === 'user'` message's `content`; assistant `content` is never
examined (FR-021, SC-019). Matching is NFC-normalised, lower-cased substring (FR-022). Pure and
side-effect-free (FR-024). Clearing restores the full list in its normal order and groupings
(FR-023).

## State transitions

Each transition is a store action (research.md **R8**). "Writes" counts calls to the storage
contract — this table is the SC-008 proof.

| # | Transition | Trigger | Effect on `StoredHistory` | Writes | Requirement |
|---|---|---|---|---|---|
| T1 | **Bind identity** | mount; `storage`/`focus`/`visibilitychange`; route change | Load that identity's partition; set `dbIdentityKey`. If `null`, empty the in-memory collection and write nothing | 0 (read only) | FR-043, SC-017 |
| T2 | **New chat** | "New chat" control | `activeConversationId = null` in memory; draft cleared. **No conversation is created yet** and none is modified | 0 | FR-001, FR-006 |
| T3 | **Start conversation** | first question sent with no active conversation | Create a `StoredConversation` (new `id`, `ownerId = identityKey`, `title = deriveConversationTitle(question)`, `titleIsCustom = false`, `createdAt = lastUsedAt = now`, `version`), append the user `StoredMessage`, set `activeConversationId` | 1 | FR-001–FR-004, FR-007 |
| T4 | **Ask in conversation** | question sent with an active conversation | Append the user `StoredMessage`; `lastUsedAt = now` | 1 | FR-007, FR-015 |
| T5 | **Stream fragment** | each streamed delta | In-memory projection only (`content += delta`, `isStreaming = true`) | **0** | FR-008, SC-008 |
| T6 | **Complete answer** | stream finished, not aborted | Append the assistant `StoredMessage` with final `content`, `sources`, `grounded`, `model`; `lastUsedAt = now` | 1 | FR-008, FR-012, SC-008 |
| T7 | **Roll back attempt** | error, stop, abort, unmount mid-stream | Remove the pending question **and** assistant message, restoring the pre-attempt state; a conversation T3 created in this attempt is discarded in memory; the question returns to the input draft | **0** | FR-009, FR-006, SC-007 |
| T8 | **Select conversation** | list entry activated | `activeConversationId = id`; `lastUsedAt = now` | 1 | FR-011, FR-015, FR-017 |
| T9 | **Rename** | user confirms a non-empty title | `title = trimmed`, `titleIsCustom = true`. `id`, `lastUsedAt`, `createdAt` and `messages` unchanged | 1 | FR-005, FR-002 |
| T10 | **Rename refused** | submitted title empty or whitespace-only | No change; previous title kept; refusal message shown | **0** | FR-005 |
| T11 | **Delete conversation** | confirmed delete | Remove that one conversation. If it was active, select the next most recently used conversation, else `null` | 1 | FR-025, FR-026 |
| T12 | **Clear all** | confirmed clear-all | `conversations = []`, `activeConversationId = null` (via `clear`) | 1 | FR-027 |
| T13 | **Cancel / dismiss confirmation** | cancel, `Escape`, blur | Nothing changes | **0** | FR-028 |
| T14 | **Search** | each keystroke in the search field | Nothing changes; a filtered view is derived | **0** | FR-020, FR-024 |
| T15 | **Save failed** | contract returns `quota` or `unavailable` | In-memory state kept exactly as is; previously saved conversations untouched; one non-blocking notice per session | 0 (the write failed) | FR-031, FR-033, SC-009 |
| T16 | **Load corrupt** | contract returns `corrupt` | Present an empty history; leave the stored payload untouched; surface no error | 0 | FR-034, FR-035, SC-010 |

### Lifecycle diagram

```text
                 (no active conversation)
                        │
             T3 first question sent
                        ▼
                  ┌───────────┐   T4 ask / T6 complete            ┌───────────┐
   T2 new chat ──▶│  ACTIVE   │◀─────────────────────────────────▶│   SAVED   │
                  └───────────┘          T8 select                └───────────┘
                        │                                            │
                        │ T7 error / stop / abort                    │
                        ▼                                            │
         rolled back to the pre-attempt state                        │
         (discarded in memory if now empty)                          │
                                                                     │
                                          T11 delete / T12 clear-all │
                                                                     ▼
                                                               (removed)
```

A conversation is only ever *presented* when it holds at least one message (FR-006). An active
conversation with a pending answer is still presented, because its question message already exists
in the in-memory projection.

## Invariants

These hold after every transition and are the assertions the state tests make.

1. **I1** — No two conversations in a partition share an `id`, and no `id` is ever an array index (FR-002).
2. **I2** — Every conversation's `ownerId` equals the partition's `ownerId` equals `dbIdentityKey` (FR-030, FR-043).
3. **I3** — `title` is never empty or whitespace-only (FR-004, FR-005).
4. **I4** — Once `titleIsCustom` is `true` it never returns to `false`, and `title` is never re-derived (FR-005).
5. **I5** — `createdAt <= lastUsedAt` for every conversation (post-load clamp).
6. **I6** — Every stored assistant message has non-empty `content`; no stored message represents an incomplete answer (FR-008, FR-009, SC-007).
7. **I7** — `messages` order equals production order; restoration never reorders (FR-012).
8. **I8** — `activeConversationId` is `null` or refers to a conversation in the same payload; a dangling value is resolved on load (**R9**).
9. **I9** — The application never reduces `conversations.length` except through T11 and T12 (FR-029, SC-018).
10. **I10** — When `identityKey === null`, zero writes occur (FR-032, FR-043).
11. **I11** — Writes per completed answer ≤ 1, and zero between the first and last streamed fragment (FR-013, SC-008).
12. **I12** — Search, cancel and rename-refusal mutate nothing (FR-024, FR-028, FR-005).

## Traceability

| Key Entity (spec) | Model element |
|---|---|
| Conversation | `StoredConversation` |
| Message | `StoredMessage` |
| History | `StoredHistory` (includes "which conversation was active last" as `activeConversationId`) |
| Recency group | `RecencyGroup` + `recencyGroupOf()` — derived, never stored |
| Search query | Component state + `conversationMatches()` — transient, never stored |

Every field in every persisted entity cites the requirement or Key Entity sentence that justifies
it, and the fields deliberately left out are listed with their reasons, so the "do not
over-engineer this shape" constraint from the request is auditable.



