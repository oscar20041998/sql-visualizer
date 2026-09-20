/**
 * Safe expression evaluation for `test=` attributes and `<bind value=…>`
 * (FR-013, FR-014, FR-031; research R2).
 *
 * A hand-written tokenizer plus recursive-descent evaluator over a documented
 * subset of MyBatis' expression language. There is no execution primitive
 * anywhere in this module: file content is data, never code.
 *
 * Supported subset:
 * - property paths (`user.name`) and collection sizing (`list.size`, `list.length`)
 * - string, number, boolean and null literals
 * - comparisons `==` `!=` `>` `>=` `<` `<=`
 * - boolean combinators `and`/`&&`, `or`/`||`, `not`/`!`
 * - null and empty checks (`x == null`, `x != null`, `x == ''`)
 *
 * Anything outside the subset returns `{ ok: false }`, which the evaluator
 * surfaces as an `UNRESOLVED_CONDITION` finding rather than a guess.
 */
import type { ConversionFinding, ParameterSet } from './types';
import { makeFinding } from './findings';

export interface ConditionResult {
  /** `false` when the expression is outside the supported subset. */
  ok: boolean;
  /** The evaluated outcome when `ok`. */
  value?: boolean;
  finding?: ConversionFinding;
}

/** Evaluate one `test=` expression against the developer's values. */
export function evaluateCondition(
  expression: string,
  params: ParameterSet,
  context: { line?: number } = {}
): ConditionResult {
  const trimmed = expression.trim();
  if (!trimmed) return { ok: true, value: true };
  try {
    const tokens = tokenize(trimmed);
    const parser = new Parser(tokens, params);
    const value = parser.parseExpression();
    if (!parser.atEnd()) return unresolved(expression, context);
    return { ok: true, value: coerceToBoolean(value) };
  } catch {
    return unresolved(expression, context);
  }
}

function unresolved(expression: string, context: { line?: number }): ConditionResult {
  return {
    ok: false,
    finding: makeFinding('UNRESOLVED_CONDITION', {
      line: context.line,
      construct: expression,
      messageValues: { expression },
    }),
  };
}

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type Token =
  | { type: 'path'; text: string }
  | { type: 'string'; value: string }
  | { type: 'number'; value: number }
  | { type: 'boolean'; value: boolean }
  | { type: 'null' }
  | { type: 'op'; text: string }
  | { type: 'lparen' }
  | { type: 'rparen' };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) { i += 1; continue; }
    if (ch === "'" || ch === '"') {
      const quote = ch;
      let value = '';
      i += 1;
      while (i < input.length && input[i] !== quote) { value += input[i]; i += 1; }
      i += 1;
      tokens.push({ type: 'string', value });
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let text = '';
      while (i < input.length && /[0-9.]/.test(input[i])) { text += input[i]; i += 1; }
      tokens.push({ type: 'number', value: Number(text) });
      continue;
    }
    if (ch === '(') { tokens.push({ type: 'lparen' }); i += 1; continue; }
    if (ch === ')') { tokens.push({ type: 'rparen' }); i += 1; continue; }
    const two = input.slice(i, i + 2);
    if (two === '==' || two === '!=' || two === '>=' || two === '<=' || two === '&&' || two === '||') {
      tokens.push({ type: 'op', text: two });
      i += 2;
      continue;
    }
    if (ch === '>' || ch === '<' || ch === '!') {
      tokens.push({ type: 'op', text: ch });
      i += 1;
      continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      let text = '';
      while (i < input.length && /[A-Za-z0-9_.$]/.test(input[i])) { text += input[i]; i += 1; }
      const word = text.toLowerCase();
      if (word === 'true') tokens.push({ type: 'boolean', value: true });
      else if (word === 'false') tokens.push({ type: 'boolean', value: false });
      else if (word === 'null') tokens.push({ type: 'null' });
      else if (word === 'and') tokens.push({ type: 'op', text: '&&' });
      else if (word === 'or') tokens.push({ type: 'op', text: '||' });
      else if (word === 'not') tokens.push({ type: 'op', text: '!' });
      else tokens.push({ type: 'path', text });
      continue;
    }
    throw new Error(`unsupported character: ${ch}`);
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Recursive-descent evaluator
// ---------------------------------------------------------------------------

class Parser {
  private index = 0;

  constructor(private tokens: Token[], private params: ParameterSet) {}

  atEnd(): boolean {
    return this.index >= this.tokens.length;
  }

  parseExpression(): unknown {
    return this.parseOr();
  }

  private peek(): Token | undefined {
    return this.tokens[this.index];
  }

  private consumeOp(text: string): boolean {
    const token = this.peek();
    if (token && token.type === 'op' && token.text === text) {
      this.index += 1;
      return true;
    }
    return false;
  }

  private parseOr(): unknown {
    let left = this.parseAnd();
    while (this.consumeOp('||')) {
      const right = this.parseAnd();
      left = coerceToBoolean(left) || coerceToBoolean(right);
    }
    return left;
  }

  private parseAnd(): unknown {
    let left = this.parseNot();
    while (this.consumeOp('&&')) {
      const right = this.parseNot();
      left = coerceToBoolean(left) && coerceToBoolean(right);
    }
    return left;
  }

  private parseNot(): unknown {
    if (this.consumeOp('!')) return !coerceToBoolean(this.parseNot());
    return this.parseComparison();
  }

  private parseComparison(): unknown {
    const left = this.parsePrimary();
    const token = this.peek();
    if (token && token.type === 'op') {
      const operator = token.text;
      if (['==', '!=', '>', '>=', '<', '<='].includes(operator)) {
        this.index += 1;
        const right = this.parsePrimary();
        return compare(operator, left, right);
      }
    }
    return left;
  }

  private parsePrimary(): unknown {
    const token = this.peek();
    if (!token) throw new Error('unexpected end of expression');
    if (token.type === 'lparen') {
      this.index += 1;
      const value = this.parseExpression();
      const closing = this.peek();
      if (!closing || closing.type !== 'rparen') throw new Error('expected )');
      this.index += 1;
      return value;
    }
    if (token.type === 'string' || token.type === 'number' || token.type === 'boolean') {
      this.index += 1;
      return token.value;
    }
    if (token.type === 'null') { this.index += 1; return null; }
    if (token.type === 'path') { this.index += 1; return this.resolvePath(token.text); }
    throw new Error(`unexpected token: ${token.type}`);
  }

  /** Resolve a property path against the developer's values (no code execution). */
  private resolvePath(path: string): unknown {
    const parts = path.split('.');
    const root = parts[0];
    if (!(root in this.params)) {
      // R7 / FR-014: a name the developer has not supplied cannot be evaluated.
      // Throwing routes the whole condition to `unresolved`, and the caller
      // keeps the guarded SQL instead of guessing it away.
      throw new Error(`unsupplied name: ${root}`);
    }
    if (parts.length === 2 && (parts[1] === 'size' || parts[1] === 'length')) {
      const collection = parseCollectionSafe(this.params[root]);
      if (collection) return collection.length;
    }
    if (parts.length === 2 && parts[1] === 'isempty') {
      const collection = parseCollectionSafe(this.params[root]);
      if (collection) return collection.length === 0;
    }
    if (parts.length > 1) return undefined;
    return this.params[root];
  }
}

function parseCollectionSafe(value: string | undefined): string[] | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('[')) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : null;
  } catch {
    return null;
  }
}

function compare(operator: string, left: unknown, right: unknown): boolean {
  if (operator === '==') return looseEquals(left, right);
  if (operator === '!=') return !looseEquals(left, right);
  const numLeft = typeof left === 'number' ? left : Number(left);
  const numRight = typeof right === 'number' ? right : Number(right);
  if (Number.isNaN(numLeft) || Number.isNaN(numRight)) return false;
  if (operator === '>') return numLeft > numRight;
  if (operator === '>=') return numLeft >= numRight;
  if (operator === '<') return numLeft < numRight;
  return numLeft <= numRight;
}

function looseEquals(left: unknown, right: unknown): boolean {
  const aNull = left === null || left === undefined;
  const bNull = right === null || right === undefined;
  if (aNull && bNull) return true;
  if (aNull !== bNull) return false;
  if (typeof left === 'string' && typeof right === 'string') return left === right;
  if (typeof left === 'number' && typeof right === 'number') return left === right;
  if (typeof left === 'boolean' && typeof right === 'boolean') return left === right;
  return String(left) === String(right);
}

function coerceToBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value.length > 0;
  return value !== null && value !== undefined;
}
