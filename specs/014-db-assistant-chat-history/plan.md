# Implementation Plan: Database AI Assistant — Persistent Chat History

**Branch**: `014-db-assistant-chat-history` | **Date**: 2026-09-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-db-assistant-chat-history/spec.md`

## Summary

The Database AI Assistant currently keeps its thread only in memory (`databaseAssistantHistory` in
`src/lib/store.ts`), so every reload, route change or browser restart loses the conversation, and
"New chat" is destructive (`resetDatabaseAssistantChat`). This feature adds persistent,
user-managed, per-identity conversation history: multiple conversations with stable identities,
auto-derived titles, a searchable and recency-grouped history list, rename, delete and clear-all,
and faithful restoration of each thread including its grounding source labels.

**Technical approach** (from [research.md](./research.md)): an async, replaceable
`DatabaseAssistantHistoryStorage` contract (FR-042) with a browser-local `localStorage`
implementation, partitioned by a key that carries the owning signed-in identity (FR-030/FR-043) —
resolving the single-fixed-key conflict raised in the spec Appendix. Conversation state moves into
the existing Zustand store as the single source of truth, with the active thread exposed as a
projection so existing call sites keep working (SC-015). Writes happen only on meaningful
transitions (FR-013), never per streamed fragment (SC-008). Titles come from a deterministic, free
helper (FR-003). The history list is a new sibling panel beside the chat on wide screens and a
dismissible drawer on narrow ones, built from existing Tailwind classes, `lucide-react` icons,
`sonner` toasts and the `en`/`vi` locale maps (FR-038, FR-039).

No new runtime or dev dependencies are introduced.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, per constitution Quality Standards); React 19.0.3; Next.js 15.5.18 (App Router)

**Primary Dependencies**: `next` 15.5.18, `react`/`react-dom` 19.0.3, `zustand` 4.5.5 (existing app store), `lucide-react` (icons), `sonner` (toasts), `tailwindcss` 3.4.6 + `tailwindcss-animate`. **No new dependencies.**

**Storage**: Browser `localStorage`, one JSON payload per owning identity under
`sql-visualizer:database-ai-assistant:chat-history:<identityKey>`, accessed only through the
`DatabaseAssistantHistoryStorage` contract. In-memory fallback when storage is unavailable
(FR-031, FR-033). No network egress (FR-032). No server route is added by this feature.

**Testing**: Vitest 2.1.9 + `jsdom` + `@testing-library/react` 16 + `@testing-library/jest-dom`, setup file `tests/utils/test-setup.ts`, tests in `tests/unit/`. Existing helpers `resetTestStorage`, `signInAsSocialUser`, `signInAsDemoUser`, `stubSessionEndpoint` are reused. Run with `npm run test`.

**Target Platform**: Modern browsers, desktop and narrow/mobile viewports. Client Components only (`"use client"`); no SSR rendering of stored history (browser storage is unavailable during prerender).

**Project Type**: Web application — single Next.js project, App Router, `src/` root (no separate backend/frontend projects).

**Performance Goals**: SC-004 filter 200 conversations < 1 s and open the panel < 1 s; SC-005 render a 100-message conversation scrolled to the latest exchange < 2 s; SC-003 locate 1 of 50 conversations < 10 s; SC-008 at most one write per completed answer and zero writes during streaming; the constitution Performance gate (< 1 s) is unaffected because no parsing or graph rendering is added.

**Constraints**: On-device only, never transmitted (FR-032); no model or network call for titles (FR-003); writes only on create / question sent / answer completed / title change / delete / clear-all / active change (FR-013); **no storage call in presentation or conversation logic** (FR-042) — this applies to `DatabaseAIAssistantContent.tsx`, the assistant actions in `src/lib/store.ts`, and the new panel components; unlimited retention, the application never truncates or expires (FR-029); TypeScript strict, no unjustified `any`; all new strings in `en` and `vi` (FR-038).

**Scale/Scope**: One signed-in identity per browser at a time; target 200 conversations (SC-004, SC-018) with a worst case of ~100 messages each (SC-005). Roughly 12 new or changed source files: 1 storage contract + 1 browser-local implementation, 1 helpers module, 1 identity module, 4 presentation components, store changes, 2 locale maps, the assistant page, and ~5 new test files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle / Rule | Applies | Verdict | Evidence |
|---|---|---|---|---|
| I | Multi-Dialect SQL Analysis | No | **PASS** | No SQL parsing added. Dialect handling in the assistant is untouched (FR-037). |
| II | Interactive Visualization First | No | **PASS** | A conversation list is not an analysis visualization; ReactFlow is not applicable. Existing drill-down surfaces are unchanged. |
| III | Real-Time Feedback Loop | **Yes** | **PASS** | Streaming stays progressive: the assistant turn is mutated in memory per delta and persisted **once** on completion (FR-008, SC-008). No write occurs between the first and last fragment. |
| IV | AI-Grounded Explanations | **Yes** | **PASS** | Grounding source labels and the grounding flag are persisted with the answer and restored verbatim, with **no** re-run of retrieval (FR-012). Restored answers therefore cannot contradict the facts recorded when they were produced. |
| V | Minimal Deployment Friction | **Yes** | **PASS** | Zero new dependencies; no browser credentials; API keys stay server-side and untouched; history is on-device only (FR-030, FR-032). The Ollama/local fallback path is unchanged. |
| S1 | Credentials server-side validated, never exposed to browser | **Yes** | **PASS** | No new credential handling. The partition key is derived from the already-existing client session record (`getSocialSession()`) that the server issued; it is an opaque local hash, not a credential, and is never transmitted. |
| S2 | Query history storage MUST enforce user-level isolation | **Yes** | **PASS** | This is the constitution's explicit isolation rule and the reason the single-fixed-key constraint is overridden: every read and write is scoped to `identityKey`, so one identity never sees another's conversations (FR-030, FR-043, SC-017). |
| S3 | RAG/LLM requests on-device or proxied; never client-to-cloud | **Yes** | **PASS** | Unchanged. History adds no network call at all. |
| Q1 | Testing: unit + integration (Vitest) | **Yes** | **PASS** | Planned in [quickstart.md](./quickstart.md): storage contract (save/load/clear, corrupted, missing storage, quota), helpers (title, ordering, grouping, search scope), conversation transitions, identity lifecycle, and regression coverage of the FR-037 behaviours. |
| Q2 | Type safety: strict, `any` justified | **Yes** | **PASS** | All new types are explicit; `unknown` plus type guards are used for parsing stored JSON, matching the existing `isUserSession` / `isGuestSessionValue` convention in `src/lib/demoAuth.ts`. No `any`. |
| Q3 | Performance: >50-table analysis/graph < 1 s | No | **PASS** | Untouched code path. |
| Q4 | Documentation: inline comments on algorithm / dialect / limits | **Yes** | **PASS** | Required for the identity-key derivation, legacy-key adoption, recency grouping and title truncation; each carries a documented limitation (see research.md). |

**Gate result: PASS — no violations.** Complexity Tracking is therefore left empty.

### Constitution conflicts deliberately surfaced

1. **Single fixed storage key vs. user-level isolation.** The source request fixes one centralised
   key; constitution S2 and FR-030/FR-043 require per-identity partitioning. Per the spec Appendix
   rule ("the requirement wins and the conflict must be raised rather than resolved silently"), the
   key namespace is kept but carries the owning identity as a partition suffix. Raised here and
   resolved in research.md **R1**.
2. **Unlimited retention vs. the `localStorage` quota.** FR-029 forbids the application from
   truncating and SC-018 requires 200 conversations to survive, while `localStorage` is capped
   around 5 MB per origin. The specified scenario fits comfortably (sizing in research.md **R3**),
   and FR-031/FR-033 already define the behaviour once the device stops accepting data, so the
   requirement is met without truncation. IndexedDB is documented as the named successor with an
   explicit switch trigger.
3. **Stopping an answer vs. "no partial answer stored".** Today `handleStop` aborts the stream and
   leaves the partial text on screen (`DatabaseAIAssistantContent.tsx`, the `AbortError` early
   `return`), while FR-009 and SC-007 require that no partial answer is kept and the question can
   be asked again. FR-037 preserves *stopping* as an available action, not the retention of partial
   text, so the stop path is aligned with the existing error path (roll back the exchange, restore
   the draft). Recorded in research.md **R7** so the change is traceable rather than silent.

### Post-Phase 1 re-check

*Re-evaluated after `research.md`, `data-model.md`, `contracts/` and `quickstart.md` were produced.*

| Principle | Pre-design | Post-design | What the design confirmed or changed |
|---|---|---|---|
| I Multi-Dialect | PASS | **PASS** | No parser surface touched; `dialect` is still passed to retrieval exactly as today. |
| II Visualization First | PASS | **PASS** | The history list is a navigation surface, not an analysis visualization; no ReactFlow involvement. |
| III Real-Time Feedback | PASS | **PASS — strengthened** | The write table in `data-model.md` (T5 = **0** writes) makes "no storage work between the first and last fragment" an assertable invariant (I11), not just an intention. |
| IV AI-Grounded Explanations | PASS | **PASS — strengthened** | `StoredMessage.sources` reuses the **existing** `DatabaseKnowledgeSource` type from `src/lib/ai/databaseAssistant.ts`, and a separate `grounded` flag distinguishes "no sources found" from "grounding unavailable", so a restored answer cannot misrepresent its grounding. |
| V Minimal Deployment Friction | PASS | **PASS** | Confirmed zero new runtime **and** zero new dev dependencies: `localStorage` (not IndexedDB, research.md **R3**), `crypto.randomUUID()` (not an id library, **R5**), `tailwindcss-animate` (not a headless-UI library, **R16**), `jsdom`'s built-in `localStorage` (not `fake-indexeddb`, **R21**). |
| S1 Credentials server-side | PASS | **PASS** | `resolveHistoryIdentity()` reads only `window.localStorage` (contract guarantee G-ID-4) and makes no network request. The partition key is documented as *not* a security control (**R2**, G-ID-5) — no overclaim. |
| S2 User-level isolation | PASS | **PASS — strengthened** | Isolation is now structural: `ownerId` is validated against the partition being loaded and a mismatch yields `corrupt` rather than adoption (storage contract §4). Invariant I2 plus tests "identity A cannot read B's partition" and "`identityKey === null` performs zero storage calls". |
| S3 RAG/LLM never client-to-cloud | PASS | **PASS** | History adds no network call of any kind. |
| Q1 Testing (Vitest) | PASS | **PASS** | Concretised: five named test files mapped clause-by-clause to requirements in `contracts/*` §Verification and research.md **R21**, plus manual scenarios for the browser-restart criteria in `quickstart.md` §4. |
| Q2 Type safety | PASS | **PASS** | `data-model.md` specifies `unknown` + named type guards (`isStoredHistory`, `isStoredConversation`, `isStoredMessage`) mirroring `demoAuth.ts`; no `any`, no `as` on untrusted data. Locale parity is compiler-enforced (**R15**). |
| Q3 Performance | PASS | **PASS** | Untouched code path; SC-004 sizing shows filtering 200 conversations is microseconds (**R10**). |
| Q4 Documentation | PASS | **PASS** | The four algorithms requiring inline comments are identified, each with its limitation recorded: identity hashing (**R2**), legacy adoption (**R1**), recency grouping incl. the timezone limitation (**R11**), title truncation (**R6**). `quickstart.md` §7 surfaces all four to validators. |

**Post-design gate result: PASS — still no violations.** Complexity Tracking remains empty.

Two design outcomes were checked specifically for over-engineering, since the source request warns
against it, and both were reduced rather than expanded:
- The persistence contract was cut from six operations to three (`load`/`save`/`clear`); `get`,
  `delete`, `rename` and `search` are pure in-memory operations at the layer where they belong
  (**R4**).
- The stored shape carries no derived or cached field — no `recencyGroup`, `messageCount`,
  `preview`, `archived`/`pinned` or separate `updatedAt` — and each omission is justified in
  `data-model.md` so the decision is auditable.



## Project Structure

### Documentation (this feature)

```text
specs/014-db-assistant-chat-history/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── chat-history-storage.md
│   └── history-ui.md
├── checklists/
│   └── requirements.md  # Existing quality checklist (16/16 passing)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Single Next.js project. New files follow the repository's existing placement conventions:
feature-local presentation under the route's own `components/` folder (as
`src/app/database-ai-assistant/components/` already does), cross-cutting logic under `src/lib/`,
domain AI logic under `src/lib/ai/`, and tests under `tests/unit/`.

```text
src/
├── app/database-ai-assistant/
│   ├── page.tsx                                   # CHANGED: unchanged shell, verified only
│   └── components/
│       ├── DatabaseAIAssistantContent.tsx         # CHANGED: reads store projections, no storage calls
│       ├── DatabaseAssistantHistoryPanel.tsx      # NEW: sidebar (wide) / drawer (narrow) container
│       ├── DatabaseAssistantConversationList.tsx  # NEW: recency-grouped, searchable list
│       ├── DatabaseAssistantConversationItem.tsx  # NEW: one row: title, recency, rename, delete
│       └── DatabaseAssistantConfirmInline.tsx     # NEW: inline confirm (no window.confirm)
├── lib/
│   ├── store.ts                                   # CHANGED: conversation collection + transitions
│   └── ai/databaseAssistant/
│       ├── chatHistoryTypes.ts                    # NEW: persisted shapes + type guards
│       ├── chatHistoryStorage.ts                  # NEW: the replaceable contract (FR-042)
│       ├── chatHistoryLocalStorage.ts             # NEW: browser-local implementation
│       ├── chatHistoryIdentity.ts                 # NEW: identity → partition key (FR-030/FR-043)
│       └── chatHistoryHelpers.ts                  # NEW: title derivation, ordering, grouping, search
├── locales/
│   ├── en.ts                                      # CHANGED: dbAssistantHistory* keys
│   └── vi.ts                                      # CHANGED: same keys, Vietnamese

tests/unit/
├── dbAssistantChatHistoryStorage.test.ts          # NEW: contract + robustness (FR-031/033/034/035)
├── dbAssistantChatHistoryHelpers.test.ts          # NEW: title, ordering, grouping, search scope
├── dbAssistantChatHistoryState.test.ts            # NEW: conversation transitions + write discipline
├── dbAssistantChatHistoryIdentity.test.ts         # NEW: partitioning + lifecycle (SC-017, FR-043)
└── dbAssistantHistoryPanel.test.tsx               # NEW: UI states, a11y, responsive, i18n
```

**Structure Decision**: Single Next.js project (Option 1 collapsed onto the repository's real
App Router layout). No `backend/`, `frontend/`, `api/` or mobile trees are introduced — the
repository is one Next.js application with `src/app` routes, `src/lib` logic, `src/components`
shared UI and `tests/unit` tests, and this feature adds no server surface at all (FR-030, FR-032).
New AI-domain modules are grouped under `src/lib/ai/databaseAssistant/` rather than scattered into
`src/lib/ai/` root, matching the existing sub-folder convention already used by `src/lib/sql/dashboard/`
and `src/lib/sql/mybatis/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. The Constitution Check gate passes on every applicable principle, so no complexity
is being justified here. The two requirement-level conflicts surfaced above (storage key
partitioning, `localStorage` quota) are resolved in favour of the requirements in
[research.md](./research.md) and do not add architectural layers: the design is one storage
contract, one implementation, one helpers module and one store slice.

