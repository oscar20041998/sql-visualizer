# Data Model: Optimize Query Workflow Redesign

No persisted storage entities are introduced. The following are client-side (React component state) concepts, formalizing the entities named in `spec.md`.

## Optimization Session

In-memory state for one optimize run, scoped to the `SmartSQLEditor` / `OptimizeQueryModal` component pair.

| Field | Type | Notes |
|---|---|---|
| `trigger` | `'automatic' \| 'instruction'` | Whether the run was started from the existing "Analyze & Optimize" button or from a submitted natural-language instruction |
| `userInstruction` | `string \| null` | Raw text the user typed, when `trigger === 'instruction'` |
| `semanticPhase` | `'idle' \| 'running' \| 'ready' \| 'confirmed' \| 'error'` | Existing state machine, reused unchanged |
| `optimizePhase` | `'idle' \| 'streaming' \| 'done' \| 'error'` | Existing state machine, reused unchanged |
| `confirmationState` | `'pending' \| 'applied' \| 'discarded'` | New — tracks whether the completed proposal set has been acted on |
| `isModalOpen` | `boolean` | New — controls the modal's visibility independently of whether analysis is in progress |

## Semantic Brief *(existing type: `SqlSemanticBrief` in `aiService.ts`)*

Unchanged. Fields: `structured`, `purpose`, `relationships[]`, `criticalFilters[]`, `risks[]`, `raw`.

## Optimization Proposal *(existing type: `SqlOptimizationProposal` in `aiService.ts`)*

Unchanged. Fields: `id`, `issue`, `location`, `reason`, `recommendation`, `semanticImpact`, `find`, `replace`.

Validity gate (existing, reused): a proposal is confirmable only if `isProposalApplicable(sql, proposal)` returns true (exact single-occurrence match of `find` in the current SQL) — this already implements FR-012 (reject unparseable/inapplicable proposals) at the proposal level; FR-012's "fails to parse" case is additionally covered by the existing re-parse step (`analyzeSql(result.optimizedSql, ...)`) before structural regression warnings are computed.

## Structural Regression Warning *(existing helper: `buildStructuralRegressionWarnings` in `SmartSQLEditor.tsx`)*

Not a stored type — a `string[]` of localized warning messages, reused unchanged. Each entry corresponds to one of: table identity, join identity, join type, output column identity, table count, join count, condition count, output column count, DISTINCT presence, GROUP BY presence.

## State Transitions (Optimization Session)

```text
idle
  → (user clicks "Analyze & Optimize" OR submits NL instruction) → semanticPhase=running
  → semantic brief returned → semanticPhase=ready, isModalOpen=true
  → user confirms brief → semanticPhase=confirmed, optimizePhase=streaming
  → stream completes → optimizePhase=done, confirmationState=pending
  → user clicks "Apply" → confirmationState=applied, editor.currentSql updated, isDiffMode=true
  → user clicks "Discard"/closes modal → confirmationState=discarded, editor unchanged
```

Any state may transition to `error` (semanticPhase or optimizePhase) on request failure, or be aborted (closing the modal mid-stream aborts the in-flight `AbortController`, per FR-013), returning to `idle`.
