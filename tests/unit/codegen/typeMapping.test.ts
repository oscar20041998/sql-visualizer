import { describe, expect, it } from 'vitest';
import { mapAggregateType, mapSqlType } from '@/lib/codegen/typeMapping';
import type { SqlDialect } from '@/lib/codegen/model';

const SCALAR_TYPES: Array<{ sqlType: string; javaType: string }> = [
  { sqlType: 'BIGINT', javaType: 'Long' },
  { sqlType: 'INTEGER', javaType: 'Integer' },
  { sqlType: 'VARCHAR(80)', javaType: 'String' },
  { sqlType: 'DECIMAL(12, 2)', javaType: 'BigDecimal' },
  { sqlType: 'TIMESTAMP', javaType: 'LocalDateTime' },
];

describe('SQL to Java type mapping', () => {
  it('maps supported SQL scalar types', () => {
    const dialect: SqlDialect = 'mysql';

    for (const { sqlType, javaType } of SCALAR_TYPES) {
      expect(mapSqlType(sqlType, dialect)).toMatchObject({ javaType, diagnostic: null });
    }
  });

  it('reports unknown SQL types', () => {
    const result = mapSqlType('GEOGRAPHY_VENDOR', 'postgresql');

    expect(result.javaType).toBeNull();
    expect(result.diagnostic).toMatchObject({
      severity: 'warning',
      code: 'unknown-type',
    });
  });

  it('infers aggregate result types', () => {
    expect(mapAggregateType('COUNT', null).javaType).toBe('Long');
    expect(mapAggregateType('AVG', 'INTEGER').javaType).toBe('BigDecimal');
    expect(mapAggregateType('SUM', 'INTEGER').javaType).toBe('Long');
    expect(mapAggregateType('SUM', 'DECIMAL').javaType).toBe('BigDecimal');
    expect(mapAggregateType('SUM', null).diagnostic).toMatchObject({ code: 'unknown-type' });
  });
});