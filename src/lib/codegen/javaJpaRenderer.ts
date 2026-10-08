import { mapAggregateType, mapSqlType } from './typeMapping';
import { toJavaIdentifier } from './naming';
import type {
  CodeGenerationOptions,
  ColumnDefinition,
  GeneratedCode,
  ParsedSqlModel,
  SelectField,
  TableDefinition,
} from './model';

function classNameForTable(tableName: string): string {
  const singular = tableName.endsWith('ies')
    ? `${tableName.slice(0, -3)}y`
    : tableName.endsWith('s') && !tableName.endsWith('ss')
      ? tableName.slice(0, -1)
      : tableName;
  return toJavaIdentifier(singular, 'pascalCase');
}

function myBatisMapperFile(className: string) {
  const mapperName = `${className}Mapper`;
  return {
    fileName: `${mapperName}.java`,
    source: [
      'import org.apache.ibatis.annotations.Mapper;',
      '',
      '@Mapper',
      `public interface ${mapperName} {`,
      '}',
    ].join('\n'),
  };
}

function renderColumn(
  column: ColumnDefinition,
  primaryKeyColumns: Set<string>,
  validationAnnotations: boolean
): string[] {
  const mapped = mapSqlType(column.sqlType.raw, 'mysql');
  const javaType = mapped.javaType ?? 'Object';
  const fieldName = toJavaIdentifier(column.name, 'camelCase');
  const lines: string[] = [];

  if (primaryKeyColumns.has(column.name)) lines.push('    @Id');
  if (validationAnnotations && column.nullable === false) lines.push('    @NotNull');
  if (validationAnnotations && javaType === 'String' && column.length !== null) {
    lines.push(`    @Size(max = ${column.length})`);
  }
  const attributes = [`name = "${column.name}"`];
  if (column.nullable !== 'unknown') attributes.push(`nullable = ${column.nullable}`);
  if (column.length !== null && javaType === 'String') attributes.push(`length = ${column.length}`);
  lines.push(`    @Column(${attributes.join(', ')})`);
  lines.push(`    private ${javaType} ${fieldName};`);
  return lines;
}

export function renderEntity(
  table: TableDefinition,
  options: CodeGenerationOptions = {
    language: 'java',
    framework: 'jpa-hibernate',
    outputType: 'auto',
    namingStrategy: 'camelCase',
    includeRelationships: true,
    useLombok: false,
    validationAnnotations: false,
    generateMyBatisMapper: false,
  }
): GeneratedCode {
  const className = classNameForTable(table.tableName);
  const foreignKeys = table.constraints.filter((constraint) => constraint.kind === 'foreign-key');
  const diagnostics: GeneratedCode['diagnostics'] = [];
  const relationships = options.includeRelationships
    ? foreignKeys.filter((constraint) => {
        const supported =
          constraint.columns.length === 1 &&
          constraint.referencedColumns.length === 1 &&
          table.columns.some((column) => column.name === constraint.columns[0]);
        if (!supported) {
          diagnostics.push({
            severity: 'warning',
            code: 'unsupported-relationship',
            message:
              `Relationship ${constraint.name ?? ''} was kept as scalar columns because its key metadata is composite or incomplete.`.trim(),
            sourceSpan: null,
          });
        }
        return supported;
      })
    : [];
  const relationshipColumns = new Set(relationships.map((constraint) => constraint.columns[0]));
  const scalarColumns = table.columns.filter((column) => !relationshipColumns.has(column.name));
  const needsNotNull =
    options.validationAnnotations && scalarColumns.some((column) => column.nullable === false);
  const needsSize =
    options.validationAnnotations &&
    scalarColumns.some(
      (column) =>
        mapSqlType(column.sqlType.raw, 'mysql').javaType === 'String' && column.length !== null
    );
  const isOneToOne = (constraint: (typeof relationships)[number]) =>
    table.constraints.some(
      (candidate) =>
        candidate.kind === 'unique' &&
        candidate.columns.length === 1 &&
        candidate.columns[0] === constraint.columns[0]
    );
  const primaryKeyColumns = new Set(
    table.constraints
      .filter((constraint) => constraint.kind === 'primary-key')
      .flatMap((constraint) => constraint.columns)
  );
  const fields = scalarColumns.map((column) =>
    renderColumn(column, primaryKeyColumns, options.validationAnnotations)
  );
  const relationFields = relationships.map((constraint) => {
    const relatedClass = classNameForTable(constraint.referencedTable);
    const relatedProperty = `${relatedClass[0].toLowerCase()}${relatedClass.slice(1)}`;
    return [
      `    @${isOneToOne(constraint) ? 'OneToOne' : 'ManyToOne'}`,
      `    @JoinColumn(name = "${constraint.columns[0]}")`,
      `    private ${relatedClass} ${relatedProperty};`,
    ];
  });
  relationships.forEach((constraint) => {
    const unique = isOneToOne(constraint);
    diagnostics.push({
      severity: 'warning',
      code: unique ? 'relationship-cardinality-constrained' : 'relationship-cardinality-assumption',
      message: unique
        ? `A one-to-one relationship from ${table.tableName} to ${constraint.referencedTable} is proposed from the unique foreign key; verify the intended cardinality.`
        : `A many-to-one relationship from ${table.tableName} to ${constraint.referencedTable} is proposed from the foreign key; verify the intended cardinality.`,
      sourceSpan: null,
    });
  });
  const accessors = options.useLombok
    ? []
    : scalarColumns.flatMap((column) => {
        const javaType = mapSqlType(column.sqlType.raw, 'mysql').javaType ?? 'Object';
        const fieldName = toJavaIdentifier(column.name, 'camelCase');
        const methodSuffix = `${fieldName[0].toUpperCase()}${fieldName.slice(1)}`;
        return [
          `    public ${javaType} get${methodSuffix}() {`,
          `        return ${fieldName};`,
          '    }',
          '',
          `    public void set${methodSuffix}(${javaType} ${fieldName}) {`,
          `        this.${fieldName} = ${fieldName};`,
          '    }',
        ];
      });
  const relationAccessors = options.useLombok
    ? []
    : relationships.flatMap((constraint) => {
        const relatedClass = classNameForTable(constraint.referencedTable);
        const fieldName = `${relatedClass[0].toLowerCase()}${relatedClass.slice(1)}`;
        const methodSuffix = relatedClass;
        return [
          `    public ${relatedClass} get${methodSuffix}() {`,
          `        return ${fieldName};`,
          '    }',
          '',
          `    public void set${methodSuffix}(${relatedClass} ${fieldName}) {`,
          `        this.${fieldName} = ${fieldName};`,
          '    }',
        ];
      });
  const source = [
    'import jakarta.persistence.Column;',
    'import jakarta.persistence.Entity;',
    'import jakarta.persistence.Id;',
    ...(needsNotNull ? ['import jakarta.validation.constraints.NotNull;'] : []),
    ...(needsSize ? ['import jakarta.validation.constraints.Size;'] : []),
    ...(options.useLombok ? ['import lombok.Getter;', 'import lombok.Setter;'] : []),
    ...(relationships.length > 0
      ? [
          'import jakarta.persistence.JoinColumn;',
          ...(relationships.some((constraint) => !isOneToOne(constraint))
            ? ['import jakarta.persistence.ManyToOne;']
            : []),
          ...(relationships.some(isOneToOne) ? ['import jakarta.persistence.OneToOne;'] : []),
        ]
      : []),
    'import jakarta.persistence.Table;',
    '',
    ...(options.useLombok ? ['@Getter', '@Setter'] : []),
    '@Entity',
    `@Table(name = "${table.tableName}")`,
    `public class ${className} {`,
    '',
    ...fields.flatMap((field) => [...field, '']),
    ...relationFields.flatMap((field) => [...field, '']),
    '    public ' + className + '() {}',
    '',
    ...accessors,
    ...relationAccessors,
    '}',
  ].join('\n');

  return {
    source,
    fileName: `${className}.java`,
    className,
    outputType: 'entity',
    diagnostics,
    assumptions: relationships.map((constraint) =>
      isOneToOne(constraint)
        ? `One-to-one cardinality is proposed for ${constraint.referencedTable} because the foreign key is unique; verify the database relationship.`
        : `Many-to-one cardinality is inferred for ${constraint.referencedTable}; verify the database relationship.`
    ),
    ...(options.generateMyBatisMapper ? { additionalFiles: [myBatisMapperFile(className)] } : {}),
  };
}

export function renderDto(model: ParsedSqlModel, options: CodeGenerationOptions): GeneratedCode {
  const shape = model.selectShape;
  if (!shape || shape.fields.length === 0) {
    return {
      source: '',
      fileName: '',
      className: null,
      outputType: null,
      diagnostics: [
        {
          severity: 'error',
          code: 'unsupported-dto-shape',
          message: 'The SELECT result does not contain supported output fields.',
          sourceSpan: null,
        },
      ],
      assumptions: [],
    };
  }

  const className = `${classNameForTable(shape.sourceTables[0] ?? 'QueryResult')}Dto`;
  const diagnostics: GeneratedCode['diagnostics'] = [];
  const fields = shape.fields.map((field: SelectField, index) => {
    const fieldNameSource =
      field.alias ?? field.sourceColumns[0]?.split('.').at(-1) ?? `field${index + 1}`;
    const fieldName = toJavaIdentifier(fieldNameSource, options.namingStrategy);
    let javaType: string | null = null;
    if (field.inferredSqlType) {
      const mapping = mapSqlType(field.inferredSqlType, model.dialect);
      javaType = mapping.javaType;
      if (mapping.diagnostic) diagnostics.push(mapping.diagnostic);
    } else if (field.expressionKind === 'aggregate') {
      const aggregate = /^([A-Za-z]+)\s*\(/.exec(field.expression)?.[1];
      if (aggregate) {
        const mapping = mapAggregateType(aggregate, null);
        javaType = mapping.javaType;
        if (mapping.diagnostic) diagnostics.push(mapping.diagnostic);
      }
    }
    if (!javaType) {
      javaType = 'Object';
      diagnostics.push({
        severity: 'warning',
        code: 'select-type-not-inferred',
        message: `The Java type for SELECT field "${field.alias ?? field.expression}" could not be inferred from the query alone; Object is used.`,
        sourceSpan: null,
      });
    }
    return { fieldName, javaType };
  });
  const accessors = options.useLombok
    ? []
    : fields.flatMap(({ fieldName, javaType }) => {
        const methodSuffix = `${fieldName[0].toUpperCase()}${fieldName.slice(1)}`;
        return [
          `    public ${javaType} get${methodSuffix}() {`,
          `        return ${fieldName};`,
          '    }',
          '',
          `    public void set${methodSuffix}(${javaType} ${fieldName}) {`,
          `        this.${fieldName} = ${fieldName};`,
          '    }',
        ];
      });
  const source = [
    ...(options.useLombok ? ['import lombok.Getter;', 'import lombok.Setter;', ''] : []),
    ...(options.useLombok ? ['@Getter', '@Setter'] : []),
    `public class ${className} {`,
    '',
    ...fields.map(({ fieldName, javaType }) => `    private ${javaType} ${fieldName};`),
    '',
    ...accessors,
    '}',
  ].join('\n');

  return {
    source,
    fileName: `${className}.java`,
    className,
    outputType: 'dto',
    diagnostics,
    assumptions: [],
    ...(options.generateMyBatisMapper ? { additionalFiles: [myBatisMapperFile(className)] } : {}),
  };
}
