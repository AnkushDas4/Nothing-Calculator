/*!
 * N-Calc · engine.js
 * ─────────────────────────────────────────────────────────────
 * Pure, DOM-free expression engine: tokenizer, normalizer,
 * input buffer (keypad rules), evaluator and formatter.
 *
 * Loads math.js (UMD) as a global in the browser and via require()
 * in Node, which keeps the whole thing unit-testable headlessly.
 * ─────────────────────────────────────────────────────────────
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../math.js'));
  } else {
    root.NCEngine = factory(root.math);
  }
})(typeof self !== 'undefined' ? self : this, function (math) {
  'use strict';

  /* ── character tables ─────────────────────────────────────── */

  // Pretty glyphs used by the UI → canonical engine characters.
  const GLYPH_TO_ASCII = {
    '\u00D7': '*', // ×
    '\u2715': '*', // ✕
    '\u00F7': '/', // ÷
    '\u2212': '-', // −
    '\u221A': 'sqrt', // √
    '\u03C0': 'pi', // π
  };

  const FUNCS = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'ln', 'sqrt', 'abs', 'cbrt', 'exp'];
  const TRIG_DEG_FUNCS = ['sin', 'cos', 'tan'];
  const OPERATORS = ['+', '-', '*', '/'];

  // engine name → math.js name
  const MATHJS_FUNC_MAP = {
    sin: 'sin',
    cos: 'cos',
    tan: 'tan',
    asin: 'asin',
    acos: 'acos',
    atan: 'atan',
    log: 'log10',
    ln: 'log',
    sqrt: 'sqrt',
    abs: 'abs',
    cbrt: 'cbrt',
    exp: 'exp',
  };

  function foldGlyphs(text) {
    let out = '';
    for (const ch of String(text === null || text === undefined ? '' : text)) {
      out += Object.prototype.hasOwnProperty.call(GLYPH_TO_ASCII, ch) ? GLYPH_TO_ASCII[ch] : ch;
    }
    return out;
  }

  /* ── tokenizer ────────────────────────────────────────────── */

  function tokenize(input) {
    const text = foldGlyphs(input);
    const tokens = [];
    let i = 0;
    while (i < text.length) {
      const ch = text[i];
      if (ch === ' ' || ch === '\t' || ch === '\u00A0') {
        i += 1;
        continue;
      }
      if (DIGIT(ch) || ch === '.') {
        let j = i;
        let seenDot = false;
        while (j < text.length && (DIGIT(text[j]) || text[j] === '.')) {
          if (text[j] === '.') {
            if (seenDot) break;
            seenDot = true;
          }
          j += 1;
        }
        tokens.push({ type: 'num', value: text.slice(i, j) });
        i = j;
        continue;
      }
      if (ch === '(') {
        tokens.push({ type: 'lparen' });
        i += 1;
        continue;
      }
      if (ch === ')') {
        tokens.push({ type: 'rparen' });
        i += 1;
        continue;
      }
      if (ch === '%') {
        tokens.push({ type: 'pct' });
        i += 1;
        continue;
      }
      if (ch === '!') {
        tokens.push({ type: 'fact' });
        i += 1;
        continue;
      }
      if (OPERATORS.indexOf(ch) >= 0 || ch === '^') {
        tokens.push({ type: 'op', value: ch });
        i += 1;
        continue;
      }
      const word = /^[a-zA-Z]+/.exec(text.slice(i));
      if (word) {
        const raw = word[0];
        const lower = raw.toLowerCase();
        if (FUNCS.indexOf(lower) >= 0) tokens.push({ type: 'func', value: lower });
        else if (lower === 'pi') tokens.push({ type: 'const', value: 'pi' });
        else if (lower === 'e') tokens.push({ type: 'const', value: 'e' });
        else if (lower === 'mod') tokens.push({ type: 'mod' });
        else throw new Error('Unknown symbol "' + raw + '"');
        i += raw.length;
        continue;
      }
      throw new Error('Unknown symbol "' + ch + '"');
    }
    return tokens;
  }

  function DIGIT(ch) {
    return ch >= '0' && ch <= '9';
  }

  /* ── token helpers ────────────────────────────────────────── */

  function matchingParen(tokens, openIdx) {
    let depth = 0;
    for (let i = openIdx; i < tokens.length; i += 1) {
      if (tokens[i].type === 'lparen') depth += 1;
      else if (tokens[i].type === 'rparen') {
        depth -= 1;
        if (depth === 0) return i;
      }
    }
    return -1;
  }

  /** First token index of the operand that ends at `endIdx`, or -1. */
  function operandStart(tokens, endIdx) {
    if (endIdx < 0) return -1;
    const t = tokens[endIdx];
    if (!t) return -1;
    if (t.type === 'num' || t.type === 'const') return endIdx;
    if (t.type === 'pct' || t.type === 'fact') return operandStart(tokens, endIdx - 1);
    if (t.type === 'rparen') {
      let depth = 0;
      for (let i = endIdx; i >= 0; i -= 1) {
        if (tokens[i].type === 'rparen') depth += 1;
        else if (tokens[i].type === 'lparen') {
          depth -= 1;
          if (depth === 0) return i;
        }
      }
    }
    return -1;
  }

  /** True when the operator token at `idx` acts as a sign, not a subtraction. */
  function isUnaryAt(tokens, idx) {
    if (idx <= 0) return true;
    const prev = tokens[idx - 1];
    return prev.type === 'op' || prev.type === 'lparen' || prev.type === 'mod';
  }

  /** Operator token index directly left of the operand starting at `startIdx`. */
  function operatorBefore(tokens, startIdx) {
    if (startIdx <= 0) return -1;
    const prev = tokens[startIdx - 1];
    if (prev.type === 'op' || prev.type === 'mod') return startIdx - 1;
    return -1;
  }

  /** Index of the first token of the sub-expression that ends at `endIdx`. */
  function expressionStart(tokens, endIdx) {
    let depth = 0;
    for (let i = endIdx; i >= 0; i -= 1) {
      const t = tokens[i];
      if (t.type === 'rparen') depth += 1;
      else if (t.type === 'lparen') {
        if (depth === 0) return i + 1;
        depth -= 1;
      } else if (depth === 0 && (t.type === 'op' || t.type === 'mod') && !isUnaryAt(tokens, i)) {
        return i + 1;
      }
    }
    return 0;
  }

  const TOK = {
    lparen: () => ({ type: 'lparen' }),
    rparen: () => ({ type: 'rparen' }),
    num: (v) => ({ type: 'num', value: String(v) }),
    op: (v) => ({ type: 'op', value: v }),
  };

  function cloneTokens(list) {
    return list.map((t) => Object.assign({}, t));
  }

  /* ── contextual percent expansion ─────────────────────────── */

  /**
   * Calculator-style percent semantics:
   *   100 + 10%   →  100 + (100 * 10 / 100)   = 110
   *   100 - 10%   →  100 - (100 * 10 / 100)   = 90
   *   100 * 10%   →  100 * (10 / 100)         = 10
   *   100 / 10%   →  100 / (10 / 100)         = 1000
   *   10%         →  10 / 100                 = 0.1
   *   100 mod 10% →  100 mod (10 / 100)
   */
  function expandPercent(tokens) {
    let out = cloneTokens(tokens);
    let guard = 0;
    while (out.some((t) => t.type === 'pct') && guard < 64) {
      guard += 1;
      const pctIdx = out.findIndex((t) => t.type === 'pct');
      const operandEnd = pctIdx - 1;
      const opStart = operandStart(out, operandEnd);
      if (opStart < 0) {
        // No operand in front of the percent sign: treat it as 1 %.
        out = out.slice(0, pctIdx).concat([TOK.lparen(), TOK.num('1'), TOK.op('/'), TOK.num('100'), TOK.rparen()], out.slice(pctIdx + 1));
        continue;
      }
      const operand = out.slice(opStart, operandEnd + 1);
      const opIdx = operatorBefore(out, opStart);
      const op = opIdx >= 0 ? out[opIdx] : null;
      const relative = op && op.type === 'op' && (op.value === '+' || op.value === '-');

      if (relative) {
        const leftStart = expressionStart(out, opIdx - 1);
        const left = out.slice(leftStart, opIdx);
        const replacement = [TOK.lparen()]
          .concat(cloneTokens(left))
          .concat([
            TOK.op(op.value),
            TOK.lparen(),
          ], cloneTokens(left), [
            TOK.op('*'),
            TOK.lparen(),
          ], cloneTokens(operand), [
            TOK.rparen(),
            TOK.op('/'),
            TOK.num('100'),
            TOK.rparen(),
            TOK.rparen(),
          ]);
        out = out.slice(0, leftStart).concat(replacement, out.slice(pctIdx + 1));
        continue;
      }

      const replacement = [TOK.lparen()].concat(cloneTokens(operand), [TOK.op('/'), TOK.num('100'), TOK.rparen()]);
      out = out.slice(0, opStart).concat(replacement, out.slice(pctIdx + 1));
    }
    return out;
  }

  /* ── serializer ───────────────────────────────────────────── */

  function serialize(tokens, opts) {
    return serializeRange(tokens, 0, tokens.length, opts || {});
  }

  function serializeRange(tokens, from, to, opts) {
    const angle = opts.angleMode || 'deg';
    let out = '';
    let i = from;
    while (i < to) {
      const t = tokens[i];
      if (t.type === 'func') {
        const open = i + 1;
        if (open < to && tokens[open].type === 'lparen') {
          const close = matchingParen(tokens, open);
          if (close > 0 && close < to) {
            const inner = serializeRange(tokens, open + 1, close, opts);
            const deg = angle === 'deg' && TRIG_DEG_FUNCS.indexOf(t.value) >= 0 && inner.trim() !== '' ? ' deg' : '';
            out += MATHJS_FUNC_MAP[t.value] + '(' + inner + deg + ')';
            i = close + 1;
            continue;
          }
        }
        out += MATHJS_FUNC_MAP[t.value];
        i += 1;
        continue;
      }
      if (t.type === 'num' || t.type === 'const') out += t.value;
      else if (t.type === 'op') out += t.value;
      else if (t.type === 'lparen') out += '(';
      else if (t.type === 'rparen') out += ')';
      else if (t.type === 'pct') out += '%';
      else if (t.type === 'fact') out += '!';
      else if (t.type === 'mod') out += '%';
      i += 1;
    }
    return out;
  }

  /* ── evaluate ─────────────────────────────────────────────── */

  function normalize(expr, opts) {
    return serialize(expandPercent(tokenize(expr)), opts || {});
  }

  function parenBalance(tokens) {
    let depth = 0;
    for (const t of tokens) {
      if (t.type === 'lparen') depth += 1;
      else if (t.type === 'rparen') {
        depth -= 1;
        if (depth < 0) return -1;
      }
    }
    return depth;
  }

  function endsWithValue(expr) {
    let tokens;
    try {
      tokens = tokenize(expr);
    } catch (err) {
      return false;
    }
    if (!tokens.length) return false;
    const last = tokens[tokens.length - 1];
    return ['num', 'const', 'rparen', 'pct', 'fact'].indexOf(last.type) >= 0;
  }

  function evaluate(expr, opts) {
    const options = opts || {};
    if (!String(expr === null || expr === undefined ? '' : expr).trim()) {
      return { ok: false, error: 'Empty expression' };
    }
    let tokens;
    try {
      tokens = tokenize(expr);
    } catch (err) {
      return { ok: false, error: err.message };
    }
    if (!tokens.length) return { ok: false, error: 'Empty expression' };
    const balance = parenBalance(tokens);
    if (balance > 0) return { ok: false, error: 'Unclosed parenthesis' };
    if (balance < 0) return { ok: false, error: 'Unmatched parenthesis' };

    let normalized;
    try {
      normalized = serialize(expandPercent(tokens), options);
    } catch (err) {
      return { ok: false, error: err.message };
    }

    let value;
    try {
      value = math.evaluate(normalized);
    } catch (err) {
      return { ok: false, error: cleanError(err && err.message) };
    }
    if (typeof value !== 'number') return { ok: false, error: 'Not a real number' };
    if (!Number.isFinite(value)) return { ok: false, error: 'Cannot divide by zero' };
    if (Number.isNaN(value)) {
      const divByZero = /\/\s*(?:0+(?:\.0*)?|\.0+)\s*(?=[^0-9.]|$)/.test(normalized);
      return { ok: false, error: divByZero ? 'Cannot divide by zero' : 'Undefined result' };
    }
    return { ok: true, value: value, normalized: normalized };
  }

  function cleanError(message) {
    const msg = String(message || 'Invalid expression');
    if (/Unexpected end of expression/i.test(msg)) return 'Incomplete expression';
    if (/Undefined symbol/i.test(msg)) return 'Unknown symbol';
    if (/Parenthesis \) expected/i.test(msg)) return 'Unclosed parenthesis';
    return msg.replace(/^Error:\s*/, '').slice(0, 64);
  }

  function preview(expr, opts) {
    const res = evaluate(expr, opts);
    return res.ok ? res.value : null;
  }

  /* ── number formatting ────────────────────────────────────── */

  let groupFormatter = null;
  function getGroupFormatter() {
    if (!groupFormatter && typeof Intl !== 'undefined') {
      groupFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 12, useGrouping: true });
    }
    return groupFormatter;
  }

  function trimExponential(text) {
    return text.replace(/(\.\d*?)0+e/, '$1e').replace(/\.e/, 'e').replace(/e\+?(-?)/, 'e$1');
  }

  /**
   * formatNumber(1234.5678)                    → "1,234.5678"
   * formatNumber(1/3)                          → "0.333333333333"
   * formatNumber(0.1+0.2)                      → "0.3"
   * formatNumber(1e20)                         → "1e20"
   * formatNumber(x, { decimals: 2 })           → fixed 2 decimals
   * formatNumber(x, { grouping: false })       → "1234.5678"
   */
  function formatNumber(value, opts) {
    const options = opts || {};
    if (typeof value === 'string') return value;
    if (typeof value !== 'number' || Number.isNaN(value)) return 'Error';
    if (!Number.isFinite(value)) return value > 0 ? '\u221E' : '-\u221E';
    if (value === 0) return options.decimals ? (0).toFixed(options.decimals) : '0';

    const abs = Math.abs(value);
    if (Math.abs(value) >= 1e15 || abs < 1e-9) return trimExponential(value.toExponential(6));

    const hasDecimals = typeof options.decimals === 'number' && options.decimals >= 0;
    const rounded = hasDecimals ? Number(value.toFixed(options.decimals)) : Number(value.toPrecision(12));

    if (rounded === 0) return hasDecimals ? (0).toFixed(options.decimals) : '0';
    if (Math.abs(rounded) >= 1e15) return trimExponential(rounded.toExponential(6));
    if (options.grouping === false) return String(rounded);
    const fmt = getGroupFormatter();
    if (!fmt) return String(rounded);
    return fmt.format(rounded);
  }

  /* ── literal numbers ──────────────────────────────────────── */

  /**
   * Produce a decimal literal that the tokenizer can read back,
   * even for values JavaScript would print in exponential form.
   */
  function literal(value) {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (!Number.isFinite(num)) return '';
    if (Number.isInteger(num)) {
      if (Math.abs(num) < 1e21) return String(num);
      try {
        return BigInt(num).toString();
      } catch (err) {
        return String(num);
      }
    }
    const fixed = num.toFixed(20).replace(/0+$/, '').replace(/\.$/, '');
    if (fixed !== '' && parseFloat(fixed) === num) return fixed;
    return String(num);
  }

  /* ── pretty display ───────────────────────────────────────── */

  /** Canonical buffer text → display glyphs (×, ÷, −, π, √). */
  function pretty(text) {
    return String(text || '')
      .replace(/sqrt/g, '\u221A')
      .replace(/pi/g, '\u03C0')
      .replace(/\*/g, '\u00D7')
      .replace(/\//g, '\u00F7')
      .replace(/-/g, '\u2212');
  }

  /* ── input buffer ─────────────────────────────────────────── */

  const OPERAND_END = /(?:\d|\)|%|!|pi|e)$/;

  /**
   * Keeps a canonical expression string that mirrors what a keypad may
   * legally produce — used by both pages and unit tested directly.
   */
  function InputBuffer(initial) {
    this.text = typeof initial === 'string' ? initial : '';
  }

  InputBuffer.prototype.set = function (text) {
    this.text = String(text === null || text === undefined ? '' : text);
    return this;
  };

  InputBuffer.prototype.clear = function () {
    this.text = '';
    return this;
  };

  InputBuffer.prototype.isEmpty = function () {
    return this.text.length === 0;
  };

  InputBuffer.prototype.endsWithOperand = function () {
    return OPERAND_END.test(this.text);
  };

  InputBuffer.prototype.currentNumber = function () {
    const m = /(\d*\.?\d*)$/.exec(this.text);
    return m ? m[1] : '';
  };

  InputBuffer.prototype.last = function () {
    return this.text.slice(-1);
  };

  InputBuffer.prototype.digit = function (d) {
    const seg = this.currentNumber();
    if (seg === '0' && !/0\.$/.test(this.text)) {
      this.text = this.text.slice(0, -1) + d;
      return this;
    }
    this.text += d;
    return this;
  };

  InputBuffer.prototype.dot = function () {
    const seg = this.currentNumber();
    if (seg.indexOf('.') >= 0) return this;
    if (seg === '') {
      if (this.text === '' || /[+\-*/^(]$/.test(this.text)) this.text += '0.';
      else if (/ (mod )$/.test(this.text)) this.text += '0.';
      return this;
    }
    this.text += '.';
    return this;
  };

  InputBuffer.prototype.operator = function (op) {
    if (OPERATORS.indexOf(op) < 0) return this;
    if (this.text === '') {
      if (op === '-') this.text = '-';
      return this;
    }
    if (/ mod $/.test(this.text)) {
      this.text = this.text.replace(/ mod $/, '');
      return this.operator(op);
    }
    const last = this.last();
    if (last === '(' || last === '^') {
      if (op === '-') this.text += '-';
      return this;
    }
    if (last === '+' || last === '*' || last === '/') {
      if (op === '-') this.text += '-';
      else this.text = this.text.slice(0, -1) + op;
      return this;
    }
    if (last === '-') {
      const prev = this.text.slice(-2, -1);
      const unary = prev === '' || /[+\-*/^(]/.test(prev);
      if (unary) {
        if (op === '-') this.text = this.text.slice(0, -1);
        else if (op === '+') this.text = this.text.slice(0, -1);
        // * and / keep the sign: "(-3" stays "-3"
      } else {
        if (op === '-') this.text += '-';
        else this.text = this.text.slice(0, -1) + op;
      }
      return this;
    }
    if (this.endsWithOperand()) this.text += op;
    return this;
  };

  InputBuffer.prototype.paren = function () {
    if (this.text === '') {
      this.text = '(';
      return this;
    }
    let depth = 0;
    for (const ch of this.text) {
      if (ch === '(') depth += 1;
      else if (ch === ')') depth -= 1;
    }
    if (this.endsWithOperand()) {
      if (depth > 0) this.text += ')';
      else this.text += '*(';
      return this;
    }
    this.text += '(';
    return this;
  };

  InputBuffer.prototype.percent = function () {
    if (this.endsWithOperand() && !/%$/.test(this.text)) this.text += '%';
    return this;
  };

  InputBuffer.prototype.factorial = function () {
    if (this.endsWithOperand() && !/[!]$/.test(this.text)) this.text += '!';
    return this;
  };

  InputBuffer.prototype.power = function () {
    if (this.text === '') return this;
    if (this.text.endsWith('^')) {
      this.text = this.text.slice(0, -1);
      return this;
    }
    if (this.endsWithOperand()) this.text += '^';
    return this;
  };

  InputBuffer.prototype.mod = function () {
    if (this.text === '' || !this.endsWithOperand()) return this;
    this.text += ' mod ';
    return this;
  };

  InputBuffer.prototype.constant = function (name) {
    if (name !== 'pi' && name !== 'e') return this;
    if (this.endsWithOperand()) this.text += '*' + name;
    else this.text += name;
    return this;
  };

  InputBuffer.prototype.func = function (name) {
    if (FUNCS.indexOf(name) < 0) return this;
    if (this.endsWithOperand()) this.text += '*' + name + '(';
    else this.text += name + '(';
    return this;
  };

  /** Insert a literal number (result / answer) respecting implicit ×. */
  InputBuffer.prototype.number = function (value, opts) {
    let str;
    if (typeof value === 'string') {
      str = value;
    } else {
      // Prefer what the user can see (rounded + ungrouped); fall back to a
      // decimal literal for magnitudes JavaScript prints exponentially.
      const shown = formatNumber(value, Object.assign({ grouping: false }, opts || {}));
      str = /[eE]/.test(shown) || shown === 'Error' ? literal(value) : shown;
    }
    if (!str || str === 'Error') return this;
    const negative = str.charAt(0) === '-';
    const body = negative ? str.slice(1) : str;
    const last = this.last();
    const atStart = this.text === '' || /[+\-*/^(]$/.test(this.text) || / mod $/.test(this.text);
    if (atStart) {
      this.text += (negative && this.last() !== '-' ? '-' : '') + body;
      return this;
    }
    if (negative) this.text += '*(-' + body + ')';
    else this.text += '*' + body;
    return this;
  };

  /** ± — toggles the sign of the number being typed. */
  InputBuffer.prototype.toggleSign = function () {
    if (this.text === '') {
      this.text = '-';
      return this;
    }
    if (this.endsWithOperand()) {
      const wrapped = /\(-(\d*\.?\d*)\)$/.exec(this.text);
      if (wrapped) {
        this.text = this.text.slice(0, wrapped.index) + wrapped[1];
        return this;
      }
      const seg = this.currentNumber();
      if (seg === '') return this; // trailing ) / % / ! — leave alone
      const segStart = this.text.length - seg.length;
      const prev = this.text.charAt(segStart - 1);
      if (prev === '-' && (segStart - 1 === 0 || /[+\-*/^(]/.test(this.text.charAt(segStart - 2)))) {
        this.text = this.text.slice(0, segStart - 1) + seg;
        return this;
      }
      if (segStart === 0) {
        this.text = '-' + this.text;
        return this;
      }
      if (/[+\-*/^(]/.test(prev)) {
        this.text = this.text.slice(0, segStart) + '-' + this.text.slice(segStart);
        return this;
      }
      return this;
    }
    if (this.last() === '-') {
      this.text = this.text.slice(0, -1);
      return this;
    }
    this.text += '-';
    return this;
  };

  /** Start index of the trailing operand the user is editing, or -1. */
  InputBuffer.prototype.operandStart = function () {
    let text = this.text;
    let offset = 0;
    // step over trailing postfix operators
    while (/[%!]$/.test(text)) {
      text = text.slice(0, -1);
      offset += 1;
    }
    if (text === '') return -1;
    let start = -1;
    if (/\)$/.test(text)) {
      let depth = 0;
      for (let i = text.length - 1; i >= 0; i -= 1) {
        if (text[i] === ')') depth += 1;
        else if (text[i] === '(') {
          depth -= 1;
          if (depth === 0) {
            start = i;
            break;
          }
        }
      }
      // include the function name, e.g. sqrt(9)
      const before = /(sin|cos|tan|asin|acos|atan|log|ln|sqrt|abs|cbrt|exp)$/.exec(text.slice(0, start));
      if (before) start -= before[0].length;
    } else if (/(pi|e)$/.test(text)) {
      start = /(pi)$/.test(text) ? text.length - 2 : text.length - 1;
    } else {
      const match = /\d*\.?\d+$/.exec(text);
      if (match) start = match.index;
    }
    if (start < 0) return -1;
    // swallow a unary minus that belongs to the operand
    if (start > 0 && text[start - 1] === '-') {
      const before = text[start - 2];
      if (before === undefined || /[+\-*/^( ]/.test(before)) start -= 1;
    }
    return start + offset;
  };

  /** Wrap the trailing operand in a function call: 5+3 → 5+abs(3). */
  InputBuffer.prototype.wrapLast = function (name) {
    const start = this.operandStart();
    if (start < 0 || FUNCS.indexOf(name) < 0) return this;
    const tail = this.text.slice(start);
    const trimmed = /^\s*(.*?)\s*$/.exec(tail)[1];
    let isGroup = false;
    if (/^\(.*\)$/.test(trimmed)) {
      let depth = 0;
      isGroup = true;
      for (let i = 0; i < trimmed.length; i += 1) {
        if (trimmed[i] === '(') depth += 1;
        else if (trimmed[i] === ')') {
          depth -= 1;
          if (depth === 0 && i !== trimmed.length - 1) isGroup = false;
        }
      }
      if (depth !== 0) isGroup = false;
    }
    this.text = this.text.slice(0, start) + name + (isGroup ? trimmed : '(' + tail + ')');
    return this;
  };

  /** Append a postfix suffix to the trailing operand: 5+3 → 5+3^2. */
  InputBuffer.prototype.suffix = function (suffix) {
    if (!this.endsWithOperand()) return this;
    this.text += suffix;
    return this;
  };

  InputBuffer.prototype.backspace = function () {
    if (this.text === '') return this;
    const funcCall = /(sin|cos|tan|asin|acos|atan|log|ln|sqrt|abs|cbrt|exp)\($/.exec(this.text);
    if (funcCall) {
      this.text = this.text.slice(0, -funcCall[0].length);
      return this;
    }
    if (/ mod $/.test(this.text)) {
      this.text = this.text.slice(0, -5);
      return this;
    }
    const constMatch = /(pi)$/.exec(this.text);
    if (constMatch) {
      this.text = this.text.slice(0, -2);
      return this;
    }
    if (/e$/.test(this.text)) {
      this.text = this.text.slice(0, -1);
      return this;
    }
    this.text = this.text.slice(0, -1);
    return this;
  };

  return {
    FUNCS: FUNCS,
    foldGlyphs: foldGlyphs,
    tokenize: tokenize,
    normalize: normalize,
    evaluate: evaluate,
    preview: preview,
    pretty: pretty,
    literal: literal,
    formatNumber: formatNumber,
    endsWithValue: endsWithValue,
    parenBalance: parenBalance,
    InputBuffer: InputBuffer,
  };
});
