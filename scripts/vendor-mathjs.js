#!/usr/bin/env node
/**
 * scripts/vendor-mathjs.js
 * ─────────────────────────────────────────────────────────────
 * Builds a self-contained math.js UMD bundle (no CDN, no eval
 * restrictions) into vendor/mathjs/math.js.
 *
 * The web build keeps using the repo's math.js; the Android shell
 * ships the vendored bundle because Capacitor serves pages from
 * https://ncalc.local and a remote CDN would break offline use.
 *
 *   node scripts/vendor-mathjs.js            # uses npx esbuild
 *   node scripts/vendor-mathjs.js --keep-src # keep the extracted source
 * ─────────────────────────────────────────────────────────────
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const WORK = path.join(ROOT, '.cache', 'mathjs-src');
const OUT_DIR = path.join(ROOT, 'vendor', 'mathjs');
const OUT_FILE = path.join(OUT_DIR, 'math.js');
const MATHJS_VERSION = '^12.4.0';

function run(command, args, options) {
  execFileSync(command, args, Object.assign({ stdio: 'inherit', cwd: ROOT }, options || {}));
}

function main() {
  fs.mkdirSync(WORK, { recursive: true });
  if (!fs.existsSync(path.join(WORK, 'node_modules', 'mathjs'))) {
    console.log('→ installing mathjs + esbuild into .cache/mathjs-src');
    fs.writeFileSync(
      path.join(WORK, 'package.json'),
      JSON.stringify({ name: 'mathjs-build', private: true, version: '1.0.0' }, null, 2),
    );
    run('npm', ['install', '--no-audit', '--no-fund', 'mathjs@' + MATHJS_VERSION, 'esbuild@^0.24.0'], { cwd: WORK });
  }

  const entry = path.join(WORK, 'entry.js');
  fs.writeFileSync(
    entry,
    "const math = require('mathjs');\nmodule.exports = math;\n",
  );

  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('→ bundling to vendor/mathjs/math.js');
  run(path.join(WORK, 'node_modules', '.bin', 'esbuild'), [
    entry,
    '--bundle',
    '--minify',
    '--format=iife',
    '--global-name=math',
    '--outfile=' + OUT_FILE,
    '--platform=browser',
    '--target=es2018',
  ]);

  const size = fs.statSync(OUT_FILE).size;
  console.log(`✔ vendor/mathjs/math.js (${(size / 1024).toFixed(1)} kB)`);
}

main();
