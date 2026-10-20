/* Calculations, formatting, rule-based data checks and rule-based insights.
   Rules are transparent: each output names the rule that produced it. No AI service is connected. */
(function () {
  'use strict';
  const TA = window.TA;
  const S = () => TA.Store;
  const NP = 'Not provided';

  /* ---------- Basic helpers ---------- */
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const pct = (n, d) => (isNum(n) && isNum(d) && d !== 0) ? (n / d) * 100 : null;
  const round = (v, dp) => { const f = Math.pow(10, dp || 0); return Math.round(v * f) / f; };
  const todayIso = () => new Date().toISOString().slice(0, 10);
  const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
  const sumKnown = (arr) => arr.reduce((t, v) => t + (isNum(v) ? v : 0), 0);

  function fmtInt(v) { return isNum(v) ? Math.round(v).toLocaleString('en-IN') : NP; }
  function fmtINR(v) { return isNum(v) ? 'INR ' + Math.round(v).toLocaleString('en-IN') : NP; }
  function fmtPct(v, dp) { if (!isNum(v)) return NP; const r = round(v, dp === undefined ? 1 : dp); return (Number.isInteger(r) ? r.toString() : r.toFixed(dp === undefined ? 1 : dp)) + '%'; }
  function fmtVal(v, unit) {
    if (!isNum(v)) return NP;
    switch (unit) {
      case '%': return fmtPct(v);
      case 'days': return (Number.isInteger(v) ? v : round(v, 1)) + ' days';
      case 'hours': return round(v, 1).toLocaleString('en-IN') + ' hours';
      case 'INR': return fmtINR(v);
      case 'score': case 'ratio': return String(round(v, 2));
      default: return Number.isInteger(v) ? fmtInt(v) : round(v, 2).toLocaleString('en-IN');
    }
  }
  function fmtDate(d) {
    if (!d) return NP;
    const t = Date.parse(d.length === 10 ? d + 'T00:00:00' : d);
    if (isNaN(t)) return d;
    return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function fmtDateTime(d) {
    if (!d) return NP;
    return new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  /* Change between two values: percentage points for % measures, absolute and relative change otherwise. */
  function deltaText(unit, prev, cur) {
    if (!isNum(prev) || !isNum(cur)) return 'Cannot compare (value missing)';
    const d = cur - prev;
    const sign = d > 0 ? '+' : (d < 0 ? '−' : '±');
    const abs = Math.abs(d);
    if (unit === '%') return sign + round(abs, 1) + ' pp (percentage points)';
    if (unit === 'days') return sign + round(abs, 1) + ' days';
    const rel = prev !== 0 ? ' (' + (d >= 0 ? '+' : '−') + round(Math.abs(d / prev * 100), 1) + '%)' : ' (relative change undefined: prior value is zero)';
    return sign + fmtVal(abs, unit).replace(/^INR /, 'INR ') + rel;
  }

  /* ---------- Lookups ---------- */
  const period = (id) => S().get('periods', id);
  const periodLabel = (id) => { const p = period(id); return p ? p.label : (id ? 'Unknown period' : NP); };
  const metric = (id) => S().get('metrics', id);
  const member = (id) => S().get('team', id);
  const subjectLabel = (v) => v === 'self' ? 'TA Head (self)' : (member(v) ? member(v).name : NP);

  function recordTitle(entity, r) {
    if (!r) return '';
    switch (entity) {
      case 'observations': { const m = metric(r.metricId); return (m ? m.name : 'Metric') + ' – ' + periodLabel(r.periodId); }
      case 'recruiterResults': { const m = member(r.memberId); return (m ? m.name : 'Team member') + ' – ' + periodLabel(r.periodId); }
      case 'feedback': return (r.provider || 'Feedback') + ' – ' + (r.theme || '') + (r.date ? ' (' + fmtDate(r.date) + ')' : '');
      default: { const t = TA.ENTITIES[entity] && TA.ENTITIES[entity].title; return (t && r[t]) || r.title || r.name || r.label || r.id; }
    }
  }

  /* ---------- Programmes ---------- */
  function progRow(p) {
    const attain = pct(p.joined, p.target);
    const gap = (isNum(p.joined) && isNum(p.target)) ? p.joined - p.target : null;
    let status;
    if (!isNum(p.joined)) status = 'Not provided';
    else if (!isNum(p.target)) status = 'No target';
    else if (p.joined > p.target) status = 'Above target';
    else if (p.joined === p.target) status = 'Target met';
    else status = 'Below target';
    return { p, attain, gap, status };
  }
  function programmeSummary(periodId) {
    const progs = S().list('programmes').filter(p => p.periodId === periodId);
    const rows = progs.map(progRow);
    const allTargets = progs.length > 0 && progs.every(p => isNum(p.target));
    const allJoined = progs.length > 0 && progs.every(p => isNum(p.joined));
    const targetSum = progs.length ? sumKnown(progs.map(p => p.target)) : null;
    const joinedSum = progs.length ? sumKnown(progs.map(p => p.joined)) : null;
    const totalObs = totalJoinedObs(periodId);
    const shortfalls = rows.filter(r => r.status === 'Below target');
    const overs = rows.filter(r => r.status === 'Above target');
    return {
      rows, count: progs.length, allTargets, allJoined, targetSum, joinedSum,
      aggregateAttain: allTargets && allJoined ? pct(joinedSum, targetSum) : null,
      reportedTotal: totalObs ? totalObs.actualReported : null, totalObs,
      shortfalls, shortfallSum: shortfalls.reduce((t, r) => t - r.gap, 0),
      overs, overSum: overs.reduce((t, r) => t + r.gap, 0),
      metOrAbove: rows.filter(r => r.status === 'Above target' || r.status === 'Target met').length
    };
  }
  /* Totals are compared only when both periods hold the same programmes with complete values. */
  function programmeSetsMatch(a, b) {
    if (!a.count || a.count !== b.count || !a.allJoined || !b.allJoined) return false;
    const na = a.rows.map(r => String(r.p.name).toLowerCase()).sort().join('|'), nb = b.rows.map(r => String(r.p.name).toLowerCase()).sort().join('|');
    return na === nb;
  }
  /* Scorecard programme (in the selected period) that a tracker programme feeds, matched by name. */
  function scorecardMatch(tp) {
    if (!tp || !tp.scorecardProgramme) return null;
    const pid = S().state.meta.selectedPeriodId;
    return S().list('programmes').find(p => p.periodId === pid && String(p.name).toLowerCase() === String(tp.scorecardProgramme).toLowerCase()) || null;
  }
  function totalJoinedObs(periodId) {
    const m = S().list('metrics').find(x => x.role === 'totalJoined');
    if (!m) return null;
    return S().list('observations').find(o => o.metricId === m.id && o.periodId === periodId) || null;
  }

  /* ---------- Metric observations ---------- */
  function obsCalc(o) {
    const m = metric(o.metricId) || {};
    const unit = m.unit;
    let recalc = null, recalcMethod = null;
    if (isNum(o.numerator) && isNum(o.denominator)) {
      if (o.denominator === 0) recalcMethod = 'Cannot recalculate: denominator is zero';
      else { recalc = unit === '%' ? o.numerator / o.denominator * 100 : o.numerator / o.denominator; recalcMethod = unit === '%' ? 'numerator ÷ denominator × 100' : 'numerator ÷ denominator'; }
    } else if (m.role === 'totalJoined') {
      const ps = programmeSummary(o.periodId);
      if (ps.count) { recalc = ps.joinedSum; recalcMethod = 'Sum of ' + ps.count + ' programme joiner figures for the same period' + (ps.allJoined ? '' : ' (some programme values missing)'); }
    }
    const reported = isNum(o.actualReported) ? o.actualReported : null;
    const value = reported !== null ? reported : recalc;
    const tol = unit === '%' ? 0.5 : Math.max(0.5, Math.abs(reported || 0) * 0.005);
    const conflict = reported !== null && recalc !== null && Math.abs(reported - recalc) > tol;
    let status = 'No target';
    if (value === null) status = 'Not provided';
    else if (isNum(o.target)) {
      if (m.direction === 'Higher is better') status = value >= o.target ? 'Target met' : 'Below target';
      else if (m.direction === 'Lower is better') status = value <= o.target ? 'Target met' : 'Above target (adverse)';
      else status = 'Target set – direction not defined';
    }
    return { m, unit, reported, recalc, recalcMethod, value, conflict, status, gap: isNum(o.target) && value !== null ? value - o.target : null };
  }

  /* ---------- Recruiter results ---------- */
  function rrCalc(r) {
    const offerRecalc = pct(r.offers, r.offerTarget);
    const joinRecalc = pct(r.joins, r.joinTarget);
    const offerConflict = isNum(r.offerAttainmentReported) && offerRecalc !== null && Math.abs(r.offerAttainmentReported - offerRecalc) > 1;
    const joinConflict = isNum(r.joinAttainmentReported) && joinRecalc !== null && Math.abs(r.joinAttainmentReported - joinRecalc) > 1;
    return { offerRecalc, joinRecalc, offerConflict, joinConflict };
  }

  /* ---------- Periods ---------- */
  function priorPeriod(p) {
    if (!p) return null;
    const cands = S().list('periods').filter(x => x.id !== p.id && x.type === p.type && (x.scope || '') === (p.scope || '') && x.end < p.start);
    cands.sort((a, b) => b.end.localeCompare(a.end));
    return cands[0] || null;
  }
  function comparability(a, b) {
    const reasons = [];
    if (!a || !b) return { ok: false, reasons: ['Select two periods.'] };
    if (a.id === b.id) reasons.push('Same period selected twice.');
    if (a.type !== b.type) reasons.push('Different period types (' + a.type + ' vs ' + b.type + ').');
    if ((a.scope || '') !== (b.scope || '')) reasons.push('Different data scopes (' + (a.scope || NP) + ' vs ' + (b.scope || NP) + ').');
    const la = daysBetween(a.start, a.end), lb = daysBetween(b.start, b.end);
    if (Math.abs(la - lb) > 3) reasons.push('Different period lengths (' + (la + 1) + ' vs ' + (lb + 1) + ' days).');
    if (a.type === 'YTD' && a.end.slice(5) !== b.end.slice(5)) reasons.push('YTD cut-offs differ (' + fmtDate(a.end) + ' vs ' + fmtDate(b.end) + ').');
    return { ok: reasons.length === 0, reasons };
  }
  function freshness(p) {
    if (!p || !p.cutoff) return { days: null, label: 'Source cut-off not provided' };
    const d = daysBetween(p.cutoff, todayIso());
    return { days: d, label: 'Source cut-off ' + fmtDate(p.cutoff) + ' (' + d + ' day' + (d === 1 ? '' : 's') + ' ago)', stale: d > 45 };
  }

  /* Trend series for a metric over periods of one type and scope. Only observations with a matching population are joined. */
  function metricTrend(metricId, type, scope, population) {
    const obs = S().list('observations').filter(o => o.metricId === metricId).map(o => ({ o, p: period(o.periodId) }))
      .filter(x => x.p && x.p.type === type && (!scope || (x.p.scope || '') === scope));
    obs.sort((a, b) => a.p.start.localeCompare(b.p.start));
    const pop = population !== undefined ? population : (obs.length ? (obs[obs.length - 1].o.population || null) : null);
    const included = [], excluded = [];
    const lastDay = (iso) => { const d = new Date(iso + 'T00:00:00'); return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); };
    obs.forEach(x => {
      const c = obsCalc(x.o);
      const partial = (type === 'Month' || type === 'Quarter') && (x.p.start.slice(8) !== '01' || +x.p.end.slice(8) !== lastDay(x.p.end));
      if (x.o.incomplete) excluded.push({ x, reason: 'Incomplete cohort (' + (x.o.calcNote || 'outcomes pending') + ')' });
      else if (partial) excluded.push({ x, reason: 'Partial ' + type.toLowerCase() + ' (' + fmtDate(x.p.start) + '–' + fmtDate(x.p.end) + ') is not compared with full ones' });
      else if ((x.o.population || null) !== pop) excluded.push({ x, reason: 'Population differs ("' + (x.o.population || NP) + '" vs "' + (pop || NP) + '")' });
      else if (c.value === null) excluded.push({ x, reason: 'No value (missing is not treated as zero)' });
      else included.push({ period: x.p, obs: x.o, value: c.value, calc: c });
    });
    return { included, excluded, population: pop };
  }

  /* Latest valid change for every measure, across each period type and data scope that has at least two comparable values. */
  function availableTrends() {
    const combos = {};
    S().list('periods').forEach(p => { combos[p.type + '|' + (p.scope || '')] = { type: p.type, scope: p.scope || '' }; });
    const out = [];
    S().list('metrics').forEach(m => Object.values(combos).forEach(cb => {
      const t = metricTrend(m.id, cb.type, cb.scope);
      if (t.included.length >= 2) { const a = t.included[t.included.length - 2], b = t.included[t.included.length - 1]; out.push({ metric: m, type: cb.type, scope: cb.scope, a, b, population: t.population }); }
    }));
    return out;
  }
  /* Annual series for a measure in one data scope, plus the current-year YTD value (marked partial) – same population unless ytdPopulation is given. */
  function annualWithYtd(metricName, scope, population, ytdPeriodId, ytdPopulation) {
    const m = S().list('metrics').find(x => x.name === metricName);
    if (!m) return null;
    const t = metricTrend(m.id, 'Annual', scope, population);
    const pts = t.included.map(x => ({ label: x.period.label, short: x.period.start.slice(0, 4), value: x.value, period: x.period, obs: x.obs }));
    const yo = S().list('observations').find(o => o.metricId === m.id && o.periodId === ytdPeriodId && o.population === (ytdPopulation || population));
    const yc = yo ? obsCalc(yo) : null;
    if (yc && yc.value !== null) { const p = period(ytdPeriodId); pts.push({ label: p.label, short: p.start.slice(0, 4) + ' YTD', value: yc.value, partial: true, period: p, obs: yo }); }
    return { metric: m, points: pts, excluded: t.excluded };
  }
  /* Team member matched by name or confirmed alias (case-insensitive). */
  function findMember(name) {
    if (!name) return null;
    const n = String(name).trim().toLowerCase();
    return S().list('team', { archived: true }).find(t => String(t.name).toLowerCase() === n || String(t.aliases || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean).indexOf(n) >= 0) || null;
  }

  /* Linear run-rate scenario. Assumptions are returned with the result and must be shown. */
  function runRateScenario(periodId) {
    const p = period(periodId);
    if (!p || p.type !== 'YTD' || !p.start || !p.end || p.start.slice(5) !== '01-01') return null;
    const year = p.start.slice(0, 4);
    const elapsed = daysBetween(p.start, p.end) + 1;
    const yearDays = daysBetween(year + '-01-01', year + '-12-31') + 1;
    if (elapsed >= yearDays) return null;
    const ps = programmeSummary(periodId);
    const factor = yearDays / elapsed;
    return {
      elapsed, yearDays, factor,
      rows: ps.rows.map(r => ({ name: r.p.name, joined: r.p.joined, target: r.p.target, projected: isNum(r.p.joined) ? r.p.joined * factor : null })),
      total: ps.allJoined ? ps.joinedSum * factor : null, targetSum: ps.targetSum,
      assumptions: [
        'Scenario only, not a prediction: joining continues at the average daily rate observed from ' + fmtDate(p.start) + ' to ' + fmtDate(p.end) + ' (' + elapsed + ' of ' + yearDays + ' days).',
        'Meaningful only if programme targets are full-year targets (not confirmed – see open questions).',
        'Batch-based programmes (e.g. freshers, interns, apprentices) may join in cohorts, so a uniform rate is unlikely to hold.',
        'No seasonality, pipeline or offer data has been used.'
      ]
    };
  }

  /* ---------- Benefits ---------- */
  const MONETARY = ['Vendor-fee saving', 'Comparable programme cost', 'Vacancy-duration value (notional)', 'Manual value'];
  function benefitCalc(b) {
    const r = { gross: null, unit: 'INR', hours: null, monetised: null, net: null, steps: [], missing: [], flags: [], claimable: false };
    const need = (k, label) => { if (!isNum(b[k])) { r.missing.push(label); return false; } return true; };
    switch (b.calcType) {
      case 'Vendor-fee saving':
        if (need('baselineVolume', 'Baseline vendor hires') & need('comparisonVolume', 'Comparison vendor hires') & need('unitCost', 'Fee per vendor hire')) {
          r.gross = (b.baselineVolume - b.comparisonVolume) * b.unitCost;
          r.steps.push('(' + b.baselineVolume + ' − ' + b.comparisonVolume + ') vendor hires × ' + fmtINR(b.unitCost) + ' per hire = ' + fmtINR(r.gross));
        }
        r.flags.push('Valid only if both periods use the same population and fee basis; lower vendor usage alone is not a saving.');
        break;
      case 'Process time released':
      case 'Automation benefit':
        r.unit = 'hours';
        if (need('comparisonVolume', 'Transactions in comparison period') & need('unitQty', 'Hours saved per transaction')) {
          r.hours = b.comparisonVolume * b.unitQty; r.gross = r.hours;
          r.steps.push(b.comparisonVolume + ' transactions × ' + b.unitQty + ' hours saved = ' + round(r.hours, 1) + ' hours released');
          if (isNum(b.unitCost)) { r.monetised = r.hours * b.unitCost; r.steps.push(round(r.hours, 1) + ' hours × ' + fmtINR(b.unitCost) + ' per hour = ' + fmtINR(r.monetised) + ' (capacity value, not a cash saving)'); }
        }
        r.flags.push('Released capacity is time, not reduced expenditure, unless costs actually fall.');
        break;
      case 'Comparable programme cost':
        if (need('unitCost', 'Baseline cost per hire') & need('comparisonUnitCost', 'Comparison cost per hire') & need('comparisonVolume', 'Comparison hires')) {
          r.gross = (b.unitCost - b.comparisonUnitCost) * b.comparisonVolume;
          r.steps.push('(' + fmtINR(b.unitCost) + ' − ' + fmtINR(b.comparisonUnitCost) + ') × ' + b.comparisonVolume + ' hires = ' + fmtINR(r.gross));
        }
        r.flags.push('Programmes must be comparable in role mix, location and level.');
        break;
      case 'Vacancy-duration value (notional)':
        if (need('comparisonVolume', 'Roles filled') & need('unitQty', 'Days reduced per role') & need('unitCost', 'Daily value per role (assumption)')) {
          r.gross = b.comparisonVolume * b.unitQty * b.unitCost;
          r.steps.push(b.comparisonVolume + ' roles × ' + b.unitQty + ' days × ' + fmtINR(b.unitCost) + ' per day = ' + fmtINR(r.gross) + ' (notional)');
        }
        r.flags.push('Notional value: not a realised financial benefit unless separately validated.');
        if (b.category === 'Realised financial saving' || b.category === 'Cost avoidance') r.flags.push('Category conflict: vacancy-duration value is classed as ' + b.category + '. Keep it notional unless validated as realised.');
        break;
      case 'Manual value':
        if (need('manualValue', 'Manual gross value')) { r.gross = b.manualValue; r.steps.push('Manual value entered: ' + fmtINR(b.manualValue) + (b.calcNote ? ' – ' + b.calcNote : ' (no calculation note recorded)')); }
        break;
      default:
        r.unit = null;
    }
    const monetaryGross = r.unit === 'INR' ? r.gross : r.monetised;
    if (isNum(monetaryGross)) {
      const costs = [];
      if (!isNum(b.implementationCost)) r.missing.push('Implementation cost (missing is not zero)'); else costs.push(b.implementationCost);
      if (!isNum(b.recurringCost)) r.missing.push('Recurring cost (missing is not zero)'); else costs.push(b.recurringCost);
      if (costs.length === 2) {
        r.net = monetaryGross - b.implementationCost - b.recurringCost;
        r.steps.push('Net = ' + fmtINR(monetaryGross) + ' − ' + fmtINR(b.implementationCost) + ' implementation − ' + fmtINR(b.recurringCost) + ' recurring = ' + fmtINR(r.net));
      }
      if (!b.unitCostApproved && b.calcType !== 'Manual value') r.flags.push('Financial inputs not marked as approved – not a savings claim.');
    }
    if (b.category === 'Cost avoidance' && !b.counterfactual) r.flags.push('Cost avoidance needs an agreed counterfactual – none recorded.');
    if (b.validationStatus !== 'Validated') r.flags.push('Not validated (' + (b.validationStatus || NP) + ').');
    if (b.validationStatus === 'Validated' && (!b.validatedBy || !b.validationDate)) r.flags.push('Marked validated without validator and date.');
    r.claimable = b.validationStatus === 'Validated' && !!b.validatedBy && !!b.validationDate && r.gross !== null &&
      (MONETARY.indexOf(b.calcType) < 0 || b.calcType === 'Manual value' || !!b.unitCostApproved) && b.calcType !== 'Vacancy-duration value (notional)';
    r.expectedVsRealised = isNum(b.expectedValue) && r.gross !== null ? r.gross - b.expectedValue : null;
    return r;
  }
  const BENEFIT_CATS = ['Realised financial saving', 'Cost avoidance', 'Productivity capacity released', 'Notional business value', 'Non-financial outcome'];
  function benefitTotals() {
    const out = {};
    BENEFIT_CATS.forEach(c => { out[c] = { count: 0, validated: 0, validatedGross: 0, validatedNet: 0, netKnown: true, unvalidatedGross: 0, unit: c === 'Productivity capacity released' ? 'hours' : 'INR', overlaps: 0 }; });
    S().list('benefits').forEach(b => {
      const t = out[b.category]; if (!t) return;
      const c = benefitCalc(b);
      t.count++;
      if (b.overlapNote) t.overlaps++;
      if (c.claimable) { t.validated++; t.validatedGross += c.gross || 0; if (isNum(c.net)) t.validatedNet += c.net; else t.netKnown = false; }
      else if (isNum(c.gross)) t.unvalidatedGross += c.gross;
    });
    return out;
  }

  /* ---------- Actions / feedback / projects ---------- */
  const isOverdue = (a) => !!a.dueDate && a.dueDate < todayIso() && ['Completed', 'Cancelled'].indexOf(a.status) < 0;
  const fbOverdue = (f) => !!f.dueDate && f.dueDate < todayIso() && f.progress !== 'Action completed' && (f.closureStatus || 'Open') === 'Open';

  /* ---------- Data-quality checks (rule-based; recomputed on every change) ---------- */
  function dataChecks() {
    const out = [];
    const add = (rule, severity, title, detail, ref) => out.push({ rule, severity, title, detail, ref });
    const st = S();
    st.list('observations').forEach(o => {
      const c = obsCalc(o);
      if (c.conflict) add('R01 Reported vs recalculated', 'Conflict', recordTitle('observations', o) + ': reported ' + fmtVal(c.reported, c.unit) + ' vs recalculated ' + fmtVal(c.recalc, c.unit),
        'Method: ' + c.recalcMethod + '. Both values retained; confirm with data owner.', { entity: 'observations', id: o.id });
      if (c.unit === '%' && c.value !== null && (c.value < 0 || c.value > 100)) add('R02 Percentage range', 'Conflict', recordTitle('observations', o) + ' is outside 0–100%', 'Check the unit or the source value.', { entity: 'observations', id: o.id });
      if (c.value !== null && !isNum(o.target) && c.m.role !== 'totalJoined' && (period(o.periodId) || {}).scope === 'Business scorecard') add('R03 Missing target', 'Missing', recordTitle('observations', o) + ': target not provided', 'Attainment cannot be assessed.', { entity: 'observations', id: o.id });
      if (c.value !== null && !o.population) add('R04 Missing population', 'Missing', recordTitle('observations', o) + ': population not provided', 'Without a defined population, results cannot be compared across periods.', { entity: 'observations', id: o.id });
    });
    st.list('metrics').forEach(m => {
      const used = st.list('observations').some(o => o.metricId === m.id);
      if (used && (m.definitionStatus === 'Not provided' || !m.definition)) add('R05 Missing definition', 'Missing', m.name + ': definition not provided', 'Agree a definition before trend or target comparisons.', { entity: 'metrics', id: m.id });
    });
    st.list('recruiterResults').forEach(r => {
      const c = rrCalc(r);
      if (c.offerConflict) add('R06 Attainment conflict', 'Conflict', recordTitle('recruiterResults', r) + ': offer attainment reported ' + fmtPct(r.offerAttainmentReported) + ' vs recalculated ' + fmtPct(c.offerRecalc),
        r.offers + ' offers ÷ ' + r.offerTarget + ' target × 100 = ' + fmtPct(c.offerRecalc) + '. Both values retained pending validation.', { entity: 'recruiterResults', id: r.id });
      if (c.joinConflict) add('R06 Attainment conflict', 'Conflict', recordTitle('recruiterResults', r) + ': joining attainment reported ' + fmtPct(r.joinAttainmentReported) + ' vs recalculated ' + fmtPct(c.joinRecalc), 'Both values retained pending validation.', { entity: 'recruiterResults', id: r.id });
    });
    st.list('periods').forEach(p => {
      const ps = programmeSummary(p.id);
      if (!ps.count) return;
      ps.rows.forEach(r => { if (r.status === 'Not provided' || r.status === 'No target') add('R07 Programme gap in data', 'Missing', r.p.name + ' (' + p.label + '): ' + (r.status === 'No target' ? 'target' : 'joined') + ' not provided', 'Totals exclude missing values; they are not treated as zero.', { entity: 'programmes', id: r.p.id }); });
      if (ps.shortfalls.length && isNum(ps.aggregateAttain) && ps.overs.length)
        add('R08 Aggregate conceals shortfalls', 'Warning', p.label + ': ' + ps.shortfalls.length + ' programme(s) below target while aggregate attainment is ' + fmtPct(ps.aggregateAttain),
          'Over-target programmes (+' + ps.overSum + ') offset shortfalls (−' + ps.shortfallSum + '). Report programme gaps separately.', { entity: 'programmes', id: ps.shortfalls[0].p.id });
      const names = {};
      ps.rows.forEach(r => { const k = String(r.p.name).toLowerCase().trim(); if (names[k]) add('R09 Possible duplicate', 'Warning', 'Programme "' + r.p.name + '" appears more than once in ' + p.label, 'Confirm before merging; totals may double-count.', { entity: 'programmes', id: r.p.id }); names[k] = true; });
      const f = freshness(p);
      if (f.stale) add('R10 Data freshness', 'Warning', p.label + ': ' + f.label, 'Refresh source data before leadership use.', { entity: 'periods', id: p.id });
    });
    st.list('talentPrograms').forEach(tp => {
      const p = scorecardMatch(tp);
      if (p && isNum(tp.expectedNumber) && isNum(p.target) && tp.expectedNumber !== p.target) add('R23 Plan vs scorecard target', 'Warning', tp.name + ': tracker plan ' + tp.expectedNumber + ' vs scorecard target ' + p.target + ' (' + p.name + ')',
        'Both values retained; the scorecard target stays the official target until confirmed.', { entity: 'talentPrograms', id: tp.id });
    });
    const team = st.list('team', { archived: true });
    for (let i = 0; i < team.length; i++) for (let j = i + 1; j < team.length; j++)
      if (TA.similarNames(team[i].name, team[j].name)) add('R09 Possible duplicate', 'Warning', 'Team members "' + team[i].name + '" and "' + team[j].name + '" may be the same person', 'Confirm identity before merging records. Records are never merged automatically.', { entity: 'team', id: team[j].id });
    const pers = st.list('periods');
    const biz = pers.filter(p => p.scope === 'Business scorecard'), rec = pers.filter(p => p.scope === 'Recruiter results');
    biz.forEach(b => rec.forEach(r => { if (b.type === r.type && b.start === r.start && b.cutoff !== r.cutoff) add('R11 Different cut-offs', 'Info', b.label + ' (cut-off ' + fmtDate(b.cutoff) + ') and ' + r.label + ' (cut-off ' + fmtDate(r.cutoff) + ')', 'Recruiter results are not reconciled to the business scorecard by design.', { entity: 'periods', id: r.id }); }));
    st.list('actions').forEach(a => { if (isOverdue(a)) add('R12 Overdue action', 'Warning', 'Overdue: ' + a.title, 'Due ' + fmtDate(a.dueDate) + '; owner ' + (a.owner || NP) + '.', { entity: 'actions', id: a.id }); });
    st.list('feedback').forEach(f => {
      if (f.progress === 'Action completed' && (f.closureStatus || 'Open') === 'Open') add('R13 Feedback awaiting validation', 'Info', recordTitle('feedback', f) + ': action completed, closure status still Open', 'Consider "Action completed; stakeholder validation pending". Feedback is not closed automatically.', { entity: 'feedback', id: f.id });
      if (fbOverdue(f)) add('R12 Overdue action', 'Warning', 'Overdue feedback action: ' + recordTitle('feedback', f), 'Due ' + fmtDate(f.dueDate) + '.', { entity: 'feedback', id: f.id });
      if (f.closureStatus === 'Closed – stakeholder validated' && (!f.validatedBy || !f.validationDate)) add('R14 Validation incomplete', 'Conflict', recordTitle('feedback', f) + ': closed as validated without validator/date', 'Record who validated and when.', { entity: 'feedback', id: f.id });
    });
    st.list('projects').forEach(p => {
      if (p.status === 'Completed' && ['Realised – validated', 'Partially realised – validated'].indexOf(p.benefitStatus) < 0) add('R15 Completion ≠ benefit', 'Info', p.name + ': completed; benefits ' + (p.benefitStatus || 'not assessed'), 'Project completion is tracked separately from benefit realisation.', { entity: 'projects', id: p.id });
      if (p.status === 'Completed' && !p.completionEvidence && !(p.evidence || []).length) add('R16 Missing evidence', 'Missing', p.name + ': completed without completion evidence', 'Attach or describe completion evidence.', { entity: 'projects', id: p.id });
      st.list('milestones').filter(m => m.projectId === p.id).forEach(m => {
        const due = m.revisedDate || m.plannedDate;
        if (due && due < todayIso() && ['Done', 'Cancelled', 'Missed'].indexOf(m.status) < 0) add('R22 Milestone status missing', 'Missing', p.name + ': "' + m.name + '" was due ' + fmtDate(due) + '; status ' + (m.status || 'not recorded'), 'Record whether it was achieved, revised or missed.', { entity: 'milestones', id: m.id });
      });
      if (p.originalDeadline && p.revisedDeadline && p.revisedDeadline > p.originalDeadline) add('R17 Deadline revised', 'Info', p.name + ': deadline moved from ' + fmtDate(p.originalDeadline) + ' to ' + fmtDate(p.revisedDeadline), p.revisionReason ? 'Reason: ' + p.revisionReason : 'Reason not recorded.', { entity: 'projects', id: p.id });
      if (['Completed', 'Cancelled'].indexOf(p.status) < 0 && (p.revisedDeadline || p.originalDeadline) && (p.revisedDeadline || p.originalDeadline) < todayIso()) add('R12 Overdue action', 'Warning', 'Project past deadline: ' + p.name, 'Current deadline ' + fmtDate(p.revisedDeadline || p.originalDeadline) + '.', { entity: 'projects', id: p.id });
    });
    st.list('benefits').forEach(b => {
      const c = benefitCalc(b);
      c.flags.filter(f => /conflict|not marked as approved|counterfactual|without validator/i.test(f)).forEach(f => add('R18 Benefit claim check', /conflict|without validator/i.test(f) ? 'Conflict' : 'Warning', b.title + ': ' + f, 'Benefit remains outside verified totals until resolved.', { entity: 'benefits', id: b.id }));
      if (c.missing.length) add('R19 Benefit inputs missing', 'Missing', b.title + ': ' + c.missing.join('; '), 'Values are not calculated from missing inputs.', { entity: 'benefits', id: b.id });
    });
    st.list('devItems').forEach(d => {
      if (d.learningStatus === 'Completed' && !d.applicationAtWork && ['Learning', 'Certification'].indexOf(d.kind) >= 0) add('R20 Learning not yet applied', 'Info', subjectLabel(d.subject) + ': "' + d.title + '" completed; application at work not recorded', 'Completion or certification alone is not evidence of capability.', { entity: 'devItems', id: d.id });
      if (d.capabilityStage === 'Capability demonstrated – reviewer validated' && (!d.reviewer || !d.reviewDate || !d.applicationAtWork)) add('R21 Capability claim incomplete', 'Conflict', subjectLabel(d.subject) + ': "' + d.title + '" marked demonstrated without reviewer, date or application evidence', 'Record the evidence or change the stage.', { entity: 'devItems', id: d.id });
    });
    const order = { Conflict: 0, Warning: 1, Missing: 2, Info: 3 };
    out.sort((a, b) => order[a.severity] - order[b.severity]);
    return out;
  }

  /* ---------- Rule-based insights (stored so they can be accepted, edited, dismissed or converted) ---------- */
  function computeInsights() {
    const out = [];
    const st = S();
    const I = (ruleKey, rule, o) => out.push(Object.assign({ ruleKey, generatedBy: 'Rule ' + rule, owner: null, reviewDate: null }, o));
    st.list('periods').forEach(p => {
      const ps = programmeSummary(p.id);
      if (!ps.count) return;
      if (ps.shortfalls.length) {
        const list = ps.shortfalls.map(r => r.p.name + ' ' + r.p.joined + '/' + r.p.target + ' (' + fmtPct(r.attain) + ', ' + r.gap + ')').join('; ');
        I('prog-short:' + p.id, 'I01 programme shortfall', {
          title: ps.shortfalls.length + ' of ' + ps.count + ' programmes below target – ' + p.label, type: 'Descriptive finding',
          observation: 'Programmes below target: ' + list + '. Combined shortfall: ' + ps.shortfallSum + ' joiners.',
          supportingData: 'Programme results, ' + p.label + ' (' + fmtDate(p.start) + '–' + fmtDate(p.end) + '); source: ' + (ps.rows[0].p.source || NP) + '.',
          method: 'Gap = joined − target, per programme. Attainment = joined ÷ target × 100.',
          interpretation: ps.overs.length ? 'Aggregate attainment (' + fmtPct(ps.aggregateAttain) + ') is supported by over-target programmes (+' + ps.overSum + '); it should not be read as all commitments being met.' : 'Shortfalls are not offset by other programmes.',
          uncertainty: 'Not confirmed whether targets are full-year or year-to-date. Causes of shortfalls are not evidenced in the data.',
          recommendedAction: 'Confirm the target basis. For each shortfall programme, agree with the business whether the remaining gap will be closed, re-phased or the target revised.'
        });
      }
      if (ps.overs.length) {
        const list = ps.overs.map(r => r.p.name + ' ' + r.p.joined + '/' + r.p.target + ' (' + fmtPct(r.attain) + ', +' + r.gap + ')').join('; ');
        I('prog-over:' + p.id, 'I02 programme above target', {
          title: ps.overs.length + ' programme(s) above target – ' + p.label, type: 'Descriptive finding',
          observation: 'Above target: ' + list + '.', supportingData: 'Programme results, ' + p.label + '.',
          method: 'Gap = joined − target.', interpretation: 'Over-delivery in one programme does not offset shortfalls in another, as programmes serve different business needs.',
          uncertainty: 'Whether over-target volumes were planned (e.g. agreed target increases) is not recorded.',
          recommendedAction: 'Confirm with the business whether over-target volumes were requested, and record any agreed target revisions as commitments.'
        });
      }
      if (ps.reportedTotal !== null && ps.allJoined && ps.reportedTotal !== ps.joinedSum)
        I('total-mismatch:' + p.id, 'R01 reconciliation', { title: 'Reported total joined does not equal programme sum – ' + p.label, type: 'Rule-based alert',
          observation: 'Reported total ' + ps.reportedTotal + ' vs programme sum ' + ps.joinedSum + '.', supportingData: p.label, method: 'Sum of programme joiners compared with source-reported total.',
          interpretation: 'One of the figures may be incomplete, or definitions differ.', uncertainty: 'Which figure is correct is unknown.', recommendedAction: 'Confirm with the data owner; keep both values until resolved.' });
      const rr = runRateScenario(p.id);
      if (rr && rr.total !== null) I('runrate:' + p.id, 'I03 run-rate scenario', {
        title: 'Run-rate scenario to year end – ' + p.label, type: 'Scenario',
        observation: 'At the YTD average daily rate, total joiners would reach about ' + Math.round(rr.total) + ' by 31 Dec against combined targets of ' + rr.targetSum + '.',
        supportingData: ps.joinedSum + ' joiners in ' + rr.elapsed + ' days.', method: 'Projected = joined × ' + rr.yearDays + ' ÷ ' + rr.elapsed + ' (linear).',
        interpretation: 'Illustrates scale only; programme-level timing will differ.', uncertainty: rr.assumptions.join(' '),
        recommendedAction: 'Use only after confirming that targets are full-year. Replace with a pipeline-based forecast when offer and start-date data are available.' });
    });
    st.list('recruiterResults').forEach(r => {
      const c = rrCalc(r);
      if (c.offerConflict) I('rr-conflict:' + r.id, 'R06 attainment conflict', {
        title: 'Offer attainment needs validation – ' + recordTitle('recruiterResults', r), type: 'Rule-based alert',
        observation: 'Source reports ' + fmtPct(r.offerAttainmentReported) + '; ' + r.offers + ' offers against a target of ' + r.offerTarget + ' recalculates to ' + fmtPct(c.offerRecalc) + '.',
        supportingData: periodLabel(r.periodId) + '; ' + (r.source || NP) + '.', method: 'offers ÷ offer target × 100.',
        interpretation: 'The reported figure may be capped, based on a different target, or an error.', uncertainty: 'Correct value unknown until validated.',
        recommendedAction: 'Ask the TA Partner / data owner to validate. Do not use either figure in an individual assessment until resolved.' });
    });
    const oneObsMetrics = st.list('metrics').filter(m => { const n = st.list('observations').filter(o => o.metricId === m.id).length; return n === 1; });
    if (oneObsMetrics.length) I('no-trend', 'I04 trend availability', {
      title: 'Trends unavailable: one observation per measure', type: 'Descriptive finding',
      observation: oneObsMetrics.length + ' measure(s) have a single reporting-period value (' + oneObsMetrics.map(m => m.name).join(', ') + ').',
      supportingData: 'Metric results register.', method: 'Count of observations per metric.',
      interpretation: 'No direction of change can be stated for these measures.', uncertainty: 'Prior-period data may exist outside this dashboard.',
      recommendedAction: 'Add comparable prior-period results (same definition and population) to enable trends.' });
    const noTarget = st.list('observations').filter(o => !isNum(o.target) && isNum(o.actualReported) && (metric(o.metricId) || {}).role !== 'totalJoined' && (period(o.periodId) || {}).scope === 'Business scorecard');
    if (noTarget.length) I('no-target', 'R03 missing target', {
      title: noTarget.length + ' reported measure(s) have no target', type: 'Rule-based alert',
      observation: noTarget.map(o => recordTitle('observations', o) + ' = ' + fmtVal(o.actualReported, (metric(o.metricId) || {}).unit)).join('; ') + '.',
      supportingData: 'Metric results register.', method: 'Observations with an actual value and no target.',
      interpretation: 'Performance against expectation cannot be assessed for these measures.', uncertainty: 'Targets may exist in other documents.',
      recommendedAction: 'Agree targets (or confirm they are tracked for information only) with the India HR Head / Global TA Head.' });
    const left = st.list('team').filter(t => t.employmentStatus === 'Left');
    if (left.length) I('capacity', 'I05 team capacity', {
      title: left.length + ' team member(s) have left; historical records retained', type: 'Descriptive finding',
      observation: left.length + ' team member record(s) have status "Left". Replacement hiring status is tracked in actions.',
      supportingData: 'Team register.', method: 'Count of team records with status Left.',
      interpretation: 'Recruiter capacity is reduced until backfills join; impact on delivery is not quantified in the data.',
      uncertainty: 'Leaving dates, business coverage and redistribution of requisitions are not recorded.',
      recommendedAction: 'Record interim coverage and backfill dates; review requisition load per active recruiter.' });
    const overdue = st.list('actions').filter(isOverdue);
    if (overdue.length) I('overdue', 'R12 overdue', { title: overdue.length + ' overdue action(s)', type: 'Rule-based alert',
      observation: overdue.map(a => a.title + ' (due ' + fmtDate(a.dueDate) + ')').join('; '), supportingData: 'Actions register.', method: 'Due date before today and status not Completed/Cancelled.',
      interpretation: 'Commitments are at risk of slipping.', uncertainty: 'Status may not be up to date.', recommendedAction: 'Update status or agree revised dates with stakeholders.' });
    const pend = st.list('feedback').filter(f => f.closureStatus === 'Action completed; stakeholder validation pending');
    if (pend.length) I('fb-pending', 'I06 feedback validation', { title: pend.length + ' feedback action(s) awaiting stakeholder validation', type: 'Recommended action',
      observation: pend.map(f => recordTitle('feedback', f)).join('; '), supportingData: 'Leadership feedback register.', method: 'Closure status = action completed; validation pending.',
      interpretation: 'Actions are done but the stakeholder has not confirmed the concern is addressed.', uncertainty: 'Stakeholder view unknown.', recommendedAction: 'Request validation from each feedback provider.' });
    const ben = st.list('benefits');
    if (!ben.length) I('no-benefits', 'I07 benefits', { title: 'No financial benefits recorded', type: 'Descriptive finding',
      observation: 'The benefits register is empty; no savings, cost avoidance or capacity release is reported.', supportingData: 'Business value register.', method: 'Count of benefit records.',
      interpretation: 'Business value is currently evidenced through hiring outcomes only.', uncertainty: 'Benefits may exist but have not been quantified with approved inputs.',
      recommendedAction: 'Identify candidate benefits (e.g. vendor-fee changes, process time) and obtain approved financial inputs before recording values.' });
    return out;
  }
  const INSIGHT_FIELDS = ['title', 'type', 'observation', 'supportingData', 'method', 'interpretation', 'uncertainty', 'recommendedAction'];
  function syncInsights() {
    const st = S();
    const list = st.state.data.insights;
    const computed = computeInsights();
    const seen = {};
    let changed = false;
    computed.forEach(c => {
      seen[c.ruleKey] = true;
      const sig = JSON.stringify(INSIGHT_FIELDS.map(k => c[k]));
      const ex = list.find(i => i.ruleKey === c.ruleKey);
      if (!ex) {
        list.push(Object.assign({ id: TA.uid('ins'), createdAt: TA.nowIso(), updatedAt: TA.nowIso(), archived: false, deletedAt: null, evidence: [], origin: 'Rule-generated', status: 'New', signature: sig }, c));
        changed = true;
      } else if (ex.signature !== sig) {
        if (ex.status === 'New' && !ex.deletedAt) { INSIGHT_FIELDS.forEach(k => { ex[k] = c[k]; }); ex.updatedAt = TA.nowIso(); ex.dataChanged = false; ex.obsolete = false; }
        else { ex.dataChanged = true; ex.latest = c; }
        ex.signature = sig; changed = true;
      } else if (ex.obsolete) { ex.obsolete = false; changed = true; }
    });
    list.forEach(i => {
      if (i.ruleKey && !seen[i.ruleKey] && !i.obsolete) { i.obsolete = true; changed = true; }
    });
    // Untouched insights whose rule no longer applies are removed; touched ones stay, flagged.
    for (let k = list.length - 1; k >= 0; k--) if (list[k].obsolete && list[k].status === 'New' && list[k].ruleKey) { list.splice(k, 1); changed = true; }
    return changed;
  }

  Object.assign(TA, {
    NP, isNum, pct, round, todayIso, daysBetween, fmtInt, fmtINR, fmtPct, fmtVal, fmtDate, fmtDateTime, deltaText,
    period, periodLabel, metric, member, subjectLabel, recordTitle, progRow, programmeSummary, programmeSetsMatch, scorecardMatch, obsCalc, rrCalc,
    priorPeriod, comparability, freshness, metricTrend, availableTrends, annualWithYtd, findMember, runRateScenario, benefitCalc, benefitTotals, BENEFIT_CATS,
    isOverdue, fbOverdue, dataChecks, computeInsights, syncInsights
  });
})();
