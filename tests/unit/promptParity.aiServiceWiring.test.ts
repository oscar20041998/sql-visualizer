// Wiring gate for specs/020-prompt-manager-refactor T018/T019/T020.
//
// The `promptParity.aiServiceCore/Flow` suites pin the registry templates against VERBATIM copies of
// the pre-migration literals, but they never import `src/lib/ai/aiService.ts`. That leaves a gap: if
// `aiService.ts` kept its own private copy of a prompt and ignored the registry, those suites would
// still pass while SC-002/SC-005 ("prompt text lives only in the registry, one place to edit") was
// violated.
//
// This suite closes that gap. It drives the REAL exported service functions through a stubbed global
// `fetch` (the same seam the app uses) and asserts the exact request body the provider receives is
// byte-identical to what `renderPrompt(...)` produces for that prompt id. It then performs the SC-005
// single-location edit drill at service level: mutating ONLY the registry entry must change what the
// service puts on the wire, with no other file touched.
import { describe, expect, it } from 'vitest';
import type { AIModelConfig } from '@/lib/store';
import type { Locale } from '@/lib/i18n';
import { PROMPT_REGISTRY } from '@/lib/ai/prompts/registry';
import { localizedPromptId, renderPrompt } from '@/lib/ai/prompts/render';
import {
  SQL_EXPLAINER_PROMPTS,
  explainCteParams,
  explainSqlParams,
  explainSqlStructuredParams,
} from '@/lib/ai/prompts/templates/sqlExplainer';
import {
  SEMANTIC_BRIEF_PROMPTS,
  semanticBriefParams,
} from '@/lib/ai/prompts/templates/semanticBrief';
import { OPTIMIZE_PROMPTS, optimizeSqlStructuredParams } from '@/lib/ai/prompts/templates/optimize';
import {
  REQUIREMENT_PROMPTS,
  requirementCandidateParams,
} from '@/lib/ai/prompts/templates/requirement';
import { REPAIR_PROMPTS, repairProposalsParams } from '@/lib/ai/prompts/templates/repair';
import { FOLLOW_UP_PROMPTS } from '@/lib/ai/prompts/templates/followUp';
import {
  DOCS_CONSULTANT_PROMPTS,
  docsConsultantSystemParams,
} from '@/lib/ai/prompts/templates/docsConsultant';
import {
  analyzeSqlSemantics,
  askDocsConsultant,
  askFollowUp,
  explainCteWithAI,
  explainSqlWithAI,
  generateRequirementCandidate,
  optimizeSqlWithAI,
  repairInvalidProposals,
  type SqlOptimizationProposal,
} from '@/lib/ai/aiService';
import { jsonResponse, makeOllamaConfig, withStubbedFetch } from './helpers/format-error-fixtures';

/** One captured provider request. */
interface CapturedCall {
  url: string;
  body: Record<string, unknown>;
}

/** The exact text the provider received on the last captured call, system + user joined. */
function lastPrompt(calls: CapturedCall[]): string {
  const messages = calls[calls.length - 1].body.messages as Array<{
    role: string;
    content: string;
  }>;
  return messages.map((message) => message.content).join('\n');
}

/** The system message of the last captured call (used for the system-role prompts). */
function lastSystem(calls: CapturedCall[]): string {
  const messages = calls[calls.length - 1].body.messages as Array<{
    role: string;
    content: string;
  }>;
  return messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n');
}

const DOCS_CONTEXT = '## Saved views\nA saved view stores the current query.';

/**
 * Stubs the global `fetch`: answers the docs-context retrieval route, records every provider call,
 * and replies to the chat-completions call with `reply`.
 */
function captureFetch(calls: CapturedCall[], reply: unknown): typeof fetch {
  return (async (url: string, init: RequestInit) => {
    const target = String(url);
    if (target.includes('/api/ai/docs-context')) {
      return new Response(JSON.stringify({ context: DOCS_CONTEXT, sources: [] }), { status: 200 });
    }
    calls.push({ url: target, body: JSON.parse(String(init.body)) });
    return jsonResponse(reply);
  }) as unknown as typeof fetch;
}

const SQL = 'SELECT id FROM users WHERE active = 1';
/** Contains `id` twice, so a proposal whose `find` is `id` is genuinely ambiguous. */
const REPAIR_SQL = 'SELECT id FROM users WHERE id = 1';
const CTE_NAME = 'active_users';
const CTE_SQL = 'SELECT id\nFROM users\nWHERE active = 1';
const INSTRUCTION = 'Make it faster without changing the rows it returns.';
const LOCALES: Locale[] = ['en', 'vi'];

const config: AIModelConfig = makeOllamaConfig();

describe('aiService prompt wiring (feature 020 — service routes through the registry)', () => {
  it.each(LOCALES)(
    'explainSqlWithAI sends exactly what renderPrompt renders for locale %s',
    async (locale: Locale) => {
      const calls: CapturedCall[] = [];
      await withStubbedFetch(captureFetch(calls, 'An explanation.'), () =>
        explainSqlWithAI(SQL, config, locale)
      );

      const expected = renderPrompt(
        localizedPromptId(SQL_EXPLAINER_PROMPTS.explainSql, locale),
        explainSqlParams(SQL)
      )[0].content;
      expect(lastPrompt(calls)).toBe(expected);
    }
  );

  it.each(LOCALES)(
    'explainCteWithAI sends exactly what renderPrompt renders for locale %s',
    async (locale: Locale) => {
      const calls: CapturedCall[] = [];
      await withStubbedFetch(captureFetch(calls, 'A CTE explanation.'), () =>
        explainCteWithAI({
          cteName: CTE_NAME,
          cteSql: CTE_SQL,
          dependencyContext: '',
          config,
          locale,
        })
      );

      const expected = renderPrompt(
        localizedPromptId(SQL_EXPLAINER_PROMPTS.explainCte, locale),
        explainCteParams(CTE_NAME, CTE_SQL, '', locale)
      )[0].content;
      expect(lastPrompt(calls)).toBe(expected);
    }
  );

  it.each(LOCALES)(
    'analyzeSqlSemantics sends exactly what renderPrompt renders for locale %s',
    async (locale: Locale) => {
      const calls: CapturedCall[] = [];
      await withStubbedFetch(captureFetch(calls, {}), () =>
        analyzeSqlSemantics({ sql: SQL, config, locale })
      );

      const expected = renderPrompt(
        localizedPromptId(SEMANTIC_BRIEF_PROMPTS.brief, locale),
        semanticBriefParams(SQL, undefined, locale)
      )[0].content;
      expect(lastPrompt(calls)).toBe(expected);
    }
  );

  it.each(LOCALES)(
    'optimizeSqlWithAI sends exactly what renderPrompt renders for locale %s',
    async (locale: Locale) => {
      const calls: CapturedCall[] = [];
      await withStubbedFetch(captureFetch(calls, {}), () =>
        optimizeSqlWithAI({ sql: SQL, config, locale, userInstruction: INSTRUCTION })
      );

      const expected = renderPrompt(
        localizedPromptId(OPTIMIZE_PROMPTS.optimizeSqlStructured, locale),
        optimizeSqlStructuredParams(SQL, INSTRUCTION, locale)
      )[0].content;
      expect(lastPrompt(calls)).toBe(expected);
    }
  );

  it.each(LOCALES)(
    'generateRequirementCandidate sends exactly what renderPrompt renders for locale %s',
    async (locale: Locale) => {
      const calls: CapturedCall[] = [];
      await withStubbedFetch(captureFetch(calls, {}), () =>
        generateRequirementCandidate({
          sql: SQL,
          config,
          locale,
          requirementInput: { text: 'Also return the email column.', hintedTables: ['users'] },
        })
      );

      const expected = renderPrompt(
        localizedPromptId(REQUIREMENT_PROMPTS.candidate, locale),
        requirementCandidateParams(SQL, 'Also return the email column.', ['users'], locale)
      )[0].content;
      expect(lastPrompt(calls)).toBe(expected);
    }
  );

  it.each(LOCALES)(
    'repairInvalidProposals sends exactly what renderPrompt renders for locale %s',
    async (locale: Locale) => {
      // `find` occurs twice in REPAIR_SQL, so the proposal is invalid and the repair pass runs.
      const invalid: SqlOptimizationProposal = {
        id: 'p1',
        location: 'SELECT',
        issue: 'repeated expression',
        reason: 'ambiguous find',
        recommendation: 'widen the find',
        find: 'id',
        replace: 'user_id',
        semanticImpact: 'none',
      };
      const calls: CapturedCall[] = [];
      await withStubbedFetch(captureFetch(calls, { proposals: [] }), () =>
        repairInvalidProposals({ sql: REPAIR_SQL, proposals: [invalid], config, locale })
      );

      const expected = renderPrompt(
        localizedPromptId(REPAIR_PROMPTS.proposals, locale),
        repairProposalsParams(
          REPAIR_SQL,
          [{ issue: 'repeated expression', find: 'id', occurrences: 2 }],
          locale
        )
      )[0].content;
      expect(lastPrompt(calls)).toBe(expected);
    }
  );

  it.each(LOCALES)(
    'askFollowUp sends exactly what renderPrompt renders as its system message for locale %s',
    async (locale: Locale) => {
      const calls: CapturedCall[] = [];
      await withStubbedFetch(captureFetch(calls, 'An answer.'), () =>
        askFollowUp({ question: 'What does this do?', sql: SQL, config, locale })
      );

      const expected = renderPrompt(localizedPromptId(FOLLOW_UP_PROMPTS.system, locale), {})[0]
        .content;
      expect(lastSystem(calls)).toBe(expected);
    }
  );

  it.each(LOCALES)(
    'askDocsConsultant sends exactly what renderPrompt renders for locale %s when docs were found',
    async (locale: Locale) => {
      const calls: CapturedCall[] = [];
      await withStubbedFetch(captureFetch(calls, 'An answer.'), () =>
        askDocsConsultant({ question: 'How do saved views work?', config, locale })
      );

      const expected = renderPrompt(
        localizedPromptId(DOCS_CONSULTANT_PROMPTS.system, locale),
        docsConsultantSystemParams(DOCS_CONTEXT)
      )[0].content;
      expect(lastSystem(calls)).toBe(expected);
    }
  );

  it('uses the no-context entry when retrieval returns nothing (FR-003 branch preserved)', async () => {
    const calls: CapturedCall[] = [];
    const emptyDocsFetch = (async (url: string, init: RequestInit) => {
      const target = String(url);
      if (target.includes('/api/ai/docs-context')) {
        return new Response(JSON.stringify({ context: '', sources: [] }), { status: 200 });
      }
      calls.push({ url: target, body: JSON.parse(String(init.body)) });
      return jsonResponse('An answer.');
    }) as unknown as typeof fetch;

    await withStubbedFetch(emptyDocsFetch, () =>
      askDocsConsultant({ question: 'Anything?', config, locale: 'en' })
    );

    expect(lastSystem(calls)).toBe(
      renderPrompt(localizedPromptId(DOCS_CONSULTANT_PROMPTS.noContext, 'en'), {})[0].content
    );
  });

  // SC-005 edit drill at service level: change ONLY the registry entry and the wire bytes must
  // follow, proving no private copy of the prompt survives inside aiService.ts.
  it.each(LOCALES)(
    'an edit to the registry entry alone changes what the service sends (SC-005, locale %s)',
    async (locale: Locale) => {
      const id = localizedPromptId(SQL_EXPLAINER_PROMPTS.explainSql, locale);
      const original = PROMPT_REGISTRY[id].text;
      const sentinel = 'EDITED-ONLY-IN-THE-REGISTRY';

      try {
        PROMPT_REGISTRY[id].text = `${sentinel}\n{{sql}}`;

        const calls: CapturedCall[] = [];
        await withStubbedFetch(captureFetch(calls, 'An explanation.'), () =>
          explainSqlWithAI(SQL, config, locale)
        );

        expect(lastPrompt(calls)).toContain(sentinel);
        expect(lastPrompt(calls)).toBe(renderPrompt(id, explainSqlParams(SQL))[0].content);
      } finally {
        PROMPT_REGISTRY[id].text = original;
      }
    }
  );
});
