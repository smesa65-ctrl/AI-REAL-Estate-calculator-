/* ============================================================
   Utility helpers
============================================================ */
const fmt = (n, dec = 0) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);

const fmtDollar = (n, dec = 0) => '$' + fmt(n, dec);

const fmtPct = (n, dec = 1) => fmt(n, dec) + '%';

function monthlyPayment(principal, annualRate, termYears) {
  if (annualRate === 0) return principal / (termYears * 12);
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function progressColor(pct) {
  if (pct <= 28) return '#16a34a';
  if (pct <= 36) return '#2563eb';
  if (pct <= 43) return '#d97706';
  return '#dc2626';
}

/* ============================================================
   Tab navigation
============================================================ */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

/* ============================================================
   MORTGAGE TAB
============================================================ */
(function () {
  const ids = {
    price: 'm-price', downAmt: 'm-down-amt', downPct: 'm-down-pct',
    rate: 'm-rate', term: 'm-term', tax: 'm-tax', ins: 'm-ins',
    pmi: 'm-pmi', hoa: 'm-hoa'
  };

  let syncing = false;

  function get(id) { return parseFloat(document.getElementById(id).value) || 0; }
  function set(id, v) { document.getElementById(id).value = v; }

  document.getElementById(ids.downAmt).addEventListener('input', () => {
    if (syncing) return;
    syncing = true;
    const price = get(ids.price);
    if (price > 0) set(ids.downPct, ((get(ids.downAmt) / price) * 100).toFixed(1));
    syncing = false;
    calc();
  });

  document.getElementById(ids.downPct).addEventListener('input', () => {
    if (syncing) return;
    syncing = true;
    set(ids.downAmt, Math.round(get(ids.price) * get(ids.downPct) / 100));
    syncing = false;
    calc();
  });

  ['price', 'rate', 'term', 'tax', 'ins', 'pmi', 'hoa'].forEach(key => {
    const el = document.getElementById(ids[key]);
    if (el) el.addEventListener('input', () => {
      if (key === 'price') {
        syncing = true;
        set(ids.downAmt, Math.round(get(ids.price) * get(ids.downPct) / 100));
        syncing = false;
      }
      calc();
    });
  });

  function calc() {
    const price   = get(ids.price);
    const downAmt = get(ids.downAmt);
    const rate    = get(ids.rate);
    const term    = parseInt(document.getElementById(ids.term).value);
    const taxAnn  = get(ids.tax);
    const insAnn  = get(ids.ins);
    const pmiRate = get(ids.pmi);
    const hoa     = get(ids.hoa);

    const loan = Math.max(0, price - downAmt);
    const downPct = price > 0 ? downAmt / price : 0;
    const pi   = monthlyPayment(loan, rate, term);
    const taxMo = taxAnn / 12;
    const insMo = insAnn / 12;
    const pmiMo = downPct < 0.20 ? (loan * pmiRate / 100) / 12 : 0;

    const total = pi + taxMo + insMo + pmiMo + hoa;

    const totalInterest = pi * term * 12 - loan;
    const totalCost = price + totalInterest + taxAnn * term + insAnn * term;

    document.getElementById('m-total-payment').textContent = fmtDollar(total);
    document.getElementById('m-pi').textContent            = fmtDollar(pi);
    document.getElementById('m-tax-mo').textContent        = fmtDollar(taxMo);
    document.getElementById('m-ins-mo').textContent        = fmtDollar(insMo);
    document.getElementById('m-pmi-mo').textContent        = fmtDollar(pmiMo);
    document.getElementById('m-hoa-mo').textContent        = fmtDollar(hoa);
    document.getElementById('m-loan-amt').textContent      = fmtDollar(loan);
    document.getElementById('m-total-interest').textContent= fmtDollar(totalInterest);
    document.getElementById('m-total-cost').textContent    = fmtDollar(totalCost);

    const payoffDate = addMonths(new Date(), term * 12);
    document.getElementById('m-payoff-date').textContent = formatDate(payoffDate);

    document.getElementById('pmi-row').style.display = pmiMo > 0 ? '' : 'none';
    document.getElementById('hoa-row').style.display  = hoa > 0 ? '' : 'none';

    drawDonut([pi, taxMo, insMo, pmiMo, hoa],
      ['P&I', 'Tax', 'Insurance', 'PMI', 'HOA'],
      ['#2563eb', '#7c3aed', '#0891b2', '#d97706', '#16a34a']);
  }

  function drawDonut(values, labels, colors) {
    const canvas = document.getElementById('donut-chart');
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const cx = size / 2, cy = size / 2;
    const outerR = size * 0.44;
    const innerR = size * 0.28;

    ctx.clearRect(0, 0, size, size);

    const total = values.reduce((s, v) => s + v, 0);
    if (total === 0) return;

    let start = -Math.PI / 2;
    const filtered = values.map((v, i) => ({ v, l: labels[i], c: colors[i] })).filter(d => d.v > 0);

    filtered.forEach(({ v, c }) => {
      const angle = (v / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, start, start + angle);
      ctx.closePath();
      ctx.fillStyle = c;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      start += angle;
    });

    ctx.fillStyle = '#1f2937';
    ctx.font = `bold ${size * 0.065}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fmtDollar(total), cx, cy - size * 0.025);
    ctx.font = `${size * 0.045}px -apple-system, sans-serif`;
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('/ month', cx, cy + size * 0.045);

    const legend = document.getElementById('donut-legend');
    legend.innerHTML = filtered.map(({ v, l, c }) =>
      `<div class="legend-item"><span class="legend-dot" style="background:${c}"></span>${l}: ${fmtDollar(v)}</div>`
    ).join('');
  }

  calc();
})();

/* ============================================================
   AFFORDABILITY TAB
============================================================ */
(function () {
  function get(id) { return parseFloat(document.getElementById(id).value) || 0; }

  function maxPriceFromPayment(maxPmt, rate, term, downAmt) {
    if (rate === 0) {
      const loan = maxPmt * term * 12;
      return loan + downAmt;
    }
    const r = rate / 100 / 12;
    const n = term * 12;
    const factor = (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const loan = maxPmt / factor;
    return loan + downAmt;
  }

  function calcForDTI(income, monthlyDebt, downAmt, rate, term, dtiBe) {
    const maxTotal = (income / 12) * (dtiBe / 100);
    const maxHousing = maxTotal - monthlyDebt;
    if (maxHousing <= 0) return 0;
    return maxPriceFromPayment(maxHousing, rate, term, downAmt);
  }

  function calcForFrontEnd(income, downAmt, rate, term, dtiFe) {
    const maxHousing = (income / 12) * (dtiFe / 100);
    if (maxHousing <= 0) return 0;
    return maxPriceFromPayment(maxHousing, rate, term, downAmt);
  }

  function calc() {
    const income  = get('a-income');
    const debt    = get('a-debt');
    const downAmt = get('a-down');
    const rate    = get('a-rate');
    const term    = parseInt(document.getElementById('a-term').value);
    const dtiSel  = parseInt(document.getElementById('a-dti').value);

    const monthlyIncome = income / 12;

    let maxPrice;
    if (dtiSel === 28) {
      maxPrice = calcForFrontEnd(income, downAmt, rate, term, 28);
    } else {
      maxPrice = calcForDTI(income, debt, downAmt, rate, term, dtiSel);
    }
    maxPrice = Math.max(0, maxPrice);

    const loanAmt = Math.max(0, maxPrice - downAmt);
    const maxPayment = monthlyPayment(loanAmt, rate, term);

    const feRatio = monthlyIncome > 0 ? (maxPayment / monthlyIncome) * 100 : 0;
    const beRatio = monthlyIncome > 0 ? ((maxPayment + debt) / monthlyIncome) * 100 : 0;

    document.getElementById('a-max-price').textContent    = fmtDollar(maxPrice);
    document.getElementById('a-max-payment').textContent  = fmtDollar(maxPayment);
    document.getElementById('a-loan-amount').textContent  = fmtDollar(loanAmt);
    document.getElementById('a-down-display').textContent = fmtDollar(downAmt);

    document.getElementById('a-fe-pct').textContent = fmtPct(feRatio);
    document.getElementById('a-be-pct').textContent = fmtPct(beRatio);

    const feBar = document.getElementById('a-fe-bar');
    const beBar = document.getElementById('a-be-bar');
    feBar.style.width = Math.min(100, feRatio * 2.5) + '%';
    beBar.style.width = Math.min(100, beRatio * 2) + '%';
    feBar.style.background = progressColor(feRatio);
    beBar.style.background = progressColor(beRatio);

    document.getElementById('a-fe-status').textContent = feRatio <= 28 ? 'Good — below 28% guideline' : feRatio <= 35 ? 'Moderate — above ideal 28%' : 'High — lenders may require compensating factors';
    document.getElementById('a-be-status').textContent = beRatio <= 36 ? 'Good — within 36% guideline' : beRatio <= 43 ? 'Acceptable for FHA loans' : 'High — approval less likely without strong credit';

    const con  = calcForFrontEnd(income, downAmt, rate, term, 28);
    const rec  = calcForDTI(income, debt, downAmt, rate, term, 36);
    const max  = calcForDTI(income, debt, downAmt, rate, term, 43);

    document.getElementById('a-conservative').textContent = fmtDollar(Math.max(0, con));
    document.getElementById('a-recommended').textContent  = fmtDollar(Math.max(0, rec));
    document.getElementById('a-maximum').textContent      = fmtDollar(Math.max(0, max));
  }

  ['a-income','a-debt','a-down','a-rate','a-term','a-dti'].forEach(id => {
    document.getElementById(id).addEventListener('input', calc);
  });

  calc();
})();

/* ============================================================
   RENTAL ROI TAB
============================================================ */
(function () {
  function get(id) { return parseFloat(document.getElementById(id).value) || 0; }

  function calc() {
    const price        = get('r-price');
    const downPct      = get('r-down') / 100;
    const rate         = get('r-rate');
    const term         = parseInt(document.getElementById('r-term').value);
    const grossRent    = get('r-rent');
    const vacancyPct   = get('r-vacancy') / 100;
    const taxAnn       = get('r-tax');
    const insAnn       = get('r-ins');
    const maintPct     = get('r-maint') / 100;
    const mgmtPct      = get('r-mgmt') / 100;
    const otherMo      = get('r-other');
    const appreciationPct = get('r-appreciation') / 100;

    const downAmt   = price * downPct;
    const loan      = price - downAmt;
    const mortgage  = monthlyPayment(loan, rate, term);
    const effRent   = grossRent * (1 - vacancyPct);
    const taxMo     = taxAnn / 12;
    const insMo     = insAnn / 12;
    const maintMo   = (price * maintPct) / 12;
    const mgmtMo    = grossRent * mgmtPct;

    const totalExp  = mortgage + taxMo + insMo + maintMo + mgmtMo + otherMo;
    const cashflow  = effRent - totalExp;
    const annCF     = cashflow * 12;

    const noi        = effRent * 12 - (taxAnn + insAnn + price * maintPct + mgmtMo * 12 + otherMo * 12);
    const capRate    = price > 0 ? (noi / price) * 100 : 0;
    const cocReturn  = downAmt > 0 ? (annCF / downAmt) * 100 : 0;
    const grm        = grossRent > 0 ? price / (grossRent * 12) : 0;

    const cashInvested = downAmt;

    const principalY1 = (function () {
      let bal = loan, p = 0;
      const r = rate / 100 / 12;
      for (let i = 0; i < 12; i++) {
        const int = bal * r;
        const pri = mortgage - int;
        p += pri;
        bal -= pri;
      }
      return p;
    })();

    const balAfter5 = (function () {
      let bal = loan;
      const r = rate / 100 / 12;
      for (let i = 0; i < 60; i++) {
        const int = bal * r;
        const pri = mortgage - int;
        bal -= pri;
      }
      return bal;
    })();

    const priceAfter5  = price * Math.pow(1 + appreciationPct, 5);
    const equityAfter5 = priceAfter5 - balAfter5;

    const rentRatio = price > 0 ? (grossRent / price) * 100 : 0;

    document.getElementById('r-cashflow').textContent   = fmtDollar(cashflow);
    document.getElementById('r-cashflow').style.color   = cashflow >= 0 ? '#4ade80' : '#f87171';
    document.getElementById('r-eff-rent').textContent   = fmtDollar(effRent);
    document.getElementById('r-mortgage').textContent   = fmtDollar(mortgage);
    document.getElementById('r-tax-ins').textContent    = fmtDollar(taxMo + insMo);
    document.getElementById('r-maint-mo').textContent   = fmtDollar(maintMo);
    document.getElementById('r-mgmt-mo').textContent    = fmtDollar(mgmtMo);
    document.getElementById('r-other-mo').textContent   = fmtDollar(otherMo);

    document.getElementById('r-cap-rate').textContent      = fmtPct(capRate);
    document.getElementById('r-coc').textContent           = fmtPct(cocReturn);
    document.getElementById('r-grm').textContent           = fmt(grm, 1) + 'x';
    document.getElementById('r-annual-cf').textContent     = fmtDollar(annCF);
    document.getElementById('r-cash-invested').textContent = fmtDollar(cashInvested);
    document.getElementById('r-5yr-equity').textContent    = fmtDollar(equityAfter5);

    document.getElementById('r-1pct-pct').textContent = fmtPct(rentRatio, 2);
    const barW = Math.min(100, (rentRatio / 2) * 100);
    document.getElementById('r-1pct-bar').style.width = barW + '%';
    document.getElementById('r-1pct-bar').style.background = rentRatio >= 1 ? '#16a34a' : rentRatio >= 0.75 ? '#d97706' : '#dc2626';

    const statusEl = document.getElementById('r-1pct-status');
    if (rentRatio >= 1) {
      statusEl.textContent = 'Passes the 1% rule — strong cash flow potential';
      statusEl.className = 'rule-status rule-pass';
    } else if (rentRatio >= 0.75) {
      statusEl.textContent = 'Close — may still work depending on expenses';
      statusEl.className = 'rule-status rule-close';
    } else {
      statusEl.textContent = 'Does not meet the 1% rule — review your numbers carefully';
      statusEl.className = 'rule-status rule-fail';
    }
  }

  ['r-price','r-down','r-rate','r-term','r-rent','r-vacancy','r-tax','r-ins',
   'r-maint','r-mgmt','r-other','r-appreciation'].forEach(id => {
    document.getElementById(id).addEventListener('input', calc);
  });

  calc();
})();

/* ============================================================
   AMORTIZATION TAB
============================================================ */
(function () {
  function get(id) { return parseFloat(document.getElementById(id).value) || 0; }

  function buildSchedule(loan, rate, term, extraPmt) {
    const r = rate / 100 / 12;
    const basePayment = monthlyPayment(loan, rate, term);
    const payment = basePayment + extraPmt;
    let balance = loan;
    const rows = [];
    let totalInt = 0;

    for (let m = 1; balance > 0.01; m++) {
      const intCharge = balance * r;
      let principal = Math.min(balance, payment - intCharge);
      if (principal <= 0) principal = 0;
      balance = Math.max(0, balance - principal);
      totalInt += intCharge;
      rows.push({ month: m, payment: principal + intCharge, principal, interest: intCharge, balance, totalInt });
    }

    return { rows, basePayment, totalInterest: totalInt };
  }

  function renderYearly(rows, loan) {
    const byYear = {};
    rows.forEach(r => {
      const yr = Math.ceil(r.month / 12);
      if (!byYear[yr]) byYear[yr] = { payment: 0, principal: 0, interest: 0, balance: r.balance, totalInt: r.totalInt };
      byYear[yr].payment   += r.payment;
      byYear[yr].principal += r.principal;
      byYear[yr].interest  += r.interest;
      byYear[yr].balance    = r.balance;
    });

    return Object.entries(byYear).map(([yr, d]) => {
      const equity = loan - d.balance;
      return `<tr>
        <td>${yr}</td>
        <td>${fmtDollar(d.payment)}</td>
        <td>${fmtDollar(d.principal)}</td>
        <td class="interest">${fmtDollar(d.interest)}</td>
        <td>${fmtDollar(d.balance)}</td>
        <td class="equity">${fmtDollar(equity)}</td>
      </tr>`;
    }).join('');
  }

  function renderMonthly(rows, loan) {
    return rows.map(r => {
      const equity = loan - r.balance;
      return `<tr>
        <td>Month ${r.month}</td>
        <td>${fmtDollar(r.payment)}</td>
        <td>${fmtDollar(r.principal)}</td>
        <td class="interest">${fmtDollar(r.interest)}</td>
        <td>${fmtDollar(r.balance)}</td>
        <td class="equity">${fmtDollar(equity)}</td>
      </tr>`;
    }).join('');
  }

  function drawAmortChart(rows, loan) {
    const canvas = document.getElementById('am-chart');
    const W = canvas.offsetWidth || 600;
    canvas.width = W;
    const H = 180;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const byYear = {};
    rows.forEach(r => {
      const yr = Math.ceil(r.month / 12);
      if (!byYear[yr]) byYear[yr] = { principal: 0, interest: 0, balance: r.balance };
      byYear[yr].principal += r.principal;
      byYear[yr].interest  += r.interest;
      byYear[yr].balance    = r.balance;
    });

    const years = Object.values(byYear);
    const maxVal = Math.max(...years.map(y => y.principal + y.interest));
    const pad = { t: 10, r: 10, b: 30, l: 10 };
    const chartW = W - pad.l - pad.r;
    const chartH = H - pad.t - pad.b;
    const barW = chartW / years.length;

    years.forEach((y, i) => {
      const x = pad.l + i * barW;
      const intH  = (y.interest  / maxVal) * chartH;
      const priH  = (y.principal / maxVal) * chartH;

      ctx.fillStyle = '#fca5a5';
      ctx.fillRect(x + 1, pad.t + chartH - intH, barW - 2, intH);

      ctx.fillStyle = '#93c5fd';
      ctx.fillRect(x + 1, pad.t + chartH - intH - priH, barW - 2, priH);
    });

    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    const step = Math.ceil(years.length / 10);
    years.forEach((_, i) => {
      if (i % step === 0 || i === years.length - 1) {
        const x = pad.l + (i + 0.5) * barW;
        ctx.fillText('Yr ' + (i + 1), x, H - 6);
      }
    });
  }

  function calc() {
    const price   = get('am-price');
    const downPct = get('am-down') / 100;
    const rate    = get('am-rate');
    const term    = parseInt(document.getElementById('am-term').value);
    const extra   = get('am-extra');
    const view    = document.getElementById('am-view').value;

    const loan = Math.max(0, price * (1 - downPct));

    const { rows, basePayment, totalInterest } = buildSchedule(loan, rate, term, extra);
    const { rows: baseRows, totalInterest: baseTotalInterest } = buildSchedule(loan, rate, term, 0);

    const payoffDate = addMonths(new Date(), rows.length);
    const baseMos    = term * 12;
    const savedMos   = baseMos - rows.length;
    const savedInt   = baseTotalInterest - totalInterest;

    document.getElementById('am-payment').textContent    = fmtDollar(basePayment + extra);
    document.getElementById('am-payoff').textContent     = formatDate(payoffDate);
    document.getElementById('am-interest').textContent   = fmtDollar(totalInterest);
    document.getElementById('am-saved').textContent      = extra > 0 ? fmtDollar(savedInt) : '$0';

    if (savedMos > 0) {
      const yrs = Math.floor(savedMos / 12);
      const mos = savedMos % 12;
      document.getElementById('am-time-saved').textContent =
        yrs > 0 ? `${yrs}y ${mos}m` : `${mos}m`;
    } else {
      document.getElementById('am-time-saved').textContent = '—';
    }

    const tbody = document.getElementById('amort-body');
    tbody.innerHTML = view === 'yearly' ? renderYearly(rows, loan) : renderMonthly(rows, loan);

    drawAmortChart(rows, loan);
  }

  ['am-price','am-down','am-rate','am-term','am-extra','am-view'].forEach(id => {
    document.getElementById(id).addEventListener('input', calc);
  });

  window.addEventListener('resize', () => {
    calc();
  });

  calc();
})();

/* ============================================================
   COMPARE TAB
============================================================ */
(function () {
  function get(id) { return parseFloat(document.getElementById(id).value) || 0; }

  function getScenarios() {
    const cards = document.querySelectorAll('.compare-scenario');
    return Array.from(cards).map(card => ({
      rate:   parseFloat(card.querySelector('.cmp-rate').value)   || 0,
      term:   parseInt(card.querySelector('.cmp-term').value)     || 30,
      points: parseFloat(card.querySelector('.cmp-points').value) || 0,
    }));
  }

  const COLORS = ['#2563eb', '#16a34a', '#d97706'];

  function calcScenario(price, downPct, rate, term, points) {
    const down = price * downPct / 100;
    const loan = Math.max(0, price - down);
    const pi   = monthlyPayment(loan, rate, term);
    const totalInt   = pi * term * 12 - loan;
    const pointsCost = loan * points / 100;
    const total = loan + totalInt + pointsCost;
    return { pi, totalInt, pointsCost, total };
  }

  function drawCompareChart(price, downPct, scenarios) {
    const canvas = document.getElementById('compare-chart');
    const W = canvas.offsetWidth || 700;
    canvas.width = W;
    const H = 260;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const maxTerm = Math.max(...scenarios.map(s => s.term));
    const years = Array.from({ length: maxTerm }, (_, i) => i + 1);

    const pad = { t: 20, r: 20, b: 40, l: 60 };
    const chartW = W - pad.l - pad.r;
    const chartH = H - pad.t - pad.b;

    const lines = scenarios.map((s) => {
      const down = price * downPct / 100;
      const loan = Math.max(0, price - down);
      const pi   = monthlyPayment(loan, s.rate, s.term);
      const r    = s.rate / 100 / 12;
      let bal    = loan;
      const pts  = [];
      for (let y = 1; y <= maxTerm; y++) {
        let cumInt = 0;
        for (let m = 0; m < 12; m++) {
          const intCh = bal * r;
          const priCh = Math.min(bal, pi - intCh);
          cumInt += intCh;
          bal = Math.max(0, bal - priCh);
          if (bal <= 0.01) break;
        }
        pts.push({ y, cumPaid: (pi * Math.min(y * 12, s.term * 12) + loan * s.points / 100) });
        if (bal <= 0.01) { for (let ry = y + 1; ry <= maxTerm; ry++) pts.push({ y: ry, cumPaid: pts[pts.length - 1].cumPaid }); break; }
      }
      return pts;
    });

    const maxVal = Math.max(...lines.flat().map(p => p.cumPaid));

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    [0, 0.25, 0.5, 0.75, 1].forEach(t => {
      const y = pad.t + chartH * (1 - t);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + chartW, y); ctx.stroke();
      ctx.fillStyle = '#9ca3af';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(fmtDollar(maxVal * t, 0), pad.l - 4, y + 4);
    });

    lines.forEach((pts, idx) => {
      ctx.beginPath();
      ctx.strokeStyle = COLORS[idx];
      ctx.lineWidth = 2.5;
      pts.forEach((p, i) => {
        const x = pad.l + ((p.y - 1) / (maxTerm - 1)) * chartW;
        const y = pad.t + chartH * (1 - p.cumPaid / maxVal);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

    const stepX = Math.ceil(maxTerm / 8);
    years.forEach((yr, i) => {
      if (i % stepX === 0 || yr === maxTerm) {
        const x = pad.l + (i / (maxTerm - 1)) * chartW;
        ctx.fillStyle = '#9ca3af';
        ctx.font = '11px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Yr ' + yr, x, H - 8);
      }
    });

    const legend = document.getElementById('compare-legend');
    legend.innerHTML = ['A','B','C'].map((l, i) =>
      `<div class="legend-item"><span class="legend-dot" style="background:${COLORS[i]}"></span>Scenario ${l}</div>`
    ).join('');
  }

  function calc() {
    const price   = get('cmp-price');
    const downPct = get('cmp-down');
    const scenarios = getScenarios();
    const down = price * downPct / 100;
    const loan = Math.max(0, price - down);

    const cards = document.querySelectorAll('.compare-scenario');
    const results = scenarios.map(s => calcScenario(price, downPct, s.rate, s.term, s.points));

    cards.forEach((card, i) => {
      const r = results[i];
      card.querySelector('.cmp-pi').textContent       = fmtDollar(r.pi);
      card.querySelector('.cmp-int').textContent      = fmtDollar(r.totalInt);
      card.querySelector('.cmp-pts-cost').textContent = fmtDollar(r.pointsCost);
      card.querySelector('.cmp-total').textContent    = fmtDollar(r.total);

      const bkEl = card.querySelector('.cmp-breakeven');
      if (i === 0) {
        bkEl.textContent = 'Baseline';
      } else {
        const monthlySavings = results[0].pi - r.pi;
        const extraCost = r.pointsCost - results[0].pointsCost + (r.totalInt - results[0].totalInt);
        if (monthlySavings > 0 && extraCost > 0) {
          const mos = Math.ceil(extraCost / monthlySavings);
          bkEl.textContent = `${mos} months`;
        } else if (monthlySavings < 0) {
          bkEl.textContent = 'Never (higher cost)';
        } else {
          bkEl.textContent = 'Immediate';
        }
      }
    });

    drawCompareChart(price, downPct, scenarios);
  }

  document.getElementById('cmp-price').addEventListener('input', calc);
  document.getElementById('cmp-down').addEventListener('input', calc);

  document.querySelectorAll('.cmp-rate, .cmp-term, .cmp-points').forEach(el => {
    el.addEventListener('input', calc);
  });

  window.addEventListener('resize', calc);

  calc();
})();

/* ============================================================
   REPAIR COSTS TAB
============================================================ */
(function () {
  const REPAIR_DATA = [
    { cat: 'Kitchen', color: '#f59e0b', items: [
      { id: 'kit-full',       name: 'Full Kitchen Remodel',    unit: 'job',  low: 15000, high: 45000, avg: 25000 },
      { id: 'kit-cabs',       name: 'Cabinet Replacement',     unit: 'job',  low: 4000,  high: 15000, avg: 8000  },
      { id: 'kit-counters',   name: 'Countertops',             unit: 'job',  low: 2500,  high: 6500,  avg: 4000  },
      { id: 'kit-appliances', name: 'Appliance Package',       unit: 'pkg',  low: 2000,  high: 6000,  avg: 3500  },
      { id: 'kit-flooring',   name: 'Kitchen Flooring',        unit: 'sqft', low: 3,     high: 10,    avg: 6     },
      { id: 'kit-sink',       name: 'Sink &amp; Faucet',       unit: 'ea',   low: 400,   high: 1200,  avg: 700   },
      { id: 'kit-backsplash', name: 'Backsplash',              unit: 'job',  low: 800,   high: 2500,  avg: 1500  },
    ]},
    { cat: 'Bathrooms', color: '#06b6d4', items: [
      { id: 'bath-full',   name: 'Full Bath Remodel',          unit: 'ea',   low: 8000,  high: 20000, avg: 12000 },
      { id: 'bath-half',   name: 'Half Bath Remodel',          unit: 'ea',   low: 3000,  high: 8000,  avg: 5000  },
      { id: 'bath-tile',   name: 'Tub/Shower Tile',            unit: 'ea',   low: 800,   high: 3000,  avg: 1500  },
      { id: 'bath-toilet', name: 'Toilet Replacement',         unit: 'ea',   low: 200,   high: 600,   avg: 350   },
      { id: 'bath-vanity', name: 'Vanity &amp; Sink',          unit: 'ea',   low: 500,   high: 2500,  avg: 1200  },
      { id: 'bath-floor',  name: 'Bath Flooring',              unit: 'sqft', low: 4,     high: 12,    avg: 7     },
    ]},
    { cat: 'Flooring', color: '#8b5cf6', items: [
      { id: 'fl-hardwood', name: 'Hardwood (install/refinish)', unit: 'sqft', low: 5,   high: 12,  avg: 8   },
      { id: 'fl-lvp',      name: 'LVP / LVT',                  unit: 'sqft', low: 3,   high: 8,   avg: 5   },
      { id: 'fl-carpet',   name: 'Carpet',                     unit: 'sqft', low: 2,   high: 6,   avg: 3.5 },
      { id: 'fl-tile',     name: 'Tile',                       unit: 'sqft', low: 5,   high: 15,  avg: 9   },
    ]},
    { cat: 'Roof', color: '#ef4444', items: [
      { id: 'roof-full',    name: 'Full Roof Replacement',      unit: 'sq',  low: 350,  high: 600,  avg: 450  },
      { id: 'roof-partial', name: 'Partial Roof Repair',        unit: 'job', low: 500,  high: 3000, avg: 1200 },
      { id: 'roof-gutters', name: 'Gutter Replacement',         unit: 'lft', low: 5,    high: 12,   avg: 8    },
    ]},
    { cat: 'HVAC', color: '#f97316', items: [
      { id: 'hvac-full',    name: 'Full HVAC System',           unit: 'ea',  low: 7000,  high: 15000, avg: 10000 },
      { id: 'hvac-furnace', name: 'Furnace Replacement',        unit: 'ea',  low: 2500,  high: 6000,  avg: 4000  },
      { id: 'hvac-ac',      name: 'A/C Unit',                   unit: 'ea',  low: 3000,  high: 7000,  avg: 4500  },
      { id: 'hvac-wh',      name: 'Water Heater (tank)',        unit: 'ea',  low: 900,   high: 2000,  avg: 1300  },
      { id: 'hvac-wh-tl',   name: 'Water Heater (tankless)',    unit: 'ea',  low: 1500,  high: 3500,  avg: 2200  },
      { id: 'hvac-ducts',   name: 'Ductwork (partial)',         unit: 'job', low: 1000,  high: 4000,  avg: 2000  },
    ]},
    { cat: 'Electrical', color: '#eab308', items: [
      { id: 'elec-panel',   name: 'Panel Upgrade (200A)',       unit: 'ea',  low: 1500,  high: 4000,  avg: 2500  },
      { id: 'elec-rewire',  name: 'Full Rewire',                unit: 'job', low: 8000,  high: 20000, avg: 12000 },
      { id: 'elec-outlets', name: 'Outlets / Switches',         unit: 'ea',  low: 150,   high: 300,   avg: 200   },
      { id: 'elec-fans',    name: 'Ceiling Fans',               unit: 'ea',  low: 200,   high: 600,   avg: 350   },
      { id: 'elec-lights',  name: 'Light Fixtures',             unit: 'ea',  low: 100,   high: 400,   avg: 200   },
    ]},
    { cat: 'Plumbing', color: '#0ea5e9', items: [
      { id: 'plumb-repipe',   name: 'Full Repipe',              unit: 'job', low: 5000,  high: 15000, avg: 8000  },
      { id: 'plumb-fixtures', name: 'Plumbing Fixtures',        unit: 'ea',  low: 200,   high: 500,   avg: 300   },
      { id: 'plumb-sewer',    name: 'Sewer Line',               unit: 'job', low: 3000,  high: 8000,  avg: 5000  },
      { id: 'plumb-drains',   name: 'Drain Cleaning',           unit: 'job', low: 150,   high: 500,   avg: 300   },
    ]},
    { cat: 'Exterior', color: '#22c55e', items: [
      { id: 'ext-paint',    name: 'Exterior Paint',             unit: 'job', low: 2500,  high: 6000,  avg: 3800  },
      { id: 'ext-siding',   name: 'Siding Replacement',         unit: 'job', low: 8000,  high: 20000, avg: 12000 },
      { id: 'ext-driveway', name: 'Driveway (concrete/asphalt)',unit: 'job', low: 3000,  high: 8000,  avg: 5000  },
      { id: 'ext-landscape',name: 'Landscaping / Curb Appeal',  unit: 'job', low: 1000,  high: 4000,  avg: 2000  },
      { id: 'ext-deck',     name: 'Deck / Patio',               unit: 'sqft',low: 15,    high: 50,    avg: 30    },
      { id: 'ext-fence',    name: 'Fence',                      unit: 'lft', low: 20,    high: 50,    avg: 32    },
      { id: 'ext-garage',   name: 'Garage Door',                unit: 'ea',  low: 800,   high: 2500,  avg: 1500  },
      { id: 'ext-windows',  name: 'Windows (replacement)',      unit: 'ea',  low: 400,   high: 1000,  avg: 650   },
    ]},
    { cat: 'Interior', color: '#a855f7', items: [
      { id: 'int-paint',   name: 'Interior Paint (whole house)',unit: 'job', low: 2000,  high: 5000,  avg: 3200  },
      { id: 'int-doors',   name: 'Interior Doors',              unit: 'ea',  low: 200,   high: 500,   avg: 300   },
      { id: 'int-trim',    name: 'Trim &amp; Baseboards',       unit: 'job', low: 800,   high: 2500,  avg: 1500  },
      { id: 'int-drywall', name: 'Drywall Repair / Replace',    unit: 'job', low: 500,   high: 3000,  avg: 1500  },
      { id: 'int-closets', name: 'Closet Systems',              unit: 'ea',  low: 300,   high: 1200,  avg: 600   },
    ]},
    { cat: 'Foundation / Structural', color: '#6b7280', items: [
      { id: 'found-crack', name: 'Foundation Crack Repair',     unit: 'job', low: 500,   high: 3000,  avg: 1500  },
      { id: 'found-crawl', name: 'Crawl Space Encapsulation',   unit: 'job', low: 3000,  high: 8000,  avg: 5000  },
      { id: 'found-water', name: 'Basement Waterproofing',      unit: 'job', low: 5000,  high: 15000, avg: 8000  },
      { id: 'found-beam',  name: 'Structural Beam / Post',      unit: 'ea',  low: 1500,  high: 5000,  avg: 3000  },
    ]},
  ];

  const PRESETS = {
    cosmetic: {
      desc: 'Light updates only — interior paint, carpet/flooring, landscaping, minor fixtures. No major systems work.',
      items: { 'int-paint': 1, 'fl-carpet': 800, 'ext-landscape': 1, 'elec-lights': 8, 'bath-toilet': 2, 'bath-vanity': 1, 'kit-sink': 1 }
    },
    light: {
      desc: 'Cosmetic plus kitchen update, 1–2 bath refreshes, new flooring throughout, paint, and minor HVAC.',
      items: { 'int-paint': 1, 'fl-lvp': 1200, 'kit-cabs': 1, 'kit-counters': 1, 'kit-appliances': 1, 'kit-sink': 1, 'kit-backsplash': 1, 'bath-full': 1, 'bath-vanity': 2, 'bath-toilet': 2, 'ext-landscape': 1, 'ext-paint': 1, 'elec-lights': 10, 'hvac-wh': 1 }
    },
    full: {
      desc: 'Full renovation — new kitchen, all baths, flooring, windows, roof repair, systems updates, interior and exterior.',
      items: { 'int-paint': 1, 'int-drywall': 1, 'int-trim': 1, 'fl-lvp': 1400, 'kit-full': 1, 'bath-full': 2, 'bath-half': 1, 'ext-paint': 1, 'ext-windows': 8, 'ext-garage': 1, 'roof-partial': 1, 'hvac-wh': 1, 'hvac-ac': 1, 'elec-panel': 1, 'elec-lights': 12, 'ext-landscape': 1, 'bath-toilet': 3 }
    },
    gut: {
      desc: 'Complete gut rehab — all new HVAC, electrical, plumbing, roof, kitchen, bathrooms, and finishes.',
      items: { 'kit-full': 1, 'bath-full': 2, 'bath-half': 1, 'fl-hardwood': 1400, 'int-paint': 1, 'int-drywall': 1, 'int-trim': 1, 'int-doors': 8, 'ext-paint': 1, 'ext-windows': 10, 'roof-full': 18, 'hvac-full': 1, 'hvac-wh': 1, 'elec-panel': 1, 'elec-rewire': 1, 'plumb-repipe': 1, 'ext-landscape': 1, 'ext-driveway': 1 }
    }
  };

  function getQtyInput(id) { return document.querySelector(`input[data-id="${id}"]`); }
  function getCostInput(id) { return document.querySelector(`input[data-cost="${id}"]`); }
  function getCheck(id)     { return document.querySelector(`input[data-check="${id}"]`); }

  function buildTable() {
    const tbody = document.getElementById('repair-body');
    tbody.innerHTML = '';
    REPAIR_DATA.forEach(cat => {
      const hdr = document.createElement('tr');
      hdr.className = 'cat-header-row';
      hdr.innerHTML = `<td colspan="6"><span class="cat-badge" style="background:${cat.color}"></span>${cat.cat}</td>`;
      tbody.appendChild(hdr);

      cat.items.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'repair-row excluded';
        tr.dataset.itemId = item.id;
        const rangeStr = item.unit === 'sqft' || item.unit === 'lft' || item.unit === 'sq'
          ? `$${fmt(item.low)}-$${fmt(item.high)} /${item.unit}`
          : `$${fmt(item.low)}-$${fmt(item.high)}`;
        tr.innerHTML = `
          <td style="text-align:center"><input type="checkbox" data-check="${item.id}" /></td>
          <td>${item.name} <span style="font-size:11px;color:var(--gray-400)">(${item.unit})</span></td>
          <td><span class="repair-range">${rangeStr}</span></td>
          <td><input type="number" data-id="${item.id}" value="0" min="0" step="1" /></td>
          <td><input type="number" data-cost="${item.id}" value="${item.avg}" min="0" step="1" /></td>
          <td class="repair-subtotal" data-sub="${item.id}">—</td>`;
        tbody.appendChild(tr);

        tr.querySelector(`input[data-check="${item.id}"]`).addEventListener('change', (e) => {
          tr.classList.toggle('excluded', !e.target.checked);
          calcRepairs();
        });
        tr.querySelector(`input[data-id="${item.id}"]`).addEventListener('input', calcRepairs);
        tr.querySelector(`input[data-cost="${item.id}"]`).addEventListener('input', calcRepairs);
      });
    });
  }

  function calcRepairs() {
    let hard = 0;
    let count = 0;

    REPAIR_DATA.forEach(cat => {
      cat.items.forEach(item => {
        const checked = getCheck(item.id)?.checked;
        const qty  = parseFloat(getQtyInput(item.id)?.value) || 0;
        const cost = parseFloat(getCostInput(item.id)?.value) || 0;
        const sub  = checked ? qty * cost : 0;
        const subEl = document.querySelector(`[data-sub="${item.id}"]`);
        if (subEl) {
          subEl.textContent = checked && qty > 0 ? fmtDollar(sub) : '—';
          subEl.classList.toggle('active', checked && qty > 0);
        }
        if (checked) { hard += sub; if (qty > 0) count++; }
      });
    });

    const permits     = parseFloat(document.getElementById('rep-permits').value)     || 0;
    const contingPct  = parseFloat(document.getElementById('rep-contingency').value) || 0;
    const sqft        = parseFloat(document.getElementById('rep-sqft').value)        || 0;
    const contingency = hard * contingPct / 100;
    const total       = hard + permits + contingency;

    document.getElementById('rep-hard').textContent            = fmtDollar(hard);
    document.getElementById('rep-permits-disp').textContent    = fmtDollar(permits);
    document.getElementById('rep-contingency-disp').textContent= fmtDollar(contingency);
    document.getElementById('rep-total').textContent           = fmtDollar(total);
    document.getElementById('rep-item-count').textContent      = count;
    document.getElementById('rep-per-sqft').textContent        = sqft > 0 ? '$' + fmt(total / sqft, 2) + '/sqft' : '—';

    const flipIn = document.getElementById('flip-repairs-in');
    if (flipIn) { flipIn.value = Math.round(total); calcFlip(); }
  }

  function applyPreset(key) {
    const preset = PRESETS[key];
    if (!preset) return;
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.toggle('active', b.dataset.preset === key));
    document.getElementById('preset-desc').textContent = preset.desc;

    REPAIR_DATA.forEach(cat => {
      cat.items.forEach(item => {
        const chk  = getCheck(item.id);
        const qIn  = getQtyInput(item.id);
        const costIn = getCostInput(item.id);
        const row  = document.querySelector(`tr[data-item-id="${item.id}"]`);
        const val  = preset.items[item.id];
        const on   = val !== undefined;
        if (chk)  chk.checked  = on;
        if (qIn)  qIn.value   = on ? val : 0;
        if (costIn) costIn.value = item.avg;
        if (row) row.classList.toggle('excluded', !on);
      });
    });
    calcRepairs();
  }

  document.querySelectorAll('.preset-btn').forEach(b => b.addEventListener('click', () => applyPreset(b.dataset.preset)));

  document.getElementById('repair-select-all').addEventListener('click', () => {
    REPAIR_DATA.forEach(cat => cat.items.forEach(item => {
      const chk = getCheck(item.id);
      const row = document.querySelector(`tr[data-item-id="${item.id}"]`);
      if (chk) chk.checked = true;
      if (row) row.classList.remove('excluded');
    }));
    calcRepairs();
  });

  document.getElementById('repair-clear-all').addEventListener('click', () => {
    REPAIR_DATA.forEach(cat => cat.items.forEach(item => {
      const chk = getCheck(item.id);
      const qIn = getQtyInput(item.id);
      const row = document.querySelector(`tr[data-item-id="${item.id}"]`);
      if (chk) chk.checked = false;
      if (qIn) qIn.value = 0;
      if (row) row.classList.add('excluded');
    }));
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('preset-desc').textContent = 'Select a preset to auto-fill typical line items.';
    calcRepairs();
  });

  document.getElementById('repair-reset-costs').addEventListener('click', () => {
    REPAIR_DATA.forEach(cat => cat.items.forEach(item => {
      const costIn = getCostInput(item.id);
      if (costIn) costIn.value = item.avg;
    }));
    calcRepairs();
  });

  ['rep-permits','rep-contingency','rep-sqft'].forEach(id => {
    document.getElementById(id).addEventListener('input', calcRepairs);
  });

  /* ---- Flip Profit Calculator ---- */
  function calcFlip() {
    const purchase   = parseFloat(document.getElementById('flip-purchase').value)   || 0;
    const arv        = parseFloat(document.getElementById('flip-arv').value)        || 0;
    const repairs    = parseFloat(document.getElementById('flip-repairs-in').value) || 0;
    const rate       = parseFloat(document.getElementById('flip-rate').value)       || 0;
    const hold       = parseFloat(document.getElementById('flip-hold').value)       || 0;
    const closeBuyPct= parseFloat(document.getElementById('flip-close-buy').value)  || 0;
    const closeSellPct= parseFloat(document.getElementById('flip-close-sell').value)|| 0;
    const carry      = parseFloat(document.getElementById('flip-carry').value)      || 0;

    const loanInterest = purchase * (rate / 100) * (hold / 12);
    const holding      = loanInterest + carry * hold;
    const closeBuy     = purchase * closeBuyPct / 100;
    const closeSell    = arv * closeSellPct / 100;
    const profit       = arv - purchase - repairs - holding - closeBuy - closeSell;
    const cashIn       = purchase * closeBuyPct / 100 + purchase + repairs;
    const roi          = cashIn > 0 ? (profit / cashIn) * 100 : 0;
    const annRoi       = hold > 0 ? roi * (12 / hold) : 0;
    const margin       = arv > 0 ? (profit / arv) * 100 : 0;
    const mao70        = arv * 0.70 - repairs;

    document.getElementById('flip-profit').textContent      = fmtDollar(profit);
    document.getElementById('flip-profit').style.color      = profit >= 0 ? '#4ade80' : '#f87171';
    document.getElementById('flip-profit-stat').textContent = fmtDollar(profit);
    document.getElementById('flip-profit-stat').className   = 'stat-value ' + (profit >= 0 ? 'highlight-green' : 'highlight-red');
    document.getElementById('flip-arv-disp').textContent    = fmtDollar(arv);
    document.getElementById('flip-purchase-disp').textContent= fmtDollar(purchase);
    document.getElementById('flip-repairs-disp').textContent = fmtDollar(repairs);
    document.getElementById('flip-holding-disp').textContent = fmtDollar(holding);
    document.getElementById('flip-closebuy-disp').textContent= fmtDollar(closeBuy);
    document.getElementById('flip-closesell-disp').textContent=fmtDollar(closeSell);
    document.getElementById('flip-roi').textContent         = fmtPct(roi);
    document.getElementById('flip-ann-roi').textContent     = fmtPct(annRoi);
    document.getElementById('flip-margin').textContent      = fmtPct(margin);
    document.getElementById('flip-mao70').textContent       = fmtDollar(mao70);
    document.getElementById('flip-holding-stat').textContent= fmtDollar(holding);
  }

  ['flip-purchase','flip-arv','flip-repairs-in','flip-rate','flip-hold',
   'flip-close-buy','flip-close-sell','flip-carry'].forEach(id => {
    document.getElementById(id).addEventListener('input', calcFlip);
  });

  buildTable();
  calcRepairs();
  calcFlip();
})();

/* ============================================================
   BUY BOX TAB
============================================================ */
(function () {
  function get(id) { return parseFloat(document.getElementById(id).value) || 0; }
  function txt(id) { return document.getElementById(id).value.trim(); }

  /* ---- MAO Calculator ---- */
  function calcMAO() {
    const arv     = get('mao-arv');
    const repairs = get('mao-repairs');
    const closePct= get('mao-closing');
    const profit  = get('mao-profit');

    const sell = arv * closePct / 100;

    document.getElementById('mao-65').textContent     = fmtDollar(arv * 0.65 - repairs);
    document.getElementById('mao-70').textContent     = fmtDollar(arv * 0.70 - repairs);
    document.getElementById('mao-75').textContent     = fmtDollar(arv * 0.75 - repairs);
    document.getElementById('mao-custom').textContent = fmtDollar(arv - repairs - sell - profit);
  }

  ['mao-arv','mao-repairs','mao-closing','mao-profit'].forEach(id => {
    document.getElementById(id).addEventListener('input', calcMAO);
  });

  /* ---- Deal Analyzer ---- */
  function calcDeal() {
    const asking   = get('deal-asking');
    const arv      = get('deal-arv');
    const repairs  = get('deal-repairs');
    const beds     = parseInt(document.getElementById('deal-beds').value) || 0;
    const sqft     = get('deal-sqft');

    const sellCostPct = get('bb-sell-costs');
    const sell        = arv * sellCostPct / 100;
    const profit      = arv - asking - repairs - sell;
    const cashIn      = asking + repairs;
    const roi         = cashIn > 0 ? (profit / cashIn) * 100 : 0;
    const mao70       = arv * 0.70 - repairs;

    const minProfit   = get('bb-min-profit');
    const minRoi      = get('bb-min-roi');
    const maxPrice    = get('bb-max-price');
    const minPrice    = get('bb-min-price');
    const maxRepairs  = get('bb-max-repairs');
    const minBeds     = parseInt(document.getElementById('bb-min-beds').value) || 0;
    const minSqft     = get('bb-min-sqft');

    document.getElementById('deal-mao').textContent    = fmtDollar(mao70);
    document.getElementById('deal-profit').textContent = fmtDollar(profit);
    document.getElementById('deal-roi').textContent    = fmtPct(roi);

    const overMAO  = asking > mao70;
    const diff     = mao70 - asking;
    document.getElementById('deal-vs-mao').textContent =
      overMAO ? fmtDollar(Math.abs(diff)) + ' over' : fmtDollar(diff) + ' under';
    document.getElementById('deal-vs-mao').style.color = overMAO ? '#f87171' : '#4ade80';

    const checks = [
      { label: 'Price in range',     pass: asking >= minPrice && asking <= maxPrice, value: `${fmtDollar(asking)} (range ${fmtDollar(minPrice)}–${fmtDollar(maxPrice)})` },
      { label: 'Below 70% MAO',      pass: asking <= mao70,                          value: `Ask ${fmtDollar(asking)} · MAO ${fmtDollar(mao70)}` },
      { label: 'Repairs in budget',  pass: repairs <= maxRepairs,                    value: `${fmtDollar(repairs)} of ${fmtDollar(maxRepairs)} max` },
      { label: 'Min profit met',     pass: profit >= minProfit,                      value: `${fmtDollar(profit)} (min ${fmtDollar(minProfit)})` },
      { label: 'Min ROI met',        pass: roi >= minRoi,                            value: `${fmtPct(roi)} (min ${fmtPct(minRoi)})` },
      { label: 'Bedroom count',      pass: beds >= minBeds,                          value: `${beds} bed (min ${minBeds})` },
      { label: 'Square footage',     pass: sqft >= minSqft || sqft === 0,            value: sqft > 0 ? `${fmt(sqft)} sqft (min ${fmt(minSqft)})` : 'Not entered' },
    ];

    const passes = checks.filter(c => c.pass).length;
    const total  = checks.length;
    const score  = passes === total ? 'A' : passes >= total - 1 ? 'B' : passes >= total - 2 ? 'C' : passes >= total - 3 ? 'D' : 'F';
    const scoreColors = { A: '#4ade80', B: '#86efac', C: '#fcd34d', D: '#fb923c', F: '#f87171' };

    document.getElementById('deal-score').textContent     = score;
    document.getElementById('deal-score').style.color     = scoreColors[score];

    const cl = document.getElementById('deal-checklist');
    cl.innerHTML = checks.map(c => `
      <div class="check-item ${c.pass ? 'pass' : 'fail'}">
        <span class="check-icon">${c.pass ? '✓' : '✗'}</span>
        <span class="check-label">${c.label}</span>
        <span class="check-value">${c.value}</span>
      </div>`).join('');
  }

  ['deal-asking','deal-arv','deal-repairs','deal-beds','deal-sqft',
   'bb-max-price','bb-min-price','bb-max-repairs','bb-min-beds','bb-min-sqft',
   'bb-min-profit','bb-min-roi','bb-sell-costs'].forEach(id => {
    document.getElementById(id).addEventListener('input', calcDeal);
  });

  /* ---- Find Listings portal links ---- */
  function updatePortalLinks() {
    const raw  = txt('search-zip');
    const min  = Math.round(get('search-min'));
    const max  = Math.round(get('search-max'));
    const beds = document.getElementById('search-beds').value;
    const zip  = encodeURIComponent(raw.replace(/\s+/g, '-'));
    const rawZip = raw.match(/^\d{5}$/) ? raw : raw;

    const zillowUrl  = `https://www.zillow.com/homes/for_sale/${zip}_rb/${min}-${max}_price/${beds}%2B_beds/`;
    const realtorUrl = `https://www.realtor.com/realestateandhomes-search/${zip}/price-${min}-${max}/beds-${beds}/`;
    const redfinUrl  = `https://www.redfin.com/zipcode/${encodeURIComponent(rawZip.replace(/\s*,.*/, '').replace(/\s+/g, '-'))}`;
    const loopnetUrl = `https://www.loopnet.com/search/residential-income-properties/${encodeURIComponent(raw)}/for-sale/`;

    document.getElementById('link-zillow').href  = zillowUrl;
    document.getElementById('link-realtor').href = realtorUrl;
    document.getElementById('link-redfin').href  = redfinUrl;
    document.getElementById('link-loopnet').href = loopnetUrl;
  }

  ['search-zip','search-min','search-max','search-beds'].forEach(id => {
    document.getElementById(id).addEventListener('input', updatePortalLinks);
  });

  /* sync buy box zip → search zip */
  document.getElementById('bb-zip').addEventListener('input', () => {
    document.getElementById('search-zip').value = document.getElementById('bb-zip').value;
    updatePortalLinks();
  });
  document.getElementById('bb-max-price').addEventListener('input', () => {
    document.getElementById('search-max').value = document.getElementById('bb-max-price').value;
    updatePortalLinks();
  });
  document.getElementById('bb-min-price').addEventListener('input', () => {
    document.getElementById('search-min').value = document.getElementById('bb-min-price').value;
    updatePortalLinks();
  });

  calcMAO();
  calcDeal();
  updatePortalLinks();
})();

/* ============================================================
   RENT VS. BUY TAB
============================================================ */
(function () {
  function get(id) { return parseFloat(document.getElementById(id).value) || 0; }

  const COLORS = { buy: '#2563eb', rent: '#16a34a' };

  function calc() {
    const price        = get('rvb-price');
    const downPct      = get('rvb-down') / 100;
    const rate         = get('rvb-rate');
    const term         = parseInt(document.getElementById('rvb-term').value);
    const taxAnn       = get('rvb-tax');
    const insAnn       = get('rvb-ins');
    const hoa          = get('rvb-hoa');
    const maintPct     = get('rvb-maint') / 100;
    const closeBuyPct  = get('rvb-close-buy') / 100;
    const closeSellPct = get('rvb-close-sell') / 100;
    const appreciationRate = get('rvb-appreciation') / 100;

    const rent0        = get('rvb-rent');
    const rentIncrease = get('rvb-rent-increase') / 100;
    const renterIns    = get('rvb-renter-ins');
    const investReturn = get('rvb-invest-return') / 100;
    const years        = Math.max(1, Math.round(get('rvb-years')));

    document.getElementById('rvb-years-label').textContent = years;

    const downAmt      = price * downPct;
    const closingBuy   = price * closeBuyPct;
    const loan         = price - downAmt;
    const pi           = monthlyPayment(loan, rate, term);

    // Month-by-month simulation
    const r      = rate / 100 / 12;
    const iRate  = investReturn / 12;

    let loanBal   = loan;
    let buyerNW   = -downAmt - closingBuy;  // starts negative (cash out)
    let renterNW  = 0;                       // renter invested down + closing
    let renterPot = downAmt + closingBuy;    // renter's investable capital

    let buyTotalCost  = downAmt + closingBuy;
    let rentTotalCost = 0;

    const buyNWByYear  = [];
    const rentNWByYear = [];
    let breakEvenYear  = null;

    for (let m = 1; m <= years * 12; m++) {
      const yr = Math.ceil(m / 12);

      // --- Buyer monthly costs ---
      const intCharge  = loanBal > 0 ? loanBal * r : 0;
      const principal  = loanBal > 0 ? Math.min(loanBal, pi - intCharge) : 0;
      loanBal          = Math.max(0, loanBal - principal);
      const taxMo      = taxAnn / 12;
      const insMo      = insAnn / 12;
      const maintMo    = (price * maintPct) / 12;
      const buyMo      = pi + taxMo + insMo + hoa + maintMo;
      buyTotalCost    += buyMo;

      // Home value with appreciation
      const homeVal    = price * Math.pow(1 + appreciationRate, m / 12);
      // Buyer net worth = home equity − outstanding loan, net of total cash spent vs. rent
      const equity     = homeVal - loanBal;
      // At sale: subtract sell-side costs
      const saleProceeds = homeVal * (1 - closeSellPct);
      buyerNW          = saleProceeds - loanBal;

      // --- Renter monthly costs ---
      const rentMo     = rent0 * Math.pow(1 + rentIncrease, (m - 1) / 12);
      const rentCostMo = rentMo + renterIns;
      rentTotalCost   += rentCostMo;

      // Renter invests the down payment + closing costs + monthly savings vs. buyer
      const monthlySavings = Math.max(0, buyMo - rentCostMo);
      renterPot = renterPot * (1 + iRate) + monthlySavings;
      renterNW  = renterPot;

      if (m % 12 === 0) {
        buyNWByYear.push(buyerNW);
        rentNWByYear.push(renterNW);

        if (breakEvenYear === null && buyerNW > renterNW) {
          breakEvenYear = yr;
        }
      }
    }

    // Month-1 costs for display
    const taxMo1  = taxAnn / 12;
    const insMo1  = insAnn / 12;
    const maintMo1 = (price * maintPct) / 12;
    const buyMo1  = pi + taxMo1 + insMo1 + hoa + maintMo1;
    const rentMo1 = rent0 + renterIns;

    const finalHomeVal = price * Math.pow(1 + appreciationRate, years);
    const finalLoanBal = loanBal;
    const finalEquity  = finalHomeVal * (1 - closeSellPct) - finalLoanBal;

    const diff    = buyerNW - renterNW;
    const buyWins = diff > 0;

    // --- Update DOM ---
    document.getElementById('rvb-buy-nw').textContent  = fmtDollar(buyerNW);
    document.getElementById('rvb-buy-nw').style.color  = buyerNW >= 0 ? '#4ade80' : '#f87171';
    document.getElementById('rvb-rent-nw').textContent = fmtDollar(renterNW);
    document.getElementById('rvb-rent-nw').style.color = '#4ade80';
    document.getElementById('rvb-diff').textContent    = (diff >= 0 ? '+' : '') + fmtDollar(diff);
    document.getElementById('rvb-diff').style.color    = diff >= 0 ? '#4ade80' : '#f87171';

    document.getElementById('rvb-verdict').textContent = buyWins
      ? `Buying beats renting by ${fmtDollar(Math.abs(diff))} after ${years} years`
      : `Renting beats buying by ${fmtDollar(Math.abs(diff))} after ${years} years`;

    document.getElementById('rvb-buy-mo').textContent        = fmtDollar(buyMo1);
    document.getElementById('rvb-rent-mo').textContent       = fmtDollar(rentMo1);
    document.getElementById('rvb-breakeven').textContent     = breakEvenYear !== null ? `Year ${breakEvenYear}` : `> ${years} yrs`;
    document.getElementById('rvb-total-buy-cost').textContent= fmtDollar(buyTotalCost);
    document.getElementById('rvb-total-rent-cost').textContent = fmtDollar(rentTotalCost);
    document.getElementById('rvb-equity').textContent        = fmtDollar(Math.max(0, finalEquity));

    drawRvbChart(buyNWByYear, rentNWByYear, years);
  }

  function drawRvbChart(buyNW, rentNW, years) {
    const canvas = document.getElementById('rvb-chart');
    const W = canvas.offsetWidth || 600;
    canvas.width = W;
    const H = 240;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const all  = [...buyNW, ...rentNW];
    const minV = Math.min(...all);
    const maxV = Math.max(...all);
    const range = maxV - minV || 1;

    const pad = { t: 20, r: 20, b: 30, l: 64 };
    const cW  = W - pad.l - pad.r;
    const cH  = H - pad.t - pad.b;

    const xOf = (yr) => pad.l + ((yr - 1) / Math.max(years - 1, 1)) * cW;
    const yOf = (v)  => pad.t + cH - ((v - minV) / range) * cH;

    // Grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const v = minV + (range * i / ticks);
      const y = yOf(v);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cW, y); ctx.stroke();
      ctx.fillStyle = '#9ca3af';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(fmtDollar(v, 0), pad.l - 4, y + 4);
    }

    // Zero line
    if (minV < 0 && maxV > 0) {
      const yz = yOf(0);
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(pad.l, yz); ctx.lineTo(pad.l + cW, yz); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw lines
    [[buyNW, COLORS.buy, 'Buying'], [rentNW, COLORS.rent, 'Renting']].forEach(([data, color]) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      data.forEach((v, i) => {
        const x = xOf(i + 1);
        const y = yOf(v);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

    // X-axis labels
    const step = Math.ceil(years / 8);
    for (let yr = 1; yr <= years; yr++) {
      if (yr === 1 || yr % step === 0 || yr === years) {
        ctx.fillStyle = '#9ca3af';
        ctx.font = '11px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Yr ' + yr, xOf(yr), H - 6);
      }
    }

    const legend = document.getElementById('rvb-legend');
    legend.innerHTML = [['Buying', COLORS.buy], ['Renting', COLORS.rent]].map(([l, c]) =>
      `<div class="legend-item"><span class="legend-dot" style="background:${c}"></span>${l}</div>`
    ).join('');
  }

  const inputs = [
    'rvb-price','rvb-down','rvb-rate','rvb-term','rvb-tax','rvb-ins','rvb-hoa',
    'rvb-maint','rvb-close-buy','rvb-close-sell','rvb-appreciation',
    'rvb-rent','rvb-rent-increase','rvb-renter-ins','rvb-invest-return','rvb-years'
  ];
  inputs.forEach(id => document.getElementById(id).addEventListener('input', calc));

  window.addEventListener('resize', calc);

  calc();
})();
