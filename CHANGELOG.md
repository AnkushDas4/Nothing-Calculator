# Changelog

All notable changes to n-calc are documented here. This project follows
[Semantic Versioning](https://semver.org/) and releases are published from Git tags.

## [3.2.0] — 2026-10-11

### Fixed

- **Converter input field** now echoes what was actually typed instead of the parsed,
  formatted value. The decimal point, trailing zeros and any digit beyond the display
  precision used to be invisible, so the keypad looked hung: `1.50` showed as `1.5`, and
  with a *decimals* preference set, every digit typed past it was swallowed (`1.2345`
  stayed `1.23`). Only backspace or AC made the number change again.
- Long numbers in the value card now shrink to fit instead of being clipped
  (`UI.fitText`, re-applied after a rotation).
- The 15-digit input cap explains itself with a "Maximum 15 digits" toast instead of
  silently dropping keys.

## [3.1.0] — 2026-10-11

### Added

- **Orientation button** (`#layout-btn`) in the top bar: flips the app between the portrait
  and landscape layouts on tap, plus a *Settings → Screen layout* row (`Auto` / `Portrait` /
  `Landscape`). The choice is stored in `ncalc.layout` and applied before the first paint.
  `auto` still follows the device; a manual choice also works with rotation lock on.
- `NCUI.layout` (`mode` / `effective` / `set` / `toggle` / `watch` / `apply`) drives the new
  `<html data-layout>` / `<html data-layout-mode>` attributes that every landscape style
  keys off — the converter page shares the same preference.
- DOM tests for the layout flip, the manual override and the `fx` panel toggle.

### Changed

- **Portrait is now the basic keypad**: `DEG` and `fx` (`.sci-only`) and the scientific panel
  live in the landscape layout only, so the portrait screen keeps its 5×4 grid. The old
  `sciPortrait` preference is gone (it made the keypad overflow on short screens).
- The landscape layout is no longer driven by `@media (orientation: landscape)`: portrait-shaped
  windows stack the scientific panel above the keypad, wide windows park it beside the keypad.
- The top bar spans the full width in landscape instead of being squeezed into the 36% display
  column, and its buttons keep their tap size (`flex-shrink: 0`) while the brand name truncates.

### Fixed

- The `DEG` / `fx` chips are no longer squashed, clipped or hidden behind the keypad in
  landscape (the old left column was ~240px but the row needed ~330px).
- Scientific keys no longer collapse to text height in landscape — rows share the height
  (`minmax(0, 1fr)`, `height: 100%`) in both layouts.
- Landscape keeps the Android status-bar padding and respects the left/right display-cutout
  insets instead of resetting the page padding to `env(safe-area-inset-*)`.

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
