# Feature Specification: SQL → Code Generator

**Feature Branch**: `015-sql-code-generator`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "Add new feature to generate application-layer code from SQL statements or database structures in SQL Visualizer"

## Clarifications

### Session 2026-10-02

- Q1: Where should the feature be integrated? → A: Add a SQL → Code Generator input-method tab to the existing `/query-input` page; existing tabs are SQL paste, MyBatis, and Smart Editor modes.
- Q2: Code regeneration and versioning? → A: Replace on regenerate with "Reset" button (simpler, real-time preview paradigm)
- Q3: ORM framework scope? → A: Java/JPA MVP only; all others documented as planned future phases

## User Scenarios & Testing *(mandatory)*

### User Story 1 - SQL to Entity Generation (Priority: P1)

As a developer, I want to convert a table definition (CREATE TABLE) into an Entity class in my target ORM framework, so that I can quickly scaffold domain models without manual mapping.

**Why this priority**: Table-to-Entity conversion is the most fundamental use case. It directly enables the core value proposition of generating models from database schemas and is the foundation for other code generation features.

**Independent Test**: Can be fully tested by pasting a CREATE TABLE statement and verifying that a valid Entity class is generated with appropriate annotations, properties, and relationships mapped according to primary keys and foreign keys.

**Acceptance Scenarios**:

1. **US1-AC1** **Given** a simple CREATE TABLE statement with a primary key, **When** user selects Entity generation in Java/JPA, **Then** generated code includes @Entity, @Table, @Id annotations with correct property names and types
2. **US1-AC2** **Given** a table with nullable columns, **When** user generates Entity, **Then** nullable columns are marked appropriately in the generated code
3. **US1-AC3** **Given** a table with foreign key constraints, **When** user generates Entity, **Then** relationships are inferred and offered for inclusion (with clear warnings about cardinality assumptions)
4. **US1-AC4** **Given** invalid or ambiguous SQL, **When** generation is attempted, **Then** user receives clear error messages explaining what cannot be generated and why

---

### User Story 2 - SELECT Query to DTO/Projection Generation (Priority: P2)

As a developer, I want to convert a SELECT query result shape into a DTO or Projection class, so that I can quickly create response objects for API endpoints without manually defining fields.

**Why this priority**: Many queries are aggregations or projections that don't represent full entities. This enables accurate code generation for read-only data transfer objects and query result wrappers.

**Independent Test**: Can be fully tested by pasting a SELECT query (including aggregations, aliases, JOINs) and verifying that a DTO/Projection class is generated with fields matching the query output shape.

**Acceptance Scenarios**:

1. **US2-AC1** **Given** a SELECT with specific columns and aliases, **When** user generates DTO, **Then** generated class has properties matching query output with correct aliases as property names
2. **US2-AC2** **Given** a SELECT with aggregate functions (COUNT, SUM, AVG), **When** user generates DTO, **Then** aggregation fields are typed correctly (e.g., COUNT → Long, AVG → BigDecimal)
3. **US2-AC3** **Given** a SELECT with JOIN across multiple tables, **When** user generates, **Then** system detects this is a DTO (not Entity) and generates projection with flattened structure
4. **US2-AC4** **Given** a SELECT with GROUP BY, **When** user generates, **Then** grouped fields are correctly identified and typed

---

### User Story 3 - Multi-Language Code Generation (Priority: P1)

As a developer, I want Java/JPA code generation in the MVP, with architecture supporting additional languages (C#, Python, TypeScript, Go, Kotlin) in future phases, so that the feature provides immediate value while allowing strategic expansion.

**Why this priority**: Java/JPA MVP delivers measurable value quickly. Architecture-first extensibility prevents future refactoring and supports adding languages without rewriting core SQL parsing.

**Clarification (Q3)**: MVP scope is **Java/JPA only**. All other languages (C#/EF Core, Python/SQLAlchemy, TypeScript/TypeORM, Go/GORM, Kotlin/JPA) are explicitly documented as "planned for future phases" to manage expectations and focus resources.

**Independent Test**: Can be fully tested by generating Java/JPA code from table definitions and SELECT queries, verifying correct annotations, naming, and type mappings.

**Acceptance Scenarios**:

1. **US3-AC1** **Given** a CREATE TABLE statement, **When** user selects Java/JPA as target, **Then** generated code uses Java naming conventions, annotations, and patterns
2. **US3-AC2** **Given** the system, **When** user attempts to select C# or other non-Java language, **Then** system clearly indicates "Not yet supported; planned for future release"
3. **US3-AC3** **Given** Java/JPA selected, **When** user generates from a complex query, **Then** generated code correctly handles all supported SQL features
4. **US3-AC4** **Given** the system, **Then** architecture allows adding C#/EF Core, Python/SQLAlchemy, TypeScript/TypeORM, Go/GORM, and Kotlin/JPA in future phases without modifying core SQL parsing or classification logic

---

### User Story 4 - SQL Classification and Type Inference (Priority: P2)

As a developer, I want the system to automatically classify my SQL statement, so that appropriate code generation strategy is applied without requiring me to manually specify the output type.

**Why this priority**: Accurate classification prevents generating incorrect code types (e.g., treating an aggregation as an Entity). This improves the quality and usability of generated code.

**Independent Test**: Can be fully tested by providing various SQL types (DDL, SELECT, aggregation, JOIN, INSERT/UPDATE/DELETE) and verifying correct classification and generation strategy.

**Acceptance Scenarios**:

1. **US4-AC1** **Given** a CREATE TABLE statement, **When** system analyzes SQL, **Then** it correctly classifies as TABLE_DEFINITION and prepares Entity generation
2. **US4-AC2** **Given** a SELECT query, **When** system analyzes SQL, **Then** it determines whether it's ENTITY_LIKE, DTO, or AGGREGATION based on query structure
3. **US4-AC3** **Given** a SELECT with GROUP BY and aggregations, **When** system analyzes, **Then** it classifies as DTO/AGGREGATION (not Entity)
4. **US4-AC4** **Given** an INSERT/UPDATE/DELETE statement, **When** system analyzes, **Then** it correctly identifies this as DML and suggests Repository/persistence method generation instead

---

### User Story 5 - Code Preview and Export (Priority: P1)

As a developer, I want to see the generated code in a syntax-highlighted editor, copy it, and download it, so that I can verify correctness and quickly integrate generated code into my project.

**Why this priority**: Preview and export enable users to verify correctness and integrate code into their projects. This completes the user workflow from SQL → Generated Code → Integration.

**Clarification (Q2)**: Code regeneration **replaces** the previous output with the new generation. A "Reset" button allows starting over from scratch. This provides a simple, real-time preview paradigm without version history complexity.

**Independent Test**: Can be fully tested by generating code, verifying preview and export, then modifying SQL and regenerating to confirm replacement behavior.

**Acceptance Scenarios**:

1. **US5-AC1** **Given** generated code, **When** displayed in preview, **Then** code is syntax-highlighted for Java/JPA
2. **US5-AC2** **Given** generated code, **When** user clicks Copy, **Then** code is copied to clipboard in unmodified form
3. **US5-AC3** **Given** generated code, **When** user clicks Download, **Then** file is downloaded with .java extension
4. **US5-AC4** **Given** changes to input SQL, **When** user regenerates, **Then** preview is replaced with new generation and Reset button is available to return to initial SQL
5. **US5-AC5** **Given** users reviewing generated code, **When** they click Reset, **Then** input SQL and preview return to original state before any code generation

---

### User Story 6 - SQL Relationship and Constraint Handling (Priority: P2)

As a developer, I want the system to understand SQL foreign keys and constraints, so that generated code includes correct relationship mappings and I'm warned about assumptions made.

**Why this priority**: Accurate relationship mapping is critical for Entity generation. However, constraints and cardinality may require user clarification, so the system must clearly communicate assumptions.

**Independent Test**: Can be fully tested by providing SQL with various foreign key patterns and verifying relationships are mapped with appropriate warnings and options for user control.

**Acceptance Scenarios**:

1. **US6-AC1** **Given** a table with a foreign key to another table, **When** user generates related Entities, **Then** relationships are proposed with clear documentation of cardinality assumptions
2. **US6-AC2** **Given** foreign keys, **When** user generates, **Then** system does not create bidirectional relationships by default (only when explicitly configured)
3. **US6-AC3** **Given** composite foreign keys, **When** user generates, **Then** relationships are handled correctly or skipped with clear explanation
4. **US6-AC4** **Given** unclear cardinality from SQL alone, **When** system generates, **Then** user receives a warning explaining the assumption made

---

### Edge Cases

- What happens when user provides SQL with syntax errors? → System provides actionable error message showing error location
- What happens when SQL contains dialect-specific syntax (e.g., MySQL vs PostgreSQL)? → System handles multiple dialects or clearly indicates unsupported syntax
- What happens when SQL references unknown data types? → System maps to closest equivalent or asks user to specify
- What happens when generated code would be invalid for the target framework? → System prevents generation or provides warnings
- What happens when SQL contains recursive CTEs, window functions, or other complex constructs? → System either generates appropriate code or clearly explains why it cannot
- What happens when user has conflicting options (e.g., "generate relationships" but "no cascade behavior")? → System applies sensible defaults and explains trade-offs

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST parse SQL statements from multiple dialects (MySQL, PostgreSQL, SQL Server, Oracle) and extract schema information
- **FR-002**: System MUST classify SQL into one of: TABLE_DEFINITION, SELECT_ENTITY_LIKE, SELECT_DTO, SELECT_AGGREGATION, SELECT_JOIN, INSERT, UPDATE, DELETE, UNKNOWN
- **FR-003**: System MUST map SQL data types to language-specific types (e.g., BIGINT → Long in Java, int in C#, int in Python)
- **FR-004**: System MUST generate valid Entity classes for table definitions, including @Entity, @Table, @Id, @Column annotations for Java/JPA
- **FR-005**: System MUST generate DTO/Projection classes for SELECT queries with appropriate property names derived from columns and aliases
- **FR-006**: System MUST infer and generate relationship annotations (@ManyToOne, @OneToMany, @JoinColumn) based on foreign key constraints
- **FR-007**: System MUST support Java/JPA as the MVP language/framework implementation (other languages are planned for future phases)
- **FR-008**: System architecture MUST support adding additional languages (C#/EF Core, Python/SQLAlchemy, TypeScript/TypeORM, Go/GORM, Kotlin/JPA) in future phases without modifying core SQL parsing or classification logic
- **FR-017**: System MUST integrate into SQL Visualizer as a new input-method tab labeled "SQL → Code Generator" on the existing `/query-input` page, alongside SQL paste, MyBatis, and Smart Editor modes, without adding a second route
- **FR-009**: System MUST provide naming convention conversion between snake_case, camelCase, and PascalCase
- **FR-010**: System MUST display generated code in a syntax-highlighted editor with copy and download functionality
- **FR-011**: System MUST validate generated code and report errors or warnings when code might not be valid for the target framework
- **FR-012**: System MUST handle nullable columns, NOT NULL constraints, and optional relationships
- **FR-013**: System MUST document all assumptions made during code generation (e.g., relationship cardinality, cascade behavior)
- **FR-014**: System MUST classify unknown or ambiguous SQL and request user clarification rather than silently generating incorrect code
- **FR-015**: Users MUST be able to select language and framework before or during code generation
- **FR-016**: System MUST expose configuration options for code generation (naming strategy, Lombok generation, relationship inclusion, validation annotations)
- **FR-018**: When users modify input SQL and regenerate code, system MUST replace previous output with new generation; a "Reset" button MUST be available to restore original SQL input and clear generated code

### Key Entities *(include if feature involves data)*

- **SqlSemanticModel**: Represents parsed SQL structure including tables, columns, constraints, and relationships without implementation details
- **CodeGenerationOptions**: Configuration options including target language, framework, naming strategy, and feature toggles (relationships, validation, Lombok, etc.)
- **GeneratedCode**: Output artifact containing generated source code, metadata about generation decisions, warnings, and assumptions made
- **SqlClassification**: Categorization of SQL statement type (DDL, SELECT variants, DML) used to determine generation strategy
- **TypeMapping**: Centralized mapping between SQL data types and language-specific type representations

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can convert 90% of common SQL table definitions to valid Java/JPA Entities on first try without manual adjustment
- **SC-002**: Developers can convert SELECT queries to DTOs with 85% accuracy in field mapping and naming
- **SC-003**: SQL classification correctly identifies query intent (Entity vs DTO vs Aggregation) for 95% of common query patterns
- **SC-004**: Generated code compiles without errors for all supported language/framework combinations
- **SC-005**: Developers report feature saves them 30-60% time in manual model/DTO creation compared to hand-written code
- **SC-006**: Code preview and export features are responsive (render within 2 seconds) for queries up to 100 table relationships
- **SC-007**: System clearly warns users about 100% of ambiguous or unsupported SQL constructs (no silent failures)
- **SC-008**: All existing SQL Visualizer features (Explain, Analyze, Optimize, Visualize) continue to function correctly

## Assumptions

- Users have working knowledge of SQL and their target ORM/framework (feature does not teach SQL or ORM concepts)
- Database schema information is available when generating Entities (primary keys, foreign keys, NOT NULL constraints)
- Initial implementation focuses on Java/JPA; other languages are planned for future phases
- Relationship cardinality cannot always be inferred from SQL alone; user will accept warnings and default behavior or provide explicit configuration
- Generated code is a starting point; developers will review and modify generated code as needed for business requirements
- System reuses the existing SQL parser and analysis infrastructure in SQL Visualizer where available (dt-sql-parser, AST analysis)
- Existing authentication, UI structure, and visualization components remain unchanged
- Monaco Editor is available for code display and editing (consistent with existing SQL input editor)
- Generated code should follow project coding standards and conventions (types, naming, annotations) rather than being fully customizable
