# Feature Specification: Guest Access Mode (Explore Without an Account)

**Feature Branch**: `013-guest-access-mode`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description: "Add a new feature to the login form: a line reading 'I don't have an account, but still want to use'. Clicking it bypasses authentication and assumes a virtual (guest) user, and this user MUST NOT be allowed to use any feature that uses Ollama or AI. A popup/modal should display the history so the user is informed."

## Clarifications

### Session 2026-09-26

- Q: What is the guest's relationship to AI capabilities? → A: Only the capabilities that consume the operator's shared capacity are unavailable to a guest — the Docs Consultant retrieval, Database AI Assistant, cloud-backed explain/optimize, requirement generation, format-error AI fix, semantic query-history search, and read-aloud. AI running on the guest's own machine stays available. The dividing line is cost, not the "AI" label (see the fourth clarification below).
- Q: Should the guest's restrictions be enforced only in the interface, or also at the server boundary? → A: Both. The interface must block and explain; the server must independently refuse. The current session model is browser-only, so a UI-only block would be bypassable and would leave metered cloud credentials exposed to anonymous callers.
- Q: What does "popup/modal showing the history" mean? → A: A one-time acknowledgement dialog listing exactly which capabilities are unavailable and why, shown before the guest session starts. It is a disclosure, not a browsing history — a guest has no prior activity to display.
- Q: Is a guest blocked from a locally running Ollama instance on their own machine? → A: **No — revise this.** A guest MAY use AI running locally on their own hardware, because the operator bears no cost and there is no metered spend to protect. The restriction applies only to AI that consumes the operator's shared capacity: cloud providers and the retrieval/embedding steps billed against them. A guest therefore keeps local Ollama explain/optimize/chat and loses the cloud-backed capabilities. The rule follows **who bears the cost**, not whether the feature is labelled "AI".
- Q: Is the virtual user modelled as a separate session state, or as a flag on the existing session? → A: **Revise to a flag on the existing session.** Reuse the established session model rather than adding a third state. A guest session is represented as a marker on the existing browser-held session, so it stays distinguishable from an authenticated identity for gating and display, but introduces no new session type or lifecycle of its own.
- Q: Is a guest blocked from a locally running Ollama instance on their own machine? → A: **Revise again — see the 2026-09-27 decision below.** The cost-based rule above is withdrawn.

### Session 2026-09-27 — final AI policy (supersedes the cost-based rule)

- Q: May a guest use AI at all, including a model running on their own machine? → A: **No.** A guest is refused **every model-backed capability, whatever provider is selected.** The only AI path left open is the format-error explain/fix, because it is hard-wired to local inference and therefore costs the operator nothing, plus the local vector index, which uses no model at all. Everything non-AI (parsing, formatting, the relationship graph, complexity scoring, the metrics dashboard, CTE analysis, all exports) stays available.

**Why the cost-based rule was withdrawn**: it keyed on `aiConfig.provider !== 'ollama'`, but `ollama` is the **default** provider (`src/lib/ai/aiConfig.ts`). The rule therefore left 11 of 16 capabilities open to a brand-new guest and locked almost none — it looked like a restriction while changing very little, and it leaked through `assertGuestEntitled` in `aiService.ts`, which returned early for a local provider before the entitlement check ran. Option C removes that ambiguity: the rule no longer depends on a setting a guest can change at any moment.

**Consequence for clarification 4 above**: superseded. The Docs Consultant, Database AI Assistant, speech, format-error AI and every configurable AI surface are now resolved by the same rule rather than by provider inspection.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Evaluate the tool without signing up (Priority: P1)

A visitor who has no company account reaches the sign-in page, does not want to create one, and currently has no way to look at the product. They see a clearly-worded link reading "I don't have an account, but still want to use" alongside the sign-in form. They activate it, read a short notice explaining which capabilities need an account, confirm, and land in the SQL workspace where they can paste a query and immediately see parsing results, the relationship graph, complexity scoring, and the metrics dashboard.

**Why this priority**: This is the entire value of the feature. Every other story is a refinement of what happens after this path opens; without it there is no product change at all. The current application offers no way to evaluate it without credentials.

**Independent Test**: Fully testable by loading the sign-in page as a signed-out visitor, activating the guest link, confirming the notice, and confirming that a pasted query produces parsing and complexity results with no AI feature reachable. Deliverable alone as a working evaluation path.

**Acceptance Scenarios**

1. **Given** a signed-out visitor on the sign-in page, **When** they look at the sign-in form, **Then** a link reading "I don't have an account, but still want to use" (in the active display language) is visible within the form, and it is reachable by keyboard with a visible focus indicator.
2. **Given** a signed-out visitor, **When** they activate the guest link, **Then** a dialog appears explaining which capabilities are unavailable and why, and no part of the workspace is shown until they confirm.
3. **Given** the guest notice is showing, **When** the visitor confirms, **Then** they are taken to the SQL workspace and can immediately run SQL analysis, view the relationship graph, review complexity metrics, and export results.
4. **Given** a guest is in the workspace, **When** they view the application chrome, **Then** the interface makes clear they are a guest and which capabilities are locked, rather than leaving locked features looking broken.

### User Story 2 - Understand precisely what is unavailable and why (Priority: P2)

A guest activates a capability that draws on the operator's shared AI capacity — the Docs Consultant chat, the Database AI Assistant, or a cloud-backed explain/optimize run — expecting it to work. Instead of a silent failure, a spinner, or a generic error, they receive an immediate, specific explanation that the feature requires an account, a one-click path to sign in, and a visible list of what they *can* still do — including, if they run a local model on their own machine, the AI features that remain open to them. They understand the limit is intentional and know their own work is unaffected.

**Why this priority**: A guest who hits a wall without explanation concludes the product is broken and leaves. A guest who understands the boundary is far more likely to convert to a real account, which is the commercial point of offering guest access. This also makes the restriction feel fair rather than arbitrary.

**Independent Test**: Fully testable as a guest by activating each shared-capacity capability in turn and confirming that each produces the specific "requires an account" explanation, the sign-in path, and the list of still-available capabilities — without any request being made to shared capacity.

**Acceptance Scenarios**

1. **Given** a guest viewing a locked shared-capacity capability, **When** they activate it, **Then** they see a message stating the feature requires an account, with a one-click option to sign in and continue as an authenticated user, and the capabilities they retain.
2. **Given** a guest, **When** they activate a locked shared-capacity capability, **Then** no request is sent to any shared AI capacity and no error, spinner, or empty result is shown.
3. **Given** a guest who runs a local model on their own machine, **When** they use an AI feature that targets that local model, **Then** it works normally, and the interface does not present it as locked.
4. **Given** a guest, **When** they open the settings area where AI providers are configured, **Then** shared-capacity provider and credential configuration is not presented as usable and the reason is stated, while their own local AI endpoint remains configurable.
5. **Given** a signed-in user (account or demo credentials), **When** they activate the same AI capability, **Then** it behaves exactly as it does today, with no guest restriction applied.

---

### User Story 3 - The restriction cannot be bypassed (Priority: P3)

An operator is paying for cloud AI capacity and cannot absorb anonymous usage. Someone technically inclined opens the developer tools, clears the browser's stored guest flag, or calls the shared-capacity AI endpoints directly, and attempts to use them while unverified. The attempt is refused by the application itself, before any shared model capacity is consumed, and the refusal is recorded so the operator can see it.

**Why this priority**: Without this, the feature silently becomes an open, unmetered proxy to paid model capacity — an unbounded cost exposure that the interface alone cannot prevent. It ranks below the user-facing stories because the visible value is delivered without it, but it is the difference between a safe feature and an incident.

**Independent Test**: Fully testable without a browser by calling the shared-capacity AI endpoints directly with no valid session and confirming each is refused with a clear response and that no shared model request is made. Can be verified independently of the interface work.

**Acceptance Scenarios**

1. **Given** a request to any shared-capacity AI endpoint with no valid session, **When** the request is made, **Then** it is refused with a clear "authentication required" response and no shared model capacity is consumed.
2. **Given** a caller who has cleared or forged the guest marker in their browser, **When** they attempt a shared-capacity AI request, **Then** the request is refused exactly as in the no-session case, because the refusal does not depend on browser-held state.
3. **Given** a guest whose own local model is configured, **When** they make a request to their own machine's model, **Then** it is not treated as shared capacity and is not refused on session grounds.
4. **Given** repeated refused shared-capacity requests from an unverified caller, **When** they are refused, **Then** each refusal is recorded in a form an operator can review.
5. **Given** a signed-in user, **When** they make a shared-capacity AI request, **Then** it succeeds exactly as it does today.


### Edge Cases

- **Guest activates the link while a stale/expired real session exists** — the guest path takes precedence and the stale session is discarded rather than silently restored.
- **Guest switches the display language** — the guest link, the notice dialog, and every locked-feature message follow the selected language, including both supported languages from first release.
- **Guest opens a deep link directly** (for example, the assistant page by URL) — the application admits them to the workspace shell but shows the locked explanation instead of the shared-capacity AI feature; the route must not crash or render a broken panel.
- **Guest presses browser Back after confirming** — they are returned to the sign-in page, which recognises the active guest session and offers to resume rather than appearing signed out.
- **Local AI (Ollama) is running on the visitor's own machine** — a guest is **allowed** to use it, because the visitor bears the compute cost and the operator is exposed to no metered spend. The restriction follows who pays, not whether the feature is called "AI".
- **Guest has a local model configured but the feature defaults to a shared provider** — the guest is not silently switched to their local model; the feature is locked with the explanation, and the guest may point that feature at their own local model to use it.
- **Guest has no local model at all** — every shared-capacity AI feature is locked, and the disclosure already told them so before they entered.
- **Guest attempts to save preferences, including shared-capacity AI provider settings** — preferences persist normally; shared-capacity provider and credential values are not editable and are not applied to guest requests, while a guest's local AI settings continue to be honoured.
- **Dialog dismissed without confirming** — the visitor stays signed out on the sign-in page and no guest session is created; no partial state is left behind.
- **Two tabs, one confirming the guest session while the other still shows the notice** — both tabs converge on the same session state after the change.
- **Guest session and the "sign in" call to action** — signing in from a locked feature clears the guest marker and establishes an authenticated session; the guest is never silently upgraded into an authenticated session, and vice versa.
- **Guest reaches a feature while the network is offline** — the locked explanation is shown from local state; it must not depend on a server round-trip to be displayed.
- **Screen reader / keyboard-only guest** — the notice dialog traps focus, announces its purpose, and the guest link and all locked-feature states are fully operable without a pointer.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The sign-in form MUST present a link, in the active display language, reading "I don't have an account, but still want to use", as a peer of the existing sign-in actions.
- **FR-002**: The guest link MUST be reachable and operable by keyboard alone, with a visible focus indicator, and MUST meet the same accessibility bar as the rest of the sign-in form.
- **FR-003**: Activating the guest link MUST NOT immediately start a guest session; it MUST first present a disclosure dialog.
- **FR-004**: The disclosure dialog MUST state, in the active display language, which capabilities are unavailable to a guest.
- **FR-005**: The disclosure dialog MUST name the specific unavailable capabilities rather than referring to them generically, so the guest knows precisely what they are giving up, and MUST state that AI running on the guest's own machine remains available.
- **FR-006**: The disclosure dialog MUST state the reason the restriction exists.
- **FR-007**: The disclosure dialog MUST offer a confirm action that starts the guest session, and a dismiss action that leaves the visitor signed out with no session created and no partial state left behind.
- **FR-008**: Confirming MUST take the guest to the SQL workspace and MUST NOT require any credential entry.
- **FR-009**: A guest MUST be able to perform all non-AI capabilities without restriction, including SQL parsing and formatting, relationship graph exploration, complexity scoring, metrics dashboard, CTE analysis, all export formats, and any AI capability running on the guest's own machine.
- **FR-010**: The application MUST visibly and persistently indicate guest status for the duration of a guest session, in the application chrome.
- **FR-011**: Every capability that consumes the operator's shared AI capacity MUST be non-functional for a guest, and activating one MUST produce a specific "this feature requires an account" explanation with a one-click path to sign in.
- **FR-012**: That explanation MUST also state which non-AI capabilities remain available, and MUST distinguish the locally-run AI a guest can still use from the shared-capacity features they cannot.
- **FR-013**: Activating a locked capability as a guest MUST NOT result in a network request to any shared AI capacity, and MUST NOT present a spinner, a generic error, or an empty result.
- **FR-014**: The "requires an account" explanation MUST be presentable without a network round-trip, so it remains available offline.
- **FR-015**: When a guest is admitted to a route whose primary content is a shared-capacity AI feature, the application MUST show the locked explanation in place of that content and MUST NOT render a broken or crashed view.
- **FR-016**: Configuration of shared-capacity AI providers and credentials MUST NOT be presented as editable to a guest, and the reason MUST be stated; the guest's own local AI endpoint MUST remain configurable, since the guest bears its cost.
- **FR-017**: A guest's preferences MUST persist normally; shared-capacity AI provider and credential values MUST NOT be applied to any guest request, while a guest's local AI settings MUST continue to be honoured.
- **FR-018**: Signing in from within a locked-feature explanation MUST clear the guest marker and establish an authenticated session, and MUST NOT leave guest state behind.
- **FR-019**: Ending a guest session (sign out) MUST return the visitor to the sign-in page and MUST fully clear guest state.
- **FR-020**: On returning to the sign-in page with an active guest session, the application MUST offer to resume the guest session rather than appearing signed out.
- **FR-021**: The guest link, the disclosure dialog, and every locked-feature explanation MUST be available in each supported display language and MUST follow a language change without a reload.
- **FR-022**: The restriction MUST be enforced independently of browser-held state: a request for shared-capacity AI presented without a valid server-verifiable session MUST be refused.
- **FR-023**: Enforcement of FR-022 MUST occur before any shared model capacity is consumed, so a refused request costs the operator nothing.
- **FR-024**: A refusal under FR-022 MUST return a clear, distinguishable response identifying the cause as missing authentication.
- **FR-025**: Refusals under FR-022 MUST be recorded in a form the operator can review.
- **FR-026**: An authenticated user, whether signed in through a real identity provider or the existing demo credentials, MUST experience no change to any AI capability.
- **FR-027**: The existing demo-credential sign-in path MUST remain available and unchanged.
- **FR-028**: The application MUST NOT expose any shared cloud AI credential to the browser under any session type, including the guest session.

### Key Entities

- **Guest session**: A marker carried on the existing browser-held session that records that the visitor is present and unverified, together with the time the guest session started and the selected display language. It is not an identity, grants no shared-capacity AI entitlement, and is stored and cleared through the existing session model rather than as a new session type.
- **Session (existing)**: The current browser-held sign-in state — either the demo-admin marker or a social identity session with a provider, display name, email, and expiry. Unchanged by this feature, and now also able to carry a guest marker.
- **Capability**: A named product function with an entitlement requirement. Classified by **who bears the cost**: non-AI (available to everyone, including a guest), local-AI (runs on the guest's own machine, available to a guest), or shared-capacity AI (consumes the operator's capacity, requires an authenticated session). The classification is the single source of truth for what a guest may use.
- **Locked-feature explanation**: The reusable, localized notice shown when a guest activates a shared-capacity capability they are not entitled to, carrying the reason, the sign-in path, and the list of retained capabilities.
- **Refusal record**: An operator-visible entry created whenever a shared-capacity AI request is refused for want of a valid session, capturing when it happened and what was refused.


## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor with no account can go from the sign-in page to analysing their own SQL, with no credential entry, in under 60 seconds.
- **SC-002**: 100% of shared-capacity AI capabilities are unreachable by a guest, verified by activating every one of them and confirming each is refused with an explanation and no request made to shared capacity.
- **SC-003**: 0 shared-capacity AI requests from a guest reach any model or metered cloud service, confirmed by server-side records over a full test pass.
- **SC-004**: 0 requests to shared-capacity AI endpoints without a valid session succeed, verified by direct calls with cleared and forged session state.
- **SC-005**: 100% of guest-visible messages appear in every supported display language, with no untranslated text.
- **SC-006**: A guest who activates a locked feature understands the restriction and how to lift it, measured by the explanation presenting the reason, the sign-in path, and the retained capabilities in a single view without further navigation.
- **SC-007**: Every guest-visible interactive element is fully operable by keyboard alone, with a visible focus indicator, and the disclosure dialog is announced correctly by a screen reader.
- **SC-008**: Authenticated users report no change in behaviour or capability for any AI feature after this feature ships.
- **SC-009**: Every refused unauthenticated shared-capacity request is reviewable by the operator without needing to reconstruct events from raw logs.
- **SC-010**: Guest and authenticated users can be told apart by the operator in any refusal record, with 100% accuracy.
- **SC-011**: A guest running a local model on their own machine can complete a local AI task end to end, with no restriction notice shown, verified on a real local endpoint.

## Assumptions

- The existing browser-held session model (the demo-admin marker and the social identity session in browser storage) remains as-is; this feature does not introduce server-side accounts, and the real identity provider path is unchanged.
- Because the current session is browser-held, the server cannot independently distinguish "guest" from "signed in" without a change to the request path; making the server the enforcement point is therefore in scope, while building full server-side sessions is explicitly out of scope.
- The restriction follows **who bears the cost**, not whether a feature is labelled "AI". Capabilities classified as non-AI, and AI capabilities that run entirely on the guest's own machine, remain available to a guest. Only capabilities that consume the operator's shared capacity are restricted.
- A guest is assumed to be running a local model on their own hardware only if they have configured it; the application does not attempt to detect or probe a local model on the guest's behalf, and a guest with no local model simply finds every shared-capacity feature locked.
- A guest is never silently re-pointed from a shared provider to a local one. If a feature would consume shared capacity it is locked, and unlocking it is the guest's explicit choice via their own local configuration.
- The guest session is a marker on the existing browser-held session rather than a new session type or lifecycle; it carries the guest status, the session start time, and the selected display language, and is cleared by the existing sign-out path.
- "AI-backed" includes any capability that reaches a language model or embedding model, including retrieval-augmented retrieval steps and text-to-speech, and remains subject to the cost rule above.
- The guest session lives only in the browser, is lost when browser storage is cleared, and is not synchronised across devices.
- Guest activity produces no server-side record of the guest's own queries beyond the operational refusal records needed for FR-025; analytics of guest behaviour is out of scope.
- The disclosure dialog is a one-time acknowledgement before the session starts, not a recurring prompt and not a browsable activity history.
- Both existing display languages are supported from first release, following the project's existing localisation approach of flat typed keys per locale.
- Rate limiting and abuse controls beyond the refusal records are out of scope for this feature.
- Monetisation, trial conversion mechanics, and any upgrade path beyond the sign-in link are out of scope.
