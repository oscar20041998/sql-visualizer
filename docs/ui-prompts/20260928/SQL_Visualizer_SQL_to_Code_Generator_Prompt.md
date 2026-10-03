# Feature: SQL → Code Generator

## Role

Act as a Senior Business Analyst + Senior Software Engineer with 15+ years of experience building enterprise developer tools, SQL tooling, ORM frameworks, and code generation systems.

You are working on an existing SQL Visualizer application. At '/input-query' page, create a new tab called "SQL → Code Generator" for this feature.

Your responsibility is to:
1. Understand the existing architecture before changing anything.
2. Analyze the feature requirements.
3. Identify ambiguities, edge cases, and technical constraints.
4. Design the solution consistently with the existing codebase.
5. Implement the feature with production-quality code.
6. Add or update tests.
7. Avoid unnecessary refactoring or breaking existing functionality.
8. Using Monaco Editor for code editing and visualization.
9. Review the generated code for correctness and adherence to coding standards.
10. Ensure the generated code integrates seamlessly with the existing codebase.
11. Ensure the feature provides meaningful error messages and guidance when the input SQL cannot be accurately converted.
12. Provide a smooth user experience within the "SQL → Code Generator" tab, including responsive UI and clear feedback during code generation.
13. Support incremental code generation and updates when the input SQL changes, minimizing disruption to existing code.
14. Ensure proper versioning and backward compatibility of the generated code.
15. Support whole Backend stack code generation, including service and controller layers when applicable.

Do NOT start coding immediately.

First inspect the repository and understand the existing implementation.

---

# 1. Feature Objective

Add a new feature called:

**SQL → Code Generator**

The feature allows users to take SQL statements or SQL database structures and generate application-layer code such as:

- Entity / Model
- DTO / Projection
- Service layer (including service and controller layers)
- Relationship mapping
- Repository / Query representation

The feature should help developers quickly translate SQL/database structures into application code without manually creating repetitive mapping code.

This feature is NOT intended to replace a complete ORM reverse-engineering tool.

The first implementation should focus on accurate, predictable, maintainable code generation.

---

# 2. Core Concept

The system must first determine what the SQL represents.

Do NOT treat every SQL statement as an Entity.

Classify the input into one of the following categories:

### A. DDL / Table Definition

Examples:

CREATE TABLE
ALTER TABLE
PRIMARY KEY
FOREIGN KEY
UNIQUE
INDEX
etc.

Expected output:

Entity / Model

### B. SELECT Query

A SELECT query does NOT necessarily represent an Entity.

Determine whether it is more appropriate to generate:

- DTO
- Projection
- View Model
- Query Result Object

For example, an aggregated SELECT should generally produce a DTO/Projection rather than an Entity.

### C. JOIN / Relationship

When SQL contains relationships, identify:

- source table
- target table
- foreign key
- relationship direction
- potential cardinality

Do NOT infer cardinality purely from a JOIN if the schema does not provide enough evidence.

### D. INSERT / UPDATE / DELETE

These statements should NOT be converted into Entities.

Instead, consider generating:

- Repository method
- Persistence method
- Query method
- Parameter object

Only generate framework-specific code when the selected target framework supports it.

---

# 3. Target Languages

The architecture must be extensible.

Initially support:

1. Java
2. C#
3. Python
4. TypeScript
5. Go
6. Kotlin

The architecture should allow additional languages to be added later without rewriting SQL parsing logic.

---

# 4. Target Frameworks

Suggested initial mappings:

Java:
- JPA / Hibernate

C#:
- Entity Framework Core

Python:
- SQLAlchemy

TypeScript:
- TypeORM

Go:
- GORM

Kotlin:
- JPA / Hibernate

Do not implement every framework immediately.

Design the architecture so additional frameworks can be added later.

---

# 5. Important Architecture Requirement

Separate these responsibilities:

SQL Parsing
      ↓
SQL Semantic Model
      ↓
Classification
      ↓
Code Generation
      ↓
Language / Framework Renderer
      ↓
Generated Code

The system should NOT directly transform:

SQL → Java source code

Instead:

SQL
 ↓
Intermediate Representation
 ↓
Java/JPA renderer

The intermediate representation should contain concepts such as:

- tables
- columns
- data types
- primary keys
- foreign keys
- constraints
- relationships
- selected fields
- aliases
- expressions
- aggregations
- grouping
- ordering
- parameters

This will make future language/framework support possible.

---

# 6. SQL Classification

Create a deterministic classification step.

Possible classifications:

TABLE_DEFINITION
SELECT_ENTITY_LIKE
SELECT_DTO
SELECT_AGGREGATION
SELECT_JOIN
INSERT
UPDATE
DELETE
UNKNOWN

The classification must be based on SQL structure and available metadata.

Do not rely solely on an LLM-generated guess if deterministic parsing can provide the answer.

If classification confidence is low:

- expose the uncertainty
- ask the user to choose the intended output type
- do not silently generate incorrect code

---

# 7. Type Mapping

Create a centralized type mapping layer.

Examples:

SQL:
BIGINT
INTEGER
VARCHAR
CHAR
TEXT
BOOLEAN
DATE
TIMESTAMP
DECIMAL
DOUBLE
FLOAT
BINARY
JSON

Java examples:

BIGINT → Long
INTEGER → Integer
VARCHAR → String
TEXT → String
BOOLEAN → Boolean
DATE → LocalDate
TIMESTAMP → LocalDateTime
DECIMAL → BigDecimal

C#:

BIGINT → long
INTEGER → int
VARCHAR → string
BOOLEAN → bool
DATE → DateTime
DECIMAL → decimal

The mapping must be database-aware where necessary.

Do NOT assume that all SQL dialects have identical type semantics.

---

# 8. Naming Conversion

Support conversion between:

snake_case
camelCase
PascalCase

Examples:

created_at → createdAt
user_id → userId
user_profile → UserProfile

Do not blindly modify acronyms.

Preserve explicit SQL aliases when they represent meaningful output names.

---

# 9. Java/JPA Requirements

For Java/JPA generation, support where justified by available schema information:

@Entity
@Table
@Id
@GeneratedValue
@Column
@ManyToOne
@OneToMany
@OneToOne
@ManyToMany
@JoinColumn
@JoinTable
@Enumerated

Do not invent:

- cascade behavior
- fetch strategy
- orphanRemoval
- generation strategy
- business validation
- domain rules

unless explicitly configured or inferable from schema metadata.

---

# 10. DTO / Projection Generation

For SELECT queries, determine the output shape from:

- SELECT expressions
- aliases
- aggregations
- GROUP BY
- JOINs
- computed expressions

Example:

COUNT(*) AS total_orders

should produce an appropriate numeric property such as:

Long totalOrders

Do not generate @Entity for aggregation/query-result objects unless explicitly requested.

---

# 11. Relationship Generation

When foreign keys are available:

users.id
orders.user_id

the system may generate:

User:
@OneToMany(mappedBy = "user")
private List<Order> orders;

Order:
@ManyToOne
@JoinColumn(name = "user_id")
private User user;

However:

Do not generate bidirectional relationships automatically unless the relationship is sufficiently supported by schema metadata.

Avoid creating recursive or overly complex object graphs by default.

---

# 12. User Experience

Add a clear entry point to the existing SQL Visualizer.

Suggested UI:

SQL Visualizer
    |
    +-- Explain
    +-- Analyze
    +-- Optimize
    +-- Visualize
    +-- Generate Code

The Generate Code screen should allow:

- Language
- Framework
- Output Type
- Naming Strategy
- Options

Example:

Language:
Java

Framework:
JPA / Hibernate

Output:
Entity

Naming:
snake_case → camelCase

Options:

☐ Generate Lombok
☐ Generate constructors
☐ Generate getters/setters
☐ Generate relationships
☐ Generate validation annotations

Only expose options that are actually supported.

---

# 13. Preview

Generated code must be displayed in a syntax-highlighted editor.

Provide:

- Copy
- Download
- Regenerate
- Reset
- Language/framework selection

Do not modify the original SQL.

---

# 14. Accuracy Requirements

Generated code must preserve SQL/schema semantics as much as possible.

The system must NOT:

- invent columns
- invent relationships
- invent constraints
- invent business rules
- silently change SQL semantics
- generate invalid syntax
- assume unsupported database features

If information is insufficient, return an explicit warning.

Examples:

⚠ Relationship cardinality could not be determined from the SQL.

⚠ Generated DTO type for expression `SUM(amount)` was inferred as BigDecimal.

---

# 15. Error Handling

Handle:

- invalid SQL
- unsupported SQL dialect
- unsupported SQL features
- missing schema metadata
- ambiguous aliases
- unknown data types
- complex expressions
- recursive CTEs
- window functions
- vendor-specific syntax

Use actionable errors rather than generic "Something went wrong."

---

# 16. Existing Architecture

Before implementation:

1. Inspect the entire repository structure.
2. Identify:
   - SQL parser
   - SQL AST/model
   - Explain implementation
   - Analyze implementation
   - Visualizer implementation
   - shared components
   - state management
   - API layer
   - AI/LLM integration
   - testing framework
3. Reuse existing abstractions where appropriate.
4. Do not introduce a second parser if an existing parser can support the requirement.
5. Do not duplicate existing SQL metadata models.

---

# 17. Implementation Strategy

Follow this order.

## Phase 1 — Repository Analysis

Inspect the existing implementation.

Document:

- current architecture
- reusable components
- integration points
- risks
- missing capabilities

Do NOT modify code yet.

## Phase 2 — Technical Design

Define:

- domain model
- intermediate representation
- classification model
- generator interface
- language renderer interface
- framework renderer interface
- type mapping strategy
- naming strategy
- error model

Example:

interface CodeGenerator {
    GeneratedCode generate(SqlSemanticModel model, GenerationOptions options);
}

Possible implementations:

JavaJpaGenerator
CSharpEfGenerator
PythonSqlAlchemyGenerator
TypeScriptTypeOrmGenerator
GoGormGenerator
KotlinJpaGenerator

Keep SQL parsing independent from generators.

## Phase 3 — Implementation

Implement the smallest production-ready version.

Priority:

1. SQL → semantic model
2. classification
3. Java/JPA generator
4. DTO generation
5. UI integration
6. tests
7. additional languages

Do not implement all languages before validating the architecture with Java/JPA.

---

# 18. Testing Requirements

Add unit tests for:

### SQL classification

- CREATE TABLE
- SELECT
- SELECT + JOIN
- SELECT + GROUP BY
- INSERT
- UPDATE
- DELETE

### Type mapping

Test all supported SQL types.

### Naming

- snake_case
- camelCase
- PascalCase
- aliases
- acronyms

### Java/JPA

Test:

- primary key
- nullable columns
- length
- precision/scale
- foreign key
- one-to-many
- many-to-one
- composite keys if supported

### DTO

Test:

- aliases
- aggregate functions
- expressions
- joins
- grouped queries

### Negative cases

Test:

- invalid SQL
- unsupported syntax
- ambiguous types
- missing metadata

---

# 19. Non-Functional Requirements

The feature should be:

- deterministic where possible
- extensible
- testable
- maintainable
- type-safe
- framework-independent at the core
- backward compatible

Avoid:

- massive conditional blocks
- language-specific logic inside SQL parsing
- duplicated type mappings
- duplicated naming logic
- unnecessary dependencies

---

# 20. Definition of Done

[ ] Existing Explain functionality still works.

[ ] Existing Analyze functionality still works.

[ ] Existing Visualize functionality still works.

[ ] Generate Code has a clear UI entry point.

[ ] SQL is classified before generation.

[ ] SQL is converted into an intermediate semantic representation.

[ ] Java/JPA Entity generation works.

[ ] Java DTO generation works.

[ ] Primary keys are correctly mapped.

[ ] Nullable fields are correctly mapped.

[ ] SQL types are mapped correctly.

[ ] snake_case → camelCase works.

[ ] Foreign key relationships are handled safely.

[ ] Unsupported/ambiguous cases produce warnings.

[ ] Generated code is syntactically valid.

[ ] Unit tests cover the core generator.

[ ] No existing functionality is broken.

[ ] No unnecessary refactoring was introduced.

---

# 21. Important Coding Rule

Do NOT start by implementing all requested languages.

First prove the architecture with:

SQL
→ Semantic Model
→ Classification
→ Java/JPA Generator

Once this architecture is stable, additional generators should be straightforward.

Before coding, provide a concise implementation plan based on the actual repository.

Then implement the feature.

After implementation, report:

1. Files changed
2. Architecture decisions
3. Features implemented
4. Tests added
5. Known limitations
6. Recommended next steps
