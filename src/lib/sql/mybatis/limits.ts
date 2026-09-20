/**
 * Conversion bounds (FR-032, SC-005).
 *
 * Every ceiling exists so that a hostile or pathological mapper file cannot hang
 * the page or exhaust the runtime. They are enforced in `xmlDocument.ts` (input
 * size and XML nesting depth) and in `fragmentResolver.ts` / `dynamicEvaluator.ts`
 * (fragment nesting and repeated expansion). A file that reaches a ceiling is
 * reported through a finding rather than truncated silently.
 */

/** Largest mapper document accepted, in UTF-16 code units (~512 KB). */
export const MAX_INPUT_LENGTH = 512 * 1024;

/** Deepest XML element nesting accepted while building the model. */
export const MAX_XML_DEPTH = 64;

/** Deepest `<include>` chain accepted while expanding reusable fragments. */
export const MAX_FRAGMENT_DEPTH = 32;

/** Total fragment expansions performed while converting one file. */
export const MAX_FRAGMENT_EXPANSIONS = 10_000;

/** Largest `<foreach>` item count expanded for one collection value. */
export const MAX_FOREACH_ITEMS = 10_000;

/** Deepest nesting of include/if/choose/wrapper expansion before stopping. */
export const MAX_EVALUATION_DEPTH = 64;
