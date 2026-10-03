# Data Model: SQL Format Error Diagnostics with AI

Entities are transient (in-memory, session-only). None are persisted.

## FormatError

Represents a failed formatting attempt.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `message` | string | yes | Human-readable formatter message (the source of truth). |
| `dialect` | SqlDialect | yes | `mysql` \| `postgresql` \| `sqlserver` \| `oracle` (from `getFormatterLanguage`). |
| `location` | `{ offset?: number; line?: number; column?: number }` | no | Present only when a parser reported a usable position; line/column derived 1-based. |
| `locationSource` | `'formatter' \| 'ast-parser'` | no | Which source supplied the position. `'ast-parser'` appears only after the AST cross-check fallback (FR-019); absent when no position is known. |
| `snippet` | string | no | Short window of SQL around the location; omitted when no location. |
| `sourceSql` | string | yes | The full SQL that failed to format (used for grounding). |
| `severity` | `'error'` | yes | Fixed for this feature (format failures are errors). |
| `occurredAt` | string (ISO) | yes | Capture timestamp. |

**Validation**: `message` non-empty; `dialect` one of the four; when `location.line` is present, `location.line >= 1` and `location.column >= 1`.

**Terminology**: one canonical dialect set crosses all artifacts — `mysql` | `postgresql` | `sqlserver` | `oracle` in the model, the UI and the prompts. The formatter's own language names (`tsql`, `plsql`) and the AST parser's names are mapped to that set once, by the existing `getFormatterLanguage()` helper, and never leak into the model or the contract.

## ErrorRegion

The contiguous SQL range a correction is allowed to touch — the replacement boundary (FR-017).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `startOffset` | number | yes | 0-based, inclusive; always `< endOffset`. |
| `endOffset` | number | yes | 0-based, exclusive; `<= sourceSql.length`. |
| `startLine` / `endLine` | number | yes | 1-based inclusive line numbers for display and the prompt. |
| `source` | `'formatter' \| 'ast-parser'` | yes | Which parser supplied the anchor position. |
| `snippet` | string | yes | The region text, byte-identical to `sourceSql.slice(startOffset, endOffset)`. |
| `anchorOffset` | number | yes | The reported error position inside the region (display/debug only). |

**Resolution** (research R8): anchor position from `FormatError.location`; when absent, from the AST cross-check parser's parse-error position (FR-019); the anchor is then expanded to the smallest logical construct that contains it — the statement span when the cross-check parser can delimit it, otherwise the affected line range. When no position can be determined from either source the resolver returns `null` and the feature degrades per FR-020; a region is never fabricated.

**Validation**: `0 <= startOffset < endOffset <= sourceSql.length`; the region text always equals the corresponding slice; a statement-sized region may span multiple lines, a line-sized region never exceeds the line.

## AIDiagnosis

The model's explanation of an error.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `explanation` | string | yes | Plain-language "what the error is". |
| `rootCause` | string | yes | Plain-language "why it happened". |
| `groundedEvidence` | string[] | yes | The SQL fragments / error text the answer cites (grounding). May include the AST cross-check parser's findings when the formatter reported no position (FR-019). |
| `status` | `'loading' \| 'ready' \| 'unavailable' \| 'error'` | yes | Lifecycle state. |
| `errorRef` | FormatError | yes | The originating error. |
| `createdAt` | string (ISO) | yes | Timestamp. |

**State transitions**: `loading` → `ready` (success) | `loading` → `unavailable` (Ollama down/timeout) | `loading` → `error` (other failure).

## AIFixProposal

A corrected SQL suggestion.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `originalSql` | string | yes | SQL snapshot at request time. |
| `proposedSql` | string | yes | Corrected SQL from the model. **Never applied verbatim** — only its `change` is written. |
| `change` | `{ startOffset, endOffset, originalFragment, replacement }` | yes | The model's actual delta, extracted as the longest common prefix/suffix (research R9). |
| `region` | ErrorRegion | no | The boundary `change` must stay inside. Absent ⇒ `applicability: 'undetermined-region'`. |
| `appliedRange` | `{ startOffset, endOffset }` | no | The range actually written, recorded on apply for the audit line in the panel. |
| `status` | `'pending' \| 'applied' \| 'dismissed' \| 'stale' \| 'invalid'` | yes | Lifecycle state. |
| `applicability` | `'applicable' \| 'out-of-range' \| 'undetermined-region' \| 'stale'` | yes | Whether Apply may run, and why not. Mirrors the panel's applicability states. |
| `createdAt` | string (ISO) | yes | Timestamp. |

**State transitions**:
- `pending` → `applied` (user confirms, the document still equals `originalSql`, a `region` exists, and `change` is contained in `region`).
- `pending` → `dismissed` (user cancels).
- `pending` → `stale` (current SQL != `originalSql` at apply time — evaluated first).
- `pending` → `invalid` (model returned unusable SQL; retry offered).
- `pending` → `out-of-range` (`change` escapes `region`; editor untouched, retry offered — FR-018).
- `pending` → `undetermined-region` (no `region`; no applicable fix at all — FR-020).

**Validation**: `proposedSql` non-empty and different from `originalSql`; `change` is exactly the common prefix/suffix delta of the two texts; on apply the spliced SQL is re-formatted and must succeed (SC-005); `change` must be contained in `region` (FR-017/FR-018); the fix stays minimal and semantics-preserving (FR-015), now enforced mechanically by the region guard instead of by review alone.

## ErrorPanelState

The panel's UI state.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `isOpen` | boolean | yes | Open/closed (toggle). |
| `currentError` | FormatError \| null | yes | The error being shown (single-error, per formatter behavior). |
| `errorRegion` | ErrorRegion \| null | yes | Resolved replacement boundary; `null` drives the undetermined-region state (FR-020). |
| `diagnosis` | AIDiagnosis \| null | no | Latest explanation result. |
| `fixProposal` | AIFixProposal \| null | no | Latest fix proposal. |
| `activeRequest` | `'explain' \| 'fix' \| null` | yes | The in-flight AI request, if any. |

**Relationships**: `AIDiagnosis.errorRef` and `AIFixProposal.originalSql` both reference the single `currentError` captured on the latest failed format; `errorRegion` is derived from that same error, and `AIFixProposal.change` must be contained in `errorRegion`.
