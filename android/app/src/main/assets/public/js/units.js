/*!
 * N-Calc · units.js
 * ─────────────────────────────────────────────────────────────
 * Unit catalogue + conversion maths. Pure logic (DOM-free) so it
 * can be unit tested in Node; the data comes from the generated
 * js/units-data.js.
 * ─────────────────────────────────────────────────────────────
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./units-data.js'), require('./engine.js'));
  } else {
    root.NCUnits = factory(root.NC_UNITS_DATA, root.NCEngine);
  }
})(typeof self !== 'undefined' ? self : this, function (data, engine) {
  'use strict';

  const categories = (data && data.categories) || [];
  const currencyNames = (data && data.currencyNames) || {};
  const rateSnapshot = (data && data.rateSnapshot) || { rates: {} };

  const byId = {};
  categories.forEach((category) => {
    byId[category.id] = category;
  });

  function list() {
    return categories.slice();
  }

  function get(id) {
    return byId[id] || null;
  }

  function unitNames(id) {
    const category = byId[id];
    if (!category) return [];
    return Object.keys(category.units);
  }

  function unit(id, name) {
    const category = byId[id];
    if (!category) return null;
    return category.units[name] || null;
  }

  function symbol(id, name) {
    const u = unit(id, name);
    return (u && u.symbol) || name || '';
  }

  /** Sensible default pair for a category. */
  function defaultPair(id) {
    const names = unitNames(id);
    if (!names.length) return [null, null];
    const preferred = {
      length: ['Meter', 'Foot'],
      mass: ['Kilogram', 'Pound'],
      speed: ['Kilometer/hour', 'Mile/hour'],
      volume: ['Liter', 'Gallon (US)'],
      area: ['Square meter', 'Square foot'],
      data: ['Megabyte', 'Mebibyte'],
      time: ['Hour', 'Minute'],
      temp: ['Celsius', 'Fahrenheit'],
    }[id];
    if (preferred && names.indexOf(preferred[0]) >= 0 && names.indexOf(preferred[1]) >= 0) return preferred;
    return [names[0], names[1] || names[0]];
  }

  /* ── temperature helpers ──────────────────────────────────── */

  function toCelsius(value, from) {
    if (from === 'Celsius') return value;
    if (from === 'Fahrenheit') return ((value - 32) * 5) / 9;
    if (from === 'Kelvin') return value - 273.15;
    return value;
  }

  function fromCelsius(celsius, to) {
    if (to === 'Celsius') return celsius;
    if (to === 'Fahrenheit') return (celsius * 9) / 5 + 32;
    if (to === 'Kelvin') return celsius + 273.15;
    return celsius;
  }

  /* ── conversion ───────────────────────────────────────────── */

  /**
   * convert('length', 1, 'Meter', 'Foot') → 3.280839895013123
   * convert('temp', 100, 'Celsius', 'Fahrenheit') → 212
   */
  function convert(id, amount, from, to) {
    const category = byId[id];
    const value = typeof amount === 'number' ? amount : parseFloat(amount);
    if (!category || Number.isNaN(value)) return NaN;
    if (!category.units[from] || !category.units[to]) return NaN;
    if (from === to) return value;
    if (category.kind === 'temperature') return fromCelsius(toCelsius(value, from), to);
    const ratio = category.units[from].factor / category.units[to].factor;
    return value * ratio;
  }

  /** Currency conversion from a rates map (all rates are per 1 USD). */
  function convertCurrency(amount, from, to, rates) {
    const value = typeof amount === 'number' ? amount : parseFloat(amount);
    if (!rates || !rates[from] || !rates[to] || Number.isNaN(value)) return NaN;
    return (value / rates[from]) * rates[to];
  }

  function currencyName(code) {
    return currencyNames[code] || code;
  }

  function currencyCodes() {
    return Object.keys(currencyNames).sort();
  }

  function snapshot() {
    return rateSnapshot;
  }

  /** Search units across every category (used by the converter picker). */
  function search(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    const results = [];
    categories.forEach((category) => {
      Object.keys(category.units).forEach((name) => {
        const symbolText = category.units[name].symbol || '';
        const haystack = (name + ' ' + symbolText + ' ' + category.title).toLowerCase();
        if (haystack.indexOf(q) < 0) return;
        let score = 3;
        if (name.toLowerCase().indexOf(q) === 0) score = 0;
        else if (name.toLowerCase().includes(q)) score = 1;
        else if (String(symbolText).toLowerCase() === q) score = 0;
        else if (haystack.indexOf(q) >= 0) score = 4;
        results.push({ categoryId: category.id, categoryTitle: category.title, name, symbol: symbolText, score });
      });
    });
    return results.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name)).slice(0, 40);
  }

  function format(value, opts) {
    if (!engine) return String(value);
    return engine.formatNumber(value, opts);
  }

  /** Parse "1,234.5" / "1 234,5" style input into a number. */
  function parse(text) {
    if (typeof text === 'number') return text;
    const cleaned = String(text === null || text === undefined ? '' : text)
      .replace(/[\s\u00A0]/g, '')
      .replace(/,(?=\d{3}\b)/g, '');
    return parseFloat(cleaned);
  }

  return {
    list,
    get,
    unitNames,
    unit,
    symbol,
    defaultPair,
    convert,
    convertCurrency,
    currencyName,
    currencyCodes,
    snapshot,
    search,
    format,
    parse,
    DATA: data,
  };
});
