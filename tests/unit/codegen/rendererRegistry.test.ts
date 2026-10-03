import { describe, expect, it } from 'vitest';
import type {
  CodeGenerationOptions,
  CodeRenderer,
  ParsedSqlModel,
  SqlClassification,
} from '@/lib/codegen/model';
import { RendererRegistry } from '@/lib/codegen/rendererRegistry';

const extensionRenderer: CodeRenderer = {
  render: () => ({
    source: 'class Example {}',
    fileName: 'Example.java',
    className: 'Example',
    outputType: 'entity',
    diagnostics: [],
    assumptions: [],
  }),
};

const emptyModel: ParsedSqlModel = {
  dialect: 'mysql',
  statementKind: 'unknown',
  tables: [],
  selectShape: null,
  sourceSql: '',
  parseStatus: 'parsed',
  diagnostics: [],
  astStatistics: null,
};
const classification: SqlClassification = {
  kind: 'unknown',
  confidence: 'insufficient',
  recommendedOutput: 'none',
  reasons: [],
  requiresUserChoice: true,
};
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

describe('RendererRegistry', () => {
  it('resolves a registered extension renderer independently', () => {
    const registry = new RendererRegistry();

    expect(registry.resolve('java:jpa-hibernate')).not.toBeNull();
    expect(registry.resolve('csharp:ef-core')).toBeNull();
    expect(registry.resolve('python:sqlalchemy')).toBeNull();
    expect(registry.resolve('typescript:typeorm')).toBeNull();
    expect(registry.resolve('go:gorm')).toBeNull();
    expect(registry.resolve('kotlin:jpa')).toBeNull();

    registry.register('typescript:typeorm', extensionRenderer);
    expect(registry.resolve('typescript:typeorm')).toBe(extensionRenderer);
    expect(
      registry.resolve('typescript:typeorm')?.render(emptyModel, classification, options)
    ).toMatchObject({ source: 'class Example {}', fileName: 'Example.java' });
  });
});
