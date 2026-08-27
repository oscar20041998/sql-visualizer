# Implementation Prompt: AI Assistant Proxy API

## Goal
Implement the AI Assistant Proxy API in `com.sqlvisualizer.backend.domain.ai`.

## Mandatory Security
- **EVERY** endpoint MUST require `Authorization: Bearer <JWT_TOKEN>` header.

## Endpoint: `POST /api/ai/generate`

### Request
- `provider` (String, Required: 'openai' | 'anthropic' | 'gemini')
- `modelId` (String, Required)
- `messages` (List<Object>, Required: `{role: 'system'|'user'|'assistant', content: string}`)
- `temperature` (Double, Optional)
- `maxTokens` (Integer, Optional)
- `jsonMode` (Boolean, Optional)
- `stream` (Boolean, Optional)

### Response (`200 OK`)
- `content` (String)

## Requirements
- Support streaming responses (SSE) if `stream` is true.
- Manage rate limiting (429 Too Many Requests).
- Securely inject API keys (from system configuration).
- Return appropriate HTTP error codes (401, 403, 400).
