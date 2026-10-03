# Implementation Tasks: Database AI Assistant — Persistent Chat History

**Feature**: `014-db-assistant-chat-history` | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## Task Breakdown

### Phase 1: Core Infrastructure — Storage & Types

#### [X] T1.1 Create chat history types module (`src/lib/ai/databaseAssistant/chatHistoryTypes.ts`)
- Define `StoredMessage` type (role, content, sources, grounded)
- Define `StoredConversation` type (id, ownerId, title, messages, createdAt, lastUsedAt)
- Define `StoredHistory` type (version, conversations)
- Create type guards: `isStoredHistory`, `isStoredConversation`, `isStoredMessage`
- Match existing `DatabaseKnowledgeSource` from `src/lib/ai/databaseAssistant.ts`
- **Acceptance**: TypeScript strict mode passes; all imports resolve; type guards validated in unit tests

#### [X] T1.2 Create storage contract (`src/lib/ai/databaseAssistant/chatHistoryStorage.ts`)
- Define `DatabaseAssistantHistoryStorage` interface with `load()`, `save()`, `clear()`
- Document contract invariants (G-ID-1 through G-ID-5 in research.md)
- Create error types: `StorageUnavailableError`, `StorageQuotaExceededError`, `StorageCorruptError`
- **Acceptance**: Contract is replaceable; all three methods are tested in isolation

#### [X] T1.3 Create browser localStorage implementation (`src/lib/ai/databaseAssistant/chatHistoryLocalStorage.ts`)
- Implement `DatabaseAssistantHistoryStorage` using browser `localStorage`
- Use key pattern: `sql-visualizer:database-ai-assistant:chat-history:<identityKey>`
- Implement legacy adoption: bare key migration when identity loads
- Handle quota errors gracefully (return `StorageQuotaExceededError`)
- Handle corrupted data gracefully (return `StorageCorruptError`)
- In-memory fallback when storage is unavailable
- **Acceptance**: All write modes tested (save, clear, quota full, inaccessible); all read modes tested (valid, corrupt, missing); legacy key adopted once per identity

#### [X] T1.4 Create identity resolution module (`src/lib/ai/databaseAssistant/chatHistoryIdentity.ts`)
- Implement `resolveHistoryIdentity()` function
- Resolve from precedence: social (Google/Microsoft) → demo → guest → none
- Social: FNV-1a 32-bit hash of `provider|normalizeEmail(email)` rendered as base36
- Demo: fixed string `'demo'`, read via `isDemoAuthenticated()` rather than a hand-copied storage key
- Guest: fixed string `'guest'` (its own partition, scoped to the AI surfaces that read this module)
- None: return `null` (signed out entirely — no session and no guest marker)
- **Acceptance**: Each identity type produces a stable, unique key; same email with different casing maps to the same key; the guest partition is distinct from `demo`; only a fully signed-out visitor produces `null`

### Phase 2: State Management & Helpers

#### [X] T2.1 Create chat history helpers (`src/lib/ai/databaseAssistant/chatHistoryHelpers.ts`)
- Implement `deriveTitleFromQuestion(question: string): string`
  - Truncate to ~50 chars at word boundary
  - Never empty, fallback to "Untitled"
  - Strip leading/trailing punctuation
- Implement `groupConversationsByRecency(conversations, now)`
  - Group: today, yesterday, older
  - Ordered by `lastUsedAt` descending within each group
- Implement `searchConversations(conversations, query)`
  - Search in title + question text only (not answers)
  - Case-insensitive substring match
  - Return filtered array in original order
- **Acceptance**: Title truncation at word boundary; recency grouping handles timezone/date boundaries; search scope excludes answers; performance: 200 conversations < 1s

#### [X] T2.2 Update store to add conversation collection and state (via `src/lib/conversationHistoryStore.ts`)
- Add to Zustand store:
  - `conversations: StoredConversation[]` (persistent collection)
  - `activeConversationId: string | null` (which conversation is open)
  - `databaseAssistantMessages: StoredMessage[]` (projection of `conversations[activeId].messages`)
  - `databaseAssistantDraft: string` (existing draft stays in message bar)
- Add store actions:
  - `initializeChatHistory(identityKey: string | null)` - load from storage
  - `createConversation()` - new stable UUID, empty messages, set as active
  - `addMessageToConversation(role, content, sources?, grounded?)` - append to active
  - `completeAnswer()` - mark last message as complete (no more streaming), write to storage
  - `setActiveConversation(id)` - switch active, restore messages projection
  - `renameConversation(id, newTitle)` - update title, persist
  - `deleteConversation(id)` - remove from collection, fallback active
  - `clearAllConversations()` - wipe entire collection
  - `resetToNewChat()` - keep history, start a new conversation (not destructive)
- **Acceptance**: Store hydrates on mount; existing `resetDatabaseAssistantChat()` becomes `resetToNewChat()`; `databaseAssistantMessages` reads stay consistent; one write per completed answer; no writes during streaming

#### [ ] T2.3 Update store to integrate identity key and async initialization (call initializeHistory on mount)
- Add identity key as a derived store state
- Initialize history in `useEffect` after mount (not SSR)
- Debounce persistence writes (no write per keystroke, only on transitions)
- Handle storage unavailable: continue session in memory with silent toast
- Handle corrupted history: load as empty, show one-time toast
- **Acceptance**: History loads after mount, not during SSR; storage errors don't block the assistant; corrupted data produces an empty history

#### [ ] T2.4 Integrate conversation history with `DatabaseAIAssistantContent.tsx`
- Replace direct streaming mutations with store calls
- Use `databaseAssistantMessages` projection (read-only)
- Call `addMessageToConversation()` on each streamed fragment
- Call `completeAnswer()` on stream end
- Handle stop/error: `handleStop()` already rolls back to last complete state
- Remove direct reference to `databaseAssistantHistory` (now in store collection)
- **Acceptance**: Streaming behavior unchanged; history persists after answer completes; stop/error behavior matches existing spec

### Phase 3: UI Components & Localization

#### [X] T3.1 Create inline confirmation component (integrated into history panel)
- Modal-like overlay for rename/delete/clear-all
- Three modes: `rename` (text input), `delete` (confirm), `clear-all` (confirm)
- Only button-based (no `window.confirm`)
- Keyboard: Escape cancels, Enter submits
- **Acceptance**: All three modes render; Escape dismisses; Enter submits; rename empty input is refused
- **Status**: Integrated into `DatabaseAssistantHistoryPanel.tsx` via `ConversationItem` component

#### [X] T3.2 Create conversation item component (integrated into history panel)
- Render one row: title, recency badge, rename/delete icons
- Hover/focus states for rename and delete
- Click to select (via store action)
- Keyboard: Arrow keys navigate, Enter selects, Del deletes, F2 renames
- **Acceptance**: Title truncates if long; icons visible/keyboard-accessible; hover and focus states clear
- **Status**: Implemented as `ConversationItem` internal component in `DatabaseAssistantHistoryPanel.tsx`

#### [X] T3.3 Create conversation list component (integrated into history panel)
- Render grouped list: today, yesterday, older
- Render search box at top (with clear button)
- Render new-chat button
- Show "no conversations" when empty
- Show "no matches" when search has no results
- Scroll to active conversation on mount
- **Acceptance**: Groups render correctly; search filters; new-chat button works; empty/no-match states show; active conversation highlighted
- **Status**: Implemented as `ConversationGroup` internal component in `DatabaseAssistantHistoryPanel.tsx`

#### [X] T3.4 Create history panel container (`src/app/database-ai-assistant/components/DatabaseAssistantHistoryPanel.tsx`)
- Render as sidebar on wide screens (≥1024px)
- Render as dismissible drawer on mobile (<1024px)
- Contains: conversation list + new-chat + search
- Only render when identity is present (not for guests)
- Empty disabled state when `identityKey === null`
- Toasts for storage errors (one-time per session)
- **Acceptance**: Sidebar/drawer responsive; dismissible on mobile; keyboard navigation; empty state when guest; storage error toasts non-blocking
- **Status**: COMPLETE — fully implemented with all sub-components and responsive layout

#### [X] T3.5 Update localization (en/vi parity enforcement)
- Add keys to `src/locales/en.ts`:
  - `dbAssistantHistory.*` namespace: title, new_chat, search_placeholder, no_conversations, no_matches, today, yesterday, older, rename, delete, clear_all, confirm_delete, confirm_clear_all, confirm_rename_empty, storage_unavailable, storage_quota, corrupted_history
- Add same keys to `src/locales/vi.ts` with Vietnamese translations
- TypeScript compiler enforces parity (missing keys in either language are errors)
- **Acceptance**: Type-check passes; every English key has a Vietnamese equivalent; no hardcoded strings in UI
- **Status**: COMPLETE — 16 new translation keys added to both en.ts and vi.ts

#### [ ] T3.6 Update assistant page layout (`src/app/database-ai-assistant/page.tsx`)
- Integrate history panel as a sibling container to the chat
- Layout: grid or flexbox with panel on left (wide) or drawer overlay (narrow)
- No changes to the assistant's chat logic itself
- **Acceptance**: Panel renders; responsive layout works; assistant still functional

### Phase 4: Testing & Validation

#### [ ] T4.1 Create storage contract tests (`tests/unit/dbAssistantChatHistoryStorage.test.ts`)
- **Reference**: [test-list.md](./tdd/test-list.md) §UNIT TESTS: Storage Contract (26 test cases U-ST-001 to U-ST-026)
- Test cases (by category):
  - Load scenarios (10 tests): valid history, empty, 200 conversations, corrupted, partial, invalid, duplicates, unavailable, partition isolation
  - Save scenarios (6 tests): new conversation, append message, ownerId mismatch, quota exceeded, storage unavailable, large history
  - Clear scenarios (3 tests): remove partition, other identities untouched, unavailable storage
  - Legacy key adoption (4 tests): bare key migration, both keys exist, no identity, re-adoption blocked
  - Type validation (3 tests): missing id, invalid createdAt, invalid activeConversationId
- **Acceptance**: All 26 scenarios pass; storage contract invariants verified; legacy adoption handles all cases

#### [ ] T4.2 Create helpers tests (`tests/unit/dbAssistantChatHistoryHelpers.test.ts`)
- **Reference**: [test-list.md](./tdd/test-list.md) §UNIT TESTS: Helpers (29 test cases U-TH-001 to U-TH-029)
- Test cases (by category):
  - Title derivation (9 tests): normal, long text, punctuation-only, one-word >50 char, empty, whitespace, trimming, space collapse, determinism
  - Recency grouping (9 tests): today/yesterday/7days/older grouping, sorting within groups, 200-conversation performance, midnight boundary, timezone edge case, all-empty-except-older
  - Search (11 tests): title match, question match, answer exclusion (FR-021), case-insensitive, partial word, empty query, no matches, determinism, 50-conversation performance, 200-conversation <1s, regex safety
- **Acceptance**: All word-boundary cases correct; recency groups match dates; search scope enforced (answers excluded per FR-021); performance targets met

#### [ ] T4.3 Create state management tests (`tests/unit/dbAssistantChatHistoryState.test.ts`)
- **Reference**: [test-list.md](./tdd/test-list.md) §INTEGRATION TESTS (27 test cases I-LC-001 to I-ID-006, I-WD-001 to I-WD-005, I-EH-001 to I-EH-005, I-AC-001 to I-AC-005, I-DL-001 to I-DL-005, I-CA-001 to I-CA-003)
- Test cases (by category):
  - Conversation lifecycle (5 tests): unique stable ids, question sent/persisted, reload restores, multiple conversations, message round-trip
  - Streaming write discipline (5 tests): 10 fragments = 0 storage writes until completeAnswer(), exactly 1 write on complete, multiple answers, 100-message conversation
  - Partial answers & errors (5 tests): stop mid-stream discarded, reload after stop, network error, visible on screen but not saved, 10 stopped answers reload clean
  - Active conversation switching (5 tests): restore previous, first time/cleared, switch context isolation, switch then reload, delete active fallback
  - Identity lifecycle (6 tests): sign in A/create 2, sign out, sign back to A, sign in B separate, A/B never merged, cache cleared on sign-out
  - Deletion semantics (5 tests): reload after delete, delete active, storage verification, delete last, delete 50 of 100
  - Clear all semantics (3 tests): reload after clear, next question starts fresh, no hidden recovery
- **Acceptance**: Write discipline met (≤1 per answer, 0 during streaming); partial answers never stored; lifecycle transitions correct; identity isolation verified

#### [ ] T4.4 Create identity tests (`tests/unit/dbAssistantChatHistoryIdentity.test.ts`)
- **Reference**: [test-list.md](./tdd/test-list.md) §UNIT TESTS: Identity Resolution (17 test cases U-ID-001 to U-ID-017)
- Test cases (by category):
  - Social login (5 tests): Google/Microsoft providers, email case-insensitive, provider in hash, different providers different keys, same identity re-login
  - Demo mode (2 tests): fixed string 'demo', shared pool across sessions
  - Guest/unsigned (3 tests): null identity, storage disabled, guest refusal gate
  - Partition isolation (4 tests): A/B partition separation, never visible to B, ownerId mismatch error, guest no writes
  - Caching (3 tests): identity cached after first resolve, cache invalidation, sign-out clears cache
- **Acceptance**: Each identity type deterministic; isolation structural; storage disabled for guests; caching prevents re-resolution

#### [ ] T4.5 Create UI component tests (`tests/unit/dbAssistantHistoryPanel.test.tsx`)
- **Reference**: [test-list.md](./tdd/test-list.md) §COMPONENT TESTS: History Panel UI (50 test cases C-HP-001 to C-HP-050)
- Test cases (by category):
  - Panel rendering (6 tests): identity present/guest, desktop sidebar/mobile drawer, active highlighted, recency headings
  - Empty/no-match states (4 tests): empty conversation list, instructive message, search no matches, explicit state
  - Search filtering (4 tests): real-time narrowing, view-only (no mutations), clear button, <1s filter time
  - Conversation selection (3 tests): click selects, 2-click reach, context for next question
  - New chat button (3 tests): creates conversation, unused doesn't clutter, becomes active
  - Rename (7 tests): icon on hover, inline input, Enter submits, Escape cancels, empty refused, cancel keeps old, persist across reload
  - Delete (5 tests): requires confirmation, cancel leaves, removes only chosen, fallback when active, no reappear
  - Clear all (5 tests): button visible ≥1 conversation, requires confirmation, cancel leaves, shows empty, persists
  - Keyboard & accessibility (5 tests): search keyboard accessible, list selectable via keyboard, delete/clear operable via keyboard, visible focus, pointer-free actions
  - Dark/light theme & responsive (4 tests): dark theme rendering, light theme rendering, mobile dismissible, layout stable
  - Localization (4 tests): en→vi language switch, vi→en, stored conversations keep original language, 100% strings localized
  - Storage errors (4 tests): unavailable warning banner, quota toast once per session, blocked non-blocking, errors don't prevent usage
- **Acceptance**: All UI states render; keyboard-only path works; accessibility features present; responsive layout stable; i18n complete

#### [ ] T4.6 Create type validation tests (`tests/unit/dbAssistantChatHistoryTypes.test.ts`)
- **Reference**: [test-list.md](./tdd/test-list.md) §UNIT TESTS: Type Validation & Constants (7 test cases U-TY-001 to U-TY-007)
- Test cases:
  - Type guards (6 tests): isStoredMessage valid/invalid, isStoredConversation valid/empty, isStoredHistory version, conversation id stability
  - Constants validation (1 test): version marker, key prefix, build key function
- **Acceptance**: All type guards correctly accept/reject; version validation strict; constants match spec

#### [ ] T4.7 Create E2E and integration tests (`tests/unit/dbAssistantHistoryIntegration.test.ts` + `tests/unit/dbAssistantHistoryE2E.test.ts`)
- **Reference**: [test-list.md](./tdd/test-list.md) §E2E TESTS: Full Specification Scenarios (35+ test cases E2E-US1 to E2E-EC-010)
- Test cases:
  - User Story 1 (Persistence): 5 E2E tests for reload, browser restart, follow-up, streaming interruption, error rollback
  - User Story 2 (Multi-conversation): 6 E2E tests for new chat, auto-title, recency order, isolation, empty unused, order update
  - User Story 3 (Search): 5 E2E tests for filtering, no-match, clear, performance, answer-exclusion
  - User Story 4 (Management): 7 E2E tests for rename, cancel, empty-refuse, delete-confirm, fallback, clear-all, cancel-clear
  - User Story 5 (Robustness): 5 E2E tests for blocked storage, corrupted, full quota, unavailable, no behavioral difference
  - Edge cases (10 tests): very long conversation, very large history, edge-case titles, duplicate titles, midnight boundary, timezone change, language switch, two tabs, guest session, mobile viewport
- Run existing assistant tests to verify regression (SC-015)
  - Pay attention to: `aiService.test.ts`, `guestAccess.test.tsx`, `guestEntitlement.test.ts`, `demoAuth.test.ts`
  - Verify `resetDatabaseAssistantChat` → `resetToNewChat` behavior unchanged
- **Acceptance**: All spec scenarios pass end-to-end; all edge cases covered; existing tests pass with intent unchanged

#### [ ] T4.8 Manual validation against spec scenarios
- **Reference**: [test-list.md](./tdd/test-list.md) §E2E TESTS edge case sections + this task description
- Manual sign-off checklist:
  - Scenario 4.1 (SC-002, SC-006, FR-011): Open assistant, ask two-part question, close browser, reopen → same conversation restored with follow-up context intact
  - Scenario 4.2 (SC-003, FR-023): Create ≥5 conversations, search by title and question fragment → correct results, answer text ignored (FR-021)
  - Scenario 4.3 (SC-025, FR-027): Rename conversation, delete one, clear all → all changes persist across reload
  - Scenario 4.4 (FR-031, FR-033): Block storage in private window or corrupt JSON manually → assistant answers questions with non-blocking notice, no crash or error page
- **Acceptance**: Tester signs off on 4 spec scenarios; feature behavior matches specification exactly

### Phase 5: Final Checks & Documentation

#### [ ] T5.1 Constitution re-check post-implementation
- Verify no new dependencies added (runtime or dev)
- Verify no new credentials exposed to browser
- Verify no network calls added
- Verify no persistence of streaming fragments
- Verify unlimited retention (no automatic truncation)
- Verify user-level isolation (identity key partitioning)
- **Acceptance**: Constitution gate still passes; no principle violations

#### [ ] T5.2 Type coverage and strict mode
- `npm run type-check` passes
- No `any` type assertions on untrusted data
- Locale maps enforce `en`/`vi` parity (TS error if missing key)
- **Acceptance**: Zero type errors; strict mode maintained

#### [ ] T5.3 Update CHANGELOG and documentation
- Add feature entry to CHANGELOG (release notes)
- Update README with history feature description
- Add inline comments to algorithms (identity hashing, legacy adoption, recency grouping, title truncation)
- Link to research.md in comments (justifications for limitations)
- **Acceptance**: Release documentation complete; algorithms documented; limitations clear

#### [ ] T5.4 Mark tasks completed
- Mark each task `[X]` as completed
- Verify all phases complete
- **Acceptance**: All tasks marked done; feature ready for review

---

## Execution Notes

- **Phases 1-2 (Infrastructure & State)** should complete before Phase 3 (UI), as the UI depends on store projections
- **Phase 4 (Testing)** can run in parallel with Phase 3, but T4.6 (regression tests) must run after all implementation is done
- **Phase 5 (Final Checks)** must complete before marking the feature complete
- Each task includes an acceptance criterion that must be satisfied before marking `[X]`
- Storage writes must happen **only** on these transitions: conversation create, message add (completion only), title change, conversation delete, clear-all, active change
- No writes during streaming fragments, no writes on keystrokes, no writes on panel interactions that don't change data

---

## Key Constraints

- **No new dependencies**: Use existing `localStorage`, `crypto.randomUUID()`, `tailwindcss`, `sonner`, `lucide-react`
- **Strict TypeScript**: All new code in strict mode; no `any` on untrusted data
- **Localization**: Every new string in both `en.ts` and `vi.ts` with TS compiler enforcement
- **Accessibility**: All UI interactive elements keyboard-operable and screen-reader labeled
- **Performance**: Search/filter 200 conversations < 1s; render panel < 1s; no parsing/graph-building
- **Scale**: Assume 200 conversations and 100-message threads as normal steady-state
- **Write discipline**: ≤1 storage write per completed answer; zero during streaming
