# Implementation Prompt: User Profile & Settings API

## Goal

Implement the User Profile and Settings API endpoints in `com.sqlvisualizer.backend.domain.user`.

## Mandatory Security

- **EVERY** endpoint MUST require `Authorization: Bearer <JWT_TOKEN>` header.
- **SECURITY NOTE**: API Keys for AI providers MUST NOT be stored in the database.

## Endpoints

`../API_ENDPOINTS_AND_FLOW.md` and `../DATABASE_SCHEMA.md` are authoritative. Settings updates are partial and return the resulting settings resource; never accept or return provider API keys.

### 1. `GET /api/user/profile`

- **Response (`200 OK`)**:
  - `username` (String)
  - `email` (String)
  - `displayName` (String)
  - `avatarUrl` (String)

### 2. `PATCH /api/user/profile`

- **Request**:
  - `displayName` (String)
  - `avatarUrl` (String)
- **Response (`200 OK`)**:
  - Updated `UserProfileDTO`

### 3. `GET /api/user/settings`

- **Response (`200 OK`)**:
  - `theme` (String: 'light' | 'dark')
  - `language` (String: 'en' | 'vi')
  - `defaultDialect` (String)
  - `autoAnalyze` (Boolean)
  - `graphLayoutAlgorithm` (String)
  - `graphNodeSpacing` (String)
  - `graphEdgeStyle` (String)
  - `accentColor` (String)
  - `aiProvider` (String)
  - `aiModelId` (String)
  - `aiTemperature` (Double)
  - `aiSystemPrompt` (String)

### 4. `PATCH /api/user/settings`

- **Request**:
  - All fields listed in GET response above (all optional, partial updates allowed).
- **Response (`200 OK`)**:
  - Updated `SettingsDTO`

## Requirements

- Use JPA entities (`User`, `DashboardSettings`) and repositories.
- Ensure the user is identified via the JWT token (claims).
- Return appropriate HTTP error codes (401, 403, 400).
