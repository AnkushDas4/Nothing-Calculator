<div align="center">

<img src="icons/favicon.svg" width="96" height="96" alt="n-calc icon" />

# n-calc

**A dot-matrix calculator, converter and Android app inspired by Nothing OS.**

[![CI](https://github.com/AnkushDas4/Nothing-Calculator/actions/workflows/ci.yml/badge.svg)](https://github.com/AnkushDas4/Nothing-Calculator/actions/workflows/ci.yml)
[![Android Release](https://github.com/AnkushDas4/Nothing-Calculator/actions/workflows/android-release.yml/badge.svg)](https://github.com/AnkushDas4/Nothing-Calculator/actions/workflows/android-release.yml)
[![Latest release](https://img.shields.io/github/v/release/AnkushDas4/Nothing-Calculator?sort=semver)](https://github.com/AnkushDas4/Nothing-Calculator/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[Install the APK](https://github.com/AnkushDas4/Nothing-Calculator/releases/latest) ·
[Run it locally](#run-it-locally) ·
[Keyboard shortcuts](#keyboard-shortcuts) ·
[Releasing](#releasing)

</div>

---

## What it is

n-calc is a single-page web app wrapped in a thin Android WebView shell. It keeps the
Nothing OS look — dot-matrix type, monochrome keypad, one red accent — and pairs it with
the arithmetic behaviour people expect from a real calculator. Everything (fonts, icons,
math library, conversion tables) ships inside the APK, so it works offline.

|  |  |
| --- | --- |
| **Calculator** | Live preview, contextual percent, scientific functions, DEG/RAD, ANS, history |
| **Converter** | 8 unit families + 161 currencies with live rates and an offline fallback |
| **Android** | `assembleRelease` APK, adaptive icon, splash screen, haptics, back-button support |
| **Web** | Installable PWA, service-worker offline cache, keyboard-driven |

## Features

### Calculator

- **Live result preview** — the answer appears under the expression while you type.
- **Contextual percent** — `100+10%` → `110`, `100-10%` → `90`, `100*10%` → `10`, `80/10%` → `800`.
- **Scientific keypad** — `sin cos tan`, `sin⁻¹ cos⁻¹ tan⁻¹`, `log`, `ln`, `√`, `x²`, `x³`, `xʸ`, `1/x`, `|x|`, `n!`, `mod`, `π`, `e`.
- **DEG / RAD toggle** right in the top bar; trigonometry is degree-based by default.
- **Two layouts, one tap** — the rotate button in the top bar flips between the clean portrait
  keypad and the landscape layout with the scientific panel and the DEG / fx chips. `Auto`
  (the default) follows the device, `Portrait` / `Landscape` override it, which also covers
  phones with rotation lock turned on. Both choices live in *Settings → Screen layout*.
- **ANS** recalls the last result, and history entries can be tapped to reuse them.
- **Smart editing** — implicit multiplication (`2(3+4)`), unary minus, `√` wraps the trailing operand, backspace deletes whole tokens (`sin(` in one tap).
- **Errors are messages, not crashes** — *Cannot divide by zero*, *Unclosed parenthesis*, *Not a real number*.

### Converter

- Currency (161 codes) with names and flags, a searchable picker and the current rate shown under the values.
- Live rates from [`@fawazahmed0/currency-api`](https://github.com/fawazahmed0/exchange-api) with `frankfurter.app` as a second source, cached for 12 h, plus a bundled offline estimate so the page still works with no network.
- Unit families: Length, Mass, Speed, Volume, Area, Data, Time, Temperature.
- Search finds units across **every** family (`mile`, `kg`, `°C` …) — picking a foreign unit switches the whole page to that family.
- Swap button, `00` key, sign flip and tap-to-copy result.

### Platform

- Adaptive launcher icon (monochrome layer included) and a Nothing-style splash screen.
- Haptics on every key via `navigator.vibrate` (toggleable).
- Theme: auto (follows the system), dark or light — no flash on load.
- Orientation: the layout follows the device, and the rotate button (or *Settings → Screen
  layout*) pins it to portrait or landscape, so the scientific keypad stays reachable on
  phones with rotation lock on. The converter page honours the same choice.
- Keyboard support on the web, and the Android back button closes sheets / returns to the calculator first.
- Offline: service worker on the web, bundled assets in the APK.

## Install

### Android (APK)

1. Open the [latest release](https://github.com/AnkushDas4/Nothing-Calculator/releases/latest).
2. Download `n-calc-<version>.apk` (or the rolling `n-calc-release.apk`).
3. Allow installing from this source when Android asks.
4. Android 7.0 (API 24) or newer.

> Coming from the old `v2.2.0` build? That APK was signed with a different key, so Android
> may refuse the update (`App not installed`). Uninstall the old version once, then install
> the new one.

### Web / PWA

Open the deployed copy (or any static host of the repo) and use *Add to home screen* —
the service worker caches the app for offline use. A plain double-click on `index.html`
also works: no build step, no bundler, no runtime fetch of local assets.

## Run it locally

```bash
git clone https://github.com/AnkushDas4/Nothing-Calculator.git
cd Nothing-Calculator
npm ci            # dev-only: jsdom for the DOM tests
npm run serve     # http://localhost:8080
```

| script | what it does |
| --- | --- |
| `npm run serve` | static preview server (bind `0.0.0.0` by default, `--port`) |
| `npm test` | engine, catalogue and jsdom DOM tests |
| `npm run validate` | checks every referenced asset, manifest, meta tags and versions |
| `npm run check` | `check:data` + `validate` + `test` — what CI runs |
| `npm run build:data` | regenerates `js/units-data.js` from `data/*.json` |
| `npm run build:icons` | regenerates PWA + Android icons (`python3`, stdlib only) |
| `npm run android:sync` | copies the web app into the Android shell |
| `npm run version:set -- 3.1.0` | syncs version across web, `package.json` and Gradle |
| `npm run release` | tags the current version and pushes it (triggers the release workflow) |
| `npm run vendor:mathjs` | optional: bundles math.js for strict-CSP hosts |

## Keyboard shortcuts

| key | action | key | action |
| --- | --- | --- | --- |
| `0-9` | digits | `Enter` / `=` | evaluate |
| `+ - * /` | operators | `^` | power |
| `.` `,` | decimal point | `(` `)` | parentheses |
| `%` | percent | `!` | factorial |
| `Backspace` | delete | `Delete` / `Esc` | clear |
| `p` | π | `e` | Euler's number |
| `r` | √ | `s` | ± sign |
| `c` | copy display | | |

## Project layout

```
index.html              calculator page (markup + wiring hooks)
converters.html         converter page
math.js                 math.js 12 UMD build (no CDN, works offline)
css/base.css            design tokens, keys, sheets, dialogs, toasts
css/calculator.css      calculator layout (portrait + landscape split screen)
css/converters.css      converter layout
js/engine.js            pure expression engine: tokeniser, percent rules, evaluator, formatter
js/units.js             unit catalogue + conversion maths
js/units-data.js        GENERATED from data/*.json — do not edit
js/ui.js                shared runtime: prefs, theme, sheets, toasts, clipboard, keyboard
js/app.js               calculator controller
js/converters.js        converter controller
scripts/*.js|py         build, validation, sync and release tooling
tests/*.test.js         node:test suites (engine, units, jsdom UI smoke tests)
android/                native shell (see below)
.github/workflows/      CI + Android release pipelines
```

### Android shell

`android/` is a plain Android application module (no Capacitor runtime required):

- `MainActivity` hosts a `WebView` and serves `assets/public` through
  `androidx.webkit.WebViewAssetLoader` on `https://ncalc.local`, so `localStorage`,
  service workers and `fetch()` behave exactly like on the web.
- Bundled assets are produced by `npm run android:sync` and **committed**, which keeps
  the project buildable in Android Studio without running any Node tooling.
- Version name/code live in `android/app/build.gradle` and are kept in sync by
  `npm run version:set`.

```bash
cd android && ./gradlew assembleDebug     # debug APK
cd android && ./gradlew assembleRelease   # release APK (needs a keystore, see below)
```

## Releasing

### How the pipeline works

```
git tag v3.1.0  →  push  →  .github/workflows/android-release.yml
                             ├─ npm ci · validate · test
                             ├─ node scripts/sync-android.js
                             ├─ ./gradlew assembleRelease   (signed)
                             ├─ apksigner verify + sha256
                             └─ GitHub Release with the APK attached
```

`npm run release` does the tagging for you:

```bash
npm run version:set -- 3.1.0        # bump everything
git commit -am "Release v3.1.0"
npm run release                     # tags + pushes → workflow publishes
```

### Signing

The build reads `android/keystore.properties` when it exists; in CI it is written from
repository secrets. Add these under **Settings → Secrets and variables → Actions**:

| secret | value |
| --- | --- |
| `RELEASE_KEYSTORE_BASE64` | `base64 -w0 your-release.p12` |
| `RELEASE_KEYSTORE_PASSWORD` | keystore password |
| `RELEASE_KEY_ALIAS` | key alias |
| `RELEASE_KEY_PASSWORD` | key password |

Create a key if you do not have one:

```bash
keytool -genkeypair -v -keystore release.p12 -storetype PKCS12 \
  -alias ncalc -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 release.p12    # → RELEASE_KEYSTORE_BASE64
```

Without those secrets the workflow still completes, but signs with the **public CI key**
(`android/ci-debug.p12`, alias `androiddebugkey`, password `android`). That key exists so
test builds can update each other — never publish anything signed with it to a store.

You can also trigger the workflow manually from the Actions tab
(*Android Release → Run workflow*, optionally with a tag and with publishing switched off).

### Versioning

Semantic versioning. `versionCode` is `major*10000 + minor*100 + patch` locally and each CI
release stamps the workflow run number, so builds always increase monotonically.

## Credits

- Design inspiration: [Nothing OS](https://nothing.tech) — dot-matrix typography and the red accent.
- Original concept: [Sednium](https://github.com/Sednium).
- Arithmetic: [math.js](https://mathjs.org) (MIT, vendored).
- Currency names: ISO 4217 list in `data/currencies.json`; rates by
  [fawazahmed0/exchange-api](https://github.com/fawazahmed0/exchange-api) and
  [frankfurter.app](https://frankfurter.app).

## License

[MIT](LICENSE) — do whatever you like, attribution appreciated.

Made with ❤️
