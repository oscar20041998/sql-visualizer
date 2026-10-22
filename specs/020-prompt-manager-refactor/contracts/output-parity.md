# Contract: Output Parity (Per Migrated Feature)

The parity contract that every in-scope AI feature must satisfy before → after prompt migration. Each row's "Verification" maps to a test in `tests/unit/promptParity.<feature>.test.ts` (FR-013). Baselines come from [data-model.md](../data-model.md) `OutputContractBaseline` and are immutable.

## Invariants

| Dimension | Invariant (must be identical pre/post) | Verification |
|-----------|----------------------------------------|--------------|
| Prompt messages | Byte-identical text, roles, ordering, whitespace, parameter values for the same logical input | Message snapshot vs `renderPrompt` output |
| Provider request settings | Provider, model id, temperature, token limits, streaming/non-streaming mode, structured-output options, headers/mapping | Request snapshot captured through existing `fetch` mocks |
| Response parsing | Parsed JSON keys, field names, types, required fields; markdown sections/order where applicable | Mocked response fixture → identical application result |
| Frontend-consumed fields | Every field the UI reads from the response (labels, scores, severity, status conventions, SQL blocks) | Fixture test asserting identical values |
| Streaming behavior | Partial-response handling, chunk assembly, completion/`done` handling, cancellation | Stream-path test with mocked stream (existing patterns) |
| Error/fallback behavior | Same user-visible error and fallback on provider errors **and** on renderer failures (Clarification Q3) | Error-path test for both provider failure and render failure |
| Language behavior | Identical behavior in `en` and `vi`; no feature starts/stops following the app language (FR-009, Q2) | Locale parity test per locale-variant prompt |
| Conversation history | Storage format and message content preserved | Existing history tests still green |
| Context composition | System/developer/user message composition and order; context-brief (`aiSqlContext`) integration unchanged | Message snapshot includes composed messages |

## Change control

1. **Any unexplained diff stops the migration of that feature** (FR-018): record the diff, its cause, and escalate for approval — never accept, normalize, or "fix the test" (FR-011: baselines are never edited to pass).
2. Deterministic content is compared byte-for-byte; nondeterministic model output is **not** compared live — parity is proven at the message/request/application-result layers (spec Assumptions; research.md Decision 5).
3. A feature moves `migrated → verified` only when every invariant row is green for it (data-model.md lifecycle).

## Coverage rule

One parity file per migrated feature; the pilot (`formatErrorAi`) must demonstrate the full matrix first (FR-014 Stage 4). Registry ↔ inventory completeness is asserted separately in `promptRegistry.test.ts` (see [prompt-manager.md](./prompt-manager.md) Invariant 3).
