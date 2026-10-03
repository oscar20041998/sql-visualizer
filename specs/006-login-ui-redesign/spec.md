# Feature Specification: Professional & Responsive Sign-In Page UI

**Feature Branch**: `006-login-ui-redesign`

**Created**: 2026-09-19

**Status**: Draft

**Input**: User description: "I want to improve UI at login page, make it strong professional and responsive with devices as PC and laptop"

## Clarifications

### Session 2026-09-19

- Q: Màn hình đăng nhập nên được trình bày theo hình thức nào sau khi làm lại giao diện? → A: Option B — tạo trang `/login` riêng; trang chủ chỉ còn nội dung marketing và nút "Get Started" điều hướng sang `/login`. Thuật ngữ chuẩn hoá: dùng "sign-in page" thay cho "workspace-access panel".
- Q: Trên màn hình PC/laptop rộng, trang đăng nhập mới nên bố trí nội dung như thế nào? → A: Option A — bố cục hai cột: khối giới thiệu thương hiệu bên trái, form đăng nhập bên phải; dưới ngưỡng laptop nhỏ thì khối giới thiệu ẩn hẳn, chỉ còn form trên một cột.
- Q: Trang đăng nhập mới cần đạt chuẩn trợ năng (accessibility) nào? → A: Option A — WCAG 2.1 mức AA: văn bản thường tương phản ≥ 4.5:1, thành phần giao diện/viền ≥ 3:1, thao tác hoàn toàn bằng bàn phím với chỉ báo focus rõ ràng.
- Q: Phần kiểm chứng chất lượng của trang đăng nhập mới nên được thực hiện như thế nào? → A: Option C — kiểm thử tự động cho hành vi (thứ tự tab, focus, trạng thái loading/error/disabled, chuyển hướng khi đã đăng nhập, quét lỗi trợ năng); kiểm thử thủ công trên trình duyệt thật cho bố cục, khoảng cách, màu sắc và hành vi ẩn/hiện cột theo breakpoint.
- Q: Có được phép bổ sung thư viện test (chỉ dùng khi chạy test, không phát hành cho người dùng) để thực hiện kiểm thử tự động cho trang đăng nhập không? → A: Option D — cho phép thêm cả thư viện render component và công cụ quét trợ năng tự động, tất cả đều là dev-dependency; ràng buộc "không thêm dependency" từ đây chỉ áp dụng cho dependency runtime/sản phẩm.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Confident first impression on a laptop/PC screen (Priority: P1)

A visitor opens the dedicated sign-in page (`/login`) on a laptop or desktop monitor and sees a sign-in surface (sign-in/sign-up) that looks polished, on-brand, and trustworthy — with clear visual hierarchy, properly aligned inputs, readable typography, and no cramped or clipped elements — so they feel confident entering their credentials or using a social login button.

**Why this priority**: The sign-in page is the very first interactive surface every visitor encounters; a cramped or unpolished look (tiny 8-11px text, inconsistent spacing, low-contrast borders) undermines trust in the product before any feature is ever seen. This is the highest-value, most visible improvement.

**Independent Test**: Can be fully tested by loading the sign-in page (`/login`) on a standard 1366×768 and 1920×1080 laptop/desktop viewport and visually/structurally confirming the sign-in surface has readable text sizes, consistent spacing, clear focus states, and no layout overflow or clipping — independent of any other page.

**Acceptance Scenarios**:

1. **Given** a visitor on a 1920×1080 desktop viewport, **When** the sign-in page loads, **Then** the sign-in surface renders with legible typography (no text smaller than the platform's minimum readable size), clear spacing between form fields, and visibly distinct primary/secondary actions.
2. **Given** a visitor on a 1366×768 laptop viewport (a common smaller laptop resolution), **When** the sign-in page loads, **Then** the sign-in surface and its form fields remain fully visible without horizontal scrolling, clipped text, or overlapping elements.
3. **Given** a visitor viewing the sign-in page, **When** they tab through the form using the keyboard, **Then** each interactive element (tabs, inputs, show/hide password, submit button, social buttons) shows a clearly visible focus indicator in a logical order.
4. **Given** a visitor on the marketing home page, **When** they activate the primary call-to-action, **Then** they are taken to the dedicated sign-in page rather than being scrolled to an in-page sign-in block.

---

### User Story 2 - Smooth experience across PC/laptop window sizes (Priority: P2)

A visitor resizes their browser window (e.g., snapping it to half-screen, or using a smaller laptop display) while on the sign-in page, and the page adapts gracefully — the wide-viewport two-column arrangement (brand introduction on the left, sign-in form on the right) collapses into a single centered column containing only the form, without breaking, overlapping, or requiring horizontal scrolling.

**Why this priority**: The sign-in block is currently pinned as a fixed-width sidebar only above a wide breakpoint; if the new page kept that behaviour it would crowd or clip content on narrower laptop windows or in split-screen browser usage. Making the two-column arrangement degrade deliberately ensures the professional look holds across the realistic range of PC/laptop window widths, not just full-width monitors.

**Independent Test**: Can be fully tested by progressively resizing the browser viewport on the sign-in page from a wide desktop width down to a narrower laptop landscape width and confirming the brand column disappears and the form remains centered and fully usable with no visual breakage.

**Acceptance Scenarios**:

1. **Given** a browser window at a wide desktop width, **When** the sign-in page loads, **Then** the brand introduction appears in a left column and the sign-in form in a right column, both fully readable.
2. **Given** a browser window narrowed below the wide-desktop threshold, **When** the sign-in page loads or the window is resized, **Then** the brand introduction column disappears entirely and the sign-in form is presented alone as a single centered column.
3. **Given** any supported PC/laptop window width, **When** the visitor views the sign-in page, **Then** no horizontal scrollbar appears and no interactive element overlaps another.
4. **Given** a visitor on the sign-in page at any supported PC/laptop width, **When** they view the page, **Then** the sign-in form remains the first thing visible without scrolling, and the layout stays vertically scrollable if its content exceeds the viewport height.

---

### User Story 3 - Clear, professional form feedback and states (Priority: P3)

A visitor interacting with the sign-in/register form and social sign-in buttons on the sign-in page sees clear, professional visual feedback for every state — hover, focus, disabled/loading (during social sign-in), error (invalid credentials, cancelled OAuth), and success — so they always understand what is happening.

**Why this priority**: Builds on the visual foundation from Stories 1-2; refining interactive states is valuable but depends on the core layout/typography already being solid, and is lower risk if deferred slightly.

**Independent Test**: Can be fully tested by exercising each control on the sign-in page (hover a button, submit invalid credentials, click a social button to trigger the loading/authenticating state, trigger an OAuth cancellation) and confirming each has a visually distinct, professional-looking state without needing the other stories' changes.

**Acceptance Scenarios**:

1. **Given** a visitor submits invalid admin credentials, **When** the error is shown, **Then** the error message is visually distinct (color, icon, spacing) and does not shift or break the surrounding layout.
2. **Given** a visitor clicks a social sign-in button, **When** the authentication is in progress, **Then** the button shows a clear loading/disabled state and the other social button is also disabled until the flow resolves.
3. **Given** a visitor hovers or focuses any interactive control on the sign-in page, **When** the pointer/focus lands on it, **Then** the control shows a smooth, consistent visual response (e.g., color/elevation change) matching the rest of the page's styling.

---

### Edge Cases

- What happens when the browser window is resized while the OAuth popup is open or an error message is currently displayed? The layout MUST continue to reflow without losing the visible error/loading state.
- How does the sign-in page render when localized text (English/Vietnamese) is longer or shorter than the placeholder copy, e.g., longer Vietnamese labels? Layout MUST NOT clip or overlap text in either supported language.
- How does the sign-in page behave at the narrow edge of "laptop" width (e.g., a laptop with the sidebar/devtools open, effectively narrowing content width)? The stacked single-column layout MUST remain usable and non-overlapping.
- What happens when the visitor has a browser/OS-level larger base font size (accessibility zoom)? Core actions (submit, tabs, social buttons) MUST remain reachable and non-overlapping.
- What happens when the visitor opens the sign-in page directly in a new tab with no prior session? The page MUST render the sign-in form correctly without depending on state carried over from the home page.
- What happens when the visitor is already signed in and manually navigates to the sign-in page URL? They MUST be redirected to the authenticated workspace rather than seeing a redundant sign-in form.
- What happens when a visitor activates the home page call-to-action and navigation is blocked or fails? The visitor MUST remain on a usable page and receive a clear signal rather than a blank or broken view.
- What happens when a signed-out visitor opens a protected workspace page directly by URL, when a session expires mid-use, or when a visitor signs out? Each of these MUST present the sign-in page rather than a page with no way to sign in.
- What happens to a visitor who has just started a protected flow and is bounced to the sign-in page? Any in-progress intent MUST NOT be lost in a way that leaves a blank or broken view.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The sign-in page MUST use a typography scale with a minimum readable body/label text size and a consistent heading hierarchy, replacing the current use of very small (8-11px) text for primary labels, inputs, and buttons.
- **FR-002**: The sign-in page MUST present consistent, professional spacing (padding, margins, gaps between fields) that avoids a cramped appearance on both wide desktop and narrower laptop window widths.
- **FR-003**: The system MUST preserve all existing functional behavior of the sign-in form unchanged, including: sign-in-mode/register-mode tab switching, the temporary admin/password sign-in, the Google/Microsoft social sign-in buttons and their loading/error/success states, the show/hide password toggle, and the temporary-credentials notice.
- **FR-004**: The system MUST reflow the sign-in page layout across at least two PC/laptop viewport ranges: a wide desktop range (two columns — a brand introduction on the left, the sign-in form on the right) and a narrower laptop range (a single centered column containing only the sign-in form, with the brand introduction hidden), with no horizontal scrolling or clipped/overlapping content in either range.
- **FR-005**: Every interactive element on the sign-in page (tabs, text inputs, password visibility toggle, submit buttons, social sign-in buttons) MUST be operable using the keyboard alone, MUST have a clearly visible focus indicator, and MUST be reachable in a logical tab order with no keyboard trap.
- **FR-006**: Every interactive element on the sign-in page MUST have distinguishable hover, focus, disabled, and (where applicable) loading/error/success visual states, using the existing design system's color tokens and spacing conventions.
- **FR-007**: The redesigned sign-in page MUST render correctly in both supported locales (English and Vietnamese) without text clipping, overlap, or broken layout, accounting for differing text lengths.
- **FR-008**: The redesigned sign-in page MUST meet WCAG 2.1 level AA contrast requirements in every theme the app supports: normal body/label text MUST reach a contrast ratio of at least 4.5:1 against its background, and interactive component boundaries, states, and focus indicators MUST reach at least 3:1.
- **FR-009**: The system MUST NOT alter existing authentication logic, session persistence behavior, or provider integration behavior — this feature is scoped to visual presentation and layout only.
- **FR-010**: The redesigned sign-in page MUST present its primary action (sign in) as the visually dominant action, with secondary actions (register, social sign-in) clearly subordinate but still easily discoverable.
- **FR-011**: The home page MUST NOT contain an embedded sign-in form; its primary call-to-action MUST navigate the visitor to the dedicated sign-in page.
- **FR-012**: A visitor who is already authenticated and lands on the sign-in page MUST be taken to the authenticated workspace instead of being shown the sign-in form again.
- **FR-013**: The sign-in page MUST be reachable directly by URL (deep-linkable) without requiring the visitor to pass through the home page first.
- **FR-014**: The sign-in page MUST NOT expose application secrets, credentials, or session tokens in the rendered page source or client-visible state.
- **FR-015**: The brand introduction column MUST be auxiliary only — it MUST NOT contain any control required to sign in, and hiding it at narrower widths MUST NOT remove any sign-in functionality.
- **FR-016**: The sign-in form MUST be the first meaningful content in both reading order and keyboard tab order on every supported PC/laptop width, so that the responsive hiding of the brand introduction never pushes the form later in the sequence.
- **FR-017**: Any new dependency introduced to support this feature MUST be development/test-only tooling; no new runtime dependency may be added to the shipped application bundle for the redesign.
- **FR-018**: The sign-in page MUST remain free of any user-visible content that the automated accessibility scan flags as a WCAG 2.1 level AA violation, so that the acceptance check in SC-011 can be re-run after every change.
- **FR-019**: Every flow that currently returns a signed-out visitor to the marketing home page — unauthenticated access to a protected workspace page, an expired session, and explicit sign-out — MUST instead present the dedicated sign-in page, so that no signed-out visitor is left without a way to sign in.

### Key Entities

*(Not applicable — this feature is a visual/layout change only and does not introduce or modify data entities.)*

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On both a 1920×1080 desktop viewport and a 1366×768 laptop viewport, the sign-in page renders with zero clipped text, zero overlapping elements, and zero horizontal scrollbars.
- **SC-002**: 100% of interactive controls on the sign-in page (tabs, inputs, toggles, buttons) are operable with the keyboard alone and expose a visible focus state reachable purely via keyboard (Tab/Shift+Tab), with no keyboard trap.
- **SC-003**: Body and label text on the sign-in page is rendered at or above the platform's standard minimum readable size (no primary label or button text smaller than a 12px equivalent), compared to the current smallest sizes of 8-11px.
- **SC-004**: When the browser window width is reduced from a wide desktop width down to a narrower laptop width, the sign-in page completes its layout reflow (from two columns to a single centered form column) with no visual breakage observable at any width in between.
- **SC-005**: A visual/structural review of the redesigned sign-in page confirms it uses the same design tokens (colors, radii, fonts) as the rest of the app, with no ad-hoc one-off styles introduced.
- **SC-006**: All previously working sign-in paths (admin/password, Google, Microsoft) still function end-to-end after the redesign, with zero regressions in the existing interaction flow.
- **SC-007**: The home page contains zero sign-in form fields, and 100% of activations of its primary call-to-action land the visitor on the dedicated sign-in page.
- **SC-008**: Loading the sign-in page URL while already authenticated results in the visitor seeing the authenticated workspace — zero instances of a redundant sign-in form being shown.
- **SC-009**: A visitor can reach the sign-in page by entering its URL directly, with the sign-in form rendered and usable within the same time budget as the current home page's first meaningful render.
- **SC-010**: Every text element on the sign-in page measures a contrast ratio of at least 4.5:1 against its background, and every interactive component boundary, state, and focus indicator measures at least 3:1, in both the light and the dark theme — verified by an automated accessibility check with zero contrast violations reported.
- **SC-011**: An automated accessibility audit of the sign-in page reports zero WCAG 2.1 level AA violations for the page's own markup and styling, and every acceptance scenario that is exercisable without a real rendering engine (keyboard tab order, focus visibility, loading/error/disabled states, already-authenticated redirect, form submission) is covered by an automated check that passes. Both the component-rendering check and the accessibility audit MUST be re-runnable via the project's existing test command.
- **SC-012**: Layout, spacing, colour, and breakpoint behaviour (SC-001, SC-003, SC-004, SC-010) are accepted through manual verification on a real browser at 1920×1080 and 1366×768 and across a continuous window resize, with zero visual defects observed — no automated layout assertion is required for these outcomes.
- **SC-013**: 100% of the three signed-out entry situations (direct URL to a protected page, expired session, explicit sign-out) present the sign-in page, leaving zero dead ends in which a signed-out visitor has no way to sign in.

## Assumptions

- "PC and laptop" scope means desktop/laptop browser viewports only (approximately 1024px width and above); phone and small-tablet portrait breakpoints are explicitly out of scope for this feature.
- The existing application design system's color tokens (background, foreground, primary, card, border, muted, danger, warning) are the source of truth for colors and MUST be reused rather than introducing new one-off colors.
- "Professional" is interpreted per the Success Criteria above (readable typography, consistent spacing, clear states, accessible focus indicators, design-system consistency) rather than a specific new visual theme or rebrand; no new logo, illustration, or brand color palette is introduced.
- The sign-in form's existing structural content (fields, buttons, notices, tab layout), all form labels/validation messages, and all control wording stay the same; only visual styling, spacing, typography scale, responsive breakpoints, and page-level composition are updated. New page-level framing copy (e.g., a page title or brief supporting statement) may be added, but no changes to authentication-related copy that would alter meaning.
- The dedicated sign-in page is composed from the existing sign-in form component; the form's behavior is reused as-is rather than reimplemented.
- Both supported locales (English/Vietnamese) must continue to work with the redesigned styles, since the app already supports these today.
- No new runtime/product dependencies or UI component libraries are introduced for the redesign itself; the page reuses existing styling utilities and the project's current icon library. Development-only test tooling MAY be added as dev-dependencies to satisfy SC-002 and SC-011 — specifically a component-rendering test library and an automated accessibility scanner — and such tooling MUST NOT be imported by any shipped application code.
- The redesign is confined to the dedicated sign-in page and the home page's call-to-action that leads to it; other marketing sections and the authenticated workspace are untouched.
- The existing post-authentication destination (the authenticated workspace view) is unchanged; only the entry point to sign-in moves from an in-page block to a dedicated page.
- Because the home page no longer contains a sign-in form, the flows that today send a signed-out visitor back to the marketing home page (unauthenticated access to a protected page, session expiry, explicit sign-out) are assumed to retarget the dedicated sign-in page. This was inferred from standard application behaviour rather than asked about, because leaving the existing destination unchanged would create a dead end with no way to sign in; FR-019 and SC-013 codify it.
- The brand introduction column shown beside the form on wide viewports is derived from existing home page marketing content already in the product; no new marketing assets are created. Its responsive behaviour (hidden below the wide-desktop threshold, never containing sign-in controls, form always first in reading and tab order) is codified in FR-004, FR-015, and FR-016.
