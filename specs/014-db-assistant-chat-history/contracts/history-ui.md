# Contract: Database Assistant History UI

**Type**: UI contract for a client-rendered feature surface. It fixes the components, their props,
the states each must render, the accessibility obligations and the localisation keys — so that
implementation and review share a testable target.

**Location**: `src/app/database-ai-assistant/components/` (the route's existing `components/`
folder). Styling reuses the existing design system; no new visual vocabulary (FR-039).

**Hard rule (FR-042)**: none of these components may import `chatHistoryStorage`,
`chatHistoryLocalStorage` or `chatHistoryIdentity`, and none may touch `window.localStorage`. They
read and write **only** through the Zustand store slice. The store is the single place where the
storage contract is called.

---

## 1. Component tree

```text
DatabaseAIAssistantContent.tsx            (CHANGED — orchestrator; existing rendering reused)
├── [guest locked branch]  LockedFeatureNotice        ← history panel NOT rendered (FR-041)
└── [normal branch]
    ├── DatabaseAssistantHistoryPanel.tsx             ← sidebar (lg+) / drawer (<lg)
    │   ├── header: heading, conversation count, "New chat", close (drawer only)
    │   ├── <input type="search">                     ← FR-020
    │   ├── DatabaseAssistantConversationList.tsx     ← grouped, filtered list
    │   │   └── DatabaseAssistantConversationItem.tsx ← one row (title, recency, rename, delete)
    │   │       └── DatabaseAssistantConfirmInline.tsx← inline confirm (never window.confirm)
    │   ├── empty state                               ← FR-018
    │   ├── no-match state                            ← FR-023
    │   └── footer: clear-all + its inline confirm     ← FR-027
    ├── conversation column (existing message rendering, unchanged)
    └── [status region] storage-unavailable notice     ← FR-031 / FR-033
```

## 2. Store slice consumed by the UI

The UI reads this state and calls these actions — nothing else.

```ts
// state
dbConversations: StoredConversation[];
dbActiveConversationId: string | null;
dbHistoryStatus: 'idle' | 'loading' | 'ready' | 'unavailable';
dbIdentityKey: string | null;
databaseAssistantQuestionDraft: string;                  // existing, unchanged
databaseAssistantHistory: DatabaseAssistantChatTurn[];    // derived projection of the active thread

// selectors
selectActiveThread(state): DatabaseAssistantChatTurn[];
selectVisibleConversations(state): StoredConversation[];  // ordered, FR-006 applied

// actions (data-model.md → State transitions)
startConversation(question) | askInConversation(question) | completeAssistantTurn(...)
rollbackAttempt(question)   | selectConversation(id)      | renameConversation(id, title)
deleteConversation(id)      | clearAllConversations()     | newChat()
setDatabaseAssistantQuestionDraft(value)                  // existing, unchanged
```

## 3. Required UI states

Every state below must be reachable and rendered deliberately — no blank panels, no spinner that
never resolves (rule 30).

| State | Condition | Rendering | Requirement |
|---|---|---|---|
| Loading | `dbHistoryStatus === 'loading'` | Quiet `Loader2` (already used in this feature area) or a panel skeleton; the conversation column is unaffected | FR-036 |
| Empty history | ready, zero conversations | Explicit guidance telling the user how to begin — never a blank panel. The existing empty-conversation starter questions remain | FR-018 |
| Populated list | ready, ≥1 conversation | Recency-grouped, most-recent-first; the active entry visibly distinguished **and** marked `aria-current="true"` | FR-015, FR-016 |
| Long thread open | selected conversation has many messages | Whole thread rendered, positioned at the latest exchange | FR-019, SC-005 |
| Searching | non-empty query | List narrows as the user types, no submit step; groupings preserved | FR-020, FR-023 |
| No match | query matches nothing | Explicit "no conversations match" state, announced via `aria-live="polite"` | FR-023 |
| Query cleared | query emptied | Full list restored in its normal order and groupings | FR-023 |
| Rename open | row's rename activated | Inline text input pre-filled with the current title, plus confirm and cancel | FR-005 |
| Rename refused | submitted title empty or whitespace-only | Refusal message; previous title kept; input stays open | FR-005 |
| Delete confirm | row's delete activated | Inline Confirm / Cancel replacing the delete control in place | FR-025, FR-040 |
| Clear-all confirm | footer clear-all activated | Inline Confirm / Cancel in the footer | FR-027 |
| Confirm cancelled | cancel, `Escape` or dismiss | All stored data untouched; controls return to their normal state | FR-028 |
| Deleted-active | the open conversation was deleted | Another existing conversation, or the empty conversation state — never a deleted conversation | FR-026 |
| Storage unavailable | `dbHistoryStatus === 'unavailable'` | One non-blocking `role="status"` notice saying conversations will not be remembered. The assistant stays fully usable; no dialog, no error page | FR-031, FR-033, SC-009 |
| Guest locked | `isGuestSession() && isLockedForGuest(getCapability('database-assistant')!, aiConfig)` | The existing `LockedFeatureNotice` only; the history panel is not rendered in that branch at all | FR-041, SC-016 |
| Signed out | no signed-in identity and no guest marker (`identityKey === null`) | The panel still renders as a stable, styled placeholder (icon, title, sign-in hint) so establishing a session does not shift the layout | FR-030, FR-043 |

## 4. Responsive contract (FR-014, SC-014)

| Viewport | Presentation | Obligations |
|---|---|---|
| `lg` and up | History sidebar (~18rem) **beside** the conversation, in a two-column row | The conversation column keeps `min-w-0` so long code blocks cannot squeeze or displace the sidebar; the sidebar scrolls internally and never grows the page; both remain fully usable side by side |
| below `lg` | Off-canvas **drawer**, opened by a header control | Dismissible by its close control, a backdrop click and `Escape`; the conversation occupies full width when the drawer is closed and is never hidden, squeezed or broken by an open drawer; `role="dialog"` + `aria-modal="true"`; focus moves in on open and returns to the opener on close |

Both presentations must be readable and usable in the dark **and** the light theme, with no
hardcoded colours — theme comes from the existing `ThemeProvider` CSS variables.

## 5. Accessibility contract (FR-040, SC-013)

| Element | Obligation |
|---|---|
| Every control | Native `<button>` / `<input>`; keyboard reachable; visible focus; accessible name. Icon-only controls carry both `aria-label` and `title`, matching the existing assistant buttons |
| History region | `<nav aria-label={t.dbAssistantHistoryPanelLabel}>` containing a `<ul>` |
| Recency groups | Real headings, so the list can be skimmed by heading navigation |
| Conversation row | Button semantics with an accessible name that includes the title; `aria-current="true"` when active |
| Search field | `<input type="search">` with a programmatic label and `aria-describedby` pointing at the result count |
| No-match / result count | `aria-live="polite"` region, so the outcome is not silent |
| Drawer (narrow) | `role="dialog"`, `aria-modal="true"`, labelled title, focus in on open, focus returned to the opener on close, `Escape` dismisses |
| Inline confirmations | Confirm and Cancel are real buttons — confirming a deletion with the keyboard alone must work (SC-013). `window.confirm` is forbidden (research.md **R17**) |
| Storage notice | `role="status"`; non-blocking; never a modal or `alert` dialog |

**Keyboard-only completion path** (what the SC-013 test walks): `Tab` to the history region → open
the drawer (narrow) → `Tab` to search → type → `Tab` to a conversation → `Enter` to open → `Tab` to
its delete → `Enter` → `Tab` to Confirm → `Enter`. Every step must work without a pointer.

## 6. Localisation contract (FR-038, SC-012)

All strings come from `src/locales/en.ts` + `src/locales/vi.ts` via `getT(settings.locale)`, under
the existing `dbAssistant*` prefix extended with a `dbAssistantHistory*` family. Parity is enforced
by the compiler (`src/lib/i18n.ts`'s `satisfies Record<Locale, TranslationSchema>`), so a failure of
`npm run type-check` is the signal that a key is missing from `vi`.

| Key | Used for |
|---|---|
| `dbAssistantHistoryPanelLabel` | nav/panel accessible name and heading |
| `dbAssistantHistoryOpen` / `dbAssistantHistoryClose` | drawer open and close controls |
| `dbAssistantHistoryCount` | conversation count (with a `{count}` placeholder) |
| `dbAssistantHistorySearchLabel` / `dbAssistantHistorySearchPlaceholder` | search field |
| `dbAssistantHistoryNoMatches` | no-match state |
| `dbAssistantHistoryEmptyTitle` / `dbAssistantHistoryEmptySubtitle` | empty-history guidance |
| `dbAssistantHistoryGroupToday` / `…GroupYesterday` / `…GroupPreviousSevenDays` / `…GroupOlder` | the four recency headings |
| `dbAssistantHistoryRename` / `dbAssistantHistoryRenameLabel` / `dbAssistantHistoryRenameEmpty` | rename action, input label, refusal |
| `dbAssistantHistoryDelete` / `dbAssistantHistoryDeleteConfirmPrompt` | delete action and prompt |
| `dbAssistantHistoryClearAll` / `dbAssistantHistoryClearAllConfirmPrompt` | clear-all action and prompt |
| `dbAssistantHistoryConfirm` / `dbAssistantHistoryCancel` | the shared confirm/cancel pair |
| `dbAssistantHistoryNotPersisted` | storage-unavailable notice (FR-033) |
| `dbAssistantHistoryActiveConversation` | active-row accessible description |

Reused unchanged: `dbAssistantNewChat`, `dbAssistantEmptyTitle`, `dbAssistantEmptySubtitle`,
`dbAssistantPlaceholder`, `dbAssistantStop`, `dbAssistantSend`, `dbAssistantCopy`,
`dbAssistantCopied`, `dbAssistantSourcesLabel`, `dbAssistantFollowUpsLabel`,
`dbAssistantErrorGeneric`, `dbAssistantDisclaimer`, `dbAssistantSuggestion1..6`,
`navDatabaseAssistant`. Existing keys are **not** renamed or reworded (SC-015).

## 7. Behaviours that must not change (FR-037, SC-015)

These existing behaviours are asserted unchanged. Each is already implemented in
`DatabaseAIAssistantContent.tsx` and must survive the refactor:

1. The answer appears progressively as it is produced (streaming deltas mutate the projection).
2. An in-progress answer can be stopped — and, per research.md **R7**, stopping now rolls the
   exchange back into the input instead of leaving partial text on screen.
3. An error rolls the unanswered question back into the input so it can be retried, with the
   existing `toast.error`.
4. Follow-up suggestion chips refresh after a completed answer (`suggestFollowUpQuestions`).
5. Suggested starter questions appear on an empty conversation.
6. The provider/model indication reflects `aiConfig.provider` / `ollamaModel` / `modelId`.
7. Copy-to-clipboard works on an answer, with its copied confirmation.
8. Formatted text and fenced code blocks render as before (`MessageContent`, `MarkdownText`).
9. Grounding source labels render from the answer's `sources` — restored answers included, with no
   re-run of retrieval (FR-012).
10. The guest refusal renders `LockedFeatureNotice` and refuses the answer step.

## 8. Verification

UI tests live in `tests/unit/dbAssistantHistoryPanel.test.tsx` (research.md **R21**), using
`@testing-library/react` with accessible, role-based selectors only.

| Test | Contract clause proven |
|---|---|
| Empty history renders guidance, not a blank panel | §3 Empty history, FR-018 |
| Populated list groups by recency and marks the active entry | §3 Populated list, FR-015, FR-016 |
| Typing narrows the list without a submit; clearing restores order and groupings | §3 Searching / Query cleared, FR-020, FR-023 |
| A unique term inside an **answer** returns zero matches; the same term in a title or a question returns it | FR-021, SC-019 |
| No-match state renders and is announced | §3 No match, FR-023 |
| Rename with a valid title persists; an empty title is refused and the previous title kept | §3 Rename, FR-005 |
| Delete requires confirmation; cancel leaves data untouched; confirm removes only that conversation | §3 Delete confirm / Cancelled, FR-025, FR-028 |
| Deleting the open conversation lands on another conversation or the empty state | §3 Deleted-active, FR-026 |
| Clear-all requires confirmation and results in the empty state | §3 Clear-all, FR-027 |
| Every history action completes with keyboard-only interaction, including confirming a deletion | §5, FR-040, SC-013 |
| All new strings change between `en` and `vi` | §6, FR-038, SC-012 |
| Narrow viewport: opening and closing the drawer leaves the conversation usable | §4, FR-014, SC-014 |
| Guest locked: the panel is not rendered and the refusal is unchanged | §3 Guest locked, FR-041, SC-016 |
| The panel and page modules do not import the storage modules | §1 hard rule, FR-042 |



