# Research: Query Input UX Improvement

## Research Questions

### 1. What is the minimal, safe change boundary for this feature?
**Decision:** Keep the scope to the existing Query Input page and its immediate child components, using the current Zustand state model, i18n layer, and SQL analysis pipeline without altering parser logic or API contracts.

**Rationale:** The feature brief explicitly states that the value is in information architecture, hierarchy, and layout clarity rather than business or parser changes. The current page already splits into reusable pieces such as header, tabs, parameter configuration, action buttons, and preview panel, which makes an incremental UI refinement low-risk and consistent with the existing design system.

**Alternatives considered:**
- Rebuilding the page with a new dashboard shell or AI-style layout. Rejected because it would add noise and contradict the enterprise developer tool identity.
- Reworking data flow or store semantics. Rejected because the current state model already supports the required workflows and preserving it reduces regression risk.
- Adding a new translation mechanism or new styling framework. Rejected because the repository already has Tailwind and the existing i18n layer.

### 2. How should the page be structured visually without harming usability?
**Decision:** Use a desktop-first two-column layout with input/configuration on the left and resolved SQL on the right, followed by findings under the main workspace. Preserve the existing workflow order: input → configure parameters → review SQL → analyze → review findings.

**Rationale:** The user prompt prioritizes information hierarchy and progressive disclosure. A clear left/right/bottom arrangement aligns with the user's scanning pattern while keeping the SQL editor comfortable for long statements and preserving parameter readability.

**Alternatives considered:**
- Equal-weight card layout with repeated borders. Rejected because it increases cognitive load and weakens the primary action.
- Single-column stacking for all content. Rejected because the SQL editor requires more width and the page is primarily desktop-oriented.

### 3. What components should be reused instead of introducing new patterns?
**Decision:** Reuse the existing `Header`, `TabNavigation`, `ParameterConfig`, `ActionButtons`, `PreviewPanel`, `LoadingOverlay`, and `AppLayout` components, then improve their grouping, spacing, and visual treatment without changing their behavior.

**Rationale:** The feature brief explicitly calls for reusing the existing design system and component library before creating anything new. The current page is already structured around these pieces, so the UX uplift can be done with targeted styling and layout improvements.

**Alternatives considered:**
- Introducing entirely new cards or wrappers for every section. Rejected because it would duplicate existing components and increase maintenance cost.
- Refactoring the SQL analyzer or store. Rejected because no business logic changes are required for this feature.

### 4. How should we handle accessibility and localization?
**Decision:** Use the existing i18n translation keys, preserve both Vietnamese and English, and improve focus states, button labeling, and semantic grouping without relying on color alone to communicate severity or status.

**Rationale:** The project already supports bilingual behavior and the feature specifically requires language-agnostic UI implementation using the existing translation system. Accessibility needs are also explicit requirements in the prompt.

**Alternatives considered:**
- Hard-coded Vietnamese or English strings inside JSX. Rejected because this would bypass the current i18n system.
- Color-only status semantics. Rejected because that would fail accessibility and severity clarity requirements.

## Research Summary

The most important technical finding is that this feature is an interface refinement only. The project already contains a working Query Input page, state model, and design primitives. The safest path is to improve visual hierarchy and component structure within the existing architecture, while validating layout and behavior with the repository's TypeScript, lint, and test checks.
