// Text-to-speech for the AI explanation panel.
//
// Speech is a separate concern from the chat provider: whichever model wrote the explanation, the
// audio is synthesized by OpenAI's speech model through /api/ai/speech, which attaches
// OPENAI_API_KEY server-side — the same "no credential in the browser" rule as /api/ai/generate.
import type { Locale, Translations } from '@/lib/i18n';
import type { SqlExplanation } from './aiService';

/**
 * Chat models cannot speak: `/v1/chat/completions` has no audio output, so gpt-4o-mini is not an
 * option here. Speech comes from `/v1/audio/speech`, and gpt-4o-mini-tts is the cheapest of its
 * natural-sounding models — and the only one that honours `instructions`.
 */
export const DEFAULT_SPEECH_MODEL = 'gpt-4o-mini-tts';

/** Speech models this app is allowed to ask for. Anything else is rejected by the route. */
export const SPEECH_MODELS = ['gpt-4o-mini-tts', 'tts-1', 'tts-1-hd'] as const;

export const SPEECH_VOICES = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'fable',
  'nova',
  'onyx',
  'sage',
  'shimmer',
  'verse',
] as const;

/** Neutral, unhurried voice — this is a technical read-out, not a performance. */
export const DEFAULT_SPEECH_VOICE = 'alloy';

/** User-facing voice preference; maps to a concrete provider voice/directory downstream. */
export type SpeechGender = 'male' | 'female';
export const SPEECH_GENDERS: SpeechGender[] = ['female', 'male'];
export const DEFAULT_SPEECH_GENDER: SpeechGender = 'female';

/** Concrete OpenAI voice used when the caller only specifies a gender preference, not a voice id. */
const OPENAI_VOICE_BY_GENDER: Record<SpeechGender, string> = {
  female: 'nova',
  male: 'onyx',
};

/** `/v1/audio/speech` rejects longer input outright, so both sides clamp to this. */
export const MAX_SPEECH_CHARS = 4096;

/**
 * Delivery notes for the narrator. Only gpt-4o-mini-tts reads these; the tts-1 family ignores the
 * field, so the route drops it for those models rather than sending a parameter they reject.
 */
export const SPEECH_INSTRUCTIONS =
  'You are reading an explanation of a SQL query aloud to a colleague. Speak calmly and clearly at ' +
  'a moderate pace, pause briefly between sections, and pronounce table and column names ' +
  'distinctly, letter by letter when they are abbreviations. Do not add commentary of your own.';

/** Cuts overlong text at a sentence — then a word — boundary, so playback never stops mid-word. */
export function clampSpeechText(text: string, limit = MAX_SPEECH_CHARS): string {
  const trimmed = text.trim();
  if (trimmed.length <= limit) return trimmed;

  const head = trimmed.slice(0, limit);
  const sentenceEnd = Math.max(
    head.lastIndexOf('. '),
    head.lastIndexOf('.\n'),
    head.lastIndexOf('! ')
  );
  if (sentenceEnd > limit * 0.6) return head.slice(0, sentenceEnd + 1);

  const wordEnd = head.lastIndexOf(' ');
  return `${wordEnd > 0 ? head.slice(0, wordEnd) : head}…`;
}

/**
 * Flattens one explanation into a narration script. Unlike the clipboard text, this reads the
 * panel the way it is seen: the "Explain this query" heading first, then every section title
 * followed by its body — including the empty-state sentences, so a listener is told that a
 * section had no filters rather than silently skipping it.
 */
export function buildSpeechScript(explanation: SqlExplanation, t: Translations): string {
  if (!explanation.structured) {
    return clampSpeechText(`${t.aiExplainerRunButton}.\n${explanation.raw}`);
  }

  const parts = [
    `${t.aiExplainerRunButton}.`,
    `${t.aiExplainerObjective}. ${explanation.objective || t.aiExplainerNoContent}`,
    `${t.aiExplainerOutput}. ${explanation.output || t.aiExplainerNoContent}`,
    explanation.filters.length
      ? `${t.aiExplainerFilters}. ${explanation.filters.map((filter) => filter.replace(/\.?$/, '.')).join(' ')}`
      : `${t.aiExplainerFilters}. ${t.aiExplainerNoFilters}`,
  ];

  if (explanation.tables.length) {
    parts.push(`${t.aiExplainerTables}. ${explanation.tables.join(', ')}.`);
  }

  return clampSpeechText(parts.join('\n'));
}

export interface SynthesizeSpeechRequest {
  text: string;
  /** Language the text is in — it picks the local voice, and is not inferred from the text. */
  locale: Locale;
  /** Male/female preference saved in Settings. Ignored when `voice` is given explicitly. */
  gender?: SpeechGender;
  voice?: string;
  model?: string;
  signal?: AbortSignal;
}

/** Which backend actually spoke, as reported by the route. */
export type SpeechEngineUsed = 'piper' | 'openai' | 'unknown';

export interface SynthesizedSpeech {
  blob: Blob;
  engine: SpeechEngineUsed;
}

/**
 * Asks the server route for narration audio. Returns the audio blob rather than playing it, so the
 * caller owns the lifetime of the object URL (one per explanation, cached and revoked by the panel).
 *
 * Which engine produces it is a server-side decision (AI_SPEECH_PROVIDER: a local Piper voice or
 * OpenAI), so no host or credential is named here — it is only reported back, so the caller can
 * tell the user whether the text left the machine. `model`/`voice` apply to the OpenAI engine only;
 * the local one reads with the voice installed for `locale`.
 */
export async function synthesizeSpeech({
  text,
  locale,
  gender = DEFAULT_SPEECH_GENDER,
  voice,
  model = DEFAULT_SPEECH_MODEL,
  signal,
}: SynthesizeSpeechRequest): Promise<SynthesizedSpeech> {
  const input = clampSpeechText(text);
  if (!input) throw new Error('There is nothing to read out.');

  // The local (Piper) engine picks its own voice per locale+gender server-side; `voice` only
  // matters for the OpenAI engine, where it defaults to whichever concrete voice the gender maps to.
  const resolvedVoice = voice ?? OPENAI_VOICE_BY_GENDER[gender];

  const response = await fetch('/api/ai/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: input, model, voice: resolvedVoice, locale, gender }),
    signal,
  });

  if (!response.ok) {
    // The route always answers failures as JSON, but a proxy or a crash can return HTML instead.
    let message = `Speech request failed (HTTP ${response.status}).`;
    try {
      const payload = (await response.json()) as { error?: unknown };
      if (typeof payload.error === 'string' && payload.error.trim()) message = payload.error;
    } catch {
      /* keep the status-code message */
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  if (!blob.size) throw new Error('The speech model returned empty audio.');

  const reported = response.headers.get('X-Speech-Engine');
  return {
    blob,
    engine: reported === 'piper' || reported === 'openai' ? reported : 'unknown',
  };
}
