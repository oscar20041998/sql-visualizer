# Hallmark design decisions

**Hallmark · v2.0.0**

- **Redesign** · full · application workbench screens; keep all existing route and component wiring.
- **Before** · the current product uses dark, border-heavy surfaces; the shared tokens support both themes, but current polish and presentation have not yet been rendered by Hallmark.
- **Keeps** · every feature, label, action, field, handler, route, persisted preference and theme/accent behavior.
- **Files** · changed in this pass: `src/styles/tailwind.css`, `src/styles/tokens.css`, `tailwind.config.js`, shared shell/navigation, home, query input, login, settings, and SQL metrics presentation. No route or feature wiring was removed.
- **Screen** · SQL-analysis workbench with its existing query entry and analysis results; preserve current data and destinations.
- **Material** · real: existing SQL Visualizer product and its routes/assets; audience: SQL developers and database practitioners; use: analyze and explore SQL. No new customer claims, metrics, quotations or logos.
- **Direction** · modern-minimal, derived from the existing developer-tool product; keep Geist/Geist Mono, semantic light/dark tokens and user-selected accent. Use restrained surfaces and clear workbench hierarchy, not marketing-page structures.
- **Inference** · no new screenshots, claims, or content were provided; the existing interface is the source material. Tone inferred as practical and technical.
- **Signature** · the live SQL workbench preview remains the home-page visual; application screens retain their existing fields, actions, results, and route wiring.
- **Sweep** · final static lint covered all 44 changed TSX/CSS files: 0 FAIL, 0 REFLEX, 0 WARN, 1 DISMISSED (existing legal footer copy retained). The final home render completed with five screenshots across the Hallmark fold and full-page sizes. Protected workspace routes were not rendered in an authenticated browser context; full-product browser journeys, one-GPU performance, and user evaluation remain pending.
