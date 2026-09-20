# ROLE

Act as a Senior Business Analyst with 10+ years of experience in enterprise software,
combined with a Senior Product Designer and Senior Frontend Engineer.

You are improving the existing SQL Visualizer application.

The attached screenshot represents the CURRENT UI of the "Nhập & Cấu hình truy vấn"
(Query Input / SQL Analysis Input) page.

Your task is to improve the UI/UX and information architecture of this page WITHOUT
removing, breaking, or changing any existing business functionality.

The goal is not to redesign the product from scratch.

The goal is to make the existing product:

- Easier to understand
- Easier to scan
- Easier to operate
- More professional
- More enterprise-ready
- More consistent
- More visually structured
- Less cognitively overwhelming

Think like a BA who is optimizing a complex enterprise workflow, not like a designer
who is only trying to make the UI look beautiful.

---

# IMPORTANT: PRESERVE ALL EXISTING FUNCTIONALITY

DO NOT remove or disable any existing feature.

DO NOT change business logic.

DO NOT change SQL parsing behavior.

DO NOT change SQL analysis behavior.

DO NOT change SQL dialect behavior.

DO NOT change parameter extraction.

DO NOT change warning/lint rules.

DO NOT change AI behavior.

DO NOT change navigation behavior.

DO NOT change existing API contracts.

DO NOT change Zustand state semantics unless strictly necessary for UI integration.

DO NOT change the data model unless required by the UI improvement.

DO NOT introduce fake data.

DO NOT replace existing components with placeholders.

All existing functionality must continue to work exactly as before.

---

# CURRENT PAGE

The current page contains the following major areas:

1. Page header
   - "Nhập & Cấu hình truy vấn"
   - SQL dialect selector
   - Query history
   - Description

2. Input method tabs
   - Dán SQL trực tiếp
   - Tải tệp MyBatis (XML)
   - Trình soạn thảo thông minh

3. MyBatis XML upload area

4. Uploaded file information

5. Parameter configuration

6. Resolved SQL preview/editor

7. Analyze Query action

8. Template loading

9. Delete/Clear action

10. SQL analysis warnings / best-practice violations

11. Existing navigation and application layout

The current implementation already provides these capabilities.
They MUST remain available after the UI improvement.

---

# PRIMARY UX PROBLEMS TO SOLVE

Analyze the current UI from the perspective of an enterprise developer using this
screen repeatedly during a working day.

Focus on these problems:

## 1. Visual hierarchy

The current page contains many elements with similar visual weight.

Users should immediately understand:

PRIMARY:
    What do I need to provide?

SECONDARY:
    What configuration is required?

RESULT:
    What SQL will actually be analyzed?

FEEDBACK:
    What problems were detected?

ACTION:
    What should I do next?

Create a clear hierarchy between these areas.

---

## 2. Reduce cognitive overload

The page currently exposes a lot of information simultaneously.

Do NOT simply shrink everything.

Instead:

- Group related information
- Collapse secondary information when appropriate
- Use progressive disclosure
- Reduce unnecessary borders
- Reduce visual noise
- Improve spacing
- Establish stronger section hierarchy

The user should be able to scan the page in approximately 3–5 seconds and understand
the workflow.

---

# RECOMMENDED INFORMATION ARCHITECTURE

Reorganize the visual hierarchy around this workflow:

STEP 1
Input SQL / Upload MyBatis XML

        ↓

STEP 2
Configure detected parameters

        ↓

STEP 3
Review resolved SQL

        ↓

STEP 4
Analyze SQL

        ↓

STEP 5
Review detected issues

The UI should visually communicate this flow.

Do NOT necessarily add explicit "Step 1 / Step 2 / Step 3" labels everywhere.

Use visual grouping and hierarchy where appropriate.

---

# HEADER IMPROVEMENT

Improve the page header.

Current concept:

"Nhập & Cấu hình truy vấn"

Keep the existing meaning.

Improve the hierarchy:

Title
Subtitle
Context/actions

The SQL dialect selector should visually belong to the analysis context rather than
looking like an unrelated global control.

Query History should remain accessible but should not compete visually with the
primary workflow.

Recommended hierarchy:

------------------------------------------------
Nhập & Cấu hình truy vấn

Dán SQL hoặc nhập MyBatis XML để bắt đầu phân tích.

                              [ SQL Server ▼ ]
                              [ Lịch sử truy vấn ]
------------------------------------------------

Do not blindly copy this layout.
Adapt it to the existing application structure.

---

# INPUT METHOD TABS

Improve the three input methods:

- Dán SQL trực tiếp
- Tải tệp MyBatis (XML)
- Trình soạn thảo thông minh

The active tab should be extremely clear.

Users should immediately understand:

"What input method am I currently using?"

Use:

- clear active state
- subtle iconography
- consistent height
- consistent spacing
- clear hover state
- keyboard accessibility

Do not make inactive tabs visually dominant.

---

# MYBATIS UPLOAD AREA

Improve the upload area so that the user understands:

1. What file can be uploaded?
2. How can it be uploaded?
3. What happens after upload?
4. What file is currently loaded?

The current implementation supports MyBatis XML.

Preserve:

- drag & drop
- click-to-upload
- supported file formats
- file size behavior
- parsing behavior

Improve only the presentation.

The uploaded file should look like an explicit input state:

[ File icon ] MarketMapper.xml
              2.4 KB
                         [Remove]

Avoid making the uploaded file look like another unrelated card.

---

# PARAMETER CONFIGURATION

This is one of the most important UX areas.

Current implementation displays detected parameters such as:

- systemStartTime
- systemEndTime
- criticalSlippageThreshold
- executionCorrelationId
- maxHealthRatioFilter
- minDrawdownDepthFilter
- maxQueryFetchRowsLimit
- queryPaginationOffsetRows

Improve the parameter section so that the user understands:

"These are parameters detected from my SQL/MyBatis query and they are required
to resolve the final SQL."

Recommended hierarchy:

------------------------------------------------
Detected Parameters                         8

Configure values used to resolve the SQL.

[ Search parameters... ]

[ systemStartTime       value             ]
[ systemEndTime         value             ]
[ criticalSlippage...   value             ]
...
------------------------------------------------

Important:

Do not hide parameters unnecessarily.

Do not change parameter behavior.

Do not change validation.

Improve:

- label readability
- spacing
- field grouping
- searchability
- visual distinction between parameter name and value
- required/optional indication if the existing data model supports it

If the existing implementation does not distinguish required vs optional,
DO NOT invent that business logic.

---

# PARAMETER SEARCH

If there are many parameters, the search field should be visually integrated
into the section header.

It should not look like a completely separate feature.

The count should remain visible.

Example:

"Detected Parameters (8)"

and:

[ Search parameters... ]

---

# PRIMARY ACTION

The "Phân tích truy vấn" button is the most important action on this page.

It should have the strongest visual emphasis.

Recommended hierarchy:

PRIMARY:
    [ ▶ Phân tích truy vấn ]

SECONDARY:
    [ Tải mẫu ]

TERTIARY / DESTRUCTIVE:
    [ Xóa tất cả ]

Do not give secondary actions equal visual weight to the primary action.

The primary CTA must remain easy to locate while scrolling.

Do not change its business behavior.

---

# RESOLVED SQL AREA

The "SQL đã giải quyết" section is extremely important.

It represents the final SQL that will actually be analyzed.

Make this semantic meaning much clearer.

Recommended visual hierarchy:

SQL đã giải quyết
[Analyzed / Ready / status]

368 dòng

[Copy] [Expand]

Then the editor.

The user should immediately understand:

"This is the final SQL generated from my input and parameters."

Do not change the editor implementation.

Do not replace Monaco or the current SQL editor.

Do not alter syntax highlighting.

Do not alter line numbers.

Do not alter SQL content.

Improve only its surrounding UI and hierarchy.

---

# WARNINGS / BEST-PRACTICE VIOLATIONS

The current warning area contains findings such as:

- DISTINCT_OPERATIONS
- OR_PREDICATE
- TRUY_VẤN_CON_TRONG_SELECT

This area currently has high visual density.

Improve it into a more structured "Analysis Findings" section.

Recommended hierarchy:

------------------------------------------------
Analysis Findings                              3

[ All (3) ] [ Critical (1) ] [ Recommendations (2) ]

------------------------------------------------

[ Severity ] DISTINCT_OPERATIONS
              Short explanation

              SQL location / example

              Line 295        >

------------------------------------------------

[ Severity ] OR_PREDICATE
              Short explanation

              Line 344        >

------------------------------------------------

Each finding should be easy to scan.

The user should be able to answer:

- What is wrong?
- How serious is it?
- Where is it?
- What should I do?

within a few seconds.

---

# WARNING SEVERITY

Preserve the existing severity semantics.

Do not invent new severity levels.

Use the existing severity information.

Improve visual distinction between:

- Critical issues
- Warnings
- Recommendations

Avoid excessive red/orange backgrounds.

Use color primarily as a semantic signal, not as decoration.

---

# FINDING EXPANSION

If the current warning cards already support close/expand/navigation behavior,
preserve that behavior.

Improve the interaction so that:

Collapsed:

[icon] DISTINCT_OPERATIONS
       Short explanation
       Line 295 >

Expanded:

[icon] DISTINCT_OPERATIONS
       Explanation

       SQL example

       Recommendation

       [Go to line 295]

Do not remove existing actions.

---

# VISUAL DESIGN SYSTEM

Keep the existing dark SQL Visualizer identity.

Do NOT transform the product into:

- generic SaaS dashboard
- excessive glassmorphism
- excessive gradients
- neon cyberpunk UI
- excessive shadows
- overly rounded cards
- visually noisy AI-style UI

The product should feel like:

"Enterprise Developer Tool"

not:

"Marketing website".

Preferred visual characteristics:

- dark professional theme
- strong typography hierarchy
- restrained accent colors
- subtle borders
- consistent spacing
- compact but readable controls
- high information density
- clear alignment
- strong keyboard/mouse usability
- consistent iconography

---

# SPACING SYSTEM

Introduce consistent spacing.

Prefer a predictable spacing scale.

For example:

4
8
12
16
24
32

Avoid arbitrary spacing values unless required by the existing design system.

Cards should have consistent:

- padding
- border radius
- border treatment
- header height

---

# GRID / LAYOUT

Improve the main workspace layout.

The current layout should clearly communicate:

LEFT:
Input + Parameters

RIGHT:
Resolved SQL

BOTTOM:
Analysis Findings

The right SQL area should receive sufficient width because SQL readability
is critical.

Do not allow the parameter panel to consume excessive horizontal space.

The SQL editor should remain comfortable for long SQL statements.

On smaller screens:

- stack sections logically
- preserve usability
- allow SQL editor horizontal scrolling
- avoid destroying the layout

---

# RESPONSIVE DESIGN

Desktop is the primary use case.

Optimize for:

1440px
1600px
1920px

Also support:

1280px
1024px

Do not prioritize mobile over desktop because this is an enterprise developer tool.

However, the UI must remain functional on smaller screens.

---

# ACCESSIBILITY

Improve:

- keyboard navigation
- focus states
- button labels
- tooltip usage
- color contrast
- aria-labels where needed
- semantic HTML

Do not rely solely on color to communicate severity.

---

# MICROCOPY

Review existing Vietnamese labels from a BA perspective.

Keep the terminology technically accurate.

Do not unnecessarily rename existing domain concepts.

Prefer concise enterprise language.

For example:

"SQL đã giải quyết"

is acceptable because it communicates that parameters have already been resolved.

Do not change technical terms simply for stylistic reasons.

---

# EMPTY STATES

Improve empty states for:

- no file uploaded
- no parameters
- no warnings
- no SQL
- no analysis yet

Every empty state should explain:

1. What is missing?
2. What should the user do?

Avoid decorative empty states.

---

# LOADING STATES

Preserve all existing loading behavior.

Improve the visual communication of:

- parsing
- resolving SQL
- analyzing SQL
- AI processing

Users should understand what the system is currently doing.

Do not create fake progress percentages.

---

# ERROR STATES

Improve error presentation.

Errors should clearly communicate:

WHAT happened
WHY it happened (when known)
WHAT the user can do next

Avoid technical stack traces in the primary user-facing message.

Do not change underlying error handling logic.

---

# DESIGN PRINCIPLE

Apply this rule throughout the page:

## "Progressive Disclosure"

Show the information required for the current task first.

Reveal detailed technical information when the user needs it.

For example:

Primary:

"OR_PREDICATE"

Secondary:

"OR conditions may reduce index efficiency..."

Detailed:

SQL location / exact SQL snippet / recommendation

Do not show every detail at maximum visual prominence simultaneously.

---

# DO NOT OVER-DESIGN

This is an engineering productivity tool.

Do NOT:

- add unnecessary animations
- add decorative charts
- add fake metrics
- add unnecessary illustrations
- add unnecessary modal dialogs
- add unnecessary tabs
- add excessive badges
- add excessive gradients
- add excessive glass effects
- add AI-generated decorative content

Every visual element must have a functional purpose.

---

# COMPONENT REUSE

Before creating new components:

1. Inspect the existing component library.
2. Identify reusable Button, Card, Input, Badge, Tabs, Alert, Dropdown,
   Tooltip and Modal components.
3. Reuse existing components where possible.
4. Follow the existing Tailwind/theme conventions.

Do not duplicate components unnecessarily.

---

# INTERNATIONALIZATION

The application already supports Vietnamese and English.

All new or modified user-facing strings must use the existing i18n system.

Do NOT hard-code new Vietnamese/English strings directly inside JSX.

Preserve both:

- Vietnamese
- English

---

# TECHNICAL CONSTRAINT

The UI improvement must not introduce unnecessary architectural changes.

Do not rewrite:

- SQL analyzer
- parser
- AI services
- RAG
- query history backend
- state architecture
- API layer

unless strictly required.

The task is primarily:

UI/UX + information architecture + component organization.

---

# BEFORE IMPLEMENTATION

Do NOT immediately start coding.

First inspect the existing codebase.

Identify:

1. Page component.
2. Child components.
3. Existing layout components.
4. Existing design system.
5. Existing Tailwind variables.
6. Existing buttons/inputs/cards.
7. Existing warning components.
8. Existing SQL editor.
9. Existing state/store.
10. Existing i18n.
11. Existing responsive behavior.

Then produce a short analysis:

### Current UI Problems

List the most important UX problems.

### Proposed Improvements

List the changes grouped by:

- Information Architecture
- Layout
- Components
- Visual hierarchy
- Interaction
- Accessibility

### Files

List:

- files to modify
- files to create

Do not modify unrelated files.

---

# IMPLEMENTATION

After the analysis:

1. Implement the UI improvements incrementally.
2. Preserve all existing functionality.
3. Preserve all existing business logic.
4. Reuse existing components.
5. Keep the existing design language.
6. Avoid unnecessary refactoring.

---

# VALIDATION

After implementation, verify:

## Functional

- MyBatis XML upload still works.
- Direct SQL input still works.
- Smart SQL Editor still works.
- Parameter extraction still works.
- Parameter editing still works.
- SQL resolution still works.
- SQL analysis still works.
- Warning detection still works.
- Warning navigation still works.
- SQL copy still works.
- SQL dialect selection still works.
- Query history still works.
- Existing navigation still works.

## UI

- Desktop 1280px
- Desktop 1440px
- Desktop 1920px
- 1024px
- Dark mode
- Light mode
- Vietnamese
- English

## Technical

Run:

npm run type-check
npm run lint
npm run test

Fix regressions introduced by the UI changes.

---

# SUCCESS CRITERIA

The improved page should make a developer understand this workflow immediately:

INPUT
  ↓
CONFIGURE
  ↓
REVIEW SQL
  ↓
ANALYZE
  ↓
FIX / INVESTIGATE FINDINGS

The UI should feel:

- simpler
- more structured
- more professional
- more readable
- more enterprise-ready

while retaining the same underlying functionality.

Most importantly:

## Do NOT redesign for visual novelty.

Redesign for:

## "Developer productivity, clarity and decision-making."

# INTERNATIONALIZATION — STRICT REQUIREMENT

The SQL Visualizer application is a bilingual application and MUST support both:

- Vietnamese (`vi`)
- English (`en`)

The UI language is a runtime application preference.

The UI must NEVER assume that Vietnamese is the default language for implementation.

The existing application already has an internationalization mechanism and existing
translation resources.

You MUST inspect and reuse the existing i18n architecture.

Do NOT introduce a second i18n mechanism.

Do NOT create a new translation library.

Do NOT hard-code user-facing text in React/TSX components.

---

# LANGUAGE-AGNOSTIC UI IMPLEMENTATION

All UI components must be language-agnostic.

The component must request a translation key:

Example:

```tsx
t('queryInput.parameters.title')
```

---

# PRIORITY ORDER

Implement improvements in this exact priority:

P0:
1. Information hierarchy
2. Main workspace layout
3. Parameter section readability
4. Resolved SQL visual prominence
5. Analysis findings readability

P1:
6. Better CTA hierarchy
7. Search/filter for parameters
8. Warning severity presentation
9. Empty/loading/error states
10. Responsive behavior

P2:
11. Micro-interactions
12. Accessibility improvements
13. Minor visual polish

Do NOT spend significant time on P2 until P0 and P1 are completed.