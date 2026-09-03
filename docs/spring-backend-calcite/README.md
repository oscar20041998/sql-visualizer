# Modern Spring Boot Backend with Apache Calcite (Java 26 + PostgreSQL)

This documentation is the target architecture for migrating SQL Visualizer from Next.js routes and browser-local state to a Java 26 / Spring Boot service. It is not yet an implementation or a description of every current Next.js route. The canonical REST contract is [API_ENDPOINTS_AND_FLOW.md](API_ENDPOINTS_AND_FLOW.md); the database migration is [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).

---

## 🏗️ Architectural Overview

The core philosophy of this design is **Separation of Concerns (SoC)** and the **"Zero-Impact Frontend Migration"** principle. The backend is rewritten in Spring Boot, but it exposes the exact same JSON response models that the Next.js React frontend expects.

### Core Tech Stack

- **Java 26**: Leveraging state-of-the-art JVM capabilities including:
  - **Virtual Threads (Project Loom)**: To handle thousands of concurrent analysis/AI streaming requests with minimal memory overhead.
  - **Record Patterns (JEP 440)**: For clean deconstruction of parsed AST nodes.
  - **Pattern Matching for `switch`**: For high-performance dialect-specific traversal.
- **Spring Boot 3.4+**: Utilizing reactive extensions, structured logging, and unified error handling.
- **Apache Calcite**: The industry-standard SQL parsing, validation, and relational algebra framework. Used to parse multi-dialect SQL (MySQL, PostgreSQL, Oracle, MS SQL Server) and extract relationships, JOINs, CTEs, and projections.
- **PostgreSQL**: Storing user profiles, persistent setting preferences from the dashboard, query history, and vector embeddings using the `pgvector` extension.
- **Spring AI**: Facilitating LLM integration (OpenAI/Ollama/Gemini) for query explanations and RAG (Docs Consultant).

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

## 🔌 API Contracts & Payload Specifications

**Mandatory Security Requirement**: Every endpoint except registration, login, and token refresh requires a valid JWT token in the header:
`Authorization: Bearer <JWT_TOKEN>`

### Error Handling

The API follows standard REST practices:

- `200 OK` / `201 Created`: Success.
- `400 Bad Request`: Validation failure (syntax errors, invalid dialects).
- `401 Unauthorized`: Token missing or invalid/expired (Required for all endpoints).
- `403 Forbidden`: Insufficient permissions.
- `429 Too Many Requests`: Rate limit exceeded (especially for AI endpoints).

### 1. Authentication API (`/api/auth`)

Handles user identity management.

| Method | URL                  | Description       | Request Payload                 | Response             |
| :----- | :------------------- | :---------------- | :------------------------------ | :------------------- |
| `POST` | `/api/auth/register` | User registration | `username`, `email`, `password` | `201 Created`        |
| `POST` | `/api/auth/login`    | User login        | `email`, `password`             | `200 OK` (JWT Token) |
| `POST` | `/api/auth/refresh`  | Refresh JWT token | `{ refreshToken: "..." }`       | `200 OK` (New Token) |

### 2. User Profile & Settings API (`/api/user`)

Handles user profiles and persistent dashboard preferences.

| Method  | URL                  | Description      | Request Payload            | Response                    |
| :------ | :------------------- | :--------------- | :------------------------- | :-------------------------- |
| `GET`   | `/api/user/profile`  | Get user profile | N/A                        | `200 OK` (`UserProfileDTO`) |
| `PATCH` | `/api/user/profile`  | Update profile   | `displayName`, `avatarUrl` | `200 OK`                    |
| `GET`   | `/api/user/settings` | Get settings     | N/A                        | `200 OK` (`SettingsDTO`)    |
| `PATCH` | `/api/user/settings` | Save settings    | Partial settings object    | `200 OK`                    |

### 3. SQL Analysis API (`POST /api/analysis/analyze`)

Request validation, status codes, and the common error envelope are defined in [API_ENDPOINTS_AND_FLOW.md](API_ENDPOINTS_AND_FLOW.md). The sections below define the `AnalysisResultDto` payload.
This is the core analysis endpoint of the system. It parses a SQL string using Apache Calcite, analyzes the AST, calculates query complexity and estimated execution costs, and returns the structural layout for graph-based visualization.

- **URL**: `/api/analysis/analyze`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`

#### Request (JSON Input)

| Field     | Java Type | TypeScript Type                                      | Required | Description                                                                           |
| :-------- | :-------- | :--------------------------------------------------- | :------- | :------------------------------------------------------------------------------------ |
| `sql`     | `String`  | `string`                                             | **Yes**  | The raw SQL query block to parse, clean, and analyze.                                 |
| `dialect` | `String`  | `'mysql' \| 'postgresql' \| 'sqlserver' \| 'oracle'` | **Yes**  | The SQL syntax rules to apply during validation.                                      |
| `locale`  | `String`  | `string`                                             | No       | Target translation language for analysis messages (default: `"en"`). Supports `"vi"`. |

**Example Request Payload:**

```json
{
  "sql": "SELECT u.id, u.name, o.total FROM users u INNER JOIN orders o ON u.id = o.user_id WHERE o.total > 100",
  "dialect": "postgresql",
  "locale": "en"
}
```

#### Response (JSON Output)

- **Status Code**: `200 OK` (on parsing and analysis success)
- **Status Code**: `400 Bad Request` (on syntax errors, invalid dialects, or parser failures)

| Field                 | Java DTO Class / Record | TS Interface / Type                                  | Description                                                                           |
| :-------------------- | :---------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------------ |
| `tables`              | `List<TableNodeDTO>`    | `TableNode[]`                                        | Extracted database tables, CTEs, or subqueries depicted as nodes in the graph.        |
| `joins`               | `List<JoinEdgeDTO>`     | `JoinEdge[]`                                         | Relationships between table nodes, shown as edges in the graph.                       |
| `joinAnalysisDetails` | `List<JoinDetailDTO>`   | `JoinDetailItem[]`                                   | Deep conditional evaluation for join complexity.                                      |
| `ctes`                | `List<CteDTO>`          | `CTE[]`                                              | Found Common Table Expressions (CTEs), including unused checks and dependency chains. |
| `metrics`             | `SqlMetricsDTO`         | `SqlMetrics`                                         | Aggregated scalar statistics for individual SQL keywords and structures.              |
| `complexity`          | `ComplexityScoreDTO`    | `ComplexityScore`                                    | Total calculated query difficulty category, score, and weight factors.                |
| `detailedComplexity`  | `DetailedComplexityDTO` | `DetailedComplexityScore`                            | Exhaustive score breakdown itemized by clauses, select fields, and window functions.  |
| `executionCost`       | `ExecutionCostDTO`      | `ExecutionCostEstimate`                              | Performance profiling indicator consisting of risk triggers and recommendations.      |
| `mainQueryFields`     | `List<QueryFieldDTO>`   | `QueryField[]`                                       | The projected columns selected in the outermost query block.                          |
| `dialect`             | `String`                | `'mysql' \| 'postgresql' \| 'sqlserver' \| 'oracle'` | Re-confirmed dialect used for parsing.                                                |
| `rawSql`              | `String`                | `string`                                             | Trimmed and standardized copy of the incoming SQL text.                               |
| `structuralReport`    | `StructuralReportDTO`   | `StructuralAnalysisReport`                           | High-level overview of query density (subqueries, joins, lines).                      |
| `metricDetails`       | `MetricDetailsDTO`      | `MetricDetailsReport`                                | Specific matched clauses (WHERE, HAVING) with exact query snippet locations.          |
| `hasCTE`              | `boolean`               | `boolean`                                            | Flag indicating whether the query utilizes one or more CTEs.                          |

---

#### Detailed Object Definitions (DTO Schemas)

##### A. TableNodeDTO

Describes individual visual nodes in the relationship schema.
| Field | Java Type | TS Type | Nullable | Description |
| :--- | :--- | :--- | :---: | :--- |
| `id` | `String` | `string` | No | Unique ID generated for the graph representation (e.g. `table_users_u`). |
| `name` | `String` | `string` | No | Table name as declared in the DB, or alias name for subqueries/CTEs. |
| `alias` | `String` | `string` | Yes | Custom reference alias assigned in the query (e.g. `u` for `users u`). |
| `columns` | `List<String>`| `string[]` | No | Extracted columns associated with this specific table. |
| `isSubquery` | `Boolean` | `boolean` | Yes | True if the table represents an inline subquery select block. |
| `isCTE` | `Boolean` | `boolean` | Yes | True if the table represents a Common Table Expression. |

##### B. JoinEdgeDTO

Represents directed join relationships in the graph canvas.
| Field | Java Type | TS Type | Nullable | Description |
| :--- | :--- | :--- | :---: | :--- |
| `id` | `String` | `string` | No | Unique ID for the link (e.g., `join_users_orders`). |
| `source` | `String` | `string` | No | `id` of the left-hand table node. |
| `target` | `String` | `string` | No | `id` of the right-hand table node. |
| `joinType` | `String` | `JoinType` | No | Type of SQL join (`INNER JOIN`, `LEFT JOIN`, `RIGHT JOIN`, `FULL OUTER JOIN`, `CROSS JOIN`, etc.). |
| `condition` | `String` | `string` | No | Raw ON filter expression (e.g. `u.id = o.user_id`). |

##### C. CteDTO

Represents parsed Common Table Expressions.
| Field | Java Type | TS Type | Nullable | Description |
| :--- | :--- | :--- | :---: | :--- |
| `id` | `String` | `string` | No | Unique CTE ID. |
| `name` | `String` | `string` | No | Declared CTE query identifier. |
| `body` | `String` | `string` | No | SQL query enclosed inside the CTE. |
| `tables` | `List<String>`| `string[]` | No | External tables referenced inside the CTE block. |
| `fields` | `List<String>`| `string[]` | No | Projected columns produced by the CTE block. |
| `usageCount` | `Integer` | `number` | No | Number of times this CTE is referenced in other queries. |
| `dependencies` | `List<String>`| `string[]` | No | Names of other CTEs on which this CTE depends. |
| `isRecursive` | `Boolean` | `boolean` | No | True if the CTE utilizes recursive reference. |
| `estimatedComplexity`| `String` | `'LOW' \| 'MEDIUM' \| 'HIGH'` | No | Heuristic estimation of the CTE internal complexity. |
| `isUnused` | `Boolean` | `boolean` | No | True if defined but never invoked in the main query. |
| `columnReferences`| `List<String>`| `string[]` | No | Set of columns referencing this CTE in subsequent selections. |
| `lineCount` | `Integer` | `number` | No | Estimated lines of code. |
| `nestedSubqueries` | `List<NestedSubqueryDTO>` | `NestedSubquery[]` | No | Detailed list of subqueries nested inside the CTE. |

##### D. SqlMetricsDTO

Provides precise itemized counts of distinct SQL constructs.
| Field | Java Type | TS Type | Description |
| :--- | :--- | :--- | :--- |
| `windowFunctions` | `int` | `number` | Count of window expressions (`OVER`, `PARTITION BY`). |
| `groupBy` | `int` | `number` | Count of grouping columns. |
| `orderBy` | `int` | `number` | Count of ordering clauses. |
| `distinct` | `int` | `number` | Count of `DISTINCT` flags. |
| `having` | `int` | `number` | Count of `HAVING` filters. |
| `where` | `int` | `number` | Count of filter lines in `WHERE` clauses. |
| `subqueryDepth` | `int` | `number` | Peak depth of subquery nesting. |
| `subqueryCount` | `int` | `number` | Total subquery blocks detected. |
| `conditionCount` | `int` | `number` | Total number of comparisons (`=`, `>`, `<`, `LIKE`). |
| `operationAndFunctionCount` | `int` | `number` | Mathematical, scalar, and date/string operations. |
| `lineCount` | `int` | `number` | SQL query line count. |
| `joinCount` | `int` | `number` | Overall number of `JOIN` links. |
| `cteCount` | `int` | `number` | Distinct CTEs defined under `WITH`. |
| `tableCount` | `int` | `number` | Unique persistent DB tables queried. |
| `selectFields` | `int` | `number` | Column definitions under all SELECT lists. |
| `finalSelectFieldCount`| `int` | `number` | Target projection column count in the primary SELECT list. |

##### E. ComplexityScoreDTO

Aggregates complexity factors to assign an overall grade.
| Field | Java Type | TS Type | Description |
| :--- | :--- | :--- | :--- |
| `level` | `String` | `'LOW' \| 'MEDIUM' \| 'HIGH' \| 'SUPER_HIGH'` | Complexity severity classification. |
| `score` | `double` | `number` | Absolute calculated complexity value. |
| `maxScore` | `double` | `number` | System maximum calibration metric. |
| `factors` | `List<Factor>`| `ComplexityFactor[]` | Contributor details explaining score accumulation. |

- **`Factor` Record Schema**:
  - `name` (`String` / `string`): Factor class (e.g. `"Joins"`, `"Aggregations"`, `"Subqueries"`).
  - `value` (`double` / `number`): Component quantity (e.g., `3` joins).
  - `weight` (`double` / `number`): Constant penalty coefficient per unit (e.g. `4.0` per join).
  - `contribution` (`double` / `number`): Calculated offset (`value * weight`).

##### F. ExecutionCostDTO

Provides heuristic optimization advice and cost estimates.
| Field | Java Type | TS Type | Description |
| :--- | :--- | :--- | :--- |
| `label` | `String` | `string` | Category label (e.g., `"Optimal"`, `"High Execution Warning"`). |
| `score` | `double` | `number` | Computed cost rating. |
| `maxScore` | `double` | `number` | Reference maximum for execution scale. |
| `factors` | `List<CostFactor>`| `CostFactor[]` | Performance threats identified. |
| `recommendation` | `String` | `string` | Suggested tuning advice (e.g. indexes, query rewrite). |

- **`CostFactor` Record Schema**:
  - `name` (`String` / `string`): Trigger cause (e.g. `"Full Table Scan Risk"`, `"Multiple Join Cost"`).
  - `impact` (`String` / `'low' \| 'medium' \| 'high'`): Severity of optimization penalty.
  - `note` (`String` / `string`): Targeted explanation details.

##### G. QueryFieldDTO

Defines columns projected by the outermost main SELECT query block.
| Field | Java Type | TS Type | Nullable | Description |
| :--- | :--- | :--- | :---: | :--- |
| `field` | `String` | `string` | No | Expression syntax for the field (e.g., `SUM(o.total)` or `u.name`). |
| `alias` | `String` | `string` | Yes | Assigned alias name (e.g., `user_total`). |
| `origin` | `String` | `string` | No | Direct physical parent table column name if resolvable; empty when unresolved. |
| `sourceTable`| `String` | `string` | Yes | Parent table ID (e.g. `table_users_u`). |
| `type` | `String` | `'cte' \| 'table' \| 'expression'` | No | Category classifying whether field represents raw column or calculated formula. |

---

**Example Response Payload (Complete Structure):**

```json
{
  "rawSql": "SELECT u.id, u.name, o.total FROM users u INNER JOIN orders o ON u.id = o.user_id WHERE o.total > 100",
  "dialect": "postgresql",
  "hasCTE": false,
  "tables": [
    {
      "id": "table_users_u",
      "name": "users",
      "alias": "u",
      "columns": ["id", "name"]
    },
    {
      "id": "table_orders_o",
      "name": "orders",
      "alias": "o",
      "columns": ["total", "user_id"]
    }
  ],
  "joins": [
    {
      "id": "join_users_orders",
      "source": "table_users_u",
      "target": "table_orders_o",
      "joinType": "INNER JOIN",
      "condition": "u.id = o.user_id"
    }
  ],
  "ctes": [],
  "metrics": {
    "windowFunctions": 0,
    "groupBy": 0,
    "orderBy": 0,
    "distinct": 0,
    "having": 0,
    "where": 1,
    "subqueryDepth": 0,
    "subqueryCount": 0,
    "conditionCount": 2,
    "operationAndFunctionCount": 1,
    "lineCount": 1,
    "joinCount": 1,
    "cteCount": 0,
    "tableCount": 2,
    "selectFields": 3,
    "finalSelectFieldCount": 3
  },
  "complexity": {
    "level": "LOW",
    "score": 6.0,
    "maxScore": 100.0,
    "factors": [
      { "name": "Base Clauses", "value": 1.0, "weight": 2.0, "contribution": 2.0 },
      { "name": "Joins", "value": 1.0, "weight": 4.0, "contribution": 4.0 }
    ]
  },
  "executionCost": {
    "label": "Optimal",
    "score": 15.0,
    "maxScore": 100.0,
    "factors": [
      {
        "name": "Indexed Join Check",
        "impact": "low",
        "note": "Primary key join u.id = o.user_id detected."
      }
    ],
    "recommendation": "Query is highly optimal. Ensure u.id and o.user_id are index-backed."
  },
  "mainQueryFields": [
    {
      "field": "u.id",
      "alias": "id",
      "origin": "id",
      "sourceTable": "table_users_u",
      "type": "table"
    },
    {
      "field": "u.name",
      "alias": "name",
      "origin": "name",
      "sourceTable": "table_users_u",
      "type": "table"
    },
    {
      "field": "o.total",
      "alias": "total",
      "origin": "total",
      "sourceTable": "table_orders_o",
      "type": "table"
    }
  ],
  "structuralReport": {
    "joinCount": 1,
    "subqueryCount": 0,
    "conditionCount": 2,
    "operationAndFunctionCount": 1,
    "lineCount": 1,
    "allFieldsCount": 3,
    "finalSelectFieldCount": 3,
    "hasCTE": false
  }
}
```

---

### 2. Query History API (`GET` & `POST` `/api/history`)

Target persistence API for reading, saving, and semantically searching user execution history. It uses PostgreSQL and `pgvector` after the Spring migration; the current frontend's local/static history is not this service.

#### A. Save Query History (`POST /api/history`)

Persists a single completed analyzer result.

- **Request Payload:**
  | Field | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `sql` | `String` | **Yes** | The raw SQL code block. |
  | `dialect` | `String` | **Yes** | Dialect identifier. |
  | `tableCount`| `int` | **Yes** | Parsed number of tables. |
  | `joinCount` | `int` | **Yes** | Parsed number of joins. |
  | `complexityLevel`| `String`| **Yes** | Complexity tier (`LOW`, `MEDIUM`, etc.). |

- **Response Payload (Status `201 Created`):**
  ```json
  {
    "id": "8f2b3e41-61c0-4f5d-9da3-bf8092a492fb",
    "sql": "SELECT u.id, u.name, o.total FROM users u INNER JOIN orders o ON u.id = o.user_id WHERE o.total > 100",
    "dialect": "postgresql",
    "createdAt": "2026-09-01T12:34:56Z",
    "tableCount": 2,
    "joinCount": 1,
    "complexityLevel": "LOW",
    "embeddingModel": "text-embedding-3-large"
  }
  ```

#### B. Search/List Query History (`GET /api/history`)

Lists persistent query runs. If `query` is supplied, it performs a semantic cosine search over vectors generated with the same embedding model. The vector itself is never returned.

- **Query Parameters:**
  - `query` (`String`, Optional): Semantic search query (e.g. `"sales reports with joins"`).
  - `limit` (`int`, Optional, default: `50`): Maximum entries returned.
  - `page` (`int`, Optional, default: `1`): Page number for pagination.

- **Response Payload (Status `200 OK`):**
  Returns `{ items, page, size, totalItems, totalPages }`. `items` contains `QueryHistoryEntry` values, ordered by similarity when `query` is supplied or by creation date descending otherwise.

---

### 3. AI Assistant Proxy API (`POST /api/ai/generate`)

Directs client-side conversational queries to configured cloud-based AI providers securely, injecting keys on the server-side.

- **Request Payload:**
  | Field | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `provider` | `String` | **Yes** | Cloud provider (`openai`, `anthropic`, `gemini`). |
  | `modelId` | `String` | **Yes** | Target LLM model (e.g. `gpt-4o`, `claude-3-5-sonnet`). |
  | `messages` | `List<Message>`| **Yes** | Prompt history as roles and textual content. |
  | `temperature`| `Double` | No | Randomness scale between `0.0` and `2.0`. |
  | `maxTokens` | `Integer` | No | Limit for output token usage. |
  | `jsonMode` | `Boolean` | No | Forces the model to emit clean JSON structure. |
  | `stream` | `Boolean` | No | Enables streaming response (SSE). |

- **`Message` Object Schema**:
  - `role` (`String`): `'system'`, `'user'`, or `'assistant'`.
  - `content` (`String`): Message block text.

- **Response Payload (Status `200 OK`):**
  ```json
  {
    "content": "Here is an optimized version of your SQL statement. I added an index on o.user_id..."
  }
  ```

---

## 📖 Complete Documentation Index

To explore the architecture in detail, please inspect the following markdown blueprints:

1. **[Apache Calcite Parser Design](CALCITE_ANALYZER_DESIGN.md)**: Deep-dive into parsing multi-dialect SQL and walking the Calcite AST to generate the exact required frontend schemas.
2. **[Database Schema Design](DATABASE_SCHEMA.md)**: DB schema, JPA mapping, and user settings config for PostgreSQL and `pgvector`.
3. **[API Endpoints and Execution Flow](API_ENDPOINTS_AND_FLOW.md)**: Standard Spring Controllers, request payloads, and performance-tuned execution sequencing.
