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
import { formatErrorPosition, type FormatError } from '@/lib/sql/formatError';
import { resolveErrorRegion, type ErrorRegion } from '@/lib/sql/formatErrorRegion';
import { applyFormatFix } from '@/lib/sql/formatFixScope';

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
export function buildExplainFormatErrorPrompt(
  error: FormatError,
  locale: Locale = 'en',
  region?: ErrorRegion | null
): string {
  const replacementRegion = region ?? resolveErrorRegion(error, error.sourceSql);
  const languageInstruction =
    locale === 'vi'
      ? 'Write the "explanation", "rootCause", and "replacementReason" fields in Vietnamese (tiếng Việt), using simple, beginner-friendly language. Keep the JSON keys exactly as named.'
      : 'Write the "explanation", "rootCause", and "replacementReason" fields in English, using plain language.';
  const regionBlock = replacementRegion
    ? `\nReplacement range: lines ${replacementRegion.startLine}-${replacementRegion.endLine}. Replace only this exact original SQL fragment:\n\`\`\`sql\n${replacementRegion.snippet}\n\`\`\`\n`
    : '';
  const sqlContext = replacementRegion
    ? ''
    : '\nNo safe replacement range could be determined. Do not return a SQL correction.\n';
  const correctionScope = replacementRegion
    ? `Replace only lines ${replacementRegion.startLine}-${replacementRegion.endLine}. Preserve every character outside that range byte for byte. Return only the corrected replacement fragment in "replacementSql", explain why it fixes the syntax error in "replacementReason", and state this exact line range in "explanation". Do not repeat the full query.`
    : 'Do not return a corrected query or replacement fragment because no safe replacement range is available.';

  return `A SQL formatter failed to parse a query. Explain the failure and provide only a bounded SQL replacement fragment in one response.

${groundingBlock(error)}${regionBlock}${sqlContext}

Rules:
- Ground every statement in the formatter message and the SQL above. Do not contradict the formatter.
- Explain the syntax failure only. Do not give performance, indexing, or query-rewrite advice.
- Be specific about the offending token, clause, or delimiter. Never invent a code fragment that is not in the SQL above.
- ${replacementRegion ? 'Provide "replacementSql" as only the corrected replacement fragment for the exact range shown above, and provide "replacementReason".' : 'Return empty "replacementSql" and "replacementReason" because no safe replacement range is available.'}
- Preserve the meaning and all SQL outside the replacement range. Do not reformat unrelated SQL.
- ${correctionScope}
- ${languageInstruction}
- Return only one JSON object with exactly these keys, in this order:
{
  "explanation": "plain-language statement of what the error is",
  "rootCause": "plain-language statement of why it happened",
  "evidence": ["quoted SQL fragment or error text this answer relies on"],
  "replacementSql": "${replacementRegion ? 'the corrected SQL replacement fragment only' : 'empty because no safe replacement range is available'}",
  "replacementReason": "${replacementRegion ? 'why this replacement fixes the syntax error' : 'empty because no safe replacement range is available'}"
}

Both "explanation" and "rootCause" must be non-empty, "evidence" must quote the actual SQL or error text, and any replacement must contain only the corrected region plus a non-empty rationale.`;
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

function buildFormatFixRetryPrompt(
  error: FormatError,
  rejectedSql: string,
  formatterMessage: string
): string {
  return `Your previous SQL correction still failed the SQL formatter. Correct the syntax using the formatter's feedback below.

SQL dialect: ${error.dialect}
Original formatter error: ${error.message}
Formatter error for your previous correction: ${formatterMessage}

Original SQL:
00sql
${fitSqlForPrompt(error.sourceSql)}
00

Your previous correction:
00sql
${fitSqlForPrompt(rejectedSql)}
00

Return only a JSON object with exactly this key, containing a corrected SQL statement valid for the stated dialect:
{ "correctedSql": "..." }`;
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
