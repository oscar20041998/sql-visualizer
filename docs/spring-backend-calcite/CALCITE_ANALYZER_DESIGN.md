# Apache Calcite Parser Design

## Overview

This document outlines the target SQL analysis engine powered by Apache Calcite. It accepts the `AnalyzeRequest` contract in [API_ENDPOINTS_AND_FLOW.md](API_ENDPOINTS_AND_FLOW.md), parses one SQL statement, and returns the `AnalysisResultDto` schema in [README.md](README.md). Calcite provides the canonical AST; frontend heuristics must not be copied into the backend unchanged.

## Design Principles

1. **Dialect Explicit**: Resolve the requested `SqlDialect` to a Calcite parser configuration. Reject unsupported syntax with `422` rather than silently parsing it as another dialect.
2. **Visitor Pattern**: Utilize the Visitor design pattern for AST traversal to maintain clean separation between node types and analysis logic.
3. **Immutability**: AST nodes and analysis result DTOs are treated as immutable to ensure thread safety when processing concurrent requests using Virtual Threads.

## Components

- `DialectSqlParser`: Handles the parsing of raw SQL based on configured dialects.
- `AstTreeWalker`: A robust visitor implementation that traverses `SqlNode` trees to extract `TableNode`, `JoinEdge`, and complexity factors.
- `SchemaCatalogManager`: Supplies optional table metadata for validation. Analysis must still succeed in syntax-only mode when no physical database catalog is connected.

## AST Traversal (Visitor Pattern)

The core traversal logic uses Java 26 pattern matching to handle AST nodes:

```java
public class SqlAnalysisVisitor extends SqlBasicVisitor<Void> {
    @Override
    public Void visit(SqlCall call) {
        return switch (call.getKind()) {
            case SELECT -> processSelect((SqlSelect) call);
            case JOIN -> processJoin((SqlJoin) call);
            // ... other cases
            default -> super.visit(call);
        };
    }
}
```

## Error Handling

- Malformed request JSON or unsupported dialect results in `400 Bad Request`.
- Invalid SQL syntax results in `SqlParseException` mapped to `422 SQL_PARSE_ERROR`, with line and column when Calcite provides them.
- A construct that parses but is not yet extracted remains in the AST walk, produces a complete response, and adds an explicit `unsupportedConstructs` item to the structural report. Do not claim a zero count when extraction was skipped.
- Never return a partial `AnalysisResultDto` after a parser failure.

## Execution Limits

- Enforce a 100,000-character input limit before parsing.
- Accept one statement per request; reject multi-statement input unless a future API version explicitly models batches.
- Parsing and AST traversal are CPU-bound. Use a bounded executor and request timeout; virtual threads are appropriate for database and provider I/O, not as an unlimited CPU work queue.
- Do not execute analyzed SQL against a customer database. A catalog connection is metadata-only and uses a least-privileged account.
