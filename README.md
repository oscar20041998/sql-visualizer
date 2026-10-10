# SQL Visualizer

**📚 Languages:** [English] | Tiếng Việt

A comprehensive SQL analysis and visualization tool built with Next.js 15, React 19, and TypeScript. Analyze query complexity, visualize table relationships, explore CTEs, and deep-dive into JOIN conditions across multiple SQL dialects.

## 🚀 Features

### Core Analysis Tools

- **Query Input** - Paste SQL or import MyBatis XML with multi-dialect support (MySQL, PostgreSQL, SQL Server, Oracle)
- **Relationship Graph Visualizer** - Interactive visualization of table relationships and JOIN connections with color-coded edges and multiple layout options
- **JOIN Analysis** - Deep-dive analysis of JOIN conditions with complexity breakdown, column/operator detection, and multi-dialect support
- **Metrics Dashboard** - Real-time complexity scoring (0-100) with detailed breakdowns of keywords, SELECT fields, JOINs, CTEs, subqueries, and window functions. Every metric card and subquery entry shows the source line number and can jump straight to that line in the Smart SQL Editor
- **CTE Analysis** - Explore Common Table Expressions and field origins with visual tree structure, including per-CTE nested subquery detection with accurate nesting depth
- **Smart SQL Editor** - Multi-dialect Monaco-based query editor with formatting, original-vs-edited diff view, and real-time analysis
- **SQL Before/After Comparison** - Capture the current query as an explicit "Before" baseline (kept for the browser tab session, cleared when the tab closes), edit freely, then compare: Monaco Before/After diff, deterministic structural changes (projection, sources, JOINs, filters, grouping, ordering, pagination, data-modification statements) with evidence and severity, and a separate assessment of semantic equivalence, execution safety, performance and verification. An optional AI interpretation is labeled and rendered apart from the deterministic results, results are marked stale when the SQL changes, and neither version is ever executed. Spec: [`specs/017-sql-before-after-comparison/`](./specs/017-sql-before-after-comparison/)

### Code Generation

- **SQL → Code Generator** - Convert SQL into application-layer code. A `CREATE TABLE` becomes a Java/JPA entity (with `@Entity`, `@Table`, `@Id`, `@Column` and inferred relationships) and a `SELECT` becomes a DTO/projection class, driven by automatic SQL classification, SQL-to-language type mapping, and a configurable naming strategy. Generated code appears in a syntax-highlighted preview you can copy or download, and every assumption or unsupported construct is reported as a warning rather than silently guessed

### AI-Powered Features

- **AI SQL Explainer** - Turns a query into a structured, plain-language explanation (objective, filters, output, referenced tables)
- **AI Optimize** - Streams optimization suggestions and a rewritten query, grounded in the local parser's verified facts (tables, joins, CTE graph)
- **AI Format Error Diagnostics** - When the formatter cannot parse your SQL, a persistent error report panel explains the failure and, in one combined local AI request, returns the diagnosis plus a replacement SQL fragment for the error region only — never the full query. The client re-validates and splices the fragment behind a review-before-apply gate; an invalid replacement keeps the diagnosis visible with Copy/Apply disabled. Spec: [`specs/012-format-error-ai-diagnostics/`](./specs/012-format-error-ai-diagnostics/)
- **Docs Consultant Chat** - RAG-style chat over the app's own feature docs (embeds the question, retrieves the closest doc chunks, answers with citations)
- **Database AI Assistant** - General database chat for SQL, schema design, indexes, transactions, and performance. When its local RAG index is available, answers are grounded in relevant excerpts from official SQL Server, MySQL, PostgreSQL, and Oracle manuals, with source labels shown below the answer
- **Database AI Assistant Chat History** - Persistent, multi-conversation history for the Database AI Assistant. Conversations survive a page reload, navigating away, and a browser restart, are titled automatically from the first question, grouped by recency, and can be searched, renamed, deleted or cleared. History is stored on the device and partitioned per signed-in identity; guests keep no stored history by design
- **Query History with Semantic Search** - Every analyzed query is saved (server-side Excel-backed store) and searchable by meaning, not just substring, via embeddings
- **Multi-Provider Support** - Local Ollama (no API key needed) or cloud providers (OpenAI, Anthropic, Gemini, AI Portal) proxied through the app server so credentials never reach the browser
- **Text-to-Speech** - Reads AI explanations/optimization notes aloud (browser speech synthesis, with optional Piper local voices)

### Authentication

- **Login / Register** - Demo credential gate (`admin` / `1234@`) plus Google/Microsoft sign-in buttons on the landing page before the query workspace is accessible. Setup guide: [Optional: Google and Microsoft Social Login](#optional-google-and-microsoft-social-login)
- **Guest Access (in progress)** - A "continue without an account" path that admits a visitor as an anonymous guest for evaluation. Guests get every non-AI capability: SQL parsing and formatting, the relationship graph, complexity scoring, the metrics dashboard, CTE analysis, and all exports. **AI-backed features are reserved for signed-in users** — including ones that would run against a locally configured model, since `ollama` is the default provider and an exception for it would leave nearly every AI feature open. The only AI path left open is the format-error explain/fix, which is hard-wired to run locally and therefore costs the operator nothing. Spec: [`specs/013-guest-access-mode/`](./specs/013-guest-access-mode/). **Not yet shipped** — see the status note below.

> **Guest access status:** in development (1 of 74 tracked behaviors implemented). The server-side
> enforcement that protects shared AI capacity is not in place yet, so the AI routes currently
> accept unauthenticated callers. Do not expose a public deployment until that is finished.

### Technical Stack

- **Next.js 15** - Latest version with improved performance and App Router
- **React 19** - Latest React with enhanced capabilities
- **TypeScript** - Strict type checking for code reliability
- **Tailwind CSS** - Utility-first CSS framework with custom theme variables
- **Zustand** - Lightweight state management for global application state
- **Lucide React** - Icon library for consistent UI elements
- **Monaco Editor** (`@monaco-editor/react`) - The Smart SQL Editor's code editor, diff view, and minimap
- **ReactFlow** - Interactive node/edge canvas powering the Relationship Graph Visualizer
- **dt-sql-parser** - AST-based SQL parsing used to cross-check the regex-based analyzer for dialect validation
- **Vitest** - Unit test runner (`npm run test`)

## 🔀 AI Feature Flowcharts

How each AI-powered feature actually moves data through the app — from the local SQL parser through prompt building, retrieval grounding, and the active provider (local Ollama or a cloud API proxied server-side).

### AI SQL Explainer & Follow-up Chat

```mermaid
flowchart TD
    A[SQL in Smart SQL Editor] --> B["analyzeSql() local parser"]
    B --> C["buildSqlContextBrief() — verified tables/joins/CTEs"]
    C --> D["fitContextBrief() + truncateSqlForBudget()<br/>fit prompt into the provider's context window"]
    D --> E["explainSqlStructuredStream()"]
    E --> F{Provider}
    F -->|Ollama| G["Direct call to local Ollama"]
    F -->|OpenAI / Anthropic / Gemini / AI Portal| H["/api/ai/generate proxy<br/>(server holds the credential)"]
    G --> I["Streamed JSON answer"]
    H --> I
    I --> J["Partial-JSON parser<br/>renders growing sections live, not raw JSON"]
    J --> K{"Valid JSON once complete?"}
    K -->|Yes| L["Structured panel:<br/>objective / filters / output / field meanings / tables"]
    K -->|No, even after repair pass| M["Unstructured fallback:<br/>notice + collapsible raw answer"]
    L --> N["Ask a follow-up"]
    N --> O["askFollowUp() — SQL pinned as first turn<br/>+ trimmed history to fit budget"]
    O --> E
```

### AI Optimize (Smart SQL Editor)

```mermaid
flowchart TD
    A[Click Optimize] --> B["Editor locked read-only + loading overlay"]
    B --> C["checkSelectAll() + checkOtherLintingRules()<br/>local linting alerts"]
    C --> D["buildOptimizeKnowledgeBrief()<br/>embed dialect + issues via local Ollama (all-minilm)"]
    D --> E["/api/ai/database-knowledge-context<br/>biased toward the active SQL dialect"]
    E --> F["Grounded knowledge brief<br/>+ parser brief + lint alerts as one prompt"]
    F --> G["optimizeSqlWithAIStream()"]
    G --> H["Streamed JSON: analysis / suggestions / optimized_sql"]
    H --> I["Partial-JSON progress message<br/>(never shows raw JSON while streaming)"]
    I --> J{"Structured result?"}
    J -->|Yes| K["Editor updates + auto-enables Diff view<br/>if the query actually changed"]
    K --> L["Re-run linting on the new SQL<br/>show count of alerts auto-resolved"]
    J -->|No| M["Unstructured fallback: notice + collapsible raw answer<br/>editor left unchanged"]
    L --> N["Read result aloud (optional)"]
    N --> O["/api/ai/speech — gender + locale picks the voice"]
```

### Docs Consultant Chat & Database AI Assistant (RAG)

```mermaid
flowchart TD
    A[User question] --> B{Which chat?}
    B -->|Guideline page / floating chat| C["Embed question"]
    B -->|Database AI Assistant page| D["Embed question via local Ollama (all-minilm)"]
    C --> E["/api/ai/docs-context<br/>cosine similarity over docsIndex.json<br/>(this app's own feature docs)"]
    D --> F["/api/ai/database-knowledge-context<br/>nearest-neighbor over ~82k official manual chunks<br/>(SQL Server / MySQL / PostgreSQL / Oracle)"]
    E --> G["Answer grounded in the closest doc chunks<br/>+ citations shown below the reply"]
    F --> H["Answer grounded in the closest manual excerpts<br/>+ source labels, only when a real match is found"]
    G --> I["generateWithAI() — Ollama direct or /api/ai/generate proxy"]
    H --> I
    I --> J["Answer streamed into the conversation"]
    J --> K["Conversation state lives in the Zustand store<br/>survives navigating to another page<br/>and is persisted per identity (see Chat History)"]
```

### Database AI Assistant Chat History

```mermaid
flowchart TD
    A["Question sent in the Database AI Assistant"] --> B["Answer completes<br/>(streaming fragments are never persisted)"]
    B --> C["Exactly one write per transition:<br/>create / send / complete / rename / delete / clear"]
    C --> D["History storage contract<br/>one localStorage key per signed-in identity"]
    D --> E["Zustand store slice — single source of truth"]
    E --> F["History sidebar: search, rename, delete, clear, New chat"]
    E --> G["Reload / navigate away / restart browser"]
    G --> H["Last active conversation restored<br/>messages, order and source labels intact"]
    D --> I{"Storage unavailable or full?"}
    I -->|Yes| J["Session continues in memory<br/>one non-blocking notice — history is never truncated"]
    I -->|No| F
```

### SQL → Code Generator

```mermaid
flowchart TD
    A["SQL in the SQL → Code Generator tab"] --> B["parseSql() — AST from the multi-dialect parser"]
    B --> C["classifySql()<br/>TABLE_DEFINITION / ENTITY_LIKE / DTO / AGGREGATION / DML / UNKNOWN"]
    C --> D{"Recommended output"}
    D -->|Entity| E["Entity renderer<br/>@Entity / @Table / @Id / @Column + relationships"]
    D -->|DTO / Projection| F["DTO renderer<br/>alias-derived fields + mapped types"]
    D -->|Unsupported| G["No guessed code<br/>actionable diagnostics only"]
    E --> H["Syntax-highlighted preview<br/>+ assumptions and warnings"]
    F --> H
    H --> I["Copy to clipboard or download as .java"]
    H --> J["Reset restores initial input and clears output"]
```

### Query History Semantic Search

```mermaid
flowchart TD
    A[Query analyzed] --> B["Saved to the server-side query history (Excel-backed)"]
    B --> C["embeddingService embeds the query text"]
    C --> D["Embedding stored alongside the history entry"]
    E[User searches history by meaning] --> F["Search phrase embedded the same way"]
    F --> G["Cosine similarity against every stored entry"]
    G --> H["Ranked matches returned, not just substring hits"]
    D -.-> G
```

### Text-to-Speech (Read Aloud)

```mermaid
flowchart TD
    A["Read aloud clicked<br/>(AI Explainer or Optimize panel)"] --> B["Script built from the answer's sections"]
    B --> C["synthesizeSpeech() — locale + saved male/female preference"]
    C --> D["/api/ai/speech"]
    D --> E{"AI_SPEECH_PROVIDER"}
    E -->|piper — default| F["Local Piper voice (sherpa-onnx)<br/>picked by locale + gender"]
    E -->|openai| G["OpenAI TTS — concrete voice resolved from gender"]
    F --> H["Audio played in the browser"]
    G --> H
```

## 🛠️ Installation

1. Install dependencies:

```bash
npm install
# or
yarn install
```

2. Start the development server:

```bash
npm run dev
# or
yarn dev
```

3. Open [http://localhost:4028](http://localhost:4028) with your browser to see the result.

### Ollama Models and Performance Configuration

SQL Visualizer uses Ollama locally at `http://localhost:11434` by default. The application currently uses these models:

| Purpose | Model | Used by |
| --- | --- | --- |
| Chat, SQL explanation, SQL optimization, and Database AI Assistant answers | `qwen2.5-coder:3b` | Default Ollama chat model, configurable in **Settings > AI Model Configuration** |
| Database-manual RAG retrieval | `all-minilm` | Required for Database AI Assistant grounding; must match the local index embedding space |
| Query History semantic search | `nomic-embed-text` | Finds previously analyzed SQL with similar meaning |

Install the complete local setup:

```bash
ollama pull qwen2.5-coder:3b
ollama pull all-minilm
ollama pull nomic-embed-text
```

For a responsive single-user development workflow, use these settings in **Settings > AI Model Configuration**:

| Setting | Recommended value | Why |
| --- | --- | --- |
| Provider | `Ollama` | Keeps SQL prompts and RAG embeddings on the local machine |
| Base URL | `http://localhost:11434` | Default local Ollama service address |
| Chat model | `qwen2.5-coder:3b` | Balanced SQL quality, streaming speed, and memory use |
| Temperature | `0.1` | Produces more deterministic SQL explanations and optimization suggestions |
| Context window | `8192` | Supports a SQL query, parser context, conversation history, and retrieved manual excerpts |
| Maximum output tokens | `1200` | Keeps streamed answers concise and reduces generation latency |
| Batch explain concurrency | `1` on CPU, `2` on a capable GPU | Prevents multiple local inference jobs from competing for the same RAM/VRAM |

The configured context window must match the Ollama server. Before setting the application context to `8192`, run Ollama with the same limit (or configure an equivalent `num_ctx` value in a Modelfile):

```bash
# PowerShell, for the current terminal session
$env:OLLAMA_CONTEXT_LENGTH = "8192"
ollama serve
```

For best throughput, keep the models warm while the application is in use, avoid running multiple large chat models concurrently, and use GPU acceleration when available. `qwen2.5-coder:3b` needs roughly 5 GB of model storage and typically benefits from at least 8 GB available RAM/VRAM; reduce the context window back to `4096` on memory-constrained machines. Do not change the RAG model from `all-minilm` unless you rebuild the Database Knowledge index with the replacement model.

### Optional: Build the Database Knowledge RAG Index

The Database AI Assistant works without a local knowledge index, using the configured chat model's general knowledge. To ground answers in the bundled official database-manual excerpts and show sources:

```bash
ollama pull all-minilm
npm run build:database-knowledge-index
```

This command requires Ollama to be running and the local `src/lib/ai/document_chunks.json` source dump to be available. It re-embeds about 82,000 manual excerpts with `all-minilm`, then writes a local binary index under `src/lib/ai/data/`. The index is intentionally git-ignored and takes roughly 20-30 minutes to build; rerun it only when the source dump or embedding model changes.

### Optional: Google and Microsoft Social Login

The sign-in page can authenticate users with a real Google or Microsoft account. The flow runs entirely
in the browser as an OAuth 2.0 implicit flow (`response_type=token`): the button opens the provider's
consent screen in a popup, `/oauth/callback` relays the result back to the sign-in page, and the server
verifies the returned access token before issuing the session cookie. Only a public client ID is needed —
no backend OAuth client and no client secret.

Add the client IDs you want to enable to `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=your-azure-app-client-id
```

A provider whose variable is missing still shows an explanatory message instead of opening the popup
(`Google sign-in is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID and restart the app.`).

| Provider | Authorize endpoint | Scopes requested | Redirect URI to register |
| --- | --- | --- | --- |
| Google | `https://accounts.google.com/o/oauth2/v2/auth` | `openid profile email` | `<origin>/oauth/callback` |
| Microsoft | `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` | `openid profile email User.Read` | `<origin>/oauth/callback` |

`<origin>` is the scheme, host and port serving the app — `http://localhost:4028` for `npm run dev`. The
app requests `<origin>/oauth/callback?provider=google` (or `microsoft`); register the path
`<origin>/oauth/callback` — if the provider reports a redirect URI mismatch, register the full URI
including the query instead.

**Google Cloud Console**

1. Open [Credentials](https://console.cloud.google.com/apis/credentials) and choose
   **Create credentials → OAuth client ID**. Create the OAuth consent screen first if prompted; while the
   consent screen is in *Testing* status, only users you added as test users can sign in.
2. Select **Web application** as the application type.
3. Add `http://localhost:4028` under **Authorized JavaScript origins**.
4. Add `http://localhost:4028/oauth/callback` under **Authorized redirect URIs**.
5. Copy the **Client ID** (it ends with `.apps.googleusercontent.com`) into `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

**Microsoft Entra ID (Azure portal)**

1. Open **Microsoft Entra ID → App registrations → New registration** in the
   [Azure portal](https://portal.azure.com).
2. Set **Supported account types** to *Accounts in any organizational directory and personal Microsoft
   accounts* — this matches the `/common` authority the app calls.
3. Under **Redirect URI**, choose the platform **Single-page application (SPA)** and enter
   `http://localhost:4028/oauth/callback`.
4. Under **API permissions**, add the delegated Microsoft Graph permission **User.Read** (the app reads
   `https://graph.microsoft.com/v1.0/me` for the profile) and grant consent if your tenant requires it.
5. Skip **Certificates & secrets** — this flow uses no client secret. Copy the **Application (client) ID**
   into `NEXT_PUBLIC_MICROSOFT_CLIENT_ID`.

**Finish and verify**

1. Restart the dev server after editing `.env.local`: `NEXT_PUBLIC_*` values are inlined when Next.js
   starts, so otherwise the buttons keep reading the old values.
2. Sign out, click **Google** or **Microsoft**, and approve the consent screen in the popup. Popups must
   be allowed for the app origin (otherwise the button reports `Allow Popups to continue signing in.`).
3. Expected result: the success toast `Signed in via Google as <name>.` and a redirect to `/query-input`.
   Cancelling the consent screen shows `Authentication cancelled or rejected by the provider.`
4. For a deployed instance, register its real origin as an additional entry in both consoles, e.g.
   `https://your-domain/oauth/callback`.

## 📁 Project Structure

```
sql-visualizer/
├── docs/
│   ├── spring-backend-calcite/     # Backend design docs for a future Spring/Calcite analyzer service
│   └── ui-prompts/                 # UI/UX improvement prompt specs (homepage, explainer, dashboards)
├── models/
│   └── piper/                     # Local Piper TTS voices (downloaded via `npm run setup:piper`)
├── public/
│   └── assets/
│       ├── images/                 # Static images
│       └── markdown/               # Feature documentation, indexed for the Docs Consultant chat
│           ├── FEATURES.md
│           ├── FEATURES_INDEX.md
│           └── features/           # Modular per-feature guides
│               ├── core-analysis-tools/
│               ├── database-ai-assistant/ # Database AI Assistant and RAG setup guide
│               ├── smart-editor-ai-assistant/
│               └── voice-and-docs-support/
├── scripts/
│   ├── setup-piper.mjs             # Downloads/configures local Piper TTS voices
│   ├── build-docs-index.mjs        # Rebuilds src/lib/ai/docsIndex.json for the Docs Consultant
│   └── build-database-knowledge-index.mjs # Re-embeds official manuals for the Database AI Assistant RAG index
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with theme provider
│   │   ├── page.tsx                # Public landing page (hero, features, workflow, README link)
│   │   ├── api/ai/                 # Server routes proxying AI generate/embed/speech/retrieval
│   │   │   ├── database-knowledge-context/ # RAG retrieval over the official database manuals
│   │   │   └── docs-context/        # RAG retrieval over SQL Visualizer feature docs
│   │   ├── database-ai-assistant/  # General database Q&A chat with RAG citations + persistent chat history
│   │   ├── query-input/            # SQL input, parameters + the SQL → Code Generator tab
│   │   ├── relationship-graph-visualizer/  # Graph visualization and JOIN analysis
│   │   ├── cte-analysis/           # CTE exploration and analysis
│   │   ├── sql-metrics-dashboard/  # Complexity metrics, scoring, and line-jump detail views
│   │   ├── smart-sql-editor/       # Monaco-based editor, AI explain/optimize panels
│   │   ├── guideline/              # Feature docs + AI Docs Consultant chat
│   │   ├── readme/                 # Public README viewer (renders the project README.md)
│   │   └── settings-preferences/   # User preferences, theme, and AI provider config
│   ├── components/
│   │   ├── AppLayout.tsx          # Main layout component
│   │   ├── Sidebar.tsx            # Navigation sidebar
│   │   ├── GlobalChat.tsx         # Floating AI chat entry point
│   │   ├── ThemeProvider.tsx      # Theme context provider
│   │   └── ui/                    # Reusable UI components (ComplexityDashboard, LintingAlerts, etc.)
│   ├── lib/
│   │   ├── ai/                    # AI provider integration
│   │   │   ├── aiProviders.ts     # Cloud/local provider configs and defaults
│   │   │   ├── aiQueue.ts         # Batched AI request queue
│   │   │   ├── aiRouteValidation.ts # Shared validation for AI proxy API routes
│   │   │   ├── aiService.ts       # AI generation/embedding/streaming adapter (Ollama/cloud)
│   │   │   ├── aiSqlContext.ts    # SQL context brief builder for AI prompts
│   │   │   ├── aiSpeech.ts / aiSpeechEngine.ts # Text-to-speech playback
│   │   │   ├── aiTokens.ts        # Token estimation helpers
│   │   │   ├── databaseAssistant.ts # Database AI Assistant chat and RAG orchestration
│   │   │   ├── databaseAssistant/  # Chat-history storage contract + per-identity persistence helpers
│   │   │   ├── databaseKnowledgeStore.ts # Server-only nearest-neighbor search over the manual corpus
│   │   │   ├── data/               # Local git-ignored RAG index generated from the official manuals
│   │   │   ├── embeddingService.ts # Client helpers for semantic search embeddings
│   │   │   ├── vectorStore.ts     # Cosine-similarity search over docsIndex.json
│   │   │   └── docsIndex.json     # Embedded feature docs for the Docs Consultant chat
│   │   ├── sql/                   # SQL parsing and scoring
│   │   │   ├── sqlAnalyzer.ts     # SQL parsing and analysis engine (tables, joins, CTEs, subqueries, line numbers)
│   │   │   ├── complexityScorer.ts # Complexity calculation logic
│   │   │   ├── dialectValidator.ts # Multi-dialect SQL validation
│   │   │   └── dialectValidator.test.ts
│   │   ├── codegen/                # SQL → Code Generator (parser, classifier, type mapping, renderers)
│   │   ├── conversationHistoryStore.ts # Chat-history persistence (per-identity localStorage)
│   │   ├── logging/                # Logging utilities
│   │   │   ├── logger.ts
│   │   │   ├── logger-setup.ts
│   │   │   └── CONSOLE_DEBUG_GUIDE.ts
│   │   ├── store.ts               # Zustand state management (incl. pending editor line-jump)
│   │   ├── useGoToSqlLine.ts      # Hook: navigate to Smart SQL Editor and reveal a line
│   │   ├── queryHistory.ts / queryHistoryClient.ts # Query history (server-backed) + client fetch wrappers
│   │   └── i18n.ts                # Internationalization setup
│   ├── app/common/
│   │   └── sqlAnalyzerUtils.ts    # **Centralized constants file** containing:
│   │       │                      # - Complexity levels & thresholds
│   │       │                      # - Join types and condition complexity
│   │       │                      # - SQL keywords & operators
│   │       │                      # - 20+ regex patterns for SQL parsing
│   │       │                      # - Magic numbers & analyzer limits
│   │       │                      # - Helper functions (normalizeJoinType,
│   │       │                      #   getComplexityLevelFromScore, etc.)
│   │       │                      # - Color constants for visualization
│   │       │                      # - Nesting levels & context types
│   ├── locales/
│   │   ├── en.ts                  # English translations
│   │   └── vi.ts                  # Vietnamese translations
│   └── styles/
│       ├── index.css              # Global styles
│       └── tailwind.css           # Tailwind CSS configuration
├── next.config.mjs                # Next.js configuration
├── package.json                   # Project dependencies and scripts
├── postcss.config.js              # PostCSS configuration
├── tailwind.config.js             # Tailwind CSS theme customization
├── vitest.config.ts               # Vitest test runner configuration
└── tsconfig.json                  # TypeScript configuration
```


## 🎯 Key Pages

- **Dashboard** (`/`) - Overview and quick access to all analysis tools
- **Query Input** (`/query-input`) - Paste SQL, configure parameters, select dialect, generate Java/JPA code from SQL in the **SQL → Code Generator** tab, or review query changes in the **Before/After comparison** panel
- **Relationship Graph** (`/relationship-graph-visualizer`) - Visualize tables, JOINs, and deep-dive JOIN analysis
- **CTE Analysis** (`/cte-analysis`) - Explore CTEs and field data flow
- **Metrics Dashboard** (`/sql-metrics-dashboard`) - View complexity scores, breakdowns, and jump from any metric/subquery to its line in the editor
- **Smart SQL Editor** (`/smart-sql-editor`) - Format, diff, and AI-explain/optimize SQL in a full Monaco editor
- **Guideline** (`/guideline`) - Feature documentation plus the AI Docs Consultant chat
- **Database AI Assistant** (`/database-ai-assistant`) - Ask general database questions, with optional grounding in official SQL Server, MySQL, PostgreSQL, and Oracle manuals. Conversations are kept in a persistent, searchable history sidebar
- **Settings** (`/settings-preferences`) - Configure theme, language, AI provider, and analysis options

## 🎨 Styling & Theming

This project uses Tailwind CSS with extensive customization:

- **Theme Support** - Dark and Light modes with persistent user preference
- **Custom Color Variables** - Complexity scoring colors (--complexity-_), JOIN type colors (--join-_), and semantic colors (--primary, --accent, --danger, --warning, --success, --info)
- **Responsive Design** - Mobile-first approach optimized for desktop analysis
- **CSS Animations** - Smooth transitions with float, slideUp, fadeIn, and shimmer keyframes
- **PostCSS & Autoprefixer** - Automatic vendor prefixing and CSS optimization

## ⚙️ Centralized Constants Management

All repeated values, thresholds, and patterns are organized in a single source of truth file for improved maintainability:

**File:** `src/app/common/sqlAnalyzerUtils.ts`

### Constant Groups

| Category                    | Examples                                             | Purpose                                                |
| --------------------------- | ---------------------------------------------------- | ------------------------------------------------------ |
| **Complexity Levels** | LOW, MEDIUM, HIGH, SUPER_HIGH                        | Query complexity classification                        |
| **Join Types**        | INNER JOIN, LEFT JOIN, FULL OUTER JOIN, LATERAL JOIN | SQL join type normalization                            |
| **Operators**         | =, <>, !=, <=, >=, IN, LIKE, BETWEEN                 | SQL operator symbols                                   |
| **SQL Keywords**      | SELECT, FROM, WHERE, JOIN, GROUP, ORDER, etc.        | Reserved SQL keywords                                  |
| **Regex Patterns**    | 20+ named patterns                                   | Table extraction, CTE parsing, join condition analysis |
| **Analyzer Limits**   | MAX_COLUMNS: 8, MAX_CTE_COUNT: 100                   | Thresholds and bounds                                  |
| **Complexity Ratios** | 0.75 (SUPER_HIGH), 0.5 (HIGH), 0.25 (MEDIUM)         | Complexity score thresholds                            |
| **Colors**            | Primary, Accent, Success, Warning, Error             | UI visualization colors                                |

### Helper Functions

```typescript
// Normalize raw join keywords to standard JoinType
normalizeJoinType(rawJoinType: string): JoinTypeValue

// Convert numeric score to complexity level
getComplexityLevelFromScore(score: number): ComplexityLevelType

// Determine join condition simplicity
getJoinConditionComplexity(score: number): JoinConditionComplexityType

// Check if word is SQL keyword
isSqlKeyword(word: string): boolean
```

### Usage Example

```typescript
import {
  SQL_ANALYZER_LIMITS,
  COMPLEXITY_LEVELS,
  normalizeJoinType,
} from '../app/common/sqlAnalyzerUtils';

// Access a limit constant
const maxColumns = SQL_ANALYZER_LIMITS.MAX_COLUMNS; // 8

// Use helper functions
const joinType = normalizeJoinType('LEFT OUTER JOIN'); // 'LEFT JOIN'
const level = getComplexityLevelFromScore(6); // 'HIGH'
```

### Benefits

- **Single Source of Truth** - All constants in one location
- **Easy Maintenance** - Change thresholds once, affects entire codebase
- **Type Safety** - Full TypeScript support with IntelliSense
- **Consistency** - Prevents duplicate magic numbers and regex patterns
- **Scalability** - Simple to add new constants and helper functions

## 📦 Available Scripts

- `npm run dev` - Start development server on port 4028
- `npm run build` - Build the application for production
- `npm run start` - Start the development server
- `npm run serve` - Start the production server
- `npm run lint` - Run ESLint to check code quality
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking
- `npm run test` - Run the Vitest test suite
- `npm run setup:piper` - Download/configure local Piper TTS voices
- `npm run build:docs-index` - Rebuild the embeddings index used by the Docs Consultant chat

## 🌍 Supported SQL Dialects

- **MySQL** (5.7+) - Including STRAIGHT_JOIN and USING clause
- **PostgreSQL** (9.6+) - Including LATERAL JOIN and advanced USING clauses
- **SQL Server** (2016+) - Including CROSS APPLY and OUTER APPLY
- **Oracle** (12c+) - Including OUTER JOIN variants and USING clause

## 🌐 Internationalization

- **English** - Complete UI translations
- **Vietnamese** - Full Vietnamese localization for all features including JOIN Analysis

Users can switch language in Settings → Preferences

## 📊 SQL Analysis Capabilities

### Query Complexity Scoring

- Real-time complexity calculation (0-100 scale)
- Detailed breakdown by category (keywords, fields, JOINs, CTEs, subqueries, window functions)
- Complexity level classification (LOW, MEDIUM, HIGH, SUPER_HIGH)
- Performance heuristics and anti-pattern detection

### JOIN Analysis

- Deep-dive into each JOIN condition
- Column and operator extraction
- Complexity assessment (Simple vs Complex)
- Equi-join detection
- Complexity scoring per JOIN
- Multi-dialect specific JOIN syntax support

### CTE & Subquery Analysis

- Visual tree structure for CTEs
- Field origin tracking
- Unused CTE detection
- Subquery nesting depth computed by counting actual SELECT-boundary parens (not raw paren depth), so subqueries wrapped in function calls (e.g. `COALESCE((SELECT ...), 0)`) or redundant double parens are still detected and depth stays accurate
- Every detected subquery and metric-detail item reports its source line number, clickable to jump straight to it in the Smart SQL Editor

### Export Capabilities

- Mermaid diagram export for documentation
- CSV export for extracted tables
- CTE SQL copy for reuse in queries

## 📖 Documentation Structure

The project includes comprehensive, modularized documentation to keep guides focused and digestible. All feature docs live under `public/assets/markdown/` and are indexed for the AI Docs Consultant chat (rebuild the index with `npm run build:docs-index` after editing them).

### Feature Documentation

**Core Features** - Start here to understand each analysis tool:

- [Query Input](public/assets/markdown/features/core-analysis-tools/QUERY_INPUT.md) - How to input SQL and configure dialects
- [Relationship Graph](public/assets/markdown/features/core-analysis-tools/RELATIONSHIP_GRAPH.md) - Visualizing table relationships
- [JOIN Analysis](public/assets/markdown/features/core-analysis-tools/JOIN_ANALYSIS.md) - Deep-dive into JOIN conditions
- [Metrics Dashboard](public/assets/markdown/features/core-analysis-tools/METRICS_DASHBOARD.md) - Understanding complexity scores
- [CTE Analysis](public/assets/markdown/features/core-analysis-tools/CTE_ANALYSIS.md) - Exploring Common Table Expressions
- [Settings &amp; Preferences](public/assets/markdown/features/core-analysis-tools/SETTINGS.md) - UI customization
- [Query History Search](public/assets/markdown/features/core-analysis-tools/QUERY_HISTORY_SEARCH.md) - Semantic search over past analyzed queries

### AI & Voice

- [Smart SQL Editor AI](public/assets/markdown/features/smart-editor-ai-assistant/SMART_SQL_EDITOR_AI.md) - Editor, AI explain/optimize
- [Ollama Setup &amp; Usage](public/assets/markdown/features/smart-editor-ai-assistant/OLLAMA_SETUP_AND_USAGE.md) - Running AI features locally
- [Docs Consultant](public/assets/markdown/features/voice-and-docs-support/DOCS_CONSULTANT.md) - RAG chat over the app's own docs
- [Text to Speech](public/assets/markdown/features/voice-and-docs-support/TEXT_TO_SPEECH.md) - Reading AI answers aloud

### Guides & Workflows

**Practical Guides** - Achieve specific goals:

- [Best Practices](public/assets/markdown/features/core-analysis-tools/BEST_PRACTICES.md) - Query optimization guidelines
- [Optimization Workflow](public/assets/markdown/features/core-analysis-tools/OPTIMIZATION_WORKFLOW.md) - Step-by-step query improvement
- [Workflow Examples](public/assets/markdown/features/core-analysis-tools/WORKFLOW_EXAMPLES.md) - Real-world scenarios and use cases
- [Learning Path](public/assets/markdown/features/core-analysis-tools/LEARNING_PATH.md) - Structured learning for all skill levels

### Technical Reference

**For Deep Dives** - Technical details and customization:

- [Complexity Scoring Engine](public/assets/markdown/features/core-analysis-tools/COMPLEXITY_SCORING.md) - How scoring works with weight matrix
- [Complexity Score Median Evaluation](public/assets/markdown/features/core-analysis-tools/COMPLEXITY_SCORE_MEDIAN_EVALUATION.md) - How the dynamic complexity baseline is derived
- [Advanced Topics](public/assets/markdown/features/core-analysis-tools/ADVANCED_TOPICS.md) - Enterprise patterns and customization

### Quick Navigation

- [FEATURES_INDEX.md](public/assets/markdown/FEATURES_INDEX.md) - Complete index with all documentation links
- [FEATURES.md](public/assets/markdown/FEATURES.md) - Quick feature overview and getting started

## 🚀 Getting Started

1. Clone the repository:

```bash
git clone https://github.com/oscar20041998/sql-visualizer.git
cd sql-visualizer
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:4028](http://localhost:4028) in your browser
5. Paste your SQL query and start analyzing!

## 📱 Deployment

Build the application for production:

```bash
npm run build
npm run serve
```

The optimized build will be ready for deployment.

## 📚 Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial

You can check out the [Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## 📚 Documentation

For comprehensive feature documentation, see [FEATURES.md](./public/assets/markdown/FEATURES.md) which includes:

- Detailed feature descriptions
- Use case scenarios
- Workflow examples
- Best practices for query optimization
- Complexity scoring methodology

## 🤝 Contributing

Contributions are welcome! Please ensure:

- All features include English and Vietnamese translations
- Components are properly typed with TypeScript
- Code follows the existing style conventions
- Complex features include documentation in FEATURES.md

## 🙏 Acknowledgments

- Built with Next.js 15 and React 19
- Type-safe with TypeScript
- Styled with Tailwind CSS
- Internationalization support

Built with ❤️ for SQL analysis and query optimization
