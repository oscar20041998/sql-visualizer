# Query History and Semantic Search

Every query you run through **Analyze** on the Query Input page is saved locally and can be found again later — either by scrolling the list or by describing what the query does in plain language.

## What Gets Saved

Each time analysis completes successfully, an entry is added with:

- The SQL text and the selected dialect
- Table count and JOIN count
- The complexity level (LOW / MEDIUM / HIGH / SUPER HIGH)
- A timestamp

Saving the same query again refreshes it to the top of the list instead of creating a duplicate. History is capped at the 50 most recent queries and persists in the browser (localStorage) across sessions, alongside any bundled history. Semantic indexing and search use the configured embedding provider.

## Opening Query History

Choose **Query History** in the sidebar to open the history page. Results are displayed 20 per page. From there you can:

- **Load** a saved query back into the editor (restores both the SQL and its dialect).
- **Delete** a single entry.
- **Clear all** saved history, with a confirmation step.

## Searching by Meaning

Type a description of what you're looking for — for example *"monthly revenue by region"* — and press **Search**. The page embeds your search text and ranks saved queries by semantic similarity (a percentage match), so you can find a query even if it doesn't share any of the same keywords.

If semantic search can't run (for example, no AI provider is reachable), the page falls back to a plain substring match instead.

## Provider Requirements

Semantic search reuses the AI provider configured at **Settings > AI Model Configuration**:

| Provider | Embedding model | Notes |
| --- | --- | --- |
| Ollama | `nomic-embed-text` | Runs locally; pull it once with `ollama pull nomic-embed-text`. |
| OpenAI | `text-embedding-3-large` | Server-managed credential, same as SQL explanations. |
| Google Gemini | `text-embedding-004` | Server-managed credential. |
| Anthropic | Not supported | Anthropic has no embeddings API. Switch provider in Settings to use semantic search; plain text search still works. |

Indexing happens in the background right after analysis, so it never delays navigating to the Metrics Dashboard. A query without an embedding appears after scored matches until it is indexed.

_Last Updated: 2026-08-15_
_Version: 2.3_
