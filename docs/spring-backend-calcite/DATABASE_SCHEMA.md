# PostgreSQL Database Schema

## Scope

This is the target persistent schema for the Spring backend. It replaces the current browser/static-file query history implementation only after the migration is deployed. Flyway owns schema changes; Hibernate must run with `ddl-auto=validate` in every non-local environment.

## Type Decisions

| Concern              | PostgreSQL type        | Reason                                                                                    |
| -------------------- | ---------------------- | ----------------------------------------------------------------------------------------- |
| Identifiers          | `uuid`                 | Stable public identifiers without exposing sequence order                                 |
| Timestamps           | `timestamptz`          | Stores an absolute instant; Java maps to `Instant`                                        |
| SQL and prompts      | `text`                 | Avoids arbitrary practical limits                                                         |
| Enum-like values     | `varchar` plus `check` | Readable, forward-compatible, and validated in the database                               |
| Embeddings           | `vector(1536)`         | Matches `text-embedding-3-small`; use a separate migration if the model dimension changes |
| JSON preference maps | `jsonb`                | Preserves the frontend's provider-keyed token/base URL maps                               |

## Initial Flyway Migration

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE app_user (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	username varchar(50) NOT NULL,
	email varchar(254) NOT NULL,
	password_hash varchar(255) NOT NULL,
	display_name varchar(100) NOT NULL,
	avatar_url text,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT uq_app_user_username UNIQUE (username),
	CONSTRAINT uq_app_user_email UNIQUE (email),
	CONSTRAINT ck_app_user_username CHECK (char_length(username) BETWEEN 3 AND 50),
	CONSTRAINT ck_app_user_email CHECK (char_length(email) BETWEEN 3 AND 254)
);

CREATE TABLE refresh_token (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
	token_hash char(64) NOT NULL,
	expires_at timestamptz NOT NULL,
	revoked_at timestamptz,
	created_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT uq_refresh_token_hash UNIQUE (token_hash),
	CONSTRAINT ck_refresh_token_expiry CHECK (expires_at > created_at)
);

CREATE INDEX ix_refresh_token_active ON refresh_token (user_id, expires_at)
	WHERE revoked_at IS NULL;

CREATE TABLE dashboard_settings (
	user_id uuid PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
	theme varchar(10) NOT NULL DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
	locale varchar(5) NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'vi')),
	default_dialect varchar(20) NOT NULL DEFAULT 'mysql'
		CHECK (default_dialect IN ('mysql', 'postgresql', 'sqlserver', 'oracle')),
	auto_analyze boolean NOT NULL DEFAULT false,
	graph_layout varchar(10) NOT NULL DEFAULT 'dagre' CHECK (graph_layout IN ('dagre', 'force', 'grid')),
	node_spacing varchar(10) NOT NULL DEFAULT 'normal' CHECK (node_spacing IN ('compact', 'normal', 'spacious')),
	edge_style varchar(10) NOT NULL DEFAULT 'smooth' CHECK (edge_style IN ('smooth', 'straight', 'step')),
	accent_color varchar(9),
	performance_mode boolean NOT NULL DEFAULT false,
	ai_provider varchar(20) NOT NULL DEFAULT 'ollama'
		CHECK (ai_provider IN ('ollama', 'openai', 'anthropic', 'gemini')),
	ai_base_urls jsonb NOT NULL DEFAULT '{}'::jsonb,
	ollama_model varchar(200) NOT NULL DEFAULT 'qwen2.5-coder:7b',
	ai_model_id varchar(200) NOT NULL DEFAULT 'gpt-4o',
	ai_temperature double precision NOT NULL DEFAULT 0.1 CHECK (ai_temperature BETWEEN 0 AND 2),
	ai_system_prompt text NOT NULL,
	ai_context_tokens jsonb NOT NULL DEFAULT '{}'::jsonb,
	ai_max_output_tokens jsonb NOT NULL DEFAULT '{}'::jsonb,
	ai_batch_concurrency smallint NOT NULL DEFAULT 2 CHECK (ai_batch_concurrency BETWEEN 1 AND 10),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT ck_settings_accent_color CHECK (accent_color IS NULL OR accent_color ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE TABLE query_history (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
	sql_content text NOT NULL,
	sql_sha256 char(64) NOT NULL,
	dialect varchar(20) NOT NULL CHECK (dialect IN ('mysql', 'postgresql', 'sqlserver', 'oracle')),
	table_count integer NOT NULL CHECK (table_count >= 0),
	join_count integer NOT NULL CHECK (join_count >= 0),
	complexity_level varchar(20) CHECK (complexity_level IN ('LOW', 'MEDIUM', 'HIGH', 'SUPER_HIGH')),
	embedding vector(1536),
	embedding_model varchar(200),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT uq_query_history_dedup UNIQUE (user_id, sql_sha256, dialect),
	CONSTRAINT ck_query_history_embedding CHECK ((embedding IS NULL) = (embedding_model IS NULL))
);

CREATE INDEX ix_query_history_user_created ON query_history (user_id, created_at DESC);
CREATE INDEX ix_query_history_embedding_model ON query_history (user_id, embedding_model)
	WHERE embedding IS NOT NULL;
CREATE INDEX ix_query_history_embedding_hnsw ON query_history
	USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)
	WHERE embedding IS NOT NULL;
```

## Mapping and Operational Rules

- `sql_sha256` is a lower-case SHA-256 hex digest of the normalized SQL sent by the service; it supports deduplication without indexing unbounded `text`.
- Store only a hash of a refresh token. Rotate it on refresh and revoke it on logout or password reset.
- `dashboard_settings` has one row per user. Create it transactionally when registering the user.
- `updated_at` must be set by JPA auditing or a database trigger. Do not trust a client-provided timestamp.
- The `embedding` and `embedding_model` check prevents vectors without provenance. Similarity search must filter by model before applying `<=>` cosine distance.
- Never persist provider API keys, access tokens, or raw JWTs. Base URLs are preferences and must still be allow-listed by the server before a credential is attached.

## Retention and Migration

Keep at most 50 history rows per user to match the current product behavior. After insert/upsert, delete rows beyond the newest 50 in the same transaction. Import legacy history only after explicit user consent; assign no embedding until it is regenerated by the selected model.
