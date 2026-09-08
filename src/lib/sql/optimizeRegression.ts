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
