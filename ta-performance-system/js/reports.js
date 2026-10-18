/* Reports: PDF (print to PDF), Excel (SpreadsheetML workbook), versions and audit metadata. */

const REPORT_TYPES = {
  annual:      { label: 'Final Annual Report (2–4 pages + annexures)', file: 'Performance' },
  full:        { label: 'Full Individual Performance Report', file: 'Full_Performance' },
  deliverables:{ label: 'Business Deliverables', file: 'Deliverables' },
  offers:      { label: 'Offer Details Annexure', file: 'Offer_Details' },
  cadence:     { label: '10-Day Cadence', file: 'Cadence' },
  joining:     { label: 'Joining & Conversion', file: 'Joining' },
  cycletime:   { label: 'Cycle Time', file: 'CycleTime' },
  vendor:      { label: 'Vendor Usage', file: 'Vendor' },
  behaviour:   { label: 'Behavioural Assessment', file: 'Behaviour' },
  afi:         { label: 'Areas for Improvement', file: 'AFI' },
  projects:    { label: 'Improvement Projects / Portfolio', file: 'DMAIC' },
  competency:  { label: 'Competency Development', file: 'Competency' },
  training:    { label: 'Training & Certification', file: 'Training' },
  idp:         { label: 'Individual Development Plan', file: 'IDP' },
  selfmgr:     { label: 'Self vs Manager', file: 'Self_vs_Manager' },
  compare:     { label: 'Team-member comparison (TA Head)', file: 'Comparison', head: true, multi: true },
  calibration: { label: 'Team calibration summary (TA Head)', file: 'Calibration_Summary', head: true, team: true },
  talent:      { label: 'Talent & Promotion — strictly confidential (TA Head)', file: 'Talent_Promotion_CONFIDENTIAL', head: true, team: true },
};
const PERSONAL_TYPES = Object.keys(REPORT_TYPES).filter(k => !REPORT_TYPES[k].head);

VIEWS.reports = () => {
  const head = isHead();
  const list = state.reports.filter(r => head || r.emp === ui.emp).slice().reverse();
  return `<div class="pagehead"><div class="grow"><h1>Reports</h1><p class="muted">${head ? 'Individual, section, comparison, calibration and bulk reports.' : 'Download your own reports.'} PDF opens your browser's print dialog — choose <i>Save as PDF</i>. Excel downloads a workbook.</p></div>
   <button class="btn pri" onclick="openReportBuilder(${head ? 'null' : `'${ui.emp}'`},'annual')">New report</button></div>
   <div class="grid g3">${[['annual', 'Final annual report', 'Concise 2–4 page record with calculations in annexures.'], ['deliverables', 'Section report', 'Any dashboard section, for one or more people.'], ...(head ? [['compare', 'Compare members', 'Side-by-side comparison of selected members.'], ['calibration', 'Calibration pack', 'Team table, distribution and gaps.'], ['talent', 'Talent & promotion', 'Strictly confidential, TA Head only.']] : [['idp', 'Development plan', 'Your next-year IDP.']])].map(([k, t, d]) => `<section class="card"><h3>${t}</h3><p class="small muted">${d}</p><button class="btn sm" onclick="openReportBuilder(${head ? 'null' : `'${ui.emp}'`},'${k}')">Create</button></section>`).join('')}</div>
   <section class="card"><header><h2>Report versions</h2><span class="muted small">Final versions are never overwritten; regenerating creates a new version.</span></header><div class="tbl-wrap"><table><thead><tr><th>File name</th><th>Report</th>${head ? '<th>Employee</th>' : ''}<th>Version</th><th>Status</th><th>Generated</th><th>Data cut-off</th><th>Rule version</th>${head ? '<th></th>' : ''}</tr></thead><tbody>
   ${list.map(r => `<tr><td class="mono small">${esc(r.file)}</td><td>${esc(r.type)}</td>${head ? `<td>${esc(r.empName || 'Team')}</td>` : ''}<td class="n">v${r.version}</td><td><span class="chip ${r.status === 'Calibration Final' ? 'st-good' : r.status === 'Manager Reviewed' ? 'st-watch' : ''}">${esc(r.status)}</span></td><td class="mono small">${esc(r.at)} · ${esc(r.by)}</td><td>${D.nice(r.cutoff)}</td><td class="mono small">${esc(r.rule)}</td>
   ${head ? `<td>${r.status === 'Draft' && r.emp ? `<button class="btn sm" onclick="promoteReport('${r.id}','Manager Reviewed')">Mark reviewed</button>` : ''}</td>` : ''}</tr>`).join('') || '<tr><td colspan="9" class="empty">No reports generated yet.</td></tr>'}</tbody></table></div></section>`;
};
function promoteReport(rid, status) { const r = state.reports.find(x => x.id === rid); createReportVersion(r.emp, r.type, status, r.typeKey); render(); }

function createReportVersion(empId, typeLabel, status, typeKey = 'annual', fmtExt = 'pdf') {
  const e = empId ? emp(empId) : null;
  const prev = state.reports.filter(r => r.emp === empId && r.type === typeLabel);
  const version = prev.length + 1;
  const fileType = (REPORT_TYPES[typeKey] || {}).file || 'Report';
  const name = e ? e.name.split(' ')[0] + '_' + e.id : 'Team';
  const rec = { id: 'RV-' + (state.reports.length + 1), emp: empId, empName: e ? e.name : null, type: typeLabel, typeKey, version, status, at: nowStamp(), by: currentUserLabel(), cutoff: PERIOD.cutoff, rule: state.rules.version,
    file: `${PERIOD.year}_Annual_${fileType}_${name}_v${version}.${fmtExt}` };
  state.reports.push(rec);
  audit('Report generated', rec.file, `${typeLabel} · ${status}`); touch();
  return rec;
}

function openReportBuilder(empId, type) {
  const head = isHead();
  const types = Object.entries(REPORT_TYPES).filter(([k, t]) => head || !t.head);
  const people = head ? sortedEmployees() : [emp(empId || ui.emp)];
  const pre = empId ? [empId] : (type === 'compare' ? ui.compare : []);
  openDlg('Create report', `<div class="formgrid"><label class="field">Report<select id="rb-t" onchange="rbToggle()">${types.map(([k, t]) => `<option value="${k}" ${k === type ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}</select></label>
    <label class="field">Period<select id="rb-p"><option>Annual ${PERIOD.year} (YTD to cut-off ${D.nice(PERIOD.cutoff)})</option></select></label>
    <label class="field">Format<select id="rb-f"><option value="pdf">PDF (print)</option><option value="xls">Excel workbook</option></select></label>
    ${head ? `<label class="field">Status<select id="rb-s"><option>Draft</option><option>Manager Reviewed</option><option>Calibration Final</option></select></label>` : '<input type="hidden" id="rb-s" value="Draft">'}</div>
    <fieldset id="rb-people" style="border:1px solid var(--line);border-radius:8px;margin:10px 0;padding:8px 12px"><legend class="small">Employees ${head ? `<button class="btn link small" type="button" onclick="document.querySelectorAll('.rb-e').forEach(x=>x.checked=true)">select all</button><button class="btn link small" type="button" onclick="document.querySelectorAll('.rb-e').forEach(x=>x.checked=false)">clear</button>` : ''}</legend>
    <div class="grid g3">${people.map(e => `<label class="small"><input type="checkbox" class="rb-e" value="${e.id}" ${pre.includes(e.id) || !head ? 'checked' : ''} ${head ? '' : 'disabled'}> ${esc(e.name)} <span class="muted">${e.type}</span></label>`).join('')}</div></fieldset>
    <div class="formgrid"><label class="small"><input type="checkbox" id="rb-tx" checked> Include transaction detail / annexures</label><label class="small"><input type="checkbox" id="rb-g" checked> Include graphs</label>
    <label class="small"><input type="checkbox" id="rb-ec" checked> Include employee comments</label><label class="small"><input type="checkbox" id="rb-mc" checked> Include manager comments</label><label class="small"><input type="checkbox" id="rb-sum"> Summary only</label></div>
    <p class="small muted">Several employees → one document with a page per employee (PDF) or one sheet set per employee (Excel), each logged as its own report version. Talent &amp; promotion content is never included in employee reports.</p>`,
    [{ label: 'Cancel' }, { label: 'Generate', cls: 'pri', onClick: () => runReport() }]);
  rbToggle();
}
function rbToggle() { const t = REPORT_TYPES[val('rb-t')]; const fs = document.getElementById('rb-people'); if (fs) fs.style.display = t && t.team ? 'none' : ''; }
function runReport() {
  const type = val('rb-t'), f = val('rb-f'), status = val('rb-s');
  const ids = [...document.querySelectorAll('.rb-e:checked')].map(x => x.value);
  const T = REPORT_TYPES[type];
  if (T.head && !isHead()) return false;
  if (!T.team && !ids.length) { toast('Select at least one employee.'); return false; }
  if (type === 'compare' && ids.length < 2) { toast('Select at least two members to compare.'); return false; }
  const opts = { tx: document.getElementById('rb-tx').checked, graphs: document.getElementById('rb-g').checked, ec: document.getElementById('rb-ec').checked, mc: document.getElementById('rb-mc').checked, summary: document.getElementById('rb-sum').checked, period: val('rb-p'), status };
  closeDlg();
  generate(type, ids, f, opts);
  return false;
}
function sectionReport(id, key, f) { generate(key === 'deliverables' ? 'deliverables' : key, [id], f, { tx: true, graphs: true, ec: true, mc: isHead(), period: 'Annual ' + PERIOD.year, status: 'Draft' }); }
function compareReport(f) { if (ui.compare.length < 2) { toast('Select at least two members.'); return; } generate('compare', ui.compare, f, { graphs: true, period: 'Annual ' + PERIOD.year, status: 'Draft' }); }

function generate(type, ids, f, opts) {
  const T = REPORT_TYPES[type];
  let versions = [];
  const ext = f === 'xls' ? excelExt() : 'pdf';
  if (T.team || T.multi) versions.push(createReportVersion(null, T.label, opts.status, type, ext));
  else versions = ids.map(id => createReportVersion(id, T.label, opts.status, type, ext));
  if (f === 'xls') {
    const sheets = T.team || T.multi ? teamSheets(type, ids) : [].concat(...ids.map(id => personSheets(type, id, opts, ids.length > 1)));
    const name = versions.length === 1 ? versions[0].file : `${PERIOD.year}_Annual_${T.file}_${ids.length}_employees.${excelExt()}`;
    download(name, excelFile(sheets, versions), 'application/vnd.ms-excel');
    toast('Excel downloaded'); render(); return;
  }
  let html = '';
  if (T.team || T.multi) html = teamDoc(type, ids, opts, versions[0]);
  else html = ids.map((id, i) => `<div class="${i ? 'pb' : ''}">${personDoc(type, id, opts, versions[i])}</div>`).join('');
  render();
  const pdfLabel = HOSTED ? 'Download for PDF (.html)' : 'Print / Save as PDF';
  lastReport = { html, file: versions.length === 1 ? versions[0].file : `${PERIOD.year}_Annual_${T.file}_${ids.length || 'team'}.pdf` };
  openDlg('Report preview', `<div class="noprint actions" style="margin-bottom:10px"><button class="btn pri" onclick="printReport()">${pdfLabel}</button><span class="small muted">File name: ${esc(lastReport.file)}${HOSTED ? ' · open the downloaded file in a browser and print it to PDF' : ''}</span></div><div id="rp-prev">${html}</div>`, [{ label: 'Close' }, { label: pdfLabel, cls: 'pri', onClick: () => { printReport(); return false; } }]);
  document.getElementById('dlg').style.maxWidth = '900px';
  document.getElementById('report-root').innerHTML = html;
}
let lastReport = null;
function printReport() {
  if (HOSTED) {
    const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n');
    const doc = `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8"><title>${esc(lastReport.file)}</title><style>${css}</style></head><body><div id="report-root" style="display:block">${lastReport.html}</div></body></html>`;
    download(lastReport.file.replace(/\.pdf$/, '.html'), doc, 'text/html');
    return;
  }
  document.body.classList.add('printing');
  const done = () => { document.body.classList.remove('printing'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  window.print(); setTimeout(done, 1500);
}

// ---------- document pieces ----------
function metaBlock(title, e, v, opts) {
  return `<div class="rdoc-head"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><h1>${esc(title)}</h1><span class="conf">${v && /CONFIDENTIAL/.test(v.file) ? 'STRICTLY CONFIDENTIAL — TA HEAD ONLY' : 'CONFIDENTIAL — PEOPLE &amp; CULTURE'}</span></div>
   <div class="meta"><div><b>Employee:</b> ${e ? esc(e.name) + ' (' + esc(e.id) + ')' : 'Team'}</div><div><b>Review period:</b> ${esc(opts.period || PERIOD.label)}</div><div><b>Data cut-off:</b> ${D.nice(PERIOD.cutoff)}</div>
   <div><b>Generated:</b> ${esc(v ? v.at : nowStamp())} by ${esc(v ? v.by : currentUserLabel())}</div><div><b>Version:</b> v${v ? v.version : 1} · ${esc(opts.status || 'Draft')}</div><div><b>Manager:</b> TA Head${e && e.type !== 'TL' && teamLead(e.team) ? ' · TL ' + esc(teamLead(e.team).name) : ''}</div>
   <div><b>Rule version:</b> ${esc(state.rules.version)}</div><div><b>File:</b> ${esc(v ? v.file : '')}</div>${e ? `<div><b>Team / area:</b> ${esc(teamName(e.team))} / ${esc(e.area)} · ${e.type}</div>` : ''}</div>
   ${anyPending() ? '<p class="wm">⧗ PROVISIONAL — one or more scoring rules are awaiting stakeholder approval (see SYSTEM_DESIGN.md §8). Scores may change.</p>' : ''}</div>`;
}
function scoreTable(m) {
  const tlb = m.isTL && state.rules.tlModel === 'TL-B';
  return `<table><thead><tr><th>Pillar</th><th class="n">Self</th><th class="n">TA Head</th><th class="n">Max</th></tr></thead><tbody>
   <tr><td>Business Deliverables${m.isTL ? ' (team goal + own delivery)' : ''}</td><td class="n">${fmt(m.deliverables)}</td><td class="n">${fmt(m.deliverables)}</td><td class="n">${tlb ? 60 : 70}</td></tr>
   ${tlb ? `<tr><td>Leadership effectiveness</td><td class="n">—</td><td class="n">${m.cd.mgr && m.cd.mgr.lead != null ? m.cd.mgr.lead : '—'}</td><td class="n">20</td></tr>` : `<tr><td>Improvement Projects</td><td class="n">${m.projectsSelf == null ? '—' : m.projectsSelf}</td><td class="n">${m.projects == null ? '—' : m.projects}</td><td class="n">15</td></tr>`}
   <tr><td>Competency Development</td><td class="n">${m.cdS == null ? '—' : m.cdS}</td><td class="n">${m.cdM == null ? '—' : (tlb ? r1(m.cdM * 20 / 15) : m.cdM)}</td><td class="n">${tlb ? 20 : 15}</td></tr>
   <tr><th>Total</th><th class="n">${m.selfTotal == null ? '—' : fmt(m.selfTotal)}</th><th class="n">${m.total == null ? '— (partial ' + fmt(m.partial) + ')' : fmt(m.total)}</th><th class="n">100</th></tr></tbody></table>
   <p class="small">Behavioural indicators are a coaching layer and are not weighted. Deliverables are system-calculated and identical in both columns unless overridden.</p>`;
}
function kpiTable(b, title) {
  return `<h3>${esc(title)}</h3><table><thead><tr><th>Measure</th><th class="n">Value</th><th class="n">Score</th></tr></thead><tbody>
   <tr><td>Offers (closed cycles) vs expected</td><td class="n">${b.actualFormal} / ${fmt(b.expectedFormal)} (${b.expectedFormal ? Math.round(b.actualFormal / b.expectedFormal * 100) : '—'}%)</td><td class="n">${fmt(b.offer.score)} / 40</td></tr>
   <tr><td>Weighted hiring points (closed cycles)</td><td class="n">${fmt(b.pointsFormal)}</td><td class="n"></td></tr>
   <tr><td>Joining ratio</td><td class="n">${pct(b.jr)} (${b.joined}/${b.matured})</td><td class="n">${b.jrScore == null ? '—' : b.jrScore} / 15</td></tr>
   <tr><td>Avg req-to-offer cycle time (median)</td><td class="n">${fmt(b.ctAvg)} (${fmt(b.ctMedian)}) days</td><td class="n">${b.ctScore == null ? '—' : b.ctScore} / 10</td></tr>
   <tr><td>Vendor usage</td><td class="n">${pct(b.vendorPct)} (${b.vendor}/${b.applicable})</td><td class="n">${b.vendorScore == null ? '—' : b.vendorScore} / 5</td></tr></tbody></table>`;
}
function rDeliverables(m, opts, full) {
  let h = `<h2>Business Deliverables</h2>`;
  if (m.isTL && m.team) h += kpiTable(m.team, `Team goal achievement (${m.team.members.length} members, TL excluded)`) + (opts.graphs ? cadenceChart(m.team.cycles, { title: 'Team offers per 10-day cycle vs target' }) : '');
  h += kpiTable(m.own, m.isTL ? `Own delivery (target ${fmt(m.target)} per 10 working days)` : 'Key measures');
  const ov = state.overrides.filter(o => o.emp === m.e.id);
  if (ov.length) h += `<p class="small"><b>Overrides:</b> ${ov.map(o => `${o.measure}: ${o.original} → ${o.revised} (${esc(o.reason)}; ${esc(o.by)} ${esc(o.at)})`).join('; ')}</p>`;
  if (opts.graphs) h += cadenceChart(m.own.cycles) + (full ? cumulativeChart(m.own.cycles) : '');
  if (full) h += `<h3>Hiring mix</h3>` + mixTable(m.own);
  return h;
}
function rBehaviour(m) {
  const L = m.latest; if (!L) return '<h2>Self vs TA Head assessment</h2><p>No completed assessment.</p>';
  return `<h2>Self vs TA Head assessment (${esc(L.period)})</h2><table><thead><tr><th>Competency</th><th class="n">Self</th><th class="n">TA Head</th><th class="n">Gap</th><th class="n">Target</th><th>TA Head evidence</th></tr></thead><tbody>${COMPETENCIES.map(c => `<tr><td>${esc(c)}</td><td class="n">${L.self[c] != null ? L.self[c] : '—'}</td><td class="n">${L.mgr[c]}</td><td class="n">${L.self[c] != null ? L.self[c] - L.mgr[c] : '—'}</td><td class="n">${m.e.targets[c]}</td><td class="small">${esc(L.mgrEvidence[c] || '')}</td></tr>`).join('')}</tbody></table>`;
}
function rAFI(m) { const a = deriveAFI(m); return `<h2>Areas for improvement</h2>` + (a.length ? `<table><thead><tr><th>Area</th><th>Evidence</th><th>Expected</th><th>Action</th><th>Target date</th><th>Status</th></tr></thead><tbody>${a.map(x => `<tr><td>${esc(x.area)}</td><td>${esc(x.evidence)}</td><td>${esc(x.expected)}</td><td>${esc(x.action)}</td><td>${D.nice(x.due)}</td><td>${esc(x.status)}</td></tr>`).join('')}</tbody></table>` : '<p>None identified.</p>'); }
function rProjects(m) {
  return `<h2>Improvement projects</h2>` + (m.projs.length ? `<table><thead><tr><th>Project</th><th>Stage (validated)</th><th>Baseline → Target → Actual</th><th class="n">TA Head score</th><th>Counts</th></tr></thead><tbody>${m.projs.map(p => `<tr><td><b>${esc(p.title)}</b><br><span class="small">${esc(p.problem)}</span></td><td>${p.stage >= 0 ? DMAIC[p.stage] : 'Not started'} (${D.nice(p.lastValidated)})</td><td>${esc(p.metric)}: ${p.baseline} → ${p.target} → ${p.actual == null ? '—' : p.actual}</td><td class="n">${p.mgrScore ? sum(Object.values(p.mgrScore)) + ' / 15' : '—'}</td><td>${p.contributing ? 'Yes' : 'No'}</td></tr>`).join('')}</tbody></table>` : '<p>No projects.</p>');
}
function rCompetency(m, opts) {
  const cd = m.cd; let h = `<h2>Competency development</h2><table><thead><tr><th>Dimension</th><th class="n">Self</th><th class="n">TA Head</th><th class="n">Max</th></tr></thead><tbody>
   <tr><td>Capability growth</td><td class="n">${cd.self ? cd.self.g : '—'}</td><td class="n">${cd.mgr ? cd.mgr.g : '—'}</td><td class="n">7</td></tr><tr><td>Application of learning</td><td class="n">${cd.self ? cd.self.a : '—'}</td><td class="n">${cd.mgr ? cd.mgr.a : '—'}</td><td class="n">5</td></tr><tr><td>Plan completion</td><td class="n">${cd.self ? cd.self.c : '—'}</td><td class="n">${cd.mgr ? cd.mgr.c : '—'}</td><td class="n">3</td></tr></tbody></table>`;
  if (m.latest && m.baseline) h += `<h3>Baseline → current → target (TA Head ratings)</h3><table><thead><tr><th>Competency</th><th class="n">Baseline</th><th class="n">Current</th><th class="n">Target</th></tr></thead><tbody>${COMPETENCIES.map(c => `<tr><td>${esc(c)}</td><td class="n">${m.baseline.mgr[c]}</td><td class="n">${m.latest.mgr[c]}</td><td class="n">${m.e.targets[c]}</td></tr>`).join('')}</tbody></table>`;
  if (opts.graphs && m.hist.length) { const c = COMPETENCIES.map(c => ({ c, g: m.e.targets[c] - m.latest.mgr[c] })).sort((a, b) => b.g - a.g)[0].c;
    h += lineChart([{ name: 'TA Head', cls: 's1', values: m.hist.map(a => a.mgr[c]) }, { name: 'Self', cls: 's2 dashed', marker: 'sq', values: m.hist.map(a => a.self[c] != null ? a.self[c] : null) }], m.hist.map(a => a.period), { title: c + ' (largest gap to target)', yMin: 0, yMax: 5, ref: m.e.targets[c], refLabel: 'Target' }); }
  return h;
}
function rTraining(m) { const l = state.learning.filter(x => x.emp === m.e.id); return `<h2>Training &amp; certification</h2>` + (l.length ? `<table><thead><tr><th>Programme</th><th>Provider</th><th>Skill</th><th>Status</th><th>Application</th><th>Validated</th></tr></thead><tbody>${l.map(x => `<tr><td>${esc(x.programme)}${x.cert ? ' (certified)' : ''}</td><td>${esc(x.provider)}</td><td>${esc(x.skill)}</td><td>${esc(x.status)}</td><td>${esc(x.application || '—')}</td><td>${x.validated ? 'Yes' : 'No'}</td></tr>`).join('')}</tbody></table>` : '<p>None.</p>'); }
function rIDP(m) { const it = state.idp[m.e.id] || []; return `<h2>Next-year development plan</h2>` + (it.length ? `<table><thead><tr><th>Priority</th><th>Level</th><th>Training</th><th>Certification</th><th>Stretch</th><th>Application</th><th>Due</th><th>Status</th></tr></thead><tbody>${it.map(i => `<tr><td>${esc(i.area)}</td><td>${i.current} → ${i.target}</td><td>${esc(i.training)}</td><td>${esc(i.cert)}</td><td>${esc(i.stretch)}</td><td>${esc(i.application)}</td><td>${D.nice(i.due)}</td><td>${esc(i.status)}</td></tr>`).join('')}</tbody></table>` : '<p>Not yet created.</p>'); }
function rComments(m, opts) { const c = state.comments[m.e.id] || {}, r = state.review[m.e.id] || {}; return `<h2>Comments</h2>${opts.mc ? `<p><b>TA Head:</b> ${esc(c.mgr || '—')}</p>` : ''}${opts.ec ? `<p><b>Employee:</b> ${esc(r.empComment || c.emp || '—')}</p>` : ''}`; }
function rApproval(m) {
  const r = state.review[m.e.id] || {}, rs = reviewState(m.e.id);
  const hist = state.audit.filter(a => a.object && a.object.includes(m.e.name) || (a.object || '').includes(m.e.id)).slice(0, 12);
  return `<h2>Calibration &amp; approval record</h2><p>${REVIEW_STEPS.map(s => (rs[s[0]] ? '✓ ' : '○ ') + s[1]).join(' · ')}</p>${r.calNote ? `<p><b>Calibration note:</b> ${esc(r.calNote)}</p>` : ''}
   ${hist.length ? `<table><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Detail</th><th>Reason</th></tr></thead><tbody>${hist.map(a => `<tr><td>${esc(a.at)}</td><td>${esc(a.who)}</td><td>${esc(a.action)}</td><td>${esc(a.detail)}</td><td>${esc(a.reason)}</td></tr>`).join('')}</tbody></table>` : ''}`;
}
function rOffers(m) { return `<h2>Annex: Offer transactions</h2><table><thead><tr><th>Offer date</th><th>Req</th><th>Candidate</th><th>Category</th><th>SG</th><th>Gender</th><th class="n">Base</th><th class="n">Bonus</th><th class="n">Total</th><th class="n">Cycle days</th><th>Joining</th><th>Source</th></tr></thead><tbody>${m.own.offers.map(o => { const p = pointsFor(o); return `<tr><td>${o.offerDate}</td><td>${esc(o.req)}</td><td>${esc(o.cand)}</td><td>${esc(o.cat)}</td><td>${esc(o.sg)}</td><td>${esc(o.gender)}</td><td class="n">${p.base}</td><td class="n">${p.bonus}</td><td class="n">${p.total}</td><td class="n">${cycleDays(o)}${o.exc && o.exc.status === 'Approved' ? '*' : ''}</td><td>${esc(o.status)}</td><td>${esc(o.source)}</td></tr>`; }).join('')}</tbody></table><p class="small">* excluded from scored average by approved exception; original shown.</p>`; }
function rCadence(m) { return `<h2>10-working-day cadence</h2><table><thead><tr><th>Cycle</th><th>Period</th><th class="n">Target</th><th class="n">Offers</th><th class="n">Points</th><th class="n">Variance</th><th>Status</th></tr></thead><tbody>${m.own.cycles.map(c => `<tr><td>${c.n}</td><td>${D.nice(c.from)} – ${D.nice(c.to)}</td><td class="n">${fmt(c.target)}</td><td class="n">${c.offers}</td><td class="n">${fmt(c.points)}</td><td class="n">${fmt(c.offers - c.target)}</td><td>${c.closed ? (c.offers >= c.target ? '✓ Met' : '✕ Missed') : '○ Partial (not scored)'}</td></tr>`).join('')}</tbody></table>`; }
function rCalc(m) {
  const b = m.own, R = state.rules;
  return `<h2>Annex: Calculation detail</h2><table><tbody>
   <tr><td>Eligible working days (to cut-off)</td><td>${b.days}${m.e.leave ? ' (approved leave excluded)' : ''}</td></tr><tr><td>Closed 10-day cycles</td><td>${b.nClosed}</td></tr>
   <tr><td>Offer target per 10 days</td><td>${fmt(m.target)}${m.isTL ? ' (' + Math.round(R.tlTargetShare * 100) + '% of team-member target)' : ''}</td></tr>
   <tr><td>Expected offers (closed)</td><td>${b.nClosed} × ${fmt(m.target)} = ${fmt(b.expectedFormal)}</td></tr><tr><td>Hiring points table</td><td>${esc(POINT_TABLES[R.pointsTable].label)} (pending D-01)</td></tr>
   <tr><td>Offer score formula</td><td>${esc(R.offerFormula)}: ${esc(b.offer.how || '')}; volume gate below ${R.gate.g * 100}% → cap ${R.gate.c * 40}${b.offer.gated ? ' (applied)' : ''}</td></tr>
   <tr><td>Joining ratio bands</td><td>${R.jrBands.map(x => '≥' + x[0] + '%→' + x[1]).join(', ')}</td></tr><tr><td>Cycle time bands</td><td>&lt;${R.ctBands.strong}→10, ${R.ctBands.strong}–${R.ctBands.acceptable}→7, &gt;${R.ctBands.acceptable}→4; ${b.ctExcluded} excluded</td></tr>
   <tr><td>Vendor usage</td><td>${b.vendor}/${b.applicable}; excluded categories: ${esc(R.vendorExcluded.join(', '))}</td></tr>
   ${m.isTL ? `<tr><td>Team Lead model</td><td>${esc(R.tlModel)} (proposed): team ${fmt(m.teamDel.total)}/70 and own ${fmt(m.ownDel.total)}/70 combined</td></tr>` : ''}</tbody></table>`;
}

function personDoc(type, id, opts, v) {
  const m = metrics(id), e = m.e; const T = REPORT_TYPES[type];
  const title = type === 'annual' ? `${PERIOD.year} Annual Performance Report${e.type === 'TL' ? ' — Team Lead' : ''}` : T.label;
  let h = `<div class="rdoc">` + metaBlock(title, e, v, opts);
  if (type === 'annual' || type === 'full') {
    const r = state.review[id] || {};
    const L = m.latest; const strengths = L ? COMPETENCIES.filter(c => L.mgr[c] >= 4) : []; const gaps = L ? COMPETENCIES.filter(c => L.mgr[c] < e.targets[c]) : [];
    h += `<h2>Executive summary</h2><p style="white-space:pre-wrap">${esc(r.summary || draftSummary(id))}</p>${r.summary ? '' : '<p class="wm">Draft generated from data (FACT/SUGGESTION). TA Head to edit before finalising.</p>'}
      <h2>Overall score</h2>${scoreTable(m)}` + rDeliverables(m, opts, type === 'full') + `<div class="pb"></div>` + rProjects(m) + rCompetency(m, { graphs: type === 'full' && opts.graphs }) + rBehaviour(m)
      + `<h2>Key strengths</h2><p>${strengths.map(esc).join(', ') || '—'}</p><h2>Key improvement areas</h2><p>${gaps.map(esc).join(', ') || '—'}</p><h2>Significant contributions</h2><p>${m.projs.filter(p => p.stage >= 3).map(p => esc(p.title) + (p.actual != null ? ` (${esc(p.metric)} ${p.baseline} → ${p.actual})` : '')).join('; ') || '—'}</p>`
      + `<div class="pb"></div>` + rIDP(m) + rComments(m, opts) + rApproval(m);
    if (type === 'full') h += rAFI(m) + rTraining(m);
    if (opts.tx && !opts.summary) h += `<div class="pb"></div>` + rCalc(m) + rCadence(m) + rOffers(m) + rTraining(m);
  } else {
    const map = { deliverables: () => rDeliverables(m, opts, true) + (opts.tx ? rCalc(m) : ''), offers: () => rOffers(m), cadence: () => rCadence(m) + (opts.graphs ? cadenceChart(m.own.cycles) + cumulativeChart(m.own.cycles) : ''),
      joining: () => kpiTable(m.own, 'Joining & conversion') + `<p>Matured offers ${m.own.matured}; joined ${m.own.joined}; declined ${m.own.declined}; no-show ${m.own.noshow}; not yet due ${m.own.pending}.</p>`,
      cycletime: () => `<h2>Cycle time</h2><p>Average ${fmt(m.own.ctAvg)} days · median ${fmt(m.own.ctMedian)} · ${m.own.ctCount} offers · ${m.own.ctExcluded} excluded by approved exception.</p><table><thead><tr><th>Band</th><th class="n">Offers</th></tr></thead><tbody><tr><td>&lt;45 days</td><td class="n">${m.own.ctBands[0]}</td></tr><tr><td>45–55 days</td><td class="n">${m.own.ctBands[1]}</td></tr><tr><td>&gt;55 days</td><td class="n">${m.own.ctBands[2]}</td></tr></tbody></table>`,
      vendor: () => `<h2>Vendor usage</h2><p>${pct(m.own.vendorPct)} — ${m.own.vendor} vendor of ${m.own.applicable} applicable offers. Score ${m.own.vendorScore == null ? '—' : m.own.vendorScore}/5.</p>`,
      behaviour: () => rBehaviour(m) + rAFI(m), afi: () => rAFI(m), projects: () => rProjects(m), competency: () => rCompetency(m, opts) + rTraining(m), training: () => rTraining(m), idp: () => rIDP(m),
      selfmgr: () => rBehaviour(m) + `<h2>Totals</h2>` + scoreTable(m) };
    h += (map[type] || map.deliverables)();
    if (opts.mc || opts.ec) h += rComments(m, opts);
  }
  return h + `</div>`;
}

function teamDoc(type, ids, opts, v) {
  let h = `<div class="rdoc">` + metaBlock(REPORT_TYPES[type].label, null, v, opts);
  if (type === 'compare') {
    const ms = ids.map(metrics);
    const rows = [['Team / area', m => teamName(m.e.team) + ' / ' + m.e.area], ['Role type', m => m.e.type], ['Deliverables /70', m => fmt(m.deliverables)], ['Projects /15', m => m.projects == null ? '—' : m.projects], ['Competency Dev /15', m => m.cdM == null ? '—' : m.cdM], ['Total /100', m => m.total == null ? '(' + fmt(m.partial) + ')' : fmt(m.total)], ['Self total', m => fmt(m.selfTotal)],
      ['Offers / expected (closed)', m => m.own.actualFormal + ' / ' + fmt(m.own.expectedFormal)], ['Volume %', m => m.vol == null ? '—' : Math.round(m.vol * 100) + '%'], ['Weighted points', m => fmt(m.own.pointsFormal)], ['Joining ratio', m => pct(m.own.jr)], ['Avg cycle time', m => fmt(m.own.ctAvg)], ['Vendor usage', m => pct(m.own.vendorPct)],
      ...COMPETENCIES.map(c => [c, m => m.latest ? m.latest.mgr[c] : '—'])];
    h += `<table><thead><tr><th>Measure</th>${ms.map(m => `<th class="n">${esc(m.e.name)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r[0])}</td>${ms.map(m => `<td class="n">${esc(r[1](m))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    if (new Set(ms.map(m => m.e.type)).size > 1) h += '<p class="small">Note: individual contributors and team leads use different deliverables templates.</p>';
    if (opts.graphs) h += hbars(ms.map(m => ({ label: m.e.name, value: m.total != null ? m.total : m.partial })), { title: 'Total score', max: 100 });
    h += '<p class="small">For calibration consistency, not forced ranking. Consider business area, eligible working days and role type.</p>';
  } else if (type === 'calibration') {
    const list = sortedEmployees().map(e => metrics(e.id));
    for (const grp of [['IC', 'Individual contributors'], ['TL', 'Team leads']]) {
      const g = list.filter(m => m.e.type === grp[0]).sort((a, b) => (b.total || b.partial) - (a.total || a.partial));
      h += `<h2>${grp[1]}</h2><table><thead><tr><th>Employee</th><th>Team / area</th><th class="n">Deliv.</th><th class="n">Proj.</th><th class="n">Dev.</th><th class="n">Total</th><th class="n">Self</th><th class="n">Gap</th><th>Status</th></tr></thead><tbody>${g.map(m => `<tr><td>${esc(m.e.name)}</td><td>${esc(teamName(m.e.team))} / ${esc(m.e.area)}</td><td class="n">${fmt(m.deliverables)}</td><td class="n">${m.projects == null ? '—' : m.projects}</td><td class="n">${m.cdM == null ? '—' : m.cdM}</td><td class="n">${m.total == null ? '(' + fmt(m.partial) + ')' : fmt(m.total)}</td><td class="n">${fmt(m.selfTotal)}</td><td class="n">${m.selfTotal != null && m.total != null ? fmt(m.selfTotal - m.total) : '—'}</td><td>${STATUS[m.status][0]} ${STATUS[m.status][1]}</td></tr>`).join('')}</tbody></table>`;
    }
    if (opts.graphs) h += histogram(list.filter(m => m.e.type === 'IC').map(m => m.total).filter(x => x != null), { title: 'Distribution of totals — individual contributors' });
    const ex = exceptionsList();
    h += `<h2>Open exceptions (${ex.length})</h2><table><thead><tr><th>Employee</th><th>Exception</th><th>Value</th></tr></thead><tbody>${ex.slice(0, 40).map(x => `<tr><td>${esc(x.name)}</td><td>${esc(x.type)}</td><td>${esc(x.value)}</td></tr>`).join('')}</tbody></table>`;
  } else if (type === 'talent') {
    h += `<p><b>Advisory only.</b> Criteria are illustrative pending HR policy (D-30). Final decisions rest with the TA Head and the HR promotion process.</p><table><thead><tr><th>Employee</th><th>Level (yrs)</th><th>Last 3 ratings</th><th class="n">Score</th><th>Readiness</th><th>Reasons</th><th>Decision / note</th></tr></thead><tbody>`
      + sortedEmployees().map(e => { const pr = promotion(e.id), m = metrics(e.id), d = state.promo[e.id] || {}; return `<tr><td>${esc(e.name)}</td><td>${esc(e.level)} (${fmt(pr.yrs)})</td><td>${e.ratings.map(r => esc(r || '—')).join(' / ')}</td><td class="n">${m.total == null ? '(' + fmt(m.partial) + ')' : fmt(m.total)}</td><td>${esc(pr.level)}</td><td class="small">${pr.crit.map(c => (c.ok ? '✓ ' : '✕ ') + esc(c.label) + ' — ' + esc(c.fact)).join('<br>')}</td><td>${esc(d.decision || '—')}${d.note ? '<br><span class="small">' + esc(d.note) + '</span>' : ''}</td></tr>`; }).join('') + `</tbody></table>`;
  }
  return h + `</div>`;
}

// ---------- Excel ----------
function personSheets(type, id, opts, prefix) {
  const m = metrics(id), e = m.e, b = m.own, p = prefix ? e.name.split(' ')[0] + ' ' : '';
  const sheets = [];
  const summary = [['Employee', e.name], ['Employee ID', e.id], ['Team', teamName(e.team)], ['Business area', e.area], ['Role type', e.type], ['Job level', e.level], ['Period', PERIOD.label], ['Data cut-off', PERIOD.cutoff], ['Rule version', state.rules.version], ['Provisional', anyPending() ? 'Yes — rules pending approval' : 'No'], [],
    ['Pillar', 'Self', 'TA Head', 'Max'], ['Business Deliverables', m.deliverables, m.deliverables, 70], ['Improvement Projects', m.projectsSelf, m.projects, 15], ['Competency Development', m.cdS, m.cdM, 15], ['Total', m.selfTotal, m.total, 100], [],
    ['Measure', 'Value', 'Score'], ['Offers closed cycles', b.actualFormal, b.offer.score], ['Expected closed cycles', r1(b.expectedFormal)], ['Weighted points', r1(b.pointsFormal)], ['Joining ratio %', r1(b.jr), b.jrScore], ['Avg cycle time', r1(b.ctAvg), b.ctScore], ['Median cycle time', r1(b.ctMedian)], ['Vendor usage %', r1(b.vendorPct), b.vendorScore]];
  if (m.isTL && m.team) summary.push([], ['Team goal (TL excluded)', ''], ['Team offers / expected', m.team.actualFormal, r1(m.team.expectedFormal)], ['Team deliverables /70', m.teamDel.total], ['Team joining %', r1(m.team.jr)], ['Team avg cycle', r1(m.team.ctAvg)], ['Team vendor %', r1(m.team.vendorPct)]);
  sheets.push({ name: p + 'Summary', rows: summary });
  const want = k => ['annual', 'full'].includes(type) || type === k || (type === 'deliverables' && ['offers', 'cadence'].includes(k)) || (type === 'competency' && k === 'training');
  if (want('cadence')) sheets.push({ name: p + 'Cadence', rows: [['Cycle', 'From', 'To', 'Closed', 'Target', 'Offers', 'Points', 'Variance']].concat(b.cycles.map(c => [c.n, c.from, c.to, c.closed ? 'Yes' : 'Partial', r1(c.target), c.offers, r1(c.points), r1(c.offers - c.target)])) });
  if (want('offers') && opts.tx !== false) sheets.push({ name: p + 'Offers', rows: [['Offer date', 'Requisition', 'Candidate ID', 'Business area', 'Category', 'SG', 'Gender', 'Base', 'Bonus', 'Total points', 'Req created', 'Cycle days', 'Exception', 'Expected joining', 'Actual joining', 'Joining status', 'Source', 'Vendor', 'Batch', 'Employee confirmed']].concat(b.offers.map(o => { const pt = pointsFor(o); return [o.offerDate, o.req, o.cand, o.area, o.cat, o.sg, o.gender, pt.base, pt.bonus, pt.total, o.reqDate, cycleDays(o), o.exc ? o.exc.reason + ' (' + o.exc.status + ')' : '', o.expJoin, o.actJoin, o.status, o.source, o.vendor, o.batch, o.confirmed ? 'Yes' : '']; })) });
  if (want('behaviour') || want('selfmgr')) sheets.push({ name: p + 'Self vs TA Head', rows: [['Period', 'Competency', 'Self', 'TA Head', 'Gap', 'Target', 'Self evidence', 'TA Head evidence']].concat([].concat(...m.hist.map(a => COMPETENCIES.map(c => [a.period, c, a.self[c], a.mgr[c], a.self[c] != null ? a.self[c] - a.mgr[c] : '', e.targets[c], a.selfEvidence[c] || '', a.mgrEvidence[c] || ''])))) });
  if (want('afi') || want('behaviour')) sheets.push({ name: p + 'AFI', rows: [['Area', 'Evidence', 'Expected', 'Action', 'Due', 'Status']].concat(deriveAFI(m).map(a => [a.area, a.evidence, a.expected, a.action, a.due, a.status])) });
  if (want('projects')) sheets.push({ name: p + 'Projects', rows: [['ID', 'Title', 'Problem', 'Metric', 'Baseline', 'Target', 'Actual', 'Validated stage', 'Last validated', 'Contributing', 'TA Head discipline', 'Impact', 'Control', 'Learning', 'TA Head total', 'Self total']].concat(m.projs.map(pr => [pr.id, pr.title, pr.problem, pr.metric, pr.baseline, pr.target, pr.actual, pr.stage >= 0 ? DMAIC[pr.stage] : '', pr.lastValidated, pr.contributing ? 'Yes' : 'No', ...(pr.mgrScore ? [pr.mgrScore.discipline, pr.mgrScore.impact, pr.mgrScore.control, pr.mgrScore.learning, sum(Object.values(pr.mgrScore))] : ['', '', '', '', '']), pr.selfScore ? sum(Object.values(pr.selfScore)) : ''])) });
  if (want('training')) sheets.push({ name: p + 'Learning', rows: [['Programme', 'Provider', 'Type', 'Skill', 'Start', 'Completion', 'Certified', 'Status', 'Application', 'Validated']].concat(state.learning.filter(l => l.emp === id).map(l => [l.programme, l.provider, l.type, l.skill, l.start, l.completion, l.cert ? 'Yes' : 'No', l.status, l.application || '', l.validated ? 'Yes' : 'No'])) });
  if (want('idp')) sheets.push({ name: p + 'IDP', rows: [['Priority', 'Current', 'Target', 'Training', 'Certification', 'Stretch', 'Application', 'Evidence', 'Due', 'Status']].concat((state.idp[id] || []).map(i => [i.area, i.current, i.target, i.training, i.cert, i.stretch, i.application, i.evidence, i.due, i.status])) });
  return sheets;
}
function teamSheets(type, ids) {
  if (type === 'talent') return [{ name: 'Talent CONFIDENTIAL', rows: [['STRICTLY CONFIDENTIAL — TA HEAD ONLY'], ['Employee', 'Team', 'Job level', 'Years in level', `Rating ${PERIOD.year - 1}`, `Rating ${PERIOD.year - 2}`, `Rating ${PERIOD.year - 3}`, 'Score', 'Readiness (advisory)', 'Criteria met', 'Reasons', 'Decision', 'Note']].concat(sortedEmployees().map(e => { const pr = promotion(e.id), m = metrics(e.id), d = state.promo[e.id] || {}; return [e.name, teamName(e.team), e.level, r1(pr.yrs), ...e.ratings.map(r => r || ''), m.total != null ? m.total : m.partial, pr.level, pr.met, pr.crit.map(c => (c.ok ? 'MET ' : 'NOT MET ') + c.label + ' — ' + c.fact).join(' | '), d.decision || '', d.note || '']; })) }];
  const list = type === 'compare' ? ids.map(metrics) : sortedEmployees().map(e => metrics(e.id));
  const rows = [['Employee', 'Team', 'Area', 'Role type', 'Deliverables /70', 'Projects /15', 'Competency Dev /15', 'Total', 'Self total', 'Volume %', 'Offers (closed)', 'Expected (closed)', 'Points', 'Joining %', 'Avg cycle', 'Vendor %', ...COMPETENCIES]].concat(list.map(m => [m.e.name, teamName(m.e.team), m.e.area, m.e.type, m.deliverables, m.projects, m.cdM, m.total, m.selfTotal, m.vol == null ? '' : Math.round(m.vol * 100), m.own.actualFormal, r1(m.own.expectedFormal), r1(m.own.pointsFormal), r1(m.own.jr), r1(m.own.ctAvg), r1(m.own.vendorPct), ...COMPETENCIES.map(c => m.latest ? m.latest.mgr[c] : '')]));
  const sheets = [{ name: type === 'compare' ? 'Comparison' : 'Calibration', rows }];
  if (type === 'calibration') sheets.push({ name: 'Exceptions', rows: [['Employee', 'Exception', 'Measure', 'Value', 'Threshold']].concat(exceptionsList().map(x => [x.name, x.type, x.measure, x.value, x.threshold])) });
  return sheets;
}
// Real .xlsx when SheetJS has loaded (needs internet); otherwise Excel 2003 XML (.xls) for offline use.
function excelExt() { return window.XLSX ? 'xlsx' : 'xls'; }
function reportInfoRows(versions) {
  return [['Report', versions.map(v => v.type).join('; ')], ['Files', versions.map(v => v.file).join('; ')], ['Version', versions.map(v => 'v' + v.version + ' ' + v.status).join('; ')], ['Generated', nowStamp() + ' by ' + currentUserLabel()], ['Data cut-off', PERIOD.cutoff], ['Rule version', state.rules.version], ['Classification', 'Confidential — People & Culture'], ['Status', anyPending() ? 'Provisional: scoring rules pending approval' : 'Rules approved']];
}
function excelFile(sheets, versions) {
  if (!window.XLSX) return xlsWorkbook(sheets, versions);
  const wb = XLSX.utils.book_new(), used = new Set();
  [{ name: 'Report info', rows: reportInfoRows(versions) }].concat(sheets).forEach(s => {
    let n = s.name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31); while (used.has(n)) n = n.slice(0, 28) + used.size; used.add(n);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s.rows.map(r => (r || []).map(c => c == null ? '' : c))), n);
  });
  return new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]);
}
function xlsWorkbook(sheets, versions) {
  const x = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const meta = reportInfoRows(versions);
  const used = new Set();
  const sheetXml = (name, rows) => { let n = name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31); while (used.has(n)) n = n.slice(0, 28) + used.size; used.add(n);
    return `<Worksheet ss:Name="${x(n)}"><Table>${rows.map((r, i) => `<Row>${(r || []).map(c => typeof c === 'number' && isFinite(c) ? `<Cell${i === 0 ? ' ss:StyleID="h"' : ''}><Data ss:Type="Number">${c}</Data></Cell>` : `<Cell${i === 0 ? ' ss:StyleID="h"' : ''}><Data ss:Type="String">${x(c)}</Data></Cell>`).join('')}</Row>`).join('')}</Table></Worksheet>`; };
  return `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#EEF3F5" ss:Pattern="Solid"/></Style></Styles>`
    + sheetXml('Report info', meta) + sheets.map(s => sheetXml(s.name, s.rows)).join('') + `</Workbook>`;
}
