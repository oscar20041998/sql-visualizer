# Contract: Query Input Page (MyBatis modes)

**Feature**: `009-mybatis-sql-normalization` | **Route**: `src/app/query-input/page.tsx` | **Date**: 2026-09-20

Covers the page behaviour in the MyBatis input modes (`mybatis` for pasted XML, `import-xml` for an uploaded file). The direct-SQL and smart-editor modes are untouched.

## Preserved behaviour (regression contract)

These are pinned by the existing suites (`tests/unit/query-input-workflow.test.tsx`, `query-input-parameters.test.tsx`, `query-input-review.test.tsx`) and must not change:

- **Workflow order**: the MyBatis input panel, then parameter configuration, then the resolved-SQL review, then the linting findings area appear in that heading order.
- **Input panel**: the drop area is shown in upload mode, the XML textarea in paste mode, the imported file name and its removal action stay visible when a file was imported.
- **Parameter editor**: one labelled field per detected reference (`#{name}`), the conditional badge for references that appear only inside a guard, the search field only when more than six parameters exist, filtering never discards entered values, and the empty-parameter state keeps its explanatory copy.
- **Preview panel**: title and description unchanged, read-only editor, copy action with its accessible label, line count, and the existing empty-state copy when there is no SQL.
- **Actions**: the primary action keeps its `data-action`/`data-variant` markers and its hint text, and the sample and clear actions keep theirs. Clear resets the XML, the parameter values, the resolved SQL and the imported file name; Load Sample loads the sample mapper.
- **Analysis flow**: empty input, format check and dialect check report exactly as today before analysis runs; a successful analysis saves the analysed SQL to history and navigates onward.
- **Localisation**: every new string goes through the existing localization resources in both languages.

## New behaviour

### Statement picker (`StatementPicker`)

- **Visibility**: rendered inside the MyBatis input panel only when the loaded file defines more than one mapped statement; a single-statement file shows no picker.
- **Accessible name**: the existing picker label string; the control is a native select so keyboard and screen-reader behaviour come from the platform.
- **Options**: one per statement, labelled with the statement type and identifier, plus the occurrence index only when identifiers repeat within the file.
- **Default**: the first statement in document order; the selection resets to it whenever the XML text changes.
- **Effect**: changing the selection replaces the resolved SQL with that statement's SQL and re-derives the detected parameters; the file is not re-imported.
- **No new step**: the picker adds no heading to the workflow list and does not reorder the existing panels.

### Conversion findings (`ConversionFindings`)

- **Placement**: left column, directly after the MyBatis input panel, so it reads before the parameter and review panels.
- **Content**: one entry per finding with the construct or statement it concerns and its place in the mapper; entries are grouped by severity (error, warning, info) and are readable without expanding anything.
- **Clean case**: when a file converts with no findings, the panel states that instead of rendering nothing.
- **Blocked case**: when the selected statement cannot be converted, the panel carries the explanation of what must be put right and the resolved-SQL preview stays empty — partial SQL is never shown.
- **Not linting**: these findings are never merged into the existing linting findings area, because they describe the conversion rather than the SQL's quality.

### Primary action gating

- The action stays available whenever the selected statement's state is analysable, and is disabled with the blocking reason nearby when it is blocked, wired to the button through `aria-describedby`.
- When the action is blocked, triggering analysis by any other route is also refused with the same explanation, so no incomplete SQL can reach the analyzer.
- The existing hint text keeps rendering in both states.

## State contract

- **Store (unchanged shape)**: `myBatisXml`, `myBatisParams`, `resolvedSql`, `inputMode`, `dialect`, `analysisResult`, `isAnalyzing`. `resolvedSql` keeps holding the SQL the page would analyse, so the preview, the linting area and the analysis path keep reading the same field.
- **Page-local state (new)**: the parsed model, the statement options, the selected statement key, the resolution result and its findings. These are derived state, not persisted, and not added to the global store.
- **Derivation**: `detectedParams` and the conditional-parameter set come from the resolution result rather than from an independent scan, so the editor and the rendered SQL cannot disagree (FR-026). The legacy helpers remain available for compatibility but the page no longer needs a second scan to describe parameters.
- **Re-derivation triggers**: XML text (re-parse and reset selection), parameter value (re-resolve), selected statement (re-resolve), dialect (re-resolve). No trigger re-reads the file.

## Required localisation keys

Both `src/locales/en.ts` and `src/locales/vi.ts` must define the same keys (the translation type is derived from the English file, so a missing key is a type error):

| Key purpose | Used by |
|-------------|---------|
| Statement picker label and hint | StatementPicker |
| Statement option format (`{type} {id}`) and repeated-identifier suffix | StatementPicker |
| Findings panel title, description and clean-state message | ConversionFindings |
| Severity labels (error, warning, info) | ConversionFindings |
| One message per finding kind (`MISSING_FRAGMENT`, `FRAGMENT_CYCLE`, `FRAGMENT_DEPTH`, `EXPANSION_LIMIT`, `UNRESOLVED_CONDITION`, `UNRESOLVED_COLLECTION`, `EMPTY_COLLECTION`, `UNRESOLVED_BIND`, `UNSUPPLIED_VALUE`, `UNSUPPLIED_SUBSTITUTION`, `DUPLICATE_FRAGMENT`, `SELECT_KEY_SKIPPED`, `MALFORMED_XML`, `INPUT_TOO_LARGE`, `NESTING_TOO_DEEP`, `NO_STATEMENT`) | ConversionFindings |
| Location format for a finding (`line`/`statement`) | ConversionFindings |
| Unresolved-count badge | ConversionFindings |
| Blocked-action reason | ActionButtons wiring |

## Accessibility

- The picker is a labelled native select; its options are readable text, not icons alone.
- Findings use a list with a textual severity label per entry, so severity never depends on colour.
- The blocked primary action carries the reason text and is linked to it, so a keyboard or screen-reader user learns why analysis is unavailable.
- The existing focus-visible styling and heading semantics are reused; no new interactive element bypasses them.

## Analysis handoff

- Only the resolution result's SQL reaches the analyzer (`analyzeSql`), followed by the unchanged format check, dialect check, history save and navigation.
- Findings, the mapper model and any mapper metadata stay out of the analysis input and out of anything sent to AI providers.
- The selected dialect governs the analysis exactly as today.

## Non-goals for this contract

- Changing the layout hierarchy, the panel shell or the dark enterprise visual identity (owned by specs/008-query-input-ux).
- Changing direct-SQL or smart-editor behaviour.
- Any new persistence, route, or server endpoint.
