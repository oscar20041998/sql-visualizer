// Server-only embedding for the Database AI Assistant's RAG query step. The corpus is indexed
// offline with a cloud OpenAI-compatible model (see scripts/build-database-knowledge-index.mjs);
// the query MUST embed with the SAME model, so this reads the dedicated OPENAI_EMBEDDING_* env
// vars and calls the gateway here on the server, keeping the key out of the browser.
const MAX_EMBED_CHARS = 2000;

function config() {
    const baseUrl = (process.env.OPENAI_EMBEDDING_BASE_URL || '').replace(/\/+$/, '');
    const apiKey = process.env.OPENAI_EMBEDDING_API_KEY || '';
    const model = process.env.OPENAI_EMBEDDING_MODEL || '';
    return { baseUrl, apiKey, model };
}

/** True only when all three OPENAI_EMBEDDING_* vars are set, so callers can 503 with a clear message. */
export function isKnowledgeEmbeddingConfigured(): boolean {
    const { baseUrl, apiKey, model } = config();
    return Boolean(baseUrl && apiKey && model);
}

export async function embedKnowledgeQuery(text: string, signal?: AbortSignal): Promise<number[]> {
    const { baseUrl, apiKey, model } = config();
    if (!baseUrl || !apiKey || !model) {
        throw new Error('OPENAI_EMBEDDING_BASE_URL, OPENAI_EMBEDDING_API_KEY and OPENAI_EMBEDDING_MODEL must be set.');
    }

    const response = await fetch(`${baseUrl}/v1/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, input: text.slice(0, MAX_EMBED_CHARS) || text }),
        signal,
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`Embedding request failed (${response.status}): ${detail || response.statusText}`);
    }

    const data = await response.json();
    const embedding = data?.data?.[0]?.embedding;
    if (!Array.isArray(embedding)) throw new Error('Gateway returned an unexpected embedding shape.');
    return embedding;
}
