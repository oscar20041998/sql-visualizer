# Initial Capability Matrix

Audit date: 2026-11-22. This is an implementation baseline, not a release claim. `Unknown` means the object/dialect combination has not been validated; it must not be presented to users as supported. `Partial` describes only the specific exercised construct below, not the full feature.

| Object | MySQL | PostgreSQL | SQL Server | Oracle |
|---|---|---|---|---|
| Query | Partial Q1 | Partial Q1 | Partial Q1 | Partial Q1 |
| CTE | Partial Q1 | Partial Q1 | Partial Q1 | Partial Q1 |
| Table | Partial D1 | Partial D1 | Partial D1 | Partial D2 |
| View | Partial V1, V3 | Partial V1–V3 | Unknown | Unknown |
| Procedure | Partial P1–P2 | Partial R1 | Unknown | Unknown |
| Function | Partial F1 | Partial R1 | Unknown | Unknown |
| Trigger | Partial T1–T2 | Unknown | Unknown | Unknown |

**Q1**: `tests/unit/sqlSourceClassification.test.ts`, `classifies physical tables and same-query CTEs`, passes for each dialect as part of the 87-file baseline `npm test` on 2026-11-22. It exercises one `WITH ... SELECT` source-classification fixture through `src/lib/sql/sqlAnalyzer.ts`; the analyzer's primary extraction is regex-based. It does not establish broad syntax coverage, object body analysis, four-dialect AST verification, graph performance or full support.

**D1**: `tests/unit/object-intelligence-workspace.test.tsx` tests a MySQL `CREATE TABLE shop.employees` with `INT` and `VARCHAR(80)` columns in the workspace. `tests/unit/object-intelligence-table.test.ts` tests qualified PostgreSQL and SQL Server tables and `DECIMAL(10,2)` for all three dialects. Only recognized names and types are shown; constraints and other details are not fully analyzed, and unrecognized columns may be omitted.

The supplied MySQL employee table additionally exercises table options, constraints, indexes and `ENUM` values in `tests/unit/object-intelligence-table.test.ts` and the workspace test. Column types include the tested ENUM values; table options, indexes and constraints are not fully analyzed.

**D2**: `tests/unit/object-intelligence-table.test.ts` and `tests/unit/object-intelligence-workspace.test.tsx` exercise Oracle table identity, unquoted names and `NUMBER`, `VARCHAR2` and `DATE` columns, including `NUMBER(10,2)` and an optional final semicolon. The MIT-licensed `oracle-sql-parser` is loaded only for Oracle object analysis. Quoted identifiers, comments, other column types and `VARCHAR2` length semantics are not supported by this adapter; it rejects unrecognized column types rather than presenting incorrect details. Constraints and other table details are not fully analyzed. The code generator still reports Oracle unsupported.

**V1**: `tests/unit/object-intelligence-source.test.ts`, `analyzes a qualified simple view as partial`, passes for MySQL and PostgreSQL for `CREATE VIEW sales.active_orders AS SELECT id FROM orders;`. It checks identity, schema, query and table name. The PostgreSQL source boundary is obtained from `dt-sql-parser` when `node-sql-parser` omits it. Query facts use the existing regex analyzer; source names alone are compared against `node-sql-parser`'s table list. Agreement is not proof of completeness or verification of other facts.

**V2**: `tests/unit/object-intelligence-source.test.ts` exercises PostgreSQL query source preservation after a Unicode comment and, for MySQL and PostgreSQL, original query positions after a Unicode comment. Ranges use UTF-16 offsets with an exclusive end and 1-based lines and columns. This establishes only the tested view fixtures, not procedural statement navigation.

**V3**: `tests/unit/object-intelligence-view-columns.test.ts`, `returns explicitly declared view columns`, passes for MySQL and PostgreSQL on 2026-11-22 for a two-column view declaration. Inferred result columns, wildcard expansion and other view forms are not established by this fixture.

**Source disagreement**: `tests/unit/sql-cross-check.test.ts` and `tests/unit/object-intelligence-workspace.test.tsx` show that a MySQL view whose string literal contains `FROM ghost` does not display a fabricated source when regex and parser results disagree. Disputed names are hidden and the limitation is displayed. The comparison can be unavailable or conservative for other constructs; it is not a four-dialect cross-check.

The source-comparison helper uses the TransactSQL grammar for a tested SQL Server `SELECT id FROM employees`. For Oracle it explicitly reports comparison unavailable and retains only preliminary regex-derived sources; no Oracle query AST verification is claimed. See `tests/unit/sql-cross-check.test.ts`.

**T1**: `tests/unit/object-intelligence-trigger-workspace.test.tsx` and `tests/unit/object-intelligence-trigger.test.ts` exercise the supplied MySQL `BEFORE INSERT` trigger with a single `SET` body. The workspace shows the grammar-derived trigger name, target, timing, event and original body as partial.

**T2**: `tests/unit/object-intelligence-routine-boundaries.test.ts` exercises a qualified, quoted MySQL `AFTER UPDATE` trigger with a two-statement compound body and Unicode. It also checks malformed and multiple top-level statements are rejected for selected fixtures and no trigger analysis is returned for PostgreSQL.

**P1**: `tests/unit/object-intelligence-trigger-workspace.test.tsx` exercises a MySQL procedure with an `IN` parameter and a compound `SELECT` body. The workspace shows its name, parameter declaration and body as partial.

**P2**: `tests/unit/object-intelligence-routine-boundaries.test.ts` exercises a qualified, quoted MySQL procedure with `IN`/`OUT` parameters and a two-statement body containing Unicode, plus a procedure without parameters. It checks selected malformed and multiple top-level statements are rejected.

**F1**: `tests/unit/object-intelligence-function.test.ts` and `tests/unit/object-intelligence-trigger-workspace.test.tsx` exercise MySQL functions with parameters, return types, direct `RETURN` and a compound body. Qualified and quoted function names and selected malformed and multiple statements are covered. Only source metadata is reported, not runtime behavior.

**R1**: `tests/unit/object-intelligence-trigger-workspace.test.tsx` exercises a PostgreSQL SQL function with a dollar-quoted body; `tests/unit/object-intelligence-routine-boundaries.test.ts` characterizes a quoted PL/pgSQL procedure with a tagged body and Unicode and checks selected invalid or unsupported definitions. Only the name, parameter declarations, function return type and original body are shown. Bodies, statements and dependencies are not analyzed; `RETURNS TABLE`, other languages and other routine forms are not established.

Direct MySQL `SELECT` statements in tested routine bodies can be selected and analyzed with preliminary source-name comparison and navigated to their original source ranges (`tests/unit/object-intelligence-trigger-workspace.test.tsx`, `tests/unit/object-intelligence-routine-boundaries.test.ts`, `tests/unit/object-intelligence-function.test.ts`). Other statements, declarations and nested control flow are flagged as incomplete rather than flattened. Runtime state, object dependencies, control flow analysis, CLI `DELIMITER` directives and other dialects or syntax have not been established by these fixtures. No independent fact-level cross-check is performed for routine metadata.

The supplied `src/sample/demo_query7.sql` is covered by `tests/unit/sql-cross-check.test.ts`: for its MySQL CTE/window-function query, the regex and parser source-name sets agree on the exercised source names. This is not a full verification of the query or all dialects.

The dependency workspace accepts individual or batched, unquoted MySQL/PostgreSQL views and tables with an explicit schema or a default schema entered by the user. An entered default is applied to unqualified names only; resulting identities and edges are marked as assumptions, not verified database resolution. Batches can be pasted or imported from multiple `.sql` files; the complete source, file label and parser-backed definition ranges remain in memory. An invalid batch leaves the collection unchanged, and matching identities require keep/replace or cancellation before committing, including identities based on the stated default. Other dialects, quoted identifiers and routines are not supported by this batch flow. It adds view-read edges only when the source-name cross-check agrees and names are qualified explicitly or via the user-supplied assumption; unknown targets remain unresolved. CTEs, uncertain sources, procedural dependencies and table constraints are not fully analyzed. `tests/unit/object-intelligence-ingestion.test.ts` covers MySQL and PostgreSQL boundary handling, including routine bodies and Unicode; boundary recognition does not mean routines can be imported. `tests/unit/object-intelligence-graph.test.tsx` exercises MySQL view chains, table targets, PostgreSQL paste, file import, duplicate choices, cancellation, read failure and stale imports across sign-out; `tests/unit/object-intelligence-dependencies.test.ts` exercises unresolved references and cycle-safe transitive traversal. Browser graph review remains pending.

Individual analyzed SQL Server and Oracle tables with qualified identities can also be added to the session, as exercised by `tests/unit/object-intelligence-graph.test.tsx`. Their dependencies remain incomplete; batch import and views for these dialects are not established.

The user approved the styled SQL file chooser after feedback. This does not constitute approval of the remaining workspace or graph design.

The four named object analyzer files in `src/lib/sql/` were empty during the initial audit. Extend each cell only with executed, representative fixtures, scope and limitations; missing evidence is never a fully supported cell. The constitutional four-dialect cross-check is still an unresolved release gate.
