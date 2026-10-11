#!/usr/bin/env node
/**
 * scripts/release.js — cut a release from the command line.
 *
 *   node scripts/release.js                # tag the current version and push
 *   node scripts/release.js --dry-run      # show what would happen
 *   node scripts/release.js --version 3.1.0 --message "Faster keypad"
 *
 * Pushing a `v*` tag starts .github/workflows/android-release.yml,
 * which builds a signed APK and publishes the GitHub release.
 */
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function arg(name) {
  const index = process.argv.indexOf('--' + name);
  return index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')
    ? process.argv[index + 1]
    : null;
}

function sh(command) {
  return execSync(command, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const explicit = arg('version');
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

  if (explicit && explicit !== pkg.version) {
    const message = arg('message') || `Release v${explicit}`;
    console.log(`→ bumping version to ${explicit}`);
    if (!dryRun) {
      execSync(`node scripts/set-version.js ${explicit}`, { cwd: ROOT, stdio: 'inherit' });
      execSync(`git add package.json js/version.js android/app/build.gradle`, { cwd: ROOT, stdio: 'inherit' });
      execSync(`git commit -m ${JSON.stringify(message)}`, { cwd: ROOT, stdio: 'inherit' });
    }
  }

  const version = explicit || pkg.version;
  const tag = `v${version}`;

  console.log(`→ checking the repo is release ready (${tag})`);
  if (!dryRun) execSync('npm run check', { cwd: ROOT, stdio: 'inherit' });

  const existing = sh('git tag --list ' + tag);
  if (existing) {
    console.error(`✖ tag ${tag} already exists`);
    process.exit(1);
  }

  const branch = sh('git rev-parse --abbrev-ref HEAD');
  console.log(`→ branch: ${branch}`);
  console.log(`→ tag:    ${tag}`);
  console.log('   (pushing this tag triggers the Android release workflow)');

  if (dryRun) {
    console.log('· dry run — nothing was written');
    return;
  }

  execSync(`git tag -a ${tag} -m ${JSON.stringify('n-calc ' + tag)}`, { cwd: ROOT, stdio: 'inherit' });
  execSync(`git push origin ${branch}`, { cwd: ROOT, stdio: 'inherit' });
  execSync(`git push origin ${tag}`, { cwd: ROOT, stdio: 'inherit' });
  console.log(`✔ ${tag} pushed — watch the run at https://github.com/AnkushDas4/Nothing-Calculator/actions`);
}

main();
