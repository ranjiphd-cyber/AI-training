/* Data pack: key hiring parameters on lateral hires only (TA Head, 20 Oct 2026).
   "Vendor usage, cycle time, employee referral, gender diversity, offer acceptance, offer rejection, requisition ageing etc. –
   consider only lateral hires (including conversions, FTC hiring)."
   Lateral = tracker hiring type "Lateral" (already includes consultant, FTC, NATS, ExcelHER and GAT conversions and FTC hires) plus
   the one NATS conversion the tracker records as "Fresher" – treated as a conversion (TA Head, 20 Oct 2026). That gives 352 lateral
   joiners; the scorecard Lateral programme (351) stays as reported. Cycle times: use the tracker (TA Head, 20 Oct 2026).
   Aggregates only – computed outside the dashboard; no candidate-level data is stored.
   The earlier all-hires (lateral + fresher) values for these measures move to the recycle bin, where they can be restored. */
(function () {
  'use strict';
  const TA = window.TA;
  const PACK = 'lateral-scope-2026-10-20', PACK2 = 'lateral-scope-2026-10-20-upd1';
  const SRC = 'Hiring2026 tracker – Master Tracker sheet (supplied 19 Oct 2026); aggregates only';
  const WHO = 'TA Head, 20 Oct 2026';
  const POP_J = 'Lateral joiners (Hiring tracker)', POP_O = 'Lateral offers released in period (Hiring tracker)', POP_K = 'Lateral offers released in period with known outcome (Hiring tracker)';
  const SCOPE_NOTE = 'Population: lateral hires only, including conversions and FTC hires (' + WHO + ').';
  const AGG = {"ytd":{"joined":352,"female":125,"gNP":0,"vendor":23,"referral":51,"direct":168,"conversion":110,"ftc":74,"offers":392,"oJoined":315,"oDeclined":36,"oPending":41,"r2o":{"n":348,"sum":18615,"median":35,"neg":2,"missing":2},"r2j":{"n":350,"sum":31602,"median":68.5,"neg":0,"missing":2}},"months":[{"joined":33,"female":15,"gNP":0,"vendor":3,"referral":6,"direct":13,"conversion":11,"ftc":3,"offers":40,"oJoined":36,"oDeclined":4,"oPending":0,"r2o":{"n":33,"sum":1984,"median":34,"neg":0,"missing":0},"r2j":{"n":33,"sum":3383,"median":97,"neg":0,"missing":0},"m":1},{"joined":31,"female":9,"gNP":0,"vendor":0,"referral":9,"direct":13,"conversion":9,"ftc":5,"offers":49,"oJoined":40,"oDeclined":9,"oPending":0,"r2o":{"n":31,"sum":1355,"median":25,"neg":0,"missing":0},"r2j":{"n":31,"sum":2362,"median":50,"neg":0,"missing":0},"m":2},{"joined":34,"female":9,"gNP":0,"vendor":4,"referral":5,"direct":20,"conversion":5,"ftc":5,"offers":40,"oJoined":40,"oDeclined":0,"oPending":0,"r2o":{"n":34,"sum":1752,"median":39.5,"neg":0,"missing":0},"r2j":{"n":34,"sum":3109,"median":65.5,"neg":0,"missing":0},"m":3},{"joined":40,"female":9,"gNP":0,"vendor":4,"referral":7,"direct":18,"conversion":11,"ftc":4,"offers":47,"oJoined":42,"oDeclined":5,"oPending":0,"r2o":{"n":40,"sum":2375,"median":37.5,"neg":0,"missing":0},"r2j":{"n":40,"sum":4022,"median":79.5,"neg":0,"missing":0},"m":4},{"joined":42,"female":11,"gNP":0,"vendor":0,"referral":2,"direct":26,"conversion":14,"ftc":11,"offers":40,"oJoined":36,"oDeclined":4,"oPending":0,"r2o":{"n":42,"sum":2053,"median":17,"neg":0,"missing":0},"r2j":{"n":42,"sum":3340,"median":55,"neg":0,"missing":0},"m":5},{"joined":41,"female":23,"gNP":0,"vendor":1,"referral":6,"direct":15,"conversion":19,"ftc":6,"offers":41,"oJoined":39,"oDeclined":2,"oPending":0,"r2o":{"n":41,"sum":2198,"median":36,"neg":0,"missing":0},"r2j":{"n":41,"sum":3684,"median":66,"neg":0,"missing":0},"m":6},{"joined":47,"female":18,"gNP":0,"vendor":3,"referral":7,"direct":17,"conversion":20,"ftc":19,"offers":51,"oJoined":45,"oDeclined":4,"oPending":2,"r2o":{"n":47,"sum":2655,"median":36,"neg":0,"missing":0},"r2j":{"n":47,"sum":4069,"median":60,"neg":0,"missing":0},"m":7},{"joined":37,"female":14,"gNP":0,"vendor":3,"referral":3,"direct":24,"conversion":7,"ftc":11,"offers":25,"oJoined":16,"oDeclined":5,"oPending":4,"r2o":{"n":34,"sum":2113,"median":44,"neg":1,"missing":2},"r2j":{"n":35,"sum":3541,"median":80,"neg":0,"missing":2},"m":8},{"joined":36,"female":13,"gNP":0,"vendor":3,"referral":5,"direct":15,"conversion":13,"ftc":7,"offers":44,"oJoined":21,"oDeclined":3,"oPending":20,"r2o":{"n":36,"sum":1664,"median":30.5,"neg":0,"missing":0},"r2j":{"n":36,"sum":3169,"median":69.5,"neg":0,"missing":0},"m":9},{"joined":11,"female":4,"gNP":0,"vendor":2,"referral":1,"direct":7,"conversion":1,"ftc":3,"offers":15,"oJoined":0,"oDeclined":0,"oPending":15,"r2o":{"n":10,"sum":466,"median":40.5,"neg":1,"missing":0},"r2j":{"n":11,"sum":923,"median":72,"neg":0,"missing":0},"m":10}],"source":[{"label":"Direct/SF/Social Media/Job Portal","joined":168,"offers":195,"declined":23},{"label":"Conversion","joined":110,"offers":110,"declined":3},{"label":"Employee Referral","joined":51,"offers":57,"declined":3},{"label":"Vendor","joined":23,"offers":30,"declined":7}],"business":[{"label":"Trucks Technology & Industrial Division","joined":177,"offers":201,"declined":9},{"label":"Digital Technology & Operations","joined":70,"offers":71,"declined":14},{"label":"Financial Control & Accounting","joined":58,"offers":68,"declined":9},{"label":"Volvo Construction Equipment","joined":26,"offers":29,"declined":1},{"label":"Volvo Financial Services","joined":9,"offers":11,"declined":2},{"label":"Volvo Penta","joined":3,"offers":4,"declined":1},{"label":"Group People & Culture","joined":3,"offers":2,"declined":0},{"label":"Volvo Group India Representation","joined":2,"offers":2,"declined":0},{"label":"Group Legal & Compliance","joined":1,"offers":1,"declined":0},{"label":"Volvo Energy","joined":1,"offers":1,"declined":0},{"label":"Volvo Trucks","joined":1,"offers":1,"declined":0},{"label":"Volvo Group Real Estate","joined":1,"offers":1,"declined":0}],"employment":[{"label":"Permanent","joined":275,"offers":296,"declined":25},{"label":"FTC","joined":74,"offers":93,"declined":11},{"label":"Not provided","joined":2,"offers":2,"declined":0},{"label":"Not provided (value \"SG5\")","joined":1,"offers":1,"declined":0}],"declineReasons":{"Retained by current company":9,"Accepted counter offer":13,"Personal reasons":5,"Not provided":9},"ageAtOffer":{"rows":[{"label":"0–30 days","count":162},{"label":"31–60 days","count":73},{"label":"61–90 days","count":50},{"label":"91–120 days","count":26},{"label":"Over 120 days","count":37}],"missing":2,"negative":2},"agePending":{"rows":[{"label":"0–30 days","count":4},{"label":"31–60 days","count":9},{"label":"61–90 days","count":5},{"label":"91–120 days","count":13},{"label":"Over 120 days","count":10}],"missing":0,"n":41},"pendingByMonth":{"2026-10":11,"2026-11":19,"2026-12":11,"2027-01":5},"pendingAll":46,"fresherConversions":1,"pendingAgeSum":3946,"pendingMedianAge":93};
  // Measures now reported on lateral hires only.
  const KEY = ['Offers made', 'Offer decline rate', 'Offer acceptance rate', 'Direct sourcing contribution', 'Offers pending joining',
    'Requisition-to-offer time', 'Requisition-to-join time', 'Vendor usage', 'Employee referrals', 'Gender diversity', 'Requisition ageing'];
  const OLD_BD = ['Hiring by business area', 'Hiring by source', 'Joiners by employment type', 'Offer decline reasons', 'Offers pending joining by expected month'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const ym = (k) => /^\d{4}-\d{2}$/.test(k) ? MONTHS[+k.slice(5) - 1] + ' ' + k.slice(0, 4) : k;
  const BASIS = 'lateral joiners (' + AGG.ytd.joined + ' incl. ' + AGG.ytd.conversion + ' conversions and ' + AGG.ytd.ftc + ' FTC hires)';

  // Every lateral value: [metric, periodId, numerator, denominator, population, note, incomplete]
  function values() {
    const out = [], y = AGG.ytd;
    const cyc = (c, what) => 'Mean of ' + c.n + ' lateral joiners (median ' + c.median + ' days)' + (c.missing ? '; ' + c.missing + ' without a requisition approval date excluded' : '') + (c.neg ? '; ' + c.neg + ' with ' + what + ' before approval excluded' : '') + '.';
    const Y = 'per_ht_2026ytd';
    out.push(['Lateral hires', Y, y.joined, 1, POP_J, 'Count by actual date of joining: ' + y.conversion + ' conversions (incl. 1 NATS conversion recorded as "Fresher" in the tracker) and ' + y.ftc + ' FTC hires. The scorecard Lateral programme reports 351.']);
    out.push(['Offers made', Y, y.offers, 1, POP_O, 'Outcomes: joined ' + y.oJoined + ', declined ' + y.oDeclined + ', pending ' + y.oPending + '.']);
    out.push(['Offer decline rate', Y, y.oDeclined, y.offers, POP_O, y.oPending + ' lateral offers in this cohort are still pending.']);
    out.push(['Offer acceptance rate', Y, y.oJoined, y.oJoined + y.oDeclined, POP_K, 'Joined ÷ (joined + declined); ' + y.oPending + ' pending offers excluded.']);
    out.push(['Direct sourcing contribution', Y, y.direct, y.joined, POP_J, 'Direct (SF, social media, job portal) joiners ÷ ' + BASIS + '.']);
    out.push(['Offers pending joining', Y, AGG.pendingAll, 1, 'Lateral offers with status Offered at the tracker date', 'Expected joining: ' + Object.keys(AGG.pendingByMonth).sort().map(k => ym(k) + ': ' + AGG.pendingByMonth[k]).join(', ') + '. All pending offers in the tracker are lateral.']);
    out.push(['Requisition ageing', Y, AGG.pendingAgeSum, AGG.agePending.n, 'Lateral requisitions with an offer pending joining at 14 Oct (Hiring tracker)',
      'Mean days from requisition approval to 14 Oct for ' + AGG.agePending.n + ' pending lateral offers (median ' + AGG.pendingMedianAge + ' days). Requisitions still open without an offer are not in the tracker, so their ageing is not provided.']);
    out.push(['Gender diversity', Y, y.female, y.joined, POP_J, 'Female joiners ÷ ' + BASIS + '.']);
    out.push(['Vendor usage', Y, y.vendor, y.joined, POP_J, 'Vendor-sourced joiners ÷ ' + BASIS + '.']);
    out.push(['Employee referrals', Y, y.referral, y.joined, POP_J, 'Referral joiners ÷ ' + BASIS + '.']);
    out.push(['Requisition-to-offer time', Y, y.r2o.sum, y.r2o.n, POP_J, cyc(y.r2o, 'an offer date') + ' Tracker values adopted (' + WHO + ').']);
    out.push(['Requisition-to-join time', Y, y.r2j.sum, y.r2j.n, POP_J, cyc(y.r2j, 'a joining date') + ' Tracker values adopted (' + WHO + ').']);
    AGG.months.forEach(m => {
      const P = 'per_ht_2026_' + String(m.m).padStart(2, '0');
      out.push(['Lateral hires', P, m.joined, 1, POP_J, 'Count by actual date of joining (' + m.conversion + ' conversions, ' + m.ftc + ' FTC).']);
      out.push(['Offers made', P, m.offers, 1, POP_O, 'Count of lateral offers by offer date.']);
      out.push(['Offer decline rate', P, m.oDeclined, m.offers, POP_O, m.oPending ? m.oPending + ' lateral offers in this cohort are still pending; the rate may rise' : 'All lateral offers in this cohort have an outcome.', m.oPending > 0]);
      out.push(['Offer acceptance rate', P, m.oJoined, m.oJoined + m.oDeclined, POP_K, m.oPending ? m.oPending + ' pending offers excluded; the rate may change' : 'All offers in this cohort have an outcome.', m.oPending > 0]);
      out.push(['Vendor usage', P, m.vendor, m.joined, POP_J, 'Vendor-sourced lateral joiners ÷ lateral joiners in month.']);
      out.push(['Employee referrals', P, m.referral, m.joined, POP_J, 'Referral lateral joiners ÷ lateral joiners in month.']);
      out.push(['Gender diversity', P, m.female, m.joined, POP_J, 'Female lateral joiners ÷ lateral joiners in month.']);
      out.push(['Direct sourcing contribution', P, m.direct, m.joined, POP_J, 'Direct lateral joiners ÷ lateral joiners in month.']);
      out.push(['Requisition-to-offer time', P, m.r2o.sum, m.r2o.n, POP_J, cyc(m.r2o, 'an offer date')]);
      out.push(['Requisition-to-join time', P, m.r2j.sum, m.r2j.n, POP_J, cyc(m.r2j, 'a joining date')]);
    });
    return out;
  }
  function breakdowns() {
    return [
      ['Lateral hiring by business area', 'Business area', AGG.business, 'Lateral hires incl. conversions and FTC. Business area as recorded in the tracker (DV/BA/Function).'],
      ['Lateral hiring by source', 'Source', AGG.source, 'Conversions include consultant, FTC, NATS, ExcelHER and GAT conversions (incl. 1 NATS conversion the tracker records as a fresher hire).'],
      ['Lateral hiring by employment type', 'Employment type', AGG.employment, null],
      ['Lateral offer decline reasons', 'Reason', Object.keys(AGG.declineReasons).map(k => ({ label: k, count: AGG.declineReasons[k] })), 'Declines among lateral offers released 1 Jan–14 Oct 2026.'],
      ['Lateral offers pending joining by expected month', 'Expected joining month', Object.keys(AGG.pendingByMonth).sort().map(k => ({ label: ym(k), count: AGG.pendingByMonth[k] })), 'Status "Offered" at the tracker date.'],
      ['Lateral requisition age at offer (joiners)', 'Days from requisition approval to offer', AGG.ageAtOffer.rows,
        'Lateral joiners 1 Jan–14 Oct 2026. ' + AGG.ageAtOffer.missing + ' without an approval date and ' + AGG.ageAtOffer.negative + ' with an offer before approval are excluded.'],
      ['Pending lateral offers – requisition age at 14 Oct', 'Days since requisition approval', AGG.agePending.rows, 'Lateral offers released by 14 Oct and not yet joined or declined.']
    ];
  }

  function apply() {
    const S = TA.Store;
    const applied = S.state.meta.appliedPacks || [];
    if (applied.indexOf(PACK2) >= 0 || applied.indexOf('lateral-trends-2026') < 0) return false;
    const ytd = S.get('periods', 'per_ht_2026ytd'); if (!ytd) return false;
    const first = applied.indexOf(PACK) < 0;
    S.recoveryPoint(first ? 'Before restricting key hiring parameters to lateral hires' : 'Before adding the NATS conversion to lateral hires and adopting tracker cycle times');
    const origin = 'Import: ' + SRC + ' – lateral hires only';
    const today = TA.todayIso();
    const metric = (name) => S.list('metrics', { archived: true }).find(x => x.name === name);

    // 1. Retire all-hires values of the key measures in the hiring-tracker periods (recoverable from the recycle bin).
    const keyIds = KEY.map(metric).filter(Boolean).map(m => m.id);
    S.list('observations').filter(o => keyIds.indexOf(o.metricId) >= 0 && /^per_ht_2026/.test(o.periodId) && !/^Lateral/.test(o.population || ''))
      .forEach(o => S.softDelete('observations', o.id));
    S.list('breakdowns').filter(b => b.periodId === ytd.id && OLD_BD.indexOf(b.title) >= 0).forEach(b => S.softDelete('breakdowns', b.id));

    // 2. Definitions state the lateral population.
    KEY.forEach(n => { const m = metric(n); if (m && !/lateral hires only/.test(m.definition || '')) S.update('metrics', m.id, { definition: (m.definition ? m.definition + ' ' : '') + SCOPE_NOTE }); });
    const ra = metric('Requisition ageing');
    if (ra && ra.definitionStatus === 'Not provided') S.update('metrics', ra.id, { definitionStatus: 'Proposed – to confirm',
      calculation: 'Mean days from requisition approval to the cut-off date, for lateral requisitions not yet closed by a joiner.' });

    // 3. Lateral values: add, or update where an earlier load used 351 joiners.
    values().forEach(([name, pid, num, den, population, note, incomplete]) => {
      const m = metric(name), p = S.get('periods', pid); if (!m || !p) return;
      const ex = S.list('observations').find(o => o.metricId === m.id && o.periodId === pid && o.population === population);
      if (ex) { if (ex.numerator !== num || ex.denominator !== den || ex.calcNote !== note || !!ex.incomplete !== !!incomplete) S.update('observations', ex.id, { numerator: num, denominator: den, calcNote: note, incomplete: !!incomplete }); return; }
      S.add('observations', { metricId: m.id, periodId: pid, population, target: null, actualReported: null, numerator: num, denominator: den, calcNote: note, incomplete: !!incomplete,
        attribution: 'Shared business outcome', source: SRC, owner: null, dataDate: '2026-10-14', notes: 'Recalculated for lateral hires (incl. conversions and FTC) from the hiring tracker (aggregates only).' }, origin);
    });

    // 4. Lateral breakdowns.
    breakdowns().forEach(([title, dimension, rows, notes]) => {
      const ex = S.list('breakdowns').find(b => b.title === title && b.periodId === ytd.id);
      if (ex) { if (JSON.stringify(ex.rows) !== JSON.stringify(rows) || ex.notes !== notes) S.update('breakdowns', ex.id, { rows, notes }); return; }
      const r = S.add('breakdowns', { title, periodId: ytd.id, dimension, source: SRC, notes }, origin); S.update('breakdowns', r.id, { rows }, { silent: true });
    });

    // 5. Notes and questions.
    const pnote = 'Key parameters (sourcing mix, gender, cycle times, offers, ageing) are lateral hires only: ' + BASIS + ', per the ' + WHO + '. Joiner volume still covers lateral + fresher.';
    if ((ytd.notes || '').indexOf(pnote) < 0) S.update('periods', ytd.id, { notes: (ytd.notes || '').replace(/ From 20 Oct 2026 the key parameters[^.]*\.[^.]*\./, '') + ' ' + pnote });
    const vm = metric('Vendor usage'), vo = vm && S.list('observations').find(o => o.metricId === vm.id && o.periodId === 'per_biz_2026ytd');
    const vnote = 'With the NATS conversion counted as lateral (' + WHO + '), the tracker gives 23 of ' + AGG.ytd.joined + ' = ' + TA.fmtPct(AGG.ytd.vendor / AGG.ytd.joined * 100) + ' (see 2026 YTD – Hiring tracker).';
    if (vo && (vo.notes || '').indexOf(vnote) < 0) S.update('observations', vo.id, { notes: (vo.notes ? vo.notes + ' ' : '') + vnote });
    const q = (title) => S.list('questions', { archived: true }).find(x => x.title === title);
    const resolve = (title, text) => { const x = q(title); if (x && x.status !== 'Resolved') S.update('questions', x.id, { status: 'Resolved', resolution: text, resolvedDate: today }); };
    const y = AGG.ytd, d1 = (a, b) => TA.fmtVal(a / b, 'days');
    resolve('Cycle times: scorecard 53 / 89 days vs tracker 51.7 / 90.0 days', 'Go with the tracker (' + WHO + '): mean days from requisition approval for lateral joiners incl. conversions – requisition-to-offer ' + d1(y.r2o.sum, y.r2o.n) + ', requisition-to-join ' + d1(y.r2j.sum, y.r2j.n) + ' (53.6 / 90.4 before the NATS conversion was counted as lateral). The scorecard 53 / 89 stays as reported.');
    resolve('One conversion recorded as a fresher hire', 'Treat it as a conversion and count it as lateral (' + WHO + '). Lateral key parameters use ' + y.joined + ' joiners; the scorecard Lateral programme stays at 351 as reported.');
    if (!q('One conversion recorded as a fresher hire') && AGG.fresherConversions) S.add('questions', { title: 'One conversion recorded as a fresher hire', type: 'Missing data', priority: 'Nice to have', relatedTo: 'Lateral hires – population', detail: 'A NATS conversion is recorded with hiring type "Fresher" in the tracker.', valueA: null, valueB: null, owner: 'Dr. Ranjith TP', raisedDate: today, status: 'Resolved', resolution: 'Treat it as a conversion and count it as lateral (' + WHO + ').', resolvedDate: today }, origin);
    const oq = 'Open lateral requisitions and their ageing';
    const oqd = 'The hiring tracker lists only requisitions that reached an offer, so ageing of open lateral requisitions with no offer yet is not provided. Ageing is shown for the ' + AGG.agePending.n + ' pending lateral offers only.';
    if (!q(oq)) S.add('questions', { title: oq, type: 'Missing data', priority: 'Nice to have', relatedTo: 'Requisition ageing', detail: oqd, valueA: null, valueB: null, owner: 'Dr. Ranjith TP', raisedDate: today, status: 'Awaiting data owner', resolution: null, resolvedDate: null }, origin);
    const oqx = q(oq); if (oqx && oqx.status === 'Open') S.update('questions', oqx.id, { status: 'Awaiting data owner', detail: oqd + ' The TA Head will share an open-requisition report (' + WHO + ').' });

    // 6. Slide-based insights: add the tracker's 2026 YTD values beside the slide's (slide values unchanged).
    const pct = (n) => TA.fmtPct(n / y.joined * 100);
    [['Vendor usage 6% (2026 YTD)', 'Hiring tracker 2026 YTD (' + BASIS + '): ' + pct(y.vendor) + '.'],
     ['Gender diversity 35% (2026 YTD)', 'Hiring tracker 2026 YTD (' + BASIS + '): ' + pct(y.female) + '.'],
     ['Employee referrals 15% (2026 YTD)', 'Hiring tracker 2026 YTD (' + BASIS + '): ' + pct(y.referral) + '.'],
     ['Requisition-to-join time has fallen each year since 2023', 'Hiring tracker 2026 YTD (adopted ' + WHO + '): requisition-to-offer ' + d1(y.r2o.sum, y.r2o.n) + ', requisition-to-join ' + d1(y.r2j.sum, y.r2j.n) + '.']
    ].forEach(([t, add]) => { const i = S.list('insights', { archived: true }).find(x => x.title.indexOf(t) === 0); if (i && (i.observation || '').indexOf(add) < 0) S.update('insights', i.id, { observation: (i.observation || '').replace(/ Hiring tracker 2026 YTD \([^]*$/, '') + ' ' + add }); });

    S.setMeta({ appliedPacks: (S.state.meta.appliedPacks || []).concat(first ? [PACK, PACK2] : [PACK2]) });
    TA.toast(first ? 'Key hiring parameters now use lateral hires only (incl. conversions and FTC)' : 'Lateral hires now include the NATS conversion (352); tracker cycle times adopted');
    return true;
  }

  // The lateral key-parameter charts take their 2026 YTD point from the tracker (lateral incl. conversions).
  TA.LATERAL_YTD = { periodId: 'per_ht_2026ytd', population: POP_J };
  const prev = TA.applyDataPacks;
  TA.applyDataPacks = function () { const a = prev ? prev() : false; const b = apply(); return a || b; };
})();
