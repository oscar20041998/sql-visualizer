// Adapter layer routing AI generation requests to the active provider (Ollama or a cloud API).
import type { AIModelConfig } from './store';
import type { Locale } from './i18n';

const EXPLAIN_SQL_PROMPT: Record<Locale, (sql: string) => string> = {
  en: (sql) => `Explain the following SQL query in plain language:\n\n${sql}`,
  vi: (sql) => `Hãy giải thích truy vấn SQL sau đây bằng ngôn ngữ đơn giản, dễ hiểu:\n\n${sql}`,
};

export class AIServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export interface AIGenerateRequest {
  prompt: string;
  systemPrompt?: string;
}

function resolveSystemPrompt(config: AIModelConfig, request: AIGenerateRequest): string | undefined {
  return request.systemPrompt?.trim() || config.systemPrompt?.trim() || undefined;
}

async function callOllama(config: AIModelConfig, request: AIGenerateRequest): Promise<string> {
  const baseUrl = config.ollamaBaseUrl?.trim().replace(/\/+$/, '');
  if (!baseUrl) throw new AIServiceError('Ollama base URL is not configured.');
  if (!config.ollamaModel?.trim()) throw new AIServiceError('Ollama local model name is not configured.');

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.ollamaModel,
        prompt: request.prompt,
        system: resolveSystemPrompt(config, request),
        stream: false,
        options: { temperature: config.temperature },
      }),
    });
  } catch {
    throw new AIServiceError(`Unable to reach Ollama server at ${baseUrl}. Ensure Ollama is running.`);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new AIServiceError(`Ollama request failed (${response.status}): ${detail || response.statusText}`);
  }

  const data = await response.json();
  return data.response ?? '';
}

async function callOpenAI(config: AIModelConfig, request: AIGenerateRequest): Promise<string> {
  if (!config.apiKey?.trim()) {
    throw new AIServiceError('OpenAI API key is missing. Add it in Settings → AI Model Configuration.');
  }
  if (!config.modelId?.trim()) throw new AIServiceError('OpenAI model ID is not configured.');

  const systemPrompt = resolveSystemPrompt(config, request);
  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelId,
        temperature: config.temperature,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: request.prompt },
        ],
      }),
    });
  } catch {
    throw new AIServiceError('Unable to reach OpenAI API. Check your network connection.');
  }

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new AIServiceError(
      `OpenAI request failed (${response.status}): ${detail?.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callAnthropic(config: AIModelConfig, request: AIGenerateRequest): Promise<string> {
  if (!config.apiKey?.trim()) {
    throw new AIServiceError('Anthropic API key is missing. Add it in Settings → AI Model Configuration.');
  }
  if (!config.modelId?.trim()) throw new AIServiceError('Anthropic model ID is not configured.');

  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: config.modelId,
        max_tokens: 1024,
        temperature: config.temperature,
        system: resolveSystemPrompt(config, request),
        messages: [{ role: 'user', content: request.prompt }],
      }),
    });
  } catch {
    throw new AIServiceError('Unable to reach Anthropic API. Check your network connection.');
  }

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new AIServiceError(
      `Anthropic request failed (${response.status}): ${detail?.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}

async function callGemini(config: AIModelConfig, request: AIGenerateRequest): Promise<string> {
  if (!config.apiKey?.trim()) {
    throw new AIServiceError('Google Gemini API key is missing. Add it in Settings → AI Model Configuration.');
  }
  if (!config.modelId?.trim()) throw new AIServiceError('Gemini model ID is not configured.');

  const systemPrompt = resolveSystemPrompt(config, request);
  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        config.modelId
      )}:generateContent?key=${encodeURIComponent(config.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
          ...(systemPrompt ? { systemInstruction: { parts: [{ text: systemPrompt }] } } : {}),
          generationConfig: { temperature: config.temperature },
        }),
      }
    );
  } catch {
    throw new AIServiceError('Unable to reach Google Gemini API. Check your network connection.');
  }

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new AIServiceError(
      `Gemini request failed (${response.status}): ${detail?.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return (data.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('');
}

/** Routes a generation request to the provider configured in AIModelConfig. */
export async function generateWithAI(config: AIModelConfig, request: AIGenerateRequest): Promise<string> {
  switch (config.provider) {
    case 'ollama':
      return callOllama(config, request);
    case 'openai':
      return callOpenAI(config, request);
    case 'anthropic':
      return callAnthropic(config, request);
    case 'gemini':
      return callGemini(config, request);
    default:
      throw new AIServiceError(`Unsupported AI provider: ${config.provider}`);
  }
}

/** Convenience wrapper for the SQL-to-natural-language explanation use case. */
export async function explainSqlWithAI(
  sql: string,
  config: AIModelConfig,
  locale: Locale = 'en'
): Promise<string> {
  const buildPrompt = EXPLAIN_SQL_PROMPT[locale] ?? EXPLAIN_SQL_PROMPT.en;
  return generateWithAI(config, { prompt: buildPrompt(sql) });
}
