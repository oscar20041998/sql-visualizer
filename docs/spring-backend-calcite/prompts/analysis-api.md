# Implementation Prompt: SQL Analysis API

## Goal
Implement the SQL Analysis endpoint in `com.sqlvisualizer.backend.domain.analysis`.

## Mandatory Security
- **EVERY** endpoint MUST require `Authorization: Bearer <JWT_TOKEN>` header.

## Endpoint: `POST /api/analysis/analyze`

### Request
- `sql` (String, Required)
- `dialect` (String, Required: 'mysql' | 'postgresql' | 'sqlserver' | 'oracle')
- `locale` (String, Optional: default 'en')

### Response (`200 OK`)
- `tables` (List<TableNodeDTO>)
- `joins` (List<JoinEdgeDTO>)
- `ctes` (List<CteDTO>)
- `metrics` (SqlMetricsDTO)
- `complexity` (ComplexityScoreDTO)
- `executionCost` (ExecutionCostDTO)
- `mainQueryFields` (List<QueryFieldDTO>)
- `dialect` (String)
- `rawSql` (String)
- `structuralReport` (StructuralReportDTO)
- `hasCTE` (Boolean)

## Requirements
- Use Java 26 features: Virtual Threads, Record Patterns, Switch Pattern Matching.
- Ensure efficient AST traversal for various dialects.
- Map Java DTOs to exact expected JSON response structure as defined in `README.md`.
