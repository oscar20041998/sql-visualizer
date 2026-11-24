import type { SqlDialect } from './sqlAnalyzer';

export type ObjectKind = 'view' | 'procedure' | 'function' | 'trigger';

export interface ObjectIdentifier {
  value: string;
  quoted: boolean;
}

export interface ObjectIdentity {
  dialect: SqlDialect;
  kind: ObjectKind;
  schema: ObjectIdentifier | null;
  name: ObjectIdentifier | null;
  signature: readonly string[] | null;
}

export type IdentityComparison = 'same' | 'different' | 'unresolved';

export function compareObjectIdentity(
  left: ObjectIdentity,
  right: ObjectIdentity
): IdentityComparison {
  if (left.dialect !== right.dialect || left.kind !== right.kind) return 'different';
  if (
    left.dialect === 'postgresql' &&
    left.kind === 'view' &&
    left.schema &&
    right.schema &&
    !left.schema.quoted &&
    !right.schema.quoted &&
    /^[a-z_][a-z0-9_$]*$/i.test(left.schema.value) &&
    /^[a-z_][a-z0-9_$]*$/i.test(right.schema.value) &&
    left.schema.value.length <= 63 &&
    right.schema.value.length <= 63 &&
    left.schema.value.toLowerCase() !== right.schema.value.toLowerCase()
  ) {
    return 'different';
  }
  if (
    left.kind === 'view' &&
    left.schema?.value &&
    left.name?.value &&
    left.schema.value === right.schema?.value &&
    left.schema.quoted === right.schema.quoted &&
    left.name.value === right.name?.value &&
    left.name.quoted === right.name.quoted
  ) {
    return 'same';
  }
  return 'unresolved';
}
