import type { AIRole } from '../aiService';
import type { Locale } from '@/lib/i18n';
import { DATABASE_ASSISTANT_TEMPLATES } from './templates/databaseAssistant';
import { DASHBOARD_TEMPLATES } from './templates/dashboard';
import { DOCS_CONSULTANT_TEMPLATES } from './templates/docsConsultant';
import { FOLLOW_UP_TEMPLATES } from './templates/followUp';
import { FORMAT_ERROR_TEMPLATES } from './templates/formatError';
import { OPTIMIZE_TEMPLATES } from './templates/optimize';
import { REPAIR_TEMPLATES } from './templates/repair';
import { REQUIREMENT_TEMPLATES } from './templates/requirement';
import { SEMANTIC_BRIEF_TEMPLATES } from './templates/semanticBrief';
import { SQL_COMPARISON_TEMPLATES } from './templates/sqlComparison';
import { SQL_EXPLAINER_TEMPLATES } from './templates/sqlExplainer';

/**
 * Prompt management core — the single source of truth for every AI prompt text
 * (specs/020-prompt-manager-refactor, contracts/prompt-manager.md).
 *
 * Dependency rule (kept acyclic on purpose, so templates stay independently testable):
 *   templates/*  --type-only-->  registry.ts   (no runtime edge)
 *   registry.ts  --value------>  templates/*   (aggregates the per-feature maps)
 *   render.ts    --value------>  registry.ts   (the only resolution point)
 * Template modules therefore import from this file with `import type` only.
 */

/** Stable registry key for one prompt entry, e.g. 'formatError.explain'. */
export type PromptId = string;

/** Message shape produced by the renderer — identical to the existing `AIMessage`. */
export interface PromptMessage {
  role: AIRole;
  content: string;
}

export interface ParamSchemaEntry {
  /** Missing required parameters raise an actionable error before any provider call (SC-006). */
  required: boolean;
  /** Optional parameters keep their pre-change default exactly (FR-003). */
  default?: string;
}

export type ParamSchema = Record<string, ParamSchemaEntry>;

/**
 * Owning AI feature. Links a registry entry back to its `prompt-inventory.md` row
 * (data-model.md → PromptTemplate.feature), so an editor can find every prompt of a
 * feature from one place.
 */
export type PromptFeature =
  | 'formatError'
  | 'sqlExplainer'
  | 'semanticBrief'
  | 'optimize'
  | 'requirement'
  | 'repair'
  | 'followUp'
  | 'docsConsultant'
  | 'databaseAssistant'
  | 'sqlComparison'
  | 'dashboard';

export interface PromptEntry {
  /** Message role preserved from the source prompt text (FR-004). */
  role: AIRole;
  /** Verbatim template text with `{{paramName}}` placeholders (FR-004). */
  text: string;
  /** Named, validated parameter schema (FR-003, FR-005). */
  params: ParamSchema;
  /**
   * Locale variant this entry serves. Present ONLY when the pre-change source branched
   * per locale (data-model.md → PromptTemplate.locale); shared templates omit it.
   */
  locale?: Locale;
  /** Owning feature — traceability to the inventory row. */
  feature?: PromptFeature;
  /** Pre-migration `file:line`, kept so any entry can be traced to its origin. */
  source?: string;
}

/** A per-feature slice of the registry, exported by one `templates/*.ts` module. */
export type PromptTemplateMap = Record<PromptId, PromptEntry>;

/** The assembled registry: every feature's template map, keyed by `PromptId`. */
export type PromptRegistry = Record<PromptId, PromptEntry>;

/**
 * Central registry: the single resolution point for prompt text after migration (SC-005).
 *
 * Each `templates/*.ts` module owns one feature's entries and is spread in below; onboard a new
 * feature by adding its module here. The object stays mutable so the registry audit tests can
 * attach and remove throwaway probe keys.
 *
 * Parameter rules (enforced by `render.ts`, audited by `tests/unit/promptRegistry.test.ts`):
 * - `params` is the ONLY contract for what a template may interpolate: every `{{name}}` in `text`
 *   must appear as a key in `params`, or the registry audit fails (SC-003).
 * - `required: true` means the caller must supply the value; `renderPrompt` throws before any
 *   provider call otherwise (SC-006).
 * - `default` applies ONLY when the caller omits the value (`undefined`/`null`). An explicitly
 *   supplied empty string stays empty — that boundary is pinned by unit behaviors U3/U4.
 *
 * Locale handling: an entry carries `locale` ONLY when the pre-migration source branched per
 * language. Callers resolve the variant with `localizedPromptId(base, locale)`, which reproduces the
 * old `PROMPT[locale] ?? PROMPT.en` fallback. Shared templates (formatError, sqlComparison) must stay
 * locale-free — adding a variant would be a language-behavior change (FR-009/FR-010).
 *
 * Known limitations (see `prompt-inventory.md` for the full records):
 * - Two prompts are deliberately NOT registered, as documented `deferred-risk` rows: the persisted
 *   settings default `DEFAULT_AI_CONFIG.systemPrompt` (`src/lib/store.ts`) and the non-chat TTS
 *   `SPEECH_INSTRUCTIONS` (`src/lib/ai/aiSpeech.ts`). Registering either would change a
 *   settings/request contract, so each needs its own approved change.
 * - `PromptId` is a plain `string`, not a literal union: template modules reference each other's
 *   ids through the registry type without a circular import. The audit test compensates by pinning
 *   the exact id set.
 */
export const PROMPT_REGISTRY: PromptRegistry = {
  ...FORMAT_ERROR_TEMPLATES,
  ...SQL_EXPLAINER_TEMPLATES,
  ...SEMANTIC_BRIEF_TEMPLATES,
  ...OPTIMIZE_TEMPLATES,
  ...REQUIREMENT_TEMPLATES,
  ...REPAIR_TEMPLATES,
  ...FOLLOW_UP_TEMPLATES,
  ...DOCS_CONSULTANT_TEMPLATES,
  ...DATABASE_ASSISTANT_TEMPLATES,
  ...SQL_COMPARISON_TEMPLATES,
  ...DASHBOARD_TEMPLATES,
};
