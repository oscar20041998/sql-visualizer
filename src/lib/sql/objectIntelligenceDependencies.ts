import type { SqlDialect } from './sqlAnalyzer';
import type { ViewAnalysis } from './viewAnalyzer';
import type { TableAnalysis } from './tableAnalyzer';

export interface SessionObject {
  id: string;
  kind: 'view' | 'table';
  dialect: SqlDialect;
  schema: string;
  name: string;
  source: string;
  sourceDocument?: { label: string | null; text: string; start: number; end: number };
  references: string[];
  assumedSchema?: boolean;
  assumedReferences?: string[];
  incomplete: boolean;
}

export interface DependencyEdge {
  source: string;
  target: string;
  label: string;
  reference: string;
  resolved: boolean;
  assumed?: boolean;
}

const identifier = /^[a-z_][a-z0-9_$]*$/i;
const qualifiedName = /^[a-z_][a-z0-9_$]*\.[a-z_][a-z0-9_$]*$/i;

export function sessionObjectFromAnalysis(
  source: string,
  dialect: SqlDialect,
  analysis: ViewAnalysis | TableAnalysis,
  defaultSchema = ''
): SessionObject | null {
  const schema = analysis.status === 'partial' ? analysis.schema || defaultSchema : null;
  if (
    analysis.status !== 'partial' ||
    (defaultSchema && (!identifier.test(defaultSchema) || defaultSchema.length > 63)) ||
    !schema ||
    !qualifiedName.test(`${schema}.${analysis.name}`) ||
    schema.length > 63 ||
    analysis.name.length > 63 ||
    /[`"\[]/.test(source)
  ) {
    return null;
  }
  const isTable = 'kind' in analysis;
  if (!isTable && dialect !== 'mysql' && dialect !== 'postgresql') return null;
  const completeReferences =
    !isTable &&
    analysis.sourceCrossCheck === 'agreement' &&
    !/\bWITH\b/i.test(analysis.query) &&
    analysis.tables.every(
      (table) => qualifiedName.test(table) || (!!defaultSchema && identifier.test(table))
    );
  const references =
    !isTable && completeReferences
      ? [
          ...new Set(
            analysis.tables.map((table) =>
              qualifiedName.test(table) ? table : `${defaultSchema}.${table}`
            )
          ),
        ]
      : [];
  const assumedReferences =
    !isTable && completeReferences
      ? [
          ...new Set(
            analysis.tables
              .filter((table) => !qualifiedName.test(table))
              .map((table) => `${defaultSchema}.${table}`)
          ),
        ]
      : [];
  const assumedSchema = !analysis.schema;
  return {
    id: `${dialect}:${schema}.${analysis.name}`,
    kind: isTable ? 'table' : 'view',
    dialect,
    schema,
    name: analysis.name,
    source,
    references,
    assumedSchema,
    assumedReferences,
    incomplete: !completeReferences || assumedSchema || assumedReferences.length > 0,
  };
}

export function dependencyEdges(views: SessionObject[]): DependencyEdge[] {
  const edges: DependencyEdge[] = [];
  for (const view of views) {
    for (const reference of view.references) {
      const candidates = views.filter(
        (candidate) =>
          candidate.dialect === view.dialect &&
          `${candidate.schema}.${candidate.name}` === reference
      );
      const resolved = candidates.length === 1;
      edges.push({
        source: view.id,
        target: resolved ? candidates[0].id : `unresolved:${view.dialect}:${reference}`,
        label: `${view.schema}.${view.name} → ${reference}`,
        reference,
        resolved,
        assumed:
          !!view.assumedSchema ||
          !!view.assumedReferences?.includes(reference) ||
          (resolved && !!candidates[0].assumedSchema),
      });
    }
  }
  return edges;
}

export function reverseImpact(
  edges: DependencyEdge[],
  target: string
): { id: string; depth: number }[] {
  const visited = new Set([target]);
  const queue = [{ id: target, depth: 0 }];
  const impact: { id: string; depth: number }[] = [];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const edge of edges) {
      if (!edge.resolved || edge.target !== current.id || visited.has(edge.source)) continue;
      visited.add(edge.source);
      const dependent = { id: edge.source, depth: current.depth + 1 };
      impact.push(dependent);
      queue.push(dependent);
    }
  }
  return impact;
}

export function hasDependencyCycle(edges: DependencyEdge[]): boolean {
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    if (!edge.resolved) continue;
    if (!incoming.has(edge.source)) incoming.set(edge.source, 0);
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    const targets = outgoing.get(edge.source) ?? [];
    targets.push(edge.target);
    outgoing.set(edge.source, targets);
  }
  const queue = [...incoming].filter(([, count]) => count === 0).map(([id]) => id);
  let processed = 0;
  for (let index = 0; index < queue.length; index += 1) {
    processed += 1;
    for (const target of outgoing.get(queue[index]) ?? []) {
      const count = (incoming.get(target) ?? 0) - 1;
      incoming.set(target, count);
      if (count === 0) queue.push(target);
    }
  }
  return processed !== incoming.size;
}
