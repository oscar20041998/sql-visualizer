# SQL Visualizer
## An AI-Powered Platform for SQL Analysis, Visualization and Optimization

> **Product overview for Management, Business Analysts, Technical Leads and Engineering Teams**  
> SQL Visualizer turns complex SQL from a difficult-to-read block of code into an understandable, measurable and actionable engineering artifact — from structural analysis and visualization to AI-assisted explanation and optimization.

---

## 1. Executive Summary

**SQL Visualizer** is a web-based SQL analysis platform designed to help developers and engineering teams understand how complex queries are structured, how data flows through them, and where quality or performance concerns may exist.

Rather than treating SQL as a single block of text, SQL Visualizer provides multiple complementary perspectives:

- **Understand** — decompose and explain SQL structure.
- **Visualize** — map relationships between tables, JOINs, CTEs and data origins.
- **Measure** — quantify query complexity through structured metrics.
- **Explain** — translate SQL logic into natural-language explanations.
- **Optimize** — identify potential issues and provide AI-assisted optimization suggestions.
- **Assist** — provide database guidance and RAG-powered answers based on official documentation or project-specific knowledge.

### Core Value Proposition

SQL Visualizer is designed to reduce the gap between **SQL complexity** and **human understanding**, enabling engineering teams to analyze queries faster, more consistently and with clearer reasoning when reviewing or optimizing SQL.

---

## 2. Product Vision

### From SQL Code to SQL Intelligence

A complex SQL query can contain multiple layers of logic: JOINs, CTEs, subqueries, window functions, filters and data transformations. When all of that logic is represented only as text, understanding the complete data flow can become time-consuming.

SQL Visualizer transforms the query from a **text-based artifact** into an **interactive analytical view**, enabling users to:

1. Understand the query structure and data relationships.
2. Trace the origin of individual fields.
3. Quantify query complexity.
4. Understand the business-oriented objective and logical flow of the query.
5. Identify areas that may require quality or performance review.
6. Compare and apply optimization options with explicit user control.

---

## 3. Target Users

| Persona | Primary Need | SQL Visualizer Value |
|---|---|---|
| **Backend Developer** | Understand, debug and optimize SQL | Structural analysis, metrics, AI Explainer, AI Optimize |
| **Senior Developer / Tech Lead** | Review SQL quality and complexity | Relationship Graph, CTE Analysis, scoring and before/after comparison |
| **DBA / Database Engineer** | Analyze queries and optimization opportunities | JOIN analysis, CTE/subquery analysis, optimization assistant |
| **Junior Developer** | Learn and understand complex SQL | Natural-language explanation and visualization |
| **Technical Manager** | Understand engineering capabilities and efficiency | Capability overview, metrics and business value |

---

# 4. Product Capability Map

SQL Visualizer is organized around five major capability areas:

### A. SQL Understanding
- Query Input & Analysis
- CTE Analysis
- Field Origin Mapping
- MyBatis XML → SQL Normalization
- Smart SQL Editor

### B. SQL Visualization
- Relationship Graph
- Interactive table relationships
- JOIN condition analysis
- Mermaid / image export

### C. SQL Quality & Complexity
- Complexity Score 0–100
- Query metrics
- Source-line mapping
- Real-time analysis

### D. AI Intelligence
- AI SQL Explainer
- AI Query Optimizer
- Database AI Assistant
- AI Format Error Diagnostics
- Docs Consultant Chat

### E. Productivity
- Query History
- Semantic Search
- Database AI Assistant Chat History
- SQL → Code Generator
- Multilingual UI
- Text-to-Speech

---

# 5. Detailed Functional Capabilities

## 5.1 Query Input & SQL Analysis

Users can enter SQL directly or provide queries through MyBatis XML.

### Key capabilities

- Supports **MySQL, PostgreSQL, SQL Server and Oracle**.
- Instantly analyzes tables, columns, JOINs and query clauses.
- Imports **MyBatis XML** and normalizes it into plain SQL.
- Supports parameter configuration and result preview.
- Stores query history for future review and retrieval.

**Business value:** Reduces preparation and analysis time before SQL review, debugging or optimization.

---

## 5.2 Relationship Graph Visualizer

Relationship Graph converts table relationships into an **interactive graph**, making complex data flows easier to understand at a glance.

### Key capabilities

- Nodes represent tables.
- Edges represent JOIN relationships.
- Relationships are visually categorized.
- Multiple layouts improve readability.
- JOIN conditions can be analyzed by columns, operators and complexity.
- Graphs can be exported as Mermaid or images.

**Business value:** Reduces cognitive load when reviewing queries involving multiple tables and complex JOIN relationships.

---

## 5.3 Metrics Dashboard

Metrics Dashboard provides a quantitative view of SQL complexity.

### Complexity Score

Queries are evaluated on a **0–100 complexity scale**, supported by metrics such as:

- Number of SQL keywords.
- Number of SELECT fields.
- Number of JOINs.
- Number of CTEs.
- Number of subqueries.
- Number of window functions.

Each metric and subquery can be mapped to its **source line**, allowing users to jump directly to the relevant location in Smart SQL Editor.

### Complexity Classification

- Low
- Medium
- High

---

## 5.4 CTE Analysis & Field Origin

This capability focuses on two important questions:

> **How is the CTE structure organized?**  
> **Where does a field in the final result actually originate?**

### Key capabilities

- CTE dependency tree.
- Recursive CTE detection.
- Unused CTE detection.
- Field origin mapping.
- Nested subquery analysis with depth tracking.
- Copy SQL from individual CTEs for reuse.

---

## 5.5 Smart SQL Editor

Smart SQL Editor is built on **Monaco Editor**, providing an experience similar to VS Code.

### Key capabilities

- Syntax highlighting.
- Minimap.
- Multi-dialect support.
- SQL formatting.
- Before/after diff.
- Real-time analysis.
- Right-side docked action tabs to maximize workspace efficiency.

---

## 5.6 AI SQL Explainer

AI SQL Explainer converts SQL into a structured natural-language explanation.

Rather than focusing only on syntax, the explanation emphasizes the **meaning and logical intent of the query**, including:

- **Query Objective** — what the query is intended to accomplish.
- **Filters & Constraints** — the main filtering conditions and constraints.
- **Data Sources** — the tables or data sources involved.
- **Output** — what the query returns and how the result is formed.

Supports:

- Streaming responses.
- Copying results.
- Text-to-Speech.

---

## 5.7 AI Query Optimization

AI Optimize helps users review and improve SQL through a controlled optimization workflow.

### Optimization Flow

**Static Analysis → Semantic Review → Optimization Suggestions → Rewritten Query → Before/After Comparison → User Confirmation**

### Design principles

- Perform a **semantic review** before optimization.
- Stream optimization suggestions and rewritten SQL.
- Allow individual suggestions or the entire optimization session to be applied.
- Require user confirmation before changes are applied.
- Support requirement-driven optimization when semantic changes are explicitly allowed.
- Base suggestions on static-analysis evidence such as tables, JOINs and CTEs rather than fabricated information.

---

## 5.8 Database AI Assistant

Database AI Assistant provides a conversational interface for database-related questions.

It can support topics including:

- SQL.
- Schema design.
- Indexes.
- Transactions.
- Database performance.

### RAG

The assistant uses Retrieval-Augmented Generation based on official documentation for:

- SQL Server
- MySQL
- PostgreSQL
- Oracle

Source labels can be displayed with responses.

---

## 5.9 Docs Consultant Chat

Docs Consultant Chat applies RAG to the application's own feature documentation.

### Retrieval Flow

**Question → Embedding → Relevant Document Retrieval → Context-aware Answer → Citation**

The goal is to help users understand how to use SQL Visualizer without manually searching through the entire product documentation.

---

## 5.10 Query History & Semantic Search

SQL Visualizer stores analyzed queries on the server side.

Users can search by **semantic meaning**, rather than relying only on substring matching.

This makes it possible to retrieve conceptually similar queries even when their exact wording or text is different.

---

## 5.11 MyBatis XML → SQL Normalization

The normalization capability converts dynamic MyBatis SQL into plain SQL so that it can continue through the analysis pipeline.

Supported elements include:

- Parameters.
- `<if>`.
- `<foreach>`.
- SQL fragments.
- Dynamic SQL.

Once normalized, the resulting SQL can proceed to analysis and optimization.

---

## 5.12 AI Format Error Diagnostics

When SQL formatting fails, the system displays a dedicated **diagnostic panel** rather than relying on a transient toast message.

AI can:

1. Explain the formatting error.
2. Identify the root cause.
3. Suggest a minimal correction.
4. Show before/after changes.
5. Apply the change only after user confirmation.

For this capability, AI runs locally through **Ollama**, keeping the SQL on the device.

---

## 5.13 Authentication & Authorization

The system supports:

- Demo login.
- Google OAuth.
- Microsoft OAuth.
- Session persistence.
- Appropriate redirect handling.

Authorization is enforced at the server boundary; hiding UI elements alone is not considered an authorization mechanism.

### Social Sign-in Setup (Google & Microsoft)

Social sign-in runs entirely in the browser as an OAuth 2.0 implicit flow (`response_type=token`) with
no backend OAuth client: the button opens the provider's consent screen in a popup, the
`/oauth/callback` page relays the result back to the sign-in panel with `postMessage`, and the server
verifies the returned access token before issuing the session cookie. Each provider is enabled by a
single public client ID in `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=your-azure-app-client-id
```

| Provider | Authorize endpoint | Scopes | Redirect URI |
|---|---|---|---|
| Google | `https://accounts.google.com/o/oauth2/v2/auth` | `openid profile email` | `<origin>/oauth/callback` |
| Microsoft | `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` | `openid profile email User.Read` | `<origin>/oauth/callback` |

`<origin>` is the scheme, host and port serving the application (`http://localhost:4028` for the
development server). Profile data is read from `https://www.googleapis.com/oauth2/v3/userinfo` (Google)
or `https://graph.microsoft.com/v1.0/me` (Microsoft Graph).

**Google.** In Google Cloud Console → APIs & Services → Credentials, create an OAuth client ID of type
*Web application* with `http://localhost:4028` as an authorized JavaScript origin and
`http://localhost:4028/oauth/callback` as an authorized redirect URI, then copy the Client ID into
`NEXT_PUBLIC_GOOGLE_CLIENT_ID`. While the OAuth consent screen is in *Testing* status, only users added
as test users can sign in.

**Microsoft.** In the Azure portal, register an application under Microsoft Entra ID → App registrations
with supported account types *Accounts in any organizational directory and personal Microsoft accounts*
(the app calls the `/common` authority), a **Single-page application (SPA)** redirect URI of
`http://localhost:4028/oauth/callback`, and the delegated Microsoft Graph permission **User.Read**. No
client secret is required; copy the Application (client) ID into `NEXT_PUBLIC_MICROSOFT_CLIENT_ID`.

Because `NEXT_PUBLIC_*` values are inlined when Next.js starts, the development server must be restarted
after either variable changes. Without a client ID the corresponding button reports which variable is
missing instead of opening the popup; popups must be allowed for the application origin; and a deployed
instance must register its real origin in both consoles, for example
`https://your-domain/oauth/callback`.

---

### Guest Access (planned)

A "continue without an account" path is being added so a visitor can evaluate the product without
credentials. A visitor confirms a short disclosure, which names exactly what is unavailable and why,
and is then admitted as an anonymous **guest** — a marker on the existing session rather than a new
identity, carrying no email, name or token.

Guests retain every non-AI capability: SQL parsing and formatting, the relationship graph, complexity
scoring, the metrics dashboard, CTE analysis, and all export formats.

AI-backed features are reserved for signed-in users:

| Capability type | Guest experience |
|---|---|
| No model involved (parsing, scoring, graph, exports) | Available |
| **All** model-backed features, whatever provider is selected | Locked, with an explanation and a one-click sign-in path |
| Format-error explain/fix only | Available — hard-wired to run locally, so it costs the operator nothing |

The middle row is deliberate. A local model is the *default* provider, so carving out an exception for
it would leave almost every AI feature open to a brand-new guest while appearing to restrict them. The
single exception is the one path that is hard-wired to local inference and therefore has no cost to
protect.

Every refusal is enforced server-side, before any model capacity is consumed, and recorded for
operator review without capturing prompt text or credentials.

**Status: in development.** The interface portion is underway; server-side enforcement is not yet in
place, so the AI endpoints currently accept unauthenticated callers. This capability must not be
treated as delivered, and a public deployment should not be exposed until enforcement is complete.

---

## 5.14 Internationalization

SQL Visualizer supports:

- Vietnamese.
- English.

Users can switch languages instantly, and their preference is persisted. AI-generated content follows the currently selected language.

---

## 5.15 Text-to-Speech

AI explanations and recommendations can be read aloud.

Supported mechanisms include:

- Browser Speech Synthesis.
- Optional local Piper voice.

---

## 5.16 Database AI Assistant Chat History

Chat History provides a persistent conversation management system for the Database AI Assistant, allowing users to maintain multiple conversations, search through previous discussions, and manage their conversation library efficiently.

### Key Capabilities

- **Conversation Persistence**: Conversations are automatically saved to browser localStorage with identity-based partitioning, ensuring user data is stored securely and independently.
- **Multiple Conversations**: Users can create and maintain multiple separate conversations, each with its own message history and context.
- **Conversation Management**: 
  - Create new conversations
  - Search conversations by title and user message content
  - Rename conversations with custom titles
  - Delete individual conversations
  - Clear all conversation history at once
- **Recency Grouping**: Conversations are automatically grouped by recency (Today, Yesterday, Previous 7 Days, Older) for faster navigation.
- **Identity-Based Storage**: Conversations are securely partitioned by user identity:
  - Social login users (Google, Microsoft OAuth): Partitioned by provider and email hash
  - Demo users: Partitioned by fixed demo key
  - Guest users: No persistence (storage disabled)
- **Error Resilience**:
  - Graceful handling of storage unavailability (private browsing, quota exceeded)
  - Automatic corruption recovery (invalid data dropped, valid data preserved)
  - Non-blocking error notifications to avoid disrupting user workflow
- **Localization**: Full multilingual support (English, Vietnamese) with consistent terminology across all UI elements

### User Interface

The Chat History panel is available in the Database AI Assistant:

**Desktop (≥1024px)**: 
- Persistent sidebar on the left
- Shows conversation list, search, and management controls
- Toggle visibility without losing conversation context

**Mobile (<1024px)**:
- Collapsible drawer overlay
- Accessible via toggle button in the header
- Optimized layout for touch interaction

### Technical Implementation

- **Storage**: Synchronous browser localStorage API with FNV-1a 32-bit hashing for partitioning
- **State Management**: Zustand store for lifecycle management and real-time UI synchronization
- **Type Safety**: Full TypeScript strict mode compliance with runtime validation guards
- **Error Handling**: Error-as-values pattern (never throws; all errors returned as typed unions)
- **Write Discipline**: One storage write per conversation transition (create, send, complete, rename, delete, clear); zero writes during streaming

### Access Requirements

- **Available to**: Authenticated users (social login or demo) and guests (with read-only access)
- **Stored locally**: On user's device via browser localStorage
- **Server-side**: No server-side conversation storage; all history remains on the client device

### Benefits

- **Continuity**: Users can pick up conversations at any time without losing context
- **Organization**: Conversation search and grouping help users find relevant discussions quickly
- **Efficiency**: Reduced repetition of similar database queries and explanations
- **Privacy**: All conversation history stays on the user's device; no cloud sync or tracking

---

## 5.17 SQL → Code Generator

The SQL → Code Generator turns SQL into application-layer code. It is exposed as its own input-method tab on the existing Query Input page (alongside SQL paste, MyBatis and Smart Editor) rather than as a separate route.

### Key Capabilities

- **SQL classification**: every statement is classified as a table definition, an entity-like `SELECT`, a DTO, an aggregation, a JOIN or a DML statement, and the recommended output follows from that classification.
- **Entity generation**: a `CREATE TABLE` becomes a Java/JPA entity with `@Entity`, `@Table`, `@Id` and `@Column` annotations, nullability preserved, and relationships inferred from primary and foreign keys.
- **DTO / projection generation**: a `SELECT` becomes a DTO/projection class whose property names derive from columns and aliases, including aggregation fields typed appropriately.
- **Type mapping and naming**: SQL types map to the target language's types through a centralised mapping, and property names follow a selectable strategy (camelCase, PascalCase, or the original SQL names).
- **Configurable options**: output type (Entity, DTO / Projection, or Auto), relationship inclusion, Lombok, validation annotations and other toggles are chosen before generation.
- **Preview and export**: generated code is shown in a syntax-highlighted editor with copy-to-clipboard and download as a `.java` file.
- **Diagnostics over guesses**: unsupported or ambiguous SQL produces an actionable warning, and every assumption (such as relationship cardinality) is documented rather than silently applied.

### Scope and Roadmap

- **Available now**: Java / JPA (Hibernate).
- **Planned**: C# / EF Core, Python / SQLAlchemy, TypeScript / TypeORM, Go / GORM and Kotlin / JPA are listed as planned targets and are clearly marked in the interface as not yet supported.

### Regeneration Model

Regeneration replaces the previous output — a real-time preview paradigm rather than a history of versions — and a **Reset** action restores the initial SQL input and clears the generated result. The tab keeps its own SQL draft, so switching between input methods never overwrites the other tabs' text.

---

# 6. Technical Architecture

## 6.1 Frontend

| Layer | Technology |
|---|---|
| Framework | Next.js 15 — App Router |
| UI | React 19, Tailwind CSS |
| State Management | Zustand |
| SQL Editor | Monaco Editor |
| Visualization | ReactFlow |
| SQL Parser | dt-sql-parser |
| Testing | Vitest |

## 6.2 AI & Backend

SQL Visualizer follows an AI-provider-agnostic approach:

- **Ollama** — local AI execution without an API key.
- **OpenAI**
- **Anthropic**
- **Gemini**

Cloud AI providers are accessed through a proxy server so credentials are not exposed in the browser.

### RAG Architecture

**Documents → Embeddings → Vector Store → Retrieval → LLM → Source-aware Response**

### History Storage

Query history is stored server-side using an Excel-based storage layer according to the current product documentation.

The Database AI Assistant keeps its **chat history on the client**, in the browser's `localStorage`,
under one key per signed-in identity; no conversation content is stored server-side, and guests keep no
stored history by design. A server-backed history is a documented future option behind the same storage
contract, so the assistant itself does not need to change to adopt it.

---

# 7. Security & Privacy

Security is treated as an architectural concern rather than only a UI feature.

### Key principles

- API keys are stored server-side through `.env`.
- Credentials are never exposed to the client.
- Local optimization and format-diagnostic capabilities do not send SQL outside the device.
- Authorization is enforced at the server boundary.
- UI hiding is not used as a security mechanism.

---

# 8. Business Value

SQL Visualizer creates value across multiple dimensions:

### 8.1 Engineering Productivity
Reduces the time required to read, analyze and understand complex SQL.

### 8.2 SQL Quality
Provides metrics, visualization and AI-assisted analysis to support higher-quality query development and review.

### 8.3 Performance Awareness
Helps teams identify areas that may require performance review and provides optimization suggestions that can be compared before and after changes.

### 8.4 Knowledge Enablement
Makes SQL and database knowledge easier to access through natural-language explanations and RAG-powered assistance.

### 8.5 Security & Deployment Flexibility
Supports local or cloud AI deployment depending on security requirements and organizational policies.

### 8.6 Global Accessibility
Vietnamese and English support broadens accessibility for international users.

---

# 9. End-to-End User Journey

```text
SQL / MyBatis XML
       ↓
Query Normalization
       ↓
Static SQL Analysis
       ↓
┌───────────────────────────────────┐
│ Structure │ Metrics │ CTE │ Graph │
└───────────────────────────────────┘
       ↓
AI Explanation
       ↓
Optimization Analysis
       ↓
Suggestions + Rewritten SQL
       ↓
Before / After Comparison
       ↓
User Confirmation
       ↓
Improved Query
```

---

# 10. Product Status

| Capability | Status | Category |
|---|---|---|
| Query Input & Analysis | Completed | Core |
| Relationship Graph | Completed | Core |
| Metrics Dashboard | Completed | Core |
| CTE & Field Origin Analysis | Completed | Core |
| Smart SQL Editor | Completed | Core |
| AI SQL Explainer | Completed | AI |
| AI Query Optimization | Completed | AI |
| Database AI Assistant | Completed | AI |
| Docs Consultant Chat | Completed | AI |
| Query History & Semantic Search | Completed | AI |
| Database AI Assistant Chat History | Completed | AI |
| SQL → Code Generator (Java/JPA) | Completed | Productivity |
| MyBatis XML → SQL | Completed | Core |
| AI Format Error Diagnostics | Completed | AI |
| Google / Microsoft Login | Completed | Auth |
| Guest Access (no account) | In development | Auth |
| Vietnamese / English | Completed | UX |
| Text-to-Speech | Completed | AI |

---

# 11. Delivered Scope

- [x] Core SQL analysis.
- [x] Relationship visualization.
- [x] Metrics and complexity scoring.
- [x] CTE and field-origin analysis.
- [x] Smart SQL Editor.
- [x] AI Explainer.
- [x] AI Optimization.
- [x] Database AI Assistant with RAG.
- [x] Database AI Assistant chat history (persistent, per-identity).
- [x] SQL → Code Generator (Java/JPA entities and DTOs; further languages planned).
- [x] MyBatis normalization.
- [x] AI format-error diagnostics.
- [x] Google / Microsoft OAuth.
- [ ] Guest access without an account — in development, not yet enforced at the server boundary.
- [x] Vietnamese / English internationalization.

---

## 12. Closing Perspective

SQL Visualizer is more than a SQL editor or query formatter.

It is positioned as a **SQL Intelligence Platform** connecting four layers of engineering work:

> **Understand → Visualize → Analyze → Improve**

By bringing structural analysis, visualization, measurable complexity, natural-language explanation and AI-assisted optimization into a single workflow, SQL Visualizer provides engineering teams with a more transparent and systematic way to work with complex SQL.

> **The objective is simple: make complex SQL easier to understand, easier to review and easier to improve — while keeping the developer in control of every change.**

---

*Source: Internal SQL Visualizer feature documentation. Technical details and delivered scope are based on the supplied product document.*
