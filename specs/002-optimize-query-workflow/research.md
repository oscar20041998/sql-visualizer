# Research: Optimize Query Workflow Redesign

## Decision: Reuse existing modal accessibility pattern from `AiFeatureAnnouncement.tsx`

**Rationale**: The codebase already has one hand-rolled modal (`role="dialog" aria-modal="true"`, backdrop click, `useState` open/close) in `src/app/smart-sql-editor/components/AiFeatureAnnouncement.tsx`. No dialog/modal primitive exists in `src/components/ui/`. Following the existing pattern avoids introducing a new UI dependency and keeps styling consistent with the rest of the editor page.

**Alternatives considered**:
- Add a headless UI library (Radix Dialog, Headless UI) — rejected: adds a new dependency for a single modal when an established in-repo pattern already covers focus/backdrop/escape handling adequately.
- Use `<dialog>` native element — rejected: inconsistent styling/animation control across the app's dark theme, and no existing precedent in this codebase.

## Decision: Extend `aiService.ts` semantic-brief/optimize calls with an optional `userInstruction` field rather than a new function

**Rationale**: `analyzeSqlSemantics` and `optimizeSqlWithAIStream` already take a `contextBrief` string that is assembled from parser facts, lint issues, and dialect knowledge. A natural-language instruction is just another input to fold into the same brief/prompt-construction pipeline, and the "must not change semantics" constraint already has an enforcement point: `formatSemanticBriefForOptimizePrompt` (turns the confirmed brief into a prompt constraint) and `buildStructuralRegressionWarnings` (post-hoc structural diff). Adding a new parallel function would duplicate that enforcement logic.

**Alternatives considered**:
- Separate `optimizeWithInstruction()` function — rejected: would duplicate the structural-regression-check and proposal-repair logic that must apply identically regardless of trigger source (automatic lint vs. natural language).

## Decision: Semantics guarantee enforced via the existing structural regression check, extended if needed with an explicit "instruction rejected" outcome

**Rationale**: `buildStructuralRegressionWarnings` already compares: table identity, join identity, join type, output column identity, table/join counts, DISTINCT/GROUP BY presence — matching exactly the "semantics" scope defined in the spec's Assumptions section. For FR-005 (refuse semantics-changing instructions), the model is asked to state explicitly when a literal instruction would require a semantic change, and the modal must render that refusal instead of a proposal. This reuses `SqlOptimizationResult.analysis`/`semanticImpact` fields already present in the type; if the model doesn't self-report, the structural regression check remains the hard backstop before confirmation.

**Alternatives considered**:
- Build a separate formal query-equivalence checker (e.g., relational algebra comparison) — rejected: explicitly out of scope per spec Assumptions ("not full formal query-equivalence proof"); existing parser-fact diff is the agreed boundary.

## Decision: Diff view auto-enable reuses `state.isDiffMode` + `DiffEditor`, no new diff component

**Rationale**: `SmartSQLEditor` already renders `<DiffEditor original={state.originalSql} modified={state.currentSql} .../>` toggled by `state.isDiffMode`, and `handleToggleDiffMode` already exists. On confirm, the plan is to call the existing state setter to flip into diff mode automatically instead of requiring the user's manual "Compare" click, satisfying FR-009/FR-010 with no new component.

**Alternatives considered**: A dedicated before/after modal panel — rejected: FR-009 explicitly asks for the change to appear "on the Editor immediately", i.e., the main editor surface, not a secondary review panel.

## Decision: No new backend/API route required

**Rationale**: All AI calls already flow through existing client functions in `aiService.ts`, which call `src/app/api/ai/*` server routes. A natural-language instruction is passed as additional prompt content on the client side — no new payload shape requires a new route.

**Alternatives considered**: N/A — confirmed via reading `src/app/api/ai/` structure and `aiService.ts` call sites.
