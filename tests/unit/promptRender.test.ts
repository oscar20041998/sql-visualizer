import { describe, expect, it, vi } from 'vitest';
import { PROMPT_REGISTRY, type PromptEntry } from '@/lib/ai/prompts/registry';
import { renderPrompt } from '@/lib/ai/prompts/render';

// I/O boundary doubles for U9: any call recorded here is a violation of the
// renderer's no-I/O contract (FR-012/FR-015). The unit under test is never doubled.
const fsCalls = vi.hoisted(() => ({
  readFileSync: vi.fn(() => ''),
  writeFileSync: vi.fn(),
}));
vi.mock('node:fs', () => ({ default: fsCalls, ...fsCalls }));

/** Registers a throwaway entry for one test and always removes it afterwards. */
function withProbeEntry(entry: PromptEntry, run: () => void): void {
  PROMPT_REGISTRY['cycle.probe'] = entry;
  try {
    run();
  } finally {
    delete PROMPT_REGISTRY['cycle.probe'];
  }
}

describe('prompt renderer (feature 020, unit behaviors U1–U9)', () => {
  it('rejects an unknown prompt id with an actionable error (U1)', () => {
    expect(() => renderPrompt('does.not.exist', {})).toThrowError(/does\.not\.exist/);
  });

  // NOTE (resume of an interrupted cycle): the previous session left this file
  // corrupted — a half-written U5 test with broken escapes made it untransformable
  // (0 tests collected) and had also destroyed the U2/U3 tests recorded DONE in
  // Cycles 3–4. The file was repaired before any run; nothing deleted had ever
  // executed. U2/U3 were reconstructed from the cycle-log records.
  it('rejects a missing required parameter with an actionable error (U2)', () => {
    withProbeEntry(
      { role: 'user', text: 'Dialect: {{dialect}}', params: { dialect: { required: true } } },
      () => {
        expect(() => renderPrompt('cycle.probe', {})).toThrowError(
          /missing required parameter: dialect/
        );
      }
    );
  });

  it('applies the pre-change default when an optional parameter is omitted (U3)', () => {
    withProbeEntry(
      {
        role: 'user',
        text: 'Dialect: {{dialect}}',
        params: { dialect: { required: false, default: 'mysql' } },
      },
      () => {
        const [message] = renderPrompt('cycle.probe', {});
        expect(message.content).toBe('Dialect: mysql');
      }
    );
  });

  it('performs no network or filesystem access on the render path (U9)', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      withProbeEntry(
        { role: 'user', text: 'IO probe: {{x}}', params: { x: { required: false, default: 'v' } } },
        () => {
          const [message] = renderPrompt('cycle.probe', {});
          expect(message.content).toBe('IO probe: v');
        }
      );
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(fsCalls.readFileSync).not.toHaveBeenCalled();
      expect(fsCalls.writeFileSync).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('renders byte-identical messages for the same id and params on every call (U8)', () => {
    withProbeEntry(
      {
        role: 'user',
        text: 'A={{a}} B={{b}}',
        params: { a: { required: true }, b: { required: false, default: 'x' } },
      },
      () => {
        const params = { a: 'SELECT 1' };
        const first = renderPrompt('cycle.probe', params);
        const second = renderPrompt('cycle.probe', params);
        expect(second).toEqual(first);
        expect(second[0].content).toBe('A=SELECT 1 B=x');
      }
    );
  });

  it('takes the message role from the registry entry and never rewrites it (U7)', () => {
    for (const role of ['system', 'user', 'assistant'] as const) {
      withProbeEntry(
        { role, text: 'Role probe: {{x}}', params: { x: { required: false, default: 'v' } } },
        () => {
          const [message] = renderPrompt('cycle.probe', {});
          expect(message.role).toBe(role);
          expect(message.content).toBe('Role probe: v');
        }
      );
    }
  });

  it('treats {{…}} inside a parameter value as content, never re-scanning (U6)', () => {
    withProbeEntry(
      {
        role: 'user',
        text: 'Question: {{question}}',
        params: {
          question: { required: true },
          // Declared with a default so a re-scan would visibly substitute it.
          dialect: { required: false, default: 'mysql' },
        },
      },
      () => {
        const [message] = renderPrompt('cycle.probe', {
          question: 'What is {{dialect}}?',
        });
        expect(message.content).toBe('Question: What is {{dialect}}?');
      }
    );
  });

  it('renders an empty-string value as empty without substituting the default (U4)', () => {
    withProbeEntry(
      {
        role: 'user',
        text: 'Dialect: [{{dialect}}]',
        params: { dialect: { required: false, default: 'mysql' } },
      },
      () => {
        const [message] = renderPrompt('cycle.probe', { dialect: '' });
        expect(message.content).toBe('Dialect: []');
      }
    );
  });

  it('preserves multiline SQL and special characters byte-for-byte (U5)', () => {
    withProbeEntry(
      {
        role: 'user',
        text: 'Dialect: {{dialect}}\nWithin quotes: {{sql}}\nBraces: {a: {{n}}, b: {{m}}}\nBackticks: `{{sql}}`',
        params: {
          dialect: { required: false, default: 'mysql' },
          sql: { required: false, default: 'SELECT 1;' },
          n: { required: false, default: '1' },
          m: { required: false, default: '2' },
        },
      },
      () => {
        const sql = `SELECT * FROM t
  WHERE a = 'it''s' AND b = "q"`;
        const [message] = renderPrompt('cycle.probe', {
          dialect: 'psql',
          sql,
          n: '{z}',
          m: 'x"y',
        });
        expect(message.content).toBe(
          `Dialect: psql\nWithin quotes: ${sql}\nBraces: {a: {z}, b: x"y}\nBackticks: \`${sql}\``
        );
      }
    );
  });
});

/**
 * T024 / SC-006: every REGISTERED prompt id must fail loudly and actionably — and before any
 * provider call — for each parameter-handling failure mode. The ids are enumerated from the
 * registry at runtime, so a newly registered prompt is covered automatically instead of being
 * silently skipped.
 */
describe('prompt renderer error paths for every registered prompt (feature 020, T024 / SC-006)', () => {
  const REGISTERED_IDS = Object.keys(PROMPT_REGISTRY);

  it('covers a non-trivial number of registered prompts (guards against a vacuous loop)', () => {
    expect(REGISTERED_IDS.length).toBeGreaterThanOrEqual(36);
  });

  it('rejects an unknown id for every registry-adjacent name with an actionable error (A8)', () => {
    for (const id of REGISTERED_IDS) {
      const unknown = `${id}.does-not-exist`;
      expect(() => renderPrompt(unknown, {}), `unknown id ${unknown}`).toThrowError(
        new RegExp(unknown.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      );
    }
  });

  it('rejects a missing required parameter for every id that declares one (A6)', () => {
    for (const id of REGISTERED_IDS) {
      const entry = PROMPT_REGISTRY[id];
      const requiredNames = Object.entries(entry.params)
        .filter(([, schema]) => schema.required)
        .map(([name]) => name);

      if (requiredNames.length === 0) {
        // No required parameter: omitting everything must still render without throwing.
        expect(() => renderPrompt(id, {}), `id ${id} with no params`).not.toThrow();
        continue;
      }

      const firstRequired = requiredNames[0];
      expect(() => renderPrompt(id, {}), `id ${id} missing ${firstRequired}`).toThrowError(
        new RegExp(firstRequired)
      );
    }
  });

  it('never sends an unresolved placeholder when every declared parameter is supplied (A9)', () => {
    for (const id of REGISTERED_IDS) {
      const entry = PROMPT_REGISTRY[id];
      const params: Record<string, string> = {};
      for (const [name, schema] of Object.entries(entry.params)) {
        params[name] = schema.default ?? `value-for-${name}`;
      }

      const [message] = renderPrompt(id, params);
      for (const name of Object.keys(entry.params)) {
        expect(message.content, `id ${id} left {{${name}}} unresolved`).not.toContain(
          `{{${name}}}`
        );
      }
      expect(message.content).not.toContain('{{');
    }
  });

  it('takes each message role from its own registry entry, never a hard-coded default (U7)', () => {
    for (const id of REGISTERED_IDS) {
      const entry = PROMPT_REGISTRY[id];
      const params: Record<string, string> = {};
      for (const [name, schema] of Object.entries(entry.params)) {
        params[name] = schema.default ?? `value-for-${name}`;
      }

      const messages = renderPrompt(id, params);
      expect(messages).toHaveLength(1);
      expect(messages[0].role, `id ${id} role`).toBe(entry.role);
    }
  });
});
