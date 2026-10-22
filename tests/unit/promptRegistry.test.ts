import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PROMPT_REGISTRY } from '@/lib/ai/prompts/registry';

const PLACEHOLDER = /\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g;

/**
 * Every registry id that rows 1–20 of `specs/020-prompt-manager-refactor/prompt-inventory.md` must
 * map to. Locale-variant rows contribute an `.en` + `.vi` pair; shared rows contribute the bare id.
 * Kept as an explicit list (NOT derived from the registry) so a template that silently disappears
 * from `registry.ts` fails the audit instead of shrinking the expectation along with it (SC-002).
 */
const EXPECTED_PROMPT_IDS: string[] = [
  'sqlExplainer.explainSql.en',
  'sqlExplainer.explainSql.vi',
  'sqlExplainer.explainCte.en',
  'sqlExplainer.explainCte.vi',
  'sqlExplainer.explainSqlStructured.en',
  'sqlExplainer.explainSqlStructured.vi',
  'semanticBrief.brief.en',
  'semanticBrief.brief.vi',
  'optimize.optimizeSqlStructured.en',
  'optimize.optimizeSqlStructured.vi',
  'requirement.candidate.en',
  'requirement.candidate.vi',
  'repair.proposals.en',
  'repair.proposals.vi',
  'followUp.system.en',
  'followUp.system.vi',
  'docsConsultant.system.en',
  'docsConsultant.system.vi',
  'docsConsultant.noContext.en',
  'docsConsultant.noContext.vi',
  'databaseAssistant.system.en',
  'databaseAssistant.system.vi',
  'databaseAssistant.knowledgeAddendum.en',
  'databaseAssistant.knowledgeAddendum.vi',
  'databaseAssistant.followUpSuggestions.en',
  'databaseAssistant.followUpSuggestions.vi',
  'formatError.explain',
  'formatError.fix',
  'formatError.fixRetry',
  'sqlComparison.review',
  'dashboard.explainComplexity.en',
  'dashboard.explainComplexity.vi',
  'dashboard.explainFinding.en',
  'dashboard.explainFinding.vi',
  'dashboard.optimizationOpportunities.en',
  'dashboard.optimizationOpportunities.vi',
];

const INVENTORY_PATH = 'specs/020-prompt-manager-refactor/prompt-inventory.md';
const TEMPLATES_DIR = 'src/lib/ai/prompts/templates';

describe('prompt registry audit (feature 020, unit behaviors U10–U12)', () => {
  it('every {{placeholder}} in every registered template belongs to its schema (U10)', () => {
    for (const [id, entry] of Object.entries(PROMPT_REGISTRY)) {
      const declared = new Set(Object.keys(entry.params));
      for (const [, name] of entry.text.matchAll(PLACEHOLDER)) {
        expect(declared.has(name), `prompt '${id}' uses undeclared placeholder '${name}'`).toBe(
          true
        );
      }
    }
  });

  it('resolves every registered prompt id to exactly one entry (U12)', () => {
    PROMPT_REGISTRY['u12.probe.a'] = { role: 'user', text: 'A', params: {} };
    PROMPT_REGISTRY['u12.probe.b'] = { role: 'system', text: 'B', params: {} };
    try {
      const entries = Object.entries(PROMPT_REGISTRY);
      expect(new Set(entries.map(([id]) => id)).size).toBe(entries.length);
      for (const [id, entry] of entries) {
        expect(PROMPT_REGISTRY[id]).toBe(entry);
      }
      expect(PROMPT_REGISTRY['u12.probe.a'].text).toBe('A');
      expect(PROMPT_REGISTRY['u12.probe.b'].text).toBe('B');
    } finally {
      delete PROMPT_REGISTRY['u12.probe.a'];
      delete PROMPT_REGISTRY['u12.probe.b'];
    }
  });

  it('registers exactly the ids the inventory maps — no missing and no extra entry (U11, SC-002)', () => {
    const registered = Object.keys(PROMPT_REGISTRY).sort();

    expect(registered).toEqual([...EXPECTED_PROMPT_IDS].sort());
    expect(registered).toHaveLength(36);
  });

  it('gives every registered entry a feature, a source reference, a valid role and non-empty text (U11)', () => {
    for (const [id, entry] of Object.entries(PROMPT_REGISTRY)) {
      expect(entry.feature, `prompt '${id}' has no feature`).toBeTruthy();
      expect(entry.source, `prompt '${id}' has no source reference`).toBeTruthy();
      expect(['system', 'user', 'assistant'], `prompt '${id}' role`).toContain(entry.role);
      expect(entry.text.trim().length, `prompt '${id}' has empty text`).toBeGreaterThan(0);
    }
  });

  it('keeps every inventory row accounted for: migrated, or a documented deferred-risk record (U11)', () => {
    const inventory = readFileSync(INVENTORY_PATH, 'utf8');
    // Slice to the FR-001 inventory table only; the registry-mapping and ledger tables below it
    // also start rows with `| <number> |` and would otherwise pollute the count.
    const table = inventory.split('## Inventory table')[1]?.split('## Shared record fields')[0];
    expect(table, 'inventory table section not found').toBeTruthy();

    const rows = table!
      .split('\n')
      .filter((line) => /^\| \d+ \|/.test(line))
      .map((line) => line.split('|').map((cell) => cell.trim()));

    // Rows 1-20 are migrated; rows 21-22 are deferred-risk by design (FR-002 escape clause).
    const migratedRows = rows.filter((cells) => Number(cells[1]) <= 20);
    const deferredRows = rows.filter((cells) => Number(cells[1]) > 20);

    expect(migratedRows).toHaveLength(20);
    expect(deferredRows).toHaveLength(2);
    expect(inventory).toContain('### Deferred-risk records');
    for (const cells of migratedRows) {
      expect(cells[3], `row ${cells[1]} has no source location`).toBeTruthy();
    }
    for (const cells of deferredRows) {
      expect(cells[3], `deferred row ${cells[1]} has no feature name`).toBeTruthy();
    }
  });

  it('keeps every template module the inventory names present with registered entries (SC-002)', () => {
    const inventory = readFileSync(INVENTORY_PATH, 'utf8');
    const moduleNames = new Set(
      [...inventory.matchAll(/templates\/([A-Za-z]+)\.ts/g)].map((match) => match[1])
    );

    expect(moduleNames.size).toBeGreaterThan(0);
    for (const name of moduleNames) {
      const source = readFileSync(`${TEMPLATES_DIR}/${name}.ts`, 'utf8');
      expect(source, `templates/${name}.ts has no registered entries`).toMatch(/feature:/);
    }
  });
});
