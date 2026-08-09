# Install and Use Ollama

Use Ollama to run the AI SQL Explainer locally. This keeps SQL prompts on your machine and does not require an API key.

## Prerequisites

- SQL Visualizer is installed and its development server can run.
- Ollama is installed on the same machine as the browser by default.
- At least one downloaded Ollama model is available.

## 1. Install Ollama

Download and install Ollama for your operating system from [ollama.com](https://ollama.com/download).

After installation, verify that the command is available:

```bash
ollama --version
```

On Windows and macOS, Ollama normally starts its local service automatically. On Linux, start it in a separate terminal when needed:

```bash
ollama serve
```

The default local server address is `http://localhost:11434`.

## 2. Download a SQL-Capable Model

SQL Visualizer defaults to `qwen2.5-coder:7b`:

```bash
ollama pull qwen2.5-coder:7b
```

Confirm that the model is installed:

```bash
ollama list
```

You can use another installed model. Enter its exact name in SQL Visualizer Settings before generating an explanation.

## 3. Verify Ollama Locally

Run a short request before connecting it to SQL Visualizer:

```bash
ollama run qwen2.5-coder:7b "Explain what a SQL JOIN does in one sentence."
```

If the response succeeds, the model and local Ollama service are ready.

## 4. Configure SQL Visualizer

1. Start SQL Visualizer:

   ```bash
   npm run dev
   ```

2. Open `http://localhost:4028`.
3. Go to **Settings > AI Model Configuration**.
4. Select **Ollama** as the provider.
5. Set **Base URL** to `http://localhost:11434` when Ollama runs locally.
6. Set **Ollama Model** to `qwen2.5-coder:7b`, or the exact name shown by `ollama list`.
7. Keep the default context window of `4096` unless the Ollama model and server have been configured for a larger context.
8. Select **Save AI Configuration**.

No API key is needed for Ollama.

## 5. Explain SQL

1. Open **Smart SQL Editor** from the sidebar, or open **Query Input** and select **Smart Editor**.
2. Paste or write a SQL query.
3. Use the **AI SQL Explainer** panel to generate a structured explanation.
4. Ask follow-up questions in the same panel, or explain each CTE separately for queries that use CTEs.

The explainer supplies locally extracted query context, including tables, aliases, joins, and CTE structure where available.

## Context and Output Settings

The AI configuration controls the prompt budget and response size:

- **Context Window**: Default `4096` tokens for Ollama. This must match the real Ollama/model context capability.
- **Max Output Tokens**: Default `1200` tokens reserved for the explanation.
- **Temperature**: Lower values produce more consistent technical explanations. The default is `0.1`.
- **Batch Concurrency**: Controls simultaneous requests when explaining multiple CTEs. Keep it low for local models.

If a query is too large for the configured context, shorten the query or increase the context limit in both Ollama and SQL Visualizer.

## Remote Ollama Server

To connect to Ollama on another machine, enter its reachable URL in **Base URL**, for example:

```text
http://192.168.1.25:11434
```

Ensure the Ollama server is configured to listen on the network interface, the firewall allows the connection, and access is restricted to trusted devices. Do not expose an unauthenticated Ollama service directly to the public internet.

## Troubleshooting

| Problem | Check |
| --- | --- |
| Connection failed | Confirm Ollama is running and `http://localhost:11434` is reachable from the browser machine. |
| Model not found | Run `ollama list`, then copy the model name exactly into **Ollama Model**. |
| Slow explanations | Use a smaller model, reduce the context window, or lower batch concurrency. |
| Incomplete explanation | Increase the configured context only after increasing Ollama's actual context capability; otherwise the server may silently truncate the prompt. |
| Remote connection fails | Verify Ollama host binding, firewall rules, and the Base URL. |

## Privacy Note

With a local Ollama server, SQL Visualizer sends the AI prompt directly to that Ollama endpoint. Review the endpoint URL before generating an explanation, especially when using a remote server.

Related guide: [Smart SQL Editor and AI SQL Explainer](SMART_SQL_EDITOR_AI.md)

_Last Updated: 2026-08-09_
_Version: 2.2_
