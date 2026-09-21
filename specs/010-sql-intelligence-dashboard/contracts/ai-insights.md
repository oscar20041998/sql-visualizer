# Contract: AI Insights

All AI insight requests go through the existing `src/lib/ai/aiService.ts` (`AIGenerateRequest`), server-proxied via `/api/ai/generate`; Ollama is the default provider. No new AI providers, no client-side credentials.

## Requests (built by `src/lib/sql/dashboard/aiPrompts.ts`, bilingual vi/en)
- **explainComplexity**(context: top contributors, normalizedScore, level) → free-form markdown answer.
- **explainFinding**(rule, message, location?) → free-form markdown answer.
- **optimizationOpportunities**(sql + `fitContextBrief` parser-facts brief) → structured JSON `{ items: [{ title, rationale, suggestedSql? }] }` (`jsonMode: true`).

## Rules
1. AI output renders only inside the visibly labeled AI panel ("AI-generated"); deterministic sections never consume AI output.
2. Grounding: requests include the parser-facts brief; prompts forbid contradicting deterministic facts (existing `aiService` prompt rules apply).
3. Failure/degradation: `AIServiceError`, timeout or service unavailability → the panel shows an unavailable state; nothing else in the dashboard degrades.
4. Suggested SQL: rendered original-versus-suggested; actions are Compare (side-by-side/diff), Copy, and Apply as New Version — appending a new `QueryHistoryEntry` via `/api/history`; the original SQL is never mutated.
5. Locale: prompts and answers follow the active locale (vi/en).