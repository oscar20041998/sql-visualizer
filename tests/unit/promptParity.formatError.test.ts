import { describe, expect, it } from 'vitest';
import { requestFormatExplanation } from '@/lib/ai/formatErrorAi';
import {
  jsonResponse,
  makeFormatError,
  makeOllamaConfig,
  withStubbedFetch,
} from './helpers/format-error-fixtures';

const VALID_RESPONSE = {
  explanation: 'Unclosed parenthesis.',
  rootCause: 'The delimiter arrives mid-expression.',
  evidence: ['SELECT * FROM (;'],
  replacementSql: 'SELECT * FROM (1);',
  replacementReason: 'Completes the expression.',
};

function explanationFetch(calls: Array<{ body: Record<string, unknown> }>): typeof fetch {
  return (async (_url: string, init: RequestInit) => {
    calls.push({ body: JSON.parse(String(init.body)) });
    return jsonResponse(VALID_RESPONSE);
  }) as unknown as typeof fetch;
}

// Exact explain prompt captured from the pre-migration implementation (baseline
// recorded 2026-10-16 via a temporary console capture, since removed). The T008
// migration must reproduce it byte-for-byte; any intended change is a new behavior.
const EXPECTED_PROMPT =
  'A SQL formatter failed to parse a query. Explain the failure and provide only a bounded SQL replacement fragment in one response.\n' +
  '\n' +
  'Formatter error message: Parse error at token: ; at line 1 column 16\n' +
  'SQL dialect: mysql\n' +
  'Reported location: 1:5\n' +
  'SQL around the reported location: SELECT * FROM (…\n' +
  'Replacement range: lines 1-1. Replace only this exact original SQL fragment:\n' +
  '```sql\n' +
  'SELECT * FROM (;\n' +
  '```\n' +
  '\n' +
  '\n' +
  'Rules:\n' +
  '- Ground every statement in the formatter message and the SQL above. Do not contradict the formatter.\n' +
  '- Explain the syntax failure only. Do not give performance, indexing, or query-rewrite advice.\n' +
  '- Be specific about the offending token, clause, or delimiter. Never invent a code fragment that is not in the SQL above.\n' +
  '- Provide "replacementSql" as only the corrected replacement fragment for the exact range shown above, and provide "replacementReason".\n' +
  '- Preserve the meaning and all SQL outside the replacement range. Do not reformat unrelated SQL.\n' +
  '- Replace only lines 1-1. Preserve every character outside that range byte for byte. Return only the corrected replacement fragment in "replacementSql", explain why it fixes the syntax error in "replacementReason", and state this exact line range in "explanation". Do not repeat the full query.\n' +
  '- Write the "explanation", "rootCause", and "replacementReason" fields in English, using plain language.\n' +
  '- Return only one JSON object with exactly these keys, in this order:\n' +
  '{\n' +
  '  "explanation": "plain-language statement of what the error is",\n' +
  '  "rootCause": "plain-language statement of why it happened",\n' +
  '  "evidence": ["quoted SQL fragment or error text this answer relies on"],\n' +
  '  "replacementSql": "the corrected SQL replacement fragment only",\n' +
  '  "replacementReason": "why this replacement fixes the syntax error"\n' +
  '}\n' +
  '\n' +
  'Both "explanation" and "rootCause" must be non-empty, "evidence" must quote the actual SQL or error text, and any replacement must contain only the corrected region plus a non-empty rationale.';

describe('format-error parity baseline (feature 020, characterization of the pre-migration implementation)', () => {
  const config = makeOllamaConfig();
  const error = makeFormatError();

  it('sends a stable explain prompt message for the same input (U13, characterization)', async () => {
    const seen: string[] = [];
    const calls: Array<{ body: Record<string, unknown> }> = [];

    for (let round = 0; round < 2; round += 1) {
      calls.length = 0;
      await withStubbedFetch(explanationFetch(calls), () =>
        requestFormatExplanation(error, config)
      );
      expect(calls).toHaveLength(1);
      const messages = (calls[0].body as { messages: Array<{ content: string }> }).messages;
      expect(messages).toHaveLength(1);
      seen.push(messages[0].content);
    }

    // Pin determinism: identical inputs must produce byte-identical requests.
    expect(seen[1]).toBe(seen[0]);
    // Pin the exact prompt text the migration must reproduce byte-for-byte, captured
    // from the pre-migration implementation (baseline recorded 2026-10-16).
    expect(seen[0]).toBe(EXPECTED_PROMPT);
    expect(seen[0]).not.toContain('MUTANT');
  });

  it('sends identical request settings for the same explain request (U13, characterization)', async () => {
    const calls: Array<{ body: Record<string, unknown> }> = [];
    await withStubbedFetch(explanationFetch(calls), () =>
      requestFormatExplanation(error, config)
    );

    // Pin the request settings the migration must not alter.
    expect(calls).toHaveLength(1);
    expect(calls[0].body).toMatchObject({ stream: false, max_tokens: 3000 });
  });

  it('parses the same captured response into the same application result (A2 acceptance baseline)', async () => {
    const result = await withStubbedFetch(explanationFetch([]), () =>
      requestFormatExplanation(error, config)
    );

    // Pin the parsed output contract the UI consumes.
    expect(result.explanation).toBe('Unclosed parenthesis.');
    expect(result.rootCause).toBe('The delimiter arrives mid-expression.');
    expect(result.evidence).toEqual(['SELECT * FROM (;']);
    expect(result.correctedSql).toBe('SELECT * FROM (1);');
  });
});
