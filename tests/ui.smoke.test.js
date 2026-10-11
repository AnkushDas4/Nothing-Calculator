/**
 * DOM smoke tests — boots both pages in jsdom and drives the keypads.
 * These catch wiring regressions that unit tests cannot see.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const E = require('../js/engine.js');
const U = require('../js/units.js');

const shown = (value) => E.formatNumber(value, { grouping: true });

const ROOT = path.resolve(__dirname, '..');

const SCRIPTS = {
  'index.html': ['math.js', 'js/version.js', 'js/engine.js', 'js/ui.js', 'js/app.js'],
  'converters.html': [
    'math.js',
    'js/version.js',
    'js/engine.js',
    'js/units-data.js',
    'js/units.js',
    'js/ui.js',
    'js/converters.js',
  ],
};

async function boot(page) {
  const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
  const dom = new JSDOM(html, {
    url: 'http://localhost:8080/' + page,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const { window } = dom;

  window.matchMedia = (query) => ({
    matches: /landscape/.test(query),
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
  window.fetch = () => Promise.reject(new Error('offline in tests'));

  SCRIPTS[page].forEach((file) => {
    window.eval(fs.readFileSync(path.join(ROOT, file), 'utf8') + '\n//# sourceURL=' + file);
  });

  // jsdom fires DOMContentLoaded asynchronously; let the pages wire up.
  await new Promise((resolve) => setTimeout(resolve, 0));
  return { window, document: window.document };
}

const click = (window, selector) => {
  const el = window.document.querySelector(selector);
  assert.ok(el, 'missing element ' + selector);
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return el;
};

const press = (window, value) =>
  click(window, `.key[data-action="digit"][data-value="${value}"]`);

const text = (window, selector) => window.document.querySelector(selector).textContent;

/* ── calculator ───────────────────────────────────────────── */

test('calculator: boots showing zero', async () => {
  const { window } = await boot('index.html');
  assert.equal(text(window, '#main-line'), '0');
  assert.equal(window.document.querySelector('#ans-chip').hidden, true);
});

test('calculator: 5 + 7 = 12 and history records it', async () => {
  const { window } = await boot('index.html');
  press(window, '5');
  click(window, '.key[data-action="operator"][data-value="+"]');
  press(window, '7');

  // live preview while typing
  assert.match(text(window, '#secondary-line'), /12/);

  click(window, '.key[data-action="equals"]');
  assert.equal(text(window, '#main-line'), '12');

  const entries = window.document.querySelectorAll('#history-list .history-item');
  assert.equal(entries.length, 1);
  assert.match(entries[0].textContent, /5\+7/);
});

test('calculator: chained result starts a new calculation', async () => {
  const { window } = await boot('index.html');
  press(window, '5');
  click(window, '.key[data-action="operator"][data-value="+"]');
  press(window, '7');
  click(window, '.key[data-action="equals"]');
  click(window, '.key[data-action="operator"][data-value="*"]');
  press(window, '2');
  click(window, '.key[data-action="equals"]');
  assert.equal(text(window, '#main-line'), '24');
});

test('calculator: percent follows calculator semantics', async () => {
  const { window } = await boot('index.html');
  press(window, '1');
  press(window, '0');
  press(window, '0');
  click(window, '.key[data-action="operator"][data-value="+"]');
  press(window, '1');
  press(window, '0');
  click(window, '.key[data-action="percent"]');
  click(window, '.key[data-action="equals"]');
  assert.equal(text(window, '#main-line'), '110');
});

test('calculator: angle chip switches degrees and radians', async () => {
  const { window } = await boot('index.html');
  click(window, '.key[data-action="func"][data-value="sin"]');
  press(window, '3');
  press(window, '0');
  click(window, '.key[data-action="paren"]');
  click(window, '.key[data-action="equals"]');
  assert.equal(text(window, '#main-line'), '0.5');

  click(window, '#angle-chip');
  assert.equal(text(window, '#angle-chip'), 'RAD');
  click(window, '.key[data-action="clear"]');
  click(window, '.key[data-action="func"][data-value="sin"]');
  click(window, '.key[data-action="constant"][data-value="pi"]');
  click(window, '.key[data-action="operator"][data-value="/"]');
  press(window, '2');
  click(window, '.key[data-action="paren"]');
  click(window, '.key[data-action="equals"]');
  assert.equal(text(window, '#main-line'), '1');
});

test('calculator: scientific keys wrap the trailing operand', async () => {
  const { window } = await boot('index.html');
  press(window, '5');
  click(window, '.key[data-action="operator"][data-value="+"]');
  press(window, '3');
  click(window, '.key[data-action="square"]');
  click(window, '.key[data-action="equals"]');
  assert.equal(text(window, '#main-line'), '14');
});

test('calculator: backspace and clear behave', async () => {
  const { window } = await boot('index.html');
  press(window, '5');
  press(window, '3');
  click(window, '.key[data-action="backspace"]');
  assert.equal(text(window, '#main-line'), '5');
  click(window, '.key[data-action="clear"]');
  assert.equal(text(window, '#main-line'), '0');
});

test('calculator: errors surface without throwing', async () => {
  const { window } = await boot('index.html');
  press(window, '1');
  click(window, '.key[data-action="operator"][data-value="/"]');
  press(window, '0');
  click(window, '.key[data-action="equals"]');
  assert.equal(text(window, '#main-line'), 'Cannot divide by zero');
  assert.ok(window.document.querySelector('#main-line').classList.contains('error'));
});

test('calculator: ANS and history recall', async () => {
  const { window } = await boot('index.html');
  press(window, '9');
  click(window, '.key[data-action="operator"][data-value="*"]');
  press(window, '9');
  click(window, '.key[data-action="equals"]');
  click(window, '.key[data-action="ans"]');
  click(window, '.key[data-action="operator"][data-value="+"]');
  press(window, '1');
  click(window, '.key[data-action="equals"]');
  assert.equal(text(window, '#main-line'), '82');
});

test('calculator: settings sheet toggles work', async () => {
  const { window } = await boot('index.html');
  click(window, '#settings-btn');
  assert.ok(window.document.querySelector('#settings-sheet').classList.contains('open'));

  click(window, '#theme-seg [data-value="light"]');
  assert.equal(window.document.documentElement.getAttribute('data-theme'), 'light');
  assert.equal(window.localStorage.getItem('ncalc.theme'), '"light"');

  const haptics = window.document.querySelector('#pref-haptics');
  haptics.checked = false;
  haptics.dispatchEvent(new window.Event('change'));
  assert.equal(window.localStorage.getItem('ncalc.haptics'), 'false');

  const decimals = window.document.querySelector('#pref-decimals');
  decimals.value = '2';
  decimals.dispatchEvent(new window.Event('change'));
  assert.equal(window.localStorage.getItem('ncalc.decimals'), '"2"');

  click(window, '.key[data-action="digit"][data-value="1"]');
  press(window, '2');
  press(window, '3');
  press(window, '4');
  press(window, '5');
  press(window, '6');
  assert.equal(text(window, '#main-line'), '123,456');
});

/* ── converter ────────────────────────────────────────────── */

test('converter: renders one tab per category', async () => {
  const { window } = await boot('converters.html');
  const tabs = window.document.querySelectorAll('#tabs .tab');
  assert.equal(tabs.length, U.list().length + 1);
  assert.equal(tabs[0].textContent, 'Currency');
  assert.ok(window.document.querySelector('#tabs .tab.active'));
});

test('converter: length conversion and swap', async () => {
  const { window } = await boot('converters.html');
  click(window, '#tabs [data-category="length"]');
  assert.equal(text(window, '#from-code'), 'm');
  assert.equal(text(window, '#to-code'), 'ft');
  assert.equal(text(window, '#result-value'), shown(U.convert('length', 1, 'Meter', 'Foot')));

  click(window, '#swap-btn');
  assert.equal(text(window, '#from-code'), 'ft');
  assert.equal(text(window, '#to-code'), 'm');
  assert.equal(text(window, '#result-value'), shown(U.convert('length', 1, 'Foot', 'Meter')));
});

test('converter: typing updates the result', async () => {
  const { window } = await boot('converters.html');
  click(window, '#tabs [data-category="temp"]');
  assert.equal(text(window, '#from-code'), '°C');
  assert.equal(text(window, '#to-code'), '°F');

  click(window, '.key[data-action="clear"]');
  click(window, '.key[data-action="digit"][data-value="1"]');
  click(window, '.key[data-action="digit"][data-value="0"]');
  click(window, '.key[data-action="digit"][data-value="0"]');
  assert.equal(text(window, '#input-value'), '100');
  assert.equal(text(window, '#result-value'), shown(U.convert('temp', 100, 'Celsius', 'Fahrenheit')));
});

test('converter: picker lists units and selects one', async () => {
  const { window } = await boot('converters.html');
  click(window, '#tabs [data-category="mass"]');
  click(window, '#to-btn');
  assert.ok(window.document.querySelector('#picker-sheet').classList.contains('open'));

  const rows = window.document.querySelectorAll('#picker-list .picker-item');
  assert.ok(rows.length >= 8);
  const ounce = Array.from(rows).find((row) => row.textContent.includes('Ounce'));
  assert.ok(ounce, 'ounce row should exist');
  ounce.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

  assert.equal(text(window, '#to-code'), 'oz');
  assert.equal(text(window, '#result-value'), shown(U.convert('mass', 1, 'Kilogram', 'Ounce')));
  assert.equal(window.document.querySelector('#picker-sheet').classList.contains('open'), false);
});

test('converter: falls back to the offline snapshot without network', async () => {
  const { window } = await boot('converters.html');
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.match(text(window, '#rate-text'), /offline|estimate|Live|Cached/i);
  assert.equal(text(window, '#from-code'), 'USD');
  assert.equal(text(window, '#to-code'), 'EUR');
});

/* ── shared ───────────────────────────────────────────────── */

test('shared: theme preference migrates from the legacy key', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
  dom.window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  dom.window.localStorage.setItem('theme', 'light');
  dom.window.eval(fs.readFileSync(path.join(ROOT, 'js/ui.js'), 'utf8'));
  dom.window.NCUI.prefs.load();
  assert.equal(dom.window.NCUI.prefs.all.theme, 'light');
});

test('shared: markup has no inline event handlers', () => {
  ['index.html', 'converters.html'].forEach((page) => {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    assert.equal(/onclick=|onchange=|ontouchstart=/.test(html), false, page + ' should be CSP friendly');
  });
});
