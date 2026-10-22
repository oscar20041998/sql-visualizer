import { describe, expect, it } from 'vitest';
import type { Locale } from '@/lib/i18n';
import type { ComplexityContributor } from '@/lib/sql/dashboard/types';
import {
  buildExplainComplexityPrompt as currentExplainComplexityPrompt,
  buildExplainFindingPrompt as currentExplainFindingPrompt,
  buildOptimizationOpportunitiesPrompt as currentOptimizationOpportunitiesPrompt,
  type ExplainComplexityInput,
} from '@/lib/sql/dashboard/aiPrompts';

/**
 * Characterization baseline for the three dashboard AI insight prompts
 * (specs/020-prompt-manager-refactor, FR-011 / contracts/output-parity.md).
 *
 * The three functions under the "verbatim copy" banner below are a BYTE-EXACT copy of the
 * pre-migration builders from `src/lib/sql/dashboard/aiPrompts.ts:16-53`, spliced mechanically from
 * that file so no character (including Vietnamese diacritics and the em dash) could drift. They are
 * the frozen reference: the migrated builders — now thin `renderPrompt` wrappers over the
 * `dashboard.*.en` / `dashboard.*.vi` registry entries — must reproduce these bytes exactly
 * (FR-002/FR-004 forbid rewording).
 *
 * This file must pass unchanged both BEFORE and AFTER the migration. Do not edit it to make a
 * failing assertion pass; a red run here means prompt wording changed, which is a new behavior
 * requiring a new spec.
 */

// --- verbatim copy: src/lib/sql/dashboard/aiPrompts.ts:16-53 (pre-migration) -------------------
export function buildExplainComplexityPrompt(
  input: ExplainComplexityInput,
  locale: Locale
): string {
  const contributorLines = input.contributors
    .slice(0, 5)
    .map(
      (contributor) =>
        `- ${contributor.construct}: ${contributor.points} points (${Math.round(
          contributor.shareOfTotal * 100
        )}% of total)`
    )
    .join('\n');

  if (locale === 'vi') {
    return `Giải thích bằng tiếng Việt, ngôn ngữ đơn giản, vì sao truy vấn SQL này có độ phức tạp ${input.normalizedScore}/100 (mức ${input.level}).\nCác cấu trúc đóng góp nhiều nhất:\n${contributorLines}\nDựa câu trả lời trên các dữ kiện phân tích tĩnh ở trên; không được mâu thuẫn với chúng.`;
  }
  return `Explain in plain language why this SQL query has a complexity of ${input.normalizedScore}/100 (level ${input.level}).\nThe top contributing structures:\n${contributorLines}\nGround your answer in the static analysis facts above; never contradict them.`;
}

export function buildExplainFindingPrompt(
  finding: { rule: string; message: string; location?: string },
  locale: Locale
): string {
  const location = finding.location ? `\nLocation: ${finding.location}` : '';

  if (locale === 'vi') {
    return `Giải thích bằng tiếng Việt, dễ hiểu: quy tắc "${finding.rule}" phát hiện: ${finding.message}.${location}\nNói rõ vì sao điều này quan trọng và cách khắc phục; không bịa thêm dữ kiện.`;
  }
  return `Explain in plain language what the rule "${finding.rule}" found: ${finding.message}.${location}\nSay why it matters and how to address it; do not invent facts.`;
}

export function buildOptimizationOpportunitiesPrompt(sql: string, locale: Locale): string {
  if (locale === 'vi') {
    return `Phát hiện cơ hội tối ưu hóa cho truy vấn SQL sau đây. Chỉ trả về DUY NHẤT một đối tượng JSON, không kèm lời dẫn, theo đúng cấu trúc:\n{"items":[{"title":"...","rationale":"...","suggestedSql":"... (tùy chọn)"}]}\nKhông thay đổi ngữ nghĩa của truy vấn; không hứa hẹn phần trăm cải thiện hiệu năng.\n\nTruy vấn:\n${sql}`;
  }
  return `Identify optimization opportunities for the following SQL. Reply with ONLY a JSON object — no prose — using exactly this shape:\n{"items":[{"title":"...","rationale":"...","suggestedSql":"... (optional)"}]}\nDo not change the query's semantics; do not promise performance improvement percentages.\n\nQuery:\n${sql}`;
}
// --- end verbatim copy -------------------------------------------------------------------------

const CONTRIBUTORS: ComplexityContributor[] = [
  { construct: 'CTEs', points: 144, shareOfTotal: 0.3 },
  { construct: 'JOIN', points: 82, shareOfTotal: 0.17 },
];

/** More than the five contributors the prompt keeps, so the `slice(0, 5)` bound is exercised. */
const SIX_CONTRIBUTORS: ComplexityContributor[] = [
  { construct: 'CTEs', points: 144, shareOfTotal: 0.3 },
  { construct: 'JOIN', points: 82, shareOfTotal: 0.17 },
  { construct: 'WINDOW', points: 60, shareOfTotal: 0.125 },
  { construct: 'SUBQUERY', points: 40, shareOfTotal: 0.083 },
  { construct: 'UNION', points: 30, shareOfTotal: 0.062 },
  { construct: 'DISTINCT', points: 24, shareOfTotal: 0.05 },
];

const COMPLEXITY_INPUT: ExplainComplexityInput = {
  normalizedScore: 82,
  level: 'HIGH',
  contributors: CONTRIBUTORS,
};

const FINDING = { rule: 'SELECT *', message: 'select-all detected', location: 'Line 12' };

const SQL = 'SELECT * FROM users';

// --- independent, hand-pinned en anchors (ASCII + \u2014 escapes, so no character can drift) ---

const EXPECTED_COMPLEXITY_EN =
  'Explain in plain language why this SQL query has a complexity of 82/100 (level HIGH).\n' +
  'The top contributing structures:\n' +
  '- CTEs: 144 points (30% of total)\n' +
  '- JOIN: 82 points (17% of total)\n' +
  'Ground your answer in the static analysis facts above; never contradict them.';

const EXPECTED_FINDING_EN_WITH_LOCATION =
  'Explain in plain language what the rule "SELECT *" found: select-all detected.\n' +
  'Location: Line 12\n' +
  'Say why it matters and how to address it; do not invent facts.';

const EXPECTED_FINDING_EN_WITHOUT_LOCATION =
  'Explain in plain language what the rule "R-WARN" found: warned.\n' +
  'Say why it matters and how to address it; do not invent facts.';

const EXPECTED_OPTIMIZATION_EN =
  'Identify optimization opportunities for the following SQL. Reply with ONLY a JSON object ' +
  '\u2014 no prose \u2014 using exactly this shape:\n' +
  '{"items":[{"title":"...","rationale":"...","suggestedSql":"... (optional)"}]}\n' +
  "Do not change the query's semantics; do not promise performance improvement percentages.\n" +
  '\n' +
  'Query:\n' +
  'SELECT * FROM users';


describe('dashboard prompt parity (feature 020, characterization of the pre-migration builders)', () => {
  describe('buildExplainComplexityPrompt', () => {
    it('pins the exact en bytes (FR-002/FR-004)', () => {
      expect(currentExplainComplexityPrompt(COMPLEXITY_INPUT, 'en')).toBe(EXPECTED_COMPLEXITY_EN);
      expect(buildExplainComplexityPrompt(COMPLEXITY_INPUT, 'en')).toBe(EXPECTED_COMPLEXITY_EN);
    });

    it.each(['en', 'vi'] as Locale[])('reproduces the pre-migration bytes for %s', (locale: Locale) => {
      expect(currentExplainComplexityPrompt(COMPLEXITY_INPUT, locale)).toBe(
        buildExplainComplexityPrompt(COMPLEXITY_INPUT, locale)
      );
    });

    it('keeps the five-contributor bound and the exact contributor line format', () => {
      const input = { ...COMPLEXITY_INPUT, contributors: SIX_CONTRIBUTORS };
      const actual = currentExplainComplexityPrompt(input, 'en');

      expect(actual).toBe(buildExplainComplexityPrompt(input, 'en'));
      expect(actual).toContain('- WINDOW: 60 points (13% of total)');
      expect(actual).toContain('- UNION: 30 points (6% of total)');
      expect(actual).not.toContain('DISTINCT');
      expect(actual.match(/^- /gm) ?? []).toHaveLength(5);
    });

    it('keeps Math.round half-up percentage formatting', () => {
      const input = {
        ...COMPLEXITY_INPUT,
        contributors: [{ construct: 'X', points: 1, shareOfTotal: 0.125 }],
      };
      const actual = currentExplainComplexityPrompt(input, 'en');

      expect(actual).toBe(buildExplainComplexityPrompt(input, 'en'));
      expect(actual).toContain('- X: 1 points (13% of total)');
    });

    it('renders an empty contributor list without inventing a line', () => {
      const input = { ...COMPLEXITY_INPUT, contributors: [] };
      const en = currentExplainComplexityPrompt(input, 'en');

      expect(en).toBe(buildExplainComplexityPrompt(input, 'en'));
      expect(en).toContain('The top contributing structures:\n\nGround your answer');
      expect(currentExplainComplexityPrompt(input, 'vi')).toBe(
        buildExplainComplexityPrompt(input, 'vi')
      );
    });

    it('interpolates the score and level verbatim, including non-integer scores', () => {
      const input = { ...COMPLEXITY_INPUT, normalizedScore: 0, level: 'LOW' };

      expect(currentExplainComplexityPrompt(input, 'en')).toContain('complexity of 0/100 (level LOW)');
      expect(currentExplainComplexityPrompt(input, 'vi')).toBe(
        buildExplainComplexityPrompt(input, 'vi')
      );
    });
  });


  describe('buildExplainFindingPrompt', () => {
    it('pins the exact en bytes with and without a location (FR-002/FR-004)', () => {
      const bare = { rule: 'R-WARN', message: 'warned' };

      expect(currentExplainFindingPrompt(FINDING, 'en')).toBe(EXPECTED_FINDING_EN_WITH_LOCATION);
      expect(buildExplainFindingPrompt(FINDING, 'en')).toBe(EXPECTED_FINDING_EN_WITH_LOCATION);
      expect(currentExplainFindingPrompt(bare, 'en')).toBe(EXPECTED_FINDING_EN_WITHOUT_LOCATION);
      expect(buildExplainFindingPrompt(bare, 'en')).toBe(EXPECTED_FINDING_EN_WITHOUT_LOCATION);
    });

    it.each(['en', 'vi'] as Locale[])('reproduces the pre-migration bytes for %s', (locale: Locale) => {
      expect(currentExplainFindingPrompt(FINDING, locale)).toBe(
        buildExplainFindingPrompt(FINDING, locale)
      );
      expect(currentExplainFindingPrompt({ rule: 'R-WARN', message: 'warned' }, locale)).toBe(
        buildExplainFindingPrompt({ rule: 'R-WARN', message: 'warned' }, locale)
      );
    });

    it('treats an empty-string location exactly like a missing one (falsy branch)', () => {
      const empty = { rule: 'R-WARN', message: 'warned', location: '' };

      expect(currentExplainFindingPrompt(empty, 'en')).toBe(EXPECTED_FINDING_EN_WITHOUT_LOCATION);
      expect(currentExplainFindingPrompt(empty, 'en')).not.toContain('Location');
      expect(currentExplainFindingPrompt(empty, 'vi')).toBe(
        buildExplainFindingPrompt(empty, 'vi')
      );
    });

    it('inserts rule, message and location verbatim, including braces and backticks (FR-006)', () => {
      const odd = {
        rule: 'R-{{sql}}',
        message: 'a\nb `c` {{location}}',
        location: 'L1-{{rule}}',
      };
      const actual = currentExplainFindingPrompt(odd, 'en');

      expect(actual).toBe(buildExplainFindingPrompt(odd, 'en'));
      expect(actual).toContain(
        'the rule "R-{{sql}}" found: a\nb `c` {{location}}.\nLocation: L1-{{rule}}'
      );
    });
  });

  describe('buildOptimizationOpportunitiesPrompt', () => {
    it('pins the exact en bytes (FR-002/FR-004)', () => {
      expect(currentOptimizationOpportunitiesPrompt(SQL, 'en')).toBe(EXPECTED_OPTIMIZATION_EN);
      expect(buildOptimizationOpportunitiesPrompt(SQL, 'en')).toBe(EXPECTED_OPTIMIZATION_EN);
    });

    it.each(['en', 'vi'] as Locale[])('reproduces the pre-migration bytes for %s', (locale: Locale) => {
      expect(currentOptimizationOpportunitiesPrompt(SQL, locale)).toBe(
        buildOptimizationOpportunitiesPrompt(SQL, locale)
      );
    });

    it('appends the SQL verbatim after the query block, including braces and empty input', () => {
      const odd = 'SELECT {{sql}} AS a, `b` FROM t -- {"items":[]}';

      expect(currentOptimizationOpportunitiesPrompt(odd, 'en')).toBe(
        buildOptimizationOpportunitiesPrompt(odd, 'en')
      );
      expect(currentOptimizationOpportunitiesPrompt(odd, 'en')).toContain(`Query:\n${odd}`);
      expect(currentOptimizationOpportunitiesPrompt('', 'en').endsWith('Query:\n')).toBe(true);
      expect(currentOptimizationOpportunitiesPrompt('', 'vi')).toBe(
        buildOptimizationOpportunitiesPrompt('', 'vi')
      );
    });
  });

  it('keeps distinct vi and en texts for all three prompts (locale-pair registration)', () => {
    expect(currentExplainComplexityPrompt(COMPLEXITY_INPUT, 'vi')).not.toBe(
      currentExplainComplexityPrompt(COMPLEXITY_INPUT, 'en')
    );
    expect(currentExplainFindingPrompt(FINDING, 'vi')).not.toBe(
      currentExplainFindingPrompt(FINDING, 'en')
    );
    expect(currentOptimizationOpportunitiesPrompt(SQL, 'vi')).not.toBe(
      currentOptimizationOpportunitiesPrompt(SQL, 'en')
    );
  });

  it('is deterministic: identical inputs produce byte-identical prompts (SC-001)', () => {
    const first = currentExplainComplexityPrompt(COMPLEXITY_INPUT, 'vi');

    expect(currentExplainComplexityPrompt(COMPLEXITY_INPUT, 'vi')).toBe(first);
    expect(currentExplainFindingPrompt(FINDING, 'vi')).toBe(
      currentExplainFindingPrompt(FINDING, 'vi')
    );
    expect(currentOptimizationOpportunitiesPrompt(SQL, 'vi')).toBe(
      currentOptimizationOpportunitiesPrompt(SQL, 'vi')
    );
  });
});

