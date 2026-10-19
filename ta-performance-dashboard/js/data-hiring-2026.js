/* Data pack: "Hiring2026" tracker (supplied 19 Oct 2026) and the TA Head's answers of 19 Oct 2026.
   PRIVACY: the tracker is candidate-level (names, dates of birth, contact details, salaries). Only aggregates computed
   outside the dashboard are stored here – no candidate-level data enters the dashboard. Applied once per dashboard. */
(function () {
  'use strict';
  const TA = window.TA;
  const ANS = 'answers-2026-10-19b', PACK = 'hiring-2026';
  const SRC = 'Hiring2026 tracker – Master Tracker sheet (supplied 19 Oct 2026); aggregates only';
  const WHO = 'TA Head, 19 Oct 2026';
  const AGG = {"ytd":{"joiners":413,"byType":{"Lateral":351,"Fresher":62},"offers":454,"offerOutcomes":{"Joined":375,"Declined":38,"Offered":41},"r2o":{"n":369,"sum":19091,"mean":51.7,"median":34,"excludedNegative":2,"missing":42},"r2j":{"n":371,"sum":33386,"mean":90.0,"median":68,"excludedNegative":0,"missing":42},"sources":{"Conversion":110,"Direct/SF/Social Media/Job Portal":173,"Employee Referral":53,"Vendor":23,"Campus":54},"gender":{"Male":269,"Female":144},"employment":{"Permanent":332,"FTC":78,"Not provided":2,"Not provided (value \"SG5\")":1},"businessArea":[{"label":"Trucks Technology & Industrial Division","joined":205,"offers":229,"declined":9},{"label":"Digital Technology & Operations","joined":95,"offers":98,"declined":16},{"label":"Financial Control & Accounting","joined":63,"offers":73,"declined":9},{"label":"Volvo Construction Equipment","joined":26,"offers":29,"declined":1},{"label":"Volvo Financial Services","joined":11,"offers":13,"declined":2},{"label":"Volvo Penta","joined":3,"offers":4,"declined":1},{"label":"Group People & Culture","joined":3,"offers":2,"declined":0},{"label":"Group Legal & Compliance","joined":2,"offers":1,"declined":0},{"label":"Volvo Group India Representation","joined":2,"offers":2,"declined":0},{"label":"Volvo Energy","joined":1,"offers":1,"declined":0},{"label":"Volvo Trucks","joined":1,"offers":1,"declined":0},{"label":"Volvo Group Real Estate","joined":1,"offers":1,"declined":0},{"label":"Volvo Bus International","joined":0,"offers":0,"declined":0}],"sourceRows":[{"label":"Direct/SF/Social Media/Job Portal","joined":173,"offers":199,"declined":23},{"label":"Conversion","joined":110,"offers":110,"declined":3},{"label":"Employee Referral","joined":53,"offers":59,"declined":3},{"label":"Campus","joined":54,"offers":56,"declined":2},{"label":"Vendor","joined":23,"offers":30,"declined":7}],"hiringType":[{"label":"Lateral","joined":351,"offers":391,"declined":36},{"label":"Fresher","joined":62,"offers":63,"declined":2}],"declineReasons":{"Retained by current company":9,"Accepted counter offer":14,"Personal reasons":5,"Not provided":10},"pending":{"2026-10":11,"2026-11":19,"2026-12":11,"2027-01":5},"pendingCount":46,"latestDate":"2026-10-16","rowsTotal":503,"excludedAfterCut":5,"offersBefore2026":44},"months":[{"m":1,"start":"2026-01-01","end":"2026-01-31","joined":34,"offers":42,"declined":4,"pendingInCohort":0,"vendor":3,"referral":6,"female":16,"direct":14},{"m":2,"start":"2026-02-01","end":"2026-02-28","joined":33,"offers":55,"declined":9,"pendingInCohort":0,"vendor":0,"referral":10,"female":10,"direct":14},{"m":3,"start":"2026-03-01","end":"2026-03-31","joined":34,"offers":41,"declined":0,"pendingInCohort":0,"vendor":4,"referral":5,"female":9,"direct":20},{"m":4,"start":"2026-04-01","end":"2026-04-30","joined":41,"offers":51,"declined":5,"pendingInCohort":0,"vendor":4,"referral":7,"female":10,"direct":19},{"m":5,"start":"2026-05-01","end":"2026-05-31","joined":44,"offers":43,"declined":4,"pendingInCohort":0,"vendor":0,"referral":2,"female":12,"direct":26},{"m":6,"start":"2026-06-01","end":"2026-06-30","joined":41,"offers":83,"declined":4,"pendingInCohort":0,"vendor":1,"referral":6,"female":23,"direct":15},{"m":7,"start":"2026-07-01","end":"2026-07-31","joined":99,"offers":53,"declined":4,"pendingInCohort":2,"vendor":3,"referral":7,"female":32,"direct":17},{"m":8,"start":"2026-08-01","end":"2026-08-31","joined":38,"offers":26,"declined":5,"pendingInCohort":4,"vendor":3,"referral":3,"female":15,"direct":25},{"m":9,"start":"2026-09-01","end":"2026-09-30","joined":37,"offers":44,"declined":3,"pendingInCohort":20,"vendor":3,"referral":6,"female":13,"direct":15},{"m":10,"start":"2026-10-01","end":"2026-10-14","joined":12,"offers":16,"declined":0,"pendingInCohort":15,"vendor":2,"referral":1,"female":4,"direct":8}],"recruiters":{"Shreyashi Saha":{"joined":72,"offers":84,"declined":11,"pending":3,"spellings":["Shreyashi"]},"Adarsh":{"joined":69,"offers":78,"declined":1,"pending":11,"spellings":["ADARSH","Adarsh"]},"Jeyapriya Kumaresan":{"joined":49,"offers":51,"declined":2,"pending":0,"spellings":["Jeyapriya Kumaresan"]},"Kathiresaprabu Sanjeevi":{"joined":33,"offers":33,"declined":0,"pending":5,"spellings":["Kathir"]},"Philomena Lincy":{"joined":27,"offers":29,"declined":3,"pending":7,"spellings":["Philomena Lincy"]},"Jayaram":{"joined":21,"offers":27,"declined":8,"pending":0,"spellings":["Jayaram"]},"Padma":{"joined":8,"offers":10,"declined":0,"pending":2,"spellings":["Padma"]},"Prabu Krishnan":{"joined":2,"offers":0,"declined":0,"pending":0,"spellings":["Prabu","Prabu K"]}},"pendingNames":[{"name":"Eli","offers":68,"joined":58},{"name":"Smruthi MK","offers":48,"joined":46},{"name":"Sunil Bhat M","offers":17,"joined":17},{"name":"Spoorthi","offers":5,"joined":8},{"name":"Fareeda","offers":4,"joined":3}]};

  /* ---------- 1. Answers: calendar numbers and confirmed name matches ---------- */
  const NUMBERS = { 'ExcelHER Hiring': 40, 'PG Intern Hiring': 20, 'Global PGET Program - 2026 Batch': 8, 'Professor of Practice': 10, 'Campus Ambassador program': 8, 'Tech Talk/Guest Lecture': 20, 'NATS': 125 };
  // [record name, aliases, start date (Recruiters sheet), extra fields]
  const PEOPLE = [
    ['Padma', 'Padmavathi Kalidasan, Padmavathy, Padmavathi K, Padmavathi', '2022-03-31', { role: 'TA lead for TTI & Early Careers (per org chart)' }],
    ['Jayaram', 'Kothuru Jayaram', null, { role: 'TA partner for VFS, Penta & Digital Delivery unit in D&IT (per org chart)' }],
    ['Kathiresaprabu Sanjeevi', 'Kathir, Kathiresaprabu', '2025-07-07', {}],
    ['Mickey Singh', 'Mikki, Mickey', '2024-03-20', {}],
    ['Adarsh', 'Adarsh K V, Adarsh KV', '2022-07-06', { role: 'TA partner for VE & CV (per org chart)' }],
    ['Philomena Lincy', 'Lincy, Lincy P, Lincy Philomena', '2023-03-27', {}],
    ['Jeyapriya Kumaresan', 'Jeyapriya', '2024-01-20', {}],
    ['Elizabeth John', null, '2022-03-28', {}],
    ['Shreyashi Saha', 'Shreyashi', '2022-03-07', {}],
    ['Lincy Mathew', null, '2024-06-10', {}],
    ['Spoorthy', 'Spoorthy Das', '2023-07-24', {}]
  ];
  const NEW_PEOPLE = [
    ['Prabu Krishnan', 'Prabu, Prabu K', null, null, 'Not provided'],
    ['Tanushree Mukhopadhyay', 'Tanushree', '2024-06-12', 'SF Functional team – Global: tech lead for recruitment and acting DPO; redesign of recruitment process (per org chart)', 'Active'],
    ['Gokul', 'Gokula', '2023-01-02', 'Developer for the recruitment module in SF; part of the global SF Functional team (per org chart)', 'Active']
  ];

  function applyAnswers() {
    const S = TA.Store;
    const applied = S.state.meta.appliedPacks || [];
    if (applied.indexOf(ANS) >= 0 || applied.indexOf('pc-calendar-2026') < 0) return false;
    S.recoveryPoint('Before applying the TA Head\'s answers on calendar numbers and names');
    const today = TA.todayIso();
    S.list('talentPrograms', { archived: true }).forEach(tp => {
      const key = Object.keys(NUMBERS).find(k => k.toLowerCase() === String(tp.name).toLowerCase());
      if (key && tp.expectedNumber !== NUMBERS[key]) S.update('talentPrograms', tp.id, { expectedNumber: NUMBERS[key], notes: (tp.notes ? tp.notes + ' ' : '') + 'Expected number confirmed as ' + NUMBERS[key] + ' (' + WHO + ').' });
    });
    PEOPLE.forEach(([name, aliases, start, extra]) => {
      const t = S.list('team', { archived: true }).find(x => x.name === name); if (!t) return;
      const patch = Object.assign({}, extra);
      if (aliases) patch.aliases = aliases;
      if (start && !t.startDate) patch.startDate = start;
      if (patch.role && t.role) delete patch.role;
      S.update('team', t.id, patch);
    });
    NEW_PEOPLE.forEach(([name, aliases, start, role, status]) => {
      if (TA.findMember(name) || TA.findDuplicates('team', { name }).length) return;
      S.add('team', { name, aliases, startDate: start, role, employmentStatus: status, successionReadiness: 'Not assessed', source: 'Hiring2026 tracker – Recruiters sheet; P&C calendar org chart' }, 'Import: Hiring2026 tracker');
    });
    const resolve = (title, text) => { const q = S.list('questions', { archived: true }).find(x => x.title === title); if (q && q.status !== 'Resolved') S.update('questions', q.id, { status: 'Resolved', resolution: text, resolvedDate: today }); };
    resolve('Which tracker calendar is current for 2026?', 'Expected numbers confirmed (' + WHO + '): ExcelHER 40, PG interns 20, Global PGET 8, Professor of Practice 10, Campus Ambassadors 8, Tech Talks 20, NATS 125. Schedules from the "Talent Pipeline & University Relations Calendar" sheet are kept.');
    resolve('Tracker plan numbers vs scorecard targets', 'Confirmed numbers now match the scorecard for NATS (125) and ExcelHER (40) (' + WHO + ').');
    resolve('Confirm name matches before records are merged', 'Confirmed (' + WHO + '): Jayaram = Kothuru Jayaram; Kathir = Kathiresaprabu Sanjeevi; Mikki = Mickey Singh; Adarsh = Adarsh K V; Prabu = Prabu Krishnan (a different person from Kathir); Lincy = Lincy Philomena = Lincy P; Jeyapriya = Jeyapriya Kumaresan. Padma = Padmavathi Kalidasan was listed with a question mark and has been treated as confirmed – change the aliases on Padma\'s record if not.');
    S.setMeta({ appliedPacks: (S.state.meta.appliedPacks || []).concat([ANS]) });
    return true;
  }

  /* ---------- 2. Hiring tracker aggregates ---------- */
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  const ALL_M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const ym = (k) => /^\d{4}-\d{2}$/.test(k) ? ALL_M[+k.slice(5) - 1] + ' ' + k.slice(0, 4) : k;
  function applyHiring() {
    const S = TA.Store;
    const applied = S.state.meta.appliedPacks || [];
    if (applied.indexOf(PACK) >= 0 || applied.indexOf(ANS) < 0) return false;
    S.recoveryPoint('Before loading aggregates from the Hiring2026 tracker');
    const origin = 'Import: ' + SRC;
    const y = AGG.ytd;
    const per = (id, label, type, start, end, notes) => S.get('periods', id) || S.add('periods', { id, label, type, scope: 'Hiring tracker', start, end, cutoff: '2026-10-14', source: SRC, notes }, origin);
    const ytd = per('per_ht_2026ytd', '2026 YTD – Hiring tracker', 'YTD', '2026-01-01', '2026-10-14',
      'External hires (lateral + fresher) from the Hiring2026 tracker, aligned to the business scorecard cut-off. The tracker holds ' + y.rowsTotal + ' offer records; ' + y.excludedAfterCut + ' offers dated after 14 Oct and ' + y.offersBefore2026 + ' offers released in 2025 are outside this period\'s offer counts.');
    const mper = AGG.months.map(m => per('per_ht_2026_' + String(m.m).padStart(2, '0'), MONTHS[m.m - 1] + ' 2026' + (m.m === 10 ? ' (1–14 Oct, partial)' : '') + ' – Hiring tracker', 'Month', m.start, m.end,
      m.m === 10 ? 'Partial month to the 14 Oct cut-off; not compared with full months.' : null));
    const metric = (name, def) => {
      let m = S.list('metrics', { archived: true }).find(x => x.name === name);
      if (!m && def) m = S.add('metrics', Object.assign({ name, definitionStatus: 'Proposed – to confirm', owner: null, source: SRC }, def), origin);
      else if (m && def && !m.definition && m.definitionStatus === 'Not provided') S.update('metrics', m.id, { definition: def.definition, definitionStatus: 'Proposed – to confirm', calculation: def.calculation });
      return m;
    };
    const mJoin = metric('External joiners (lateral + fresher)', { category: 'Hiring volume', unit: 'count', direction: 'Higher is better', definition: 'Candidates with status "Joined" whose actual date of joining falls in the period (lateral and fresher hires in the hiring tracker).', calculation: 'Count of tracker records.' });
    const mOff = metric('Offers made', { definition: 'Offers released in the period (offer date in the period), whatever their later outcome.', calculation: 'Count of tracker records by offer date.' });
    const mDec = metric('Offer decline rate', { definition: 'Offers released in the period that were declined, as a share of all offers released in the period (same cohort).', calculation: 'declined ÷ offers released × 100. Offers still pending can still be declined, so recent months may rise.' });
    const mAcc = metric('Offer acceptance rate', { definition: 'Of offers released in the period with a known outcome, the share that joined.', calculation: 'joined ÷ (joined + declined) × 100; pending offers excluded.' });
    const mDir = metric('Direct sourcing contribution', { definition: 'Share of joiners sourced directly (SuccessFactors, social media, job portals).', calculation: 'direct joiners ÷ all joiners × 100.' });
    const mPend = metric('Offers pending joining', { category: 'Offers', unit: 'count', direction: 'Context-dependent', definition: 'Offers with status "Offered" (released, not yet joined or declined) at the tracker date.', calculation: 'Count of tracker records with status Offered.' });
    const mR2O = metric('Requisition-to-offer time'), mR2J = metric('Requisition-to-join time'), mVen = metric('Vendor usage'), mRef = metric('Employee referrals'), mGen = metric('Gender diversity');
    const obs = (m, p, num, den, population, note, incomplete) => { if (!m) return; if (S.list('observations').some(o => o.metricId === m.id && o.periodId === p.id && (o.population || null) === population)) return;
      S.add('observations', { metricId: m.id, periodId: p.id, population, target: null, actualReported: null, numerator: num, denominator: den, calcNote: note, incomplete: !!incomplete, attribution: 'Shared business outcome', source: SRC, owner: null, dataDate: '2026-10-14', notes: 'Recalculated from the hiring tracker (aggregates only).' }, origin); };
    const J = 'External joiners in period (Hiring tracker)', OF = 'Offers released in period (Hiring tracker)';
    const src = (k) => y.sources[k] || 0;
    obs(mJoin, ytd, y.joiners, 1, J, 'Count: lateral ' + y.byType.Lateral + ' + fresher ' + y.byType.Fresher + '. Reconciles with the scorecard (Lateral 351, Freshers 62).');
    obs(mOff, ytd, y.offers, 1, OF, 'Outcomes: joined ' + y.offerOutcomes.Joined + ', declined ' + y.offerOutcomes.Declined + ', pending ' + y.offerOutcomes.Offered + '.');
    obs(mDec, ytd, y.offerOutcomes.Declined, y.offers, OF, y.offerOutcomes.Offered + ' offers in this cohort are still pending.');
    obs(mAcc, ytd, y.offerOutcomes.Joined, y.offerOutcomes.Joined + y.offerOutcomes.Declined, 'Offers released in period with known outcome (Hiring tracker)', 'Pending offers excluded.');
    obs(mR2O, ytd, y.r2o.sum, y.r2o.n, 'Joiners in period with requisition approval and offer dates (Hiring tracker)', 'Mean of ' + y.r2o.n + ' joiners (median ' + y.r2o.median + ' days); ' + y.r2o.missing + ' joiners without a requisition approval date and ' + y.r2o.excludedNegative + ' with an offer date before approval are excluded.');
    obs(mR2J, ytd, y.r2j.sum, y.r2j.n, 'Joiners in period with requisition approval and joining dates (Hiring tracker)', 'Mean of ' + y.r2j.n + ' joiners (median ' + y.r2j.median + ' days); ' + y.r2j.missing + ' joiners without a requisition approval date are excluded.');
    obs(mVen, ytd, src('Vendor'), y.joiners, J, 'Vendor-sourced joiners ÷ all external joiners.');
    obs(mRef, ytd, src('Employee Referral'), y.joiners, J, 'Referral joiners ÷ all external joiners. As a share of lateral joiners only: ' + TA.fmtPct(TA.pct(src('Employee Referral'), y.byType.Lateral)) + '.');
    obs(mGen, ytd, y.gender.Female || 0, y.joiners, J, 'Female joiners ÷ all external joiners.');
    obs(mDir, ytd, src('Direct/SF/Social Media/Job Portal'), y.joiners, J, 'Direct joiners ÷ all external joiners.');
    obs(mPend, ytd, y.pendingCount, 1, 'Offers with status Offered at the tracker date', 'Expected joining: ' + Object.keys(y.pending).sort().map(k => ym(k) + ': ' + y.pending[k]).join(', ') + '.');
    AGG.months.forEach((m, i) => {
      const p = mper[i];
      obs(mJoin, p, m.joined, 1, J, 'Count of joiners by actual date of joining.');
      obs(mOff, p, m.offers, 1, OF, 'Count of offers by offer date.');
      obs(mDec, p, m.declined, m.offers, OF, m.pendingInCohort ? m.pendingInCohort + ' offers in this cohort are still pending; the rate may rise' : 'All offers in this cohort have an outcome.', m.pendingInCohort > 0);
      obs(mVen, p, m.vendor, m.joined, J, 'Vendor-sourced joiners ÷ joiners in month.');
      obs(mRef, p, m.referral, m.joined, J, 'Referral joiners ÷ joiners in month.');
      obs(mGen, p, m.female, m.joined, J, 'Female joiners ÷ joiners in month.');
    });
    const bd = (title, dimension, rows, notes) => { if (!S.list('breakdowns').some(b => b.title === title && b.periodId === ytd.id)) { const r = S.add('breakdowns', { title, periodId: ytd.id, dimension, source: SRC, notes }, origin); S.update('breakdowns', r.id, { rows }, { silent: true }); } };
    bd('Hiring by business area', 'Business area', y.businessArea, 'Business area as recorded in the tracker (DV/BA/Function).');
    bd('Hiring by source', 'Source', y.sourceRows, 'Conversions include consultant, FTC, NATS, intern and ExcelHER conversions.');
    bd('Hiring by type', 'Hiring type', y.hiringType, 'Lateral 351 and fresher 62 joiners reconcile with the scorecard programmes Lateral and Freshers.');
    bd('Joiners by employment type', 'Employment type', Object.keys(y.employment).map(k => ({ label: k, count: y.employment[k] })), null);
    bd('Offer decline reasons', 'Reason', Object.keys(y.declineReasons).map(k => ({ label: k, count: y.declineReasons[k] })), 'Declines among offers released 1 Jan–14 Oct 2026.');
    bd('Offers pending joining by expected month', 'Expected joining month', Object.keys(y.pending).sort().map(k => ({ label: ym(k), count: y.pending[k] })), 'Status "Offered" at the tracker date.');
    Object.keys(AGG.recruiters).forEach(name => {
      const t = TA.findMember(name); if (!t) return;
      if (S.list('recruiterResults').some(r => r.memberId === t.id && r.periodId === ytd.id)) return;
      const r = AGG.recruiters[name];
      S.add('recruiterResults', { memberId: t.id, periodId: ytd.id, offerTarget: null, offers: r.offers, offerAttainmentReported: null, joinTarget: null, joins: r.joined, joinAttainmentReported: null,
        declined: r.declined, pendingJoin: r.pending, source: SRC, dataDate: '2026-10-14',
        notes: 'Counted from the tracker\'s Recruiter field (spellings: ' + r.spellings.join(', ') + '). Offers by offer date and joins by joining date, 1 Jan–14 Oct 2026; no targets in the tracker. Not a ranking.' }, origin);
    });
    ['Lateral', 'Freshers'].forEach(n => {
      const p = S.list('programmes').find(x => x.periodId === 'per_biz_2026ytd' && x.name === n);
      if (p && !(p.evidence || []).some(e => /Hiring2026/.test(e.label))) S.addEvidence('programmes', p.id, { label: 'Hiring2026 tracker: ' + (n === 'Lateral' ? y.byType.Lateral + ' lateral' : y.byType.Fresher + ' fresher') + ' joiners 1 Jan–14 Oct 2026 – reconciles', kind: 'Document reference', url: null, note: 'Aggregate check against the candidate-level tracker (supplied 19 Oct 2026).' });
    });
    const Q = (title, type, priority, relatedTo, detail, a, b) => { if (!S.list('questions').some(x => x.title === title)) S.add('questions', { title, type, priority, relatedTo, detail, valueA: a || null, valueB: b || null, owner: 'TA Head / data owner', raisedDate: TA.todayIso(), status: 'Open', resolution: null, resolvedDate: null }, origin); };
    Q('Tracker names not yet matched to team members', 'Duplicate / identity', 'Essential', 'Team & Development – recruiter results',
      'Recruiter names in the hiring tracker that are not matched (offers / joins, 1 Jan–14 Oct): ' + AGG.pendingNames.map(p => p.name + ' (' + p.offers + ' / ' + p.joined + ')').join('; ') + '. Possible matches: Eli = Elizabeth John? Smruthi MK = Smruthi Prabhakaran? Sunil Bhat M = Sunil Bhat? Spoorthi = Spoorthy (Spoorthy Das)? Fareeda – not in the team list. Their results are not loaded until confirmed.');
    Q('Adarsh offers: recruiter reference 117 vs hiring tracker 78', 'Data conflict', 'Essential', 'Recruiter results – Adarsh',
      'The recruiter reference (1 Jan–12 Oct) shows 117 offers against a target of 85. The hiring tracker shows 78 lateral/fresher offers released by Adarsh 1 Jan–14 Oct (82 including offers released in 2025). Does the reference include other hiring (e.g. NATS, internal, interns) or a different date basis?', 'Recruiter reference: 117', 'Hiring tracker: 78');
    Q('Employee referral share: 15% (scorecard) vs 12.8% (tracker)', 'Population / compatibility', 'Important', 'Employee referrals',
      'The tracker gives ' + src('Employee Referral') + ' referral joiners: ' + TA.fmtPct(TA.pct(src('Employee Referral'), y.joiners)) + ' of all ' + y.joiners + ' external joiners, or ' + TA.fmtPct(TA.pct(src('Employee Referral'), y.byType.Lateral)) + ' of ' + y.byType.Lateral + ' lateral joiners. Is the scorecard 15% a share of lateral hires?', 'Scorecard: 15%', 'Tracker: 12.8% of all / 15.1% of lateral');
    Q('Cycle times: scorecard 53 / 89 days vs tracker 51.7 / 90.0 days', 'Definition to confirm', 'Important', 'Requisition-to-offer / requisition-to-join',
      'From the tracker (joiners 1 Jan–14 Oct, requisition approval date to offer / joining date): mean ' + y.r2o.mean + ' / ' + y.r2j.mean + ' days, median ' + y.r2o.median + ' / ' + y.r2j.median + ' days; ' + y.r2o.missing + ' joiners lack an approval date. Which population and start date does the scorecard use?', 'Scorecard: 53 / 89', 'Tracker mean: ' + y.r2o.mean + ' / ' + y.r2j.mean);
    Q('Hiring tracker data gaps', 'Missing data', 'Nice to have', 'Hiring tracker',
      y.r2o.missing + ' joiners have no requisition approval date ("NA"); 2 offers are dated before requisition approval; ' + (y.employment['Not provided'] || 0) + ' joiners have no employment type and 1 shows "SG5" as employment type. The Offer Stack sheet was not used; the Master Tracker is treated as the source.');
    const upd = (title, patch) => { const q = S.list('questions').find(x => x.title === title); if (q && q.status !== 'Resolved') S.update('questions', q.id, patch); };
    upd('No prior-period or monthly data supplied', { status: 'Awaiting data owner', detail: 'Partly answered by the Hiring2026 tracker: monthly joiners, offers, decline rate and vendor/referral/gender shares for external (lateral + fresher) hires, Jan–Oct 2026. Still no prior-period data for scorecard programmes such as NATS, Internal, Interns, ExcelHER and PhD/AICTE.' });
    upd('Recruiter reference data beyond Adarsh\'s offer figures was not included', { status: 'Awaiting data owner', detail: 'Partly answered: the Hiring2026 tracker gives offers, joins and declines per recruiter (1 Jan–14 Oct 2026) for confirmed names. Recruiter targets, roles and business coverage are still not provided.' });
    S.setMeta({ appliedPacks: (S.state.meta.appliedPacks || []).concat([PACK]) });
    TA.toast('Loaded 2026 hiring aggregates: ' + y.joiners + ' joiners, ' + y.offers + ' offers, 10 monthly periods');
    return true;
  }

  const prev = TA.applyDataPacks;
  TA.applyDataPacks = function () { const a = prev ? prev() : false; const b = applyAnswers(); const c = applyHiring(); return a || b || c; };
})();
