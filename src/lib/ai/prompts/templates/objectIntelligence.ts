import type { PromptTemplateMap } from '../registry';

export const OBJECT_AI_PROMPTS = {
  system: 'objectIntelligence.explain.system',
  facts: 'objectIntelligence.explain.facts',
} as const;

export const OBJECT_AI_TEMPLATES: PromptTemplateMap = {
  [OBJECT_AI_PROMPTS.system]: {
    role: 'system',
    text: 'Explain only the supplied static database-object facts. State that analysis is partial and actual behavior and performance are unknown. Do not invent object details. Write in {{language}}.',
    params: { language: { required: true } },
    feature: 'objectIntelligence',
    source: 'specs/022-database-object-intelligence/contracts/workspace.md',
  },
  [OBJECT_AI_PROMPTS.facts]: {
    role: 'user',
    text: 'Static facts (the original SQL and identifiers are not available): {{facts}}',
    params: { facts: { required: true } },
    feature: 'objectIntelligence',
    source: 'specs/022-database-object-intelligence/contracts/workspace.md',
  },
};
