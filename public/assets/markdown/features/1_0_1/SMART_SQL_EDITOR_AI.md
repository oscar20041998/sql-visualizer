# Smart SQL Editor and AI SQL Explainer

The Smart SQL Editor is the single SQL editor implementation used by both the standalone editor page and the Smart Editor tab on Query Input.

## Smart SQL Editor

- Edit SQL in a Monaco-based editor with syntax highlighting and minimap navigation.
- Format SQL using the selected dialect: MySQL, PostgreSQL, SQL Server, or Oracle.
- Compare the edited query with its original version in a side-by-side diff view.
- Copy the current SQL or reset the editor to the original sample or query.
- The editor body fills its available panel height and follows the selected light or dark theme.

Open it from the sidebar at `/smart-sql-editor`, or select **Smart Editor** on the Query Input page.

## AI SQL Explainer

The explainer reads the SQL currently in the editor and creates a structured explanation with:

- Query objective
- Returned output
- Filters and constraints
- Referenced tables and data sources

Before asking the model, SQL Visualizer parses the query locally and includes extracted context when available. This helps the explanation identify aliases, joins, and query structure more reliably.

### Follow-up Chat

After generating an explanation, ask follow-up questions about the same query. Conversation history is bounded to the configured context window; the UI reports when older messages are trimmed.

### Explain Each CTE

For queries with Common Table Expressions, run a bounded batch that explains each CTE separately. Batch concurrency is configurable in Settings.

## Provider Configuration

Configure the provider at **Settings > AI Model Configuration**.

| Provider | Use case |
| --- | --- |
| Ollama | Run a model locally for a private workflow. |
| OpenAI | Use a server-managed OpenAI credential. |
| Anthropic | Use a server-managed Claude credential. |
| Google Gemini | Use a server-managed Gemini credential. |

For each provider, configure the model, endpoint, temperature, system prompt, context window, and output-token budget. Cloud credentials are managed on the server and are not stored in browser settings. Custom cloud endpoints must be allowed by the server configuration before credentials are sent.

## Guidance

- Use the AI explanation to understand and review SQL, then verify performance decisions with the Metrics Dashboard, Relationship Graph, and database execution plans.
- If the context meter shows that the query exceeds the configured prompt budget, shorten the query or increase the matching provider context window before generating an explanation.
- The AI panel, batch view, chat, and announcement respect the selected light or dark theme.

_Last Updated: 2026-08-09_
_Version: 2.2_
