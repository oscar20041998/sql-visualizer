# Phase 0 Research: MyBatis XML to Pure SQL Normalization

**Feature**: `009-mybatis-sql-normalization` | **Date**: 2026-09-20

All functional ambiguity was resolved during `/speckit-clarify`, so this document resolves the *technical* unknowns behind the plan: how to read untrusted XML in this stack, how to evaluate mapper expressions safely, how literals and leftovers are rendered, and how the conversion fits the existing page without regressions.

---

## R1 — Reading mapper XML without adding a dependency

**Decision**: Read the XML with the platform `DOMParser` and harden the input *before* parsing: reject or neutralise anything that declares entities or a document type, enforce a byte-size ceiling, and enforce a nesting-depth ceiling. Element names, attributes and text/CDATA content only are read from the resulting tree; the document is never serialised back.

**Rationale**: FR-042 requires a structural read, and the browser plus jsdom already provide a conforming XML parser, so no dependency enters the bundle (Constitution V, and the repo's "reuse existing libraries" rule). Removing the document type and entity declarations before parsing eliminates the entire external-entity and entity-expansion class of attacks (FR-031) instead of relying on parser-specific hardening, and the size/depth guards answer FR-032 deterministically. The conversion runs only where `DOMParser` exists — the existing client-rendered `/query-input` route — and is never imported by a route handler.

**Alternatives considered**: (a) Pattern-based tag stripping — rejected, FR-042 forbids it and `/speckit-clarify` Q4 confirmed the structural requirement; (b) adding an XML library — rejected, a new runtime dependency for a capability the platform already provides, with its own entity-expansion surface to configure; (c) parsing server-side in a route handler — rejected, adds a round trip to a purely local workflow and forces the file content to leave the page.

---

## R2 — Evaluating `test=` conditions without executing file content

**Decision**: Implement a small tokenizer plus recursive-descent evaluator for a documented subset of MyBatis' expression language: property paths (including nested paths and `param[i]` indexing), string/number/boolean/null literals, comparison operators (`==`, `!=`, `>`, `>=`, `<`, `<=`), boolean `and`/`or`/`not` in both symbolic and word form, `null` checks, `empty` checks, `''`/`""` comparisons, and `.size()`/`.length` on collections. Anything outside the subset yields an unresolved finding (FR-014) — never a guess.

**Rationale**: The mapper file is untrusted (FR-031), so the evaluator is a parser over a fixed grammar rather than an interpreter: there is no path from file content to `eval`, `new Function`, `Function`, timers or property assignment on prototypes. A hand-written evaluator over few node kinds is also the smallest artifact that keeps the "no new dependency" rule and gives deterministic, testable behaviour for the corpus.

**Alternatives considered**: (a) `eval`/`new Function` — rejected outright, it makes an uploaded file an execution vector; (b) an OGNL or expression library — rejected, adds a dependency and, for a browser bundle, a comparable attack surface; (c) supporting all of OGNL — rejected, unbounded scope with no test oracle; the documented subset plus explicit findings is honest and testable.

---

## R3 — Rendering a supplied prepared value (`#{...}`)

**Decision**: Keep the product's existing literal convention and make it the canonical formatter: the value is trimmed, surrounding quotes are unwrapped, embedded single quotes are doubled, and the result is emitted as a single-quoted SQL literal. Access is through a dialect-keyed literal profile, so a dialect can diverge later, but all four dialects currently resolve to the same profile (single-quoted strings with doubled quotes) because the parameter editor supplies untyped text.

**Rationale**: FR-038 and SC-008 require today's SQL to stay byte-identical for the existing inputs, and the existing regression suite pins this convention (`tests/unit/query-input-parameters.test.tsx` asserts the preview contains `'42'` after the developer types `42`). A single-quoted string literal with doubled quotes is accepted by MySQL, PostgreSQL, SQL Server and Oracle, so FR-023's "a literal the selected dialect accepts" holds without type inference. Structuring the formatter behind a dialect profile satisfies FR-033 today and leaves one clearly-marked extension point when the product gains typed parameter entry.

**Alternatives considered**: (a) inferring types from the text (unquoted numbers, `TRUE`/`FALSE`, date literals) — rejected for this iteration, it changes SQL the developer sees today for existing inputs, breaks the pinned regression, and invented typing from unlabelled text is exactly the kind of silent semantic change the spec forbids; (b) passing parameters through as positional placeholders — rejected, the analyzer needs concrete SQL and the spec requires the placeholder syntax to disappear; (c) dialect-specific boolean/date literals — deferred to the same extension point, since untyped text cannot reliably be classified.

## R4 — Rendering an unsupplied raw substitution (`${...}`)

**Decision**: Substitute the reference's own name in place, as a bare SQL token, and always emit an unresolved finding for that reference. The affected clause is never dropped, and no quoting is added (quoting would turn an identifier position into a string literal).

**Rationale**: This follows the accepted clarification for `${...}`. MyBatis performs raw text substitution here, so the position is syntactic (table, column, ordering); a bare token keeps the statement complete and parseable so the surrounding query can still be analysed, while the developer recognises their own parameter name in the position they wrote it, and the finding states that the value is missing.

**Alternatives considered**: (a) emitting a marked but invalid token — rejected, it makes the whole statement unparseable and blocks analysis that is otherwise useful; (b) dropping the clause that contains the reference — rejected, it silently changes what the analysis describes, which the spec forbids; (c) substituting a quoted literal of the name — rejected, it changes meaning by turning an identifier into data.

---

## R5 — Rendering an iteration whose collection values are unavailable

**Decision**: The construct contributes its configured wrapper characters with the collection's own name as the single stand-in token (for example `IN (ids)`), emits an unresolved finding naming the collection, and never fabricates a number of items. It is *not* by itself a blocking condition, so analysis stays available (FR-039).

**Rationale**: The wrapper carries the `open`/`close` characters the developer wrote, the stand-in token is the name they will recognise, the statement stays valid, and nothing claims a specific arity — the finding is what states the truth (FR-020, FR-028). This is the same honesty mechanism the clarification chose for `${...}` (R4), so the two "unknown value" cases behave consistently instead of one blocking and one substituting.

**Alternatives considered**: (a) omitting the iterated body — rejected, silently drops a predicate (FR-020 explicitly forbids it); (b) assuming an item count, such as expanding once with the item name — rejected, it invents a collection size, which is the failure mode the spec names; (c) blocking analysis — rejected, `/speckit-clarify` Q2 reserved blocking for statements that cannot be produced at all, and blocking on every unfilled collection would make the tool unusable on real mappers. **Known limitation**: the stand-in token can look like a column name to the analyzer, so the relationship/JOIN output may mention it; the accompanying finding is the explanation, and this is recorded in the module documentation.

---

## R6 — Where a collection's values come from

**Decision**: A parameter value that parses as a JSON array is the collection value for that name. Any other value is a scalar, and a construct needing a collection finds it unavailable and follows R5. The finding states the accepted form so the developer can act on it.

**Rationale**: The existing parameter editor carries one text value per parameter, and the accepted clarification keeps collection entry with that editor. A JSON array is unambiguous, typed, trivially testable and needs no new dependency; it also cannot be mistaken for a list of values containing separators, which is the trap in the obvious alternative.

**Alternatives considered**: (a) splitting on commas — rejected, values legitimately contain commas, so a wrong split silently changes the query; (b) a dedicated list editor UI — deferred, it is new interaction design beyond this feature's scope, and R5 gives an honest fallback meanwhile; (c) index conventions such as `ids[0]`, `ids[1]` — rejected, it invents a convention the product does not have.

---

## R7 — A condition that cannot be evaluated

**Decision**: Include the guarded SQL and emit an unresolved finding for the condition; never silently drop the guarded SQL and never silently keep it unremarked.

**Rationale**: A condition outside the supported subset (R2) is common in real mappers, so blocking would break SC-004 for ordinary files, and dropping the guarded SQL would remove a predicate the database may well apply — a silent narrowing or widening of the analysed query that neither the developer nor the findings would catch. Keeping the SQL and naming the condition satisfies FR-014's "must not silently keep or silently drop", and the finding is what makes the kept predicate legitimate.

**Alternatives considered**: (a) omit the guarded SQL and report — rejected, it removes a predicate and so changes the analysed query in the less visible direction; (b) block analysis — rejected, it would block on ordinary mapper expressions; (c) treat an unevaluable condition as false without reporting — rejected, that is a silent change.

## R8 — Reference option metadata (`#{name,jdbcType=VARCHAR}`)

**Decision**: The property is the text before the first comma; the remaining `key=value` pairs are parsed and kept on the reference for reporting only, and never reach the SQL.

**Rationale**: MyBatis' own grammar puts the property first and treats the rest as type hints/options, so this matches the documented behaviour, keeps the option list out of the SQL (FR-005), and preserves it for diagnostics.

**Alternatives considered**: (a) treating the whole braces content as the property name — rejected, it produces a bogus name such as `name,jdbcType=VARCHAR` that no parameter map can satisfy; (b) stripping options before the property is located — rejected, it makes a nested path containing a comma impossible to handle predictably.

---

## R9 — Keeping the existing module surface alive

**Decision**: The four exports other code already imports from `src/lib/sql/sqlAnalyzer.ts` stay exactly as they are (`extractMyBatisParams`, `resolveMyBatisParams`, `parseMyBatisXml`, `getConditionalParams`) and become thin delegations into `src/lib/sql/mybatis/`. `parseMyBatisXml` keeps its `{ sql, params }` result shape and continues to describe the first statement with unsupplied values. The analysis engine in that file is otherwise untouched.

**Rationale**: `src/app/query-input/page.tsx` imports those exports, and they are the published shape of the module whose behaviour the existing tests describe, so delegating rather than moving keeps the change reviewable and keeps the regression gate meaningful (FR-036, FR-037). Delegation also honours FR-026: one parameter source of truth used by detection, condition evaluation, iteration and rendering.

**Alternatives considered**: (a) rewriting `sqlAnalyzer.ts` internals in place — rejected, it is a 99 KB analysis module and would mix conversion churn into analysis code other features depend on; (b) leaving the old implementation and adding a parallel one — rejected, two parameter systems is exactly what FR-026 forbids; (c) importing the new library only from the page — rejected, it orphans the existing exports and their tests.

---

## R10 — Statement selection surface

**Decision**: A native `<select>` rendered inside the existing MyBatis input panel body, labelled through the existing i18n mechanism, offering one option per mapped statement labelled with its statement type and identifier. It appears only when the loaded file defines more than one statement. The first statement in document order is the default selection, and the selection key is the statement's namespace, identifier and occurrence index so identifier collisions across namespaces stay distinct.

**Rationale**: FR-003 and US5 need the statements to be discoverable and choosable; a native select gives keyboard support, screen-reader semantics and option labelling for free, matching the repo's accessibility expectations without a bespoke listbox. Option labels built from type plus identifier are exactly the identification FR-009 retains, and the occurrence index answers the "two namespaces share an identifier" edge case.

**Alternatives considered**: (a) a custom listbox component — rejected, unnecessary interaction and accessibility surface for a single choice; (b) a separate panel for the picker — rejected, it adds a workflow step the spec explicitly does not want; (c) no picker (first statement only) — rejected, US5 P2 requires selection without re-importing the file.

---

## R11 — Presenting conversion findings and the blocked state

**Decision**: A new `ConversionFindings` panel built on the existing `QueryInputPanel` shell, placed in the left column directly after the MyBatis input panel, listing findings grouped by severity with the unresolved construct and its source location, and stating the clean case explicitly when a file converts without findings. When the selected statement cannot be converted, the same panel carries the blocking explanation and the primary action in `ActionButtons` becomes disabled with an inline reason.

**Rationale**: FR-027/FR-029/FR-030 require the conversion outcome to be visible before analysis and to read as actionable messages. Reusing the page's panel shell keeps the visual language identical to the parameter and review panels, places the findings next to the input that produced them, and preserves the heading order the workflow regression asserts (input → parameters → review → findings).

**Alternatives considered**: (a) folding conversion findings into the existing `LintingAlerts` list — rejected, linting describes the SQL's quality whereas these findings describe the conversion itself, and mixing them would misattribute severity; (b) a toast per finding — rejected, transient and unscannable; (c) a modal blocker — rejected, it interrupts the workflow the spec wants to preserve.

## R12 — Gating analysis on conversion trustworthiness

**Decision**: The page derives one conversion state from the resolution result. It is blocked when the XML could not be parsed, when the file defines no mapped statement, or when the selected statement's conversion could not be completed (unresolved fragment reference, reference cycle, fragment nesting beyond the limit). Everything else — unsupplied values, unevaluable conditions (R7), unavailable collections (R5), evaluable binds — is analysable with findings, and the primary action stays available.

**Rationale**: This is the accepted clarification for `/speckit-clarify` Q2 and FR-039/FR-040: analysis is withheld only when the SQL is missing part of a statement, so the analyzer never validates a query that cannot exist, while ordinary mapper files stay usable within SC-004. Because the judgement is per statement, a file that mixes a convertible and a non-convertible statement keeps the convertible ones analysable (the mixed-file edge case).

**Alternatives considered**: (a) always allowed — rejected, it lets the analyzer run on incomplete SQL; (b) blocked whenever any finding exists — rejected, it would block on ordinary unsupplied parameters.

---

## R13 — Performance and responsiveness

**Decision**: `parseMapperXml` runs inside a `useMemo` keyed on the XML text, with a single-entry cache inside the conversion module so the same text is parsed once across re-renders. `resolveStatement` is a pure function over the parsed model, re-run on parameter or selection change. `xmlDocument.ts` enforces the input-size, nesting-depth and expansion-count bounds up front.

**Rationale**: FR-035 and SC-005 both need parameter edits to re-resolve quickly, and the expensive steps are XML reading plus fragment expansion rather than per-parameter rendering, so splitting parse from resolve — mirrored in the library contract — gives a live preview without re-reading the file (Constitution III). The bounds make the pathological-input scenario terminate deterministically instead of depending on the parser's own limits.

**Alternatives considered**: (a) re-parsing on every parameter keystroke — rejected, it repeats the expensive step for no benefit; (b) caching per parameter set — rejected, the cache would grow with keystrokes; (c) relying on parser limits alone — rejected, FR-032 requires bounded work.

---

## R14 — Test approach for the corpus and hostile input

**Decision**: Fixtures live in `tests/fixtures/mybatis/` as `<case>.xml` plus `<case>.params.json` plus `<case>.expected.sql`, and one Vitest runner (`tests/unit/mybatis-corpus.test.ts`) walks the directory, converts each case, and compares the normalised SQL and the expected findings. Fixtures are read with `node:fs` from test code only; the conversion library itself never touches the filesystem. Hostile-input cases assert bounds and findings rather than timings.

**Rationale**: FR-041 requires an auditable corpus with expected SQL per fixture, and Vitest's default include pattern collects only `*.test.*` files, so a sibling `fixtures/` directory is not mistaken for tests. A data-driven runner keeps the corpus extensible by adding files rather than code, which is what makes the coverage claim auditable fixture by fixture.

**Alternatives considered**: (a) inline fixtures in each test file — rejected, it hides the corpus and makes coverage hard to audit; (b) expectations as JSON only — rejected, expected SQL is SQL and reads best as SQL with reviewable diffs; (c) generating expectations from the implementation — rejected, it would make the corpus a tautology.

---

## R15 — Localisation and static-analysis expectations

**Decision**: All new user-facing text is added to `src/locales/en.ts` and `src/locales/vi.ts` with identical keys (the translation type is derived from `en`), tests read labels through `getT('en')` as the existing suites do, and new code avoids `any` and `dangerouslySetInnerHTML`. Formatting follows the repo's Prettier configuration (single quotes, semicolons, 100-column width, ES5 trailing commas).

**Rationale**: FR-029/FR-030 require both interface languages, and the repo's `TranslationSchema` mapping makes a missing Vietnamese key a type error, which is stronger than a review checklist. Matching the existing test idiom keeps new suites consistent with `tests/unit/query-input-*.test.tsx`.

**Alternatives considered**: (a) hard-coded English strings — rejected by FR-029 and the repo's i18n convention; (b) building message copy inside the conversion library — rejected, the library returns finding kinds and the page localises them, so copy changes never touch parsing logic.

## Resolved unknowns

| Unknown | Resolution |
|---------|------------|
| How to read untrusted XML without a new dependency | R1 — hardened `DOMParser` read with size and depth guards |
| How to evaluate `test=` expressions safely | R2 — documented subset via a hand-written evaluator, no execution primitives |
| How a supplied value is rendered as a literal | R3 — existing quoted-literal convention behind a dialect-keyed profile |
| How an unsupplied raw substitution is rendered | R4 — the reference's own name as a bare token, always reported |
| How an unavailable collection is rendered | R5 — wrapper with the collection's own name, always reported, never a fabricated arity |
| Where collection values come from | R6 — JSON array in the existing parameter editor |
| What happens to an unevaluable condition | R7 — guarded SQL kept, the condition reported |
| How `#{name,jdbcType=...}` is parsed | R8 — property before the first comma, options for reporting only |
| How existing module consumers keep working | R9 — four delegating exports with unchanged shapes |
| How the developer chooses a statement | R10 — native select inside the MyBatis panel, first statement by default |
| How conversion problems reach the developer | R11 — `ConversionFindings` panel plus a disabled CTA carrying the reason |
| When analysis is withheld | R12 — only for unparseable, statement-less or incomplete conversions |
| How real-time responsiveness is preserved | R13 — parse once per XML text, resolve per parameter change, bounded input |
| How the corpus is verified | R14 — data-driven golden corpus with expected SQL and expected findings |
| How localisation and code quality are enforced | R15 — both locale files, existing test idiom, no `any`, repository formatting rules |

## Open items carried into implementation

- **R5's stand-in token** may appear in analyzer output as an unknown column name; the finding is the explanation, and the module documentation must state it.
- **R3's dialect profile** currently has identical entries for all four dialects; dialect-specific boolean/date literals are explicitly deferred until the parameter editor can express types, and the profile is the single place to change.
- **R6** defers a dedicated collection editor; until then collections are entered as JSON arrays and everything else is reported as unresolved.
