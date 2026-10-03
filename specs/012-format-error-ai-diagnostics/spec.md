# Feature Specification: SQL Format Error Diagnostics with AI

**Feature Branch**: `duyvt7` (existing working branch; no new branch created by this command)

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "Ở trang SQL Editor có chức năng định dạng/ Format. Khi click vào, nếu định dạng đúng thì mọi chức năng hiện tại vẫn giữ nguyên không thay đổi, nhưng ngược lại nếu định dạng/ Format gây ra lỗi, tôi không muốn lỗi chỉ được hiển thị bằng toast nữa, mà nên hiển thị nó như một trình báo lỗi chuyên nghiệp ở 1 section khác, section này nên được toggle (open & close) ở phía bên phải màn hình. Có hỗ trợ thêm tính năng giải thích lỗi và nguyên nhân gây ra lỗi và sửa lỗi bằng AI (chạy bằng local ollama)."

## Clarifications

### Session 2026-09-23

- Q: When the AI proposes a fix for a formatting error, should it change only the smallest part needed to correct the syntax while keeping the query's meaning and structure intact, or may it rewrite or restructure the query? → A: Minimal syntax-only fix — correct only the offending syntax; keep every clause, column, and ordering unchanged.
- Q: If the user edits the SQL after requesting a fix (so the proposal is based on outdated SQL), what should happen when they apply it? → A: Flag the proposal as stale and require the user to re-request a fix against the current SQL.
- Q: How should the proposed fix be displayed for the review-before-apply step? → A: Side-by-side before/after comparison of the original and corrected SQL.

### Session 2026-09-25

- Q: When a user applies an AI-proposed fix, how should the system determine and replace only the erroneous part of the SQL? → A: Use the captured format error's location (`FormatError.location`) as the replacement boundary; only the SQL inside that range is replaced and every part of the query outside it is left unchanged.
- Q: What should happen when the AI-proposed fix also changes SQL outside the captured error location? → A: Block the apply — leave the editor untouched, report in the panel that the proposal reaches beyond the error location, and offer to request a corrected proposal.
- Q: How should the erroneous region be determined when the formatter reports no error position? → A: Fall back to the AST cross-check parser to identify the region and ground the AI request with it; if no error region can be determined from either source, do not allow applying a fix — report that the region cannot be determined and offer to request a new proposal.
- Q: May the explanation and fix requests go directly from the browser to the local model endpoint, or must every request be server-side? → A: A direct on-device call to the local model is allowed; what matters is that these requests never require, store, or expose a browser-held credential.
- Q: Must the AI explanation in the panel be delivered in parts (streaming) to satisfy Constitution §III? → A: No — the explanation and the fix are returned as one complete response with explicit loading states; this is a deliberate deviation, and raising the §III update is tracked outside this feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Format errors surface in a toggleable error panel (Priority: P1)

A user clicks **Format** on SQL the formatter cannot parse. Instead of only a transient toast, a professional error report opens in a dedicated panel on the right side of the screen, showing what went wrong and where, and staying available until the user dismisses or closes it.

**Why this priority**: This is the requested behavior change. It turns an easy-to-miss, transient notification into a persistent, readable diagnostic — the core value of the feature. Every later story builds on the error being captured and surfaced here.

**Independent Test**: Paste syntactically broken SQL, click **Format**, and confirm the right-side panel opens with the error details and can be toggled open/closed. No AI is required to deliver this value.

**Acceptance Scenarios**:

1. **Given** valid SQL in the editor, **When** the user clicks **Format**, **Then** the SQL is formatted and no error panel appears (existing success behavior is unchanged).
2. **Given** invalid SQL in the editor, **When** the user clicks **Format**, **Then** the right-side error panel opens with the format error, and the editor's SQL is left unchanged (no partial or corrupted output).
3. **Given** the error panel is open, **When** the user clicks the close/toggle control, **Then** the panel closes; clicking the control again reopens it with the error still available.
4. **Given** a format error that includes a detectable position, **When** the panel renders the error, **Then** the location and a relevant SQL snippet are shown so the user can find the problem without scanning the whole query.

---

### User Story 2 - AI explains the error and its root cause (Priority: P2)

From the error panel, a user can request an explanation. A local AI model explains, in plain language, what the error is and why it happened, grounded in the actual SQL and the actual error message.

**Why this priority**: It upgrades the diagnostic from "what went wrong" to "why it went wrong", which is what lets non-experts and developers resolve the problem quickly. It depends on Story 1 having captured the error, but is otherwise self-contained.

**Independent Test**: With a local model running, trigger a format error and request an explanation; a grounded, plain-language explanation appears in the panel. With no model available, a clear unavailable/retry state appears instead of a silent failure.

**Acceptance Scenarios**:

1. **Given** a format error and a running local model, **When** the user requests an explanation, **Then** the panel shows a plain-language explanation of the error and its root cause.
2. **Given** a completed explanation, **When** it is read, **Then** it references the actual offending SQL and error (grounded in the formatter's findings), not generic advice.
3. **Given** the local model is unavailable or the request times out, **When** the user requests an explanation, **Then** the panel shows a clear, actionable unavailable/retry state with no silent failure.

---

### User Story 3 - AI proposes a fix the user can review and apply (Priority: P3)

From the error panel, a user can request a corrected version of the SQL. The local AI returns a proposed fix that the user reviews and explicitly applies; the applied SQL re-formats without error.

**Why this priority**: It closes the loop from diagnosis to resolution. It is lower priority than explanation because it must never silently rewrite the user's query — a review-before-apply gate is a required safeguard.

**Independent Test**: Trigger a format error, request a fix, review the proposed change, and apply it; the editor shows the corrected SQL and a subsequent **Format** succeeds. Dismissing the proposal leaves the original SQL untouched.

**Acceptance Scenarios**:

1. **Given** a format error, **When** the user requests a fix, **Then** the panel shows the proposed corrected SQL side-by-side with the original (before/after) for review before applying.
2. **Given** a proposed fix, **When** the user applies it, **Then** only the SQL inside the captured error's location is replaced with the corrected version, every part of the query outside that location stays unchanged, and re-formatting the result succeeds.
3. **Given** a proposed fix, **When** the user dismisses it, **Then** the original SQL in the editor is untouched.
4. **Given** a proposed fix that also changes SQL outside the captured error location, **When** the user tries to apply it, **Then** the editor's SQL is left unchanged, the panel reports that the proposal reaches beyond the error location, and the user is offered a corrected proposal.

---

### Edge Cases

- What happens when the formatter reports an error with no location/position information? The panel shows the message without a position or snippet; the "where" fields are omitted rather than showing fabricated values.
- What happens when the SQL is empty? The existing empty-query guard remains a simple validation message and is not treated as a format-error panel case.
- What happens when the user closes the panel while an AI request is in flight? The request is cancelled or completes in the background; reopening the panel reflects the latest state without duplicated or stale results.
- What happens when the local AI is not running, the model is not installed, or the request times out? A clear, actionable unavailable state with a retry affordance is shown; no cloud provider is silently invoked and no SQL leaves the device.
- What happens when the AI proposes a fix that still fails to format? The panel indicates the proposal is invalid or incomplete and offers a retry; the editor is not modified.
- What happens with very large or sensitive SQL? The explanation and fix requests are sent only to the local model; no SQL leaves the device during this feature.
- What happens after a failed format when the user formats again with the same broken SQL? The panel reopens/refreshes with the latest error, replacing the previous one.
- What happens when the user edits the SQL after a fix proposal is generated but before applying it? The proposal is flagged as stale and must be re-requested against the current SQL; it is never applied over newer edits.
- What happens when the proposed fix also changes SQL outside the captured error location? The change is rejected: the editor is left untouched, the panel states that the proposal reaches beyond the error location, and a retry affordance is offered.
- What happens when neither the formatter nor the AST cross-check parser can point at the erroneous region? The panel states that the region cannot be determined, offers to request a new proposal, and no proposal can be applied (a proposal becomes applicable only once a bounded region exists, per FR-017).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST leave all existing behavior unchanged when **Format** succeeds (formatted SQL applied, success confirmation, and no error panel).
- **FR-002**: System MUST, when **Format** fails, capture a structured format error containing at minimum a human-readable message, the SQL dialect in use, and the offending SQL (or a relevant snippet); when the formatter provides one, also the error location (line/column or character offset).
- **FR-003**: System MUST display format errors in a dedicated error panel on the right side of the screen rather than only a transient toast.
- **FR-004**: The error panel MUST be toggleable (open and close) by the user.
- **FR-005**: System MUST leave the editor's SQL unchanged when formatting fails (no partial or corrupted output).
- **FR-006**: The error panel MUST present the error in a professional, readable form: a summary, the message, the location (when available), and a severity indicator.
- **FR-007**: Users MUST be able to request an AI explanation of the error and its root cause from the error panel.
- **FR-008**: The AI explanation MUST be grounded in the actual SQL and the actual error; it MUST NOT contradict the formatter's reported error.
- **FR-009**: Users MUST be able to request an AI-proposed fix (corrected SQL) from the error panel.
- **FR-010**: The AI fix MUST be review-before-apply: the corrected SQL is shown side-by-side with the original (before/after) and applied only on explicit user confirmation.
- **FR-011**: The AI explanation and fix MUST run through the local model (Ollama); the request MAY be sent directly from the browser to the local model endpoint, and the system MUST NOT require, store, or expose any browser-held credential for these requests.
- **FR-012**: System MUST surface clear loading, success, error, and unavailable states for explanation and fix requests (no silent failures).
- **FR-013**: When the local AI is unavailable, the system MUST present an actionable unavailable state (for example, a retry affordance) instead of failing silently.
- **FR-014**: System MUST NOT transmit the user's SQL to any remote service as part of explanation or fix generation in this feature.
- **FR-015**: System MUST constrain an AI-proposed fix to a minimal, semantics-preserving correction: it changes only the offending syntax and keeps every clause, column, and their ordering unchanged.
- **FR-016**: System MUST flag an AI fix proposal as stale when the editor's SQL changes after the proposal is generated, and MUST NOT apply a stale proposal.
- **FR-017**: When a user applies an AI fix proposal, the system MUST replace only the SQL inside the contiguous range identified by the captured format error's location (`FormatError.location` — character offset, or line/column resolved to a range) and MUST leave every character of the query outside that range unchanged.
- **FR-018**: When an AI fix proposal changes any SQL outside the captured format error's location, the system MUST NOT apply it, MUST leave the editor's SQL unchanged, and MUST report the out-of-range change in the panel with an affordance to request a corrected proposal.
- **FR-019**: When the captured format error has no position, the system MUST identify the erroneous region with the AST cross-check parser, use it as the replacement boundary, and include its findings in the AI request so the proposal is grounded in parser evidence.
- **FR-020**: When no erroneous region can be determined from either the formatter or the AST cross-check parser, the system MUST NOT offer an applicable fix, MUST report in the panel that the erroneous region cannot be determined, and MUST offer to request a new proposal.
- **FR-021**: The explanation and the fix proposal MUST be delivered as a single complete response rather than in parts, and the panel MUST convey progress through explicit loading states without reloading the page.

### Key Entities

- **Format Error**: represents a failed formatting attempt. Attributes: human-readable message, SQL dialect, source SQL or snippet, optional location (line/column or character offset), severity, and timestamp.
- **AI Diagnosis**: represents the model's explanation of an error. Attributes: reference to the originating error, plain-language explanation, root cause, the SQL/error evidence it cites (grounding), status (loading / ready / unavailable), and timestamp.
- **AI Fix Proposal**: represents a corrected SQL suggestion. Attributes: original SQL, proposed SQL, applied range (the captured error location used as the replacement boundary, recorded when applied), status (pending / applied / dismissed), and timestamp.
- **Error Panel State**: represents the panel's UI state. Attributes: open/closed, the selected error (when more than one is shown), and the active explanation/fix request state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When **Format** fails, the error panel opens with the diagnostic within 1 second of the click (excluding any AI request time).
- **SC-002**: When **Format** succeeds, behavior is unchanged, with zero regressions to the existing formatting success flow.
- **SC-003**: When a format error carries a position, the panel shows that position and a matching SQL snippet, so the offending text can be found from the panel without re-reading the whole query (verified by the panel's location/snippet rendering test).
- **SC-004**: A plain-language explanation of a typical format error is returned within 30 seconds on a local machine.
- **SC-005**: Measured over the per-dialect broken-SQL corpus in `tests/fixtures/format-error/` (built by task T033) with the local model, the **first** fix proposal re-formats successfully for at least 70% of corpus cases. Until that measurement harness exists this criterion is explicitly **unverified** and MUST NOT be reported as met.
- **SC-006**: The locate → understand → fix path is available inside the Smart SQL Editor without leaving the page. *(The satisfaction rating carried by an earlier draft of this criterion — 4 out of 5 — is a post-launch usability metric, tracked outside this feature and not asserted by the test suite.)*
- **SC-007**: No user SQL is transmitted off the user's machine during explanation or fix generation.

## Assumptions

- Scope for v1 is the local model (Ollama) only; cloud providers (OpenAI, Anthropic, Gemini) are out of scope for explanation and fix, even though the underlying configuration already exists in the app.
- Explanation and fix run on-demand (user-initiated) rather than automatically on every error, to avoid latency and unwanted requests.
- A fix is review-before-apply (never auto-applied), matching safe handling of user-authored SQL.
- The empty-query guard remains a simple validation message and is not treated as a format-error panel case.
- The formatter reports at most one error per attempt (first failure); if the underlying tooling later supports multiple, the panel lists them in order.
- Existing localization (English/Vietnamese) and the dark-theme design system are reused for the new panel and its states.
- Error details reuse the formatter's own error data (message and, where provided, position); when the formatter provides no position, the AST cross-check parser is the fallback source for the error region, and no further parsing is introduced solely to compute error location.
- Privacy is preserved because the feature targets local inference; no SQL is sent to remote services as part of explanation or fix.
- Deliberate deviation: these on-demand diagnostics are not streamed, which is narrower than Constitution §III's streaming expectation for AI explanations; the deviation is accepted here, and raising the §III update is tracked outside this feature.