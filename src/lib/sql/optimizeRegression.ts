import type { AnalysisResult } from '@/lib/sql/sqlAnalyzer';
import type { Translations } from '@/lib/i18n';

/**
 * A local, non-AI safety net: the model is told to touch only what a linting alert (or a user's
 * natural-language instruction) requires, but it can still ignore that instruction. This compares
 * structural facts the parser already verified on both queries (tables, joins, filter conditions,
 * output columns, DISTINCT/GROUP BY) and flags anything the "optimized" query dropped, so an
 * over-eager rewrite is visible before the user decides whether to keep it — instead of silently
 * trusting the model's own summary.
 */
export function buildStructuralRegressionWarnings(
  original: AnalysisResult,
  optimized: AnalysisResult,
  t: Translations
): string[] {
  const warnings: string[] = [];

  const tableKey = (table: AnalysisResult['tables'][number]) =>
    `${table.name.toLowerCase()}::${(table.alias ?? '').toLowerCase()}`;
  const originalTables = new Set(original.tables.map(tableKey));
  const optimizedTables = new Set(optimized.tables.map(tableKey));
  if ([...originalTables].some((table) => !optimizedTables.has(table))) {
    warnings.push(t.smartEditorOptimizeRegressionTableIdentity);
  }

  const joinKey = (join: AnalysisResult['joins'][number]) =>
    [join.source, join.target].sort().join('::').toLowerCase();
  const originalRelationships = new Set(original.joins.map(joinKey));
  const optimizedRelationships = new Set(optimized.joins.map(joinKey));
  if ([...originalRelationships].some((relationship) => !optimizedRelationships.has(relationship))) {
    warnings.push(t.smartEditorOptimizeRegressionJoinIdentity);
  }

  // A relationship that still exists can still have quietly changed row-inclusion semantics —
  // e.g. INNER JOIN rewritten to LEFT JOIN (or vice versa) keeps the same table pair but no
  // longer returns the same rows, so this must be flagged separately from removal.
  const optimizedJoinTypeByPair = new Map(optimized.joins.map((join) => [joinKey(join), join.joinType]));
  if (
    original.joins.some((join) => {
      const optimizedType = optimizedJoinTypeByPair.get(joinKey(join));
      return optimizedType !== undefined && optimizedType !== join.joinType;
    })
  ) {
    warnings.push(t.smartEditorOptimizeRegressionJoinType);
  }

  // A same-count field swap (one output column replaced by another) would pass the length-only
  // check below unnoticed, so also diff the actual field identities.
  const fieldKey = (field: AnalysisResult['mainQueryFields'][number]) =>
    (field.alias || field.field).toLowerCase();
  const optimizedFields = new Set(optimized.mainQueryFields.map(fieldKey));
  const missingField = original.mainQueryFields.find((field) => !optimizedFields.has(fieldKey(field)));
  if (missingField) {
    warnings.push(
      t.smartEditorOptimizeRegressionColumnIdentity.replace('{column}', fieldKey(missingField))
    );
  }

  if (optimized.tables.length < original.tables.length) {
    warnings.push(
      t.smartEditorOptimizeRegressionTables.replace(
        '{count}',
        String(original.tables.length - optimized.tables.length)
      )
    );
  }
  if (optimized.metrics.totalJoinCount < original.metrics.totalJoinCount) {
    warnings.push(
      t.smartEditorOptimizeRegressionJoins.replace(
        '{count}',
        String(original.metrics.totalJoinCount - optimized.metrics.totalJoinCount)
      )
    );
  }
  if (optimized.metrics.conditionCount < original.metrics.conditionCount) {
    warnings.push(
      t.smartEditorOptimizeRegressionConditions.replace(
        '{count}',
        String(original.metrics.conditionCount - optimized.metrics.conditionCount)
      )
    );
  }
  if (optimized.mainQueryFields.length < original.mainQueryFields.length) {
    warnings.push(
      t.smartEditorOptimizeRegressionColumns
        .replace('{optimized}', String(optimized.mainQueryFields.length))
        .replace('{original}', String(original.mainQueryFields.length))
    );
  }
  if (original.metrics.distinct > 0 && optimized.metrics.distinct === 0) {
    warnings.push(t.smartEditorOptimizeRegressionDistinct);
  }
  if (original.metrics.groupBy > 0 && optimized.metrics.groupBy === 0) {
    warnings.push(t.smartEditorOptimizeRegressionGroupBy);
  }

  return warnings;
}

/**
 * Structural diff between a requirement-driven candidate query and the original it was derived
 * from (spec 004). Unlike {@link buildStructuralRegressionWarnings} (which only flags *removed*
 * facts as a safety warning for a supposedly semantics-preserving rewrite), this reports both
 * additions and removals — a requirement candidate is explicitly allowed to add tables/joins/
 * columns, but the user must still be told exactly what changed either way.
 */
export interface SemanticChangeSummary {
  addedTables: string[];
  removedTables: string[];
  addedJoins: string[];
  removedJoins: string[];
  addedColumns: string[];
  removedColumns: string[];
  filterChanged: boolean;
  isSemanticChange: boolean;
}

export function buildRequirementChangeSummary(
  original: AnalysisResult,
  candidate: AnalysisResult
): SemanticChangeSummary {
  const tableKey = (table: AnalysisResult['tables'][number]) => table.name.toLowerCase();
  const originalTableNames = new Map(original.tables.map((table) => [tableKey(table), table.name]));
  const candidateTableNames = new Map(candidate.tables.map((table) => [tableKey(table), table.name]));

  const addedTables = [...candidateTableNames.keys()]
    .filter((key) => !originalTableNames.has(key))
    .map((key) => candidateTableNames.get(key)!);
  const removedTables = [...originalTableNames.keys()]
    .filter((key) => !candidateTableNames.has(key))
    .map((key) => originalTableNames.get(key)!);

  const nameById = (analysis: AnalysisResult) => new Map(analysis.tables.map((table) => [table.id, table.name]));
  const joinDescription = (analysis: AnalysisResult, join: AnalysisResult['joins'][number]) => {
    const names = nameById(analysis);
    const source = names.get(join.source) ?? join.source;
    const target = names.get(join.target) ?? join.target;
    return `${source} ${join.joinType} ${target}`;
  };
  const joinKey = (analysis: AnalysisResult, join: AnalysisResult['joins'][number]) => {
    const names = nameById(analysis);
    const source = (names.get(join.source) ?? join.source).toLowerCase();
    const target = (names.get(join.target) ?? join.target).toLowerCase();
    return [source, target].sort().join('::');
  };
  const originalJoinKeys = new Map(original.joins.map((join) => [joinKey(original, join), joinDescription(original, join)]));
  const candidateJoinKeys = new Map(candidate.joins.map((join) => [joinKey(candidate, join), joinDescription(candidate, join)]));

  const addedJoins = [...candidateJoinKeys.keys()]
    .filter((key) => !originalJoinKeys.has(key))
    .map((key) => candidateJoinKeys.get(key)!);
  const removedJoins = [...originalJoinKeys.keys()]
    .filter((key) => !candidateJoinKeys.has(key))
    .map((key) => originalJoinKeys.get(key)!);

  const fieldKey = (field: AnalysisResult['mainQueryFields'][number]) => (field.alias || field.field).toLowerCase();
  const originalFields = new Map(original.mainQueryFields.map((field) => [fieldKey(field), field.alias || field.field]));
  const candidateFields = new Map(candidate.mainQueryFields.map((field) => [fieldKey(field), field.alias || field.field]));

  const addedColumns = [...candidateFields.keys()]
    .filter((key) => !originalFields.has(key))
    .map((key) => candidateFields.get(key)!);
  const removedColumns = [...originalFields.keys()]
    .filter((key) => !candidateFields.has(key))
    .map((key) => originalFields.get(key)!);

  const filterChanged =
    original.metrics.conditionCount !== candidate.metrics.conditionCount ||
    original.metrics.where !== candidate.metrics.where ||
    original.metrics.having !== candidate.metrics.having;

  const isSemanticChange =
    addedTables.length > 0 ||
    removedTables.length > 0 ||
    addedJoins.length > 0 ||
    removedJoins.length > 0 ||
    addedColumns.length > 0 ||
    removedColumns.length > 0 ||
    filterChanged;

  return {
    addedTables,
    removedTables,
    addedJoins,
    removedJoins,
    addedColumns,
    removedColumns,
    filterChanged,
    isSemanticChange,
  };
}
