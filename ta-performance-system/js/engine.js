/* Rules engine, sample-data generator and state store.
   Calculations follow SYSTEM_DESIGN.md §4. Anything that depends on an open decision
   reads from state.rules so the administrator can switch alternatives. */

// ---------- utilities ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const D = {
  parse: s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); },
  fmt: t => new Date(t).toISOString().slice(0, 10),
  add: (s, n) => D.fmt(D.parse(s) + n * 86400000),
  diff: (a, b) => Math.round((D.parse(a) - D.parse(b)) / 86400000),
  dow: s => new Date(D.parse(s)).getUTCDay(),
  valid: s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(D.parse(s)) && D.fmt(D.parse(s)) === s,
  nice: s => { if (!s) return '—'; const t = new Date(D.parse(s)); return t.getUTCDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][t.getUTCMonth()] + ' ' + t.getUTCFullYear(); },
};
const sum = a => a.reduce((x, y) => x + y, 0);
const avg = a => a.length ? sum(a) / a.length : null;
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r1 = x => x == null ? null : Math.round(x * 10) / 10;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const nowStamp = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

// ---------- calendar ----------
const HOLIDAY_SET = new Set(HOLIDAYS.map(h => h[0]));
function isWorkingDay(s) { const w = D.dow(s); return w !== 0 && w !== 6 && !HOLIDAY_SET.has(s); }
function workingDays(from, to) {
  const out = []; for (let s = from; s <= to; s = D.add(s, 1)) if (isWorkingDay(s)) out.push(s); return out;
}

// ---------- state ----------
const STORE_KEY = 'ta-pdms-prototype-v1';
let state = null;
let calcVersion = 0;

// Saving goes through security.js: encrypted for the TA Head, in-memory for member files and the demo.
function saveState() { if (typeof persistState === 'function') persistState(); }
function loadState() {
  try { const s = localStorage.getItem(STORE_KEY); if (s) { state = migrateState(JSON.parse(s)); return; } } catch (e) { /* ignore */ }
  state = buildSampleState();
}
// Older saves and backups predate editable teams/roles and summary scorecards.
function migrateState(s) {
  s.teams = s.teams || JSON.parse(JSON.stringify(DEFAULT_TEAMS));
  s.roles = s.roles || JSON.parse(JSON.stringify(DEFAULT_ROLES));
  s.scorecards = s.scorecards || {};
  for (const e of s.employees || []) { e.alsoTeams = e.alsoTeams || []; e.flags = e.flags || []; }
  s.areaPPO = s.areaPPO || {};
  if (s.rules && s.rules.pointsPerOffer == null) {
    // Points-based assessment (TA Head decision, 18 Oct 2026) applied to older workspaces.
    s.rules.pointsPerOffer = 2; s.rules.offerFormula = 'P'; s.rules.gate = Object.assign({}, s.rules.gate, { g: 0 });
    Object.assign(s.rules.status, { offerFormula: ['approved', 'TA Head 18 Oct 2026'], pointsPerOffer: ['approved', 'TA Head 18 Oct 2026'], gate: ['pending', 'D-03 (off)'] });
    (s.audit = s.audit || []).unshift({ at: nowStamp(), who: 'TA Head', action: 'Rule changed', object: 'Offer Delivery & Complexity', detail: 'Offer counts → weighted points: points target = offer target × 2; score = 40 × points ÷ points target (capped); volume gate off', reason: 'TA Head decision 18 Oct 2026' });
  }
  return s;
}
function resetState() { state = buildSampleState(); calcVersion++; saveState(); }
// Empty workspace for real use: same structure, no people or transactions.
function emptyState() {
  return {
    mode: 'live', rules: JSON.parse(JSON.stringify(DEFAULT_RULES)), areaPPO: {},
    teams: JSON.parse(JSON.stringify(DEFAULT_TEAMS)), roles: JSON.parse(JSON.stringify(DEFAULT_ROLES)), scorecards: {},
    areaTargets: Object.fromEntries(Object.entries(AREAS).map(([k, v]) => [k, v.target])),
    employees: [], offers: [], assessments: {}, projects: [], learning: [], compDev: {}, idp: {}, afi: {}, requests: [], batches: [],
    audit: [{ at: nowStamp(), who: 'TA Head', action: 'Workspace created', object: 'Live workspace', detail: 'Started without sample data', reason: '' }],
    reports: [], overrides: [], promo: {}, review: {}, comments: {}, breakGlass: [],
  };
}
function startLive() { state = emptyState(); calcVersion++; saveState(); }
let _yearDays = null;
function yearWorkingDays() { return _yearDays || (_yearDays = workingDays(PERIOD.start, PERIOD.end).length); }
// Default annual points target: offer target × points per offer (per-person override in e.ptAnnual).
function defaultAnnualPoints(e) {
  const sc = state.scorecards && state.scorecards[e.id];
  if (isSupport(e)) return null;
  if (sc && !state.offers.some(o => o.emp === e.id)) return sc.target != null ? sc.target * ppoFor(e.area) : null;
  return areaTarget(e.area) * (isLead(e) ? state.rules.tlTargetShare : roleOf(e).share) * ppoFor(e.area) * yearWorkingDays() / 10;
}
function annualPoints(e) { return e.ptAnnual != null ? e.ptAnnual : defaultAnnualPoints(e); }
function ppoFor(a) { return state.areaPPO && state.areaPPO[a] != null ? Number(state.areaPPO[a]) : state.rules.pointsPerOffer; }
const pointsBasis = () => state.rules.offerFormula === 'P';
function areaTarget(a) { const t = state.areaTargets[a]; return t == null ? 0 : Number(t); }
function addEmployee(o) {
  const e = { id: o.id, name: o.name, team: o.team, area: o.area, type: o.type || 'IC', level: o.level ?? JOB_LEVELS[0], since: o.since === undefined ? PERIOD.start : o.since,
    ratings: o.ratings || [null, null, null], start: o.start || null, end: o.end || null, status: o.status || 'Active', alsoTeams: o.alsoTeams || [], flags: o.flags || [],
    leave: null, targets: o.targets || Object.fromEntries(COMPETENCIES.map(c => [c, 3])) };
  state.employees.push(e);
  state.assessments[e.id] = state.assessments[e.id] || [];
  state.compDev[e.id] = state.compDev[e.id] || { mgr: null, self: null };
  state.review[e.id] = state.review[e.id] || { cutoff: false, metrics: false, selfDone: false, summary: '', summarySource: '', calibrated: false, finalised: false, empComment: '', idpApproved: false };
  return e;
}
function emp(id) { return state.employees.find(e => e.id === id); }
function roleOf(e) { return (state.roles && state.roles[e.type]) || { name: e.type, template: 'recruiter', share: 1 }; }
const isLead = e => roleOf(e).template === 'lead';
const isSupport = e => roleOf(e).template === 'support';
const isRecruiter = e => roleOf(e).template === 'recruiter';
const isFormer = e => e.status === 'Former';
// Team goal counts primary-team members only; "also supports" members are shown but not double-counted (D-49).
function teamMembers(team, includeTL = true) { return state.employees.filter(e => e.team === team && !isSupport(e) && (includeTL || !isLead(e))); }
function teamLead(team) { return state.employees.find(e => e.team === team && isLead(e) && !isFormer(e)) || state.employees.find(e => e.team === team && isLead(e)); }
function teamAreas(team) { return (state.teams[team] && state.teams[team].areas) || []; }

function audit(action, object, detail, reason = '', who = null) {
  state.audit.unshift({ at: nowStamp(), who: who || currentUserLabel(), action, object, detail, reason });
}
function touch() { calcVersion++; if (typeof session !== 'undefined' && session && session.kind === 'member') session.dirty = true; saveState(); }

// ---------- sample data ----------
function buildSampleState() {
  const rnd = mulberry32(20261016);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const wpick = (pairs) => { let r = rnd() * sum(pairs.map(p => p[1])); for (const [v, w] of pairs) { r -= w; if (r <= 0) return v; } return pairs[pairs.length - 1][0]; };
  const s = {
    mode: 'sample', rules: JSON.parse(JSON.stringify(DEFAULT_RULES)), areaPPO: {},
    teams: JSON.parse(JSON.stringify(DEFAULT_TEAMS)), roles: JSON.parse(JSON.stringify(DEFAULT_ROLES)), scorecards: {},
    areaTargets: Object.fromEntries(Object.entries(AREAS).map(([k, v]) => [k, v.target])),
    employees: EMPLOYEES.map(e => ({ id: e.id, name: e.name, team: e.team, area: e.area, type: e.type, level: e.level, since: e.since, ratings: [...e.ratings], start: e.start || null, end: null, status: 'Active', alsoTeams: [], flags: [], leave: e.leave || null })),
    offers: [], assessments: {}, projects: [], learning: [], compDev: {}, idp: {}, afi: {}, requests: [], batches: [],
    audit: [], reports: [], overrides: [], promo: {}, review: {}, comments: {}, breakGlass: [],
  };
  let cand = 70000, req = 4000;
  const vendors = ['Apex Search', 'TalentBridge', 'Northstar HR', 'Summit Partners'];
  for (const e of EMPLOYEES) {
    const tgt = AREAS[e.area].target * (e.type === 'TL' ? 0.5 : 1);
    const days = eligibleDaysRaw(e.start || PERIOD.start, e.leave);
    const p = clamp(tgt * e.p.vol / 10, 0, 0.95);
    for (const day of days) {
      if (rnd() >= p) continue;
      let cat;
      if (e.area === 'Early Careers') cat = wpick([['GET / PGET', 32], ['NATS Hiring', 20], ['NATS Conversion', 10], ['PMIS', 14], ['ExcelHER', 12], ['PhD Internship', 6], ['AICTE Professor', 6]]);
      else if (e.area === 'Leadership Hiring') cat = rnd() < .6 + .3 * e.p.cx ? 'SG9 and above' : 'Lateral SG5-SG8';
      else cat = wpick([['SG9 and above', 3 + 7 * e.p.cx], ['Lateral SG5-SG8', 20 + 30 * e.p.cx], ['FTC', 5], ['Contract Conversion', 5], ['Lateral SG1-SG4', 60 - 30 * e.p.cx]]);
      const sg = cat === 'Lateral SG1-SG4' ? 'SG' + (1 + Math.floor(rnd() * 4)) : cat === 'Lateral SG5-SG8' ? 'SG' + (5 + Math.floor(rnd() * 4)) : cat === 'SG9 and above' ? 'SG' + (9 + Math.floor(rnd() * 4)) : '';
      const gender = cat === 'ExcelHER' ? 'Female' : rnd() < .38 ? 'Female' : 'Male';
      const ct = Math.max(7, Math.round(e.p.ct + (rnd() + rnd() + rnd() - 1.5) * 20));
      const reqDate = D.add(day, -ct);
      const lead = e.area === 'Early Careers' ? 20 + rnd() * 55 : e.area === 'Leadership Hiring' ? 45 + rnd() * 45 : 30 + rnd() * 45;
      const expJoin = D.add(day, Math.round(lead));
      let status = 'Pending', actJoin = '';
      if (expJoin <= PERIOD.cutoff) {
        const r = rnd();
        if (r < e.p.jr) { status = 'Joined'; actJoin = expJoin; }
        else status = r < e.p.jr + (1 - e.p.jr) * .6 ? 'Declined' : 'No-show';
      }
      let source;
      if (e.area === 'Early Careers') source = rnd() < e.p.vend ? 'Vendor' : rnd() < .75 ? 'Campus' : 'Direct';
      else { const r = rnd(); source = r < e.p.vend ? 'Vendor' : r < e.p.vend + .25 ? 'Referral' : 'Direct'; }
      const o = { id: 'O' + (s.offers.length + 1), emp: e.id, cand: 'C-' + (++cand), req: 'R-' + (++req), area: e.area, cat, sg, gender,
        reqDate, offerDate: day, expJoin, actJoin, status, source, vendor: source === 'Vendor' ? pick(vendors) : '', exc: null, batch: 'B-0001', confirmed: false };
      if (ct > 75 && rnd() < .5) o.exc = { reason: pick(['Business hold', 'Hiring-manager delay', 'Approval delay', 'Niche search']), status: 'Approved', by: 'TA Head', at: D.add(day, 3) };
      s.offers.push(o);
    }
  }
  s.batches.push({ id: 'B-0001', dataset: 'Offers', source: 'ATS export Jan–Sep 2026.csv', by: 'TA Ops Analyst', approver: 'TA Head', at: '2026-10-05 10:12', status: 'Published', added: s.offers.length, updated: 0, excluded: 0, errors: 0, rule: DEFAULT_RULES.version });

  // competency assessments (history is append-only)
  const periods = [['Baseline', '2026-01-15'], ['Q1', '2026-04-10'], ['Q2', '2026-07-10'], ['Q3', '2026-10-09']];
  for (const e of EMPLOYEES) {
    const base = COMPETENCIES.map((c, i) => clamp(Math.round(2 + e.p.vol + e.p.cx + (rnd() - .5) * 1.6 + (e.type === 'TL' && i === 7 ? 1 : 0) - (e.id === 'E1033' ? 1 : 0)), 1, 4));
    const optimism = e.id === 'E1004' ? 1.2 : e.id === 'E1012' ? .8 : (rnd() - .4) * .6;
    let cur = [...base];
    const recs = [];
    for (const [per, date] of periods) {
      if (e.start && date < e.start && per !== 'Baseline') continue;
      if (per !== 'Baseline') cur = cur.map(v => clamp(v + (rnd() < .22 ? 1 : 0), 1, 5));
      const self = {}, mgr = {}, se = {}, me = {};
      COMPETENCIES.forEach((c, i) => {
        mgr[c] = cur[i];
        self[c] = clamp(Math.round(cur[i] + optimism + (rnd() - .5) * .9), 1, 5);
        se[c] = pick(['Closed critical roles ahead of plan', 'Shared sourcing approach with team', 'Example in Q review notes', 'Used data in intake meeting', 'Feedback from hiring manager']);
        me[c] = pick(['Consistent evidence across quarter', 'Needs more independent application', 'Strong example in stakeholder review', 'Observed in calibration panel', 'Limited evidence this quarter']);
      });
      recs.push({ period: per, date, self, mgr, selfEvidence: se, mgrEvidence: me, by: 'seed' });
    }
    s.assessments[e.id] = recs;
    s.employees.find(x => x.id === e.id).targets = Object.fromEntries(COMPETENCIES.map((c, i) => [c, clamp(base[i] + 1, 2, 5)]));
  }

  // projects
  let pid = 1;
  for (const e of EMPLOYEES) {
    const n = e.type === 'TL' ? 2 : (rnd() < .3 ? 2 : 1);
    for (let k = 0; k < n; k++) {
      const t = PROJECT_TITLES[(pid * 3 + k) % PROJECT_TITLES.length];
      const stage = e.id === 'E1033' ? 0 : clamp(Math.floor(rnd() * 5 + e.p.vol * .8), 0, 4);
      const stalled = e.id === 'E1012' || e.id === 'E1022';
      const lastVal = stalled ? '2026-07-28' : D.add(PERIOD.cutoff, -Math.floor(rnd() * 40));
      const scored = stage >= 1 && k === 0 && e.id !== 'E1033';
      const pr = {
        id: 'P-' + String(pid++).padStart(3, '0'), owner: e.id, title: t[0], problem: t[1], metric: t[2], baseline: t[3], target: t[4],
        actual: stage >= 3 ? Math.round(t[3] + (t[4] - t[3]) * (0.5 + rnd() * .5)) : null,
        sponsor: 'Business HR Lead', start: '2026-02-' + String(2 + k * 10).padStart(2, '0'), planEnd: '2026-11-28',
        stage, inProgress: stage < 4 ? stage + 1 : null, lastValidated: lastVal,
        planStages: ['2026-03-15', '2026-05-15', '2026-07-15', '2026-09-15', '2026-11-15'],
        history: DMAIC.slice(0, stage + 1).map((st, i) => ({ stage: st, validated: D.add('2026-03-01', i * 50), by: 'TA Head', evidence: 'Stage evidence pack' })),
        nextAction: ['Root-cause workshop', 'Pilot with two hiring managers', 'Publish control chart', 'Collect baseline data'][Math.floor(rnd() * 4)],
        contributing: k === 0,
        mgrScore: scored ? { discipline: clamp(Math.round(2 + stage * .7 + rnd()), 0, 5), impact: clamp(Math.round(1 + stage * .8 + rnd()), 0, 5), control: stage >= 4 ? 2 + Math.round(rnd()) : stage >= 3 ? 1 : 0, learning: Math.round(rnd() * 2) } : null,
        selfScore: stage >= 1 ? { discipline: clamp(stage + 2, 0, 5), impact: clamp(stage + 1, 0, 5), control: stage >= 3 ? 2 : 1, learning: 2 } : null,
        lessons: stage >= 3 ? 'Hiring-manager calendars were the main constraint; shared slots fixed it.' : '',
      };
      s.projects.push(pr);
    }
  }

  // learning
  let lid = 1;
  for (const e of EMPLOYEES) {
    const n = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const L = LEARNING_LIB[(lid * 5 + k) % LEARNING_LIB.length];
      const done = rnd() < .7;
      s.learning.push({ id: 'L-' + lid++, emp: e.id, programme: L[0], provider: L[1], type: L[2], skill: L[3],
        start: '2026-0' + (2 + k * 2) + '-05', completion: done ? '2026-0' + (3 + k * 2) + '-20' : '', cert: L[2] === 'Certification' && done,
        status: done ? 'Completed' : 'In progress', application: done ? L[4] : null, validated: done && !!L[4] && rnd() < .7 });
    }
  }

  // competency development points (TA Head enters; system shows evidence alongside)
  for (const e of EMPLOYEES) {
    if (e.id === 'E1033') { s.compDev[e.id] = { mgr: null, self: { g: 4, a: 3, c: 2 } }; continue; }
    const g = clamp(Math.round(3 + e.p.vol * 2 + (rnd() - .5) * 2), 1, 7), a = clamp(Math.round(2 + e.p.cx * 3 + rnd()), 1, 5), c = clamp(Math.round(1 + rnd() * 2), 0, 3);
    s.compDev[e.id] = { mgr: { g, a, c, lead: e.type === 'TL' ? clamp(Math.round(12 + e.p.vol * 5 + rnd() * 3), 0, 20) : null, evidence: 'Q3 review: growth evidenced in two competencies; one validated application example.' },
      self: { g: clamp(g + (rnd() < .5 ? 1 : 0), 0, 7), a: clamp(a + (rnd() < .4 ? 1 : 0), 0, 5), c } };
  }

  // IDP (some members have drafts)
  for (const e of EMPLOYEES.slice(0, 9)) {
    if (rnd() < .4) continue;
    const area = COMPETENCIES[Math.floor(rnd() * 8)];
    const L = IDP_LIBRARY[area];
    s.idp[e.id] = [{ id: 'I-' + e.id + '-1', area, current: 2, target: 3, training: L[0], cert: L[1], stretch: L[2], application: L[3], evidence: 'Manager-validated application example', due: '2027-06-30', status: 'Draft', source: 'TA Head' }];
  }

  // review progress
  for (const e of EMPLOYEES) s.review[e.id] = { cutoff: true, metrics: rnd() < .7, selfDone: rnd() < .8, summary: '', summarySource: '', calibrated: false, finalised: false, empComment: '', idpApproved: false };
  s.comments = { E1002: { mgr: 'Consistent cadence; strong stakeholder feedback from DTO business.', emp: 'Would like to lead a cross-team project next year.' } };

  // seeded requests
  const ro = id => s.offers.filter(o => o.emp === id && o.offerDate >= '2026-09-01').slice(0, 4).map(o => o.id);
  s.requests.push({ id: 'RQ-001', emp: 'E1002', type: 'Confirm data', msg: 'Please confirm your September offers from the ATS import.', rows: ro('E1002'), due: '2026-10-23', status: 'Sent', created: '2026-10-12', response: null });
  s.requests.push({ id: 'RQ-002', emp: 'E1003', type: 'Confirm data', msg: 'Please confirm your September offers from the ATS import.', rows: ro('E1003'), due: '2026-10-23', status: 'Responded', created: '2026-10-12',
    response: { kind: 'Dispute', text: 'One offer was revoked by the business on 18 Sep (role put on hold); it should not count as a decline.', at: '2026-10-14 16:40', row: ro('E1003')[0] } });
  s.requests.push({ id: 'RQ-003', emp: 'E1004', type: 'Request evidence', msg: 'Your average cycle time is above 55 days. Please add evidence for any requisitions affected by business holds or approval delays.', rows: [], due: '2026-10-28', status: 'Sent', created: '2026-10-15', response: null });

  s.audit.push(
    { at: '2026-10-15 09:02', who: 'TA Head', action: 'Request sent', object: 'RQ-003', detail: 'Request evidence → Karthik Menon', reason: '' },
    { at: '2026-10-12 11:20', who: 'TA Head', action: 'Request sent', object: 'RQ-001, RQ-002', detail: 'Confirm data → 2 employees', reason: '' },
    { at: '2026-10-05 10:12', who: 'TA Head', action: 'Import approved', object: 'B-0001', detail: s.offers.length + ' offer rows published', reason: '' },
    { at: '2026-10-04 17:45', who: 'TA Ops Analyst', action: 'Import prepared', object: 'B-0001', detail: 'ATS export Jan–Sep 2026.csv', reason: '' },
    { at: '2026-01-02 09:00', who: 'System Admin', action: 'Rule version created', object: 'R-2026.1-draft', detail: 'Initial rules from BRD v1.0; conflicting items marked pending', reason: 'Phase 1 prototype' },
  );
  return s;
}

function eligibleDaysRaw(start, leave, end) {
  const from = start > PERIOD.start ? start : PERIOD.start;
  const to = end && end < PERIOD.cutoff ? end : PERIOD.cutoff;
  let days = workingDays(from, to);
  if (leave) days = days.filter(d => d < leave[0] || d > leave[1]);
  return days;
}

// ---------- calculations ----------
function pointsFor(o, rules = state.rules) {
  const row = POINT_TABLES[rules.pointsTable].rows[o.cat];
  if (!row) return { base: 0, bonus: 0, total: 0 };
  const base = row[0], bonus = row[1] && o.gender === 'Female' ? 0.5 : 0;
  return { base, bonus, total: base + bonus };
}
function cycleDays(o) { return D.diff(o.offerDate, o.reqDate); }
function jrScore(pct) { if (pct == null) return null; for (const [min, pts] of state.rules.jrBands) if (pct >= min) return pts; return 0; }
function ctScore(a) { if (a == null) return null; const b = state.rules.ctBands; return a < b.strong ? 10 : a <= b.acceptable ? 7 : 4; }
function ctLabel(a) { if (a == null) return '—'; const b = state.rules.ctBands; return a < b.strong ? 'Strong' : a <= b.acceptable ? 'Acceptable' : 'Improvement Required'; }
function vendorScore(p) { if (p == null) return null; const b = state.rules.vendorBands; return p < b.low ? 5 : p <= b.high ? 3 : 1; }

function offerScore(expected, actual, points, pointsTarget) {
  const R = state.rules;
  if (!expected) return { score: null, note: 'No closed cycle yet' };
  if (points == null) return { score: null, how: 'Weighted points not available' };
  const vol = actual != null ? actual / expected : null;
  let patt = points / expected;
  let score, how;
  if (R.offerFormula === 'P') { patt = pointsTarget ? points / pointsTarget : null; score = patt == null ? null : 40 * Math.min(patt, 1); how = '40 × min(points ÷ points target, 1); points target = offer target × points per offer'; }
  else if (R.offerFormula === 'O1') { score = 40 * Math.min(patt, 1); how = '40 × min(points ÷ expected, 1)'; }
  else if (R.offerFormula === 'O2') {
    const avgPts = actual ? points / actual : 0;
    score = 28 * Math.min(vol, 1) + 12 * clamp((avgPts - 1) / 0.5, 0, 1); how = '28 × min(volume, 1) + 12 × min((avg points − 1) ÷ 0.5, 1)';
  } else {
    score = patt >= 1 ? 40 : patt >= .9 ? 34 : patt >= .8 ? 28 : patt >= .7 ? 20 : 10; how = 'Bands on points attainment: ≥100% 40 · ≥90% 34 · ≥80% 28 · ≥70% 20 · else 10';
  }
  let gated = false;
  if (vol != null && R.gate.g > 0 && vol < R.gate.g && score > 40 * R.gate.c) { score = 40 * R.gate.c; gated = true; }
  return { score: r1(score), how, gated, vol, patt };
}

function deliveryBlock(offers, days, target, ppo = state.rules.pointsPerOffer, ptPer10 = null) {
  if (ptPer10 == null) ptPer10 = target * ppo;
  const nClosed = Math.floor(days.length / 10);
  const cycles = [];
  for (let i = 0; i * 10 < days.length; i++) {
    const chunk = days.slice(i * 10, i * 10 + 10);
    cycles.push({ n: i + 1, from: chunk[0], to: chunk[chunk.length - 1], days: chunk.length, closed: chunk.length === 10, target: target * chunk.length / 10, pointsTarget: ptPer10 * chunk.length / 10, offers: 0, points: 0 });
  }
  const lastDay = days[days.length - 1];
  const inPeriod = offers.filter(o => days.length && o.offerDate >= days[0] && o.offerDate <= PERIOD.cutoff);
  for (const o of inPeriod) {
    let idx = days.findIndex(d => d >= o.offerDate);
    if (idx < 0) idx = days.length - 1;
    const c = cycles[Math.floor(idx / 10)];
    if (c) { c.offers++; c.points += pointsFor(o).total; }
  }
  const closed = cycles.filter(c => c.closed);
  const expectedFormal = nClosed * target, actualFormal = sum(closed.map(c => c.offers)), pointsFormal = sum(closed.map(c => c.points));
  const pts = inPeriod.map(o => pointsFor(o));
  const pointsTargetFormal = nClosed * ptPer10;
  const os = offerScore(expectedFormal, actualFormal, pointsFormal, pointsTargetFormal);
  // joining
  const matured = inPeriod.filter(o => o.expJoin <= PERIOD.cutoff && o.status !== 'Revoked');
  const joined = matured.filter(o => o.status === 'Joined').length;
  const jr = matured.length ? joined / matured.length * 100 : null;
  // cycle time
  const ctAll = inPeriod.map(cycleDays);
  const ctScored = inPeriod.filter(o => !(o.exc && o.exc.status === 'Approved')).map(cycleDays);
  const ctAvg = avg(ctScored);
  // vendor
  const applicable = inPeriod.filter(o => !state.rules.vendorExcluded.includes(o.cat));
  const vend = applicable.filter(o => o.source === 'Vendor').length;
  const vp = applicable.length ? vend / applicable.length * 100 : null;
  const mix = {};
  inPeriod.forEach((o, i) => { const k = o.cat; mix[k] = mix[k] || { n: 0, women: 0, points: 0, bonus: 0 }; mix[k].n++; if (o.gender === 'Female') mix[k].women++; mix[k].points += pts[i].total; mix[k].bonus += pts[i].bonus; });
  // repeated misses (consecutive closed cycles below target, most recent run)
  const missed = c => pointsBasis() ? c.points < c.pointsTarget : c.offers < c.target;
  let run = 0; for (let i = closed.length - 1; i >= 0 && missed(closed[i]); i--) run++;
  return {
    days: days.length, target, cycles, nClosed, lastDay,
    expectedYTD: days.length / 10 * target, actualYTD: inPeriod.length, pointsYTD: sum(pts.map(p => p.total)), bonusYTD: sum(pts.map(p => p.bonus)),
    expectedFormal, actualFormal, pointsFormal, pointsTargetFormal, ppo, pointsTargetYTD: days.length / 10 * ptPer10, ptPer10, offer: os,
    matured: matured.length, joined, declined: matured.filter(o => o.status === 'Declined').length, noshow: matured.filter(o => o.status === 'No-show').length,
    pending: inPeriod.filter(o => o.expJoin > PERIOD.cutoff).length, jr, jrScore: jrScore(jr),
    ctAvg, ctMedian: median(ctAll), ctCount: ctAll.length, ctExcluded: ctAll.length - ctScored.length, ctScore: ctScore(ctAvg), ctBands: [ctAll.filter(x => x < 45).length, ctAll.filter(x => x >= 45 && x <= 55).length, ctAll.filter(x => x > 55).length],
    applicable: applicable.length, vendor: vend, vendorPct: vp, vendorScore: vendorScore(vp),
    mix, offers: inPeriod, missRun: run,
  };
}
function deliverablesTotal(b, ov, noRescale = false) {
  const parts = [['offer', b.offer.score, 40], ['jr', b.jrScore, 15], ['ct', b.ctScore, 10], ['vendor', b.vendorScore, 5]].map(([k, v, max]) => {
    const o = ov && ov.find(x => x.measure === k);
    return { k, v: o ? o.revised : v, max, overridden: !!o, original: v };
  });
  const avail = parts.filter(p => p.v != null);
  const raw = sum(avail.map(p => p.v)), maxAvail = sum(avail.map(p => p.max));
  if (noRescale && maxAvail < 70) return { total: null, rescaled: false, parts, raw: r1(raw), maxAvail };
  return { total: maxAvail ? r1(raw * 70 / maxAvail) : null, rescaled: maxAvail < 70 && maxAvail > 0, parts, raw: r1(raw), maxAvail };
}

/* Summary-scorecard mode: YTD totals per recruiter (target, offers, joiners, offer days, vendor %) when
   offer-level data is not available. Attainment follows the source scorecard (joiners vs target), pro-rated
   to the scorecard date (D-46). The 40-point offer score needs offer-level data, so it stays empty unless
   the TA Head records an override with a reason. */
function summaryBlock(sc, e, ppo = state.rules.pointsPerOffer, ptFull = null) {
  const yearDays = workingDays(PERIOD.start, PERIOD.end).length;
  const asOf = e.end && e.end < sc.asOf ? e.end : sc.asOf;
  const from = e.start && e.start > PERIOD.start ? e.start : PERIOD.start;
  const elapsed = workingDays(from, asOf).length;
  const proRata = sc.target != null ? sc.target * elapsed / yearDays : null;
  const jr = sc.offers ? sc.joiners / sc.offers * 100 : null;
  if (ptFull == null && sc.target != null) ptFull = sc.target * ppo;
  const pts = sc.points != null ? sc.points : null, ptTarget = ptFull != null ? ptFull * elapsed / yearDays : null;
  const offer = pts == null ? { score: null, how: 'Weighted points not in the scorecard yet: enter them (Enter points) or import offer-level data.' } : offerScore(proRata, sc.offers, pts, ptTarget);
  return { mode: 'summary', sc, asOf, elapsed, yearDays, target: sc.target, days: elapsed, cycles: [], nClosed: 0, lastDay: asOf, ppo,
    expectedFormal: proRata, actualFormal: sc.offers, pointsFormal: pts, pointsTargetFormal: ptTarget, pointsTargetFull: ptFull,
    offer, expectedYTD: proRata, actualYTD: sc.offers, pointsYTD: pts, pointsTargetYTD: ptTarget, bonusYTD: null,
    matured: sc.offers, joined: sc.joiners, declined: null, noshow: null, pending: null, jr, jrScore: jrScore(jr),
    ctAvg: sc.offerDays, ctMedian: null, ctCount: null, ctExcluded: 0, ctScore: ctScore(sc.offerDays), ctBands: [0, 0, 0],
    applicable: null, vendor: null, vendorPct: sc.vendorPct, vendorScore: vendorScore(sc.vendorPct), mix: {}, offers: [], missRun: 0 };
}
function aggregateSummary(blocks, members) {
  const S = k => sum(blocks.map(b => b[k] || 0));
  const offers = S('actualYTD'), joiners = S('joined');
  const allPts = blocks.every(b => b.pointsFormal != null), pts = allPts ? S('pointsFormal') : null, ptT = S('pointsTargetFormal');
  const wavg = k => { const w = blocks.filter(b => b[k] != null && b.actualYTD); const tw = sum(w.map(b => b.actualYTD)); return tw ? sum(w.map(b => b[k] * b.actualYTD)) / tw : null; };
  const jr = offers ? joiners / offers * 100 : null, ct = wavg('ctAvg'), vp = wavg('vendorPct');
  return { mode: 'summary', members: members.map(m => m.id), cycles: [], expectedFormal: S('expectedFormal'), actualFormal: offers, pointsFormal: pts, pointsTargetFormal: ptT,
    offer: pts == null ? { score: null, how: 'Team score needs weighted points for every member.' } : offerScore(S('expectedFormal'), offers, pts, ptT), expectedYTD: S('expectedYTD'), actualYTD: offers, pointsYTD: null,
    matured: offers, joined: joiners, jr, jrScore: jrScore(jr), ctAvg: ct, ctMedian: null, ctScore: ctScore(ct), applicable: null, vendor: null, vendorPct: vp, vendorScore: vendorScore(vp), offers: [] };
}

const _cache = {};
function metrics(id) {
  const key = id + ':' + calcVersion;
  if (_cache[key]) return _cache[key];
  const e = emp(id);
  const role = roleOf(e), isTL = role.template === 'lead', isSup = role.template === 'support';
  const target = areaTarget(e.area) * (isTL ? state.rules.tlTargetShare : role.share);
  const days = eligibleDaysRaw(e.start || PERIOD.start, e.leave, e.end);
  const txOffers = state.offers.filter(o => o.emp === id);
  const sc = state.scorecards && state.scorecards[id];
  const mode = isSup ? 'support' : (!txOffers.length && sc ? 'summary' : 'tx');
  const ppo = ppoFor(e.area);
  const ptOverride = e.ptAnnual != null ? e.ptAnnual : null;
  const own = mode === 'summary' ? summaryBlock(sc, e, ppo, ptOverride) : deliveryBlock(txOffers, days, target, ppo, ptOverride != null ? ptOverride / (yearWorkingDays() / 10) : null);
  const ov = state.overrides.filter(o => o.emp === id);
  const ownDel = deliverablesTotal(own, ov, mode === 'summary');
  let team = null, teamDel = null, deliverables = isSup ? null : ownDel.total;
  if (isTL) {
    const members = teamMembers(e.team, false);
    // Team goal: members' results against members' combined expectation (TL's own excluded, D-23)
    const blocks = members.map(m => metrics(m.id).own);
    const snap = !blocks.length && state.teamSnapshots && state.teamSnapshots[id]; // personal file: team totals only
    if (snap) { team = snap; teamDel = deliverablesTotal(team, [], team.mode === 'summary'); }
    else if (blocks.length) {
      const anySummary = blocks.some(b => b.mode === 'summary');
      team = anySummary ? aggregateSummary(blocks, members) : aggregateBlocks(blocks, members);
      teamDel = deliverablesTotal(team, [], anySummary);
    }
    const w = state.rules.tlModel === 'TL-A' ? [35, 35] : [40, 20];
    deliverables = teamDel && teamDel.total != null && ownDel.total != null ? r1(teamDel.total * w[0] / 70 + ownDel.total * w[1] / 70) : null;
  }
  // projects
  const projs = state.projects.filter(p => p.owner === id);
  const contrib = projs.filter(p => p.contributing);
  const pscore = s => s ? s.discipline + s.impact + s.control + s.learning : null;
  const mgrP = contrib.map(p => pscore(p.mgrScore)).filter(x => x != null);
  const selfP = contrib.map(p => pscore(p.selfScore)).filter(x => x != null);
  const projects = mgrP.length ? Math.max(...mgrP) : null, projectsSelf = selfP.length ? Math.max(...selfP) : null;
  // competency development
  const cd = state.compDev[id] || {};
  const cdM = cd.mgr ? cd.mgr.g + cd.mgr.a + cd.mgr.c : null, cdS = cd.self ? cd.self.g + cd.self.a + cd.self.c : null;
  // totals
  let total, selfTotal, model;
  if (isTL && state.rules.tlModel === 'TL-B') {
    const lead = cd.mgr && cd.mgr.lead != null ? cd.mgr.lead : null;
    total = deliverables != null && cdM != null && lead != null ? r1(deliverables + lead + cdM * 20 / 15) : null;
    selfTotal = null; model = 'TL-B';
  } else {
    total = deliverables != null && projects != null && cdM != null ? r1(deliverables + projects + cdM) : null;
    selfTotal = deliverables != null && projectsSelf != null && cdS != null ? r1(deliverables + projectsSelf + cdS) : null;
    model = isTL ? 'TL-A' : 'IC';
  }
  const delPartial = deliverables != null ? deliverables : (isSup ? 0 : (ownDel.raw || 0));
  const partial = r1(delPartial + (projects || 0) + (cdM || 0));
  // ratings
  const histAll = state.assessments[id] || [];
  // a period counts once the TA Head has rated it; a missing self-rating shows as "—"
  const hist = histAll.filter(a => !a.mgrPending);
  const inProgress = histAll.find(a => a.mgrPending || a.selfPending) || null;
  const latest = hist[hist.length - 1];
  const baseline = hist[0];
  const gaps = latest ? COMPETENCIES.map(c => latest.self[c] != null ? latest.self[c] - latest.mgr[c] : null) : [];
  const vol = own.expectedFormal ? own.actualFormal / own.expectedFormal : null;
  const teamVol = team && team.expectedFormal ? team.actualFormal / team.expectedFormal : null;
  // Attainment drives status: weighted points vs points target when assessing on points, else offer volume.
  const attOf = b => !b ? null : pointsBasis() ? (b.pointsTargetFormal && b.pointsFormal != null ? b.pointsFormal / b.pointsTargetFormal : null) : (b.expectedFormal ? b.actualFormal / b.expectedFormal : null);
  const att = attOf(own), teamAtt = attOf(team);
  const statusVol = isTL ? (teamAtt != null && att != null ? Math.min(teamAtt, att) : att) : att;
  const noData = mode === 'tx' && !txOffers.length && !(isTL && team && team.actualYTD);
  const status = isSup || noData || statusVol == null ? 'none' : statusVol >= 1 ? 'good' : statusVol >= .85 ? 'watch' : 'below';
  const res = { e, role, mode, isSup, isTL, target, own, ownDel, team, teamDel, deliverables, projects, projectsSelf, cdM, cdS, cd, total, selfTotal, partial, model,
    projs, hist, inProgress, latest, baseline, gaps, vol, teamVol, att, teamAtt, ppo, ptOverride, status, provisional: anyPending() };
  _cache[key] = res;
  return res;
}
function aggregateBlocks(blocks, members) {
  const all = [].concat(...blocks.map(b => b.offers));
  const nCycles = Math.max(0, ...blocks.map(b => b.cycles.length));
  const cycles = [];
  for (let i = 0; i < nCycles; i++) {
    const cs = blocks.map(b => b.cycles[i]).filter(Boolean);
    cycles.push({ n: i + 1, from: cs[0].from, to: cs[0].to, closed: cs.every(c => c.closed), target: sum(cs.map(c => c.target)), pointsTarget: sum(cs.map(c => c.pointsTarget || 0)), offers: sum(cs.map(c => c.offers)), points: sum(cs.map(c => c.points)) });
  }
  const expectedFormal = sum(blocks.map(b => b.expectedFormal)), actualFormal = sum(blocks.map(b => b.actualFormal)), pointsFormal = sum(blocks.map(b => b.pointsFormal));
  const matured = all.filter(o => o.expJoin <= PERIOD.cutoff && o.status !== 'Revoked');
  const joined = matured.filter(o => o.status === 'Joined').length;
  const jr = matured.length ? joined / matured.length * 100 : null;
  const ctAll = all.map(cycleDays), ctScored = all.filter(o => !(o.exc && o.exc.status === 'Approved')).map(cycleDays);
  const applicable = all.filter(o => !state.rules.vendorExcluded.includes(o.cat)), vend = applicable.filter(o => o.source === 'Vendor').length;
  const vp = applicable.length ? vend / applicable.length * 100 : null;
  const pointsTargetFormal = sum(blocks.map(b => b.pointsTargetFormal || 0));
  return { members: members.map(m => m.id), cycles, expectedFormal, actualFormal, pointsFormal, pointsTargetFormal, offer: offerScore(expectedFormal, actualFormal, pointsFormal, pointsTargetFormal),
    expectedYTD: sum(blocks.map(b => b.expectedYTD)), actualYTD: all.length, pointsYTD: sum(blocks.map(b => b.pointsYTD)),
    matured: matured.length, joined, jr, jrScore: jrScore(jr), ctAvg: avg(ctScored), ctMedian: median(ctAll), ctScore: ctScore(avg(ctScored)),
    applicable: applicable.length, vendor: vend, vendorPct: vp, vendorScore: vendorScore(vp), offers: all };
}
function anyPending() { return Object.values(state.rules.status).some(s => s[0] === 'pending'); }

// ---------- exceptions ----------
function exceptionsList() {
  const R = state.rules, out = [];
  const add = (e, type, measure, value, threshold, action, sev) => out.push({ emp: e.id, name: e.name, team: e.team, type, measure, value, threshold, action, sev });
  for (const e of state.employees) {
    const m = metrics(e.id), b = m.own;
    const lastClosed = b.cycles.filter(c => c.closed).slice(-1)[0];
    if (lastClosed && (pointsBasis() ? lastClosed.points < lastClosed.pointsTarget : lastClosed.offers < lastClosed.target)) add(e, 'Below cadence', 'Last closed 10-day cycle', pointsBasis() ? r1(lastClosed.points) + ' points (' + lastClosed.offers + ' offers)' : lastClosed.offers + ' offers', 'Target ' + r1(pointsBasis() ? lastClosed.pointsTarget : lastClosed.target) + (pointsBasis() ? ' points' : ''), 'Review pipeline in next 1:1', 2);
    if (m.mode === 'summary' && b.pointsFormal == null) add(e, 'Points missing', 'Summary scorecard', 'No weighted points', 'Needed for the 40-point score', 'Enter points or import offer data', 2);
    if (b.missRun >= R.repeatMissN) add(e, 'Repeated 10-day misses', 'Consecutive missed cycles', b.missRun + ' cycles', '≥ ' + R.repeatMissN, 'Agree a recovery plan', 1);
    if (b.jr != null && b.jr < R.jrException) add(e, 'Joining ratio below threshold', 'Joining ratio', r1(b.jr) + '%', '< ' + R.jrException + '%', 'Review declines and no-shows', 2);
    if (b.ctAvg != null && b.ctAvg > R.ctBands.acceptable) add(e, 'Cycle time > 55 days', 'Avg req-to-offer', r1(b.ctAvg) + ' days', '> ' + R.ctBands.acceptable, 'Check ageing reqs and exception requests', 2);
    if (b.vendorPct != null && b.vendorPct > R.vendorBands.high) add(e, 'Vendor usage > 20%', 'Vendor share', r1(b.vendorPct) + '%', '> ' + R.vendorBands.high + '%', 'Review sourcing mix', 3);
    for (const p of m.projs) if (p.planEnd && p.planEnd < PERIOD.cutoff && p.stage < 4 && !/complete/i.test(p.reported || '')) add(e, 'Project past planned end', p.title, 'Planned end ' + D.nice(p.planEnd), p.reported || 'Not complete', 'Agree a revised date or close-out', 2);
    for (const f of e.flags || []) add(e, 'Data to confirm', f, '', '', 'Confirm or correct in Team Setup', 3);
    if (isFormer(e) && !e.end) add(e, 'Leaving date missing', 'Former team member', '—', '', 'Add leaving date so targets are pro-rated', 2);
    for (const p of m.projs) if (p.lastValidated && p.stage < 4 && D.diff(PERIOD.cutoff, p.lastValidated) > R.stalledDays) add(e, 'Stalled DMAIC project', p.title, D.diff(PERIOD.cutoff, p.lastValidated) + ' days since validation', '> ' + R.stalledDays + ' days', 'Agree next stage evidence', 2);
    if (m.latest) COMPETENCIES.forEach(c => {
      const t = e.targets[c], v = m.latest.mgr[c];
      if (t - v > R.belowTargetBy) add(e, 'Competency below target', c, 'Rating ' + v, 'Target ' + t, 'Add IDP action', 3);
      const g = m.latest.self[c] != null ? m.latest.self[c] - v : 0;
      if (Math.abs(g) > R.gapThreshold) add(e, 'Self vs TA Head gap > 1', c, 'Self ' + m.latest.self[c] + ' / TA Head ' + v, 'Gap > ' + R.gapThreshold, 'Discuss evidence in coaching', 3);
    });
    for (const i of state.idp[e.id] || []) if (i.status !== 'Completed' && i.due < PERIOD.cutoff) add(e, 'Overdue development action', i.area, 'Due ' + D.nice(i.due), 'Past due', 'Follow up', 2);
  }
  for (const r of state.requests) if (['Sent', 'Viewed'].includes(r.status) && r.due < PERIOD.cutoff) { const e = emp(r.emp); add(e, 'Overdue employee request', r.type, 'Due ' + D.nice(r.due), 'Past due', 'Send reminder', 3); }
  for (const o of state.offers) if (o.exc && o.exc.status === 'Requested') { const e = emp(o.emp); if (e) add(e, 'Cycle-time exception to approve', o.req, cycleDays(o) + ' days', o.exc.reason, 'Open member → View offers → Exception', 1); }
  for (const b of state.batches) if (b.status === 'Awaiting approval') out.push({ emp: '', name: '—', team: '', type: 'Import awaiting approval', measure: b.id, value: b.added + ' rows', threshold: '', action: 'Review and approve', sev: 1 });
  return out.sort((a, b) => a.sev - b.sev);
}

// ---------- promotion readiness (illustrative criteria, D-30) ----------
function promotion(id) {
  const m = metrics(id), e = m.e, crit = [];
  const ratingsKnown = e.ratings.filter(Boolean);
  const last2 = e.ratings.slice(0, 2);
  const strongRatings = last2.every(r => r && RATING_VALUE[r] >= 4);
  crit.push({ ok: strongRatings, label: 'Last two annual ratings at Exceeds or above', fact: 'Ratings: ' + e.ratings.map((r, i) => (PERIOD.year - 1 - i) + ' ' + (r || 'n/a')).join(' · ') });
  const score = m.total != null ? m.total : m.partial;
  crit.push({ ok: score >= 80, label: 'Current-year score ≥ 80 (provisional)', fact: (m.total != null ? 'Total ' : 'Partial total ') + score + ' / 100' });
  const strong = m.latest ? COMPETENCIES.filter(c => m.latest.mgr[c] >= 4) : [];
  crit.push({ ok: strong.length >= 3, label: '≥ 3 competencies at next-level expectation (TA Head rating ≥ 4)', fact: strong.length ? strong.length + ': ' + strong.join(', ') : 'None at 4 or above' });
  const yrs = e.since ? D.diff(PERIOD.cutoff, e.since) / 365.25 : null;
  crit.push({ ok: yrs != null && yrs >= 2, label: '≥ 2 years in current level', fact: yrs == null ? 'Job level / date in level not recorded' : r1(yrs) + ' years in ' + e.level });
  const lead = (m.latest && m.latest.mgr['Collaboration & Leadership'] >= 4) || m.projs.some(p => p.stage >= 3 && p.mgrScore);
  crit.push({ ok: lead, label: 'Leadership evidence (Collaboration & Leadership ≥ 4, or project validated to Improve)', fact: 'Collab & Leadership ' + (m.latest ? m.latest.mgr['Collaboration & Leadership'] : 'n/a') + '; best project stage ' + (m.projs.length ? DMAIC[Math.max(...m.projs.map(p => p.stage))] : 'none') });
  const met = crit.filter(c => c.ok).length;
  let level, rank;
  if (isFormer(e)) { level = 'Not assessed (former team member)'; rank = 5; }
  else if (isSupport(e) && m.total == null && m.partial === 0) { level = 'Insufficient evidence'; rank = 4; }
  else if (ratingsKnown.length < 2) { level = 'Insufficient evidence'; rank = 4; }
  else if (met === 5) { level = 'Ready now'; rank = 1; }
  else if (met >= 4 || (met === 3 && strongRatings)) { level = 'Ready in 6–12 months'; rank = 2; }
  else { level = 'Develop in current role'; rank = 3; }
  if (e.level === JOB_LEVELS[JOB_LEVELS.length - 1]) { level += ' (top of framework)'; }
  const nextLevel = JOB_LEVELS.includes(e.level) ? (JOB_LEVELS[JOB_LEVELS.indexOf(e.level) + 1] || '—') : '—';
  return { crit, met, level, rank, nextLevel, yrs };
}

// ---------- recommendations (rule-based; FACT vs SUGGESTION) ----------
function recommendations(id) {
  const m = metrics(id), b = m.own, out = [];
  const R = state.rules;
  if (m.att != null && m.att < .85) out.push({ area: 'Delivery', fact: pointsBasis() ? `Weighted points are ${Math.round(m.att * 100)}% of the points target (${r1(b.pointsFormal)} of ${r1(b.pointsTargetFormal)}; ${b.actualFormal} offers).` : `Volume attainment is ${Math.round(m.att * 100)}% of the closed-cycle target (${b.actualFormal} of ${r1(b.expectedFormal)} offers).`, suggestion: pointsBasis() && b.actualYTD && b.pointsYTD / b.actualYTD < state.rules.pointsPerOffer ? `Average ${r1(b.pointsYTD / b.actualYTD)} points per offer, below the ${state.rules.pointsPerOffer} assumed in the target: discuss the hiring mix and whether the area's points-per-offer should differ.` : 'Agree a 2-cycle recovery plan: weekly pipeline review and early escalation of stalled requisitions.', vis: 'all' });
  if (b.ctAvg != null && b.ctAvg > R.ctBands.acceptable) out.push({ area: 'Cycle time', fact: `Average req-to-offer cycle time is ${r1(b.ctAvg)} days (median ${r1(b.ctMedian)}).`, suggestion: 'Consider a requisition-ageing improvement project; record approved exceptions for genuine business holds.', vis: 'all' });
  if (b.jr != null && b.jr < R.jrException) out.push({ area: 'Joining', fact: `Joining ratio is ${r1(b.jr)}% (${b.joined} of ${b.matured} matured offers).`, suggestion: 'Introduce pre-joining engagement touchpoints and review decline reasons monthly.', vis: 'all' });
  if (b.vendorPct != null && b.vendorPct > R.vendorBands.high) out.push({ area: 'Sourcing', fact: `Vendor usage is ${r1(b.vendorPct)}% of applicable hires.`, suggestion: 'Build direct-sourcing pipelines (referrals, talent communities) for repeat roles.', vis: 'all' });
  if (m.latest) {
    const gapsT = COMPETENCIES.map(c => ({ c, g: m.e.targets[c] - m.latest.mgr[c] })).filter(x => x.g > 0).sort((a, b) => b.g - a.g).slice(0, 2);
    for (const x of gapsT) { const L = IDP_LIBRARY[x.c]; out.push({ area: x.c, fact: `TA Head rating ${m.latest.mgr[x.c]} vs target ${m.e.targets[x.c]}.`, suggestion: `Training: ${L[0]}. Stretch: ${L[2]}. Apply: ${L[3]}.`, vis: 'all' }); }
    const big = COMPETENCIES.filter(c => m.latest.self[c] != null && Math.abs(m.latest.self[c] - m.latest.mgr[c]) > R.gapThreshold);
    if (big.length) out.push({ area: 'Calibration', fact: `Self and TA Head ratings differ by more than ${R.gapThreshold} level on: ${big.join(', ')}.`, suggestion: 'Discuss specific evidence for these competencies in the next coaching conversation.', vis: 'all' });
  }
  const strong = m.latest ? COMPETENCIES.filter(c => m.latest.mgr[c] >= 4) : [];
  if (strong.length) out.push({ area: 'Strength', fact: `Rated 4+ by TA Head on: ${strong.join(', ')}.`, suggestion: 'Use as an internal coach or panel member for these areas.', vis: 'all' });
  if (m.isTL && m.team) out.push({ area: 'Team leadership', fact: `Team ${pointsBasis() ? 'points' : 'volume'} attainment ${m.teamAtt != null ? Math.round(m.teamAtt * 100) + '%' : 'n/a'}; team joining ratio ${r1(m.team.jr)}%; team avg cycle ${r1(m.team.ctAvg)} days.`, suggestion: m.teamAtt != null && m.teamAtt < 1 ? 'Focus coaching on the members with the largest cadence gaps; review weekly team pipeline.' : 'Share team practices with other TA teams; consider broader scope.', vis: 'all' });
  const pr = promotion(id);
  out.push({ area: 'Promotion (confidential)', fact: pr.crit.map(c => (c.ok ? '✓ ' : '✕ ') + c.label + ' — ' + c.fact).join('\n'), suggestion: `Advisory readiness: ${pr.level}. Next level: ${pr.nextLevel}. Final decision rests with the TA Head and HR process.`, vis: 'head' });
  return out;
}
