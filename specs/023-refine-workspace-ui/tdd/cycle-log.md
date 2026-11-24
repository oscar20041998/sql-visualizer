# Cycle Log: Tinh chỉnh giao diện

Append only. Chưa có cycle RED/GREEN nào được thực hiện.

## Baseline

- Revision khi lập kế hoạch: `b6b1230`; worktree có thay đổi chưa commit.
- `npm test`: 104 files, 951 tests passed; duration 121.81s. Run on current dirty worktree before UI changes. Output included non-fatal warnings.
- `npm test -- tests/unit/home-features.test.tsx`: 3 tests passed; verified focused home command added to profile.

## Authorized exception

- User approved browser before/after validation instead of an automated RED loop for purely visual criteria (motion, colors, and measured occupied space); interaction behaviors remain test-first.
- User approved green characterization tests for already-working behavior (including sidebar toggle and no-IntersectionObserver fallback), rather than fabricating a RED.

## Cycle 1: A4 feature cards enter viewport

- RED: `npm test -- tests/unit/home-features.test.tsx` -> 1 failed, 3 passed; observer was not called for the feature card (0 calls).
- GREEN change: observe feature cards once; add a reduced-motion-aware reveal class on intersection, leaving content visible when the observer is unavailable.
- GREEN: `npm test -- tests/unit/home-features.test.tsx` -> 4 passed.
- REFACTOR: line wrapping only; the same command -> 4 passed.
- Browser: at 688x350, scrolling to features showed `home-card-reveal` with final opacity 1.
- Browser: all three workflow cards also received the reveal animation and reached opacity 1.
- Full suite: `npm test` -> 104 files and 952 tests passed. Remaining edge cases have separate pending entries.

## Characterization: U1 fallback

- `npm test -- tests/unit/home-features.test.tsx` -> 5 passed; feature card content remains visible when `IntersectionObserver` is unavailable.
- Reduced-motion browser check at 688x350: animation `none`, opacity `1`.

## Sidebar characterization and visual exception

- Before and after: `npm test -- tests/unit/sidebar-appearance.test.tsx` -> 1 passed; navigation remains available after collapse and expand.
- Browser before: width 240px, radius 0px, no shadow. After: radius 16px, shadow present, transition property width, collapse 64px and 7 navigation links retained. Expanded sidebar did not overlap the main content at the available viewport.
- Light theme, additional viewport sizes and reduced motion remain to be checked.
- At 390px, the expanded sidebar left only 126px for the dashboard; the user chose a temporary overlay on narrow screens so the content remains usable when the sidebar is collapsed.
- After mobile overlay: at 390x844, expanded width 240px overlays main content (302px wide); collapsed width 64px does not overlap.

## Visual exceptions: metric cards and headers

- Metric browser baseline: 11 cards, first card had no gradient or shadow. After: first card displays accent gradient and a shadow; light theme also produces a gradient.
- `npm test -- tests/unit/sqlMetricsDashboard.test.tsx` -> 18 passed.
- Home header: 64.8px before, 56.8px after at 688px. Dashboard header: old classes 120.8px, new classes 108.8px at 688px.
- Combined regression for sidebar, shell, home, dashboard, query input and signout: 43 tests passed. Other header and theme/viewport combinations remain unverified.

## Cycle 2: U6 sidebar expanded state

- RED: `npm test -- tests/unit/sidebar-appearance.test.tsx` -> 1 failed, 1 passed; the toggle lacked `aria-expanded`.
- GREEN change: expose `aria-expanded` based on the existing collapsed state.
- GREEN: `npm test -- tests/unit/sidebar-appearance.test.tsx` -> 2 passed.
- REFACTOR: none; targeted test passed as above.
- Full suite: `npm test` -> 105 files and 955 tests passed; `npm run type-check` -> passed.

## Regression retry

- One full-suite run failed in `object-intelligence-ai-panel.test.tsx` while waiting for the confirmation group; that file passed when run alone (7 tests), and two later full-suite runs passed. The cause was not established.
- After compacting the documentation and history headers, the latest `npm test` failed in the same AI confirmation test (104 files / 954 tests passed, 1 failed). The documentation/history tests passed independently (18 tests); the AI failure's cause remains unconfirmed.
- `npm test -- --maxWorkers=2 --minWorkers=1` -> 105 files and 955 tests passed after all UI changes. This does not establish the cause of the default-suite failures.
