/* Data pack: key hiring parameters on lateral hires only (TA Head, 20 Oct 2026).
   "Vendor usage, cycle time, employee referral, gender diversity, offer acceptance, offer rejection, requisition ageing etc. –
   consider only lateral hires (including conversions, FTC hiring)."
   The tracker's "Lateral" hiring type already includes conversions (consultant, FTC, NATS, ExcelHER, GAT) and FTC hires, and reconciles
   with the scorecard Lateral programme (351). Aggregates only – computed outside the dashboard; no candidate-level data is stored.
   The earlier all-hires (lateral + fresher) values for these measures move to the recycle bin, where they can be restored. Applied once. */
(function () {
  'use strict';
  const TA = window.TA;
  const PACK = 'lateral-scope-2026-10-20';
  const SRC = 'Hiring2026 tracker – Master Tracker sheet (supplied 19 Oct 2026); aggregates only';
  const WHO = 'TA Head, 20 Oct 2026';
  const POP_J = 'Lateral joiners (Hiring tracker)', POP_O = 'Lateral offers released in period (Hiring tracker)';
  const SCOPE_NOTE = 'Population: lateral hires only, including conversions and FTC hires (' + WHO + ').';
  const AGG = {"ytd":{"joined":351,"female":125,"gNP":0,"vendor":23,"referral":51,"direct":168,"conversion":109,"ftc":74,"offers":391,"oJoined":314,"oDeclined":36,"oPending":41,"r2o":{"n":347,"sum":18587,"median":35,"neg":2,"missing":2},"r2j":{"n":349,"sum":31555,"median":69,"neg":0,"missing":2}},"months":[{"joined":33,"female":15,"gNP":0,"vendor":3,"referral":6,"direct":13,"conversion":11,"ftc":3,"offers":40,"oJoined":36,"oDeclined":4,"oPending":0,"r2o":{"n":33,"sum":1984,"median":34,"neg":0,"missing":0},"r2j":{"n":33,"sum":3383,"median":97,"neg":0,"missing":0},"m":1},{"joined":31,"female":9,"gNP":0,"vendor":0,"referral":9,"direct":13,"conversion":9,"ftc":5,"offers":49,"oJoined":40,"oDeclined":9,"oPending":0,"r2o":{"n":31,"sum":1355,"median":25,"neg":0,"missing":0},"r2j":{"n":31,"sum":2362,"median":50,"neg":0,"missing":0},"m":2},{"joined":34,"female":9,"gNP":0,"vendor":4,"referral":5,"direct":20,"conversion":5,"ftc":5,"offers":40,"oJoined":40,"oDeclined":0,"oPending":0,"r2o":{"n":34,"sum":1752,"median":39.5,"neg":0,"missing":0},"r2j":{"n":34,"sum":3109,"median":65.5,"neg":0,"missing":0},"m":3},{"joined":39,"female":9,"gNP":0,"vendor":4,"referral":7,"direct":18,"conversion":10,"ftc":4,"offers":46,"oJoined":41,"oDeclined":5,"oPending":0,"r2o":{"n":39,"sum":2347,"median":38,"neg":0,"missing":0},"r2j":{"n":39,"sum":3975,"median":82,"neg":0,"missing":0},"m":4},{"joined":42,"female":11,"gNP":0,"vendor":0,"referral":2,"direct":26,"conversion":14,"ftc":11,"offers":40,"oJoined":36,"oDeclined":4,"oPending":0,"r2o":{"n":42,"sum":2053,"median":17.0,"neg":0,"missing":0},"r2j":{"n":42,"sum":3340,"median":55.0,"neg":0,"missing":0},"m":5},{"joined":41,"female":23,"gNP":0,"vendor":1,"referral":6,"direct":15,"conversion":19,"ftc":6,"offers":41,"oJoined":39,"oDeclined":2,"oPending":0,"r2o":{"n":41,"sum":2198,"median":36,"neg":0,"missing":0},"r2j":{"n":41,"sum":3684,"median":66,"neg":0,"missing":0},"m":6},{"joined":47,"female":18,"gNP":0,"vendor":3,"referral":7,"direct":17,"conversion":20,"ftc":19,"offers":51,"oJoined":45,"oDeclined":4,"oPending":2,"r2o":{"n":47,"sum":2655,"median":36,"neg":0,"missing":0},"r2j":{"n":47,"sum":4069,"median":60,"neg":0,"missing":0},"m":7},{"joined":37,"female":14,"gNP":0,"vendor":3,"referral":3,"direct":24,"conversion":7,"ftc":11,"offers":25,"oJoined":16,"oDeclined":5,"oPending":4,"r2o":{"n":34,"sum":2113,"median":44.0,"neg":1,"missing":2},"r2j":{"n":35,"sum":3541,"median":80,"neg":0,"missing":2},"m":8},{"joined":36,"female":13,"gNP":0,"vendor":3,"referral":5,"direct":15,"conversion":13,"ftc":7,"offers":44,"oJoined":21,"oDeclined":3,"oPending":20,"r2o":{"n":36,"sum":1664,"median":30.5,"neg":0,"missing":0},"r2j":{"n":36,"sum":3169,"median":69.5,"neg":0,"missing":0},"m":9},{"joined":11,"female":4,"gNP":0,"vendor":2,"referral":1,"direct":7,"conversion":1,"ftc":3,"offers":15,"oJoined":0,"oDeclined":0,"oPending":15,"r2o":{"n":10,"sum":466,"median":40.5,"neg":1,"missing":0},"r2j":{"n":11,"sum":923,"median":72,"neg":0,"missing":0},"m":10}],"source":[{"label":"Direct/SF/Social Media/Job Portal","joined":168,"offers":195,"declined":23},{"label":"Conversion","joined":109,"offers":109,"declined":3},{"label":"Employee Referral","joined":51,"offers":57,"declined":3},{"label":"Vendor","joined":23,"offers":30,"declined":7}],"business":[{"label":"Trucks Technology & Industrial Division","joined":177,"offers":201,"declined":9},{"label":"Digital Technology & Operations","joined":70,"offers":71,"declined":14},{"label":"Financial Control & Accounting","joined":57,"offers":67,"declined":9},{"label":"Volvo Construction Equipment","joined":26,"offers":29,"declined":1},{"label":"Volvo Financial Services","joined":9,"offers":11,"declined":2},{"label":"Volvo Penta","joined":3,"offers":4,"declined":1},{"label":"Group People & Culture","joined":3,"offers":2,"declined":0},{"label":"Volvo Group India Representation","joined":2,"offers":2,"declined":0},{"label":"Group Legal & Compliance","joined":1,"offers":1,"declined":0},{"label":"Volvo Energy","joined":1,"offers":1,"declined":0},{"label":"Volvo Trucks","joined":1,"offers":1,"declined":0},{"label":"Volvo Group Real Estate","joined":1,"offers":1,"declined":0}],"employment":[{"label":"Permanent","joined":274,"offers":295,"declined":25},{"label":"FTC","joined":74,"offers":93,"declined":11},{"label":"Not provided","joined":2,"offers":2,"declined":0},{"label":"Not provided (value \"SG5\")","joined":1,"offers":1,"declined":0}],"declineReasons":{"Retained by current company":9,"Accepted counter offer":13,"Personal reasons":5,"Not provided":9},"ageAtOffer":{"rows":[{"label":"0–30 days","count":161},{"label":"31–60 days","count":73},{"label":"61–90 days","count":50},{"label":"91–120 days","count":26},{"label":"Over 120 days","count":37}],"missing":2,"negative":2},"agePending":{"rows":[{"label":"0–30 days","count":4},{"label":"31–60 days","count":9},{"label":"61–90 days","count":5},{"label":"91–120 days","count":13},{"label":"Over 120 days","count":10}],"missing":0,"n":41},"pendingByMonth":{"2026-10":11,"2026-11":19,"2026-12":11,"2027-01":5},"pendingAll":46,"fresherConversions":1,"pendingAgeSum":3946,"pendingMedianAge":93};
  // Measures now reported on lateral hires only.
  const KEY = ['Offers made', 'Offer decline rate', 'Offer acceptance rate', 'Direct sourcing contribution', 'Offers pending joining',
    'Requisition-to-offer time', 'Requisition-to-join time', 'Vendor usage', 'Employee referrals', 'Gender diversity', 'Requisition ageing'];
  const OLD_BD = ['Hiring by business area', 'Hiring by source', 'Joiners by employment type', 'Offer decline reasons', 'Offers pending joining by expected month'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const ym = (k) => /^\d{4}-\d{2}$/.test(k) ? MONTHS[+k.slice(5) - 1] + ' ' + k.slice(0, 4) : k;

  function apply() {
    const S = TA.Store;
    const applied = S.state.meta.appliedPacks || [];
    if (applied.indexOf(PACK) >= 0 || applied.indexOf('lateral-trends-2026') < 0) return false;
    const ytd = S.get('periods', 'per_ht_2026ytd'); if (!ytd) return false;
    S.recoveryPoint('Before restricting key hiring parameters to lateral hires');
    const origin = 'Import: ' + SRC + ' – lateral hires only';
    const today = TA.todayIso();
    const metric = (name) => S.list('metrics', { archived: true }).find(x => x.name === name);
    const htPeriod = (id) => /^per_ht_2026/.test(id);

    // 1. Retire all-hires values of the key measures in the hiring-tracker periods (recoverable from the recycle bin).
    const keyIds = KEY.map(metric).filter(Boolean).map(m => m.id);
    S.list('observations').filter(o => keyIds.indexOf(o.metricId) >= 0 && htPeriod(o.periodId) && !/^Lateral/.test(o.population || ''))
      .forEach(o => S.softDelete('observations', o.id));
    S.list('breakdowns').filter(b => b.periodId === ytd.id && OLD_BD.indexOf(b.title) >= 0).forEach(b => S.softDelete('breakdowns', b.id));

    // 2. Definitions state the lateral population.
    KEY.forEach(n => { const m = metric(n); if (m && !/lateral hires only/.test(m.definition || '')) S.update('metrics', m.id, { definition: (m.definition ? m.definition + ' ' : '') + SCOPE_NOTE }); });
    const ra = metric('Requisition ageing');
    if (ra && ra.definitionStatus === 'Not provided') S.update('metrics', ra.id, { definitionStatus: 'Proposed – to confirm',
      calculation: 'Mean days from requisition approval to the cut-off date, for lateral requisitions not yet closed by a joiner.' });

    // 3. Lateral values.
    const obs = (name, p, num, den, population, note, incomplete) => { const m = metric(name); if (!m || !p) return;
      if (S.list('observations').some(o => o.metricId === m.id && o.periodId === p.id && o.population === population)) return;
      S.add('observations', { metricId: m.id, periodId: p.id, population, target: null, actualReported: null, numerator: num, denominator: den, calcNote: note, incomplete: !!incomplete,
        attribution: 'Shared business outcome', source: SRC, owner: null, dataDate: '2026-10-14', notes: 'Recalculated for lateral hires (incl. conversions and FTC) from the hiring tracker (aggregates only).' }, origin); };
    const cyc = (c, what) => 'Mean of ' + c.n + ' lateral joiners (median ' + c.median + ' days)' + (c.missing ? '; ' + c.missing + ' without a requisition approval date excluded' : '') + (c.neg ? '; ' + c.neg + ' with ' + what + ' before approval excluded' : '') + '.';
    const y = AGG.ytd;
    obs('Lateral hires', ytd, y.joined, 1, POP_J, 'Count by actual date of joining: ' + y.conversion + ' conversions and ' + y.ftc + ' FTC hires included. Reconciles with the scorecard Lateral programme (351).');
    obs('Offers made', ytd, y.offers, 1, POP_O, 'Outcomes: joined ' + y.oJoined + ', declined ' + y.oDeclined + ', pending ' + y.oPending + '.');
    obs('Offer decline rate', ytd, y.oDeclined, y.offers, POP_O, y.oPending + ' lateral offers in this cohort are still pending.');
    obs('Offer acceptance rate', ytd, y.oJoined, y.oJoined + y.oDeclined, 'Lateral offers released in period with known outcome (Hiring tracker)', 'Joined ÷ (joined + declined); ' + y.oPending + ' pending offers excluded.');
    obs('Direct sourcing contribution', ytd, y.direct, y.joined, POP_J, 'Direct (SF, social media, job portal) lateral joiners ÷ lateral joiners.');
    obs('Offers pending joining', ytd, AGG.pendingAll, 1, 'Lateral offers with status Offered at the tracker date', 'Expected joining: ' + Object.keys(AGG.pendingByMonth).sort().map(k => ym(k) + ': ' + AGG.pendingByMonth[k]).join(', ') + '. All pending offers in the tracker are lateral.');
    obs('Requisition ageing', ytd, AGG.pendingAgeSum, AGG.agePending.n, 'Lateral requisitions with an offer pending joining at 14 Oct (Hiring tracker)',
      'Mean days from requisition approval to 14 Oct for ' + AGG.agePending.n + ' pending lateral offers (median ' + AGG.pendingMedianAge + ' days). Requisitions still open without an offer are not in the tracker, so their ageing is not provided.');
    // Gender, vendor, referral and cycle times for the YTD already exist with the lateral population (lateral-trends pack).
    obs('Gender diversity', ytd, y.female, y.joined, POP_J, 'Female lateral joiners ÷ lateral joiners.');
    obs('Vendor usage', ytd, y.vendor, y.joined, POP_J, 'Vendor-sourced lateral joiners ÷ lateral joiners.');
    obs('Employee referrals', ytd, y.referral, y.joined, POP_J, 'Referral lateral joiners ÷ lateral joiners.');
    obs('Requisition-to-offer time', ytd, y.r2o.sum, y.r2o.n, POP_J, cyc(y.r2o, 'an offer date'));
    obs('Requisition-to-join time', ytd, y.r2j.sum, y.r2j.n, POP_J, cyc(y.r2j, 'a joining date'));
    AGG.months.forEach(m => {
      const p = S.get('periods', 'per_ht_2026_' + String(m.m).padStart(2, '0')); if (!p) return;
      obs('Lateral hires', p, m.joined, 1, POP_J, 'Count by actual date of joining (' + m.conversion + ' conversions, ' + m.ftc + ' FTC).');
      obs('Offers made', p, m.offers, 1, POP_O, 'Count of lateral offers by offer date.');
      obs('Offer decline rate', p, m.oDeclined, m.offers, POP_O, m.oPending ? m.oPending + ' lateral offers in this cohort are still pending; the rate may rise' : 'All lateral offers in this cohort have an outcome.', m.oPending > 0);
      obs('Offer acceptance rate', p, m.oJoined, m.oJoined + m.oDeclined, 'Lateral offers released in period with known outcome (Hiring tracker)', m.oPending ? m.oPending + ' pending offers excluded; the rate may change' : 'All offers in this cohort have an outcome.', m.oPending > 0);
      obs('Vendor usage', p, m.vendor, m.joined, POP_J, 'Vendor-sourced lateral joiners ÷ lateral joiners in month.');
      obs('Employee referrals', p, m.referral, m.joined, POP_J, 'Referral lateral joiners ÷ lateral joiners in month.');
      obs('Gender diversity', p, m.female, m.joined, POP_J, 'Female lateral joiners ÷ lateral joiners in month.');
      obs('Direct sourcing contribution', p, m.direct, m.joined, POP_J, 'Direct lateral joiners ÷ lateral joiners in month.');
      obs('Requisition-to-offer time', p, m.r2o.sum, m.r2o.n, POP_J, cyc(m.r2o, 'an offer date'));
      obs('Requisition-to-join time', p, m.r2j.sum, m.r2j.n, POP_J, cyc(m.r2j, 'a joining date'));
    });

    // 4. Lateral breakdowns.
    const bd = (title, dimension, rows, notes) => { if (!S.list('breakdowns').some(b => b.title === title && b.periodId === ytd.id)) { const r = S.add('breakdowns', { title, periodId: ytd.id, dimension, source: SRC, notes }, origin); S.update('breakdowns', r.id, { rows }, { silent: true }); } };
    bd('Lateral hiring by business area', 'Business area', AGG.business, 'Lateral hires incl. conversions and FTC. Business area as recorded in the tracker (DV/BA/Function).');
    bd('Lateral hiring by source', 'Source', AGG.source, 'Conversions include consultant, FTC, NATS, ExcelHER and GAT conversions recorded as lateral hires.');
    bd('Lateral hiring by employment type', 'Employment type', AGG.employment, null);
    bd('Lateral offer decline reasons', 'Reason', Object.keys(AGG.declineReasons).map(k => ({ label: k, count: AGG.declineReasons[k] })), 'Declines among lateral offers released 1 Jan–14 Oct 2026.');
    bd('Lateral offers pending joining by expected month', 'Expected joining month', Object.keys(AGG.pendingByMonth).sort().map(k => ({ label: ym(k), count: AGG.pendingByMonth[k] })), 'Status "Offered" at the tracker date.');
    bd('Lateral requisition age at offer (joiners)', 'Days from requisition approval to offer', AGG.ageAtOffer.rows,
      'Lateral joiners 1 Jan–14 Oct 2026. ' + AGG.ageAtOffer.missing + ' without an approval date and ' + AGG.ageAtOffer.negative + ' with an offer before approval are excluded.');
    bd('Pending lateral offers – requisition age at 14 Oct', 'Days since requisition approval', AGG.agePending.rows, 'Lateral offers released by 14 Oct and not yet joined or declined.');

    // 5. Period note, questions.
    if (!/key parameters are lateral/i.test(ytd.notes || '')) S.update('periods', ytd.id, { notes: (ytd.notes ? ytd.notes + ' ' : '') + 'From 20 Oct 2026 the key parameters (sourcing mix, gender, cycle times, offers, ageing) are lateral hires only, incl. conversions and FTC; joiner volume still covers lateral + fresher.' });
    const Q = (title, priority, relatedTo, detail) => { if (!S.list('questions').some(x => x.title === title)) S.add('questions', { title, type: 'Missing data', priority, relatedTo, detail, valueA: null, valueB: null, owner: 'Dr. Ranjith TP', raisedDate: today, status: 'Open', resolution: null, resolvedDate: null }, origin); };
    Q('Open lateral requisitions and their ageing', 'Nice to have', 'Requisition ageing',
      'The hiring tracker lists only requisitions that reached an offer, so ageing of open lateral requisitions with no offer yet is not provided. Ageing is shown for the ' + AGG.agePending.n + ' pending lateral offers only. Is there an open-requisition report (requisition ID, approval date, status) to load as aggregates?');
    if (AGG.fresherConversions) Q('One conversion recorded as a fresher hire', 'Nice to have', 'Lateral hires – population',
      AGG.fresherConversions + ' joiner (a NATS conversion) is recorded with hiring type "Fresher" in the tracker, so it is outside the lateral figures. Should it count as a lateral hire? The lateral total (351) currently matches the scorecard.');
    S.setMeta({ appliedPacks: (S.state.meta.appliedPacks || []).concat([PACK]) });
    TA.toast('Key hiring parameters now use lateral hires only (incl. conversions and FTC)');
    return true;
  }

  const prev = TA.applyDataPacks;
  TA.applyDataPacks = function () { const a = prev ? prev() : false; const b = apply(); return a || b; };
})();
