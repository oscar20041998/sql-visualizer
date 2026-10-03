# Cycle Log: SQL to Code Generator

Append only. Each cycle records the observed red before its implementation.

## Baseline

- suite: `npm test` -> 413 passed, 0 failed (45 files, 43.06 seconds)
- commit: `1fc60d0`
- recorded: before the first feature test

## Cycle 1: A1 generates a JPA entity using Java conventions

- test: `tests/unit/query-input-code-generator.test.tsx::generates a JPA entity using Java conventions` (new)
- red: `npx vitest run tests/unit/query-input-code-generator.test.tsx -t "generates a JPA entity using Java conventions"` -> `TestingLibraryElementError: Unable to find an accessible element with the role "tab" and name "SQL → Code Generator"`
- green: `npx vitest run tests/unit/codegen/parseSql.test.ts -t "normalizes supported DDL"` -> 3 passed; CREATE TABLE normalization now preserves dialect schema, columns, types, lengths, nullability, and inline primary keys
- refactor: none; the parser adapter is limited to the facts U1 exercises
- final result at cycle time: focused U1 green; the then-expected A1 missing-tab red remained until route integration

## Cycle 22: A1 route generation and input isolation

- test: `tests/unit/query-input-code-generator.test.tsx::generates a JPA entity using Java conventions` and `::keeps generator input separate from SQL and MyBatis drafts`
- red: initial A1 missing-tab evidence is recorded in Cycle 1
- green: `npx vitest run tests/unit/query-input-code-generator.test.tsx` -> 2 passed; generated source is shown and generator input does not mutate either existing draft
- refactor: generator mode uses a dedicated route branch and transient component state
- final result: route tests plus panel/tab tests -> 6 passed; `npm run type-check` passed

## Cycle 23: A2 preserves nullable columns

- test: `tests/unit/query-input-code-generator.test.tsx::preserves nullable columns` (new)
- initial run: passed; renderer already emitted the schema-backed nullable annotation
- deliberate red: temporarily suppressed nullable=true; route test failed because the generated `@Column` omitted the nullable attribute
- restored run: `npx vitest run tests/unit/query-input-code-generator.test.tsx -t "preserves nullable columns"` -> 1 passed
- refactor: none
- final result: A2 is sensitive to nullable metadata regressions

## Cycle 24: A3 proposes explicit relationships with a warning

- test: `tests/unit/query-input-code-generator.test.tsx::warns about inferred relationship cardinality` (new)
- red: `npx vitest run tests/unit/query-input-code-generator.test.tsx -t "warns about inferred relationship cardinality"` -> generated Entity did not contain `@ManyToOne`; FK metadata was not normalized or rendered
- green: `npx vitest run tests/unit/query-input-code-generator.test.tsx -t "warns about inferred relationship cardinality"` -> 1 passed; preview contains the owning-side annotation and diagnostics explain the inferred cardinality
- refactor: none; generation still uses the isolated generator panel and existing renderer registry
- final result: A3 route behavior passed

## Cycle 3: U9 maps supported SQL scalar types

- test: `tests/unit/codegen/typeMapping.test.ts::maps supported SQL scalar types` (new)
- red: `npx vitest run tests/unit/codegen/typeMapping.test.ts -t "maps supported SQL scalar types"` -> `AssertionError: expected { javaType: null, diagnostic: null } to match object { javaType: 'Long', diagnostic: null }`
- green: `npx vitest run tests/unit/codegen/typeMapping.test.ts -t "maps supported SQL scalar types"` -> 1 passed; common integer, text, decimal, and temporal types map to Java types
- refactor: none; the mapping table is explicit and centralized
- final result: focused U9 green; the active A1 acceptance failure remains expected until route integration

## Cycle 4: U12 converts Java identifier naming strategies

- test: `tests/unit/codegen/naming.test.ts::converts naming strategies and preserves source identifiers` (new)
- red: `npx vitest run tests/unit/codegen/naming.test.ts -t "converts naming strategies"` -> `AssertionError: expected '' to be 'userId'`
- green: `npx vitest run tests/unit/codegen/naming.test.ts -t "converts naming strategies"` -> 1 passed; snake_case, existing camel/Pascal case, acronym, and preserve scenarios are correct
- refactor: none; conversion is a single shared utility
- final result: focused U12 green; the active A1 acceptance failure remains expected until route integration

## Cycle 5: U13 renders JPA entity metadata

- test: `tests/unit/codegen/javaJpaRenderer.test.ts::renders entity metadata` (new)
- red: `npx vitest run tests/unit/codegen/javaJpaRenderer.test.ts -t "renders entity metadata"` -> `AssertionError: expected '' to contain '@Entity'`
- green: `npx vitest run tests/unit/codegen/javaJpaRenderer.test.ts -t "renders entity metadata"` -> 1 passed; Entity source includes JPA annotations, schema names, mapped field types, and filename
- refactor: none; renderer remains a pure function over the normalized table model
- final result: focused renderer test passed; codegen slice 6 passed; `npm test` -> 424 passed, 1 failed (expected A1 missing-tab red); `npm run type-check` passed

## Cycle 6: U14 renders column nullability

- test: `tests/unit/codegen/javaJpaRenderer.test.ts::renders column nullability` (new)
- initial run: passed against the U13 implementation
- deliberate red: temporarily removed nullable-attribute emission; `npx vitest run tests/unit/codegen/javaJpaRenderer.test.ts -t "renders column nullability"` -> failed because the generated `@Column` omitted `nullable = true`
- restored run: same command -> 1 passed; original renderer behavior restored
- refactor: none
- final result: U14 is sensitive to removal of the nullability rule

## Cycle 7: U2 rejects unsupported Oracle syntax

- test: `tests/unit/codegen/parseSql.test.ts::rejects unsupported Oracle syntax` (new)
- initial run: passed against the existing dialect guard
- deliberate red: bypassed the unsupported-dialect guard; the focused test failed with `expected 'invalid' to be 'unsupported'`
- restored run: `npx vitest run tests/unit/codegen/parseSql.test.ts -t "rejects unsupported Oracle syntax"` -> 1 passed
- refactor: none
- final result: U2 catches the tested dialect-guard regression

## Cycle 8: U3 reports invalid SQL location

- test: `tests/unit/codegen/parseSql.test.ts::reports invalid SQL location` (new)
- red: `npx vitest run tests/unit/codegen/parseSql.test.ts -t "reports invalid SQL location"` -> expected parser source span `{ start: 27, end: 27 }`, received `null`
- green: `npx vitest run tests/unit/codegen/parseSql.test.ts -t "reports invalid SQL location"` -> 1 passed; diagnostic includes the actual parser offset and line/column when available
- refactor: none; parser offsets are carried through without reconstructing a guessed location
- final result: full parser file -> 5 passed; `npm run type-check` passed

## Cycle 9: U10 reports unknown SQL types

- test: `tests/unit/codegen/typeMapping.test.ts::reports unknown SQL types` (new)
- red: `npx vitest run tests/unit/codegen/typeMapping.test.ts -t "reports unknown SQL types"` -> expected a warning with code `unknown-type`, received `null`
- green: `npx vitest run tests/unit/codegen/typeMapping.test.ts -t "reports unknown SQL types"` -> 1 passed; unknown types remain unmapped and receive an actionable warning
- refactor: none; resolution and warning are returned together from the centralized mapper
- final result: focused U10 green

## Cycle 10: U11 infers aggregate result types

- test: `tests/unit/codegen/typeMapping.test.ts::infers aggregate result types` (new)
- red: `npx vitest run tests/unit/codegen/typeMapping.test.ts -t "infers aggregate result types"` -> `AssertionError: expected null to be 'Long'` for COUNT
- green: `npx vitest run tests/unit/codegen/typeMapping.test.ts -t "infers aggregate result types"` -> 1 passed; COUNT/AVG and supported numeric SUM rules match the expected Java types
- refactor: extracted a shared unknown-type diagnostic used by scalar and aggregate mapping
- final result: codegen unit slice -> 11 passed; `npm run type-check` passed

## Cycle 11: U4 normalizes SELECT result facts

- test: `tests/unit/codegen/parseSql.test.ts::normalizes select result facts` (new)
- red: `npx vitest run tests/unit/codegen/parseSql.test.ts -t "normalizes select result facts"` -> `AssertionError: expected 'unsupported' to be 'parsed'`
- green: `npx vitest run tests/unit/codegen/parseSql.test.ts -t "normalizes select result facts"` -> 1 passed; aliases, expressions, source columns/tables, joins, grouping, ordering, and aggregation facts are normalized
- refactor: kept AST traversal local to the parser adapter; unsupported expression shapes return partial status with warnings
- final result: parser file -> 6 passed; `npm run type-check` passed

## Cycle 12: U5 diagnoses unsupported SELECT constructs

- test: `tests/unit/codegen/parseSql.test.ts::reports unsupported constructs` (new)
- red: `npx vitest run tests/unit/codegen/parseSql.test.ts -t "reports unsupported constructs"` -> `AssertionError: expected 'parsed' to be 'partial'` for SELECT DISTINCT
- green: `npx vitest run tests/unit/codegen/parseSql.test.ts -t "reports unsupported constructs"` -> 1 passed; SELECT DISTINCT returns a warning and partial status
- refactor: none; the diagnostic is emitted at the SELECT AST boundary
- final result: parser file -> 7 passed; `npm run type-check` passed

## Cycle 13: U6 classifies DDL and plain SELECT

- test: `tests/unit/codegen/classifySql.test.ts::classifies DDL and plain select` (new)
- setup: initial run could not resolve the new classifier module; added a typed placeholder, then reran
- red: `npx vitest run tests/unit/codegen/classifySql.test.ts -t "classifies DDL and plain select"` -> `AssertionError: expected { kind: 'unknown' } to match { kind: 'table-definition' }`
- green: `npx vitest run tests/unit/codegen/classifySql.test.ts -t "classifies DDL and plain select"` -> 1 passed; DDL recommends Entity and a plain projection recommends DTO
- refactor: DML kinds are checked explicitly to preserve the classification type union
- final result: classifier/parser slices -> 8 passed; `npm run type-check` passed

## Cycle 14: U7 distinguishes joins and aggregates

- test: `tests/unit/codegen/classifySql.test.ts::classifies joined and aggregate selects` (new)
- initial run: passed; join, aggregate, and grouped SELECTs were already classified distinctly from plain DTO projections
- deliberate red: temporarily disabled the join branch; focused test failed because the joined query became `select-dto` instead of `select-join`
- restored run: `npx vitest run tests/unit/codegen/classifySql.test.ts -t "classifies joined and aggregate selects"` -> 1 passed
- refactor: none
- final result: U7 is sensitive to join classification regressions

## Cycle 15: U8 classifies DML and unknown input

- test: `tests/unit/codegen/classifySql.test.ts::classifies DML and unknown input` (new)
- setup: first run found the reserved test variable name `delete`; renamed it and reran
- red: `npx vitest run tests/unit/codegen/classifySql.test.ts -t "classifies DML and unknown input"` -> `AssertionError: expected { kind: 'unknown' } to match { kind: 'insert' }`
- green: `npx vitest run tests/unit/codegen/classifySql.test.ts -t "classifies DML and unknown input"` -> 1 passed; INSERT/UPDATE/DELETE are classified with no output and a persistence-method recommendation; malformed SQL remains UNKNOWN
- refactor: parser preserves valid DML statement kinds without claiming normalized schema or generated output
- final result: classifier/parser slices -> 10 passed; `npm run type-check` passed

## Cycle 16: U17 resolves renderers by target

- test: `tests/unit/codegen/rendererRegistry.test.ts::resolves registered and planned targets` (new)
- setup: initial run could not resolve the new registry module; added a typed empty registry shell, then reran
- red: `npx vitest run tests/unit/codegen/rendererRegistry.test.ts -t "resolves registered and planned targets"` -> `AssertionError: expected null not to be null` for Java/JPA
- green: `npx vitest run tests/unit/codegen/rendererRegistry.test.ts -t "resolves registered and planned targets"` -> 1 passed; Java/JPA resolves, future targets are absent until registered
- refactor: exported the registry from the codegen barrel; default Java/JPA adapter delegates to the existing Entity renderer
- final result: registry/renderer tests -> 3 passed; `npm run type-check` passed

## Cycle 17: U18 exposes target and generation controls

- test: `tests/unit/codegen/GeneratorTargetControls.test.tsx::exposes generation options and planned targets` (new)
- red: `npx vitest run tests/unit/codegen/GeneratorTargetControls.test.tsx -t "exposes generation options and planned targets"` -> `TestingLibraryElementError: Unable to find an accessible element with the role "combobox" and name "Language"`
- green: `npx vitest run tests/unit/codegen/GeneratorTargetControls.test.tsx` -> 1 passed; planned targets are disabled and output, naming, Lombok, relationship, and validation controls emit their changes
- refactor: labels moved into English/Vietnamese locale dictionaries
- final result: focused control test passed; `npm run type-check` passed

## Cycle 18: U19 isolates generator input and reports diagnostics

- test: `tests/unit/codegen/CodeGeneratorPanel.test.tsx::isolates input and displays diagnostics` (new)
- red: `npx vitest run tests/unit/codegen/CodeGeneratorPanel.test.tsx -t "isolates input and displays diagnostics"` -> `TestingLibraryElementError: Unable to find an accessible element with the role "textbox" and name "SQL for code generation"`
- green: `npx vitest run tests/unit/codegen/CodeGeneratorPanel.test.tsx -t "isolates input and displays diagnostics"` -> 1 passed; input is panel-local and invalid SQL blocks output with a diagnostic
- refactor: none
- final result: panel slice later passed all three behaviors; TypeScript check passed

## Cycle 2: U1 normalizes supported DDL dialects

- test: `tests/unit/codegen/parseSql.test.ts::normalizes supported DDL for $dialect` (new; MySQL, PostgreSQL, Transact-SQL cases)
- red: `npx vitest run tests/unit/codegen/parseSql.test.ts -t "normalizes supported DDL"` -> `AssertionError: expected 'unknown' to be 'create-table'` (3 failed)
- green: `npx vitest run tests/unit/codegen/parseSql.test.ts -t "normalizes supported DDL"` -> 3 passed; all verified DDL dialect fixtures normalize correctly
- refactor: none; the parser adapter remains focused on schema-backed CREATE TABLE facts
- final result: parser DDL normalization passed for MySQL, PostgreSQL, and Transact-SQL

## Cycle 19: U20 replaces output and resets generator state

- test: `tests/unit/codegen/CodeGeneratorPanel.test.tsx::replaces and resets generator output` (new)
- red: `npx vitest run tests/unit/codegen/CodeGeneratorPanel.test.tsx -t "replaces and resets generator output"` -> `TestingLibraryElementError: Unable to find an accessible element with the role "textbox" and name "Generated Java code"` after valid CREATE TABLE input
- green: `npx vitest run tests/unit/codegen/CodeGeneratorPanel.test.tsx -t "replaces and resets generator output"` -> 1 passed; regenerated source replaces the prior preview and Reset restores initial panel state
- refactor: defaults are centralized in `INITIAL_OPTIONS`
- final result: panel slice -> 3 passed; `npm run type-check` passed

## Cycle 21: U22 supports keyboard tab navigation

- test: `tests/unit/codegen/TabNavigation.test.tsx::supports keyboard tab navigation` (new)
- initial run: passed; ArrowRight from Smart Editor reaches the generator and Home returns to SQL Paste
- deliberate red: removed the generator tab entry; focused test failed because the accessible generator tab was absent
- restored run: `npx vitest run tests/unit/codegen/TabNavigation.test.tsx -t "supports keyboard tab navigation"` -> 1 passed
- refactor: none; existing WAI-ARIA roving-tabindex implementation includes the fifth tab
- final result: U22 is sensitive to missing generator-tab registration

## Cycle 20: U21 exports generated source

- test: `tests/unit/codegen/CodeGeneratorPanel.test.tsx::exports generated source` (new)
- setup: first run lacked `URL.createObjectURL` in jsdom; stubbed the browser API and reran
- red: `npx vitest run tests/unit/codegen/CodeGeneratorPanel.test.tsx -t "exports generated source"` -> `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Copy"`
- green: `npx vitest run tests/unit/codegen/CodeGeneratorPanel.test.tsx -t "exports generated source"` -> 1 passed; clipboard receives exact source and downloaded Blob/filename are verified
- refactor: URL object cleanup is feature-detected for browser/test environment compatibility
- final result: panel and target-control tests -> 4 passed; `npm run type-check` passed

## Cycle 25: U24 normalizes explicit foreign keys

- test: `tests/unit/codegen/parseSql.test.ts::normalizes explicit foreign keys` (new)
- red: `npx vitest run tests/unit/codegen/parseSql.test.ts -t "normalizes explicit foreign keys"` -> constraints were empty instead of preserving the FK columns and referenced table/column
- green: same focused command -> 1 passed; FK AST facts are normalized into the semantic constraint model
- refactor: parser handles constraint AST nodes before attempting column normalization
- final result: parser behavior passed

## Cycle 26: U25 normalizes explicit unique constraints

- test: `tests/unit/codegen/parseSql.test.ts::normalizes explicit unique constraints` (new)
- red: `npx vitest run tests/unit/codegen/parseSql.test.ts -t "normalizes explicit unique constraints"` -> constraints were empty instead of preserving the unique local column
- green: same focused command -> 1 passed; primary, unique, and foreign-key table constraints share AST normalization
- refactor: none
- final result: parser behavior passed

## Cycle 27: U15 renders conservative FK relationships

- test: `tests/unit/codegen/javaJpaRenderer.test.ts::renders conservative relationships` (new)
- red: `npx vitest run tests/unit/codegen/javaJpaRenderer.test.ts -t "renders conservative relationships"` -> generated source lacked `@ManyToOne`
- green: `npx vitest run tests/unit/codegen/javaJpaRenderer.test.ts` -> 4 passed; single-column explicit FKs produce a unidirectional owning side, while composite metadata remains scalar with a warning
- refactor: renderer returns assumption diagnostics and does not invent inverse or cascade mappings
- final result: renderer behavior passed

## Cycle 28: U16 composite relationship warning evidence

- test: `tests/unit/codegen/javaJpaRenderer.test.ts::warns on unsupported relationships`
- verification: `npx vitest run tests/unit/codegen/javaJpaRenderer.test.ts` -> passed with all renderer tests
- evidence gap: this test was authored before implementation but its focused red was not run before the change; it remains PENDING in the test list per the TDD hard rule

## Cycle 29: Unique foreign keys qualify cardinality

- test: `tests/unit/codegen/javaJpaRenderer.test.ts::uses unique foreign-key metadata conservatively` (new)
- red: `npx vitest run tests/unit/codegen/javaJpaRenderer.test.ts -t "uses unique foreign-key metadata conservatively"` -> generated source used `@ManyToOne` instead of the unique-key-qualified `@OneToOne`
- green: same focused command -> 1 passed; a single-column unique FK proposes `@OneToOne` with a warning and no `@ManyToOne`
- refactor: imports and assumptions are derived from the resolved mapping kind
- final result: renderer behavior passed

## Cycle 30: A4 blocks invalid SQL with a specific diagnostic

- test: `tests/unit/query-input-code-generator.test.tsx::blocks invalid SQL with a location-specific diagnostic` (new)
- initial run: same focused command -> 1 passed; parser detail included line and column and no source preview was shown
- sensitivity probe: bypassing parser-status gating alone still passed because the panel preserved the parser diagnostic
- deliberate red: replaced parser diagnostics with the generic classification message; the test failed because line/column context was absent
- restored run: `npx vitest run tests/unit/query-input-code-generator.test.tsx -t "blocks invalid SQL with a location-specific diagnostic"` -> 1 passed
- refactor: none; restored parser-status gate and exact parser diagnostics
- final result: A4 is sensitive to loss of actionable parse locations

## Cycle 31: A5 preserves SELECT aliases in DTO properties

- test: `tests/unit/query-input-code-generator.test.tsx::uses SELECT aliases in DTO properties` (new)
- red: `npx vitest run tests/unit/query-input-code-generator.test.tsx -t "uses SELECT aliases in DTO properties"` -> no generated preview because the renderer rejected the DTO recommendation
- green: same focused command -> 1 passed; alias becomes camelCase DTO field, source is not an Entity, and uninferred source type is reported
- refactor: added a DTO path to the Java renderer adapter without changing parser/classifier responsibilities
- final result: A5 passed through the route

## Cycle 32: A6 maps aggregate DTO result types

- test: `tests/unit/query-input-code-generator.test.tsx::maps aggregate results and warns when SUM type is unknown` (new)
- initial run: same focused command -> 1 passed; COUNT is Long, AVG is BigDecimal, and SUM without schema evidence is Object with a warning
- deliberate red: disabled aggregate type inference in the DTO renderer; focused route test failed because COUNT became Object
- restored run: same focused command -> 1 passed
- refactor: none; `SUM` remains unresolved rather than guessing an input numeric type
- final result: deterministic aggregate types are visible in route output, with an explicit warning for missing schema facts

## Cycle 33: A7 renders joined SELECTs as flat DTOs

- test: `tests/unit/query-input-code-generator.test.tsx::generates a flattened DTO for a join` (new)
- initial run: same focused command -> 1 passed; both aliases are flat properties and output has no Entity annotation
- deliberate red: excluded joined shapes from DTO dispatch; focused route test failed because no preview was generated
- restored run: same focused command -> 1 passed
- refactor: none; join shape stays in classification facts while the common DTO renderer handles result fields
- final result: A7 route behavior is sensitive to joined DTO dispatch regressions

## Cycle 34: A8 includes grouped projection fields

- test: `tests/unit/query-input-code-generator.test.tsx::includes grouped fields in the DTO` (new)
- initial run: same focused command -> 1 passed; selected group field and COUNT output are present in a non-Entity DTO
- deliberate red: filtered non-aggregate projections from DTO fields; focused route test failed because `departmentId` disappeared
- restored run: same focused command -> 1 passed
- refactor: none; DTO output remains the normalized SELECT projection list in source order
- final result: A8 is sensitive to omission of grouped projection fields

## Cycle 35: A10 disables planned renderer targets

- test: `tests/unit/query-input-code-generator.test.tsx::marks non-Java renderer targets unavailable` (new)
- initial run: same focused command -> 1 passed; Java is selected and all five planned options are disabled
- deliberate red: removed `disabled` from planned target options; focused route test failed on the first planned option
- restored run: same focused command -> 1 passed
- refactor: none; disabled target selection remains in the shared target control
- final result: A10 is sensitive to enabling a planned language

## Cycle 36: A11 generates a combined complex SELECT DTO

- test: `tests/unit/query-input-code-generator.test.tsx::generates a supported complex query as a DTO` (new)
- initial run: same focused command -> 1 passed; aliases, aggregate type, grouping, join, and DTO-only output are present
- deliberate red: blocked SELECT shapes combining joins and aggregation in renderer dispatch; test failed because preview was absent
- restored run: same focused command -> 1 passed
- refactor: none; the renderer consumes normalized field facts across combined query shapes
- final result: A11 route behavior passed

## Cycle 37: A12 keeps renderer extension independent

- test: `tests/unit/codegen/rendererRegistry.test.ts::resolves a registered extension renderer independently` (strengthened)
- initial run: same focused command -> 1 passed; a registered renderer is invoked with framework-neutral model/classification/options and returns source
- deliberate red: disabled registry storage; focused test failed because resolving the registered target returned null
- restored run: same focused command -> 1 passed
- refactor: none; parser and classifier remain outside the renderer registry
- final result: A12 extension behavior passed

## Cycle 38: A13 exposes DDL classification and recommendation

- test: `tests/unit/query-input-code-generator.test.tsx::classifies table definitions and recommends Entity output` (new)
- red: `npx vitest run tests/unit/query-input-code-generator.test.tsx -t "classifies table definitions and recommends Entity output"` -> the route had no SQL classification region
- green: same focused command -> 1 passed; CREATE TABLE is shown as Table definition with Entity recommendation
- refactor: classification labels and decision summary are localized in English and Vietnamese
- final result: A13 passed through the route

## Cycle 39: A14 distinguishes SELECT output shapes

- test: `tests/unit/query-input-code-generator.test.tsx::distinguishes entity-like, DTO, and aggregate SELECT shapes` (new)
- red: focused command -> `SELECT *` appeared as DTO SELECT and was rendered despite missing column/key facts
- green: same focused command -> 1 passed; wildcard is entity-like but blocked, explicit projection is DTO, grouped aggregation is Aggregate SELECT
- deliberate red: disabled wildcard-specific classification; focused test failed because Entity-like SELECT was shown as DTO SELECT
- restored run: same focused command -> 1 passed
- refactor: wildcard safety is decided by classification before the renderer is invoked
- final result: A14 passed through the route; A15's grouped/non-Entity assertion is covered jointly by A8 and this cycle

## Cycle 40: A16 classifies DML without source generation

- test: `tests/unit/query-input-code-generator.test.tsx::classifies DML without generating a persistence method` (new)
- initial run: same focused command -> 1 passed; INSERT shows an unavailable output recommendation, persistence-method guidance, and no preview
- deliberate red: removed INSERT from the DML classifier branch; focused test failed because the classification became Unknown
- restored run: same focused command -> 1 passed
- refactor: classification summary is shared by supported, blocked, and DML outcomes
- final result: A16 passed through the route

## Cycle 41: A17 previews generated source as Java

- test: `tests/unit/query-input-code-generator.test.tsx::shows generated code in the Java-highlighted preview` (new)
- initial run: same focused command -> 1 passed; route preview receives Monaco language `java`
- deliberate red: changed preview language to plaintext; focused test failed on `data-language`
- restored run: same focused command -> 1 passed
- refactor: route test stub now exposes Monaco's configured language
- final result: A17 preview language passed

## Cycle 42: A18 copies exact generated source at the route

- test: `tests/unit/query-input-code-generator.test.tsx::copies the exact generated source from the route` (new)
- initial run: same focused command -> 1 passed; clipboard receives exact preview text and success feedback appears
- deliberate red: appended a newline to clipboard content; test failed on exact source equality
- restored run: same focused command -> 1 passed
- refactor: none
- final result: A18 route copy passed

## Cycle 43: A19 downloads exact Java source

- test: `tests/unit/query-input-code-generator.test.tsx::downloads the exact generated Java source from the route`
- initial run: focused test passed; Blob text, `User.java` filename, URL cleanup, and success feedback were asserted
- deliberate red: appended `.txt` to the generated filename; focused test failed because it received `User.java.txt` instead of `User.java`
- restored run: same focused command -> 1 passed
- final result: A19 is sensitive to an incorrect download extension

## Cycle 44: A20 replaces route output on regeneration

- test: `tests/unit/query-input-code-generator.test.tsx::replaces the previous route preview on regeneration`
- initial run: focused test passed; second generated class replaced the first
- mutation red: retained existing output instead of replacing it; focused test failed because `class User` remained instead of `class Order`
- restored run: same focused command -> 1 passed
- final result: A20 route regeneration behavior is mutation-sensitive

## Cycle 45: A21 resets route input and output

- test: `tests/unit/query-input-code-generator.test.tsx::resets route input to its initial value and clears generated output`
- initial run: focused test passed; Reset cleared output/classification and left app SQL state unchanged
- mutation red: retained edited generator SQL in Reset; focused test failed because the edited CREATE TABLE remained in the input
- restored run: same focused command -> 1 passed
- final result: A21 route reset behavior is mutation-sensitive; current route initial generator SQL is empty

## Cycle 46: U27 makes primary keys non-null

- test: `tests/unit/codegen/parseSql.test.ts::marks primary-key columns as non-null without explicit NOT NULL`
- red: focused test failed because an inline primary-key column normalized to `nullable: true`
- green: same focused command -> 1 passed for both inline and table-level primary keys
- implementation: after collecting constraints, primary-key column nullability is normalized to false
- final result: U27 parser behavior passed

## Cycle 47: U16 rejects unsupported composite relationships

- test: `tests/unit/codegen/javaJpaRenderer.test.ts::warns on unsupported relationships`
- initial run: focused test passed; no original red was recorded, so the test was not initially marked green
- mutation red: removed both single-column metadata guards; focused test failed because the renderer emitted `@ManyToOne` for the composite key
- restored run: same focused command -> 1 passed
- final result: U16 is mutation-sensitive and now marked green

## Cycle 48: A23 avoids invented relationship behavior

- test: `tests/unit/query-input-code-generator.test.tsx::does not invent inverse or cascade mappings for explicit relationships`
- initial run: focused test passed; route preview used an owning-side mapping without inverse or cascade annotations
- mutation red: added `CascadeType.ALL`; focused test failed on the generated cascade annotation
- restored run: same focused command -> 1 passed
- final result: A23 relationship safety is mutation-sensitive

## Cycle 49: A24 explains composite foreign keys

- test: `tests/unit/query-input-code-generator.test.tsx::explains composite foreign-key handling and keeps the columns scalar`
- initial run: focused test passed; route retained both local scalar columns and showed the composite/incomplete warning
- mutation red: accepted composite foreign keys as ordinary relationships; focused test failed because `@ManyToOne` was emitted
- restored run: same focused command -> 1 passed
- final result: A24 route behavior is mutation-sensitive

## Cycle 50: U23 generates 100 relationships within target

- test: `tests/unit/codegen/performance.test.ts::generates 100 relationships within target` (new)
- fixture: one supported MySQL CREATE TABLE with 100 explicit single-column foreign-key relationships
- measured path: parse, classify, resolve the Java/JPA renderer, and render all 100 mappings
- result: `npx vitest run tests/unit/codegen/performance.test.ts -t "generates 100 relationships within target"` -> 1 passed; Vitest reported 50 ms for the test, below the 2-second target
- final result: U23 meets SC-006 for the documented fixture

## Cycle 51: A26 retains generator SQL across mode switches

- test: `tests/unit/query-input-code-generator.test.tsx::keeps generator input separate from SQL and MyBatis drafts`
- red: focused route test switched from the generator to SQL Paste and back; generator SQL was empty after the panel remounted
- implementation: store the generator SQL draft in a dedicated non-persisted app-store field, separate from `rawSql` and `myBatisXml`
- green: focused test passed after verifying the generator value survives the switch and existing SQL/MyBatis drafts remain unchanged
- browser confirmation: keyboard-switched in the live `/query-input` page; the generator draft survived returning to the tab
- final result: generator SQL draft retention is mutation-independent route behavior; generated preview/options remain panel-local and Reset clears the SQL draft

## Cycle 52: Final automated verification

- focused: code-generation unit and route slice -> 50 passed across 11 files
- regression: full `npm test` -> 476 passed across 57 files
- type-check: `npm run type-check` -> passed
- production build: `npm run build` -> passed when run without the development server sharing `.next`
- final result: automated feature gates are green; T041's complete manual scenario walkthrough remains open

## Cycle 53: A27 seeds generator SQL from the active input and diagnoses demo query 7

- acceptance test: `tests/unit/query-input-code-generator.test.tsx::prefills generator SQL from the active SQL input on first entry`
- red: focused route test received an empty generator input after switching from SQL Paste
- implementation: copy the active SQL/MyBatis-resolved/Smart Editor query into the generator only on first entry; retain a nullable initial-value marker so an intentionally empty or edited generator draft is not overwritten and Reset restores the seeded SQL
- green: `npx vitest run tests/unit/query-input-code-generator.test.tsx -t "prefills generator|keeps generator input separate|resets route input"` -> 3 passed
- diagnostic characterization: `npx vitest run tests/unit/codegen/parseSql.test.ts -t "demo query 7"` -> 1 passed against `src/sample/demo_query7.sql`; it normalizes `SELECT DISTINCT *` as a wildcard and emits the DISTINCT unsupported-clause warning, not `unsupported-select-expression`
- final verification: `npm test` -> 478 passed across 57 files; `npm run type-check` -> passed

## Cycle 54: U29 follows the application theme in the generated-code editor

- test: `tests/unit/codegen/CodeGeneratorPanel.test.tsx::follows the system light and dark themes in the generated-code editor`
- red: focused test found no Monaco theme prop for the generated-code preview
- implementation: subscribe to `settings.theme` and pass `vs-dark` or `vs` to Monaco, matching the existing SQL preview
- green: `npx vitest run tests/unit/codegen/CodeGeneratorPanel.test.tsx` -> 4 passed, including a live dark-to-light update
- type-check: `npm run type-check` -> passed

## Cycle 55: U30/U31 activate generation options and add a MyBatis mapper companion

- red: renderer tests failed because `useLombok` and `validationAnnotations` were ignored; new controls tests failed because no MyBatis mapper option/file existed
- implementation: Entity/DTO Lombok output uses `@Getter`/`@Setter`; validation adds only schema-backed `@NotNull`/`@Size`; disabling explicit relationships preserves FK scalar fields; optional `generateMyBatisMapper` emits an empty companion interface annotated with `org.apache.ibatis.annotations.Mapper`
- UI: generated files are selectable in tabs; Preview, Copy, and Download use the selected `.java` file
- focused: `npx vitest run tests/unit/codegen tests/unit/query-input-code-generator.test.tsx` -> 58 passed across 11 files
- type-check: `npm run type-check` -> passed after updating all option fixtures
- full suite: `npm test` -> 483 passed and 1 failed across 57 files; the failing Smart SQL Editor test passed when rerun alone (`npx vitest run tests/unit/smart-sql-editor-format-error-page.test.tsx -t "resolves the region from the cross-check parser"`)
- production build: compilation passed; prerender failed on `/404` with `<Html> should not be imported outside of pages/_document`; no `next/document` imports exist under `src/`

## Cycle 56: U32 shows immediate copy and download feedback

- test: `tests/unit/codegen/CodeGeneratorPanel.test.tsx::exports generated source` and `::shows an error notification when copying fails`; route copy/download acceptance tests
- red: clipboard source was written, but no success/error toast was called; the prior feedback text was rendered at the bottom of the panel, after the preview/diagnostics
- implementation: use global Sonner success/error notifications for copy and success notification for download; remove the off-screen feedback paragraph
- green: `npx vitest run tests/unit/codegen tests/unit/query-input-code-generator.test.tsx` -> 59 passed across 11 files
- type-check: `npm run type-check` -> passed