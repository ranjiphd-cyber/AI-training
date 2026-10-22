/* Data pack: TA function cost by year (Finance e-mail to the TA Head, 22 Oct 2026, "TA India – 2021 – 2025", plus the 2026 estimate).
   CC 74200 = HR Recruitment – OH; CC 74202 = HR Recruitment – VIT (from 2025). 2026 = full-year actual + estimate:
   CC 74200 46,914,000 (written "46,914,00" in the e-mail; confirmed as 46,914,000 by the TA Head, 22 Oct 2026) and CC 74202 3,621,000.
   Cost per hire = cost ÷ all hires (lateral, freshers/GET, NATS, ExcelHER, PhD/AICTE, internal mobility and interns – TA Head, 22 Oct 2026).
   Yearly hire totals for 2021–2025 and the 2026 full-year hire estimate are awaited, so cost per hire is not yet calculated. Applied once. */
(function () {
  'use strict';
  const TA = window.TA;
  const PACK = 'hiring-cost-2026-10-22';
  const SRC = 'Finance (cost-centre report "TA India – 2021 – 2025", e-mail of 22 Oct 2026, forwarded by the TA Head)';
  const SRC26 = 'Finance e-mail of 22 Oct 2026 – 2026 full year (actual + estimate)';
  const WHO = 'TA Head, 22 Oct 2026';
  // [year, CC 74200 result, CC 74202 result, reported total, CC 74200 line items]
  const FS = ['Comp bonus & other bonuses WC', 'STI Program (from 2024)', 'Personnel expenses', 'Travel and entertainment', 'Hired services other than IT', 'Other administrative expenses', 'Distribution RE group services', 'Distribution FCA group services', 'Group IT services admin', 'Expenses billed and other credits', 'Other income and expenses'];
  const Y = [
    [2021, 26162116, null, 26162116, [1938476, null, 15749766, 8400, 1672190, 1686910, 4393793, 117306, 701900, null, -106624]],
    [2022, 46900770, null, 46900770, [1052203, null, 25412523, 189894, 8957660, 4487994, 5037689, 134167, 1614078, null, 14562]],
    [2023, 51013198, null, 51013198, [2286137, null, 36516139, 457036, 1925192, 2233819, 5755286, 475311, 1437175, -137853, 64955]],
    [2024, 53644750, null, 53644750, [1734856, 0, 41572988, 336714, 810817, 337835, 6543283, 614696, 1317891, null, 375671]],
    [2025, 46345236, 3319995, 49665232, [1020909, null, 36106230, 71516, -132823, 684179, 7042659, null, 1052981, null, 499586]]
  ];
  const CC74202_2025 = 'Comp bonus & other bonuses WC 204,384; Personnel expenses 3,004,166; Hired services other than IT 205; Group IT services admin 109,956; Other income and expenses 1,285.';
  const ALL = 'All hires (lateral, freshers/GET, NATS, ExcelHER, PhD/AICTE, internal mobility, interns)';
  TA.COST_METRICS = { total: 'TA function cost (CC 74200 + 74202)', cc1: 'TA cost – CC 74200 HR Recruitment OH', cc2: 'TA cost – CC 74202 HR Recruitment VIT', hires: 'All hires in year (all types)', perHire: 'Recruitment cost per hire', est: 'per_fy_2026e' };

  function apply() {
    const S = TA.Store;
    const applied = S.state.meta.appliedPacks || [];
    if (applied.indexOf(PACK) >= 0 || applied.indexOf('lateral-trends-2026') < 0) return false;
    S.recoveryPoint('Before loading TA cost by year');
    const origin = 'Import: ' + SRC, today = TA.todayIso(), M = TA.COST_METRICS;
    const per = (id, label, start, end, scope, notes, cutoff) => S.get('periods', id) || S.add('periods', { id, label, type: 'Annual', scope, start, end, cutoff: cutoff || end, source: SRC, notes }, origin);
    const metric = (name, def) => S.list('metrics', { archived: true }).find(x => x.name === name) || S.add('metrics', Object.assign({ name, owner: null, source: SRC }, def), origin);
    const mT = metric(M.total, { category: 'Cost', unit: 'INR', direction: 'Context-dependent', definitionStatus: 'Source-reported', definition: 'Total cost booked on the TA cost centres CC 74200 (HR Recruitment – OH) and CC 74202 (HR Recruitment – VIT, from 2025), as reported by Finance.', calculation: 'Sum of the cost-centre results.' });
    const m1 = metric(M.cc1, { category: 'Cost', unit: 'INR', direction: 'Context-dependent', definitionStatus: 'Source-reported', definition: 'Cost-centre result for CC 74200 HR Recruitment – OH (Finance).', calculation: 'As reported; line items listed in the calculation note.' });
    const m2 = metric(M.cc2, { category: 'Cost', unit: 'INR', direction: 'Context-dependent', definitionStatus: 'Source-reported', definition: 'Cost-centre result for CC 74202 HR Recruitment – VIT (Finance); first reported for 2025.', calculation: 'As reported.' });
    metric(M.hires, { category: 'Hiring volume', unit: 'count', direction: 'Context-dependent', definitionStatus: 'Proposed – to confirm', definition: ALL + ' who joined in the year.', calculation: 'Count of joiners in the calendar year.' });
    const mP = metric(M.perHire, {});
    S.update('metrics', mP.id, { definition: 'TA function cost (CC 74200 + 74202) ÷ all hires in the year: ' + ALL.replace('All hires ', '') + ' (' + WHO + ').', calculation: 'Calculated in the Cost of hiring card when the year\'s hire total is recorded.', definitionStatus: 'Proposed – to confirm' });
    const obs = (m, p, val, note, src) => { if (S.list('observations').some(o => o.metricId === m.id && o.periodId === p.id)) return;
      S.add('observations', { metricId: m.id, periodId: p.id, population: 'TA cost centres', target: null, actualReported: val, numerator: null, denominator: null, calcNote: note, attribution: 'TA function', source: src || SRC, owner: null, dataDate: '2026-10-22', notes: null }, origin); };
    Y.forEach(([y, c1, c2, tot, items]) => {
      const p = per('per_fy_' + y, 'FY ' + y + ' – TA cost', y + '-01-01', y + '-12-31', 'TA cost', 'Fiscal year as labelled by Finance; treated as the calendar year (confirm).');
      const lines = FS.map((f, i) => items[i] === null ? null : f + ' ' + TA.fmtInt(items[i])).filter(Boolean).join('; ');
      obs(m1, p, c1, 'Line items: ' + lines + '. The line items add up to the reported result within ±1 INR (rounding).');
      if (c2 !== null) obs(m2, p, c2, 'Line items: ' + CC74202_2025);
      obs(mT, p, tot, c2 !== null ? 'CC 74200 ' + TA.fmtInt(c1) + ' + CC 74202 ' + TA.fmtInt(c2) + ' (reported total; components add up to ' + TA.fmtInt(c1 + c2) + ', rounding).' : 'CC 74200 only (CC 74202 not reported before 2025).');
    });
    const pe = per(M.est, '2026 – TA cost (actual + estimate)', '2026-01-01', '2026-12-31', 'TA cost – estimate', 'Full-year 2026: actual to date plus Finance estimate for the rest of the year. Not a final figure.', '2026-10-22');
    obs(m1, pe, 46914000, 'Full-year actual + estimate. The e-mail shows "46,914,00"; confirmed as 46,914,000 (' + WHO + ').', SRC26);
    obs(m2, pe, 3621000, 'Full-year actual + estimate.', SRC26);
    obs(mT, pe, 50535000, 'CC 74200 46,914,000 + CC 74202 3,621,000 (estimate).', SRC26);
    const Q = (title, priority, detail, status) => { if (!S.list('questions').some(x => x.title === title)) S.add('questions', { title, type: 'Missing data', priority, relatedTo: 'Cost of hiring', detail, valueA: null, valueB: null, owner: 'Dr. Ranjith TP', raisedDate: today, status: status || 'Open', resolution: null, resolvedDate: null }, origin); };
    Q('Total hires per year 2021–2025 (all hire types)', 'Essential', 'Cost per hire needs the number of all hires per year (lateral, freshers/GET, NATS, ExcelHER, PhD/AICTE, internal mobility, interns). Only lateral hires are recorded for 2021–2025 (659, 1,078, 787, 653, 610). The TA Head will share the yearly totals.', 'Awaiting data owner');
    Q('2026 full-year hire estimate (all hire types)', 'Essential', 'The 2026 cost is a full-year figure (actual + estimate). Cost per hire for 2026 needs the expected full-year number of hires; 885 joined to 14 Oct.', 'Awaiting data owner');
    Q('What the TA cost centres include', 'Nice to have', 'Do CC 74200/74202 include agency (vendor) fees, job-board licences, referral bonuses and campus costs, or are some of these booked to business cost centres? This decides whether cost per hire is a full or a TA-function-only figure. Is the fiscal year the calendar year?');
    if (!S.list('insights', { archived: true }).some(i => i.generatedBy === 'Finance cost-centre report' )) S.add('insights', { title: 'TA function cost: INR 2.6 crore (2021) → 5.4 crore (2024) → 5.0 crore (2025); 2026 estimate 5.1 crore', type: 'Descriptive finding',
      observation: 'CC 74200 + 74202: 26,162,116 (2021), 46,900,770 (2022), 51,013,198 (2023), 53,644,750 (2024), 49,665,232 (2025, incl. CC 74202 3,319,995); 2026 actual + estimate 50,535,000. Personnel expenses are the largest item every year.',
      supportingData: SRC, method: 'Cost-centre results as reported; no adjustment for inflation or headcount.', interpretation: 'Cost roughly doubled from 2021 to 2023 and has been broadly flat since; the 2025 total includes the new CC 74202.',
      uncertainty: '2026 is partly an estimate. Cost per hire cannot be stated until yearly hire totals are supplied. What the cost centres include is to be confirmed.', recommendedAction: 'Add yearly hire totals to calculate cost per hire; agree what the cost covers before comparing with benchmarks.',
      owner: null, reviewDate: null, status: 'New', generatedBy: 'Finance cost-centre report' }, origin);
    S.setMeta({ appliedPacks: (S.state.meta.appliedPacks || []).concat([PACK]) });
    TA.toast('Loaded TA cost by year (2021–2026)');
    return true;
  }
  // Cost and cost per hire by year, for the Trends card and exports.
  TA.costSeries = function () {
    const S = TA.Store, M = TA.COST_METRICS;
    const met = (n) => S.list('metrics').find(x => x.name === n);
    const val = (n, pid) => { const m = met(n); const o = m && S.list('observations').find(x => x.metricId === m.id && x.periodId === pid); if (!o) return null; const c = TA.obsCalc(o); return TA.isNum(c.reported) ? c.reported : (TA.isNum(c.value) ? c.value : null); };
    return S.list('periods').filter(p => /^per_fy_/.test(p.id)).sort((a, b) => a.start.localeCompare(b.start)).map(p => {
      const cost = val(M.total, p.id), hires = val(M.hires, p.id);
      return { id: p.id, year: p.start.slice(0, 4) + (p.id === M.est ? ' (est.)' : ''), estimate: p.id === M.est, cc1: val(M.cc1, p.id), cc2: val(M.cc2, p.id), cost, hires, perHire: TA.isNum(cost) && TA.isNum(hires) && hires > 0 ? cost / hires : null };
    }).filter(r => TA.isNum(r.cost));
  };
  const prev = TA.applyDataPacks;
  TA.applyDataPacks = function () { const a = prev ? prev() : false; const b = apply(); return a || b; };
})();
