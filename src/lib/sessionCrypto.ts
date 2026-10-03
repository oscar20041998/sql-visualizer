/**
 * HMAC signing for the server-issued session (specs/013-guest-access-mode, US3).
 *
 * Why this exists: the cookie used to be unsigned JSON written by the browser, so any caller could
 * set `kind=demo` by hand and spend the operator's metered capacity. Signing moves the minting
 * decision to the server, and a tampered value now fails closed.
 *
 * The key is server-only and never reaches the client bundle. When `SESSION_SECRET` is absent a
 * random per-process key is used, so cookies stop verifying after a restart and callers fall back to
 * "no session" — which the AI routes refuse. Losing AI access is the intended failure direction; a
 * key derived from something guessable would reopen the very hole this closes.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

let ephemeralKey: Buffer | null = null;

function signingKey(): Buffer {
  const configured = process.env.SESSION_SECRET;
  if (configured && configured.length > 0) return Buffer.from(configured, 'utf8');
  ephemeralKey ??= randomBytes(32);
  return ephemeralKey;
}

/** Whether a stable, restart-surviving key is configured. */
export function hasStableSessionSecret(): boolean {
  return Boolean(process.env.SESSION_SECRET);
}

/** Signs a payload string, returning `payload.signature`. */
export function signSessionValue(payload: string): string {
  const signature = createHmac('sha256', signingKey()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

/**
 * Verifies and returns the payload, or `null` when the value is malformed, unsigned, or signed with
 * a different key.
 *
 * The comparison is timing-safe so a caller cannot learn the signature byte by byte. Every failure
 * returns the same `null`, revealing nothing about why a value was rejected.
 */
export function verifySessionValue(signed: string | undefined | null): string | null {
  if (!signed) return null;
  const separator = signed.lastIndexOf('.');
  if (separator <= 0 || separator === signed.length - 1) return null;

  const payload = signed.slice(0, separator);
  const provided = signed.slice(separator + 1);

  let expected: Buffer;
  let candidate: Buffer;
  try {
    expected = createHmac('sha256', signingKey()).update(payload).digest();
    candidate = Buffer.from(provided, 'base64url');
  } catch {
    return null;
  }
  // timingSafeEqual throws on a length mismatch, so lengths are compared first. The length of a
  // fixed-size digest is not itself secret.
  if (candidate.length !== expected.length) return null;
  return timingSafeEqual(candidate, expected) ? payload : null;
}