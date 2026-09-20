/**
 * Finding discipline (data-model E9): one finding per construct, deterministic
 * ordering by position then kind, and the severity↔state consistency the
 * contract pins (an error finding implies a blocked statement and vice versa).
 */
import {
  BLOCKING_FINDINGS,
  type ConversionFinding,
  type FindingKind,
  type MapperFile,
  type ResolutionResult,
} from './types';

/** Build one finding with the kind-as-key convention the locales follow. */
export function makeFinding(
  kind: FindingKind,
  options: {
    severity?: ConversionFinding['severity'];
    messageValues?: Record<string, string>;
    line?: number;
    construct?: string;
    statementKey?: string;
  } = {}
): ConversionFinding {
  return {
    kind,
    severity: options.severity ?? (BLOCKING_FINDINGS.has(kind) ? 'error' : 'warning'),
    messageKey: kind,
    messageValues: options.messageValues,
    position: {
      line: options.line,
      construct: options.construct,
      statementKey: options.statementKey,
    },
  };
}

/** Deterministic order: by source line (missing last), then kind, then message. */
export function sortFindings(findings: ConversionFinding[]): ConversionFinding[] {
  return [...findings].sort((a, b) => {
    const lineA = a.position?.line ?? Number.MAX_SAFE_INTEGER;
    const lineB = b.position?.line ?? Number.MAX_SAFE_INTEGER;
    if (lineA !== lineB) return lineA - lineB;
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    return (a.messageKey ?? '').localeCompare(b.messageKey ?? '');
  });
}

/**
 * Roll the file-level findings and the statement result into the state the
 * contract pins: any blocking finding on the statement (or on the file) means
 * `blocked` with empty SQL; everything else stays analysable (FR-039, FR-040).
 */
export function resolveState(
  fileFindings: ConversionFinding[],
  statementFindings: ConversionFinding[]
): { state: ResolutionResult['state']; blockReason?: ConversionFinding } {
  const all = [...fileFindings, ...statementFindings];
  const blocker = all.find((item) => BLOCKING_FINDINGS.has(item.kind));
  if (blocker) return { state: 'blocked', blockReason: blocker };
  return { state: 'analysable' };
}

/** A file that reached a bounds ceiling or failed to read yields nothing to resolve. */
export function isFileUnusable(model: MapperFile | null): model is null {
  return model === null || model.statements.length === 0;
}
