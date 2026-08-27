# Database Schema Design

## Overview
The application uses PostgreSQL as the persistent storage engine, utilizing JPA/Hibernate for ORM mapping. The `pgvector` extension is employed for embedding storage and semantic search capabilities.

## Entity Relationships (ERD)

### 1. User
- `id`: UUID (PK)
- `username`: VARCHAR(50), Unique, Not Null
- `email`: VARCHAR(100), Unique, Not Null
- `password_hash`: VARCHAR(255), Not Null
- `created_at`: TIMESTAMP

### 2. DashboardSettings
- `id`: UUID (PK)
- `user_id`: UUID (FK, Unique, references User)
- `theme`: VARCHAR(10)
- `language`: VARCHAR(10)
- `default_dialect`: VARCHAR(20)
- `auto_analyze`: BOOLEAN
- `graph_layout_algorithm`: VARCHAR(50)
- `graph_node_spacing`: VARCHAR(20)
- `graph_edge_style`: VARCHAR(20)
- `accent_color`: VARCHAR(20)
- `ai_provider`: VARCHAR(50)
- `ai_model_id`: VARCHAR(100)
- `ai_temperature`: DOUBLE
- `ai_system_prompt`: TEXT

> **Security Note**: This table stores user *preferences* for UI and AI configuration only. **API Keys are NOT stored here.** API Keys are managed securely on the server-side via environment variables or a Secret Manager to ensure they remain encrypted and inaccessible via database dumps.

### 3. QueryHistory
- `id`: UUID (PK)
- `user_id`: UUID (FK, references User)
- `sql_content`: TEXT
- `dialect`: VARCHAR(20)
- `table_count`: INT
- `join_count`: INT
- `complexity_level`: VARCHAR(20)
- `embedding`: VECTOR(1536) (pgvector for semantic search)
- `created_at`: TIMESTAMP

## Database Configuration
- Connection pooling is handled by HikariCP with virtual thread support.
- Indexes are applied on `user_id` and `created_at` fields to optimize search performance.
- `pgvector` index: `HNSW` index applied on the `embedding` column for fast approximate nearest neighbor search.
