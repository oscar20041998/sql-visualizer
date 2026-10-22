// Locale-parity gate for specs/020-prompt-manager-refactor US3 (T027, FR-009/FR-010, SC-007).
//
// Guarantee under test: for every locale-variant prompt, the language a request uses is decided by
// the application's existing `Locale` value exactly as it was before the migration — no feature
// starts or stops following the application language, and no new language preference or default is
// introduced. Shared (locale-invariant) prompts must stay identical in both locales.
import { describe, expect, it } from 'vitest';
import type { Locale } from '@/lib/i18n';
import { PROMPT_REGISTRY } from '@/lib/ai/prompts/registry';
import { localizedPromptId } from '@/lib/ai/prompts/render';

const LOCALES: Locale[] = ['en', 'vi'];

/**
 * Bases that branched per locale BEFORE the migration (inventory rows 1–13, 18–20), so each must
 * exist as an `.en`/`.vi` pair. Listed explicitly so a pair silently collapsing into one shared
 * entry fails the audit rather than shrinking the expectation.
 */
const LOCALE_VARIANT_BASES: string[] = [
  'sqlExplainer.explainSql',
  'sqlExplainer.explainCte',
  'sqlExplainer.explainSqlStructured',
  'semanticBrief.brief',
  'optimize.optimizeSqlStructured',
  'requirement.candidate',
  'repair.proposals',
  'followUp.system',
  'docsConsultant.system',
  'docsConsultant.noContext',
  'databaseAssistant.system',
  'databaseAssistant.knowledgeAddendum',
  'databaseAssistant.followUpSuggestions',
  'dashboard.explainComplexity',
  'dashboard.explainFinding',
  'dashboard.optimizationOpportunities',
];

/**
 * Bases that were a SINGLE shared text before the migration (inventory rows 14–17), so they must
 * NOT have per-locale variants — a language split would be a behavior change (FR-010).
 */
const SHARED_BASES: string[] = [
  'formatError.explain',
  'formatError.fix',
  'formatError.fixRetry',
  'sqlComparison.review',
];

describe('locale parity (feature 020, US3 — T027)', () => {
  it('registers an .en/.vi pair for every locale-variant base (FR-009)', () => {
    for (const base of LOCALE_VARIANT_BASES) {
      for (const locale of LOCALES) {
        const id = `${base}.${locale}`;
        expect(PROMPT_REGISTRY[id], `missing locale entry '${id}'`).toBeTruthy();
        expect(PROMPT_REGISTRY[id].locale, `'${id}' declares the wrong locale`).toBe(locale);
      }
    }
  });

  it('keeps the locale-variant count aligned with the inventory (17 bases × 2 locales)', () => {
    const localeEntries = Object.entries(PROMPT_REGISTRY).filter(([, entry]) => entry.locale);

    expect(localeEntries).toHaveLength(LOCALE_VARIANT_BASES.length * LOCALES.length);
    expect(localeEntries).toHaveLength(32);
  });

  it('gives every locale-variant base genuinely distinct en and vi wording', () => {
    for (const base of LOCALE_VARIANT_BASES) {
      const en = PROMPT_REGISTRY[`${base}.en`];
      const vi = PROMPT_REGISTRY[`${base}.vi`];

      // A per-locale pair that is byte-identical in both locales means the source never really
      // branched per language; that would contradict the inventory's "Locale-variant" column.
      expect(en.text, `'${base}' en and vi text are identical`).not.toBe(vi.text);
    }
  });

  it('resolves each base to the locale the caller asked for, never the other one (FR-009)', () => {
    for (const base of LOCALE_VARIANT_BASES) {
      for (const locale of LOCALES) {
        const resolved = localizedPromptId(base, locale);
        expect(resolved, `'${base}' resolved wrong for ${locale}`).toBe(`${base}.${locale}`);
        expect(PROMPT_REGISTRY[resolved].locale).toBe(locale);
      }
    }
  });

  it('falls back to the en entry for an unexpected locale, as the pre-migration lookup did', () => {
    // The pre-migration shape was `PROMPT[locale] ?? PROMPT.en`; an unknown runtime locale must
    // still render English text instead of throwing or silently changing language behavior.
    const unexpected = 'fr' as Locale;

    for (const base of LOCALE_VARIANT_BASES) {
      const resolved = localizedPromptId(base, unexpected);
      expect(resolved, `'${base}' should fall back to en`).toBe(`${base}.en`);
      expect(PROMPT_REGISTRY[resolved].locale).toBe('en');
    }
  });

  it('keeps the shared prompts single-entry and locale-free, so no language split was introduced', () => {
    for (const base of SHARED_BASES) {
      expect(PROMPT_REGISTRY[base], `shared prompt '${base}' is missing`).toBeTruthy();
      expect(
        PROMPT_REGISTRY[base].locale,
        `shared prompt '${base}' gained a locale`
      ).toBeUndefined();
      for (const locale of LOCALES) {
        expect(
          PROMPT_REGISTRY[`${base}.${locale}`],
          `shared prompt '${base}' must not have a .${locale} variant`
        ).toBeUndefined();
      }
    }
  });

  it('uses only the two configured application locales across the whole registry (FR-009)', () => {
    const declared = new Set(
      Object.values(PROMPT_REGISTRY)
        .map((entry) => entry.locale)
        .filter((locale): locale is Locale => Boolean(locale))
    );

    expect([...declared].sort()).toEqual([...LOCALES].sort());
  });

  it('keeps roles identical between the en and vi halves of every pair (FR-004)', () => {
    for (const base of LOCALE_VARIANT_BASES) {
      expect(PROMPT_REGISTRY[`${base}.vi`].role, `'${base}' changed role between locales`).toBe(
        PROMPT_REGISTRY[`${base}.en`].role
      );
    }
  });

  it('keeps the declared parameter schema identical between the en and vi halves (FR-003)', () => {
    for (const base of LOCALE_VARIANT_BASES) {
      const en = PROMPT_REGISTRY[`${base}.en`];
      const vi = PROMPT_REGISTRY[`${base}.vi`];

      expect(
        Object.keys(vi.params).sort(),
        `'${base}' declares different parameters per locale`
      ).toEqual(Object.keys(en.params).sort());
    }
  });
});
