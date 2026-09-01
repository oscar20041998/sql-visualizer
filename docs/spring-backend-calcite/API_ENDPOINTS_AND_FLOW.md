# API Contract and Request Flow

## Status and Scope

This document defines the **target Spring Boot API** for replacing browser-local analysis and history persistence. It is a migration contract, not a description of the current Next.js routes. The backend owns authentication, PostgreSQL persistence, Calcite analysis, and cloud-provider credentials.

Base path: `/api`
Media type: `application/json; charset=utf-8`
Time format: ISO-8601 UTC strings, for example `2026-09-01T12:34:56Z`.

## Conventions

- All routes require `Authorization: Bearer <access-token>` except `POST /auth/register`, `POST /auth/login`, and `POST /auth/refresh`.
- JSON uses lower camel case. UUIDs are serialized as strings; monetary and scoring values are JSON numbers.
- Unknown request properties are rejected. Empty strings are invalid where a non-empty string is required.
- A successful update returns the resource representation, not a message-only response.
- List responses are paginated. `page` is one-based and `size` defaults to `50`, with a maximum of `100`.

### Error response

Every non-2xx JSON response uses this shape:

```json
{
  "timestamp": "2026-09-01T12:34:56Z",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "The request contains invalid fields.",
  "path": "/api/analysis/analyze",
  "fieldErrors": [{ "field": "sql", "message": "must not be blank" }],
  "requestId": "01J..."
}
```

`fieldErrors` is omitted when no individual field is applicable. Primary statuses are `400` (validation or malformed JSON), `401` (missing or invalid token), `403` (ownership violation), `404`, `409`, `422` (valid JSON but unsupported SQL), `429`, `502` (provider failure), and `503` (missing or unavailable server dependency).

## Shared Types

| JSON value        | Java target type       | Notes                                        |
| ----------------- | ---------------------- | -------------------------------------------- |
| UUID string       | `UUID`                 | RFC 4122 text form                           |
| timestamp string  | `Instant`              | UTC, serialized with `Z`                     |
| integer           | `int` / `Integer`      | Whole number only                            |
| decimal           | `double` / `Double`    | JSON number, never a formatted string        |
| `sqlDialect`      | `SqlDialect` enum      | `mysql`, `postgresql`, `sqlserver`, `oracle` |
| `complexityLevel` | `ComplexityLevel` enum | `LOW`, `MEDIUM`, `HIGH`, `SUPER_HIGH`        |

## Authentication

### `POST /auth/register`

Request: `{ "username": string(3..50), "email": email(<=254), "password": string(12..128) }`.

Response `201 Created`:

```json
{
  "user": {
    "id": "uuid",
    "username": "analyst",
    "email": "a@example.com",
    "displayName": "analyst",
    "avatarUrl": null
  },
  "accessToken": "jwt",
  "refreshToken": "opaque-token",
  "expiresIn": 900
}
```

### `POST /auth/login` and `POST /auth/refresh`

Login request: `{ "email": string, "password": string }`. Refresh request: `{ "refreshToken": string }`. Both return the same `200 OK` token payload shown above. Refresh tokens are rotated; a replayed or revoked token returns `401`.

## Profile and Preferences

### `GET /user/profile` and `PATCH /user/profile`

`GET` returns the `user` object from registration without tokens. `PATCH` accepts either or both `{ "displayName": string(1..100), "avatarUrl": uri|null }` and returns the updated profile.

### `GET /user/settings` and `PATCH /user/settings`

Response and partial-update request shape:

```json
{
  "theme": "dark",
  "locale": "en",
  "defaultDialect": "postgresql",
  "autoAnalyze": false,
  "graphLayout": "dagre",
  "nodeSpacing": "normal",
  "edgeStyle": "smooth",
  "accentColor": "#6ee7f7",
  "performanceMode": false,
  "aiConfig": {
    "provider": "openai",
    "baseUrls": {
      "ollama": "http://localhost:11434",
      "openai": "https://api.openai.com",
      "anthropic": "https://api.anthropic.com",
      "gemini": "https://generativelanguage.googleapis.com"
    },
    "ollamaModel": "qwen2.5-coder:7b",
    "modelId": "gpt-4o",
    "temperature": 0.1,
    "systemPrompt": "You are a SQL expert assistant.",
    "contextTokens": { "ollama": 8192, "openai": 8192, "anthropic": 8192, "gemini": 8192 },
    "maxOutputTokens": { "ollama": 1200, "openai": 1200, "anthropic": 1200, "gemini": 1200 },
    "batchConcurrency": 2
  }
}
```

Enums: `theme` is `light|dark`; `locale` is `en|vi`; `graphLayout` is `dagre|force|grid`; `nodeSpacing` is `compact|normal|spacious`; `edgeStyle` is `smooth|straight|step`; `provider` is `ollama|openai|anthropic|gemini`. `temperature` is $0 \le x \le 2$; `batchConcurrency` is $1 \le n \le 10$. Provider API keys are never accepted or returned.

## SQL Analysis

### `POST /analysis/analyze`

Request:

```json
{ "sql": "SELECT u.id FROM users u", "dialect": "postgresql", "locale": "en" }
```

| Field     | Java type    | Required | Validation                            |
| --------- | ------------ | -------- | ------------------------------------- |
| `sql`     | `String`     | Yes      | Non-blank, maximum 100,000 characters |
| `dialect` | `SqlDialect` | Yes      | One of the shared dialect values      |
| `locale`  | `LocaleCode` | No       | `en` or `vi`; defaults to `en`        |

Response `200 OK`: `AnalysisResultDto`. Its exact nested DTO schema is maintained in [README.md](README.md). Parse errors return `422 SQL_PARSE_ERROR`; parser availability or internal analysis errors return `503` or `500`, never a partial result.

## Query History

### `POST /history`

Creates or refreshes a history entry for the authenticated user. The backend normalizes SQL whitespace and upserts by `(user_id, sql_sha256, dialect)`.

Request: `{ "sql": string(1..100000), "dialect": SqlDialect, "tableCount": integer>=0, "joinCount": integer>=0, "complexityLevel": ComplexityLevel }`.

Response `201 Created` or `200 OK` for an existing normalized query:

```json
{
  "id": "uuid",
  "sql": "SELECT ...",
  "dialect": "postgresql",
  "createdAt": "2026-09-01T12:34:56Z",
  "tableCount": 2,
  "joinCount": 1,
  "complexityLevel": "LOW",
  "embeddingModel": null
}
```

The embedding vector is deliberately never returned in normal history payloads.

### `GET /history`

Query parameters: `query` (optional non-empty text), `page` (default `1`), `size` (default `50`, max `100`). When `query` is present, the server embeds it and orders entries by cosine similarity, considering only rows created with the active embedding model. Without it, ordering is newest first.

Response `200 OK`: `{ "items": [/* QueryHistoryDto */], "page": 1, "size": 50, "totalItems": 1, "totalPages": 1 }`.

### `PATCH /history/{id}/embedding` and deletion

Embedding update request: `{ "embedding": [0.012, -0.034], "embeddingModel": "text-embedding-3-small" }`. Vectors must have the configured dimension and belong to the caller's entry. Response is the updated history entry. `DELETE /history/{id}` returns `204`; `DELETE /history` clears the caller's history and returns `204`.

## AI and Speech Proxies

### `POST /ai/generate`

Request fields: `provider` (`openai|anthropic|gemini`), `modelId` (non-empty string), `messages` (non-empty array of `{role: system|user|assistant, content: non-empty string}`), optional `baseUrl`, `temperature` ($0..2$), `maxTokens` ($128..16384$), and `jsonMode` (boolean). Response: `{ "content": string }`. The streaming variant is `POST /ai/generate/stream`; it returns `text/event-stream` with UTF-8 token data and a terminal `done` event.

### `POST /ai/embed`

Request: `{ "provider": "openai", "modelId": "text-embedding-3-small", "text": "non-empty text", "baseUrl": "optional allowed URL" }`. Response: `{ "embedding": [number] }`. The backend validates provider URLs against an allow-list before attaching a credential.

### `POST /ai/docs-context`

Request: `{ "question": string(1..2000) }`. Response: `{ "context": string, "sources": [{ "title": string, "file": string }] }`.

### `POST /ai/speech`

Request: `{ "text": string(1..MAX_SPEECH_CHARS), "locale": "en|vi", "model": "optional allowed model", "voice": "optional allowed voice" }`. Response `200` is binary audio with `Content-Type: audio/mpeg` (or the engine's reported audio type) and `X-Speech-Engine`. Errors retain the common JSON error shape.

## Request Execution Flow

1. Spring Security authenticates the JWT and establishes the user principal.
2. Bean Validation rejects malformed DTOs before service code runs.
3. The controller delegates to a feature service; ownership is always scoped from the authenticated user ID, never a request-supplied ID.
4. Services run Calcite parsing, persistence, or provider I/O and map domain data to immutable response records.
5. `@RestControllerAdvice` maps exceptions to the common error response and attaches a request ID to logs and the response.

Use virtual threads for blocking database and provider I/O. SQL parsing is CPU-bound; bound it with a dedicated, limited executor rather than creating unbounded concurrent parses.
