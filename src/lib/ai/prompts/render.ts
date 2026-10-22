import { PROMPT_REGISTRY, type PromptId, type PromptMessage } from './registry';
import type { Locale } from '@/lib/i18n';

/**
 * Renders a registered prompt's messages. Pure function — no I/O, no network,
 * never logs SQL or prompt payloads (FR-012, FR-015).
 *
 * Semantics: unknown id and missing required parameters raise actionable errors
 * before any provider call (SC-006); omitted optionals take their declared
 * default, empty strings are preserved (FR-003); the single left-to-right fill
 * pass inserts values verbatim — values are never re-scanned (FR-006) — and the
 * entry's role and content are emitted unchanged (FR-004).
 *
 * Parameter rules:
 * - Iteration is driven by the entry's `params` schema, never by the caller's object, so extra
 *   caller keys are ignored and can never inject text into the template.
 * - A value is `supplied ?? schema.default ?? ''`. `??` (not `||`) is deliberate: an explicitly
 *   supplied empty string must survive instead of falling back to the default (U4).
 * - Only `{{name}}` tokens whose `name` is a declared parameter are substituted. Anything else —
 *   including a `{{...}}`-shaped sequence that arrived inside a value — is left untouched (U6).
 * - The regex allows surrounding whitespace inside the braces (`{{ sql }}`) and requires a
 *   leading letter, so JSON braces in prompt text are never mistaken for placeholders.
 *
 * Error contract: both failures throw a plain `Error` with the offending id/parameter named, so the
 * message is actionable for a maintainer. Per FR-005 the caller's existing error handling still
 * produces the feature's normal user-visible fallback; no new user-facing state is introduced.
 *
 * Known limitations: the renderer returns exactly one message (one `PromptEntry` = one message).
 * Multi-message conversations are composed by the calling feature, not by this function.
 */
export function renderPrompt(id: PromptId, params: Record<string, string>): PromptMessage[] {
  const entry = PROMPT_REGISTRY[id];
  if (!entry) {
    throw new Error(`Unknown prompt id: ${id}`);
  }
  const values: Record<string, string> = {};
  for (const [name, schema] of Object.entries(entry.params)) {
    const supplied = params[name];
    if ((supplied === undefined || supplied === null) && schema.required) {
      throw new Error(`Prompt '${id}' is missing required parameter: ${name}`);
    }
    values[name] = supplied ?? schema.default ?? '';
  }
  const content = entry.text.replace(
    /\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g,
    (match, name: string) => (name in values ? values[name] : match)
  );
  return [{ role: entry.role, content }];
}

/**
 * Resolves the registry id of a locale-variant prompt (data-model.md → LanguageContext).
 *
 * Templates whose source branched per language are registered as `<base>.en` / `<base>.vi`
 * pairs. The `en` fallback reproduces the pre-migration `PROMPT[locale] ?? PROMPT.en` lookup
 * exactly, so an unexpected runtime locale still renders the English text instead of throwing.
 *
 * Pure: the registry is an in-memory object — no I/O, no new preference, no new default (FR-009).
 * The locale always comes from the caller's existing i18n value.
 */
export function localizedPromptId(base: PromptId, locale: Locale): PromptId {
  const id = `${base}.${locale}`;
  return id in PROMPT_REGISTRY ? id : `${base}.en`;
}
