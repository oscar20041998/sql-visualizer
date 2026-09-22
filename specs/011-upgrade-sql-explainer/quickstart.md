# Quickstart: SQL Explainer Upgrade

**Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md) | **Contract**: [contracts/explainer-output-contract.md](./contracts/explainer-output-contract.md)

Validates the upgraded Explainer end-to-end (structure, length budget, banned-topic exclusion, locale parity). No implementation code here — see `tasks.md` (Phase 2) for build steps.

## Prerequisites

- App running locally (`npm run dev`, default port 4028) with an AI provider configured (Ollama local or a cloud key via server settings).
- Sample queries: `src/sample/demo_query1.sql` … `demo_query8.sql` (pick 10 runs spanning simple, filtered, aggregated, multi-table, and CTE-based shapes; reuse queries across en/vi runs).

## Validation Scenarios

### 1. Five-section structure (P1)

1. Open the Smart SQL Editor, load a multi-table filtered aggregate query, run **Explain this query**.
2. **Expected**: all five sections render in contract order; What You Get Back is a bullet list; Report Grain states one-row meaning; Data Sources pair each name with a purpose (or a marked `unknown`).

### 2. Length budget with retry (P2)

1. Run Explain on a trivially simple query and on a highly complex one.
2. **Expected**: both outputs read 500–1,000 human-readable characters (visible text only); simple queries expand with grounded detail, complex ones summarize — no section dropped. If a retry notice appears, it names the length miss.

### 3. Explainer/Analyze boundary (P3)

1. Run Explain and Analyze on the same CTE + JOIN + calculation query.
2. **Expected**: Explain output contains zero banned topics (no CTE internals, join mechanics, execution logic, calculations, lineage, performance); Analyze output is unchanged from current behaviour.

### 4. Fallback and edge cases

1. Submit empty SQL → validation message, no generation call.
2. Submit unparsable SQL → graceful message, no invented sections.
3. (If reproducible with a stubbed model response) contract-violating JSON → raw answer + "structured output unavailable" notice; run still in history.

### 5. Locale parity

Repeat scenarios 1–2 with locale set to Vietnamese.
**Expected**: identical five-section structure and the same 500–1,000 budget.

## Automated Checks

- `npm test` — contract parse/validate + length-budget unit tests pass.
- `npm run type-check` — strict TypeScript clean.
- `npm run lint` — clean.

## Success Mapping

Scenarios 1–5 map to SC-001…SC-005 (10-query sample: ≥9 complete, 100% in budget both locales, ≥8/10 understood in 30s, zero banned topics, reviewer-confirmed business focus).
