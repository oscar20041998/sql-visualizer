import type { ParsedSqlModel, SqlClassification } from './model';

export function classifySql(model: ParsedSqlModel): SqlClassification {
  if (model.parseStatus !== 'parsed') {
    return {
      kind: 'unknown',
      confidence: 'insufficient',
      recommendedOutput: 'none',
      reasons: ['The SQL is invalid, partially normalized, or unsupported.'],
      requiresUserChoice: true,
    };
  }

  if (model.statementKind === 'create-table' && model.tables.length > 0) {
    return {
      kind: 'table-definition',
      confidence: 'high',
      recommendedOutput: 'entity',
      reasons: ['CREATE TABLE provides explicit table and column definitions.'],
      requiresUserChoice: false,
    };
  }

  if (model.statementKind === 'select' && model.selectShape) {
    const { hasJoin, hasAggregation, groupByExpressions } = model.selectShape;
    if (model.selectShape.fields.some((field) => field.expressionKind === 'wildcard')) {
      return {
        kind: hasJoin
          ? 'select-join'
          : hasAggregation || groupByExpressions.length > 0
            ? 'select-aggregation'
            : 'select-entity-like',
        confidence: 'limited',
        recommendedOutput: 'none',
        reasons: [
          'Wildcard output does not identify the result columns or key; use explicit columns before generating code.',
        ],
        requiresUserChoice: true,
      };
    }
    if (hasJoin) {
      return {
        kind: 'select-join',
        confidence: 'high',
        recommendedOutput: 'dto',
        reasons: ['The SELECT reads from multiple joined sources.'],
        requiresUserChoice: false,
      };
    }
    if (hasAggregation || groupByExpressions.length > 0) {
      return {
        kind: 'select-aggregation',
        confidence: 'high',
        recommendedOutput: 'dto',
        reasons: ['The SELECT contains aggregate expressions or GROUP BY fields.'],
        requiresUserChoice: false,
      };
    }
    return {
      kind: 'select-dto',
      confidence: 'high',
      recommendedOutput: 'dto',
      reasons: ['A projection is not sufficient evidence of a complete persistent entity.'],
      requiresUserChoice: false,
    };
  }

  if (
    model.statementKind === 'insert' ||
    model.statementKind === 'update' ||
    model.statementKind === 'delete'
  ) {
    return {
      kind: model.statementKind,
      confidence: 'high',
      recommendedOutput: 'none',
      reasons: [
        'Consider a repository/persistence method; DML source generation is not supported.',
      ],
      requiresUserChoice: false,
    };
  }

  return {
    kind: 'unknown',
    confidence: 'insufficient',
    recommendedOutput: 'none',
    reasons: ['The statement does not match a supported generation shape.'],
    requiresUserChoice: true,
  };
}
