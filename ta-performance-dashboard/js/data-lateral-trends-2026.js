/* Data pack: lateral-hiring key parameters 2020–2026 from the Business Review Meeting (Oct) slide "Trends · Key Parameters"
   (image supplied 19 Oct 2026; values read from the chart's data labels). The TA Head confirmed the slide covers lateral joiners.
   2020–2025 are full years; 2026 is year-to-date and is kept on the business scorecard period. Applied once per dashboard. */
(function () {
  'use strict';
  const TA = window.TA;
  const PACK = 'lateral-trends-2026';
  const SRC = 'Business Review Meeting (Oct) slide "Trends · Key Parameters" – values read from chart labels (supplied 19 Oct 2026)';
  const POP = 'Lateral joiners';
  const SERIES = {
    'Gender diversity': [24, 28, 31, 36, 39, 38],
    'Vendor usage': [15, 7, 20, 19, 14, 12],
    'Employee referrals': [23, 20, 28, 9, 22, 12]
  };
  // Lateral-only values recalculated from the Hiring2026 tracker, 1 Jan–14 Oct 2026 (aggregates only).
  const TRACKER = { joiners: 351, female: 125, vendor: 23, referral: 51, r2o: { n: 347, sum: 18587, median: 35 }, r2j: { n: 349, sum: 31555, median: 69 }, missingReq: 2, vendorTo30Sep: '6.2%' };

  function apply() {
    const S = TA.Store;
    const applied = S.state.meta.appliedPacks || [];
    if (applied.indexOf(PACK) >= 0 || applied.indexOf('hiring-2026') < 0) return false;
    S.recoveryPoint('Before loading lateral-hiring trends 2020–2026');
    const origin = 'Import: ' + SRC;
    const metric = (name) => S.list('metrics', { archived: true }).find(m => m.name === name);
    for (let yr = 2020; yr <= 2025; yr++) {
      const id = 'per_lat_' + yr;
      if (!S.get('periods', id)) S.add('periods', { id, label: yr + ' – Lateral hiring', type: 'Annual', scope: 'Lateral hiring', start: yr + '-01-01', end: yr + '-12-31', cutoff: yr + '-12-31', source: SRC, notes: 'Full calendar year.' }, origin);
    }
    Object.keys(SERIES).forEach(name => {
      const m = metric(name); if (!m) return;
      SERIES[name].forEach((v, i) => {
        const pid = 'per_lat_' + (2020 + i);
        if (S.list('observations').some(o => o.metricId === m.id && o.periodId === pid)) return;
        S.add('observations', { metricId: m.id, periodId: pid, population: POP, target: null, actualReported: v, numerator: null, denominator: null,
          calcNote: 'Source-reported annual value.', attribution: 'Shared business outcome', source: SRC, owner: null, dataDate: null, notes: null }, origin);
      });
    });
    // The 2026 YTD scorecard values (35%, 6%, 15%, 53 and 89 days) are the slide's 2026 points: record their population.
    ['Gender diversity', 'Vendor usage', 'Employee referrals', 'Requisition-to-offer time', 'Requisition-to-join time'].forEach(name => {
      const m = metric(name); if (!m) return;
      const o = S.list('observations').find(x => x.metricId === m.id && x.periodId === 'per_biz_2026ytd');
      if (o && !o.population) S.update('observations', o.id, { population: POP, notes: (o.notes ? o.notes + ' ' : '') + 'Population confirmed as lateral joiners by the TA Head (19 Oct 2026).' });
    });
    // Lateral-only recalculation from the hiring tracker, kept in the tracker period so source values stay unchanged.
    const ht = S.get('periods', 'per_ht_2026ytd');
    if (ht) {
      const add = (name, num, den, note) => { const m = metric(name); if (!m || S.list('observations').some(o => o.metricId === m.id && o.periodId === ht.id && o.population === 'Lateral joiners (Hiring tracker)')) return;
        S.add('observations', { metricId: m.id, periodId: ht.id, population: 'Lateral joiners (Hiring tracker)', target: null, actualReported: null, numerator: num, denominator: den, calcNote: note, attribution: 'Shared business outcome', source: 'Hiring2026 tracker – Master Tracker sheet (supplied 19 Oct 2026); aggregates only', owner: null, dataDate: '2026-10-14', notes: 'Recalculated for lateral joiners 1 Jan–14 Oct 2026.' }, 'Import: Hiring2026 tracker'); };
      add('Gender diversity', TRACKER.female, TRACKER.joiners, 'Female lateral joiners ÷ lateral joiners.');
      add('Vendor usage', TRACKER.vendor, TRACKER.joiners, 'Vendor-sourced lateral joiners ÷ lateral joiners (' + TRACKER.vendorTo30Sep + ' if counted to 30 Sep).');
      add('Employee referrals', TRACKER.referral, TRACKER.joiners, 'Referral lateral joiners ÷ lateral joiners.');
      add('Requisition-to-offer time', TRACKER.r2o.sum, TRACKER.r2o.n, 'Mean of ' + TRACKER.r2o.n + ' lateral joiners (median ' + TRACKER.r2o.median + ' days); ' + TRACKER.missingReq + ' without an approval date and 2 dated before approval excluded.');
      add('Requisition-to-join time', TRACKER.r2j.sum, TRACKER.r2j.n, 'Mean of ' + TRACKER.r2j.n + ' lateral joiners (median ' + TRACKER.r2j.median + ' days); ' + TRACKER.missingReq + ' without an approval date excluded.');
      // Correct an earlier note that mixed all referral joiners with lateral joiners.
      const ref = metric('Employee referrals');
      const old = ref && S.list('observations').find(o => o.metricId === ref.id && o.periodId === ht.id && /As a share of lateral joiners only/.test(o.calcNote || ''));
      if (old) S.update('observations', old.id, { calcNote: 'Referral joiners ÷ all external joiners. Lateral-only share: 14.5% (51 of 351) – an earlier note showed 15.1%, which wrongly divided all referral joiners by lateral joiners.' });
    }
    const today = TA.todayIso();
    const q = (title) => S.list('questions', { archived: true }).find(x => x.title === title);
    const close = (title, patch) => { const x = q(title); if (x && x.status !== 'Resolved') S.update('questions', x.id, patch); };
    close('Populations and definitions for percentage and cycle-time measures', { status: 'Resolved', resolvedDate: today, resolution: 'Population confirmed as lateral joiners (TA Head, 19 Oct 2026). Exact calculation rules (e.g. mean vs median, start date) are covered in the cycle-time question.' });
    close('Employee referral share: 15% (scorecard) vs 12.8% (tracker)', { status: 'Resolved', resolvedDate: today, resolution: 'The 15% is a share of lateral joiners. The tracker gives 14.5% (51 of 351 lateral joiners), consistent after rounding; 12.8% is the share of all external joiners. Correction: an earlier figure of 15.1% wrongly divided all referral joiners (53) by lateral joiners.' });
    close('Cycle times: scorecard 53 / 89 days vs tracker 51.7 / 90.0 days', { status: 'Awaiting data owner', detail: 'Population confirmed as lateral joiners. Tracker for lateral joiners 1 Jan–14 Oct: mean 53.6 / 90.4 days (median 35 / 69). The small differences (0.6 / 1.4 days) may reflect the cut-off date or calculation; confirm the scorecard\'s cut-off and whether it uses a mean.' });
    if (!q('Vendor usage: slide 6% vs tracker 6.6% for lateral joiners')) S.add('questions', { title: 'Vendor usage: slide 6% vs tracker 6.6% for lateral joiners', type: 'Data conflict', priority: 'Nice to have', relatedTo: 'Vendor usage',
      detail: 'Tracker: 23 of 351 lateral joiners (6.6%) to 14 Oct; 6.2% if counted to 30 Sep. The slide value may use an earlier cut-off. Both values are kept.', valueA: 'Slide / scorecard: 6%', valueB: 'Tracker: 6.6% (to 14 Oct)', owner: 'TA Head / data owner', raisedDate: today, status: 'Open', resolution: null, resolvedDate: null }, origin);
    // Slide commentary, recorded as insights so they can be accepted, edited or dismissed. Interpretations are the slide's, not verified.
    const INS = [
      ['Vendor usage 6% (2026 YTD) – lowest value in the 2020–2026 series', 'Vendor usage for lateral joiners: 15% (2020), 7%, 20%, 19%, 14%, 12% (2025), 6% (2026 YTD).',
        'Slide interpretation (not verified): signals stronger direct sourcing and referral capability.', 'The lowest full-year value is 7% (2021). 2026 is year-to-date. The causal link to sourcing capability is not evidenced; referral share in 2026 YTD (15%) is below 2022 (28%) and 2024 (22%).',
        'Confirm the vendor-fee impact with approved fee data before presenting any saving.'],
      ['Gender diversity 35% (2026 YTD), below 39% (2024) and 38% (2025)', 'Female share of lateral joiners: 24% (2020) rising to 39% (2024), then 38% (2025) and 35% (2026 YTD).',
        'Slide: attention needed; ExcelHER, NATS conversion and a structured pipeline are planned.', '2026 is year-to-date and may change by year end. ExcelHER and NATS are separate programmes; their effect on the lateral share depends on conversions.',
        'Track the planned actions and review the lateral female share monthly (monthly values are in the hiring tracker data).'],
      ['Employee referrals 15% (2026 YTD), up from 12% in 2025', 'Referral share of lateral joiners: 23%, 20%, 28%, 9% (2023), 22%, 12% (2025), 15% (2026 YTD).',
        'Slide: recovering after the 2023 dip; SAP SuccessFactors referral module redesign and targeted actions underway.', 'The series is volatile (9%–28%). 15% is above 2025 but below 2024 (22%). 2026 is year-to-date.',
        'Track the referral module redesign and measure referral share after it goes live.']
    ];
    INS.forEach(([title, obs, interp, unc, act]) => {
      if (S.list('insights', { archived: true }).some(i => i.title === title)) return;
      S.add('insights', { title, type: 'Descriptive finding', observation: obs, supportingData: SRC + '; population: lateral joiners; 2026 = year-to-date.', method: 'Values as labelled on the slide; changes in percentage points.',
        interpretation: interp, uncertainty: unc, recommendedAction: act, owner: null, reviewDate: null, status: 'New', generatedBy: 'Business Review slide (Oct) – entered by the TA Head' }, origin);
    });
    const ACT = [['Structured diversity pipeline for lateral hiring (ExcelHER, NATS conversion)', 'Not started', 'Planned (per Business Review slide, Oct).'],
      ['SAP SuccessFactors referral module redesign and targeted employee-referral actions', 'In progress', 'Underway (per Business Review slide, Oct).']];
    ACT.forEach(([title, status, notes]) => { if (!S.list('actions', { archived: true }).some(a => a.title === title)) S.add('actions', { title, sourceType: 'Other', sourceRef: null, commitmentType: null, owner: null, dueDate: null, status, completedDate: null, stakeholderValidation: 'Not required', notes: notes + ' Owner and due date not provided.' }, origin); });
    S.setMeta({ appliedPacks: (S.state.meta.appliedPacks || []).concat([PACK]) });
    TA.toast('Loaded lateral-hiring trends 2020–2026');
    return true;
  }

  const prev = TA.applyDataPacks;
  TA.applyDataPacks = function () { const a = prev ? prev() : false; const b = apply(); return a || b; };
  TA.LATERAL_TREND_METRICS = ['Gender diversity', 'Vendor usage', 'Employee referrals'];
})();
