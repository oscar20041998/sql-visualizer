# Implementation Plan: Microsoft & Google Social Login

**Branch**: `005-oauth-social-login` | **Date**: 2026-09-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-oauth-social-login/spec.md`

## Summary

Implement secure, client-side Microsoft & Google social authentication flows using a lightweight, direct OAuth 2.0 Implicit Flow. Provide full persistence with `localStorage`, session expiry logic, and a standalone interactive Mock Simulator when environment client IDs are missing, allowing frictionless local development and validation.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 14.x (App Router)

**Primary Dependencies**: None (direct Web APIs: `window.open`, `fetch`, `localStorage` - keeping bundle size lightweight)

**Storage**: Browser `localStorage` (keys: `sqlvisualizer-user-session`, `sqlvisualizer-demo-authenticated`)

**Testing**: Vitest for utility testing (session management, callback parser, validation)

**Target Platform**: Modern Web Browsers

**Project Type**: Next.js App Router Web Application

**Performance Goals**:
- Session checking on app boot: <5ms.
- Session sign-out: <50ms.
- Success toast & redirect to query workspace: <200ms after OAuth callback parsed.

**Constraints**:
- Absolute client-side execution; no server-side endpoint or database credentials can be introduced.
- Strict preservation of the existing temporary administrator login credentials (`admin` / `1234@`) without breaking current user paths.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Rule I: Standardized UI & Styling**: Reuse existing workspace buttons, Tailwind styling, and standard Lucide icons (`Globe2` / `PanelsTopLeft`). Add clean, standard transitions.
- **Rule IV: Code Quality & Backwards Compatibility**: Do not remove, break, or alter the logic of the temporary admin login. Maintain full type-safety under `types/*.ts` and `tsconfig.json`.
- **Rule V: No External Dependencies**: Avoid downloading third-party OAuth wrapper packages; use standard web API primitives.

## Project Structure

### Documentation (this feature)

```text
specs/005-oauth-social-login/
├── spec.md              # Feature requirements and user scenarios (complete)
├── plan.md              # This file (completed implementation plan)
├── research.md          # Phase 0 output (OAuth mechanism & fallback decisions)
├── data-model.md        # Phase 1 output (JSON schema, storage keys, state transitions)
├── quickstart.md        # Phase 1 output (manual verification, mock profiles, testing guide)
├── checklists/
│   └── requirements.md  # Checklist completeness (completed)
└── tasks.md             # Phase 2 output (implementation task checklist)
```

### Source Code Modifications

The following existing files will be surgically modified or created:

```text
src/
├── lib/
│   ├── demoAuth.ts       # UPGRADE: Add unified session manager (isDemoAuthenticated, getActiveSession, clearAllSessions)
│   └── demoAuth.test.ts  # CREATE: Vitest unit tests for session state and expiry logic
├── app/
│   ├── page.tsx          # UPGRADE: Connect login buttons to popup OAuth flow & Mock Simulator, display error state/toasts
│   └── query-input/
│       └── page.tsx      # UPGRADE: Verify session on load, handle automatic redirection for expired users
├── components/
│   ├── Sidebar.tsx       # UPGRADE: Display signed-in social user's avatar, name, and provider badge; wire Sign-out
│   └── oauth/
│       └── mock-popup.html # CREATE: Simple public static html page representing the simulator (fallback to custom in-app modal if easier)
```

**Structure Decision**: The implementation will follow the **Single project (Option 1)** structure as Next.js coordinates both frontend components and utility/lib services natively.

## Complexity Tracking

No violations of the Constitution or architectural guidelines are introduced. The client-only session model maintains simplicity while completely matching the workspace's non-persisted client-side context pattern.
