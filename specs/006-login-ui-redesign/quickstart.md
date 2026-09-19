# Quickstart Validation Guide: Professional & Responsive Sign-In Page UI

**Feature**: `006-login-ui-redesign` | **Date**: 2026-09-19

This guide proves the feature works end-to-end: prerequisites, commands to run, and the expected outcome for each scenario. Contracts are defined in [`contracts/sign-in-page.md`](./contracts/sign-in-page.md) and state models in [`data-model.md`](./data-model.md). Implementation details deliberately live in `tasks.md`, not here.

## Prerequisites

- Node.js and npm available (the project ships a committed `package-lock.json`).
- Dependencies installed (`npm install`).
- A browser with DevTools for the responsive checks (Chrome/Edge/Firefox).

## Commands

| Purpose | Command |
|---|---|
| Run the app | `npm run dev` (serves on port **4028**) |
| Open the sign-in page | `http://localhost:4028/login` |
| Automated behaviour + accessibility checks | `npm test` |
| Type check (also enforces locale-key parity — R10) | `npm run type-check` |
| Lint | `npm run lint` |

The three sign-in paths need no OAuth credentials: with `NEXT_PUBLIC_GOOGLE_CLIENT_ID` / `NEXT_PUBLIC_MICROSOFT_CLIENT_ID` unset, the Google/Microsoft buttons route through the existing mock popup at `/oauth/mock-popup.html`, which is what makes these scenarios runnable locally.

## Scenario 1 — Professional rendering at both named viewports (SC-001, SC-003, SC-005)

1. Run `npm run dev` and open `http://localhost:4028/login`.
2. Set the viewport to **1920×1080** (DevTools device toolbar).
   - **Expected (C2)**: two columns — brand introduction left, sign-in form right, both fully readable. No clipped text, no overlap, no horizontal scrollbar.
3. Set the viewport to **1366×768**.
   - **Expected (C2)**: the same two-column composition still holds; the form and all controls stay fully visible without horizontal scrolling or clipping.
4. Inspect the text sizes.
   - **Expected (SC-003)**: no primary label, tab, button, or input text renders below a 12px equivalent (target 14px), replacing today's 8–11px text.
5. Compare against the rest of the app.
   - **Expected (SC-005)**: colours, borders, and radii read as the same product — no one-off palette and no pill styling.

## Scenario 2 — Responsive collapse across PC/laptop widths (SC-004, FR-015, FR-016)

1. Open `http://localhost:4028/login` at a wide desktop width (e.g. 1600px).
2. Drag the window narrower, watching continuously down to about 1024px.
   - **Expected**: no visual breakage at any intermediate width; the layout stays two-column throughout.
3. Cross the 1024px boundary (e.g. 1000px).
   - **Expected (C2)**: the brand column disappears entirely and the form becomes a single centered column.
4. Confirm the brand column is truly gone, not merely invisible.
   - **Expected (FR-015)**: it is absent from the accessibility tree (DevTools accessibility pane) and unreachable by Tab.
5. Press Tab from the top of the page at both sizes.
   - **Expected (FR-016)**: the sign-in form is first in the tab order at every width; hiding the brand column does not change the sequence.
6. Check for a horizontal scrollbar at 1920, 1440, 1280, 1100, and 1024px.
   - **Expected**: none at any width.

## Scenario 3 — Keyboard and focus (SC-002, FR-005)

1. On `/login`, press Tab repeatedly through the whole page.
   - **Expected**: every control in turn — mode tabs, username field, password field, password visibility toggle, submit, register (when that mode is active), Google, Microsoft — receives a clearly visible focus ring in a logical order, with focus never escaping to browser chrome (no trap).
2. Press Enter/Space on the mode tabs and the password toggle.
   - **Expected**: both respond to keyboard activation.
3. Switch to register mode and repeat the tab walk.
   - **Expected**: the register fields join the sequence in reading order.

## Scenario 4 — Temporary admin sign-in still works (SC-006, FR-003)

1. On `/login`, enter `admin` / `1234@` and submit.
   - **Expected**: the existing success toast appears and the app navigates to `/query-input`.
2. Sign out (sidebar sign-out), then submit invalid credentials (`admin` / `wrong`).
   - **Expected**: the existing invalid-credentials message appears as an error; the page stays on `/login` with no layout breakage (C3).

## Scenario 5 — Social sign-in paths and their states (SC-006, FR-006)

1. On `/login`, activate **Google**.
   - **Expected**: the mock popup opens; both social buttons become disabled and the activated one shows a loading affordance (C3).
2. Complete the mock consent.
   - **Expected**: the existing success toast names the provider and the user; the app navigates to `/query-input`.
3. Sign out, activate **Microsoft**, and complete the mock consent.
   - **Expected**: same outcome, provider-specific.
4. Sign out, activate **Google**, and close the popup without consenting.
   - **Expected**: both buttons re-enable; the cancellation message appears in the `role="alert"` error region and as a toast; layout does not shift enough to hide any control (C3, spec edge case).
5. Repeat step 2 while resizing the browser window mid-flow.
   - **Expected**: the layout keeps reflowing and the error/loading state is not lost (spec edge case).

## Scenario 6 — No dead ends for signed-out visitors (SC-013, FR-019)

1. With no session, open a protected route directly, e.g. `http://localhost:4028/query-input`.
   - **Expected**: you land on `/login` with a working sign-in form — not the marketing home page.
2. Sign in, then simulate expiry (clear the stored session via DevTools, or backdate the stored `expiry`), then navigate.
   - **Expected**: the existing "session expired" notice appears and you land on `/login`, where you can sign in again.
3. Sign in, then use sidebar sign-out.
   - **Expected**: the existing sign-out success toast appears and you land on `/login`, where you can sign in again.

## Scenario 7 — Home page no longer hosts a sign-in form (SC-007, FR-011)

1. Open `http://localhost:4028/` with no session.
2. Search the page for any username/password input.
   - **Expected**: none exist.
3. Activate the primary call-to-action.
   - **Expected**: you are taken to `/login` (not scrolled to an in-page panel), with the existing "please sign in" info toast.
4. Sign in, return to `/`, and activate the call-to-action again.
   - **Expected**: you go straight to `/query-input` with no extra hop through `/login`.

## Scenario 8 — Already-authenticated visitor never sees the form (SC-008, FR-012)

1. Sign in successfully.
2. Navigate directly to `http://localhost:4028/login`.
   - **Expected**: you are taken to `/query-input`; the sign-in form is never shown, not even briefly.
3. Repeat with a hard reload on `/login` while still signed in.
   - **Expected**: same outcome.

## Scenario 9 — Deep link with a fresh browser (FR-013, SC-009)

1. Open a fresh private window (no stored session) and go straight to `http://localhost:4028/login`.
   - **Expected**: the sign-in form renders and is immediately usable without visiting `/` first, at a comparable speed to the current home page's first meaningful render.

## Scenario 10 — Accessibility audit and contrast (SC-010, SC-011)

1. Run `npm test`.
   - **Expected**: the behaviour tests and the automated accessibility scan pass, with zero WCAG 2.1 AA violations on the sign-in surface.
2. Confirm contrast in the **dark** theme manually.
   - **Expected**: body/label text ≥ 4.5:1 against its background; control boundaries, states, and focus rings ≥ 3:1.
3. Toggle to the **light** theme (the sidebar theme toggle on a protected page sets the stored preference), then reload `/login` and repeat step 2.
   - **Expected**: the same thresholds hold, and the page visibly *is* in light theme — this is the specific regression research R2 addresses, since today the light theme is never applied on the public shell.

## Scenario 11 — Both locales (FR-007, C6)

1. Switch the language to Vietnamese (sidebar toggle on a protected page), then open `/login`.
   - **Expected**: every string is Vietnamese; nothing is clipped, overlapped, or truncated at 1920×1080 or 1366×768.
2. Run `npm run type-check`.
   - **Expected**: passes, proving the new keys exist in both locale files (R10).

## Automated vs manual split (SC-011 vs SC-012)

| Verified automatically (`npm test`) | Verified manually (this guide) |
|---|---|
| Tab order, focus reachability, no-trap | Layout composition and spacing (Scenarios 1–2) |
| Loading/disabled states while authenticating | Colour and contrast perception (Scenario 10) |
| Error region presence / `role="alert"` | Breakpoint hide/show behaviour (Scenario 2) |
| Already-authenticated redirect | Resize-mid-flow robustness (Scenario 5.5) |
| Accessibility scan: zero AA violations | Vietnamese text overflow (Scenario 11) |

Layout, spacing, colour, and breakpoint behaviour are **manual by design** (SC-012): jsdom neither computes layout nor evaluates media queries, so an automated assertion there would give false confidence (research R8).

## Definition of done

- All eleven scenarios behave as described.
- `npm test`, `npm run type-check`, and `npm run lint` all pass; `npm run build` succeeds.
- All 19 functional requirements and 13 success criteria in [`spec.md`](./spec.md) are satisfied or explicitly accounted for.