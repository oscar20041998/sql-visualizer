# Implementation Prompt: SQL Analysis API

## Goal

Implement the SQL Analysis endpoint in `com.sqlvisualizer.backend.domain.analysis`.

## Mandatory Security

- **EVERY** endpoint MUST require `Authorization: Bearer <JWT_TOKEN>` header.

## Endpoint: `POST /api/analysis/analyze`

The complete request, response, validation, error, and execution-limit contract is authoritative in `../API_ENDPOINTS_AND_FLOW.md`. Implement every `AnalysisResultDto` field defined in `../README.md`, including `metricDetails`, `structuralReport.joinLogicComplexity`, and supported optional detail fields.

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
- Map Java DTOs to the canonical JSON response structure. Use `422 SQL_PARSE_ERROR` for invalid SQL; do not return a partial result after parsing fails.
