# Quickstart Validation: Guest Access Mode

**Feature**: 013-guest-access-mode
**Date**: 2026-09-26

Runnable end-to-end checks that prove the feature works. Each maps to the requirement or success
criterion it validates. This is a **validation guide** — it deliberately contains no implementation
code; the work items live in `tasks.md`.

## Prerequisites

- `npm run dev` (serves on port 4028), a browser, and devtools open for the network panel.
- For the AI checks: a running Ollama with the default model (`qwen2.5-coder:3b`) reachable at
  `http://localhost:11434`, **and** at least one cloud provider key present in `.env`. Verifying both
  sides is what proves the provider no longer changes the outcome (R9).
- For the sign-in checks: set `DEMO_ADMIN_PASSWORD` and `SESSION_SECRET` in `.env`. Without them the
  demo password falls back to the value printed on the sign-in page, and sessions do not survive a
  server restart (research.md R10).
- Start from a signed-out browser profile (or clear site storage) so no session is pre-existing.

---

## V1 — A guest can get in and do real work (US1, SC-001, FR-008, FR-009)

## V0 — The session cannot be forged (US3, research.md R10)

1. Sign in through `/api/session` as a guest, then copy the `sqlv_session` cookie value.
2. Edit the payload to `{"kind":"demo","startedAt":<now>}` and send it as a raw cookie to
   `POST /api/ai/generate`. **Expect:** `401` with `code: "AI_SESSION_REQUIRED"`.
3. `POST /api/session` with `{"kind":"demo","password":"wrong"}`. **Expect:** `401`, no `Set-Cookie`.
4. `POST /api/session` with `{"kind":"social","provider":"google","accessToken":"fake"}`.
   **Expect:** `401`, no `Set-Cookie`.
5. `POST /api/session` with `{"kind":"demo","password":<correct>}` and then call `/api/ai/generate`
   with the issued cookie. **Expect:** not `401` for the session reason.

Steps 2–4 are the actual vulnerability. If any of them reaches a provider call, the gate is not real.

---

## V1 — A guest can get in and do real work (US1, SC-001, FR-008, FR-009)

1. Open `http://localhost:4028/login`.
2. Locate the guest link inside the form. **Expect:** a button reading "I don't have an account, but
   still want to use", in the current display language.
3. Activate it with the **keyboard only** (Tab to it, press Enter). **Expect:** the disclosure dialog
   opens, focus moves into it, and focus cannot leave it with Tab.
4. Press **Cancel**. **Expect:** you are still on `/login`, no session exists, and reloading the page
   shows the sign-in form (FR-007).
5. Repeat from step 2, but press **Continue as guest**.
   **Expect:** you land in the SQL workspace with no credential entry (FR-008).
6. Paste a multi-join query, e.g.
   `SELECT o.id FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.total > 100;`
7. **Expect:** parsing results, the relationship graph, complexity scoring, the metrics dashboard and
   the exports all work normally (FR-009).
8. **Expect:** the chrome shows a persistent guest indicator (FR-010).

## V2 — The disclosure is honest and localised (FR-004, FR-005, FR-006, FR-021, SC-005)

1. As a guest, open the disclosure again by signing out first.
2. Read the dialog. **Expect:** it names specific unavailable capabilities, states the reason, and
   lists what remains open. It must **not** say that AI on the guest's own machine remains available
   — the 2026-09-27 decision (research.md R9) removed that claim.
3. **Expect:** the Docs Consultant is named as unavailable. After R9 this is no longer a special
   exception, but it is still worth confirming, because it was the clearest signal that the local
   model no longer buys anything.
4. Toggle the language. **Expect:** the link, the dialog and the locked explanations all switch
   language with no reload (FR-021), and no English text leaks into the Vietnamese view.

## V3 — Every model-backed capability is locked (US2, FR-011, FR-012, FR-013, SC-002)

Run twice: once with the provider set to the local Ollama, once with a cloud provider. **The two runs
must now produce the same result for every row except the last two** — that identity is the point of
R9, and it is the thing most likely to be got wrong.

| Step | Local Ollama selected | Cloud provider selected |
|---|---|---|
| SQL Explainer | locked explanation, no request | locked explanation, no request |
| Optimize | locked explanation, no request | locked explanation, no request |
| Follow-up chat | locked explanation, no request | locked explanation, no request |
| AI requirement generation | locked, no request | locked, no request |
| Database AI Assistant | locked, no request | locked, no request |
| Docs Consultant | **locked** | **locked** |
| Format-error AI fix | **works** (hard-wired local) | **works** (hard-wired local) |
| SQL analysis, graph, metrics, exports | **works** | **works** |

For every locked cell: **Expect** the specific explanation carrying the reason, a sign-in action, and
the list of retained capabilities (FR-011, FR-012) — and **Expect** in the network panel that **no
request was made** to the AI service and no spinner or generic error appeared (FR-013, FR-014).

## V4 — The server refuses independently of the browser (US3, FR-022..FR-025, SC-003, SC-004)

This is the check that fails if the feature was built as a UI-only lock.

1. Sign in as a **guest**, copy a valid AI request from the network panel.
2. Replay it in the console against `/api/ai/generate` with the guest cookie.
   **Expect:** `401` with `code: "AI_SESSION_REQUIRED"`.
3. Replay with **no cookie at all**. **Expect:** the same `401`, and a `sessionKind` of `"none"`.
4. Replay with a **garbage** cookie value. **Expect:** the same `401` — never a `500`, never a throw.
5. Post directly to `/api/ai/docs-context` as a guest. **Expect:** `401` (R3).
6. Post directly to `/api/ai/database-knowledge-context` as a guest.
   **Expect:** it still succeeds — it reads no credential (FR-009).

## V5 — Existing users are unaffected (FR-026, FR-027, SC-008) — the regression gate

Run this **first** if you suspect the session work broke sign-in.

1. Sign in with the demo credentials (`admin` / `1234@`). **Expect:** every AI feature works exactly
   as before, with no locked explanation anywhere (FR-027).
2. Sign out, then sign in with Google or Microsoft. **Expect:** the same (FR-026).
3. From either, call an AI feature and confirm a real provider request is made and succeeds.
   **Expect:** no `401` — a regression here means the cookie is not being written on an existing
   sign-in path (R6), which silently disables AI for the entire current user base.

## V6 — Session lifecycle (FR-018, FR-019, FR-020)

1. As a guest, trigger a locked feature and use the sign-in action in the explanation.
   **Expect:** you land authenticated, and the guest indicator is gone (FR-018).
2. Sign out. **Expect:** you return to `/login` and the guest state is gone (FR-019).
3. Sign out from a guest session, then re-open `/login` in a fresh tab.
   **Expect:** a resume offer appears rather than a bare signed-out form (FR-020).

## V7 — Accessibility (FR-002, SC-007)

1. Traverse the whole guest path with the keyboard only: link → dialog → confirm → workspace →
   locked explanation → sign-in action.
   **Expect:** every stop shows a visible focus indicator, nothing traps you, and nothing is
   click-only.
2. With a screen reader, open the disclosure dialog. **Expect:** its purpose is announced on open
   and focus is trapped inside it.

## V8 — Automated checks

```bash
npm run type-check    # tsc --noEmit
npm run lint          # eslint (see the known pre-existing failures elsewhere in the repo)
npm test              # vitest run — full suite
```

The suite must stay green: this feature touches the sign-in path, the AI service and the API routes
that existing tests already cover (e.g. `tests/unit/demoAuth.test.tsx`, `AppLayout.test.tsx`,
`SignInPage.test.tsx`, `SignInPage.axe.test.tsx`).

---

## Sign-off

| # | Check | Validates |
|---|---|---|
| V1 | Guest gets in and analyses SQL | US1, SC-001, FR-008/009 |
| V2 | Disclosure is honest and localised | FR-004/005/006, FR-021, SC-005 |
| V3 | Cost-based locking, both provider sides | US2, FR-011/012/013, SC-002 |
| V4 | Server refuses regardless of browser state | US3, FR-022..025, SC-003/004 |
| V5 | Existing users unaffected | FR-026/027, SC-008 |
| V6 | Session lifecycle | FR-018/019/020 |
| V7 | Accessibility | FR-002, SC-007 |
| V8 | Automated suite green | Repository quality gates |

7. In the server console, **Expect** a refusal record for each refusal containing the route, the
   session kind, and the reason — and **not** containing your prompt text or any credential
   (FR-025, SC-009, SC-010).
