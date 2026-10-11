#!/usr/bin/env node
/**
 * scripts/sync-android.js
 * ─────────────────────────────────────────────────────────────
 * Copies the web app into the Capacitor Android shell
 * (android/app/src/main/assets/public) — the equivalent of
 * `npx cap sync`, but with no Capacitor CLI install required so
 * CI can run it straight after `npm ci`.
 *
 *   node scripts/sync-android.js [--check]
 * ─────────────────────────────────────────────────────────────
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'public');

/** Files and folders that make up the packaged web app. */
const ENTRIES = [
  'index.html',
  'converters.html',
  'manifest.webmanifest',
  'font.otf',
  'css',
  'js',
  'icons',
  'data',
];

const check = process.argv.includes('--check');

function copyRecursive(source, destination, report) {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    fs.readdirSync(source).forEach((entry) => copyRecursive(path.join(source, entry), path.join(destination, entry), report));
    return;
  }
  const targetPath = path.join(TARGET, path.relative(ROOT, destination));
  const next = fs.readFileSync(source);
  const current = fs.existsSync(targetPath) ? fs.readFileSync(targetPath) : null;
  if (current && current.equals(next)) return;
  report.changed.push(path.relative(ROOT, targetPath));
  if (!check) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, next);
  }
}

function resolveMathjs() {
  // Capacitor serves pages from https://ncalc.local, so the CDN copy of
  // math.js must be replaced with a bundled one for offline use.
  const vendored = path.join(ROOT, 'vendor', 'mathjs', 'math.js');
  if (fs.existsSync(vendored)) return vendored;
  const checkedIn = path.join(ROOT, 'math.js');
  if (fs.existsSync(checkedIn)) return checkedIn;
  return null;
}

function main() {
  if (!fs.existsSync(path.join(ROOT, 'android'))) {
    console.error('✖ android/ project not found');
    process.exit(1);
  }
  const mathjs = resolveMathjs();
  if (!mathjs) {
    console.error('✖ no math.js bundle found (run npm run vendor:mathjs)');
    process.exit(1);
  }
  if (mathjs.endsWith(path.join('vendor', 'mathjs', 'math.js'))) {
    console.log('· using vendored math.js bundle');
  } else {
    console.log('· using repo math.js (mathjs 12 global build)');
  }

  const report = { changed: [] };
  if (!check) fs.rmSync(TARGET, { recursive: true, force: true });

  ENTRIES.forEach((entry) => {
    const source = path.join(ROOT, entry);
    if (!fs.existsSync(source)) {
      console.warn('· skipped missing ' + entry);
      return;
    }
    copyRecursive(source, source, report);
  });
  copyRecursive(mathjs, mathjs, report);

  if (check) {
    if (report.changed.length) {
      console.error('✖ android assets are out of date:');
      report.changed.forEach((file) => console.error('  · ' + file));
      process.exit(1);
    }
    console.log('✔ android assets are up to date');
    return;
  }

  fs.writeFileSync(
    path.join(TARGET, 'ncassets.json'),
    JSON.stringify({ syncedAt: new Date().toISOString(), files: report.changed.length }, null, 2) + '\n',
  );
  console.log(`✔ synced ${report.changed.length} assets → android/app/src/main/assets/public`);
}

main();
