# Research: Requirement-Driven Query Optimization

## R1: How to generate a candidate query for a stated requirement

**Decision**: Reuse the existing two-step AI Optimize pipeline (`analyzeSqlSemantics` → optimize call) and add a third mode alongside it: instead of `userInstruction` being a style/performance goal fed into `optimizeSqlWithAIStream`'s existing prompt, a new `requirementInput` is fed into a new prompt/result path (`generateRequirementCandidate` in `aiService.ts`) that is explicitly allowed to change tables/joins/filters/output columns, unlike the existing optimize prompt which is instructed to never do so.

**Rationale**: The existing pipeline already has the context-brief injection (`buildSqlContextBrief`), streaming plumbing, JSON-mode parsing, and budget/repair mechanics (`repairInvalidProposals`, `isProposalApplicable`) needed to reliably turn model output into an appliable SQL change. Reusing this infrastructure (new prompt + new result shape, not a new call stack) is the smallest change consistent with the existing AI-Grounded Explanations principle (constitution IV).

**Alternatives considered**:
- *Extend `userInstruction` to also allow semantic changes*: rejected — would silently weaken the existing optimizer's "never change semantics" guarantee (spec 002 US2), which FR-008 of this feature explicitly requires to stay intact.
- *Full-rewrite candidate instead of `find`/`replace` proposal*: rejected for the requirement-driven mode — a full-query diff (whole original vs. whole candidate) is what the spec's "sample candidate query" and User Story 2 compare/apply flow calls for, so this mode returns a single candidate `optimizedSql` (like existing `SqlOptimizationResult.optimizedSql`) rather than narrow `find`/`replace` proposals; using the same simple full-string field also makes the semantic-diff computation (R2) implementable purely by structural analysis, avoiding per-line hunk diffing.

## R2: How to detect and label a "semantic change" and produce a diff summary

**Decision**: Reuse `analyzeSql()` (already used by `buildStructuralRegressionWarnings` for the existing optimizer's regression check) on both the original and candidate SQL, and pass both `AnalysisResult`s to a new pure function `buildRequirementChangeSummary(original, candidate)` in `src/lib/sql/optimizeRegression.ts` that reports added/removed tables, added/removed joins, filter/column differences, and a boolean `isSemanticChange`.

**Rationale**: `analyzeSql` is already the project's single source of parsed structural truth (constitution I/IV — grounded in parser facts, not model self-report), and `buildStructuralRegressionWarnings` already solves the closely related problem (comparing before/after structure) for the existing optimizer. Reusing the same parser-diff approach keeps the "semantic change" determination authoritative and locally verifiable rather than trusting the model's own claim.

**Alternatives considered**:
- *Trust the model's self-reported `semanticImpact` string alone (as the existing optimizer does for warnings)*: rejected as the sole signal for FR-005's mandatory semantic-change label — the model's own claim is already shown as descriptive text but must not be the only gate deciding whether the Apply button requires the extra confirmation step, per constitution IV ("AI outputs MUST never contradict the parser's findings").
- *New parser/diff algorithm from scratch*: rejected — `analyzeSql` + a thin comparison layer is sufficient and avoids duplicating table/join extraction logic.

## R3: Validating user-named tables ("refer to tables A, B, C") against a schema

**Decision**: There is no live database schema/catalog connection in this codebase (confirmed: no `SchemaCatalogManager`-equivalent exists outside the future `docs/spring-backend-calcite` design doc). "Known schema" for FR-003 is therefore defined as the set of tables/CTEs already present in the current analyzed query (from `AnalysisResult.tables`) plus any table names the model can ground via the existing general database-knowledge RAG index (`buildOptimizeKnowledgeBrief`, generic DB docs — not the user's actual schema). Table names in the requirement that match neither source are reported to the user as "not found in the current query or documentation" rather than silently fabricated into a JOIN.

**Rationale**: Matches existing architecture exactly — the app has never had authoritative schema introspection; all "facts" are either parsed from the pasted query or retrieved from the generic knowledge index. A reasonable default given no schema catalog exists.

**Alternatives considered**:
- *Add a new schema-catalog/DB-connection feature*: out of scope — a much larger change not requested, and blocked by constitution V (no new server-side credentials/deployment friction without explicit need).
- *Treat every named table as always valid*: rejected — directly violates FR-003.

## R4: UI integration point

**Decision**: Add the requirement-input mode as a new tab/section inside the existing `OptimizeQueryModal` (`src/app/smart-sql-editor/components/OptimizeQueryModal.tsx`), reusing its existing collapsible-card, streaming-progress, and Apply/Discard patterns rather than a new modal.

**Rationale**: Spec assumption states this extends the existing Optimize workflow; the modal already hosts the semantic-brief step, NL instruction input, and proposal Apply/Discard actions the new mode needs, and reusing it keeps a single, consistent optimize entry point (User Story 3's "separate mode, not a separate screen" requirement is satisfied by a mode toggle within the same modal, not a second modal).

**Alternatives considered**:
- *New standalone modal*: rejected — duplicates existing streaming/apply/discard scaffolding and would fragment the single Optimize entry point.

## R5: Editor compare/apply behavior reuse

**Decision**: Reuse the existing confirm → editor diff/compare flow already built for spec 002 (User Story 4) rather than building a new apply/compare mechanism; the requirement-driven candidate's `optimizedSql` flows through the same "Apply" action already wired in `SmartSQLEditor.tsx`.

**Rationale**: FR-006/FR-007/SC-003 (explicit apply, discard leaves original untouched) are already guaranteed by the existing confirm-then-apply mechanics; no new state machine is needed beyond adding the new mode's result into the same apply path plus the stale-candidate invalidation in R6.

## R6: Invalidating a stale candidate on manual edit (FR-009)

**Decision**: Track the `sql` snapshot the candidate was generated from (already the pattern used by `pendingOptimizeRef` for the existing instruction flow); before enabling "Apply", compare the editor's current content against that snapshot and disable/hide Apply (with an explanatory note) if they differ.

**Rationale**: Mirrors the existing `pendingOptimizeRef`/`isProposalApplicable` staleness-guard pattern already in the codebase (see repo memory: proposal `find`/`replace` reliability), applied at the whole-query level instead of per-proposal.

## Summary of resolved unknowns

| Unknown | Resolution |
|---|---|
| Candidate generation approach | New prompt/result path in `aiService.ts`, reusing existing streaming/budget plumbing |
| Semantic-change detection | Parser-based diff (`analyzeSql` before/after) via new `buildRequirementChangeSummary` |
| Schema validation source | Query-local tables (`AnalysisResult.tables`) + generic DB-knowledge RAG index; no live schema catalog exists |
| UI surface | New mode inside existing `OptimizeQueryModal`, not a new modal |
| Apply/compare mechanics | Reuse existing confirm→diff flow from spec 002 |
| Stale-candidate handling | Snapshot-compare guard mirroring existing `pendingOptimizeRef` pattern |
