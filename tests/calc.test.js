import { describe, it, expect } from 'vitest';
import { evaluateExpression, formatResult } from '../src/utils/calc.js';

describe('evaluateExpression', () => {
  it.each([
    ['5 * 10', 50],
    ['1 + 2 * 3', 7],
    ['(1 + 2) * 3', 9],
    ['10 / 4', 2.5],
    ['-3 + 5', 2],
    ['2 - -3', 5],
    ['+4', 4],
    ['.5 + .5', 1],
    ['2 ** 10', 1024],
    ['2 ** 3 ** 2', 512],
    ['2 ** -1', 0.5],
    ['-2 ** 2', -4],
    ['((2))', 2],
    ['  7  ', 7],
  ])('evaluates %s', (expression, expected) => {
    expect(evaluateExpression(expression)).toBeCloseTo(expected, 10);
  });

  it.each([
    [''],
    ['   '],
    ['2 +'],
    ['* 2'],
    ['(2 + 3'],
    ['2 + 3)'],
    ['1..2'],
    ['2 3'],
    ['alert(1)'],
    ['constructor'],
    ['1; 2'],
    ['0x10'],
    ['1e3'],
  ])('rejects %j', (expression) => {
    expect(() => evaluateExpression(expression)).toThrow();
  });

  it('rejects a result that is not finite', () => {
    expect(() => evaluateExpression('1 / 0')).toThrow();
    expect(() => evaluateExpression('0 / 0')).toThrow();
    expect(() => evaluateExpression('9 ** 9 ** 9')).toThrow();
  });

  it('rejects over-long and over-nested input instead of recursing forever', () => {
    expect(() => evaluateExpression('1+'.repeat(500) + '1')).toThrow();
    expect(() => evaluateExpression('('.repeat(100) + '1' + ')'.repeat(100))).toThrow();
  });
});

describe('formatResult', () => {
  it('hides binary floating-point noise', () => {
    expect(formatResult(0.1 + 0.2)).toBe('0.3');
  });

  it('does not round integers to the display precision', () => {
    expect(formatResult(123456789012345 + 1)).toBe('123456789012346');
    // Beyond 2 ** 53 a double cannot hold every integer; print what JavaScript prints.
    expect(formatResult(2 ** 60)).toBe(String(2 ** 60));
    expect(formatResult(2 ** 60)).not.toBe('1152921504610000000');
  });

  it('keeps integers and ordinary decimals as they are', () => {
    expect(formatResult(50)).toBe('50');
    expect(formatResult(2.5)).toBe('2.5');
    expect(formatResult(-4)).toBe('-4');
  });
});
