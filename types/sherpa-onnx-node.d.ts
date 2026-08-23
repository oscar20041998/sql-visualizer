// sherpa-onnx-node ships JSDoc typedefs but no .d.ts, so TypeScript sees the native addon as an
// untyped module. Only the offline TTS surface that local read-aloud uses is declared here; see
// src/lib/ai/aiSpeechEngine.ts.
declare module 'sherpa-onnx-node' {
  export interface OfflineTtsGeneratedAudio {
    samples: Float32Array;
    sampleRate: number;
  }

  export interface OfflineTtsRequest {
    text: string;
    /** Speaker id. Piper voices are single-speaker, so this is always 0. */
    sid: number;
    /** 1 is the voice's natural pace; higher is faster. */
    speed: number;
  }

  export interface OfflineTtsVitsModelConfig {
    model: string;
    tokens: string;
    /** espeak-ng data directory used to phonemize the input. */
    dataDir?: string;
    lexicon?: string;
    noiseScale?: number;
    noiseScaleW?: number;
    lengthScale?: number;
  }

  export interface OfflineTtsConfig {
    model: {
      vits?: OfflineTtsVitsModelConfig;
      numThreads?: number;
      provider?: string;
      debug?: boolean;
    };
    maxNumSentences?: number;
    silenceScale?: number;
  }

  export class OfflineTts {
    constructor(config: OfflineTtsConfig);
    readonly numSpeakers: number;
    readonly sampleRate: number;
    generate(request: OfflineTtsRequest): OfflineTtsGeneratedAudio;
    generateAsync(request: OfflineTtsRequest): Promise<OfflineTtsGeneratedAudio>;
  }

  export const version: string;
}
