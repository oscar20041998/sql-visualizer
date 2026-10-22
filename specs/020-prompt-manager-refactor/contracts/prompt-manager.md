# Contract: Prompt Manager (Registry + Renderer)

Internal interface contract for the new prompt management core at `src/lib/ai/prompts/`. Consumers are the AI feature modules under `src/lib/ai/` (and, per the FR-001 inventory, the dashboard prompt builders). Complements [output-parity.md](./output-parity.md).

## Interface shape

```ts
type PromptId = string; // unique, e.g. 'formatError.explain' — one registry key per prompt

interface PromptEntry {
  role: 'system' | 'user' | 'assistant'; // preserved from the source (FR-004)
  locale?: 'en' | 'vi';                  // present only when the source branches per locale
  text: string;                           // verbatim template containing {{paramName}} placeholders
  params: ParamSchema;                    // required flags + existing defaults (FR-003)
}

interface ParamSchema {
  [name: string]: { required: boolean; default?: string };
}

// Pure function: no I/O, no network, no payload logging.
renderPrompt(id: PromptId, params: Record<string, string>): AIMessage[]; // AIMessage = existing { role, content } shape
```

Message roles and ordering come from the entry; the renderer never reorders or rewrites content.

## Behavior table

| Case | Behavior |
|------|----------|
| Unknown `PromptId` | Actionable error naming the id; **no provider call**; caller maps to the feature's existing provider/request error path (Clarification Q3) |
| Missing required parameter | Actionable error naming the parameter; **no provider call** |
| Optional parameter omitted | Existing default used (FR-003) |
| Empty-string value | Preserved verbatim (matches pre-change behavior) |
| Multiline SQL/XML, quotes, braces, backticks in values | Inserted verbatim in a single pass; values are never re-scanned for placeholders (FR-006) |
| Template placeholder not in schema | Caught by the registry audit test (fail-fast in CI), not at runtime |
| Render failure at runtime | User sees the feature's existing error/fallback; maintainer log carries the actionable detail, never SQL/prompt payloads (Q3, spec Edge Cases) |

## Invariants

1. **Deterministic**: identical inputs → byte-identical messages (SC-001).
2. **Single source**: after migration, prompt text reaches a provider only via `renderPrompt` (SC-005); no hard-coded duplicates remain except documented `deferred-risk` rows (Q1, SC-002).
3. **Completeness**: every inventory row maps to ≥1 registry entry or a documented `deferred-risk` record (`promptRegistry.test.ts`).
4. **No I/O**: no filesystem, no network, no dynamic import → path traversal impossible (FR-012) and unit tests stay network-free (FR-012).
5. **Config untouched**: the renderer never reads or mutates provider/model/generation settings (FR-007).

## Compatibility

`renderPrompt` is an internal, in-module interface. Service interfaces, the `AIGenerateRequest` shape, and `/api/ai/generate[/stream]` request/response contracts are unchanged (FR-007/FR-008). Callers keep their existing error mapping — the renderer's errors surface through it, not beside it.
