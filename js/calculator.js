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
