// Server-side text-to-speech for the AI SQL Explainer's read-aloud button.
//
// Validation and shape mirror /api/ai/generate: the browser posts text, the server decides which
// engine synthesizes it and returns audio. Which engine that is lives in aiSpeechEngine
// (AI_SPEECH_PROVIDER: a local Piper voice by default, OpenAI when a credential is configured) —
// the browser has no say in it, and never sees a key either way.
import { NextResponse } from 'next/server';
import { redactSecrets } from '@/lib/ai/aiRouteValidation';
import {
  DEFAULT_SPEECH_GENDER,
  DEFAULT_SPEECH_MODEL,
  DEFAULT_SPEECH_VOICE,
  MAX_SPEECH_CHARS,
  SPEECH_GENDERS,
  SPEECH_MODELS,
  SPEECH_VOICES,
  type SpeechGender,
} from '@/lib/ai/aiSpeech';
import { resolveSpeechProvider, synthesize, SpeechEngineError } from '@/lib/ai/aiSpeechEngine';
import type { Locale } from '@/lib/i18n';

// The Piper engine loads a native addon; the edge runtime cannot.
export const runtime = 'nodejs';

interface SpeechRequestBody {
  text?: unknown;
  model?: unknown;
  voice?: unknown;
  locale?: unknown;
  gender?: unknown;
}

const ALLOWED_MODELS = new Set<string>(SPEECH_MODELS);
const ALLOWED_VOICES = new Set<string>(SPEECH_VOICES);
const ALLOWED_GENDERS = new Set<string>(SPEECH_GENDERS);

export async function POST(request: Request) {
  let body: SpeechRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return NextResponse.json({ error: 'text is required.' }, { status: 400 });
  }
  if (text.length > MAX_SPEECH_CHARS) {
    return NextResponse.json(
      { error: `text must be at most ${MAX_SPEECH_CHARS} characters (received ${text.length}).` },
      { status: 400 }
    );
  }

  // Selects the voice Piper reads with, and is the language the text is actually in.
  const locale: Locale = body.locale === 'vi' ? 'vi' : 'en';

  // An arbitrary model or voice string would be forwarded to a paid endpoint with our credential
  // attached, so both are allow-listed rather than validated by the provider's error response.
  const model =
    typeof body.model === 'string' && body.model.trim() ? body.model.trim() : DEFAULT_SPEECH_MODEL;
  if (!ALLOWED_MODELS.has(model)) {
    return NextResponse.json(
      { error: `Unsupported speech model: ${model}. Allowed: ${[...ALLOWED_MODELS].join(', ')}.` },
      { status: 400 }
    );
  }

  const voice =
    typeof body.voice === 'string' && body.voice.trim() ? body.voice.trim() : DEFAULT_SPEECH_VOICE;
  if (!ALLOWED_VOICES.has(voice)) {
    return NextResponse.json(
      { error: `Unsupported voice: ${voice}. Allowed: ${[...ALLOWED_VOICES].join(', ')}.` },
      { status: 400 }
    );
  }

  // Selects which locally-installed Piper voice folder is used; the OpenAI engine ignores it
  // (its concrete voice id already encodes the gender via `voice` above).
  const gender: SpeechGender =
    typeof body.gender === 'string' && ALLOWED_GENDERS.has(body.gender)
      ? (body.gender as SpeechGender)
      : DEFAULT_SPEECH_GENDER;

  try {
    const provider = resolveSpeechProvider();
    const audio = await synthesize(provider, {
      text,
      locale,
      model,
      voice,
      gender,
      signal: request.signal,
    });
    return new NextResponse(audio.body, {
      status: 200,
      headers: {
        'Content-Type': audio.contentType,
        'Cache-Control': 'no-store',
        // Lets the panel say whether the text left the machine, which only the server knows.
        'X-Speech-Engine': provider,
      },
    });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      // The browser stopped playback; nothing to report back.
      return new NextResponse(null, { status: 499 });
    }
    if (error instanceof SpeechEngineError) {
      return NextResponse.json({ error: redactSecrets(error.message) }, { status: error.status });
    }
    console.error('[api/ai/speech]', error);
    return NextResponse.json(
      { error: 'The speech request failed on the server.' },
      { status: 502 }
    );
  }
}
