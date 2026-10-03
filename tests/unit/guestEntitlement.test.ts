import { describe, it, expect } from 'vitest';
import {
  evaluateSession,
  encodeSession,
  decodeSession,
  refusalBody,
  readSession,
  type ServerSession,
} from '@/lib/sessionCookie';
import { isLockedForGuest, getCapability, CAPABILITIES, type Capability } from '@/lib/capabilities';
import type { AIModelConfig } from '@/lib/store';
import { DEFAULT_AI_CONFIG } from '@/lib/store';

/**
 * Cost-based guest entitlement (specs/013-guest-access-mode, U1-U13) and the server-side refusal
 * (US3). The rule is who bears the cost, not whether a feature is called "AI": a guest may use
 * anything running on their own machine, and is refused only what consumes the operator's capacity.
 */

const capability = (over: Partial<Capability> = {}): Capability => ({
  id: 'test-capability',
  bucket: 'shared-capacity',
  providerSource: 'config',
  labelKey: 'guestAccessTestLabel',
  ...over,
});

const configFor = (provider: AIModelConfig['provider']): AIModelConfig => ({
  ...DEFAULT_AI_CONFIG,
  provider,
});

const guest: ServerSession = { kind: 'guest', startedAt: 1 };
const demo: ServerSession = { kind: 'demo', startedAt: 1 };
const social: ServerSession = { kind: 'social', startedAt: 1 };

describe('U1 — non-ai capabilities', () => {
  it('U1 leaves a non-ai capability unlocked whatever provider is selected', () => {
    for (const provider of ['ollama', 'openai', 'anthropic', 'gemini'] as const) {
      expect(isLockedForGuest(capability({ bucket: 'non-ai' }), configFor(provider))).toBe(false);
    }
  });
});

describe('U4/U7 — which capabilities a guest is refused', () => {
  it('refuses every config-driven AI feature, even on the DEFAULT local provider', () => {
    // Regression: ollama is the default provider, so the earlier rule that let a guest use "their
    // own local model" left nearly every AI feature open. Every provider must now be refused.
    for (const provider of ['ollama', 'openai', 'anthropic', 'gemini'] as const) {
      expect(isLockedForGuest(getCapability('sql-explainer')!, configFor(provider))).toBe(true);
      expect(isLockedForGuest(getCapability('optimize')!, configFor(provider))).toBe(true);
      expect(isLockedForGuest(getCapability('database-assistant')!, configFor(provider))).toBe(true);
    }
  });

  it('U7 locks the Docs Consultant too', () => {
    expect(isLockedForGuest(getCapability('docs-consultant')!, configFor('ollama'))).toBe(true);
  });

  it('leaves the hard-wired local format-error AI open (option C)', () => {
    for (const provider of ['ollama', 'openai'] as const) {
      expect(isLockedForGuest(getCapability('format-error-ai')!, configFor(provider))).toBe(false);
    }
  });

  it('leaves the non-AI local index open', () => {
    expect(isLockedForGuest(getCapability('local-index')!, configFor('openai'))).toBe(false);
  });

  // Every labelKey must resolve in every supported locale, or a locked feature shows a blank title
  // (SC-005). Several labelKeys were invented and missing from the locale files before this check.
  it('U9 has a labelKey that resolves in both locales for every capability', async () => {
    const [{ default: en }, { default: vi }] = await Promise.all([
      import('@/locales/en'),
      import('@/locales/vi'),
    ]);
    const missing: string[] = [];
    for (const capability of Object.values(CAPABILITIES)) {
      for (const [locale, table] of [['en', en], ['vi', vi]] as const) {
        const value = (table as unknown as Record<string, unknown>)[capability.labelKey];
        if (typeof value !== 'string' || value.trim() === '') {
          missing.push(`${capability.id}/${capability.labelKey} (${locale})`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('U19/U20 — cookie decoding never throws', () => {
  it('U19 treats an absent cookie as no session', () => {
    expect(decodeSession(undefined)).toBeNull();
    expect(decodeSession('')).toBeNull();
  });

  it('U20 treats malformed and forged values as no session', () => {
    for (const bad of ['not-json', '{"kind":"demo"', '%%%', 'a.b.c']) {
      expect(decodeSession(bad)).toBeNull();
    }
  });

  it('round-trips a real session', () => {
    expect(decodeSession(encodeSession('guest', 42))).toEqual({ kind: 'guest', startedAt: 42 });
  });

  // This was previously written to assert the opposite — that a hand-written raw JSON cookie also
  // had to work. That leniency WAS the vulnerability: a caller could send unsigned JSON claiming
  // kind=demo. The cookie must now be readable in exactly one form, the signed one.
  it('reads a session out of a real Cookie header (regression: double-decoding)', () => {
    const value = encodeSession('demo', 7);
    const request = new Request('http://localhost/api/ai/generate', {
      headers: { cookie: `other=1; sqlv_session=${value}; more=2` },
    });
    expect(readSession(request)).toEqual({ kind: 'demo', startedAt: 7 });
  });

  it('refuses a hand-written raw JSON cookie that claims to be demo', () => {
    const forged = `other=1; sqlv_session=${JSON.stringify({ kind: 'demo', startedAt: 7 })}`;
    const request = new Request('http://localhost/api/ai/generate', { headers: { cookie: forged } });
    // Previously accepted, and the whole reason the cookie is now signed and HttpOnly.
    expect(readSession(request)).toBeNull();
  });
});

describe('U23/U24 — the refusal verdict and body', () => {
  it('refuses a caller with no session', () => {
    const verdict = evaluateSession(null, {});
    expect(verdict.allowed).toBe(false);
    if (verdict.allowed) return;
    expect(verdict.reason).toBe('no-session');
    expect(verdict.sessionKind).toBe('none');
  });

  it('lets demo and social sessions through', () => {
    expect(evaluateSession(demo, { alwaysRefuseGuest: true }).allowed).toBe(true);
    expect(evaluateSession(social, { alwaysRefuseGuest: true }).allowed).toBe(true);
  });

  it('refuses a guest only when the route always refuses guests', () => {
    expect(evaluateSession(guest, {}).allowed).toBe(true);
    const verdict = evaluateSession(guest, { alwaysRefuseGuest: true });
    expect(verdict.allowed).toBe(false);
    if (verdict.allowed) return;
    expect(verdict.reason).toBe('guest-not-entitled');
    expect(verdict.sessionKind).toBe('guest');
  });

  it('allowAnonymous lets a session-less caller through', () => {
    expect(evaluateSession(null, { allowAnonymous: true }).allowed).toBe(true);
  });

  it('U24 the body carries a stable code the client can switch on', () => {
    const verdict = evaluateSession(guest, { alwaysRefuseGuest: true });
    if (verdict.allowed) throw new Error('expected a refusal');
    expect(refusalBody(verdict)).toEqual({
      error: 'Authentication required for this AI capability.',
      code: 'AI_SESSION_REQUIRED',
      sessionKind: 'guest',
    });
  });
});
