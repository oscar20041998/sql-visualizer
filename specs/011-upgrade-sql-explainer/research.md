# Research: SQL Explainer Upgrade

**Date**: 2026-09-21 | **Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

No NEEDS CLARIFICATION items remained in Technical Context (all values resolved from repo inspection), and the two spec-level ambiguities were settled in `/speckit-clarify`. Research therefore validates the key design decisions against the existing codebase.

## Decision 1: New five-section JSON contract replaces the current schema

- **Decision**: Replace the current `EXPLAIN_SQL_STRUCTURED_PROMPT` shape (`objective`, `filters`, `output`, `tables`, `field_meanings`) with the spec's five sections — `query_objective`, `result_bullets[]`, `report_grain`, `filter_categories[]` (each `{ category, items[] }`), `data_sources[]` (each `{ name, purpose }`) — with fixed key order, string/string-array values only.
- **Rationale**: Current `output`/`field_meanings` invite per-field and calculation detail that overlaps Analyze and violates FR-008's bans; the new shape has no home for calculations, lineage, or performance content. `report_grain` is mandatory-always-present; `filter_categories` carries the structured-category requirement (FR-005); `{ name, purpose }` pairs carry the name-plus-role rule for CTEs (clarified FR-006/FR-008).
- **Alternatives considered**: Extending the current schema with two extra keys (`report_grain`, `filter_categories`) while keeping `output`/`field_meanings` — rejected because leftover keys preserve the banned-content surface and complicate the SC-004 zero-banned-topics guarantee. Parallel old+new schemas behind a flag — rejected as unnecessary migration weight for a single-panel refactor.

## Decision 2: Bounded validate-and-retry enforces the 500–1,000 character budget

- **Decision**: Count human-readable characters per the spec's rule (visible text only, excluding JSON syntax, section labels, whitespace-only padding); if outside 500–1,000, regenerate with a length-steering follow-up, up to 2 retries; on final failure show the closest-length attempt with a user-visible notice.
- **Rationale**: The `/speckit-clarify` session selected this option — it makes SC-002 a testable system guarantee without inventing content, and retry composes with the existing `explainSqlStructured` call path (same config, same budget handling).
- **Alternatives considered**: Prompt-only instruction ("keep it 500–1,000 chars") — rejected, unverifiable and untestable. Deterministic truncation/padding — rejected for cutting sentences mid-thought and for padding with filler. Accept-and-flag without retry — rejected because it normalises budget misses instead of correcting them.

## Decision 3: Streaming assembly preserved with section-aware progressive render

- **Decision**: Keep `explainSqlStructuredStream` semantics — accumulate the raw buffer, attempt partial section extraction for progressive display (existing `extractPartialString` pattern extended to the new keys), and run contract validation + length check only on the final assembled payload.
- **Rationale**: Constitution principle III (Real-Time Feedback Loop) and the spec Assumption require streaming preservation; validating partial buffers would false-fail on incomplete JSON.
- **Alternatives considered**: Non-streaming generate-then-render — rejected, regresses perceived latency and violates principle III. Per-chunk validation — rejected, incomplete JSON cannot satisfy a fixed-key contract.

## Decision 4: Panel renders five sections in fixed order; dependent surfaces adapt minimally

- **Decision**: `AiSqlExplainer.tsx` renders the five sections in spec order with What You Get Back as a bullet list; `toPlainText` (clipboard) and `buildSpeechScript` (read-aloud) follow the same section order; follow-up chat and the CTE batch panel are untouched unless the type change forces a compile fix.
- **Rationale**: Single source of truth (`SqlExplanation` type) flows to all three consumers; minimal adaptation keeps the diff reviewable and Analyze behaviour byte-identical.
- **Alternatives considered**: Rewriting the panel from scratch — rejected, unrelated-churn risk. Leaving clipboard/speech on the old shape — rejected, would ship inconsistent explanations across surfaces.

## Decision 5: Retry cap of 2 balances guarantee against latency/cost

- **Decision**: 1 initial attempt + up to 2 retries (3 generations worst case), each retry reusing the same provider config and context budget.
- **Rationale**: Bounded cost/latency while giving the model two correction chances; matches the "small bounded retry count" already recorded in Technical Context Performance Goals.
- **Alternatives considered**: Unbounded retry-until-fit — rejected, user-visible hangs and runaway cloud cost. Single attempt + flag — rejected, weaker than the clarified guarantee.
