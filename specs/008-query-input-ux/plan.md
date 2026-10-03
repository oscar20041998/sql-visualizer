# Implementation Plan: Query Input UX Improvement

**Branch**: `008-query-input-ux` | **Date**: 2026-09-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-query-input-ux/spec.md`

**Note**: This plan completes the design and validation phase for the Query Input UX improvement without altering business logic or SQL analysis behavior.

## Summary

The feature improves the existing Query Input / SQL Analysis Input page by clarifying information hierarchy, emphasizing the primary analysis action, improving input-method distinction, strengthening parameter readability, and making the resolved SQL and findings easier to scan while preserving all current functionality.

## Technical Context

**Language/Version**: TypeScript with Next.js 15 and React 19. This is a frontend web application using the existing project runtime.

**Primary Dependencies**: Next.js, Tailwind CSS, Zustand, Monaco editor, lucide-react, sonner, and the existing SQL analyzer utilities in `src/lib/sql`.

**Storage**: No new persistence layer required. The page relies on browser state plus the project’s existing query history persistence and local Zustand store.

**Testing**: Vitest for unit tests, plus repository type-check and lint verification via `npm run type-check`, `npm run lint`, and `npm run test`.

**Target Platform**: Desktop-first web application, optimized for 1024px–1920px widths with support for both dark and light themes.

**Project Type**: Web application / frontend workflow tool.

**Performance Goals**: UI interactions remain immediate; no user-visible degradation in page scanning or form editing behavior.

**Constraints**: Preserve the current SQL parsing, parameter extraction, AI analysis behavior, stored state semantics, and API contracts. No redesign of the business logic or database layer.

**Scale/Scope**: This is a single-page UX refinement within `src/app/query-input` and its immediate shared UI primitives; no new modules are required beyond existing components and styling patterns.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Multi-Dialect SQL Analysis: PASS — no change to SQL parsing or dialect logic; the feature composes on existing analyzer behavior.
- Interactive Visualization First: PASS — the redesign preserves the current workflow and increases readability without altering the graph-first analysis model.
- Real-Time Feedback Loop: PASS — parameter editing and SQL resolution behavior remain intact and continue to update the current preview state.
- AI-Grounded Explanations: PASS — no AI output semantics are changed; the feature is presentation-only.
- Minimal Deployment Friction: PASS — no deployment or infrastructure changes are introduced.
- Security & Privacy: PASS — no credentials or query data handling changes are introduced.
- Quality Standards: PASS — accessible, bilingual, and desktop-ready UI improvements will be validated with the project’s TypeScript, lint, and test gates.

No constitution violations or complex exceptions are required for this feature.

## Project Structure

### Documentation (this feature)

```text
specs/008-query-input-ux/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
├── checklists/          # Requirement checklist generated during specify
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created here)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── query-input/
│       ├── page.tsx
│       └── components/
│           ├── Header.tsx
│           ├── TabNavigation.tsx
│           ├── SqlInputPanel.tsx
│           ├── MyBatisPanel.tsx
│           ├── ParameterConfig.tsx
│           ├── ActionButtons.tsx
│           ├── PreviewPanel.tsx
│           └── ...
├── components/
│   ├── AppLayout.tsx
│   └── ui/
├── lib/
│   ├── store.ts
│   ├── i18n.ts
│   ├── sql/
│   └── queryHistoryClient.ts
└── locales/
    ├── en.ts
    └── vi.ts
```

**Structure Decision**: Single web-application frontend with UX refinement scoped to the existing Query Input route and its shared UI primitives. No new backend service or API contracts are introduced.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No complexity exceptions are required. This is a contained UX refactor within the existing frontend structure and business logic.
