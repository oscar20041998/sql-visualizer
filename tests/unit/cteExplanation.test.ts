import { describe, expect, it, vi } from 'vitest';
import { explainCteWithAI } from '@/lib/ai/aiService';
import type { AIModelConfig } from '@/lib/store';

const config = { provider: 'ollama' } as AIModelConfig;

describe('CTE explanation', () => {
  it('asks for plain text and supplies the direct dependency context', async () => {
    const generate = vi.fn().mockResolvedValue('This step keeps active facilities only.');

    const result = await explainCteWithAI(
      {
        cteName: 'active_facilities',
        cteSql: "SELECT * FROM employee_hierarchy WHERE employee_role = 'FACILITY_DIRECTOR'",
        dependencyContext:
          'CTE employee_hierarchy:\nSELECT employee_id, facility_id FROM dim_employees',
        config,
        locale: 'en',
      },
      generate
    );

    expect(generate).toHaveBeenCalledWith(config, expect.objectContaining({ jsonMode: false }));
    expect(generate.mock.calls[0][1].prompt).toContain('employee_hierarchy');
    expect(generate.mock.calls[0][1].prompt).toContain('### headings');
    expect(generate.mock.calls[0][1].prompt).toContain('backticks');
    expect(generate.mock.calls[0][1].prompt).toContain('**bold**');
    expect(result.text).toBe('This step keeps active facilities only.');
    expect(result.usedJsonFallback).toBe(false);
  });

  it('extracts readable text when a provider returns the legacy JSON shape', async () => {
    const generate = vi.fn().mockResolvedValue(
      JSON.stringify({
        query_objective: 'This step identifies active facilities and their directors.',
        result_bullets: ['Returns each facility code.'],
        report_grain: 'One row per facility.',
        filter_categories: [],
        data_sources: [],
      })
    );

    const result = await explainCteWithAI(
      { cteName: 'active_facilities', cteSql: 'SELECT 1', config, locale: 'en' },
      generate
    );

    expect(result.text).toContain('This step identifies active facilities');
    expect(result.text).toContain('Returns each facility code.');
    expect(result.usedJsonFallback).toBe(true);
    expect(result.text).not.toContain('"query_objective"');
  });

  it('never exposes an unfamiliar JSON object as the CTE explanation', async () => {
    const generate = vi
      .fn()
      .mockResolvedValue(
        JSON.stringify({ answer: 'This step prepares a daily reporting matrix.' })
      );

    const result = await explainCteWithAI(
      { cteName: 'daily_matrix', cteSql: 'SELECT 1', config, locale: 'en' },
      generate
    );

    expect(result.text).toBe('This step prepares a daily reporting matrix.');
    expect(result.usedJsonFallback).toBe(true);
  });
});
