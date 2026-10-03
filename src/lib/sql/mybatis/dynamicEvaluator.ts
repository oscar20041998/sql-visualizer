/**
 * Dynamic construct evaluation (FR-013 to FR-022; research R5, R6, R7).
 *
 * The node tree decides the SQL — a construct's contribution is computed from
 * its own semantics and its parent's configuration, never by inspecting text
 * (FR-042). Reference rendering happens here, against the scope each piece
 * actually sees, so iteration items and `<bind>` values render as values.
 * Every unresolved construct is reported through a finding rather than
 * guessed at; a clause is never silently dropped or invented.
 *
 * Known limitation (research R5): when a `<foreach>` collection is unavailable,
 * the wrapper is kept with the collection's own name as a stand-in token. That
 * token can look like a column to the downstream analyzer; the finding is the
 * explanation.
 */
import type {
  ConversionFinding,
  DialectProfile,
  DynamicNode,
  ParameterReference,
  ParameterSet,
} from './types';
import { makeFinding } from './findings';
import { evaluateCondition } from './conditionEvaluator';
import { isSupplied, parseCollection, resolveReferencesInText } from './parameterResolver';
import { MAX_EVALUATION_DEPTH, MAX_FOREACH_ITEMS } from './limits';

export interface EvaluationOutput {
  /** Rendered text pieces in source order, before whitespace normalisation. */
  pieces: string[];
  findings: ConversionFinding[];
  /** Every reference the produced SQL contains, in order. */
  references: ParameterReference[];
  /** `name → rendered value` bindings introduced by `<bind>`. */
  bindings: Record<string, string>;
}

/** Everything one evaluation accumulates, threaded through the recursion. */
interface EvalContext {
  params: ParameterSet;
  profile: DialectProfile;
  pieces: string[];
  findings: ConversionFinding[];
  references: ParameterReference[];
}

/** Evaluate a statement's node tree against the developer's values. */
export function evaluateNodes(
  nodes: DynamicNode[],
  params: ParameterSet,
  profile: DialectProfile
): EvaluationOutput {
  const context: EvalContext = { params, profile, pieces: [], findings: [], references: [] };
  const bindings: Record<string, string> = {};
  evaluateInto(nodes, context, bindings, 0);
  return {
    pieces: context.pieces,
    findings: context.findings,
    references: context.references,
    bindings,
  };
}

function evaluateInto(
  nodes: DynamicNode[],
  context: EvalContext,
  bindings: Record<string, string>,
  depth: number
): void {
  if (depth > MAX_EVALUATION_DEPTH) {
    context.findings.push(
      makeFinding('NESTING_TOO_DEEP', { messageValues: { limit: String(MAX_EVALUATION_DEPTH) } })
    );
    return;
  }
  for (const node of nodes) {
    switch (node.kind) {
      case 'text':
        renderText(node, context, bindings);
        break;
      case 'if':
        evaluateGuard(node, context, bindings, depth);
        break;
      case 'choose':
        evaluateChoose(node, context, bindings, depth);
        break;
      case 'where':
        evaluateWrapper(node, context, bindings, depth);
        break;
      case 'set':
        evaluateSet(node, context, bindings, depth);
        break;
      case 'trim':
        evaluateTrim(node, context, bindings, depth);
        break;
      case 'foreach':
        evaluateForeach(node, context, bindings, depth);
        break;
      case 'bind':
        evaluateBind(node, context, bindings);
        break;
      // 'include' never reaches evaluation: unresolved includes were reported
      // during expansion and block the statement, so they contribute nothing.
    }
  }
}

/** Render one text piece: references resolve against the scope in effect. */
function renderText(
  node: Extract<DynamicNode, { kind: 'text' }>,
  context: EvalContext,
  bindings: Record<string, string>
): void {
  const scan = resolveReferencesInText(node.text, { ...context.params, ...bindings }, context.profile, {
    line: node.line,
  });
  context.references.push(...scan.references);
  context.findings.push(...scan.findings);
  context.pieces.push(scan.rendered);
}

function evaluateGuard(
  node: Extract<DynamicNode, { kind: 'if' }>,
  context: EvalContext,
  bindings: Record<string, string>,
  depth: number
): void {
  const result = evaluateCondition(node.test, { ...context.params, ...bindings }, { line: node.line });
  if (!result.ok) {
    // R7: keep the guarded SQL and report the condition — never silently drop it.
    if (result.finding) context.findings.push(result.finding);
    evaluateInto(node.children, context, bindings, depth + 1);
    return;
  }
  if (result.value === true) {
    evaluateInto(node.children, context, bindings, depth + 1);
  }
}

function evaluateChoose(
  node: Extract<DynamicNode, { kind: 'choose' }>,
  context: EvalContext,
  bindings: Record<string, string>,
  depth: number
): void {
  for (const branch of node.branches) {
    const result = evaluateCondition(branch.test, { ...context.params, ...bindings }, { line: node.line });
    if (result.ok && result.value === true) {
      evaluateInto(branch.children, context, bindings, depth + 1);
      return;
    }
    if (!result.ok && result.finding) context.findings.push(result.finding);
  }
  if (node.fallback) {
    evaluateInto(node.fallback, context, bindings, depth + 1);
  }
}

function evaluateWrapper(
  node: Extract<DynamicNode, { kind: 'where' }>,
  context: EvalContext,
  bindings: Record<string, string>,
  depth: number
): void {
  const inner: EvalContext = { ...context, pieces: [] };
  evaluateInto(node.children, inner, bindings, depth + 1);
  const body = inner.pieces.join(' ').trim();
  if (!body) return; // no clause and no orphan connective (FR-016)
  context.pieces.push(`WHERE ${stripLeadingConnective(body)}`);
}

function evaluateSet(
  node: Extract<DynamicNode, { kind: 'set' }>,
  context: EvalContext,
  bindings: Record<string, string>,
  depth: number
): void {
  const inner: EvalContext = { ...context, pieces: [] };
  evaluateInto(node.children, inner, bindings, depth + 1);
  const body = inner.pieces.join(' ').trim().replace(/,\s*$/, '');
  if (!body) return; // SET only when at least one assignment applies (FR-017)
  context.pieces.push(`SET ${body}`);
}

function evaluateTrim(
  node: Extract<DynamicNode, { kind: 'trim' }>,
  context: EvalContext,
  bindings: Record<string, string>,
  depth: number
): void {
  const inner: EvalContext = { ...context, pieces: [] };
  evaluateInto(node.children, inner, bindings, depth + 1);
  let body = inner.pieces.join(' ').trim();
  if (node.prefixOverrides) body = stripOverridesAtStart(body, node.prefixOverrides);
  if (node.suffixOverrides) body = stripOverridesAtEnd(body, node.suffixOverrides);
  if (!body && !node.prefix && !node.suffix) return;
  context.pieces.push(
    `${node.prefix ?? ''}${node.prefix && body ? ' ' : ''}${body}${node.suffix && body ? ' ' : ''}${node.suffix ?? ''}`.trim()
  );
}

function evaluateForeach(
  node: Extract<DynamicNode, { kind: 'foreach' }>,
  context: EvalContext,
  bindings: Record<string, string>,
  depth: number
): void {
  const open = node.open ?? '';
  const close = node.close ?? '';
  const separator = node.separator ?? '';
  const collectionValue = context.params[node.collection];

  if (!isSupplied(collectionValue)) {
    // R5: never assume an arity; keep the wrapper with the collection's own
    // name as the stand-in token and report the unresolved collection.
    context.findings.push(
      makeFinding('UNRESOLVED_COLLECTION', {
        line: node.line,
        construct: node.collection,
        messageValues: { name: node.collection },
      })
    );
    context.pieces.push(`${open}${node.collection}${close}`);
    return;
  }

  const items = parseCollection(collectionValue);
  if (items === null) {
    // Supplied but not the accepted JSON-array form (R6): report, keep wrapper.
    context.findings.push(
      makeFinding('UNRESOLVED_COLLECTION', {
        line: node.line,
        construct: node.collection,
        messageValues: { name: node.collection },
      })
    );
    context.pieces.push(`${open}${node.collection}${close}`);
    return;
  }
  if (items.length === 0) {
    // FR-021: wrapper characters with no items, plus the invalid-predicate risk.
    context.findings.push(
      makeFinding('EMPTY_COLLECTION', {
        line: node.line,
        construct: node.collection,
        messageValues: { name: node.collection },
      })
    );
    context.pieces.push(`${open}${close}`.trim());
    return;
  }
  if (items.length > MAX_FOREACH_ITEMS) {
    // SC-005: pathological collections are bounded, reported and never half-rendered.
    context.findings.push(
      makeFinding('EXPANSION_LIMIT', {
        line: node.line,
        construct: node.collection,
        messageValues: { limit: String(MAX_FOREACH_ITEMS) },
      })
    );
    context.pieces.push(`${open}${node.collection}${close}`);
    return;
  }

  const rendered: string[] = [];
  for (let i = 0; i < items.length; i += 1) {
    const scope: ParameterSet = { ...context.params };
    if (node.item) scope[node.item] = items[i];
    if (node.index) scope[node.index] = String(i);
    const iteration: EvalContext = { ...context, params: scope, pieces: [] };
    evaluateInto(node.children, iteration, bindings, depth + 1);
    rendered.push(iteration.pieces.join(' ').trim());
  }
  context.pieces.push(`${open}${rendered.filter(Boolean).join(separator)}${close}`.trim());
}

function evaluateBind(
  node: Extract<DynamicNode, { kind: 'bind' }>,
  context: EvalContext,
  bindings: Record<string, string>
): void {
  const result = evaluateCondition(node.expression, { ...context.params, ...bindings }, { line: node.line });
  if (result.ok) {
    bindings[node.name] =
      result.value === true ? 'true' : result.value === false ? 'false' : String(result.value ?? '');
    return;
  }
  // FR-022: report the binding; later references fall back to their stand-in.
  context.findings.push(
    makeFinding('UNRESOLVED_BIND', {
      line: node.line,
      construct: node.name,
      messageValues: { name: node.name, expression: node.expression },
    })
  );
}

function stripLeadingConnective(body: string): string {
  return body.replace(/^(AND|OR)\b\s*/i, '');
}

function stripOverridesAtStart(body: string, overrides: string): string {
  const parts = overrides.split('|').map((part) => part.trim()).filter(Boolean);
  let result = body;
  for (const part of parts) {
    if (result.toUpperCase().startsWith(part.toUpperCase())) {
      result = result.slice(part.length).trimStart();
      break;
    }
  }
  return result;
}

function stripOverridesAtEnd(body: string, overrides: string): string {
  const parts = overrides.split('|').map((part) => part.trim()).filter(Boolean);
  let result = body;
  for (const part of parts) {
    if (result.toUpperCase().endsWith(part.toUpperCase())) {
      result = result.slice(0, result.length - part.length).trimEnd();
      break;
    }
  }
  return result;
}