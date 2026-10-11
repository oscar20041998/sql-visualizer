# SQL Comparison Panel Contract

## Scope

This is a user-interface and internal result contract for the SQL Before/After Comparison feature. It adds no public REST endpoint. Any AI reasoning reuses the configured provider adapter and existing `/api/ai/generate` cloud-proxy boundary.

## Entry and Panel Behavior

- The entry actions appear in the Smart Editor workflow on `/query-input`: capture Before when no baseline exists, then Compare Changes.
- Compare Changes is unavailable until a baseline exists; the no-baseline state directs the user to capture one.
- Starting comparison captures After and the active dialect once. It does not execute, save, rewrite, or replace SQL.
- The comparison result drawer automatically opens when deterministic comparison results are ready. The AI explanation may continue loading within its own result section.
- The drawer is toggleable from the existing right-edge `SidePanelRail`; closing and reopening it does not rerun analysis or discard the result.
- The side-panel launcher exposes an accessible name, tooltip, `aria-expanded`, visible keyboard focus, close control, and Escape/overlay dismissal consistent with existing panels.
- If a captured input changes, the panel labels the existing result stale and prevents it from appearing current. A new explicit comparison creates a new immutable run.
- SQL editing remains available after the drawer is closed; reopening does not write SQL into the editor.

## Result Contract

A comparison result contains:

- `status`: `completed`, `partial`, `no_changes`, `failed`, or `stale`.
- `dialect`: the dialect captured at comparison start.
- `before` and `after`: exact SQL snapshots associated with the run.
- `changes`: deterministic structural changes with `kind`, before/after evidence, and support status.
- `findings`: each finding declares `origin` (`deterministic` or `ai`), category, severity, description, evidence, possible impact, recommendation, and verification state where available.
- `assessment`: independent equivalence, execution-safety, performance, static-analysis, result-comparison, and execution-plan statuses.
- `limitations` and `recommendations`: explicit parser, context, and verification boundaries.
- `ai`: optional `pending`, `completed`, `unavailable`, `malformed`, or `failed` state; its failure does not remove deterministic findings.

Runtime validation rejects malformed AI output, unsupported enum values, empty required text, and evidence that does not map to supplied comparison context. Model output cannot set the deterministic parser result or claim execution occurred.

## Panel States

| State | Required presentation |
|---|---|
| No baseline | Explain capture action; no analysis is started. |
| Ready | Show captured Before metadata and enable explicit comparison. |
| Analyzing | Show progress and keep editing usable; provide cancellation for active AI work where supported. |
| No changes | State that SQL text is identical; skip AI and show no speculative findings. |
| Completed | Show diff, deterministic changes/findings, assessment statuses, and any AI explanation. |
| Partial | Keep available evidence visible and state which analysis was unavailable. |
| AI unavailable/malformed | Retain deterministic output and state that AI explanation is unavailable. |
| Stale | Label the compared snapshot as outdated; do not present it as describing current editor text. |
| Failed | Explain the failure and allow retry without clearing baseline or editor content. |

## Deterministic and AI Boundaries

- Parser-backed structural facts and rule-based findings are deterministic and labeled separately from AI-generated hypotheses.
- Evidence must quote or locate text in Before/After; line or column positions are omitted when they cannot be established.
- No static result alone proves semantic equivalence, execution safety, or performance.
- The initial feature never executes either statement, accesses a database, applies generated SQL, changes dialect, or saves a query.
