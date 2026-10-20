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
