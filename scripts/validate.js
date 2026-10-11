#!/usr/bin/env node
/**
 * scripts/validate.js — repo hygiene checks for a build-less web app.
 *
 * Verifies that every local asset referenced by the pages and stylesheets
 * actually exists, that the manifest icons are present, and that the pages
 * carry the metadata the Android shell and PWA install depend on.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAGES = ['index.html', 'converters.html'];
const problems = [];
const notes = [];

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

function exists(relative) {
  return fs.existsSync(path.join(ROOT, relative));
}

function checkAssets() {
  PAGES.forEach((page) => {
    const html = read(page);
    const refs = [];
    const patterns = [
      /<link[^>]+href="([^"]+)"/g,
      /<script[^>]+src="([^"]+)"/g,
      /<img[^>]+src="([^"]+)"/g,
    ];
    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(html))) refs.push(match[1]);
    });
    refs
      .filter((ref) => !/^(https?:)?\/\//.test(ref) && !ref.startsWith('data:'))
      .forEach((ref) => {
        const clean = ref.split('#')[0].split('?')[0];
        if (!exists(clean)) problems.push(`${page}: missing asset ${ref}`);
      });
    notes.push(`${page}: ${refs.length} external/local references checked`);
  });

  fs.readdirSync(path.join(ROOT, 'css'))
    .filter((file) => file.endsWith('.css'))
    .forEach((file) => {
      const css = read(path.join('css', file));
      const pattern = /url\((['"]?)([^'")]+)\1\)/g;
      let match;
      while ((match = pattern.exec(css))) {
        const ref = match[2];
        if (/^(https?:)?\/\//.test(ref) || ref.startsWith('data:')) continue;
        const target = path.join('css', ref);
        if (!exists(path.normalize(target))) problems.push(`css/${file}: missing asset ${ref}`);
      }
    });
}

function checkManifest() {
  if (!exists('manifest.webmanifest')) {
    problems.push('manifest.webmanifest is missing');
    return;
  }
  const manifest = JSON.parse(read('manifest.webmanifest'));
  ['name', 'short_name', 'start_url', 'display', 'icons'].forEach((key) => {
    if (!manifest[key]) problems.push(`manifest.webmanifest: missing "${key}"`);
  });
  (manifest.icons || []).forEach((icon) => {
    if (!exists(icon.src)) problems.push(`manifest.webmanifest: missing icon ${icon.src}`);
  });
  if (!manifest.icons.some((icon) => (icon.purpose || '').includes('maskable'))) {
    problems.push('manifest.webmanifest: no maskable icon (Android launcher will crop badly)');
  }
}

function checkPages() {
  PAGES.forEach((page) => {
    const html = read(page);
    [
      ['viewport meta', /name="viewport"/],
      ['theme-color meta', /name="theme-color"/],
      ['manifest link', /rel="manifest"/],
      ['icon link', /rel="icon"/],
      ['title', /<title>[^<]+<\/title>/],
    ].forEach(([label, pattern]) => {
      if (!pattern.test(html)) problems.push(`${page}: missing ${label}`);
    });
    if (/cdnjs\.cloudflare\.com/.test(html)) {
      problems.push(`${page}: still loads math.js from a CDN — vendor it locally for offline/Android use`);
    }
    if (/onclick="/.test(html)) {
      problems.push(`${page}: inline onclick handlers found — keep the CSP-friendly event wiring`);
    }
  });
}

function checkVersion() {
  const pkg = JSON.parse(read('package.json'));
  const versionFile = read('js/version.js');
  const match = /version:\s*'([^']+)'/.exec(versionFile);
  if (!match) {
    problems.push('js/version.js: could not read version');
    return;
  }
  if (match[1] !== pkg.version) {
    problems.push(`version mismatch: package.json ${pkg.version} vs js/version.js ${match[1]}`);
  }
}

function checkData() {
  const generated = read('js/units-data.js');
  if (!/currencyNames/.test(generated) || !/categories/.test(generated)) {
    problems.push('js/units-data.js looks stale — run npm run build:data');
  }
}

[checkAssets, checkManifest, checkPages, checkVersion, checkData].forEach((check) => check());

if (problems.length) {
  console.error('✖ validation failed');
  problems.forEach((problem) => console.error('  · ' + problem));
  process.exit(1);
}

notes.forEach((note) => console.log('  · ' + note));
console.log('✔ repo validation passed');
