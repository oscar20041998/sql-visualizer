/**
 * Parameter reference handling (FR-023 to FR-026; R3, R4, R8).
 *
 * Two forms, never treated alike:
 * - prepared `#{path, options}` → a dialect-profile literal of the supplied value;
 *   unsupplied values keep the product's existing stand-in (the reference's own
 *   name as a quoted literal) and are reported as `UNSUPPLIED_VALUE`.
 * - raw `${path}` → SQL text substituted verbatim; unsupplied values keep the
 *   reference's own name as a bare token and are reported as
 *   `UNSUPPLIED_SUBSTITUTION`. A clause is never dropped because of it.
 */
import type {
  ConversionFinding,
  DialectProfile,
  ParameterReference,
  ParameterSet,
  ReferenceScanResult,
} from './types';
import { makeFinding } from './findings';

/** Matches `#{path}` and `#{path,key=value,…}`; and `${path}`. */
const REFERENCE_PATTERN = /([#$])\{([^{}]+)\}/g;

/** Split a prepared reference into its property path and extra options (R8). */
export function parseReference(content: string): {
  path: string;
  options?: Record<string, string>;
} {
  const comma = content.indexOf(',');
  if (comma === -1) return { path: content.trim() };
  const path = content.slice(0, comma).trim();
  const options: Record<string, string> = {};
  for (const pair of content.slice(comma + 1).split(',')) {
    const equals = pair.indexOf('=');
    if (equals === -1) continue;
    const key = pair.slice(0, equals).trim();
    const value = pair.slice(equals + 1).trim();
    if (key) options[key] = value;
  }
  return { path, options };
}

/** Is the developer's text a JSON array (the accepted collection form, R6)? */
export function parseCollection(value: string | undefined): string[] | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) return null;
    return parsed.map((item) => String(item));
  } catch {
    return null;
  }
}

/** Is the value supplied? An empty string means the developer left it empty. */
export function isSupplied(value: string | undefined): boolean {
  return value !== undefined && value.trim().length > 0;
}

/**
 * Scan one piece of statement text for references, render them with the values
 * at hand, and return the substituted text plus the references and findings.
 */
export function resolveReferencesInText(
  text: string,
  params: ParameterSet,
  profile: DialectProfile,
  context: { line?: number } = {}
): ReferenceScanResult {
  const references: ParameterReference[] = [];
  const findings: ConversionFinding[] = [];
  let rendered = '';
  let lastIndex = 0;
  REFERENCE_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = REFERENCE_PATTERN.exec(text)) !== null) {
    const marker = match[1]; // '#' prepared, '$' raw
    const parsed = parseReference(match[2]);
    const supplied = isSupplied(params[parsed.path]);
    let replacement: string;

    if (marker === '#') {
      replacement = supplied ? profile.renderLiteral(params[parsed.path]) : profile.renderLiteral(parsed.path);
      references.push({
        path: parsed.path,
        form: 'prepared',
        options: Object.keys(parsed.options ?? {}).length > 0 ? parsed.options : undefined,
        status: supplied ? 'resolved' : 'unsupplied',
        rendered: replacement,
      });
      if (!supplied) {
        findings.push(
          makeFinding('UNSUPPLIED_VALUE', {
            line: context.line,
            construct: parsed.path,
            messageValues: { name: parsed.path },
          })
        );
      }
    } else {
      replacement = supplied ? params[parsed.path] : parsed.path;
      references.push({
        path: parsed.path,
        form: 'raw',
        status: supplied ? 'resolved' : 'unsupplied',
        rendered: replacement,
      });
      if (!supplied) {
        findings.push(
          makeFinding('UNSUPPLIED_SUBSTITUTION', {
            line: context.line,
            construct: parsed.path,
            messageValues: { name: parsed.path },
          })
        );
      }
    }

    rendered += text.slice(lastIndex, match.index) + replacement;
    lastIndex = match.index + match[0].length;
  }
  rendered += text.slice(lastIndex);
  return { references, findings, rendered: rendered };
}
