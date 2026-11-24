# Data Model: Database Object Intelligence

These are proposed contracts, not claims about existing code. Reuse existing domain types where equivalent. See [research](research.md) for identity and evidence rules.

## Analysis session

- `sessionId`: ephemeral identifier; `dialect` per submitted source; `definitions`, `selection`, `analysisRevision` and provider-scoped `consent`.
- Lifecycle: empty → ingesting → conflict resolution if needed → analyzing → ready/partial/failed; edits invalidate affected results and dependent graph/AI outputs. Every asynchronous result is bound to the session and source revision; late results are discarded.
- One browser document owns a session; navigation within the app preserves it. Reload, document close, sign-out or identity change clears source and consent. No persistent storage, URL, logs or history merely from ingesting.

## Source and object

- **Source document**: session-scoped ID, user-supplied text, optional file label, selected dialect, revision and source ranges. Multiple definitions may originate from one document or several files.
- **Database object**: ID; type `query | cte | view | procedure | function | trigger | unknown`; dialect; optional qualified name, schema, routine signature and ranges; detection confidence and `full | partial | unsupported` status with reasons.
- **Identity**: compare only when dialect-aware qualified identifiers and relevant overload signature are proven; preserve quoted identifiers and ambiguity. Same proven identity in the same dialect requires explicit keep/replace. Unknown schema, unresolved names and ambiguous overloads do not get silently merged.
- **Statement**: object ID, source range, original text, kind, evidence-backed query result and limitations. Extract only when its boundary is supported; offset line/column mapping into the original source.

## Analysis and findings

- **Result**: object/revision, per-stage status and reason, available metadata, statements, facts, metrics, findings and graph references. `full` means all constructs in the declared capability scope were validated; otherwise show `partial` or `unsupported`.
- **Metric**: type, numeric value only when evidenced, origin and applicable source; unknown is distinct from zero.
- **Finding**: ID, severity, factual/static/AI origin, description, evidence, optional recommendation/confidence and optional source location. No runtime guarantee without runtime evidence.
- **Capability record**: object type, dialect, tested construct/fixture, `supported | partial | unsupported`, limitations, evidence and date. Missing evidence is not a supported record.

## Dependencies and impact

- **Node**: known object identity or explicit unresolved reference, with object type, label and source provenance.
- **Edge**: source, target or unresolved reference, `read | write | call | reference | unknown`, confidence, supporting source range and analysis completeness.
- **Traversal**: deterministic cycle-safe direct and transitive paths over supplied known definitions; impact traverses reversed edges, retains depth/direction and identifies cycles and missing or ambiguous coverage. Graph and list use the same result.

## AI action and consent

- **Consent**: session ID, selected external provider, confirmed/cancelled state; never store SQL in consent metadata; re-confirm for a different provider. Local AI requires no external-send confirmation. Existing flows are unaffected.
- **AI request**: action, provider, object/revision, bounded relevant context, facts and limitations; source text is untrusted data, no credentials or arbitrary filesystem content. Cancellation prevents sending.
- **Suggestion**: original revision, proposed text, labeled model attribution and warnings. Applying is an explicit action; if the original revision changed, require a fresh review instead of overwriting newer edits. Failure does not alter deterministic result or source.
