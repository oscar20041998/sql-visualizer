// Explain / fix prompts and response parsing for the format-error report (spec 012, US2 + US3).
//
// Grounding rule (constitution IV): every prompt embeds the formatter's own error message, the
// active dialect, and the failing SQL, and the parsers reject any answer that omits the evidence
// the contract requires. A rejected answer becomes a described failure the panel can render —
// never a silent no-op.
//
// Local-only rule (constitution V / FR-014): requests go to the configured Ollama base URL through
// the existing `generateWithAI` adapter. No cloud provider is reachable from this module.
import { generateWithAI } from './aiService';
import type { AIModelConfig } from '@/lib/store';
import type { Locale } from '@/lib/i18n';
import { formatErrorPosition, type FormatError } from '@/lib/sql/formatError';
import type { ErrorRegion } from '@/lib/sql/formatErrorRegion';

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
}

/** The editor SQL captured when a fix was requested, used for the stale check (FR-016). */
export interface FormatFixSnapshot {
  originalSql: string;
  proposedSql: string;
}

/** Answer tokens reserved for the explanation / fix. Small local windows are the norm here. */
const EXPLAIN_MAX_TOKENS = 900;
const FIX_MAX_TOKENS = 1200;

/** Cap on how much of the failing SQL is embedded verbatim, so the prompt fits a small context. */
const MAX_SQL_CHARS = 6000;

// ---------------------------------------------------------------------------------------------
// Prompt building
// ---------------------------------------------------------------------------------------------

/** Truncates the failing SQL for the prompt, stating clearly when it was cut. */
function fitSqlForPrompt(sql: string): string {
  if (sql.length <= MAX_SQL_CHARS) return sql;
  return `${sql.slice(0, MAX_SQL_CHARS)}\n-- [truncated: ${sql.length - MAX_SQL_CHARS} more characters]`;
}

/** Shared grounding block: what the formatter said, where, and on which SQL. */
function groundingBlock(error: FormatError): string {
  const position = formatErrorPosition(error);
  const lines = [`Formatter error message: ${error.message}`, `SQL dialect: ${error.dialect}`];
  if (position) lines.push(`Reported location: ${position}`);
  if (error.snippet) lines.push(`SQL around the reported location: ${error.snippet}`);
  return lines.join('\n');
}

/**
 * Explain prompt (contract §2). The model must ground its answer in the message and SQL above and
 * must not contradict the formatter; performance advice is explicitly out of scope so the answer
 * stays about the syntax failure.
 */
export function buildExplainFormatErrorPrompt(error: FormatError, locale: Locale = 'en'): string {
  const languageInstruction =
    locale === 'vi'
      ? 'Write the "explanation" and "rootCause" fields in Vietnamese (tiếng Việt), using simple, beginner-friendly language. Keep the JSON keys exactly as named.'
      : 'Write the "explanation" and "rootCause" fields in English, using plain language.';

  return `A SQL formatter failed to parse a query. Explain the failure to the developer who wrote it.

${groundingBlock(error)}

SQL that failed to format:
\`\`\`sql
${fitSqlForPrompt(error.sourceSql)}
\`\`\`

Rules:
- Ground every statement in the formatter message and the SQL above. Do not contradict the formatter.
- Explain the syntax failure only. Do not give performance, indexing, or query-rewrite advice.
- Be specific about the offending token, clause, or delimiter. Never invent a code fragment that is not in the SQL above.
- ${languageInstruction}
- Return only a JSON object with exactly these keys, in this order:
{
  "explanation": "plain-language statement of what the error is",
  "rootCause": "plain-language statement of why it happened",
  "evidence": ["quoted SQL fragment or error text this answer relies on"]
}

Both "explanation" and "rootCause" must be non-empty, and "evidence" must contain at least one item quoting the actual SQL or error text.`;
}

/**
 * Fix prompt (contract §3 / FR-015). The minimal-change constraint is stated as an explicit list so
 * a small local model cannot read it as "rewrite the query".
 */
export function buildFormatFixPrompt(error: FormatError, region?: ErrorRegion | null): string {
  // When a region was resolved the prompt quotes it and names the confinement rule, so a small
  // local model is told where the correction may happen instead of being trusted to stay there
  // (FR-019). The guard enforces it either way; the prompt only reduces rejected proposals.
  const regionBlock = region
    ? `\nErroneous region (lines ${region.startLine}-${region.endLine}, from the ${region.source}): ${region.snippet}\n`
    : '';
  const confinementRule = region
    ? '- Change ONLY the erroneous region quoted above. Every character you change must be inside it, and you must return the rest of the query byte for byte. Confine every change to it.\n'
    : '';

  return `A SQL formatter failed to parse a query. Correct ONLY the syntax error so the formatter can parse it.

${groundingBlock(error)}${regionBlock}
SQL that failed to format:
\`\`\`sql
${fitSqlForPrompt(error.sourceSql)}
\`\`\`

Make the minimal correction:
${confinementRule}- Fix only the offending syntax. Change as few characters as possible.
- Do NOT change, add, or remove any clause, table, column, alias, join, filter, or expression.
- Do NOT reorder anything. Keep the original statement order exactly.
- Do NOT reformat, re-indent, or add comments. Do NOT change keywords to upper/lower case.
- Keep the dialect (${error.dialect}) valid.
- If the query cannot be corrected without changing its meaning, return the original SQL unchanged.

Return only a JSON object with exactly this key — no explanation, no prose:
{
  "correctedSql": "the minimally corrected SQL"
}`;
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
  const parsed = extractJsonObject(raw);
  if (!parsed) return null;

  const explanation = asTrimmedString(parsed.explanation);
  const rootCause = asTrimmedString(parsed.rootCause);
  const evidence = asStringList(parsed.evidence);

  if (!explanation || !rootCause || evidence.length === 0) return null;
  return { explanation, rootCause, evidence };
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
    const quoted = normalize(item);
    return quoted.length > 0 && sources.some((source) => source.includes(quoted));
  });
}

/**
 * Asks the local model to explain a format error. Rejects with a {@link FormatAiError} carrying a
 * renderable state — never resolves with a partial, empty or ungrounded explanation (FR-012).
 */
export async function requestFormatExplanation(
  error: FormatError,
  config: AIModelConfig,
  locale: Locale = 'en'
): Promise<FormatExplanation> {
  const raw = await runRequest(
    config,
    buildExplainFormatErrorPrompt(error, locale),
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
  return parsed;
}

/**
 * Asks the local model for a minimal, semantics-preserving correction. Resolves with the corrected
 * SQL only; the caller owns the re-format and apply gate (FR-010 / FR-015).
 */
export async function requestFormatFix(error: FormatError, config: AIModelConfig): Promise<string> {
  const raw = await runRequest(config, buildFormatFixPrompt(error), FIX_MAX_TOKENS);
  const correctedSql = parseFormatFix(raw, error.sourceSql);
  if (!correctedSql) {
    throw new FormatAiError({
      kind: 'malformed',
      message:
        'The model did not return a usable correction. Try again, or pick a stronger local model in Settings.',
      retryable: true,
    });
  }
  return correctedSql;
}
