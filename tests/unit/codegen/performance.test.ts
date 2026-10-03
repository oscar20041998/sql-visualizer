import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { classifySql } from '@/lib/codegen/classifySql';
import type { CodeGenerationOptions } from '@/lib/codegen/model';
import { parseSql } from '@/lib/codegen/parseSql';
import { RendererRegistry } from '@/lib/codegen/rendererRegistry';

const options: CodeGenerationOptions = {
  language: 'java',
  framework: 'jpa-hibernate',
  outputType: 'auto',
  namingStrategy: 'camelCase',
  includeRelationships: true,
  useLombok: false,
  validationAnnotations: false,
  generateMyBatisMapper: false,
};

describe('code generation performance', () => {
  it('generates 100 relationships within target', () => {
    const relationshipCount = 100;
    const columns = Array.from(
      { length: relationshipCount },
      (_, index) => `target_${index}_id BIGINT`
    );
    const constraints = Array.from(
      { length: relationshipCount },
      (_, index) =>
        `CONSTRAINT fk_source_${index} FOREIGN KEY (target_${index}_id) REFERENCES target_${index}(id)`
    );
    const sql = `CREATE TABLE source (id BIGINT PRIMARY KEY, ${[...columns, ...constraints].join(', ')})`;
    const registry = new RendererRegistry();
    const start = performance.now();

    const model = parseSql(sql, 'mysql');
    const classification = classifySql(model);
    const generated = registry
      .resolve('java:jpa-hibernate')
      ?.render(model, classification, options);
    const elapsed = performance.now() - start;

    expect(model.parseStatus).toBe('parsed');
    expect(generated?.source.match(/@ManyToOne/g)).toHaveLength(relationshipCount);
    expect(elapsed).toBeLessThan(2000);
  });
});