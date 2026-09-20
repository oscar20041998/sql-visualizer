# Contract: MyBatis Conversion Library

**Feature**: `009-mybatis-sql-normalization` | **Module**: `src/lib/sql/mybatis/` | **Date**: 2026-09-20

This contract describes what the conversion library promises to its callers — the Query Input page, the delegating exports in `src/lib/sql/sqlAnalyzer.ts`, and the test suites. It is a module contract rather than a network contract: the repository is a single Next.js application and this library is an in-process dependency.

## Entry points

| Entry point | Input | Output | Purpose |
|-------------|-------|--------|---------|
| `parseMapperXml(xml)` | the mapper document text | a mapper model (`MapperFile`, data model E1) | Reads the document once and describes what it defines. Never throws for file content. |
| `listStatements(model)` | a mapper model | statement options (key, type, identifier, occurrence index) | Feeds the statement picker (data model E2, E10). |
| `resolveStatement(model, statementKey, parameters, dialect)` | model, the selected statement's key, the developer's values, the selected dialect | a resolution result (data model E8) | Produces the SQL, the detected references, the findings and the analysable/blocked state. |

## Parameters and dialect

- Supply every value keyed exactly by the name the mapper uses, including nested paths such as `user.id`.
- Supply a collection as a JSON array of strings in the value's text; a value that is not a JSON array is treated as a scalar (research R6).
- The dialect is one of the four the product already supports (`mysql`, `postgresql`, `sqlserver`, `oracle`). It selects the literal profile and is passed through; it never rewrites SQL text (FR-033).

## Guarantees

- **G1 — SQL only**: for an analysable outcome, the produced SQL contains no mapper markup, no mapper metadata, no CDATA marker, no XML entity spelling, no `#{...}` or `${...}` reference, no fragment reference and no `test=` attribute (FR-005, leak invariants).
- **G2 — One statement at a time**: the result describes exactly one mapped statement; SQL from two statements is never combined (FR-002).
- **G3 — Metadata stays out**: namespace, identifier, statement type and position are available on the model and never appear in the SQL (FR-009).
- **G4 — No silent change**: every construct the library could not resolve appears as a finding, and the library never adds, removes, reorders or alters conditions, branches, collections, identifiers or predicates without a finding that says so (FR-028).
- **G5 — Dynamic semantics**: guarded constructs, branch selection, wrappable clauses, assignment blocks, trimming wrappers, iteration and variable binding follow the semantics their mapper construct defines, decided structurally rather than by inspecting text (FR-013 to FR-022, FR-042).
- **G6 — Two reference forms stay distinct**: a prepared-value reference renders as a dialect-accepted literal; a raw-substitution reference renders as SQL text and is never turned into data (FR-023, FR-024).
- **G7 — No fabricated arity**: iteration never assumes how many items a collection has; an unavailable collection contributes the wrapper with the collection's own name as a stand-in, an empty collection contributes an empty wrapper, and both are reported (FR-020, FR-021, research R5).
- **G8 — Unsatisfiable fragments block**: a fragment reference the loaded file cannot satisfy, a reference cycle, or nesting beyond the limit yields a blocked result with empty SQL and an error finding (FR-010, FR-012, research R12).
- **G9 — Determinism**: the same model, values and dialect always produce byte-identical SQL and the same ordered findings (data model E5, E8).
- **G10 — Untrusted input**: file content is data, never code. Nothing in the document is executed or evaluated as code, no document type or entity declaration causes resolution or network access, and size, nesting depth and expansion are bounded (FR-031, FR-032).
- **G11 — No user-facing copy**: findings carry a kind, severity, message key and values; the library never produces display text (FR-029, research R15).
- **G12 — Isomorphic-safe**: no filesystem, no Node-only API, no network, no `dangerouslySetInnerHTML`; only the platform XML parser and pure TypeScript.

## Findings: kind, severity, effect

| Kind | Severity | Blocks the statement? |
|------|----------|-----------------------|
| `MALFORMED_XML`, `INPUT_TOO_LARGE`, `NO_STATEMENT` | error | Yes (file level) |
| `MISSING_FRAGMENT`, `FRAGMENT_CYCLE`, `FRAGMENT_DEPTH`, `EXPANSION_LIMIT` | error | Yes |
| `UNRESOLVED_CONDITION`, `UNRESOLVED_COLLECTION`, `EMPTY_COLLECTION`, `UNRESOLVED_BIND`, `UNSUPPLIED_VALUE`, `UNSUPPLIED_SUBSTITUTION` | warning | No |
| `DUPLICATE_FRAGMENT`, `SELECT_KEY_SKIPPED`, `NESTING_TOO_DEEP` | info or warning | No |

## Failure behaviour

- A content problem never throws: the caller receives a result whose state is blocked with an error finding, so the page can explain it instead of showing a stack trace (FR-030).
- A programming error (bad arguments, an unknown statement key) may throw; callers are expected to pass a key obtained from `listStatements`.
- Partial results are never returned: a blocked statement yields no SQL at all, so nothing incomplete can reach the analyzer (FR-040).

## Performance contract

- Reading a document of up to 200 statements or 512 KB completes in under 1 second; pathological input (recursive fragments, oversized documents, repeated expansion) terminates in under 5 seconds (SC-005).
- Resolution after a parameter change is pure and cheap enough to run per keystroke; the document is read once per text and the result is reused across re-renders (FR-035, research R13).

## Legacy surface (delegating exports)

`src/lib/sql/sqlAnalyzer.ts` keeps publishing `extractMyBatisParams`, `resolveMyBatisParams`, `parseMyBatisXml` and `getConditionalParams` with their existing signatures and result shapes, implemented by delegation. Their behaviour for existing inputs stays as today: detection order is unchanged, supplied values render as quoted literals, and the reference-own-name stand-in is preserved (FR-038, research R9).

## Out of scope

- Statements declared by annotation or built programmatically.
- Fragments defined in mapper files that are not loaded.
- Rewriting SQL between dialects.
- Typed parameter entry (numbers, dates, booleans) and a dedicated collection editor (research R3, R6).
- Executing the mapper's queries against a database.

## How this contract is verified

- `tests/unit/mybatis-xml.test.ts` — extraction, CDATA, entities, comments, metadata, key generation (G1, G3).
- `tests/unit/mybatis-dynamic.test.ts` — construct semantics and wrappers (G5, G7).
- `tests/unit/mybatis-fragments.test.ts` — references, properties, nesting, cycles (G8).
- `tests/unit/mybatis-parameters.test.ts` — reference forms, nested paths, options, unsupplied values (G6).
- `tests/unit/mybatis-safety.test.ts` — hostile input and bounds (G10).
- `tests/unit/mybatis-corpus.test.ts` — golden corpus with expected SQL and findings (G1, G4, G9, plus FR-041 coverage audit).
