/* Shared UI building blocks: escaping, badges, generic tables, forms, record drawer, charts, toasts. */
(function () {
  'use strict';
  const TA = window.TA;
  const S = () => TA.Store;

  const esc = (v) => String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const np = () => '<span class="np">Not provided</span>';
  const attr = (o) => esc(JSON.stringify(o));

  /* ---------- Status badges (always text + symbol, never colour alone) ---------- */
  const GOOD = ['Above target', 'Target met', 'Completed', 'Achieved', 'Closed – stakeholder validated', 'Validated', 'Realised – validated', 'Done', 'Resolved',
    'Decided', 'Capability demonstrated – reviewer validated', 'Active', 'Ready now', 'Accepted', 'Action completed', 'Decision made'];
  const WARN = ['At risk', 'Delayed', 'Action completed; stakeholder validation pending', 'Pending', 'Under validation', 'Partly achieved', 'Partially realised – validated',
    'In progress', 'Awaiting data owner', 'Mitigating', 'Applied at work – evidence recorded', 'Application in progress', 'Ongoing', 'Edited', 'On hold', 'Warning',
    'Estimated – assumptions stated', 'Measuring', 'Vacancy – replacement hiring underway', 'Converted to action', 'Decision required', 'Support required', 'Essential'];
  const BAD = ['Below target', 'Off track', 'Not achieved', 'Rejected', 'Missed', 'Above target (adverse)', 'Not realised', 'Conflict', 'Overdue', 'Left'];
  const INFO = ['Open', 'Planned', 'In progress (RAG not assessed)', 'Not started', 'Proposed', 'New', 'Proposed – not validated', 'Expected – not yet measurable', 'Info', 'Missing', 'On track'];
  function statusKind(t) {
    if (GOOD.indexOf(t) >= 0) return 'good';
    if (WARN.indexOf(t) >= 0) return 'warn';
    if (BAD.indexOf(t) >= 0) return 'bad';
    if (INFO.indexOf(t) >= 0) return 'info';
    return 'neutral';
  }
  const ICON = { good: '✓', warn: '!', bad: '✕', info: '•', neutral: '·' };
  function badge(text, kind, title) {
    if (text === null || text === undefined || text === '') return np();
    const k = kind || statusKind(text);
    let icon = ICON[k];
    if (text === 'Below target') icon = '▼';
    if (text === 'Above target') icon = '▲';
    if (text === 'Left') icon = '→';
    return '<span class="badge b-' + k + '"' + (title ? ' title="' + esc(title) + '"' : '') + '><span aria-hidden="true">' + icon + '</span>' + esc(text) + '</span>';
  }
  const prov = (kind) => ({
    src: '<span class="provenance prov-src">Source-reported</span>',
    recalc: '<span class="provenance prov-recalc">Recalculated</span>',
    assump: '<span class="provenance prov-assump">Assumption</span>',
    prop: '<span class="provenance prov-prop">Proposal</span>',
    rule: '<span class="provenance prov-assump">Rule-based</span>'
  })[kind] || '';

  /* ---------- Field display ---------- */
  const COMPUTED_LABELS = { _attain: 'Attainment (recalc.)', _gap: 'Gap vs target (recalc.)', _recalc: 'Recalculated actual', _offerRecalc: 'Offer attainment (recalc.)',
    _joinRecalc: 'Join attainment (recalc.)', _scTarget: 'Scorecard target (selected period)', _gross: 'Gross value (calc.)', _net: 'Net value (calc.)' };
  function fieldDef(entity, key) { return TA.ENTITIES[entity].fields.find(f => f.k === key); }
  function colLabel(entity, key) { if (COMPUTED_LABELS[key]) return COMPUTED_LABELS[key]; const f = fieldDef(entity, key); return f ? f.l : key; }
  function fieldUnit(entity, rec, key) {
    if (entity === 'observations' && ['target', 'actualReported'].indexOf(key) >= 0) { const m = TA.metric(rec.metricId); return m ? m.unit : null; }
    if (entity === 'recruiterResults' && /Reported$/.test(key)) return '%';
    if (/Cost$|manualValue|implementationCost|recurringCost/.test(key)) return 'INR';
    return 'count';
  }
  function rawValue(entity, rec, key) {
    switch (key) {
      case '_attain': return TA.progRow(rec).attain;
      case '_gap': return TA.progRow(rec).gap;
      case '_recalc': return TA.obsCalc(rec).recalc;
      case '_offerRecalc': return TA.rrCalc(rec).offerRecalc;
      case '_joinRecalc': return TA.rrCalc(rec).joinRecalc;
      case '_gross': return TA.benefitCalc(rec).gross;
      case '_net': return TA.benefitCalc(rec).net;
      case '_scTarget': { const p = TA.scorecardMatch(rec); return p ? p.target : null; }
    }
    const f = fieldDef(entity, key);
    const v = rec[key];
    if (!f) return v;
    if (f.t === 'ref') { const r = v ? S().get(f.ref, v) : null; return r ? TA.recordTitle(f.ref, r) : null; }
    if (f.t === 'subject') return v ? TA.subjectLabel(v) : null;
    return v;
  }
  function cell(entity, rec, key) {
    const v = rawValue(entity, rec, key);
    const f = fieldDef(entity, key);
    if (key === '_attain' || key === '_offerRecalc' || key === '_joinRecalc') return TA.isNum(v) ? TA.fmtPct(v) : '<span class="np">Cannot calculate</span>';
    if (key === '_gap') return TA.isNum(v) ? (v > 0 ? '+' : '') + v : '<span class="np">Cannot calculate</span>';
    if (key === '_recalc') { const c = TA.obsCalc(rec); return c.recalc !== null ? esc(TA.fmtVal(c.recalc, c.unit)) + (c.conflict ? ' ' + badge('Conflict') : '') : '<span class="np">Not applicable</span>'; }
    if (key === '_scTarget') {
      const p = TA.scorecardMatch(rec);
      if (!p) return '<span class="np">' + (rec.scorecardProgramme ? 'No match in selected period' : 'Not linked') + '</span>';
      return esc(TA.fmtInt(p.target)) + (TA.isNum(rec.expectedNumber) && TA.isNum(p.target) && rec.expectedNumber !== p.target ? ' ' + badge('Differs from plan', 'warn') : '');
    }
    if (key === '_gross' || key === '_net') { const c = TA.benefitCalc(rec); if (!TA.isNum(v)) return '<span class="np">Cannot calculate</span>'; return esc(key === '_gross' && c.unit === 'hours' ? TA.fmtVal(v, 'hours') : TA.fmtINR(v)); }
    if (v === null || v === undefined || v === '') return np();
    if (!f) return esc(v);
    if (f.t === 'date') return '<span class="nowrap">' + esc(TA.fmtDate(v)) + '</span>';
    if (f.t === 'number') return esc(TA.fmtVal(v, fieldUnit(entity, rec, key)));
    if (f.t === 'bool') return v ? 'Yes' : 'No';
    if (f.t === 'select' && /status|Status|progress|classification|validation|Stage|type$/.test(key) || key === 'employmentStatus') return badge(v);
    const s = String(v);
    return esc(s.length > 140 ? s.slice(0, 137) + '…' : s);
  }
  function sortValue(entity, rec, key) {
    const v = rawValue(entity, rec, key);
    if (v === null || v === undefined || v === '') return null;
    return typeof v === 'number' ? v : String(v).toLowerCase();
  }
  function searchText(entity, rec) {
    return TA.ENTITIES[entity].fields.map(f => rawValue(entity, rec, f.k)).filter(v => v !== null && v !== undefined).join(' ').toLowerCase();
  }

  /* ---------- Generic table ---------- */
  const tableState = {};
  function tstate(key) { return tableState[key] || (tableState[key] = { q: '', sort: null, dir: 1, filters: {}, archived: false }); }
  function table(key, entity, opts) {
    const o = opts || {};
    const def = TA.ENTITIES[entity];
    const st = tstate(key);
    const cols = o.cols || def.cols;
    let rows = o.rows ? o.rows.slice() : S().list(entity, { archived: st.archived });
    if (o.rows && !st.archived) rows = rows.filter(r => !r.archived);
    const filterFields = (o.filters || []).map(k => fieldDef(entity, k)).filter(Boolean);
    filterFields.forEach(f => { const fv = st.filters[f.k]; if (fv) rows = rows.filter(r => String(rawValue(entity, r, f.k) || 'Not provided') === fv); });
    if (st.q) { const q = st.q.toLowerCase(); rows = rows.filter(r => searchText(entity, r).indexOf(q) >= 0); }
    if (st.sort) {
      rows.sort((a, b) => {
        const x = sortValue(entity, a, st.sort), y = sortValue(entity, b, st.sort);
        if (x === null && y === null) return 0; if (x === null) return 1; if (y === null) return -1;
        return (x > y ? 1 : x < y ? -1 : 0) * st.dir;
      });
    }
    const total = rows.length;
    let html = '<div class="table-block" data-table="' + esc(key) + '">';
    if (!o.noTools) {
      html += '<div class="table-tools">';
      html += '<label class="sr-only" for="q-' + esc(key) + '" style="position:absolute;left:-9999px">Search ' + esc(def.label) + '</label>';
      html += '<input type="search" id="q-' + esc(key) + '" data-tbl-q="' + esc(key) + '" placeholder="Search ' + esc(def.label.toLowerCase()) + '…" value="' + esc(st.q) + '">';
      filterFields.forEach(f => {
        const opts2 = f.t === 'select' ? f.o : Array.from(new Set(S().list(entity, { archived: true }).map(r => rawValue(entity, r, f.k) || 'Not provided')));
        html += '<select id="f-' + esc(key) + '-' + f.k + '" data-tbl-f="' + esc(key) + '" data-field="' + f.k + '" aria-label="Filter by ' + esc(f.l) + '"><option value="">All: ' + esc(f.l) + '</option>' +
          opts2.map(v => '<option' + (st.filters[f.k] === v ? ' selected' : '') + '>' + esc(v) + '</option>').join('') + '</select>';
      });
      html += '<label class="check"><input type="checkbox" id="a-' + esc(key) + '" data-tbl-a="' + esc(key) + '"' + (st.archived ? ' checked' : '') + '> Show archived</label>';
      html += '<span class="small muted">' + total + ' record' + (total === 1 ? '' : 's') + '</span>';
      html += '<span style="flex:1"></span>';
      if (!o.noAdd) html += '<button class="btn sm primary" data-act="add" data-entity="' + entity + '"' + (o.defaults ? ' data-defaults="' + attr(o.defaults) + '"' : '') + '>+ Add ' + esc((o.addLabel || def.singular).toLowerCase()) + '</button>';
      html += '<button class="btn sm" data-act="csv" data-entity="' + entity + '" data-table="' + esc(key) + '">Export CSV</button>';
      html += '</div>';
    }
    html += '<div class="table-wrap"><table class="data"><thead><tr>';
    cols.forEach(c => {
      const active = st.sort === c;
      const aria = active ? (st.dir > 0 ? 'ascending' : 'descending') : 'none';
      html += '<th scope="col" aria-sort="' + aria + '"><button class="sort" data-act="sort" data-table="' + esc(key) + '" data-col="' + c + '">' + esc(colLabel(entity, c)) +
        '<span aria-hidden="true">' + (active ? (st.dir > 0 ? '▲' : '▼') : '↕') + '</span></button></th>';
    });
    html += '<th scope="col"><span style="position:absolute;left:-9999px">Actions</span></th></tr></thead><tbody>';
    if (!rows.length) html += '<tr><td colspan="' + (cols.length + 1) + '"><div class="empty">' + esc(o.empty || 'No records yet.') + '</div></td></tr>';
    rows.forEach(r => {
      html += '<tr class="' + (r.archived ? 'archived' : '') + '">';
      cols.forEach((c, i) => {
        const content = cell(entity, r, c);
        if (o.inline && o.inline.indexOf(c) >= 0 && !r.archived) {
          const f = fieldDef(entity, c);
          html += '<td><label style="position:absolute;left:-9999px" for="inl-' + r.id + '-' + c + '">' + esc(f.l) + ' for ' + esc(TA.recordTitle(entity, r)) + '</label><select id="inl-' + r.id + '-' + c + '" data-act="inline-set" data-entity="' + entity + '" data-id="' + r.id + '" data-field="' + c + '" style="width:auto;min-width:120px">' +
            f.o.map(x => '<option' + (x === r[c] ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select></td>';
          return;
        }
        html += '<td class="' + (TA.isNum(rawValue(entity, r, c)) ? 'num' : '') + '">' + (i === 0 ? '<button class="rowtitle" data-act="view" data-entity="' + entity + '" data-id="' + r.id + '">' + content.replace(/<span class="np">Not provided<\/span>/, 'Not provided') + '</button>' + (r.archived ? ' <span class="badge b-neutral">Archived</span>' : '') : content) + '</td>';
      });
      html += '<td class="actions">' + (o.rowActions ? o.rowActions(r) : '') +
        '<button class="btn sm" data-act="edit" data-entity="' + entity + '" data-id="' + r.id + '" aria-label="Edit ' + esc(TA.recordTitle(entity, r)) + '">Edit</button> ' +
        '<button class="btn sm danger" data-act="delete" data-entity="' + entity + '" data-id="' + r.id + '" aria-label="Delete ' + esc(TA.recordTitle(entity, r)) + '">Delete</button></td></tr>';
    });
    html += '</tbody>' + (o.footer ? '<tfoot>' + o.footer + '</tfoot>' : '') + '</table></div></div>';
    return html;
  }
  function tableRowsForExport(key, entity) {
    const st = tstate(key);
    let rows = S().list(entity, { archived: st.archived });
    if (st.q) { const q = st.q.toLowerCase(); rows = rows.filter(r => searchText(entity, r).indexOf(q) >= 0); }
    Object.keys(st.filters).forEach(k => { if (st.filters[k]) rows = rows.filter(r => String(rawValue(entity, r, k) || 'Not provided') === st.filters[k]); });
    return rows;
  }

  /* ---------- Dialog helpers ---------- */
  function dialog(id) { return document.getElementById(id); }
  function openDialog(id, html) {
    const d = dialog(id);
    d.innerHTML = html;
    if (!d.open) d.showModal();
    const first = d.querySelector('[autofocus], input, select, textarea, button.primary');
    if (first) setTimeout(() => first.focus(), 0);
    return d;
  }
  function closeDialog(id) { const d = dialog(id); if (d.open) d.close(); }
  function confirmDialog(title, message, okLabel, danger) {
    return new Promise(resolve => {
      const d = openDialog('dlg-confirm', '<div class="dlg-head"><h3>' + esc(title) + '</h3></div><div class="dlg-body"><p>' + message + '</p></div>' +
        '<div class="dlg-foot"><button class="btn" data-c="no">Cancel</button><button class="btn ' + (danger ? 'danger solid' : 'primary') + '" data-c="yes" autofocus>' + esc(okLabel || 'Confirm') + '</button></div>');
      const done = (v) => { d.removeEventListener('click', onClick); d.removeEventListener('close', onClose); if (d.open) d.close(); resolve(v); };
      const onClick = (e) => { const b = e.target.closest('[data-c]'); if (b) done(b.dataset.c === 'yes'); };
      const onClose = () => done(false);
      d.addEventListener('click', onClick);
      d.addEventListener('close', onClose);
    });
  }
  let toastTimer = null;
  function toast(msg) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
  }

  /* ---------- Forms ---------- */
  function inputFor(entity, f, val, idp) {
    const id = idp + f.k;
    const v = val === null || val === undefined ? '' : val;
    const ro = f.ro ? ' readonly' : '';
    const req = f.req ? ' required aria-required="true"' : '';
    switch (f.t) {
      case 'textarea': return '<textarea id="' + id + '" name="' + f.k + '"' + req + ro + '>' + esc(v) + '</textarea>';
      case 'number': return '<input type="number" step="any" id="' + id + '" name="' + f.k + '" value="' + esc(v) + '"' + (f.min !== undefined ? ' min="' + f.min + '"' : '') + req + ro + ' placeholder="Not provided">';
      case 'date': return '<input type="date" id="' + id + '" name="' + f.k + '" value="' + esc(v) + '"' + req + ro + '>';
      case 'bool': return '<label class="check"><input type="checkbox" id="' + id + '" name="' + f.k + '"' + (v ? ' checked' : '') + '> ' + esc(f.l) + '</label>';
      case 'select': return '<select id="' + id + '" name="' + f.k + '"' + req + '><option value="">' + (f.req ? 'Select…' : 'Not provided') + '</option>' + f.o.map(x => '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select>';
      case 'ref': {
        const recs = S().list(f.ref, { archived: true });
        return '<select id="' + id + '" name="' + f.k + '"' + req + '><option value="">' + (f.req ? 'Select…' : 'Not provided') + '</option>' + recs.map(r => '<option value="' + r.id + '"' + (r.id === v ? ' selected' : '') + '>' + esc(TA.recordTitle(f.ref, r)) + (r.archived ? ' (archived)' : '') + '</option>').join('') + '</select>';
      }
      case 'subject': {
        const recs = S().list('team', { archived: true });
        return '<select id="' + id + '" name="' + f.k + '"' + req + '><option value="">Select…</option><option value="self"' + (v === 'self' ? ' selected' : '') + '>TA Head (self)</option>' + recs.map(r => '<option value="' + r.id + '"' + (r.id === v ? ' selected' : '') + '>' + esc(r.name) + (r.employmentStatus === 'Left' ? ' (left)' : '') + '</option>').join('') + '</select>';
      }
      default: return '<input type="text" id="' + id + '" name="' + f.k + '" value="' + esc(v) + '"' + req + ro + '>';
    }
  }
  function formHTML(entity, rec, defaults) {
    const def = TA.ENTITIES[entity];
    const data = Object.assign({}, defaults || {}, rec || {});
    return '<div class="form-grid">' + def.fields.map(f => {
      if (f.t === 'bool') return '<div class="field ' + (f.full ? 'full' : '') + '">' + inputFor(entity, f, data[f.k], 'fld-') + (f.help ? '<div class="help">' + esc(f.help) + '</div>' : '') + '</div>';
      return '<div class="field ' + (f.full ? 'full' : '') + '"><label for="fld-' + f.k + '">' + esc(f.l) + (f.req ? ' <span class="req" aria-hidden="true">*</span>' : '') + '</label>' +
        inputFor(entity, f, data[f.k], 'fld-') + (f.help ? '<div class="help">' + esc(f.help) + '</div>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function readForm(entity, root) {
    const out = {};
    TA.ENTITIES[entity].fields.forEach(f => {
      const el = root.querySelector('[name="' + f.k + '"]');
      if (!el || f.ro) return;
      if (f.t === 'bool') out[f.k] = el.checked;
      else if (f.t === 'number') { const s = el.value.trim(); out[f.k] = s === '' ? null : Number(s); }
      else { const s = el.value.trim(); out[f.k] = s === '' ? null : s; }
    });
    return out;
  }

  /* Entity-specific integrity rules: errors block saving; warnings require a second confirmation. */
  function validate(entity, d, existing) {
    const errors = [], warnings = [];
    TA.ENTITIES[entity].fields.forEach(f => {
      if (f.req && (d[f.k] === null || d[f.k] === undefined || d[f.k] === '')) errors.push(f.l + ' is required.');
      if (f.t === 'number' && d[f.k] !== null && d[f.k] !== undefined && !TA.isNum(d[f.k])) errors.push(f.l + ' must be a number.');
      if (f.t === 'number' && f.min !== undefined && TA.isNum(d[f.k]) && d[f.k] < f.min) errors.push(f.l + ' cannot be below ' + f.min + '.');
    });
    const has = (k) => d[k] !== null && d[k] !== undefined && d[k] !== '';
    switch (entity) {
      case 'periods': if (has('start') && has('end') && d.end < d.start) errors.push('End date is before start date.'); break;
      case 'commitments': if (d.classification === 'Agreed commitment' && (!has('agreedWith') || !has('agreedDate'))) errors.push('An agreed commitment needs "Agreed with" and "Agreed date" as evidence of agreement; otherwise classify it as a proposal.'); break;
      case 'feedback':
        if (d.closureStatus === 'Closed – stakeholder validated' && (!has('validatedBy') || !has('validationDate'))) errors.push('Closing as stakeholder-validated requires "Validated by" and "Validation date".');
        if (d.closureStatus === 'Closed – not validated (reason recorded)' && !has('validationNote')) errors.push('Record the reason in "Validation note / reason".');
        if ((d.closureStatus === 'Action completed; stakeholder validation pending' || /^Closed – stakeholder/.test(d.closureStatus || '')) && d.progress !== 'Action completed') errors.push('Closure status implies the action is complete; set "Action progress" to "Action completed" first.');
        if (d.commitmentType === 'Agreed commitment' && !has('agreedAction')) errors.push('An agreed commitment needs the action recorded.');
        break;
      case 'devItems':
        if (d.capabilityStage === 'Capability demonstrated – reviewer validated' && (!has('reviewer') || !has('reviewDate') || !has('applicationAtWork'))) errors.push('"Capability demonstrated" requires application at work, reviewer and review date.');
        if (d.capabilityStage === 'Applied at work – evidence recorded' && !has('applicationAtWork')) errors.push('Describe the application at work for this stage.');
        if (d.learningStatus === 'Completed' && !has('applicationAtWork') && ['Learning', 'Certification'].indexOf(d.kind) >= 0) warnings.push('Completed without application at work: it will be shown as completed, not as demonstrated capability.');
        break;
      case 'projects':
        if (d.benefitStatus && /validated$/.test(d.benefitStatus) && !has('benefitValidationEvidence')) errors.push('A validated benefit status needs benefit validation evidence.');
        if (d.status === 'Completed' && !has('completionDate')) errors.push('Completed projects need a completion date.');
        if (d.status === 'Completed' && !has('completionEvidence')) warnings.push('No completion evidence recorded.');
        if (existing && existing.originalDeadline && d.originalDeadline !== existing.originalDeadline) warnings.push('You are changing the original deadline (' + TA.fmtDate(existing.originalDeadline) + '). Revisions are normally recorded in "Current revised deadline" so the original stays visible.');
        if (has('revisedDeadline') && existing && existing.revisedDeadline !== d.revisedDeadline && !has('revisionReason')) warnings.push('No reason recorded for the deadline revision.');
        break;
      case 'benefits':
        if (d.validationStatus === 'Validated' && (!has('validatedBy') || !has('validationDate'))) errors.push('Validated benefits require "Validated by" and "Validation date".');
        if (d.calcType === 'Vacancy-duration value (notional)' && d.category !== 'Notional business value' && d.validationStatus !== 'Validated') errors.push('Vacancy-duration value must be categorised as notional business value unless validated as a realised benefit.');
        if (d.category === 'Cost avoidance' && !has('counterfactual')) warnings.push('Cost avoidance needs an agreed counterfactual; it will be flagged until one is recorded.');
        if (d.category === 'Non-financial outcome' && !has('outcomeDescription')) errors.push('Describe the non-financial outcome.');
        if (d.category === 'Realised financial saving' && ['Process time released', 'Automation benefit'].indexOf(d.calcType) >= 0) warnings.push('Time released is capacity, not reduced expenditure. Use "Productivity capacity released" unless costs actually fell.');
        break;
      case 'decisions': if ((d.type === 'Decision made' || d.status === 'Decided') && (!has('decidedBy') || !has('decidedDate'))) errors.push('Recorded decisions need "Decided by" and "Decision date".'); break;
      case 'questions': if (d.status === 'Resolved' && !has('resolution')) errors.push('Record the resolution.'); break;
      case 'actions': if (d.status === 'Completed' && !has('completedDate')) warnings.push('No completed date recorded.'); break;
    }
    const dups = TA.findDuplicates(entity, d, existing ? existing.id : null);
    if (dups.length) warnings.push('Possible duplicate of: ' + dups.map(r => '"' + TA.recordTitle(entity, r) + '"').join(', ') + '. Records are never merged automatically – confirm this is a different record.');
    return { errors, warnings };
  }

  /* ---------- Charts (inline SVG; hover tooltips via data-tip; table view always provided) ---------- */
  function chartProgrammes(rows, o) {
    const opt = o || {};
    const W = 760, labelW = 120, valueW = 190, rowH = 34, top = 8;
    const plotW = W - labelW - valueW;
    const max = Math.max(1, ...rows.map(r => Math.max(r.target || 0, r.joined || 0, r.compare || 0, r.projected || 0))) * 1.05;
    const x = (v) => labelW + (v / max) * plotW;
    const H = top + rows.length * rowH + 26;
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opt.aria || 'Joined versus target by programme') + '">';
    [0, .25, .5, .75, 1].forEach(t => { const gx = labelW + t * plotW; svg += '<line class="gridline" x1="' + gx + '" x2="' + gx + '" y1="' + top + '" y2="' + (H - 22) + '"/><text class="lbl-muted" x="' + gx + '" y="' + (H - 6) + '" text-anchor="middle">' + Math.round(t * max) + '</text>'; });
    rows.forEach((r, i) => {
      const y = top + i * rowH;
      const tip = r.name + ': joined ' + TA.fmtInt(r.joined) + ', target ' + TA.fmtInt(r.target) + (TA.isNum(r.attain) ? ', ' + TA.fmtPct(r.attain) : '') + (TA.isNum(r.gap) ? ', gap ' + (r.gap > 0 ? '+' : '') + r.gap : '') + (TA.isNum(r.compare) ? ' | comparison ' + TA.fmtInt(r.compare) : '') + (TA.isNum(r.projected) ? ' | scenario ' + Math.round(r.projected) : '');
      svg += '<g class="row" data-tip="' + esc(tip) + '">';
      svg += '<rect class="hit" x="0" y="' + y + '" width="' + W + '" height="' + rowH + '"/>';
      svg += '<text class="lbl" x="' + (labelW - 8) + '" y="' + (y + rowH / 2 + 4) + '" text-anchor="end">' + esc(r.name) + '</text>';
      const hasCmp = TA.isNum(r.compare);
      const bh = hasCmp ? 10 : 16, by = y + (rowH - (hasCmp ? 22 : bh)) / 2;
      if (TA.isNum(r.projected)) svg += '<rect x="' + labelW + '" y="' + (by - 2) + '" width="' + Math.max(0, x(r.projected) - labelW) + '" height="' + (bh + 4) + '" rx="3" fill="none" stroke="var(--series-1)" stroke-dasharray="4 3"/>';
      if (TA.isNum(r.joined)) svg += '<rect class="bar" x="' + labelW + '" y="' + by + '" width="' + Math.max(0, x(r.joined) - labelW) + '" height="' + bh + '" rx="3" fill="var(--series-1)"/>';
      if (hasCmp) svg += '<rect class="bar" x="' + labelW + '" y="' + (by + bh + 2) + '" width="' + Math.max(0, x(r.compare) - labelW) + '" height="' + bh + '" rx="3" fill="var(--series-2)"/>';
      if (TA.isNum(r.target)) svg += '<line x1="' + x(r.target) + '" x2="' + x(r.target) + '" y1="' + (y + 4) + '" y2="' + (y + rowH - 4) + '" stroke="var(--target)" stroke-width="3"/>';
      const lbl = TA.fmtInt(r.joined) + ' / ' + TA.fmtInt(r.target) + (TA.isNum(r.attain) ? ' · ' + TA.fmtPct(r.attain) : '') + (TA.isNum(r.gap) ? ' · ' + (r.gap > 0 ? '+' : r.gap < 0 ? '−' : '±') + Math.abs(r.gap) : '');
      svg += '<text class="lbl" x="' + (W - valueW + 10) + '" y="' + (y + rowH / 2 + 4) + '">' + esc(lbl) + '</text>';
      svg += '</g>';
    });
    svg += '<line class="axis" x1="' + labelW + '" x2="' + labelW + '" y1="' + top + '" y2="' + (H - 22) + '"/></svg>';
    let legend = '<div class="legend"><span><i class="swatch" style="background:var(--series-1)"></i>Joined (source-reported)</span><span><i class="swatch tick"></i>Target</span>';
    if (rows.some(r => TA.isNum(r.compare))) legend += '<span><i class="swatch" style="background:var(--series-2)"></i>' + esc(opt.compareLabel || 'Comparison period') + '</span>';
    if (rows.some(r => TA.isNum(r.projected))) legend += '<span><i class="swatch" style="border:1px dashed var(--series-1)"></i>Run-rate scenario (assumption)</span>';
    legend += '</div>';
    return legend + '<div class="chart">' + svg + '</div>';
  }
  function chartLine(points, unit, o) {
    const opt = o || {};
    if (!points.length) return '<div class="empty">No data points.</div>';
    const W = 700, H = 240, L = 56, R = 44, T = 16, B = 40;
    const vals = points.map(p => p.value).concat(points.map(p => p.target).filter(TA.isNum));
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (lo === hi) { lo = lo - 1; hi = hi + 1; }
    const pad = (hi - lo) * .15; lo = Math.max(unit === '%' || unit === 'count' || unit === 'days' ? 0 : -Infinity, lo - pad); hi = hi + pad;
    const xs = (i) => points.length === 1 ? L + (W - L - R) / 2 : L + i * (W - L - R) / (points.length - 1);
    const ys = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opt.aria || 'Trend') + '">';
    for (let k = 0; k <= 4; k++) { const v = lo + k * (hi - lo) / 4; svg += '<line class="gridline" x1="' + L + '" x2="' + (W - R) + '" y1="' + ys(v) + '" y2="' + ys(v) + '"/><text class="lbl-muted" x="' + (L - 6) + '" y="' + (ys(v) + 4) + '" text-anchor="end">' + esc(TA.round(v, 1)) + '</text>'; }
    const tgt = points.filter(p => TA.isNum(p.target));
    if (tgt.length) svg += '<polyline fill="none" stroke="var(--target)" stroke-width="2" stroke-dasharray="5 4" points="' + points.map((p, i) => TA.isNum(p.target) ? xs(i) + ',' + ys(p.target) : '').filter(Boolean).join(' ') + '"/>';
    svg += '<polyline fill="none" stroke="var(--series-1)" stroke-width="2" points="' + points.map((p, i) => xs(i) + ',' + ys(p.value)).join(' ') + '"/>';
    points.forEach((p, i) => {
      svg += '<g data-tip="' + esc(p.label + ': ' + TA.fmtVal(p.value, unit) + (TA.isNum(p.target) ? ' (target ' + TA.fmtVal(p.target, unit) + ')' : '')) + '"><circle cx="' + xs(i) + '" cy="' + ys(p.value) + '" r="12" fill="transparent"/><circle cx="' + xs(i) + '" cy="' + ys(p.value) + '" r="4.5" fill="var(--series-1)" stroke="#fff" stroke-width="2"/></g>';
      svg += '<text class="lbl-muted" x="' + xs(i) + '" y="' + (H - 18) + '" text-anchor="middle">' + esc(p.short || p.label) + '</text>';
    });
    const last = points[points.length - 1];
    svg += '<text class="lbl" x="' + (xs(points.length - 1) + (points.length === 1 ? 10 : -6)) + '" y="' + (ys(last.value) - 10) + '" text-anchor="' + (points.length === 1 ? 'start' : 'end') + '">' + esc(TA.fmtVal(last.value, unit)) + '</text>';
    svg += '</svg>';
    return '<div class="legend"><span><i class="swatch" style="background:var(--series-1)"></i>Actual</span>' + (tgt.length ? '<span><i class="swatch" style="border-top:2px dashed var(--target);height:0;border-radius:0"></i>Target</span>' : '') + '</div><div class="chart">' + svg + '</div>';
  }
  function chartTimeline(projects, milestones) {
    const dated = projects.filter(p => p.startDate || p.originalDeadline || p.revisedDeadline);
    if (!dated.length) return '<div class="empty">No dated projects yet. Add a start date and deadline to show a project on the timeline.</div>';
    const dates = [];
    dated.forEach(p => ['startDate', 'originalDeadline', 'revisedDeadline', 'completionDate'].forEach(k => { if (p[k]) dates.push(Date.parse(p[k])); }));
    milestones.forEach(m => ['plannedDate', 'revisedDate', 'actualDate'].forEach(k => { if (m[k]) dates.push(Date.parse(m[k])); }));
    const today = Date.parse(TA.todayIso()); dates.push(today);
    const lo = Math.min(...dates) - 7 * 864e5, hi = Math.max(...dates) + 7 * 864e5;
    const W = 860, L = 200, R = 20, rowH = 40, T = 26;
    const x = (t) => L + (t - lo) / (hi - lo) * (W - L - R);
    const H = T + dated.length * rowH + 10;
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Project timeline">';
    const d0 = new Date(lo); d0.setDate(1);
    for (let d = new Date(d0); d.getTime() <= hi; d.setMonth(d.getMonth() + 1)) {
      const gx = x(d.getTime()); if (gx < L) continue;
      svg += '<line class="gridline" x1="' + gx + '" x2="' + gx + '" y1="' + (T - 6) + '" y2="' + H + '"/><text class="lbl-muted" x="' + (gx + 3) + '" y="14">' + d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) + '</text>';
    }
    svg += '<line x1="' + x(today) + '" x2="' + x(today) + '" y1="' + (T - 6) + '" y2="' + H + '" stroke="var(--bad)" stroke-width="1.5" stroke-dasharray="3 3"/><text class="lbl-muted" x="' + (x(today) + 3) + '" y="' + (T + 2) + '">Today</text>';
    dated.forEach((p, i) => {
      const y = T + i * rowH + 8;
      svg += '<text class="lbl" x="' + (L - 8) + '" y="' + (y + 14) + '" text-anchor="end">' + esc(p.name.length > 28 ? p.name.slice(0, 27) + '…' : p.name) + '</text>';
      const s = p.startDate ? Date.parse(p.startDate) : null, od = p.originalDeadline ? Date.parse(p.originalDeadline) : null, rd = p.revisedDeadline ? Date.parse(p.revisedDeadline) : null;
      const end = rd || od;
      if (s && end) svg += '<rect x="' + x(s) + '" y="' + y + '" width="' + Math.max(2, x(end) - x(s)) + '" height="12" rx="3" fill="' + (p.status === 'Completed' ? 'var(--series-1)' : '#B9DCE4') + '" data-tip="' + esc(p.name + ' · ' + p.status + ' · ' + TA.fmtDate(p.startDate) + ' → ' + TA.fmtDate(p.revisedDeadline || p.originalDeadline)) + '"/>';
      if (od) svg += '<g data-tip="Original deadline ' + esc(TA.fmtDate(p.originalDeadline)) + '"><line x1="' + x(od) + '" x2="' + x(od) + '" y1="' + (y - 4) + '" y2="' + (y + 16) + '" stroke="var(--target)" stroke-width="3"/></g>';
      if (rd && rd !== od) svg += '<g data-tip="Revised deadline ' + esc(TA.fmtDate(p.revisedDeadline)) + '"><path d="M' + x(rd) + ' ' + (y - 4) + ' l5 10 l-5 10 l-5 -10 z" fill="var(--series-2)"/></g>';
      if (p.completionDate) svg += '<g data-tip="Completed ' + esc(TA.fmtDate(p.completionDate)) + '"><circle cx="' + x(Date.parse(p.completionDate)) + '" cy="' + (y + 6) + '" r="5" fill="var(--good)" stroke="#fff" stroke-width="2"/></g>';
      milestones.filter(m => m.projectId === p.id).forEach(m => {
        const md = m.actualDate || m.revisedDate || m.plannedDate; if (!md) return;
        svg += '<g data-tip="' + esc('Milestone: ' + m.name + ' · ' + (m.status || 'Planned') + ' · ' + TA.fmtDate(md)) + '"><rect x="' + (x(Date.parse(md)) - 4) + '" y="' + (y + 18) + '" width="8" height="8" transform="rotate(45 ' + x(Date.parse(md)) + ' ' + (y + 22) + ')" fill="' + (m.status === 'Done' ? 'var(--good)' : 'var(--slate)') + '"/></g>';
      });
    });
    svg += '</svg>';
    return '<div class="legend"><span><i class="swatch" style="background:#B9DCE4"></i>Planned span</span><span><i class="swatch" style="background:var(--series-1)"></i>Completed span</span><span><i class="swatch tick"></i>Original deadline</span><span><i class="swatch" style="background:var(--series-2);transform:rotate(45deg)"></i>Revised deadline</span><span><i class="swatch" style="background:var(--good);border-radius:50%"></i>Completion</span><span><i class="swatch" style="background:var(--slate);transform:rotate(45deg)"></i>Milestone</span></div><div class="chart timeline">' + svg + '</div>';
  }

  /* Tooltip layer */
  function initTooltips() {
    const tip = document.createElement('div'); tip.className = 'tooltip'; tip.hidden = true; tip.setAttribute('aria-hidden', 'true'); document.body.appendChild(tip);
    document.addEventListener('mousemove', (e) => {
      const t = e.target.closest && e.target.closest('[data-tip]');
      if (!t) { tip.hidden = true; return; }
      tip.textContent = t.getAttribute('data-tip'); tip.hidden = false;
      const x = Math.min(window.innerWidth - tip.offsetWidth - 8, e.clientX + 14), y = Math.min(window.innerHeight - tip.offsetHeight - 8, e.clientY + 14);
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    });
  }

  /* ---------- Downloads ---------- */
  /* Inside a claude.ai Artifact, files go through the viewer's save prompt (downloads capability);
     elsewhere a normal browser download is used. */
  async function download(blob, filename) {
    let dl = null;
    if (window.claude && typeof window.claude.use === 'function') { try { dl = await window.claude.use('downloads'); } catch (e) { dl = null; } }
    if (dl) {
      try { await dl.save({ filename, data: blob }); toast('Saved ' + filename); }
      catch (e) {
        const code = e && e.code;
        if (code === 'declined') toast('Download cancelled');
        else if (code === 'rate_limited') toast('A save prompt is already open – try again in a moment');
        else toast('Download not available here (' + (code || 'error') + ')');
        return false;
      }
      return true;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    return true;
  }
  function csvEscape(v) { const s = v === null || v === undefined ? '' : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function toCSV(entity, rows) {
    const def = TA.ENTITIES[entity];
    const keys = def.fields.map(f => f.k);
    const comp = def.cols.filter(c => c[0] === '_');
    const head = ['id'].concat(def.fields.map(f => f.l), comp.map(c => COMPUTED_LABELS[c]), ['Archived', 'Deleted at', 'Created', 'Updated', 'Evidence links']);
    const lines = [head.map(csvEscape).join(',')];
    rows.forEach(r => lines.push([r.id].concat(keys.map(k => rawValue(entity, r, k)), comp.map(c => rawValue(entity, r, c)),
      [r.archived ? 'Yes' : 'No', r.deletedAt || '', r.createdAt, r.updatedAt, (r.evidence || []).map(e => e.label + (e.url ? ' <' + e.url + '>' : '')).join(' | ')]).map(csvEscape).join(',')));
    return '﻿' + lines.join('\r\n');
  }
  function parseCSV(text) {
    const rows = []; let row = [], f = '', q = false;
    text = text.replace(/^﻿/, '');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
      else f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows.filter(r => r.some(c => c.trim() !== ''));
  }

  Object.assign(TA, { esc, np, attr, badge, statusKind, prov, cell, rawValue, colLabel, fieldDef, table, tstate, tableRowsForExport, openDialog, closeDialog,
    confirmDialog, toast, formHTML, readForm, validate, chartProgrammes, chartLine, chartTimeline, initTooltips, download, toCSV, parseCSV, searchText, COMPUTED_LABELS });
})();
