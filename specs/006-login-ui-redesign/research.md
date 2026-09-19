# Phase 0 Research: Professional & Responsive Sign-In Page UI

**Feature**: `006-login-ui-redesign` | **Date**: 2026-09-19

All five `[NEEDS CLARIFICATION]` items were resolved during the `/speckit-clarify` session, so this document records the design decisions that follow from those answers plus the constraints discovered while inspecting the codebase. Each decision states what was chosen, why, and what was rejected.

## R1: Routing and component composition for the sign-in page

**Decision**: Add a real route at `src/app/login/`, split into a thin server-component route shell plus client feature components:

- `src/app/login/page.tsx` — Server Component; exports route `metadata` and renders the client feature component. No hooks, no state.
- `src/components/auth/SignInPage.tsx` — Client Component (`'use client'`); owns the auth gate, the two-column page composition, and the brand-introduction column.
- `src/components/auth/SignInPanel.tsx` — Client Component; owns the sign-in/register form, tabs, password visibility toggle, social buttons, notice, and error alert.

**Rationale**: App Router best practice keeps client boundaries small, and the sign-in surface is fully interactive — so a Server Component *page* shell plus a client *feature* component is the correct split. It also preserves a route-specific document title, which a `'use client'` page cannot provide because client pages cannot export `metadata`. The three-file split matches the repository's existing convention (`src/app/**` for routes, `src/components/**` for reusable UI). All three files sit on the same feature axis, so no new architectural layer is introduced.

**Alternatives considered**:
- *Mark `page.tsx` itself `'use client'`* — fewer files, but forfeits a route-specific title and puts the page shell in the client bundle for no benefit.
- *Keep the form inline in `src/app/page.tsx` and only restyle it* — rejected: clarification Q1 chose a dedicated page, and FR-011 forbids an embedded sign-in form on the home page.
- *A modal/dialog on the home page* — rejected during clarification Q1 (focus-trap and open/close state complexity, and no deep link).

## R2: Applying the theme on the public shell (light/dark)

**Decision**: Revive and use the existing but currently dead `src/components/ThemeProvider.tsx` to apply the theme on the public pages this feature touches (the new `/login` shell and the home page). Extend it so it applies **both** classes explicitly — add `light` when the setting is light, and add `dark` otherwise — matching what `src/components/AppLayout.tsx` already does. Leave `AppLayout`'s own inline theme effect untouched.

**Rationale**: Three facts discovered by inspection drive this:
1. `ThemeProvider.tsx` is **never imported anywhere** — it is dead code, while `AppLayout.tsx` (which wraps only post-login pages) contains a duplicate of the same logic.
2. The home page (`src/app/page.tsx`) uses neither, so today **the light theme is never applied on the home page**; it always renders with the dark `:root` tokens.
3. The project uses Tailwind's `darkMode: 'class'` and contains roughly **60 `dark:` variant usages**. Default tokens live on `:root` (dark values) with `.light` overriding them, so `dark:` utilities only activate when the `dark` class is present. `ThemeProvider` as written only *removes* `light`, so reusing it unchanged on a surface that uses `dark:` utilities would leave those styles silently inactive. Adding the `dark` class explicitly fixes that.

This is required by FR-008/SC-010, which demand verifiable AA contrast "in every theme the app supports": without applying the theme on `/login`, the light-theme contrast claim could not be satisfied or verified there at all.

**Alternatives considered**:
- *Duplicate the theme effect inside the new `/login` feature component* — rejected: reinvents an abstraction the repo already has and adds a third copy of the same logic.
- *Refactor `AppLayout` to consume `ThemeProvider` too* — rejected for now: it would change how all eight authenticated pages resolve their theme, an unrelated behavioural risk. Recorded as a deferred cleanup in `plan.md`.
- *Move theme application into `src/app/layout.tsx`* — rejected: the root layout is a Server Component while the theme comes from a client store, so this would force the tree client-side or need a pre-hydration script; both are larger changes than the feature needs.
## R3: Breakpoint threshold and layout mechanics

**Decision**: Implement the responsive layout with CSS only, using the project's existing Tailwind breakpoints, with the collapse point at `lg` (**1024px**):

- At `≥ 1024px`: two columns — brand introduction left (flexible width), sign-in form right (bounded, roughly 28–32rem).
- Below `1024px`: a single centered column containing only the sign-in form; the brand-introduction column is removed from the layout entirely.
- The form column keeps a bounded max width at every size so it never stretches uncomfortably wide on large monitors.
- Hide the brand column with a responsive display utility (not `invisible`/`opacity-0`) so it also leaves the accessibility tree and cannot be reached by keyboard — required by FR-015/FR-016 and SC-002.

**Rationale**: 1024px is exactly the lower bound of the spec's declared in-scope range ("desktop/laptop viewports only, approximately 1024px width and above"), so the collapse point coincides with the scope boundary: every in-scope width receives the full two-column design, and out-of-scope narrow widths still degrade safely to a form-only column. CSS-only reflow (no JavaScript resize listener) keeps the change cheap and satisfies the plan's goal that resizing triggers no re-render.

**Alternatives considered**:
- *Reuse the current `xl` (1280px) breakpoint* — rejected: it would leave 1024–1279px windows and split-screen usage in the reduced layout even though they are explicitly in scope, wasting the widest part of the range.
- *Render the brand column but hide it visually* — rejected: it stays in the tab order and accessibility tree, violating FR-015/FR-016 and SC-002.
- *Stack the brand column above the form when narrow* — rejected during clarification Q2: it pushes the form below the fold, so the form would no longer be the first thing visible.

## R4: Typography and spacing scale

**Decision**: Replace the current micro-type scale on the sign-in surface with a readable one, reusing the design system's tokens and radius scale:

- Body/label/input text: **`text-sm` (14px)** instead of the current `text-[10px]`/`text-[11px]`/`text-xs` mix. This clears SC-003's 12px floor with headroom.
- Tab labels and social-button labels: at least `text-sm`. The decorative "or continue with" divider may remain smaller, but no informative text falls below the 12px floor.
- Headings: explicit hierarchy — the panel heading one step up from body, and a larger page-level framing title above it.
- Control heights: raise today's `h-8`/`h-9` controls to at least `h-10`–`h-11`, giving pointer targets and focus rings room.
- Spacing: one consistent vertical rhythm (e.g. `space-y-4`/`gap-4`) replacing the current `space-y-3` with mixed one-off margins.
- Preserve the app's sharp-cornered, bordered aesthetic rather than introducing rounded pill styling, so the page still reads as the same product.

**Rationale**: A 14px body scale with ~10px-labeled inputs is what makes the surface read as professional rather than cramped, which is the core of the user's request. Raising control heights improves focus-indicator visibility (FR-005) and reduces mis-clicks at the same time. Reusing the existing token/radius vocabulary satisfies SC-005 (no ad-hoc one-off styles).

**Alternatives considered**:
- *Keep 12px and only fix spacing* — rejected: SC-003 sets 12px as a floor; sitting exactly on it leaves no headroom and does not address the cramped impression the request called out.
- *Add a new typographic scale to the Tailwind config* — rejected: a repo-wide config change ripples into every page (unrelated blast radius); local utilities suffice.
## R5: Achieving verifiable WCAG 2.1 AA contrast with existing tokens

**Decision**: Meet AA contrast by *choosing the right existing token pairings* and, only where no pairing can clear the threshold, adjust the affected token value in `src/styles/tailwind.css` for both `:root` and `.light`. Concretely:

- Body/label text sits on the opaque `card`/`background` token, using `card-foreground`/`foreground`, or `muted-foreground` only where its existing value already clears 4.5:1.
- Error text uses the `danger` token on the plain card background rather than `danger` over a `danger/5` wash (which lowers effective contrast); the tinted block keeps its `danger`-colored left border as the visual signal.
- Notice/warning text follows the same rule: token color on an opaque background, with the tint used for the border/background wash only.
- Focus indicators use the `ring`/`primary` token at ≥ 3:1 against the adjacent background, rendered as a visible ring on every interactive element.
- Where today's translucent washes (`bg-muted/30`, `bg-danger/5`, `bg-warning/5`) cannot reach the threshold, move the *text* off the wash rather than altering the palette.

**Rationale**: The spec's Assumptions make the existing token set the source of truth and forbid new one-off colors, so the default answer must be "pick better pairings", not "invent colors". Restricting any token edit to cases a pairing cannot solve keeps the change tight and reviewable, and editing both `:root` and `.light` keeps the themes consistent (FR-008).

**Implementation note**: the concrete ratio for each pairing must be measured (computed style + contrast calculation) rather than assumed; the automated scan in R8 is the gate. Any token value change affects the whole application, so it must only ever *raise* contrast and never lower it for other pages.

**Alternatives considered**:
- *Add a sign-in-page-specific color palette* — rejected: violates the Assumptions and SC-005, and would visually detach the page from the product.
- *Keep translucent tints behind text and accept a lower ratio* — rejected: fails FR-008/SC-010 and is exactly the unverifiable "looks fine to me" outcome the clarification was meant to prevent.
## R6: Reusing the form's state model and state coverage

**Decision**: Move the existing form behaviour into `SignInPanel` with unchanged semantics, preserving the existing state vocabulary and flows: the `AuthUIState` union (`idle` | `authenticating` | `error`) from `src/lib/demoAuth.ts`, the login/register mode switch, the temporary admin credentials check, the OAuth popup start/finish/cancel handling, the existing `role="alert"` error region, and the localized temporary-credentials notice. Only presentation changes; the restyle adds the visual states enumerated in FR-006 (hover, focus, disabled, loading, error, success).

**Rationale**: FR-009 forbids altering authentication logic, and the existing implementation already models exactly the states this feature must present. Reusing `AuthUIState` and the existing handlers means the restyle cannot silently change behaviour, and it keeps the automated behaviour tests in R8 exercising the real production paths instead of a parallel implementation. The existing `role="alert"` region is kept because it already announces errors to assistive technology, so no redundant ARIA is added.

**Alternatives considered**:
- *Rewrite the form as a new component with its own state machine* — rejected: highest-risk option, duplicates auth logic, and directly contradicts FR-009.
- *Add a form library for validation* — rejected: adds a runtime dependency (FR-017) for a two-field form and replaces working validation.
- *Unify UI state enums across the app* — rejected: a cross-cutting refactor outside scope.

## R7: Auth gate, already-authenticated redirect, and retargeting signed-out redirects

**Decision**:
1. `SignInPage` uses the same client-side gate pattern already established in `src/app/query-input/page.tsx`: on mount, evaluate `isDemoAuthenticated()`; if authenticated, call `beginNavigation('/query-input')` and `router.replace('/query-input')`; otherwise mark the page authorized. While unresolved it renders `null`, mirroring that file's `if (!isAuthorized) return null;`.
2. Retarget the three existing signed-out redirects from `/` to `/login`: `src/app/query-input/page.tsx` (unauthenticated guard), `src/components/AppLayout.tsx` (expired session), and `src/components/Sidebar.tsx` (explicit sign-out). Each keeps its existing toast/message behaviour.
3. The home page's primary call-to-action goes to `/login` when signed out, and still goes straight to `/query-input` when already signed in — preserving today's behaviour for authenticated visitors.

**Rationale**: Rendering `null` while the gate resolves prevents a flash of the sign-in form for an already-authenticated visitor (FR-012/SC-008) without inventing a new loading UI, and it reuses an established in-repo pattern. Retargeting is mandatory rather than optional: FR-011 removes the sign-in form from the home page, so leaving these three redirects pointed at `/` would create dead ends with no way to sign in (FR-019/SC-013). Keeping the authenticated fast-path on the home page avoids a pointless extra hop.

**Alternatives considered**:
- *Server-side redirect via middleware* — rejected: the session lives in browser-only `localStorage`, so middleware cannot read it, and it would introduce a server-side auth concept the app does not have.
- *Render the form immediately and redirect after mount* — rejected: produces a visible flash of a form the visitor must not use, failing SC-008.
- *Show a spinner while resolving* — rejected: the gate resolves synchronously on mount, so a loading state would itself flash.
## R8: Test tooling and the automated/manual split

**Decision**: Adopt the clarification-Q4/Q5 split literally, using the repo's existing Vitest + jsdom runner plus **two dev-only tools**:

- A React component-rendering test library (with its DOM matcher companion) to mount `SignInPanel`/`SignInPage` and drive user interactions.
- An automated accessibility scanner that runs inside jsdom, for the WCAG 2.1 AA audit of the rendered sign-in surface.

Automated coverage (SC-011): tab order through the form's controls, focus visibility/`role="alert"` presence for errors, loading/disabled states during `authenticating`, the temporary-credentials notice, and the already-authenticated redirect to `/query-input`.
Manual-only coverage (SC-012): layout composition, spacing, colour, and the brand-column hide/show at the breakpoint — plus the light/dark visual comparison — because jsdom does not implement CSS cascade/`@media`, so an automated layout assertion would be meaningless.

**Rationale**: This matches clarification Q4's split, which exists precisely because jsdom cannot evaluate real CSS. It also avoids the classic failure mode of writing assertions about computed spacing that silently pass in jsdom while the browser renders differently. Both new tools are dev-dependencies approved in Q5, satisfy FR-017's "test tooling only" boundary, and run through the existing `npm test` command, so no new CI concept is introduced.

**Alternatives considered**:
- *Assert layout/breakpoints in jsdom* — rejected: jsdom does not compute layout, so such tests would be false confidence.
- *Add a real-browser E2E runner and screenshot diffing (clarification option D for Q4)* — explicitly rejected by the user in Q4: too much new infrastructure for a single-screen restyle.
- *Rely only on manual checks (clarification option B)* — explicitly rejected by the user in Q4.
- *Add the a11y scanner as a runtime dependency* — rejected: violates FR-017 and would ship unused code to users.

## R9: Accessibility contract mechanics for the sign-in surface

**Decision**: Meet FR-005/FR-008 and SC-002/SC-010/SC-011 with concrete markup decisions:

- The form region is a landmark-wrapped, labelled section; the page exposes exactly one `<h1>` (the page-level framing title) with the panel heading as `<h2>`, preserving document outline order.
- Every field keeps a real `<label>` association (the current pattern wraps the label text and input in one `<label>`, which is already valid) with a visible label — no placeholder-only labelling.
- Tabs keep `role="tablist"`/`role="tab"` with `aria-selected`; because the two tabs control one shared region rather than separate tabpanels, the existing structure is preserved and the tab labels carry the accessible names.
- The password visibility toggle keeps its existing `aria-label` describing the action; the social buttons keep text labels next to their icons (no icon-only buttons).
- The error region keeps `role="alert"`; the temporary-credentials notice is plain readable text so it is announced by ordinary reading order rather than as an alert.
- Focus: a visible focus ring using the `ring`/`primary` token on all interactive elements; tab order follows DOM order with the form first (FR-016).
- The brand-introduction column contains no interactive controls at all (FR-015), so its removal at narrow widths cannot change the tab sequence.

**Rationale**: These choices satisfy the AA bar with the least new markup, and they deliberately avoid adding ARIA to compensate for wrong semantics (the reason the tabs were not rebuilt as a full WAI-ARIA tabpanel widget — they switch one shared form region, and changing that would alter behaviour FR-009 protects). Keeping text labels on icons and a real `<label>` per field is also what makes the form human-readable, which is the point of the request.

**Alternatives considered**:
- *Rebuild the tabs as a full ARIA tabpanel widget with arrow-key navigation* — rejected: it changes interaction behaviour that FR-003/FR-009 require to be preserved, and the current pattern is already operable.
- *Placeholder-only inputs with `aria-label`* — rejected: placeholders vanish on input and are a known accessibility weakness; visible labels are required for a professional form.
- *Icon-only social buttons* — rejected: would require extra ARIA to recover an accessible name that a visible label provides for free.

## R10: Localized copy additions

**Decision**: Add a small set of new keys for page-level framing copy (page title, short supporting statement, and any new helper text) to **both** `src/locales/en.ts` and `src/locales/vi.ts`, keeping the existing `auth*` key naming convention and keeping both files key-for-key identical. No existing `auth*` value is reworded, so all current labels, validation messages, toasts, and the temporary-credentials notice stay byte-identical (spec Assumptions).

**Rationale**: `src/lib/i18n.ts` types the schema from `en`, so adding a key without the matching `vi` entry is a **type error** under `strict` — the parity requirement is therefore enforced by the type checker, not just by convention. Restricting additions to framing copy honours the Assumptions' "no changes to authentication-related copy that would alter meaning" and keeps the diff reviewable.

**Alternatives considered**:
- *Reuse an existing key for the page title* — rejected: existing keys are written as panel subtitles, so reusing them would read awkwardly in both locales.
- *Change existing labels to read more professionally* — rejected by the spec Assumptions (copy is frozen); noted as a possible follow-up feature instead.
## Summary of resolved decisions

| ID | Topic | Decision | Spec requirement served |
|---|---|---|---|
| R1 | Route + component composition | Server route shell at `src/app/login/page.tsx` + client `SignInPage` + client `SignInPanel` | FR-011, FR-013, US1 |
| R2 | Theme on the public shell | Revive dead `ThemeProvider`, apply `light`/`dark` explicitly, wrap the public pages | FR-008, SC-010 |
| R3 | Breakpoint + layout mechanics | CSS-only; collapse at `lg` (1024px); brand column removed (not just hidden) | FR-004, FR-015, FR-016, SC-004 |
| R4 | Typography + spacing | 14px body scale, explicit heading hierarchy, ≥ `h-10` controls, one spacing rhythm | FR-001, FR-002, FR-005, SC-003, SC-005 |
| R5 | AA contrast | Prefer better existing token pairings; edit a token only if no pairing clears the bar, in both themes | FR-008, SC-010, SC-011 |
| R6 | Form state model | Reuse `AuthUIState` and existing handlers unchanged; add visual states only | FR-003, FR-006, FR-009 |
| R7 | Auth gate + redirect retargeting | `null`-while-resolving gate; retarget 3 signed-out redirects `/` → `/login` | FR-012, FR-019, SC-008, SC-013 |
| R8 | Test tooling + split | Existing Vitest/jsdom + 2 dev-only tools; automated = behaviour/a11y, manual = layout/spacing/colour/breakpoint | FR-017, SC-011, SC-012 |
| R9 | Accessibility mechanics | Real `<label>`s, one `<h1>`, preserved tab semantics, `role="alert"`, visible focus ring | FR-005, FR-008, FR-015, FR-016, SC-002 |
| R10 | Localized copy | Add framing-copy keys to both locales; freeze existing `auth*` values | FR-007, spec Assumptions |

**Open unknowns after Phase 0**: none. No `NEEDS CLARIFICATION` markers remain in either the spec or this plan.

**Assumptions carried into implementation** (recorded so they can be challenged):
1. The placeholder test-tool package names will be resolved to concrete, currently-maintained packages at implementation time; the constraint is that they are dev-dependencies compatible with vitest 2.x and jsdom 30.
2. The exact numeric contrast ratio of each token pairing is measured during implementation rather than assumed here.
3. No design tooling or mockups exist for this feature; the visual result is judged against the spec's Success Criteria rather than a fixed design comp.