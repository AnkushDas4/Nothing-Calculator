#!/usr/bin/env node
/**
 * scripts/build-data.js
 * ─────────────────────────────────────────────────────────────
 * Compiles the human-editable JSON in data/ into js/units-data.js,
 * which is what the app actually reads at runtime. This keeps the
 * app free of runtime fetches (so it works from file:// and inside
 * the Android WebView) with a single source of truth.
 *
 *   node scripts/build-data.js          # write js/units-data.js
 *   node scripts/build-data.js --check  # fail if it is out of date
 * ─────────────────────────────────────────────────────────────
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUT_FILE = path.join(ROOT, 'js', 'units-data.js');
const CURRENCY_FILE = path.join(DATA_DIR, 'currencies.json');
const SNAPSHOT_FILE = path.join(DATA_DIR, 'rates-snapshot.json');
const SKIP = new Set(['currencies.json', 'rates-snapshot.json']);

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function collectCategories() {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.json') && !SKIP.has(f))
    .sort();
  const categories = files.map((f) => {
    const json = readJSON(path.join(DATA_DIR, f));
    if (!json.id || !json.title || !json.units) throw new Error(`${f}: missing id/title/units`);
    if (!json.base || !json.units[json.base]) throw new Error(`${f}: base unit "${json.base}" missing from units`);
    return {
      id: json.id,
      title: json.title,
      order: typeof json.order === 'number' ? json.order : 99,
      kind: json.kind === 'temperature' ? 'temperature' : 'factor',
      base: json.base,
      units: json.units,
    };
  });
  categories.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  return categories;
}

function build() {
  const categories = collectCategories();
  const currencies = readJSON(CURRENCY_FILE);
  const snapshot = readJSON(SNAPSHOT_FILE);
  const payload = {
    generatedBy: 'scripts/build-data.js',
    categories,
    currencyNames: currencies,
    rateSnapshot: snapshot,
  };
  return (
    '/*!\n' +
    ' * N-Calc · units-data.js — AUTO-GENERATED, do not edit by hand.\n' +
    ' * Source of truth: data/*.json  ·  rebuild with: npm run build:data\n' +
    ' */\n' +
    '(function (root, factory) {\n' +
    "  if (typeof module === 'object' && module.exports) module.exports = factory();\n" +
    '  else root.NC_UNITS_DATA = factory();\n' +
    "})(typeof self !== 'undefined' ? self : this, function () {\n  return " +
    JSON.stringify(payload, null, 2).replace(/\n/g, '\n  ') +
    ';\n});\n'
  );
}

function main() {
  const next = build();
  const check = process.argv.includes('--check');
  const current = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf8') : '';
  if (check) {
    if (current !== next) {
      console.error('✖ js/units-data.js is out of date — run: npm run build:data');
      process.exit(1);
    }
    console.log('✔ js/units-data.js is up to date');
    return;
  }
  fs.writeFileSync(OUT_FILE, next);
  const categories = collectCategories();
  console.log(`✔ wrote js/units-data.js (${categories.length} categories, ${Object.keys(readJSON(CURRENCY_FILE)).length} currencies)`);
}

main();
