import { describe, expect, it } from 'vitest';
import { validateSqlFormat } from './sqlFormatValidator';

describe('validateSqlFormat', () => {
  it('flags a query wrapped entirely in double quotes (Excel/CSV copy-paste artifact)', () => {
    const sql = `"SELECT id, name FROM customers WHERE active = 1"`;
    const result = validateSqlFormat(sql);
    expect(result.valid).toBe(false);
    expect(result.issue?.reasonKey).toBe('sqlFormatWrappedInQuotes');
  });

  it('flags a query wrapped entirely in single quotes', () => {
    const sql = `'SELECT id, name FROM customers'`;
    const result = validateSqlFormat(sql);
    expect(result.valid).toBe(false);
    expect(result.issue?.reasonKey).toBe('sqlFormatWrappedInQuotes');
  });

  it('flags curly/smart double quotes from a word processor', () => {
    const sql = `SELECT * FROM orders WHERE status = \u201Cactive\u201D`;
    const result = validateSqlFormat(sql);
    expect(result.valid).toBe(false);
    expect(result.issue?.reasonKey).toBe('sqlFormatCurlyDoubleQuote');
  });

  it('flags curly/smart single quotes', () => {
    const sql = `SELECT * FROM orders WHERE status = \u2018active\u2019`;
    const result = validateSqlFormat(sql);
    expect(result.valid).toBe(false);
    expect(result.issue?.reasonKey).toBe('sqlFormatCurlySingleQuote');
  });

  it('flags a non-breaking space invisible character', () => {
    const sql = `SELECT * FROM orders\u00A0WHERE status = 'active'`;
    const result = validateSqlFormat(sql);
    expect(result.valid).toBe(false);
    expect(result.issue?.reasonKey).toBe('sqlFormatNonBreakingSpace');
  });

  it('flags a zero-width character', () => {
    const sql = `SELECT * FROM orders\u200BWHERE status = 'active'`;
    const result = validateSqlFormat(sql);
    expect(result.valid).toBe(false);
    expect(result.issue?.reasonKey).toBe('sqlFormatZeroWidthChar');
  });

  it('accepts a normal, well-formed query with no issues', () => {
    const sql = `SELECT id, name FROM customers WHERE active = 1`;
    const result = validateSqlFormat(sql);
    expect(result.valid).toBe(true);
    expect(result.issue).toBeNull();
  });
});
