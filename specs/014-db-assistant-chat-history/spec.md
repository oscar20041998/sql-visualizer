# Feature Specification: Database AI Assistant — Persistent Conversation History

**Feature Branch**: `014-db-assistant-chat-history`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "Read and implement the request in `docs/ui-prompts/20260920/database-ai-assistant-chat-history.prompt.md`" — that document asks for persistent, multi-conversation chat history for the Database AI Assistant page: conversations that survive a page refresh and a browser restart, a history sidebar with new-chat / search / rename / delete, automatic conversation titles, restoration of the last active conversation, defensive behaviour when device storage is unavailable or full, no persistence of streaming fragments, full English/Vietnamese localisation, and a storage mechanism that can later be swapped for a server-backed one without changing the assistant.

## Clarifications

### Session 2026-09-28

- Q: Whose conversations should the history show when two different people use SQL Visualizer on the same browser? → A: Per signed-in identity, stored on the device — each account sees only its own conversations; guests see none.
- Q: How much history should be kept before the application removes something on its own? → A: Unlimited and user-managed — nothing is ever removed automatically.
- Q: What should search match inside? → A: Conversation titles plus the text of the questions the user asked; answers are not searched.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The answer I got yesterday is still there (Priority: P1)

A developer asks the Database AI Assistant how to write a window function for their dialect, reads the answer, and closes the tab to go and try it. The next morning — or after a browser restart, or after navigating to the Smart SQL Editor and back — they open the assistant again. The conversation is exactly where they left it: their question, the assistant's answer, and the source labels that told them which manual the answer came from. Nothing has to be re-asked and nothing has to be re-read from a screenshot.

**Why this priority**: This is the entire reason the feature exists. Today the assistant's thread lives only in memory, so any reload, navigation or restart destroys work the user already paid for in tokens and reading time. Without persistence there is no history to browse, search or manage — every other story depends on this one. It is also a viable MVP on its own: a user with one saved conversation that comes back after a reload already gets the core value.

**Independent Test**: Ask a question, wait for the answer to finish, reload the page, then close and reopen the browser. The conversation reappears on its own with no user action, in the same order, with its source labels intact, and a follow-up question in that conversation still gets an answer that accounts for the earlier exchange.

**Acceptance Scenarios**:

1. **Given** a conversation containing at least one completed question and answer, **When** the user reloads the page, **Then** the same conversation is displayed with every message in its original order and no message missing or duplicated.
2. **Given** a conversation containing at least one completed question and answer, **When** the user closes the browser, reopens it and returns to the assistant, **Then** the conversation is still there and is the one shown.
3. **Given** a conversation the user has left by navigating to another page of the application, **When** they return to the assistant, **Then** that conversation is shown rather than an empty chat.
4. **Given** a reopened conversation, **When** the user asks a follow-up question that refers back to the earlier exchange, **Then** the answer takes the earlier exchange into account exactly as it would have in an uninterrupted session.
5. **Given** an answer that displayed source/citation labels when it was first produced, **When** the conversation is reopened, **Then** those same source labels are displayed with the answer.
6. **Given** an answer that is still streaming, **When** the user reloads or navigates away before it completes, **Then** no half-written answer is left in the saved history and the conversation returns to its last complete state.
7. **Given** an answer that failed with an error, **When** the user reopens the conversation, **Then** the failed exchange is not present as a stored message and the question is available to ask again, matching the error behaviour the assistant has today.

---

### User Story 2 - One conversation per topic (Priority: P2)

The same developer is working on three unrelated problems this week: an indexing question for one database, a transaction-isolation question for another, and a migration question for a third. Today all three would land in one long thread, so each new question drags the previous, irrelevant context along with it and the thread becomes unreadable. With history, they start a new conversation for each topic, see all three listed in a sidebar beside the chat, ordered by the one they touched most recently and grouped into "Today", "Yesterday" and older, and click between them. Each conversation carries only its own context.

**Why this priority**: This is what turns "not losing the last thread" into a history. It removes a real quality problem — unrelated context bleeding into a new question — and makes past answers navigable instead of one long scroll. It ranks below Story 1 only because Story 1 already delivers value alone; together they form the shippable release.

**Independent Test**: Create three conversations with different first questions, confirm each appears in the sidebar under its own title, confirm the order changes when an older one is used again, confirm selecting each one shows only that conversation's messages, and confirm a question asked in one conversation is not influenced by the content of another.

**Acceptance Scenarios**:

1. **Given** an ongoing conversation, **When** the user starts a new chat, **Then** an empty conversation is shown for the new topic and the previous conversation is still present in the sidebar, unchanged.
2. **Given** the user has sent the first question in a new conversation, **When** the conversation appears in the sidebar, **Then** its title is derived from that question without the user typing anything, with no noticeable delay and at no additional cost.
3. **Given** several conversations exist, **When** the user looks at the sidebar, **Then** they are ordered with the most recently used first and grouped by how recently they were used.
4. **Given** several conversations exist, **When** the user selects one, **Then** its full message thread is displayed, it is marked as the conversation currently in view, and it becomes the context for the next question.
5. **Given** conversation A about indexing and conversation B about transactions, **When** the user asks a question in B, **Then** the answer reflects only B's earlier exchange and shows no awareness of A.
6. **Given** the user starts a new chat but never asks anything, **When** they later look at the sidebar, **Then** the unused conversation does not clutter the list.
7. **Given** a conversation created earlier today and one created yesterday, **When** the user looks at the sidebar, **Then** each appears under the correct recency heading, and the headings themselves follow the order today, yesterday, then older.

---

### User Story 3 - Finding an old answer again (Priority: P3)

Two weeks later the developer half-remembers that the assistant once explained exactly the deadlock behaviour they are now debugging. They do not remember which conversation it was or what they called it. They type a word or two into the search box at the top of the history sidebar and the list narrows as they type; the conversation they want appears, they open it, and the answer is there with its sources.

**Why this priority**: Search is what makes a large history usable — without it, browsing twenty or fifty conversations is a chore and users will simply re-ask the question, which costs tokens and time. It ranks below the two stories above because it only pays off once there is enough history to lose things in, and it can be delivered as a later increment without weakening the release.

**Independent Test**: With at least five saved conversations, type a fragment of a past question or part of a title and confirm the matching conversation appears, that non-matching ones disappear, that a query with no match shows a clear "nothing found" state rather than an empty panel, and that clearing the search restores the complete list unchanged.

**Acceptance Scenarios**:

1. **Given** several saved conversations, **When** the user types into the search box, **Then** the sidebar list narrows to the matching conversations without the user having to press a search button.
2. **Given** a search that matches a conversation, **When** the user selects it from the filtered list, **Then** that conversation opens in full and the search does not alter its contents.
3. **Given** a search term that matches nothing, **When** the list is filtered, **Then** the user sees an explicit "no conversations match" message rather than a blank area, and the sidebar remains usable.
4. **Given** an active search, **When** the user clears the search box, **Then** the full list returns in its normal most-recent-first order with its recency groupings.
5. **Given** a search term, **When** results are shown, **Then** they appear promptly enough that typing feels uninterrupted, and no conversation is created, renamed or deleted as a side effect of searching.
6. **Given** the user searches for a word that appears only inside an answer and not in any title or question, **When** the list is filtered, **Then** that conversation is not returned and the explicit "no conversations match" state is shown (FR-021), consistently every time the same term is used.

---

### User Story 4 - Keeping the history tidy (Priority: P3)

After a month the sidebar holds forty conversations, most of them one-off questions the developer no longer cares about, and three of them have titles that were auto-derived from questions that all began the same way. They rename the three that matter to something they will recognise ("Deadlock retry strategy"), delete the dozen that were experiments, and once, when handing the machine to a colleague, clear the whole history in a single confirmed action.

**Why this priority**: Management actions keep the feature pleasant over time and give the user control over data that is stored about them, which matters for trust and for shared machines. It is not needed for the first release to be useful — persistence and browsing already deliver value — so it ranks below the stories above, but it is explicitly part of the requested feature and must not be dropped.

**Independent Test**: Rename a conversation and confirm the new title is what appears after a reload; delete one and confirm only that one disappears, that the others are untouched, and that it never comes back; delete the conversation currently open and confirm the view falls back sensibly; attempt to rename to an empty name and confirm it is refused; clear all and confirm the empty state appears and survives a reload.

**Acceptance Scenarios**:

1. **Given** a conversation in the sidebar, **When** the user chooses to rename it and types a new title, **Then** the new title is shown immediately, is used from then on instead of the auto-derived one, and is still the title after a reload.
2. **Given** the user is renaming a conversation, **When** they cancel instead of confirming, **Then** the previous title is kept and nothing else changes.
3. **Given** the user is renaming a conversation, **When** they submit an empty or whitespace-only title, **Then** it is refused with a clear indication and the previous title is kept.
4. **Given** a conversation in the sidebar, **When** the user chooses to delete it, **Then** they are asked to confirm first, and only after confirming does that one conversation disappear while every other conversation remains.
5. **Given** the conversation currently open is deleted, **When** the deletion completes, **Then** the chat area falls back to another existing conversation or to the empty state, and the user is never left looking at a deleted conversation.
6. **Given** a deleted conversation, **When** the user reloads the page or restarts the browser, **Then** it does not reappear.
7. **Given** several conversations exist, **When** the user clears the entire history after confirming, **Then** all conversations are removed, the empty state is shown, and the empty state is still what is shown after a reload.
8. **Given** the user cancels a delete or clear-all confirmation, **When** the dialog is dismissed, **Then** nothing is removed.

---

### User Story 5 - The assistant still works when history cannot be saved (Priority: P3)

A user opens the application in a browser's private window, or in a locked-down corporate browser where site storage is blocked, or simply accumulates more history than the device will hold. In every one of those situations the assistant must still answer questions. The user is told once, without being blocked, that their conversations will not be remembered — and the rest of the page behaves exactly as it does for everyone else. A user whose stored history has become unreadable (an interrupted write, a browser upgrade, hand-edited data) must likewise land on a working assistant with an empty history rather than a broken page.

**Why this priority**: These are unhappy paths, so they are less visible than the stories above — but the failure mode is severe: a history feature that crashes the assistant when storage misbehaves would take down a working feature to add a convenience. Ranking it P3 reflects that it is defensive work rather than user-facing value, not that it is optional.

**Independent Test**: Block site storage (or use a private window) and confirm questions are still answered with a single non-blocking notice; corrupt the stored history and confirm the assistant opens with an empty history and no error page; fill storage until a save fails and confirm the current conversation keeps working in the session and the user is told once.

**Acceptance Scenarios**:

1. **Given** a browser that refuses to store site data, **When** the user opens the assistant and asks a question, **Then** the answer is produced normally and the user is informed once, without a blocking dialog, that conversations will not be remembered.
2. **Given** stored history that cannot be read or is malformed, **When** the user opens the assistant, **Then** the page loads with an empty history, no crash and no loss of the ability to ask questions.
3. **Given** stored history in which some conversations are valid and some are not, **When** the history is loaded, **Then** the valid conversations are shown and the invalid ones are quietly dropped.
4. **Given** the device cannot accept any more stored data, **When** the user asks a question, **Then** the conversation continues to work for the rest of the session and the user sees a non-blocking notice that it could not be saved.
5. **Given** any of the situations above, **When** the user works through a full question-and-answer cycle, **Then** no behaviour differs from the normal case apart from the notice and the absence of persistence.

---

### Edge Cases

- **Answer interrupted mid-stream**: the user presses stop, closes the tab, loses network, or the model errors halfway. No partial answer is written to history; the thread returns to its last complete state and the question can be asked again, exactly as the assistant behaves today.
- **Reload while an answer is streaming**: the in-flight answer is discarded rather than saved half-written; the conversation reopens at its last complete state.
- **New chat created but never used**: an empty conversation must not accumulate in the list, must not push a real conversation down the ordering, and must not be restored as "the last active conversation" ahead of one that actually has content.
- **Deleting the conversation that is currently open**: the view must fall back to another conversation or to the empty state, never to a conversation that no longer exists.
- **Deleting the last remaining conversation**: the empty-history state appears and persists across a reload.
- **Titles that are unusable**: a first question that is one word, a very long paragraph, only punctuation, only whitespace, or in a language other than the interface language. Titles must be derived safely, truncated at a readable boundary, and never blank; a whitespace-only manual rename must be refused.
- **Duplicate titles**: two conversations with identical titles must remain separately selectable, separately renamable and separately deletable — identity must never depend on the title.
- **Recency boundaries**: a conversation last used just before midnight, a device whose clock changes, and a conversation older than a week must each land in a sensible group and must never appear above a more recently used one.
- **Very large history**: hundreds of conversations, and one conversation with a very long thread, must still open, scroll and search without the page becoming unusable. Because nothing is ever removed automatically (FR-029), a very large history is a normal steady state rather than an anomaly, and no conversation may be dropped to make the page faster.
- **Search term that exists only in an answer**: answers are outside the search scope (FR-021), so the conversation is not returned. The result must be the explicit no-match state rather than a partial or inconsistent match, and nothing in the interface may imply the conversation no longer exists.
- **Storage full mid-session**: the session keeps working in memory, the user is told once, and earlier saved conversations are not damaged by the failed write.
- **Partially readable history**: some conversations valid, some not — valid ones survive, invalid ones are dropped, and the failure is not surfaced as a broken page.
- **History written by an older or newer version of the application**: an unreadable or unfamiliar shape must degrade to an empty history rather than crash, and must not be silently overwritten in a way that destroys data a newer version could still read.
- **Two tabs open at once**: the assistant must not end up showing a merged or duplicated thread, and a conversation saved from one tab must not resurrect in the other after a reload.
- **Interface language switched mid-session**: stored conversations keep the language they were written in, while every label of the history interface itself follows the newly selected language.
- **Guest session (feature `013-guest-access-mode`)**: a guest is refused the assistant's answer step, so a guest normally has no history at all. The history panel must not become a route around that refusal, must not display another person's conversations on a shared machine, and must itself be harmless when empty.
- **Identity changes mid-session**: signing out while a conversation is open must hide it rather than leave it readable on screen; signing in as somebody else must show only that person's conversations; and a conversation that never gained an owning identity must not surface in anyone's history afterwards (FR-030, FR-043).
- **Theme and viewport changes**: the history panel must remain readable and usable in dark and light themes and on a narrow screen, where it must not push the conversation off-screen.
- **Keyboard and screen-reader use**: every history action (new chat, select, search, rename, delete, clear all, confirm) must be reachable and operable without a pointer.

## Requirements *(mandatory)*

### Functional Requirements

**Creating and identifying conversations**

- **FR-001**: Users MUST be able to start a new conversation at any time from the assistant page, and doing so MUST NOT delete, hide or modify any existing conversation.
- **FR-002**: Each conversation MUST have a stable identity of its own that never changes when the conversation is renamed, reopened, added to, or viewed after a page reload, and that is never derived from the conversation's position in a list.
- **FR-003**: The system MUST derive an initial conversation title automatically from the user's first question in that conversation, without asking the user, without noticeable delay, and without spending any model or network request on it.
- **FR-004**: A derived title MUST be shortened to a length that reads well in the history list, cut at a readable boundary rather than mid-word, and MUST never be empty even when the first question is unusual.
- **FR-005**: Users MUST be able to replace a conversation's title with one of their own; the manual title MUST take precedence from then on and MUST survive a reload. An empty or whitespace-only title MUST be refused with the previous title kept.
- **FR-006**: A conversation that has been created but contains no messages MUST NOT be presented to the user as part of their history.

**Saving and restoring**

- **FR-007**: The system MUST save a user's question to its conversation as soon as the question is sent.
- **FR-008**: The system MUST save an assistant answer to its conversation once, after the answer has fully completed, and MUST NOT save intermediate fragments while the answer is still being produced.
- **FR-009**: The system MUST NOT save an answer that was stopped, interrupted or failed, and MUST leave the conversation in the state it was in before that attempt, so the question can be asked again.
- **FR-010**: Saved conversations MUST still be available after a page reload, after navigating elsewhere in the application and back, and after the browser is closed and reopened.
- **FR-011**: When the assistant page is opened, the system MUST restore and display the conversation the user was last working in, without any action from the user; if there is none, it MUST show the empty conversation state.
- **FR-012**: A restored conversation MUST look the same as it did when it was created — same messages, same order, same question/answer roles, and the same accompanying answer details the assistant shows today (such as the source labels produced by manual grounding) — without re-running any request to regenerate them.
- **FR-013**: The system MUST save a conversation whenever its meaningful state changes (created, question sent, answer completed, title changed, deleted) and MUST NOT save on every keystroke or on every streamed fragment.

**Browsing and switching**

- **FR-014**: The system MUST present the list of conversations beside the conversation on a wide screen, and as a panel the user can open and dismiss on a narrow screen, without hiding, squeezing or breaking the conversation itself.
- **FR-015**: The list MUST be ordered with the most recently used conversation first and grouped by how recently each was used (today, yesterday, the previous seven days, older).
- **FR-016**: Each list entry MUST show the conversation's title and an indication of when it was last used, and the conversation currently open MUST be visibly distinguished from the others.
- **FR-017**: Selecting a conversation MUST display its full thread and MUST make that conversation the context for the next question, so the next answer reflects that conversation's earlier exchange and shows no awareness of any other conversation.
- **FR-018**: When there are no conversations, the history area MUST show an explicit empty state that tells the user how to begin, rather than a blank panel.
- **FR-019**: Opening a conversation with a long thread MUST show the whole thread, positioned at the most recent exchange, and MUST remain responsive.

**Searching**

- **FR-020**: The system MUST provide a search field in the history area that narrows the list as the user types, with no separate submit step.
- **FR-021**: Search MUST match against conversation titles and against the text of the questions the user asked inside those conversations, and MUST NOT match against the text of the assistant's answers. A conversation is returned when its title or any of its questions contains the term; answer text is outside the search scope.
- **FR-022**: Matching MUST be case-insensitive, MUST work on partial words, and MUST return the same results every time the same term is used.
- **FR-023**: A search that matches nothing MUST show an explicit "no conversations match" state, and clearing the search MUST restore the complete list in its normal order and groupings.
- **FR-024**: Searching MUST NOT create, rename, delete or reorder any conversation and MUST NOT change any conversation's contents.

**Deleting and clearing**

- **FR-025**: Deleting a conversation MUST require explicit confirmation, MUST remove only the chosen conversation, and MUST be permanent — a deleted conversation MUST NOT reappear after a reload or a browser restart.
- **FR-026**: Deleting the conversation that is currently open MUST leave the user viewing another existing conversation or the empty state, and MUST never leave them viewing a deleted conversation.
- **FR-027**: Users MUST be able to remove the entire history in a single confirmed action; the result MUST be the empty history state and MUST persist across a reload.
- **FR-028**: Cancelling or dismissing any confirmation MUST leave all stored data untouched.

**Retention, ownership and privacy**

- **FR-029**: History MUST be kept until the user removes it, with no automatic limit: the application MUST NOT remove, truncate, expire or archive any conversation on its own, whatever the number of conversations or their combined size. History shrinks only through the user's own delete and clear-all actions, and the only behaviour when the device can no longer accept data is FR-031.
- **FR-030**: Stored history belongs to the signed-in identity that created it and is held on the device that identity is using: an identity sees only its own conversations, nothing leaves the device, and history is never visible to a different identity using the same browser.
- **FR-031**: When the device can no longer accept stored data, the session MUST continue to work in memory, the user MUST be informed once in a non-blocking way, and previously saved conversations MUST NOT be damaged by the failed save.
- **FR-032**: The history feature MUST NOT transmit stored conversations anywhere outside the user's own environment, and MUST NOT make stored conversations visible to another person using the same browser profile.

**Robustness**

- **FR-033**: When the browser refuses to store site data (private window, restricted policy, disabled storage), the assistant MUST remain fully usable for the session and the user MUST be told once, without a blocking dialog, that conversations will not be remembered.
- **FR-034**: When stored history cannot be read or is malformed, the assistant MUST open with an empty history, without crashing and without a broken page.
- **FR-035**: When part of the stored history is valid and part is not, the valid conversations MUST be shown and the invalid ones dropped, with no error surfaced to the user.
- **FR-036**: No failure of the history feature MUST prevent a user from asking a question or receiving an answer.

**Preserving existing behaviour**

- **FR-037**: Every behaviour the Database AI Assistant has today MUST be unchanged by this feature: the answer appearing progressively as it is produced, stopping an answer in progress, an error rolling the unanswered question back into the input so it can be retried, follow-up suggestions, suggested starter questions on an empty conversation, the provider/model indication, copy-to-clipboard on an answer, and the rendering of formatted text and code blocks.
- **FR-038**: Every string this feature adds MUST come from the application's existing localisation mechanism and MUST be available in both English and Vietnamese; no user-facing text may be fixed in one language.
- **FR-039**: The history interface MUST follow the application's existing design system — spacing, typography, controls, icons and the dark/light theme — and MUST NOT introduce a separate visual style.
- **FR-040**: Every history control MUST be reachable and operable by keyboard, with visible focus and an accessible name, and confirmations MUST be operable without a pointer.
- **FR-041**: A guest session MUST still be refused the assistant's answer step exactly as it is today; the history feature MUST NOT expose, enable or hint at a way around that refusal.

**Replaceability of storage (explicit constraint from the request)**

- **FR-042**: The way history is stored MUST sit behind a single replaceable mechanism that the assistant's interface does not depend on, so that a server-backed history can later take the place of on-device storage without changing any user-visible behaviour of the assistant. No part of the assistant's presentation or conversation logic may assume where history lives.
- **FR-043**: History MUST follow the identity lifecycle without user effort: signing out hides every conversation, signing back in as the same identity restores that identity's conversations unchanged, and signing in as a different identity shows only that identity's conversations. A conversation with no owning identity — including anything attempted during a guest or signed-out session — MUST NOT appear in any identity's history, and conversations are never merged across identities.

### Key Entities *(include if feature involves data)*

- **Conversation**: one self-contained question-and-answer thread. Carries its own identity, the signed-in identity that owns it (FR-030, FR-043), a title (auto-derived or given by the user, and whether it was renamed), the messages that belong to it, when it was created, and when it was last used. Its identity is independent of its title and of its position in any list.
- **Message**: a single contribution inside one conversation — either a question from the user or an answer from the assistant. Carries its content, who produced it, when it was produced, and, for an answer, the accompanying details shown beside it today (the source labels from manual grounding, whether grounding was used, and which model/provider produced it). An answer that never completed is not a message.
- **History**: the user's collection of conversations, together with which conversation was active last. It can be empty, and it is the unit that is loaded when the assistant opens and updated when a conversation changes.
- **Recency group**: the label a conversation falls under in the list (today, yesterday, previous seven days, older), derived from when it was last used. Groups exist only for presentation and are not stored per conversation.
- **Search query**: the user's current filter text and the resulting subset of the history. It is transient — it is never stored and never changes any conversation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of completed question-and-answer pairs from a session are still present, in order, after the page is reloaded and after the browser is closed and reopened — verified by counting pairs before and after.
- **SC-002**: A returning user is looking at their most recent conversation on opening the assistant with zero clicks, and reaches any other saved conversation in at most two clicks (open history if needed, select it).
- **SC-003**: A user can locate one specific conversation among 50 saved conversations in under 10 seconds using the search field, without scrolling the list.
- **SC-004**: With 200 saved conversations, the list is filtered within 1 second of the user finishing typing, and the history panel opens within 1 second.
- **SC-005**: A conversation containing 100 messages is displayed in full, scrolled to the latest exchange, within 2 seconds of being selected.
- **SC-006**: A follow-up question asked in a conversation that was reopened after a browser restart produces an answer that accounts for the earlier exchange — verified by asking a question that only makes sense given that exchange and confirming the answer is not a generic reply.
- **SC-007**: Zero stored answers are partial: after stopping, interrupting or failing 10 answers in a row and reloading, the history contains none of them and each of the 10 questions is available to ask again.
- **SC-008**: Saving activity happens at most once per completed answer and never during streaming — verified by observing that the answer appears progressively with no storage work between the first and last fragment.
- **SC-009**: With site storage blocked, 100% of questions still receive answers, the user sees at most one non-blocking notice per session, and no blocking dialog or error page appears.
- **SC-010**: With stored history deliberately corrupted, the assistant still opens and answers questions in 100% of attempts, showing an empty history rather than an error.
- **SC-011**: A deleted conversation reappears in 0% of reloads and browser restarts; a cleared history stays empty in 100% of them.
- **SC-012**: 100% of the strings this feature adds change when the interface language is switched between English and Vietnamese — zero strings stay in one language.
- **SC-013**: 100% of history controls are reachable and operable with the keyboard alone, including confirming a deletion, verified by completing every history action without a pointer.
- **SC-014**: On a narrow screen, opening and closing the history panel leaves the current conversation fully readable and usable in 100% of cases, in both the dark and the light theme.
- **SC-015**: Zero regressions in the assistant's existing behaviour: every behaviour listed in FR-037 still works exactly as before, and every existing automated test covering the assistant still passes without its intent being changed.
- **SC-016**: A guest session is refused the assistant's answer step in 100% of attempts, with the history panel present or absent making no difference to that outcome.
- **SC-017**: A second identity signing in on the same browser sees 0 of the first identity's conversations, and the first identity sees 100% of its own conversations restored after signing back in.
- **SC-018**: The application itself removes 0 conversations: a history grown to 200 conversations and left untouched across page reloads and a browser restart still contains all 200, in the same order.
- **SC-019**: Search scope is exact: a term appearing in a conversation's title or in one of its questions returns that conversation in 100% of attempts, and a term appearing only inside an answer returns it in 0% of attempts.

## Assumptions

Reasonable defaults chosen where the request did not state a detail. Each is a decision the reviewer can overturn without restructuring the feature.

**Scope**

- History applies to the Database AI Assistant page only. The AI Docs Consultant chat, the Smart SQL Editor's follow-up chat and the AI SQL Explainer each have their own lifecycle and are out of scope for this release, even though they look similar.
- Out of scope for this release: exporting, sharing or printing a conversation; pinning, archiving, folders or tags; editing or regenerating an individual message; branching a conversation; cross-device synchronisation; server-side storage.
- There is nothing to migrate. Today's thread is never written down, so every user starts with an empty history when this ships.

**Decisions settled by clarification**

- Ownership is settled (see Clarifications, 2026-09-28): history belongs to the signed-in identity and stays on that identity's device; nothing leaves the device and nothing follows the user to another machine in this release.
- Retention is settled (see Clarifications, 2026-09-28): unlimited and purely user-managed — nothing is removed automatically, and the pressure valve is the user's own delete and clear-all actions plus the storage-full behaviour in FR-031.
- Search scope is settled (see Clarifications, 2026-09-28): conversation titles and the text of the questions inside them, because that is what a user remembers typing. Answers are excluded, and can be added later without changing anything the user sees.

**Behavioural defaults**

- The control that clears the thread today becomes "start a new conversation". It stops being destructive, because starting a new conversation no longer loses anything.
- Recency groups are today, yesterday, the previous seven days, and older, derived from the device's own clock; a device with a wrong clock produces a wrong group but never a wrong relative order.
- A conversation moves to the top of the list when a question is sent in it or an answer completes in it, and also when the user opens it.
- Title derivation takes the first question, trims and collapses whitespace, and cuts at a word boundary at around 50 characters with an ellipsis. A question that cannot produce a usable title falls back to a localised placeholder rather than a blank entry.
- Titles are stored in the language the question was asked in. Changing the interface language changes the labels of the history interface, not the text of stored conversations.
- Deletion is permanent with no undo; an explicit confirmation is assumed to be sufficient protection.
- Follow-up suggestion chips and suggested starter questions stay transient: reopening a conversation shows the thread, not the chips.
- Answer details kept with a stored answer (source labels, whether grounding was used, which model produced it) are display history only. Reopening does not re-run retrieval, does not re-verify that the sources still exist, and does not change the user's configured provider or dialect.
- With two tabs open, the last completed save wins; no merging of concurrent edits is attempted.
- A history failure is reported once, non-blockingly, and never repeated on every action.

**Environment and dependencies**

- The browser supports the same on-device persistence the application already relies on for user settings; no new environment capability is required.
- Depends on the existing Database AI Assistant page and its streaming question/answer service, including manual grounding and the source labels it produces.
- Depends on the existing English and Vietnamese localisation files, the existing theme and design system, and the existing icon set.
- Depends on the guest-capability gating delivered by feature `013-guest-access-mode`, and on the signed-in identity supplied by feature `005-oauth-social-login`, which is what history is partitioned by (FR-030, FR-043); under `013` a guest cannot ask the assistant anything, so a guest's history is empty by construction and the history panel must simply render harmlessly beside the refusal notice.
- Verification uses the application's existing automated test setup; "no regression" (SC-015) means the existing assistant tests still pass with their intent unchanged.

## Appendix: Implementation Constraints Carried Over From the Request

The source document (`docs/ui-prompts/20260920/database-ai-assistant-chat-history.prompt.md`) is a technical brief and fixes several implementation decisions up front. They are recorded here so `/speckit-plan` inherits them instead of re-deriving them, and so the requirement sections above stay free of technology. Where one of these conflicts with a requirement above, the requirement wins and the conflict must be raised rather than resolved silently.

- **Storage boundary**: history is stored in the browser under one centralised storage key (`sql-visualizer:database-ai-assistant:chat-history`), not one key per conversation (FR-013, FR-042). **Conflict raised by clarification**: FR-030 and FR-043 require history to be partitioned per signed-in identity, so one fixed key cannot hold every identity's conversations in a single undifferentiated pool. The requirement wins: the key must carry the owning identity.
- **Replaceable storage**: all reading and writing goes through a single history-storage contract, with a browser-local implementation now and a server-backed one later; no storage call may appear in the assistant's presentation code (FR-042).
- **Conversation identity**: produced by a reliable unique-identifier generator, never an array index (FR-002).
- **Titles**: produced by a deterministic, free helper from the first user message; never by a model call (FR-003, FR-004).
- **Write discipline**: write on conversation creation, question sent, answer completed, title change and deletion; never per streamed fragment and never per keystroke (FR-008, FR-013).
- **State management**: conversation state belongs in the application's existing client state store, replacing the assistant's current in-memory thread rather than duplicating it.
- **Data shape**: conversation and message records carry the fields named in Key Entities, including a version marker so a future server-backed history can reconcile; the request explicitly warns against over-engineering this shape.
- **Presentation**: sidebar plus chat on a wide screen, a dismissible drawer plus chat on a narrow one, built from existing components, styles, icons, theme and localisation (FR-014, FR-038, FR-039).
- **Verification**: unit coverage for the storage contract (save, load, get, delete, rename, search, corrupted data, missing storage, quota exceeded), for the helpers (title derivation, ordering, validation), for the conversation state transitions (create, switch, add question, add answer, rename, delete, restore), and regression coverage for the assistant's existing behaviour (request, streaming, grounding retrieval, source labels, dialect handling, follow-up continuity) using the project's existing test runner (SC-015).
- **File placement**: the request suggests a location for the new modules but explicitly defers to the repository's existing architecture; `/speckit-plan` decides placement from what is already there.

**Local note for planning**: the request names a presentation file (`DatabaseAIChat.tsx`) that does not exist under that name here. The Database AI Assistant page is implemented at `src/app/database-ai-assistant/components/DatabaseAIAssistantContent.tsx`, its streaming service at `src/lib/ai/databaseAssistant.ts`, and its in-memory thread lives in `src/lib/store.ts` as `databaseAssistantHistory` with `resetDatabaseAssistantChat` as today's destructive "new chat". The "no storage calls in presentation code" constraint applies to those files.

---
