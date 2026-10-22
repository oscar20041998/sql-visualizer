import { streamWithAI } from './aiService';
import { DEFAULT_CONTEXT_TOKENS, DEFAULT_MAX_OUTPUT_TOKENS } from './aiProviders';
import { buildContextBudget, estimateTokens, truncateSqlForBudget } from './aiTokens';
import type { AIModelConfig } from '@/lib/store';
import type { Locale } from '@/lib/i18n';
import type {
  ComparisonFinding,
  ComparisonSnapshot,
  SqlComparisonAiAssessment,
  SqlComparisonAiStreamedFields,
  SqlComparisonAiVerdict,
  StructuralChange,
} from '@/lib/sql/sqlComparison';
import { renderPrompt } from './prompts/render';
import {
  SQL_COMPARISON_PROMPTS,
  sqlComparisonReviewParams,
} from './prompts/templates/sqlComparison';

export interface SqlComparisonPromptFacts {
  changes: Array<
    Pick<StructuralChange, 'kind' | 'summary' | 'beforeValue' | 'afterValue' | 'support'>
  >;
  findings: Array<
    Pick<
      ComparisonFinding,
      | 'category'
      | 'severity'
      | 'title'
      | 'description'
      | 'potentialImpact'
      | 'recommendation'
      | 'verificationStatus'
    >
  >;
  limitations: string[];
}

export type SqlComparisonAiFailureKind = 'unavailable' | 'malformed' | 'failed' | 'cancelled';

export class SqlComparisonAiError extends Error {
  constructor(
    readonly kind: SqlComparisonAiFailureKind,
    message: string
  ) {
    super(message);
    this.name = 'SqlComparisonAiError';
  }
}

// ---------------------------------------------------------------------------------------------
// Prompt building — the wording lives in `prompts/templates/sqlComparison.ts`, together with the
// SQL bound, the facts bound and the no-facts fallback, which also produce prompt text. This
// wrapper keeps the feature's existing exported signature (and the tests that import it) while the
// prompt text now reaches a provider only through `renderPrompt` (specs/020 SC-002 / SC-005).
// ---------------------------------------------------------------------------------------------

/**
 * Before/After review prompt. The model must ground its verdict in the supplied SQL and in the
 * locally generated deterministic facts, and must treat everything inside the data blocks as
 * untrusted data rather than instructions.
 */
export function buildSqlComparisonPrompt(
  snapshot: ComparisonSnapshot,
  locale: Locale = 'en',
  facts?: SqlComparisonPromptFacts
): string {
  return renderPrompt(
    SQL_COMPARISON_PROMPTS.review,
    sqlComparisonReviewParams(snapshot, locale, facts)
  )[0].content;
}

function splitSqlTokenBudget(total: number, beforeSql: string, afterSql: string): [number, number] {
  const beforeTokens = estimateTokens(beforeSql);
  const afterTokens = estimateTokens(afterSql);
  if (beforeTokens + afterTokens <= total) return [beforeTokens, afterTokens];

  const minimum = Math.min(64, Math.floor(total / 2));
  const beforeBudget = Math.min(
    beforeTokens,
    Math.max(
      minimum,
      Math.min(total - minimum, Math.floor((total * beforeTokens) / (beforeTokens + afterTokens)))
    )
  );
  const afterBudget = Math.min(afterTokens, total - beforeBudget);
  const unused = total - beforeBudget - afterBudget;
  const addToBefore = Math.min(unused, beforeTokens - beforeBudget);
  const addToAfter = Math.min(unused - addToBefore, afterTokens - afterBudget);
  return [beforeBudget + addToBefore, afterBudget + addToAfter];
}

function prepareSqlComparisonRequest(
  snapshot: ComparisonSnapshot,
  config: AIModelConfig,
  locale: Locale,
  facts?: SqlComparisonPromptFacts
): { prompt: string; maxOutputTokens: number } {
  const provider = config.provider;
  const budget = buildContextBudget(
    config.contextTokens?.[provider] ?? DEFAULT_CONTEXT_TOKENS[provider],
    config.maxOutputTokens?.[provider] ?? DEFAULT_MAX_OUTPUT_TOKENS[provider]
  );
  const systemTokens = estimateTokens(config.systemPrompt?.trim() ?? '');
  const promptBudget = Math.max(128, budget.promptTokens - systemTokens);
  const fixedPrompt = buildSqlComparisonPrompt(
    { ...snapshot, beforeSql: '', afterSql: '' },
    locale,
    facts
  );
  const sqlBudget = Math.max(64, promptBudget - estimateTokens(fixedPrompt) - 32);
  const [beforeBudget, afterBudget] = splitSqlTokenBudget(
    sqlBudget,
    snapshot.beforeSql,
    snapshot.afterSql
  );
  const beforeSql = truncateSqlForBudget(snapshot.beforeSql, beforeBudget).sql;
  const afterSql = truncateSqlForBudget(snapshot.afterSql, afterBudget).sql;

  return {
    prompt: buildSqlComparisonPrompt({ ...snapshot, beforeSql, afterSql }, locale, facts),
    maxOutputTokens: budget.maxOutputTokens,
  };
}

function normalized(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

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
          const parsed: unknown = JSON.parse(withoutFence.slice(start, index + 1));
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
          }
        } catch {
          break;
        }
        break;
      }
    }
  }
  return null;
}

function invalidResponse(message: string): SqlComparisonAiError {
  return new SqlComparisonAiError('malformed', message);
}

// Decode only the available summary prefix; the final response still requires valid JSON.
export function extractPartialSqlComparisonExplanation(raw: string): string | null {
  return extractPartialJsonString(raw, 'changeExplanation|summary|explanation');
}

// Returns only the fields whose values have started streaming.
export function extractPartialSqlComparisonFields(raw: string): SqlComparisonAiStreamedFields {
  const fields: SqlComparisonAiStreamedFields = {};
  const verdict = /"verdict"\s*:\s*"(good|not_good)"/.exec(raw);
  if (verdict) fields.verdict = verdict[1] as SqlComparisonAiVerdict;
  for (const key of [
    'changeExplanation',
    'impactAfterChange',
    'extraRiskToVerify',
    'extraRecommendation',
  ] as const) {
    const value = extractPartialJsonString(raw, key);
    if (value) fields[key] = value;
  }
  return fields;
}

function extractPartialJsonString(raw: string, keyPattern: string): string | null {
  const key = new RegExp(`"(?:${keyPattern})"\\s*:\\s*"`).exec(raw);
  if (!key) return null;

  const start = key.index + key[0].length;
  let end = start;
  let escaped = false;
  for (; end < raw.length; end += 1) {
    const character = raw[end];
    if (escaped) escaped = false;
    else if (character === '\\') escaped = true;
    else if (character === '"') break;
  }

  const encoded = raw.slice(start, escaped ? end - 1 : end);
  if (!encoded) return null;
  const completeEscape = encoded.replace(/\\u[0-9a-f]{0,3}$/i, '').replace(/\\$/, '');
  try {
    return JSON.parse(`"${completeEscape}"`) as string;
  } catch {
    return completeEscape
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
}

export function parseSqlComparisonAiResponse(
  raw: string,
  snapshot: ComparisonSnapshot
): SqlComparisonAiAssessment {
  let response = extractJsonObject(raw);
  while (response && !('summary' in response) && typeof response.content === 'string') {
    response = extractJsonObject(response.content);
  }
  if (!response) {
    throw invalidResponse('The AI response did not match the required comparison format.');
  }

  const verdict = response.verdict;
  const changeExplanation =
    typeof response.changeExplanation === 'string' ? response.changeExplanation.trim() : '';
  const impactAfterChange =
    typeof response.impactAfterChange === 'string' ? response.impactAfterChange.trim() : '';
  const extraRiskToVerify =
    typeof response.extraRiskToVerify === 'string' ? response.extraRiskToVerify.trim() : '';
  const extraRecommendation =
    typeof response.extraRecommendation === 'string' ? response.extraRecommendation.trim() : '';
  const evidence = response.evidence;
  const assumptions = response.assumptions;
  const verificationSteps = response.verificationSteps;
  const limitations = response.limitations;
  if (
    (verdict !== 'good' && verdict !== 'not_good') ||
    !changeExplanation ||
    !impactAfterChange ||
    !extraRiskToVerify ||
    !extraRecommendation ||
    !Array.isArray(evidence) ||
    !Array.isArray(assumptions) ||
    !Array.isArray(verificationSteps) ||
    !Array.isArray(limitations) ||
    !evidence.length ||
    ![evidence, assumptions, verificationSteps, limitations].every((items) =>
      items.every((item) => typeof item === 'string' && item.trim())
    )
  ) {
    throw invalidResponse(
      'The AI response omitted required structured assessment fields or contained invalid values.'
    );
  }

  const sql = normalized(`${snapshot.beforeSql}\n${snapshot.afterSql}`);
  // Model labels such as "Trước:" and backticks are stripped before matching the SQL.
  const groundedEvidence = evidence
    .map((item) => item.trim())
    .filter((item) => {
      const quote = normalized(
        item
          .replace(/`/g, '')
          .replace(/^[^:`]{1,20}:\s*/, '')
          .replace(/[.;]+$/, '')
      );
      return quote.length > 0 && sql.includes(quote);
    });
  if (!groundedEvidence.length) {
    throw invalidResponse(
      'The AI response cited evidence that is not present in the supplied SQL.'
    );
  }

  return {
    verdict,
    changeExplanation,
    impactAfterChange,
    extraRiskToVerify,
    extraRecommendation,
    evidence: groundedEvidence,
    assumptions: assumptions.map((item) => item.trim()),
    verificationSteps: verificationSteps.map((item) => item.trim()),
    limitations: limitations.map((item) => item.trim()),
  };
}

export async function requestSqlComparisonExplanation(
  snapshot: ComparisonSnapshot,
  config: AIModelConfig,
  locale: Locale = 'en',
  signal?: AbortSignal,
  onDelta: (text: string) => void = () => {},
  facts?: SqlComparisonPromptFacts
): Promise<SqlComparisonAiAssessment> {
  if (signal?.aborted) throw new SqlComparisonAiError('cancelled', 'The AI request was cancelled.');

  let raw: string;
  try {
    const prepared = prepareSqlComparisonRequest(snapshot, config, locale, facts);
    raw = await streamWithAI(
      config,
      {
        prompt: prepared.prompt,
        jsonMode: true,
        maxTokens: prepared.maxOutputTokens,
        signal,
      },
      onDelta
    );
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
      throw new SqlComparisonAiError('cancelled', 'The AI request was cancelled.');
    }
    const message = error instanceof Error ? error.message : 'The AI request failed.';
    const kind = /network|fetch|timeout|timed out|not configured|unreachable/i.test(message)
      ? 'unavailable'
      : 'failed';
    throw new SqlComparisonAiError(
      kind,
      kind === 'unavailable'
        ? 'The configured AI provider is unavailable.'
        : 'The AI request failed.'
    );
  }
  if (signal?.aborted) throw new SqlComparisonAiError('cancelled', 'The AI request was cancelled.');
  return parseSqlComparisonAiResponse(raw, snapshot);
}
