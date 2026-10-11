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

function checkAndroid() {
  const required = [
    'android/settings.gradle',
    'android/build.gradle',
    'android/variables.gradle',
    'android/gradle.properties',
    'android/gradlew',
    'android/gradle/wrapper/gradle-wrapper.jar',
    'android/gradle/wrapper/gradle-wrapper.properties',
    'android/app/build.gradle',
    'android/app/proguard-rules.pro',
    'android/app/src/main/AndroidManifest.xml',
    'android/app/src/main/assets/capacitor.config.json',
    'android/app/src/main/assets/public/index.html',
    'android/app/src/main/assets/public/converters.html',
    'android/app/src/main/java/com/ankushdas/ncalc/MainActivity.java',
    'android/app/src/main/res/values/styles.xml',
    'android/app/src/main/res/values/strings.xml',
    'android/app/src/main/res/layout/activity_main.xml',
    'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',
    'android/ci-debug.p12',
  ];
  required.forEach((file) => {
    if (!exists(file)) problems.push('android: missing ' + file);
  });

  if (exists('android/gradlew')) {
    const mode = fs.statSync(path.join(ROOT, 'android/gradlew')).mode;
    if (!(mode & 0o111)) problems.push('android/gradlew is not executable (chmod +x)');
  }

  if (exists('android/gradle/wrapper/gradle-wrapper.properties')) {
    const props = read('android/gradle/wrapper/gradle-wrapper.properties');
    if (!/distributionUrl=.*gradle-\d+\.\d+(\.\d+)?-(bin|all)\.zip/.test(props)) {
      problems.push('gradle-wrapper.properties has no usable distributionUrl');
    }
  }

  if (exists('android/app/build.gradle')) {
    const gradle = read('android/app/build.gradle');
    ['versionCode', 'versionName', 'applicationId'].forEach((key) => {
      if (!gradle.includes(key)) problems.push('android/app/build.gradle is missing ' + key);
    });
    if (gradle.includes("apply from: '../variables.gradle'") && !read('android/build.gradle').includes('variables.gradle')) {
      problems.push('variables.gradle is applied to the app project but read through rootProject.ext');
    }
  }

  if (exists('android/app/src/main/AndroidManifest.xml')) {
    const manifest = read('android/app/src/main/AndroidManifest.xml');
    if (!/android:name="\.MainActivity"/.test(manifest)) problems.push('manifest does not declare .MainActivity');
    if (!/VIBRATE/.test(manifest)) problems.push('manifest is missing the VIBRATE permission used by haptics');
  }

  // the packaged web assets must match the sources
  const assets = path.join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'public');
  ['index.html', 'converters.html', 'js/app.js', 'js/engine.js', 'css/base.css', 'math.js'].forEach((file) => {
    const source = path.join(ROOT, file);
    const copy = path.join(assets, file);
    if (!fs.existsSync(copy)) {
      problems.push('android assets: ' + file + ' was never synced (run npm run android:sync)');
      return;
    }
    if (!fs.readFileSync(source).equals(fs.readFileSync(copy))) {
      problems.push('android assets: ' + file + ' is out of date (run npm run android:sync)');
    }
  });
}

function checkData() {
  const generated = read('js/units-data.js');
  if (!/currencyNames/.test(generated) || !/categories/.test(generated)) {
    problems.push('js/units-data.js looks stale — run npm run build:data');
  }
}

[checkAssets, checkManifest, checkPages, checkVersion, checkData, checkAndroid].forEach((check) => check());

if (problems.length) {
  console.error('✖ validation failed');
  problems.forEach((problem) => console.error('  · ' + problem));
  process.exit(1);
}

notes.forEach((note) => console.log('  · ' + note));
console.log('✔ repo validation passed');
