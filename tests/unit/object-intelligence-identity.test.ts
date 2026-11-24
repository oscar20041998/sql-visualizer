import { expect, it } from 'vitest';
import { compareObjectIdentity, type ObjectIdentity } from '@/lib/sql/objectIntelligenceIdentity';

it('recognizes the same explicitly qualified view without guessing a schema', () => {
  const identity: ObjectIdentity = {
    dialect: 'postgresql',
    kind: 'view',
    schema: { value: 'public', quoted: false },
    name: { value: 'orders', quoted: false },
    signature: null,
  };
  expect(compareObjectIdentity(identity, { ...identity })).toBe('same');
});

it('distinguishes objects in different dialects or of different kinds', () => {
  const identity: ObjectIdentity = {
    dialect: 'postgresql',
    kind: 'view',
    schema: { value: 'public', quoted: false },
    name: { value: 'orders', quoted: false },
    signature: null,
  };
  expect(compareObjectIdentity(identity, { ...identity, dialect: 'mysql' })).toBe('different');
  expect(compareObjectIdentity(identity, { ...identity, kind: 'trigger' })).toBe('different');
});

it('distinguishes PostgreSQL views in different explicitly named schemas', () => {
  const identity: ObjectIdentity = {
    dialect: 'postgresql',
    kind: 'view',
    schema: { value: 'public', quoted: false },
    name: { value: 'orders', quoted: false },
    signature: null,
  };
  expect(
    compareObjectIdentity(identity, { ...identity, schema: { value: 'sales', quoted: false } })
  ).toBe('different');
});

it('does not claim different schemas when case or identifier truncation could make them equal', () => {
  const identity: ObjectIdentity = {
    dialect: 'postgresql',
    kind: 'view',
    schema: { value: 'public', quoted: false },
    name: { value: 'orders', quoted: false },
    signature: null,
  };
  expect(
    compareObjectIdentity(identity, { ...identity, schema: { value: 'PUBLIC', quoted: false } })
  ).not.toBe('different');
  const prefix = 'a'.repeat(63);
  expect(
    compareObjectIdentity(
      { ...identity, schema: { value: `${prefix}a`, quoted: false } },
      { ...identity, schema: { value: `${prefix}b`, quoted: false } }
    )
  ).toBe('unresolved');
});
