/**
 * Section capability resolution for the SQL Intelligence Dashboard
 * (specs/010-sql-intelligence-dashboard — FR-013, FR-014, FR-015).
 *
 * 'supported'   — the analyzer computes the data for this object type.
 * 'partial'     — a meaningful subset exists; the rest is explicitly unavailable
 *                 (never rendered as a fake zero).
 * 'unsupported' — no analysis exists for this object type yet; the UI must say so.
 */

export type CapabilityStatus = 'supported' | 'partial' | 'unsupported';

/** Kinds of analyzed objects the dashboard shell can present. Query is live today;
 *  the others are future analyzers (FR-014) whose modules are placeholders. */
export type DatabaseObjectType = 'query' | 'cte' | 'view' | 'procedure' | 'function' | 'trigger';

export type DashboardSection =
  | 'health'
  | 'findings'
  | 'complexity'
  | 'structure'
  | 'join'
  | 'cte'
  | 'predicates'
  | 'select'
  | 'functions'
  | 'dependencies'
  | 'ai'
  | 'advanced';

const QUERY_CAPABILITIES: Record<DashboardSection, CapabilityStatus> = {
  health: 'supported',
  findings: 'supported',
  complexity: 'supported',
  structure: 'supported',
  join: 'supported',
  cte: 'supported',
  // metrics.conditionCount exists; the analyzer does not yet compute the AND/OR
  // split or maximum nesting depth, so the predicates detail is a subset.
  predicates: 'partial',
  select: 'supported',
  functions: 'supported',
  // Direct CTE/table references exist; transitive counts, dependency depth and
  // cycles are not computed by the analyzer yet (FR-015 "where supported").
  dependencies: 'partial',
  ai: 'supported',
  advanced: 'supported',
};

const ALL_UNSUPPORTED: Record<DashboardSection, CapabilityStatus> = {
  health: 'unsupported',
  findings: 'unsupported',
  complexity: 'unsupported',
  structure: 'unsupported',
  join: 'unsupported',
  cte: 'unsupported',
  predicates: 'unsupported',
  select: 'unsupported',
  functions: 'unsupported',
  dependencies: 'unsupported',
  ai: 'unsupported',
  advanced: 'unsupported',
};

/** Resolve every section's capability for an object type. Pure and total. */
export function resolveCapabilities(
  objectType: DatabaseObjectType
): Record<DashboardSection, CapabilityStatus> {
  if (objectType === 'query') {
    return { ...QUERY_CAPABILITIES };
  }
  // View/Procedure/Function/Trigger analyzers are placeholder modules today
  // (specs/010 audit): the shell renders capability messages, never fake zeros.
  return { ...ALL_UNSUPPORTED };
}
