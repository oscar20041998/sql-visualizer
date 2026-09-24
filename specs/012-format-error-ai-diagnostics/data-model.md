# Data Model: SQL Format Error Diagnostics with AI

Entities are transient (in-memory, session-only). None are persisted.

## FormatError

Represents a failed formatting attempt.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `message` | string | yes | Human-readable formatter message (the source of truth). |
| `dialect` | SqlDialect | yes | `mysql` \| `postgresql` \| `sqlserver` \| `oracle` (from `getFormatterLanguage`). |
| `location` | `{ offset?: number; line?: number; column?: number }` | no | Present only when the formatter provides an offset; line/column derived 1-based. |
| `snippet` | string | no | Short window of SQL around the location; omitted when no location. |
| `sourceSql` | string | yes | The full SQL that failed to format (used for grounding). |
| `severity` | `'error'` | yes | Fixed for this feature (format failures are errors). |
| `occurredAt` | string (ISO) | yes | Capture timestamp. |

**Validation**: `message` non-empty; `dialect` one of the four; when `location.line` is present, `location.line >= 1` and `location.column >= 1`.

## AIDiagnosis

The model's explanation of an error.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `explanation` | string | yes | Plain-language "what the error is". |
| `rootCause` | string | yes | Plain-language "why it happened". |
| `groundedEvidence` | string[] | yes | The SQL fragments / error text the answer cites (grounding). |
| `status` | `'loading' \| 'ready' \| 'unavailable' \| 'error'` | yes | Lifecycle state. |
| `errorRef` | FormatError | yes | The originating error. |
| `createdAt` | string (ISO) | yes | Timestamp. |

**State transitions**: `loading` → `ready` (success) | `loading` → `unavailable` (Ollama down/timeout) | `loading` → `error` (other failure).

## AIFixProposal

A corrected SQL suggestion.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `originalSql` | string | yes | SQL snapshot at request time. |
| `proposedSql` | string | yes | Corrected SQL from the model. |
| `status` | `'pending' \| 'applied' \| 'dismissed' \| 'stale' \| 'invalid'` | yes | Lifecycle state. |
| `createdAt` | string (ISO) | yes | Timestamp. |

**State transitions**:
- `pending` → `applied` (user confirms, and current SQL == `originalSql`).
- `pending` → `dismissed` (user cancels).
- `pending` → `stale` (current SQL != `originalSql` at apply time).
- `pending` → `invalid` (model returned unusable SQL; retry offered).

**Validation**: `proposedSql` non-empty and different from `originalSql`; on apply, re-format `proposedSql` must succeed (FR/SC-005); fix must be minimal and semantics-preserving (FR-015) — enforced by prompt contract + review, not automatically verified.

## ErrorPanelState

The panel's UI state.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `isOpen` | boolean | yes | Open/closed (toggle). |
| `currentError` | FormatError \| null | yes | The error being shown (single-error, per formatter behavior). |
| `diagnosis` | AIDiagnosis \| null | no | Latest explanation result. |
| `fixProposal` | AIFixProposal \| null | no | Latest fix proposal. |
| `activeRequest` | `'explain' \| 'fix' \| null` | yes | The in-flight AI request, if any. |

**Relationships**: `AIDiagnosis.errorRef` and `AIFixProposal.originalSql` both reference the single `currentError` captured on the latest failed format.
