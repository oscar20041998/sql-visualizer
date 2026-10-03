# SQL Visualizer — Homepage UX/UI Improvement

> A requirements prompt for improving the public landing page (homepage) of the
> SQL Visualizer application.
>
> **Scope**: UI/UX, information architecture, content clarity, and bilingual
> (Vietnamese/English) support.
>
> **Constraint**: Preserve all existing functionality, routing, and data behavior.

---

# ROLE

Act as a Senior Business Analyst with 10+ years of experience in enterprise
software, combined with a Senior Product Designer and a Senior Frontend Engineer.

You are improving the existing SQL Visualizer application's HOMEPAGE — the public
landing page that introduces the product to new and returning developers.

Your task is to improve the homepage's UI/UX and information architecture WITHOUT
removing, breaking, or changing any existing business functionality, routing, or
data behavior.

The goal is not to redesign the product from scratch. The goal is to make the
existing homepage:

- Easier to understand
- Easier to scan
- Clearer about what the product does and why it matters
- More trustworthy
- More professional
- More enterprise-ready
- More consistent with the rest of the application
- More visually structured
- Less cognitively overwhelming

Think like a BA optimizing a conversion and onboarding surface, not a designer
only trying to make the page look beautiful.

---

# IMPORTANT: PRESERVE ALL EXISTING FUNCTIONALITY

DO NOT remove or disable any existing section.

DO NOT change the routing targets of existing actions:

- "Start Analyzing" → `/query-input` (when authenticated) or `/login` (otherwise)
- "View Guidelines" → `/guideline`

DO NOT change the demo-authentication behavior behind the primary CTA.

DO NOT change the language/locale mechanism or its persistence.

DO NOT change SQL analysis, parsing, or dialect behavior (this page is presentational).

DO NOT introduce fake data, fake testimonials, or misleading metrics.

DO NOT replace existing content with placeholders or lorem ipsum.

All existing functionality must continue to work exactly as before.

---

# CURRENT HOMEPAGE

The homepage currently contains these major sections (top to bottom):

1. Header navigation — product logo, name, and tagline.
2. Hero — welcome badge, main headline (with gradient), description, an SQL
   preview panel with an "analysis snapshot" (complexity score, detected
   relationships, recommendation), and two CTAs ("Start Analyzing",
   "View Guidelines").
3. Statistics — three highlighted values (analysis accuracy, real-time
   processing, SQL dialect support).
4. Workflow — eyebrow, title, description, and three steps (Bring your query,
   Inspect the structure, Improve with evidence).
5. Features — title, description, and five feature cards (Query Analysis,
   Relationship Mapping, Metrics Dashboard, Smart Recommendations,
   AI SQL Explainer).
6. SQL dialects — label, title, and logos for MySQL, PostgreSQL, SQL Server,
   and Oracle.
7. Call to action — "Ready to analyze?" headline and supporting text.
8. Footer — copyright line, a Docs link, and a GitHub link.

The existing implementation already provides these capabilities. They MUST remain
available after the improvement.

---

# PRIMARY UX PROBLEMS TO SOLVE

Analyze the current homepage from the perspective of a first-time visitor who
needs to answer three questions quickly:

- "What is this tool?"
- "What will it do for me?"
- "What should I do next?"

Focus on these problems:

## 1. Value proposition clarity

A visitor must understand within seconds what the product does, who it is for,
and why it is better than the alternatives. The headline and description must
communicate a single, concrete value proposition without jargon or vague claims.

## 2. Navigation completeness and clarity

The header currently shows only the product name. A visitor has no obvious way
to jump to key sections (features, guide/examples, documentation). Navigation must
support orientation without overwhelming the visitor.

## 3. Visual hierarchy

The page contains many elements with similar visual weight. Users must immediately
distinguish:

PRIMARY   — what the product does and the main action
SECONDARY — supporting proof (stats, workflow, features)
TERTIARY  — documentation, community, and footer links

Create a clear hierarchy between these levels.

## 4. Reduce cognitive overload

The hero combines a headline, a code preview, an analysis snapshot, statistics,
and CTAs. Break content into scannable chunks with clear visual separation so the
visitor is not overwhelmed.

## 5. Proof and credibility

Statistics and feature claims must be concrete, honest, and self-consistent.
A visitor must be able to trust the numbers and feature descriptions at face
value. Inconsistent counts (for example, a stated number of steps or feature
cards that does not match what is shown) reduce trust.

## 6. Call-to-action clarity

Every section should guide the visitor to a single, obvious next action. The
final call-to-action section must include a real, working action — not only a
headline.

## 7. Consistency with the product design language

The homepage must feel like the same product as the inner application: the same
colors, typography, spacing, borders, and interaction patterns.

## 8. Responsive and accessible behavior

The page must work across mobile, tablet, and desktop, and remain usable for
keyboard and screen-reader users, including meaningful image labels and correct
link-versus-button semantics.

---

# IMPROVEMENT REQUIREMENTS

The requirements below describe WHAT the improved homepage must achieve. They are
intentionally solution-agnostic.

## R1. Navigation

- The header must clearly identify the product and provide obvious paths to the
  primary sections of the homepage (for example: features, guide, examples,
  documentation).
- Navigation must remain usable on mobile.
- Navigation labels must come from the i18n system (see Internationalization).

## R2. Hero

- The hero must communicate the core value proposition in one scannable statement.
- The primary CTA ("Start Analyzing") must be visually dominant.
- The secondary CTA ("View Guidelines") must be clearly secondary.
- The SQL preview must act as supporting proof, not compete with the headline.
- The preview's analysis snapshot must look like real product output, not a placeholder.

## R3. Statistics

- Statistics must be truthful and clearly labeled.
- Each statistic must connect to a concrete product capability.
- Statistics must be scannable and must not dominate the hero.

## R4. Workflow

- The workflow must present a consistent, complete set of steps.
- The number of steps shown must match the product's actual workflow, and the
  supporting copy must not contradict the structure.

## R5. Features

- The features section must present a consistent, complete set of feature cards.
- Each card must have a clear title and a concise, benefit-oriented description.
- Cards must wrap gracefully across breakpoints.

## R6. SQL dialects

- The dialect section must clearly communicate the supported databases.
- Logos must have accessible, meaningful labels.

## R7. Call to action

- The final CTA section must include a clear, working primary action that routes
  the visitor to the next step (start analyzing or view guidelines).
- The action must respect the existing authentication flow.

## R8. Footer

- The footer must provide standard links (documentation, source/community, contact)
  using proper link semantics and accessible labels.

## R9. Cross-cutting quality

- Maintain a clear visual hierarchy across all sections.
- Use consistent spacing, typography, and color tokens from the existing design system.
- Ensure dark mode and light mode both look intentional.
- Ensure the page is responsive across mobile, tablet, and desktop.
- Respect reduced-motion preferences for decorative animations.
- Fix accessibility issues: meaningful image labels, correct link/button semantics,
  visible focus states, and sufficient color contrast.

---

# VALIDATION

After implementation, verify:

## Functional

- "Start Analyzing" routes correctly (authenticated → `/query-input`, otherwise → `/login`).
- "View Guidelines" routes to `/guideline`.
- Footer links work (Docs, GitHub).
- No existing section is removed or broken.
- No fake data, testimonials, or metrics are introduced.

## UI

- Desktop: 1280px, 1440px, 1920px
- Tablet: 768px, 1024px
- Mobile: 375px, 414px
- Dark mode and light mode
- Vietnamese and English

## Accessibility

- All meaningful images have alternative text.
- Interactive elements use correct semantics (links vs. buttons).
- Keyboard navigation follows a logical order.
- Focus states are visible.
- Decorative animations respect reduced-motion preferences.

## Technical

Run:

```text
npm run type-check
npm run lint
npm run test
```

Fix regressions introduced by the changes.

---

# SUCCESS CRITERIA

The improved homepage must:

- Communicate what the product does and who it is for within the first five seconds of viewing.
- Present a single, obvious primary action on first load.
- Show a consistent and complete set of workflow steps and feature cards (no mismatched counts).
- Load and render correctly in Vietnamese and English without layout breakage.
- Work correctly on mobile, tablet, and desktop.
- Pass keyboard and screen-reader accessibility checks.
- Feel consistent with the inner application (colors, typography, spacing, motion).
- Increase perceived trust: every statistic and claim is truthful and self-consistent.

Most importantly:

Do NOT redesign for visual novelty.

Redesign for:

"First-impression clarity, developer trust, and an obvious next step."

---

# INTERNATIONALIZATION — STRICT REQUIREMENT

The SQL Visualizer application is bilingual and MUST fully support two languages:

- Vietnamese (`vi`)
- English (`en`)

Internationalization is a mandatory product requirement, not an optional enhancement.

## Reuse Existing i18n Architecture

Before implementation:

1. Inspect the existing i18n implementation (`getT` and the locale resources).
2. Identify the current locale structure and key naming convention.
3. Identify how language switching works.
4. Identify how the current language is persisted.
5. Reuse the existing i18n system.

DO NOT:

- create a second i18n system
- create a separate language state
- hard-code translations inside components
- duplicate components for Vietnamese and English
- use conditional rendering such as:

```ts
if (language === 'vi') {
  return '...';
}
```

All translations MUST use the existing translation mechanism.

## Translation Keys

Every user-facing string introduced or modified on the homepage MUST use a
translation key.

The project already uses a flat, semantic `home*` key convention (for example
`homeMainHeading`, `homeGetStartedButton`, `homeQueryAnalysisTitle`). Follow the
existing convention. Do NOT introduce a new naming convention.

Every new key MUST cover all homepage content, including:

```text
home* — navigation (app name, tagline, section links)
home* — hero (badge, heading, description, CTAs, preview labels)
home* — statistics (labels and values)
home* — workflow (eyebrow, title, description, step titles and descriptions)
home* — features (title, description, and each feature card)
home* — dialects (label, title)
home* — call to action (title, description, button)
home* — footer (copyright, docs, GitHub, contact)
```

If the project later adopts a nested structure, a clear semantic grouping may be
used, for example:

```text
home.nav.home
home.nav.features
home.hero.title
home.features.queryAnalysis.title
```

But the nested form is illustrative only. The existing flat convention takes
precedence.

## Both Languages Are Required

Every new translation key MUST have both `vi` and `en` values.

Example:

```json
{
  "homeMainHeading": {
    "vi": "Phân tích truy vấn SQL chưa bao giờ trực quan như thế",
    "en": "Analyze SQL queries like never before"
  }
}
```

Do not implement one language first and leave the other incomplete. The feature
is considered incomplete if either language is missing.

## Runtime Language Switching

When the user switches VI → EN or EN → VI, the homepage MUST update immediately
without requiring a page reload, unless the existing application architecture
explicitly requires one.

All homepage sections must update consistently:

- navigation
- hero
- CTAs
- statistics
- workflow
- feature cards
- dialect section
- footer
- tooltips
- accessibility labels
- buttons
- empty states
- error states

There must be no mixture such as English navigation with Vietnamese hero content
and English buttons.

## Language Persistence

Reuse the application's existing locale persistence mechanism. If the application
already persists the selected language, the homepage MUST respect it. Do not
create another storage key or another language preference.

## English Text Expansion

The layout MUST support different text lengths. English may be longer, shorter,
or structurally different from Vietnamese.

Do not rely on fixed widths designed only for Vietnamese. Avoid:

- hard-coded text widths
- excessive `white-space: nowrap`
- fixed-height cards that clip text
- absolute positioning based on text length
- language-specific margin hacks

Cards, buttons, navigation items, headings, and hero content must gracefully adapt
to both languages.

## Typography

Verify typography in both languages. Vietnamese requires proper Unicode rendering
and diacritics. Ensure:

- Vietnamese characters render correctly
- English characters render correctly
- line-height remains readable
- headings do not clip
- buttons do not truncate
- cards do not overflow

Do not use an icon font or custom font that breaks Vietnamese glyphs.

## Technical Terms

Technical product terms should remain consistent between languages where
appropriate. Do NOT translate technical identifiers such as:

```text
SQL
MySQL
PostgreSQL
SQL Server
Oracle
MyBatis
CTE
JOIN
SELECT
INSERT
UPDATE
DELETE
API
AI
```

These are product/technical terminology, not ordinary UI copy.

## User Data Must Not Be Translated

Never translate:

- user-entered SQL
- SQL queries
- table names
- column names
- database names
- query parameters
- MyBatis XML
- error messages returned directly from external systems
- AI-generated technical content unless the existing application explicitly supports AI response localization

The language switch affects the APPLICATION UI, not the user's SQL or technical data.

## SEO / Metadata

If the homepage supports localized SEO metadata, provide both Vietnamese and
English versions for:

- `<title>`
- meta description
- Open Graph title
- Open Graph description

Reuse the existing SEO/i18n architecture.

## Translation Quality

Do not perform literal machine-style translation. Vietnamese and English should
both sound natural for a developer/product audience. The tone should be:

- professional
- concise
- technical
- modern
- trustworthy

Avoid overly promotional language.

## Translation Audit

Before considering the implementation complete, audit the entire homepage for
hard-coded user-facing strings. Search for:

- plain text inside JSX/HTML
- button labels
- headings
- descriptions
- tooltips
- aria-labels
- placeholders
- error messages
- badges
- navigation labels

Every user-facing string MUST come from the i18n system.

## Final i18n Acceptance Criteria

The homepage is NOT complete until:

- [ ] Vietnamese (`vi`) works
- [ ] English (`en`) works
- [ ] Language switching works
- [ ] Existing locale persistence works
- [ ] No hard-coded UI strings remain
- [ ] Every translation key has both languages
- [ ] No missing translation fallback occurs
- [ ] No mixed-language UI occurs
- [ ] English text does not break the layout
- [ ] Vietnamese diacritics render correctly
- [ ] Mobile layout works in both languages
- [ ] Desktop layout works in both languages
- [ ] Accessibility labels are translated
- [ ] SEO metadata is localized where supported
- [ ] All technical terms remain consistent between languages

---

# PRIORITY ORDER

Implement improvements in this exact priority:

P0:

1. Hero value proposition and CTA clarity
2. Navigation completeness
3. Visual hierarchy across sections
4. Consistent workflow and feature counts
5. Final CTA action

P1:

6. Statistics clarity and labeling
7. SQL dialect logo accessibility
8. Footer link semantics
9. Responsive behavior
10. Accessibility improvements

P2:

11. Micro-interactions and polish
12. Reduced-motion handling
13. Minor visual refinement

Do NOT spend significant time on P2 until P0 and P1 are completed.



