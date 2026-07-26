// ─────────────────────────────────────────────
//  Nothing Calculator · script.js
//  Shared by converters.html
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  // ── Page slide-in ──
  requestAnimationFrame(() => {
    document.body.style.transform = 'translateX(0)';
    document.body.style.opacity   = '1';
  });

  // ── Theme (converters.html reads it inline too, this keeps toggles in sync) ──
  const currentTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);

  // ─────────────────────────────────────────────
  //  Currency → country code map for flag emojis
  // ─────────────────────────────────────────────
  const CURRENCY_COUNTRY = {
    AED:'AE',AFN:'AF',ALL:'AL',AMD:'AM',ANG:'SX',AOA:'AO',ARS:'AR',AUD:'AU',
    AWG:'AW',AZN:'AZ',BAM:'BA',BBD:'BB',BDT:'BD',BGN:'BG',BHD:'BH',BIF:'BI',
    BMD:'BM',BND:'BN',BOB:'BO',BRL:'BR',BSD:'BS',BTN:'BT',BWP:'BW',BYN:'BY',
    BZD:'BZ',CAD:'CA',CDF:'CD',CHF:'CH',CLP:'CL',CNY:'CN',COP:'CO',CRC:'CR',
    CUP:'CU',CVE:'CV',CZK:'CZ',DJF:'DJ',DKK:'DK',DOP:'DO',DZD:'DZ',EGP:'EG',
    ERN:'ER',ETB:'ET',EUR:'EU',FJD:'FJ',FKP:'FK',GBP:'GB',GEL:'GE',GHS:'GH',
    GIP:'GI',GMD:'GM',GNF:'GN',GTQ:'GT',GYD:'GY',HKD:'HK',HNL:'HN',HTG:'HT',
    HUF:'HU',IDR:'ID',ILS:'IL',INR:'IN',IQD:'IQ',IRR:'IR',ISK:'IS',JMD:'JM',
    JOD:'JO',JPY:'JP',KES:'KE',KGS:'KG',KHR:'KH',KMF:'KM',KRW:'KR',KWD:'KW',
    KYD:'KY',KZT:'KZ',LAK:'LA',LBP:'LB',LKR:'LK',LRD:'LR',LSL:'LS',LYD:'LY',
    MAD:'MA',MDL:'MD',MGA:'MG',MKD:'MK',MMK:'MM',MNT:'MN',MOP:'MO',MRU:'MR',
    MUR:'MU',MVR:'MV',MWK:'MW',MXN:'MX',MYR:'MY',MZN:'MZ',NAD:'NA',NGN:'NG',
    NIO:'NI',NOK:'NO',NPR:'NP',NZD:'NZ',OMR:'OM',PAB:'PA',PEN:'PE',PGK:'PG',
    PHP:'PH',PKR:'PK',PLN:'PL',PYG:'PY',QAR:'QA',RON:'RO',RSD:'RS',RUB:'RU',
    RWF:'RW',SAR:'SA',SBD:'SB',SCR:'SC',SDG:'SD',SEK:'SE',SGD:'SG',SHP:'SH',
    SLE:'SL',SOS:'SO',SRD:'SR',SSP:'SS',STN:'ST',SYP:'SY',SZL:'SZ',THB:'TH',
    TJS:'TJ',TMT:'TM',TND:'TN',TOP:'TO',TRY:'TR',TTD:'TT',TWD:'TW',TZS:'TZ',
    UAH:'UA',UGX:'UG',USD:'US',UYU:'UY',UZS:'UZ',VES:'VE',VND:'VN',VUV:'VU',
    WST:'WS',XAF:'CM',XCD:'AG',XOF:'SN',XPF:'PF',YER:'YE',ZAR:'ZA',ZMW:'ZM',
    ZWL:'ZW',
    // special
    XDR:'UN',GGP:'GG',IMP:'IM',JEP:'JE',KID:'KI',FOK:'FO',
  };

  function countryToFlag(cc) {
    if (!cc) return '🏳';
    if (cc === 'EU') return '🇪🇺';
    if (cc === 'UN') return '🌐';
    try {
      return cc.toUpperCase().replace(/./g, c =>
        String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))
      );
    } catch { return '🏳'; }
  }

  function currencyFlag(code) {
    return countryToFlag(CURRENCY_COUNTRY[code]);
  }

  // ─────────────────────────────────────────────
  //  State
  // ─────────────────────────────────────────────
  let currentCat   = 'currency';
  let currentRates = null;        // currency rates keyed by code
  let currentUnits = null;        // unit data {name: factor}
  let allCurrencies= {};          // code → name map from currencies.json
  let allCodes     = [];          // sorted codes with rates loaded
  let unitKeys     = [];          // for current unit category

  let fromSel = 'USD';
  let toSel   = 'EUR';
  let inputStr = '1';

  const inputHistory = {};

  // ─────────────────────────────────────────────
  //  DOM refs
  // ─────────────────────────────────────────────
  const inputDisplay  = document.getElementById('conv-input-display');
  const resultDisplay = document.getElementById('conv-result-display');
  const fromBtn       = document.getElementById('from-btn');
  const toBtn         = document.getElementById('to-btn');
  const fromFlag      = document.getElementById('from-flag');
  const toFlag        = document.getElementById('to-flag');
  const fromCode      = document.getElementById('from-code');
  const toCode        = document.getElementById('to-code');
  const fromName      = document.getElementById('from-name');
  const toName        = document.getElementById('to-name');
  const swapBtn       = document.getElementById('swap-btn');
  const currNote      = document.getElementById('currency-note');
  const pageSubtitle  = document.getElementById('page-subtitle');

  // Picker
  const pickerBackdrop = document.getElementById('picker-backdrop');
  const pickerSheet    = document.getElementById('picker-sheet');
  const pickerTitle    = document.getElementById('picker-title');
  const pickerSearch   = document.getElementById('picker-search');
  const pickerSearchW  = document.getElementById('picker-search-wrap');
  const pickerList     = document.getElementById('picker-list');

  let pickerTarget = 'from'; // 'from' | 'to'

  // ─────────────────────────────────────────────
  //  Navigation tabs
  // ─────────────────────────────────────────────
  document.getElementById('nav-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.nav-tab');
    if (!tab) return;
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    inputHistory[currentCat] = inputStr;
    currentCat = tab.dataset.cat;
    pageSubtitle.textContent = tab.textContent;
    inputStr = inputHistory[currentCat] || '1';
    updateInputDisplay();
    loadCategory(currentCat);
  });

  // ─────────────────────────────────────────────
  //  Category loader
  // ─────────────────────────────────────────────
  async function loadCategory(cat) {
    resultDisplay.textContent = '…';
    currNote.style.display = cat === 'currency' ? '' : 'none';

    if (cat === 'currency') {
      await ensureCurrencyLoaded();
      // restore last selection if valid
      fromSel = (allCodes.includes(inputHistory[cat+'_from'] || '') ? inputHistory[cat+'_from'] : null) || 'USD';
      toSel   = (allCodes.includes(inputHistory[cat+'_to']   || '') ? inputHistory[cat+'_to']   : null) || 'EUR';
      updateSelectors();
      computeAndShow();
    } else {
      try {
        const res = await fetch(`./data/${cat}.json`);
        currentUnits = await res.json();
        currentRates = null;
        unitKeys = Object.keys(currentUnits);
        fromSel = inputHistory[cat+'_from'] && currentUnits[inputHistory[cat+'_from']] ? inputHistory[cat+'_from'] : unitKeys[0];
        toSel   = inputHistory[cat+'_to']   && currentUnits[inputHistory[cat+'_to']]   ? inputHistory[cat+'_to']   : (unitKeys[1] || unitKeys[0]);
        updateSelectors();
        computeAndShow();
      } catch(e) {
        resultDisplay.textContent = 'Error';
        console.error(e);
      }
    }
  }

  // ─────────────────────────────────────────────
  //  Currency API
  // ─────────────────────────────────────────────
  let currencyLoaded = false;
  let currencyLoading = false;

  async function ensureCurrencyLoaded() {
    if (currencyLoaded) return;
    if (currencyLoading) { await new Promise(r => setTimeout(r, 600)); return; }
    currencyLoading = true;
    currNote.style.display = '';

    // Load names
    try {
      const r = await fetch('./data/currencies.json');
      allCurrencies = await r.json();
    } catch(e) { console.error('currencies.json missing'); }

    // Load rates
    try {
      currNote.textContent = 'Loading live rates…';
      const r = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json');
      const d = await r.json();
      const raw = d.usd;
      currentRates = {};
      Object.keys(raw).forEach(k => { currentRates[k.toUpperCase()] = raw[k]; });
      currentRates['USD'] = 1;
      allCodes = Object.keys(currentRates).filter(c => allCurrencies[c]).sort();
      currNote.textContent = 'Live rates · ' + (d.date || 'today');
      currencyLoaded = true;
    } catch(e) {
      try {
        const r = await fetch('https://api.frankfurter.app/latest');
        const d = await r.json();
        currentRates = { ...d.rates };
        currentRates[d.base] = 1;
        allCodes = Object.keys(currentRates).filter(c => allCurrencies[c]).sort();
        currNote.textContent = 'Rates via Frankfurter · ' + (d.date || 'today');
        currencyLoaded = true;
      } catch(e2) {
        currNote.textContent = 'Failed to load rates';
        allCodes = Object.keys(allCurrencies).sort();
        currentRates = null;
      }
    }
    currencyLoading = false;
  }

  // ─────────────────────────────────────────────
  //  Compute & display result
  // ─────────────────────────────────────────────
  function computeAndShow() {
    const amount = parseFloat(inputStr) || 0;
    let result;

    if (currentCat === 'currency') {
      if (!currentRates || !currentRates[fromSel] || !currentRates[toSel]) {
        resultDisplay.textContent = '--'; return;
      }
      result = (amount / currentRates[fromSel]) * currentRates[toSel];
      resultDisplay.textContent = formatResult(result);
    } else if (currentCat === 'temp') {
      result = convertTemp(amount, fromSel, toSel);
      resultDisplay.textContent = formatResult(result);
    } else {
      if (!currentUnits || !currentUnits[fromSel] || !currentUnits[toSel]) {
        resultDisplay.textContent = '--'; return;
      }
      result = (amount * currentUnits[fromSel]) / currentUnits[toSel];
      resultDisplay.textContent = formatResult(result);
    }
  }

  function formatResult(n) {
    if (n === undefined || n === null || isNaN(n)) return '--';
    const abs = Math.abs(n);
    if (abs === 0) return '0';
    if (abs >= 1e9)  return n.toExponential(4);
    if (abs >= 1)    return parseFloat(n.toFixed(4)).toString();
    if (abs >= 0.01) return parseFloat(n.toFixed(6)).toString();
    return parseFloat(n.toFixed(8)).toString();
  }

  function convertTemp(v, from, to) {
    let c;
    if      (from==='Celsius')    c = v;
    else if (from==='Fahrenheit') c = (v-32)*5/9;
    else if (from==='Kelvin')     c = v-273.15;
    else return v;
    if      (to==='Celsius')    return c;
    else if (to==='Fahrenheit') return c*9/5+32;
    else if (to==='Kelvin')     return c+273.15;
    return c;
  }

  // ─────────────────────────────────────────────
  //  Selector UI
  // ─────────────────────────────────────────────
  function updateSelectors() {
    if (currentCat === 'currency') {
      setSelector('from', fromSel, currencyFlag(fromSel), allCurrencies[fromSel] || fromSel, true);
      setSelector('to',   toSel,   currencyFlag(toSel),   allCurrencies[toSel]   || toSel,   true);
    } else {
      setSelector('from', fromSel, '', fromSel, false);
      setSelector('to',   toSel,   '', toSel,   false);
    }
  }

  function setSelector(which, code, flag, name, showFlag) {
    const f = which === 'from' ? fromFlag : toFlag;
    const c = which === 'from' ? fromCode : toCode;
    const n = which === 'from' ? fromName : toName;
    f.textContent = showFlag ? flag : '';
    f.style.display = showFlag ? '' : 'none';
    c.textContent = code;
    n.textContent = name;
  }

  // ─────────────────────────────────────────────
  //  Keypad
  // ─────────────────────────────────────────────
  function updateInputDisplay() {
    inputDisplay.textContent = inputStr || '0';
  }

  window.kbAppend = function(v) {
    if (v === '.' && inputStr.includes('.')) return;
    if (inputStr === '0' && v !== '.') inputStr = v;
    else if (inputStr.length < 14) inputStr += v;
    updateInputDisplay();
    computeAndShow();
  };

  window.kbDel = function() {
    if (inputStr.length <= 1) inputStr = '0';
    else inputStr = inputStr.slice(0, -1);
    updateInputDisplay();
    computeAndShow();
  };

  window.kbClear = function() {
    inputStr = '0';
    updateInputDisplay();
    computeAndShow();
  };

  window.kbToggleSign = function() {
    if (inputStr === '0') return;
    if (inputStr.startsWith('-')) inputStr = inputStr.slice(1);
    else inputStr = '-' + inputStr;
    updateInputDisplay();
    computeAndShow();
  };

  // wire up backspace button (row 2 col 4)
  document.querySelectorAll('.conv-buttons .btn-fn').forEach(btn => {
    if (btn.textContent.trim() === '⌫') {
      btn.onclick = window.kbDel;
    }
  });

  // ─────────────────────────────────────────────
  //  Swap
  // ─────────────────────────────────────────────
  swapBtn.addEventListener('click', () => {
    [fromSel, toSel] = [toSel, fromSel];
    swapBtn.classList.add('animating');
    setTimeout(() => swapBtn.classList.remove('animating'), 400);
    updateSelectors();
    computeAndShow();
    saveSelHistory();
  });

  // ─────────────────────────────────────────────
  //  Picker
  // ─────────────────────────────────────────────
  window.openPicker = function(target) {
    pickerTarget = target;
    const isCurrency = currentCat === 'currency';
    pickerTitle.textContent = `Select ${isCurrency ? 'Currency' : currentCat[0].toUpperCase()+currentCat.slice(1)} Unit`;
    pickerSearchW.style.display = isCurrency ? '' : 'none';
    pickerSearch.value = '';
    renderPickerList('');
    pickerSheet.classList.add('open');
    pickerBackdrop.classList.add('open');
    if (isCurrency) setTimeout(() => pickerSearch.focus(), 350);
  };

  window.closePicker = function() {
    pickerSheet.classList.remove('open');
    pickerBackdrop.classList.remove('open');
  };

  window.filterPicker = function() {
    renderPickerList(pickerSearch.value.trim().toLowerCase());
  };

  function renderPickerList(query) {
    pickerList.innerHTML = '';
    const isCurrency = currentCat === 'currency';

    if (isCurrency) {
      // Currency items with flags + search
      const codes = query
        ? allCodes.filter(c =>
            c.toLowerCase().includes(query) ||
            (allCurrencies[c]||'').toLowerCase().includes(query)
          )
        : allCodes;

      if (!codes.length) {
        pickerList.innerHTML = '<div class="no-results">No results</div>';
        return;
      }
      codes.forEach(code => {
        const isSel = (pickerTarget === 'from' ? fromSel : toSel) === code;
        const item = document.createElement('div');
        item.className = 'picker-item' + (isSel ? ' selected' : '');
        item.innerHTML = `
          <span class="picker-flag">${currencyFlag(code)}</span>
          <div class="picker-info">
            <div class="picker-code">${code}</div>
            <div class="picker-name">${allCurrencies[code] || ''}</div>
          </div>
          <svg class="picker-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        `;
        item.addEventListener('click', () => selectUnit(code));
        pickerList.appendChild(item);
      });
      // scroll selected into view
      requestAnimationFrame(() => {
        const sel = pickerList.querySelector('.selected');
        if (sel) sel.scrollIntoView({ block: 'center', behavior: 'instant' });
      });
    } else {
      // Unit items — simple list, no search
      const keys = currentCat === 'temp'
        ? ['Celsius', 'Fahrenheit', 'Kelvin']
        : unitKeys;
      const curSel = pickerTarget === 'from' ? fromSel : toSel;
      keys.forEach(key => {
        const isSel = curSel === key;
        const item = document.createElement('div');
        item.className = 'picker-unit-item' + (isSel ? ' selected' : '');
        item.innerHTML = `
          <span class="picker-unit-label">${key}</span>
          <svg class="picker-unit-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        `;
        item.addEventListener('click', () => selectUnit(key));
        pickerList.appendChild(item);
      });
    }
  }

  function selectUnit(val) {
    if (pickerTarget === 'from') fromSel = val;
    else toSel = val;
    updateSelectors();
    computeAndShow();
    saveSelHistory();
    closePicker();
  }

  function saveSelHistory() {
    inputHistory[currentCat+'_from'] = fromSel;
    inputHistory[currentCat+'_to']   = toSel;
  }

  // swipe-down to close picker
  let pStartY = 0, pDragging = false, pCurY = 0;
  pickerSheet.querySelector('.picker-handle').addEventListener('touchstart', e => {
    pStartY = e.touches[0].clientY; pDragging = true;
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!pDragging) return;
    pCurY = Math.max(0, e.touches[0].clientY - pStartY);
    pickerSheet.style.transition = 'none';
    pickerSheet.style.transform = `translateY(${pCurY}px)`;
    pickerBackdrop.style.opacity = String(Math.max(0, (1 - pCurY/250)*1));
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchend', () => {
    if (!pDragging) return;
    pDragging = false;
    pickerSheet.style.transition = '';
    pickerSheet.style.transform  = '';
    pickerBackdrop.style.opacity = '';
    if (pCurY > 100) closePicker();
    pCurY = 0;
  });

  // ─────────────────────────────────────────────
  //  Page transition helper
  // ─────────────────────────────────────────────
  window.transitionTo = function(url, dir) {
    document.body.classList.add(dir === 'next' ? 'slide-out-left' : 'slide-out-right');
    setTimeout(() => window.location.href = url, 300);
  };

  // ─────────────────────────────────────────────
  //  Boot
  // ─────────────────────────────────────────────
  updateInputDisplay();
  loadCategory('currency');

});
