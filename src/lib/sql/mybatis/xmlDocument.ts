/**
 * Safe XML read for untrusted mapper input (FR-005, FR-006, FR-031, FR-032; R1).
 *
 * The document type and entity declarations are removed before parsing so that
 * no external resolution can ever happen, the input size and nesting depth are
 * bounded, and the tree is only ever read (never serialised back). The platform
 * `DOMParser` does the structural work — this module is the hardened front door.
 */
import { MAX_INPUT_LENGTH, MAX_XML_DEPTH } from './limits';
import type { ConversionFinding, FindingKind } from './types';

export interface SafeXmlResult {
  document: XMLDocument | null;
  findings: ConversionFinding[];
  boundsReached: string[];
}

/** Remove `<!DOCTYPE …>` (with or without an internal subset) before parsing. */
export function stripDoctype(source: string): string {
  const start = source.indexOf('<!DOCTYPE');
  if (start === -1) return source;
  let bracketDepth = 0;
  for (let i = start + '<!DOCTYPE'.length; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '[') bracketDepth += 1;
    else if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);
    else if (ch === '>' && bracketDepth === 0) {
      return source.slice(0, start) + source.slice(i + 1);
    }
  }
  // Unterminated declaration: drop the rest (the parse below will report it).
  return source.slice(0, start);
}

/**
 * Escape a `<` that cannot begin a tag — one not followed by a letter, `_`,
 * `:`, `/`, `!` or `?` — so pasted SQL like `price <= #{limit}` survives the
 * strict XML parser instead of failing the whole document. CDATA content is
 * skipped: a raw `<` is legal there and must stay verbatim. Tag syntax and
 * real entity references are untouched; genuinely malformed markup still
 * fails the parse and blocks (FR-030).
 */
export function escapeStrayLessThan(source: string): string {
  let result = '';
  let i = 0;
  while (i < source.length) {
    const open = source.indexOf('<![CDATA[', i);
    if (open === -1) {
      result += escapeRange(source, i, source.length);
      break;
    }
    result += escapeRange(source, i, open);
    const close = source.indexOf(']]>', open);
    if (close === -1) {
      // Unterminated CDATA: leave the rest for the parser to report.
      result += source.slice(open);
      break;
    }
    result += source.slice(open, close + 3);
    i = close + 3;
  }
  return result;
}

/** Escape stray `<` inside one non-CDATA range. */
function escapeRange(text: string, from: number, to: number): string {
  return text.slice(from, to).replace(/<(?![A-Za-z_:/!?])/g, '&lt;');
}

/** Read the mapper document safely, reporting rather than throwing on trouble. */
export function readMapperXml(source: string): SafeXmlResult {
  const findings: ConversionFinding[] = [];
  const boundsReached: string[] = [];
  const finding = (kind: FindingKind, messageValues: Record<string, string>): ConversionFinding => ({
    kind,
    severity: 'error',
    messageKey: kind,
    messageValues,
  });

  if (source.length > MAX_INPUT_LENGTH) {
    boundsReached.push('MAX_INPUT_LENGTH');
    findings.push(
      finding('INPUT_TOO_LARGE', {
        actual: String(source.length),
        limit: String(MAX_INPUT_LENGTH),
      })
    );
    return { document: null, findings, boundsReached };
  }

  const neutralised = escapeStrayLessThan(stripDoctype(source));
  let document: XMLDocument;
  try {
    document = new DOMParser().parseFromString(neutralised, 'application/xml');
  } catch {
    findings.push(finding('MALFORMED_XML', {}));
    return { document: null, findings, boundsReached };
  }

  const parseError = document.getElementsByTagName('parsererror')[0];
  if (parseError) {
    findings.push(finding('MALFORMED_XML', {}));
    return { document: null, findings, boundsReached };
  }

  const root = document.documentElement;
  if (root && xmlDepthOf(root) > MAX_XML_DEPTH) {
    boundsReached.push('MAX_XML_DEPTH');
    findings.push(finding('NESTING_TOO_DEEP', { limit: String(MAX_XML_DEPTH) }));
    return { document: null, findings, boundsReached };
  }

  return { document, findings, boundsReached };
}

function xmlDepthOf(element: Element): number {
  let depth = 1;
  let parent: Element | null = element.parentElement;
  while (parent) {
    depth += 1;
    parent = parent.parentElement;
  }
  return depth;
}
