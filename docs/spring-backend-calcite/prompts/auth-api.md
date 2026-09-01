# Implementation Prompt: Authentication API

## Goal

Implement the Authentication API endpoints in `com.sqlvisualizer.backend.domain.user`.

## Mandatory Security

- **EVERY** endpoint MUST require `Authorization: Bearer <JWT_TOKEN>` header (except registration/login).
- Use Spring Security for JWT validation.

## Endpoints

`../API_ENDPOINTS_AND_FLOW.md` is authoritative for validation, token rotation, errors, and response bodies. Registration creates the user's default settings in the same transaction.

### 1. `POST /api/auth/register`

- **Request**:
  - `username` (String, Required)
  - `email` (String, Required)
  - `password` (String, Required)
- **Response (`201 Created`)**:
  - `user` (UserProfileDTO)
  - `accessToken` (String)
  - `refreshToken` (String)
  - `expiresIn` (Integer seconds)

### 2. `POST /api/auth/login`

- **Request**:
  - `email` (String, Required)
  - `password` (String, Required)
- **Response (`200 OK`)**:
  - `user` (UserProfileDTO)
  - `accessToken` (String)
  - `refreshToken` (String)

### 3. `POST /api/auth/refresh`

- **Request**:
  - `refreshToken` (String, Required)
- **Response (`200 OK`)**:
  - `user` (UserProfileDTO)
  - `accessToken` (String)
  - `refreshToken` (String)

## Requirements

- Use JPA entities and Spring Data repositories.
- Hash passwords with BCrypt and refresh tokens with SHA-256 (or stronger); rotate refresh tokens on every refresh.
- Return appropriate HTTP error codes (401, 403, 400).
