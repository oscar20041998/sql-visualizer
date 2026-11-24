# UI and Behavior Contracts

## Entry and compatibility

- Existing `/query-input`, MyBatis, SQL analysis, routes, history, sidebar state and appearance controls remain functional. Object analysis is an additive workspace flow, not an automatic reinterpretation of existing queries.
- The dialect selector is shared. The user can submit multiple definitions in one paste and multiple files; new supported SQL text import must not change the existing XML import. Show per-file read errors; reject unsafe or unsupported input visibly.
- Before applying a proven duplicate identity, display the existing and incoming definition identity and offer **keep** or **replace**. Ambiguous names cannot be silently merged. A rejected or cancelled import leaves existing session content unchanged.
- In-app navigation retains the in-memory collection; reload/close clears it. Signing out or changing identity also clears it. Adding definitions alone does not save to history.

## Analysis

- Request: active session, source revisions, explicit dialect and optional chosen object type. No SQL execution and no live-database connection.
- Response per object: detection confidence, status (`full`, `partial`, `unsupported`), reasons, available source and evidence. Invalid/unknown/unsupported input must not yield success-shaped fabricated details.
- Extracted statement selection, source search/copy, line navigation, available metadata, findings and complexity use original source locations when known. Unknown is never displayed as zero.
- Loading, empty, unsupported, partial and stage-specific failure states identify what is available and the next action. Analysis results cannot replace a newer revision after an asynchronous race.

## Dependency and impact

- One evidence-backed result feeds graph and searchable list. Edge direction is source → referenced target; operation and confidence are included when known.
- Dependency traversal follows outgoing edges; impact follows incoming edges over the supplied known collection. Cycle, ambiguous target, unknown definition and partial coverage are visible. No claims of complete global or runtime impact.

## AI

- Explicit actions: explain, explain finding, optimize, refactor, dependency explanation, risk and summary. Existing provider config and permissions apply.
- Before the first new external-provider send per session, show provider/data scope; confirm or cancel. Provider changes require new confirmation; cancellation causes zero outbound requests. No secret/source logging; external transmission is not enabled merely by importing a file.
- Clearly label AI output, evidence and limitations. Original/suggested comparison and copy precede explicit apply. A stale suggestion cannot silently overwrite newer source. A failed request leaves deterministic results available.

## Accessibility, localization and design

- Retain `design.md`, theme/accent, approved compact tabs, dialect/Tips placement and 50/50 SQL input/review. Use Hallmark for additive design; seek user confirmation before visual changes are finalized.
- Vietnamese and English parity, keyboard access, visible focus, contrast and reduced motion are required. The graph has an accessible list alternative. At narrow widths panels stack or scroll without clipping content; desktop workspace remains usable.
