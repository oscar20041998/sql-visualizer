---
description: "Task list for feature implementation"
---

# Tasks: Guest Access Mode (Explore Without an Account)

**Input**: Design documents from `/specs/013-guest-access-mode/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-contracts.md, quickstart.md

**Tests**: Test tasks ARE included. The project constitution requires unit/integration coverage for
every AI integration, and the enforcement seam added by this feature is security-relevant, so the
tests are deliverables rather than optional extras. Write each test first and watch it fail.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested and
delivered as an independent increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single Next.js project: `src/` and `tests/` at the repository root, per plan.md.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and shared structure

- [X] T001 Create `src/lib/capabilities.ts` with the `Capability` type, the `CapabilityBucket` / `CapabilityProviderSource` unions, and an empty `CAPABILITIES` table stub — the shared classification consumed by both client and server (plan.md Structure Decision)
- [ ] T002 [U21] [U22] Create `src/lib/sessionCookie.ts` exporting the `SESSION_COOKIE_NAME` constant and the `signSession` / `verifySession` / `clearSession` helpers for the `HttpOnly` cookie described in `contracts/api-contracts.md` section 1
- [ ] T003 [P] Add the `guestAccess*` copy keys to `src/locales/en.ts` — link label, dialog title/body/reason/confirm/cancel, locked-feature notice, chrome badge, resume offer, server-error fallback
- [ ] T004 [P] Mirror every key added in T003 into `src/locales/vi.ts` (SC-005, FR-021 — the locale files are separate and drift is silent)

**Checkpoint**: Capability and cookie modules exist, guest copy is available in both languages.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 [U14] [U15] [U16] [U17] [U18] Extend `src/lib/demoAuth.ts` with the guest marker: `GUEST_AUTH_STORAGE_KEY`, `setGuestSession`, `clearGuestSession`, `getGuestSession`, and widen `isDemoAuthenticated` / `clearDemoAuthenticated` so a guest session is recognised and cleared through the existing model (data-model.md section 1)
- [ ] T006 [U12] Populate the `CAPABILITIES` table in `src/lib/capabilities.ts` with all 16 rows from research.md R2, each with `id`, `bucket`, `providerSource` and `labelKey`, and add the comment block stating the cost rule (research.md R1)
- [ ] T007 [U1] [U2] [U3] [U4] [U5] [U6] [U7] [U8] [U9] [U10] [U11] [U13] Implement the pure `isLockedForGuest(capability, aiConfig)` and `entitlement(session, capability, aiConfig)` functions in `src/lib/capabilities.ts` per the pseudocode in data-model.md sections 2 and 4 — the resolution must key on `aiConfig.provider === 'ollama'` for `providerSource: 'config'` rows (depends on T006)
- [ ] T008 Surface guest state to React in `src/lib/store.ts`: add `isGuest` derived from the demoAuth guest marker and a `clearGuestSession` action, and make the existing sign-out path in `src/components/Sidebar.tsx` clear the guest marker (FR-019) (depends on T005)
- [ ] T009 [U19] [U23] Implement the shared `requireAiSession()` server guard in `src/lib/sessionCookie.ts`: verify the cookie, return a 401 `NextResponse` with `{ error, code: 'AI_SESSION_REQUIRED', sessionKind }`, and emit a refusal record through `createLogger` from `src/lib/logging/logger.ts` (FR-022, FR-024, FR-025) (depends on T002)
- [ ] T010 [U32] [U33] [U34] [P] Add the refusal-record helper in `src/lib/sessionCookie.ts` that logs route, session kind, capability and reason but never prompt text or credentials (SC-009, SC-010) (depends on T009)

**Checkpoint**: Foundation ready — the session model, capability table, entitlement function and server guard all exist. User stories can begin.

---

## Phase 3: User Story 1 - Evaluate the tool without signing up (Priority: P1) 🎯 MVP

**Goal**: A signed-out visitor activates the guest link, reads a disclosure, confirms, and lands in the SQL workspace able to parse, visualise and score SQL with no credential entry.

**Independent Test**: Render the sign-in page signed-out, activate the guest link, cancel and confirm each path, and assert the workspace is reachable and non-AI capabilities work. See quickstart.md V1-V2.

### Tests for User Story 1 — NOT OPTIONAL, write first and observe failing

> **MANDATORY**: write the test, run it, and record the failing output before the matching implementation task begins. Behaviors are tracked in `tdd/test-list.md`; the `[A#]`/`[U#]` markers in each task name the behaviors it covers.

- [ ] T011 [A1] [U46] [U47] [P] [US1] Test the guest link renders in the active locale and is keyboard-operable in `tests/unit/guestAccess.test.tsx` (FR-001, FR-002)
- [ ] T012 [A3] [U37] [P] [US1] Test the disclosure dialog creates no session on dismiss and creates one on confirm in `tests/unit/guestAccess.test.tsx` (FR-003, FR-007, FR-008)
- [ ] T013 [A2] [U38] [U39] [U40] [U41] [P] [US1] Test the dialog names unavailable capabilities, states the reason, and states that local AI remains available in `tests/unit/guestAccess.test.tsx` (FR-004, FR-005, FR-006)
- [ ] T014 [A16] [U54] [P] [US1] Test the dialog and link follow a locale change without reload in `tests/unit/guestAccess.test.tsx` (FR-021, SC-005)
- [ ] T015 [A5] [A18] [U50] [U51] [P] [US1] Test the guest badge appears in the chrome and the resume offer appears on `/login` in `tests/unit/guestAccess.test.tsx` (FR-010, FR-020)

### Implementation for User Story 1

- [ ] T016 [A17] [U35] [U36] [US1] Create `src/components/auth/GuestAccessDialog.tsx` with `role="dialog"`, `aria-modal="true"`, a focus trap, Escape/Cancel dismissal that creates no session, and a confirm action (depends on T011, T012, T013)
- [ ] T017 [A1] [U46] [U47] [US1] Add the guest link to `src/components/auth/SignInPanel.tsx` as a `<button>` peer of the existing sign-in actions, opening the dialog without navigating (FR-001) (depends on T016)
- [ ] T018 [A3] [U48] [US1] Wire the dialog confirm to `setGuestSession` and `signSession`, then navigate to `/query-input`, in `src/components/auth/SignInPanel.tsx` (FR-008) (depends on T005, T002, T016)
- [ ] T019 [A4] [U48] [U49] [US1] Admit a guest through the auth gate in `src/components/AppLayout.tsx` by recognising the guest marker, keeping the existing "render nothing while redirecting" behaviour (FR-008) (depends on T008)
- [ ] T020 [A5] [U50] [P] [US1] Render the persistent guest badge in `src/components/Sidebar.tsx` (FR-010) (depends on T008, T015)
- [ ] T021 [A18] [U51] [P] [US1] Add the resume-offer state to `src/app/login/page.tsx` when a guest session is active (FR-020) (depends on T008, T015)
- [ ] T022 [US1] Verify parsing, relationship graph, metrics dashboard, CTE analysis and every export format remain fully available to a guest — no code change expected, confirm against FR-009 via quickstart.md V1

**Checkpoint**: A guest can sign in, read the disclosure, and do real analytical work. This is the MVP; the AI features are still unguarded at this point, which is acceptable for an internal demo but **must not be deployed to a shared environment** until User Story 3 lands.


---

## Phase 4: User Story 2 - Understand precisely what is unavailable and why (Priority: P2)

**Goal**: Every shared-capacity capability a guest touches produces a specific explanation with a sign-in path and the retained-capability list — never a spinner, a generic error, or a request.

**Independent Test**: As a guest, activate each locked capability under both the local-Ollama and cloud provider settings and assert the notice appears with no network call. See quickstart.md V3.

### Tests for User Story 2 — NOT OPTIONAL, write first and observe failing

> **MANDATORY**: write the test, run it, and record the failing output before the matching implementation task begins. Behaviors are tracked in `tdd/test-list.md`; the `[A#]`/`[U#]` markers in each task name the behaviors it covers.

- [ ] T023 [U1] [U2] [U3] [U4] [U5] [P] [US2] Test `isLockedForGuest` returns false for a local-Ollama guest and true for a cloud-provider guest on `providerSource: 'config'` rows in `tests/unit/guestEntitlement.test.ts` (FR-011, research.md R1)
- [ ] T024 [U6] [U7] [U8] [U9] [P] [US2] Test the four non-config rows resolve as specified — hardwired-local always allowed, hardwired-cloud always locked, server-env delegated, none always allowed — in `tests/unit/guestEntitlement.test.ts` (FR-009, research.md R2/R3/R4)
- [ ] T025 [U10] [U11] [P] [US2] Test `entitlement` returns `allowed` for demo and social sessions in `tests/unit/guestEntitlement.test.ts` (FR-026, FR-027)
- [ ] T026 [P] [US2] Test every `CAPABILITIES` row has a `labelKey` resolving in both locales in `tests/unit/guestEntitlement.test.ts` (SC-005)
- [ ] T027 [U7] [P] [US2] Test the Docs Consultant is locked for a local-Ollama guest in `tests/unit/guestEntitlement.test.ts` (research.md R3)
- [ ] T028 [A6] [A7] [U42] [U43] [U44] [U45] [P] [US2] Test the locked notice renders reason, sign-in action and retained list with no network call in `tests/unit/guestAccess.test.tsx` (FR-011, FR-012, FR-013, FR-014)

### Implementation for User Story 2

- [ ] T029 [A9] [US2] Create `src/components/ui/LockedFeatureNotice.tsx`, the reusable explanation carrying the reason, a one-click sign-in action and the retained-capability list, rendered from local state with no network round-trip (FR-011, FR-012, FR-014) (depends on T023, T028)
- [ ] T030 [A6] [U42] [U45] [US2] Apply the notice to the SQL Explainer and AI CTE batch surfaces in `src/app/smart-sql-editor/components/AiSqlExplainer.tsx` and `src/app/smart-sql-editor/components/AiCteBatchPanel.tsx` (depends on T029)
- [ ] T031 [P] [US2] Apply the notice to Optimize and the NL requirement flow in `src/app/smart-sql-editor/components/OptimizeQueryModal.tsx` and `src/app/smart-sql-editor/components/AiFeatureAnnouncement.tsx` (depends on T029)
- [ ] T032 [P] [US2] Apply the notice to the follow-up chat in `src/app/smart-sql-editor/components/AiFollowUpChat.tsx` (depends on T029)
- [ ] T033 [A8] [U40] [U7] [P] [US2] Gate the Docs Consultant in `src/components/GlobalChat.tsx` and `src/app/guideline/components/DocsConsultantChat.tsx` — locked for every guest because its retrieval step is hard-wired to a cloud embedding key (research.md R3) (depends on T027, T029)
- [ ] T034 [P] [US2] Gate the Database AI Assistant page in `src/app/database-ai-assistant/components/DatabaseAIAssistantContent.tsx` for the answer step while keeping its hard-wired local RAG embedding available (research.md R2 rows 8-9) (depends on T029)
- [ ] T035 [P] [US2] Skip shared-capacity embeddings for guests in `src/lib/ai/embeddingService.ts` so query-history semantic search is locked while local embeddings still work (FR-013) (depends on T023)
- [ ] T036 [A9] [P] [US2] Hide shared-capacity provider and credential fields from a guest in `src/app/settings-preferences/components/SettingsContent.tsx` while leaving the local endpoint editable, and state the reason (FR-016) (depends on T029)
- [ ] T037 [P] [US2] Render the locked notice on the read-aloud control based on the speech-engine decision in `src/lib/ai/aiSpeech.ts` and the editor panels that trigger it (research.md R4) (depends on T029)
- [ ] T038 [US2] Handle an `AI_SESSION_REQUIRED` refusal in the shared AI client so a server refusal renders the notice instead of a generic error, in `src/lib/ai/aiService.ts` (FR-013, FR-024) (depends on T029)

**Checkpoint**: A guest understands every boundary and can see exactly what they retain. AI calls are blocked in the interface only — see User Story 3 for the server-side guarantee.


---

## Phase 5: User Story 3 - The restriction cannot be bypassed (Priority: P3)

**Goal**: The application refuses shared-capacity AI requests server-side when no valid session is presented, before any model capacity is consumed, and records each refusal.

**Independent Test**: Call the `/api/ai/*` routes directly with no cookie, a guest cookie and a garbage cookie; assert a 401 and that no provider call is made. See quickstart.md V4 and V5.

### Tests for User Story 3 — NOT OPTIONAL, write first and observe failing

> **MANDATORY**: write the test, run it, and record the failing output before the matching implementation task begins. Behaviors are tracked in `tdd/test-list.md`; the `[A#]`/`[U#]` markers in each task name the behaviors it covers.

- [ ] T039 [A11] [U24] [U25] [P] [US3] Contract test that `POST /api/ai/generate`, `/api/ai/generate/stream` and `/api/ai/embed` return 401 with `code: 'AI_SESSION_REQUIRED'` for a guest and for no session, in `tests/unit/guestSessionCookie.test.ts` (FR-022, FR-024)
- [ ] T040 [A12] [U20] [P] [US3] Contract test that a malformed or forged cookie is treated as no session and never throws or returns 500, in `tests/unit/guestSessionCookie.test.ts` (FR-022, SC-004)
- [ ] T041 [U26] [U27] [P] [US3] Contract test that `/api/ai/docs-context` always refuses a guest while `/api/ai/database-knowledge-context` still succeeds, in `tests/unit/guestSessionCookie.test.ts` (research.md R3, FR-009)
- [ ] T042 [A13] [U28] [P] [US3] Contract test that `/api/ai/speech` refuses a guest only when the resolved engine is a cloud engine, in `tests/unit/guestSessionCookie.test.ts` (research.md R4)
- [ ] T043 [U30] [U31] [P] [US3] **REGRESSION** test that the session cookie is issued on the demo-credential and social-OAuth sign-in paths, not only the guest path, in `tests/unit/guestSessionCookie.test.ts` (FR-026, FR-027, research.md R6)
- [ ] T044 [A14] [U32] [U33] [U34] [P] [US3] Test that each refusal emits a record with route, session kind and reason, and never prompt text or credentials, in `tests/unit/guestEntitlement.test.ts` (FR-025, SC-009, SC-010)

### Implementation for User Story 3

- [ ] T045 [A11] [U24] [U25] [A15] [U29] [US3] Add the session guard to `src/app/api/ai/generate/route.ts` and `src/app/api/ai/generate/stream/route.ts`, placed **before** the credential read and provider call (FR-022, FR-023) (depends on T039, T009)
- [ ] T046 [US3] Add the session guard to `src/app/api/ai/embed/route.ts` with the same ordering (depends on T039, T009)
- [ ] T047 [U26] [U27] [US3] Add an unconditional guest refusal to `src/app/api/ai/docs-context/route.ts` and deliberately leave `src/app/api/ai/database-knowledge-context/route.ts` ungated (FR-009, research.md R3) (depends on T041, T009)
- [ ] T048 [US3] Add the `AI_SPEECH_PROVIDER`-aware guard to `src/app/api/ai/speech/route.ts` (research.md R4) (depends on T042, T009)
- [ ] T049 [U30] [U31] [US3] **Issue the session cookie on the existing sign-in paths** — the demo-credential path in `src/lib/demoAuth.ts` `setDemoAuthenticated`, and the OAuth callback in `src/app/oauth/callback/page.tsx` — so existing users keep AI access under the new gate (FR-026, FR-027, research.md R6) (depends on T043, T002)
- [ ] T050 [A19] [U52] [U53] [US3] Clear the guest marker when signing in from the locked-feature notice, so the guest is never silently upgraded and no guest state is left behind, in `src/components/ui/LockedFeatureNotice.tsx` and `src/lib/demoAuth.ts` (FR-018) (depends on T029, T005)

**Checkpoint**: The restriction is enforced at the server boundary. This is the phase that makes the feature safe to expose to the public internet.

### Phase 5a — decisions taken during implementation (added 2026-09-27)

These were not in the original plan. They are recorded here so `tasks.md` is not the last place the
behaviour is described, and so a future reader can see what was deliberately changed.

- [X] T056 [US2] Apply the final AI policy: `isLockedForGuest` refuses every model-backed capability regardless of provider, and the `config.provider === 'ollama'` early exit in `assertGuestEntitled` is removed (research.md R9). **Both halves are required** — fixing only the predicate leaves the client bypassed.
- [X] T057 [US3] Replace the forgeable cookie with a server-issued, HMAC-signed, `HttpOnly` session: add `src/lib/sessionCrypto.ts` and `src/app/api/session/route.ts`, which verifies the demo password and the provider token before minting `demo`/`social` (research.md R10). Signing alone is insufficient because the app has no server-side auth.
- [X] T058 [US3] Remove the guest branch from `isDemoAuthenticated`, so it means "a real identity is signed in" rather than "someone is in the workspace".
- [X] T059 [US2] Add `src/lib/useCapabilityLock.ts` (hook + plain predicate) and apply it to the SQL Explainer, Optimize, follow-up chat, and Docs Consultant surfaces, so a guest reads the locked explanation instead of activating a control that would fail. Kept out of `capabilities.ts` because that module is imported by the server route guards.
- [X] T060 [US2] Correct the `labelKey` values in `CAPABILITIES`: seven pointed at i18n keys that do not exist in `en.ts`/`vi.ts`, so a locked feature would have rendered a blank title (SC-005). Guarded by a test that resolves every `labelKey` in both locales.
- [X] T061 [US2] Add `isSessionRequiredResponse` / `readFailure` so a server refusal surfaces as the locked explanation rather than an opaque `HTTP 401` (FR-014).

**Not done in this pass**: the settings surface (T039) and the docs-index rebuild script. The
`LockedFeatureNotice` sign-in CTA and the `/login` resume offer remain open (T050) — `isDemoAuthenticated`
no longer counts a guest, so the immediate-redirect loop is fixed, but the resume copy was not reviewed.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T051 [P] Run the full `quickstart.md` validation set V1-V7 in a real browser with both a local Ollama and a cloud key configured, and record the outcome
- [ ] T052 [P] Add an axe accessibility scan for the guest link and disclosure dialog in `tests/unit/guestAccess.axe.test.tsx`, following the pattern in `tests/unit/SignInPage.axe.test.tsx` (SC-007, FR-002)
- [ ] T053 [A10] [A20] Verify `npm run type-check` and `npm test` are green, and that `npx next lint --file` reports no errors for the files this feature touches — the repo has pre-existing lint failures elsewhere that must not be attributed to this work
- [ ] T054 Review that no cloud credential can reach the browser under any session type, including the guest session (FR-028)
- [ ] T055 [P] Update `README.md` with the guest-access behaviour, the cost-based rule, and the operator note about reviewable refusal records


---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational. No dependency on other stories.
- **User Story 2 (P2)**: Starts after Foundational. Uses the same entitlement function as US1 but is independently testable — it only needs a guest session to exist.
- **User Story 3 (P3)**: Starts after Foundational. Independent of US1/US2 in code; only its *demonstration* needs a way to become a guest.

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Capability table and entitlement function before any UI that consults them
- Server guard before any route is considered protected
- Story complete before moving to the next priority

### Parallel Opportunities

- T003 and T004 (locales) can run in parallel
- T010 can run alongside the rest of Phase 2 once T009 lands
- Within a story, all `[P]` tests can run in parallel, then all `[P]` implementation tasks
- T030-T037 (User Story 2 surfaces) are mutually independent and parallelisable — the largest parallel win in this plan
- Once Foundational completes, US1, US2 and US3 can be worked in parallel by three developers

---

## Parallel Example: User Story 2

```bash
# Launch all User Story 2 tests together (expect failures):
Task: "Test isLockedForGuest returns false for a local-Ollama guest in tests/unit/guestEntitlement.test.ts"
Task: "Test the four non-config rows resolve as specified in tests/unit/guestEntitlement.test.ts"
Task: "Test the Docs Consultant is locked for a local-Ollama guest in tests/unit/guestEntitlement.test.ts"
Task: "Test the locked notice renders reason, sign-in action and retained list in tests/unit/guestAccess.test.tsx"

# After T029 lands, launch every AI surface in parallel:
Task: "Apply the notice to the SQL Explainer and AI CTE batch surfaces"
Task: "Apply the notice to Optimize and the NL requirement flow"
Task: "Apply the notice to the follow-up chat"
Task: "Gate the Docs Consultant in GlobalChat.tsx"
Task: "Gate the Database AI Assistant page"
Task: "Hide shared-capacity provider and credential fields in SettingsContent.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md V1-V2
5. Demo internally — **do not deploy publicly**: the AI surface is still unguarded

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → validate (V1-V2) → internal demo (MVP)
3. US2 → validate (V3) → demo; the interface now explains every boundary
4. US3 → validate (V4, V5) → **safe to deploy publicly**
5. Each story adds value; only after US3 is the feature safe on a shared host

### Parallel Team Strategy

1. Team completes Setup + Foundational together (T001-T010)
2. Then in parallel:
   - Developer A: User Story 1 (T011-T022)
   - Developer B: User Story 2 (T023-T038)
   - Developer C: User Story 3 (T039-T050)
3. Stories integrate independently; US3 is the release gate

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps each task to a user story for traceability
- Each user story is independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently
- **T043 and T049 are the highest-risk tasks in this plan**: omitting the cookie on the existing sign-in paths silently disables AI for every current user (research.md R6). Run quickstart.md V5 first
- **T047 must leave `/api/ai/database-knowledge-context` ungated** — it reads no credential, and gating it would break FR-009 for no security benefit
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence

