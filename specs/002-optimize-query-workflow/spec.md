# Feature Specification: Optimize Query Workflow Redesign

**Feature Branch**: `002-optimize-query-workflow`

**Created**: 2026-09-08

**Status**: Draft

**Input**: User description: "tôi muốn thay đổi tính năng optimise query bằng các ý sau:
- Chuyển tất cả thông tin phân tích sang modal popup để hiển thị nội dung chi tiết
- Cho phép người dùng optimise câu query bằng ngôn ngữ tự nhiên, nhưng bắt buộc AI phải hiểu ý nghĩa của câu query và tuyệt đối không tự ý thay đổi ngữ nghĩa của câu truy vấn
- Phải có bước xác nhận, trước khi thực hiện thay đổi
- Sự thay đổi phải được hiển thị trên Editor ngay tức khác và phải ở trạng thái compare trước và sau khi thay đổi"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review optimization analysis in a focused modal (Priority: P1)

A developer runs "Analyze & Optimize" on their query and, instead of scanning a long inline panel embedded in the editor page, sees the semantic brief, structural warnings, suggestions, and proposal list gathered into a single modal popup that they can open, read in detail, and dismiss without losing their place in the editor.

**Why this priority**: This is the structural container for every other change in this feature — the natural-language instruction input, the confirmation step, and the resulting diff all need a stable place to live. Without the modal, the rest of the flow has nowhere consistent to render.

**Independent Test**: Trigger an optimization on any analyzed query and confirm all analysis output (semantic brief, regression warnings, suggestions, proposals) renders inside a single modal dialog, is fully readable, and can be closed without discarding the underlying analysis result.

**Acceptance Scenarios**:

1. **Given** an analyzed query in the Smart SQL Editor, **When** the user requests optimization, **Then** a modal popup opens and displays the optimization analysis (semantic brief, suggestions, proposals, structural warnings) instead of an inline panel.
2. **Given** the optimization modal is open, **When** the user closes it (via close button, backdrop, or Escape), **Then** the editor returns to its normal state and no partially-applied change is left on the query.
3. **Given** the optimization modal is open and streaming is in progress, **When** new content arrives, **Then** the modal updates incrementally in place, without the editor page layout shifting behind it.
4. **Given** the optimization modal is open, **When** the user reopens it after closing (without re-running optimization), **Then** the last analysis result is still available for review.

---

### User Story 2 - Optimize using a natural-language instruction without changing meaning (Priority: P1)

A developer types a free-form instruction (e.g., "make this faster by avoiding a full table scan" or "chỉ cần rút gọn CTE không cần thiết") describing what they want optimized, in their own words, instead of relying only on the automatic linting-driven optimization. The AI must first demonstrate it understands the query's purpose, tables, joins, and filters, and must never change what the query returns as a result of applying the instruction.

**Why this priority**: This is the core new capability requested — turning the optimizer from a fixed automatic pass into a directed, user-controlled one — and it carries the highest risk (silent semantic drift), so it must be delivered with the meaning-preservation guarantee built in from the start.

**Independent Test**: Provide a natural-language instruction against a known query, confirm the AI's semantic brief (purpose, relationships, critical filters) reflects the query correctly before any rewrite is produced, and confirm the resulting optimized query returns the same logical result set (same tables, same join semantics, same filters, same output columns) as the original.

**Acceptance Scenarios**:

1. **Given** an analyzed query, **When** the user types a natural-language optimization instruction, **Then** the system first produces a semantic brief describing the query's purpose, table relationships, and critical filters for the user to review before any SQL rewrite begins.
2. **Given** a natural-language instruction that would require altering the query's result set (e.g., removing a filter, changing a JOIN type in a way that changes row inclusion, dropping an output column) to satisfy literally, **When** the AI processes it, **Then** the system refuses to apply the semantics-changing part, explains why, and offers only the semantics-preserving portion of the request (or no change) instead of silently rewriting the query's meaning.
3. **Given** an optimized query is produced from a natural-language instruction, **When** the structural regression check runs, **Then** it verifies that tables, join identities, join types, filter conditions, and output columns match the original query, and surfaces a warning if any of them changed.
4. **Given** the user's natural-language instruction is ambiguous or contradicts the query's evident purpose, **When** the AI responds, **Then** it asks for clarification or states its interpretation explicitly instead of guessing silently.

---

### User Story 3 - Confirm before any change is applied (Priority: P1)

After reviewing the optimization analysis and the proposed rewritten query, the developer must take an explicit confirmation action before the optimized SQL replaces their original query in the editor. Nothing is applied automatically just because a result finished streaming.

**Why this priority**: This is the safety gate that makes the natural-language optimization and the semantic-preservation guarantee trustworthy — without an explicit confirmation step, a subtly wrong rewrite could overwrite the user's working query before they finish reading it.

**Independent Test**: Run an optimization to completion, confirm the editor's original query is untouched until the user clicks the explicit "Apply"/"Confirm" action inside the modal, and confirm dismissing the modal or clicking "Discard" leaves the original query fully intact.

**Acceptance Scenarios**:

1. **Given** an optimization result (automatic or natural-language instructed) has finished streaming, **When** the result is displayed, **Then** the original query in the editor remains unchanged until the user explicitly confirms applying it.
2. **Given** the optimization modal shows a completed proposal, **When** the user clicks "Apply"/"Confirm", **Then** the optimized query replaces the editor content and the modal reflects the applied state.
3. **Given** the optimization modal shows a completed proposal, **When** the user clicks "Discard"/"Cancel" or closes the modal without confirming, **Then** the editor query is unaffected and the discarded result is not silently reused later.
4. **Given** structural regression warnings were raised for a proposal, **When** the user reaches the confirmation step, **Then** those warnings are visible alongside the confirm action so the decision to apply is informed.

---

### User Story 4 - See an immediate before/after comparison in the editor (Priority: P2)

Once the developer confirms an optimization, the change must be reflected in the editor right away, shown as a compare (diff) view contrasting the original query against the optimized one, so the developer can see exactly what changed without manually copying queries elsewhere.

**Why this priority**: This closes the loop after confirmation — it is the visible proof that the applied change is what was reviewed, and it depends on User Story 3's confirmation step existing first.

**Independent Test**: Confirm an optimization result and verify the editor immediately switches to (or already offers) a diff view showing the pre-optimization query on one side and the post-optimization query on the other, with no extra navigation step required.

**Acceptance Scenarios**:

1. **Given** the user confirms an optimization proposal, **When** the confirmation completes, **Then** the editor automatically enters compare/diff mode showing the original query and the newly applied query side by side.
2. **Given** the editor is in compare/diff mode after a confirmed optimization, **When** the user inspects it, **Then** changed lines are visually distinguished (added/removed/modified) consistent with the existing diff viewer used elsewhere in the editor.
3. **Given** the user wants to keep working, **When** they exit compare/diff mode, **Then** the editor retains the applied (optimized) query as the active query going forward.

---

### Edge Cases

- What happens when the user submits a natural-language instruction while a previous optimization is still streaming? The system must prevent overlapping runs (queue, block, or explicitly cancel the previous one) rather than mixing two results.
- How does the system handle a natural-language instruction with no SQL-actionable content (e.g., off-topic text)? It must state that no relevant optimization was found rather than fabricating an unrelated proposal.
- What happens when the AI's proposed optimized SQL fails to re-parse (invalid SQL)? The system must reject it before it reaches the confirmation step, explain the failure, and not offer it as an applicable proposal.
- What happens if the user closes the modal mid-stream? The in-flight AI request must be aborted and no partial/incomplete SQL may be confirmable afterward.
- What happens when structural regression warnings indicate the semantics changed despite the AI's own explanation? The confirm step must still surface those warnings; the user may still choose to apply, but must not be able to miss them.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST present all optimization analysis content (semantic brief, suggestions, structural warnings, and proposals) inside a single modal popup rather than an inline page panel.
- **FR-002**: The system MUST allow the user to enter a free-form natural-language instruction describing the desired optimization, in addition to (or instead of) the existing automatic lint-driven optimization trigger.
- **FR-003**: Before producing any rewritten SQL, the system MUST generate and display a semantic brief (purpose, table relationships, critical filters) derived from the original query, grounded in the parser's verified facts.
- **FR-004**: The system MUST NOT apply any change that alters the query's result semantics (tables referenced, join identities, join types affecting row inclusion, filter conditions, or output columns) as a side effect of fulfilling a natural-language instruction, even if the instruction's literal wording would imply such a change.
- **FR-005**: When a natural-language instruction cannot be fulfilled without changing semantics, the system MUST refuse the semantics-changing portion, explain why, and offer only a semantics-preserving alternative or no change.
- **FR-006**: The system MUST run a structural regression check on every AI-produced proposal (natural-language or automatic) comparing tables, joins, join types, filters, and output columns against the original query, and surface any detected mismatch as a visible warning.
- **FR-007**: The system MUST require an explicit user confirmation action before any AI-optimized SQL replaces the query in the editor; no optimized SQL may be auto-applied on stream completion.
- **FR-008**: The system MUST let the user discard/cancel a completed optimization proposal without altering the editor's current query.
- **FR-009**: Upon confirmation, the system MUST immediately update the editor's active query and enter a compare/diff view showing the original query against the optimized query.
- **FR-010**: The compare/diff view MUST visually distinguish added, removed, and modified lines between the original and optimized query.
- **FR-011**: The system MUST prevent concurrent optimization runs against the same query (a new instruction may not be submitted while a previous run is still streaming, unless the previous run is explicitly cancelled first).
- **FR-012**: The system MUST reject an AI-proposed optimized query that fails to parse and MUST NOT present it as a confirmable proposal.
- **FR-013**: Closing the modal while a request is in flight MUST abort that request and MUST NOT leave a partial result available for confirmation afterward.

### Key Entities

- **Optimization Session**: Represents one optimize run — its trigger (automatic lint-driven or natural-language instruction), its semantic brief, its resulting proposal(s), its structural regression warnings, and its confirmation state (pending / applied / discarded).
- **Semantic Brief**: The AI-generated, parser-grounded description of a query's purpose, table relationships, and critical filters, produced before any rewrite and shown to the user for review.
- **Optimization Proposal**: A candidate optimized SQL statement plus its explanation/suggestions, tied to the Optimization Session that produced it, eligible for confirmation only while valid (parses successfully, no unresolved semantic conflict).
- **Structural Regression Warning**: A specific, named mismatch (table, join identity, join type, filter, or output column) detected between the original and optimized query.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of optimization runs (automatic or natural-language) present their analysis exclusively inside the modal popup, with no analysis content rendered in the surrounding page outside the modal.
- **SC-002**: 100% of AI-proposed optimizations that would change query semantics (tables, joins, join types, filters, or output columns) are either blocked from reaching the confirmation step or flagged with a visible structural regression warning at that step.
- **SC-003**: 0% of AI-optimized queries replace the editor content without a prior explicit user confirmation action.
- **SC-004**: 100% of confirmed optimizations result in the editor showing a before/after compare view immediately, with no additional user navigation required to see the diff.
- **SC-005**: Users can express an optimization goal in natural language and receive either an applicable proposal or a clear refusal/clarification, without needing to know the underlying automatic lint rules.

## Assumptions

- This feature revises the existing "Analyze & Optimize" capability in the Smart SQL Editor; it does not introduce a new page or a separate entry point.
- The existing semantic brief, structural regression check, and diff editor building blocks are reused and reorganized rather than rebuilt from scratch.
- Natural-language instructions are provided in the user's chosen locale (English or Vietnamese) matching the app's existing i18n support.
- "Semantics" for the meaning-preservation guarantee is scoped to what the local parser already verifies (tables, joins, join types, filter conditions, output columns/aliases) — not full formal query-equivalence proof across all edge cases (e.g., NULL-handling subtleties in exotic dialect-specific functions).
- The compare/diff view reuses the existing Monaco `DiffEditor` already used elsewhere in the editor, rather than introducing a new diff UI.
