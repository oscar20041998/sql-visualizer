# Implementation Prompt: Authentication API

## Goal
Implement the Authentication API endpoints in `com.sqlvisualizer.backend.domain.user`.

## Mandatory Security
- **EVERY** endpoint MUST require `Authorization: Bearer <JWT_TOKEN>` header (except registration/login).
- Use Spring Security for JWT validation.

## Endpoints

### 1. `POST /api/auth/register`
- **Request**:
  - `username` (String, Required)
  - `email` (String, Required)
  - `password` (String, Required)
- **Response (`201 Created`)**:
  - `userId` (String)
  - `message` (String)

### 2. `POST /api/auth/login`
- **Request**:
  - `email` (String, Required)
  - `password` (String, Required)
- **Response (`200 OK`)**:
  - `token` (String)
  - `refreshToken` (String)

### 3. `POST /api/auth/refresh`
- **Request**:
  - `refreshToken` (String, Required)
- **Response (`200 OK`)**:
  - `token` (String)
  - `refreshToken` (String)

## Requirements
- Use JPA entities and Spring Data repositories.
- Handle password hashing securely (BCrypt).
- Return appropriate HTTP error codes (401, 403, 400).
