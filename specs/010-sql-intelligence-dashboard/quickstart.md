# Quickstart: SQL Intelligence Dashboard Validation

**Feature**: [spec.md](./spec.md) | **Contracts**: [dashboard-data.md](./contracts/dashboard-data.md), [ai-insights.md](./contracts/ai-insights.md) | **Data model**: [data-model.md](./data-model.md)

## Prerequisites
- Node.js + npm; repository root.
- Ollama running locally with the configured model (default `qwen2.5-coder:7b`) — **optional**: every deterministic check below must pass with Ollama stopped.

## Setup
```bash
npm install
npm run dev        # http://localhost:4028
```

## Automated validation
```bash
npm test           # includes complexityNormalization, dashboardData, dashboardCapability, sqlMetricsDashboard suites
npm run type-check
npm run lint
```

## Manual end-to-end checks (trace to spec scenarios)
1. **Health summary (US1 / SC-001 / SC-002)** — analyze a complex query on `/query-input`, open `/sql-metrics-dashboard`: the first viewport shows one normalized score (X / 100 + level) and error/warning counts; no "483 / 95"-style display remains anywhere (also check the guideline page and the smart-sql-editor comparison panels).
2. **Top findings (US2 / SC-004)** — visible without scrolling, errors before warnings, occurrence counts shown; activating a location highlights the SQL source line.
3. **Contributors (US3 / SC-005)** — ranked by points descending; shares consistent with the raw score shown in Advanced Details.
4. **Tabs & capabilities (US4)** — only supported tabs render; the dependencies section communicates partial support; no fake zeros anywhere.
5. **States (FR-016)** — no analysis → empty guidance; during analysis → skeletons (no fake metrics); analyzer failure → error + retry; AI stopped → the full deterministic dashboard works and the AI panel degrades gracefully.
6. **i18n (US7 / SC-007)** — switch vi ↔ en in settings: every new label translates, SQL terms stay untranslated, and the layout tolerates English text expansion.
7. **Apply as new version (US6 / SC-011, with Ollama)** — request optimization → compare / copy / apply → history gains a new entry; the original SQL remains in history and is recoverable.
8. **Performance (SC-009)** — paste a 50+ table query: the dashboard renders within ~1 second of analysis completion.

Expected outcomes map to spec.md SC-001…SC-011.