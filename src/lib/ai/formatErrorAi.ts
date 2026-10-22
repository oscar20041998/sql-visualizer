// Explain / fix prompts and response parsing for the format-error report (spec 012, US2 + US3).
//
// Grounding rule (constitution IV): every prompt embeds the formatter's own error message, the
// active dialect, and the failing SQL, and the parsers reject any answer that omits the evidence
// the contract requires. A rejected answer becomes a described failure the panel can render —
// never a silent no-op.
//
// Provider routing: requests go through the `generateWithAI` adapter with the Settings
// `AIModelConfig` as-is — Ollama direct, cloud providers via the server proxy.
import { generateWithAI } from './aiService';
import { format } from 'sql-formatter';
import type { AIModelConfig } from '@/lib/store';
import type { Locale } from '@/lib/i18n';
import type { FormatError } from '@/lib/sql/formatError';
import { resolveErrorRegion, type ErrorRegion } from '@/lib/sql/formatErrorRegion';
import { applyFormatFix } from '@/lib/sql/formatFixScope';
import { renderPrompt } from './prompts/render';
import {
  explainFormatErrorParams,
  formatFixParams,
  formatFixRetryParams,
  FORMAT_ERROR_PROMPTS,
} from './prompts/templates/formatError';

/** How an AI request failed, so the panel can pick a message and a retry affordance. */
export type FormatAiFailureKind = 'unavailable' | 'malformed' | 'error';

export interface FormatAiFailure {
  kind: FormatAiFailureKind;
  /** Human-readable, non-empty cause. */
  message: string;
  /** Whether showing a Retry control makes sense for this failure. */
  retryable: boolean;
}

/** Thrown by {@link requestFormatExplanation} / {@link requestFormatFix}. */
export class FormatAiError extends Error {
  readonly kind: FormatAiFailureKind;
  readonly retryable: boolean;

  constructor(failure: FormatAiFailure) {
    super(failure.message);
    this.name = 'FormatAiError';
    this.kind = failure.kind;
    this.retryable = failure.retryable;
  }
}

/** Parsed model answer for the Explain action (contract §2). */
export interface FormatExplanation {
  explanation: string;
  rootCause: string;
  /** SQL fragments / error text the answer cites. Never empty. */
  evidence: string[];
  /** Model-provided replacement for the bounded error region, if available. */
  replacementSql: string | null;
  /** Why the region replacement addresses the syntax error, if available. */
  replacementReason: string | null;
  /** Full query reconstructed and formatter-validated by the client; never returned by the model. */
  correctedSql: string | null;
}

/** The editor SQL captured when a fix was requested, used for the stale check (FR-016). */
export interface FormatFixSnapshot {
  originalSql: string;
  proposedSql: string;
}

/** The response is bounded to a region fragment; the validated whole query is composed locally. */
const EXPLAIN_MAX_TOKENS = 3000;
const FIX_MAX_TOKENS = 1200;

// ---------------------------------------------------------------------------------------------
// Prompt building — the wording lives in `prompts/templates/formatError.ts`. These wrappers keep
// the feature's existing exported signatures (and the tests that import them) while every prompt
// text now reaches a provider only through `renderPrompt` (specs/020 SC-002 / SC-005).
// ---------------------------------------------------------------------------------------------

/**
 * Explain prompt (contract §2). The model must ground its answer in the message and SQL above and
 * must not contradict the formatter; performance advice is explicitly out of scope so the answer
 * stays about the syntax failure.
 */
export function buildExplainFormatErrorPrompt(
  error: FormatError,
  locale: Locale = 'en',
  region?: ErrorRegion | null
): string {
  return renderPrompt(
    FORMAT_ERROR_PROMPTS.explain,
    explainFormatErrorParams(error, locale, region)
  )[0].content;
}

/**
 * Fix prompt (contract §3 / FR-015). The minimal-change constraint is stated as an explicit list so
 * a small local model cannot read it as "rewrite the query".
 *
 * When a region was resolved the prompt quotes it and names the confinement rule, so a small local
 * model is told where the correction may happen instead of being trusted to stay there (FR-019).
 * The guard enforces it either way; the prompt only reduces rejected proposals.
 */
export function buildFormatFixPrompt(error: FormatError, region?: ErrorRegion | null): string {
  return renderPrompt(FORMAT_ERROR_PROMPTS.fix, formatFixParams(error, region))[0].content;
}

/** Retry prompt: the previous correction is fed back together with the formatter's new message. */
function buildFormatFixRetryPrompt(
  error: FormatError,
  rejectedSql: string,
  formatterMessage: string
): string {
  return renderPrompt(
    FORMAT_ERROR_PROMPTS.fixRetry,
    formatFixRetryParams(error, rejectedSql, formatterMessage)
  )[0].content;
}

function formatterLanguage(
  dialect: FormatError['dialect']
): 'mysql' | 'postgresql' | 'tsql' | 'plsql' {
  if (dialect === 'postgresql') return 'postgresql';
  if (dialect === 'sqlserver') return 'tsql';
  if (dialect === 'oracle') return 'plsql';
  return 'mysql';
}

function validateFormatFix(sql: string, dialect: FormatError['dialect']): void {
  format(sql, { language: formatterLanguage(dialect) });
}

function formatterFailureMessage(thrown: unknown): string {
  const message = thrown instanceof Error ? thrown.message : String(thrown);
  return (
    message
      .split(/\r?\n/)
      .find((line) => line.trim())
      ?.trim()
      .slice(0, 240) ?? 'Unknown formatter error'
  );
}

// ---------------------------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------------------------

/**
 * Pulls the first balanced JSON object out of a model answer, tolerating markdown fences and
 * surrounding prose. Duplicated in spirit from `aiService.ts`, which keeps its extractor private;
 * this is the smaller, local-scope copy the contract tests exercise directly.
 */
function extractJsonObject(text: string): Record<string, unknown> | null {
  const withoutFence = text.replace(/```(?:json)?/gi, '').trim();
  for (
    let start = withoutFence.indexOf('{');
    start !== -1;
    start = withoutFence.indexOf('{', start + 1)
  ) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < withoutFence.length; index += 1) {
      const character = withoutFence[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') inString = true;
      else if (character === '{') depth += 1;
      else if (character === '}' && --depth === 0) {
        try {
          const parsed = JSON.parse(withoutFence.slice(start, index + 1));
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
          }
        } catch {
          // Try the next balanced object — model prose may contain one before the payload.
        }
        break;
      }
    }
  }
  return null;
}

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(asTrimmedString).filter(Boolean);
}

/**
 * Parses the Explain answer. Returns `null` when the contract is not met, so the caller can surface
 * a described `malformed` failure instead of rendering an empty explanation.
 */
export function parseFormatExplanation(raw: string): FormatExplanation | null {
  let parsed = extractJsonObject(raw);
  while (parsed && !('explanation' in parsed) && typeof parsed.content === 'string') {
    parsed = extractJsonObject(parsed.content);
  }
  if (!parsed) return null;

  const explanation = asTrimmedString(parsed.explanation);
  const rootCause = asTrimmedString(parsed.rootCause);
  const evidence = asStringList(parsed.evidence);
  const replacementSql = asTrimmedString(parsed.replacementSql) || null;
  const replacementReason = asTrimmedString(parsed.replacementReason) || null;

  if (!explanation || !rootCause || evidence.length === 0) return null;
  return {
    explanation,
    rootCause,
    evidence,
    replacementSql,
    replacementReason,
    correctedSql: null,
  };
}

/**
 * Parses the Fix answer. A correction identical to the original is treated as unusable — applying
 * it would change nothing while implying the error was resolved (contract §3).
 */
export function parseFormatFix(raw: string, originalSql: string): string | null {
  const parsed = extractJsonObject(raw);
  if (!parsed) return null;

  const correctedSql = asTrimmedString(parsed.correctedSql);
  if (!correctedSql) return null;
  if (correctedSql === originalSql.trim()) return null;
  return correctedSql;
}

// ---------------------------------------------------------------------------------------------
// Stale-proposal detection (FR-016)
// ---------------------------------------------------------------------------------------------

/**
 * True when the editor SQL no longer matches the SQL the proposal was generated from. Trailing
 * whitespace is ignored because the editor/model round-trip routinely adds a final newline, and
 * treating that as a user edit would block legitimate applies.
 */
export function isStale(snapshot: FormatFixSnapshot, currentSql: string): boolean {
  return currentSql.trim() !== snapshot.originalSql.trim();
}

// ---------------------------------------------------------------------------------------------
// Failure classification (FR-012 / FR-013)
// ---------------------------------------------------------------------------------------------

/** Network-level causes that mean the local model simply is not reachable right now. */
const UNREACHABLE_PATTERNS = [
  /failed to fetch/i,
  /unable to reach/i,
  /networkerror/i,
  /econnrefused/i,
  /load failed/i,
  /is not configured/i,
  /timed? ?out/i,
  /timeout/i,
  /aborted/i,
];

/**
 * Classifies a thrown value from an AI request into a rendered state. A model that is down and a
 * model that answered nonsense need different messages and different retry expectations, so they
 * are separated rather than collapsed into one generic failure (FR-013).
 */
export function describeAiFailure(thrown: unknown): FormatAiFailure {
  const raw = thrown instanceof Error ? thrown.message : typeof thrown === 'string' ? thrown : '';
  const message = raw.trim() || 'The AI request failed.';
  const name = thrown instanceof Error ? thrown.name : '';

  if (name === 'AbortError' || name === 'TimeoutError') {
    return { kind: 'unavailable', message, retryable: true };
  }
  if (UNREACHABLE_PATTERNS.some((pattern) => pattern.test(message))) {
    return { kind: 'unavailable', message, retryable: true };
  }
  if (thrown instanceof FormatAiError) {
    return { kind: thrown.kind, message, retryable: thrown.retryable };
  }
  return { kind: 'error', message, retryable: true };
}

/** Runs one AI call, translating an empty answer and any throw into a `FormatAiError`. */
async function runRequest(
  config: AIModelConfig,
  prompt: string,
  maxTokens: number
): Promise<string> {
  let raw: string;
  try {
    raw = await generateWithAI(config, { prompt, jsonMode: true, maxTokens });
  } catch (error) {
    // An AIServiceError already carries a described, user-facing cause — classify and re-wrap it so
    // every caller in this feature handles exactly one error type.
    throw new FormatAiError(describeAiFailure(error));
  }
  if (!raw.trim()) {
    throw new FormatAiError({
      kind: 'malformed',
      message: 'The model returned an empty response. Try running it again.',
      retryable: true,
    });
  }
  return raw;
}

/**
 * True when at least one evidence item quotes the captured SQL or the formatter's own message.
 * Line breaks and indentation are ignored, because a model re-wraps a quote it read correctly, but
 * wording it could only have invented is rejected (FR-008, contract §Explain).
 */
function isGroundedInError(explanation: FormatExplanation, error: FormatError): boolean {
  const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
  const sources = [normalize(error.sourceSql), normalize(error.message)];
  return explanation.evidence.some((item) => {
    const codeQuotes = Array.from(item.matchAll(/`([^`]+)`/g), (match) => match[1]);
    const candidates = [item.replace(/`/g, ''), ...codeQuotes].map(normalize);
    return candidates.some(
      (candidate) =>
        candidate.length >= 8 &&
        sources.some((source) => source.includes(candidate) || candidate.includes(source))
    );
  });
}

/**
 * Asks the configured model to explain a format error. Diagnosis is required and grounded;
 * replacement validation is independent so an unsafe correction cannot erase a usable diagnosis.
 */
export async function requestFormatExplanation(
  error: FormatError,
  config: AIModelConfig,
  locale: Locale = 'en',
  region?: ErrorRegion | null
): Promise<FormatExplanation> {
  const replacementRegion = region ?? resolveErrorRegion(error, error.sourceSql);
  const raw = await runRequest(
    config,
    buildExplainFormatErrorPrompt(error, locale, replacementRegion),
    EXPLAIN_MAX_TOKENS
  );
  const parsed = parseFormatExplanation(raw);
  // A well-formed answer about SQL the editor never held is the one failure a structure check
  // cannot see, and rendering it would put a fabricated diagnosis in front of the user.
  if (!parsed || !isGroundedInError(parsed, error)) {
    throw new FormatAiError({
      kind: 'malformed',
      message:
        'The model did not return a usable explanation. Try again, or pick a stronger local model in Settings.',
      retryable: true,
    });
  }
  if (
    !replacementRegion ||
    replacementRegion.startOffset < 0 ||
    replacementRegion.endOffset < replacementRegion.startOffset ||
    replacementRegion.endOffset > error.sourceSql.length
  ) {
    return parsed;
  }
  if (!parsed.replacementSql || !parsed.replacementReason) {
    return parsed;
  }

  const sourcePrefix = error.sourceSql.slice(0, replacementRegion.startOffset);
  const sourceSuffix = error.sourceSql.slice(replacementRegion.endOffset);
  const replacementLineCount = replacementRegion.snippet.match(/\n/g)?.length ?? 0;
  const responseLineCount = parsed.replacementSql.match(/\n/g)?.length ?? 0;
  const looksLikeFullQuery =
    (sourcePrefix.length >= 24 && parsed.replacementSql.startsWith(sourcePrefix)) ||
    (sourceSuffix.length >= 24 && parsed.replacementSql.endsWith(sourceSuffix)) ||
    responseLineCount > replacementLineCount;
  if (looksLikeFullQuery) return parsed;

  const correctedSql = sourcePrefix + parsed.replacementSql + sourceSuffix;
  if (correctedSql === error.sourceSql.trim()) return parsed;
  const scopedResult = applyFormatFix({
    snapshotSql: error.sourceSql,
    currentSql: error.sourceSql,
    proposedSql: correctedSql,
    region: replacementRegion,
  });
  if (!scopedResult.ok) return parsed;
  try {
    validateFormatFix(scopedResult.sql, error.dialect);
  } catch {
    return parsed;
  }
  return { ...parsed, correctedSql: scopedResult.sql };
}

/**
 * Asks the configured model for a minimal, semantics-preserving correction. Resolves with the corrected
 * SQL only. If the first correction still fails the formatter, one retry is made with its error
 * feedback; the editor still owns the explicit apply gate (FR-010 / FR-015).
 */
export async function requestFormatFix(error: FormatError, config: AIModelConfig): Promise<string> {
  const raw = await runRequest(config, buildFormatFixPrompt(error), FIX_MAX_TOKENS);
  let correctedSql = parseFormatFix(raw, error.sourceSql);
  if (!correctedSql) {
    throw new FormatAiError({
      kind: 'malformed',
      message:
        'The model did not return a usable correction. Try again, or pick a stronger local model in Settings.',
      retryable: true,
    });
  }

  try {
    validateFormatFix(correctedSql, error.dialect);
    return correctedSql;
  } catch (firstFormatterError) {
    const retryRaw = await runRequest(
      config,
      buildFormatFixRetryPrompt(error, correctedSql, formatterFailureMessage(firstFormatterError)),
      FIX_MAX_TOKENS
    );
    correctedSql = parseFormatFix(retryRaw, error.sourceSql);
    if (correctedSql) {
      try {
        validateFormatFix(correctedSql, error.dialect);
        return correctedSql;
      } catch {
        // Report the same actionable state when the single feedback retry also fails validation.
      }
    }
    throw new FormatAiError({
      kind: 'malformed',
      message: 'The proposed SQL still fails to format after one correction attempt.',
      retryable: true,
    });
  }
}
