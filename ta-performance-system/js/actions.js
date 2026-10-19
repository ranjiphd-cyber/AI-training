/* User actions: dialogs and state changes. Every change that matters is audited. */

const opt = (arr, cur) => arr.map(v => `<option ${v === cur ? 'selected' : ''}>${esc(v)}</option>`).join('');
const ratingSel = (id, cur) => `<select id="${id}">${[1, 2, 3, 4, 5].map(v => `<option value="${v}" ${v === cur ? 'selected' : ''}>${v} · ${LEVEL_ANCHORS[v]}</option>`).join('')}</select>`;
const nextPeriod = id => { const h = state.assessments[id] || []; const order = ['Baseline', 'Q1', 'Q2', 'Q3', 'Q4']; const last = h.length ? order.indexOf(h[h.length - 1].period) : -1; return order[Math.min(order.length - 1, last + 1)]; };

// ---------- offers ----------
function offersDlg(id) {
  const b = metrics(id).own;
  const rows = b.offers.map(o => { const p = pointsFor(o); return `<tr><td class="mono">${esc(o.req)}</td><td class="mono">${esc(o.cand)}</td><td>${D.nice(o.offerDate)}</td><td>${esc(o.cat)}</td><td>${esc(o.sg)}</td><td>${esc(o.gender)}</td><td class="n">${p.base}</td><td class="n">${p.bonus}</td><td class="n">${p.total}</td><td class="n">${cycleDays(o)}${o.exc ? ` <span class="chip" data-tip="${esc(o.exc.reason + ' · ' + o.exc.status)}">excl.</span>` : ''}</td><td>${esc(o.status)}</td><td>${esc(o.source)}</td><td>${o.confirmed ? '✓' : ''}</td>${isHead() ? `<td><button class="btn sm" onclick="exceptionDlg('${o.id}')">Exception</button></td>` : ''}</tr>`; }).join('');
  openDlg('Offer details — ' + emp(id).name, `<p class="small muted">${b.offers.length} offers to ${D.nice(PERIOD.cutoff)}. Points use ${esc(POINT_TABLES[state.rules.pointsTable].label)}. ✓ = confirmed by employee.</p>
    <div class="tbl-wrap"><table><thead><tr><th>Req</th><th>Candidate</th><th>Offer date</th><th>Category</th><th>SG</th><th>Gender</th><th class="n">Base</th><th class="n">Bonus</th><th class="n">Total</th><th class="n">Cycle days</th><th>Joining</th><th>Source</th><th>Conf.</th>${isHead() ? '<th></th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>`,
    [{ label: 'Download Excel', onClick: () => { sectionReport(id, 'offers', 'xls'); return false; } }, { label: 'Close', cls: 'pri' }]);
  document.getElementById('dlg').style.maxWidth = '1100px';
}
function exceptionDlg(oid) {
  const o = state.offers.find(x => x.id === oid);
  openDlg('Cycle-time exception — ' + o.req, `<p class="small">Original cycle time <b>${cycleDays(o)} days</b> stays visible. An approved exception removes it from the scored average.</p>
   <div class="formgrid"><label class="field">Reason (list pending D-12)<select id="x-r">${opt(['Business hold', 'Hiring-manager delay', 'Approval delay', 'Niche search', 'Other'], o.exc && o.exc.reason)}</select></label>
   <label class="field">Decision<select id="x-s">${opt(['Approved', 'Rejected', 'Remove exception'], o.exc && o.exc.status)}</select></label></div><label class="field">Justification<textarea id="x-j" rows="2"></textarea></label>`,
    [{ label: 'Cancel' }, { label: 'Save', cls: 'pri', onClick: () => { const j = val('x-j'); if (!requireReason(j)) return false; const s = val('x-s');
      const before = o.exc ? o.exc.status : 'none';
      o.exc = s === 'Remove exception' ? null : { reason: val('x-r'), status: s, by: 'TA Head', at: nowStamp(), note: j };
      audit('Cycle-time exception', o.req, `${before} → ${o.exc ? o.exc.status : 'none'} (${val('x-r')})`, j); touch(); render(); toast('Exception saved'); } }]);
}

// ---------- overrides ----------
function overrideDlg(id, k) {
  const names = { offer: ['Offer Delivery & Complexity', 40], jr: ['Joining Ratio', 15], ct: ['Req-to-Offer Cycle Time', 10], vendor: ['Vendor Usage', 5] };
  const m = metrics(id); const part = m.ownDel.parts.find(p => p.k === k);
  const ex = state.overrides.find(o => o.emp === id && o.measure === k);
  openDlg('Override — ' + names[k][0], `<p class="small">Calculated value: <b>${part.original == null ? '—' : part.original}</b> / ${names[k][1]}. Overrides keep the original value, and need a justification and evidence (BRD §14).</p>
   <div class="formgrid"><label class="field">Revised score<input type="number" id="ov-v" min="0" max="${names[k][1]}" step="0.5" value="${ex ? ex.revised : ''}"></label><label class="field">Evidence link<input type="text" id="ov-e" value="${ex ? esc(ex.evidence || '') : ''}"></label></div>
   <label class="field">Justification (required)<textarea id="ov-r" rows="3">${ex ? esc(ex.reason) : ''}</textarea></label>`,
    [ex ? { label: 'Remove override', onClick: () => { askText('Remove override', 'Reason for removing the override:', r => { state.overrides = state.overrides.filter(o => o !== ex); audit('Override removed', emp(id).name + ' · ' + names[k][0], `${ex.revised} → calculated ${part.original}`, r); touch(); render(); }); return false; } } : { label: 'Cancel' },
     { label: 'Save override', cls: 'pri', onClick: () => { const v = parseFloat(val('ov-v')), r = val('ov-r'); if (isNaN(v) || v < 0 || v > names[k][1]) { toast('Enter a score between 0 and ' + names[k][1]); return false; } if (!requireReason(r)) return false;
       state.overrides = state.overrides.filter(o => !(o.emp === id && o.measure === k));
       state.overrides.push({ emp: id, measure: k, original: part.original, revised: v, reason: r, evidence: val('ov-e'), by: 'TA Head', at: nowStamp() });
       audit('Score override', emp(id).name + ' · ' + names[k][0], `${part.original} → ${v}`, r); touch(); render(); toast('Override saved and audited'); } }]);
}

// ---------- assessments ----------
function assessForm(id, who) {
  const e = emp(id), last = (state.assessments[id] || []).slice(-1)[0];
  return `<p class="small muted">Rate each competency 1–5 with an example. Previous ratings are kept; this creates a new dated record.</p><div class="tbl-wrap"><table><thead><tr><th>Competency</th><th>Previous</th><th>Rating</th><th>Evidence / example</th></tr></thead><tbody>
   ${COMPETENCIES.map((c, i) => `<tr><td>${esc(c)}<br><span class="muted small">Target ${e.targets[c]}</span></td><td class="n">${last && last[who][c] != null ? last[who][c] : '—'}</td><td>${ratingSel('as-' + i, last && last[who][c] != null ? last[who][c] : 3)}</td><td><input type="text" id="ae-${i}" style="width:100%" placeholder="Specific example"></td></tr>`).join('')}</tbody></table></div>`;
}
function selfAssessDlg(id) {
  const h = state.assessments[id] || [], last = h[h.length - 1];
  const per = last && last.selfPending ? last.period : nextPeriod(id);
  openDlg(`Self-assessment — ${per}`, assessForm(id, 'self'), [{ label: 'Cancel' }, { label: 'Submit', cls: 'pri', onClick: () => saveAssessment(id, per, 'self') }]);
}
function mgrAssessDlg(id) {
  const h = state.assessments[id] || [];
  const last = h[h.length - 1];
  const per = last && !last.mgrPending ? nextPeriod(id) : (last ? last.period : 'Baseline');
  openDlg(`TA Head assessment — ${emp(id).name} — ${per}`, assessForm(id, 'mgr') + '<p class="small muted">Rate independently. The self-rating for this period is shown on the dashboard after you submit.</p>',
    [{ label: 'Cancel' }, { label: 'Submit', cls: 'pri', onClick: () => saveAssessment(id, per, 'mgr') }]);
}
function saveAssessment(id, per, who) {
  const h = state.assessments[id] = state.assessments[id] || [];
  let rec = h.find(a => a.period === per);
  const vals = {}, ev = {};
  COMPETENCIES.forEach((c, i) => { vals[c] = +val('as-' + i); ev[c] = val('ae-' + i); });
  if (!rec) {
    const last = h[h.length - 1];
    rec = { period: per, date: per === 'Q4' ? '2026-12-15' : D.fmt(Date.now()), self: {}, mgr: {}, selfEvidence: {}, mgrEvidence: {}, by: who };
    rec[who === 'self' ? 'mgrPending' : 'selfPending'] = true;
    h.push(rec);
  } else delete rec[who === 'self' ? 'selfPending' : 'mgrPending'];
  rec[who] = vals; rec[who === 'self' ? 'selfEvidence' : 'mgrEvidence'] = ev;
  if (who === 'self') state.review[id] && (state.review[id].selfDone = true);
  audit(who === 'self' ? 'Self-assessment submitted' : 'TA Head assessment submitted', emp(id).name + ' · ' + per, COMPETENCIES.map(c => c.split(' ')[0] + ' ' + vals[c]).join(', '));
  touch(); render(); toast('Saved. Earlier ratings remain in history.');
}

function afiDlg(id) {
  openDlg('Add area for improvement', `<div class="formgrid"><label class="field">Area<select id="af-a">${opt(COMPETENCIES.concat(['Delivery consistency', 'Data quality', 'Other']))}</select></label><label class="field">Target date<input type="date" id="af-d" value="${D.add(PERIOD.cutoff, 60)}"></label></div>
   <label class="field">Evidence / observation<textarea id="af-e" rows="2"></textarea></label><label class="field">Expected behaviour<input type="text" id="af-x"></label><label class="field">Action and support<input type="text" id="af-c"></label>`,
    [{ label: 'Cancel' }, { label: 'Add', cls: 'pri', onClick: () => { if (!requireReason(val('af-e'))) return false; (state.afi[id] = state.afi[id] || []).push({ area: val('af-a'), evidence: val('af-e'), expected: val('af-x'), action: val('af-c'), due: val('af-d'), status: 'Open' }); audit('Observation added', emp(id).name, val('af-a')); touch(); render(); } }]);
}

// ---------- projects ----------
function projectDlg(id) {
  openDlg('New improvement project', `<label class="field">Title<input type="text" id="pj-t"></label><label class="field">Business problem<textarea id="pj-p" rows="2"></textarea></label>
   <div class="formgrid"><label class="field">Metric<input type="text" id="pj-m"></label><label class="field">Sponsor<input type="text" id="pj-s"></label><label class="field">Baseline<input type="number" id="pj-b"></label><label class="field">Target<input type="number" id="pj-g"></label><label class="field">Start<input type="date" id="pj-st" value="${D.fmt(Date.now())}"></label><label class="field">Planned end<input type="date" id="pj-e" value="${D.add(D.fmt(Date.now()), 180)}"></label></div>`,
    [{ label: 'Cancel' }, { label: 'Create', cls: 'pri', onClick: () => { if (!requireReason(val('pj-t'))) return false; const st = val('pj-st'), en = val('pj-e'), span = Math.max(5, D.diff(en, st));
      const p = { id: 'P-' + String(state.projects.length + 1).padStart(3, '0'), owner: id, title: val('pj-t'), problem: val('pj-p'), metric: val('pj-m'), baseline: +val('pj-b'), target: +val('pj-g'), actual: null, sponsor: val('pj-s'), start: st, planEnd: en,
        stage: -1, inProgress: 0, lastValidated: st, planStages: [1, 2, 3, 4, 5].map(i => D.add(st, Math.round(span * i / 5))), history: [], nextAction: 'Complete Define stage evidence', contributing: false, mgrScore: null, selfScore: null, lessons: '' };
      state.projects.push(p); audit('Project created', p.id, p.title); touch(); render(); } }]);
}
function validateStage(pid) {
  const p = state.projects.find(x => x.id === pid); const next = DMAIC[p.stage + 1];
  openDlg(`Validate ${next} — ${p.title}`, `<p class="small">Confirm the stage evidence is sufficient. Labelling a stage complete does not by itself earn points.</p><label class="field">Evidence reviewed (link or description)<textarea id="vs-e" rows="2"></textarea></label>`,
    [{ label: 'Cancel' }, { label: 'Validate stage', cls: 'pri', onClick: () => { const ev = val('vs-e'); if (!requireReason(ev)) return false;
      p.stage++; p.inProgress = p.stage < 4 ? p.stage + 1 : null; p.lastValidated = D.fmt(Date.now()); p.history.push({ stage: next, validated: p.lastValidated, by: 'TA Head', evidence: ev });
      audit('DMAIC stage validated', p.id + ' · ' + emp(p.owner).name, next, ev); touch(); render(); } }]);
}
function projectScoreDlg(pid, who) {
  const p = state.projects.find(x => x.id === pid); const s = (who === 'mgr' ? p.mgrScore : p.selfScore) || {};
  const f = (k, lab, max) => `<label class="field">${lab} (0–${max})<input type="number" min="0" max="${max}" id="ps-${k}" value="${s[k] != null ? s[k] : ''}"></label>`;
  openDlg((who === 'mgr' ? 'Score project — ' : 'Self-score project — ') + p.title, `<div class="formgrid">${f('discipline', 'Project discipline & execution', 5)}${f('impact', 'Demonstrated business impact', 5)}${f('control', 'Sustainability / control', 3)}${f('learning', 'Learning & knowledge sharing', 2)}</div>
   <p class="small muted">Scoring anchors are not yet defined (D-33). Full marks need evidence and impact, not only completed stages.</p>${who === 'mgr' ? '<label class="field">Rationale<textarea id="ps-r" rows="2"></textarea></label>' : ''}`,
    [{ label: 'Cancel' }, { label: 'Save', cls: 'pri', onClick: () => {
      const n = { discipline: clamp(+val('ps-discipline'), 0, 5), impact: clamp(+val('ps-impact'), 0, 5), control: clamp(+val('ps-control'), 0, 3), learning: clamp(+val('ps-learning'), 0, 2) };
      if (who === 'mgr' && !requireReason(val('ps-r'))) return false;
      const before = who === 'mgr' && p.mgrScore ? Object.values(p.mgrScore).reduce((a, b) => a + b, 0) : '—';
      if (who === 'mgr') p.mgrScore = n; else p.selfScore = n;
      audit(who === 'mgr' ? 'Project scored' : 'Project self-scored', p.id + ' · ' + emp(p.owner).name, `${before} → ${n.discipline + n.impact + n.control + n.learning}`, who === 'mgr' ? val('ps-r') : ''); touch(); render(); } }]);
}
function toggleContrib(pid) { const p = state.projects.find(x => x.id === pid); p.contributing = !p.contributing; audit('Contributing project changed', p.id, p.contributing ? 'Counts toward 15' : 'Excluded'); touch(); render(); }
function projectUpdateDlg(pid) {
  const p = state.projects.find(x => x.id === pid);
  openDlg('Update progress — ' + p.title, `<div class="formgrid"><label class="field">Actual outcome so far<input type="number" id="pu-a" value="${p.actual == null ? '' : p.actual}"></label><label class="field">Stage you are working on<input type="text" disabled value="${p.inProgress != null ? DMAIC[p.inProgress] : 'Complete'}"></label></div>
   <label class="field">Next action<input type="text" id="pu-n" value="${esc(p.nextAction)}"></label><label class="field">Evidence link for current stage<input type="text" id="pu-e"></label><label class="field">Lessons learned<textarea id="pu-l" rows="2">${esc(p.lessons)}</textarea></label>`,
    [{ label: 'Cancel' }, { label: 'Save', cls: 'pri', onClick: () => { const a = val('pu-a'); p.actual = a === '' ? null : +a; p.nextAction = val('pu-n'); p.lessons = val('pu-l'); if (val('pu-e')) p.pendingEvidence = val('pu-e');
      audit('Project progress updated', p.id, 'Actual ' + (p.actual == null ? '—' : p.actual) + '; next: ' + p.nextAction); touch(); render(); toast('Saved. Your TA Head validates stage completion.'); } }]);
}

// ---------- competency development & learning ----------
function compDevDlg(id, who) {
  const cd = state.compDev[id] = state.compDev[id] || {}; const s = cd[who] || {};
  const tl = isLead(emp(id)) && who === 'mgr';
  openDlg((who === 'mgr' ? 'Score competency development — ' : 'Self-score competency development — ') + emp(id).name, `<div class="formgrid">
   <label class="field">Demonstrated capability growth (0–7)<input type="number" id="cd-g" min="0" max="7" value="${s.g != null ? s.g : ''}"></label>
   <label class="field">Application of learning (0–5)<input type="number" id="cd-a" min="0" max="5" value="${s.a != null ? s.a : ''}"></label>
   <label class="field">Completion of agreed plan (0–3)<input type="number" id="cd-c" min="0" max="3" value="${s.c != null ? s.c : ''}"></label>
   ${tl ? `<label class="field">Leadership effectiveness (0–20, TL-B only)<input type="number" id="cd-l" min="0" max="20" value="${s.lead != null ? s.lead : ''}"></label>` : ''}</div>
   <label class="field">Evidence${who === 'mgr' ? ' (required)' : ''}<textarea id="cd-e" rows="2">${esc(s.evidence || '')}</textarea></label><p class="small muted">Conversion rubric not yet defined (D-34). Training attendance alone must not raise this score.</p>`,
    [{ label: 'Cancel' }, { label: 'Save', cls: 'pri', onClick: () => { if (who === 'mgr' && !requireReason(val('cd-e'))) return false;
      const n = { g: clamp(+val('cd-g'), 0, 7), a: clamp(+val('cd-a'), 0, 5), c: clamp(+val('cd-c'), 0, 3), evidence: val('cd-e') };
      if (tl) n.lead = val('cd-l') === '' ? null : clamp(+val('cd-l'), 0, 20);
      const before = cd[who] ? cd[who].g + cd[who].a + cd[who].c : '—'; cd[who] = n;
      audit(who === 'mgr' ? 'Competency development scored' : 'Competency development self-scored', emp(id).name, `${before} → ${n.g + n.a + n.c}`, n.evidence); touch(); render(); } }]);
}
function validateLearning(lid) { const l = state.learning.find(x => x.id === lid); l.validated = true; audit('Learning application validated', emp(l.emp).name, l.programme); touch(); render(); }
function learningDlg(id, lid) {
  const l = lid ? state.learning.find(x => x.id === lid) : {};
  openDlg(lid ? 'Update learning' : 'Add learning', `<div class="formgrid"><label class="field">Programme<input type="text" id="ln-p" value="${esc(l.programme || '')}"></label><label class="field">Provider<input type="text" id="ln-v" value="${esc(l.provider || '')}"></label>
   <label class="field">Skill (competency)<select id="ln-s">${opt(COMPETENCIES, l.skill)}</select></label><label class="field">Status<select id="ln-st">${opt(['Planned', 'In progress', 'Completed'], l.status)}</select></label>
   <label class="field">Completion date<input type="date" id="ln-d" value="${l.completion || ''}"></label><label class="field">Certification obtained<select id="ln-c"><option value="0">No</option><option value="1" ${l.cert ? 'selected' : ''}>Yes</option></select></label></div>
   <label class="field">How you applied it (example)<textarea id="ln-a" rows="2">${esc(l.application || '')}</textarea></label>`,
    [{ label: 'Cancel' }, { label: 'Save', cls: 'pri', onClick: () => { if (!requireReason(val('ln-p'))) return false;
      const n = Object.assign(l, { emp: id, programme: val('ln-p'), provider: val('ln-v'), type: l.type || 'Other', skill: val('ln-s'), status: val('ln-st'), completion: val('ln-d'), cert: val('ln-c') === '1', application: val('ln-a') || null, validated: false });
      if (!lid) { n.id = 'L-' + (state.learning.length + 1) + '-' + Date.now() % 1000; n.start = D.fmt(Date.now()); state.learning.push(n); }
      audit(lid ? 'Learning updated' : 'Learning added', emp(id).name, n.programme); touch(); render(); } }]);
}

// ---------- IDP ----------
function suggestIDP(id) {
  const m = metrics(id); if (!m.latest) { toast('No assessment yet to base suggestions on.'); return; }
  const gaps = COMPETENCIES.map(c => ({ c, g: m.e.targets[c] - m.latest.mgr[c], v: m.latest.mgr[c] })).filter(x => x.g > 0).sort((a, b) => b.g - a.g).slice(0, 3);
  if (!gaps.length) { toast('No validated gaps against target.'); return; }
  const list = state.idp[id] = state.idp[id] || [];
  for (const x of gaps) { if (list.some(i => i.area === x.c)) continue; const L = IDP_LIBRARY[x.c];
    list.push({ id: 'I-' + id + '-' + (list.length + 1), area: x.c, current: x.v, target: m.e.targets[x.c], training: L[0], cert: L[1], stretch: L[2], application: L[3], evidence: 'TA Head-validated example of ' + LEVEL_ANCHORS[m.e.targets[x.c]].toLowerCase() + ' behaviour', due: (PERIOD.year + 1) + '-09-30', status: 'Draft', source: 'Suggestion' }); }
  audit('IDP suggestions drafted', emp(id).name, gaps.map(g => g.c).join(', '), 'From validated gaps; awaiting TA Head approval'); touch(); render(); toast('Draft suggestions added — approve, edit or reject each.');
}
function idpSet(id, k, s) { const it = state.idp[id][k]; if (s === 'remove') { state.idp[id].splice(k, 1); audit('IDP item rejected', emp(id).name, it.area); } else { it.status = s; it.source = 'TA Head'; audit('IDP item ' + s.toLowerCase(), emp(id).name, it.area); } touch(); render(); }
function idpDlg(id, k) {
  const it = k != null ? state.idp[id][k] : { current: 2, target: 3, due: (PERIOD.year + 1) + '-06-30' };
  const f = (key, lab) => `<label class="field">${lab}<input type="text" id="idp-${key}" value="${esc(it[key] || '')}"></label>`;
  openDlg(k != null ? 'Edit development item' : 'Add development item', `<div class="formgrid"><label class="field">Priority area<select id="idp-area">${opt(COMPETENCIES, it.area)}</select></label><label class="field">Due<input type="date" id="idp-due" value="${it.due}"></label>
   <label class="field">Current level<select id="idp-cur">${[1, 2, 3, 4, 5].map(v => `<option ${v === it.current ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label class="field">Target level<select id="idp-tgt">${[1, 2, 3, 4, 5].map(v => `<option ${v === it.target ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
   ${f('training', 'Training')}${f('cert', 'Certification')}${f('stretch', 'Experience / stretch assignment')}${f('application', 'Application project')}</div>${f('evidence', 'Evidence of success')}`,
    [{ label: 'Cancel' }, { label: 'Save', cls: 'pri', onClick: () => {
      const n = Object.assign(it, { area: val('idp-area'), due: val('idp-due'), current: +val('idp-cur'), target: +val('idp-tgt'), training: val('idp-training'), cert: val('idp-cert'), stretch: val('idp-stretch'), application: val('idp-application'), evidence: val('idp-evidence'), source: 'TA Head', status: it.status || 'Draft' });
      if (k == null) { n.id = 'I-' + id + '-' + Date.now() % 10000; (state.idp[id] = state.idp[id] || []).push(n); }
      audit(k == null ? 'IDP item added' : 'IDP item edited', emp(id).name, n.area); touch(); render(); } }]);
}

// ---------- profile, comments, promotion ----------
function profileDlg(id) {
  const e = emp(id);
  openDlg('Job level & rating history — ' + e.name, `<span class="conf">TA Head only</span><div class="formgrid" style="margin-top:10px"><label class="field">Current job level<select id="pf-l">${opt(JOB_LEVELS, e.level)}</select></label><label class="field">In level since<input type="date" id="pf-s" value="${e.since}"></label>
   ${[0, 1, 2].map(i => `<label class="field">Rating ${PERIOD.year - 1 - i}<select id="pf-r${i}"><option value="">—</option>${opt(RATING_SCALE, e.ratings[i])}</select></label>`).join('')}</div>
   <p class="small muted">Rating scale and job levels are placeholders until confirmed (D-28, D-30).</p><label class="field">Reason for change<input type="text" id="pf-why"></label>`,
    [{ label: 'Cancel' }, { label: 'Save', cls: 'pri', onClick: () => { if (!requireReason(val('pf-why'))) return false;
      const before = `${e.level}; ${e.ratings.join('/')}`;
      e.level = val('pf-l'); e.since = val('pf-s'); e.ratings = [0, 1, 2].map(i => val('pf-r' + i) || null);
      audit('Profile updated (confidential)', e.name, `${before} → ${e.level}; ${e.ratings.join('/')}`, val('pf-why')); touch(); render(); } }]);
}
function commentDlg(id, who) {
  const c = state.comments[id] = state.comments[id] || {};
  openDlg(who === 'mgr' ? 'TA Head comment' : 'Your comment', `<textarea id="cm-t" rows="5">${esc(c[who] || '')}</textarea>`, [{ label: 'Cancel' }, { label: 'Save', cls: 'pri', onClick: () => { c[who] = val('cm-t'); audit('Comment saved', emp(id).name, who === 'mgr' ? 'TA Head comment' : 'Employee comment'); touch(); render(); } }]);
}
function setPromo(id, v) { const d = state.promo[id] = state.promo[id] || {}; const before = d.decision || '—'; d.decision = v; d.at = nowStamp(); audit('Promotion decision (confidential)', emp(id).name, `${before} → ${v || '—'}`); touch(); }
function promoNoteDlg(id) {
  const d = state.promo[id] = state.promo[id] || {};
  openDlg('Confidential note — ' + emp(id).name, `<span class="conf">TA Head only</span><textarea id="pn-t" rows="5" style="margin-top:8px">${esc(d.note || '')}</textarea>`, [{ label: 'Cancel' }, { label: 'Save', cls: 'pri', onClick: () => { d.note = val('pn-t'); audit('Promotion note saved (confidential)', emp(id).name, 'Note updated'); touch(); render(); } }]);
}

// ---------- annual review ----------
function freezeCutoff() { state.employees.forEach(e => { state.review[e.id] = state.review[e.id] || {}; state.review[e.id].cutoff = true; }); audit('Cut-off frozen', 'All employees', D.nice(PERIOD.cutoff)); touch(); render(); }
function draftSummary(id) {
  const m = metrics(id), b = m.own, L = m.latest;
  const strengths = L ? COMPETENCIES.filter(c => L.mgr[c] >= 4) : [];
  const gaps = L ? COMPETENCIES.filter(c => L.mgr[c] < m.e.targets[c]) : [];
  return [`FACT: ${b.pointsFormal == null ? 'weighted points not recorded' : r1(b.pointsFormal) + ' weighted points'} against a points target of ${r1(b.pointsTargetFormal)} (${m.att == null ? '—' : Math.round(m.att * 100) + '%'}); ${b.actualFormal} offers.`,
    `FACT: Joining ratio ${r1(b.jr)}%; average cycle time ${r1(b.ctAvg)} days${b.ctMedian != null ? ' (median ' + r1(b.ctMedian) + ')' : ''}; vendor usage ${r1(b.vendorPct)}%.`,
    m.isTL && m.team ? `FACT: Team (${m.team.members.length} members) delivered ${m.team.pointsFormal == null ? 'n/a' : r1(m.team.pointsFormal)} of ${r1(m.team.pointsTargetFormal)} target points (${m.team.actualFormal} offers).` : '',
    `FACT: Projects ${m.projects == null ? 'not yet scored' : m.projects + '/15'}; competency development ${m.cdM == null ? 'not yet scored' : m.cdM + '/15'}.`,
    strengths.length ? `FACT: TA Head rated 4+ on ${strengths.join(', ')}.` : '',
    gaps.length ? `FACT: Below target on ${gaps.join(', ')}.` : '',
    `SUGGESTION: Next-year focus on ${gaps.slice(0, 2).join(' and ') || 'broadening scope'}; confirm wording before finalising.`].filter(Boolean).join('\n');
}
function reviewDlg(id) {
  const e = emp(id), r = state.review[id] = state.review[id] || {}, rs = reviewState(id), m = metrics(id);
  openDlg('Annual review — ' + e.name, `<div class="steps">${REVIEW_STEPS.map(s => `<span class="${rs[s[0]] ? 'done' : ''}">${rs[s[0]] ? '✓' : '○'} ${esc(s[1])}</span>`).join('')}</div>
    <p>Total: <b>${m.total == null ? 'not complete (partial ' + fmt(m.partial) + ')' : fmt(m.total) + ' / 100'}</b> ${provChip()}</p>
    <label class="field">Summary (human-written; a draft can be generated from facts)<textarea id="rv-s" rows="7">${esc(r.summary || '')}</textarea></label>
    <div class="actions" style="margin:6px 0 12px"><button class="btn sm" onclick="document.getElementById('rv-s').value=draftSummary('${id}');document.getElementById('rv-src').value='Draft generated from data, edited by TA Head'">Generate draft from data</button><input type="hidden" id="rv-src" value="${esc(r.summarySource || 'TA Head')}"></div>
    <div class="formgrid"><label class="field"><span><input type="checkbox" id="rv-m" ${r.metrics ? 'checked' : ''}> Metrics validated</span></label><label class="field"><span><input type="checkbox" id="rv-c" ${r.calibrated ? 'checked' : ''}> Calibrated</span></label></div>
    <label class="field">Calibration note (required if calibrated)<input type="text" id="rv-cn" value="${esc(r.calNote || '')}"></label>
    <label class="field">Employee comment (captured from employee)<textarea id="rv-ec" rows="2">${esc(r.empComment || '')}</textarea></label>
    <p class="small muted">Generated drafts separate FACT from SUGGESTION and never change scores. The TA Head edits and owns the final text.</p>`,
    [{ label: 'Cancel' }, { label: 'Save', onClick: () => saveReview(id, false) }, { label: 'Save & finalise report', cls: 'pri', onClick: () => saveReview(id, true) }]);
}
function saveReview(id, finalise) {
  const r = state.review[id];
  r.summary = val('rv-s'); r.summarySource = val('rv-src'); r.metrics = document.getElementById('rv-m').checked; r.empComment = val('rv-ec');
  const cal = document.getElementById('rv-c').checked;
  if (cal && !val('rv-cn')) { toast('Add a calibration note.'); return false; }
  r.calibrated = cal; r.calNote = val('rv-cn');
  if (finalise) {
    const rs = reviewState(id);
    const missing = REVIEW_STEPS.slice(0, 7).filter(s => !rs[s[0]]).map(s => s[1]);
    if (missing.length) { toast('Complete first: ' + missing.join(', ')); return false; }
    r.finalised = true; createReportVersion(id, 'Final Annual Report', 'Calibration Final');
  }
  audit(finalise ? 'Annual review finalised' : 'Annual review saved', emp(id).name, r.calibrated ? 'Calibrated: ' + r.calNote : '', ''); touch(); render();
}

// ---------- requests ----------
function newRequestDlg(empId) {
  const list = sortedEmployees();
  openDlg('New request to employee', `<div class="formgrid"><label class="field">Employee<select id="rq-e">${list.map(e => `<option value="${e.id}" ${e.id === empId ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select></label>
   <label class="field">Request type<select id="rq-t">${opt(['Confirm data', 'Request correction', 'Request evidence', 'Request comment', 'Request self-input'])}</select></label>
   <label class="field">Include offers from<input type="date" id="rq-f" value="${D.add(PERIOD.cutoff, -30)}"></label><label class="field">Due date<input type="date" id="rq-d" value="${D.add(PERIOD.cutoff, 7)}"></label></div>
   <label class="field">Message<textarea id="rq-m" rows="3">Please review the attached records and confirm, correct or add evidence.</textarea></label>
   <p class="small muted">Only the selected employee's own rows are attached. No peer data is shared.</p>`,
    [{ label: 'Cancel' }, { label: 'Send', cls: 'pri', onClick: () => { const e = val('rq-e'), from = val('rq-f');
      const rows = ['Confirm data', 'Request correction'].includes(val('rq-t')) ? state.offers.filter(o => o.emp === e && o.offerDate >= from).map(o => o.id) : [];
      const r = { id: 'RQ-' + String(state.requests.length + 1).padStart(3, '0'), emp: e, type: val('rq-t'), msg: val('rq-m'), rows, due: val('rq-d'), status: 'Sent', created: D.fmt(Date.now()), response: null };
      state.requests.push(r); audit('Request sent', r.id, `${r.type} → ${emp(e).name} (${rows.length} rows)`); touch(); render(); toast('Request sent'); } }]);
}
function requestRowsDlg(rid) {
  const r = state.requests.find(x => x.id === rid);
  if (!isHead() && r.emp !== ui.emp) return;
  const rows = state.offers.filter(o => r.rows.includes(o.id));
  if (!isHead() && r.status === 'Sent') { r.status = 'Viewed'; touch(); }
  openDlg(`${r.id} — records`, rows.length ? `<div class="tbl-wrap"><table><thead><tr><th>Req</th><th>Candidate</th><th>Offer date</th><th>Category</th><th>SG</th><th>Joining</th><th>Source</th><th class="n">Points</th><th class="n">Cycle days</th></tr></thead><tbody>${rows.map(o => `<tr><td class="mono">${esc(o.req)}</td><td class="mono">${esc(o.cand)}</td><td>${D.nice(o.offerDate)}</td><td>${esc(o.cat)}</td><td>${esc(o.sg)}</td><td>${esc(o.status)}</td><td>${esc(o.source)}</td><td class="n">${pointsFor(o).total}</td><td class="n">${cycleDays(o)}</td></tr>`).join('')}</tbody></table></div><p class="small muted">Points and cycle days are calculated by the system.</p>` : '<p class="empty">No records attached.</p>');
}
function respondDlg(rid) {
  const r = state.requests.find(x => x.id === rid);
  const rows = state.offers.filter(o => r.rows.includes(o.id));
  openDlg('Respond — ' + r.type, `<p>${esc(r.msg)}</p><label class="field">Response<select id="rs-k">${opt(r.type === 'Request evidence' ? ['Evidence provided', 'Comment'] : ['Confirm all', 'Dispute', 'Comment', 'Evidence provided'])}</select></label>
   ${rows.length ? `<label class="field">Record concerned (for disputes)<select id="rs-row"><option value="">—</option>${rows.map(o => `<option value="${o.id}">${esc(o.req)} · ${esc(o.cand)} · ${D.nice(o.offerDate)}</option>`).join('')}</select></label>` : ''}
   <label class="field">Explanation / comment<textarea id="rs-t" rows="3"></textarea></label><label class="field">Evidence link (optional)<input type="text" id="rs-l"></label>
   <p class="small muted">You cannot edit imported records directly. Your TA Head reviews disputes and corrections; affected KPIs show “under review” meanwhile.</p>`,
    [{ label: 'Cancel' }, { label: 'Submit', cls: 'pri', onClick: () => { const k = val('rs-k'); if (k !== 'Confirm all' && !requireReason(val('rs-t'))) return false;
      r.response = { kind: k, text: val('rs-t') || 'Confirmed', link: val('rs-l'), row: val('rs-row') || null, at: nowStamp() };
      if (k === 'Confirm all') { state.offers.forEach(o => { if (r.rows.includes(o.id)) o.confirmed = true; }); r.status = 'Closed'; } else r.status = 'Responded';
      audit('Employee response', r.id, k + (r.response.row ? ' · ' + r.response.row : ''), r.response.text); touch(); render(); toast('Response sent to TA Head'); } }]);
}
function decideRequest(rid, decision) {
  const r = state.requests.find(x => x.id === rid);
  askText(decision === 'Accepted' ? 'Accept response' : 'Reject response', decision === 'Accepted' ? 'What will change? (recorded in the audit log)' : 'Reason for rejecting:', note => applyDecision(r, decision, note));
}
function applyDecision(r, decision, note) {
  r.status = 'Closed'; r.decision = decision + ' — ' + note;
  if (decision === 'Accepted' && r.response && r.response.kind === 'Dispute' && r.response.row) {
    const o = state.offers.find(x => x.id === r.response.row);
    if (o && /revok/i.test(r.response.text + note)) { const before = o.status; o.status = 'Revoked'; audit('Record amended', o.req, `Joining status ${before} → Revoked`, note); }
  }
  audit('Request ' + decision.toLowerCase(), r.id, emp(r.emp).name, note); touch(); render();
}

// ---------- setup ----------
function memberDlg(id) {
  const e = id ? emp(id) : { team: Object.keys(state.teams)[0], area: teamAreas(Object.keys(state.teams)[0])[0], type: 'IC', level: JOB_LEVELS[0], ratings: [null, null, null], alsoTeams: [], flags: [], status: 'Active' };
  const head = isHead();
  openDlg(id ? 'Edit team member' : 'Add team member', `<div class="formgrid"><label class="field">Employee ID<input type="text" id="mb-id" value="${esc(e.id || '')}" ${id ? 'disabled' : ''}></label><label class="field">Name<input type="text" id="mb-n" value="${esc(e.name || '')}"></label>
   <label class="field">Team<select id="mb-t" onchange="document.getElementById('mb-a').innerHTML=teamAreas(this.value).map(x=>'<option>'+esc(x)+'</option>').join('')">${Object.entries(state.teams).map(([k, t]) => `<option value="${k}" ${k === e.team ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>
   <label class="field">Business area<select id="mb-a">${opt(teamAreas(e.team).includes(e.area) || !e.area ? teamAreas(e.team) : [e.area, ...teamAreas(e.team)], e.area)}</select></label>
   <label class="field">Role<select id="mb-ty">${Object.entries(state.roles).map(([k, r]) => `<option value="${k}" ${k === e.type ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>
   <label class="field">Status<select id="mb-st2"><option ${e.status !== 'Former' ? 'selected' : ''}>Active</option><option ${e.status === 'Former' ? 'selected' : ''}>Former</option></select></label>
   <label class="field">Also known as (full name, spellings; comma-separated)<input type="text" id="mb-al" value="${esc(e.aliases || '')}"></label>
   <label class="field">With the team since<input type="date" id="mb-jn" value="${e.joined || ''}"></label>
   <label class="field" style="grid-column:1/-1">Role description (org chart)<input type="text" id="mb-rn" value="${esc(e.roleNote || '')}"></label>
   <label class="field">Start date (only if joined mid-year)<input type="date" id="mb-st" value="${e.start || ''}"></label><label class="field">Leaving date (former members)<input type="date" id="mb-end" value="${e.end || ''}"></label>
   ${head ? `<label class="field">Job level<select id="mb-l">${opt(JOB_LEVELS.includes(e.level) ? JOB_LEVELS : [e.level, ...JOB_LEVELS], e.level)}</select></label><label class="field">In level since<input type="date" id="mb-s" value="${e.since || ''}"></label>
   ${[0, 1, 2].map(i => `<label class="field">Rating ${PERIOD.year - 1 - i} (TA Head only)<select id="mb-r${i}"><option value="">—</option>${opt(RATING_SCALE, e.ratings[i])}</select></label>`).join('')}` : ''}</div>
   <fieldset style="border:1px solid var(--line);border-radius:8px;margin:10px 0;padding:6px 12px"><legend class="small">Also supports (shown in these teams; not counted in their team goal)</legend>${Object.entries(state.teams).map(([k, t]) => `<label class="small" style="margin-right:12px"><input type="checkbox" class="mb-also" value="${k}" ${(e.alsoTeams || []).includes(k) ? 'checked' : ''}> ${esc(t.name)}</label>`).join('')}</fieldset>
   <label class="field">Notes to confirm (one per line; shown until cleared)<textarea id="mb-f" rows="3">${esc((e.flags || []).join('\n'))}</textarea></label>
   ${id ? '<label class="field">Reason for change<input type="text" id="mb-why"></label>' : ''}`,
    [id ? { label: 'Remove member', onClick: () => { askText('Remove ' + e.name, 'Reason for removing this member (their audit history is kept):', r => { state.employees = state.employees.filter(x => x.id !== id); audit('Member removed', e.name, id, r); touch(); render(); }); return false; } } : { label: 'Cancel' },
     { label: 'Save', cls: 'pri', onClick: () => {
      const nid = id || val('mb-id'); if (!nid || !val('mb-n')) { toast('Employee ID and name are required.'); return false; }
      if (!id && emp(nid)) { toast('That employee ID already exists.'); return false; }
      if (id && !val('mb-why')) { toast('Add a reason for the change.'); return false; }
      const role = state.roles[val('mb-ty')];
      if (role.template === 'lead' && val('mb-st2') !== 'Former') { const other = state.employees.find(x => x.team === val('mb-t') && isLead(x) && !isFormer(x) && x.id !== nid); if (other) { toast(other.name + ' is already the active team lead for this team.'); return false; } }
      const data = { id: nid, name: val('mb-n'), aliases: val('mb-al'), joined: val('mb-jn') || null, roleNote: val('mb-rn'), team: val('mb-t'), area: val('mb-a'), type: val('mb-ty'), status: val('mb-st2'), start: val('mb-st') || null, end: val('mb-end') || null,
        alsoTeams: [...document.querySelectorAll('.mb-also:checked')].map(x => x.value).filter(t => t !== val('mb-t')), flags: val('mb-f').split('\n').map(x => x.trim()).filter(Boolean) };
      if (head) Object.assign(data, { level: val('mb-l'), since: val('mb-s') || PERIOD.start, ratings: [0, 1, 2].map(i => val('mb-r' + i) || null) });
      const before = id ? `${teamName(e.team)} · ${e.area} · ${roleOf(e).name} · ${e.status || 'Active'}` : '';
      if (id) Object.assign(e, data); else addEmployee(data);
      audit(id ? 'Member updated' : 'Member added', data.name, (before ? before + ' → ' : '') + `${teamName(data.team)} · ${data.area} · ${role.name} · ${data.status}`, id ? val('mb-why') : ''); touch(); render(); } }]);
}
// Inline reassignment from the Team Setup table.
function assignField(id, field, value) {
  const e = emp(id), label = { team: 'team', area: 'business area', type: 'role' }[field];
  const show = (f, v) => f === 'team' ? teamName(v) : f === 'type' ? (state.roles[v] || {}).name : v;
  if (field === 'type' && state.roles[value].template === 'lead' && !isFormer(e)) { const other = state.employees.find(x => x.team === e.team && isLead(x) && !isFormer(x) && x.id !== id); if (other) { toast(other.name + ' is already the active team lead for ' + teamName(e.team) + '.'); render(); return; } }
  askText(`Change ${label} — ${e.name}`, `${show(field, e[field])} → ${show(field, value)}. Reason (recorded in the audit log):`, reason => {
    const before = show(field, e[field]); e[field] = value;
    if (field === 'team') { e.alsoTeams = (e.alsoTeams || []).filter(t => t !== value); if (!teamAreas(value).includes(e.area)) e.area = teamAreas(value)[0] || e.area; }
    audit('Assignment changed', e.name, `${label}: ${before} → ${show(field, value)}`, reason); touch(); render(); toast('Updated');
  }, () => render());
}
function teamDlg(k) {
  const t = k ? state.teams[k] : { name: '', areas: [] };
  openDlg(k ? 'Edit team' : 'Add team', `<div class="formgrid"><label class="field">Team name<input type="text" id="tm-n" value="${esc(t.name)}"></label><label class="field">Short name (optional)<input type="text" id="tm-s" value="${esc(t.short || '')}"></label></div>
   <label class="field">Business areas served (comma-separated)<input type="text" id="tm-a" value="${esc(t.areas.join(', '))}"></label><p class="small muted">New areas start without an offer target; set one under Business areas &amp; offer targets.</p><label class="field">Reason<input type="text" id="tm-why"></label>`,
    [k && !state.employees.some(e => e.team === k) ? { label: 'Delete team', onClick: () => { const n = state.teams[k].name; delete state.teams[k]; state.employees.forEach(e => { e.alsoTeams = (e.alsoTeams || []).filter(x => x !== k); }); audit('Team deleted', n, '', val('tm-why')); touch(); render(); } } : { label: 'Cancel' },
     { label: 'Save', cls: 'pri', onClick: () => { const n = val('tm-n'); if (!n) { toast('Team name is required.'); return false; } if (!requireReason(val('tm-why'))) return false;
      const areas = val('tm-a').split(',').map(x => x.trim()).filter(Boolean);
      const key = k || n.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) + (state.teams[n.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)] ? Date.now() % 1000 : '');
      const before = k ? `${t.name}: ${t.areas.join(', ')}` : '';
      state.teams[key] = { name: n, short: val('tm-s') || undefined, areas };
      areas.forEach(a => { if (!(a in state.areaTargets)) state.areaTargets[a] = null; });
      audit(k ? 'Team updated' : 'Team added', n, (before ? before + ' → ' : '') + `${n}: ${areas.join(', ')}`, val('tm-why')); touch(); render(); } }]);
}
function roleDlg(k) {
  const r = k ? state.roles[k] : { name: '', template: 'recruiter', share: 1 };
  openDlg(k ? 'Edit role' : 'Add role', `<div class="formgrid"><label class="field">Role name<input type="text" id="rl-n" value="${esc(r.name)}"></label>
   <label class="field">Scorecard template<select id="rl-t">${Object.entries(ROLE_TEMPLATES).map(([t, l]) => `<option value="${t}" ${t === r.template ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
   <label class="field">Share of business-area offer target (%)<input type="number" id="rl-s" min="0" max="200" step="5" value="${Math.round((r.template === 'lead' ? state.rules.tlTargetShare : r.share) * 100)}"></label></div>
   <p class="small muted">Recruiter: hiring deliverables + projects + competency. Team Lead: team goal + own delivery at the lead share (set in Rules &amp; Settings). Support: no hiring targets. Shares other than the BRD's are pending decision (D-48).</p><label class="field">Reason<input type="text" id="rl-why"></label>`,
    [k && !state.employees.some(e => e.type === k) && Object.keys(state.roles).length > 1 ? { label: 'Delete role', onClick: () => { const n = state.roles[k].name; delete state.roles[k]; audit('Role deleted', n, '', val('rl-why')); touch(); render(); } } : { label: 'Cancel' },
     { label: 'Save', cls: 'pri', onClick: () => { const n = val('rl-n'); if (!n) { toast('Role name is required.'); return false; } if (!requireReason(val('rl-why'))) return false;
      const t = val('rl-t'), share = clamp(+val('rl-s') / 100, 0, 2);
      const key = k || n.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'ROLE' + Date.now() % 1000;
      const before = k ? `${r.name} · ${r.template} · ${r.share}` : '';
      state.roles[key] = { name: n, template: t, share: t === 'support' ? 0 : share };
      if (t === 'lead' && Math.abs(share - state.rules.tlTargetShare) > 1e-9) { audit('Rule changed', 'tlTargetShare', `${state.rules.tlTargetShare} → ${share}`, val('rl-why')); state.rules.tlTargetShare = share; }
      audit(k ? 'Role updated' : 'Role added', n, (before ? before + ' → ' : '') + `${n} · ${t} · ${share}`, val('rl-why')); touch(); render(); } }]);
}
// Edit a summary scorecard (TA Head): weighted points and the YTD figures, with a reason.
function scorecardDlg(id) {
  const sc = state.scorecards[id], e = emp(id);
  const f = (k, lab) => `<label class="field">${lab}<input type="number" step="0.5" id="sc-${k}" value="${sc[k] ?? ''}"></label>`;
  openDlg('Scorecard — ' + e.name, `<p class="small">Enter <b>weighted points</b> from the ATS or the points calculation (base points by hiring category and SG, plus the women-hiring bonus). Points are what the 40-point score and status use.</p>
   <div class="formgrid">${f('points', 'Weighted points (YTD)')}${f('target', 'Annual offer target')}${f('offers', 'Offers')}${f('joiners', 'Joiners')}${f('offerDays', 'Offer days')}${f('vendorPct', 'Vendor %')}</div>
   <label class="field">As of<input type="date" id="sc-asOf" value="${sc.asOf}"></label><label class="field">Source of points / reason<input type="text" id="sc-why"></label>`,
    [{ label: 'Cancel' }, { label: 'Save', cls: 'pri', onClick: () => { if (!requireReason(val('sc-why'))) return false;
      const before = JSON.stringify({ points: sc.points, target: sc.target, offers: sc.offers, joiners: sc.joiners });
      for (const k of ['points', 'target', 'offers', 'joiners', 'offerDays', 'vendorPct']) { const v = val('sc-' + k); sc[k] = v === '' ? null : +v; }
      sc.asOf = val('sc-asOf') || sc.asOf;
      audit('Scorecard updated', e.name, before + ' → ' + JSON.stringify({ points: sc.points, target: sc.target, offers: sc.offers, joiners: sc.joiners }), val('sc-why')); touch(); render(); } }]);
}
function targetDlg(a) {
  openDlg('Offer and points target — ' + a, `<label class="field">Offers per 10 working days (leave blank if not applicable)<input type="number" step="0.5" id="tg-v" value="${state.areaTargets[a] == null ? '' : state.areaTargets[a]}"></label>
   <label class="field">Points per offer for this area (blank = workspace default ${state.rules.pointsPerOffer})<input type="number" step="0.1" id="tg-p" value="${state.areaPPO[a] ?? ''}"></label>
   <p class="small muted">Points target = offer target × points per offer. Use an area value only where its hiring mix differs (for example, NATS-heavy early-career areas average close to 1 point per offer).</p><label class="field">Reason / decision reference<input type="text" id="tg-r"></label>`,
    [{ label: 'Cancel' }, { label: 'Save', cls: 'pri', onClick: () => { if (!requireReason(val('tg-r'))) return false; const before = state.areaTargets[a] + ' × ' + ppoFor(a); state.areaTargets[a] = val('tg-v') === '' ? null : +val('tg-v'); if (val('tg-p') === '') delete state.areaPPO[a]; else state.areaPPO[a] = +val('tg-p'); audit('Target changed', a, `${before} → ${val('tg-v') || 'n/a'} × ${ppoFor(a)}`, val('tg-r')); touch(); render(); } }]);
}
function exportBackup() { exportBackupSecure(); }
function restoreBackup(file) { restoreBackupSecure(file); }
// Per-person annual points target (team members and leads). Blank = default (offer target × points per offer).
function pointsTargetDlg(id) {
  const e = emp(id), def = defaultAnnualPoints(e);
  openDlg('Points target — ' + e.name, `<p class="small">Default annual points target: <b>${def == null ? 'n/a' : fmt(def)}</b> (offer target × ${ppoFor(e.area)} points per offer${isLead(e) ? ', at the team lead share' : ''}). Set a personal target to override it; it is pro-rated over the year and across 10-day cycles.</p>
   <label class="field">Annual points target (blank = default)<input type="number" step="1" min="0" id="pt-v" value="${e.ptAnnual ?? ''}"></label>
   <label class="field">Reason<input type="text" id="pt-why"></label>`,
    [{ label: 'Cancel' }, { label: 'Save', cls: 'pri', onClick: () => { if (!requireReason(val('pt-why'))) return false;
      const before = e.ptAnnual ?? ('default ' + fmt(def)); const v = val('pt-v');
      e.ptAnnual = v === '' ? null : +v;
      audit('Points target changed', e.name, `${before} → ${e.ptAnnual ?? 'default ' + fmt(def)}`, val('pt-why')); touch(); render(); } }]);
}
function confirmLive() {
  openDlg('Start a live workspace', '<p>This removes all fictional sample data from this browser and starts an empty workspace for your team. Export a backup first if you have made changes you want to keep.</p>',
    [{ label: 'Cancel' }, { label: 'Start live workspace', cls: 'pri', onClick: () => { startLive(); ui.page = 'setup'; render(); } }]);
}
function loadSample() {
  const go2 = () => { resetState(); ui.page = ui.role === 'head' ? 'team' : ui.page; render(); };
  if (state.mode === 'live' && state.employees.length) confirmDlg('Load sample data', 'This replaces your live workspace with fictional sample data. Export a backup first if you need it.', go2); else go2();
}

// ---------- rules ----------
function setRule(path, v) {
  askText('Change rule', 'Reason for this rule change (recorded in the audit log):', reason => applyRule(path, v, reason), () => render());
}
function applyRule(path, v, reason) {
  const R = state.rules; const [a, b] = path.split('.');
  const before = JSON.stringify(b ? R[a][b] : R[a]);
  if (b) R[a][b] = v; else R[a] = v;
  const parts = R.version.split('.'); R.version = parts[0] + '.' + (parseInt(parts[1]) + 1) + '-draft';
  audit('Rule changed', path, `${before} → ${JSON.stringify(v)} (version ${R.version})`, reason); touch(); render(); toast('Rule updated; scores recalculated');
}
function toggleVendorEx(c, on) { const R = state.rules; const v = on ? [...new Set([...R.vendorExcluded, c])] : R.vendorExcluded.filter(x => x !== c); setRule('vendorExcluded', v); }
function approveRule(k) {
  askText('Record decision ' + state.rules.status[k][1], 'Who approved, when, and the reference:', ref => applyApproval(k, ref));
}
function applyApproval(k, ref) {
  state.rules.status[k] = ['approved', state.rules.status[k][1]]; audit('Rule decision recorded', k, 'Pending → Approved', ref); touch(); render();
}
function breakGlassDlg() {
  openDlg('Request break-glass access', '<label class="field">Business reason<textarea id="bg-r" rows="3"></textarea></label><p class="small muted">Requires TA Head / HR approval; access is time-limited and logged.</p>',
    [{ label: 'Cancel' }, { label: 'Submit', cls: 'pri', onClick: () => { if (!requireReason(val('bg-r'))) return false; state.breakGlass.push({ at: nowStamp(), reason: val('bg-r'), status: 'Pending' }); audit('Break-glass requested', 'Confidential data', '', val('bg-r')); touch(); render(); } }]);
}
function decideBreakGlass(i, s) { state.breakGlass[i].status = s; audit('Break-glass ' + (s.startsWith('Approved') ? 'approved' : 'rejected'), 'Confidential data', s); touch(); render(); }
