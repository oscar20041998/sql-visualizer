# Validation and Evidence Contract

| Requirement | Required evidence before relevant release |
|---|---|
| FR-001–009, SC-001–003 | Baseline current behavior; one fixture per intended object/dialect/construct plus malformed, mismatch and unsupported cases; compare AST and regex-derived facts under the constitution. Matrix cells carry status, scope, limitations and test evidence. |
| FR-010–016, FR-028–030, SC-004 | Test multi-file/paste ingest, keep/replace, unresolved identity and overloads, session navigation/reload, source offsets, partial results, graph/list consistency, cycles, direct/transitive/reverse impact and absent definitions. |
| FR-017–022, FR-027, SC-008 | Stub provider requests; exercise local/external choices, first-send consent, cancel, provider change, guest/unauthorized behavior, malicious comments, bounded context, provider failure, stale suggestion and no secret/source in logs. |
| FR-023–025, SC-005–006 | Validate keyboard, focus, reduced motion, contrast and both locales/themes at desktop/tablet/mobile; graph/list parity; five-user review with at least four successful without assistance. Seek user style confirmation. |
| FR-026, SC-007 | Record reference single-GPU machine, reproducible >50-table fixture, timer boundaries and cold/warm results; analysis plus rendering ≤1 s. Establish and record large-object bounds and UI responsiveness before release; do not claim a pass without a run. |
| FR-002–003, SC-003, SC-009 | Existing critical journey baselines and regression runs; all targets validated or explicit user-approved exclusions before declaring the overall initiative complete. |

Planning-time UI regression baseline is recorded in [research.md](../research.md). Browser, full-suite, parser matrix and hardware measurement are not yet verified.
