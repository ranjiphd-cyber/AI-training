/* Data pack: information recorded by the TA Head in the "TA Performance Management System" session and its
   India TA Talent Review database (read 20 Oct 2026). Brings in names, team assignments, leavers, the recruiter
   scorecard (2026 Annual Performance Review deck, 1 Jan–12 Oct 2026) and programme status updates.
   Performance ratings and appraisal scores from that system are deliberately NOT imported.
   Where that system disagrees with what is already recorded here, both are kept and a question is raised. */
(function () {
  'use strict';
  const TA = window.TA;
  const PACK = 'talent-review-sync-2026-10-20';
  const SRC = 'India TA Talent Review (TA Performance Management System session), read 20 Oct 2026';
  const DECK = 'Recruiter scorecard 1 Jan–12 Oct 2026 – 2026 Annual Performance Review deck (slides 10–11, 16–17), via the India TA Talent Review';

  // [name in this dashboard, patch]
  const PEOPLE = [
    ['Elizabeth John', { aliases: 'Eli', role: 'Recruiter', taTeam: 'DTO+ (business area DTO)' }],
    ['Shreyashi Saha', { role: 'Recruiter', taTeam: 'DTO+ (business area FCA)' }],
    ['Smruthi Prabhakaran', { aliases: 'Smruthi MK, Smruthi', role: 'Recruiter', taTeam: 'TTI (business area GTO)', startDate: '2022-07-27' }],
    ['Spoorthy', { aliases: 'Spoorthy Das, Spoorthi', role: 'Recruiter (recorded as Recruiter by the TA Head, 19 Oct 2026; earlier consultant – sourcer)', taTeam: 'VCE + Leadership Hiring' }],
    ['Adarsh', { taTeam: 'TTI (business area VE & CV)' }],
    ['Padma', { taTeam: 'TTI', role: 'Team Lead – TA lead for TTI & Early Careers (per org chart)' }],
    ['Philomena Lincy', { role: 'Team Lead – DTO+', taTeam: 'DTO+' }],
    ['Kathiresaprabu Sanjeevi', { role: 'Team Lead – VCE + Leadership Hiring', taTeam: 'VCE + Leadership Hiring' }],
    ['Mickey Singh', { role: 'Support / Operations', taTeam: 'Operations & Onboarding' }],
    ['Lincy Mathew', { role: 'Support / Operations', taTeam: 'Operations & Onboarding' }],
    ['Gokul', { role: 'Support / Operations – HR Systems', taTeam: 'Global SF Support' }],
    ['Tanushree Mukhopadhyay', { role: 'Support / Operations – HR Systems', taTeam: 'Global SF Support' }],
    ['Sunil Bhat', { aliases: 'Sunil Bhat M', taTeam: 'TTI (business area GTP)', notes: 'Left in May 2026 (day not given), per the TA Head in the talent review.' }],
    ['Jeyapriya Kumaresan', { employmentStatus: 'Left', taTeam: 'University Relations & Early Careers', notes: 'Left the team; not in the 2026 evaluation (TA Head, 19 Oct 2026). Leaving date not supplied. Historical records preserved.' }],
    ['Prabu Krishnan', { employmentStatus: 'Left', taTeam: 'University Relations & Early Careers', notes: 'Left the organisation (TA Head, 19 Oct 2026). Leaving date not supplied. Historical records preserved.' }]
  ];
  // Recruiter scorecard (deck). [name, offers, full-year offer target, joiners, offer days, join days, vendor %, diversity %, referral %, declined %, note]
  const SCORE = [
    ['Elizabeth John', 88, 114, 77, 36, 68, 0, 40, 16, 12],
    ['Shreyashi Saha', 101, 114, 84, 47, 77, 7, 40, 29, 14],
    ['Padma', 56, 57, 49, 30, 90, 0, 25, 0, 0],
    ['Adarsh', 117, 85, 105, 31, 65, 3, 42, 7, 1],
    ['Smruthi Prabhakaran', 77, 85, 75, 53, 86, 4, 26, 9, 9],
    ['Philomena Lincy', 37, 57, 35, 72, 136, 19, 41, 7, 14, 'Also 28 internal-hiring (IJP) offers (TA Head, 20 Oct 2026).'],
    ['Spoorthy', 72, 85, 75, 76, 138, 0, 38, 0, 0],
    ['Kathiresaprabu Sanjeevi', 60, 51, 56, 86, 129, 6, 30, 15, 0, 'Lead target revised to 51 a year (2 offers per 10 working days) by the TA Head, 20 Oct 2026; the deck showed 85.']
  ];
  // Hiring tracker (lateral + fresher, 1 Jan–14 Oct 2026) for names now matched. [name, offers, joins, declined, pending]
  const TRACKER = [['Elizabeth John', 68, 58, 7, 9], ['Smruthi Prabhakaran', 48, 46, 4, 4], ['Sunil Bhat', 17, 17, 1, 0], ['Spoorthy', 5, 8, 0, 0], ['Fareeda', 4, 3, 1, 0]];
  // Programme calendar updates (TA Head, 19 Oct 2026). [name prefix, status, owner, responsible, note]
  const PROG = [
    ['NATS', 'Completed', 'Adarsh', 'Padma', 'Adarsh has met his target. Previously responsible: Sunil Bhat (left); covered by Padma.'],
    ['PG Intern Conversion', 'Completed', null, 'Padma', 'Previously responsible: Jeyapriya Kumaresan; covered by Padma.'],
    ['PhD/Post Doc/AICTE', 'In progress', 'Elizabeth John', 'Elizabeth John', null],
    ['PG Intern Hiring', 'In progress', 'Padma', 'Padma', 'Previously responsible: Jeyapriya Kumaresan; covered by Padma.'],
    ['UG Intern Conversion', 'Completed', 'Padma', 'Padma', 'Previously responsible: Jeyapriya Kumaresan; covered by Padma.'],
    ['GET/PGET & Global PGET', 'In progress', 'Padma', 'Padma', null],
    ['ExcelHER Hiring', 'Completed', 'Padma', 'Padma', null],
    ['GET/PGET hiring - 2027', 'In progress', 'Padma', 'Padma', 'Previously responsible: Prabu Krishnan, Jeyapriya Kumaresan; covered by Padma.'],
    ['UG/MBA internship', 'In progress', 'Padma', 'Padma', 'Previously responsible: Jeyapriya Kumaresan; covered by Padma.'],
    ['Global PGET Program', 'In plan', 'Padma', 'Padma', 'Previously responsible: Jeyapriya Kumaresan; covered by Padma.'],
    ['Veteran Hiring', 'On hold', null, 'Philomena Lincy', null],
    ['Spark Internship', 'On hold', 'Adarsh', 'Adarsh', null],
    ['Campus Ambassador', 'Completed', 'Padma', 'Padma', 'Previously responsible: Jeyapriya Kumaresan; covered by Padma.'],
    ['MoU with National/State', 'On hold', null, 'Padma', 'Previously responsible: Sunil Bhat (left); covered by Padma.'],
    ['Professor of Practice', 'In progress', 'Elizabeth John', 'Padma', 'Previously responsible: Jeyapriya Kumaresan; covered by Padma.'],
    ['Tech Talk/Guest Lecture', 'In plan', 'Padma', 'Padma', 'Previously responsible: Jeyapriya Kumaresan; covered by Padma.'],
    ['Research Collaboration', 'In plan', 'Padma', 'Padma', 'Previously responsible: Prabu Krishnan; covered by Padma.'],
    ['CoTeaching facilitation', 'In progress', 'Padma', 'Padma', 'Previously responsible: Jeyapriya Kumaresan; covered by Padma.'],
    ['Faculty member- capability', 'In plan', 'Elizabeth John', 'Padma', 'Previously responsible: Prabu Krishnan, Jeyapriya Kumaresan; covered by Padma.'],
    ['Volvo Knowledge Centre', 'Completed', 'TA Head', 'Ranjith', 'SRM Vehicle Technology Centre (industry–academia pipeline) inaugurated on 16 Oct 2026. Previously responsible: Prabu Krishnan.'],
    ['Recruitment MIS', 'Completed', 'Mickey', 'Ranjith', 'Previously responsible: Prabu Krishnan.']
  ];

  function apply() {
    const S = TA.Store;
    const applied = S.state.meta.appliedPacks || [];
    if (applied.indexOf(PACK) >= 0 || applied.indexOf('lateral-trends-2026-upd2') < 0) return false;
    S.recoveryPoint('Before importing updates from the India TA Talent Review');
    const origin = 'Import: ' + SRC;
    const today = TA.todayIso();
    const member = (n) => TA.findMember(n) || S.list('team', { archived: true }).find(t => t.name === n);
    PEOPLE.forEach(([name, patch]) => {
      const t = member(name); if (!t) return;
      const p = Object.assign({}, patch);
      if (p.aliases) p.aliases = Array.from(new Set(String(t.aliases || '').split(',').concat(p.aliases.split(',')).map(x => x.trim()).filter(Boolean))).join(', ');
      if (p.notes) p.notes = (t.notes ? t.notes + ' ' : '') + p.notes;
      if (p.startDate && t.startDate) delete p.startDate;
      S.update('team', t.id, p);
    });
    if (!member('Fareeda')) S.add('team', { name: 'Fareeda', role: 'Recruiter', taTeam: 'VCE + Leadership Hiring', employmentStatus: 'Left', successionReadiness: 'Not applicable', source: SRC,
      notes: 'Left the team; not in the 2026 evaluation (TA Head, 19 Oct 2026). Full name and leaving date not supplied. Historical records preserved.' }, origin);
    SCORE.forEach(([name, offers, target, joins, od, jd, ven, div, ref, dec, note]) => {
      const t = member(name); if (!t) return;
      const notes = 'Full-year offer target; attainment to date is not pro-rated. Offer days ' + od + ', join days ' + jd + ', vendor ' + ven + '%, diversity ' + div + '%, referrals ' + ref + '%, declined ' + dec + '%. Counts all hiring streams (lateral, FTC, conversions, NATS, ExcelHER, other programmes).' + (note ? ' ' + note : '');
      const ex = S.list('recruiterResults').find(r => r.memberId === t.id && r.periodId === 'per_rec_2026ytd');
      if (ex) S.update('recruiterResults', ex.id, { joins: ex.joins === null || ex.joins === undefined ? joins : ex.joins, notes: (ex.notes ? ex.notes + ' ' : '') + notes, source: ex.source || DECK });
      else S.add('recruiterResults', { memberId: t.id, periodId: 'per_rec_2026ytd', offerTarget: target, offers, offerAttainmentReported: null, joinTarget: null, joins, joinAttainmentReported: null, declined: null, pendingJoin: null, source: DECK, dataDate: '2026-10-12', notes }, origin);
    });
    TRACKER.forEach(([name, offers, joins, declined, pending]) => {
      const t = member(name); if (!t || S.list('recruiterResults').some(r => r.memberId === t.id && r.periodId === 'per_ht_2026ytd')) return;
      S.add('recruiterResults', { memberId: t.id, periodId: 'per_ht_2026ytd', offerTarget: null, offers, offerAttainmentReported: null, joinTarget: null, joins, joinAttainmentReported: null, declined, pendingJoin: pending,
        source: 'Hiring2026 tracker – Master Tracker sheet (supplied 19 Oct 2026); aggregates only', dataDate: '2026-10-14', notes: 'Lateral and fresher hiring only, 1 Jan–14 Oct 2026; name matched using the TA Head\'s talent review records. Not a ranking.' }, 'Import: Hiring2026 tracker');
    });
    const norm = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
    PROG.forEach(([prefix, status, owner, responsible, note]) => {
      const tp = S.list('talentPrograms', { archived: true }).find(x => norm(x.name).startsWith(norm(prefix))); if (!tp) return;
      const patch = { status, responsible };
      if (owner) patch.programOwner = owner;
      if (note) patch.notes = (tp.notes ? tp.notes + ' ' : '') + note + ' (TA Head, 19 Oct 2026, via the talent review)';
      S.update('talentPrograms', tp.id, patch);
    });
    const close = (title, resolution) => { const q = S.list('questions').find(x => x.title === title); if (q && q.status !== 'Resolved') S.update('questions', q.id, { status: 'Resolved', resolution, resolvedDate: today }); };
    close('Tracker names not yet matched to team members', 'Matched from the TA Head\'s talent review records: Eli = Elizabeth John; Smruthi MK = Smruthi Prabhakaran; Spoorthi = Spoorthy Das; Sunil Bhat M = Sunil Bhat (left May 2026); Fareeda = former team member (VCE + Leadership Hiring), full name not supplied. Their tracker counts are now loaded.');
    close('Recruiter reference data beyond Adarsh\'s offer figures was not included', 'Recruiter scorecard (1 Jan–12 Oct 2026, 2026 Annual Performance Review deck) loaded for eight team members via the talent review: offers, full-year offer targets, joiners and indicators.');
    close('Adarsh offers: recruiter reference 117 vs hiring tracker 78', 'Different scope: the scorecard counts all hiring streams (core 76, NATS 31, ExcelHER 10 and conversions); the hiring tracker covers lateral and fresher hires only.');
    close('Who is responsible for NATS and the SDC MoU now?', 'Padma covers both (TA Head, 19 Oct 2026). NATS programme owner: Adarsh, who has met his target.');
    close('Lateral hires 2026: 353 (trend table) vs 351 (scorecard and tracker)', 'Different cut-offs: 353 is to 19 Oct; 351 is to 14 Oct (talent review note).');
    const Q = (title, type, priority, relatedTo, detail, a, b) => { if (!S.list('questions').some(x => x.title === title)) S.add('questions', { title, type, priority, relatedTo, detail, valueA: a || null, valueB: b || null, owner: 'Dr. Ranjith TP', raisedDate: today, status: 'Open', resolution: null, resolvedDate: null }, origin); };
    Q('Padma: left (brief) or active until 25 Dec 2026 (talent review)?', 'Data conflict', 'Essential', 'Team & Development – Padma',
      'The original brief says Padma has left. The talent review records Padma as Active, Team Lead for TTI, with an end date of 25 Dec 2026, and on 19 Oct assigned her to cover most university-relations and early-careers programmes. Status here is unchanged until you confirm.', 'This dashboard: Left', 'Talent review: Active, end date 25 Dec 2026');
    Q('NATS target: 125 or 100? (and other programme numbers)', 'Data conflict', 'Essential', 'Programme results / calendar',
      'On 19 Oct you confirmed NATS 125 here. The talent review uses NATS 100 ("from the P&C calendar", 19–20 Oct), giving 890 planned joiners instead of 915. Its programme numbers also differ for PG intern hiring (25 vs 20), Global PGET (9 vs 8), Campus Ambassadors (10 vs 8), Tech Talks (15 vs 20), GET/PGET 2027 (15 vs 50), Research Collaboration (5 vs 10) and CoTeaching (10 vs 20). Nothing is changed until you confirm.', 'This dashboard: NATS 125, total 915', 'Talent review: NATS 100, total 890');
    S.setMeta({ appliedPacks: (S.state.meta.appliedPacks || []).concat([PACK]) });
    TA.toast('Imported updates from the India TA Talent Review');
    return true;
  }

  const prev = TA.applyDataPacks;
  TA.applyDataPacks = function () { const a = prev ? prev() : false; const b = apply(); return a || b; };
})();

/* Update (TA Head, 20 Oct 2026: "use the data in the TA Performance Management System chat"): hiring mix and role context per person
   from the India TA Talent Review. Offer counts by hiring category only – the review's points, ratings and appraisal scores are not imported
   (no automatic rating of people). Hire dates that differ from the start dates held here are raised as a question, not changed. */
(function () {
  'use strict';
  const TA = window.TA;
  const PACK = 'talent-review-sync-2026-10-20-upd1';
  const SRC = 'India TA Talent Review (TA Performance Management System chat), 20 Oct 2026';
  const P = [{"names":["Adarsh","Adarsh K V","Adarsh KV"],"jobTitle":"Talent Acquisition Professional","level":"SG6","joined":"2022-07-06","since":"2022-07-06","mix":[["Lateral SG5-SG8",24],["Lateral SG1-SG4",1],["FTC",21],["FTC Conversion",7],["ExcelHER",10],["NATS Hiring",31],["Contract Conversion",23],["ExcelHER Conversion",1],["NATS Conversion",1]],"streams":{"core":76,"excelher":10,"nats":31},"mixPeriod":"1 Jan–16 Oct 2026"},{"names":["Elizabeth John","Eli"],"jobTitle":"Talent Acquisition Professional","level":"SG6","joined":"2022-03-28","since":"2022-03-28","mix":[["Lateral SG5-SG8",14],["Lateral SG1-SG4",1],["FTC",27],["FTC Conversion",7],["ExcelHER",1],["NATS Hiring",18],["AICTE Professor",2],["PhD Internship",1],["Contract Conversion",20],["NATS Conversion",2]],"streams":{"core":66,"excelher":1,"nats":18,"other":3},"mixPeriod":"1 Jan–16 Oct 2026"},{"names":["Fareeda"],"jobTitle":null,"level":null,"joined":null,"since":null,"mix":[["Lateral SG5-SG8",4]],"streams":{},"mixPeriod":"1 Jan–16 Oct 2026"},{"names":["Gokul","Gokula"],"jobTitle":"HR Systems Analyst Professional","level":"SG5","joined":"2023-01-02","since":"2023-01-02","mix":[],"streams":{},"mixPeriod":null},{"names":["Jayaram","Kothuru Jayaram"],"jobTitle":null,"level":null,"joined":null,"since":null,"mix":[["Lateral SG5-SG8",23],["Lateral SG1-SG4",1],["FTC Conversion",1],["NATS Hiring",25],["NATS Conversion",2]],"streams":{},"mixPeriod":"1 Jan–16 Oct 2026"},{"names":["Jeyapriya Kumaresan","Jeyapriya"],"jobTitle":null,"level":null,"joined":"2024-01-20","since":null,"mix":[["NATS Hiring",8],["GET / PGET",51],["Internship",33]],"streams":{},"mixPeriod":"1 Jan–16 Oct 2026"},{"names":["Kathir","Kathiresaprabu Sanjeevi","Kathiresaprabu"],"jobTitle":"Talent Acquisition Professional","level":"SG6","joined":"2025-07-07","since":"2025-07-07","mix":[["SG9 and above",2],["Lateral SG5-SG8",22],["FTC Conversion",1],["ExcelHER",6],["NATS Hiring",21],["Contract Conversion",9]],"streams":{"core":33,"excelher":6,"nats":21},"mixPeriod":"1 Jan–16 Oct 2026"},{"names":["Lincy Mathew"],"jobTitle":"HR Operations Analyst Professional","level":"SG6","joined":"2026-05-20","since":"2024-06-10","mix":[],"streams":{},"mixPeriod":null},{"names":["Mickey","Mickey Singh","Mikki"],"jobTitle":"HR Operations Analyst Entry","level":"SG5","joined":"2024-03-20","since":"2024-03-20","mix":[],"streams":{},"mixPeriod":null},{"names":["Padma","Padmavathi Kalidasan","Padmavathy","Padmavathi K","Padmavathi"],"jobTitle":"Talent Acquisition Professional","level":"SG6","joined":"2022-03-31","since":"2022-03-31","mix":[["Lateral SG5-SG8",3],["ExcelHER",7],["NATS Hiring",29],["GET / PGET",5],["Contract Conversion",2],["Internship",13]],"streams":{"core":9,"excelher":7,"nats":29,"other":11},"mixPeriod":"1 Jan–16 Oct 2026"},{"names":["Philomena Lincy","Lincy","Lincy P","Lincy Philomena"],"jobTitle":"Talent Acquisition Senior","level":"SG8","joined":"2023-03-27","since":"2023-03-27","mix":[["SG9 and above",1],["Lateral SG5-SG8",25],["FTC",1],["ExcelHER",2],["NATS Hiring",6],["Contract Conversion",1],["ExcelHER Conversion",1]],"streams":{"core":29,"excelher":2,"nats":6},"mixPeriod":"1 Jan–16 Oct 2026"},{"names":["Prabu Krishnan","Prabu","Prabu K"],"jobTitle":null,"level":null,"joined":null,"since":null,"mix":[],"streams":{},"mixPeriod":"1 Jan–14 Oct 2026"},{"names":["Shreyashi","Shreyashi Saha"],"jobTitle":"Recruiter Professional","level":"SG5","joined":"2022-03-07","since":"2022-03-07","mix":[["Lateral SG5-SG8",29],["Lateral SG1-SG4",33],["FTC",14],["FTC Conversion",1],["ExcelHER",1],["NATS Hiring",16],["GET / PGET",4],["Contract Conversion",4]],"streams":{"core":84,"excelher":1,"nats":16},"mixPeriod":"1 Jan–16 Oct 2026"},{"names":["Smruthi MK","Smruthi Prabhakaran","Smruthi"],"jobTitle":"Talent Acquisition Professional","level":"SG6","joined":"2022-07-27","since":"2022-07-27","mix":[["SG9 and above",1],["Lateral SG5-SG8",23],["Lateral SG1-SG4",2],["FTC",6],["FTC Conversion",4],["ExcelHER",7],["NATS Hiring",22],["Contract Conversion",11],["ExcelHER Conversion",1]],"streams":{"core":48,"excelher":7,"nats":22},"mixPeriod":"1 Jan–16 Oct 2026"},{"names":["Spoorthy Das","Spoorthy","Spoorthi"],"jobTitle":"Recruiter Professional","level":"SG5","joined":"2025-07-24","since":"2023-07-24","mix":[["Lateral SG5-SG8",2],["ExcelHER",7],["NATS Hiring",60],["ExcelHER Conversion",1],["NATS Conversion",2]],"streams":{"core":5,"excelher":7,"nats":60},"mixPeriod":"1 Jan–16 Oct 2026"},{"names":["Sunil Bhat","Sunil Bhat M"],"jobTitle":null,"level":null,"joined":null,"since":null,"mix":[["Lateral SG5-SG8",2],["FTC",7],["FTC Conversion",2],["NATS Hiring",4],["Contract Conversion",6]],"streams":{},"mixPeriod":"1 Jan–16 Oct 2026"},{"names":["Tanushree","Tanushree Mukhopadhyay"],"jobTitle":"HR Systems Analyst Senior","level":"SG6","joined":"2024-06-12","since":"2024-06-12","mix":[],"streams":{},"mixPeriod":null}];
  const STREAM = { core: 'core hiring', nats: 'NATS', excelher: 'ExcelHER', other: 'other programmes' };
  function apply() {
    const S = TA.Store;
    const applied = S.state.meta.appliedPacks || [];
    if (applied.indexOf(PACK) >= 0 || applied.indexOf('talent-review-sync-2026-10-20') < 0) return false;
    S.recoveryPoint('Before adding hiring mix and role context from the talent review');
    const origin = 'Import: ' + SRC, today = TA.todayIso(), dates = [];
    P.forEach(x => {
      const t = x.names.map(n => TA.findMember(n)).find(Boolean); if (!t) return;
      const patch = {};
      const st = Object.keys(x.streams).map(k => STREAM[k] + ' ' + x.streams[k]);
      const mix = (st.length ? 'Scorecard offers by stream (1 Jan–12 Oct 2026): ' + st.join(', ') + '. ' : '') +
        (x.mix.length ? 'Offers by category (Hiring2026 tracker plus the NATS and pipeline programmes workbook, ' + x.mixPeriod + '): ' + x.mix.map(m => m[0] + ' ' + m[1]).join(', ') + '.' : '');
      if (mix && (t.hiringMix || '').indexOf(mix) < 0) patch.hiringMix = (t.hiringMix ? t.hiringMix + ' ' : '') + mix + ' (Talent review.)';
      const rc = (x.jobTitle ? 'Job title: ' + x.jobTitle : '') + (x.level ? (x.jobTitle ? '; ' : '') + 'grade ' + x.level : '');
      if (rc && (t.roleComplexity || '').indexOf(rc) < 0) patch.roleComplexity = (t.roleComplexity ? t.roleComplexity + ' ' : '') + rc + ' (talent review).';
      if (Object.keys(patch).length) S.update('team', t.id, patch);
      if (x.joined && t.startDate && x.joined !== t.startDate) dates.push(t.name + ': start date held here ' + TA.fmtDate(t.startDate) + '; talent review hire date ' + TA.fmtDate(x.joined) + (x.since ? ' (in role since ' + TA.fmtDate(x.since) + ')' : ''));
    });
    const title = 'Hire dates: talent review vs start dates held here';
    if (dates.length && !S.list('questions', { archived: true }).some(q => q.title === title))
      S.add('questions', { title, type: 'Data conflict', priority: 'Nice to have', relatedTo: 'Team & Development – start dates', detail: dates.join('. ') + '. Start dates are unchanged. Which date should the dashboard use for tenure and target exposure?',
        valueA: 'Start date held here', valueB: 'Talent review hire date', owner: 'Dr. Ranjith TP', raisedDate: today, status: 'Open', resolution: null, resolvedDate: null }, origin);
    S.setMeta({ appliedPacks: (S.state.meta.appliedPacks || []).concat([PACK]) });
    return true;
  }
  const prev = TA.applyDataPacks;
  TA.applyDataPacks = function () { const a = prev ? prev() : false; const b = apply(); return a || b; };
})();

/* Answers (TA Head, 20 Oct 2026): Padma active until 25 Dec 2026; NATS target 125; Spoorthy hire date 24 Jul 2025;
   Lincy Mathew start date 10 Jun 2024 (converted to regular rolls in 2026). */
(function () {
  'use strict';
  const TA = window.TA;
  const PACK = 'answers-2026-10-20c', WHO = 'TA Head, 20 Oct 2026';
  function apply() {
    const S = TA.Store;
    const applied = S.state.meta.appliedPacks || [];
    if (applied.indexOf(PACK) >= 0 || applied.indexOf('talent-review-sync-2026-10-20-upd1') < 0) return false;
    S.recoveryPoint('Before applying answers on Padma, NATS and start dates');
    const today = TA.todayIso();
    const note = (x, t) => (x && x.indexOf(t) >= 0) ? x : (x ? x + ' ' : '') + t;
    const padma = TA.findMember('Padma');
    if (padma) S.update('team', padma.id, { employmentStatus: 'Active', endDate: '2026-12-25',
      notes: note(padma.notes, 'Active until 25 Dec 2026 (' + WHO + '); this replaces the brief\'s statement that Padma had left. Historical records preserved.') });
    const sp = TA.findMember('Spoorthy');
    if (sp) S.update('team', sp.id, { startDate: '2025-07-24', notes: note(sp.notes, 'Start date 24 Jul 2025 (' + WHO + '); earlier records gave 24 Jul 2023, when reviews were as a consultant.') });
    const lm = TA.findMember('Lincy Mathew');
    if (lm) S.update('team', lm.id, { startDate: '2024-06-10', notes: note(lm.notes, 'Start date 10 Jun 2024; converted to regular rolls in 2026 (talent review hire date 20 May 2026) (' + WHO + ').') });
    const rk = S.list('risks', { archived: true }).find(r => r.title === 'Recruiter capacity while two roles are being backfilled');
    if (rk && /Padma and Jayaram have left/.test(rk.description || '')) S.update('risks', rk.id, { description: 'Jayaram has left; replacement hiring is underway (brief). Padma is active until 25 Dec 2026 (' + WHO + ').' });
    const ac = S.list('actions', { archived: true }).find(a => a.title === 'Complete replacement hiring for the two departed recruiter roles');
    if (ac) S.update('actions', ac.id, { notes: note(ac.notes, 'Update: Padma is active until 25 Dec 2026 (' + WHO + '), so only Jayaram\'s role has been vacated so far.') });
    const resolve = (title, text) => { const q = S.list('questions', { archived: true }).find(x => x.title === title); if (q && q.status !== 'Resolved') S.update('questions', q.id, { status: 'Resolved', resolution: text, resolvedDate: today }); };
    resolve('Padma: left (brief) or active until 25 Dec 2026 (talent review)?', 'Active until 25 Dec 2026 (' + WHO + ').');
    resolve('NATS target: 125 or 100? (and other programme numbers)', 'NATS 125 confirmed (' + WHO + '). PG intern 20, Global PGET 8, Campus Ambassadors 8 and Tech Talks 20 were confirmed on 19 Oct. GET/PGET 2027 (50), Research Collaboration (10) and CoTeaching (20) stay at the P&C calendar values; the talent review figures (15, 5, 10) are kept in this record.');
    resolve('Hire dates: talent review vs start dates held here', 'Spoorthy: 24 Jul 2025. Lincy Mathew: 10 Jun 2024 (converted to regular rolls in 2026) (' + WHO + ').');
    S.setMeta({ appliedPacks: (S.state.meta.appliedPacks || []).concat([PACK]) });
    TA.toast('Applied answers: Padma active to 25 Dec 2026, NATS 125, start dates');
    return true;
  }
  const prev = TA.applyDataPacks;
  TA.applyDataPacks = function () { const a = prev ? prev() : false; const b = apply(); return a || b; };
})();

/* Hire dates from the P4P review sheet (supplied by the TA Head, 20 Oct 2026). Only the hire dates are used:
   P4P numbers, ratings and positions are NOT imported (no automatic rating of people). Start date in team = hire date, except
   Lincy Mathew, whose team start date stays 10 Jun 2024 (converted to regular rolls on 20 May 2026, TA Head, 20 Oct 2026). */
(function () {
  'use strict';
  const TA = window.TA;
  const PACK = 'p4p-hire-dates-2026-10-20', SRC = 'P4P review sheet – hire dates only (TA Head, 20 Oct 2026)';
  const HIRE = [['Gokul', '2023-01-02'], ['Elizabeth John', '2022-03-28'], ['Shreyashi Saha', '2022-03-07'], ['Padma', '2022-03-31'], ['Mickey Singh', '2024-03-20'],
    ['Adarsh', '2022-07-06'], ['Smruthi Prabhakaran', '2022-07-27'], ['Philomena Lincy', '2023-03-27'], ['Tanushree Mukhopadhyay', '2024-06-12'],
    ['Lincy Mathew', '2026-05-20'], ['Kathiresaprabu Sanjeevi', '2025-07-07'], ['Spoorthy', '2025-07-24']];
  const KEEP_START = { 'Lincy Mathew': 'Team start date kept at 10 Jun 2024; hire date is the conversion to regular rolls (TA Head, 20 Oct 2026).' };
  function apply() {
    const S = TA.Store;
    const applied = S.state.meta.appliedPacks || [];
    if (applied.indexOf(PACK) >= 0 || applied.indexOf('answers-2026-10-20c') < 0) return false;
    S.recoveryPoint('Before adding hire dates from the P4P review sheet');
    HIRE.forEach(([name, d]) => {
      const t = TA.findMember(name); if (!t) return;
      const patch = { hireDate: d };
      if (!KEEP_START[t.name] && t.startDate !== d) patch.startDate = d;
      const n = 'Hire date ' + TA.fmtDate(d) + ' (' + SRC + ').' + (KEEP_START[t.name] ? ' ' + KEEP_START[t.name] : '');
      if ((t.notes || '').indexOf(n) < 0) patch.notes = (t.notes ? t.notes + ' ' : '') + n;
      S.update('team', t.id, patch);
    });
    const ad = TA.findMember('Adarsh');
    if (ad && ad.employmentStatus === 'Not provided') S.update('team', ad.id, { employmentStatus: 'Active', notes: (ad.notes ? ad.notes + ' ' : '') + 'Status Active per the India TA Talent Review (20 Oct 2026).' });
    S.setMeta({ appliedPacks: (S.state.meta.appliedPacks || []).concat([PACK]) });
    TA.toast('Added hire dates from the P4P review sheet');
    return true;
  }
  const prev = TA.applyDataPacks;
  TA.applyDataPacks = function () { const a = prev ? prev() : false; const b = apply(); return a || b; };
})();
