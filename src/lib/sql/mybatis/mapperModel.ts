/**
 * Mapper model builder (data-model E1–E3): turn the parsed document into
 * statements and reusable fragments. The model is the source of truth for what
 * the SQL becomes — no markup reaches the renderer (FR-042).
 *
 * Metadata is captured for display (FR-009) and never reaches the SQL;
 * `<selectKey>` is recorded as a separate key-generation statement (FR-004);
 * duplicate fragment declarations are reported with the first winning (E1).
 */
import type {
  DynamicNode,
  MapperFile,
  MappedStatement,
  SqlFragment,
  StatementType,
} from './types';
import { makeFinding } from './findings';
import { parseReference } from './parameterResolver';
import type { SafeXmlResult } from './xmlDocument';

const STATEMENT_TAGS: ReadonlySet<string> = new Set(['select', 'insert', 'update', 'delete']);
const KEY_GENERATION_TAGS: ReadonlySet<string> = new Set(['selectKey']);

/** Build the whole mapper model from a safely-read document. */
export function buildMapperModel(safe: SafeXmlResult, source: string): MapperFile {
  const findings = [...safe.findings];
  const boundsReached = [...safe.boundsReached];
  const empty: MapperFile = {
    namespace: '',
    statements: [],
    fragments: {},
    duplicateFragmentIds: [],
    findings,
    boundsReached,
  };
  if (!safe.document) return empty;

  const root = safe.document.documentElement;
  if (!root) return empty;

  const rootTag = root.tagName.toLowerCase();
  // A pasted fragment may omit the <mapper> wrapper and be the statement
  // itself (or a bare reusable fragment) — both are accepted document roots.
  if (rootTag !== 'mapper' && !STATEMENT_TAGS.has(rootTag) && rootTag !== 'sql') return empty;

  const namespace = rootTag === 'mapper' ? root.getAttribute('namespace') ?? '' : '';
  const fragments: Record<string, SqlFragment> = {};
  const duplicateFragmentIds: string[] = [];
  const statements: MappedStatement[] = [];

  if (rootTag === 'mapper') {
    for (const child of Array.from(root.children)) {
      const tag = child.tagName.toLowerCase();
      if (tag === 'sql') {
        collectFragment(child, namespace, source, fragments, duplicateFragmentIds, findings);
        continue;
      }
      if (!STATEMENT_TAGS.has(tag)) continue;
      collectStatement(child, tag as StatementType, namespace, source, statements, findings);
    }
  } else if (rootTag === 'sql') {
    collectFragment(root, namespace, source, fragments, duplicateFragmentIds, findings);
  } else {
    collectStatement(root, rootTag as StatementType, namespace, source, statements, findings);
  }

  if (statements.length === 0) {
    findings.push(makeFinding('NO_STATEMENT', {}));
  }
  return { namespace, statements, fragments, duplicateFragmentIds, findings, boundsReached };
}

function collectFragment(
  element: Element,
  namespace: string,
  source: string,
  fragments: Record<string, SqlFragment>,
  duplicateFragmentIds: string[],
  findings: MapperFile['findings']
): void {
  const id = element.getAttribute('id') ?? '';
  if (!id) return;
  if (fragments[id]) {
    duplicateFragmentIds.push(id);
    findings.push(makeFinding('DUPLICATE_FRAGMENT', { construct: id, messageValues: { id } }));
    return; // first declaration wins, deterministically (E1)
  }
  fragments[id] = {
    id,
    namespace,
    children: buildNodes(element.childNodes, source),
  };
}

function collectStatement(
  element: Element,
  type: StatementType,
  namespace: string,
  source: string,
  statements: MappedStatement[],
  findings: MapperFile['findings']
): void {
  const id = element.getAttribute('id') ?? '';
  const metadata: Record<string, string> = {};
  for (const attr of Array.from(element.attributes)) metadata[attr.name] = attr.value;

  let hasKeyGeneration = false;
  const bodyChildren: DynamicNode[] = [];
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === 1 /* element */) {
      const child = node as Element;
      if (KEY_GENERATION_TAGS.has(child.tagName.toLowerCase())) {
        hasKeyGeneration = true;
        if (child.textContent?.trim()) {
          findings.push(
            makeFinding('SELECT_KEY_SKIPPED', {
              severity: 'info',
              construct: id,
              messageValues: { id },
            })
          );
        }
        continue; // key generation is never merged into the statement (FR-004)
      }
    }
    bodyChildren.push(...buildNodes([node], source));
  }

  const occurrenceIndex = 1 + statements.filter((existing) => existing.id === id).length;
  statements.push({
    key: `${namespace}#${id}#${occurrenceIndex}`,
    id,
    namespace,
    type,
    occurrenceIndex,
    children: bodyChildren,
    metadata,
    hasKeyGeneration,
    hasDynamic: containsDynamic(bodyChildren),
    line: sourceLineOf(source, element),
  });
}

/** Convert DOM child nodes into the model's node tree (structural, FR-042). */
export function buildNodes(domNodes: NodeList | Node[], source: string): DynamicNode[] {
  const nodes: DynamicNode[] = [];
  for (const raw of Array.from(domNodes)) {
    if (raw.nodeType === 3 /* text */ || raw.nodeType === 4 /* CDATA */) {
      const text = raw.nodeValue ?? '';
      if (text.length > 0) nodes.push({ kind: 'text', text, line: sourceLineOf(source, raw) });
      continue;
    }
    if (raw.nodeType !== 1 /* element */) continue;
    const element = raw as Element;
    const tag = element.tagName.toLowerCase();
    const line = sourceLineOf(source, element);

    if (tag === 'if') {
      nodes.push({ kind: 'if', test: element.getAttribute('test') ?? '', children: buildNodes(element.childNodes, source), line });
      continue;
    }
    if (tag === 'choose') {
      const branches: { test: string; children: DynamicNode[] }[] = [];
      let fallback: DynamicNode[] | undefined;
      for (const branch of Array.from(element.children)) {
        const branchTag = branch.tagName.toLowerCase();
        if (branchTag === 'when') {
          branches.push({ test: branch.getAttribute('test') ?? '', children: buildNodes(branch.childNodes, source) });
        } else if (branchTag === 'otherwise') {
          fallback = buildNodes(branch.childNodes, source);
        }
      }
      nodes.push({ kind: 'choose', branches, fallback, line });
      continue;
    }
    if (tag === 'where') {
      nodes.push({ kind: 'where', children: buildNodes(element.childNodes, source), line });
      continue;
    }
    if (tag === 'set') {
      nodes.push({ kind: 'set', children: buildNodes(element.childNodes, source), line });
      continue;
    }
    if (tag === 'trim') {
      nodes.push({
        kind: 'trim',
        prefix: element.getAttribute('prefix') ?? undefined,
        prefixOverrides: element.getAttribute('prefixOverrides') ?? undefined,
        suffix: element.getAttribute('suffix') ?? undefined,
        suffixOverrides: element.getAttribute('suffixOverrides') ?? undefined,
        children: buildNodes(element.childNodes, source),
        line,
      });
      continue;
    }
    if (tag === 'foreach') {
      nodes.push({
        kind: 'foreach',
        collection: element.getAttribute('collection') ?? '',
        item: element.getAttribute('item') ?? undefined,
        index: element.getAttribute('index') ?? undefined,
        open: element.getAttribute('open') ?? undefined,
        close: element.getAttribute('close') ?? undefined,
        separator: element.getAttribute('separator') ?? undefined,
        children: buildNodes(element.childNodes, source),
        line,
      });
      continue;
    }
    if (tag === 'bind') {
      nodes.push({
        kind: 'bind',
        name: element.getAttribute('name') ?? '',
        expression: element.getAttribute('value') ?? '',
        line,
      });
      continue;
    }
    if (tag === 'include') {
      // The fragment it names is resolved later, against the model's own
      // fragment table (FR-010); nothing is substituted at parse time.
      const refid = element.getAttribute('refid') ?? '';
      const properties: Record<string, string> = {};
      for (const property of Array.from(element.children)) {
        if (property.tagName.toLowerCase() !== 'property') continue;
        const name = property.getAttribute('name');
        if (name) properties[name] = property.getAttribute('value') ?? '';
      }
      nodes.push({ kind: 'include', refid, properties, line });
      continue;
    }

    // Unknown wrapper element (e.g. a custom provider tag): keep its text so
    // nothing is dropped silently, and descend into any dynamic children.
    nodes.push(...buildNodes(element.childNodes, source));
  }
  return nodes;
}

/** Does any node in the tree carry dynamic semantics? */
export function containsDynamic(nodes: DynamicNode[]): boolean {
  return nodes.some((node) => node.kind !== 'text');
}

/** Matches `#{path}`/`#{path,opts}` and `${path}` inside statement text. */
const REFERENCE_TEXT_PATTERN = /([#$])\{([^{}]+)\}/g;

/** The null-check shape the conditional-parameter badge is derived from. */
const NULL_CHECK_PATTERN = /(\w+)\s*!=\s*null/i;

/** Reference paths the whole file mentions, in document order, deduplicated. */
export function collectReferencePaths(model: MapperFile): string[] {
  const paths: string[] = [];
  const visit = (nodes: DynamicNode[]) => {
    for (const node of nodes) {
      if (node.kind === 'text') {
        REFERENCE_TEXT_PATTERN.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = REFERENCE_TEXT_PATTERN.exec(node.text)) !== null) {
          const path = parseReference(match[2]).path;
          if (path && !paths.includes(path)) paths.push(path);
        }
        continue;
      }
      if (node.kind === 'bind' || node.kind === 'include') continue;
      if (node.kind === 'choose') {
        for (const branch of node.branches) visit(branch.children);
        if (node.fallback) visit(node.fallback);
        continue;
      }
      visit(node.children);
    }
  };
  for (const statement of model.statements) visit(statement.children);
  for (const fragment of Object.values(model.fragments)) visit(fragment.children);
  return paths;
}

/** `<if test="x != null">` guards by parameter name, last declaration winning. */
export function collectConditionalParams(model: MapperFile): Record<string, string> {
  const conditional: Record<string, string> = {};
  const visit = (nodes: DynamicNode[]) => {
    for (const node of nodes) {
      if (node.kind === 'if') {
        const match = NULL_CHECK_PATTERN.exec(node.test);
        if (match) conditional[match[1]] = node.test;
        visit(node.children);
        continue;
      }
      if (node.kind === 'text') continue;
      if (node.kind === 'bind' || node.kind === 'include') continue;
      if (node.kind === 'choose') {
        for (const branch of node.branches) visit(branch.children);
        if (node.fallback) visit(node.fallback);
        continue;
      }
      visit(node.children);
    }
  };
  for (const statement of model.statements) visit(statement.children);
  for (const fragment of Object.values(model.fragments)) visit(fragment.children);
  return conditional;
}

/**
 * The text of one statement (or the whole file) with every tag dropped and
 * every branch kept — the legacy "strip tags" view of a mapper (FR-038).
 */
export function collectRawText(model: MapperFile, statementKey?: string): string {
  const pieces: string[] = [];
  const visit = (nodes: DynamicNode[]) => {
    for (const node of nodes) {
      if (node.kind === 'text') {
        pieces.push(node.text);
        continue;
      }
      if (node.kind === 'bind' || node.kind === 'include') continue;
      if (node.kind === 'choose') {
        for (const branch of node.branches) visit(branch.children);
        if (node.fallback) visit(node.fallback);
        continue;
      }
      visit(node.children);
    }
  };
  const statements = statementKey
    ? model.statements.filter((statement) => statement.key === statementKey)
    : model.statements;
  for (const statement of statements) visit(statement.children);
  if (!statementKey) {
    for (const fragment of Object.values(model.fragments)) visit(fragment.children);
  }
  return pieces.join(' ');
}

/** 1-based source line of an element, located by tag + id in the raw text. */
export function sourceLineOf(source: string, node: Node): number | undefined {
  if (node.nodeType !== 1) return undefined;
  const element = node as Element;
  const tag = element.tagName.toLowerCase();
  const id = element.getAttribute('id');
  if (!id) return undefined;
  const pattern = new RegExp(`<${tag}[^>]*\\bid=["']${escapeRegExp(id)}["'][^>]*>`, 'i');
  const match = pattern.exec(source);
  if (!match) return undefined;
  return source.slice(0, match.index).split('\n').length;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

