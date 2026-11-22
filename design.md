# Design: SQL Visualizer

The locked system. Every Hallmark run reads this first and pages share it. Change it on purpose; the file is the rule.

## System
- Genre: modern-minimal
- Shape of the first page: app screen, SQL workbench
- Theme: existing SQL Visualizer brand and semantic theme tokens
- Axes: cool neutral surfaces / Geist / user-selected accent · posture: workbench

## Tokens
The semantic palette lives in `src/styles/tailwind.css`; `html[data-theme='light']` selects the light palette, and the theme provider keeps the user-selected accent dynamic. `src/styles/tokens.css` maps the shared scale and surface roles onto those variables:

```css
:root {
  --color-paper: var(--background);
  --color-paper-2: var(--card);
  --color-paper-3: var(--muted);
  --color-ink: var(--foreground);
  --color-ink-2: var(--secondary-foreground);
  --color-muted: var(--muted-foreground);
  --color-rule: var(--border);
  --color-accent: var(--primary);
  --color-accent-ink: var(--primary-foreground);
  --color-focus: var(--ring);
  --font-display: var(--font-geist-sans), 'Geist', sans-serif;
  --font-body: var(--font-geist-sans), 'Geist', sans-serif;
  --font-outlier: var(--font-geist-mono), 'Geist Mono', monospace;
  --radius-card: calc(var(--radius) + 2px);
  --radius-pill: 999px;
  --rule-hair: 1px;
  --shadow-card: 0 8px 24px color-mix(in oklab, var(--color-ink) 8%, transparent);
}
```

The spacing, type, easing, duration, and radius scales also live in `src/styles/tokens.css`.

## Controls
- Primary: semantic primary fill · `rounded-md` · minimum 44px height
- Secondary: semantic border and surface · same radius and minimum height
- Focus: visible ring from the active theme; never fade the ring in

## Motion
- Character: calm; use transform and opacity only.
- Honor `prefers-reduced-motion`; content remains visible without animation.

## Exports
`src/styles/tokens.css` and the semantic Tailwind mappings in `tailwind.config.js`.
