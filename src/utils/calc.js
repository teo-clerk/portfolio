/**
 * Arithmetic evaluator for the `calc` command.
 *
 * Replaces evaluating the expression with the Function constructor. The old
 * code allow-listed characters first, which was safe in practice, but any
 * dynamic code evaluation forces `'unsafe-eval'` into the
 * Content-Security-Policy for the whole site. A small recursive-descent parser
 * needs no such exemption.
 *
 * Grammar (whitespace is ignored between tokens):
 *
 *   expression := term   (('+' | '-') term)*
 *   term       := unary  (('*' | '/') unary)*
 *   unary      := ('+' | '-') unary | power
 *   power      := primary ('**' unary)?        right-associative
 *   primary    := number | '(' expression ')'
 *   number     := digits ['.' digits] | '.' digits
 */

const MAX_EXPRESSION_LENGTH = 200;
const MAX_NESTING_DEPTH = 32;
/** Significant digits shown, enough to hide noise such as 0.1 + 0.2. */
const DISPLAY_PRECISION = 12;

const isDigit = (char) => char >= '0' && char <= '9';

/**
 * @param {string} input Arithmetic expression, e.g. `(1 + 2) * 3`.
 * @returns {number} A finite result.
 * @throws {Error} On empty, malformed, over-long, over-nested or non-finite input.
 */
export const evaluateExpression = (input) => {
  const source = String(input ?? '');
  if (source.length > MAX_EXPRESSION_LENGTH) throw new Error('Expression is too long');

  let position = 0;
  let depth = 0;

  const skipSpaces = () => {
    while (source[position] === ' ' || source[position] === '\t') position += 1;
  };

  /** Consume `token` if it is next; report whether it was. */
  const take = (token) => {
    skipSpaces();
    if (!source.startsWith(token, position)) return false;
    position += token.length;
    return true;
  };

  const parseNumber = () => {
    skipSpaces();
    const start = position;
    while (isDigit(source[position])) position += 1;
    if (source[position] === '.') {
      position += 1;
      while (isDigit(source[position])) position += 1;
    }
    const literal = source.slice(start, position);
    if (literal === '' || literal === '.') throw new Error('Expected a number');
    return Number(literal);
  };

  const parsePrimary = () => {
    if (take('(')) {
      depth += 1;
      if (depth > MAX_NESTING_DEPTH) throw new Error('Expression is nested too deeply');
      const value = parseExpression();
      if (!take(')')) throw new Error('Missing closing parenthesis');
      depth -= 1;
      return value;
    }
    return parseNumber();
  };

  const parsePower = () => {
    const base = parsePrimary();
    return take('**') ? base ** parseUnary() : base;
  };

  function parseUnary() {
    if (take('-')) return -parseUnary();
    if (take('+')) return parseUnary();
    return parsePower();
  }

  const parseTerm = () => {
    let value = parseUnary();
    for (;;) {
      if (take('*')) value *= parseUnary();
      else if (take('/')) value /= parseUnary();
      else return value;
    }
  };

  function parseExpression() {
    let value = parseTerm();
    for (;;) {
      if (take('+')) value += parseTerm();
      else if (take('-')) value -= parseTerm();
      else return value;
    }
  }

  const result = parseExpression();
  skipSpaces();
  if (position !== source.length) throw new Error('Unexpected input after the expression');
  if (!Number.isFinite(result)) throw new Error('Result is not a finite number');
  return result;
};

/**
 * Integers print exactly: rounding them to DISPLAY_PRECISION digits would turn
 * 2 ** 60 into 1152921504610000000. Only fractions are rounded.
 *
 * @param {number} value
 * @returns {string} The value without binary floating-point noise.
 */
export const formatResult = (value) =>
  Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(DISPLAY_PRECISION)));
