# Phase 1 Data Model: MyBatis XML to Pure SQL Normalization

**Feature**: `009-mybatis-sql-normalization` | **Date**: 2026-09-20

Every type below lives in `src/lib/sql/mybatis/types.ts` (models) and is consumed by `mapperModel.ts`, `fragmentResolver.ts`, `dynamicEvaluator.ts`, `conditionEvaluator.ts`, `parameterResolver.ts` and `conversion.ts`. Names are the conceptual entity names from `spec.md`; fields are described by meaning, not by literal syntax. Nothing here introduces persistence — the page holds these values in memory for the loaded file.

---

## E1 — MapperFile

The loaded mapper document, read once per XML text.

**Fields**

- **origin**: the file name recorded for the import, or a pasted-input marker; never enters SQL.
- **namespace**: the mapper's namespace when declared, otherwise empty.
- **statements**: the mapped statements found, in document order.
- **fragments**: the reusable fragments found, addressable by identifier within this file.
- **reusableKeys**: fragment identifiers that are declared more than once, kept so a duplicate declaration can be reported instead of silently taking one.
- **findings**: file-level conversion findings (parse failures, bounds, duplicate declarations).
- **bounds**: which limits were applied (size, nesting depth, expansion count) and whether any was reached.

**Relationships**

- Owns 1..* `MappedStatement` (E2); a file with none is a blocked state.
- Owns 0..* `SqlFragment` (E3).

**Validation rules**

- Input larger than the size ceiling produces a `INPUT_TOO_LARGE` finding and no statements (blocked), rather than partial parsing.
- Markup that cannot be read as XML produces `MALFORMED_XML` and no statements (blocked).
- A file with no mapped statement produces `NO_STATEMENT` (blocked).
- Duplicate fragment identifiers produce a warning finding and the first declaration wins, deterministically.

---

## E2 — MappedStatement

One executable statement, addressed by a stable key.

**Fields**

- **key**: namespace + identifier + occurrence index. The occurrence index keeps two namespaces that share an identifier distinguishable (the duplicate-identifier edge case).
- **id**: the declared identifier, or empty when absent; an absent identifier does not exclude the statement from the model.
- **namespace**: the statement's namespace (from the file, or an element-level override when present).
- **type**: query, insert, update or delete.
- **body**: the statement's node tree (E4).
- **metadata**: the mapper metadata the element declared (parameter type, result type or map, cache settings, timeout, key generation and similar), retained for display and diagnosis only.
- **keyGeneration**: the separate key-generation statement declared inside it, when present; never merged into the body.
- **position**: the statement's offset and line in the source, used for findings.
- **hasDynamic**: whether the body contains any dynamic construct, used for the unchanged-SQL guarantee for plain statements.

**Relationships**

- Belongs to exactly one `MapperFile`.
- Contains 0..* `DynamicNode` (E4) and 0..* `ParameterReference` (E6).
- Produces exactly one `ResolutionResult` (E8) per resolution.

**Validation rules**

- Statements stay independent: no transformation may read one statement's body while producing another's SQL.
- A statement whose fragments cannot be satisfied produces a blocked resolution (E8).
- Metadata never reaches `ResolutionResult.sql`.

## E3 — SqlFragment

Reusable SQL that statements or other fragments reference.

**Fields**

- **id**: the declared identifier.
- **ownerNamespace**: the namespace the fragment belongs to (the file's namespace, or its own when declared).
- **body**: the fragment's node tree (E4), which may itself contain dynamic constructs and further references.
- **properties**: the placeholder names the fragment expects from a reference, discovered from its body.
- **position**: source offset and line for findings.

**Relationships**

- Owned by a `MapperFile`; referenced by 0..* fragment references inside statements or other fragments.

**Validation rules**

- A reference is satisfiable only when the fragment exists in the loaded file (the accepted single-file clarification); otherwise `MISSING_FRAGMENT` is reported and the statement is blocked.
- References that form a cycle, including self-reference, produce `FRAGMENT_CYCLE` and block the statement.
- Nesting beyond the supported depth produces `FRAGMENT_DEPTH` and blocks the statement.
- A reference's supplied property values replace the fragment's placeholders wherever the fragment uses them, including indirectly through a nested reference.

---

## E4 — DynamicNode (discriminated union)

The body of a statement or fragment is a tree of nodes; each dynamic node carries the semantics its construct implies. Node kinds and the behaviour the evaluator must preserve:

- **text**: literal SQL text, including the contents of CDATA sections; whitespace inside it is meaningful only where SQL says so.
- **if**: guarded SQL plus a condition expression. Contributes its children when the condition holds, contributes nothing when it does not, and reports `UNRESOLVED_CONDITION` while keeping the children when the condition is outside the supported subset (R7).
- **choose**: an ordered set of branches, each guarded, plus an optional fallback branch. Contributes exactly the first branch whose condition holds, or the fallback when none holds.
- **where**: a wrapper that contributes its children's SQL prefixed by the WHERE keyword only when something is contributed, and strips a leading connective that would otherwise dangle.
- **set**: a wrapper that contributes its children's SQL prefixed by the SET keyword only when something is contributed, and removes a trailing separator.
- **trim**: a wrapper with prefix, prefix-override, suffix and suffix-override settings, applied with the mapper's semantics, including the whitespace handling those settings depend on.
- **foreach**: a collection name, item name, index name, separator and wrapper characters. Expands to the configuration the values imply (E7), or to the wrapper with the collection's own name as a single stand-in token plus an `UNRESOLVED_COLLECTION` finding (R5), or to an empty wrapper plus `EMPTY_COLLECTION` when the collection is present but empty.
- **bind**: a variable name and an expression. When the expression is computable from the values at hand the variable resolves, and later references to it use that value; otherwise `UNRESOLVED_BIND` is reported and later references fall back to their own stand-in rendering.
- **include**: a reference to a `SqlFragment` plus the property values this use supplies. Resolved during fragment expansion, before dynamic evaluation, so the expansion result is ordinary nodes.
- **text-with-references**: text carrying 0..* `ParameterReference` markers (E6), which are resolved during rendering.

**Validation rules**

- A construct's contribution is decided by its own semantics and its parent's configuration, never by text pattern matching (FR-042).
- Evaluation never drops a child silently and never invents a child: anything not contributed must be explained by a finding or by a condition that evaluated to false.
- Every node keeps enough source position information for a finding to point at the construct.

---

## E5 — Resolution inputs

**Fields**

- **statement**: the `MappedStatement` (E2) being resolved.
- **parameters**: the `ParameterSet` (E7).
- **dialect**: the user's selected dialect, carried through so literal rendering and downstream analysis agree (FR-033).

**Validation rules**

- Rendering is deterministic for a given (statement, parameters, dialect) triple: the same inputs always produce the same SQL and the same findings.
- The dialect never rewrites SQL text; it only selects which literal profile is used.

## E6 — ParameterReference

One placeholder occurrence inside statement or fragment text.

**Fields**

- **form**: prepared value (the mapper's `#{}` form) or raw substitution (its `${}` form). The two are never treated alike.
- **name**: the property name, or the nested path when the reference addresses one.
- **options**: the extra key/value pairs a reference may carry (type hints and similar); retained for diagnosis, never rendered.
- **position**: offset and line of the occurrence.
- **status**: resolved, unsupplied, or invalid.
- **rendered**: the text that stood in for it, kept so a finding can say exactly what the SQL shows.

**Relationships**

- Belongs to the text it occurs in; resolved against one `ParameterSet` (E7) and one dialect (E5).
- Collected per statement into the `ResolutionResult.parameters` list, preserving first-appearance order (today's detection order).

**Validation rules**

- Prepared-value references render as a dialect-accepted literal built from the supplied value; an unsupplied value keeps the product's existing stand-in (the reference's own name as a quoted literal) and is reported as `UNSUPPLIED_VALUE` (R3).
- Raw-substitution references render as bare SQL text; an unsupplied value keeps the reference's own name as a bare token, drops no clause, and is reported as `UNSUPPLIED_SUBSTITUTION` (R4).
- Nested paths resolve against the supplied values when the corresponding key exists; a missing key is unsupplied, never an error about the path.
- Both forms MUST be absent from the produced SQL — no `#{...}` and no `${...}` may survive into `ResolutionResult.sql`.

---

## E7 — ParameterSet and ParameterValue

The developer's supplied values — the single source of truth for detection, conditions, iteration and rendering (FR-026).

**Fields**

- **entries**: keyed by the name the mapper uses; keys are exactly the detected reference names.
- **ParameterValue**: either a scalar (the developer's text) or a collection (parsed from a JSON array value, R6), with the raw text retained so the editor round-trips what was typed.
- **origin**: which text produced the value, kept for diagnosis when a value cannot be interpreted as a collection.

**Validation rules**

- Detection order is stable and matches today's behaviour for the existing inputs.
- A value removed from the map never leaves a stale rendered value in the SQL: rendering always reads the current map.
- A collection value is used only by iteration constructs; everywhere else the raw text is the value.
- Supplied values never influence which statements exist, only what the selected statement renders to.

---

## E8 — ResolutionResult

The conversion outcome for one statement at one parameter set. This is what the page renders and what the analyzer eventually receives.

**Fields**

- **statementKey**, **statementType**: which statement this describes.
- **sql**: the pure SQL, or empty when the statement is blocked.
- **parameters**: the `ParameterReference` entries detected for this statement, in first-appearance order.
- **unresolved**: the constructs that could not be resolved, with their kind and position.
- **findings**: all `ConversionFinding` entries for this statement, including informational ones.
- **sourceMap**: correspondence between produced SQL and the mapper source where available; may be coarser than character level in the first iteration (spec Assumptions).
- **state**: analysable or blocked.
- **blockReason**: which finding caused a blocked state, so the page can explain it.

**Relationships**

- Derived from one `MappedStatement`, one `ParameterSet` and one dialect.
- Consumed by the page's preview, findings panel and analysis gate, and by the delegating legacy exports (R9).

**Validation rules**

- When the state is analysable, `sql` is a complete statement: it contains SQL syntax only and no conversion artefact remains (the leak invariants below).
- When the state is blocked, `sql` is empty and `blockReason` names a finding — a blocked statement is never handed to the analyzer.
- Findings are ordered deterministically (by source position, then kind) so tests and the UI agree.

---

## E9 — ConversionFinding

One reported problem or note.

**Fields**

- **kind**: one of `MALFORMED_XML`, `INPUT_TOO_LARGE`, `NESTING_TOO_DEEP`, `EXPANSION_LIMIT`, `NO_STATEMENT`, `MISSING_FRAGMENT`, `FRAGMENT_CYCLE`, `FRAGMENT_DEPTH`, `DUPLICATE_FRAGMENT`, `UNRESOLVED_CONDITION`, `UNRESOLVED_COLLECTION`, `EMPTY_COLLECTION`, `UNRESOLVED_BIND`, `UNSUPPLIED_VALUE`, `UNSUPPLIED_SUBSTITUTION`, `SELECT_KEY_SKIPPED`.
- **severity**: error (blocks the statement), warning (the statement is analysable but something is unresolved or skipped), or info (a note such as a skipped key-generation statement).
- **messageKey** and **messageValues**: the localisation key and the values it interpolates; the library produces no user-facing copy (R15).
- **position**: where in the mapper the finding points, when known.
- **statementKey**: the statement it belongs to, or absent for a file-level finding.

**Validation rules**

- Every unresolved construct produces exactly one finding — no duplicate findings for the same construct.
- A finding whose severity is error implies the statement's state is blocked and the inverse holds.
- Findings survive a parameter change if their cause is unchanged, so the panel does not flicker between keystrokes.

---

## Leak invariants (checked in tests for every corpus fixture)

For every analysable result, `sql` must not contain: any mapper markup, any mapper metadata attribute name and value, a CDATA marker, an XML entity spelling, a `#{` or `${` reference, a fragment reference, a `test=` attribute, or a comment that came from XML rather than SQL.

## E10 — Page-level conversion state (Query Input route)

Derived state the page holds in memory; nothing here is persisted.

**Fields**

- **model**: the `MapperFile` (E1) for the current XML text, or absent when no XML is loaded.
- **statementOptions**: the selectable statements for the picker, each with its key, type, identifier and occurrence index (E2).
- **selection**: the selected statement's key; defaults to the first statement in document order whenever the XML text changes.
- **result**: the `ResolutionResult` (E8) for the current selection and parameter set, or absent when nothing is loaded.
- **status**: analysable or blocked (mirroring `result.state`), with the blocking finding when blocked.
- **findings**: the file-level and statement-level findings shown by the findings panel.

**Relationships**

- `model` derives from `myBatisXml`; `result` derives from `model` + `selection` + `myBatisParams` + `dialect`.
- `detectedParams` (the parameter editor's list) derives from `result.parameters`, so the editor and the rendered SQL can never disagree (FR-026).

**Validation rules**

- Changing the XML text re-parses, resets the selection to the first statement, and clears stale findings.
- Changing a parameter value, the selection, or the dialect re-resolves without re-reading the XML (FR-035, R13).
- The resolved SQL shown in the preview is exactly `result.sql`; when the state is blocked it is empty and the reason is explained instead of showing partial SQL.
- Clearing the input returns every field to its empty state and preserves the existing Clear behaviour.

---

## State transitions

| From | Trigger | To | Notes |
|------|---------|----|-------|
| Empty input | XML text becomes non-empty | Parsed (statements available) | Selection defaults to the first statement |
| Empty input | XML text still empty | Empty input | Preview keeps today's empty-state copy |
| Parsed | Selection changes | Resolved for the new statement | No re-parse |
| Parsed | Parameter value changes | Resolved again | No re-parse; findings that are unchanged persist |
| Parsed | Dialect changes | Resolved again | Literal profile re-applied; SQL text otherwise untouched |
| Parsed / resolved | XML text changes | Parsed (new model) | Selection resets to the first statement of the new file |
| Resolved | Resolution completes with no blocking finding | Analysable | Primary action available; findings visible when any exist |
| Resolved | Resolution produces a blocking finding | Blocked | Primary action disabled with the reason; SQL preview empty |
| Analysable | Analysis triggered | Existing analysis flow | The analyzer receives `result.sql` only (FR-034) |
| Any | Input cleared | Empty input | Same fields the existing Clear action resets |

Blocking findings are `MALFORMED_XML`, `INPUT_TOO_LARGE`, `NO_STATEMENT`, and — for the selected statement — `MISSING_FRAGMENT`, `FRAGMENT_CYCLE` and `FRAGMENT_DEPTH`. Everything else is a warning or informational finding on an analysable statement.

