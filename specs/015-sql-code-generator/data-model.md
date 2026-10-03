# Data Model: SQL → Code Generator

**Date**: 2026-10-02  
**Spec**: [spec.md](spec.md)  
**Research**: [research.md](research.md)

## Relationships

```text
SQL input + dialect
  └── ParsedSqlModel
      ├── TableDefinition[] (DDL)
      │   ├── ColumnDefinition[]
      │   └── Constraint[] (PK, unique, FK, checks as raw/known facts)
      └── SelectShape (SELECT)
          └── SelectField[]

ParsedSqlModel → SqlClassification → CodeGenerationOptions → GeneratedCode
                                                   └───────────→ GenerationDiagnostic[]
```

## Entities

### ParsedSqlModel

A dialect-neutral result of parsing one SQL statement, before output selection or rendering.

| Field | Type | Rules |
|---|---|---|
| `dialect` | `mysql \| postgresql \| sqlserver \| oracle` | The user's selected dialect; grammar support is tracked separately. |
| `statementKind` | `create-table \| alter-table \| select \| insert \| update \| delete \| unknown` | Derived from parser AST where supported. |
| `tables` | `TableDefinition[]` | Populated only when DDL table structure is available. |
| `selectShape` | `SelectShape \| null` | Present for SELECT ASTs. |
| `sourceSql` | `string` | Original input retained for diagnostics; never rewritten by generation. |
| `parseStatus` | `parsed \| partial \| unsupported \| invalid` | `partial` and `unsupported` cannot silently proceed as fully parsed. |
| `diagnostics` | `GenerationDiagnostic[]` | Parser warnings/errors with source spans when known. |

### TableDefinition

| Field | Type | Rules |
|---|---|---|
| `schemaName` | `string \| null` | Preserve only when present in the source. |
| `tableName` | `string` | Original identifier; renderer may derive a class name separately. |
| `columns` | `ColumnDefinition[]` | No inferred or invented columns. |
| `constraints` | `Constraint[]` | Only explicit schema constraints are authoritative. |
| `sourceSpan` | `{ start: number; end: number } \| null` | Optional parser-provided source offsets. |

### ColumnDefinition

| Field | Type | Rules |
|---|---|---|
| `name` | `string` | Exact source identifier. |
| `sqlType` | `{ raw: string; normalized: string \| null }` | Preserve vendor spelling; normalize only where mappings are verified for the dialect. |
| `nullable` | `boolean \| 'unknown'` | Explicit `NOT NULL` means false; explicit nullable/default SQL behavior follows the dialect; unknown stays unknown. |
| `length` | `number \| null` | Preserve a parsed size if available. |
| `precision` | `number \| null` | Preserve decimal precision if available. |
| `scale` | `number \| null` | Preserve decimal scale if available. |
| `defaultExpression` | `string \| null` | Preserve source expression; do not turn it into application logic. |
| `identity` | `boolean \| 'unknown'` | A database identity fact is not a Java generation strategy. |

### Constraint

A discriminated constraint record derived from DDL.

| Kind | Required attributes | Rules |
|---|---|---|
| `primary-key` | column names, optional name | Single or composite key; unsupported composite-key rendering is diagnosed rather than flattened. |
| `unique` | column names, optional name | A unique foreign key can establish one-to-one cardinality only for the owning FK. |
| `foreign-key` | local columns, referenced table, referenced columns, optional name | The only source of generated relationships. Generate only the owning-side reference by default; do not infer inverse collections. |
| `check` | raw expression, optional name | Preserve as metadata; no Bean Validation rule is inferred. |
| `unknown` | raw constraint text | Preserve and warn; do not omit silently. |

### SelectShape and SelectField

`SelectShape` captures projected output, not entity persistence semantics.

| SelectShape field | Type | Rules |
|---|---|---|
| `fields` | `SelectField[]` | Includes every selected item in output order. |
| `sourceTables` | `string[]` | Preserve table names/aliases available from the AST. |
| `hasJoin` | `boolean` | Structural query fact; does not determine output type by itself. |
| `groupByExpressions` | `string[]` | Preserved expressions. |
| `orderByExpressions` | `string[]` | Preserved expressions. |
| `hasAggregation` | `boolean` | True when aggregate expressions are present. |

| SelectField field | Type | Rules |
|---|---|---|
| `expression` | `string` | Original expression text where available. |
| `alias` | `string \| null` | Explicit aliases are preserved as output names. |
| `sourceColumns` | `string[]` | Populated only when reliably resolved from AST. |
| `expressionKind` | `column \| aggregate \| computed \| wildcard \| unknown` | Deterministic AST classification. |
| `inferredSqlType` | `string \| null` | Set only when type is known from schema or unambiguous operation rules. |

### SqlClassification

| Field | Type | Rules |
|---|---|---|
| `kind` | `table-definition \| select-entity-like \| select-dto \| select-aggregation \| select-join \| insert \| update \| delete \| unknown` | Classification is based on parsed structure. |
| `confidence` | `high \| limited \| insufficient` | Confidence describes evidence, not model probability. |
| `recommendedOutput` | `entity \| dto \| none` | `none` for DML, unknown, or insufficient parse results. |
| `reasons` | `string[]` | Explain parser facts that drove the selection. |
| `requiresUserChoice` | `boolean` | True for ambiguous valid SELECT output shapes; no generation until resolved. |

### CodeGenerationOptions

| Field | Type | Rules |
|---|---|---|
| `language` | `'java'` | The only supported MVP language. Other choices, if displayed, are clearly marked planned/disabled. |
| `framework` | `'jpa-hibernate'` | The only supported MVP persistence framework. |
| `outputType` | `'auto' \| 'entity' \| 'dto'` | `auto` follows classification; an explicit choice cannot override invalid/unsupported parse status. |
| `namingStrategy` | `'camelCase' \| 'pascalCase' \| 'preserve'` | Naming does not alter SQL names or explicit aliases in metadata. |
| `includeRelationships` | `boolean` | Only explicit FK-derived owning-side relationships; when off, FK columns remain scalar fields. |
| `useLombok` | `boolean` | Use Lombok `@Getter`/`@Setter` instead of emitted accessors; default off. |
| `validationAnnotations` | `boolean` | Off by default; emits only schema-backed constraints such as `@NotNull` and `@Size`, never inferred constraints for SELECT output. |
| `generateMyBatisMapper` | `boolean` | Default off; add a companion `<ClassName>Mapper.java` interface annotated with MyBatis `@Mapper`. No CRUD methods are inferred. |

The Entity renderer always emits the JPA-required no-argument constructor. Standard accessors are emitted unless Lombok is enabled.

### GeneratedCode

| Field | Type | Rules |
|---|---|---|
| `source` | `string` | Rendered Java source; empty when generation is blocked. |
| `fileName` | `string` | Java `.java` filename derived from the generated public type. |
| `className` | `string \| null` | Null if generation is blocked. |
| `outputType` | `'entity' \| 'dto' \| null` | Null if generation is blocked. |
| `additionalFiles` | `GeneratedCodeFile[] \| undefined` | Optional companion Java files, including a MyBatis mapper interface. |
| `diagnostics` | `GenerationDiagnostic[]` | Warnings and blocking errors associated with source spans where available. |
| `assumptions` | `string[]` | Lists inferred output choices; never implies unsupported cascade/fetch/business rules. |

### GenerationDiagnostic

| Field | Type | Rules |
|---|---|---|
| `severity` | `'warning' \| 'error'` | Errors block source generation; warnings permit generation only when remaining output is safe. |
| `code` | `string` | Stable category such as `unsupported-dialect`, `unknown-type`, `ambiguous-alias`, `unsupported-expression`. |
| `message` | `string` | Actionable, human-readable guidance. |
| `sourceSpan` | `{ start: number; end: number } \| null` | Omit location rather than fabricating one. |

## Lifecycle

```text
idle → parsing → classified → generating → ready
                    ├───────────────→ needs-choice
                    ├───────────────→ warning
                    └───────────────→ error
ready ── Regenerate with changed SQL/options ──→ parsing
any state ── Reset ──→ idle
```

Regeneration replaces the previous result. Reset clears generated output and restores the feature panel's initial SQL/options state. No generation history or persistence is stored.
