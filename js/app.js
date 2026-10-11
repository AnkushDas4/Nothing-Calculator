/*!
 * N-Calc · app.js — calculator page controller
 */
(function () {
  'use strict';

  const E = window.NCEngine;
  const UI = window.NCUI;

  if (!E || !UI) return;

  /* ── state ────────────────────────────────────────────────── */

  const buffer = new E.InputBuffer();
  let lastAnswer = null;
  let evaluated = null; // { value, expr } — set right after "="
  let errorMsg = null;
  let history = [];
  let landscapeSci = true; // ephemeral: scientific keys while in the landscape layout

  const HISTORY_KEY = 'history';
  const HISTORY_LIMIT = 120;

  const VALUE_ACTIONS = ['digit', 'decimal', 'func', 'constant', 'ans', 'paren'];

  /* ── elements ─────────────────────────────────────────────── */

  const $ = (id) => document.getElementById(id);
  const el = {
    keypad: $('keypad'),
    main: $('main-line'),
    secondary: $('secondary-line'),
    display: $('display'),
    ansChip: $('ans-chip'),
    sciPanel: $('sci-panel'),
    sciChip: $('sci-chip'),
    angleChip: $('angle-chip'),
    layoutBtn: $('layout-btn'),
    layoutSeg: $('layout-seg'),
    converterBtn: $('converter-btn'),
    historyBtn: $('history-btn'),
    settingsBtn: $('settings-btn'),
    historyList: $('history-list'),
    historyClear: $('history-clear'),
    historyCopyAll: $('history-copy-all'),
    themeSeg: $('theme-seg'),
    angleSeg: $('angle-seg'),
    prefPreview: $('pref-preview'),
    prefGrouping: $('pref-grouping'),
    prefHaptics: $('pref-haptics'),
    prefDecimals: $('pref-decimals'),
    prefReset: $('pref-reset'),
    aboutVersion: $('about-version'),
  };

  /* ── formatting helpers ───────────────────────────────────── */

  function formatOptions() {
    const prefs = UI.prefs.all;
    const decimals = prefs.decimals === 'auto' ? undefined : Number(prefs.decimals);
    return { grouping: prefs.grouping !== false, decimals };
  }

  function format(value) {
    return E.formatNumber(value, formatOptions());
  }

  /** Group the integer part of every number for the typed expression. */
  function prettyGrouped(text) {
    const source = String(text || '');
    if (UI.prefs.all.grouping === false) return E.pretty(source);
    return E.pretty(UI.groupDigits(source));
  }

  function angleOptions() {
    return { angleMode: UI.prefs.all.angle === 'rad' ? 'rad' : 'deg' };
  }

  /* ── rendering ────────────────────────────────────────────── */

  function render() {
    let mainText = '0';
    let secondary = '';
    let secondaryAccent = false;
    el.main.classList.remove('error');

    if (errorMsg) {
      mainText = errorMsg;
      el.main.classList.add('error');
      if (buffer.isEmpty() === false) secondary = E.pretty(buffer.text) + ' =';
    } else if (evaluated) {
      mainText = format(evaluated.value);
      secondary = E.pretty(evaluated.expr) + ' =';
    } else if (!buffer.isEmpty()) {
      mainText = prettyGrouped(buffer.text);
      if (UI.prefs.all.preview !== false) {
        const preview = E.preview(buffer.text, angleOptions());
        if (preview !== null) {
          secondary = format(preview);
          secondaryAccent = true;
        }
      }
    }

    el.main.textContent = mainText;
    el.secondary.textContent = secondary ? (secondaryAccent ? '= ' + secondary : secondary) : '\u00A0';
    el.secondary.classList.toggle('accent', secondaryAccent);

    if (lastAnswer === null) {
      el.ansChip.hidden = true;
    } else {
      el.ansChip.hidden = false;
      el.ansChip.textContent = 'ANS ' + format(lastAnswer);
    }

    requestAnimationFrame(() => {
      UI.fitText(el.main, { max: errorMsg ? 34 : 62, min: 15, maxLines: 2 });
      UI.fitText(el.secondary, { max: 15, min: 10, maxLines: 1 });
    });
  }

  /* ── actions ──────────────────────────────────────────────── */

  function clearAll() {
    buffer.clear();
    evaluated = null;
    errorMsg = null;
  }

  function backspace() {
    if (errorMsg) {
      errorMsg = null;
      buffer.clear();
      return;
    }
    if (evaluated) {
      evaluated = null;
      buffer.clear();
      return;
    }
    buffer.backspace();
  }

  function applyAction(action, value) {
    switch (action) {
      case 'digit':
        buffer.digit(value);
        break;
      case 'decimal':
        buffer.dot();
        break;
      case 'operator':
        buffer.operator(value);
        break;
      case 'paren':
        buffer.paren();
        break;
      case 'percent':
        buffer.percent();
        break;
      case 'factorial':
        buffer.factorial();
        break;
      case 'power':
        buffer.power();
        break;
      case 'mod':
        buffer.mod();
        break;
      case 'constant':
        buffer.constant(value);
        break;
      case 'func':
        buffer.func(value);
        break;
      case 'wrap':
        buffer.wrapLast(value);
        break;
      case 'square':
        buffer.suffix('^2');
        break;
      case 'cube':
        buffer.suffix('^3');
        break;
      case 'reciprocal':
        buffer.suffix('^(-1)');
        break;
      case 'sign':
        buffer.toggleSign();
        break;
      case 'ans':
        if (lastAnswer !== null) buffer.number(lastAnswer);
        break;
      default:
        break;
    }
  }

  function handleAction(action, value) {
    if (action === 'copy') {
      copyCurrent();
      return;
    }
    if (action === 'clear') {
      UI.haptics.tap();
      clearAll();
      render();
      return;
    }
    if (action === 'equals') {
      UI.haptics.tap(12);
      evaluate();
      render();
      return;
    }
    if (action === 'backspace') {
      UI.haptics.tap();
      backspace();
      render();
      return;
    }

    UI.haptics.tap();

    // A finished calculation becomes the start of the next one.
    if (evaluated) {
      if (VALUE_ACTIONS.indexOf(action) >= 0) buffer.clear();
      else buffer.number(evaluated.value);
      evaluated = null;
    } else if (errorMsg && VALUE_ACTIONS.indexOf(action) >= 0) {
      buffer.clear();
    }
    errorMsg = null;

    applyAction(action, value);
    render();
  }

  function evaluate() {
    const expr = buffer.text;
    if (!expr.trim()) return;
    const res = E.evaluate(expr, angleOptions());
    if (res.ok) {
      lastAnswer = res.value;
      evaluated = { value: res.value, expr: expr };
      buffer.clear();
      errorMsg = null;
      pushHistory({ expr: expr, result: res.value, ts: Date.now() });
    } else {
      errorMsg = res.error;
      evaluated = null;
    }
  }

  /* ── history ──────────────────────────────────────────────── */

  function loadHistory() {
    const stored = UI.store.get(HISTORY_KEY, []);
    history = Array.isArray(stored) ? stored.filter((item) => item && typeof item.expr === 'string') : [];
  }

  function saveHistory() {
    UI.store.set(HISTORY_KEY, history.slice(-HISTORY_LIMIT));
  }

  function pushHistory(entry) {
    history.push(entry);
    if (history.length > HISTORY_LIMIT) history = history.slice(-HISTORY_LIMIT);
    saveHistory();
    renderHistory();
  }

  function renderHistory() {
    if (!el.historyList) return;
    el.historyList.textContent = '';
    if (!history.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No calculations yet';
      el.historyList.appendChild(empty);
      return;
    }
    history
      .slice()
      .reverse()
      .forEach((entry) => {
        const index = history.indexOf(entry);
        const item = document.createElement('div');
        item.className = 'history-item';

        const text = document.createElement('div');
        text.className = 'history-text';

        const expr = document.createElement('div');
        expr.className = 'history-expr';
        expr.textContent = E.pretty(entry.expr);

        const result = document.createElement('div');
        result.className = 'history-res';
        result.textContent = format(entry.result);

        const time = document.createElement('div');
        time.className = 'history-time';
        time.textContent = UI.relativeTime(entry.ts || Date.now());

        text.appendChild(expr);
        text.appendChild(result);
        text.appendChild(time);
        text.addEventListener('click', () => {
          UI.haptics.tap();
          evaluated = null;
          errorMsg = null;
          buffer.clear();
          buffer.number(entry.result);
          UI.sheets.closeAll();
          render();
          UI.toast('Loaded ' + format(entry.result));
        });

        const del = document.createElement('button');
        del.className = 'history-del';
        del.type = 'button';
        del.setAttribute('aria-label', 'Delete entry');
        del.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';
        del.addEventListener('click', (event) => {
          event.stopPropagation();
          UI.haptics.tap();
          history.splice(index, 1);
          saveHistory();
          renderHistory();
        });

        item.appendChild(text);
        item.appendChild(del);
        el.historyList.appendChild(item);
      });
  }

  async function clearHistory() {
    const ok = await UI.confirm({
      title: 'Clear history?',
      message: 'This removes every saved calculation from this device.',
      confirmText: 'Clear',
      danger: true,
    });
    if (!ok) return;
    history = [];
    saveHistory();
    renderHistory();
    UI.toast('History cleared');
  }

  function copyCurrent() {
    const text = evaluated ? format(evaluated.value) : el.main.textContent;
    UI.copy(text).then((ok) => UI.toast(ok ? 'Copied ' + text : 'Could not copy', { type: ok ? 'success' : 'error' }));
  }

  function copyAllHistory() {
    if (!history.length) {
      UI.toast('Nothing to copy');
      return;
    }
    const text = history
      .map((entry) => E.pretty(entry.expr) + ' = ' + format(entry.result))
      .join('\n');
    UI.copy(text).then((ok) => UI.toast(ok ? 'Copied ' + history.length + ' entries' : 'Could not copy', {
      type: ok ? 'success' : 'error',
    }));
  }

  /* ── keypad wiring ────────────────────────────────────────── */

  function onKeypadClick(event) {
    const key = event.target.closest('.key');
    if (!key || !el.keypad.contains(key)) return;
    handleAction(key.dataset.action, key.dataset.value);
  }

  const KEY_SELECTOR = {
    digit: (value) => '.key[data-action="digit"][data-value="' + value + '"]',
    operator: (value) => '.key[data-action="operator"][data-value="' + value + '"]',
  };

  function onKeyboard(token) {
    const digit = /^[0-9]$/.test(token);
    if (digit) {
      handleAction('digit', token);
      UI.flashKey(KEY_SELECTOR.digit(token));
      return;
    }
    const map = {
      '+': ['operator', '+'],
      '-': ['operator', '-'],
      '*': ['operator', '*'],
      '/': ['operator', '/'],
      '.': ['decimal'],
      '=': ['equals'],
      backspace: ['backspace'],
      clear: ['clear'],
      copy: ['copy'],
      '(': ['paren'],
      ')': ['paren'],
      '%': ['percent'],
      '^': ['power'],
      '!': ['factorial'],
      pi: ['constant', 'pi'],
      e: ['constant', 'e'],
      sqrt: ['func', 'sqrt'],
      sign: ['sign'],
    };
    const entry = map[token];
    if (!entry) return;
    handleAction(entry[0], entry[1]);
    if (entry[0] === 'operator') UI.flashKey(KEY_SELECTOR.operator(entry[1]));
  }

  function wireLongPress(element, handler, duration) {
    let timer = null;
    let fired = false;
    const start = () => {
      fired = false;
      timer = setTimeout(() => {
        fired = true;
        handler();
      }, duration || 600);
    };
    const stop = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    element.addEventListener('pointerdown', start);
    element.addEventListener('pointerup', stop);
    element.addEventListener('pointerleave', stop);
    element.addEventListener('pointercancel', stop);
    element.addEventListener('click', (event) => {
      if (fired) {
        event.preventDefault();
        event.stopPropagation();
        fired = false;
      }
    });
  }

  /* ── sheets & panels ──────────────────────────────────────── */

  function syncAngleUi() {
    const angle = UI.prefs.all.angle === 'rad' ? 'rad' : 'deg';
    el.angleChip.textContent = angle.toUpperCase();
    el.angleChip.setAttribute('aria-pressed', String(angle === 'rad'));
    syncSegmented(el.angleSeg, angle);
  }

  function syncSegmented(container, value) {
    if (!container) return;
    container.querySelectorAll('button').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.value === value));
    });
  }

  /** The scientific keypad only exists in the landscape layout. */
  function syncSciPanel() {
    const open = UI.layout.effective() === 'landscape' && landscapeSci;
    el.sciPanel.classList.toggle('open', open);
    el.keypad.classList.toggle('sci-collapsed', !open);
    el.sciChip.setAttribute('aria-pressed', String(open));
  }

  function syncLayoutUi() {
    const landscape = UI.layout.effective() === 'landscape';
    const label = landscape ? 'Switch to portrait layout' : 'Switch to landscape layout';
    el.layoutBtn.setAttribute('aria-label', label);
    el.layoutBtn.title = label + (UI.layout.isForced() ? ' · manual override' : '');
    el.layoutBtn.setAttribute('aria-pressed', String(UI.layout.isForced()));
    el.layoutBtn.classList.toggle('is-active', UI.layout.isForced());
    syncSegmented(el.layoutSeg, UI.layout.mode());
  }

  function syncSettingsUi() {
    const prefs = UI.prefs.all;
    syncSegmented(el.themeSeg, prefs.theme);
    syncSegmented(el.angleSeg, prefs.angle);
    syncSegmented(el.layoutSeg, UI.layout.mode());
    el.prefPreview.checked = prefs.preview !== false;
    el.prefGrouping.checked = prefs.grouping !== false;
    el.prefHaptics.checked = prefs.haptics !== false;
    el.prefDecimals.value = String(prefs.decimals);
    el.aboutVersion.textContent =
      'N-Calc v' + UI.version() + ' · build ' + UI.build() + (UI.isNative() ? ' · android' : ' · web');
  }

  function wireSettings() {
    el.themeSeg.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      UI.haptics.tap();
      UI.theme.set(button.dataset.value);
      syncSegmented(el.themeSeg, button.dataset.value);
    });

    el.angleSeg.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      UI.haptics.tap();
      UI.prefs.set('angle', button.dataset.value);
      syncAngleUi();
      render();
    });

    el.prefPreview.addEventListener('change', () => {
      UI.prefs.set('preview', el.prefPreview.checked);
      render();
    });
    el.prefGrouping.addEventListener('change', () => {
      UI.prefs.set('grouping', el.prefGrouping.checked);
      render();
      renderHistory();
    });
    el.prefHaptics.addEventListener('change', () => {
      UI.prefs.set('haptics', el.prefHaptics.checked);
      UI.haptics.tap();
    });
    el.prefDecimals.addEventListener('change', () => {
      UI.prefs.set('decimals', el.prefDecimals.value);
      render();
      renderHistory();
    });

    el.prefReset.addEventListener('click', async () => {
      const ok = await UI.confirm({
        title: 'Reset app data?',
        message: 'History, settings and cached currency rates will be removed, then the app reloads.',
        confirmText: 'Reset',
        danger: true,
      });
      if (!ok) return;
      history = [];
      UI.prefs.reset();
      UI.store.remove('history');
      UI.store.remove('rates');
      UI.store.remove('ratesAt');
      UI.store.remove('conv');
      setTimeout(() => window.location.reload(), 120);
    });
  }

  /* ── boot ─────────────────────────────────────────────────── */

  function boot() {
    UI.prefs.load();
    UI.theme.apply();
    UI.layout.apply();
    UI.sheets.init();
    loadHistory();
    renderHistory();
    syncAngleUi();
    syncLayoutUi();
    syncSettingsUi();

    el.keypad.addEventListener('click', onKeypadClick);
    el.converterBtn.addEventListener('click', () => {
      UI.haptics.tap();
      UI.navigate('converters.html', 'next');
    });
    el.display.addEventListener('click', copyCurrent);
    el.historyBtn.addEventListener('click', () => {
      UI.haptics.tap();
      renderHistory();
      UI.sheets.open('history-sheet');
    });
    el.settingsBtn.addEventListener('click', () => {
      UI.haptics.tap();
      syncSettingsUi();
      UI.sheets.open('settings-sheet');
    });
    el.layoutBtn.addEventListener('click', () => {
      UI.haptics.tap();
      UI.layout.toggle();
      syncLayoutUi();
      syncSciPanel();
      render();
      const landscape = UI.layout.effective() === 'landscape';
      UI.toast(landscape ? 'Landscape layout' : 'Portrait layout');
    });
    el.layoutSeg.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      UI.haptics.tap();
      UI.layout.set(button.dataset.value);
      syncLayoutUi();
      syncSciPanel();
      render();
    });
    el.sciChip.addEventListener('click', () => {
      UI.haptics.tap();
      landscapeSci = !landscapeSci;
      syncSciPanel();
    });
    el.angleChip.addEventListener('click', () => {
      UI.haptics.tap();
      UI.prefs.set('angle', UI.prefs.all.angle === 'rad' ? 'deg' : 'rad');
      syncAngleUi();
      render();
    });
    wireSettings();
    el.historyClear.addEventListener('click', clearHistory);
    el.historyCopyAll.addEventListener('click', copyAllHistory);

    const acKey = el.keypad.querySelector('[data-action="clear"]');
    if (acKey) wireLongPress(acKey, clearHistory, 650);

    UI.layout.watch(() => {
      syncLayoutUi();
      syncSciPanel();
      render();
    });

    UI.bindKeyboard(onKeyboard);
    window.addEventListener('beforeunload', () => {
      if (buffer && !buffer.isEmpty()) UI.store.set('calcInput', buffer.text);
    });
    const restore = UI.store.get('calcInput', null);
    if (typeof restore === 'string' && restore) {
      buffer.set(restore);
      UI.store.remove('calcInput');
    }
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') UI.sheets.closeAll(false);
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) render();
    });

    UI.enterAnimation('next');
    syncSciPanel();
    render();

    if ('serviceWorker' in navigator && !UI.isNative() && /^https?:$/.test(window.location.protocol)) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      });
    }
  }

  /* ── Android hardware back button ─────────────────────────── */

  window.NCApp = {
    handleBack() {
      if (UI.sheets.isOpen('history-sheet') || UI.sheets.isOpen('settings-sheet')) {
        UI.sheets.closeAll(true);
        return 'handled';
      }
      return 'exit';
    },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
