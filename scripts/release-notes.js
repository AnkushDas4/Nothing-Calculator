#!/usr/bin/env node
/**
 * scripts/release-notes.js — prints the release body used by the
 * Android release workflow (and by `npm run release -- --dry-run`).
 *
 *   node scripts/release-notes.js <version> <tag> [apkSize] [apkSha] [signedWith]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const [version = '0.0.0', tag = 'v' + version, apkSize, apkSha, signedWith = 'ci'] = process.argv.slice(2);

const HIGHLIGHTS = [
  'Live result preview while you type, plus calculator-style percent maths (`100+10%` = 110)',
  'Scientific keypad: trig and inverse trig, log/ln, x², x³, xʸ, 1/x, |x|, n!, mod, π, e and ANS',
  'Degree/radian switching, configurable decimals, thousands separators, haptics and preview toggles',
  'Rotate button (and Settings) flips between the clean portrait keypad and the landscape layout with the scientific panel',
  'Converter with 161 currencies (offline fallback) and length, mass, speed, volume, area, data, time, temperature',
  'Keyboard support, tap-to-copy, searchable history, installable PWA',
  'Offline-first: everything ships inside the APK — no CDN, no telemetry',
];

function sizeLine(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return null;
  return (value / 1048576).toFixed(2) + ' MB';
}

function main() {
  const lines = [];
  lines.push(`**n-calc ${version}** — a dot-matrix calculator and unit converter inspired by Nothing OS.`);
  lines.push('');
  lines.push('### Install');
  lines.push('');
  lines.push(`1. Download \`n-calc-${version}.apk\` below (or the stable \`n-calc-release.apk\` link).`);
  lines.push('2. Open it on your Android device and allow installs from this source.');
  lines.push('3. Android 7.0 (API 24) or newer.');
  lines.push('');
  lines.push('### What’s new');
  lines.push('');
  HIGHLIGHTS.forEach((item) => lines.push('- ' + item));
  lines.push('');

  const changelog = path.join(ROOT, 'CHANGELOG.md');
  if (fs.existsSync(changelog)) {
    const text = fs.readFileSync(changelog, 'utf8');
    const section = new RegExp(`^##\\s*\\[?${version.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}`, 'm').exec(text);
    if (section) {
      const rest = text.slice(section.index);
      const next = rest.slice(1).search(/^##\s/m);
      const block = (next >= 0 ? rest.slice(0, next + 1) : rest).trim();
      lines.push('### Changelog');
      lines.push('');
      lines.push(block.split('\n').slice(1).join('\n').trim());
      lines.push('');
    }
  }

  lines.push('### Build details');
  lines.push('');
  lines.push(`- Tag: \`${tag}\``);
  lines.push(`- Version: \`${version}\``);
  const size = sizeLine(apkSize);
  if (size) lines.push(`- APK size: ${size}`);
  if (apkSha) lines.push(`- SHA-256: \`${apkSha}\``);
  lines.push(`- Signing key: ${signedWith === 'release' ? 'repository release key' : 'shared CI key (see README › Releasing)'}`);
  lines.push('- Built from source by GitHub Actions: `npm test` → `node scripts/sync-android.js` → `./gradlew assembleRelease`');
  lines.push('');
  lines.push('> Installing over an older build keeps your history and settings.');
  lines.push('');
  lines.push('Made with ❤️ · MIT licensed');
  process.stdout.write(lines.join('\n') + '\n');
}

main();
