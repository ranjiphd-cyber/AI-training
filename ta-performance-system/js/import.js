/* Data import: paste or upload → map → validate → review/fix → approve → publish → share.
   Calculated fields (points, cycle time, maturity) are never taken from the file. */

const IMPORT_DATASETS = {
  offers: { label: 'Offers (from ATS / tracker)', roles: ['head', 'importer'], fields: [
    ['emp', 'Recruiter Employee ID', true, ['recruiter', 'recruiter id', 'recruiter employee id', 'employee id', 'emp id', 'recruiter name', 'owner']],
    ['cand', 'Candidate ID', true, ['candidate id', 'candidate', 'cand id', 'applicant id']],
    ['req', 'Requisition ID', true, ['requisition id', 'req id', 'requisition', 'job id', 'req']],
    ['area', 'Business Area', false, ['business area', 'business unit', 'bu', 'area']],
    ['cat', 'Hiring Category', true, ['hiring category', 'category', 'hiring type', 'type']],
    ['sg', 'SG Level', false, ['sg level', 'sg', 'grade', 'salary grade', 'band']],
    ['gender', 'Gender', true, ['gender', 'sex']],
    ['reqDate', 'Requisition Created Date', true, ['requisition created date', 'req created date', 'req date', 'requisition date', 'req creation date', 'requisition creation date']],
    ['offerDate', 'Offer Release Date', true, ['offer release date', 'offer date', 'offer released', 'offer released date']],
    ['expJoin', 'Expected Joining Date', true, ['expected joining date', 'expected doj', 'expected join date', 'doj expected', 'tentative doj']],
    ['actJoin', 'Actual Joining Date', false, ['actual joining date', 'actual doj', 'doj', 'joining date', 'joined date']],
    ['status', 'Joining Status', false, ['joining status', 'status', 'offer status']],
    ['source', 'Source', true, ['source', 'sourcing channel', 'channel']],
    ['vendor', 'Vendor Name', false, ['vendor name', 'vendor', 'agency']],
    ['excFlag', 'Exception Flag', false, ['exception flag', 'exception']],
    ['excReason', 'Exception Reason', false, ['exception reason']],
    ['_points', 'Total Points (ignored — calculated)', false, ['total points', 'points', 'total weighted points', 'weighted points']],
    ['_ct', 'Cycle Time (ignored — calculated)', false, ['cycle time', 'cycle time (days)', 'tat']],
  ] },
  profile: { label: 'Employee profile & ratings (TA Head only)', roles: ['head'], fields: [
    ['id', 'Employee ID', true, ['employee id', 'emp id', 'id']], ['name', 'Employee Name', true, ['employee name', 'name', 'full name']],
    ['team', 'TA Team', true, ['ta team', 'team']], ['area', 'Business Area', true, ['business area', 'area', 'bu']],
    ['type', 'Role', true, ['role type', 'role', 'ic/tl', 'type']], ['level', 'Job Level', false, ['job level', 'level', 'grade']],
    ['also', 'Also Supports (teams, ; separated)', false, ['also supports', 'also supports teams', 'secondary team', 'secondary teams']],
    ['status', 'Status (Active / Former)', false, ['status', 'employment status']], ['end', 'Leaving Date', false, ['leaving date', 'end date', 'exit date', 'last working day']],
    ['flags', 'Notes to Confirm', false, ['notes to confirm', 'to confirm', 'notes']],
    ['since', 'Date In Current Level', false, ['date in current level', 'in level since', 'level since']],
    ['start', 'Start Date (if mid-year)', false, ['start date', 'joining date', 'doj']],
    ['r1', 'Rating Year-1', false, ['rating year-1', 'rating y-1', 'rating ' + (PERIOD.year - 1), 'last year rating']],
    ['r2', 'Rating Year-2', false, ['rating year-2', 'rating y-2', 'rating ' + (PERIOD.year - 2)]],
    ['r3', 'Rating Year-3', false, ['rating year-3', 'rating y-3', 'rating ' + (PERIOD.year - 3)]],
  ] },
  ratings: { label: 'Competency ratings (self or TA Head)', roles: ['head'], fields: [
    ['emp', 'Employee ID', true, ['employee id', 'emp id', 'employee', 'name']], ['period', 'Assessment Period', true, ['assessment period', 'period', 'quarter']],
    ['comp', 'Competency', true, ['competency']], ['by', 'Rated By (Self / TA Head)', true, ['rated by', 'rater', 'by']],
    ['rating', 'Rating (1-5)', true, ['rating', 'ta head rating', 'self rating', 'score']], ['target', 'Target Rating', false, ['target rating', 'target']],
    ['evidence', 'Evidence / Comment', false, ['evidence / comment', 'evidence', 'comment']],
  ] },
  scorecard: { label: 'Recruiter scorecard (YTD summary per person)', roles: ['head', 'importer'], fields: [
    ['emp', 'Employee ID', true, ['employee id', 'emp id', 'recruiter', 'employee', 'name']], ['asOf', 'As Of Date', true, ['as of date', 'as of', 'data cut-off', 'cutoff']],
    ['target', 'Annual Target', false, ['annual target', 'target']], ['offers', 'Offers', true, ['offers', 'offers released', 'total offers']], ['joiners', 'Joiners', true, ['joiners', 'joined', 'total joiners']],
    ['offerDays', 'Offer Days (avg req-to-offer)', false, ['offer days', 'days to offer', 'avg offer days', 'cycle time']], ['joinDays', 'Join Days', false, ['join days', 'days to join']],
    ['declinedPct', 'Declined %', false, ['declined %', 'declined', 'decline %']], ['diversityPct', 'Diversity %', false, ['diversity %', 'diversity', 'gender diversity %']],
    ['vendorPct', 'Vendor %', false, ['vendor %', 'vendor', 'vendor usage %']], ['referralPct', 'Referral %', false, ['referral %', 'referral', 'referrals %']],
    ['oCore', 'Offers Core / Campus', false, ['offers core / campus', 'offers core']], ['oNats', 'Offers NATS', false, ['offers nats']], ['oExcel', 'Offers ExcelHER', false, ['offers excelher']], ['oOther', 'Offers Other', false, ['offers other']],
    ['jCore', 'Joiners Core / Campus', false, ['joiners core / campus', 'joiners core']], ['jNats', 'Joiners NATS', false, ['joiners nats']], ['jExcel', 'Joiners ExcelHER', false, ['joiners excelher']], ['jOther', 'Joiners Other', false, ['joiners other']],
    ['source', 'Source', false, ['source']], ['note', 'Note', false, ['note', 'notes']],
  ] },
  learning: { label: 'Learning records (LMS export)', roles: ['head', 'importer'], fields: [
    ['emp', 'Employee ID', true, ['employee id', 'emp id', 'employee', 'name']], ['programme', 'Programme', true, ['programme', 'program', 'course', 'course name']],
    ['provider', 'Provider', false, ['provider', 'vendor']], ['type', 'Training Type', false, ['training type', 'type', 'mode']],
    ['start', 'Start Date', false, ['start date', 'start']], ['completion', 'Completion Date', false, ['completion date', 'completed on', 'end date']],
    ['cert', 'Certification Obtained', false, ['certification obtained', 'certified', 'certification']], ['skill', 'Skills Addressed', false, ['skills addressed', 'skill', 'competency']],
    ['status', 'Status', false, ['status']], ['application', 'Application Example', false, ['application example', 'application']],
  ] },
};
const PII_HEADERS = /^(candidate name|name of candidate|applicant name|phone|mobile|email|e-mail|contact|address|pan|aadhaar|dob|date of birth)$/i;
const CAT_ALIASES = { 'get': 'GET / PGET', 'pget': 'GET / PGET', 'get/pget': 'GET / PGET', 'nats': 'NATS Hiring', 'nats hiring': 'NATS Hiring', 'nats conversion': 'NATS Conversion', 'contract conversion': 'Contract Conversion', 'ftc': 'FTC', 'fixed term contract': 'FTC', 'excelher': 'ExcelHER', 'pmis': 'PMIS', 'lateral sg1-sg4': 'Lateral SG1-SG4', 'lateral sg1-4': 'Lateral SG1-SG4', 'lateral sg5-sg8': 'Lateral SG5-SG8', 'lateral sg5-8': 'Lateral SG5-SG8', 'sg9 and above': 'SG9 and above', 'sg9+': 'SG9 and above', 'lateral sg9+': 'SG9 and above', 'phd internship': 'PhD Internship', 'phd internship hiring': 'PhD Internship', 'aicte professor': 'AICTE Professor', 'aicte professor hiring': 'AICTE Professor' };
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

function normDate(v) {
  v = String(v || '').trim(); if (!v) return '';
  let m;
  if ((m = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) return iso(m[1], m[2], m[3]);
  if ((m = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) return iso(m[3], m[2], m[1]); // DD/MM/YYYY (India)
  if ((m = v.match(/^(\d{1,2})[-\s]([A-Za-z]{3})[A-Za-z]*[-\s,]+(\d{2,4})$/))) return iso(m[3].length === 2 ? '20' + m[3] : m[3], MONTHS[m[2].toLowerCase()], m[1]);
  if (/^\d{5}$/.test(v)) return D.fmt(Date.UTC(1899, 11, 30) + (+v) * 86400000); // Excel serial
  return 'INVALID:' + v;
}
function iso(y, mo, d) { if (!mo) return 'INVALID'; const s = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`; return D.valid(s) ? s : 'INVALID:' + s; }

function parseDelimited(text) {
  text = text.replace(/\r\n?/g, '\n').replace(/^﻿/, '');
  const first = text.split('\n')[0];
  const delim = first.includes('\t') ? '\t' : (first.split(';').length > first.split(',').length ? ';' : ',');
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"' && cell === '') q = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== '')).map(r => r.map(c => c.trim()));
}

function impState() { return ui.imp = ui.imp || { dataset: ui.impDataset || 'offers', step: 1 }; }
function resetImport(ds) { ui.imp = { dataset: ds || impState().dataset, step: 1 }; delete ui.impDataset; render(); }

VIEWS.import = () => {
  const im = impState();
  if (ui.impDataset) { im.dataset = ui.impDataset; im.step = 1; delete ui.impDataset; }
  const allowed = Object.entries(IMPORT_DATASETS).filter(([k, d]) => d.roles.includes(ui.role));
  if (!allowed.find(([k]) => k === im.dataset)) im.dataset = allowed[0][0];
  const steps = ['Source', 'Map columns', 'Review & fix', 'Approve', 'Share'];
  let h = `<div class="pagehead"><div class="grow"><h1>Data import</h1><p class="muted">Paste from Excel or upload a CSV. You will see every row before anything is saved. Calculated fields are always recalculated by the system.</p></div></div>
   <div class="steps">${steps.map((s, i) => `<span class="${im.step === i + 1 ? 'on' : im.step > i + 1 ? 'done' : ''}">${i + 1}. ${s}</span>`).join('')}</div>`;
  if (im.step === 1) h += impStep1(allowed);
  else if (im.step === 2) h += impStep2();
  else if (im.step === 3) h += impStep3();
  else if (im.step === 4) h += impStep4();
  else if (im.step === 5) h += impStep5();
  h += batchHistory();
  return h;
};

function impStep1(allowed) {
  const im = impState(), ds = IMPORT_DATASETS[im.dataset];
  return `<section class="card"><div class="formgrid"><label class="field">What are you importing?<select onchange="resetImport(this.value)">${allowed.map(([k, d]) => `<option value="${k}" ${k === im.dataset ? 'selected' : ''}>${esc(d.label)}</option>`).join('')}</select></label>
   <label class="field">Template<span><button class="btn sm" onclick="downloadTemplate('${im.dataset}')">Download CSV template</button></span></label></div>
   <div class="tabs" style="margin-top:12px"><button class="${im.src !== 'file' ? 'on' : ''}" onclick="impState().src='paste';render()">Copy &amp; paste</button><button class="${im.src === 'file' ? 'on' : ''}" onclick="impState().src='file';render()">Upload file</button></div>
   ${im.src === 'file' ? `<p>Upload a <b>.csv</b> or tab-separated <b>.txt</b> file with a header row. For Excel files, use <i>File → Save As → CSV</i>, or copy the cells and use Copy &amp; paste.</p><input type="file" accept=".csv,.txt,.tsv" onchange="impFile(this.files[0])">`
    : `<p class="small">Select the cells in Excel <b>including the header row</b>, copy, and paste below.</p><textarea id="imp-paste" rows="10" placeholder="Paste here…" class="mono"></textarea>
       <div class="actions" style="margin-top:8px"><button class="btn pri" onclick="impParse(document.getElementById('imp-paste').value,'Pasted data')">Continue</button>${im.dataset === 'offers' ? `<button class="btn" onclick="impParse(sampleImportText(),'Example with errors')">Try an example (includes errors)</button>` : ''}</div>`}
   <p class="small muted" style="margin-top:10px">Fields: ${ds.fields.filter(f => f[0][0] !== '_').map(f => esc(f[1]) + (f[2] ? '*' : '')).join(' · ')}. * required. Dates may be YYYY-MM-DD, DD/MM/YYYY or 12-Sep-2026. Do not include candidate names, phone numbers or e-mails.</p></section>`;
}
function downloadTemplate(k) { const ds = IMPORT_DATASETS[k]; download(`${k}_import_template.csv`, toCSV([ds.fields.filter(f => f[0][0] !== '_').map(f => f[1])]), 'text/csv'); }
function impFile(f) { if (!f) return; const rd = new FileReader(); rd.onload = () => impParse(rd.result, f.name); rd.readAsText(f); }
function impParse(text, source) {
  const rows = parseDelimited(text || '');
  if (rows.length < 2) { toast('Need a header row and at least one data row.'); return; }
  const im = impState(), ds = IMPORT_DATASETS[im.dataset];
  im.headers = rows[0]; im.rows = rows.slice(1); im.source = source; im.records = null;
  im.pii = im.headers.filter(h => PII_HEADERS.test(h));
  im.mapping = {};
  const norm = s => s.toLowerCase().replace(/[_*]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const [k, label, , aliases] of ds.fields) {
    const idx = im.headers.findIndex(hd => norm(hd) === norm(label) || aliases.includes(norm(hd)));
    if (idx >= 0) im.mapping[k] = idx;
  }
  im.step = 2; render();
}
function impStep2() {
  const im = impState(), ds = IMPORT_DATASETS[im.dataset];
  const missing = ds.fields.filter(f => f[2] && im.mapping[f[0]] == null);
  return `<section class="card"><header><h2>Map columns</h2><span class="muted small">${esc(im.source)} · ${im.rows.length} rows · ${im.headers.length} columns</span></header>
   ${im.pii.length ? `<div class="note warn"><b>Personal data detected:</b> ${im.pii.map(esc).join(', ')}. These columns will be <b>blocked</b> (V15). Remove them from the source and re-import; only Candidate ID is allowed.</div>` : ''}
   <div class="tbl-wrap"><table><thead><tr><th>System field</th><th>Your column</th><th>First value</th></tr></thead><tbody>
   ${ds.fields.map(([k, label, req]) => `<tr><td>${esc(label)}${req ? ' *' : ''}${k[0] === '_' ? ' <span class="tag calc">calculated</span>' : ''}</td><td><select onchange="impState().mapping['${k}']=this.value===''?null:+this.value;render()"><option value="">— not mapped —</option>${im.headers.map((hd, i) => `<option value="${i}" ${im.mapping[k] === i ? 'selected' : ''}>${esc(hd)}</option>`).join('')}</select></td><td class="small mono">${im.mapping[k] != null ? esc(im.rows[0][im.mapping[k]] || '') : ''}</td></tr>`).join('')}</tbody></table></div>
   <div class="actions" style="margin-top:10px"><button class="btn" onclick="impState().step=1;render()">Back</button><button class="btn pri" ${missing.length || im.pii.length ? 'disabled' : ''} onclick="impState().records=null;impValidate();impState().step=3;render()">Validate ${im.rows.length} rows</button>
   ${missing.length ? `<span class="small" style="color:var(--bad)">Map required fields: ${missing.map(f => esc(f[1])).join(', ')}</span>` : ''}</div></section>`;
}

// ---------- validation ----------
function impValidate() {
  const im = impState(), ds = IMPORT_DATASETS[im.dataset];
  if (!im.records) {
    im.records = im.rows.map((r, i) => { const v = {}; ds.fields.forEach(([k]) => { v[k] = im.mapping[k] != null ? (r[im.mapping[k]] || '') : ''; }); return { n: i + 2, v, excluded: false }; });
  }
  const fn = { offers: validateOffer, profile: validateProfile, ratings: validateRating, learning: validateLearning, scorecard: validateScorecard }[im.dataset];
  const seen = {};
  for (const rec of im.records) { rec.msgs = []; rec.norm = {}; fn(rec, seen); rec.status = rec.msgs.some(m => m[0] === 'E') ? 'error' : rec.msgs.length ? 'warn' : 'ok'; }
}
function findEmp(v) { v = String(v || '').trim(); return state.employees.find(e => e.id.toLowerCase() === v.toLowerCase() || e.name.toLowerCase() === v.toLowerCase()); }
function validateOffer(rec, seen) {
  const v = rec.v, n = rec.norm, E = m => rec.msgs.push(['E', m]), W = m => rec.msgs.push(['W', m]);
  const e = findEmp(v.emp); if (!e) E('V4 Unknown recruiter "' + v.emp + '"'); else n.emp = e.id;
  if (!v.cand) E('Candidate ID missing'); if (!v.req) E('Requisition ID missing');
  n.cand = v.cand; n.req = v.req;
  const key = (v.cand + '|' + v.req).toLowerCase();
  if (v.cand && v.req) { if (seen[key]) E('V1 Duplicate Candidate + Requisition in file (row ' + seen[key] + ')'); else seen[key] = rec.n; }
  const ex = state.offers.find(o => o.cand.toLowerCase() === String(v.cand).toLowerCase() && o.req.toLowerCase() === String(v.req).toLowerCase());
  if (ex) { W('V2 Already published — will update existing record'); n._existing = ex.id; }
  const other = state.offers.find(o => o.cand.toLowerCase() === String(v.cand).toLowerCase() && n.emp && o.emp !== n.emp && o.req.toLowerCase() !== String(v.req).toLowerCase());
  if (other) W('V3 Same candidate recorded under another recruiter — TA Head to decide credit (D-37)');
  const cat = CATEGORIES.find(c => c.toLowerCase() === String(v.cat).toLowerCase()) || CAT_ALIASES[String(v.cat).toLowerCase().trim()];
  if (!cat) E('V4 Unknown hiring category "' + v.cat + '"'); n.cat = cat;
  let area = v.area;
  if (!area && e) { area = e.area; W('Business area missing — used recruiter\'s area (' + e.area + ')'); }
  const areaMatch = Object.keys(AREAS).find(a => a.toLowerCase() === String(area).toLowerCase());
  if (!areaMatch) E('V4 Unknown business area "' + area + '"'); n.area = areaMatch;
  const sg = String(v.sg || '').toUpperCase().replace(/\s/g, ''); const sgNum = parseInt(sg.replace('SG', ''));
  if (cat && SG_REQUIRED.includes(cat)) {
    if (!sg) E('V5 SG level required for ' + cat);
    else if (isNaN(sgNum) || sgNum < 1 || sgNum > 20) E('V5 Invalid SG "' + v.sg + '"');
    else if ((cat === 'Lateral SG1-SG4' && sgNum > 4) || (cat === 'Lateral SG5-SG8' && (sgNum < 5 || sgNum > 8)) || (cat === 'SG9 and above' && sgNum < 9)) E('V5 SG' + sgNum + ' does not match category ' + cat);
  }
  n.sg = sg && !isNaN(sgNum) ? 'SG' + sgNum : '';
  const g = String(v.gender || '').trim().toLowerCase();
  n.gender = ['f', 'female', 'woman', 'w'].includes(g) ? 'Female' : ['m', 'male', 'man'].includes(g) ? 'Male' : g ? 'Undisclosed' : '';
  if (!n.gender) E('Gender missing'); else if (n.gender === 'Undisclosed') W('Gender "' + v.gender + '" — no women bonus applied (values pending D-36)');
  if (cat === 'ExcelHER' && n.gender === 'Male') W('ExcelHER offer recorded as Male — please check');
  for (const k of ['reqDate', 'offerDate', 'expJoin', 'actJoin']) { const d = normDate(v[k]); if (d.startsWith('INVALID')) E('V6 Unreadable date "' + v[k] + '"'); else n[k] = d; }
  if (!n.reqDate) E('V6 Requisition date missing'); if (!n.offerDate) E('V6 Offer date missing'); if (!n.expJoin) E('V6 Expected joining date missing');
  if (n.offerDate && n.reqDate && n.offerDate < n.reqDate) E('V8 Offer before requisition created (negative cycle time)');
  if (n.offerDate && n.expJoin && n.expJoin < n.offerDate) E('V7 Expected joining before offer date');
  if (n.offerDate && n.actJoin && n.actJoin < n.offerDate) E('V7 Actual joining before offer date');
  if (n.offerDate && n.offerDate > PERIOD.cutoff) W('V12 Offer date after data cut-off');
  if (n.offerDate && n.offerDate < PERIOD.start) W('V12 Offer date before review period');
  if (n.offerDate && n.reqDate && D.diff(n.offerDate, n.reqDate) > 180) W('V14 Cycle time over 180 days — check dates');
  const st = String(v.status || '').trim().toLowerCase();
  const stMap = { joined: 'Joined', pending: 'Pending', declined: 'Declined', 'no-show': 'No-show', 'no show': 'No-show', noshow: 'No-show', revoked: 'Revoked', deferred: 'Deferred', 'offer declined': 'Declined', accepted: 'Pending' };
  n.status = stMap[st] || (st ? null : '');
  if (n.status === null) E('Unknown joining status "' + v.status + '"');
  if (!n.status) { if (n.actJoin) n.status = 'Joined'; else if (n.expJoin && n.expJoin <= PERIOD.cutoff) E('V10 Matured offer without joining status'); else n.status = 'Pending'; }
  if (n.status === 'Joined' && !n.actJoin) W('Joined without actual joining date');
  const src = String(v.source || '').trim().toLowerCase();
  n.source = src.includes('vendor') || src.includes('agency') || src.includes('consult') ? 'Vendor' : src.includes('refer') ? 'Referral' : src.includes('campus') ? 'Campus' : src.includes('internal') ? 'Internal' : src ? (src === 'direct' ? 'Direct' : 'Other') : '';
  if (!n.source) E('Source missing');
  n.vendor = v.vendor; if (n.source === 'Vendor' && !v.vendor) W('V13 Vendor source without vendor name');
  if (v._points && cat && n.gender) { const calc = pointsFor({ cat, gender: n.gender }); if (Math.abs(parseFloat(v._points) - calc.total) > 0.01) W(`V9 File says ${v._points} points; system calculates ${calc.total} (calculated value used)`); else W('V11 Points column ignored — calculated by system'); }
  if (v._ct) W('V11 Cycle time column ignored — calculated by system');
  if (/^y/i.test(v.excFlag || '')) { n.excReq = v.excReason || 'Not stated'; W('Exception requested (' + n.excReq + ') — needs TA Head approval after import'); }
}
function validateProfile(rec, seen) {
  const v = rec.v, n = rec.norm, E = m => rec.msgs.push(['E', m]), W = m => rec.msgs.push(['W', m]);
  if (!v.id) E('Employee ID missing'); if (!v.name) E('Name missing');
  if (seen[v.id]) E('V1 Duplicate employee ID in file'); seen[v.id] = 1;
  if (emp(v.id)) W('Existing member — will update');
  const findTeam = x => Object.entries(state.teams).find(([k, t]) => [k, t.name, t.short || ''].map(s => s.toLowerCase()).includes(String(x).trim().toLowerCase()));
  const t = findTeam(v.team);
  if (!t) E('Unknown team "' + v.team + '" (add it in Team Setup, or use ' + Object.values(state.teams).map(x => x.name).join(', ') + ')'); else n.team = t[0];
  const a = t && t[1].areas.find(x => x.toLowerCase() === String(v.area).toLowerCase());
  if (t && !a) { if (v.area) E('Business area "' + v.area + '" is not in ' + t[1].name + ' (' + t[1].areas.join(', ') + ')'); else { n.area = t[1].areas[0]; W('Business area missing — set to ' + n.area); } } else n.area = a;
  const rk = Object.entries(state.roles).find(([k, r]) => [k.toLowerCase(), r.name.toLowerCase()].includes(String(v.type).trim().toLowerCase()) || (String(v.type).trim().toUpperCase() === 'TL' && r.template === 'lead'));
  n.type = rk ? rk[0] : null; if (!n.type) E('Unknown role "' + v.type + '" (use ' + Object.values(state.roles).map(r => r.name).join(', ') + ' or add the role in Team Setup)');
  n.alsoTeams = String(v.also || '').split(/[;|]/).map(x => x.trim()).filter(Boolean).map(x => { const f = findTeam(x); if (!f) W('Unknown supported team "' + x + '" — ignored'); return f && f[0]; }).filter(x => x && x !== n.team);
  n.status = /former|left|exit/i.test(v.status || '') ? 'Former' : 'Active';
  n.flags = String(v.flags || '').split(/[;|]/).map(x => x.trim()).filter(Boolean);
  n.level = JOB_LEVELS.find(l => l.toLowerCase() === String(v.level).toLowerCase() || l.split(' - ')[0].toLowerCase() === String(v.level).toLowerCase()) || (v.level ? v.level : JOB_LEVELS[0]);
  if (v.level && !JOB_LEVELS.includes(n.level)) W('Job level not in list — kept as entered (D-30)');
  for (const k of ['since', 'start', 'end']) { const d = normDate(v[k]); if (d.startsWith('INVALID')) E('Unreadable date "' + v[k] + '"'); else n[k] = d; }
  if (n.status === 'Former' && !n.end) W('Former member without leaving date — targets cannot be pro-rated');
  n.ratings = ['r1', 'r2', 'r3'].map(k => { if (!v[k]) return null; const r = RATING_SCALE.find(x => x.toLowerCase() === String(v[k]).toLowerCase()) || RATING_SCALE[5 - parseInt(v[k])]; if (!r) E('Unknown rating "' + v[k] + '" (use ' + RATING_SCALE.join(', ') + ' or 1–5)'); return r || null; });
  n.id = v.id; n.name = v.name;
}
function validateRating(rec, seen) {
  const v = rec.v, n = rec.norm, E = m => rec.msgs.push(['E', m]);
  const e = findEmp(v.emp); if (!e) E('Unknown employee "' + v.emp + '"'); else n.emp = e.id;
  const per = ['Baseline', 'Q1', 'Q2', 'Q3', 'Q4'].find(p => String(v.period).toUpperCase().endsWith(p.toUpperCase())); if (!per) E('Period must be Baseline, Q1, Q2, Q3 or Q4'); n.period = per;
  const c = COMPETENCIES.find(x => x.toLowerCase() === String(v.comp).toLowerCase()); if (!c) E('Unknown competency "' + v.comp + '"'); n.comp = c;
  const by = String(v.by).toLowerCase(); n.by = by.startsWith('s') ? 'self' : by.includes('head') || by.startsWith('m') || by.startsWith('t') ? 'mgr' : null; if (!n.by) E('Rated By must be Self or TA Head');
  const r = parseInt(v.rating); if (!(r >= 1 && r <= 5)) E('Rating must be 1–5'); n.rating = r;
  const t = parseInt(v.target); n.target = t >= 1 && t <= 5 ? t : null; n.evidence = v.evidence;
  const key = [v.emp, per, c, n.by].join('|'); if (seen[key]) E('V1 Duplicate rating in file'); seen[key] = 1;
}
function validateScorecard(rec, seen) {
  const v = rec.v, n = rec.norm, E = m => rec.msgs.push(['E', m]), W = m => rec.msgs.push(['W', m]);
  const e = findEmp(v.emp); if (!e) E('Unknown employee "' + v.emp + '" (add them in Team Setup first)'); else n.emp = e.id;
  if (seen[v.emp]) E('V1 Duplicate person in file'); seen[v.emp] = 1;
  const d = normDate(v.asOf); if (!d || d.startsWith('INVALID')) E('As Of Date missing or unreadable'); else n.asOf = d;
  const num = (k, req) => { const raw = String(v[k] ?? '').replace(/[%,\s]/g, ''); if (raw === '' || raw === '—' || raw === '-') { if (req) E(k + ' missing'); return null; } const x = parseFloat(raw); if (isNaN(x) || x < 0) { E('Not a number: ' + k + ' "' + v[k] + '"'); return null; } return x; };
  for (const k of ['target', 'offers', 'joiners', 'offerDays', 'joinDays', 'declinedPct', 'diversityPct', 'vendorPct', 'referralPct']) n[k] = num(k, ['offers', 'joiners'].includes(k));
  n.streams = { core: num('oCore'), nats: num('oNats'), excelher: num('oExcel'), other: num('oOther') };
  n.joinStreams = { core: num('jCore'), nats: num('jNats'), excelher: num('jExcel'), other: num('jOther') };
  const so = sum(Object.values(n.streams).filter(x => x != null)), sj = sum(Object.values(n.joinStreams).filter(x => x != null));
  if (so && n.offers != null && so !== n.offers) W(`Offers by stream add up to ${so}, not ${n.offers}`);
  if (sj && n.joiners != null && sj !== n.joiners) W(`Joiners by stream add up to ${sj}, not ${n.joiners}`);
  if (n.target == null) W('No annual target — attainment cannot be shown');
  if (n.offers != null && n.joiners != null && n.joiners > n.offers) W('More joiners than offers (joiners can include earlier offers) — joining ratio is approximate');
  if (e && state.offers.some(o => o.emp === e.id)) W('Offer-level data already loaded for this person — the dashboard uses offer-level data and keeps this summary for reference');
  n.source = v.source || 'Recruiter scorecard'; n.note = v.note || '';
}
function validateLearning(rec) {
  const v = rec.v, n = rec.norm, E = m => rec.msgs.push(['E', m]), W = m => rec.msgs.push(['W', m]);
  const e = findEmp(v.emp); if (!e) E('Unknown employee "' + v.emp + '"'); else n.emp = e.id;
  if (!v.programme) E('Programme missing'); n.programme = v.programme; n.provider = v.provider; n.type = v.type || 'Other';
  for (const k of ['start', 'completion']) { const d = normDate(v[k]); if (d.startsWith('INVALID')) E('Unreadable date "' + v[k] + '"'); else n[k] = d; }
  n.skill = COMPETENCIES.find(c => c.toLowerCase() === String(v.skill).toLowerCase()) || ''; if (v.skill && !n.skill) W('Skill not matched to a competency');
  n.cert = /^(y|yes|true|1)$/i.test(v.cert || ''); n.status = v.status || (n.completion ? 'Completed' : 'In progress'); n.application = v.application || null;
  if (n.status === 'Completed' && !n.application) W('Completed without an application example — will not count toward competency score until applied');
}

function impStep3() {
  const im = impState(), ds = IMPORT_DATASETS[im.dataset];
  const recs = im.records, f = im.filter || 'all';
  const cnt = s => recs.filter(r => !r.excluded && r.status === s).length;
  const shown = recs.filter(r => f === 'all' || (f === 'excluded' ? r.excluded : !r.excluded && r.status === f));
  const cols = ds.fields.filter(x => im.mapping[x[0]] != null);
  return `<section class="card"><header><h2>Review &amp; fix</h2><span class="muted small">Click a cell to edit, then Re-validate. Exclude rows you don't want to import.</span></header>
   <div class="grid g4" style="margin-bottom:10px"><div class="kpi"><div class="lab">Ready</div><div class="val">${cnt('ok')}</div><div class="sub">${statusChip('good', true, 'OK')}</div></div><div class="kpi"><div class="lab">Warnings</div><div class="val">${cnt('warn')}</div><div class="sub">${statusChip('watch', true, 'Allowed')}</div></div><div class="kpi"><div class="lab">Errors</div><div class="val">${cnt('error')}</div><div class="sub">${statusChip('below', true, 'Blocks import')}</div></div><div class="kpi"><div class="lab">Excluded</div><div class="val">${recs.filter(r => r.excluded).length}</div></div></div>
   <div class="filters"><label>Show <select onchange="impState().filter=this.value;render()">${[['all', 'All rows'], ['error', 'Errors'], ['warn', 'Warnings'], ['ok', 'OK'], ['excluded', 'Excluded']].map(([k, l]) => `<option value="${k}" ${f === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <div class="actions"><button class="btn sm" onclick="impValidate();render()">Re-validate</button><button class="btn sm" onclick="impErrorReport()">Download error report</button><button class="btn sm" onclick="impState().records.forEach(r=>{if(r.status==='error')r.excluded=true});render()">Exclude all error rows</button></div></div>
   <div class="tbl-wrap" style="max-height:460px"><table><thead><tr><th>Row</th><th>Status</th><th>Messages</th>${cols.map(c => `<th>${esc(c[1])}</th>`).join('')}<th>Exclude</th></tr></thead><tbody>
   ${shown.slice(0, 300).map(r => `<tr class="${r.excluded ? 'excl' : r.status === 'error' ? 'err' : r.status === 'warn' ? 'warn' : ''}"><td class="n">${r.n}</td><td>${r.excluded ? 'Excluded' : r.status === 'error' ? '✕ Error' : r.status === 'warn' ? '▲ Warning' : '✓ OK'}</td><td class="small" style="min-width:220px">${r.msgs.map(m => esc(m[1])).join('<br>')}</td>
     ${cols.map(c => `<td contenteditable="true" data-r="${r.n}" data-k="${c[0]}" onblur="impEdit(this)">${esc(r.v[c[0]])}</td>`).join('')}<td><input type="checkbox" aria-label="Exclude row ${r.n}" ${r.excluded ? 'checked' : ''} onchange="impExclude(${r.n},this.checked)"></td></tr>`).join('')}</tbody></table></div>
   ${shown.length > 300 ? `<p class="small muted">Showing first 300 of ${shown.length}. Use the filter or the error report.</p>` : ''}
   <div class="actions" style="margin-top:10px"><button class="btn" onclick="impState().step=2;render()">Back</button><button class="btn pri" ${cnt('error') ? 'disabled' : ''} onclick="impState().step=4;render()">Continue to approval</button>${cnt('error') ? '<span class="small" style="color:var(--bad)">Fix or exclude error rows first.</span>' : ''}</div></section>`;
}
function impEdit(td) {
  const im = impState(), r = im.records.find(x => x.n === +td.dataset.r); const nv = td.textContent.trim();
  if (r.v[td.dataset.k] !== nv) { (r.edits = r.edits || []).push([td.dataset.k, r.v[td.dataset.k], nv]); r.v[td.dataset.k] = nv; }
}
function impExclude(n, on) { const r = impState().records.find(x => x.n === n); r.excluded = on; render(); }
function impErrorReport() {
  const im = impState(), ds = IMPORT_DATASETS[im.dataset]; const cols = ds.fields.filter(x => im.mapping[x[0]] != null);
  download('import_error_report.csv', toCSV([['Row', 'Status', 'Messages', ...cols.map(c => c[1])]].concat(im.records.filter(r => r.status !== 'ok').map(r => [r.n, r.status, r.msgs.map(m => m[1]).join('; '), ...cols.map(c => r.v[c[0]])]))), 'text/csv');
}

function impStep4() {
  const im = impState(); const recs = im.records.filter(r => !r.excluded && r.status !== 'error');
  const upd = recs.filter(r => r.norm._existing || (im.dataset === 'profile' && emp(r.norm.id))).length;
  const people = [...new Set(recs.map(r => r.norm.emp || r.norm.id).filter(Boolean))];
  const head = isHead();
  const edits = im.records.reduce((a, r) => a + (r.edits ? r.edits.length : 0), 0);
  let impact = '';
  if (im.dataset === 'offers') {
    impact = `<h3>Impact preview</h3><div class="tbl-wrap"><table><thead><tr><th>Employee</th><th class="n">Rows</th><th class="n">Points (calculated)</th></tr></thead><tbody>${people.map(p => { const rs = recs.filter(r => r.norm.emp === p); return `<tr><td>${esc(emp(p).name)}</td><td class="n">${rs.length}</td><td class="n">${fmt(sum(rs.map(r => pointsFor({ cat: r.norm.cat, gender: r.norm.gender }).total)))}</td></tr>`; }).join('')}</tbody></table></div>`;
  }
  return `<section class="card"><header><h2>${head ? 'Approve and publish' : 'Submit for approval'}</h2></header>
   <div class="grid g4"><div class="kpi"><div class="lab">Rows to add</div><div class="val">${recs.length - upd}</div></div><div class="kpi"><div class="lab">Rows to update</div><div class="val">${upd}</div></div><div class="kpi"><div class="lab">Excluded</div><div class="val">${im.records.filter(r => r.excluded).length}</div></div><div class="kpi"><div class="lab">People affected</div><div class="val">${people.length}</div></div></div>
   <p class="small">Source: ${esc(im.source)} · ${edits} cell correction(s) made in review · rule version ${esc(state.rules.version)}.</p>${impact}
   ${head ? '<div class="note">You prepared this batch and are approving it. With a delegated importer, the importer prepares and you approve (maker-checker, D-26). Your approval is recorded in the audit log.</div>' : '<div class="note">The TA Head reviews and approves this batch before it is published. You cannot approve your own batch.</div>'}
   <label class="field">Note for the audit log<input type="text" id="imp-note" placeholder="e.g. ATS export, week 42"></label>
   <div class="actions" style="margin-top:10px"><button class="btn" onclick="impState().step=3;render()">Back</button><button class="btn pri" onclick="${head ? 'impPublish()' : 'impSubmit()'}">${head ? 'Approve & publish' : 'Submit for TA Head approval'}</button></div></section>`;
}
function newBatchId() { return 'B-' + String(state.batches.length + 1).padStart(4, '0'); }
function impSubmit() {
  const im = impState();
  const b = { id: newBatchId(), dataset: IMPORT_DATASETS[im.dataset].label, dsKey: im.dataset, source: im.source, by: currentUserLabel(), approver: '', at: nowStamp(), status: 'Awaiting approval', added: im.records.filter(r => !r.excluded && r.status !== 'error').length, updated: 0, excluded: im.records.filter(r => r.excluded).length, errors: 0, rule: state.rules.version, note: val('imp-note'),
    pending: { headers: im.headers, rows: im.rows, mapping: im.mapping, records: im.records } };
  state.batches.push(b); audit('Import prepared', b.id, `${b.dataset}: ${b.added} rows from ${b.source}`, b.note); touch();
  ui.imp = { dataset: im.dataset, step: 1 }; render(); toast('Submitted to TA Head for approval');
}
function reviewBatch(id) {
  const b = state.batches.find(x => x.id === id);
  ui.imp = { dataset: b.dsKey, step: 3, source: b.source, headers: b.pending.headers, rows: b.pending.rows, mapping: b.pending.mapping, records: b.pending.records, pii: [], fromBatch: id };
  impValidate(); render();
}
function impPublish() {
  const im = impState(); const recs = im.records.filter(r => !r.excluded && r.status !== 'error');
  let b = im.fromBatch ? state.batches.find(x => x.id === im.fromBatch) : null;
  if (!b) { b = { id: newBatchId(), dataset: IMPORT_DATASETS[im.dataset].label, dsKey: im.dataset, source: im.source, by: currentUserLabel(), at: nowStamp() }; state.batches.push(b); }
  if (b.by === currentUserLabel() && !isHead()) { toast('You cannot approve your own batch.'); return; }
  const added = [], updated = [];
  if (im.dataset === 'offers') {
    for (const r of recs) {
      const n = r.norm;
      const data = { emp: n.emp, cand: n.cand, req: n.req, area: n.area, cat: n.cat, sg: n.sg, gender: n.gender, reqDate: n.reqDate, offerDate: n.offerDate, expJoin: n.expJoin, actJoin: n.actJoin || '', status: n.status, source: n.source, vendor: n.vendor || '', batch: b.id };
      if (n._existing) { const o = state.offers.find(x => x.id === n._existing); updated.push({ id: o.id, prev: { ...o } }); Object.assign(o, data); }
      else { const o = Object.assign({ id: 'O' + Date.now().toString(36) + added.length, exc: null, confirmed: false }, data); if (n.excReq) o.exc = { reason: n.excReq, status: 'Requested', by: b.by, at: nowStamp() }; state.offers.push(o); added.push(o.id); }
    }
  } else if (im.dataset === 'profile') {
    for (const r of recs) { const n = r.norm, e = emp(n.id);
      const data = { name: n.name, team: n.team, area: n.area, type: n.type, level: n.level, since: n.since || PERIOD.start, start: n.start || null, end: n.end || null, status: n.status, alsoTeams: n.alsoTeams, flags: n.flags, ratings: n.ratings };
      if (e) { updated.push({ id: e.id, prev: JSON.parse(JSON.stringify(e)) }); Object.assign(e, data); } else { addEmployee(Object.assign({ id: n.id }, data)); added.push(n.id); } }
  } else if (im.dataset === 'ratings') {
    for (const r of recs) { const n = r.norm; const h = state.assessments[n.emp] = state.assessments[n.emp] || [];
      let rec = h.find(a => a.period === n.period);
      if (!rec) { rec = { period: n.period, date: D.fmt(Date.now()), self: {}, mgr: {}, selfEvidence: {}, mgrEvidence: {}, by: 'import' }; h.push(rec); h.sort((a, c) => ['Baseline', 'Q1', 'Q2', 'Q3', 'Q4'].indexOf(a.period) - ['Baseline', 'Q1', 'Q2', 'Q3', 'Q4'].indexOf(c.period)); }
      rec[n.by][n.comp] = n.rating; rec[n.by === 'self' ? 'selfEvidence' : 'mgrEvidence'][n.comp] = n.evidence || '';
      if (n.target) emp(n.emp).targets[n.comp] = n.target;
      rec.mgrPending = COMPETENCIES.some(c => rec.mgr[c] == null); rec.selfPending = COMPETENCIES.some(c => rec.self[c] == null);
      if (!rec.mgrPending) delete rec.mgrPending; if (!rec.selfPending) delete rec.selfPending;
      added.push(n.emp + ':' + n.period + ':' + n.comp); }
  } else if (im.dataset === 'scorecard') {
    for (const r of recs) { const n = r.norm; if (state.scorecards[n.emp]) updated.push({ id: n.emp, prev: JSON.parse(JSON.stringify(state.scorecards[n.emp])) }); else added.push(n.emp);
      const { emp: _e, ...rest } = n; state.scorecards[n.emp] = Object.assign(rest, { batch: b.id }); }
  } else if (im.dataset === 'learning') {
    for (const r of recs) { const n = r.norm; const l = { id: 'L-' + Date.now().toString(36) + added.length, emp: n.emp, programme: n.programme, provider: n.provider, type: n.type, skill: n.skill, start: n.start, completion: n.completion, cert: n.cert, status: n.status, application: n.application, validated: false, batch: b.id }; state.learning.push(l); added.push(l.id); }
  }
  Object.assign(b, { status: 'Published', approver: currentUserLabel(), approvedAt: nowStamp(), added: added.length, updated: updated.length, excluded: im.records.filter(r => r.excluded).length, errors: 0, rule: state.rules.version, records: { added, updated } });
  delete b.pending;
  const edits = im.records.reduce((a, r) => a + (r.edits ? r.edits.length : 0), 0);
  audit('Import approved', b.id, `${b.dataset}: ${added.length} added, ${updated.length} updated, ${b.excluded} excluded, ${edits} corrections`, val('imp-note'));
  touch(); im.published = b.id; im.step = im.dataset === 'offers' ? 5 : 1; if (im.step === 1) ui.imp = { dataset: im.dataset, step: 1 };
  render(); toast('Published — dashboards recalculated');
}
function impStep5() {
  const im = impState(), b = state.batches.find(x => x.id === im.published);
  const ids = new Set([...(b.records.added || []), ...(b.records.updated || []).map(u => u.id)]);
  const people = [...new Set(state.offers.filter(o => ids.has(o.id)).map(o => o.emp))];
  return `<section class="card"><header><h2>Share with employees (optional)</h2>${statusChip('approved', true, 'Batch ' + b.id + ' published')}</header>
   <p>Ask each person to confirm their own rows, correct them, or add evidence. Each request contains <b>only that person's records</b>.</p>
   <div class="formgrid"><label class="field">Request type<select id="sh-t">${opt(['Confirm data', 'Request correction', 'Request evidence', 'Request comment'])}</select></label><label class="field">Due date<input type="date" id="sh-d" value="${D.add(D.fmt(Date.now()), 7)}"></label></div>
   <label class="field">Message<input type="text" id="sh-m" value="Please confirm the offers loaded from the latest import, or tell me what needs correcting."></label>
   <div style="margin:10px 0">${people.map(p => `<label style="display:inline-block;margin-right:14px"><input type="checkbox" class="sh-p" value="${p}" checked> ${esc(emp(p).name)} (${state.offers.filter(o => ids.has(o.id) && o.emp === p).length})</label>`).join('')}</div>
   <div class="actions"><button class="btn" onclick="ui.imp={dataset:'offers',step:1};render()">Skip</button><button class="btn pri" onclick="impShare('${b.id}')">Send ${people.length} request(s)</button></div></section>`;
}
function impShare(bid) {
  const b = state.batches.find(x => x.id === bid);
  const ids = new Set([...(b.records.added || []), ...(b.records.updated || []).map(u => u.id)]);
  const sel = [...document.querySelectorAll('.sh-p:checked')].map(x => x.value);
  for (const p of sel) {
    const rows = state.offers.filter(o => ids.has(o.id) && o.emp === p).map(o => o.id);
    state.requests.push({ id: 'RQ-' + String(state.requests.length + 1).padStart(3, '0'), emp: p, type: val('sh-t'), msg: val('sh-m'), rows, due: val('sh-d'), status: 'Sent', created: D.fmt(Date.now()), response: null, batch: bid });
  }
  audit('Requests sent from import', bid, `${val('sh-t')} → ${sel.length} employee(s)`); touch(); ui.imp = { dataset: 'offers', step: 1 }; render(); toast(sel.length + ' request(s) sent');
}
function reverseBatch(id) {
  const b = state.batches.find(x => x.id === id);
  askText('Reverse ' + id, 'Added rows are removed and updated rows restored; the batch record is kept. Reason:', reason => doReverse(id, b, reason));
}
function doReverse(id, b, reason) {
  const added = new Set(b.records.added || []);
  if (b.dsKey === 'offers' || b.dataset.startsWith('Offers')) { state.offers = state.offers.filter(o => !added.has(o.id)); for (const u of b.records.updated || []) { const o = state.offers.find(x => x.id === u.id); if (o) Object.assign(o, u.prev); } }
  else if (b.dsKey === 'profile') { state.employees = state.employees.filter(e => !added.has(e.id)); for (const u of b.records.updated || []) { const e = emp(u.id); if (e) Object.assign(e, u.prev); } }
  else if (b.dsKey === 'learning') state.learning = state.learning.filter(l => !added.has(l.id));
  else if (b.dsKey === 'scorecard') { added.forEach(id => delete state.scorecards[id]); for (const u of b.records.updated || []) state.scorecards[u.id] = u.prev; }
  else { toast('Rating imports are reversed by re-importing corrected ratings (history is kept).'); return; }
  b.status = 'Reversed';
  state.batches.push({ id: newBatchId(), dataset: 'Reversal of ' + id, source: id, by: currentUserLabel(), approver: currentUserLabel(), at: nowStamp(), status: 'Published', added: 0, updated: (b.records.updated || []).length, excluded: 0, errors: 0, rule: state.rules.version, removed: added.size });
  audit('Import reversed', id, `${added.size} rows removed, ${(b.records.updated || []).length} restored`, reason); touch(); render();
}
function batchHistory() {
  const list = [...state.batches].reverse();
  return `<section class="card"><header><h2>Import history</h2></header><div class="tbl-wrap"><table><thead><tr><th>Batch</th><th>Dataset</th><th>Source</th><th>Prepared by</th><th>Approved by</th><th>When</th><th class="n">Added</th><th class="n">Updated</th><th class="n">Excluded</th><th>Status</th><th></th></tr></thead><tbody>
   ${list.map(b => `<tr><td class="mono">${b.id}</td><td>${esc(b.dataset)}</td><td class="small">${esc(b.source)}</td><td>${esc(b.by)}</td><td>${esc(b.approver || '—')}</td><td class="mono">${esc(b.at)}</td><td class="n">${b.added}</td><td class="n">${b.updated}</td><td class="n">${b.excluded}</td>
   <td><span class="chip ${b.status === 'Published' ? 'st-good' : b.status === 'Awaiting approval' ? 'st-watch' : ''}">${esc(b.status)}</span></td>
   <td>${b.status === 'Awaiting approval' && isHead() ? `<button class="btn sm pri" onclick="reviewBatch('${b.id}')">Review &amp; approve</button><button class="btn sm" onclick="rejectBatch('${b.id}')">Reject</button>` : ''}${b.status === 'Published' && b.records && isHead() ? `<button class="btn sm" onclick="reverseBatch('${b.id}')">Reverse</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="11" class="empty">No imports yet.</td></tr>'}</tbody></table></div></section>`;
}
function rejectBatch(id) { askText('Reject ' + id, 'Reason for rejecting this batch:', r => { const b = state.batches.find(x => x.id === id); b.status = 'Rejected'; delete b.pending; audit('Import rejected', id, b.dataset, r); touch(); render(); }); }

function sampleImportText() {
  const e1 = state.employees.find(isRecruiter) || { id: 'E0000', area: 'DTO' };
  const e2 = state.employees.filter(isRecruiter)[1] || e1;
  return ['Recruiter Employee ID\tCandidate ID\tRequisition ID\tBusiness Area\tHiring Category\tSG Level\tGender\tRequisition Created Date\tOffer Release Date\tExpected Joining Date\tActual Joining Date\tJoining Status\tSource\tVendor Name\tTotal Points',
    `${e1.id}\tC-99001\tR-9901\t${e1.area}\tLateral SG5-SG8\tSG6\tF\t02/08/2026\t10/10/2026\t15/11/2026\t\tPending\tDirect\t\t2.5`,
    `${e1.id}\tC-99002\tR-9902\t${e1.area}\tSG9+\tSG10\tFemale\t2026-07-01\t2026-10-08\t2026-12-01\t\t\tAgency\t\t3.5`,
    `${e1.id}\tC-99002\tR-9902\t${e1.area}\tSG9+\tSG10\tFemale\t2026-07-01\t2026-10-08\t2026-12-01\t\t\tVendor\tApex Search\t`,
    `${e2.id}\tC-99003\tR-9903\t${e2.area}\tLateral SG1-SG4\tSG6\tM\t2026-09-01\t2026-10-01\t2026-10-30\t\tPending\tReferral\t\t`,
    `${e2.id}\tC-99004\tR-9904\t\tGET\t\tFemale\t15-Sep-2026\t02-Oct-2026\t01-Sep-2026\t\t\tCampus\t\t`,
    `${e2.id}\tC-99005\tR-9905\t${e2.area}\tFTC\t\tMale\t2026-10-05\t2026-09-20\t2026-11-10\t\tPending\tDirect\t\t`,
    `E9999\tC-99006\tR-9906\t${e1.area}\tPMIS\t\tFemale\t2026-08-01\t2026-09-15\t2026-10-01\t2026-10-01\tJoined\tDirect\t\t1.5`].join('\n');
}
