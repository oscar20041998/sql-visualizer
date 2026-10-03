import { describe, expect, it } from 'vitest';
import { renderDto, renderEntity } from '@/lib/codegen/javaJpaRenderer';
import type { CodeGenerationOptions, TableDefinition } from '@/lib/codegen/model';
import { parseSql } from '@/lib/codegen/parseSql';

const DEFAULT_OPTIONS: CodeGenerationOptions = {
  language: 'java',
  framework: 'jpa-hibernate',
  outputType: 'auto',
  namingStrategy: 'camelCase',
  includeRelationships: true,
  useLombok: false,
  validationAnnotations: false,
  generateMyBatisMapper: false,
};

const USERS_TABLE: TableDefinition = {
  schemaName: null,
  tableName: 'users',
  columns: [
    {
      name: 'id',
      sqlType: { raw: 'BIGINT', normalized: 'BIGINT' },
      nullable: false,
      length: null,
      precision: null,
      scale: null,
      defaultExpression: null,
      identity: 'unknown',
    },
    {
      name: 'display_name',
      sqlType: { raw: 'VARCHAR(80)', normalized: 'VARCHAR' },
      nullable: false,
      length: 80,
      precision: null,
      scale: null,
      defaultExpression: null,
      identity: 'unknown',
    },
  ],
  constraints: [{ kind: 'primary-key', columns: ['id'], name: null }],
  sourceSpan: null,
};

describe('Java JPA Entity renderer', () => {
  it('renders entity metadata', () => {
    const generated = renderEntity(USERS_TABLE);

    expect(generated.source).toContain('@Entity');
    expect(generated.source).toContain('@Table(name = "users")');
    expect(generated.source).toContain('@Id');
    expect(generated.source).toContain('private Long id;');
    expect(generated.source).toContain('private String displayName;');
    expect(generated.fileName).toBe('User.java');
  });

  it('uses Lombok when enabled', () => {
    const generated = renderEntity(USERS_TABLE, { ...DEFAULT_OPTIONS, useLombok: true });

    expect(generated.source).toContain('import lombok.Getter;');
    expect(generated.source).toContain('import lombok.Setter;');
    expect(generated.source).toContain('@Getter');
    expect(generated.source).toContain('@Setter');
    expect(generated.source).not.toContain('getId()');
    expect(generated.source).not.toContain('setId(');
  });

  it('adds schema-backed validation annotations when enabled', () => {
    const generated = renderEntity(USERS_TABLE, {
      ...DEFAULT_OPTIONS,
      validationAnnotations: true,
    });

    expect(generated.source).toContain('import jakarta.validation.constraints.NotNull;');
    expect(generated.source).toContain('import jakarta.validation.constraints.Size;');
    expect(generated.source).toContain('@NotNull');
    expect(generated.source).toContain('@Size(max = 80)');
  });

  it('generates a separate MyBatis mapper interface when enabled', () => {
    const generated = renderEntity(USERS_TABLE, {
      ...DEFAULT_OPTIONS,
      generateMyBatisMapper: true,
    });

    expect(generated.additionalFiles).toEqual([{
      fileName: 'UserMapper.java',
      source: [
        'import org.apache.ibatis.annotations.Mapper;',
        '',
        '@Mapper',
        'public interface UserMapper {',
        '}',
      ].join('\n'),
    }]);
  });

  it('generates a mapper companion for DTO output', () => {
    const model = parseSql('SELECT id FROM users', 'mysql');
    const generated = renderDto(model, {
      ...DEFAULT_OPTIONS,
      generateMyBatisMapper: true,
    });

    expect(generated.additionalFiles?.[0].fileName).toBe('UserDtoMapper.java');
  });

  it('renders column nullability', () => {
    const nullableColumn = {
      ...USERS_TABLE.columns[0],
      name: 'nickname',
      sqlType: { raw: 'VARCHAR(40)', normalized: 'VARCHAR' },
      nullable: true,
      length: 40,
    };
    const table: TableDefinition = {
      ...USERS_TABLE,
      columns: [nullableColumn],
      constraints: [],
    };

    const generated = renderEntity(table);

    expect(generated.source).toContain('@Column(name = "nickname", nullable = true, length = 40)');
  });

  it('renders conservative relationships', () => {
    const table: TableDefinition = {
      ...USERS_TABLE,
      tableName: 'orders',
      columns: [
        USERS_TABLE.columns[0],
        { ...USERS_TABLE.columns[0], name: 'customer_id' },
      ],
      constraints: [
        { kind: 'primary-key', columns: ['id'], name: null },
        {
          kind: 'foreign-key',
          columns: ['customer_id'],
          referencedTable: 'customers',
          referencedColumns: ['id'],
          name: 'fk_orders_customer',
        },
      ],
    };

    const generated = renderEntity(table);

    expect(generated.source).toContain('@ManyToOne');
    expect(generated.source).toContain('@JoinColumn(name = "customer_id")');
    expect(generated.source).toContain('private Customer customer;');
    expect(generated.source).not.toContain('@OneToMany');
    expect(generated.source).not.toContain('CascadeType');
    expect(generated.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'relationship-cardinality-assumption' })
    );

    const withoutRelationships = renderEntity(table, {
      ...DEFAULT_OPTIONS,
      includeRelationships: false,
    });
    expect(withoutRelationships.source).not.toContain('@ManyToOne');
    expect(withoutRelationships.source).toContain('private Long customerId;');
  });

  it('warns on unsupported relationships', () => {
    const table: TableDefinition = {
      ...USERS_TABLE,
      constraints: [
        {
          kind: 'foreign-key',
          columns: ['id', 'display_name'],
          referencedTable: 'customers',
          referencedColumns: ['id', 'name'],
          name: null,
        },
      ],
    };

    const generated = renderEntity(table);

    expect(generated.source).not.toContain('@ManyToOne');
    expect(generated.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'unsupported-relationship' })
    );
  });

  it('uses unique foreign-key metadata conservatively', () => {
    const table: TableDefinition = {
      ...USERS_TABLE,
      tableName: 'profiles',
      columns: [
        USERS_TABLE.columns[0],
        { ...USERS_TABLE.columns[0], name: 'user_id' },
      ],
      constraints: [
        {
          kind: 'unique',
          columns: ['user_id'],
          name: 'uq_profiles_user',
        },
        {
          kind: 'foreign-key',
          columns: ['user_id'],
          referencedTable: 'users',
          referencedColumns: ['id'],
          name: 'fk_profiles_user',
        },
      ],
    };

    const generated = renderEntity(table);

    expect(generated.source).toContain('@OneToOne');
    expect(generated.source).not.toContain('@ManyToOne');
    expect(generated.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'relationship-cardinality-constrained' })
    );
  });
});