---
feature: 015-sql-code-generator
loop: outside-in
profile: .specify/memory/tdd-profile.md
spec_criteria: 25
planned_at: 1fc60d0
updated_at: 1fc60d0
suite_baseline: green
---

# Test List: SQL to Code Generator

Acceptance behaviors use route-composed Testing Library tests around the `/query-input` page and generator tab. Vitest has no browser acceptance runner; these tests exercise the real page/component composition in jsdom, while the browser workflow remains a manual quickstart check.

Baseline at `1fc60d0`: `npm test` passed, 45 files and 413 tests, in 43.06 seconds.

## Outer loop: acceptance behaviors

| id  | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| A1 | A CREATE TABLE input produces a Java/JPA Entity with Java naming and the expected table, property, and primary-key annotations | US1-AC1, US3-AC1, FR-004, FR-009 | example | DONE | `tests/unit/query-input-code-generator.test.tsx::generates a JPA entity using Java conventions` |
| A2 | Nullable columns are represented as nullable in the generated Entity | US1-AC2, FR-012 | example | DONE | `tests/unit/query-input-code-generator.test.tsx::preserves nullable columns` |
| A3 | A foreign key offers a relationship and explains any cardinality assumption, including when cardinality is unclear | US1-AC3, US6-AC1, US6-AC4, FR-006, FR-013, FR-014 | example | DONE | `tests/unit/query-input-code-generator.test.tsx::warns about inferred relationship cardinality` |
| A4 | Invalid or ambiguous SQL shows a specific diagnostic and does not produce guessed code | US1-AC4, FR-011, FR-014 | example | DONE | `tests/unit/query-input-code-generator.test.tsx::blocks invalid SQL with a location-specific diagnostic` |
| A5 | A SELECT alias becomes the matching DTO property name | US2-AC1, FR-005 | example | DONE | `tests/unit/query-input-code-generator.test.tsx::uses SELECT aliases in DTO properties` |
| A6 | COUNT, SUM, and AVG output fields use deterministic Java aggregate types or report insufficient type evidence | US2-AC2, FR-003, FR-005 | example | DONE | `tests/unit/query-input-code-generator.test.tsx::maps aggregate results and warns when SUM type is unknown` |
| A7 | A joined SELECT produces a flattened DTO rather than an Entity | US2-AC3, FR-002, FR-005 | example | DONE | `tests/unit/query-input-code-generator.test.tsx::generates a flattened DTO for a join` |
| A8 | GROUP BY fields are represented in the generated DTO with inferred or explicitly unresolved types | US2-AC4, FR-005 | example | DONE | `tests/unit/query-input-code-generator.test.tsx::includes grouped fields in the DTO` |
| A9 | Duplicate of A1: Java/JPA naming and annotations are already asserted by the Entity-generation acceptance behavior | US3-AC1 | example | DROPPED (merged into A1) | |
| A10 | Non-Java targets are visibly marked as planned and cannot generate code | US3-AC2, FR-007, FR-015 | example | DONE | `tests/unit/query-input-code-generator.test.tsx::marks non-Java renderer targets unavailable` |
| A11 | A supported complex SELECT generates code consistent with its aliases, joins, and aggregate structure | US3-AC3, FR-005 | example | DONE | `tests/unit/query-input-code-generator.test.tsx::generates a supported complex query as a DTO` |
| A12 | The Java renderer can be extended without changing parser or classifier behavior | US3-AC4, FR-008 | example | DONE | `tests/unit/codegen/rendererRegistry.test.ts::resolves a registered extension renderer independently` |
| A13 | CREATE TABLE is classified as TABLE_DEFINITION and recommends Entity generation | US4-AC1, FR-002 | example | DONE | `tests/unit/query-input-code-generator.test.tsx::classifies table definitions and recommends Entity output` |
| A14 | SELECT structure distinguishes entity-like, DTO, and aggregate output | US4-AC2, FR-002 | example | DONE | `tests/unit/query-input-code-generator.test.tsx::distinguishes entity-like, DTO, and aggregate SELECT shapes` |
| A15 | GROUP BY with aggregates is classified as DTO/AGGREGATION, never Entity | US4-AC3, FR-002 | example | DONE | `tests/unit/query-input-code-generator.test.tsx::distinguishes entity-like, DTO, and aggregate SELECT shapes` + `::includes grouped fields in the DTO` |
| A16 | INSERT, UPDATE, and DELETE are identified as DML with a persistence-method suggestion | US4-AC4, FR-002 | example | DONE | `tests/unit/query-input-code-generator.test.tsx::classifies DML without generating a persistence method` |
| A17 | Generated Java is shown in a Java syntax-highlighted preview | US5-AC1, FR-010 | example | DONE | `tests/unit/query-input-code-generator.test.tsx::shows generated code in the Java-highlighted preview` |
| A18 | Copy places the exact generated source on the clipboard and visibly confirms success or failure | US5-AC2, FR-010 | example | DONE | `tests/unit/query-input-code-generator.test.tsx::copies the exact generated source from the route`; `tests/unit/codegen/CodeGeneratorPanel.test.tsx::shows an error notification when copying fails` |
| A19 | Download produces a `.java` file containing the generated source and visibly confirms completion | US5-AC3, FR-010 | example | DONE | `tests/unit/query-input-code-generator.test.tsx::downloads the exact generated Java source from the route` |
| A20 | Regeneration replaces the prior preview and exposes Reset | US5-AC4, FR-018 | example | DONE | `tests/unit/query-input-code-generator.test.tsx::replaces the previous route preview on regeneration` |
| A21 | Reset restores the initial SQL and clears generated output | US5-AC5, FR-018 | example | DONE | `tests/unit/query-input-code-generator.test.tsx::resets route input to its initial value and clears generated output` |
| A22 | Duplicate of A3: foreign-key relationship proposal and cardinality warning are asserted together | US6-AC1 | example | DROPPED (merged into A3) | |
| A23 | Generated relationships are not bidirectional by default and invent no cascades | US6-AC2, FR-006 | example | DONE | `tests/unit/query-input-code-generator.test.tsx::does not invent inverse or cascade mappings for explicit relationships` |
| A24 | A composite foreign key is handled or skipped with an explicit explanation | US6-AC3, FR-006, FR-011 | example | DONE | `tests/unit/query-input-code-generator.test.tsx::explains composite foreign-key handling and keeps the columns scalar` |
| A26 | Generator SQL draft survives mode switches without replacing existing SQL or MyBatis drafts | FR-017, SC-008 | example | DONE | `tests/unit/query-input-code-generator.test.tsx::keeps generator input separate from SQL and MyBatis drafts` |
| A25 | Duplicate of A3: unclear foreign-key cardinality is covered by the same warning behavior | US6-AC4 | example | DROPPED (merged into A3) | |
| A27 | First entry to the generator seeds its SQL from the active query input, then preserves that initial value for Reset and keeps later generator edits isolated | FR-017, SC-008 | example | DONE | `tests/unit/query-input-code-generator.test.tsx::prefills generator SQL from the active SQL input on first entry`; `::keeps generator input separate from SQL and MyBatis drafts`; `::resets route input to its initial value and clears generated output` |
| A28 | Enabling MyBatis Mapper output adds a separate interface file while preserving Entity/DTO output and makes each file independently previewable/exportable | FR-010, FR-017 | example | DONE | `tests/unit/codegen/CodeGeneratorPanel.test.tsx::applies generation options and mapper output to generated source`; `tests/unit/codegen/CodeGeneratorPanel.test.tsx::exports generated source` |

## Inner loop: unit behaviors

### `src/lib/codegen/parseSql.ts`

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U1 | Supported MySQL, PostgreSQL, and SQL Server DDL normalizes names, columns, and explicit constraints | FR-001 | example | DONE | `tests/unit/codegen/parseSql.test.ts::normalizes supported DDL dialects` |
| U2 | Oracle input returns an unsupported-dialect diagnostic rather than guessed source | FR-001, FR-014 | example | DONE | `tests/unit/codegen/parseSql.test.ts::rejects unsupported Oracle syntax` |
| U3 | Malformed SQL returns an actionable location diagnostic and no generated output | FR-011, FR-014 | example | DONE | `tests/unit/codegen/parseSql.test.ts::reports invalid SQL location` |
| U4 | SELECT normalization preserves aliases, joins, grouping, ordering, and supported expression facts | FR-005 | example | DONE | `tests/unit/codegen/parseSql.test.ts::normalizes select result facts` |
| U5 | Unsupported SQL constructs produce a diagnostic rather than silently incomplete semantic data | FR-011, FR-014 | example | DONE | `tests/unit/codegen/parseSql.test.ts::reports unsupported constructs` |
| U24 | Explicit foreign keys preserve local and referenced table/column metadata | FR-006 | example | DONE | `tests/unit/codegen/parseSql.test.ts::normalizes explicit foreign keys` |
| U25 | Explicit unique constraints preserve their constrained columns for relationship cardinality analysis | FR-006, FR-013 | example | DONE | `tests/unit/codegen/parseSql.test.ts::normalizes explicit unique constraints` |
| U27 | Primary-key columns are non-null even without an explicit NOT NULL modifier | FR-004, FR-012 | example | DONE | `tests/unit/codegen/parseSql.test.ts::marks primary-key columns as non-null without explicit NOT NULL` |
| U28 | The demo query 7 wildcard projection is normalized as a wildcard; its partial status is due to DISTINCT, not an unsupported selected expression | FR-011, FR-014 | example | DONE | `tests/unit/codegen/parseSql.test.ts::reports DISTINCT as the limitation for the demo query 7 wildcard projection` |

### `src/lib/codegen/classifySql.ts`

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U6 | DDL and plain SELECT inputs receive their required classifications and recommendations | FR-002 | example | DONE | `tests/unit/codegen/classifySql.test.ts::classifies DDL and plain select` |
| U7 | Joined, aggregated, and grouped SELECTs are not classified as plain Entity input | FR-002 | example | DONE | `tests/unit/codegen/classifySql.test.ts::classifies joined and aggregate selects` |
| U8 | INSERT, UPDATE, DELETE, and insufficient-evidence input receive DML/UNKNOWN outcomes without source generation | FR-002, FR-014 | example | DONE | `tests/unit/codegen/classifySql.test.ts::classifies DML and unknown input` |

### `src/lib/codegen/typeMapping.ts` and `src/lib/codegen/naming.ts`

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U9 | Supported SQL scalar types map deterministically to Java types, including BIGINT to Long | FR-003 | example | DONE | `tests/unit/codegen/typeMapping.test.ts::maps supported SQL scalar types` |
| U10 | Unknown SQL types produce an explicit warning or blocked mapping, not an unsafe fallback | FR-003, FR-011 | example | DONE | `tests/unit/codegen/typeMapping.test.ts::reports unknown SQL types` |
| U11 | COUNT, SUM, and AVG infer the required Java aggregate types or report insufficient type evidence | FR-003, FR-005 | example | DONE | `tests/unit/codegen/typeMapping.test.ts::infers aggregate result types` |
| U12 | Naming strategies convert identifiers consistently while explicit SQL aliases remain the selected property names | FR-009 | example | DONE | `tests/unit/codegen/naming.test.ts::converts naming strategies and preserves source identifiers` |

### `src/lib/codegen/javaJpaRenderer.ts`

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U13 | Entity output includes valid Java/JPA structure and schema-backed table, column, and primary-key metadata | FR-004, FR-007 | example | DONE | `tests/unit/codegen/javaJpaRenderer.test.ts::renders entity metadata` |
| U14 | Nullable and NOT NULL column facts result in corresponding nullable metadata | FR-012 | example | DONE | `tests/unit/codegen/javaJpaRenderer.test.ts::renders column nullability` |
| U15 | Explicit foreign keys render only supported owning-side mappings and disclose cardinality assumptions | FR-006, FR-013 | example | DONE | `tests/unit/codegen/javaJpaRenderer.test.ts::renders conservative relationships` |
| U16 | Composite or insufficient relationship metadata is skipped or warned without invented cascades or inverse collections | FR-006, FR-011, FR-013 | example | DONE | `tests/unit/codegen/javaJpaRenderer.test.ts::warns on unsupported relationships` |
| U26 | A unique single-column foreign key qualifies a one-to-one owning-side proposal with a warning | FR-006, FR-013 | example | DONE | `tests/unit/codegen/javaJpaRenderer.test.ts::uses unique foreign-key metadata conservatively` |

### `src/lib/codegen/rendererRegistry.ts` and generator UI

| id | behavior | traces | kind | state | test |
| --- | --- | --- | --- | --- | --- |
| U17 | Java/JPA resolves to an available renderer; planned targets are unavailable; a new renderer can be registered independently | FR-007, FR-008, FR-015 | example | DONE | `tests/unit/codegen/rendererRegistry.test.ts::resolves registered and planned targets` |
| U18 | Target, naming, Lombok, relationship, and validation options are represented and affect generation choices | FR-015, FR-016 | example | DONE | `tests/unit/codegen/GeneratorTargetControls.test.tsx::exposes generation options and planned targets` |
| U19 | The generator panel keeps its SQL input isolated and reports generation diagnostics in the panel | FR-011, FR-017 | example | DONE | `tests/unit/codegen/CodeGeneratorPanel.test.tsx::isolates input and displays diagnostics` |
| U20 | Regeneration replaces generator output and Reset restores the panel's initial state without changing other input modes | FR-017, FR-018 | example | DONE | `tests/unit/codegen/CodeGeneratorPanel.test.tsx::replaces and resets generator output` |
| U21 | Copy and Download preserve the selected generated file exactly and use its `.java` filename | FR-010 | example | DONE | `tests/unit/codegen/CodeGeneratorPanel.test.tsx::exports generated source` |
| U22 | The generator tab exposes accessible tab semantics and supports keyboard navigation | FR-017 | example | DONE | `tests/unit/codegen/TabNavigation.test.tsx::supports keyboard tab navigation` |
| U23 | Generation for the specified 100-relationship fixture completes within the 2-second preview target | SC-006 | example | DONE | `tests/unit/codegen/performance.test.ts::generates 100 relationships within target` |
| U29 | Generated Java editor follows the app's current light/dark setting and updates while mounted | FR-017 | example | DONE | `tests/unit/codegen/CodeGeneratorPanel.test.tsx::follows the system light and dark themes in the generated-code editor` |
| U30 | Lombok, FK relationship, and schema-backed validation options affect generated Entity source | FR-006, FR-012, FR-015 | example | DONE | `tests/unit/codegen/javaJpaRenderer.test.ts::uses Lombok when enabled`; `::adds schema-backed validation annotations when enabled`; `::renders conservative relationships`; `tests/unit/codegen/CodeGeneratorPanel.test.tsx::applies generation options and mapper output to generated source` |
| U31 | The optional MyBatis `@Mapper` file is a separate companion for Entity and DTO outputs and can be selected for preview/export | FR-010, FR-017 | example | DONE | `tests/unit/codegen/javaJpaRenderer.test.ts::generates a separate MyBatis mapper interface when enabled`; `::generates a mapper companion for DTO output`; `tests/unit/codegen/GeneratorTargetControls.test.tsx::exposes generation options and planned targets`; `tests/unit/codegen/CodeGeneratorPanel.test.tsx::exports generated source` |
| U32 | Copy reports clipboard success and failure through global notifications instead of off-screen bottom-panel text | FR-010 | example | DONE | `tests/unit/codegen/CodeGeneratorPanel.test.tsx::exports generated source`; `::shows an error notification when copying fails`; `tests/unit/query-input-code-generator.test.tsx::copies the exact generated source from the route` |

## Invariants and edge cases still to place

- A26 verifies generator SQL retention across mode switches and preserves SQL Paste/MyBatis draft state. Smart Editor's Ollama-backed workflow remains a browser/manual check because the local Ollama service is not available in this environment.
- A27 verifies first-entry seeding from the active input and that the generator's own draft and reset baseline remain independent afterward.
- DDL and SELECT parsing must distinguish supported syntax from Oracle and unsupported AST forms; parser-dependent checks must not be skipped and counted as evidence.

## Out of scope

- Full Oracle parsing: the installed parser has no Oracle grammar; MVP behavior is an explicit unsupported-dialect diagnostic, not code generation.
- DML repository/service method generation: the spec's output framework and method contract are not defined; classification and a recommendation are tested, but no method source is generated.
- C#, Python, TypeScript, Go, or Kotlin source generation: these remain planned targets, not MVP renderers.
- Empirical accuracy percentages, developer time savings, and real-browser E2E acceptance: this repository has no acceptance runner or evaluation corpus; route-composed jsdom tests cover behavior, and manual browser scenarios remain in the quickstart.
- Arbitrary Java compilation against a user's JPA version: the target dependency/version is unspecified; tests assert generated source structure and deterministic outputs.

## Verification commands

Copied from `.specify/memory/tdd-profile.md`:

- Single test: `npx vitest run {file} -t "{name}"`
- File: `npx vitest run {file}`
- Full suite: `npm test`
- Coverage: unavailable (`null` in the profile)
- Mutation: unavailable (`null` in the profile)
- Acceptance/E2E: unavailable (`null` in the profile)