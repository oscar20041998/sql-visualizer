import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { checkOtherLintingRules } from './sql/complexityScorer';

describe('performance lint locations', () => {
  it('points demo_query5 warnings to the actual syntax lines', () => {
    const sql = readFileSync('src/sample/demo_query5.sql', 'utf8');
    const issues = checkOtherLintingRules(sql);

    expect(issues.find((item) => item.rule === 'OR_PREDICATE')?.location).toBe(
      "197: CASE WHEN sb.status = 'DAMAGED' OR sb.status = 'SHORTAGE' THEN 0 ELSE 1 END AS is_in_full"
    );
    expect(issues.find((item) => item.rule === 'DISTINCT_OPERATIONS')?.location).toBe(
      '219: COUNT(DISTINCT sb.waybill_id) AS total_shipments,'
    );
    expect(issues.find((item) => item.rule === 'FUNCTION_ON_COLUMN')?.location).toBe(
      '253: DATE(sb.booked_at),'
    );
  });

  it('reports the function in the relevant clause instead of the first function in SELECT', () => {
    const sql = [
      'SELECT DATE(created_at) AS created_date,',
      '       JSON_EXTRACT(payload, "$.id") AS id',
      'FROM events',
      'WHERE status = 1',
      'GROUP BY',
      '  DATE(created_at)',
    ].join('\n');

    const issue = checkOtherLintingRules(sql).find((item) => item.rule === 'FUNCTION_ON_COLUMN');
    expect(issue?.location).toBe('6: DATE(created_at)');
  });

  it('keeps line numbers stable across comments, strings, and CRLF input', () => {
    const sql = "-- UNION should be ignored\r\nSELECT 'UNION' AS label\r\nUNION\r\nSELECT 'x'";
    const issue = checkOtherLintingRules(sql).find(
      (item) => item.rule === 'UNION_DEDUPLICATION'
    );
    expect(issue?.location).toBe('3: UNION');
  });

  it('detects additional performance and correctness anti-patterns', () => {
    const sql = [
      'SELECT id FROM users WHERE deleted_at = NULL',
      'UNION',
      "SELECT id FROM archive WHERE name LIKE '%slow'",
    ].join('\n');
    const rules = checkOtherLintingRules(sql).map((item) => item.rule);

    expect(rules.includes('UNION_DEDUPLICATION')).toBe(true);
    expect(rules.includes('INVALID_NULL_COMPARISON')).toBe(true);
    expect(rules.includes('LEADING_WILDCARD_LIKE')).toBe(true);
  });
});
