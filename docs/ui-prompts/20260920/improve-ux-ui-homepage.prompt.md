## 16. INTERNATIONALIZATION — VIETNAMESE & ENGLISH

The homepage MUST fully support two languages:

- Vietnamese (`vi`)
- English (`en`)

Internationalization is a mandatory product requirement, not an optional enhancement.

### 16.1 Reuse Existing i18n Architecture

Before implementation:

1. Inspect the existing i18n implementation.
2. Identify the current locale structure.
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

### 16.2 Translation Keys

Every user-facing string introduced or modified on the homepage MUST use a translation key.

Use a clear semantic structure such as:

```text
home.nav.home
home.nav.features
home.nav.guide
home.nav.examples
home.nav.documentation

home.hero.badge
home.hero.title
home.hero.description
home.hero.primaryCta
home.hero.secondaryCta

home.stats.analysis
home.stats.realtime
home.stats.databases

home.workflow.label
home.workflow.title
home.workflow.description
home.workflow.step1.title
home.workflow.step1.description
home.workflow.step2.title
home.workflow.step2.description
home.workflow.step3.title
home.workflow.step3.description
home.workflow.step4.title
home.workflow.step4.description

home.features.label
home.features.title
home.features.description
home.features.queryAnalysis.title
home.features.queryAnalysis.description
home.features.relationship.title
home.features.relationship.description
home.features.executionPlan.title
home.features.executionPlan.description
home.features.optimization.title
home.features.optimization.description
home.features.mybatis.title
home.features.mybatis.description
home.features.history.title
home.features.history.description
home.features.aiAssistant.title
home.features.aiAssistant.description

home.databases.label
home.databases.title
home.databases.description

home.cta.title
home.cta.description
home.cta.primary
home.cta.secondary
```

The exact naming can be adapted to the existing project's i18n conventions.

Do NOT introduce a new naming convention if the project already has one.

### 16.3 Both Languages Are Required

Every new translation key MUST have both:

```text
vi
en
```

Example:

```json
{
  "home": {
    "hero": {
      "title": {
        "vi": "Phân tích truy vấn SQL chưa bao giờ trực quan như thế",
        "en": "SQL query analysis has never been this visual"
      }
    }
  }
}
```

Do not implement one language first and leave the other incomplete.

The feature is considered incomplete if either language is missing.

### 16.4 Runtime Language Switching

When the user switches:

```text
VI → EN
```

or:

```text
EN → VI
```

the homepage MUST update immediately without requiring a page reload,
unless the existing application architecture explicitly requires one.

All homepage sections must update consistently:

- navigation
- hero
- CTA
- statistics
- workflow
- feature cards
- database section
- footer
- tooltips
- accessibility labels
- buttons
- empty states
- error states

There must be no mixture such as:

```text
English navigation
+
Vietnamese hero
+
English buttons
```

### 16.5 Language Persistence

Reuse the application's existing locale persistence mechanism.

If the application already persists the selected language,
the homepage MUST respect it.

Do not create another localStorage key or another language preference.

### 16.6 English Text Expansion

The layout MUST be designed to support different text lengths.

English may be:

- longer
- shorter
- structurally different

Do not rely on fixed widths designed only for Vietnamese.

Avoid:

- hard-coded text widths
- excessive `white-space: nowrap`
- fixed-height cards that clip text
- absolute positioning based on text length
- language-specific margin hacks

Cards, buttons, navigation items, headings and hero content must gracefully adapt to both languages.

### 16.7 Typography

Verify typography in both languages.

Vietnamese requires proper Unicode rendering and diacritics.

Ensure:

- Vietnamese characters render correctly
- English characters render correctly
- line-height remains readable
- headings do not clip
- buttons do not truncate
- cards do not overflow

Do not use an icon font or custom font that breaks Vietnamese glyphs.

### 16.8 Technical Terms

Technical product terms should remain consistent between languages where appropriate.

Do NOT translate technical identifiers such as:

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

### 16.9 User Data Must Not Be Translated

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

The language switch affects the APPLICATION UI,
not the user's SQL or technical data.

### 16.10 SEO / Metadata

If the homepage supports localized SEO metadata,
provide both Vietnamese and English versions for:

- `<title>`
- meta description
- Open Graph title
- Open Graph description

Reuse the existing SEO/i18n architecture.

### 16.11 Translation Quality

Do not perform literal machine-style translation.

Vietnamese and English should both sound natural for a developer/product audience.

The tone should be:

- professional
- concise
- technical
- modern
- trustworthy

Avoid overly promotional language.

### 16.12 Translation Audit

Before considering the implementation complete, audit the entire homepage for hard-coded user-facing strings.

Search for:

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

### 16.13 Final i18n Acceptance Criteria

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