// Server-only speech backends behind one signature: text in, audio bytes out.
//
// Two engines, chosen by AI_SPEECH_PROVIDER:
//
//   piper  (default) — a Piper VITS voice run locally through sherpa-onnx. No key, no network, no
//                      per-request cost. Needs a native addon and ~140 MB of voices on disk, so it
//                      works when self-hosting or on `npm run dev`, never on a serverless deploy.
//   openai           — /v1/audio/speech with gpt-4o-mini-tts. Needs a credential, works anywhere.
//
// Imported only by the /api/ai/speech route: it loads a native module, so pulling it into a client
// component would break the build.
import { access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { DEFAULT_BASE_URLS } from './aiProviders';
import { normalizeBaseUrl } from './aiService';
import { SPEECH_INSTRUCTIONS } from './aiSpeech';
import type { Locale } from '@/lib/i18n';
// Type-only: erased at compile time, so declaring these costs no load of the native addon.
import type { OfflineTts, OfflineTtsGeneratedAudio } from 'sherpa-onnx-node';

export type SpeechProvider = 'piper' | 'openai';

export interface SpeechSynthesisRequest {
  text: string;
  locale: Locale;
  model: string;
  voice: string;
  signal: AbortSignal;
}

export interface SpeechAudio {
  body: BodyInit;
  contentType: string;
}

/**
 * A failure worth showing verbatim. `status` separates "this deployment is misconfigured" (503,
 * nothing the click did wrong) from "the call failed" (502).
 */
export class SpeechEngineError extends Error {
  constructor(
    message: string,
    readonly status: 502 | 503 = 502
  ) {
    super(message);
  }
}

export function resolveSpeechProvider(): SpeechProvider {
  const configured = process.env.AI_SPEECH_PROVIDER?.trim().toLowerCase();
  if (!configured) return 'piper';
  if (configured === 'piper' || configured === 'openai') return configured;
  throw new SpeechEngineError(
    `AI_SPEECH_PROVIDER must be "piper" or "openai", not "${configured}".`,
    503
  );
}

// ----------------------------------------------------------------------------- piper

const PIPER_ROOT = resolve(process.cwd(), 'models', 'piper');

/** Voice per locale, matching the layout `npm run setup:piper` writes. */
const DEFAULT_VOICE_DIRS: Record<Locale, string> = {
  vi: 'vi_VN-vais1000-medium',
  en: 'en_US-lessac-medium',
};

function piperVoiceDir(locale: Locale): string {
  const configured = (
    locale === 'vi' ? process.env.PIPER_VOICE_VI : process.env.PIPER_VOICE_EN
  )?.trim();
  return configured
    ? resolve(process.cwd(), configured)
    : join(PIPER_ROOT, 'voices', DEFAULT_VOICE_DIRS[locale]);
}

function piperEspeakDir(): string {
  const configured = process.env.PIPER_ESPEAK_DATA?.trim();
  return configured ? resolve(process.cwd(), configured) : join(PIPER_ROOT, 'espeak-ng-data');
}

/**
 * One loaded voice, reused across requests: the ONNX graph is ~60 MB and takes about a second to
 * initialise, which would otherwise be paid on every click. Parked on globalThis so the dev
 * server's hot reload does not leak a new copy per edit.
 */
const voiceCache: Map<string, Promise<OfflineTts>> = ((
  globalThis as { __sqlvizPiperVoices?: Map<string, Promise<OfflineTts>> }
).__sqlvizPiperVoices ??= new Map());

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function loadVoice(locale: Locale): Promise<OfflineTts> {
  const directory = piperVoiceDir(locale);
  const model = join(directory, 'model.onnx');
  const tokens = join(directory, 'tokens.txt');
  const dataDir = piperEspeakDir();

  // Checked up front so a missing asset reports the path to fix instead of a native crash.
  for (const [label, path] of [
    ['voice model', model],
    ['voice tokens', tokens],
    ['espeak-ng data', dataDir],
  ] as const) {
    if (!(await exists(path))) {
      throw new SpeechEngineError(
        `Local read-aloud is missing its ${label} at ${path}. Run "npm run setup:piper" to download ` +
          'the voices, or set AI_SPEECH_PROVIDER=openai to synthesize in the cloud instead.',
        503
      );
    }
  }

  // Loaded on first use rather than statically imported: it is a CommonJS native addon (listed in
  // next.config's serverExternalPackages so webpack leaves it alone), and a top-level import would
  // make every build of this module depend on the .node binary resolving.
  const { OfflineTts } = await import('sherpa-onnx-node');

  return new OfflineTts({
    model: {
      vits: { model, tokens, dataDir },
      numThreads: 2,
      provider: 'cpu',
      debug: false,
    },
    // Sentence-by-sentence synthesis keeps peak memory flat on a long explanation.
    maxNumSentences: 1,
  });
}

function getVoice(locale: Locale): Promise<OfflineTts> {
  const key = `${piperVoiceDir(locale)}|${piperEspeakDir()}`;
  const cached = voiceCache.get(key);
  if (cached) return cached;

  // Cached as the promise, so two clicks arriving together load the model once. A failed load is
  // evicted, otherwise a missing file would keep failing after it had been downloaded.
  const loading = loadVoice(locale).catch((error) => {
    voiceCache.delete(key);
    throw error;
  });
  voiceCache.set(key, loading);
  return loading;
}

/** Wraps float samples as a 16-bit PCM WAV — the one container every browser plays without fuss. */
function toWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const bytesPerSample = 2;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1)
      view.setUint8(offset + index, text.charCodeAt(index));
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM header length
  view.setUint16(20, 1, true); // format: PCM
  view.setUint16(22, 1, true); // channels: mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeAscii(36, 'data');
  view.setUint32(40, samples.length * bytesPerSample, true);

  for (let index = 0; index < samples.length; index += 1) {
    // Clamped before scaling: the vocoder can overshoot ±1 slightly, which would wrap into loud
    // clicks once truncated to 16 bits.
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(
      44 + index * bytesPerSample,
      sample < 0 ? sample * 0x8000 : sample * 0x7fff,
      true
    );
  }

  return buffer;
}

async function synthesizeWithPiper({
  text,
  locale,
  signal,
}: SpeechSynthesisRequest): Promise<SpeechAudio> {
  const tts = await getVoice(locale);
  if (signal.aborted) throw Object.assign(new Error('Aborted'), { name: 'AbortError' });

  // Newlines are section breaks in the script; the phonemizer wants one flat utterance stream.
  const flattened = text.replace(/\s*\r?\n\s*/g, ' ');

  let audio: OfflineTtsGeneratedAudio;
  try {
    // generateAsync runs on a worker thread, so a long explanation does not block the event loop.
    audio = await tts.generateAsync({ text: flattened, sid: 0, speed: 1 });
  } catch (error) {
    throw new SpeechEngineError(
      `Local speech synthesis failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!audio?.samples?.length) {
    throw new SpeechEngineError('Local speech synthesis produced no audio.');
  }
  // Buffered, not streamed: the vocoder only yields samples once the whole utterance is done, so
  // there is nothing to forward early anyway.
  return { body: toWav(audio.samples, audio.sampleRate), contentType: 'audio/wav' };
}

// ---------------------------------------------------------------------------- openai

/** Only gpt-4o-mini-tts accepts delivery notes; tts-1/tts-1-hd reject the field. */
function supportsInstructions(model: string): boolean {
  return model === 'gpt-4o-mini-tts';
}

async function synthesizeWithOpenAI({
  text,
  model,
  voice,
  signal,
}: SpeechSynthesisRequest): Promise<SpeechAudio> {
  const apiKey = (process.env.OPENAI_SPEECH_API_KEY || process.env.OPENAI_API_KEY)?.trim();
  if (!apiKey) {
    throw new SpeechEngineError(
      'No speech credential on the server. Set OPENAI_API_KEY (or OPENAI_SPEECH_API_KEY for a ' +
        'separate speech key) in .env and restart the dev server.',
      503
    );
  }

  // Deliberately independent of Settings → Base URL: a chat gateway commonly proxies only
  // /v1/chat/completions and publishes no speech model, so reusing that host would 404 every call.
  const configured = process.env.AI_SPEECH_BASE_URL?.trim();
  const base = normalizeBaseUrl(configured || DEFAULT_BASE_URLS.openai);
  let host: string;
  try {
    const parsed = new URL(base);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new SpeechEngineError(
        `AI_SPEECH_BASE_URL must use http or https, not ${parsed.protocol}`,
        503
      );
    }
    host = parsed.host;
  } catch (error) {
    if (error instanceof SpeechEngineError) throw error;
    throw new SpeechEngineError(`AI_SPEECH_BASE_URL is not a valid URL: ${configured}`, 503);
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${base}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        voice,
        input: text,
        response_format: 'mp3',
        ...(supportsInstructions(model) ? { instructions: SPEECH_INSTRUCTIONS } : {}),
      }),
      signal,
    });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error;
    console.error('[aiSpeechEngine:openai]', error);
    throw new SpeechEngineError(`Could not reach the speech provider at ${host}.`);
  }

  if (!upstream.ok) {
    // Provider messages are forwarded (the route redacts them) since "quota exceeded" and "model
    // not available to this project" need different fixes.
    const detail = await upstream.text().catch(() => '');
    let message = `The speech provider returned HTTP ${upstream.status}.`;
    try {
      const parsed = JSON.parse(detail) as { error?: { message?: unknown } };
      if (typeof parsed.error?.message === 'string' && parsed.error.message.trim()) {
        message = parsed.error.message;
      }
    } catch {
      // A non-JSON body is a proxy's HTML error page, not a provider message; only the status is
      // worth showing.
    }
    if (upstream.status === 404) {
      message +=
        ` The host serving speech (${host}) does not expose /v1/audio/speech or the model ${model}.` +
        ' Point AI_SPEECH_BASE_URL + OPENAI_SPEECH_API_KEY at an endpoint that publishes it, or set' +
        ' AI_SPEECH_PROVIDER=piper to synthesize locally.';
    }
    throw new SpeechEngineError(message);
  }

  if (!upstream.body)
    throw new SpeechEngineError('The speech provider returned an empty response.');
  // Streamed through: playback can start while the tail is still arriving.
  return { body: upstream.body, contentType: upstream.headers.get('Content-Type') ?? 'audio/mpeg' };
}

export function synthesize(
  provider: SpeechProvider,
  request: SpeechSynthesisRequest
): Promise<SpeechAudio> {
  return provider === 'piper' ? synthesizeWithPiper(request) : synthesizeWithOpenAI(request);
}
