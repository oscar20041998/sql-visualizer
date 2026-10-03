---

description: "Task list for Professional & Responsive Sign-In Page UI"

---

# Tasks: Professional & Responsive Sign-In Page UI

**Input**: Design documents from `/specs/006-login-ui-redesign/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: INCLUDED — the spec explicitly requires automated behaviour and accessibility checks (SC-011, clarification Q4/Q5, FR-017). Layout, spacing, colour, and breakpoint behaviour remain **manual by design** (SC-012) and are covered by `quickstart.md` scenarios, not by automated assertions.

**Organization**: Tasks are grouped by user story so each story is independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single project (Next.js App Router). Routes live in `src/app/**`; reusable UI in `src/components/**`; shared logic in `src/lib/**`; locales in `src/locales/**`; tests are colocated with the code they cover, matching the existing `src/lib/demoAuth.test.ts` convention.

## Requirement coverage map

| Requirement | Tasks |
|---|---|
| FR-001, FR-002 (typography, spacing) | T018, T019 |
| FR-003 (preserve behaviour) | T008, T028 |
| FR-004 (responsive reflow) | T025, T026 |
| FR-005 (keyboard, focus) | T029, T030 |
| FR-006 (all visual states) | T029, T031, T032 |
| FR-007 (locales) | T006, T007, T023, T035 |
| FR-008 (AA contrast) | T022, T031 |
| FR-009 (no auth logic change) | T008, T034 |
| FR-010 (primary action dominant) | T021 |
| FR-011 (home page has no form) | T015 |
| FR-012 (already-authenticated redirect) | T009 |
| FR-013 (deep-linkable) | T010, T011 |
| FR-014 (no new credential exposure) | T039 |
| FR-015 (brand column auxiliary) | T024, T026 |
| FR-016 (form first in order) | T027 |
| FR-017 (dev-only deps) | T001, T002, T034 |
| FR-018 (no a11y violations) | T017 |
| FR-019 (no dead ends) | T012, T013, T014 |
| SC-001 … SC-013 | T016–T038, mapped in [quickstart.md](./quickstart.md) |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the dev-only test tooling approved in clarification Q5 and capture a clean baseline before any behaviour changes.

- [ ] T001 Add a React component-rendering test library plus its DOM matcher companion as **devDependencies** in `package.json` (must be compatible with vitest 2.1.9 and jsdom 30)
- [ ] T002 Add an automated accessibility scanner as a **devDependency** in `package.json` that runs inside the existing jsdom environment
- [ ] T003 Register the DOM matchers and accessibility-scan setup in a shared setup file (e.g. `vitest.setup.ts`) and reference it from `vitest.config.ts`, leaving the existing `environment: 'jsdom'` and `testTimeout` untouched
- [ ] T004 Record the pre-change baseline by running `npm test`, `npm run type-check`, and `npm run lint` and noting which checks already pass, so later failures can be attributed correctly

**Checkpoint**: Tooling installed, baseline known, no application behaviour changed yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the new route, extract the sign-in surface, revive the theme provider, add locale keys, and remove the dead ends. Every user story builds on this.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 [P] Revive `src/components/ThemeProvider.tsx` to apply the theme explicitly — add the `light` class when the setting is light and the `dark` class otherwise (research R2: the current file only removes `light`, which silently deactivates the ~60 `dark:` variant styles in the codebase)
- [ ] T006 [P] Add page-level framing copy keys (page title, supporting statement) to `src/locales/en.ts`, following the existing `auth*` naming convention; do not reword any existing `auth*` value
- [ ] T007 [P] Add the matching keys to `src/locales/vi.ts` (key-for-key parity is enforced by the `i18n.ts` schema type)
- [ ] T008 Create `src/components/auth/SignInPanel.tsx` by extracting the existing sign-in/register form out of `src/app/page.tsx`, preserving **unchanged**: the `AuthUIState` union and all handlers, the login/register mode switch, the admin credential check, the OAuth popup start/finish/cancel flow, the `role="alert"` error region, and the temporary-credentials notice (FR-003, FR-009)
- [ ] T009 Create `src/components/auth/SignInPage.tsx` with the client-side auth gate from research R7: on mount evaluate `isDemoAuthenticated()`, navigate to `/query-input` when authenticated, otherwise mark authorised, and render `null` while unresolved (FR-012)
- [ ] T010 Create the Server Component route shell `src/app/login/page.tsx` exporting route `metadata` and rendering `SignInPage`, wrapped with `ThemeProvider` (FR-013; research R1, R2)
- [ ] T011 Verify `/login` is reachable in a fresh browser profile with no session and renders the extracted form (FR-013)
- [ ] T012 [P] Retarget the unauthenticated guard in `src/app/query-input/page.tsx` from `/` to `/login`, changing nothing else (FR-019)
- [ ] T013 [P] Retarget the session-expiry redirect in `src/components/AppLayout.tsx` from `/` to `/login`, keeping the existing "session expired" toast (FR-019)
- [ ] T014 [P] Retarget the sign-out redirect in `src/components/Sidebar.tsx` from `/` to `/login`, keeping the existing sign-out success toast (FR-019)
- [ ] T015 Remove the embedded sign-in panel from `src/app/page.tsx` and retarget its primary call-to-action — go to `/login` when signed out, keep going straight to `/query-input` when already signed in (FR-011); also remove the now-orphaned `#workspace-access` anchor handling

**Checkpoint**: Foundation ready — `/login` exists, the home page no longer hosts a form, and every signed-out flow leads somewhere a visitor can sign in.

---

## Phase 3: User Story 1 - Confident first impression on a laptop/PC screen (Priority: P1) 🎯 MVP

**Goal**: The sign-in page renders a polished, on-brand surface at 1920×1080 and 1366×768 — readable typography (no text below a 12px equivalent), consistent un-cramped spacing, clear primary/secondary hierarchy, design-system consistency, and WCAG 2.1 AA contrast in both themes.

**Independent Test**: Open `/login` at 1920×1080 and then 1366×768 and confirm the two-column composition renders with legible text sizes, consistent spacing, no clipped or overlapping elements, no horizontal scrollbar, and no one-off colours — without depending on US2's breakpoint collapse or US3's state refinements.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST and ensure they FAIL before implementing the tasks below.**

- [ ] T016 [P] [US1] Add a component-rendering test for `SignInPanel` in `src/components/auth/SignInPanel.test.tsx` asserting the visible field labels, the mode-tab semantics (`tablist`/`tab`/`aria-selected`), and the temporary-credentials notice render — this is the structural contract from `contracts/sign-in-page.md` C2/C5
- [ ] T017 [P] [US1] Add an automated accessibility scan test for the sign-in surface in `src/app/login/login-a11y.test.tsx` asserting zero WCAG 2.1 AA violations (SC-011, FR-018)

### Implementation for User Story 1

- [ ] T018 [US1] Apply the readable typography scale in `src/components/auth/SignInPanel.tsx` per research R4: `text-sm` (14px) for body/labels/inputs/buttons, an explicit heading hierarchy, and no informative text below the 12px floor (FR-001, SC-003)
- [ ] T019 [US1] Apply the consistent spacing rhythm and control sizing in `src/components/auth/SignInPanel.tsx`: one uniform vertical gap between fields and sections, and controls at least ~40px tall (FR-002, FR-005)
- [ ] T020 [US1] Build the two-column page composition and the brand-introduction column in `src/components/auth/SignInPage.tsx`, deriving the brand content from existing home-page marketing copy — no new marketing assets (research R3; `contracts` C2)
- [ ] T021 [US1] Establish the primary/secondary visual hierarchy in `src/components/auth/SignInPanel.tsx`: the sign-in action is the visually dominant control, with register and social actions clearly subordinate but still discoverable (FR-010)
- [ ] T022 [US1] Measure and, only where no existing pairing clears the bar, adjust the affected token in `src/styles/tailwind.css` for **both** `:root` and `.light`, raising contrast only — text ≥ 4.5:1, control boundaries/states/focus ≥ 3:1 (FR-008, SC-010, research R5)
- [ ] T023 [US1] Verify the new page framing copy renders correctly in both `en` and `vi` at 1920×1080 and 1366×768 with no clipping or broken layout (FR-007)

**Checkpoint**: US1 is independently demonstrable — the page looks professional and accessible at both named viewports.

---

## Phase 4: User Story 2 - Smooth experience across PC/laptop window sizes (Priority: P2)

**Goal**: Reduce the browser window from a wide desktop width to a narrower laptop width and the page adapts gracefully — the two-column arrangement collapses into a single centered column containing only the form — with no breakage, overlap, or horizontal scrolling at any intermediate width.

**Independent Test**: Open `/login` at 1600px, drag the window narrower past 1024px, and confirm the brand column disappears entirely (absent from the accessibility tree and tab order), the form becomes a single centered column, the form stays first in tab order, and no horizontal scrollbar appears at 1920/1440/1280/1100/1024px — independent of US3's state work.

### Tests for User Story 2 ⚠️

- [ ] T024 [P] [US2] Add a regression test in `src/components/auth/SignInPage.test.tsx` asserting the brand-introduction column renders **zero** interactive controls, so hiding it at narrow widths can never change the tab sequence (FR-015, FR-016)

### Implementation for User Story 2

- [ ] T025 [US2] Add the breakpoint reflow in `src/components/auth/SignInPage.tsx`: two columns at ≥1024px (`lg`) and a single centered form column below it, with a bounded max width on the form at every size (FR-004, research R3)
- [ ] T026 [US2] Hide the brand column below the breakpoint with a display utility so it leaves the accessibility tree and tab order — not `invisible`, not `opacity-0` (FR-015, `contracts` C2)
- [ ] T027 [US2] Order the DOM in `src/components/auth/SignInPage.tsx` so the sign-in form is the first meaningful content in reading and tab order at every width (FR-016)
- [ ] T028 [US2] Confirm in `src/components/auth/SignInPage.tsx` that no horizontal scrollbar appears and no interactive elements overlap at 1920, 1440, 1280, 1100, and 1024px (SC-001, SC-004)

**Checkpoint**: US1 and US2 both work independently; the responsive story is demonstrable on its own.

---

## Phase 5: User Story 3 - Clear, professional form feedback and states (Priority: P3)

**Goal**: Every interactive control shows a clear, professional state — hover, focus, disabled, loading during social sign-in, error, and success — so the visitor always understands what is happening.

**Independent Test**: Hover each control, tab through the form, submit invalid credentials, start a social sign-in to observe the loading/disabled state, and cancel the consent popup to observe the error state — confirming each state is visually distinct and does not break the surrounding layout, independent of US1/US2.

### Tests for User Story 3 ⚠️

- [ ] T029 [P] [US3] Add behaviour tests in `src/components/auth/SignInPanel.test.tsx` covering: both social buttons disabled while authenticating, the `role="alert"` error region appearing on cancellation, invalid-credentials submission staying on the page with an error, and a successful admin sign-in triggering navigation to `/query-input` (FR-003, FR-006, SC-006)

### Implementation for User Story 3

- [ ] T030 [US3] Add distinguishable hover, focus-visible, and disabled visual states to every control in `src/components/auth/SignInPanel.tsx`, using existing design-system tokens only (FR-006)
- [ ] T031 [US3] Add a visible focus ring to every interactive element using the `ring`/`primary` token at ≥3:1 against the adjacent background (FR-005, FR-008, SC-002)
- [ ] T032 [US3] Restyle the `role="alert"` error region and the temporary-credentials notice so their text meets AA contrast on an opaque background without causing layout shift that hides other controls (FR-006, FR-008, research R5)
- [ ] T033 [US3] Add the loading affordance to the activated social button during `authenticating`, and confirm both social buttons re-enable when the flow resolves or is cancelled (FR-006, `contracts` C3)

**Checkpoint**: All three stories are independently functional and testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verification and hardening that spans all three stories.

- [ ] T034 [P] Confirm no shipped/customer-facing module imports either dev-only test tool, and that both are listed only under `devDependencies` (FR-017). Run a `grep`/IDE search across `src/` for the two package names and verify zero hits outside test files
- [ ] T035 [P] Add inline comments in `src/components/auth/SignInPage.tsx` and `src/components/ThemeProvider.tsx` explaining the theme-application decision and the layout/breakpoint contract (constitutional Documentation standard; research R2, R3)
- [ ] T036 Run `npm run type-check` — passing proves the new locale keys exist in both `en` and `vi` (research R10, FR-007)
- [ ] T037 Run `npm run lint` and `npm run build` and resolve any new findings introduced by this feature
- [ ] T038 Run the full `npm test` suite and confirm the behaviour tests and the accessibility scan both pass with zero WCAG 2.1 AA violations (SC-011, FR-018)
- [ ] T039 Inspect the rendered `/login` page source and client state to confirm no new secret, credential, or session token is exposed beyond what already existed (FR-014, `plan.md` Complexity Tracking)
- [ ] T040 Execute `quickstart.md` Scenarios 1–11 end-to-end and record the observed outcome for each against its expected result (SC-001 … SC-013)
- [ ] T041 [P] Confirm `src/app/page.tsx` still renders correctly with no sign-in inputs and that its call-to-action behaves for both signed-out and signed-in visitors (FR-011, SC-007)
- [ ] T042 Review the final `git diff` for accidental files, debug code, unrelated changes, and formatting noise; confirm no runtime dependency entered `dependencies` and that `src/lib/demoAuth.ts` / `src/lib/oauthUtils.ts` are untouched (FR-009, research R6)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — **BLOCKS all user stories**
- **User Story 1 (Phase 3, P1)**: Starts after Foundational
- **User Story 2 (Phase 4, P2)**: Starts after Foundational; shares `SignInPage.tsx` with US1, so it is **sequenced after US1** rather than parallel
- **User Story 3 (Phase 5, P3)**: Starts after Foundational; shares `SignInPanel.tsx` with US1, so it is **sequenced after US1** rather than parallel
- **Polish (Phase 6)**: Depends on all desired stories being complete

### Critical path

```text
T001 → T003 → T004 → T005 → (T008 → T009 → T010 → T011) → T015 → T020 → T025 → T026 → T030 → T031 → T038 → T040
```

Note that T012/T013/T014 sit off the critical path and can be done any time after Phase 2 starts.

### Within each user story

- Tests (T016, T017, T024, T029) are written first and MUST fail before the implementation tasks in that story
- Structure before styling: composition (T020) precedes the reflow (T025) and the state polish (T030)
- Each story's checkpoint is validated before moving to the next priority

### Shared-file constraints (why some tasks cannot be parallel)

| File | Tasks that touch it | Consequence |
|---|---|---|
| `src/components/auth/SignInPanel.tsx` | T008, T018, T019, T021, T030, T031, T032, T033 | Sequential — US3 cannot be parallelized with US1 |
| `src/components/auth/SignInPage.tsx` | T009, T020, T025, T026, T027, T035 | Sequential — US2 cannot be parallelized with US1 |
| `src/components/auth/SignInPanel.test.tsx` | T016, T029 | Sequential |
| `src/app/page.tsx` | T015 | Isolated after T008 extracts the panel |
| `src/locales/en.ts` / `src/locales/vi.ts` | T006 / T007 | Parallel with each other (different files) |

### Parallel opportunities (genuine only)

- **Phase 1**: T001 and T002 are independent (both touch `package.json`, so edit in one pass); T003 depends on both; T004 depends on T003.
- **Phase 2**: T005, T006, T007 are mutually parallel — different files, no shared state. T012, T013, T014 are mutually parallel — three different files, each a one-line redirect change.
- **Phase 3**: T016 and T017 are parallel (two different new test files). T018, T019, and T021 all edit `SignInPanel.tsx` and must be done in sequence; T020 (`SignInPage.tsx`) and T022 (`tailwind.css`) are different files.
- **Phase 6**: T034, T035, T041 are parallel — read-only verification or a file already owned by another task.

**Not parallel despite appearing so**: US2 and US3 read as separate stories but both descend from US1's files, so a single developer must sequence them. A two-developer split would be: Developer A takes Phase 2 → US1 → US2 (`SignInPage.tsx`), Developer B takes US1's tests → US3 (`SignInPanel.tsx`) once T008 lands.

---

## Parallel Example: Phase 2 foundational batch

```bash
# Launch the three independent foundational edits together:
Task: "Revive src/components/ThemeProvider.tsx to apply light/dark explicitly (T005)"
Task: "Add page framing copy keys to src/locales/en.ts (T006)"
Task: "Add matching keys to src/locales/vi.ts (T007)"

# Then launch the three redirect retargets together once T008–T011 land:
Task: "Retarget unauthenticated guard in src/app/query-input/page.tsx to /login (T012)"
Task: "Retarget session-expiry redirect in src/components/AppLayout.tsx to /login (T013)"
Task: "Retarget sign-out redirect in src/components/Sidebar.tsx to /login (T014)"
```

## Parallel Example: User Story 1 tests

```bash
# Write both US1 tests together, confirm they FAIL, then implement:
Task: "Component render test for SignInPanel in src/components/auth/SignInPanel.test.tsx (T016)"
Task: "Accessibility scan test in src/app/login/login-a11y.test.tsx (T017)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete **Phase 1: Setup** (dev-only test tooling + baseline).
2. Complete **Phase 2: Foundational** (route, extraction, theme, locale keys, redirect retargeting) — this is the true blocker.
3. Complete **Phase 3: User Story 1** (typography, spacing, two-column composition, contrast).
4. **STOP and VALIDATE**: run `quickstart.md` Scenarios 1, 3, 4, 10, 11 plus the two automated suites. US1 alone already delivers the user's core request — a professional, readable, accessible sign-in page on PC/laptop.
5. Deploy/demo if ready.

### Incremental Delivery

1. Setup + Foundational → foundation ready (`/login` exists, no dead ends).
2. + US1 → validate independently → **demo-able MVP** (the page looks professional).
3. + US2 → validate independently → the page holds up across every PC/laptop window width.
4. + US3 → validate independently → every interaction gives professional feedback.
5. + Phase 6 polish → full `quickstart.md` sweep and final diff review.

Each increment is additive and does not break the previous one.

### Scope guardrails during implementation

- Do **not** refactor `src/components/AppLayout.tsx`'s own theme effect onto the revived `ThemeProvider` in this feature — recorded as a deferred cleanup in `plan.md` because it would change how all eight authenticated pages resolve their theme.
- Do **not** modify `src/lib/demoAuth.ts` or `src/lib/oauthUtils.ts` (FR-009).
- Do **not** enable the `@tailwindcss/forms` plugin; it is installed but unused and would restyle inputs application-wide (research R4).
- Do **not** reword existing `auth*` locale values (spec Assumptions).

---

## Notes

- `[P]` tasks = different files, no dependencies on incomplete work
- `[Story]` labels map each task to a user story for traceability
- Verify tests fail before implementing — each story's tests precede its implementation tasks
- Commit after each task or logical group; never commit the two new dev-only tools together with an unrelated change
- Stop at any checkpoint to validate a story independently
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence