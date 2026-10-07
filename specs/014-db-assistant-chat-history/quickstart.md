# Quickstart: Validating Database AI Assistant Chat History

**Feature**: `014-db-assistant-chat-history` | **Plan**: [plan.md](./plan.md)

This is a **validation and run guide**. It proves the feature works end-to-end against the spec's
measurable success criteria. Implementation detail lives in
[data-model.md](./data-model.md), [contracts/chat-history-storage.md](./contracts/chat-history-storage.md)
and [contracts/history-ui.md](./contracts/history-ui.md); work breakdown belongs in `tasks.md`.

---

## 1. Prerequisites

| Requirement | Notes |
|---|---|
| Node.js 20+ | `@types/node` is `^20` |
| Dependencies installed | `npm install` — **no new dependency is added by this feature** |
| A working AI target | Ollama running locally with `qwen2.5-coder:3b` (the default in `DEFAULT_AI_CONFIG`), **or** a cloud provider configured server-side. Needed only for the scenarios that ask a question |
| A signed-in identity | Google/Microsoft social sign-in, or the demo password. **Required**: history is partitioned per identity, so a guest or signed-out browser has no history by design (FR-030, FR-043) |
| Optional: RAG grounding | `npm run build:database-knowledge-index` plus the Ollama embedding model, to exercise the source-label restore scenario. Without it the assistant answers from general knowledge and `sources` is empty — that is a supported state, not a failure |

## 2. Setup and run

```powershell
# from the repository root: D:\Github projects\sql-visualizer
npm install
npm run dev          # starts Next.js on http://localhost:4028
```

Open `http://localhost:4028/database-ai-assistant`. Sign in first (the workspace gate sends an
unauthenticated visitor to `/login`).

### Automated checks

```powershell
npm run type-check   # TS strict + en/vi locale parity (SC-012 is enforced here)
npm run lint
npm run test         # whole Vitest suite
npx vitest run tests/unit/dbAssistantChatHistoryStorage.test.ts
npx vitest run tests/unit/dbAssistantChatHistoryHelpers.test.ts
npx vitest run tests/unit/dbAssistantChatHistoryState.test.ts
npx vitest run tests/unit/dbAssistantChatHistoryIdentity.test.ts
npx vitest run tests/unit/dbAssistantHistoryPanel.test.tsx
```

**All five new files must pass, and every pre-existing test must still pass with its intent
unchanged** — that is SC-015. Pay particular attention to `aiService.test.ts`, `guestAccess.test.tsx`,
`guestEntitlement.test.ts`, `demoAuth.test.ts`, `login-route.test.tsx` and `AppLayout.test.tsx`.

### Inspecting storage

History lives in `localStorage` under one key per identity:

```
sql-visualizer:database-ai-assistant:chat-history:<identityKey>
```

DevTools → Application → Local Storage → `http://localhost:4028`. Expect exactly one such key per
identity that has used the assistant on this browser, and **no** key for a guest session. The
payload shape is `StoredHistory` ([data-model.md](./data-model.md)).

---

## 3. Automated scenario → criterion map

| Scenario | Run | Expected outcome | Criterion |
|---|---|---|---|
| Storage round-trip | `dbAssistantChatHistoryStorage.test.ts` | save → load preserves every conversation, message order, roles and `sources` | SC-001, FR-010, FR-012 |
| Write discipline | `dbAssistantChatHistoryState.test.ts` | ≤1 contract write per completed answer; **zero** writes between the first and last streamed fragment; zero on keystrokes | SC-008, FR-013 |
| No partial answers | `dbAssistantChatHistoryState.test.ts` | after 10 stopped/failed attempts, stored history contains none of them and each question is back in the draft | SC-007, FR-009 |
| Identity isolation | `dbAssistantChatHistoryIdentity.test.ts` | identity B sees 0 of A's conversations; A sees 100% of its own after signing back in; nothing merges | SC-017, FR-030, FR-043 |
| Application never deletes | `dbAssistantChatHistoryStorage.test.ts` | 200 conversations survive reload with none removed and the same order | SC-018, FR-029 |
| Search scope | `dbAssistantChatHistoryHelpers.test.ts` + panel test | a term in a title or a question matches 100%; a term only in an answer matches 0% | SC-019, FR-021 |
| Corrupt data | `dbAssistantChatHistoryStorage.test.ts` | assistant opens with an empty history, no crash, payload left untouched | SC-010, FR-034 |
| Blocked storage / quota | `dbAssistantChatHistoryStorage.test.ts` | session keeps working in memory, at most one non-blocking notice, saved data undamaged | SC-009, FR-031, FR-033 |
| Deletion permanence | `dbAssistantChatHistoryStorage.test.ts` | a deleted conversation returns in 0% of reloads; a cleared history stays empty in 100% | SC-011, FR-025, FR-027 |
| Scale: filtering | `dbAssistantChatHistoryHelpers.test.ts` | 200 conversations filtered well inside 1 s | SC-004 |
| UI states + a11y + i18n + narrow viewport | `dbAssistantHistoryPanel.test.tsx` | every state in the UI contract §3 renders; keyboard-only path completes; `en`↔`vi` switches every new string | SC-012, SC-013, SC-014 |
| Guest refusal | `dbAssistantHistoryPanel.test.tsx` + existing guest tests | the answer step is refused 100% and the panel's presence changes nothing | SC-016, FR-041 |
| Storage isolation from presentation | `dbAssistantHistoryPanel.test.tsx` | the page and panel modules do not import the storage modules | FR-042 |

## 4. Manual scenarios (need a real browser)

These criteria involve a browser restart, real timing or real model output, so they are validated by
hand. Each is a pass/fail check against a numbered criterion.

### 4.1 Returning to where you left off — SC-002, SC-006, FR-011

1. Sign in. Open `/database-ai-assistant`. Ask a question that only makes sense with a follow-up —
   e.g. *"How do I write a window function that ranks rows per department?"* — then, once answered,
   *"Now add a filter for departments with more than 10 rows."*
2. Note the conversation title in the history list (derived from your first question).
3. Close the tab. Reopen the browser and go to `/database-ai-assistant`.
4. **Pass**: you are looking at that same conversation with **zero clicks**, both exchanges present
   in order, and any source labels still shown.
5. Ask *"What was the first version of that query?"*
6. **Pass**: the answer refers to the earlier exchange rather than giving a generic reply (SC-006).
7. Also navigate to `/smart-sql-editor` and back — the conversation is still there (FR-010).

### 4.2 Finding one conversation among many — SC-003, SC-004, FR-023

1. Create ~50 conversations with distinguishable first questions (a quick loop of short questions is
   enough; the answers do not matter).
2. **Pass**: the history list shows all of them, most recently used first, grouped under
   Today / Yesterday / Previous 7 days / Older as applicable.
3. Type a fragment of one question you remember.
4. **Pass**: the list narrows as you type with no submit, and you reach the right conversation in
   under 10 seconds without scrolling the full list.
5. Clear the search. **Pass**: the full list returns in its normal order and groupings.
6. Type a term that appears **only inside an answer**. **Pass**: no match (SC-019).

### 4.3 Long thread — SC-005, FR-019

1. Open a conversation and ask ~50 follow-up questions so it holds ~100 messages.
2. Switch to another conversation, then back.
3. **Pass**: the whole thread is shown, positioned at the most recent exchange, within 2 seconds,
   and the page stays responsive while you scroll it.

### 4.4 Permanence of delete and clear-all — SC-011, FR-025 to FR-028

1. Delete a conversation, confirming inline. **Pass**: only that one disappears.
2. If it was the open conversation, **Pass**: you land on another conversation or the empty state —
   never on the deleted one (FR-026).
3. Reload, then restart the browser. **Pass**: the deleted conversation does not reappear.
4. Trigger delete again and choose **Cancel**, then separately press `Escape`. **Pass**: nothing is
   removed — confirm in DevTools that the payload is byte-identical (FR-028).
5. Use clear-all and confirm. **Pass**: the empty history state shows, and it is still empty after a
   reload and a browser restart (FR-027).

### 4.5 Ownership across identities — SC-017, FR-030, FR-043

1. As identity A, create two conversations and note them.
2. Sign out. **Pass**: the assistant shows no conversations (the panel is absent or empty).
3. Sign in as identity B, a different account. **Pass**: A's conversations are **not** visible; B's
   history is empty or holds only B's own.
4. Sign out and back in as A. **Pass**: both of A's conversations are restored unchanged.
5. In DevTools, **Pass**: there are two distinct `…:chat-history:<identityKey>` keys and neither
   payload contains the other's conversations.

### 4.6 Guest refusal — SC-016, FR-041

1. Sign out and enter as a guest.
2. Open `/database-ai-assistant`.
3. **Pass**: the locked-feature notice is shown, the answer step is refused, and the history panel
   offers no way around it. Repeat 10 times — refused every time.

### 4.7 Storage blocked — SC-009, FR-031, FR-033

1. Open the assistant in a private window, or block site data for `localhost:4028` (DevTools →
   Application → Storage → Site settings), then reload.
2. **Pass**: the assistant works normally and answers questions; one non-blocking notice says
   conversations will not be remembered; no dialog and no error page.
3. Ask 10 questions. **Pass**: all 10 are answered, and the notice appears at most once.

### 4.8 Keyboard, theme and narrow viewport — SC-013, SC-014, FR-040

1. Put the pointer aside and walk the path in the UI contract §5: reach the history region, open the
   drawer on a narrow viewport, search, open a conversation, rename it, delete it and **confirm the
   deletion** — all by keyboard.
2. **Pass**: every step works, focus is always visible, and the drawer returns focus to its opener.
3. Resize below the `lg` breakpoint. Open and close the drawer repeatedly. **Pass**: the conversation
   is fully readable and usable each time, in both the dark and the light theme.

## 5. Regression gate (SC-015, FR-037)

Before calling the feature done, confirm each of these still behaves exactly as before. They are the
assistant's existing behaviours, listed in the UI contract §7.

- [ ] An answer still appears progressively while it is produced.
- [ ] Stop still halts an in-progress answer — and now returns the question to the input rather than
      leaving partial text (the one intentional change, research.md **R7**).
- [ ] An error still rolls the unanswered question back into the input with the same error toast.
- [ ] Follow-up suggestion chips still refresh after an answer.
- [ ] Starter questions still appear on an empty conversation.
- [ ] The provider/model indication is unchanged.
- [ ] Copy-to-clipboard still works on an answer.
- [ ] Markdown and fenced code blocks still render identically.
- [ ] Source labels still render, including on a restored answer, without re-running retrieval.
- [ ] The guest refusal is unchanged.
- [ ] `npm run test` is green across the whole suite, with no existing test's intent modified.
- [ ] `npm run type-check` and `npm run lint` are clean.

## 6. Definition of done for this guide

- [ ] All five new test files pass and the whole suite passes.
- [ ] `npm run type-check` passes, which also proves `en`/`vi` parity (SC-012).
- [ ] Every manual scenario in §4 passes.
- [ ] Every regression item in §5 is checked.
- [ ] DevTools shows one history key per identity, none for a guest, and no unexpected extra keys.

## 7. Known limitations to expect while validating

Recorded so they are not mistaken for defects:

- **Demo identity is shared.** All demo-password sign-ins on one browser map to the single `demo`
  partition, because the demo gate has no account behind it (research.md **R2**).
- **Recency groups use the device timezone.** Changing timezone can move a conversation between
  groups (research.md **R11**).
- **Titles are stored language-neutrally.** A derived title does not change when the interface
  language is switched; only UI chrome does (research.md **R6**).
- **Storage exhaustion is handled, not prevented.** Past the browser's `localStorage` quota the
  session continues in memory with one notice; the application never truncates history to fit
  (FR-029, FR-031). IndexedDB is the documented successor (research.md **R3**).



