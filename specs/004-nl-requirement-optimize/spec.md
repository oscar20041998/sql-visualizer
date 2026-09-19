# Feature Specification: Requirement-Driven Query Optimization

**Feature Branch**: `004-nl-requirement-optimize`

**Created**: 2026-09-09

**Status**: Draft

**Input**: User description: "tôi muốn upgrade tính năng optimise query theo ngôn ngữ tự nhiên và cho phép người dùng vừa optimise theo nhập requirement vào để thay đổi yêu cầu vd: 'nếu muốn lấy thêm logic thì refer các table A,B,C nào'. Và cho ra đoạn query mẫu, về tính năng này thì chấp nhận thay đổi ngữ nghĩa nếu như user chấp nhận/ áp dụng. Nhưng vẫn giữ nguyên tính năng optimise query theo alert linting, upgrade thêm một tính năng mới như mô tả trên." (Upgrade the natural-language query optimization feature to also let the user enter a new *requirement* that changes what the query should do — e.g. "if I want extra logic, which of tables A, B, C should it reference?" — and have the system produce a sample candidate query. Unlike the existing optimizer, this new mode is allowed to change the query's meaning, but only if the user reviews and explicitly applies it. The existing lint/alert-driven automatic optimization must keep working unchanged; this is an additional capability.)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Describe a new requirement and get a candidate query (Priority: P1)

A developer has an existing analyzed query and wants to add new logic that the query doesn't currently cover (e.g., "I also need order items from tables A, B, C"). Instead of hand-writing the join/filter logic themselves, they type the requirement in plain language, optionally naming the tables/columns involved, and the system produces a sample candidate query that fulfills the requirement.

**Why this priority**: This is the core new capability being requested — turning a natural-language *requirement* (not just a style/performance instruction) into a working candidate query is what differentiates this feature from the existing optimizer.

**Independent Test**: Given an analyzed query and a typed requirement referencing specific tables, confirm the system returns a candidate query that incorporates those tables/columns and reflects the stated intent, without requiring the user to write SQL by hand.

**Acceptance Scenarios**:

1. **Given** an analyzed query and a requirement such as "add customer loyalty tier, refer to tables A, B, C", **When** the user submits the requirement, **Then** the system returns a sample candidate query that joins/references the named tables to satisfy the requirement.
2. **Given** a requirement that does not name specific tables, **When** the user submits it, **Then** the system infers and proposes candidate tables/columns from the known schema and states which ones it chose.
3. **Given** a requirement that references a table or column that does not exist in the known schema, **When** the user submits it, **Then** the system reports that the referenced table/column cannot be found instead of guessing silently or producing an invalid query.
4. **Given** a produced candidate query, **When** the user reviews it, **Then** the system clearly explains what was added or changed compared to the original query (new tables, new joins, new filters/columns).

---

### User Story 2 - Apply a meaning-changing candidate only after explicit confirmation (Priority: P1)

Because fulfilling a new requirement may legitimately change what the query returns (new columns, new joined rows, different filters), the developer must be able to see that a candidate changes the query's meaning and explicitly decide whether to accept it before it replaces their working query.

**Why this priority**: This is the safety mechanism that makes it acceptable for this feature to break the "never change semantics" rule used by the existing optimizer — without an explicit, informed confirmation step, an unwanted semantic change could silently overwrite the user's query.

**Independent Test**: Submit a requirement that changes query semantics, confirm the system labels the candidate as semantics-changing and lists what changed, confirm the original query is left untouched until the user clicks an explicit "Apply", and confirm "Discard"/closing leaves the original query intact.

**Acceptance Scenarios**:

1. **Given** a candidate query produced from a requirement, **When** the candidate differs from the original in tables, joins, filters, or output columns, **Then** the system flags it as a semantic change and summarizes the differences before any apply action is available.
2. **Given** a flagged candidate query, **When** the user clicks "Apply", **Then** the candidate replaces the editor's query and the change is reflected immediately in the editor.
3. **Given** a flagged candidate query, **When** the user clicks "Discard" or dismisses it without applying, **Then** the original query remains unchanged and the discarded candidate is not silently reused later.
4. **Given** the user has not yet clicked "Apply", **When** they inspect the workflow, **Then** no automatic or background action has already changed the editor query.

---

### User Story 3 - Existing lint/alert-driven optimization keeps working unchanged (Priority: P1)

A developer who only wants the existing automatic, lint/alert-driven query optimization (with its stricter no-semantic-change guarantee) must continue to get that behavior exactly as before — the new requirement-driven, semantics-allowed mode must be a separate, additional path that does not alter or weaken the existing optimizer.

**Why this priority**: Regressing the existing optimizer while adding the new capability would violate the explicit instruction to keep it intact, and would erode trust in the tool's default behavior.

**Independent Test**: Run the existing lint/alert-driven optimize flow on a query before and after this feature ships; confirm identical suggestions, identical semantic-preservation guarantee, and no new confirmation prompts or behavior changes are introduced into that flow.

**Acceptance Scenarios**:

1. **Given** a query with lint/alert findings, **When** the user runs the existing automatic optimization, **Then** it behaves exactly as before this feature was added (same suggestions, same non-semantic-changing guarantee, same UI entry point).
2. **Given** both optimization modes are available, **When** the user chooses the lint/alert-driven mode, **Then** the requirement-driven mode's confirmation/semantic-change UI is not shown.
3. **Given** both optimization modes are available, **When** the user chooses the new requirement-driven mode, **Then** the lint/alert-driven mode's results and behavior are unaffected.

### Edge Cases

- What happens when the requirement text is ambiguous about which of several similarly-named tables to use? The system must ask for clarification or explicitly state its assumption rather than silently pick one.
- What happens when the requirement would require data not reachable from the original query's tables via any known relationship? The system must explain that no valid path was found rather than fabricating a join.
- What happens when the user submits a requirement and then, before applying, edits the original query directly? The stale candidate must not be applied over the newly edited query.
- What happens if the user asks for a requirement that conflicts with existing filters (e.g., "include all statuses" when the query already filters to one status)? The system must surface the conflict as part of the change summary rather than merging them silently.
- What happens when the requirement mode is used on a query that has not yet been analyzed? The system must prompt the user to analyze first, consistent with existing optimizer entry requirements.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a requirement-input mode where the user describes, in natural language, a new data requirement to add to an analyzed query, optionally naming specific candidate tables/columns.
- **FR-002**: The system MUST produce a sample candidate query that attempts to satisfy the stated requirement, using the named tables/columns when provided, or proposing tables/columns from the known schema when not provided.
- **FR-003**: The system MUST report when a requirement references a table or column that cannot be found in the known schema, instead of producing a query with a fabricated reference.
- **FR-004**: The system MUST compare each candidate query against the original and clearly summarize any differences in tables, joins, filter conditions, or output columns.
- **FR-005**: The system MUST label a candidate as a semantic change whenever it alters tables, joins, filters, or output columns relative to the original query.
- **FR-006**: The system MUST NOT replace the editor's query with a candidate automatically; an explicit user "Apply" action is required regardless of whether the candidate is a semantic change.
- **FR-007**: The system MUST allow the user to discard a candidate, leaving the original query fully unchanged and not silently reusing the discarded candidate later.
- **FR-008**: The system MUST keep the existing lint/alert-driven automatic optimization feature and its semantic-preservation guarantee unchanged and available as a separate mode from the requirement-driven mode.
- **FR-009**: The system MUST invalidate a pending candidate if the user directly edits the original query before applying that candidate.
- **FR-010**: The system MUST require that the query has already been analyzed before the requirement-input mode can be used, consistent with the existing optimizer's entry requirements.

### Key Entities

- **Requirement Input**: The user's free-form description of new logic to add, optionally including named tables/columns to reference.
- **Candidate Query**: The sample query generated to satisfy a Requirement Input, associated with the original query it was derived from.
- **Semantic Change Summary**: The set of differences (tables, joins, filters, output columns) between a Candidate Query and the original query, and whether it counts as a semantic change.
- **Optimization Mode**: Either the existing lint/alert-driven automatic mode (semantics preserved) or the new requirement-driven mode (semantics may change, confirmation required).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can enter a plain-language requirement and receive a candidate query without writing SQL themselves.
- **SC-002**: 100% of candidate queries that change tables, joins, filters, or output columns are visibly labeled as a semantic change before the user can apply them.
- **SC-003**: 0% of candidates are applied to the editor without an explicit user confirmation action.
- **SC-004**: The existing lint/alert-driven optimization produces identical results after this feature ships as it did before, for the same input query.
- **SC-005**: Users can tell, without opening extra screens, exactly which tables/columns/filters changed between their original query and a candidate.

## Assumptions

- This feature extends the existing "Optimize Query" workflow (natural-language instruction + confirmation + editor compare view) rather than replacing it; it adds a second, requirement-driven mode alongside the existing semantics-preserving instruction mode and the lint/alert-driven automatic mode.
- "Refer to tables A, B, C" means the user may name zero or more existing schema tables/columns as hints; the system is responsible for validating those names against the known schema.
- Candidate query generation relies on the same schema/table knowledge already available to the query analyzer; no new external data source is introduced.
- Table/column name resolution is case-insensitive and tolerant of minor naming variations, consistent with existing analyzer behavior.
