/**
 * Unit tests for the conversion catalogue and maths.
 * Run with:  node --test tests/
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const U = require('../js/units.js');

const closeTo = (actual, expected, eps = 1e-6) =>
  assert.ok(Math.abs(actual - expected) < eps, `expected ${actual} ≈ ${expected}`);

/* ── catalogue integrity ──────────────────────────────────── */

test('every category is well formed', () => {
  const categories = U.list();
  assert.ok(categories.length >= 8, 'expected at least 8 categories');
  categories.forEach((category) => {
    assert.match(category.id, /^[a-z]+$/, category.id + ' id must be lowercase');
    assert.ok(category.title, category.id + ' needs a title');
    assert.ok(category.base, category.id + ' needs a base unit');
    assert.ok(category.units[category.base], category.id + ': base unit must exist in units');
    Object.keys(category.units).forEach((name) => {
      const unit = category.units[name];
      assert.ok(unit.symbol, `${category.id}/${name} needs a symbol`);
      if (category.kind === 'factor') {
        assert.equal(typeof unit.factor, 'number', `${category.id}/${name} needs a numeric factor`);
        assert.ok(unit.factor > 0, `${category.id}/${name} factor must be positive`);
      }
    });
  });
});

test('the checked-in JSON sources match the generated bundle', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'units-data.js'), 'utf8');
  U.list().forEach((category) => {
    const json = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'data', category.id + '.json'), 'utf8'),
    );
    assert.equal(json.title, category.title, category.id + ' title drifted');
    assert.deepEqual(json.units, category.units, category.id + ' units drifted — run npm run build:data');
    assert.ok(source.includes(category.id), category.id + ' missing from generated bundle');
  });
});

test('every category has usable defaults', () => {
  U.list().forEach((category) => {
    const [from, to] = U.defaultPair(category.id);
    assert.ok(from && to, category.id + ' default pair');
    assert.ok(category.units[from] && category.units[to], category.id + ' defaults must exist');
  });
});

/* ── factor conversions ───────────────────────────────────── */

test('length conversions', () => {
  closeTo(U.convert('length', 1, 'Meter', 'Foot'), 3.280839895);
  closeTo(U.convert('length', 1, 'Mile', 'Kilometer'), 1.609344);
  closeTo(U.convert('length', 100, 'Centimeter', 'Meter'), 1);
  closeTo(U.convert('length', 1, 'Inch', 'Millimeter'), 25.4);
  assert.equal(U.convert('length', 5, 'Meter', 'Meter'), 5);
});

test('mass, speed, volume, area and data conversions', () => {
  closeTo(U.convert('mass', 1, 'Kilogram', 'Pound'), 2.2046226218, 1e-8);
  closeTo(U.convert('speed', 100, 'Kilometer/hour', 'Mile/hour'), 62.1371192237, 1e-8);
  closeTo(U.convert('volume', 1, 'Gallon (US)', 'Liter'), 3.785411784);
  closeTo(U.convert('area', 1, 'Hectare', 'Square meter'), 10000);
  assert.equal(U.convert('data', 1, 'Gigabyte', 'Byte'), 1e9);
  assert.equal(U.convert('data', 1, 'Gibibyte', 'Byte'), 1073741824);
  assert.equal(U.convert('data', 1, 'Megabyte', 'Mebibyte'), 0.95367431640625);
  assert.equal(U.convert('time', 1, 'Hour', 'Second'), 3600);
});

test('temperature conversions', () => {
  assert.equal(U.convert('temp', 0, 'Celsius', 'Fahrenheit'), 32);
  assert.equal(U.convert('temp', 100, 'Celsius', 'Fahrenheit'), 212);
  assert.equal(U.convert('temp', -40, 'Celsius', 'Fahrenheit'), -40);
  closeTo(U.convert('temp', 0, 'Celsius', 'Kelvin'), 273.15);
  closeTo(U.convert('temp', 32, 'Fahrenheit', 'Celsius'), 0);
  closeTo(U.convert('temp', 300, 'Kelvin', 'Celsius'), 26.85);
});

test('unknown units are reported as NaN rather than throwing', () => {
  assert.ok(Number.isNaN(U.convert('length', 1, 'Meter', 'Parsec')));
  assert.ok(Number.isNaN(U.convert('nope', 1, 'Meter', 'Meter')));
  assert.ok(Number.isNaN(U.convert('length', 'abc', 'Meter', 'Meter')));
});

/* ── currency ─────────────────────────────────────────────── */

test('currency conversion uses USD-based rates', () => {
  const rates = { USD: 1, EUR: 0.9, INR: 80 };
  closeTo(U.convertCurrency(100, 'USD', 'EUR', rates), 90);
  closeTo(U.convertCurrency(90, 'EUR', 'USD', rates), 100);
  closeTo(U.convertCurrency(80, 'INR', 'EUR', rates), 0.9);
  assert.ok(Number.isNaN(U.convertCurrency(1, 'USD', 'XYZ', rates)));
});

test('currency names cover the published code list', () => {
  const codes = U.currencyCodes();
  assert.ok(codes.length >= 150, 'expected a large currency list');
  codes.forEach((code) => {
    assert.match(code, /^[A-Z]{3}$/, code + ' must be a 3-letter code');
    assert.ok(U.currencyName(code).length > 0);
  });
  assert.equal(U.currencyName('USD'), 'United States Dollar');
});

test('offline rate snapshot is usable', () => {
  const snapshot = U.snapshot();
  assert.equal(snapshot.estimated, true);
  assert.equal(snapshot.rates.USD, 1);
  assert.ok(Object.keys(snapshot.rates).length > 20);
  Object.values(snapshot.rates).forEach((rate) => assert.ok(rate > 0));
});

/* ── formatting & parsing ─────────────────────────────────── */

test('parse accepts grouped and plain numbers', () => {
  assert.equal(U.parse('1234.5'), 1234.5);
  assert.equal(U.parse('1,234.5'), 1234.5);
  assert.equal(U.parse('1 234.5'), 1234.5);
  assert.equal(U.parse(7), 7);
  assert.ok(Number.isNaN(U.parse('')));
});

test('search finds units across categories', () => {
  const names = U.search('meter').map((hit) => hit.name);
  assert.ok(names.includes('Meter'));
  assert.ok(names.includes('Square meter'));
  assert.ok(U.search('kg').some((hit) => hit.categoryId === 'mass'));
  assert.equal(U.search('').length, 0);
});
