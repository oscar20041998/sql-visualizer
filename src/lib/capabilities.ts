import type { AIProvider } from '@/lib/ai/aiProviders';

/**
 * Capability classification for guest access (specs/013-guest-access-mode).
 *
 * A guest is refused every model-backed capability whatever provider is selected; only the paths
 * hard-wired to run locally, and the ones that use no model at all, stay open. See research.md R9
 * for why the earlier cost-based rule was withdrawn.
 *
 * This module is deliberately free of any 'use client' directive so the same table and the same
 * predicate are used by the interface AND by the server route guards — if the two disagreed, the UI
 * would promise something the server then refuses. The browser-only helper lives in
 * `useCapabilityLock.ts` precisely so adding a hook here cannot drag this file into the client graph
 * and break the route guards.
 */

/** Who bears the cost of running a capability. */
export type CapabilityBucket = 'non-ai' | 'local-ai' | 'shared-capacity';

/** Where the capability's target provider comes from. */
export type CapabilityProviderSource =
  /** The user-configured provider. */
  | 'config'
  /** Fixed to a model on the guest's own machine; never shared. */
  | 'hardwired-local'
  /** Fixed to the operator's credential; always shared. */
  | 'hardwired-cloud'
  /** Decided by a server environment setting the caller cannot influence. */
  | 'server-env'
  /** No model involved at all. */
  | 'none';

export interface Capability {
  /** Stable key, e.g. 'docs-consultant'. */
  id: string;
  bucket: CapabilityBucket;
  providerSource: CapabilityProviderSource;
  /** i18n key for the user-facing name, so every locale shows the same product vocabulary. */
  labelKey: string;
}

/**
 * The single source of truth for what a guest may use. Both the interface and the route guards read
 * this table, so they cannot disagree about what is locked.
 *
 * `providerSource` records HOW a row's target is chosen — from user config, hard-wired, or a server
 * setting. It is documentation and future-proofing: under the final policy (research.md R9) the
 * entitlement decision does not branch on it for `config` rows.
 */
export const CAPABILITIES: Record<string, Capability> = {
  'sql-explainer': {
    id: 'sql-explainer',
    bucket: 'shared-capacity',
    providerSource: 'config',
    labelKey: 'aiExplainerTitle',
  },
  optimize: {
    id: 'optimize',
    bucket: 'shared-capacity',
    providerSource: 'config',
    labelKey: 'analyzeOptimizeTitle',
  },
  'cte-batch': {
    id: 'cte-batch',
    bucket: 'shared-capacity',
    providerSource: 'config',
    labelKey: 'cteTitle',
  },
  'semantic-analysis': {
    id: 'semantic-analysis',
    bucket: 'shared-capacity',
    providerSource: 'config',
    labelKey: 'optimizationResultsTitle',
  },
  'proposal-repair': {
    id: 'proposal-repair',
    bucket: 'shared-capacity',
    providerSource: 'config',
    labelKey: 'optimizationResultsTitle',
  },
  'requirement-generation': {
    id: 'requirement-generation',
    bucket: 'shared-capacity',
    providerSource: 'config',
    labelKey: 'smartEditorRequirementLabel',
  },
  'follow-up-chat': {
    id: 'follow-up-chat',
    bucket: 'shared-capacity',
    providerSource: 'config',
    labelKey: 'aiChatTitle',
  },
  'database-assistant': {
    id: 'database-assistant',
    bucket: 'shared-capacity',
    providerSource: 'config',
    labelKey: 'navDatabaseAssistant',
  },
  'database-rag': {
    id: 'database-rag',
    bucket: 'local-ai',
    providerSource: 'hardwired-local',
    labelKey: 'navDatabaseAssistant',
  },
  'query-history-embeddings': {
    id: 'query-history-embeddings',
    bucket: 'shared-capacity',
    providerSource: 'config',
    labelKey: 'queryHistoryTitle',
  },
  // Retrieval is hard-wired to the operator's OpenAI embedding key and the caller cannot redirect
  // it, so a guest is refused even when their own model is selected (research.md R3).
  'docs-consultant': {
    id: 'docs-consultant',
    bucket: 'shared-capacity',
    providerSource: 'hardwired-cloud',
    labelKey: 'docsConsultantTitle',
  },
  // Format-error explain/fix is pinned to a local model in the editor, so it stays open.
  'format-error-ai': {
    id: 'format-error-ai',
    bucket: 'local-ai',
    providerSource: 'hardwired-local',
    labelKey: 'formatErrorPanelTitle',
  },
  speech: {
    id: 'speech',
    bucket: 'shared-capacity',
    providerSource: 'server-env',
    labelKey: 'aiExplainerSpeak',
  },
  'local-index': {
    id: 'local-index',
    bucket: 'non-ai',
    providerSource: 'none',
    labelKey: 'navDatabaseAssistant',
  },
};

/** Looks a capability up, returning undefined for an unknown id rather than guessing. */
export function getCapability(id: string): Capability | undefined {
  return CAPABILITIES[id];
}

/** The provider that means "the guest's own machine" — the only non-shared chat target. */
export const LOCAL_PROVIDER: AIProvider = 'ollama';

/**
 * Whether a guest is refused this capability.
 *
 * A guest is refused every model-backed feature EXCEPT the ones hard-wired to run locally:
 * `hardwired-local` (format-error explain/fix) and `none` (the local vector index). Those cost the
 * operator nothing regardless of the selected provider, so allowing them is free.
 *
 * Note this deliberately ignores `aiConfig.provider`. An earlier rule let a guest use a local model
 * of their own, but `ollama` is the DEFAULT provider, so that rule left almost every AI feature open
 * to a brand-new guest and locked almost none — it looked like a restriction while changing little.
/**
 * The shared predicate. A guest is refused every model-backed capability; only the hard-wired local
 * paths and the no-model paths stay open.
 *
 * `aiConfig` is accepted and ignored (research.md R9). It was once read to allow a guest's own
 * Ollama, but `ollama` is the default provider, so that exception left nearly every AI feature open
 * to a brand-new guest while appearing to restrict them. The parameter is kept so call sites stay
 * stable and the rule can be revised without touching them.
 */
export function isLockedForGuest(
  capability: Capability,
  _aiConfig?: { provider: AIProvider }
): boolean {
  // Nothing model-shaped: a guest gets it whatever provider is selected.
  if (capability.bucket === 'non-ai') return false;
  // Runs on the guest's own machine, so no shared capacity is at stake.
  if (capability.bucket === 'local-ai') return false;
  // Hard-wired local: the target is the guest's machine no matter what is configured.
  if (capability.providerSource === 'hardwired-local') return false;
  // No model at all (e.g. the local vector index).
  if (capability.providerSource === 'none') return false;
  // Hard-wired to the operator's credential.
  if (capability.providerSource === 'hardwired-cloud') return true;
  // The speech engine is a server setting the caller cannot influence, so the owning route decides.
  if (capability.providerSource === 'server-env') return false;

  // providerSource === 'config': every remaining AI feature needs an account.
  return true;
}
