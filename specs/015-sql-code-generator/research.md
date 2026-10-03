# Research: SQL → Code Generator

**Date**: 2026-10-02  
**Plan**: [plan.md](plan.md)  
**Spec**: [spec.md](spec.md)

## SQL Parsing and Dialect Coverage

**Decision**: Use the already-installed `node-sql-parser` AST API behind a feature-owned dialect adapter for MySQL, PostgreSQL, and Transact-SQL. Normalize only AST facts required for CREATE TABLE and SELECT generation. Keep the existing `dt-sql-parser` use in dialect validation unchanged. Return an explicit unsupported-dialect/construct warning whenever the selected dialect lacks a verified grammar; Oracle is such a case in the current dependency set.

**Rationale**: Local probes confirmed `node-sql-parser` 5.4.0 produces CREATE TABLE and SELECT ASTs for MySQL, PostgreSQL, and Transact-SQL. The same probe reports both `oracle` and `plsql` as unsupported. Existing `dialectValidator.ts` also documents that `dt-sql-parser` only supplies a grammar for MySQL and PostgreSQL in its AST cross-check. The app's current `sqlAnalyzer.ts` is primarily regex-based and explicitly describes AST traversal as a future integration point; its `AnalysisResult` is optimized for visualization metrics, not schema/code generation.

**Alternatives considered**:
- Reuse only `analyzeSql()` and its visualization model: rejected because it does not expose authoritative column types, nullability, keys, or constraints.
- Add another parser dependency immediately: rejected because no Oracle-capable candidate has been validated against this application's build/runtime and no additional dependency is needed for the verified MVP dialects.
- Guess Oracle output from regex captures: rejected because generated code must not silently invent schema semantics.

**Boundary**: Oracle is not supported for semantic code generation in this plan until an Oracle grammar is selected and validated. The UI must identify the limitation and must not render a guessed Entity/DTO as if parsing succeeded. A future Oracle parser decision is a release-scope follow-up, not a hidden fallback.

## Framework-Neutral Semantic Model

**Decision**: Add a generator-owned intermediate representation for parsed statement kind, dialect, tables, columns, raw SQL types, nullability, primary/unique/foreign-key constraints, SELECT fields/aliases/expressions, aggregation/grouping facts, classification, warnings, and source snippets. Keep parser AST node types out of this model.

**Rationale**: This creates the separation required for additional language/framework renderers and keeps Java/JPA concerns out of SQL parsing. Raw type text and provenance remain available so unsupported or ambiguous mappings can be reported accurately.

**Alternatives considered**:
- Transform parser AST directly to Java: rejected because it couples grammar details to the renderer and blocks other output languages.
- Reuse the existing visualization `AnalysisResult`: rejected because it models tables and joins for graph/metrics but does not represent DDL constraints or typed SELECT expressions as a generation contract.

## Classification and Output Selection

**Decision**: Classify from AST structure, before rendering. CREATE/ALTER table structures map to table-definition output; SELECT statements map to an Entity-like shape only when the parsed result unambiguously represents a single table with complete entity fields and key metadata, otherwise to DTO/projection. Aggregate/grouped SELECTs are DTO/projection. INSERT/UPDATE/DELETE are classified but return a clear no-renderer-supported result in this MVP. Unknown or unsupported AST shapes block generation and include actionable warnings.

**Rationale**: AST statement kinds, FROM/JOIN structure, selected expressions, aliases, aggregate functions, GROUP BY, and constraints are deterministic evidence. A JOIN alone does not establish relationship cardinality. DML has no accepted MVP output contract in the clarified spec.

**Alternatives considered**:
- Treat all SELECTs as Entities: rejected because projections and aggregations do not represent full persistent entities.
- Use an LLM to infer classification: rejected because classification can be derived deterministically and must not contradict parser facts.
- Generate repository methods for all DML immediately: rejected because method signatures, transaction behavior, and service/controller conventions are not defined by the MVP acceptance scenarios.

## Java Type Mapping and Naming

**Decision**: Centralize dialect-aware SQL type normalization and Java/JPA type mapping, and centralize snake_case/camelCase/PascalCase conversion. Preserve the original SQL identifier and explicit SELECT alias alongside the generated name. Emit an unresolved-type warning rather than an unsafe fallback.

**Rationale**: One mapping surface prevents duplicate type/naming logic across entity and DTO renderers. Preserving source names supports accurate `@Column` names and meaningful aliases; Java properties and class names can follow the selected convention without changing SQL meaning.

**Alternatives considered**:
- Map unknown/vendor-specific types to `String`: rejected because it silently changes semantics.
- Infer Java types from identifier names: rejected because names do not determine SQL value types.
- Generate cascades, fetch strategies, or ID generation defaults: rejected because those are not inferable from schema metadata and the spec forbids invented behavior.

## UI Integration, State, and Editor

**Decision**: Add the feature as a new input mode/tab on the existing `/query-input` page, use the existing Monaco package for the generated Java preview, and keep generation state transient. Update the shared input-mode type and tab keyboard/accessibility behavior; do not create an `/input-query` route alias.

**Rationale**: The route tree, sidebar, login redirects, and internal navigation all use `/query-input`; there is no `/input-query` page. The existing tab component follows an accessible tab pattern. Monaco is already used in the Query Input preview and Smart SQL Editor, so no editor dependency is needed.

**Alternatives considered**:
- Create a second route at `/input-query`: rejected because it duplicates the canonical screen and disagrees with all current links.
- Add generated code to the shared Zustand persisted state: rejected because the output is session-local and persistence is not required; it risks stale code crossing workflows.
- Add a second editor package: rejected because Monaco is already installed and integrated.

**Regeneration behavior**: Explicit regenerate replaces the prior output; Reset clears generated output and returns the feature panel to its initial SQL/options state. No version history or autosave.

## Service and Controller Layer Scope

**Decision**: The MVP contract covers Java/JPA Entity and DTO/projection generation, plus deterministic classification of DML. Repository/service/controller source generation is deferred.

**Rationale**: The accepted spec scenarios and FRs define Entity and DTO output but do not define a web framework, API routes, CRUD method semantics, transaction boundaries, package layout, or generated-file grouping. Generating service/controller code without those choices would require invented behavior, which conflicts with the feature's accuracy constraints.

**Alternatives considered**:
- Emit generic controller/service boilerplate based only on table structure: rejected because it would invent API and transaction conventions.
- Assume Spring Boot MVC and CRUD endpoints: rejected because Spring MVC is not an accepted framework requirement and endpoint policy is unspecified.

**Follow-up**: If full backend-stack scaffolding is required for the first release, update the feature spec before task generation to define the web framework, generated artifact set, route/method conventions, and acceptance examples.

## Testing and Validation

**Decision**: Use the existing Vitest/jsdom test setup. Keep parser/classifier/mapping/renderer tests as pure unit tests and add focused UI tests for tab switching, unsupported/ambiguous feedback, copy/download, regenerate-replace, and reset. Finish with `npm test -- --run` (or the equivalent Vitest command), `npm run type-check`, and a Next.js production build when practical.

**Rationale**: Vitest 2.1.9, jsdom, Testing Library, and an `@/` alias are already configured. Unit tests can prove deterministic code generation without external services. Existing feature tests already live in `tests/unit`.

**Alternatives considered**:
- Introduce a new test framework or browser automation dependency: rejected because no browser-only behavior is required to validate the deterministic core and the current test stack supports focused component tests.
