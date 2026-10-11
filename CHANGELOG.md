# Changelog

All notable changes to n-calc are documented here. This project follows
[Semantic Versioning](https://semver.org/) and releases are published from Git tags.

## [3.0.0] — 2026-10-11

The first release with a real engine, a converter that works offline and an automated
Android pipeline.

### Added

- **Expression engine** (`js/engine.js`): tokeniser, contextual percent rules, implicit
  multiplication (`2(3+4)`), factorial, powers, `mod`, DEG/RAD-aware trigonometry and
  human-readable errors instead of exceptions.
- **Live preview** of the result while typing, plus an `ANS` key and tap-to-reuse history.
- **Scientific keypad** with 20 keys: trig, inverse trig, `log`, `ln`, `√`, `x²`, `x³`,
  `xʸ`, `1/x`, `|x|`, `n!`, `mod`, `%`, `π`, `e`, `ANS`.
- **Settings sheet**: theme (auto/dark/light), angle unit, preview, thousands separators,
  decimals, haptics, reset.
- **Converter rebuild**: category tabs, searchable picker across all families, swap,
  `00` key, sign flip, tap-to-copy result, per-category memory.
- **Currency handling**: 161 currencies with names and flags, two live rate sources,
  12-hour cache, offline snapshot fallback and an honest "offline estimate" badge.
- **Unit families**: length, mass, speed, volume, area, data, time, temperature — with
  symbols, sensible default pairs and correct temperature maths.
- **PWA support**: web app manifest, generated icons, service worker with offline cache.
- **Android app**: WebView shell with `WebViewAssetLoader`, adaptive + monochrome launcher
  icons, splash screen, haptics, edge-to-edge safe layout and hardware back-button support.
- **Automation**: `ci.yml` (validate, test, debug APK) and `android-release.yml`
  (signed `assembleRelease` APK published to GitHub Releases), plus `npm run release`
  for local tagging.
- **Tooling**: `npm run validate`, `npm run build:data`, `npm run build:icons`,
  `npm run android:sync`, `npm run version:set`, `npm run serve`.
- **Tests**: 50+ assertions across engine, catalogue and jsdom DOM smoke tests.

### Changed

- Split the monolithic inline styles/scripts into `css/` and `js/` modules; pages are now
  CSP friendly (no inline handlers).
- Included math.js locally instead of loading it from a CDN, so the app works offline.
- Reworked the display: pretty glyphs (`×`, `÷`, `−`, `π`, `√`), grouped digits, auto-fit
  font size and a distinct error state.
- Landscape now shows the scientific panel next to the keypad instead of hiding rows.
- Rebuilt the keypad for pointer, touch and keyboard input with proper accessibility labels.
- Modernised the Android project: AGP 8.13, Gradle 8.14.3, `compileSdk`/`targetSdk` 36,
  `minSdk` 24, Java 17, R8 shrinking.

### Fixed

- Percentages no longer produce nonsense (`100+10%` used to be `100.1`).
- `xⁿ` and `1/x` no longer inject a bare `^` that made the expression invalid.
- Backspace removes a whole function token instead of leaving `sin(` behind.
- Dividing by zero reports *Cannot divide by zero* instead of `Infinity`.
- History entries are stored as structured data, so expressions containing `=` or symbols
  no longer corrupt the list.

### Removed

- `script.js` and `style.css` (replaced by the modules above), the CDN dependency and the
  duplicated unit tables that drifted between the two pages.

## [2.2.0] — 2026-02-15

- Last pre-rewrite build: `N-Calc-release.apk` attached to the release, dark/light theme,
  swipe-down sheets, basic currency and unit conversion.
