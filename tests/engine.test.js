/**
 * Unit tests for the pure expression engine.
 * Run with:  node --test tests/
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/engine.js');

const ev = (expr, opts) => {
  const res = E.evaluate(expr, opts);
  if (!res.ok) throw new Error('expected ok but got: ' + res.error);
  return res.value;
};

function closeTo(actual, expected, eps = 1e-9) {
  assert.ok(Math.abs(actual - expected) < eps, `expected ${actual} ≈ ${expected}`);
}

/* ── arithmetic ───────────────────────────────────────────── */

test('basic arithmetic and precedence', () => {
  assert.equal(ev('1+2'), 3);
  assert.equal(ev('2*3+4'), 10);
  assert.equal(ev('2+3*4'), 14);
  assert.equal(ev('(2+3)*4'), 20);
  assert.equal(ev('10/4'), 2.5);
  assert.equal(ev('2^10'), 1024);
  assert.equal(ev('2-5'), -3);
  assert.equal(ev('5*-3'), -15);
  assert.equal(ev('5--3'), 8);
  assert.equal(ev('2(3+4)'), 14);
  assert.equal(ev('5!'), 120);
  assert.equal(ev('2pi'), 2 * Math.PI);
});

test('pretty glyphs are folded before evaluation', () => {
  assert.equal(ev('6\u00D77'), 42); // ×
  assert.equal(ev('9\u00F74'), 2.25); // ÷
  assert.equal(ev('9\u22124'), 5); // −
  closeTo(ev('\u221A(16)'), 4); // √(16)
  closeTo(ev('2\u03C0'), 2 * Math.PI); // 2π
});

/* ── percent semantics ────────────────────────────────────── */

test('contextual percent: add / subtract use the relative value', () => {
  assert.equal(ev('100+10%'), 110);
  assert.equal(ev('100-10%'), 90);
  assert.equal(ev('200+5%'), 210);
  assert.equal(ev('50-50%'), 25);
  assert.equal(ev('2*3+10%'), 6.6);
});

test('contextual percent: multiply / divide use the absolute value', () => {
  assert.equal(ev('100*10%'), 10);
  assert.equal(ev('100/10%'), 1000);
  assert.equal(ev('10%'), 0.1);
  assert.equal(ev('50%*2'), 1);
});

test('percent inside parentheses', () => {
  assert.equal(ev('(100+100)+10%'), 220);
  assert.equal(ev('100+(10%)'), 100.1);
});

/* ── functions & angle mode ───────────────────────────────── */

test('trigonometry honours degree mode', () => {
  closeTo(ev('sin(30)'), 0.5);
  closeTo(ev('cos(60)'), 0.5);
  closeTo(ev('tan(45)'), 1);
  closeTo(ev('sin(30)+cos(60)'), 1);
});

test('trigonometry honours radian mode', () => {
  closeTo(ev('sin(pi/2)', { angleMode: 'rad' }), 1);
  closeTo(ev('cos(0)', { angleMode: 'rad' }), 1);
});

test('logarithms, roots and helpers', () => {
  assert.equal(ev('log(100)'), 2);
  assert.equal(ev('ln(1)'), 0);
  closeTo(ev('ln(e)'), 1);
  assert.equal(ev('sqrt(144)'), 12);
  assert.equal(ev('abs(-5)'), 5);
  assert.equal(ev('cbrt(27)'), 3);
  assert.equal(ev('exp(0)'), 1);
});

test('mod operator', () => {
  assert.equal(ev('10 mod 3'), 1);
  assert.equal(ev('10 mod 3 + 1'), 2);
  assert.equal(ev('(10 mod 3)*2'), 2); // 10 mod 6 = 4
});

/* ── error handling ───────────────────────────────────────── */

test('errors are reported instead of thrown', () => {
  assert.equal(E.evaluate('').ok, false);
  assert.equal(E.evaluate('1+').ok, false);
  assert.equal(E.evaluate('(1+2').error, 'Unclosed parenthesis');
  assert.equal(E.evaluate('1+)').error, 'Unmatched parenthesis');
  assert.equal(E.evaluate('1/0').error, 'Cannot divide by zero');
  assert.equal(E.evaluate('0/0').error, 'Cannot divide by zero');
  assert.equal(E.evaluate('sqrt(-1)').error, 'Not a real number');
  assert.match(E.evaluate('1+zebra').error, /Unknown symbol/);
});

test('preview never throws', () => {
  assert.equal(E.preview('1+'), null);
  assert.equal(E.preview('2+2'), 4);
});

/* ── formatting ───────────────────────────────────────────── */

test('formatting groups thousands and hides float noise', () => {
  assert.equal(E.formatNumber(0.1 + 0.2), '0.3');
  assert.equal(E.formatNumber(1 / 3), '0.333333333333');
  assert.equal(E.formatNumber(1234.5678), '1,234.5678');
  assert.equal(E.formatNumber(1234.5678, { grouping: false }), '1234.5678');
  assert.equal(E.formatNumber(1234.5678, { decimals: 2 }), '1,234.57');
  assert.equal(E.formatNumber(-9876.5), '-9,876.5');
  assert.equal(E.formatNumber(0), '0');
  assert.equal(E.formatNumber(1e20), '1e20');
  assert.equal(E.formatNumber(1.5e-12), '1.5e-12');
  assert.equal(E.formatNumber(Infinity), '\u221E');
  assert.equal(E.formatNumber(1e6), '1,000,000');
});

test('pretty prints operator glyphs for the display', () => {
  assert.equal(E.pretty('2*3'), '2\u00D73');
  assert.equal(E.pretty('10-4'), '10\u22124');
  assert.equal(E.pretty('8/2'), '8\u00F72');
  assert.equal(E.pretty('pi'), '\u03C0');
  assert.equal(E.pretty('sqrt(9)'), '\u221A(9)');
});

/* ── input buffer rules ───────────────────────────────────── */

test('digits: no leading zeros, decimals are single', () => {
  const b = new E.InputBuffer();
  b.digit('0').digit('5');
  assert.equal(b.text, '5');
  b.clear();
  b.digit('1').digit('0').digit('0');
  assert.equal(b.text, '100');
  b.clear();
  b.digit('1').dot().digit('5').dot().digit('2');
  assert.equal(b.text, '1.52');
  b.clear();
  b.dot().digit('5');
  assert.equal(b.text, '0.5');
});

test('operators replace instead of stacking', () => {
  const b = new E.InputBuffer();
  b.digit('5').operator('+').operator('*');
  assert.equal(b.text, '5*');
  b.clear();
  b.digit('5').operator('+').operator('-');
  assert.equal(b.text, '5+-');
  b.clear();
  b.operator('-').digit('4');
  assert.equal(b.text, '-4');
  b.clear();
  b.digit('5').operator('+').digit('3');
  assert.equal(b.text, '5+3');
});

test('parenthesis key inserts or closes intelligently', () => {
  const b = new E.InputBuffer();
  b.paren().digit('2').operator('+').digit('3').paren();
  assert.equal(b.text, '(2+3)');
  b.clear();
  b.digit('2').paren();
  assert.equal(b.text, '2*(');
  b.clear();
  b.digit('2').operator('+').paren().digit('3').paren();
  assert.equal(b.text, '2+(3)');
  b.paren();
  assert.equal(b.text, '2+(3)*(');
  b.clear();
  b.digit('2').operator('+').paren().digit('3').paren().operator('*').digit('2');
  assert.equal(b.text, '2+(3)*2');
});

test('percent and factorial only after a value', () => {
  const b = new E.InputBuffer();
  b.operator('+').percent();
  assert.equal(b.text, '');
  b.operator('-').percent();
  assert.equal(b.text, '-');
  b.clear();
  b.digit('5').digit('0').percent();
  assert.equal(b.text, '50%');
  b.clear();
  b.digit('5').factorial().factorial();
  assert.equal(b.text, '5!');
  b.clear();
  b.digit('5').percent().percent();
  assert.equal(b.text, '50%'.replace('50', '5'));
});

test('functions, constants and powers', () => {
  const b = new E.InputBuffer();
  b.digit('5').func('sin').digit('3').digit('0').paren();
  assert.equal(b.text, '5*sin(30)');
  b.clear();
  b.constant('pi');
  assert.equal(b.text, 'pi');
  b.constant('e');
  assert.equal(b.text, 'pi*e');
  b.clear();
  b.digit('2').power().digit('1').digit('0');
  assert.equal(b.text, '2^10');
  b.power();
  assert.equal(b.text, '2^10^');
  b.backspace().backspace();
  assert.equal(b.text, '2^1');
  b.clear();
  b.digit('1').digit('0').mod().digit('3');
  assert.equal(b.text, '10 mod 3');
});

test('backspace removes whole tokens', () => {
  const b = new E.InputBuffer();
  b.func('sin').backspace();
  assert.equal(b.text, '');
  b.set('5+sqrt(').backspace();
  assert.equal(b.text, '5+');
  b.set('10 mod ').backspace();
  assert.equal(b.text, '10');
  b.set('2pi').backspace();
  assert.equal(b.text, '2');
  b.set('5+').backspace();
  assert.equal(b.text, '5');
});

test('sign toggle round trips', () => {
  const b = new E.InputBuffer();
  b.digit('5').toggleSign();
  assert.equal(b.text, '-5');
  b.toggleSign();
  assert.equal(b.text, '5');
  b.set('5+3');
  b.toggleSign();
  assert.equal(b.text, '5+-3');
  b.toggleSign();
  assert.equal(b.text, '5+3');
  b.set('10');
  b.toggleSign();
  assert.equal(b.text, '-10');
});

test('number insertion respects implicit multiplication', () => {
  const b = new E.InputBuffer();
  b.number(42);
  assert.equal(b.text, '42');
  b.operator('+').number(8);
  assert.equal(b.text, '42+8');
  b.number(2);
  assert.equal(b.text, '42+8*2');
  b.clear().number(-7);
  assert.equal(b.text, '-7');
  b.number(3);
  assert.equal(b.text, '-7*3');
});

test('result of a calculation can be fed back in', () => {
  const b = new E.InputBuffer();
  b.set('2+3');
  const res = E.evaluate(b.text);
  assert.equal(res.ok, true);
  b.clear().number(res.value).operator('*').digit('2');
  assert.equal(b.text, '5*2');
  assert.equal(ev(b.text), 10);
});
