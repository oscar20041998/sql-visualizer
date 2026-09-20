# Feature Specification: MyBatis XML to Pure SQL Normalization

**Feature Branch**: `duyvt7`

**Created**: 2026-09-20

**Status**: Draft

**Input**: User description: "requirement from docs\ui-prompts\20260920\resolve-mybatis-import.prompt.md"

## Clarifications

### Session 2026-09-20

- Q: When a mapper file references a reusable SQL fragment that lives in a different mapper file (a namespace-qualified reference), what must the product do? → A: Resolve only fragments defined in the loaded input; any reference pointing outside it is reported as an unresolved construct and gets no invented substitute SQL.
- Q: When a statement still has unresolved constructs after conversion, may the developer run the analysis anyway, or must the product stop them? → A: Keep analysis available whenever the conversion produced trustworthy SQL, raising findings the developer can see; prevent analysis only when no trustworthy statement could be produced (unresolved fragment, reference cycle, malformed input, no statement found) and explain what must be put right.
- Q: What defines the "reference set" of mapper files that the percentage-based success criteria are measured against? → A: A committed reference corpus of golden fixtures, each pairing a mapper input with its parameter values and the expected converted SQL, covering every construct the specification names plus multi-statement files and hostile input.
- Q: Must the conversion be built on a structural reading of the mapper document, or is text-level tag stripping acceptable as long as the resulting SQL looks right? → A: Structural — read the mapper document into a model of statements, reusable fragments and dynamic constructs, evaluate the constructs against parameter values, and render SQL from that model; text-level markup removal is not an acceptable mechanism.
- Q: When a raw-substitution reference used for a table name, column name or ordering expression has no value supplied, what exactly should appear in the analyzed SQL? → A: Keep the reference's own name in place as a bare SQL token so the statement stays complete and parseable, never drop the affected clause, and always report the reference as unresolved.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Analyze the SQL that a mapper file actually runs (Priority: P1)

A developer maintains SQL that exists only inside MyBatis mapper XML files. They load a mapper file into the query input page because they want the same analysis they already get for pasted SQL — tables, relationships, CTEs, JOINs, metrics, lint and AI explanation — applied to the statement the database would really execute. Today the file's markup travels with the SQL, so the analysis describes something that is not a real statement.

**Why this priority**: This is the entry point of the whole MyBatis capability. Without a faithful conversion, every downstream metric, warning and AI explanation is computed from text that is not SQL, and the feature has no value at all.

**Independent Test**: Load a mapper file containing a single plain SELECT wrapped in mapper markup and verify that the SQL offered for analysis is exactly that statement's body — with no markup, mapper metadata, CDATA, entity text or placeholder syntax left behind — and that the downstream analysis sections populate exactly as they do for pasted SQL.

**Acceptance Scenarios**:

1. **Given** a mapper file containing one mapped statement with a plain SELECT, **When** the developer loads the file, **Then** the SQL presented for analysis contains only SQL syntax and matches that statement's body.
2. **Given** a mapper file whose mapped statement is an INSERT, UPDATE or DELETE, **When** the developer loads the file, **Then** the corresponding statement body becomes the SQL presented for analysis.
3. **Given** a mapped statement whose opening element carries mapper metadata (identifier, parameter type, result type or result map, cache settings, timeout, key-generation settings and similar attributes), **When** the SQL is produced, **Then** none of that metadata appears in the SQL.
4. **Given** a statement body wrapped in CDATA or containing XML-escaped comparison operators, **When** the SQL is produced, **Then** the operators appear as normal SQL operators and no CDATA markers or entity text remain.
5. **Given** a statement that also declares a separate key-generation statement, **When** the SQL is produced, **Then** the key-generation statement's SQL is not merged into the statement being analyzed.
6. **Given** the developer selected a specific SQL dialect before loading the file, **When** the SQL is produced and analyzed, **Then** the selected dialect is still the one governing literal rendering and analysis.

---

### User Story 2 - Get the SQL that the configured parameter values actually produce (Priority: P1)

Most production mapper statements are dynamic: conditional predicates, branch selectors, wrapper elements, list iteration and bound variables decide the final shape of the statement. The developer configures parameter values precisely because they want the SQL those values imply — including clauses that must disappear when nothing applies and separators that must not dangle.

**Why this priority**: Dynamic constructs are the norm in real mappers, and getting them wrong yields SQL that can never run. This is the difference between a faithful conversion and a cosmetic tag removal.

**Independent Test**: Load a statement that combines a conditional predicate block, a branch selector, an assignment block and list iteration; configure parameter values; verify the resolved SQL contains exactly the clauses those values imply, with no leftover control markup and no dangling connectives or separators.

**Acceptance Scenarios**:

1. **Given** a statement using a conditional predicate block whose conditions are all satisfied by configured values, **When** the SQL is produced, **Then** every applicable predicate appears under a single WHERE clause.
2. **Given** the same statement with none of those conditions satisfied, **When** the SQL is produced, **Then** no WHERE keyword and no orphan AND/OR appears in the result.
3. **Given** a statement using an assignment block with conditional assignments, **When** the SQL is produced, **Then** the SET keyword is present only when at least one assignment applies and the last assignment carries no trailing comma.
4. **Given** a statement using a branch selector with a fallback branch, **When** the SQL is produced, **Then** exactly the branch whose condition is satisfied appears, and the fallback branch appears when none is satisfied.
5. **Given** a statement using a trimming wrapper with prefix, prefix-override, suffix and suffix-override settings, **When** the SQL is produced, **Then** those affixes are applied with the same meaning the mapper relies on and no wrapper markup remains.
6. **Given** a statement iterating over a collection whose values are available, **When** the SQL is produced, **Then** the items are expanded using the configured item name, separator and wrapper characters.
7. **Given** a parameter value that is edited after the SQL was first resolved, **When** the developer continues to the resolved SQL, **Then** the SQL reflects the new value without re-importing the file.

---

### User Story 3 - Reuse shared fragments instead of hand-copying them (Priority: P1)

Mapper authors extract common projections and predicates into reusable fragments and pull them into many statements, sometimes with per-use values and sometimes across mapper namespaces. A developer analyzing one statement needs the SQL as if those fragments were expanded in place, rather than copying them by hand into the editor.

**Why this priority**: Fragment reuse is pervasive in real mappers. If fragments are not expanded, statements reach the analysis with missing columns or predicates, which silently changes what the analysis is describing.

**Independent Test**: Load a mapper file whose statement pulls in a fragment that itself pulls in another fragment with per-use values, and verify the resolved SQL contains the fully expanded SQL with no fragment reference or namespace qualification left behind.

**Acceptance Scenarios**:

1. **Given** a statement that references a fragment defined in the same file, **When** the SQL is produced, **Then** the fragment's SQL appears in place of the reference and no fragment reference markup remains.
2. **Given** a fragment reference that supplies per-use values used inside the fragment, **When** the SQL is produced, **Then** the fragment's SQL shows those values in the positions the fragment defines.
3. **Given** a fragment that itself references another fragment, **When** the SQL is produced, **Then** every level is expanded and no fragment reference markup remains anywhere in the SQL.
4. **Given** a fragment reference qualified by a namespace that is not part of the loaded input, **When** the SQL is produced, **Then** the reference is reported as unresolved and no SQL is invented to stand in for it.
5. **Given** a mapper file whose fragments reference each other in a cycle, including a fragment that references itself, **When** the developer loads the file, **Then** resolution stops safely, the cycle is reported, and the page never hangs.

---

### User Story 4 - Be told what could not be resolved instead of being handed wrong SQL (Priority: P1)

A developer must be able to trust the SQL they are about to analyze. Where the mapper file leaves something genuinely undetermined — a collection with no known values, an identifier substituted at runtime, a condition whose operands are unknown — the developer needs an explicit statement of what was left unresolved, and the tool must not paper over the gap by inventing a value.

**Why this priority**: Plausible-looking SQL that silently drops or alters a condition is worse than an honest refusal, because every downstream metric, warning and AI explanation then validates the wrong query. Trustworthiness is the precondition for the rest of the feature.

**Independent Test**: Load a mapper file whose statement contains one resolvable and one unresolvable dynamic construct, and verify the SQL keeps the resolvable behaviour, changes nothing about the unresolvable one, and surfaces a finding that names the unresolved construct.

**Acceptance Scenarios**:

1. **Given** a statement iterating over a collection whose values are unavailable, **When** the SQL is produced, **Then** no number of items is assumed, the iterated body is not silently dropped, and the developer is told which collection is unresolved.
2. **Given** a runtime identifier substitution whose value is unavailable, **When** the SQL is produced, **Then** it is not presented as a data value that changes the meaning of the SQL, and it is reported as unresolved.
3. **Given** a condition that cannot be evaluated from the available information, **When** the SQL is produced, **Then** the guarded SQL is neither silently kept nor silently dropped, and the condition is reported.
4. **Given** a bound variable whose expression cannot be evaluated safely, **When** the SQL is produced, **Then** the binding is reported as unresolved and its markup does not appear in the SQL.
5. **Given** any unresolved construct, **When** the developer reviews the page before analysis, **Then** the finding identifies the construct and enough context to locate it in the mapper file.
6. **Given** a placeholder whose value the developer has not supplied, **When** the SQL is produced, **Then** the developer can still tell that the value is missing rather than seeing something that looks fully resolved.
7. **Given** a statement whose conversion still leaves constructs unresolved while the SQL remains a complete statement, **When** the developer reviews the page, **Then** the findings are visible and analysis stays available.
8. **Given** a statement that could not be converted into a trustworthy statement, **When** the developer tries to analyze it, **Then** analysis is prevented and the page explains what must be put right instead of analyzing SQL that is missing part of the statement.

---

### User Story 5 - Pick the statement to analyze when one file defines several (Priority: P2)

A mapper file usually holds many statements. The developer wants to choose which one is analyzed, and to be sure that the SQL analyzed is one statement rather than several statements stitched together.

**Why this priority**: It removes the need for developers to isolate a statement into its own file before analyzing it. It is not required for a viable first version, because analyzing the first statement in the file already delivers value for single-statement files (User Stories 1 to 4).

**Independent Test**: Load a file defining several statements, confirm the statements it defines are discoverable, switch the selection, and verify the analyzed SQL becomes only the newly selected statement's SQL without re-importing the file.

**Acceptance Scenarios**:

1. **Given** a mapper file defining several mapped statements, **When** the developer opens it, **Then** the statements it defines are discoverable with enough identification to choose the right one, and one statement is used by default.
2. **Given** the developer selects a different statement, **When** the selection changes, **Then** the SQL presented for analysis becomes only that statement's SQL.
3. **Given** a mapper file defining several statements, **When** any of them is analyzed, **Then** no two statements' SQL is ever concatenated into a single analysis input.

---

### Edge Cases

- The mapper file declares a document type definition, processing instructions or XML comments; none of that content, including comment text, may reach the SQL.
- The statement body contains a string literal holding comparison symbols, dashes, comment-like sequences, repeated internal spaces or an escaped quote; the literal must survive character for character.
- The statement body contains SQL comments or optimizer hints that the analysis relies on; they must be preserved rather than stripped as noise.
- The statement body contains quoted identifiers, reserved words or dialect-specific constructs (for example a dialect's own pagination or date-formatting syntax); they must pass through unchanged for the selected dialect.
- Whitespace and indentation differ wildly between mapper files; the analyzed SQL may be tidied but must not gain or lose tokens.
- A placeholder carries extra type or option metadata, or addresses a nested property path, or has a value that is missing, empty, or explicitly null.
- A collection is supplied with zero items: the iteration must produce its wrapper characters with no items, and the developer must be warned that the resulting predicate may not be valid SQL.
- A conditional or iterated construct is nested inside another conditional or iterated construct.
- A branch selector has no satisfied branch and no fallback branch, or an assignment block has no applicable assignment.
- A fragment reference points at a fragment that does not exist in the file, or the fragment chain is deeper than the tool supports.
- A file mixes statements that convert cleanly with a statement that cannot be converted: the blocked state must apply only to the affected statement, and the remaining statements must stay analysable.
- The file is malformed XML, contains no mapped statement at all, has an empty statement body, or declares a statement with no identifier.
- Two statements in different mapper namespaces share the same identifier, so identification must not rely on the identifier alone.
- The developer changes the selected SQL dialect after loading a file: literal rendering and analysis must follow the newly selected dialect.
- Parameter values typed by the developer contain quotes, backslashes, newlines or characters that need escaping in the selected dialect; the rendered SQL must stay valid.
- The uploaded file is enormous, deeply nested, or declares entities that expand repeatedly; the page must stay responsive and the work must terminate.
- The uploaded file attempts to reach external resources or to have its own expressions executed (condition expressions, property values, substitution references, bound variables); nothing from the file may be executed or fetched.

## Requirements *(mandatory)*

### Functional Requirements

#### Input and statement identification

- **FR-001**: The system MUST accept MyBatis mapper XML as query input, both as an uploaded file and as pasted text, in addition to the existing input methods.
- **FR-002**: The system MUST identify every mapped statement the file defines and keep the statements separate; SQL from two statements MUST never be combined into one analysis input.
- **FR-003**: The system MUST analyze one statement at a time and MUST make the statements defined by the loaded file discoverable so the developer can choose which is analyzed; when the file defines a single statement it MUST be used automatically.
- **FR-004**: SQL that the mapper expects to execute separately from the mapped statement's own SQL (key generation, for example) MUST NOT be merged into the analyzed SQL.

#### Faithful conversion

- **FR-005**: The SQL presented for analysis MUST contain SQL syntax only: no mapper element markup, no mapper metadata attributes, no CDATA sections, no XML comments, no XML entity text and no MyBatis placeholder syntax.
- **FR-006**: Character entities in statement content MUST be interpreted while the file is read as XML, so that operators and literals reach the SQL with their real characters instead of their escaped spellings.
- **FR-007**: The system MUST preserve the statement's SQL text: string literals including internal whitespace and embedded quotes, quoted identifiers, meaningful SQL comments and hints, and dialect-specific constructs.
- **FR-008**: The system MUST normalize only cosmetic whitespace (indentation and redundant blank lines) so the SQL stays readable, and MUST NOT alter whitespace inside string literals, quoted identifiers or comments.
- **FR-009**: The system MUST retain statement identity and origin (source file, namespace, identifier, statement type, position in the file) for the interface, and MUST NOT place any of it into the SQL.

#### Reusable fragments

- **FR-010**: The system MUST replace every fragment reference that can be satisfied from the loaded input with the referenced fragment's SQL, covering references within the same file and references nested inside other fragments. A reference that can only be satisfied from a mapper file that was not loaded MUST be reported as unresolved rather than resolved, and no substitute SQL may be invented for it.
- **FR-011**: The system MUST apply the per-use property values supplied by a fragment reference wherever the fragment refers to them, including when the fragment refers to them indirectly.
- **FR-012**: The system MUST detect fragment reference cycles, self-references, references that cannot be satisfied from the loaded input, and excessive fragment nesting; it MUST stop safely and report the condition, and it MUST NOT loop indefinitely, truncate silently, or present the affected statement as fully resolved.

#### Dynamic SQL semantics

- **FR-013**: The system MUST evaluate conditional blocks against the developer's configured parameter values, including the guarded SQL when the condition holds and omitting it when it does not.
- **FR-014**: When a condition cannot be evaluated from the available information, the system MUST report it and MUST NOT silently keep or silently drop the guarded SQL.
- **FR-015**: A branch selector MUST contribute exactly the SQL of the first branch whose condition holds, or the fallback branch's SQL when none holds.
- **FR-016**: A conditional wrapper element MUST contribute no clause and no orphan connective when none of its content applies.
- **FR-017**: An assignment block MUST be present only when at least one assignment applies and MUST NOT leave a trailing separator.
- **FR-018**: A trimming wrapper MUST apply its prefix, prefix-override, suffix and suffix-override settings with the same semantics the mapper relies on, including the whitespace behaviour those settings depend on.
- **FR-019**: An iteration construct MUST expand its body using the configured collection, item name, index name, separator and wrapper characters whenever the collection's values are available.
- **FR-020**: When a collection's values are unavailable, the system MUST NOT assume a number of items, MUST NOT silently drop the iterated body, and MUST report the unresolved collection.
- **FR-021**: When a collection's values are available but empty, the system MUST produce the wrapper characters with no items and MUST report that the resulting predicate may not be valid SQL.
- **FR-022**: A bound variable MUST be resolved when its expression is safely computable from available values and otherwise reported as unresolved; binding markup MUST NOT appear in the SQL.

#### Parameter resolution

- **FR-023**: A prepared-value reference MUST be replaced by the configured value rendered as a SQL literal the selected dialect accepts, supporting nested property paths and the extra type or option metadata a reference may carry.
- **FR-024**: A raw-substitution reference MUST be handled differently from a prepared-value reference: it supplies SQL text such as a table name, column name or ordering expression, and MUST NOT be rendered as a data value where doing so would change the meaning of the SQL. When no value is supplied, the reference's own name MUST stand in for it as a bare SQL token so the statement stays complete and parseable, the affected clause MUST NOT be dropped, and the reference MUST be reported as unresolved.
- **FR-025**: When a reference has no configured value, the system MUST keep the SQL's meaning intact or report the reference as unresolved; it MUST NOT present an unavailable value as though it were resolved.
- **FR-026**: The system MUST keep one parameter source of truth: the values the developer configures MUST be the values used for condition evaluation, iteration and literal rendering, and MUST NOT be interpreted differently by different parts of the conversion.

#### Reporting and trust

- **FR-027**: For the statement being analyzed, the system MUST produce the resolved SQL together with the parameters it detected, the constructs it could not resolve, and the warnings it raised.
- **FR-028**: The system MUST report every construct it could not resolve and MUST NOT silently add, remove, reorder or alter conditions, branches, collections, identifiers or predicates.
- **FR-029**: The system MUST surface the conversion outcome to the developer before analysis — which statement is analyzed, which values were used, and what remains unresolved — using the product's existing messaging and localization mechanisms in both supported interface languages.
- **FR-030**: Conversion problems the developer can act on (unreadable or malformed file, no mapped statement found, unresolved construct) MUST be presented as actionable messages rather than raw technical errors.

#### Safety and robustness

- **FR-031**: Uploaded XML MUST be treated as untrusted data: no expression from the file (condition, property value, substitution reference, binding) may be executed, evaluated as code, or used to fetch an external resource, and document type or external entity declarations MUST NOT cause any resolution to happen.
- **FR-032**: The system MUST bound the work it performs on a mapper file — input size, nesting depth and repeated expansion — so that a pathological file cannot hang the page or exhaust its resources.

#### Dialect preservation and handoff

- **FR-033**: The conversion MUST preserve the developer's selected SQL dialect and MUST NOT rewrite dialect-specific SQL into another dialect's form; literal rendering MUST follow the selected dialect.
- **FR-034**: No stage after the conversion may need any knowledge of MyBatis: the converted SQL MUST flow into the existing analysis (relationships, CTEs, JOINs, metrics, lint, AI explanation) unchanged.
- **FR-035**: The system MUST refresh the resolved SQL when a parameter value or the selected statement changes, without requiring the developer to re-import the file.

#### Preserved behaviour

- **FR-036**: The existing query-input workflow MUST remain available with unchanged steps: load mapper XML, review detected parameters, configure values, review the resolved SQL, then analyze.
- **FR-037**: The existing input methods (direct SQL, smart editor) and all existing actions, states and analysis results MUST continue to behave as before.
- **FR-038**: Statements containing no dynamic constructs MUST convert to the same SQL they produce today, apart from cosmetic whitespace normalization.

#### Analysis readiness

- **FR-039**: Analysis MUST remain available whenever the conversion produced SQL that can be trusted as a statement, with any unresolved constructs raised as findings the developer can see rather than as a barrier.
- **FR-040**: The system MUST prevent analysis, and explain what must be put right, when no trustworthy statement could be produced — an unresolved fragment reference, a reference cycle, malformed input, or a file with no mapped statement. Analysis MUST NOT be attempted on SQL that is missing part of the statement it represents.

#### Reference corpus

- **FR-041**: The product MUST ship a committed reference corpus of mapper fixtures, each pairing a mapper input with the parameter values it is exercised with and the converted SQL expected from it. The corpus MUST include at least one fixture for every construct named in this specification, a multi-statement file, an unresolved-construct case, and hostile input; the rate-based success criteria MUST be measured against this corpus, and its coverage MUST be auditable fixture by fixture.
- **FR-042**: The conversion MUST be derived from a structural reading of the mapper document — its statements, its reusable fragments and the dynamic constructs inside them — rather than from pattern-based removal of markup. A construct whose meaning depends on its position, nesting or siblings (a wrappable clause, an ordered branch set, an iterated body) MUST be resolved from the parsed structure, because its semantics cannot be recovered from its text alone.

### Key Entities *(include if feature involves data)*

- **Mapper File**: the loaded mapper XML source — its origin (file name or pasted text), its namespace, the mapped statements it defines, and the reusable fragments it defines.
- **Mapped Statement**: one executable statement found in a mapper file — its identifier, its type (query, insert, update or delete), its SQL body, its position in the file, and whether it is the statement currently being analyzed.
- **SQL Fragment**: reusable SQL that statements or other fragments can reference, together with the per-use property values a reference may supply.
- **Dynamic Construct**: a control element inside a statement that decides whether, how often, or with which affixes its content contributes to the SQL, together with the outcome of resolving it (contributed, omitted, or unresolved).
- **Parameter Reference**: a placeholder in statement SQL — its form (prepared value or raw substitution), its name or nested path, optional type metadata, and either its resolved value or its unresolved status.
- **Parameter Set**: the developer-provided values keyed by the names the mapper uses; the single source of values for condition evaluation, iteration and literal rendering.
- **Resolution Result**: the outcome for the analyzed statement — the converted SQL, the parameters detected, the constructs that could not be resolved, the warnings raised, and the correspondence between converted SQL and mapper source where available.
- **Conversion Finding**: one reported problem — its kind, severity, message, and the construct or source position it concerns.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For the committed reference corpus defined in FR-041, at least 95% of the mapped statements convert to SQL that a MyBatis-experienced reviewer confirms is the SQL the framework would run for the same configured values.
- **SC-002**: Across that reference set, 100% of converted statements pass an automated check confirming that no mapper markup, mapper metadata, CDATA, entity text or MyBatis placeholder syntax remains.
- **SC-003**: Across that reference set, zero silent semantic changes occur: every construct that is not fully resolved produces at least one developer-visible finding.
- **SC-004**: A developer can go from loading a mapper file to SQL that is ready to analyze in under 60 seconds, including configuring the parameter values that statement needs.
- **SC-005**: Converting a mapper file of up to 200 mapped statements or 512 KB, whichever is reached first, completes in under 1 second; a pathological file (recursive fragments, oversized input) terminates in under 5 seconds without freezing the page.
- **SC-006**: A file defining N mapped statements yields N independently analysable statements; no statement is lost, duplicated or merged, verified for N of at least 10.
- **SC-007**: The sample mapper file shipped with the product flows end to end into relationship, CTE, metric, lint and AI outputs, and no downstream stage requires MyBatis-specific handling.
- **SC-008**: Every capability covered by the existing regression suite continues to pass — direct SQL input, smart editor, mapper XML import, parameter editing, SQL resolution and analysis — in both supported interface languages.
- **SC-009**: Hostile mapper input (external entity declarations, expression payloads, repeated entity expansion) results in zero executions and zero external fetches, with no stuck or degraded page state.
- **SC-010**: Across the reference set, converted SQL needs no manual editing by the developer before analysis, measured as zero hand-edits to the previewed statement.
- **SC-011**: A developer can identify which construct is unresolved and where it lives in the mapper file within 30 seconds of seeing a finding, without reading the raw XML end to end.
- **SC-012**: Every conversion outcome falls into exactly one of two states — analysable with visible findings, or blocked with an explanation — and no statement is ever analyzed while part of its SQL is missing, verified across the reference set and for each statement of a multi-statement file independently.
- **SC-013**: Conversion is insensitive to mapper formatting: the same statement written on a single line and spread across several lines with different indentation, tag layout and CDATA boundaries yields equivalent SQL, verified across the reference corpus.

## Assumptions

- The supported input format is the MyBatis 3 mapper XML document (the mapper root element with mapped statement elements, reusable fragments and dynamic elements). Statements built from annotations or programmatically are out of scope.
- One mapper file is loaded at a time. Fragments defined in mapper files that are not part of the loaded input are unavailable, so a reference to them is reported as unresolved rather than expanded (see Clarifications).
- Existing product behaviour remains the source of truth wherever the mapper file does not determine the outcome: which values are detected as parameters, how the developer supplies them, how the resolved SQL is previewed, and where analysis starts all stay as they are unless a requirement above explicitly changes them.
- Parameter values stay developer-typed text in the existing parameter editor: the conversion never runs the application, never connects to a database, and never derives values from a live schema.
- Collections used by iteration are supplied through the existing parameter editor, which today carries one text value per parameter. Collection notation that the editor cannot express yields a reported unresolved construct rather than a guessed expansion; the concrete way a developer enters a collection is settled during planning without changing the requirements above.
- The product's existing convention of rendering an unsupplied value as the reference's own name is preserved for backward compatibility, and the parameter area continues to show which values are still empty. The requirement is that the placeholder form never leaks into the SQL and that the unresolved state is explicitly reported (FR-027, FR-029).
- An unresolved raw-substitution reference keeps the reference's own name as a bare SQL token and never drops the clause it belongs to (see Clarifications and FR-024); the developer is expected to supply the value when the SQL must reflect a real table, column or ordering choice.
- Where a concrete user-facing surface is needed — choosing among statements, and presenting conversion findings — the placement and visual form are decided during planning; the requirement is only that both are discoverable before the developer runs analysis.
- Multi-dialect support means the conversion itself is dialect-neutral while the selected dialect governs literal rendering and downstream analysis; the feature does not translate SQL from one dialect to another.
- Correspondence between converted SQL and the mapper source is valuable and the model must allow it, but an initial iteration may report findings per construct instead of per character offset.
- All new user-facing text uses the existing localization mechanism; no new strings are hard-coded, and both supported interface languages are covered.
- Removing markup by pattern matching is not an accepted mechanism for the conversion (see Clarifications and FR-042): the parsed model is the source of truth for what the SQL becomes, and text-level handling is confined to rendering the SQL the model describes.
