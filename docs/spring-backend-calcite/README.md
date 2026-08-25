# Modern Spring Boot Backend with Apache Calcite (Java 26 + PostgreSQL) 🚀

This documentation provides a comprehensive, production-grade architectural blueprint for migrating the SQL Visualizer backend from Next.js API routes to a standard, high-performance **Java 26** and **Spring Boot 3.x** microservice.

---

## 🏗️ Architectural Overview

The core philosophy of this design is **Separation of Concerns (SoC)** and the **"Zero-Impact Frontend Migration"** principle. The backend is rewritten in Spring Boot, but it exposes the exact same JSON response models that the Next.js React frontend expects. 

### Core Tech Stack

*   **Java 26**: Leveraging state-of-the-art JVM capabilities including:
    *   **Virtual Threads (Project Loom)**: To handle thousands of concurrent analysis/AI streaming requests with minimal memory overhead.
    *   **Record Patterns (JEP 440)**: For clean deconstruction of parsed AST nodes.
    *   **Pattern Matching for `switch`**: For high-performance dialect-specific traversal.
*   **Spring Boot 3.4+**: Utilizing reactive extensions, structured logging, and unified error handling.
*   **Apache Calcite**: The industry-standard SQL parsing, validation, and relational algebra framework. Used to parse multi-dialect SQL (MySQL, PostgreSQL, Oracle, MS SQL Server) and extract relationships, JOINs, CTEs, and projections.
*   **PostgreSQL**: Storing user profiles, persistent setting preferences from the dashboard, query history, and vector embeddings using the `pgvector` extension.
*   **Spring AI**: Facilitating LLM integration (OpenAI/Ollama/Gemini) for query explanations and RAG (Docs Consultant).

---

## 📁 System Architecture & Package Layout

We adopt a package-by-feature modular design:

```text
com.sqlvisualizer.backend
│
├── SqlVisualizerApplication.java        # Spring Boot Entry point
│
├───config                               # System configuration
│   ├── CalciteConfiguration.java        # Bean configuration for Calcite Parsers & Dialects
│   ├── DatabaseConfiguration.java       # PostgreSQL & Hibernate persistence setups
│   ├── SpringAiConfiguration.java       # LLM Chat & Embedding client setups
│   └── SecurityConfiguration.java       # Stateless CORS & JWT auth rules
│
├───common                               # Shared cross-cutting components
│   ├── exception                        # Global exception filters
│   ├── advice                           # Controller response advice
│   └── util                             # SQL cleaners and text helper functions
│
├───domain.user                          # Dashboard user & Settings domain
│   ├── controller                       # UserController & DashboardSettingsController
│   ├── entity                           # User.java & DashboardSettings.java
│   ├── repository                       # UserRepository & DashboardSettingsRepository
│   ├── service                          # UserPreferencesService
│   └── dto                              # SettingsDTO, UserProfileDTO
│
├───domain.analysis                      # Core SQL parsing & Apache Calcite integration
│   ├── controller                       # SqlAnalysisController
│   ├── service                          # CalciteAnalyzerService, SchemaCatalogManager
│   ├── parser                           # DialectSqlParser, AstTreeWalker
│   └── dto                              # TableNodeDTO, JoinEdgeDTO, AnalysisResultDTO
│
├───domain.scoring                       # Complexity scoring & Linter engine
│   ├── service                          # ComplexityScoringEngine, SqlLinterService
│   └── dto                              # ComplexityScoreDTO, LintingIssueDTO
│
├───domain.history                       # Saved queries & Semantic search
│   ├── controller                       # QueryHistoryController
│   ├── entity                           # QueryHistory.java (with pgvector mappings)
│   ├── repository                       # QueryHistoryRepository
│   └── service                          # QueryHistoryService, SemanticSearchService
│
└───domain.ai                            # AI explanation, optimization, and TTS
    ├── controller                       # AiAssistantController & SpeechController
    ├── service                          # AiService, DocsConsultantService, SpeechService
    └── dto                              # ExplainRequest, SpeechRequest, RagResponse
```

---

## ⚡ Key Java 26 Features Utilized

### 1. High-Concurrency Virtual Threads (Project Loom)
We configure Spring Boot to use virtual threads for processing Tomcat HTTP threads and Spring task executors. This enables block-free HTTP proxies to OpenAI/Ollama APIs and speech generators.
```properties
spring.threads.virtual.enabled=true
```

### 2. Record Patterns & Pattern Matching for AST Nodes
When walking through the Apache Calcite abstract syntax tree (`SqlNode`), Java 26's record patterns and pattern matching allow us to decompose subqueries, JOIN elements, and projections safely without archaic casting.

```java
public void processSqlNode(SqlNode sqlNode) {
    switch (sqlNode) {
        case SqlSelect select -> extractSelectProjections(select);
        case SqlJoin join -> extractJoinConditions(join);
        case SqlBasicCall call -> extractFunctionCalls(call);
        case null -> {}
        default -> log.debug("Unhandled SQL AST node: " + sqlNode.getClass().getName());
    }
}
```

---

## 📖 Complete Documentation Index

To explore the architecture in detail, please inspect the following markdown blueprints:

1. **[Apache Calcite Parser Design](CALCITE_ANALYZER_DESIGN.md)**: Deep-dive into parsing multi-dialect SQL and walking the Calcite AST to generate the exact required frontend schemas.
2. **[Database Schema Design](DATABASE_SCHEMA.md)**: DB schema, JPA mapping, and user settings config for PostgreSQL and `pgvector`.
3. **[API Endpoints and Execution Flow](API_ENDPOINTS_AND_FLOW.md)**: Standard Spring Controllers, request payloads, and performance-tuned execution sequencing.
