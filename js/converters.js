/*!
 * N-Calc · converters.js — unit & currency converter controller
 */
(function () {
  'use strict';

  const E = window.NCEngine;
  const U = window.NCUnits;
  const UI = window.NCUI;

  if (!E || !U || !UI) return;

  const RATE_MAX_AGE = 12 * 60 * 60 * 1000; // refresh live rates every 12 h

  const CURRENCY_COUNTRY = {
    AED: 'AE', AFN: 'AF', ALL: 'AL', AMD: 'AM', ANG: 'SX', AOA: 'AO', ARS: 'AR', AUD: 'AU',
    AWG: 'AW', AZN: 'AZ', BAM: 'BA', BBD: 'BB', BDT: 'BD', BGN: 'BG', BHD: 'BH', BIF: 'BI',
    BMD: 'BM', BND: 'BN', BOB: 'BO', BRL: 'BR', BSD: 'BS', BTN: 'BT', BWP: 'BW', BYN: 'BY',
    BZD: 'BZ', CAD: 'CA', CDF: 'CD', CHF: 'CH', CLP: 'CL', CNY: 'CN', COP: 'CO', CRC: 'CR',
    CUP: 'CU', CVE: 'CV', CZK: 'CZ', DJF: 'DJ', DKK: 'DK', DOP: 'DO', DZD: 'DZ', EGP: 'EG',
    ERN: 'ER', ETB: 'ET', EUR: 'EU', FJD: 'FJ', FKP: 'FK', GBP: 'GB', GEL: 'GE', GHS: 'GH',
    GIP: 'GI', GMD: 'GM', GNF: 'GN', GTQ: 'GT', GYD: 'GY', HKD: 'HK', HNL: 'HN', HTG: 'HT',
    HUF: 'HU', IDR: 'ID', ILS: 'IL', INR: 'IN', IQD: 'IQ', IRR: 'IR', ISK: 'IS', JMD: 'JM',
    JOD: 'JO', JPY: 'JP', KES: 'KE', KGS: 'KG', KHR: 'KH', KMF: 'KM', KRW: 'KR', KWD: 'KW',
    KYD: 'KY', KZT: 'KZ', LAK: 'LA', LBP: 'LB', LKR: 'LK', LRD: 'LR', LSL: 'LS', LYD: 'LY',
    MAD: 'MA', MDL: 'MD', MGA: 'MG', MKD: 'MK', MMK: 'MM', MNT: 'MN', MOP: 'MO', MRU: 'MR',
    MUR: 'MU', MVR: 'MV', MWK: 'MW', MXN: 'MX', MYR: 'MY', MZN: 'MZ', NAD: 'NA', NGN: 'NG',
    NIO: 'NI', NOK: 'NO', NPR: 'NP', NZD: 'NZ', OMR: 'OM', PAB: 'PA', PEN: 'PE', PGK: 'PG',
    PHP: 'PH', PKR: 'PK', PLN: 'PL', PYG: 'PY', QAR: 'QA', RON: 'RO', RSD: 'RS', RUB: 'RU',
    RWF: 'RW', SAR: 'SA', SBD: 'SB', SCR: 'SC', SDG: 'SD', SEK: 'SE', SGD: 'SG', SHP: 'SH',
    SLE: 'SL', SOS: 'SO', SRD: 'SR', SSP: 'SS', STN: 'ST', SYP: 'SY', SZL: 'SZ', THB: 'TH',
    TJS: 'TJ', TMT: 'TM', TND: 'TN', TOP: 'TO', TRY: 'TR', TTD: 'TT', TWD: 'TW', TZS: 'TZ',
    UAH: 'UA', UGX: 'UG', USD: 'US', UYU: 'UY', UZS: 'UZ', VES: 'VE', VND: 'VN', VUV: 'VU',
    WST: 'WS', XAF: 'CM', XCD: 'AG', XOF: 'SN', XPF: 'PF', YER: 'YE', ZAR: 'ZA', ZMW: 'ZM',
    ZWL: 'ZW', XDR: 'UN', GGP: 'GG', IMP: 'IM', JEP: 'JE', KID: 'KI', FOK: 'FO',
  };

  const RATE_SOURCES = [
    {
      name: 'currency-api',
      url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json',
      parse(json) {
        return { rates: json.usd, date: json.date };
      },
    },
    {
      name: 'frankfurter',
      url: 'https://api.frankfurter.app/latest?from=USD',
      parse(json) {
        const rates = Object.assign({}, json.rates);
        rates.USD = 1;
        return { rates: rates, date: json.date };
      },
    },
  ];

  /* ── state ────────────────────────────────────────────────── */

  const CATEGORIES = U.list();
  let categoryId = 'currency';
  let input = '1';
  let rates = null;
  let ratesMeta = { at: 0, date: null, source: 'none' };
  let loadingRates = false;
  let pickerTarget = 'from';

  const selections = {}; // categoryId → { from, to }

  const $ = (id) => document.getElementById(id);
  const el = {
    tabs: $('tabs'),
    pageSub: $('page-sub'),
    inputValue: $('input-value'),
    resultValue: $('result-value'),
    inputUnit: $('input-unit'),
    resultUnit: $('result-unit'),
    fromBtn: $('from-btn'),
    toBtn: $('to-btn'),
    fromFlag: $('from-flag'),
    toFlag: $('to-flag'),
    fromCode: $('from-code'),
    toCode: $('to-code'),
    fromName: $('from-name'),
    toName: $('to-name'),
    swapBtn: $('swap-btn'),
    rateNote: $('rate-note'),
    rateText: $('rate-text'),
    rateRefresh: $('rate-refresh'),
    keypad: document.querySelector('.conv-keypad'),
    backBtn: $('back-btn'),
    themeBtn: $('theme-btn'),
    pickerSheet: $('picker-sheet'),
    pickerTitle: $('picker-title'),
    pickerSearch: $('picker-search'),
    pickerSearchWrap: $('picker-search-wrap'),
    pickerList: $('picker-list'),
    pickerClose: $('picker-close'),
  };

  /* ── helpers ──────────────────────────────────────────────── */

  function formatOptions() {
    const prefs = UI.prefs.all;
    const decimals = prefs.decimals === 'auto' ? undefined : Number(prefs.decimals);
    return { grouping: prefs.grouping !== false, decimals };
  }

  function format(value) {
    return E.formatNumber(value, formatOptions());
  }

  function flagFor(code) {
    if (!code) return '🏳';
    const country = CURRENCY_COUNTRY[code];
    if (!country) return '🏳';
    if (country === 'EU') return '🇪🇺';
    if (country === 'UN') return '🌐';
    try {
      return country
        .toUpperCase()
        .replace(/./g, (char) => String.fromCodePoint(0x1f1e6 - 65 + char.charCodeAt(0)));
    } catch (err) {
      return '🏳';
    }
  }

  function currentCategory() {
    return categoryId === 'currency' ? null : U.get(categoryId);
  }

  function defaultSelection(id) {
    if (id === 'currency') return { from: 'USD', to: 'EUR' };
    const pair = U.defaultPair(id);
    return { from: pair[0], to: pair[1] };
  }

  function selection(id) {
    if (!selections[id]) selections[id] = defaultSelection(id);
    return selections[id];
  }

  function saveSelections() {
    UI.store.set('conv', selections);
  }

  function loadSelections() {
    const stored = UI.store.get('conv', null);
    if (stored && typeof stored === 'object') {
      Object.keys(stored).forEach((key) => {
        if (stored[key] && stored[key].from && stored[key].to) selections[key] = stored[key];
      });
    }
  }

  /* ── rates ────────────────────────────────────────────────── */

  function loadCachedRates() {
    const cached = UI.store.get('rates', null);
    const at = UI.store.get('ratesAt', 0);
    const meta = UI.store.get('ratesMeta', {});
    if (cached && cached.USD) {
      rates = cached;
      ratesMeta = { at: at || 0, date: meta.date || null, source: meta.source || 'cached' };
      return true;
    }
    return false;
  }

  function saveRates() {
    UI.store.set('rates', rates);
    UI.store.set('ratesAt', ratesMeta.at);
    UI.store.set('ratesMeta', { date: ratesMeta.date, source: ratesMeta.source });
  }

  function normaliseRates(raw) {
    const out = {};
    Object.keys(raw || {}).forEach((code) => {
      const value = Number(raw[code]);
      if (code && Number.isFinite(value)) out[code.toUpperCase()] = value;
    });
    out.USD = 1;
    return out;
  }

  async function fetchLiveRates() {
    for (const source of RATE_SOURCES) {
      try {
        const response = await fetch(source.url, { cache: 'no-store' });
        if (!response.ok) continue;
        const json = await response.json();
        const parsed = source.parse(json);
        const normalised = normaliseRates(parsed.rates);
        if (Object.keys(normalised).length < 10) continue;
        rates = normalised;
        ratesMeta = { at: Date.now(), date: parsed.date || null, source: source.name };
        saveRates();
        return true;
      } catch (err) {
        /* try the next source */
      }
    }
    return false;
  }

  function snapshotRates() {
    const snapshot = U.snapshot();
    if (!snapshot || !snapshot.rates) return false;
    const normalised = normaliseRates(snapshot.rates);
    if (Object.keys(normalised).length < 5) return false;
    rates = normalised;
    ratesMeta = { at: 0, date: snapshot.date || null, source: 'snapshot' };
    return true;
  }

  async function ensureRates(force) {
    if (loadingRates) return;
    const fresh = rates && ratesMeta.source !== 'snapshot' && Date.now() - ratesMeta.at < RATE_MAX_AGE;
    if (!force && fresh) {
      renderRateNote();
      return;
    }
    loadingRates = true;
    el.rateRefresh.classList.add('busy');
    renderRateNote();
    const ok = await fetchLiveRates();
    if (!ok && (!rates || ratesMeta.source === 'none')) {
      if (loadCachedRates()) {
        /* keep the cache */
      } else if (!snapshotRates()) {
        rates = null;
        ratesMeta = { at: 0, date: null, source: 'none' };
      }
    }
    loadingRates = false;
    el.rateRefresh.classList.remove('busy');
    renderRateNote();
    compute();
  }

  function renderRateNote() {
    const currency = categoryId === 'currency';
    el.rateNote.hidden = !currency;
    if (!currency) return;
    el.rateNote.classList.remove('warn');
    if (loadingRates) {
      el.rateText.textContent = 'Loading live rates…';
      return;
    }
    if (!rates) {
      el.rateNote.classList.add('warn');
      el.rateText.textContent = 'No rates available — check your connection';
      return;
    }
    const pair = selection('currency');
    const unit = rates[pair.from] && rates[pair.to] ? '1 ' + pair.from + ' = ' + format(rates[pair.to] / rates[pair.from]) + ' ' + pair.to : '';
    if (ratesMeta.source === 'snapshot') {
      el.rateNote.classList.add('warn');
      el.rateText.textContent = 'Offline estimate — tap refresh for live rates';
      return;
    }
    if (ratesMeta.source === 'cached') {
      el.rateText.textContent = 'Cached · ' + UI.relativeTime(ratesMeta.at || Date.now()) + ' · ' + unit;
      return;
    }
    el.rateText.textContent =
      (ratesMeta.date ? 'Live · ' + ratesMeta.date : 'Live rates') + ' · ' + unit;
  }

  /* ── conversion ───────────────────────────────────────────── */

  function parsedInput() {
    const value = parseFloat(input);
    return Number.isFinite(value) ? value : 0;
  }

  function compute() {
    const pair = selection(categoryId);
    let result = NaN;

    if (categoryId === 'currency') {
      if (rates) result = U.convertCurrency(parsedInput(), pair.from, pair.to, rates);
    } else {
      result = U.convert(categoryId, parsedInput(), pair.from, pair.to);
    }

    if (Number.isFinite(result)) {
      el.resultValue.textContent = format(result);
      el.resultValue.style.opacity = '';
    } else {
      el.resultValue.textContent = categoryId === 'currency' && !rates ? '—' : '–';
      el.resultValue.style.opacity = '0.6';
    }
    el.resultValue.dataset.value = Number.isFinite(result) ? String(result) : '';
  }

  function renderInput() {
    const value = parsedInput();
    el.inputValue.textContent = input === '' || input === '-' ? input || '0' : format(value);
  }

  function renderSelectors() {
    const pair = selection(categoryId);
    const currency = categoryId === 'currency';

    if (currency) {
      el.fromFlag.textContent = flagFor(pair.from);
      el.toFlag.textContent = flagFor(pair.to);
      el.fromFlag.hidden = false;
      el.toFlag.hidden = false;
      el.fromCode.textContent = pair.from;
      el.toCode.textContent = pair.to;
      el.fromName.textContent = U.currencyName(pair.from);
      el.toName.textContent = U.currencyName(pair.to);
      el.inputUnit.textContent = pair.from;
      el.resultUnit.textContent = pair.to;
    } else {
      el.fromFlag.hidden = true;
      el.toFlag.hidden = true;
      el.fromCode.textContent = U.symbol(categoryId, pair.from);
      el.toCode.textContent = U.symbol(categoryId, pair.to);
      el.fromName.textContent = pair.from;
      el.toName.textContent = pair.to;
      el.inputUnit.textContent = U.symbol(categoryId, pair.from);
      el.resultUnit.textContent = U.symbol(categoryId, pair.to);
    }
  }

  function renderTabs() {
    el.tabs.textContent = '';
    const items = [{ id: 'currency', title: 'Currency' }].concat(
      CATEGORIES.map((category) => ({ id: category.id, title: category.title })),
    );
    items.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tab' + (item.id === categoryId ? ' active' : '');
      button.textContent = item.title;
      button.dataset.category = item.id;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(item.id === categoryId));
      el.tabs.appendChild(button);
    });
  }

  function renderAll() {
    renderTabs();
    renderSelectors();
    renderInput();
    compute();
    renderRateNote();
    const category = currentCategory();
    el.pageSub.textContent = category ? category.title : 'Currency';
  }

  function setCategory(id) {
    if (id === categoryId) return;
    categoryId = id;
    UI.store.set('convCategory', id);
    renderAll();
    if (id === 'currency') ensureRates(false);
  }

  /* ── keypad ───────────────────────────────────────────────── */

  function mutateInput(action, value) {
    switch (action) {
      case 'digit':
        if (input === '0') input = value;
        else if (input === '-0') input = '-' + value;
        else if (input.replace(/[-.]/g, '').length < 15) input += value;
        break;
      case 'double-zero':
        if (input === '0' || input === '') break;
        if (input.replace(/[-.]/g, '').length < 14) input += '00';
        break;
      case 'decimal':
        if (input.indexOf('.') < 0) input = (input === '' ? '0' : input) + '.';
        break;
      case 'clear':
        input = '0';
        break;
      case 'backspace':
        input = input.slice(0, -1);
        if (input === '' || input === '-') input = '0';
        break;
      case 'sign':
        if (input.startsWith('-')) input = input.slice(1);
        else if (input !== '0') input = '-' + input;
        break;
      default:
        return false;
    }
    return true;
  }

  function handleKeypad(action, value) {
    UI.haptics.tap();
    if (action === 'copy') {
      const result = el.resultValue.dataset.value;
      if (!result) {
        UI.toast('Nothing to copy');
        return;
      }
      UI.copy(el.resultValue.textContent).then((ok) =>
        UI.toast(ok ? 'Copied ' + el.resultValue.textContent : 'Could not copy', { type: ok ? 'success' : 'error' }),
      );
      return;
    }
    if (mutateInput(action, value)) {
      renderInput();
      compute();
    }
  }

  /* ── picker ───────────────────────────────────────────────── */

  function openPicker(target) {
    pickerTarget = target;
    const currency = categoryId === 'currency';
    el.pickerTitle.textContent = currency ? 'Select currency' : 'Select ' + (currentCategory() ? currentCategory().title : 'unit');
    el.pickerSearch.value = '';
    el.pickerSearch.placeholder = currency ? 'Search currency or code…' : 'Search every unit…';
    renderPickerList('');
    UI.sheets.open('picker-sheet');
    if (window.matchMedia('(min-width: 480px)').matches) setTimeout(() => el.pickerSearch.focus(), 320);
  }

  function closePicker() {
    UI.sheets.close('picker-sheet');
  }

  function pickerRow(options) {
    const row = document.createElement('div');
    row.className = 'picker-item' + (options.selected ? ' selected' : '');
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', String(!!options.selected));

    if (options.flag) {
      const flag = document.createElement('span');
      flag.className = 'picker-flag';
      flag.textContent = options.flag;
      row.appendChild(flag);
    } else if (options.symbol) {
      const symbol = document.createElement('span');
      symbol.className = 'picker-symbol';
      symbol.textContent = options.symbol;
      row.appendChild(symbol);
    }

    const info = document.createElement('div');
    info.className = 'picker-info';
    const title = document.createElement('div');
    title.className = 'picker-title';
    title.textContent = options.title;
    const sub = document.createElement('div');
    sub.className = 'picker-sub';
    sub.textContent = options.subtitle || '';
    info.appendChild(title);
    info.appendChild(sub);
    row.appendChild(info);

    const check = document.createElement('span');
    check.className = 'picker-check';
    check.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
    row.appendChild(check);

    row.addEventListener('click', () => {
      selectUnit(options.pick);
      UI.haptics.tap();
    });
    return row;
  }

  function renderPickerList(query) {
    el.pickerList.textContent = '';
    const raw = String(query || '').trim();
    const q = raw.toLowerCase();
    const pair = selection(categoryId);

    if (categoryId === 'currency') {
      const codes = U.currencyCodes().filter((code) => {
        if (!q) return true;
        if (q.length <= 3) return code.toLowerCase().indexOf(q) === 0;
        return code.toLowerCase().indexOf(q) >= 0 || U.currencyName(code).toLowerCase().indexOf(q) >= 0;
      });
      const available = codes.filter((code) => !rates || rates[code]);
      const list = available.length ? available : codes;
      if (!list.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = 'No currencies found';
        el.pickerList.appendChild(empty);
        return;
      }
      list.forEach((code) => {
        el.pickerList.appendChild(
          pickerRow({
            flag: flagFor(code),
            title: code,
            subtitle: U.currencyName(code),
            selected: code === (pickerTarget === 'from' ? pair.from : pair.to),
            pick: { type: 'currency', code: code },
          }),
        );
      });
      return;
    }

    if (q) {
      const results = U.search(raw);
      if (!results.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = 'No units found';
        el.pickerList.appendChild(empty);
        return;
      }
      const groups = {};
      results.forEach((result) => {
        if (!groups[result.categoryId]) groups[result.categoryId] = [];
        groups[result.categoryId].push(result);
      });
      Object.keys(groups).forEach((groupId) => {
        const header = document.createElement('div');
        header.className = 'picker-group-title';
        header.textContent = U.get(groupId) ? U.get(groupId).title : groupId;
        el.pickerList.appendChild(header);
        groups[groupId].forEach((result) => {
          el.pickerList.appendChild(
            pickerRow({
              symbol: result.symbol,
              title: result.name,
              subtitle: result.symbol,
              selected: groupId === categoryId && result.name === (pickerTarget === 'from' ? pair.from : pair.to),
              pick: { type: 'unit', categoryId: groupId, name: result.name },
            }),
          );
        });
      });
      return;
    }

    const category = currentCategory();
    if (!category) return;
    U.unitNames(categoryId).forEach((name) => {
      el.pickerList.appendChild(
        pickerRow({
          symbol: U.symbol(categoryId, name),
          title: name,
          subtitle: U.symbol(categoryId, name),
          selected: name === (pickerTarget === 'from' ? pair.from : pair.to),
          pick: { type: 'unit', categoryId: categoryId, name: name },
        }),
      );
    });
  }

  function selectUnit(pick) {
    if (pick.type === 'currency') {
      const pair = selection('currency');
      if (pickerTarget === 'from') pair.from = pick.code;
      else pair.to = pick.code;
      saveSelections();
      closePicker();
      renderSelectors();
      compute();
      renderRateNote();
      return;
    }
    const targetCategory = pick.categoryId;
    if (targetCategory !== categoryId) {
      categoryId = targetCategory;
      UI.store.set('convCategory', categoryId);
    }
    const pair = selection(targetCategory);
    if (pickerTarget === 'from') pair.from = pick.name;
    else pair.to = pick.name;
    saveSelections();
    closePicker();
    renderAll();
  }

  /* ── wiring ───────────────────────────────────────────────── */

  function swap() {
    const pair = selection(categoryId);
    const from = pair.from;
    pair.from = pair.to;
    pair.to = from;
    saveSelections();
    el.swapBtn.classList.add('spin');
    setTimeout(() => el.swapBtn.classList.remove('spin'), 460);
    UI.haptics.tap();
    renderSelectors();
    compute();
    renderRateNote();
  }

  function boot() {
    UI.prefs.load();
    UI.theme.apply();
    UI.sheets.init();
    loadSelections();
    loadCachedRates();

    const storedCategory = UI.store.get('convCategory', 'currency');
    categoryId = storedCategory === 'currency' || U.get(storedCategory) ? storedCategory : 'currency';
    const storedInput = UI.store.get('convInput', null);
    if (typeof storedInput === 'string' && storedInput) input = storedInput;

    renderAll();

    el.tabs.addEventListener('click', (event) => {
      const tab = event.target.closest('.tab');
      if (!tab) return;
      UI.haptics.tap();
      setCategory(tab.dataset.category);
    });

    el.keypad.addEventListener('click', (event) => {
      const key = event.target.closest('.key');
      if (!key) return;
      handleKeypad(key.dataset.action, key.dataset.value);
    });

    el.fromBtn.addEventListener('click', () => {
      UI.haptics.tap();
      openPicker('from');
    });
    el.toBtn.addEventListener('click', () => {
      UI.haptics.tap();
      openPicker('to');
    });
    el.swapBtn.addEventListener('click', swap);
    el.pickerClose.addEventListener('click', closePicker);
    el.pickerSearch.addEventListener('input', () => renderPickerList(el.pickerSearch.value));
    el.rateRefresh.addEventListener('click', () => {
      UI.haptics.tap();
      ensureRates(true);
    });

    el.resultValue.addEventListener('click', () => handleKeypad('copy'));

    el.backBtn.addEventListener('click', () => {
      UI.haptics.tap();
      UI.navigate('index.html', 'back');
    });
    el.themeBtn.addEventListener('click', () => {
      UI.haptics.tap();
      UI.theme.set(UI.theme.effective() === 'dark' ? 'light' : 'dark');
    });

    UI.bindKeyboard((token) => {
      if (/^[0-9]$/.test(token)) handleKeypad('digit', token);
      else if (token === '.') handleKeypad('decimal');
      else if (token === 'backspace') handleKeypad('backspace');
      else if (token === 'clear') handleKeypad('clear');
      else if (token === '=') handleKeypad('copy');
      else if (token === 'sign') handleKeypad('sign');
    });

    document.addEventListener('ncalc:sheet', (event) => {
      if (event.detail.id === 'picker-sheet' && !event.detail.open) {
        el.pickerSearch.blur();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) ensureRates(false);
    });

    UI.enterAnimation('back');
    if (categoryId === 'currency') ensureRates(false);

    window.addEventListener('beforeunload', () => {
      UI.store.set('convInput', input);
    });
  }

  /* ── Android hardware back button ─────────────────────────── */

  window.NCApp = {
    handleBack() {
      if (UI.sheets.isOpen('picker-sheet')) {
        UI.sheets.closeAll(true);
        return 'handled';
      }
      UI.navigate('index.html', 'back');
      return 'handled';
    },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
