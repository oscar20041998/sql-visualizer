/**
 * Dashboard AI insight prompt builders (specs/010-sql-intelligence-dashboard —
 * contracts/ai-insights.md, FR-019/FR-020). Bilingual vi/en; responses render only
 * inside the visibly labeled AI panel and must never contradict parser facts.
 */

import type { Locale } from '../../i18n';
import type { ComplexityContributor } from './types';

export interface ExplainComplexityInput {
  normalizedScore: number;
  level: string;
  contributors: ComplexityContributor[];
}

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
