# Quickstart Validation: MyBatis XML to Pure SQL Normalization

**Feature**: `009-mybatis-sql-normalization` | **Date**: 2026-09-20

How to prove this feature works end to end. Every scenario names the requirement it validates, so a reviewer can map a command to a clause of `spec.md`. Details of the model live in [data-model.md](./data-model.md); the promises the library makes are in [contracts/mybatis-conversion.md](./contracts/mybatis-conversion.md) and the page behaviour in [contracts/query-input-mybatis-ui.md](./contracts/query-input-mybatis-ui.md).

## Prerequisites

- Node.js 20+ and the repository dependencies installed (`npm install`).
- No environment variables are required: the conversion runs in-process and touches no network, no database and no AI provider. The AI/history features of the product are irrelevant to these checks.
- The dev server runs on port 4028 (see `package.json`), so the page is at `http://localhost:4028/query-input`.

## Commands

| Purpose | Command |
|---------|---------|
| Full suite (regression gate for FR-036–FR-038) | `npm test` |
| Conversion unit suite only | `npx vitest run tests/unit/mybatis-xml.test.ts` |
| Golden corpus | `npx vitest run tests/unit/mybatis-corpus.test.ts` |
| Page-level behaviour | `npx vitest run tests/unit/mybatis-query-input.test.tsx` |
| Types | `npm run type-check` |
| Lint and formatting | `npm run lint` |
| Manual walkthrough | `npm run dev`, then open `http://localhost:4028/query-input` |

## Golden corpus (FR-041)

Fixtures live in `tests/fixtures/mybatis/` as `<case>.xml` + `<case>.params.json` + `<case>.expected.sql`. The runner asserts both the normalised SQL and the expected findings, which is what lets SC-001 to SC-003 be measured rather than asserted.

| Fixture | What it proves | Expected outcome |
|---------|----------------|------------------|
| `simple-select` | A plain statement loses markup and metadata | Clean SQL, no findings (FR-005, FR-009, FR-038) |
| `dynamic-where` | A wrappable clause disappears when nothing applies | Two variants from one file: all predicates present, or no WHERE at all (FR-013, FR-016) |
| `choose-when-otherwise` | Branch selection follows the values | Exactly one branch, or the fallback branch (FR-015) |
| `foreach-list` | Iteration expands from supplied values | Items expanded with the configured wrapper and separator (FR-019) |
| `foreach-unresolved` | Iteration never invents an arity | Wrapper with the collection's stand-in plus `UNRESOLVED_COLLECTION` (FR-020) |
| `foreach-empty` | An empty collection keeps the wrapper | Empty wrapper plus `EMPTY_COLLECTION`, analysable (FR-021) |
| `include-simple` | A fragment reference is expanded | Fragment SQL in place, no reference markup (FR-010) |
| `include-nested-properties` | Nested references and per-use values | Fully expanded SQL with substituted values (FR-011) |
| `bind-variable` | A bound variable resolves or is reported | Resolved usage, or `UNRESOLVED_BIND` with the stand-in (FR-022) |
| `update-set` | Assignment blocks and trailing separators | SET present only when needed, no trailing comma (FR-017) |
| `trim-wrapper` | Trimming affixes and overrides | Affixes applied, no wrapper markup (FR-018) |
| `cdata-operators` | CDATA and escaped operators | Operators restored, no CDATA or entity text (FR-006) |
| `mysql-dialect`, `postgres-dialect`, `sqlserver-dialect`, `oracle-dialect` | Dialect-specific SQL passes through for each supported dialect | SQL unchanged apart from whitespace (FR-033) |
| `multi-statement` | Statements stay separate and selectable | One SQL per statement, never concatenated (FR-002, FR-003) |
| `unresolved-condition` | An unsupported condition is reported, not dropped | Guarded SQL kept plus `UNRESOLVED_CONDITION` (FR-014) |
| `unresolved-include` | A reference outside the loaded file | Blocked state plus `MISSING_FRAGMENT` (FR-010, FR-040) |
| `include-cycle` | Cycles terminate with a finding | Blocked state plus `FRAGMENT_CYCLE` (FR-012) |
| `substitution-identifier` | A raw substitution is never rendered as data | Stand-in token in place plus `UNSUPPLIED_SUBSTITUTION` (FR-024, research R4) |
| `unsupplied-parameter` | A missing prepared value is visible | Quoted stand-in plus `UNSUPPLIED_VALUE` (FR-025) |
| `select-key` | Key generation is not merged | Main SQL only plus `SELECT_KEY_SKIPPED` (FR-004) |
| `hostile-entities` | No document type or entity resolution | File read as data, bounded, no external fetch (FR-031, FR-032) |
| `oversized-input` | Bounds are enforced | `INPUT_TOO_LARGE`, blocked, completes well inside the time limit (FR-032, SC-005) |
| `malformed-xml` | Unreadable input is explained | `MALFORMED_XML`, blocked, no partial SQL (FR-030, FR-040) |
| `no-statement` | A file with no mapped statement | `NO_STATEMENT`, blocked (FR-040) |
| `duplicate-identifiers` | Colliding identifiers stay distinguishable | Both statements listed and independently analysable (edge case, FR-009) |

## Validation scenarios

### S1 — A plain mapper file becomes analysable SQL (SC-001, SC-002)

1. `npx vitest run tests/unit/mybatis-xml.test.ts` and `npx vitest run tests/unit/mybatis-corpus.test.ts`.
2. Expect every corpus case to match its expected SQL exactly after whitespace normalisation, and the leak invariants (data model, "Leak invariants") to hold for each analysable result.

### S2 — Dynamic statements follow the configured values (SC-001, FR-013 to FR-018)

1. Run the `dynamic-where`, `choose-when-otherwise`, `update-set` and `trim-wrapper` cases twice: once with all values supplied, once with none.
2. Expect the resolved SQL to gain and lose exactly the constructs the values imply — a WHERE that vanishes, one chosen branch, SET without a trailing comma, trim affixes with no markup left.

### S3 — Fragments and properties expand fully (FR-010, FR-011)

1. Run the `include-simple` and `include-nested-properties` cases.
2. Expect the output SQL to contain the fragment's text with per-use values substituted and no reference or namespace qualification left.

### S4 — Unresolved constructs are reported, never hidden (SC-003, FR-014, FR-020, FR-022)

1. Run `foreach-unresolved`, `unresolved-condition`, `bind-variable` and `unsupplied-parameter`.
2. Expect each to be analysable, to keep the statement's shape, and to carry exactly one finding per unresolved construct naming the construct and its location.

### S5 — Statements that cannot be produced block analysis (SC-012, FR-040)

1. Run `unresolved-include`, `include-cycle`, `malformed-xml`, `no-statement` and `oversized-input`.
2. Expect a blocked state, an empty SQL, an error finding whose kind matches the table above, and no partial SQL anywhere in the result.

### S6 — Multiple statements stay separate (SC-006, FR-002, FR-003)

1. Run the `multi-statement` and `duplicate-identifiers` cases.
2. Expect one SQL per statement, each independently resolvable from the same parsed model, and no concatenation.

### S7 — Dialects are preserved (SC-002, FR-033)

1. Run the four dialect cases.
2. Expect the statement text to survive unchanged apart from whitespace, with no dialect rewriting in any case.

### S8 — Hostile input cannot execute or hang (SC-009, FR-031, FR-032)

1. Run `hostile-entities` and `oversized-input`.
2. Expect no execution, no external resolution, bounded work and a terminating result; assert findings and bounds rather than timings.

### S9 — The page shows the conversion outcome before analysis (SC-011, FR-027 to FR-030)

1. `npm run dev`, open `/query-input`, choose the MyBatis tab, and load `tests/fixtures/mybatis/dynamic-where.xml`.
2. Expect the statement picker (only when the file defines more than one statement), the findings panel with unresolved items named, and the parameter fields reflecting the same references the SQL used.

### S10 — Localisation and preserved workflows (SC-008, FR-036 to FR-038)

1. `npm test` to run the full suite, including the pre-existing query-input suites.
2. Switch the interface language in `/settings-preferences` and repeat S9.
3. Expect the existing suites to pass unchanged and every new string to appear in both languages.

## Manual walkthrough checklist

1. Paste a mapper statement with an `<if>` guard, leave its value empty, then fill it: the resolved SQL and the findings update without reloading, and no `#{...}` remains.
2. Enter a JSON array for a collection used by an iteration construct: the items expand with the configured wrapper and separator.
3. Type a non-array value for that same collection: the wrapper stays with the collection's stand-in and a finding explains the expected form.
4. Load a mapper file that references a fragment from another mapper: the findings name the missing fragment and the primary action is disabled with the reason.
5. Load the product's shipped sample mapper: the analysis runs end to end and the metrics, relationships, CTE and lint outputs populate as they do for pasted SQL.
6. Inspect the resolved SQL preview of any statement: no mapper markup, metadata, CDATA, entity or placeholder syntax is visible.

## Definition of done

| Criterion | Evidence |
|-----------|----------|
| SC-001, SC-010 | Corpus review: the expected SQL matches what the mapper would run, and no fixture needs manual editing |
| SC-002, SC-013 | Leak-invariant assertion per fixture plus the formatting-insensitivity case |
| SC-003 | Each unresolved fixture asserts its finding; no fixture changes SQL silently |
| SC-004 | Manual walkthrough completes within a minute for a single-statement file |
| SC-005 | Bounds tests plus corpus timing on the largest fixture |
| SC-006 | `multi-statement` and `duplicate-identifiers` cases |
| SC-007 | Manual check 5 on the shipped sample |
| SC-008 | `npm test` green, including the pre-existing query-input suites, in both languages |
| SC-009 | `hostile-entities` and `oversized-input` cases |
| SC-011 | Manual checks 1 to 4 read the findings without opening the XML |
| SC-012 | Per-statement blocking assertions in S5 and the mixed-file case |
