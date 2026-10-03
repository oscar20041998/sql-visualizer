---
feature: 015-sql-code-generator
verdict: FAIL
standard: .specify/extensions/tdd/templates/tdd-test-quality-rubric.md
verified_at: 1fc60d0
behaviors: 57
proven: 0
likely: 54
test_after: 3
no_test: 0
high_smells: 0
criteria_total: 25
criteria_covered: 25
mutation_score: null # no verified mutation tool or score
mutants_survived: null # no mutation run during this audit
suite: 492 passed, 0 failed, 58 files, 70.46s
---

# TDD Verification: SQL to Code Generator

**Verdict: FAIL.** The current suite is green and all 25 acceptance scenarios map to tests, but U16, U23, and U28 lack valid test-first evidence. The available Git history cannot corroborate any feature test/source ordering.

## Evidence Reviewed

- Resolved `FEATURE_DIR` with Spec Kit; it points to `specs/015-sql-code-generator`.
- Reviewed `spec.md`, `plan.md`, `tasks.md`, `tdd/test-list.md`, `tdd/cycle-log.md`, `.specify/memory/tdd-profile.md`, and the installed test-quality rubric.
- Read all listed code-generator tests, the profile's unit/component exemplars, and `tests/utils/test-setup.ts`.
- Ran the profile's full-suite command, `npm test`: **492 passed, 0 failed** across 58 files in **70.46 seconds**.
- HEAD is `1fc60d0`, the test-list baseline commit. The feature source, tests, and specs are uncommitted/untracked in the current worktree, so Git history has no feature changes with which to verify test/source ordering.

## Test-First Evidence

| Class | Behaviors | Evidence |
| --- | --- | --- |
| PROVEN | None | No feature commits corroborate the cycle-log sequence. |
| LIKELY | A1-A8, A10-A21, A23-A24, A26-A28; U1-U15, U17-U22, U24-U27, U29-U32 | Cycle log reports red/mutant evidence, but it is self-reported and cannot be corroborated by Git history. Some entries summarize failures rather than preserving the exact decisive output. |
| TEST_AFTER | U16, U23, U28 | U16's first focused red was explicitly not run before implementation; U23 records only a passing performance measurement; U28 passed as a diagnostic characterization but is listed as an ordinary example and has no recorded deliberate mutant. |
| NO_TEST | None | Every active behavior names at least one existing test. A9, A22, and A25 are documented duplicates merged into A1/A3. |

The cycle log is not append-ordered: Cycle 22 and Cycle 23 precede Cycle 3, while Cycle 2 appears later. Cycle 28 says U16's red was not run before implementation; Cycle 47 adds a post-implementation mutant probe but does not make the original test-first sequence valid. These inconsistencies are recorded at [cycle-log.md](cycle-log.md#L19), [cycle-log.md](cycle-log.md#L44), [cycle-log.md](cycle-log.md#L178), [cycle-log.md](cycle-log.md#L236), and [cycle-log.md](cycle-log.md#L399).

## Acceptance Criteria

| Spec area | Coverage | Result |
| --- | --- | --- |
| US1 AC1-AC4 | A1-A4 | Covered by route-composed tests. |
| US2 AC1-AC4 | A5-A8 | Covered by route-composed tests. |
| US3 AC1-AC4 | A1, A10-A12 | Covered; A12 exercises the renderer-registry extension boundary. |
| US4 AC1-AC4 | A13-A16 | Covered by route and classifier tests. |
| US5 AC1-AC5 | A17-A21 | Covered by route-composed tests. |
| US6 AC1-AC4 | A3, A23-A24 | Covered; A3 combines the FK proposal and cardinality warning. |

**Uncovered acceptance scenarios:** none. However, FR-001 says the system MUST parse Oracle, while the plan, parser test, and quickstart deliberately reject Oracle with an unsupported-dialect diagnostic. This is a specification/implementation mismatch, not acceptance-criteria coverage. See [spec.md](../spec.md#L141) and the explicit Oracle boundary in [plan.md](../plan.md).

The architecture-extension test registers a TypeScript target but supplies the Java-only `CodeGenerationOptions` contract. It proves registry storage/resolution, but not that a future renderer can receive target-appropriate options. See [model.ts](../../../src/lib/codegen/model.ts#L143) and [rendererRegistry.test.ts](../../../tests/unit/codegen/rendererRegistry.test.ts#L49).

## Test Quality

**No HIGH assertion smells found.** The tests generally assert returned models, generated source, diagnostics, accessible UI state, clipboard payloads, and download content rather than only asserting collaborator calls. Negative cases include unsupported Oracle, invalid SQL, unknown types, DML, wildcard/insufficient evidence, composite FKs, and copy failure.

| Severity | Finding | Evidence |
| --- | --- | --- |
| MED | Several tests bundle multiple related cases, which makes failures less localized: joined/aggregate/grouped classification; DML plus unknown; and multiple generation options in one panel test. | [classifySql.test.ts](../../../tests/unit/codegen/classifySql.test.ts#L24), [classifySql.test.ts](../../../tests/unit/codegen/classifySql.test.ts#L40), [CodeGeneratorPanel.test.tsx](../../../tests/unit/codegen/CodeGeneratorPanel.test.tsx#L53) |
| MED | The performance assertion uses wall-clock timing and can be sensitive to a heavily loaded runner, although the threshold is generous and the test passes. | [performance.test.ts](../../../tests/unit/codegen/performance.test.ts#L20) |
| MED | The single renderer-extension test does not exercise a target-specific options contract; see the architecture note above. | [rendererRegistry.test.ts](../../../tests/unit/codegen/rendererRegistry.test.ts#L49) |

The test list covers the functional requirements in general, with the Oracle caveat above. Its `DONE` state records current behavior/test completion; it does not override the separate test-after evidence classification in this report.

## Mutation Results

No verified mutation command is available: the profile records `mutation: null` and `coverage: null`. No mutation score is claimed. The cycle log reports deliberate mutants for several behaviors, including nullability, classification, copy/download, reset, and composite-FK handling; those probes are self-reported, were not rerun during this audit, and do not constitute exhaustive mutation testing.

## Suite and Profile

The current full suite passed. The profile's recorded suite baseline is materially stale: it still describes 9 files/35 tests and 9.19 seconds, while this audit observed 58 files/492 tests and 70.46 seconds. The profile command itself (`npm test`) ran successfully.

The quickstart records current generator walkthrough evidence, but does not record a direct browser smoke of Explain, Analyze, Optimize, and Visualize despite T042's completion. SC-008 therefore has broad regression-suite evidence, not the explicit smoke evidence promised by the task. See [tasks.md](../tasks.md#L167) and [quickstart.md](../quickstart.md#L57).

## Findings and Remediation

| # | Severity | Finding | Evidence | Remediation |
| --- | --- | --- | --- | --- |
| 1 | HIGH | U16 has no pre-implementation focused red. The later mutation probe proves sensitivity, not test-first ordering. | [cycle-log.md](cycle-log.md#L236), [cycle-log.md](cycle-log.md#L399), [test-list.md](test-list.md#L90) | T044 |
| 2 | HIGH | U23 has a passing timing result but no recorded red or characterization classification. | [cycle-log.md](cycle-log.md#L423), [test-list.md](test-list.md#L103) | T044 |
| 3 | HIGH | U28 is described as a characterization in the log but is listed as `kind: example`, `state: DONE`, with no red or deliberate-mutant evidence. | [cycle-log.md](cycle-log.md#L448), [test-list.md](test-list.md#L64) | T044 |
| 4 | HIGH | FR-001's Oracle MUST-parse requirement conflicts with the planned and tested unsupported-dialect behavior. | [spec.md](../spec.md#L141), [plan.md](../plan.md) | T043 |
| 5 | MED | Task text uses story tags such as `[US1]`, not the A/U behavior IDs required for TDD task synchronization; later behaviors are not mapped to task IDs. | [tasks.md](../tasks.md#L37), [tasks.md](../tasks.md#L44) | T045 |
| 6 | MED | SC-004 has no generated-Java compile check; the plan explicitly limits validation to source structure because target dependency versions are unspecified. | [spec.md](../spec.md#L175), [plan.md](../plan.md) | T046 |
| 7 | MED | SC-001/002/003/005/007 require corpus or user-outcome measurements not present in the current tests or evidence. | [spec.md](../spec.md#L172), [spec.md](../spec.md#L177) | T047 |
| 8 | MED | SC-008 has no explicit recorded browser smoke for the existing Explain, Analyze, Optimize, and Visualize workflows. | [spec.md](../spec.md#L179), [quickstart.md](../quickstart.md#L57) | T048 |
| 9 | MED | The extension test's renderer options are Java-only even when registered for TypeScript, so target-specific extensibility is not demonstrated. | [model.ts](../../../src/lib/codegen/model.ts#L143), [rendererRegistry.test.ts](../../../tests/unit/codegen/rendererRegistry.test.ts#L49) | T050 |
| 10 | MED | The TDD profile's recorded suite size and runtime no longer match the current repository. | `.specify/memory/tdd-profile.md` (`suite_seconds: 9.19`; notes: 9 files/35 tests) | T049 |

Tasks T043-T050 were appended to [tasks.md](../tasks.md). Historical cycle-log entries were not rewritten. No application source or tests were modified by this audit.

## Not Audited

- Generated Java was not compiled against a concrete JPA/MyBatis dependency version.
- Accuracy, time-savings, and exhaustive warning-rate success metrics were not measured.
- A production build was not run during this audit; the quickstart retains the prior `/404` prerender failure report.
- Mutation and coverage tools are unavailable in the verified profile.
