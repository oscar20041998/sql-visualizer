# Implementation Prompt: Query History API

## Goal
Implement the Query History API in `com.sqlvisualizer.backend.domain.history`.

## Mandatory Security
- **EVERY** endpoint MUST require `Authorization: Bearer <JWT_TOKEN>` header.

## Endpoints

### 1. `POST /api/history`
- **Request**:
  - `sql` (String, Required)
  - `dialect` (String, Required)
  - `tableCount` (Integer, Required)
  - `joinCount` (Integer, Required)
  - `complexityLevel` (String, Required)
- **Response (`201 Created`)**:
  - `id` (String)
  - `sql` (String)
  - `dialect` (String)
  - `createdAt` (Long)
  - `tableCount` (Integer)
  - `joinCount` (Integer)
  - `complexityLevel` (String)

### 2. `GET /api/history`
- **Request Parameters**:
  - `query` (String, Optional)
  - `limit` (Integer, Optional, default: 50)
  - `page` (Integer, Optional, default: 1)
- **Response (`200 OK`)**:
  - List of entries matching the POST response structure.

## Requirements
- Use PostgreSQL with `pgvector` extension for semantic searches.
- Support pagination for listing.
- Return appropriate HTTP error codes (401, 403, 400).
