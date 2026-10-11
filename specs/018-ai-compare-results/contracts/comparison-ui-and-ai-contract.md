# SQL Comparison UI and AI Contract

**Feature**: [spec.md](../spec.md)

This is an in-application interaction and payload contract. The feature adds no public API endpoint; it reuses the existing comparison functions and configured AI streaming service.

## Comparison Input and Result

1. Compare captures `getOriginalSql()`, `getSql()`, and the selected dialect from the main SQL Editor as one immutable snapshot.
2. Both comparison modes render that same snapshot. A separate baseline source is not permitted.
3. A new editor/dialect value makes the previous snapshot stale. An AI response is accepted only if its `runId` and captured SQL pair are still current.
4. Identical SQL yields `no_changes`, an AI state of `not_needed`, and no AI provider request.
5. The deterministic result remains visible if AI is not requested or fails.

## User-Visible Comparison States

| State | Condition | Required behavior |
|---|---|---|
| Ready | No comparison is running | Offer the Compare action. |
| Analyzing | Deterministic comparison is running | Show progress and prevent duplicate compare submissions. |
| Completed | Supported deterministic analysis completed | Show summary, diff, supported changes, and limitations if any. |
| Partial | Some parser/dialect analysis is unavailable | Preserve supported findings and state the limitation. |
| Failed | Deterministic comparison failed | Show an actionable error without fabricating findings. |
| Stale | Editor pair or dialect differs from the result snapshot | Mark the result stale; do not present it as current. |

## AI Assessment State Mapping

| State | Condition | Required behavior |
|---|---|---|
| Not started | No AI request for a changed comparison | Keep a visible AI Assessment section with an explicit request action. |
| Analyzing | AI stream is active | Show progress; streamed text is explicitly provisional; offer cancellation. |
| Completed | Valid response and deterministic comparison are complete | Render validated fields and evidence. |
| Partial | AI response is valid but deterministic analysis is partial, or input truncation limits the assessment | Render the available assessment and the exact limitation. |
| Unavailable | Provider is not configured or cannot be reached | State the failure and offer retry when supported. |
| Failed | Response schema/evidence is invalid or another request error occurs | State the failure; do not show invalid output as a completed assessment. |
| Not needed | SQL is identical | Explain that no AI call was made because there are no changes. |
| Stale | The editor pair/dialect changed before the response was committed | Do not apply the old response to the current result. |

Stale has presentation precedence over other AI states. A provider failure never removes deterministic changes or findings.

## Validated AI Payload

The AI adapter returns a validated object with this conceptual JSON shape; fields that do not apply may be `null`, while arrays are empty when no items are supported:

```json
{
  "summary": "A concise, evidence-aware interpretation.",
  "potentialCorrectnessImpact": null,
  "executionSafetyConcerns": null,
  "potentialPerformanceImpact": null,
  "evidence": ["A short exact quote from the captured SQL."],
  "assumptions": [],
  "verificationSteps": ["Review the intended filter scope."],
  "limitations": ["No database execution or schema validation was performed."]
}
```

Validation requirements:

- `summary` is a non-empty string; impact fields are either strings or `null`.
- `evidence`, `assumptions`, `verificationSteps`, and `limitations` are arrays of strings.
- At least one evidence quote must match normalized text from the captured Before/After SQL.
- AI text is advisory and cannot change deterministic assessment status or claim execution, equivalence, safety, or performance verification.
- A truncated SQL input or partial deterministic result must remain explicit in the returned/rendered limitations.
- Only a fully validated response receives the `completed` result status; a streamed prefix is provisional.

## Diff Viewer

- Label the panes `Before (Original)` and `After (Modified)` independently of Monaco's built-in labels.
- Use side-by-side layout when there is sufficient width; use a stacked or tabbed layout on narrow screens.
- Keep full SQL in Monaco and scrollable for at least 8,000 lines. Finding excerpts are concise and expandable; they do not duplicate entire clauses by default.
- Preserve syntax highlighting, line numbers, keyboard navigation, and evidence-to-line navigation where source offsets are available.
- Summary and AI assessment remain easy to reach without requiring the user to scroll through repeated raw SQL excerpts.

## Error and Logging Boundary

- Do not log SQL snapshots, prompts, provider response bodies, credentials, or raw unknown exception objects.
- Log only safe operational metadata and sanitized error categories.
- User-facing errors name the unavailable/failed state and next action without echoing full SQL or credentials.
- Cloud credentials remain server-side through the existing shared provider route; do not add client credential fields or a new endpoint.