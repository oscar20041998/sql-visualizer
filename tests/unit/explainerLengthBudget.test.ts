import { describe, it, expect, vi } from 'vitest';
import { explainSqlStructured } from '@/lib/ai/aiService';
import type { AIModelConfig } from '@/lib/store';

const config = { provider: 'ollama' } as AIModelConfig;

const UNDER_BUDGET = JSON.stringify({
  query_objective: 'Short objective.',
  result_bullets: ['One short bullet.'],
  report_grain: 'One row per store.',
  filter_categories: [{ category: 'other constraints', items: ['No filters: every row is included.'] }],
  data_sources: [{ name: 'orders', purpose: 'Purchase records.' }],
});

const IN_BUDGET = JSON.stringify({
  query_objective: 'S'.repeat(700),
  result_bullets: ['One bullet.'],
  report_grain: 'One row per store.',
  filter_categories: [{ category: 'time range', items: ['Last 30 days.'] }],
  data_sources: [{ name: 'orders', purpose: 'Purchase records.' }],
});

describe('U16 retries generation with length steering within the bounded attempts', () => {
  it('regenerates when the first attempt is below budget and stops at the fitting retry', async () => {
    const generate = vi.fn().mockResolvedValueOnce(UNDER_BUDGET).mockResolvedValueOnce(IN_BUDGET);
    await explainSqlStructured({ sql: 'SELECT 1', config }, generate);
    expect(generate).toHaveBeenCalledTimes(2);
  });
});

describe('U17 shows the closest-length attempt when all retries are exhausted', () => {
  it('stops at 3 calls and keeps the last non-fitting attempt as raw', async () => {
    const generate = vi.fn().mockResolvedValue(UNDER_BUDGET);
    const result = await explainSqlStructured({ sql: 'SELECT 1', config }, generate);
    expect(generate).toHaveBeenCalledTimes(3);
    expect(result.raw).toBe(UNDER_BUDGET);
  });
});

describe('U19 rejects empty or whitespace-only SQL before any generation call', () => {
  it('throws without calling generation for whitespace-only SQL', async () => {
    const generate = vi.fn();
    await expect(explainSqlStructured({ sql: '   ', config }, generate)).rejects.toThrow();
    expect(generate).not.toHaveBeenCalled();
  });
});

describe('U20 returns no invented sections for unparsable SQL answers', () => {
  it('marks a plain-prose answer unstructured with raw preserved', async () => {
    const generate = vi.fn().mockResolvedValue('This query just sums things up in a friendly way.');
    const result = await explainSqlStructured({ sql: 'SELECT 1', config }, generate);
    expect(result.structured).toBe(false);
    expect(result.raw).toContain('This query');
  });
});