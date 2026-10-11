/*!
 * N-Calc · ui.js
 * ─────────────────────────────────────────────────────────────
 * Shared UI runtime for both pages: settings storage, theming,
 * haptics, toasts, bottom sheets, confirm dialog, clipboard,
 * display auto-fit and keyboard normalisation.
 * ─────────────────────────────────────────────────────────────
 */
(function (global) {
  'use strict';

  const NS = 'ncalc.';

  /* ── storage ──────────────────────────────────────────────── */

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(NS + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (err) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(NS + key, JSON.stringify(value));
      } catch (err) {
        /* storage full or blocked — ignore */
      }
      return value;
    },
    remove(key) {
      try {
        localStorage.removeItem(NS + key);
      } catch (err) {
        /* ignore */
      }
    },
    raw(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value;
      } catch (err) {
        return fallback;
      }
    },
  };

  /* ── settings ─────────────────────────────────────────────── */

  const DEFAULTS = {
    theme: 'system', // system | dark | light
    haptics: true,
    grouping: true,
    decimals: 'auto', // auto | 0 … 10
    angle: 'deg', // deg | rad
    preview: true,
    sciPortrait: false,
    seenIntro: false,
  };

  const preferences = Object.assign({}, DEFAULTS);

  function loadPreferences() {
    // migrate the legacy keys used by v2.x
    if (store.get('theme', null) === null) {
      const legacy = store.raw('theme', null);
      if (legacy === 'light' || legacy === 'dark') store.set('theme', legacy);
    }
    if (store.get('haptics', null) === null) {
      const legacyHaptic = store.raw('haptic', null);
      if (legacyHaptic === 'off') store.set('haptics', false);
    }
    Object.keys(DEFAULTS).forEach((key) => {
      const value = store.get(key, undefined);
      preferences[key] = value === undefined ? DEFAULTS[key] : value;
    });
    return preferences;
  }

  function savePreference(key, value) {
    preferences[key] = value;
    store.set(key, value);
    document.dispatchEvent(new CustomEvent('ncalc:pref', { detail: { key, value } }));
    return value;
  }

  /* ── theme ────────────────────────────────────────────────── */

  const systemDark = global.matchMedia ? global.matchMedia('(prefers-color-scheme: dark)') : null;

  const theme = {
    effective(mode) {
      const value = mode || preferences.theme;
      if (value === 'system') return systemDark && systemDark.matches ? 'dark' : 'light';
      return value;
    },
    apply(mode) {
      const effective = theme.effective(mode);
      document.documentElement.setAttribute('data-theme', effective);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', effective === 'dark' ? '#0a0a0a' : '#f1f1ef');
      return effective;
    },
    set(mode) {
      savePreference('theme', mode);
      return theme.apply(mode);
    },
  };

  if (systemDark && systemDark.addEventListener) {
    systemDark.addEventListener('change', () => {
      if (preferences.theme === 'system') theme.apply('system');
    });
  }

  /* ── haptics ──────────────────────────────────────────────── */

  const haptics = {
    get enabled() {
      return preferences.haptics !== false;
    },
    tap(ms) {
      if (!haptics.enabled) return;
      if (navigator.vibrate) navigator.vibrate(typeof ms === 'number' ? ms : 8);
    },
  };

  /* ── toast ────────────────────────────────────────────────── */

  let toastHost = null;

  function toast(message, options) {
    const opts = Object.assign({ type: 'info', duration: 1900 }, options || {});
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.className = 'toast-host';
      document.body.appendChild(toastHost);
    }
    const el = document.createElement('div');
    el.className = 'toast ' + opts.type;
    const dot = document.createElement('span');
    dot.className = 'toast-dot';
    const text = document.createElement('span');
    text.textContent = message;
    el.appendChild(dot);
    el.appendChild(text);
    toastHost.appendChild(el);
    const remove = () => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 240);
    };
    setTimeout(remove, opts.duration);
    return el;
  }

  /* ── clipboard ────────────────────────────────────────────── */

  function copy(text) {
    const value = String(text === null || text === undefined ? '' : text);
    if (!value) return Promise.resolve(false);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(value).then(
        () => true,
        () => legacyCopy(value),
      );
    }
    return Promise.resolve(legacyCopy(value));
  }

  function legacyCopy(value) {
    try {
      const area = document.createElement('textarea');
      area.value = value;
      area.setAttribute('readonly', 'readonly');
      area.style.position = 'fixed';
      area.style.top = '-1000px';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch (err) {
      return false;
    }
  }

  /* ── bottom sheets ────────────────────────────────────────── */

  const openSheets = [];

  function backdropEl() {
    return document.getElementById('backdrop');
  }

  const sheets = {
    open(id) {
      const sheet = document.getElementById(id);
      if (!sheet) return;
      if (openSheets.indexOf(id) < 0) openSheets.push(id);
      sheet.classList.add('open');
      sheet.setAttribute('aria-hidden', 'false');
      const backdrop = backdropEl();
      if (backdrop) backdrop.classList.add('visible');
      document.dispatchEvent(new CustomEvent('ncalc:sheet', { detail: { id, open: true } }));
    },
    close(id) {
      const sheet = document.getElementById(id);
      if (sheet) {
        sheet.classList.remove('open');
        sheet.style.transform = '';
        sheet.setAttribute('aria-hidden', 'true');
      }
      const index = openSheets.indexOf(id);
      if (index >= 0) openSheets.splice(index, 1);
      if (!openSheets.length) {
        const backdrop = backdropEl();
        if (backdrop) {
          backdrop.classList.remove('visible');
          backdrop.style.opacity = '';
        }
      }
      document.dispatchEvent(new CustomEvent('ncalc:sheet', { detail: { id, open: false } }));
    },
    closeAll(haptic) {
      openSheets.slice().forEach((id) => sheets.close(id));
      if (haptic) haptics.tap();
    },
    isOpen(id) {
      return openSheets.indexOf(id) >= 0;
    },
    init() {
      document.querySelectorAll('.sheet').forEach((sheet) => {
        let startY = 0;
        let currentY = 0;
        let dragging = false;

        const canStart = (target) =>
          sheet.querySelector('.sheet-handle') === target ||
          sheet.querySelector('.sheet-header') === target ||
          (sheet.querySelector('.sheet-header') && sheet.querySelector('.sheet-header').contains(target)) ||
          (sheet.querySelector('.sheet-handle') && sheet.querySelector('.sheet-handle').contains(target));

        const start = (event) => {
          if (!canStart(event.target)) return;
          const point = event.touches ? event.touches[0] : event;
          startY = point.clientY;
          dragging = true;
          sheet.classList.add('dragging');
        };

        const move = (event) => {
          if (!dragging) return;
          const point = event.touches ? event.touches[0] : event;
          currentY = Math.max(0, point.clientY - startY);
          sheet.style.transform = 'translateY(' + currentY + 'px)';
          const backdrop = backdropEl();
          if (backdrop) backdrop.style.opacity = String(Math.max(0.1, 1 - currentY / 320));
          if (event.cancelable) event.preventDefault();
        };

        const end = () => {
          if (!dragging) return;
          dragging = false;
          sheet.classList.remove('dragging');
          if (currentY > 92) {
            sheets.close(sheet.id);
            haptics.tap();
          } else {
            sheet.style.transform = '';
            const backdrop = backdropEl();
            if (backdrop) backdrop.style.opacity = '';
          }
          currentY = 0;
        };

        sheet.addEventListener('touchstart', start, { passive: true });
        sheet.addEventListener('touchmove', move, { passive: false });
        sheet.addEventListener('touchend', end);
        sheet.addEventListener('mousedown', start);
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', end);
      });

      const backdrop = backdropEl();
      if (backdrop) backdrop.addEventListener('click', () => sheets.closeAll(true));
    },
  };

  /* ── confirm dialog ───────────────────────────────────────── */

  function confirmDialog(options) {
    const opts = Object.assign(
      { title: 'Are you sure?', message: '', confirmText: 'Confirm', cancelText: 'Cancel', danger: false },
      options || {},
    );
    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.className = 'dialog-backdrop';
      wrap.innerHTML =
        '<div class="dialog" role="dialog" aria-modal="true">' +
        '<div class="dialog-title"></div>' +
        '<div class="dialog-text"></div>' +
        '<div class="dialog-actions">' +
        '<button class="btn" data-role="cancel"></button>' +
        '<button class="btn" data-role="confirm"></button>' +
        '</div></div>';
      wrap.querySelector('.dialog-title').textContent = opts.title;
      wrap.querySelector('.dialog-text').textContent = opts.message;
      const cancel = wrap.querySelector('[data-role="cancel"]');
      const confirm = wrap.querySelector('[data-role="confirm"]');
      cancel.textContent = opts.cancelText;
      confirm.textContent = opts.confirmText;
      if (opts.danger) confirm.classList.add('btn-danger');
      document.body.appendChild(wrap);
      requestAnimationFrame(() => wrap.classList.add('open'));

      const finish = (value) => {
        haptics.tap();
        wrap.classList.remove('open');
        setTimeout(() => wrap.remove(), 240);
        resolve(value);
      };
      cancel.addEventListener('click', () => finish(false));
      confirm.addEventListener('click', () => finish(true));
      wrap.addEventListener('click', (event) => {
        if (event.target === wrap) finish(false);
      });
      const onKey = (event) => {
        if (event.key === 'Escape') {
          document.removeEventListener('keydown', onKey);
          finish(false);
        }
      };
      document.addEventListener('keydown', onKey);
      setTimeout(() => confirm.focus(), 60);
    });
  }

  /* ── display auto-fit ─────────────────────────────────────── */

  /**
   * Shrinks the font-size of `el` until its content fits.
   * maxLines 1 → single line (uses nowrap overflow), >1 → wrapping.
   */
  function fitText(el, options) {
    if (!el) return;
    const opts = Object.assign({ max: 56, min: 13, maxLines: 2 }, options || {});
    let size = opts.max;
    el.style.fontSize = size + 'px';
    let guard = 0;
    while (guard < 48 && size > opts.min) {
      guard += 1;
      const style = getComputedStyle(el);
      const lineHeight = parseFloat(style.lineHeight) || size * 1.15;
      const tooTall = el.scrollHeight > lineHeight * opts.maxLines + 1;
      const tooWide = el.scrollWidth > el.clientWidth + 1;
      if (!tooTall && !tooWide) break;
      size -= Math.max(1, Math.round(size * 0.06));
      el.style.fontSize = size + 'px';
    }
  }

  /* ── keyboard ─────────────────────────────────────────────── */

  const KEY_MAP = {
    '*': '*',
    x: '*',
    X: '*',
    0xd7: '*', // × as keystroke
    '/': '/',
    '\u00f7': '/',
    '-': '-',
    '\u2212': '-',
    '+': '+',
    '.': '.',
    ',': '.',
    '^': '^',
    '%': '%',
    '(': '(',
    ')': ')',
    '!': '!',
    '=': '=',
  };

  /** Translate a keydown event into a canonical token, or null. */
  function normalizeKey(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return null;
    const key = event.key;
    if (key >= '0' && key <= '9') return key;
    if (KEY_MAP[key] !== undefined) return KEY_MAP[key];
    if (key === 'Enter') return '=';
    if (key === 'Backspace') return 'backspace';
    if (key === 'Delete' || key === 'Escape') return 'clear';
    if (key === 'c' || key === 'C') return 'copy';
    if (key === 'p' || key === 'P') return 'pi';
    if (key === 'e' || key === 'E') return 'e';
    if (key === 'r' || key === 'R') return 'sqrt';
    if (key === 's' || key === 'S') return 'sign';
    return null;
  }

  function bindKeyboard(handler) {
    document.addEventListener('keydown', (event) => {
      const token = normalizeKey(event);
      if (!token) return;
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      event.preventDefault();
      handler(token, event);
    });
  }

  /** Briefly highlights the on-screen key matching `selector`. */
  function flashKey(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.classList.add('pressed');
    setTimeout(() => el.classList.remove('pressed'), 110);
  }

  /* ── misc helpers ─────────────────────────────────────────── */

  function relativeTime(timestamp) {
    const diff = Date.now() - timestamp;
    const minute = 60000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diff < minute) return 'just now';
    if (diff < hour) return Math.round(diff / minute) + ' min ago';
    if (diff < day) return Math.round(diff / hour) + ' h ago';
    if (diff < 7 * day) return Math.round(diff / day) + ' d ago';
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  }

  function isNative() {
    return /NCalcApp/.test(navigator.userAgent);
  }

  // Android shell: give the layout a safe default inset even when the
  // WebView reports no env(safe-area-inset-*) values.
  document.documentElement.setAttribute('data-shell', isNative() ? 'android' : 'web');

  function version() {
    return (global.NC_VERSION || { version: 'dev', build: 'dev' }).version;
  }

  function build() {
    return (global.NC_VERSION || { version: 'dev', build: 'dev' }).build;
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[ch]);
  }

  /* ── page transitions ─────────────────────────────────────── */

  function navigate(url, direction) {
    const app = document.querySelector('.app');
    if (app) app.classList.add(direction === 'back' ? 'leaving-right' : 'leaving-left');
    setTimeout(() => {
      global.location.href = url;
    }, 220);
  }

  function enterAnimation(direction) {
    const app = document.querySelector('.app');
    if (!app) return;
    app.classList.add(direction === 'back' ? 'enter-from-left' : 'enter-from-right');
    requestAnimationFrame(() => requestAnimationFrame(() => app.classList.remove('enter-from-left', 'enter-from-right')));
  }

  global.NCUI = {
    store,
    prefs: {
      all: preferences,
      load: loadPreferences,
      set: savePreference,
      defaults: DEFAULTS,
      reset() {
        Object.keys(DEFAULTS).forEach((key) => {
          preferences[key] = DEFAULTS[key];
          store.remove(key);
        });
      },
    },
    theme,
    haptics,
    toast,
    copy,
    sheets,
    confirm: confirmDialog,
    fitText,
    normalizeKey,
    bindKeyboard,
    flashKey,
    relativeTime,
    isNative,
    version,
    build,
    escapeHtml,
    navigate,
    enterAnimation,
  };
})(typeof window !== 'undefined' ? window : globalThis);
