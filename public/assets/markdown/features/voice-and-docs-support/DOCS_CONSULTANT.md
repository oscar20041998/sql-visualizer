# Ask the Docs Consultant 🤖

A chat panel on the **Guideline** page that answers questions about SQL Visualizer's own features and best practices, grounded in this documentation set rather than the model's general knowledge.

## Where to find it

Open the **Guideline** page (`/guideline`). The **Ask the Docs Consultant** panel sits right below the "Quick Start" banner, above the feature sections.

## How it works

1. Type a question (e.g. "How do I reduce a HIGH complexity score?") or click one of the three ready-made suggestions.
2. The question is embedded and compared against every documentation chunk in this `features/` folder; the four closest matches are retrieved.
3. Those matches are handed to the AI model configured in **Settings → AI Model Configuration** as context, with instructions to answer only from that context and say so plainly if the documentation does not cover the question.
4. The answer appears with a **Sources** row underneath, naming which document section(s) it drew from — so you can open that doc yourself to read more, or judge how much to trust the answer.

## What it can and cannot answer

- It answers questions about **how to use SQL Visualizer itself** — its panels, settings, scoring rules, workflows — because that is what this documentation set covers.
- It does **not** analyze the SQL query you have pasted, and it does **not** know about your database schema. For query-specific questions, use the **AI SQL Explainer** in the Smart SQL Editor instead.
- If the retrieved documentation genuinely does not cover your question, the answer will say so rather than guessing.

## Conversation and reset

Multiple turns are kept in the panel for the current session. Use the **Clear** button to drop the history and start over.

## Configuration notes

- Retrieval (turning your question into a search) always uses OpenAI's embedding API server-side, independent of which chat provider you have selected — a separate server credential is required for this even if your chat provider is Ollama, Anthropic, or Gemini.
- The documentation index is a one-time build step (`npm run build:docs-index`), not something regenerated on every request. If a doc file is added or edited, the index must be rebuilt for the consultant to know about the change.
