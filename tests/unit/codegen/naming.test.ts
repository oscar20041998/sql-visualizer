import { describe, expect, it } from 'vitest';
import { toJavaIdentifier } from '@/lib/codegen/naming';

describe('Java identifier naming', () => {
  it('converts naming strategies and preserves source identifiers', () => {
    expect(toJavaIdentifier('user_id', 'camelCase')).toBe('userId');
    expect(toJavaIdentifier('UserName', 'camelCase')).toBe('userName');
    expect(toJavaIdentifier('user_id', 'pascalCase')).toBe('UserId');
    expect(toJavaIdentifier('HTTP_server', 'camelCase')).toBe('httpServer');
    expect(toJavaIdentifier('order_count', 'preserve')).toBe('order_count');
  });
});