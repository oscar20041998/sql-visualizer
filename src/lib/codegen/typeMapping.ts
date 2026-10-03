import type { GenerationDiagnostic, SqlDialect } from './model';

export interface TypeMappingResult {
  javaType: string | null;
  diagnostic: GenerationDiagnostic | null;
}

function unknownTypeDiagnostic(sqlType: string): GenerationDiagnostic {
  return {
    severity: 'warning',
    code: 'unknown-type',
    message: `No Java type mapping is defined for SQL type ${sqlType}.`,
    sourceSpan: null,
  };
}

const JAVA_TYPE_BY_SQL_TYPE: Record<string, string> = {
  BIGINT: 'Long',
  INT8: 'Long',
  INTEGER: 'Integer',
  INT: 'Integer',
  INT4: 'Integer',
  SMALLINT: 'Short',
  INT2: 'Short',
  TINYINT: 'Byte',
  DECIMAL: 'BigDecimal',
  NUMERIC: 'BigDecimal',
  NUMBER: 'BigDecimal',
  MONEY: 'BigDecimal',
  REAL: 'Float',
  FLOAT: 'Double',
  DOUBLE: 'Double',
  'DOUBLE PRECISION': 'Double',
  BOOLEAN: 'Boolean',
  BOOL: 'Boolean',
  BIT: 'Boolean',
  CHAR: 'String',
  NCHAR: 'String',
  VARCHAR: 'String',
  NVARCHAR: 'String',
  'CHARACTER VARYING': 'String',
  TEXT: 'String',
  NTEXT: 'String',
  DATE: 'LocalDate',
  TIME: 'LocalTime',
  DATETIME: 'LocalDateTime',
  DATETIME2: 'LocalDateTime',
  TIMESTAMP: 'LocalDateTime',
};

export function mapSqlType(sqlType: string, _dialect: SqlDialect): TypeMappingResult {
  const normalized = sqlType.trim().toUpperCase().replace(/\s+/g, ' ');
  const baseType = normalized.split('(')[0].trim();
  const javaType = JAVA_TYPE_BY_SQL_TYPE[baseType] ?? null;
  return {
    javaType,
    diagnostic: javaType ? null : unknownTypeDiagnostic(sqlType),
  };
}

export function mapAggregateType(
  name: string,
  argumentSqlType: string | null
): TypeMappingResult {
  const aggregate = name.trim().toUpperCase();
  if (aggregate === 'COUNT') return { javaType: 'Long', diagnostic: null };
  if (aggregate === 'AVG') return { javaType: 'BigDecimal', diagnostic: null };
  if (aggregate !== 'SUM' || !argumentSqlType) {
    return {
      javaType: null,
      diagnostic: unknownTypeDiagnostic(argumentSqlType ?? `argument to ${aggregate}`),
    };
  }

  const argument = mapSqlType(argumentSqlType, 'mysql');
  if (!argument.javaType) return argument;
  if (['Byte', 'Short', 'Integer', 'Long'].includes(argument.javaType)) {
    return { javaType: 'Long', diagnostic: null };
  }
  if (['Float', 'Double', 'BigDecimal'].includes(argument.javaType)) {
    return { javaType: argument.javaType === 'Float' ? 'Double' : argument.javaType, diagnostic: null };
  }
  return {
    javaType: null,
    diagnostic: {
      severity: 'warning',
      code: 'unsupported-aggregate-type',
      message: `SUM is not supported for SQL type ${argumentSqlType}.`,
      sourceSpan: null,
    },
  };
}