# Apache Calcite Parser Design

## Overview
This document outlines the design for the SQL analysis engine powered by Apache Calcite. The engine is responsible for parsing raw SQL queries from various dialects, transforming them into a unified intermediate representation (AST), and extracting relationship and complexity metrics.

## Design Principles
1. **Dialect Agnostic**: Core logic remains independent of specific SQL dialects by relying on Calcite's parsing and validation layers.
2. **Visitor Pattern**: Utilize the Visitor design pattern for AST traversal to maintain clean separation between node types and analysis logic.
3. **Immutability**: AST nodes and analysis result DTOs are treated as immutable to ensure thread safety when processing concurrent requests using Virtual Threads.

## Components
- `DialectSqlParser`: Handles the parsing of raw SQL based on configured dialects.
- `AstTreeWalker`: A robust visitor implementation that traverses `SqlNode` trees to extract `TableNode`, `JoinEdge`, and complexity factors.
- `SchemaCatalogManager`: Manages table metadata and schema mappings required for validation.

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
- Invalid syntax results in `ParsingException` mapped to `400 Bad Request`.
- Unsupported SQL constructs are logged and reported in the structural report without halting analysis.
