# API Endpoints and Execution Flow

## Overview
This document describes the request lifecycle, controller structure, and standard execution flow for API requests in the Spring Boot backend.

## Security Flow
1. **Request Interception**: All incoming requests pass through `SecurityConfiguration` where JWT tokens are validated via Spring Security filters.
2. **Identity Resolution**: If valid, the user context is extracted and set in `SecurityContextHolder`.

## Execution Lifecycle
For a typical analysis request:
1. **Controller Layer**: `SqlAnalysisController` receives the POST request, validates payload, and initiates the process.
2. **Service Layer**: `CalciteAnalyzerService` delegates the parsing task to a virtual thread.
3. **Parsing Phase**: `DialectSqlParser` converts SQL to AST.
4. **Analysis Phase**: `AstTreeWalker` visits nodes to extract structure and metrics.
5. **Response Construction**: `SqlAnalysisResultMapper` converts internal domain objects to DTOs for JSON serialization.
6. **Return**: Spring `@RestController` returns the JSON response.

## Asynchronous Handling
- CPU-intensive tasks (parsing/analysis) are offloaded to `TaskExecutor` configured with virtual threads.
- I/O-bound tasks (AI API proxies, database operations) leverage non-blocking I/O.
- AI Streaming requests (`/api/ai/generate` with `stream=true`) are handled using `SseEmitter` to push chunks to the client.

## Standard Error Response
```json
{
  "timestamp": "2026-08-26T10:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Invalid SQL syntax near '...'",
  "path": "/api/analysis/analyze"
}
```
