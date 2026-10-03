# TDD Test List: Database AI Assistant — Persistent Chat History

**Feature**: `014-db-assistant-chat-history` | **Spec**: [spec.md](../spec.md) | **Plan**: [plan.md](../plan.md)

**Test Stack**: Vitest 2.1.9 + jsdom + @testing-library/react 16 + @testing-library/jest-dom + sonner

**Coverage Target**: Every acceptance criterion traced to specific test case; unit/component/integration layers separated; boundary/negative/validation cases explicit.

---

## Test Execution Commands

```bash
# Run all tests for this feature
npm test -- tests/unit/dbAssistant*.test.ts tests/unit/dbAssistantHistory*.test.tsx

# Run specific layer
npm test -- tests/unit/dbAssistantChatHistory*.test.ts                    # Unit tests
npm test -- tests/unit/dbAssistantHistoryPanel.test.tsx                  # Component tests
npm test -- tests/unit/dbAssistantHistoryIntegration.test.ts            # Integration tests

# Run with watch
npx vitest -- tests/unit/dbAssistant*

# Single test
npx vitest run tests/unit/dbAssistantChatHistoryStorage.test.ts -t "load returns StorageCorruptError"
```

---

## UNIT TESTS: Storage Contract

**File**: `tests/unit/dbAssistantChatHistoryStorage.test.ts`

### Load Scenarios — FR-010, SC-001, FR-034, FR-035

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| U-ST-001 | FR-010, SC-001 | Unit | Load valid history with 1 conversation and 3 messages | History returned with all messages in order, version matches, ownerId present |
| U-ST-002 | FR-010, SC-001 | Unit | Load valid history with 0 conversations (empty) | Returns `StoredHistory` with `conversations: []`, `activeConversationId: null` |
| U-ST-003 | FR-010, SC-001 | Unit | Load 200 conversations round-trip | All 200 survive (no truncation, no corruption), identity scoped, lastUsedAt preserved |
| U-ST-004 | FR-034, FR-035 | Unit | Load corrupted JSON payload (missing version) | Returns `StorageCorruptError`, not thrown; error is an object with `.message` |
| U-ST-005 | FR-034, FR-035 | Unit | Load partially valid history (3 valid conversations, 1 with invalid message shape) | Valid 3 returned, invalid 1 dropped with no error surfaced to caller |
| U-ST-006 | FR-034, FR-035 | Unit | Load invalid conversation (missing ownerId) | Conversation dropped from loaded history |
| U-ST-007 | FR-034, FR-035 | Unit | Load invalid message (missing `content` field) | Message dropped from conversation, conversation kept if >0 messages remain |
| U-ST-008 | FR-034, FR-035 | Unit | Load with duplicate conversations (same id appears twice) | Duplicates removed (later overwrites earlier), single entry returned |
| U-ST-009 | FR-033 | Unit | Load when browser blocks storage (localStorage unavailable) | Returns `StorageUnavailableError`, not thrown |
| U-ST-010 | FR-029, FR-030 | Unit | Load for identity A, then load for identity B | Each identity gets only its own partition; A's partition untouched by B's load |

### Save Scenarios — FR-013, SC-008, FR-031

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| U-ST-011 | FR-013, SC-008 | Unit | Save new conversation with 1 message | Write to partitioned key exactly once, payload valid, `lastUsedAt` updated |
| U-ST-012 | FR-013, SC-008 | Unit | Save existing conversation with new message appended | Existing messages unchanged, new message added, write exactly once |
| U-ST-013 | FR-013, SC-008 | Unit | Save with `ownerId` mismatch (loaded partition for id A, saving for id B) | Returns `StorageCorruptError` (ownership violation), partition not overwritten |
| U-ST-014 | FR-031 | Unit | Save when quota exceeded | Returns `StorageQuotaExceededError`, not thrown; existing data untouched |
| U-ST-015 | FR-033 | Unit | Save when browser blocks storage | Returns `StorageUnavailableError`; session can continue in memory |
| U-ST-016 | FR-029 | Unit | Save with 500 conversations (over storage limit but within spec intent) | Attempts write; if quota exceeded, returns quota error without truncating history |

### Clear Scenarios — FR-027, FR-028

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| U-ST-017 | FR-027, FR-028 | Unit | Clear removes partition entirely | Partition key no longer in localStorage; load after clear returns empty history |
| U-ST-018 | FR-027 | Unit | Clear does not affect other identities' partitions | Identity A clears; identity B's partition untouched |
| U-ST-019 | FR-033 | Unit | Clear when storage unavailable | Returns `StorageUnavailableError`, does not throw |

### Legacy Key Adoption — FR-030, FR-043, SC-017

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| U-ST-020 | FR-030, FR-043 | Unit | Legacy key adoption: bare key exists, identity loads it | Bare key migrated to identity partition, bare key deleted, history available under new key |
| U-ST-021 | FR-030, FR-043 | Unit | Legacy adoption: bare key + identity partition both exist | Identity partition wins (already migrated), bare key left alone |
| U-ST-022 | FR-030, FR-043 | Unit | Legacy adoption: bare key exists but no identity resolved | Adoption skipped (no partition target), bare key left in place |
| U-ST-023 | FR-030 | Unit | Identity A loads (adopts legacy), identity B tries to load | Identity B gets its own empty partition; legacy not re-adopted |

### Type Validation — FR-002, SC-001

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| U-ST-024 | FR-002 | Unit | Load conversation with missing `id` field | Conversation dropped; isStoredConversation() type guard rejects it |
| U-ST-025 | SC-001 | Unit | Load message with `createdAt` = NaN or negative | Message dropped; isStoredMessage() type guard rejects it |
| U-ST-026 | FR-002 | Unit | Load conversation with activeConversationId pointing to non-existent conversation | activeConversationId clamped to null or first valid conversation |

---

## UNIT TESTS: Helpers

**File**: `tests/unit/dbAssistantChatHistoryHelpers.test.ts`

### Title Derivation — FR-003, FR-004, SC-001

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| U-TH-001 | FR-003, FR-004 | Unit | deriveTitleFromQuestion with normal question | Truncated to ~50 chars, no trailing punctuation, readable |
| U-TH-002 | FR-004 | Unit | Question longer than 50 chars, cut at word boundary | Cut between words, not mid-word; includes ellipsis if truncated |
| U-TH-003 | FR-004 | Unit | Question with only punctuation/emoji | Falls back to "Untitled" (or localized placeholder) |
| U-TH-004 | FR-004 | Unit | Question that is single word >50 chars | Truncated to word boundary with ellipsis; never empty |
| U-TH-005 | FR-004 | Unit | Empty question string | Returns "Untitled" |
| U-TH-006 | FR-004 | Unit | Whitespace-only question | Returns "Untitled" |
| U-TH-007 | FR-004 | Unit | Question with leading/trailing whitespace | Trimmed before derivation |
| U-TH-008 | FR-004 | Unit | Question with multiple consecutive spaces | Collapsed to single space |
| U-TH-009 | FR-003 | Unit | Same question input produces same title every time | Deterministic (no randomness, no timestamp) |

### Recency Grouping — FR-015, SC-004

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| U-TH-010 | FR-015 | Unit | Conversation used today | Groups under "today" heading |
| U-TH-011 | FR-015 | Unit | Conversation used yesterday | Groups under "yesterday" heading |
| U-TH-012 | FR-015 | Unit | Conversation used 5 days ago | Groups under "previous 7 days" heading |
| U-TH-013 | FR-015 | Unit | Conversation used 8 days ago | Groups under "older" heading |
| U-TH-014 | FR-015 | Unit | Multiple conversations in each group | Each group arrays sorted by lastUsedAt descending (newest first) |
| U-TH-015 | SC-004 | Unit | Group 200 conversations < 1s | Grouping completes in <1000ms |
| U-TH-016 | FR-015 | Unit | Midnight boundary: conversation at 23:59:59 yesterday, now 00:00:00 today | Conversation in "yesterday" group, not "today" |
| U-TH-017 | FR-015 | Unit | Timezone edge case (device with unusual timezone offset) | Groups based on device's own clock (no normalization) |
| U-TH-018 | FR-015 | Unit | All groups empty except "older" | Returns GroupedConversations with today/yesterday/previousSevenDays as [], older as full list |

### Search — FR-020, FR-021, FR-022, SC-003, SC-019

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| U-TH-019 | FR-021, SC-019 | Unit | Search matches conversation title | Returns only conversations with matching title |
| U-TH-020 | FR-021, SC-019 | Unit | Search matches text in user question (role='user') | Returns conversation; answer text ignored |
| U-TH-021 | FR-021, SC-019 | Unit | Search term appears only in assistant answer (role='assistant') | Conversation NOT returned (SC-019: 0% match rate) |
| U-TH-022 | FR-022 | Unit | Search case-insensitive | Query "WINDOW" matches title "window function" |
| U-TH-023 | FR-022 | Unit | Search partial word | Query "wind" matches "window" |
| U-TH-024 | FR-020 | Unit | Empty search string | Returns all conversations in original order |
| U-TH-025 | FR-020 | Unit | Search with no matches | Returns empty array |
| U-TH-026 | FR-022 | Unit | Same search term produces same results every time | Deterministic; caching or order doesn't change outcome |
| U-TH-027 | SC-003 | Unit | Search 50 conversations for 1 specific match < 10s | Completes in <10000ms |
| U-TH-028 | FR-020 | Unit | Filter 200 conversations < 1s | Completes in <1000ms |
| U-TH-029 | FR-020 | Unit | Search with special characters (regex metacharacters) | Treated as literals, no regex injection |

---

## UNIT TESTS: Identity Resolution

**File**: `tests/unit/dbAssistantChatHistoryIdentity.test.ts`

### Social Login — FR-030, FR-043, SC-017

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| U-ID-001 | FR-030, SC-017 | Unit | Social login (Google) resolves to `social-<hash>` | Key starts with `social-`, hash is stable and unique per email |
| U-ID-002 | FR-030, SC-017 | Unit | Social login email case-insensitive | `user@example.com` and `USER@EXAMPLE.COM` produce same key |
| U-ID-003 | FR-030 | Unit | Social login (Microsoft) resolves with provider in hash | `social-<hash(microsoft\|email)>` format |
| U-ID-004 | FR-030 | Unit | Same email, different providers produce different keys | Google user A and Microsoft user A have different partitions |
| U-ID-005 | SC-017 | Unit | Sign out, sign back in as same identity | `resolveHistoryIdentity()` returns same key both times |

### Demo Mode — FR-030, FR-043

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| U-ID-006 | FR-030 | Unit | Demo mode resolves to `'demo'` | Fixed string, same across all demo sessions |
| U-ID-007 | FR-030 | Unit | Two demo sessions on different machines | Same partition key (shared pool per repository) |

### Guest/Unsigned — FR-030, FR-041, SC-016

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| U-ID-008 | FR-030 | Unit | Signed-out visitor (no session, no guest marker) resolves to `null` | `resolveHistoryIdentity()` returns `null` |
| U-ID-008a | FR-030 | Unit | Guest session resolves to its own `'guest'` partition | `resolveHistoryIdentity()` returns `'guest'` |
| U-ID-008b | FR-030 | Unit | A signed-in identity takes precedence over the guest marker | Social/demo key returned, never `'guest'` |
| U-ID-008c | FR-030 | Unit | Guest partition must not collide with the shared demo pool | `resolveHistoryIdentity()` is `'guest'`, not `'demo'` |
| U-ID-008d | FR-043 | Unit | Guest marker removed without touching anything else | Cached key drops back to `null` |
| U-ID-009 | FR-041, SC-016 | Unit | `null` identity disables storage (no load/save calls) | Storage contract methods never called when `identityKey === null` |
| U-ID-010 | FR-041 | Unit | Guest cannot see assistant answer (feature 013 gate) | `LockedFeatureNotice` renders; history panel not present in that branch |
| U-ID-010a | FR-030 | Unit | Signed-out visitor sees the styled placeholder panel | Icon + title + sign-in hint render; no crash |

### Partition Isolation — FR-030, FR-043, SC-017

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| U-ID-011 | SC-017 | Unit | Identity A load and save; identity B load | Identity B's load returns empty (or its own previous partition), not A's data |
| U-ID-012 | SC-017 | Unit | Identity A's conversations never visible to identity B | Storage partitions enforced structurally |
| U-ID-013 | FR-030 | Unit | Partition mismatch on save (loaded A, saving B's data) | Returns `StorageCorruptError`, partition not overwritten |
| U-ID-014 | FR-030 | Unit | Guest identity persists no history | No storage write for guest; session works in memory only |

### Caching — FR-043

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| U-ID-015 | FR-043 | Unit | Identity cached after first resolve | Second call returns cached value (no re-resolve) while the storage markers are unchanged |
| U-ID-016 | FR-043 | Unit | `clearCachedHistoryIdentity()` invalidates cache | Next resolve reads fresh identity from session |
| U-ID-016a | FR-043 | Unit | Sign out then call again without clearing the cache manually | Cached key is dropped: the marker signature changed, so the new identity is returned |
| U-ID-016b | FR-043 | Unit | Social session expires between two calls | Expired session is pruned and the key no longer resolves to the social partition |
| U-ID-017 | FR-043 | Unit | Sign out (identity changes) clears cache | Store resets conversations before new identity loads |

---

## UNIT TESTS: Type Validation & Constants

**File**: `tests/unit/dbAssistantChatHistoryTypes.test.ts`

### Type Guards — SC-001, FR-002

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| U-TY-001 | SC-001 | Unit | isStoredMessage with valid message | Returns `true` |
| U-TY-002 | SC-001 | Unit | isStoredMessage with missing `id` | Returns `false` |
| U-TY-003 | SC-001 | Unit | isStoredMessage with invalid role | Returns `false` (only 'user' or 'assistant') |
| U-TY-004 | SC-001 | Unit | isStoredConversation with valid conversation | Returns `true` |
| U-TY-005 | SC-001 | Unit | isStoredConversation with empty messages array | Returns `true` |
| U-TY-006 | SC-001 | Unit | isStoredHistory with version mismatch | Returns `false` (version validation strict) |
| U-TY-007 | FR-002 | Unit | Conversation id is stable across mutations | Same id after renaming, after adding messages, after reload |

---

## COMPONENT TESTS: History Panel UI

**File**: `tests/unit/dbAssistantHistoryPanel.test.tsx`

### Panel Rendering — FR-014, FR-016, FR-041

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| C-HP-001 | FR-014, FR-016 | Component | Panel renders when identity present | Sidebar visible on desktop (≥1024px), drawer on mobile |
| C-HP-002 | FR-041 | Component | Panel empty when guest (identity=null) | Panel does not render, no hint of history feature |
| C-HP-003 | FR-014 | Component | Narrow screen (<1024px): drawer overlay | Panel hidden by default, toggle button visible, backdrop clickable |
| C-HP-004 | FR-014 | Component | Wide screen (≥1024px): sidebar | Panel always visible, no toggle, chat not squeezed |
| C-HP-005 | FR-016 | Component | Active conversation highlighted | Active conversation has distinct background or indicator |
| C-HP-006 | FR-016 | Component | Recency group headings present | "Today", "Yesterday", "Previous 7 days", "Older" visible when groups non-empty |

### Empty and No-Match States — FR-018, FR-023

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| C-HP-007 | FR-018 | Component | Panel renders with no conversations | Shows empty state message (not blank area) |
| C-HP-008 | FR-018 | Component | Empty state message is instructive | Tells user how to start (e.g., "No conversations yet. Start a new chat!") |
| C-HP-009 | FR-023 | Component | Search with no matches | Explicit "no conversations match" message (not blank) |
| C-HP-010 | FR-023 | Component | Clearing search restores full list | List returns in original order and groupings |

### Search Filtering — FR-020, FR-023, FR-024

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| C-HP-011 | FR-020 | Component | Typing in search filters list in real-time | No submit button; list narrows as characters typed |
| C-HP-012 | FR-024 | Component | Search does not change conversation contents | Search is view-only; no mutations |
| C-HP-013 | FR-023 | Component | Clear search button resets list | Click X or clear field to restore full list |
| C-HP-014 | FR-020 | Component | Search filters < 1s for 200 conversations | Panel updates < 1000ms after typing stops |

### Conversation Selection — FR-017, SC-002

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| C-HP-015 | FR-017, SC-002 | Component | Click conversation item selects it | Conversation becomes active, messages display, no delete/context loss |
| C-HP-016 | SC-002 | Component | From main empty state, reach saved conversation in 2 clicks | Click to open panel/drawer (1), click conversation (2) |
| C-HP-017 | FR-017 | Component | Selected conversation becomes context for next question | Follow-up uses that thread's history |

### New Chat Button — FR-001, FR-006

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| C-HP-018 | FR-001 | Component | "New chat" button creates conversation | New empty conversation appears in list, previous conversations unchanged |
| C-HP-019 | FR-006 | Component | Empty (unused) conversation does not clutter list | New chat never used does not appear; only conversation with messages show |
| C-HP-020 | FR-001 | Component | New chat becomes active | Empty message area ready for first question |

### Rename Functionality — FR-005, FR-028

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| C-HP-021 | FR-005 | Component | Hover conversation item reveals rename icon | Edit pencil icon visible on hover/focus |
| C-HP-022 | FR-005 | Component | Click rename opens inline text input | Input focused, current title selected, editable |
| C-HP-023 | FR-005 | Component | Press Enter submits rename | New title saved, input closes, list updates immediately |
| C-HP-024 | FR-005 | Component | Press Escape cancels rename | Input closes, previous title kept |
| C-HP-025 | FR-005 | Component | Empty/whitespace input refused | Input cleared or focused, not submitted; toast shows reason |
| C-HP-026 | FR-005, FR-028 | Component | Cancel rename leaves title unchanged | After cancelling, original title still displayed |
| C-HP-027 | FR-005 | Component | Manual title persists across reload | Renamed conversation keeps new title |

### Delete Functionality — FR-025, FR-026, FR-028

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| C-HP-028 | FR-025 | Component | Delete requires confirmation dialog | "Delete this conversation?" with Cancel/Delete buttons |
| C-HP-029 | FR-025, FR-028 | Component | Cancel delete leaves conversation | After cancel, no conversation removed |
| C-HP-030 | FR-025 | Component | Confirm delete removes only that conversation | Deleted item gone from list, others unchanged |
| C-HP-031 | FR-026 | Component | Delete active conversation fallback | View switches to another conversation or empty state, never shows deleted |
| C-HP-032 | FR-025 | Component | Deleted conversation does not reappear after reload | Permanent deletion verified by storage test |

### Clear All Functionality — FR-027, FR-028

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| C-HP-033 | FR-027 | Component | Clear all button visible when ≥1 conversation | Button in footer or menu |
| C-HP-034 | FR-027 | Component | Clear all requires confirmation | "Are you sure you want to delete all conversations?" with Cancel/Clear buttons |
| C-HP-035 | FR-027, FR-028 | Component | Cancel clear all leaves history | After cancel, all conversations still present |
| C-HP-036 | FR-027 | Component | Confirm clear all shows empty state | All conversations removed, empty message displayed |
| C-HP-037 | FR-027 | Component | Cleared history persists across reload | Verified by storage test |

### Keyboard Navigation & Accessibility — FR-040, SC-013

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| C-HP-038 | FR-040, SC-013 | Component | Search box keyboard accessible | Tab to search, type, Enter/Escape work |
| C-HP-039 | FR-040, SC-013 | Component | Conversation list keyboard selectable | Tab to item, Enter selects, Arrow keys navigate, F2 renames |
| C-HP-040 | FR-040, SC-013 | Component | Delete confirmation keyboard operable | Tab to buttons, Enter/Space activates |
| C-HP-041 | FR-040 | Component | All buttons have visible focus state | Focus indicator on rename/delete/clear buttons |
| C-HP-042 | FR-040 | Component | Rename/delete/clear actions reachable without pointer | Full workflow with keyboard only |

### Dark/Light Theme & Responsive — FR-039, SC-014

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| C-HP-043 | FR-039, SC-014 | Component | Panel renders in dark theme | Text/background contrast meets WCAG |
| C-HP-044 | FR-039, SC-014 | Component | Panel renders in light theme | Text/background contrast meets WCAG |
| C-HP-045 | SC-014 | Component | Mobile drawer dismissible | Backdrop click or close button dismissed panel, chat still visible |
| C-HP-046 | SC-014 | Component | Panel open/close doesn't break responsive layout | Chat readable in both states |

### Localization — FR-038, FR-039, SC-012

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| C-HP-047 | FR-038, SC-012 | Component | Switch interface language to Vietnamese | All history labels change (en.ts keys mapped to vi.ts) |
| C-HP-048 | FR-038, SC-012 | Component | Switch back to English | All labels change back, no strings stuck in one language |
| C-HP-049 | SC-012 | Component | Stored conversations keep their language | Conversation titles unchanged when interface language switched |
| C-HP-050 | FR-038 | Component | 100% of history strings localized | No hardcoded strings in English/Vietnamese only |

### Storage Error Handling — FR-031, FR-033

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| C-HP-051 | FR-031 | Component | Storage unavailable: yellow warning banner | Non-blocking notice at top of panel |
| C-HP-052 | FR-031 | Component | Storage full: toast notification | User notified once per session (not every action) |
| C-HP-053 | FR-033 | Component | Storage blocked: panel still renders | Disabled state shown, assistant still answers |
| C-HP-054 | FR-031 | Component | Storage errors non-blocking | User can continue using assistant, notice is toast not modal |

---

## INTEGRATION TESTS: Store + Storage Lifecycle

**File**: `tests/unit/dbAssistantHistoryIntegration.test.ts`

### Conversation Lifecycle — FR-001, FR-002, FR-007, SC-001

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| I-LC-001 | FR-001, FR-002 | Integration | Create 3 conversations, each has unique stable id | IDs never change, never conflict, never derived from position |
| I-LC-002 | FR-007, SC-001 | Integration | Send question to conversation A, verify saved | Question in store + persisted to storage, message count = 1 |
| I-LC-003 | SC-001 | Integration | Reload page, question still present | Load from storage, message restored, order preserved |
| I-LC-004 | FR-001 | Integration | Create conversation B without deleting A | Both present, A unchanged, B active |
| I-LC-005 | SC-001 | Integration | Message round-trip (send → persist → load → restore) | Message identical before/after: role, content, createdAt, sources, grounded |

### Streaming and Write Discipline — FR-008, SC-008

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| I-WD-001 | FR-008, SC-008 | Integration | Stream answer in 10 fragments | Store receives 10 calls to `addMessageToConversation()`, 0 storage writes until `completeAnswer()` |
| I-WD-002 | SC-008 | Integration | Answer complete triggers exactly 1 storage write | `completeAnswer()` writes once; no extra writes |
| I-WD-003 | SC-008 | Integration | Streaming between fragments produces 0 storage activity | Storage write table shows T5=0 for streaming rows |
| I-WD-004 | FR-008 | Integration | Multiple answers in one conversation | Write count = answer count (not fragment count) |
| I-WD-005 | SC-008 | Integration | Verify write discipline with 100-message conversation | Total writes = number of completed answers, not messages |

### Partial Answers and Error Handling — FR-009, SC-007, FR-037

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| I-EH-001 | FR-009, SC-007 | Integration | Stream answer, call stop mid-stream | In-flight fragment discarded, last complete message unchanged, question available to ask again |
| I-EH-002 | FR-009, SC-007 | Integration | Reload page after streaming stopped | No partial answer in history, conversation in state before that attempt |
| I-EH-003 | FR-009, SC-007 | Integration | Stream answer, network error mid-stream | Partial not saved, last complete state restored, question re-askable |
| I-EH-004 | FR-037 | Integration | Stop answer mid-stream leaves UI unchanged | Answer still visible on screen (cached in store), just not saved |
| I-EH-005 | SC-007 | Integration | After 10 stopped/failed answers and reload | History contains 0 partial answers, all 10 questions available to ask again |

### Active Conversation Switching — FR-011, FR-017

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| I-AC-001 | FR-011 | Integration | Open assistant with previous active conversation | Restores previous conversation without user action |
| AC-002 | FR-011 | Integration | No previous active (first time or cleared), open assistant | Empty conversation state, "New chat" suggestion visible |
| I-AC-003 | FR-017 | Integration | Switch to conversation B, ask question | Answer reflects only B's earlier exchange (no A context) |
| I-AC-004 | FR-017 | Integration | Switch conversation, then reload | Switched conversation is now the restored active |
| I-AC-005 | FR-011 | Integration | Delete active conversation during session | Fallback to another existing conversation, store active updated |

### Identity Lifecycle — FR-030, FR-043, SC-017

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| I-ID-001 | FR-043 | Integration | Sign in as identity A, create 2 conversations | Load A's partition, conversations persisted under A's key |
| I-ID-002 | FR-043, SC-017 | Integration | Sign out (identity → null) | Conversations hidden (not deleted), store clears activeConversationId |
| I-ID-003 | FR-043, SC-017 | Integration | Sign back in as same identity A | Same 2 conversations restored, state unchanged, A's partition not damaged by logout |
| I-ID-004 | SC-017 | Integration | Sign in as identity B (different email) | B sees 0 of A's conversations (separate partition) |
| I-ID-005 | FR-043 | Integration | Sign in as B, create 1 conversation; sign back to A | A's 2 unchanged, B's 1 unchanged, no merging or cross-contamination |
| I-ID-006 | FR-043 | Integration | Identity cache cleared on sign-out | Next sign-in resolves identity fresh (not stale) |

### Deletion Semantics — FR-025, FR-026, SC-011

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| I-DL-001 | FR-025, SC-011 | Integration | Delete conversation A, reload page | A does not reappear, persistent deletion verified |
| I-DL-002 | FR-026 | Integration | Delete currently active conversation | Store falls back to another conversation or empty state |
| I-DL-003 | FR-025 | Integration | Delete conversation, check storage partition | Deleted id no longer in partition; count decreased |
| I-DL-004 | SC-011 | Integration | Delete last conversation, reload | Empty history persists, no hidden recovery |
| I-DL-005 | FR-025 | Integration | Delete 50 of 100 conversations one by one | Only 50 remain, order of remaining unchanged |

### Clear All Semantics — FR-027, SC-011

| Test | Acceptance Criterion | Layer | Scenario | Assertions |
|---|---|---|---|---|
| I-CA-001 | FR-027, SC-011 | Integration | Clear all conversations, reload page | 0 conversations persist, empty state shown |
| I-CA-002 | FR-027 | Integration | Clear all, partition exists but is empty | Next question creates new conversation from empty slate |
| I-CA-003 | SC-011 | Integration | Clear all, verify no hidden recovery | Browser restart shows empty history, no "undo" mechanism |

---

## E2E TESTS: Full Specification Scenarios

**File**: `tests/unit/dbAssistantHistoryE2E.test.ts`

### Scenario 1: The answer I got yesterday is still there (User Story 1)

**Acceptance Criteria**: FR-010, SC-001, SC-006, FR-037

| Test | Test Setup | Action | Verification |
|---|---|---|---|
| E2E-US1-001 | Ask "How do I write a window function in PostgreSQL?" → get answer | Reload page | Same conversation, same messages in order, source labels intact |
| E2E-US1-002 | Same conversation | Close tab, reopen app | Conversation restored, same state |
| E2E-US1-003 | Same conversation | Ask follow-up "Can I use that in a subquery?" | Answer reflects the earlier exchange, not a generic reply |
| E2E-US1-004 | Streaming answer in progress | Reload mid-stream | No partial answer saved; conversation at last complete state |
| E2E-US1-005 | Stream stops with error | Reload | Error message gone, question re-askable, conversation unchanged |

### Scenario 2: One conversation per topic (User Story 2)

**Acceptance Criteria**: FR-001, FR-003, FR-015, FR-017, SC-002

| Test | Test Setup | Action | Verification |
|---|---|---|---|
| E2E-US2-001 | Create 3 conversations: indexing, transactions, migration | Look at sidebar | Each appears with auto-derived title from first question |
| E2E-US2-002 | Same 3 conversations | Reload | Titles still auto-derived (no user input), correct order (newest first) |
| E2E-US2-003 | Same 3 conversations | Click transactions conversation | Only its messages shown, no indexing or migration context |
| E2E-US2-004 | Ask follow-up in transactions | Reload | Answer still reflects only transactions exchange, not indexing |
| E2E-US2-005 | Create 4th but never ask anything | Reload | 3 real conversations in list, 4th (empty) does not clutter sidebar |
| E2E-US2-006 | Use oldest (indexing) | Reload | Indexing now top of list, recency order updated |

### Scenario 3: Finding an old answer again (User Story 3)

**Acceptance Criteria**: FR-020, FR-021, SC-003, SC-019

| Test | Test Setup | Action | Verification |
|---|---|---|---|
| E2E-US3-001 | 5+ conversations with varied topics | Type "window" in search | Conversation with "window" in title or question appears, others hidden |
| E2E-US3-002 | Same setup | Type "deadlock" (in answer only) | Conversation NOT returned (search excludes answers) |
| E2E-US3-003 | Same setup | Clear search | Full list restored with correct groupings |
| E2E-US3-004 | Same setup with 50 conversations | Find 1 specific in <10s | User completes task within SC-003 timeout |
| E2E-US3-005 | Search with no matches | Look at sidebar | Explicit "no conversations match" message (not blank) |

### Scenario 4: Keeping the history tidy (User Story 4)

**Acceptance Criteria**: FR-005, FR-025, FR-027, FR-028

| Test | Test Setup | Action | Verification |
|---|---|---|---|
| E2E-US4-001 | Conversation titled "auto-title" | Rename to "Deadlock retry strategy" | Title changes immediately, persists across reload |
| E2E-US4-002 | Same renamed conversation | Cancel rename mid-edit | Original title kept |
| E2E-US4-003 | Conversation with title | Try to rename to empty string | Rename refused, original kept |
| E2E-US4-004 | 3 conversations | Delete 1 with confirmation | Only that 1 deleted, others untouched, reload confirms |
| E2E-US4-005 | Delete the currently open conversation | Verify fallback | View switches to another or empty state, never shows deleted |
| E2E-US4-006 | 10 conversations | Clear all with confirmation | All gone, empty state shown and persists |
| E2E-US4-007 | Clear all confirmation dialog | Click Cancel | All conversations kept, nothing removed |

### Scenario 5: The assistant still works when history cannot be saved (User Story 5)

**Acceptance Criteria**: FR-031, FR-033, FR-034

| Test | Test Setup | Action | Verification |
|---|---|---|---|
| E2E-US5-001 | Block localStorage via browser dev tools | Ask question | Answer produced, single non-blocking notice shown, no error page |
| E2E-US5-002 | Corrupted stored history (edited JSON) | Open assistant | Empty history loaded, no crash, can ask questions |
| E2E-US5-003 | Storage full (mock quota exceeded) | Ask question in session | Answer works in-memory, one-time toast shown, no session crash |
| E2E-US5-004 | Storage unavailable | Ask 3 questions | All answered, yellow warning in panel, no blocking |
| E2E-US5-005 | Any storage failure | Use assistant | No behavioral difference from normal case except the notice |

### Edge Case Scenarios

| Test | Scenario | Verification |
|---|---|---|
| E2E-EC-001 | Very long conversation (100 messages) | Opens within 2s, scrolls to latest, stays responsive |
| E2E-EC-002 | Very large history (200 conversations) | List renders, filtering <1s, no truncation of old conversations |
| E2E-EC-003 | Titles that are edge cases (one word, emoji, punctuation, whitespace, URL, code snippet) | Each derives safely: truncated, never empty, readable |
| E2E-EC-004 | Two conversations with identical titles | Both remain separately selectable/renamable/deletable |
| E2E-EC-005 | Midnight boundary (conversation last used at 23:59, reload after midnight) | Conversation moves from "today" to "yesterday" group correctly |
| E2E-EC-006 | Device clock changes mid-session (TZ change or manual clock adjustment) | Recency grouping follows device clock, order stable |
| E2E-EC-007 | Switch interface language mid-session | Conversation titles unchanged; all UI labels change to new language |
| E2E-EC-008 | Multiple tabs with same conversation open | Save from tab A; tab B shows update, no merge artifacts |
| E2E-EC-009 | Guest session (no auth) | History panel does not render or is empty; assistant refusal gate unchanged |
| E2E-EC-010 | Mobile narrow viewport (< 1024px) | Drawer opens/closes smoothly, chat never squashed, fully readable in both states |

---

## Test Task Integration with tasks.md

The following test tasks are **mandatory** and must complete before feature shipped:

### Existing Tasks

✅ T1.1-T1.4: Infrastructure (storage, types, identity) — **COMPLETE**
✅ T2.1-T2.2: Helpers and store — **COMPLETE**
✅ T3.1-T3.5: UI panel and localization — **COMPLETE**

### New Test Tasks (MANDATORY before feature ships)

| Task ID | Test File | Spec Coverage | Requirement | Mandatory |
|---|---|---|---|---|
| **T4.1** | `dbAssistantChatHistoryStorage.test.ts` | U-ST-001 through U-ST-026 | All storage contract paths: save/load/clear, corrupted, missing, quota, legacy | **YES** |
| **T4.2** | `dbAssistantChatHistoryHelpers.test.ts` | U-TH-001 through U-TH-029 | Title derivation, recency grouping, search scope | **YES** |
| **T4.3** | `dbAssistantChatHistoryState.test.ts` | I-LC-001 through I-ID-006 | Lifecycle, write discipline, identity partition | **YES** |
| **T4.4** | `dbAssistantChatHistoryIdentity.test.ts` | U-ID-001 through U-ID-017 | Identity resolution, partition isolation | **YES** |
| **T4.5** | `dbAssistantHistoryPanel.test.tsx` | C-HP-001 through C-HP-050 | UI rendering, keyboard/a11y, i18n, responsive | **YES** |
| **T4.6** | `dbAssistantChatHistoryTypes.test.ts` | U-TY-001 through U-TY-007 | Type guard validation | **YES** |
| **T4.7** | `dbAssistantHistoryIntegration.test.ts` | E2E-US1 through E2E-US5 + E2E-EC | Full spec scenarios + edge cases | **YES** |
| **T4.8** | Manual validation checklist | Acceptance sign-off | 4 user stories + 10 edge cases verified by tester | **YES** |

**Test execution** (all must pass):

```bash
# Full test suite for feature 014
npm test -- tests/unit/dbAssistant*.test.ts tests/unit/dbAssistantHistory*.test.tsx

# Verify regression on existing assistant tests
npm run test

# Type-check passes
npm run type-check
```

---

## Acceptance Criteria Coverage Matrix

### By User Story

| Story | Title | Acceptance Scenarios | Test Layer | Status |
|---|---|---|---|
| 1 | Answer I got yesterday is still there | 7 scenarios → 5 E2E tests + 10 unit/integration | E2E, Integration | Mapped to E2E-US1-001 to E2E-US1-005 |
| 2 | One conversation per topic | 7 scenarios → 6 E2E tests + 15 unit/integration | E2E, Integration, Component | Mapped to E2E-US2-001 to E2E-US2-006 |
| 3 | Finding an old answer again | 6 scenarios → 5 E2E tests + 10 unit | E2E, Unit, Component | Mapped to E2E-US3-001 to E2E-US3-005 |
| 4 | Keeping the history tidy | 8 scenarios → 7 E2E tests + 20 unit/component | E2E, Component | Mapped to E2E-US4-001 to E2E-US4-007 |
| 5 | Assistant works when history can't save | 5 scenarios → 5 E2E tests + 10 unit/integration | E2E, Integration | Mapped to E2E-US5-001 to E2E-US5-005 |

### By Functional Requirement

**Coverage summary**: Every FR mapped to at least one test case; no uncovered requirements.

- **FR-001 to FR-006** (Creating and identifying): T1.1, C-HP-018, C-HP-019, E2E-US2-001, U-TH-001-009
- **FR-007 to FR-013** (Saving and restoring): I-LC-001-005, I-WD-001-005, U-ST-001-010
- **FR-014 to FR-024** (Browsing and searching): C-HP-001-050, E2E-US3-001-005, U-TH-019-029
- **FR-025 to FR-028** (Deleting): C-HP-028-037, I-DL-001-005, I-CA-001-003
- **FR-029 to FR-036** (Robustness): U-ST-009-010, I-EH-001-005, E2E-US5-001-005, FR-033-035
- **FR-037** (Preserving existing): Manual regression test suite (T4.7)
- **FR-038 to FR-041** (Localization, accessibility, guest): C-HP-047-050, C-HP-038-042, C-HP-053-054
- **FR-042 to FR-043** (Replaceability, identity): U-ST-011-026, U-ID-001-017, I-ID-001-006

### By Success Criterion

**Coverage summary**: Every SC mapped to at least one test case; measurement criteria explicit.

- **SC-001** (100% of Q&A pairs persist): T1.1 + I-LC-001-005 + E2E-US1-001 (count before/after)
- **SC-002** (Reach any conversation ≤2 clicks): C-HP-015-017 + E2E-US2-006
- **SC-003** (Locate 1 of 50 < 10s): E2E-US3-004 + U-TH-027 (timing)
- **SC-004** (Filter 200 < 1s): U-TH-015, U-TH-028 (timing)
- **SC-005** (100-message conversation < 2s): E2E-EC-001 (timing)
- **SC-006** (Follow-up in reopened conversation): E2E-US1-003 (semantic verification)
- **SC-007** (Zero partial answers after reload): I-EH-002, E2E-US1-004-005 (count = 0)
- **SC-008** (≤1 write per answer, 0 during streaming): I-WD-001-005 (observed writes)
- **SC-009** (100% questions answered with storage blocked): E2E-US5-001 (all succeed)
- **SC-010** (100% with corrupted history): E2E-US5-002 (no crash)
- **SC-011** (Deleted/cleared never reappear): SC-011 + I-DL-001, I-CA-001 (persistence)
- **SC-012** (100% strings change on language switch): C-HP-047-048 (visual verification)
- **SC-013** (100% controls keyboard operable): C-HP-038-042 (keyboard-only workflow)
- **SC-014** (Narrow screen fully readable): C-HP-045-046 (responsive verification)
- **SC-015** (Zero regressions in assistant): T4.7 + existing assistant test suite (pass all)
- **SC-016** (Guest refused answer 100% of time): C-HP-002, I-ID-010, E2E-EC-009 (refusal gate unchanged)
- **SC-017** (2nd identity sees 0 of 1st): U-ID-011-013 + I-ID-004-005 (partition isolation)
- **SC-018** (200 conversations untouched): U-ST-003 + E2E-EC-002 (count preserved)
- **SC-019** (Search scope exact): U-TH-021 + E2E-US3-002 (0% false positives in answers)

---

## Known Limitations & Documented Edge Cases

Each limitation is documented in `research.md` with justification:

| Limitation | Recorded In | Test Handling |
|---|---|---|
| FNV-1a hash is not cryptographic (identity opaqueness, not security) | research.md R2 | U-ID-001-005 (test observes opaqueness, not encrypt/decrypt) |
| Legacy key adoption is one-time per identity (no retry if failed) | research.md R1 | U-ST-020-023 (test covers happy path and non-adoption cases) |
| Recency grouping uses device's own clock (no UTC normalization) | research.md R11 | U-TH-017, E2E-EC-006 (test with device TZ and manual clock change) |
| Title truncation only splits at word boundary (~50 char limit) | research.md R6 | U-TH-002, E2E-EC-003 (test one-word >50 char case) |
| Two tabs with same browser profile may see concurrent writes (last write wins) | Assumption | E2E-EC-008 (document expected behavior, no merging) |
| Stored conversations never updated for new interface language | Assumption | E2E-EC-007 (titles stay original language, UI labels change) |
| No automatic removal or truncation of very old history | FR-029 | E2E-EC-002 (test 200 conversations untouched; no auto-deletion) |

---

## Test Execution Summary

**Test Commands**:

```bash
# All feature 014 tests
npm test -- tests/unit/dbAssistant*.test.ts tests/unit/dbAssistantHistory*.test.tsx

# Specific layer
npm test -- tests/unit/dbAssistantChatHistory*.test.ts                # Unit
npm test -- tests/unit/dbAssistantHistoryPanel.test.tsx              # Component
npm test -- tests/unit/dbAssistantHistoryIntegration.test.ts        # Integration
npm test -- tests/unit/dbAssistantHistoryE2E.test.ts                 # E2E

# Single test
npx vitest run tests/unit/dbAssistantChatHistoryStorage.test.ts -t "load returns StorageCorruptError"

# Watch mode
npx vitest -- tests/unit/dbAssistantHistory*.test.*

# Coverage (if configured)
npm run test -- --coverage tests/unit/dbAssistantHistory*.test.*
```

**Success Criteria**:
- ✅ All 127+ test cases pass
- ✅ Every FR mapped to ≥1 test
- ✅ Every SC measured and verified
- ✅ All 5 user stories covered end-to-end
- ✅ All 10 edge cases covered
- ✅ Type-check passes (npm run type-check)
- ✅ Existing assistant tests pass (no regression)
- ✅ Manual tester sign-off on 4 spec scenarios (T4.8)

