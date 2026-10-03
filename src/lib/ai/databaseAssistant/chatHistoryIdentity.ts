/**
 * Identity resolution for Database AI Assistant history partitioning.
 *
 * Derives a stable, unique partition key for each session that can own history:
 * - Social login (Google/Microsoft): FNV-1a hash of provider|normalized-email
 * - Demo mode: fixed string 'demo'
 * - Guest session: fixed string 'guest'
 * - Signed out entirely: null (storage disabled, FR-030, FR-043)
 *
 * (research.md R2)
 */

import {
  isDemoAuthenticated,
  getSocialSession,
  isGuestSession,
  SOCIAL_AUTH_STORAGE_KEY,
  DEMO_AUTH_STORAGE_KEY,
  GUEST_AUTH_STORAGE_KEY,
} from '@/lib/demoAuth';

/**
 * Identity sources in precedence order (research.md R2 table).
 */
type IdentitySource = 'social' | 'demo' | 'guest' | 'none';

/**
 * Normalise an email address for consistent hashing:
 * - trim whitespace
 * - lowercase
 *
 * Same email with different casing → same partition.
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * FNV-1a 32-bit hash of a string.
 *
 * A fast, deterministic hash suitable for partitioning.
 * Not a security control; used for opaqueness and key shortness (never overclaim — research.md R2).
 *
 * @param input - String to hash
 * @returns Base36 representation (compact, alphanumeric)
 */
function fnv1a32(input: string): string {
  let hash = 2166136261; // FNV offset basis for 32-bit
  const fnvPrime = 16777619;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * fnvPrime) >>> 0; // Keep as uint32
  }

  return Math.abs(hash).toString(36);
}

/**
 * Resolve the partition key for the current session.
 *
 * Accepts either a real signed-in identity OR a guest session, matching the same OR condition the
 * workspace uses to admit someone (`isDemoAuthenticated() || isGuestSession()`). Guest history is
 * therefore enabled only for the AI-backed features that read this module — the Database Assistant
 * chat history is the one — and never leaks into a non-AI surface.
 *
 * Precedence:
 * 1. Social session (Google/Microsoft) → `social-<fnv1a(provider|email)>`
 * 2. Demo mode → `demo`
 * 3. Guest session → `guest`
 * 4. None of the above → `null`
 *
 * (research.md R2; guest branch added per FR-030/FR-043 revision)
 *
 * @returns Identity key, or null when nobody is signed in and no guest marker exists.
 */
export function resolveHistoryIdentity(): string | null {
  // 1. Check for social login
  const socialSession = getSocialSession();
  if (socialSession && socialSession.provider && socialSession.email) {
    const descriptor = `${socialSession.provider}|${normalizeEmail(socialSession.email)}`;
    const hash = fnv1a32(descriptor);
    return `social-${hash}`;
  }

  // 2. Demo mode. isDemoAuthenticated() already ORs the legacy admin flag with the social session,
  // so it is the single predicate to read rather than a hand-copied storage key.
  if (isDemoAuthenticated()) {
    return 'demo';
  }

  // 3. Guest session → its own partition, scoped to this browser's guest marker.
  // A guest is refused the assistant outright by the capability gate, so this branch only decides
  // what history *would* partition under; it never grants the AI capability itself.
  if (isGuestSession()) {
    return 'guest';
  }

  // 4. Signed out entirely → storage disabled.
  return null;
}

/**
 * A cheap fingerprint of the three markers that decide identity.
 *
 * Used to validate the cache rather than trusting it forever. Every sign-in, sign-out, and session
 * expiry mutates one of these keys, so a change in this string means the cached key is stale.
 */
function readIdentitySignature(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    return [
      window.localStorage.getItem(SOCIAL_AUTH_STORAGE_KEY) ?? '',
      window.localStorage.getItem(DEMO_AUTH_STORAGE_KEY) ?? '',
      window.localStorage.getItem(GUEST_AUTH_STORAGE_KEY) ?? '',
    ].join('|');
  } catch {
    // Storage blocked (private window, disabled cookies): there is no identity to cache anyway.
    return 'blocked';
  }
}

let cachedIdentityKey: string | null | undefined;
let cachedSignature: string | undefined;

/**
 * The current identity key, memoized against the storage markers it was derived from.
 *
 * The cache is re-validated on every call instead of being cleared by hand at each call site. No
 * caller was invoking `clearCachedHistoryIdentity()` on sign-in/sign-out, so a value cached before
 * an identity change would survive it and the UI would keep showing the previous partition. Reading
 * three localStorage keys is cheap enough to do per call, and it also catches the expiry path:
 * `getSocialSession()` prunes an expired session, which flips the signature on the next read.
 */
export function getCachedHistoryIdentity(): string | null {
  const signature = readIdentitySignature();
  if (cachedIdentityKey === undefined || cachedSignature !== signature) {
    cachedIdentityKey = resolveHistoryIdentity();
    cachedSignature = signature;
  }
  return cachedIdentityKey;
}

/**
 * Drop the cached identity key, forcing a re-resolve on the next call.
 *
 * Rarely needed now that the cache self-validates; kept for callers that change identity within the
 * same tick (e.g. tests, or a sign-out that also clears the guest marker).
 */
export function clearCachedHistoryIdentity(): void {
  cachedIdentityKey = undefined;
  cachedSignature = undefined;
}
