/**
 * Format-error diagnostics prompt templates.
 *
 * Migrated by specs/020-prompt-manager-refactor T007 from `src/lib/ai/formatErrorAi.ts`.
 * The wording is byte-identical to the pre-migration builders (FR-002/FR-004); nothing here
 * may be reworded without a new spec, because `tests/unit/promptParity.formatError.test.ts`
 * pins the exact bytes the provider must receive.
 *
 * Conditional source segments became named parameters. Their builders live in this module so
 * every piece of prompt wording stays under `prompts/templates/` (SC-002) while `renderPrompt`
 * remains the only place a prompt is assembled (contracts/prompt-manager.md Invariant 2).
 */
import { formatErrorPosition, type FormatError } from '@/lib/sql/formatError';
import { resolveErrorRegion, type ErrorRegion } from '@/lib/sql/formatErrorRegion';
import type { Locale } from '@/lib/i18n';
import type { PromptTemplateMap } from '../registry';

/** Registry ids for this feature. Prefer these over raw strings at call sites. */
export const FORMAT_ERROR_PROMPTS = {
  explain: 'formatError.explain',
  fix: 'formatError.fix',
  fixRetry: 'formatError.fixRetry',
} as const;

/** Cap on how much of the failing SQL is embedded verbatim, so the prompt fits a small context. */
export const MAX_SQL_CHARS = 6000;

/** Truncates the failing SQL for the prompt, stating clearly when it was cut. */
export function fitSqlForPrompt(sql: string): string {
  if (sql.length <= MAX_SQL_CHARS) return sql;
  return `${sql.slice(0, MAX_SQL_CHARS)}\n-- [truncated: ${sql.length - MAX_SQL_CHARS} more characters]`;
}

/** Shared grounding block: what the formatter said, where, and on which SQL. */
export function formatErrorGrounding(error: FormatError): string {
  const position = formatErrorPosition(error);
  const lines = [`Formatter error message: ${error.message}`, `SQL dialect: ${error.dialect}`];
  if (position) lines.push(`Reported location: ${position}`);
  if (error.snippet) lines.push(`SQL around the reported location: ${error.snippet}`);
  return lines.join('\n');
}

/**
 * Parameters for {@link FORMAT_ERROR_PROMPTS.explain}. `region` keeps the pre-migration
 * fallback: when the caller did not resolve one, the region is derived from the error.
 */
export function explainFormatErrorParams(
  error: FormatError,
  locale: Locale = 'en',
  region?: ErrorRegion | null
): Record<string, string> {
  const replacementRegion = region ?? resolveErrorRegion(error, error.sourceSql);
  return {
    grounding: formatErrorGrounding(error),
    regionBlock: replacementRegion
      ? `\nReplacement range: lines ${replacementRegion.startLine}-${replacementRegion.endLine}. Replace only this exact original SQL fragment:\n\`\`\`sql\n${replacementRegion.snippet}\n\`\`\`\n`
      : '',
    sqlContext: replacementRegion
      ? ''
      : '\nNo safe replacement range could be determined. Do not return a SQL correction.\n',
    replacementRule: replacementRegion
      ? 'Provide "replacementSql" as only the corrected replacement fragment for the exact range shown above, and provide "replacementReason".'
      : 'Return empty "replacementSql" and "replacementReason" because no safe replacement range is available.',
    correctionScope: replacementRegion
      ? `Replace only lines ${replacementRegion.startLine}-${replacementRegion.endLine}. Preserve every character outside that range byte for byte. Return only the corrected replacement fragment in "replacementSql", explain why it fixes the syntax error in "replacementReason", and state this exact line range in "explanation". Do not repeat the full query.`
      : 'Do not return a corrected query or replacement fragment because no safe replacement range is available.',
    languageInstruction:
      locale === 'vi'
        ? 'Write the "explanation", "rootCause", and "replacementReason" fields in Vietnamese (tiếng Việt), using simple, beginner-friendly language. Keep the JSON keys exactly as named.'
        : 'Write the "explanation", "rootCause", and "replacementReason" fields in English, using plain language.',
    replacementSqlHint: replacementRegion
      ? 'the corrected SQL replacement fragment only'
      : 'empty because no safe replacement range is available',
    replacementReasonHint: replacementRegion
      ? 'why this replacement fixes the syntax error'
      : 'empty because no safe replacement range is available',
  };
}

/** Parameters for {@link FORMAT_ERROR_PROMPTS.fix}. */
export function formatFixParams(
  error: FormatError,
  region?: ErrorRegion | null
): Record<string, string> {
  return {
    grounding: formatErrorGrounding(error),
    regionBlock: region
      ? `\nErroneous region (lines ${region.startLine}-${region.endLine}, from the ${region.source}): ${region.snippet}\n`
      : '',
    confinementRule: region
      ? '- Change ONLY the erroneous region quoted above. Every character you change must be inside it, and you must return the rest of the query byte for byte. Confine every change to it.\n'
      : '',
    sql: fitSqlForPrompt(error.sourceSql),
    dialect: error.dialect,
  };
}

/** Parameters for {@link FORMAT_ERROR_PROMPTS.fixRetry}. */
export function formatFixRetryParams(
  error: FormatError,
  rejectedSql: string,
  formatterMessage: string
): Record<string, string> {
  return {
    dialect: error.dialect,
    message: error.message,
    formatterMessage,
    originalSql: fitSqlForPrompt(error.sourceSql),
    rejectedSql: fitSqlForPrompt(rejectedSql),
  };
}

/**
 * Registry entries for the format-error feature.
 *
 * Source of truth before migration: `src/lib/ai/formatErrorAi.ts:93/141/174`.
 * The three prompts share one template per purpose and are not locale-variant — the source
 * branched only on a single language instruction, which is therefore a parameter
 * (`languageInstruction`) rather than a second template (data-model.md → PromptTemplate.locale).
 *
 * WHY THE TEMPLATE TEXT IS ENGLISH EVEN FOR VIETNAMESE USERS (decided, not an oversight):
 * this feature's `locale` selects the language of the model's OUTPUT, not the language of the
 * instructions. Only the prose values — `explanation`, `rootCause`, `replacementReason` — are
 * asked to be Vietnamese, via the `{{languageInstruction}}` parameter (see
 * `explainFormatErrorParams`). The surrounding instructions deliberately stay English because the
 * JSON keys (`explanation`, `rootCause`, `evidence`, `replacementSql`, `replacementReason`) are a
 * parsing contract: `parseFormatExplanation` reads those exact English keys, so translating the
 * instructions would tempt the model to translate the keys too and break the parser (FR-008).
 *
 * The same reasoning explains why `fix` and `fixRetry` have NO `languageInstruction` at all: their
 * entire output is SQL, and translating SQL would corrupt the query. This matches the pre-migration
 * behaviour exactly — `buildFormatFixPrompt` and `buildFormatFixRetryPrompt` never accepted a
 * `locale` argument.
 *
 * Documented as discrepancy row L2 in `prompt-inventory.md` (language audit, T028), whose verdict is
 * "intentional design — no change recommended". Wording here is pinned byte-for-byte by
 * `tests/unit/promptParity.formatError.test.ts`; changing it is a new spec, not an edit.
 */
export const FORMAT_ERROR_TEMPLATES: PromptTemplateMap = {
  [FORMAT_ERROR_PROMPTS.explain]: {
    role: 'user',
    feature: 'formatError',
    source: 'src/lib/ai/formatErrorAi.ts:93',
    params: {
      grounding: { required: true },
      regionBlock: { required: false, default: '' },
      sqlContext: { required: false, default: '' },
      replacementRule: { required: true },
      correctionScope: { required: true },
      languageInstruction: { required: true },
      replacementSqlHint: { required: true },
      replacementReasonHint: { required: true },
    },
    text: `A SQL formatter failed to parse a query. Explain the failure and provide only a bounded SQL replacement fragment in one response.

{{grounding}}{{regionBlock}}{{sqlContext}}

Rules:
- Ground every statement in the formatter message and the SQL above. Do not contradict the formatter.
- Explain the syntax failure only. Do not give performance, indexing, or query-rewrite advice.
- Be specific about the offending token, clause, or delimiter. Never invent a code fragment that is not in the SQL above.
- {{replacementRule}}
- Preserve the meaning and all SQL outside the replacement range. Do not reformat unrelated SQL.
- {{correctionScope}}
- {{languageInstruction}}
- Return only one JSON object with exactly these keys, in this order:
{
  "explanation": "plain-language statement of what the error is",
  "rootCause": "plain-language statement of why it happened",
  "evidence": ["quoted SQL fragment or error text this answer relies on"],
  "replacementSql": "{{replacementSqlHint}}",
  "replacementReason": "{{replacementReasonHint}}"
}

Both "explanation" and "rootCause" must be non-empty, "evidence" must quote the actual SQL or error text, and any replacement must contain only the corrected region plus a non-empty rationale.`,
  },

  [FORMAT_ERROR_PROMPTS.fix]: {
    role: 'user',
    feature: 'formatError',
    source: 'src/lib/ai/formatErrorAi.ts:141',
    params: {
      grounding: { required: true },
      regionBlock: { required: false, default: '' },
      confinementRule: { required: false, default: '' },
      sql: { required: true },
      dialect: { required: true },
    },
    text: `A SQL formatter failed to parse a query. Correct ONLY the syntax error so the formatter can parse it.

{{grounding}}{{regionBlock}}
SQL that failed to format:
\`\`\`sql
{{sql}}
\`\`\`

Make the minimal correction:
{{confinementRule}}- Fix only the offending syntax. Change as few characters as possible.
- Do NOT change, add, or remove any clause, table, column, alias, join, filter, or expression.
- Do NOT reorder anything. Keep the original statement order exactly.
- Do NOT reformat, re-indent, or add comments. Do NOT change keywords to upper/lower case.
- Keep the dialect ({{dialect}}) valid.
- If the query cannot be corrected without changing its meaning, return the original SQL unchanged.

Return only a JSON object with exactly this key — no explanation, no prose:
{
  "correctedSql": "the minimally corrected SQL"
}`,
  },

  [FORMAT_ERROR_PROMPTS.fixRetry]: {
    role: 'user',
    feature: 'formatError',
    source: 'src/lib/ai/formatErrorAi.ts:174',
    params: {
      dialect: { required: true },
      message: { required: true },
      formatterMessage: { required: true },
      originalSql: { required: true },
      rejectedSql: { required: true },
    },
    text: `Your previous SQL correction still failed the SQL formatter. Correct the syntax using the formatter's feedback below.

SQL dialect: {{dialect}}
Original formatter error: {{message}}
Formatter error for your previous correction: {{formatterMessage}}

Original SQL:
\`\`\`sql
{{originalSql}}
\`\`\`

Your previous correction:
\`\`\`sql
{{rejectedSql}}
\`\`\`

Return only a JSON object with exactly this key, containing a corrected SQL statement valid for the stated dialect:
{ "correctedSql": "..." }`,
  },
};
