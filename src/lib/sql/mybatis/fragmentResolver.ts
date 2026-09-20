/**
 * Fragment expansion (FR-010 to FR-012; research R13).
 *
 * Every `<include>` in a statement body is replaced by the fragment it names
 * before dynamic evaluation, so the evaluator only ever sees ordinary nodes.
 * Only fragments defined in the loaded file can satisfy a reference (the
 * accepted single-file clarification): anything else is reported as
 * `MISSING_FRAGMENT` and blocks the statement. Cycles, chains deeper than the
 * limit and expansion beyond the budget stop safely with a finding — the loop
 * never truncates silently.
 */
import type { ConversionFinding, DynamicNode, MapperFile, ParameterSet } from './types';
import { makeFinding } from './findings';
import { MAX_FRAGMENT_DEPTH, MAX_FRAGMENT_EXPANSIONS } from './limits';

/** Expansion work budget shared by one `expandStatementIncludes` call. */
interface ExpansionBudget {
  expansions: number;
}

/**
 * Expand every `<include>` in a statement body against the model's fragment
 * table. Property values that name a supplied parameter take that parameter's
 * value; every other property value is used verbatim.
 */
export function expandStatementIncludes(
  nodes: DynamicNode[],
  model: MapperFile,
  params: ParameterSet,
  findings: ConversionFinding[]
): DynamicNode[] {
  return expandNodes(nodes, model, params, findings, [], 0, { expansions: 0 });
}

function expandNodes(
  nodes: DynamicNode[],
  model: MapperFile,
  params: ParameterSet,
  findings: ConversionFinding[],
  visited: string[],
  depth: number,
  budget: ExpansionBudget
): DynamicNode[] {
  const output: DynamicNode[] = [];
  for (const node of nodes) {
    output.push(...expandNode(node, model, params, findings, visited, depth, budget));
  }
  return output;
}

/**
 * Expand one node. An include is replaced by its fragment's property-
 * substituted children; a container is rebuilt with its children expanded, so
 * an include hiding behind a guard is still resolved.
 */
function expandNode(
  node: DynamicNode,
  model: MapperFile,
  params: ParameterSet,
  findings: ConversionFinding[],
  visited: string[],
  depth: number,
  budget: ExpansionBudget
): DynamicNode[] {
  if (node.kind !== 'include') {
    return [expandContainers(node, model, params, findings, visited, depth, budget)];
  }
  if (visited.includes(node.refid)) {
    findings.push(
      makeFinding('FRAGMENT_CYCLE', {
        construct: node.refid,
        messageValues: { refid: node.refid },
        line: node.line,
      })
    );
    return [node]; // the cycle is reported; the statement is blocked, nothing invented
  }
  if (depth >= MAX_FRAGMENT_DEPTH) {
    findings.push(
      makeFinding('FRAGMENT_DEPTH', { messageValues: { limit: String(MAX_FRAGMENT_DEPTH) }, line: node.line })
    );
    return [node];
  }
  const fragment = model.fragments[node.refid];
  if (!fragment) {
    findings.push(
      makeFinding('MISSING_FRAGMENT', {
        construct: node.refid,
        messageValues: { refid: node.refid },
        line: node.line,
      })
    );
    return [node]; // unsatisfiable references never fabricate SQL (G8)
  }
  budget.expansions += 1;
  if (budget.expansions > MAX_FRAGMENT_EXPANSIONS) {
    // Report the overflow once; later includes are skipped without a flood.
    if (budget.expansions === MAX_FRAGMENT_EXPANSIONS + 1) {
      findings.push(
        makeFinding('EXPANSION_LIMIT', { messageValues: { limit: String(MAX_FRAGMENT_EXPANSIONS) }, line: node.line })
      );
    }
    return [node];
  }
  const properties = resolvePropertyValues(node.properties, params);
  const substituted = fragment.children.map((child) => substituteProperties(child, properties));
  return expandNodes(substituted, model, params, findings, [...visited, node.refid], depth + 1, budget);
}

/** Rebuild a container node with every child include expanded. */
function expandContainers(
  node: DynamicNode,
  model: MapperFile,
  params: ParameterSet,
  findings: ConversionFinding[],
  visited: string[],
  depth: number,
  budget: ExpansionBudget
): DynamicNode {
  if (node.kind === 'text' || node.kind === 'bind' || node.kind === 'include') return node;
  if (node.kind === 'choose') {
    return {
      ...node,
      branches: node.branches.map((branch) => ({
        ...branch,
        children: expandNodes(branch.children, model, params, findings, visited, depth, budget),
      })),
      fallback: node.fallback
        ? expandNodes(node.fallback, model, params, findings, visited, depth, budget)
        : undefined,
    };
  }
  return { ...node, children: expandNodes(node.children, model, params, findings, visited, depth, budget) };
}

/** A `<property>` value that names a supplied parameter takes that value. */
function resolvePropertyValues(properties: Record<string, string>, params: ParameterSet): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const [key, value] of Object.entries(properties)) {
    resolved[key] = value in params ? params[value] : value;
  }
  return resolved;
}

/** Substitute `${property}` occurrences in a node's text with per-use values. */
export function substituteProperties(node: DynamicNode, properties: Record<string, string>): DynamicNode {
  if (node.kind === 'text') {
    const substituted = node.text.replace(/\$\{([^{}]+)\}/g, (match, name: string) => {
      const key = name.trim();
      return key in properties ? properties[key] : match;
    });
    return { ...node, text: substituted };
  }
  if (node.kind === 'bind') return node;
  if (node.kind === 'include') return node;
  if (node.kind === 'choose') {
    return {
      ...node,
      branches: node.branches.map((branch) => ({
        ...branch,
        children: branch.children.map((child) => substituteProperties(child, properties)),
      })),
      fallback: node.fallback?.map((child) => substituteProperties(child, properties)),
    };
  }
  return { ...node, children: node.children.map((child) => substituteProperties(child, properties)) };
}