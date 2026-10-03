/**
 * Conversion orchestrator — the library's three entry points (contract
 * `mybatis-conversion.md`; data-model E1, E2, E8, E10).
 *
 * `parseMapperXml` reads the document once per text (single-entry cache,
 * FR-035); `listStatements` feeds the picker; `resolveStatement` expands
 * fragments, evaluates the dynamic tree, renders references against the
 * selected dialect's profile, and rolls the findings into the
 * analysable/blocked state. Content problems never throw — they block.
 */
import type { MapperFile, ParameterSet, ResolutionResult, StatementOption } from './types';
import { DIALECT_PROFILES } from './types';
import type { SqlDialect } from '../sqlAnalyzer';
import { readMapperXml } from './xmlDocument';
import { buildMapperModel } from './mapperModel';
import { expandStatementIncludes } from './fragmentResolver';
import { evaluateNodes } from './dynamicEvaluator';
import { resolveState, sortFindings } from './findings';
import { normaliseWhitespace } from './renderer';

/** Single-entry parse cache: the last text and the model it produced (FR-035). */
let cachedXml: string | null = null;
let cachedModel: MapperFile | null = null;

/** Read the mapper document once per text; a repeat call reuses the model. */
export function parseMapperXml(xml: string): MapperFile {
  if (cachedXml === xml && cachedModel !== null) return cachedModel;
  const model = buildMapperModel(readMapperXml(xml), xml);
  cachedXml = xml;
  cachedModel = model;
  return model;
}

/** Statement options in document order, feeding the picker (FR-003, E10). */
export function listStatements(model: MapperFile): StatementOption[] {
  return model.statements.map((statement) => {
    const repeats = model.statements.some((other) => other.id === statement.id && other.key !== statement.key);
    const base = `${statement.type} ${statement.id}`;
    return {
      key: statement.key,
      id: statement.id,
      type: statement.type,
      occurrenceIndex: statement.occurrenceIndex,
      label: repeats ? `${base} #${statement.occurrenceIndex}` : base,
    };
  });
}

/**
 * Produce the SQL, references, findings and state for one statement.
 * A key that `listStatements` did not produce is a programming error and
 * throws; anything the document itself gets wrong blocks instead.
 */
export function resolveStatement(
  model: MapperFile,
  statementKey: string,
  params: ParameterSet,
  dialect: SqlDialect
): ResolutionResult {
  const statement = model.statements.find((item) => item.key === statementKey);
  if (!statement) {
    throw new Error(`resolveStatement: unknown statement key "${statementKey}"`);
  }

  // File-level findings travel with every statement result so the panel can
  // explain the file; statement-level findings join them below.
  const findings = [...model.findings];
  const expanded = expandStatementIncludes(statement.children, model, params, findings);
  const evaluation = evaluateNodes(expanded, params, DIALECT_PROFILES[dialect]);
  findings.push(...evaluation.findings);

  const { state, blockReason } = resolveState([], findings);
  const sql = state === 'blocked' ? '' : normaliseWhitespace(evaluation.pieces);
  return {
    statementKey: statement.key,
    statementType: statement.type,
    sql,
    parameters: evaluation.references,
    findings: sortFindings(findings),
    state,
    blockReason,
  };
}
