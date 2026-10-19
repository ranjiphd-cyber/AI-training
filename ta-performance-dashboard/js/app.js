/* Application shell, sections and interactions. */
(function () {
  'use strict';
  const TA = window.TA;
  const S = TA.Store;
  const { esc, np, badge, prov, table, attr } = TA;

  const SECTIONS = [
    ['overview', 'Executive Overview'], ['metrics', 'Deliverables & Metrics'], ['trends', 'Trends & Programme Results'],
    ['team', 'Team & Development'], ['projects', 'Projects & Process Improvement'], ['leadership', 'Leadership Development'],
    ['feedback', 'Feedback & Actions'], ['value', 'Business Value & Savings'], ['quality', 'Data Quality & Evidence'],
    ['reports', 'Reports & Exports'], ['settings', 'Settings / Backup']
  ];
  const ui = { section: 'overview', tabs: {}, trendType: 'YTD', trendMetric: null, cmpPeriod: '', showScenario: false, showAllPeriods: false,
    showDismissed: false, histEntity: '', importSt: null, restoreSt: null };

  const curPeriod = () => TA.period(S.state.meta.selectedPeriodId) || S.list('periods')[0] || null;
  const tab = (sec, def) => ui.tabs[sec] || def;
  const card = (title, sub, body, extra) => '<section class="card' + (extra && extra.cls ? ' ' + extra.cls : '') + '"' + (extra && extra.id ? ' id="' + extra.id + '"' : '') + '>' +
    '<div class="card-head"><div><h3>' + esc(title) + '</h3>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (extra && extra.tools ? '<div class="btn-row">' + extra.tools + '</div>' : '') + '</div>' + body + '</section>';
  const commentary = (changed, matters, follows) => '<div class="commentary"><div><b>What changed</b>' + changed + '</div><div><b>Why it matters</b>' + matters + '</div><div><b>What follows</b>' + follows + '</div></div>';
  const tabs = (sec, items, def) => '<div class="tabs" role="tablist">' + items.map(([k, l]) => '<button role="tab" aria-selected="' + (tab(sec, def) === k) + '" data-act="tab" data-sec="' + sec + '" data-tab="' + k + '">' + esc(l) + '</button>').join('') + '</div>';
  const pipeline = (steps) => '<div class="pipeline">' + steps.map(([n, l]) => '<div class="step"><div class="n">' + n + '</div><div class="l">' + esc(l) + '</div></div>').join('') + '</div>';
  const openQuestions = () => S.list('questions').filter(q => q.status === 'Open' || q.status === 'Awaiting data owner');

  /* ================= Executive Overview ================= */
  function secOverview() {
    const p = curPeriod();
    if (!p) return card('No reporting period', '', '<p>Add a reporting period in Deliverables &amp; Metrics.</p>');
    const ps = TA.programmeSummary(p.id);
    const fr = TA.freshness(p);
    const checks = TA.dataChecks();
    const conflicts = checks.filter(c => c.severity === 'Conflict');
    const oq = openQuestions();
    const essential = oq.filter(q => q.priority === 'Essential');
    let h = '';
    h += '<div class="section-head"><div><h2>Executive Overview</h2><p>' + esc(S.state.meta.owner) + ' · ' + esc(S.state.meta.role) + ' · ' + esc(S.state.meta.org) + '</p></div>' +
      '<div class="btn-row"><button class="btn" data-act="nav" data-sec="reports">Prepare leadership pack</button></div></div>';
    h += '<div class="notice info" style="margin-bottom:14px"><strong>Reporting period:</strong> ' + esc(p.label) + ' (' + TA.fmtDate(p.start) + ' – ' + TA.fmtDate(p.end) + ') · ' +
      esc(fr.label) + ' · <strong>Last update:</strong> ' + TA.fmtDateTime(S.state.meta.updatedAt) + ' · ' +
      (conflicts.length ? badge(conflicts.length + ' data conflict' + (conflicts.length > 1 ? 's' : ''), 'bad') + ' ' : '') +
      (essential.length ? badge(essential.length + ' essential confirmation' + (essential.length > 1 ? 's' : '') + ' open', 'warn') : '') +
      ' <button class="linklike" data-act="nav" data-sec="quality">Review data quality</button></div>';

    // KPI tiles
    h += '<div class="kpis" style="margin-bottom:14px">';
    const totalObs = ps.totalObs;
    h += tile('Total joined', TA.fmtInt(ps.reportedTotal !== null ? ps.reportedTotal : ps.joinedSum),
      (ps.reportedTotal !== null ? prov('src') : prov('recalc')) + '<br>Programme sum (recalc.): ' + TA.fmtInt(ps.joinedSum) + (ps.reportedTotal !== null && ps.joinedSum !== ps.reportedTotal ? ' ' + badge('Conflict') : (ps.reportedTotal !== null ? ' ' + badge('Reconciles', 'good') : '')),
      totalObs ? { entity: 'observations', id: totalObs.id } : null);
    h += tile('Combined programme target', ps.allTargets ? TA.fmtInt(ps.targetSum) : 'Not provided', prov('recalc') + '<br>Sum of ' + ps.count + ' programme targets');
    h += tile('Aggregate attainment', TA.fmtPct(ps.aggregateAttain), prov('recalc') + '<br>Includes over-target programmes; see shortfalls');
    h += tile('Programmes at or above target', ps.count ? ps.metOrAbove + ' of ' + ps.count : 'Not provided', prov('recalc'));
    h += tile('Shortfall in below-target programmes', ps.shortfalls.length ? '−' + ps.shortfallSum + ' joiners' : (ps.count ? 'None' : 'Not provided'),
      prov('recalc') + '<br>' + (ps.shortfalls.length ? esc(ps.shortfalls.map(r => r.p.name).join(', ')) : ''));
    S.list('observations').filter(o => o.periodId === p.id && (TA.metric(o.metricId) || {}).role !== 'totalJoined').forEach(o => {
      const c = TA.obsCalc(o);
      h += tile(c.m.name || 'Metric', TA.fmtVal(c.value, c.unit),
        (c.reported !== null ? prov('src') : prov('recalc')) + '<br>Target: ' + (TA.isNum(o.target) ? esc(TA.fmtVal(o.target, c.unit)) + ' · ' + badge(c.status) : '<span class="np">Not provided</span>') +
        (c.recalc !== null ? '<br>Recalc.: ' + esc(TA.fmtVal(c.recalc, c.unit)) + (c.conflict ? ' ' + badge('Conflict') : '') : ''), { entity: 'observations', id: o.id });
    });
    h += '</div>';

    // Commitments vs results
    const rows = ps.rows.map(r => ({ name: r.p.name, joined: r.p.joined, target: r.p.target, attain: r.attain, gap: r.gap }));
    const prior = TA.priorPeriod(p);
    const priorPs = prior && TA.comparability(prior, p).ok ? TA.programmeSummary(prior.id) : null;
    const changed = priorPs && priorPs.count && !TA.programmeSetsMatch(priorPs, ps) ? 'Prior period ' + esc(prior.label) + ' holds a different set of programmes, so totals are not compared.'
      : priorPs && priorPs.count ? 'Total joined ' + TA.fmtInt(priorPs.joinedSum) + ' in ' + esc(prior.label) + ' → ' + TA.fmtInt(ps.joinedSum) + ' now (' + esc(TA.deltaText('count', priorPs.joinedSum, ps.joinedSum)) + ').'
      : 'No comparable prior period recorded, so no change can be stated. Position at cut-off: ' + TA.fmtInt(ps.joinedSum) + ' joined against ' + TA.fmtInt(ps.targetSum) + ' combined target.';
    const matters = ps.shortfalls.length ? ps.shortfalls.length + ' programme(s) are ' + ps.shortfallSum + ' joiners short (' + esc(ps.shortfalls.map(r => r.p.name + ' ' + r.gap).join(', ')) + '). ' +
      (ps.overs.length ? 'Over-target programmes (+' + ps.overSum + ': ' + esc(ps.overs.map(r => r.p.name).join(', ')) + ') lift the aggregate; they do not close programme-specific gaps.' : '') : 'All programmes with targets are at or above target.';
    const follows = ps.shortfalls.length ? 'Confirm whether targets are full-year or YTD; agree recovery, re-phasing or target revision for each shortfall programme with the business.' : 'Maintain delivery; confirm target basis for next period.';
    h += '<div class="grid g2" style="margin-bottom:14px">';
    h += card('Commitments vs results', 'Programme targets and joiners, ' + esc(p.label) + '. Targets are source-reported; agreement evidence not recorded.',
      (rows.length ? TA.chartProgrammes(rows) + progTable(ps) : '<div class="empty">No programme results for this period.</div>') + commentary(changed, matters, follows), { cls: 'span2' });
    h += '</div>';

    h += '<div class="grid g3" style="margin-bottom:14px">';
    // Key trends
    const trendItems = [];
    S.list('metrics').forEach(m => {
      const t = TA.metricTrend(m.id, p.type, p.scope);
      if (t.included.length >= 2) { const a = t.included[t.included.length - 2], b = t.included[t.included.length - 1]; trendItems.push('<li><div class="li-main"><div class="li-title">' + esc(m.name) + '</div><div class="li-sub">' + esc(a.period.label) + ' ' + esc(TA.fmtVal(a.value, m.unit)) + ' → ' + esc(b.period.label) + ' ' + esc(TA.fmtVal(b.value, m.unit)) + ': ' + esc(TA.deltaText(m.unit, a.value, b.value)) + '</div></div></li>'); }
    });
    h += card('Key trends', 'Only comparable periods (same type, scope and population) are compared.',
      trendItems.length ? '<ul class="list">' + trendItems.join('') + '</ul>' : '<p class="muted">No trend available: each measure has one ' + esc(p.type) + ' observation for this scope. Add comparable prior-period results to show change over time.</p><button class="linklike" data-act="nav" data-sec="trends">Open trends</button>');
    // Verified financial benefits
    const bt = TA.benefitTotals();
    const vb = TA.BENEFIT_CATS.filter(c => bt[c].validated > 0);
    const allBen = S.list('benefits').length;
    h += card('Verified financial benefits', 'Validated benefits only; categories are never added together.',
      (vb.length ? '<ul class="list">' + vb.map(c => '<li><div class="li-main"><div class="li-title">' + esc(c) + '</div><div class="li-sub">' + bt[c].validated + ' validated · gross ' + esc(TA.fmtVal(bt[c].validatedGross, bt[c].unit)) + (bt[c].netKnown ? ' · net ' + esc(TA.fmtINR(bt[c].validatedNet)) : ' · net not calculable (cost missing)') + '</div></div></li>').join('') + '</ul>'
        : '<p class="muted">No validated financial benefits recorded.' + (allBen ? ' ' + allBen + ' benefit record(s) are awaiting validation or inputs.' : ' No benefit inputs have been supplied.') + '</p>') +
      '<button class="linklike" data-act="nav" data-sec="value">Open business value</button>');
    // Team & capability
    const team = S.list('team');
    const cnt = (st) => team.filter(t => t.employmentStatus === st).length;
    const dev = S.list('devItems');
    const devC = (pred) => dev.filter(pred).length;
    h += card('Team & capability highlights', 'Counts only; no ranking or rating.',
      '<ul class="list"><li><div class="li-main"><div class="li-title">Team records</div><div class="li-sub">' + team.length + ' recorded · ' + cnt('Active') + ' active · ' + cnt('Left') + ' left (history retained) · ' + cnt('Not provided') + ' status not provided</div></div></li>' +
      '<li><div class="li-main"><div class="li-title">Development items</div><div class="li-sub">' + devC(d => d.learningStatus === 'Planned') + ' planned · ' + devC(d => d.learningStatus === 'Ongoing') + ' ongoing · ' + devC(d => d.learningStatus === 'Completed') + ' completed · ' +
      devC(d => /^Applied|^Capability/.test(d.capabilityStage || '')) + ' applied at work · ' + devC(d => d.capabilityStage === 'Capability demonstrated – reviewer validated') + ' reviewer-validated</div></div></li>' +
      '<li><div class="li-main"><div class="li-title">Succession</div><div class="li-sub">' + team.filter(t => t.successionReadiness && t.successionReadiness !== 'Not assessed').length + ' assessed · ' + team.filter(t => t.backupCoverage).length + ' with backup coverage recorded</div></div></li></ul>');
    h += '</div>';

    // Process-improvement projects
    const prj = S.list('projects');
    if (prj.length) {
      const order = TA.ENTITIES.projects.fields.find(f => f.k === 'status').o;
      h += card('Process-improvement projects', prj.filter(x => x.agreement === 'Agreed commitment').length + ' of ' + prj.length + ' recorded as agreed commitments. Delivery status only; benefits are tracked separately.',
        '<div class="btn-row" style="margin-bottom:8px">' + order.filter(s => prj.some(x => x.status === s)).map(s => badge(prj.filter(x => x.status === s).length + ' ' + s, TA.statusKind(s))).join(' ') + '</div>' +
        '<ul class="list">' + prj.filter(x => ['At risk', 'Delayed', 'On hold'].indexOf(x.status) >= 0).map(x => '<li><div class="li-main"><button class="rowtitle" data-act="view" data-entity="projects" data-id="' + x.id + '">' + esc(x.name) + '</button><div class="li-sub">' + (x.statusComment ? esc(x.statusComment) : 'No status comment') + (x.statusAsOf ? ' · as of ' + TA.fmtDate(x.statusAsOf) : '') + '</div></div>' + badge(x.status) + '</li>').join('') + '</ul>' +
        '<button class="linklike" data-act="nav" data-sec="projects">Open projects</button>');
      h += '<div style="height:14px"></div>';
    }
    // Contribution lens
    h += card('Contribution lens', 'Separates the TA Head\'s leadership contribution, team execution and shared business outcomes (as classified on each record).', contributionLens(p), { cls: '' });

    h += '<div class="grid g3" style="margin:14px 0">';
    // Gaps & risks
    const risks = S.list('risks').filter(r => r.status !== 'Closed');
    h += card('Gaps & risks', '',
      '<ul class="list">' + ps.shortfalls.map(r => '<li><div class="li-main"><div class="li-title">' + esc(r.p.name) + ' below target</div><div class="li-sub">' + r.p.joined + ' of ' + r.p.target + ' (' + TA.fmtPct(r.attain) + '), gap ' + r.gap + '</div></div>' + badge('Below target') + '</li>').join('') +
      risks.map(r => '<li><div class="li-main"><button class="rowtitle" data-act="view" data-entity="risks" data-id="' + r.id + '">' + esc(r.title) + '</button><div class="li-sub">Likelihood ' + esc(r.likelihood || 'Not assessed') + ' · impact ' + esc(r.impact || 'Not assessed') + ' · owner ' + esc(r.owner || 'Not provided') + '</div></div>' + badge(r.status) + '</li>').join('') +
      (conflicts.length ? '<li><div class="li-main"><div class="li-title">' + conflicts.length + ' data conflict(s) need validation</div><div class="li-sub">' + esc(conflicts.map(c => c.title).join('; ')) + '</div></div>' + badge('Conflict') + '</li>' : '') +
      '</ul>' + (!ps.shortfalls.length && !risks.length && !conflicts.length ? '<p class="muted">No gaps or open risks recorded.</p>' : ''));
    // Overdue
    const od = S.list('actions').filter(TA.isOverdue).map(a => ({ e: 'actions', r: a, t: a.title, d: a.dueDate, o: a.owner }))
      .concat(S.list('feedback').filter(TA.fbOverdue).map(f => ({ e: 'feedback', r: f, t: 'Feedback action: ' + (f.agreedAction || TA.recordTitle('feedback', f)), d: f.dueDate, o: f.owner })));
    const undated = S.list('actions').filter(a => !a.dueDate && ['Completed', 'Cancelled'].indexOf(a.status) < 0);
    h += card('Overdue actions', 'Due date before today and not completed.',
      (od.length ? '<ul class="list">' + od.map(x => '<li><div class="li-main"><button class="rowtitle" data-act="view" data-entity="' + x.e + '" data-id="' + x.r.id + '">' + esc(x.t) + '</button><div class="li-sub">Due ' + TA.fmtDate(x.d) + ' · owner ' + esc(x.o || 'Not provided') + '</div></div>' + badge('Overdue') + '</li>').join('') + '</ul>' : '<p class="muted">No overdue actions.</p>') +
      (undated.length ? '<p class="small muted">' + undated.length + ' open action(s) have no due date, so overdue status cannot be assessed.</p>' : ''));
    // Decisions / support
    const dec = S.list('decisions').filter(d => d.status === 'Open');
    h += card('Decisions & support required', '',
      (dec.length ? '<ul class="list">' + dec.map(d => '<li><div class="li-main"><button class="rowtitle" data-act="view" data-entity="decisions" data-id="' + d.id + '">' + esc(d.title) + '</button><div class="li-sub">' + esc(d.type) + ' · from ' + esc(d.requestedFrom || 'Not provided') + ' · by ' + TA.fmtDate(d.dueDate) + '</div></div>' + badge(d.type) + '</li>').join('') + '</ul>' : '<p class="muted">No decisions or support requests recorded.</p>') +
      (essential.length ? '<h4 style="margin-top:10px">Essential confirmations</h4><ul class="list">' + essential.map(q => '<li><div class="li-main"><button class="rowtitle" data-act="view" data-entity="questions" data-id="' + q.id + '">' + esc(q.title) + '</button><div class="li-sub">Confirm with ' + esc(q.owner || 'Not provided') + '</div></div></li>').join('') + '</ul>' : '') +
      '<button class="btn sm" data-act="add" data-entity="decisions">+ Add decision / support request</button>');
    h += '</div>';

    // Narrative
    const nar = S.state.narratives[p.id];
    h += card('Executive narrative', 'Editable. Saved per reporting period and included in exports. "Insert data summary" adds a factual draft built from recorded data for you to edit.',
      '<label for="narrative" style="position:absolute;left:-9999px">Executive narrative</label><textarea id="narrative" data-narrative="' + p.id + '" placeholder="No narrative written for this period yet.">' + esc(nar ? nar.text : '') + '</textarea>' +
      '<div class="btn-row" style="margin-top:8px"><button class="btn primary" data-act="save-narrative" data-id="' + p.id + '">Save narrative</button><button class="btn" data-act="draft-narrative" data-id="' + p.id + '">Insert data summary</button>' +
      '<span class="small muted" id="narrative-status">' + (nar ? 'Last saved ' + TA.fmtDateTime(nar.updatedAt) : 'Not saved yet') + '</span></div>', { cls: 'narrative' });
    return h;
  }
  function tile(label, value, sub, ref) {
    const npv = value === 'Not provided';
    return '<div class="tile"><div class="t-label">' + esc(label) + '</div><div class="t-value' + (npv ? ' np' : '') + '">' + esc(value) + '</div><div class="t-sub">' + (sub || '') + '</div>' +
      (ref ? '<button class="linklike" data-act="view" data-entity="' + ref.entity + '" data-id="' + ref.id + '">Definition & evidence</button>' : '') + '</div>';
  }
  function progTable(ps, extraCols) {
    return '<details class="tableview"><summary>Table view and status labels</summary><div class="table-wrap" style="margin-top:6px"><table class="data"><thead><tr><th scope="col">Programme</th><th scope="col">Group</th><th scope="col" class="num">Target</th><th scope="col" class="num">Joined</th><th scope="col" class="num">Attainment</th><th scope="col" class="num">Gap</th><th scope="col">Status</th>' + (extraCols ? extraCols.head : '') + '</tr></thead><tbody>' +
      ps.rows.map(r => '<tr><td><button class="rowtitle" data-act="view" data-entity="programmes" data-id="' + r.p.id + '">' + esc(r.p.name) + '</button></td><td>' + esc(r.p.group || 'Not provided') + '</td><td class="num">' + TA.fmtInt(r.p.target) + '</td><td class="num">' + TA.fmtInt(r.p.joined) + '</td><td class="num">' + TA.fmtPct(r.attain) + '</td><td class="num">' + (TA.isNum(r.gap) ? (r.gap > 0 ? '+' : '') + r.gap : 'Not provided') + '</td><td>' + badge(r.status) + '</td>' + (extraCols ? extraCols.row(r) : '') + '</tr>').join('') +
      '</tbody><tfoot><tr><td>Total (recalculated)</td><td></td><td class="num">' + (ps.allTargets ? TA.fmtInt(ps.targetSum) : 'Partial') + '</td><td class="num">' + TA.fmtInt(ps.joinedSum) + '</td><td class="num">' + TA.fmtPct(ps.aggregateAttain) + '</td><td class="num">' + (ps.allTargets && ps.allJoined ? (ps.joinedSum - ps.targetSum) : '') + '</td><td class="small">Shortfalls −' + ps.shortfallSum + ' · overs +' + ps.overSum + '</td>' + (extraCols ? extraCols.foot || '' : '') + '</tr></tfoot></table></div></details>';
  }
  function contributionLens(p) {
    const groups = { 'TA Head leadership contribution': [], 'Team execution': [], 'Shared business outcome': [] };
    const push = (e, r, label) => { if (groups[r.attribution]) groups[r.attribution].push({ e, r, label }); };
    S.list('programmes').filter(x => x.periodId === p.id).forEach(r => push('programmes', r, r.name + ' – ' + r.joined + ' joined'));
    S.list('observations').filter(x => x.periodId === p.id).forEach(r => push('observations', r, TA.recordTitle('observations', r)));
    ['projects', 'benefits', 'commitments'].forEach(e => S.list(e).forEach(r => push(e, r, TA.recordTitle(e, r))));
    const unclassified = ['projects', 'benefits', 'commitments'].reduce((t, e) => t + S.list(e).filter(r => !r.attribution || r.attribution === 'Not classified').length, 0);
    return '<div class="attrib">' + Object.keys(groups).map(k => '<div class="col"><h4>' + esc(k) + '</h4><p class="small muted">' + groups[k].length + ' record(s)</p><ul class="list">' +
      groups[k].slice(0, 8).map(x => '<li><button class="rowtitle" data-act="view" data-entity="' + x.e + '" data-id="' + x.r.id + '">' + esc(x.label) + '</button></li>').join('') +
      (groups[k].length > 8 ? '<li class="small muted">+' + (groups[k].length - 8) + ' more</li>' : '') + (groups[k].length ? '' : '<li class="small muted">None recorded</li>') + '</ul></div>').join('') + '</div>' +
      (unclassified ? '<p class="small muted" style="margin-top:8px">' + unclassified + ' project/benefit/commitment record(s) are not classified.</p>' : '') +
      '<p class="small muted" style="margin-top:6px">Hiring results are recorded as shared business outcomes because they depend on business demand and decisions as well as TA execution.</p>';
  }

  /* ================= Deliverables & Metrics ================= */
  function secMetrics() {
    const p = curPeriod();
    let h = '<div class="section-head"><div><h2>Deliverables & Metrics</h2><p>Each measure shows its definition, unit, period, population, target, source-reported and recalculated actuals, calculation, source, owner and update date. Missing values are shown as "Not provided", never as zero.</p></div></div>';
    h += tabs('metrics', [['scorecard', 'Metric scorecard'], ['programmes', 'Programme results'], ['commitments', 'Commitments'], ['definitions', 'Metric definitions'], ['results', 'All metric results'], ['periods', 'Reporting periods']], 'scorecard');
    const t = tab('metrics', 'scorecard');
    if (t === 'scorecard') {
      const rows = [];
      S.list('metrics').forEach(m => {
        const obs = S.list('observations').filter(o => o.metricId === m.id && (ui.showAllPeriods || !p || o.periodId === p.id));
        if (!obs.length) rows.push({ m, o: null });
        obs.forEach(o => rows.push({ m, o }));
      });
      h += '<div class="table-tools"><label class="check"><input type="checkbox" id="chk-allper" data-act="toggle-allper"' + (ui.showAllPeriods ? ' checked' : '') + '> Show all periods (default: selected period)</label><span style="flex:1"></span>' +
        '<button class="btn sm primary" data-act="add" data-entity="observations" data-defaults="' + attr({ periodId: p ? p.id : null }) + '">+ Add metric result</button><button class="btn sm" data-act="add" data-entity="metrics">+ Add metric definition</button></div>';
      h += '<div class="table-wrap"><table class="data"><thead><tr>' + ['Metric', 'Definition', 'Unit', 'Period', 'Population', 'Target', 'Actual (source-reported)', 'Actual (recalculated)', 'Calculation', 'Source', 'Owner', 'Update date', 'Status', 'Evidence'].map(x => '<th scope="col">' + x + '</th>').join('') + '</tr></thead><tbody>';
      rows.forEach(({ m, o }) => {
        const c = o ? TA.obsCalc(o) : null;
        h += '<tr><td><button class="rowtitle" data-act="view" data-entity="' + (o ? 'observations' : 'metrics') + '" data-id="' + (o ? o.id : m.id) + '">' + esc(m.name) + '</button></td>' +
          '<td>' + (m.definition ? esc(m.definition) : np()) + (m.definitionStatus && m.definitionStatus !== 'Source-provided' ? '<br>' + badge(m.definitionStatus, m.definitionStatus === 'Not provided' ? 'info' : 'warn') : '') + '</td>' +
          '<td>' + esc(m.unit) + '</td><td>' + (o ? esc(TA.periodLabel(o.periodId)) : np()) + '</td><td>' + (o && o.population ? esc(o.population) : np()) + '</td>' +
          '<td class="num">' + (o && TA.isNum(o.target) ? esc(TA.fmtVal(o.target, m.unit)) : np()) + '</td>' +
          '<td class="num">' + (c && c.reported !== null ? esc(TA.fmtVal(c.reported, m.unit)) : np()) + '</td>' +
          '<td class="num">' + (c && c.recalc !== null ? esc(TA.fmtVal(c.recalc, m.unit)) + (c.conflict ? '<br>' + badge('Conflict') : '') : '<span class="np">Not applicable</span>') + '</td>' +
          '<td class="small">' + (c && c.recalcMethod ? esc(c.recalcMethod) : (m.calculation ? esc(m.calculation) : np())) + '</td>' +
          '<td class="small">' + (o && o.source ? esc(o.source) : (m.source ? esc(m.source) : np())) + '</td><td>' + (o && o.owner ? esc(o.owner) : (m.owner ? esc(m.owner) : np())) + '</td>' +
          '<td class="nowrap">' + (o ? TA.fmtDate(o.dataDate) : np()) + '</td><td>' + (c ? badge(c.status) : badge('Not provided', 'neutral')) + '</td>' +
          '<td>' + (o ? ((o.evidence || []).length + ' item(s)') : (o === null ? '<button class="btn sm" data-act="add" data-entity="observations" data-defaults="' + attr({ metricId: m.id, periodId: p ? p.id : null }) + '">Add result</button>' : '')) + '</td></tr>';
      });
      h += '</tbody></table></div>';
    } else if (t === 'programmes') {
      const ps = p ? TA.programmeSummary(p.id) : null;
      h += table('programmes', 'programmes', { filters: ['periodId', 'group'], defaults: { periodId: p ? p.id : null, attribution: 'Shared business outcome' },
        footer: ps && ps.count ? '<tr><td>Selected period total (recalc.)</td><td></td><td></td><td class="num">' + TA.fmtInt(ps.targetSum) + '</td><td class="num">' + TA.fmtInt(ps.joinedSum) + '</td><td class="num">' + TA.fmtPct(ps.aggregateAttain) + '</td><td class="num">' + (ps.joinedSum - ps.targetSum) + '</td><td colspan="3"></td></tr>' : '' });
      h += '<p class="small muted" style="margin-top:8px">Attainment and gap are recalculated from target and joined. Totals use known values only; missing values are excluded and flagged in Data Quality.</p>';
    } else if (t === 'commitments') {
      h += '<div class="notice" style="margin-bottom:10px">Commitments are classified as <strong>agreed</strong> (agreement evidenced), <strong>proposal</strong>, or <strong>source-reported target</strong> (target supplied but agreement not evidenced).</div>';
      h += table('commitments', 'commitments', { filters: ['classification', 'status'] });
    } else if (t === 'definitions') h += table('metrics', 'metrics', { filters: ['category', 'definitionStatus'] });
    else if (t === 'results') h += table('observations', 'observations', { filters: ['periodId', 'metricId'], defaults: { periodId: p ? p.id : null } });
    else if (t === 'periods') {
      h += '<div class="notice" style="margin-bottom:10px">Add monthly, quarterly, annual or YTD periods to record results. Periods are compared only when type, scope and length match.</div>';
      h += table('periods', 'periods', { filters: ['type', 'scope'] });
    }
    return h;
  }

  /* ================= Trends & Programme Results ================= */
  function secTrends() {
    const p = curPeriod();
    let h = '<div class="section-head"><div><h2>Trends & Programme Results</h2><p>Monthly, quarterly, annual and YTD views appear where data exists. Missing periods are not interpolated, and incompatible periods or populations are not compared.</p></div></div>';
    h += '<div class="tabs" role="tablist" aria-label="Period granularity">' + ['Month', 'Quarter', 'Annual', 'YTD'].map(tp => {
      const n = S.list('periods').filter(x => x.type === tp).length;
      return '<button role="tab" aria-selected="' + (ui.trendType === tp) + '" data-act="trend-type" data-type="' + tp + '">' + ({ Month: 'Monthly', Quarter: 'Quarterly', Annual: 'Annual', YTD: 'YTD' })[tp] + ' (' + n + ')</button>';
    }).join('') + '</div>';
    const periods = S.list('periods').filter(x => x.type === ui.trendType).sort((a, b) => a.start.localeCompare(b.start));
    if (!periods.length) h += '<div class="notice warn" style="margin-bottom:14px">No ' + esc(ui.trendType.toLowerCase()) + ' periods recorded, so no ' + esc(ui.trendType.toLowerCase()) + ' view can be shown. <button class="linklike" data-act="add" data-entity="periods" data-defaults="' + attr({ type: ui.trendType, scope: 'Business scorecard' }) + '">Add a period</button></div>';
    else h += '<p class="small muted">Periods of this type: ' + periods.map(x => esc(x.label)).join(' · ') + '</p>';

    if (p) {
      const ps = TA.programmeSummary(p.id);
      const cmpOptions = S.list('periods').filter(x => x.id !== p.id && TA.programmeSummary(x.id).count);
      const cmp = ui.cmpPeriod ? TA.period(ui.cmpPeriod) : null;
      const comp = cmp ? TA.comparability(p, cmp) : null;
      const cmpPs = cmp && comp.ok ? TA.programmeSummary(cmp.id) : null;
      const rr = ui.showScenario ? TA.runRateScenario(p.id) : null;
      const rows = ps.rows.map(r => {
        const c = cmpPs ? cmpPs.rows.find(x => x.p.name.toLowerCase() === r.p.name.toLowerCase()) : null;
        const s = rr ? rr.rows.find(x => x.name === r.p.name) : null;
        return { name: r.p.name, joined: r.p.joined, target: r.p.target, attain: r.attain, gap: r.gap, compare: c ? c.p.joined : null, projected: s ? s.projected : null };
      });
      let tools = '<label for="cmp-period" class="small muted">Compare with</label><select id="cmp-period" data-act="cmp-period" style="width:auto"><option value="">No comparison</option>' +
        cmpOptions.map(x => '<option value="' + x.id + '"' + (ui.cmpPeriod === x.id ? ' selected' : '') + '>' + esc(x.label) + '</option>').join('') + '</select>' +
        '<label class="check"><input type="checkbox" id="chk-scen" data-act="toggle-scenario"' + (ui.showScenario ? ' checked' : '') + '> Show run-rate scenario</label>';
      let body = '';
      if (cmp && !comp.ok) body += '<div class="notice warn" style="margin-bottom:8px"><strong>Not compared.</strong> ' + esc(comp.reasons.join(' ')) + '</div>';
      if (!cmpOptions.length) body += '<p class="small muted">No other period has programme results, so no period comparison is available.</p>';
      body += ps.count ? TA.chartProgrammes(rows, { compareLabel: cmp ? cmp.label : '' }) + progTable(ps, cmpPs ? { head: '<th scope="col" class="num">' + esc(cmp.label) + '</th><th scope="col">Change</th>', row: (r) => { const c = cmpPs.rows.find(x => x.p.name.toLowerCase() === r.p.name.toLowerCase()); return '<td class="num">' + (c ? TA.fmtInt(c.p.joined) : 'Not provided') + '</td><td>' + (c ? esc(TA.deltaText('count', c.p.joined, r.p.joined)) : 'Not comparable') + '</td>'; } } : null) : '<div class="empty">No programme results recorded for ' + esc(p.label) + '.</div>';
      if (rr) body += '<div class="notice warn" style="margin-top:10px"><strong>Scenario – explicit assumptions:</strong><ul style="margin:6px 0 0 18px;padding:0">' + rr.assumptions.map(a => '<li>' + esc(a) + '</li>').join('') + '</ul><p style="margin-top:6px">Projected total: ' + (rr.total !== null ? Math.round(rr.total) : 'Not calculable') + ' vs combined target ' + TA.fmtInt(rr.targetSum) + '. Method: joined × ' + rr.yearDays + ' ÷ ' + rr.elapsed + '.</p></div>';
      else if (ui.showScenario) body += '<div class="notice" style="margin-top:10px">A run-rate scenario is only available for YTD periods starting 1 January and ending before 31 December.</div>';
      body += commentary(cmpPs ? (TA.programmeSetsMatch(cmpPs, ps) ? 'Compared with ' + esc(cmp.label) + ': total ' + esc(TA.deltaText('count', cmpPs.joinedSum, ps.joinedSum)) + '.' : 'Compared with ' + esc(cmp.label) + ' programme by programme only: the two periods hold different programme sets, so totals are not compared.') : 'No valid comparison selected; figures show the position at ' + TA.fmtDate(p.cutoff || p.end) + '.',
        ps.shortfalls.length ? 'Largest gap: ' + esc(ps.shortfalls.slice().sort((a, b) => a.gap - b.gap)[0].p.name) + ' (' + ps.shortfalls.slice().sort((a, b) => a.gap - b.gap)[0].gap + '). Aggregate attainment ' + TA.fmtPct(ps.aggregateAttain) + ' masks ' + ps.shortfallSum + ' joiners of programme shortfall.' : 'No programme shortfalls.',
        'Use programme-level gaps, not the aggregate, when agreeing recovery plans and targets.');
      h += card('Programme results – ' + p.label, 'Joined vs target by programme (source-reported values; attainment and gaps recalculated).', body, { tools });

      // Contribution
      const groups = {};
      ps.rows.forEach(r => { const g = r.p.group || 'Not classified'; groups[g] = groups[g] || { t: 0, j: 0, tk: true, jk: true }; if (TA.isNum(r.p.target)) groups[g].t += r.p.target; else groups[g].tk = false; if (TA.isNum(r.p.joined)) groups[g].j += r.p.joined; else groups[g].jk = false; });
      h += '<div style="height:14px"></div>' + card('Programme and group contribution', 'Share of total joiners (recalculated). Groups are a reporting assumption – confirm in Data Quality.',
        '<div class="table-wrap"><table class="data"><thead><tr><th scope="col">Group</th><th scope="col" class="num">Target</th><th scope="col" class="num">Joined</th><th scope="col" class="num">Share of joiners</th><th scope="col" class="num">Attainment</th></tr></thead><tbody>' +
        Object.keys(groups).map(g => '<tr><td>' + esc(g) + '</td><td class="num">' + (groups[g].tk ? groups[g].t : 'Partial') + '</td><td class="num">' + (groups[g].jk ? groups[g].j : 'Partial') + '</td><td class="num">' + TA.fmtPct(TA.pct(groups[g].j, ps.joinedSum)) + '</td><td class="num">' + (groups[g].tk && groups[g].jk ? TA.fmtPct(TA.pct(groups[g].j, groups[g].t)) : 'Cannot calculate') + '</td></tr>').join('') +
        '</tbody></table></div>' + commentary('Position at cut-off; no prior split available.', 'Internal mobility (' + (groups['Internal mobility'] ? groups['Internal mobility'].j : 0) + ') is included in total joined; confirm whether it should count as hiring in leadership reporting.', 'Confirm grouping and inclusion rules before the next review.'));
    }

    // Metric trend
    const mets = S.list('metrics');
    const mId = ui.trendMetric && TA.metric(ui.trendMetric) ? ui.trendMetric : (mets[0] ? mets[0].id : null);
    if (mId) {
      const m = TA.metric(mId);
      const tr = TA.metricTrend(mId, ui.trendType, p ? p.scope : null);
      let body = '';
      if (tr.included.length >= 2) {
        body += TA.chartLine(tr.included.map(x => ({ label: x.period.label, short: x.period.label.replace(/ – .*$/, ''), value: x.value, target: x.obs.target })), m.unit, { aria: m.name + ' trend' });
        const a = tr.included[tr.included.length - 2], b = tr.included[tr.included.length - 1];
        body += commentary(esc(a.period.label) + ' → ' + esc(b.period.label) + ': ' + esc(TA.deltaText(m.unit, a.value, b.value)) + '.', 'Direction preference: ' + esc(m.direction || 'Not provided') + '. Change is descriptive; causes are not inferred.', TA.isNum(b.obs.target) ? 'Compare with target ' + esc(TA.fmtVal(b.obs.target, m.unit)) + '.' : 'Agree a target to assess performance.');
      } else if (tr.included.length === 1) {
        body += '<div class="notice" style="margin-top:8px">One observation only (' + esc(tr.included[0].period.label) + ': ' + esc(TA.fmtVal(tr.included[0].value, m.unit)) + '). No trend can be stated, so no chart is drawn.</div>';
      } else body += '<div class="empty">No ' + esc(ui.trendType) + ' observations for this measure' + (p ? ' in scope "' + esc(p.scope || 'Not provided') + '"' : '') + '.</div>';
      if (tr.excluded.length) body += '<p class="small muted" style="margin-top:6px">Excluded from trend: ' + tr.excluded.map(x => esc(x.x.p.label + ' – ' + x.reason)).join('; ') + '</p>';
      body += '<details class="tableview"><summary>Table view</summary><div class="table-wrap"><table class="data"><thead><tr><th scope="col">Period</th><th scope="col">Population</th><th scope="col" class="num">Target</th><th scope="col" class="num">Reported</th><th scope="col" class="num">Recalculated</th><th scope="col">Evidence</th></tr></thead><tbody>' +
        tr.included.map(x => '<tr><td>' + esc(x.period.label) + '</td><td>' + esc(x.obs.population || 'Not provided') + '</td><td class="num">' + esc(TA.fmtVal(x.obs.target, m.unit)) + '</td><td class="num">' + esc(TA.fmtVal(x.calc.reported, m.unit)) + '</td><td class="num">' + esc(TA.fmtVal(x.calc.recalc, m.unit)) + '</td><td><button class="linklike" data-act="view" data-entity="observations" data-id="' + x.obs.id + '">Open</button></td></tr>').join('') + '</tbody></table></div></details>';
      const tools = '<label for="trend-metric" class="small muted">Measure</label><select id="trend-metric" data-act="trend-metric" style="width:auto">' + mets.map(x => '<option value="' + x.id + '"' + (x.id === mId ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select>';
      h += '<div style="height:14px"></div>' + card('Measure trend – ' + ui.trendType, 'Only observations with the same population as the latest one are joined into a trend.', body, { tools });
    }
    return h;
  }

  /* ================= Team & Development ================= */
  function secTeam() {
    let h = '<div class="section-head"><div><h2>Team & Development</h2><p>Individual records, recruiter results and capability development. Historical contributions are kept after a team member leaves.</p></div></div>';
    h += '<div class="notice warn" style="margin-bottom:14px"><strong>No automatic ranking or rating.</strong> Results are shown with role complexity, hiring mix, tenure and target exposure where recorded. Hiring volume alone is not a performance measure. Any insight must be reviewed by a person (record "Human review by/date") before use in an individual performance assessment. Individual records are excluded from leadership exports unless you select them.</div>';
    h += tabs('team', [['members', 'Team members'], ['results', 'Recruiter results'], ['dev', 'Team development'], ['capacity', 'Capacity & succession']], 'members');
    const t = tab('team', 'members');
    if (t === 'members') h += table('team', 'team', { filters: ['employmentStatus', 'successionReadiness'] });
    else if (t === 'results') {
      h += '<div class="notice" style="margin-bottom:10px">Recruiter results cover their own period and cut-off and are not forced to reconcile with the business scorecard. Source-reported attainment and recalculated attainment are both shown; differences are flagged for validation.</div>';
      h += table('recruiterResults', 'recruiterResults', { filters: ['periodId', 'memberId'], defaults: { periodId: 'per_rec_2026ytd' } });
    } else if (t === 'dev') {
      const items = S.list('devItems').filter(d => d.subject !== 'self');
      h += devPipeline(items) + '<div style="height:10px"></div>';
      h += table('devTeam', 'devItems', { rows: S.list('devItems', { archived: tstateArchived('devTeam') }).filter(d => d.subject !== 'self'), filters: ['kind', 'learningStatus', 'capabilityStage'] });
    } else {
      const team = S.list('team', { archived: true });
      h += '<div class="table-wrap"><table class="data"><thead><tr><th scope="col">Team member</th><th scope="col">Status</th><th scope="col">Business coverage</th><th scope="col">Backup coverage</th><th scope="col">Succession readiness</th><th scope="col">Projects owned</th><th scope="col">Development items</th></tr></thead><tbody>' +
        team.map(m => '<tr><td><button class="rowtitle" data-act="view" data-entity="team" data-id="' + m.id + '">' + esc(m.name) + '</button></td><td>' + badge(m.employmentStatus) + '</td><td>' + (m.businessCoverage ? esc(m.businessCoverage) : np()) + '</td><td>' + (m.backupCoverage ? esc(m.backupCoverage) : np()) + '</td><td>' + badge(m.successionReadiness || 'Not assessed', 'neutral') + '</td><td>' + S.list('projects').filter(p => p.owner && TA.similarNames(p.owner, m.name)).length + '</td><td>' + S.list('devItems').filter(d => d.subject === m.id).length + '</td></tr>').join('') +
        '</tbody></table></div><p class="small muted" style="margin-top:8px">Shared business coverage is listed per person and not summed, to avoid double counting. Projects owned are matched by owner name.</p>';
    }
    return h;
  }
  const tstateArchived = (k) => TA.tstate(k).archived;
  function devPipeline(items) {
    const c = (f) => items.filter(f).length;
    return pipeline([[c(d => d.learningStatus === 'Planned'), 'Planned'], [c(d => d.learningStatus === 'Ongoing'), 'Ongoing'], [c(d => d.learningStatus === 'Completed'), 'Completed'],
      [c(d => /^Applied|^Capability/.test(d.capabilityStage || '')), 'Applied at work (evidence recorded)'], [c(d => d.capabilityStage === 'Capability demonstrated – reviewer validated'), 'Capability demonstrated (reviewer validated)']]) +
      '<p class="small muted" style="margin-top:6px">Attendance or certification alone does not count as demonstrated capability. Stages advance only when application at work and reviewer evidence are recorded.</p>';
  }

  /* ================= Projects ================= */
  function secProjects() {
    let h = '<div class="section-head"><div><h2>Projects & Process Improvement</h2><p>Delivery status and benefit realisation are tracked separately. Original deadlines are preserved and every revision is logged.</p></div></div>';
    const projects = S.list('projects');
    const c = (f) => projects.filter(f).length;
    h += pipeline([[c(p => ['Completed', 'Cancelled'].indexOf(p.status) < 0), 'In delivery / planned'], [c(p => p.status === 'Completed'), 'Delivery completed'],
      [c(p => p.status === 'Completed' && !/validated$/.test(p.benefitStatus || '')), 'Completed – benefits not yet validated'], [c(p => /validated$/.test(p.benefitStatus || '')), 'Benefits validated (full or partial)'],
      [c(p => p.revisedDeadline && p.originalDeadline && p.revisedDeadline > p.originalDeadline), 'Deadline revised']]);
    h += '<div style="height:12px"></div>' + tabs('projects', [['table', 'Table'], ['timeline', 'Timeline'], ['milestones', 'Milestones']], 'table');
    const t = tab('projects', 'table');
    if (t === 'table') {
      h += '<p class="small muted">Change a project\'s delivery status directly in the table; it is dated today and kept in the project\'s status history. Use Edit to add a status comment, deadlines and evidence.</p>';
      h += table('projects', 'projects', { filters: ['status', 'agreement', 'benefitStatus'], inline: ['status'], defaults: { agreement: 'Agreed commitment', status: 'Not started', statusAsOf: TA.todayIso(), benefitStatus: 'Not started' },
        empty: 'No projects recorded yet. Use "+ Add project", or import a CSV of projects from Settings / Backup → Import records.' });
    }
    else if (t === 'timeline') h += card('Project timeline', 'Planned span, original vs revised deadlines, completion and milestones.', TA.chartTimeline(projects, S.list('milestones')));
    else h += table('milestones', 'milestones', { filters: ['projectId', 'status'] });
    return h;
  }

  /* ================= Leadership Development ================= */
  function secLeadership() {
    const items = S.list('devItems').filter(d => d.subject === 'self');
    let h = '<div class="section-head"><div><h2>Leadership Development</h2><p>Personal development goals, learning and certifications, application of learning, leadership behaviour commitments, broader P&amp;C contributions, stakeholder collaboration and succession-building – with evidence and review dates.</p></div></div>';
    h += devPipeline(items);
    const kinds = TA.ENTITIES.devItems.fields.find(f => f.k === 'kind').o;
    h += '<div class="kpis" style="margin:12px 0">' + kinds.map(k => '<div class="tile"><div class="t-label">' + esc(k) + '</div><div class="t-value">' + items.filter(d => d.kind === k).length + '</div><div class="t-sub">' + items.filter(d => d.kind === k && d.learningStatus === 'Completed').length + ' completed</div></div>').join('') + '</div>';
    h += table('devSelf', 'devItems', { rows: S.list('devItems', { archived: tstateArchived('devSelf') }).filter(d => d.subject === 'self'), defaults: { subject: 'self', learningStatus: 'Planned', capabilityStage: 'Not yet evidenced' },
      filters: ['kind', 'learningStatus', 'capabilityStage'], cols: ['title', 'kind', 'learningStatus', 'capabilityStage', 'reviewer', 'reviewDate', 'nextReviewDate'],
      empty: 'No personal development items recorded yet. Nothing has been pre-filled: add goals, learning and commitments with evidence as they are agreed.' });
    const fb = S.list('feedback');
    if (fb.length) {
      const themes = {}; fb.forEach(f => { themes[f.theme] = (themes[f.theme] || 0) + 1; });
      h += '<div style="height:14px"></div>' + card('Leadership feedback themes', 'From recorded feedback only.', '<ul class="list">' + Object.keys(themes).map(k => '<li><span>' + esc(k) + '</span><span>' + themes[k] + '</span></li>').join('') + '</ul>');
    }
    return h;
  }

  /* ================= Feedback & Actions ================= */
  function secFeedback() {
    const fb = S.list('feedback');
    const c = (f) => fb.filter(f).length;
    let h = '<div class="section-head"><div><h2>Feedback & Actions</h2><p>Leadership feedback is tracked from wording to response, agreed action, progress, evidence and stakeholder validation. Recording an action never closes feedback.</p></div></div>';
    h += pipeline([[c(f => f.closureStatus === 'Open'), 'Open'], [c(f => f.commitmentType === 'Proposal'), 'Response proposed'], [c(f => f.commitmentType === 'Agreed commitment'), 'Action agreed'],
      [c(f => f.closureStatus === 'Action completed; stakeholder validation pending'), 'Action completed; validation pending'], [c(f => f.closureStatus === 'Closed – stakeholder validated'), 'Closed – stakeholder validated'],
      [c(TA.fbOverdue) + S.list('actions').filter(TA.isOverdue).length, 'Overdue']]);
    h += '<div style="height:12px"></div>' + tabs('feedback', [['feedback', 'Leadership feedback'], ['actions', 'Actions'], ['decisions', 'Decisions & support'], ['risks', 'Risks'], ['notes', 'Review notes']], 'feedback');
    const t = tab('feedback', 'feedback');
    if (t === 'feedback') h += table('feedback', 'feedback', { filters: ['theme', 'closureStatus', 'commitmentType'], defaults: { closureStatus: 'Open', progress: 'Not started', wordingType: 'Exact wording' },
      rowActions: (r) => '<button class="btn sm" data-act="to-action" data-entity="feedback" data-id="' + r.id + '">Create action</button> ',
      empty: 'No leadership feedback recorded. Themes are recorded only from accessible evidence – nothing has been pre-filled.' });
    else if (t === 'actions') h += table('actions', 'actions', { filters: ['status', 'sourceType', 'commitmentType'], defaults: { status: 'Not started', stakeholderValidation: 'Not required' } });
    else if (t === 'decisions') h += table('decisions', 'decisions', { filters: ['type', 'status'], defaults: { status: 'Open', type: 'Decision required' } });
    else if (t === 'risks') h += table('risks', 'risks', { filters: ['status', 'area'], defaults: { status: 'Open', likelihood: 'Not assessed', impact: 'Not assessed' }, rowActions: (r) => '<button class="btn sm" data-act="to-action" data-entity="risks" data-id="' + r.id + '">Create action</button> ' });
    else {
      h += '<div class="notice" style="margin-bottom:10px">Capture review or interview notes with date, participants, context, source, decisions, owners and follow-up. Record only what was actually discussed.</div>';
      h += table('reviewNotes', 'reviewNotes', { rowActions: (r) => '<button class="btn sm" data-act="to-action" data-entity="reviewNotes" data-id="' + r.id + '">Create action</button> ' });
    }
    return h;
  }

  /* ================= Business Value ================= */
  function secValue() {
    const bt = TA.benefitTotals();
    let h = '<div class="section-head"><div><h2>Business Value & Savings</h2><p>Five distinct categories, never combined into one savings total. Monetary values use only supplied or explicitly approved inputs; only validated benefits count as verified.</p></div></div>';
    h += '<div class="grid g3" style="margin-bottom:14px">' + TA.BENEFIT_CATS.map(cat => {
      const t = bt[cat];
      const defn = { 'Realised financial saving': 'Verified expenditure reduction.', 'Cost avoidance': 'Credible expenditure prevented against an agreed counterfactual.', 'Productivity capacity released': 'Measured working time released (hours).', 'Notional business value': 'Estimate under explicit assumptions; not cash.', 'Non-financial outcome': 'Quality, experience, readiness, inclusion or risk improvement.' }[cat];
      return '<div class="tile"><div class="t-label">' + esc(cat) + '</div><div class="t-value' + (t.validated ? '' : ' np') + '">' + (t.validated ? esc(TA.fmtVal(t.validatedGross, t.unit)) : (cat === 'Non-financial outcome' ? t.count + ' recorded' : 'None validated')) + '</div>' +
        '<div class="t-sub">' + esc(defn) + '<br>' + t.count + ' record(s) · ' + t.validated + ' validated' + (t.unvalidatedGross ? ' · unvalidated/estimated: ' + esc(TA.fmtVal(t.unvalidatedGross, t.unit)) + ' (not claimed)' : '') + (t.validated && cat !== 'Productivity capacity released' ? '<br>Validated net: ' + (t.netKnown ? esc(TA.fmtINR(t.validatedNet)) : 'not calculable – costs missing') : '') + (t.overlaps ? '<br>' + t.overlaps + ' with overlap noted' : '') + '</div></div>';
    }).join('') + '</div>';
    h += '<div class="notice warn" style="margin-bottom:14px"><strong>Vendor usage (6%, source-reported):</strong> a change in vendor usage is not, by itself, a monetary saving. A vendor-fee saving needs comparable baseline and comparison vendor hires for the same population and an approved fee per hire. No such inputs have been supplied, so no saving is reported.</div>';
    h += table('benefits', 'benefits', { filters: ['category', 'validationStatus', 'calcType'], defaults: { validationStatus: 'Proposed – not validated', unitCostApproved: false },
      rowActions: (r) => '<button class="btn sm" data-act="view" data-entity="benefits" data-id="' + r.id + '">Calculation</button> ', empty: 'No benefits recorded. No savings, cost avoidance or financial inputs were supplied in the reference data.' });
    h += '<div style="height:14px"></div>' + card('Calculation methods', 'Every benefit exposes its inputs, steps and assumptions in its detail view.',
      '<div class="table-wrap"><table class="data"><thead><tr><th scope="col">Method</th><th scope="col">Formula</th><th scope="col">Notes</th></tr></thead><tbody>' +
      [['Vendor-fee saving', '(baseline vendor hires − comparison vendor hires) × approved fee per hire', 'Same population and fee basis required.'],
       ['Process time released / automation benefit', 'transactions × hours saved per transaction = hours; optional × approved hourly cost', 'Time released is capacity, not reduced expenditure.'],
       ['Comparable programme cost', '(baseline cost per hire − comparison cost per hire) × comparison hires', 'Programmes must be comparable.'],
       ['Vacancy-duration value', 'roles × days reduced × daily value (assumption)', 'Always notional unless validated as realised.'],
       ['Net benefit', 'gross − implementation cost − recurring cost', 'Not calculated if any cost is missing (missing ≠ zero).']]
        .map(r => '<tr><td>' + esc(r[0]) + '</td><td class="mono">' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>').join('') + '</tbody></table></div>');
    return h;
  }

  /* ================= Data Quality & Evidence ================= */
  function secQuality() {
    const checks = TA.dataChecks();
    let h = '<div class="section-head"><div><h2>Data Quality & Evidence</h2><p>Rule-based checks run on every change. Source values are never overwritten by checks; conflicts stay visible until the data owner confirms.</p></div></div>';
    const sev = (s) => checks.filter(c => c.severity === s).length;
    h += pipeline([[sev('Conflict'), 'Conflicts'], [sev('Warning'), 'Warnings'], [sev('Missing'), 'Missing data'], [sev('Info'), 'Information'], [openQuestions().length, 'Open questions'], [S.list('insights').filter(i => i.status === 'New').length, 'New insights']]);
    h += '<div style="height:12px"></div>' + tabs('quality', [['checks', 'Checks & conflicts'], ['questions', 'Open questions'], ['insights', 'Insights'], ['evidence', 'Evidence index'], ['history', 'Change history'], ['bin', 'Recycle bin'], ['about', 'Rules & method']], 'checks');
    const t = tab('quality', 'checks');
    if (t === 'checks') {
      h += '<div class="table-wrap"><table class="data"><thead><tr><th scope="col">Severity</th><th scope="col">Finding</th><th scope="col">Detail</th><th scope="col">Rule</th><th scope="col">Record</th></tr></thead><tbody>' +
        (checks.length ? checks.map(c => '<tr><td>' + badge(c.severity, { Conflict: 'bad', Warning: 'warn', Missing: 'info', Info: 'neutral' }[c.severity]) + '</td><td>' + esc(c.title) + '</td><td class="small">' + esc(c.detail) + '</td><td class="small nowrap">' + esc(c.rule) + '</td><td>' + (c.ref ? '<button class="btn sm" data-act="view" data-entity="' + c.ref.entity + '" data-id="' + c.ref.id + '">Open</button>' : '') + '</td></tr>').join('') : '<tr><td colspan="5"><div class="empty">No issues detected.</div></td></tr>') +
        '</tbody></table></div>';
    } else if (t === 'questions') h += table('questions', 'questions', { filters: ['status', 'type', 'priority'], defaults: { status: 'Open', raisedDate: TA.todayIso() } });
    else if (t === 'insights') h += insightsView();
    else if (t === 'evidence') {
      const ev = [];
      TA.ENTITY_ORDER.forEach(e => S.list(e, { archived: true }).forEach(r => (r.evidence || []).forEach(x => ev.push({ e, r, x }))));
      h += '<p class="small muted">Evidence is attached from each record\'s detail view (links, references or small files stored in this browser).</p><div class="table-wrap"><table class="data"><thead><tr><th scope="col">Evidence</th><th scope="col">Type</th><th scope="col">Record</th><th scope="col">Added</th></tr></thead><tbody>' +
        (ev.length ? ev.map(({ e, r, x }) => '<tr><td>' + evidenceLink(x) + (x.note ? '<div class="small muted">' + esc(x.note) + '</div>' : '') + '</td><td>' + esc(x.kind || 'Link') + '</td><td><button class="rowtitle" data-act="view" data-entity="' + e + '" data-id="' + r.id + '">' + esc(TA.ENTITIES[e].singular + ': ' + TA.recordTitle(e, r)) + '</button></td><td>' + TA.fmtDateTime(x.addedAt) + '</td></tr>').join('') : '<tr><td colspan="4"><div class="empty">No evidence attached yet.</div></td></tr>') + '</tbody></table></div>';
    } else if (t === 'history') {
      const hist = S.state.history.filter(x => !ui.histEntity || x.entity === ui.histEntity).slice(0, 400);
      h += '<div class="table-tools"><label for="hist-ent" class="small muted">Entity</label><select id="hist-ent" data-act="hist-entity" style="width:auto"><option value="">All</option>' + TA.ENTITY_ORDER.concat(['narrative', 'snapshot', '*']).map(e => '<option value="' + e + '"' + (ui.histEntity === e ? ' selected' : '') + '>' + esc(TA.ENTITIES[e] ? TA.ENTITIES[e].label : e) + '</option>').join('') + '</select><span class="small muted">Showing ' + hist.length + ' of ' + S.state.history.length + ' entries (newest first)</span></div>';
      h += '<div class="table-wrap"><table class="data"><thead><tr><th scope="col">When</th><th scope="col">Action</th><th scope="col">Record</th><th scope="col">Changes</th></tr></thead><tbody>' +
        hist.map(x => '<tr><td class="nowrap">' + TA.fmtDateTime(x.ts) + '</td><td>' + esc(x.action) + '</td><td>' + esc((TA.ENTITIES[x.entity] ? TA.ENTITIES[x.entity].singular + ': ' : '') + (x.label || '')) + '</td><td class="small">' + changesText(x) + '</td></tr>').join('') + '</tbody></table></div>';
    } else if (t === 'bin') {
      const del = [];
      TA.ENTITY_ORDER.forEach(e => S.list(e, { deleted: true }).forEach(r => del.push({ e, r })));
      h += '<p class="small muted">Deleted records stay here until permanently deleted. Restoring brings back the record with its evidence and history.</p><div class="table-wrap"><table class="data"><thead><tr><th scope="col">Record</th><th scope="col">Type</th><th scope="col">Deleted</th><th scope="col"></th></tr></thead><tbody>' +
        (del.length ? del.map(({ e, r }) => '<tr><td>' + esc(TA.recordTitle(e, r)) + '</td><td>' + esc(TA.ENTITIES[e].singular) + '</td><td>' + TA.fmtDateTime(r.deletedAt) + '</td><td class="actions"><button class="btn sm primary" data-act="restore" data-entity="' + e + '" data-id="' + r.id + '">Restore</button> <button class="btn sm danger" data-act="purge" data-entity="' + e + '" data-id="' + r.id + '">Delete permanently</button></td></tr>').join('') : '<tr><td colspan="4"><div class="empty">Recycle bin is empty.</div></td></tr>') + '</tbody></table></div>';
    } else {
      h += card('Rules & method', 'No AI service is connected. Checks and insights come from the transparent rules below.',
        '<ul style="margin:0 0 0 18px;padding:0" class="small">' + ['R01 Source-reported value differs from recalculation (numerator ÷ denominator, or programme sum for total joined) beyond tolerance (0.5 pp for %, 0.5% for counts).', 'R02 Percentage outside 0–100.', 'R03 Actual present but target missing.', 'R04 Population missing.', 'R05 Metric with results but no definition.', 'R06 Recruiter attainment reported vs recalculated differs by more than 1 pp.', 'R07 Programme target or joined missing (excluded from totals, not treated as zero).', 'R08 Aggregate attainment with programmes below target offset by over-target programmes.', 'R09 Possible duplicate names (normalised name, first name or close spelling) – never merged automatically.', 'R10 Source cut-off older than 45 days.', 'R11 Business and recruiter cut-offs differ.', 'R12 Overdue actions, feedback actions and projects.', 'R13 Feedback action completed but closure still Open.', 'R14 Validated closure without validator/date.', 'R15 Project completed while benefits are not validated.', 'R16 Completed project without evidence.', 'R17 Deadline revised (original preserved).', 'R18 Benefit claim checks (unapproved inputs, missing counterfactual, notional value classed as realised).', 'R19 Benefit inputs missing.', 'R20 Learning completed without application at work.', 'R21 Capability marked demonstrated without reviewer evidence.', 'I01–I07 Insight rules: programme shortfalls, over-target programmes, run-rate scenario (with assumptions), trend availability, team capacity, feedback awaiting validation, absence of benefits.'].map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
        '<p class="small muted" style="margin-top:8px">Insights carry a type (descriptive finding, diagnostic hypothesis, forecast, scenario, recommended action or rule-based alert). No confidence scores are produced. Correlation is not presented as causation.</p>');
    }
    return h;
  }
  function changesText(x) {
    if (!x.changes || !x.changes.length) return '';
    const s = (v) => { if (v === null || v === undefined || v === '') return '∅'; const t = typeof v === 'object' ? (Array.isArray(v) ? v.length + ' item(s)' : 'record') : String(v); return t.length > 60 ? t.slice(0, 57) + '…' : t; };
    return x.changes.slice(0, 6).map(c => esc(c.field) + ': ' + esc(s(c.from)) + ' → ' + esc(s(c.to))).join('<br>') + (x.changes.length > 6 ? '<br>+' + (x.changes.length - 6) + ' more' : '');
  }
  function evidenceLink(x) {
    if (x.dataUrl) return '<a href="' + esc(x.dataUrl) + '" download="' + esc(x.fileName || 'evidence') + '">' + esc(x.label) + '</a>';
    if (x.url && /^(https?:|mailto:)/i.test(x.url)) return '<a href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer">' + esc(x.label) + '</a>';
    return esc(x.label) + (x.url ? ' <span class="small muted">(' + esc(x.url) + ')</span>' : '');
  }
  function insightsView() {
    const list = S.list('insights').filter(i => ui.showDismissed || i.status !== 'Dismissed');
    let h = '<div class="table-tools"><label class="check"><input type="checkbox" id="chk-dism" data-act="toggle-dismissed"' + (ui.showDismissed ? ' checked' : '') + '> Show dismissed</label><span class="small muted">AI service: not connected (integration placeholder). Insights below are rule-based.</span><span style="flex:1"></span><button class="btn sm primary" data-act="add" data-entity="insights" data-defaults="' + attr({ status: 'New', generatedBy: 'Manual entry', type: 'Descriptive finding' }) + '">+ Add insight</button></div>';
    if (!list.length) return h + '<div class="empty">No insights.</div>';
    h += '<div class="grid g2">' + list.map(i => '<section class="card"><div class="card-head"><div><h3>' + esc(i.title) + '</h3><p>' + badge(i.type, 'accent') + ' ' + badge(i.status) + ' <span class="small muted">' + esc(i.generatedBy || '') + '</span></p></div></div>' +
      (i.dataChanged ? '<div class="notice warn" style="margin-bottom:8px">Underlying data changed since this insight was ' + esc(i.status.toLowerCase()) + '. <button class="linklike" data-act="insight-latest" data-id="' + i.id + '">Apply latest rule output</button></div>' : '') +
      (i.obsolete ? '<div class="notice" style="margin-bottom:8px">The rule condition no longer applies to current data.</div>' : '') +
      '<dl class="kv">' + [['Observation', i.observation], ['Supporting data & period', i.supportingData], ['Method', i.method], ['Interpretation', i.interpretation], ['Uncertainty / missing evidence', i.uncertainty], ['Recommended action', i.recommendedAction], ['Owner', i.owner], ['Review date', i.reviewDate ? TA.fmtDate(i.reviewDate) : null]]
        .map(([k, v]) => '<dt>' + esc(k) + '</dt><dd>' + (v ? esc(v) : np()) + '</dd>').join('') + '</dl>' +
      '<div class="btn-row" style="margin-top:10px">' + (i.status !== 'Accepted' ? '<button class="btn sm" data-act="insight-status" data-status="Accepted" data-id="' + i.id + '">Accept</button>' : '') +
      '<button class="btn sm" data-act="edit" data-entity="insights" data-id="' + i.id + '">Edit</button>' +
      (i.status !== 'Dismissed' ? '<button class="btn sm" data-act="insight-status" data-status="Dismissed" data-id="' + i.id + '">Dismiss</button>' : '<button class="btn sm" data-act="insight-status" data-status="New" data-id="' + i.id + '">Undo dismiss</button>') +
      '<button class="btn sm primary" data-act="to-action" data-entity="insights" data-id="' + i.id + '">Convert to action</button></div></section>').join('') + '</div>';
    return h;
  }

  /* ================= Reports ================= */
  const REPORT_SECTIONS = [['summary', 'Executive summary'], ['trends', 'Delivery trends'], ['value', 'Business contribution and financial value'], ['pipeline', 'Talent-pipeline outcomes'],
    ['team', 'Team development'], ['process', 'Process-improvement projects and benefits'], ['feedback', 'Leadership-feedback response'], ['priorities', 'Priorities and decisions required']];
  function reportPrefs() {
    const d = { periodId: curPeriod() ? curPeriod().id : null, sections: REPORT_SECTIONS.map(s => s[0]), includeConfidential: false, preparedBy: S.state.meta.owner };
    return Object.assign(d, S.state.meta.reportPrefs || {});
  }
  function secReports() {
    const rp = reportPrefs();
    let h = '<div class="section-head"><div><h2>Reports & Exports</h2><p>Files are generated in the browser from saved data and the selections below. Every export shows the reporting dates, generation date, assumptions and sources.</p></div></div>';
    h += '<div class="grid g2">';
    h += card('Leadership pack', 'Editable PPTX (native charts, tables and text), editable DOCX, and PDF snapshot.',
      '<div class="form-grid"><div class="field"><label for="rp-period">Reporting period</label><select id="rp-period" data-rp="periodId">' + S.list('periods').map(p => '<option value="' + p.id + '"' + (p.id === rp.periodId ? ' selected' : '') + '>' + esc(p.label) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="rp-by">Prepared by</label><input type="text" id="rp-by" data-rp="preparedBy" value="' + esc(rp.preparedBy || '') + '"></div>' +
      '<fieldset class="full"><legend>Sections (PPTX, DOCX and PDF)</legend><div class="grid g2" style="gap:4px 12px">' + REPORT_SECTIONS.map(([k, l]) => '<label class="check"><input type="checkbox" data-rp-sec="' + k + '"' + (rp.sections.indexOf(k) >= 0 ? ' checked' : '') + '> ' + esc(l) + '</label>').join('') + '</div></fieldset>' +
      '<div class="full"><label class="check"><input type="checkbox" id="rp-conf" data-rp="includeConfidential"' + (rp.includeConfidential ? ' checked' : '') + '> Include confidential individual details (named team members, individual results, confidential feedback providers)</label>' +
      '<div class="help">' + (rp.includeConfidential ? '<strong>Individual details will be included.</strong> Check the audience before sharing.' : 'Excluded: individual results appear only as team-level counts, team-member names are replaced by "a team member" throughout (including narrative text), and confidential feedback providers are anonymised.') + '</div></div>' +
      '<div class="full small muted">Always included: assumptions, sources, data-quality conflicts and open questions.</div></div>' +
      '<div class="btn-row" style="margin-top:12px"><button class="btn primary" data-act="export" data-fmt="pptx">Download PPTX</button><button class="btn primary" data-act="export" data-fmt="docx">Download DOCX</button><button class="btn" data-act="export" data-fmt="pdf">Download PDF</button></div>' +
      '<p class="small muted" style="margin-top:8px" id="export-status">' + (libsReady() ? 'Export libraries loaded.' : '<strong>Export libraries not loaded.</strong> Check that the vendor folder is present next to index.html.') + '</p>');
    h += card('Reporting-period snapshots', 'Freeze the current data for a period so later reviews can compare against it.',
      '<div class="btn-row"><label for="snap-label" style="position:absolute;left:-9999px">Snapshot label</label><input type="text" id="snap-label" placeholder="e.g. Q3 review with India HR Head" style="max-width:320px"><button class="btn primary" data-act="snapshot">Take snapshot</button></div>' +
      '<ul class="list" style="margin-top:10px">' + (S.state.snapshots.length ? S.state.snapshots.map(s => '<li><div class="li-main"><div class="li-title">' + esc(s.label) + '</div><div class="li-sub">' + TA.fmtDateTime(s.ts) + ' · ' + esc(TA.periodLabel(s.periodId)) + (s.summary ? ' · joined ' + TA.fmtInt(s.summary.joined) + ' / target ' + TA.fmtInt(s.summary.target) : '') + '</div></div><div class="btn-row"><button class="btn sm" data-act="snap-compare" data-id="' + s.id + '">Compare with current</button><button class="btn sm" data-act="snap-download" data-id="' + s.id + '">Download</button><button class="btn sm" data-act="snap-restore" data-id="' + s.id + '">Restore</button><button class="btn sm danger" data-act="snap-delete" data-id="' + s.id + '">Delete</button></div></li>').join('') : '<li class="small muted">No snapshots yet.</li>') + '</ul>');
    h += '</div><div style="height:14px"></div>';
    h += card('Data exports (CSV)', 'All fields plus calculated columns. Individual records are included in these raw exports – handle accordingly.',
      '<div class="btn-row">' + TA.ENTITY_ORDER.map(e => '<button class="btn sm" data-act="csv" data-entity="' + e + '">' + esc(TA.ENTITIES[e].label) + '</button>').join('') + '</div>');
    return h;
  }
  function libsReady() { return !!(window.PptxGenJS && window.docx && window.jspdf); }

  /* ================= Settings / Backup ================= */
  function secSettings() {
    const m = S.state.meta;
    const daysSinceBackup = m.lastBackupAt ? TA.daysBetween(m.lastBackupAt.slice(0, 10), TA.todayIso()) : null;
    let h = '<div class="section-head"><div><h2>Settings / Backup</h2><p>How data is stored, backup and restore, import, recovery and profile.</p></div></div>';
    h += '<div class="grid g2">';
    h += card('How your data is stored', '',
      '<ul style="margin:0 0 0 18px;padding:0" class="small"><li>Data is saved automatically in <strong>this browser on this device</strong> (IndexedDB, with a localStorage copy when it fits). Current method: <strong>' + esc(S.backend) + '</strong>' + (S.lastSavedAt ? '; last saved ' + TA.fmtDateTime(S.lastSavedAt) : '') + '.</li>' +
      (TA.Sync.active() ? '<li><strong>Account copy (claude.ai):</strong> because this page is open as a claude.ai Artifact, a copy is also saved in this artifact\'s database, in your private per-user area tied to your signed-in Claude account. The platform keeps that area private to you; other people you share the artifact with cannot read it. Status: ' + esc(TA.Sync.detail) + ' Recovery points stay in this browser only.</li>'
        : '<li>It is <strong>not</strong> synced to the cloud, shared with other users or other browsers, or backed up automatically outside this browser. ' + esc(TA.Sync.detail) + '</li>') +
      '<li>Clearing browser data, using a private window, or opening the file from a different folder or browser shows a different (or empty) store.</li>' +
      '<li>Data is not encrypted at rest by this app; anyone with access to this browser profile can open it.</li>' +
      '<li>There is no login, authentication or multi-user access. The dashboard is designed for a single owner.</li>' +
      '<li>No API credentials are stored or used. No external services or integrations are connected; the AI insight service is a placeholder.</li>' +
      '<li>Download a JSON backup regularly and keep it in an approved, access-controlled location.</li></ul>' +
      (S.saveError ? '<div class="notice bad" style="margin-top:8px">' + esc(S.saveError) + '</div>' : ''));
    h += card('Backup & restore', '',
      '<p>' + (m.lastBackupAt ? 'Last backup downloaded: ' + TA.fmtDateTime(m.lastBackupAt) + (daysSinceBackup > 7 ? ' ' + badge('Backup due', 'warn') : '') : badge('No backup downloaded yet', 'warn')) + '</p>' +
      '<div class="btn-row"><button class="btn primary" data-act="backup">Download backup (JSON)</button><button class="btn" data-act="pick-restore">Restore from backup…</button><input type="file" id="restore-file" accept=".json,application/json" data-act="restore-file" tabindex="-1" aria-hidden="true" style="position:absolute;left:-9999px"></div>' +
      (ui.restoreSt ? restorePreview() : '') +
      '<h4 style="margin-top:14px">Recovery points</h4><p class="small muted">Created automatically before restore, import, snapshot restore or reset (last ' + 5 + ' kept, in this browser only).</p><ul class="list">' +
      (S.state.recovery.length ? S.state.recovery.map(r => '<li><div class="li-main"><div class="li-title">' + TA.fmtDateTime(r.ts) + '</div><div class="li-sub">' + esc(r.reason) + '</div></div><button class="btn sm" data-act="recover" data-id="' + r.id + '">Restore</button></li>').join('') : '<li class="small muted">None yet.</li>') + '</ul>');
    h += '</div><div style="height:14px"></div>';
    h += card('Import records (CSV)', 'Preview, map fields and review potential duplicates before anything is saved.', importView());
    h += '<div style="height:14px"></div><div class="grid g2">';
    h += card('Profile', '', '<div class="form-grid"><div class="field"><label for="m-owner">Owner</label><input type="text" id="m-owner" data-meta="owner" value="' + esc(m.owner) + '"></div><div class="field"><label for="m-role">Role</label><input type="text" id="m-role" data-meta="role" value="' + esc(m.role) + '"></div><div class="field"><label for="m-org">Organisation</label><input type="text" id="m-org" data-meta="org" value="' + esc(m.org) + '"></div><div class="field"><label for="m-cur">Currency</label><input type="text" id="m-cur" value="INR" readonly></div></div><div class="btn-row" style="margin-top:10px"><button class="btn primary" data-act="save-meta">Save profile</button></div>');
    h += card('Integrations & limitations', '', '<ul class="list"><li><span>AI insight service</span>' + badge('Not connected', 'neutral') + '</li><li><span>Applicant tracking / HRIS / payroll</span>' + badge('Not connected (out of scope)', 'neutral') + '</li><li><span>Authentication / multi-user access</span>' + badge('Not implemented', 'neutral') + '</li><li><span>Account copy (claude.ai artifact database, private to you)</span>' + badge(TA.Sync.active() ? (TA.Sync.status === 'error' ? 'Not saved' : 'Active') : 'Not available in this view', TA.Sync.status === 'error' ? 'bad' : (TA.Sync.active() ? 'good' : 'neutral')) + '</li><li><span>Email / calendar</span>' + badge('Not connected', 'neutral') + '</li></ul>' +
      '<h4 style="margin-top:14px">Reset</h4><p class="small muted">A recovery point is created first.</p><div class="btn-row"><button class="btn danger" data-act="reset-seed">Reset to initial reference data</button></div>');
    h += '</div>';
    return h;
  }
  function restorePreview() {
    const r = ui.restoreSt;
    if (r.errors.length) return '<div class="errors" style="margin-top:10px">' + r.errors.map(esc).join('<br>') + '</div>';
    const d = r.obj.state.data;
    return '<div class="notice info" style="margin-top:10px"><strong>Preview: ' + esc(r.name) + '</strong> (exported ' + TA.fmtDateTime(r.obj.exportedAt) + ')<br>' + TA.ENTITY_ORDER.filter(e => (d[e] || []).length).map(e => esc(TA.ENTITIES[e].label) + ': ' + d[e].length).join(' · ') +
      '<br>Restoring replaces all current data (a recovery point is created first).<div class="btn-row" style="margin-top:8px"><button class="btn primary" data-act="restore-confirm">Restore this backup</button><button class="btn" data-act="restore-cancel">Cancel</button></div></div>';
  }
  function importView() {
    const st = ui.importSt;
    const ents = TA.ENTITY_ORDER.filter(e => e !== 'insights');
    let h = '<div class="form-grid"><div class="field"><label for="imp-entity">Record type</label><select id="imp-entity" data-act="imp-entity">' + ents.map(e => '<option value="' + e + '"' + (st && st.entity === e ? ' selected' : '') + '>' + esc(TA.ENTITIES[e].label) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="imp-file">CSV file (first row = headers)</label><input type="file" id="imp-file" accept=".csv,text/csv" data-act="imp-file"></div>' +
      '<div class="field full"><label for="imp-paste">…or paste CSV</label><textarea id="imp-paste" placeholder="name,periodId,target,joined"></textarea><div class="btn-row" style="margin-top:6px"><button class="btn sm" data-act="imp-paste">Preview pasted CSV</button><button class="btn sm" data-act="imp-template">Download template</button></div></div></div>';
    if (!st || !st.rows) return h;
    const def = TA.ENTITIES[st.entity];
    h += '<h4 style="margin-top:12px">Field mapping</h4><div class="form-grid">' + def.fields.filter(f => !f.ro).map(f => '<div class="field"><label for="map-' + f.k + '">' + esc(f.l) + (f.req ? ' *' : '') + '</label><select id="map-' + f.k + '" data-act="imp-map" data-field="' + f.k + '"><option value="">— not imported —</option>' + st.headers.map((hd, i) => '<option value="' + i + '"' + (st.map[f.k] === i ? ' selected' : '') + '>' + esc(hd) + '</option>').join('') + '</select></div>').join('') + '</div>';
    const prev = importPreview();
    h += '<h4 style="margin-top:12px">Preview (' + prev.length + ' rows)</h4><div class="table-wrap"><table class="data"><thead><tr><th scope="col">#</th><th scope="col">Status</th>' + def.fields.filter(f => st.map[f.k] !== undefined && st.map[f.k] !== '').map(f => '<th scope="col">' + esc(f.l) + '</th>').join('') + '</tr></thead><tbody>' +
      prev.slice(0, 50).map((p, i) => '<tr><td>' + (i + 1) + '</td><td>' + (p.errors.length ? badge('Error', 'bad') + '<div class="small">' + esc(p.errors.join(' ')) + '</div>' : p.dups.length ? badge('Possible duplicate', 'warn') + '<div class="small">' + esc(p.dups.join('; ')) + '</div>' : badge('Ready', 'good')) + '</td>' +
        def.fields.filter(f => st.map[f.k] !== undefined && st.map[f.k] !== '').map(f => '<td>' + (p.data[f.k] === null ? np() : esc(f.t === 'ref' ? (S.get(f.ref, p.data[f.k]) ? TA.recordTitle(f.ref, S.get(f.ref, p.data[f.k])) : p.data[f.k]) : p.data[f.k])) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
    const ready = prev.filter(p => !p.errors.length);
    h += '<div class="btn-row" style="margin-top:10px"><label class="check"><input type="checkbox" id="imp-skipdup" data-act="imp-skipdup"' + (st.skipDup ? ' checked' : '') + '> Skip possible duplicates</label>' +
      '<button class="btn primary" data-act="imp-run"' + (ready.length ? '' : ' disabled') + '>Import ' + (st.skipDup ? ready.filter(p => !p.dups.length).length : ready.length) + ' row(s)</button><button class="btn" data-act="imp-cancel">Cancel</button><span class="small muted">Rows with errors are not imported. Reference fields match by name/label.</span></div>';
    return h;
  }
  function importPreview() {
    const st = ui.importSt, def = TA.ENTITIES[st.entity];
    const seen = [];
    return st.rows.map(row => {
      const data = {}, errors = [];
      def.fields.forEach(f => {
        if (f.ro) return;
        const idx = st.map[f.k];
        let v = idx === undefined || idx === '' ? null : (row[idx] === undefined ? null : row[idx].trim());
        if (v === '' || v === 'Not provided') v = null;
        if (v !== null) {
          if (f.t === 'number') { const n = Number(String(v).replace(/[, %]/g, '')); if (!isFinite(n)) errors.push(f.l + ': "' + v + '" is not a number.'); v = isFinite(n) ? n : null; }
          else if (f.t === 'bool') v = /^(yes|true|1|y)$/i.test(v);
          else if (f.t === 'date') { if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { const t = Date.parse(v); if (isNaN(t)) errors.push(f.l + ': unrecognised date "' + v + '" (use YYYY-MM-DD).'); else v = new Date(t - new Date(t).getTimezoneOffset() * 60000).toISOString().slice(0, 10); } }
          else if (f.t === 'select') { const m = f.o.find(o => o.toLowerCase() === v.toLowerCase()); if (!m) errors.push(f.l + ': "' + v + '" is not an allowed value.'); else v = m; }
          else if (f.t === 'ref' || f.t === 'subject') {
            if (f.t === 'subject' && /^(self|ta head)/i.test(v)) v = 'self';
            else { const refE = f.t === 'subject' ? 'team' : f.ref; const r = S.list(refE, { archived: true }).find(x => x.id === v || TA.recordTitle(refE, x).toLowerCase() === v.toLowerCase()); if (!r) errors.push(f.l + ': no matching record "' + v + '".'); else v = r.id; }
          }
        }
        data[f.k] = v;
      });
      def.fields.forEach(f => { if (f.req && (data[f.k] === null || data[f.k] === undefined)) errors.push(f.l + ' is required.'); });
      const dups = TA.findDuplicates(st.entity, data).map(r => 'existing "' + TA.recordTitle(st.entity, r) + '"');
      if (def.dupKeys) { const k = JSON.stringify(def.dupKeys.map(x => String(data[x] || '').toLowerCase())); if (seen.indexOf(k) >= 0) dups.push('repeated in file'); seen.push(k); }
      return { data, errors, dups };
    });
  }

  /* ================= Record drawer ================= */
  function openDrawer(entity, id) {
    const r = S.get(entity, id);
    if (!r) return;
    const def = TA.ENTITIES[entity];
    let body = '';
    body += calcPanel(entity, r);
    body += '<dl class="kv">' + def.fields.map(f => '<dt>' + esc(f.l) + '</dt><dd>' + TA.cell(entity, r, f.k).replace(/…$/, '') + (f.t === 'textarea' && r[f.k] && String(r[f.k]).length > 140 ? '<div>' + esc(r[f.k]) + '</div>' : '') + '</dd>').join('') +
      '<dt>Record origin</dt><dd>' + esc(r.origin || 'Not provided') + '</dd><dt>Created</dt><dd>' + TA.fmtDateTime(r.createdAt) + '</dd><dt>Last updated</dt><dd>' + TA.fmtDateTime(r.updatedAt) + '</dd></dl>';
    if (entity === 'projects' && (r.statusHistory || []).length) body += '<h4 style="margin-top:14px">Status history</h4><ul class="list">' + r.statusHistory.slice().reverse().map(x => '<li><div class="li-main"><div class="li-title">' + (x.from ? esc(x.from) + ' → ' : '') + esc(x.to || 'Not provided') + '</div><div class="li-sub">Recorded ' + TA.fmtDateTime(x.ts) + (x.asOf ? ' · as of ' + TA.fmtDate(x.asOf) : '') + (x.comment ? ' · ' + esc(x.comment) : '') + '</div></div></li>').join('') + '</ul>';
    if (entity === 'projects' && (r.deadlineRevisions || []).length) body += '<h4 style="margin-top:14px">Deadline revisions</h4><ul class="list">' + r.deadlineRevisions.map(x => '<li><span>' + TA.fmtDateTime(x.ts) + ': ' + esc(TA.fmtDate(x.from)) + ' → ' + esc(TA.fmtDate(x.to)) + (x.reason ? ' – ' + esc(x.reason) : '') + '</span></li>').join('') + '</ul>';
    body += linked(entity, r);
    body += '<h4 style="margin-top:14px">Evidence</h4><ul class="list">' + ((r.evidence || []).length ? r.evidence.map(x => '<li><div class="li-main">' + evidenceLink(x) + '<div class="li-sub">' + esc(x.kind || 'Link') + ' · added ' + TA.fmtDateTime(x.addedAt) + (x.note ? ' · ' + esc(x.note) : '') + '</div></div><button class="btn sm danger" data-act="ev-remove" data-entity="' + entity + '" data-id="' + id + '" data-ev="' + x.id + '">Remove</button></li>').join('') : '<li class="small muted">No evidence attached.</li>') + '</ul>' +
      '<fieldset style="margin-top:8px"><legend>Attach evidence</legend><div class="form-grid"><div class="field"><label for="ev-label">Label *</label><input type="text" id="ev-label"></div><div class="field"><label for="ev-kind">Type</label><select id="ev-kind"><option>Link</option><option>Document reference</option><option>File (stored in browser)</option><option>Email / message reference</option></select></div>' +
      '<div class="field full"><label for="ev-url">URL or reference</label><input type="text" id="ev-url" placeholder="https://… or document reference"></div><div class="field full"><label for="ev-file">File (optional, max 2 MB, stored in this browser)</label><input type="file" id="ev-file"></div><div class="field full"><label for="ev-note">Note</label><input type="text" id="ev-note"></div></div>' +
      '<div class="btn-row" style="margin-top:8px"><button class="btn sm primary" data-act="ev-add" data-entity="' + entity + '" data-id="' + id + '">Attach</button></div></fieldset>';
    const hist = S.state.history.filter(x => x.recordId === id).slice(0, 50);
    body += '<h4 style="margin-top:14px">Change history</h4>' + (hist.length ? '<div class="table-wrap"><table class="data"><tbody>' + hist.map(x => '<tr><td class="nowrap small">' + TA.fmtDateTime(x.ts) + '</td><td class="small">' + esc(x.action) + '</td><td class="small">' + changesText(x) + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="small muted">No changes since seed/creation.</p>');
    const convertible = ['feedback', 'insights', 'risks', 'reviewNotes', 'questions', 'projects'].indexOf(entity) >= 0;
    TA.openDialog('dlg-drawer', '<div class="dlg-head"><div><div class="small muted">' + esc(def.singular) + (def.confidential ? ' · ' + badge('Confidential', 'warm') : '') + '</div><h3>' + esc(TA.recordTitle(entity, r)) + '</h3></div><button class="btn sm" data-act="close" data-dlg="dlg-drawer" aria-label="Close">Close</button></div>' +
      '<div class="dlg-body">' + body + '</div>' +
      '<div class="dlg-foot" style="justify-content:flex-start;flex-wrap:wrap">' + '<button class="btn primary" data-act="edit" data-entity="' + entity + '" data-id="' + id + '">Edit</button>' +
      (convertible ? '<button class="btn" data-act="to-action" data-entity="' + entity + '" data-id="' + id + '">Create action</button>' : '') +
      '<button class="btn" data-act="' + (r.archived ? 'unarchive' : 'archive') + '" data-entity="' + entity + '" data-id="' + id + '">' + (r.archived ? 'Unarchive' : 'Archive') + '</button>' +
      (r.deletedAt ? '<button class="btn" data-act="restore" data-entity="' + entity + '" data-id="' + id + '">Restore</button>' : '<button class="btn danger" data-act="delete" data-entity="' + entity + '" data-id="' + id + '">Delete</button>') + '</div>');
    document.getElementById('dlg-drawer').dataset.current = entity + ':' + id;
  }
  function calcPanel(entity, r) {
    if (entity === 'programmes') {
      const c = TA.progRow(r);
      return '<div class="calc-box" style="margin-bottom:12px"><div>' + prov('src') + ' Target ' + TA.fmtInt(r.target) + ', joined ' + TA.fmtInt(r.joined) + '</div><div class="eq">Attainment = joined ÷ target × 100 = ' + (TA.isNum(c.attain) ? r.joined + ' ÷ ' + r.target + ' × 100 = ' + TA.fmtPct(c.attain) : 'Cannot calculate') + '</div><div class="eq">Gap = joined − target = ' + (TA.isNum(c.gap) ? c.gap : 'Cannot calculate') + '</div><div>' + badge(c.status) + '</div></div>';
    }
    if (entity === 'observations') {
      const c = TA.obsCalc(r);
      return '<div class="calc-box" style="margin-bottom:12px"><div>' + prov('src') + ' ' + esc(TA.fmtVal(c.reported, c.unit)) + ' · ' + prov('recalc') + ' ' + esc(c.recalc !== null ? TA.fmtVal(c.recalc, c.unit) : 'Not applicable') + '</div><div class="eq">' + esc(c.recalcMethod || 'No recalculation inputs (numerator/denominator) recorded.') + '</div>' +
        (c.conflict ? '<div>' + badge('Conflict') + ' Reported and recalculated values differ; both retained.</div>' : '') + '<div>Status vs target: ' + badge(c.status) + '</div><div class="small muted">Definition: ' + esc(c.m.definition || 'Not provided') + ' (' + esc(c.m.definitionStatus || 'Not provided') + ')</div></div>';
    }
    if (entity === 'recruiterResults') {
      const c = TA.rrCalc(r);
      return '<div class="calc-box" style="margin-bottom:12px"><div>Offer attainment – ' + prov('src') + ' ' + TA.fmtPct(r.offerAttainmentReported) + ' · ' + prov('recalc') + ' ' + (c.offerRecalc !== null ? TA.fmtPct(c.offerRecalc) : 'Cannot calculate') + '</div><div class="eq">' + (c.offerRecalc !== null ? r.offers + ' ÷ ' + r.offerTarget + ' × 100 = ' + TA.fmtPct(c.offerRecalc) : 'Offers or offer target not provided') + '</div>' +
        (c.offerConflict ? '<div>' + badge('Conflict') + ' Validation requested; do not use in an individual assessment until resolved.</div>' : '') + '<div>Join attainment – ' + prov('src') + ' ' + TA.fmtPct(r.joinAttainmentReported) + ' · ' + prov('recalc') + ' ' + (c.joinRecalc !== null ? TA.fmtPct(c.joinRecalc) : 'Cannot calculate') + '</div></div>';
    }
    if (entity === 'benefits') {
      const c = TA.benefitCalc(r);
      return '<div class="calc-box" style="margin-bottom:12px"><div><strong>' + esc(r.category) + '</strong> · ' + esc(r.calcType) + ' · ' + badge(r.validationStatus) + (c.claimable ? ' ' + badge('Counts as verified', 'good') : ' ' + badge('Not counted as verified', 'neutral')) + '</div>' +
        (c.steps.length ? c.steps.map(s => '<div class="eq">' + esc(s) + '</div>').join('') : '<div class="eq">No calculation possible with current inputs.</div>') +
        (c.missing.length ? '<div class="small">Missing inputs: ' + esc(c.missing.join('; ')) + '</div>' : '') +
        '<div class="small">Assumptions: ' + esc(r.assumptions || 'Not provided') + '</div><div class="small">Unit cost source: ' + esc(r.unitCostSource || 'Not provided') + ' · approved: ' + (r.unitCostApproved ? 'Yes' : 'No') + '</div>' +
        (TA.isNum(r.expectedValue) ? '<div class="small">Expected ' + esc(TA.fmtVal(r.expectedValue, c.unit || 'INR')) + ' vs calculated ' + esc(TA.fmtVal(c.gross, c.unit || 'INR')) + '</div>' : '') +
        (c.flags.length ? '<ul class="small" style="margin:6px 0 0 18px;padding:0">' + c.flags.map(f => '<li>' + esc(f) + '</li>').join('') + '</ul>' : '') + '</div>';
    }
    if (entity === 'team') return '<div class="notice warn" style="margin-bottom:12px">Confidential individual record. ' + (r.humanReviewDate ? 'Human review recorded: ' + esc(r.humanReviewBy || 'Not provided') + ', ' + TA.fmtDate(r.humanReviewDate) + '.' : 'No human review recorded – do not use insights from this record in an individual assessment.') + '</div>';
    return '';
  }
  function linked(entity, r) {
    const items = [];
    const add = (e, rec) => items.push('<li><button class="rowtitle" data-act="view" data-entity="' + e + '" data-id="' + rec.id + '">' + esc(TA.ENTITIES[e].singular + ': ' + TA.recordTitle(e, rec)) + '</button></li>');
    if (entity === 'team') { S.list('recruiterResults', { archived: true }).filter(x => x.memberId === r.id).forEach(x => add('recruiterResults', x)); S.list('devItems', { archived: true }).filter(x => x.subject === r.id).forEach(x => add('devItems', x)); }
    if (entity === 'projects') { S.list('milestones').filter(x => x.projectId === r.id).forEach(x => add('milestones', x)); S.list('benefits').filter(x => x.projectId === r.id).forEach(x => add('benefits', x)); S.list('devItems').filter(x => x.projectId === r.id).forEach(x => add('devItems', x)); }
    if (entity === 'metrics') S.list('observations').filter(x => x.metricId === r.id).forEach(x => add('observations', x));
    if (entity === 'periods') ['programmes', 'observations', 'recruiterResults'].forEach(e => S.list(e).filter(x => x.periodId === r.id).forEach(x => add(e, x)));
    if (entity === 'commitments') S.list('projects').filter(x => x.commitmentId === r.id).forEach(x => add('projects', x));
    S.list('actions').filter(a => a.sourceRef === entity + ':' + r.id).forEach(a => add('actions', a));
    if (entity === 'actions' && r.sourceRef) { const [e, i] = r.sourceRef.split(':'); const src = S.get(e, i); if (src) add(e, src); }
    if (entity === 'observations') { const m = TA.metric(r.metricId); if (m) add('metrics', m); }
    return items.length ? '<h4 style="margin-top:14px">Linked records</h4><ul class="list">' + items.join('') + '</ul>' : '';
  }

  /* ================= Form dialog ================= */
  function openForm(entity, id, defaults, overrides) {
    const stored = id ? S.get(entity, id) : null;
    const rec = stored && overrides ? Object.assign({}, stored, overrides) : stored;
    const def = TA.ENTITIES[entity];
    TA.openDialog('dlg-form', '<form id="rec-form" novalidate><div class="dlg-head"><h3>' + (rec ? 'Edit ' : 'Add ') + esc(def.singular.toLowerCase()) + '</h3><button type="button" class="btn sm" data-act="close" data-dlg="dlg-form">Cancel</button></div>' +
      '<div class="dlg-body"><div id="form-msgs"></div>' + (def.confidential ? '<div class="notice warn" style="margin-bottom:10px">Confidential individual record – excluded from leadership outputs unless selected.</div>' : '') + TA.formHTML(entity, rec, defaults) + '</div>' +
      '<div class="dlg-foot"><button type="button" class="btn" data-act="close" data-dlg="dlg-form">Cancel</button><button type="submit" class="btn primary" id="form-save">Save</button></div></form>');
    const form = document.getElementById('rec-form');
    let confirmed = false;
    form.addEventListener('input', () => { confirmed = false; document.getElementById('form-save').textContent = 'Save'; });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = TA.readForm(entity, form);
      const v = TA.validate(entity, data, rec);
      const msgs = document.getElementById('form-msgs');
      msgs.innerHTML = (v.errors.length ? '<div class="errors" role="alert">' + v.errors.map(esc).join('<br>') + '</div>' : '') + (v.warnings.length ? '<div class="warnings" role="alert">' + v.warnings.map(esc).join('<br>') + '</div>' : '');
      if (v.errors.length) { msgs.scrollIntoView({ block: 'start' }); return; }
      if (v.warnings.length && !confirmed) { confirmed = true; document.getElementById('form-save').textContent = 'Save anyway'; msgs.scrollIntoView({ block: 'start' }); return; }
      let saved;
      if (rec) saved = S.update(entity, rec.id, data);
      else saved = S.add(entity, data);
      if (entity === 'insights' && rec && rec.ruleKey && ['New', 'Accepted'].indexOf(rec.status) >= 0 && data.status === rec.status) S.update(entity, rec.id, { status: 'Edited', dataChanged: false });
      TA.closeDialog('dlg-form');
      TA.toast((rec ? 'Saved changes to ' : 'Added ') + TA.recordTitle(entity, saved));
      const dr = document.getElementById('dlg-drawer');
      if (dr.open && dr.dataset.current === entity + ':' + saved.id) openDrawer(entity, saved.id);
    });
  }

  /* ================= Actions from records ================= */
  function toAction(entity, id) {
    const r = S.get(entity, id);
    const defaults = { sourceType: { feedback: 'Feedback', insights: 'Insight', risks: 'Risk', reviewNotes: 'Review note', questions: 'Data quality', projects: 'Project' }[entity] || 'Other',
      sourceRef: entity + ':' + id, status: 'Not started', stakeholderValidation: entity === 'feedback' ? 'Pending' : 'Not required' };
    if (entity === 'feedback') Object.assign(defaults, { title: r.agreedAction || ('Respond to feedback: ' + r.theme), owner: r.owner, dueDate: r.dueDate, commitmentType: r.commitmentType });
    if (entity === 'insights') Object.assign(defaults, { title: r.recommendedAction || r.title, owner: r.owner, dueDate: r.reviewDate, commitmentType: 'Proposal' });
    if (entity === 'risks') Object.assign(defaults, { title: 'Mitigate: ' + r.title, owner: r.owner });
    if (entity === 'reviewNotes') Object.assign(defaults, { title: r.followUp || ('Follow up: ' + r.title), owner: r.owners });
    if (entity === 'questions') Object.assign(defaults, { title: 'Confirm: ' + r.title, owner: r.owner });
    if (entity === 'projects') Object.assign(defaults, { title: 'Project action: ' + r.name, owner: r.owner });
    TA.closeDialog('dlg-drawer');
    openForm('actions', null, defaults);
    pendingConvert = entity === 'insights' ? id : null;
  }
  let pendingConvert = null;

  /* ================= Shell & rendering ================= */
  function renderNav() {
    const counts = { quality: TA.dataChecks().filter(c => c.severity === 'Conflict').length + openQuestions().filter(q => q.priority === 'Essential').length,
      feedback: S.list('actions').filter(TA.isOverdue).length + S.list('feedback').filter(TA.fbOverdue).length };
    document.getElementById('nav').innerHTML = SECTIONS.map(([k, l]) => '<li><button data-act="nav" data-sec="' + k + '"' + (ui.section === k ? ' aria-current="page"' : '') + '>' + esc(l) + (counts[k] ? '<span class="count" title="Items needing attention">' + counts[k] + '</span>' : '') + '</button></li>').join('');
  }
  function renderTop() {
    const p = curPeriod();
    const sel = document.getElementById('period');
    sel.innerHTML = S.list('periods').map(x => '<option value="' + x.id + '"' + (p && x.id === p.id ? ' selected' : '') + '>' + esc(x.label) + '</option>').join('');
    const fr = TA.freshness(p);
    document.getElementById('freshness').innerHTML = (p ? esc(TA.fmtDate(p.start)) + ' – ' + esc(TA.fmtDate(p.end)) + ' · ' + esc(fr.label) + ' · ' : '') + 'Last update ' + esc(TA.fmtDateTime(S.state.meta.updatedAt));
    const ss = document.getElementById('sync-status'); if (ss) ss.textContent = TA.Sync.label();
    document.getElementById('save-status').textContent = S.saveError ? 'Save problem – see Settings' : (S.lastSavedAt ? 'Saved in this browser ' + new Date(S.lastSavedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'Not saved yet');
  }
  const RENDER = { overview: secOverview, metrics: secMetrics, trends: secTrends, team: secTeam, projects: secProjects, leadership: secLeadership, feedback: secFeedback, value: secValue, quality: secQuality, reports: secReports, settings: secSettings };
  function render() {
    const ae = document.activeElement;
    const focusId = ae && ae.id && document.getElementById('content').contains(ae) ? ae.id : null;
    const selStart = focusId && ae.selectionStart !== undefined ? ae.selectionStart : null;
    const scroll = window.scrollY;
    renderNav(); renderTop();
    document.getElementById('content').innerHTML = RENDER[ui.section]();
    if (focusId) { const el = document.getElementById(focusId); if (el) { el.focus(); try { if (selStart !== null && el.setSelectionRange) el.setSelectionRange(selStart, selStart); } catch (e) { /* not a text input */ } } }
    window.scrollTo(0, scroll);
  }
  function go(sec) { ui.section = sec; render(); window.scrollTo(0, 0); document.getElementById('content').focus({ preventScroll: true }); try { localStorage.setItem('ta-dash.section', sec); } catch (e) { /* ignore */ } }

  /* ---------- Global search ---------- */
  function runSearch(q) {
    const box = document.getElementById('search-results');
    if (!q || q.length < 2) { box.hidden = true; return; }
    const ql = q.toLowerCase(), res = [];
    TA.ENTITY_ORDER.forEach(e => S.list(e, { archived: true }).forEach(r => { if (TA.searchText(e, r).indexOf(ql) >= 0) res.push({ e, r }); }));
    box.innerHTML = res.length ? '<ul class="list">' + res.slice(0, 30).map(x => '<li><button class="rowtitle" data-act="view" data-entity="' + x.e + '" data-id="' + x.r.id + '">' + esc(TA.recordTitle(x.e, x.r)) + '</button><span class="small muted">' + esc(TA.ENTITIES[x.e].singular) + '</span></li>').join('') + '</ul>' + (res.length > 30 ? '<p class="small muted">' + (res.length - 30) + ' more – refine the search.</p>' : '') : '<p class="small muted" style="margin:0">No matches.</p>';
    box.hidden = false;
  }

  /* ---------- Event handling ---------- */
  async function onClick(e) {
    const b = e.target.closest('[data-act]');
    if (!b || b.tagName === 'SELECT' || b.tagName === 'INPUT') return;
    const act = b.dataset.act, en = b.dataset.entity, id = b.dataset.id;
    switch (act) {
      case 'nav': TA.closeDialog('dlg-drawer'); document.getElementById('search-results').hidden = true; go(b.dataset.sec); break;
      case 'tab': ui.tabs[b.dataset.sec] = b.dataset.tab; render(); break;
      case 'close': TA.closeDialog(b.dataset.dlg); break;
      case 'add': openForm(en, null, b.dataset.defaults ? JSON.parse(b.dataset.defaults) : null); break;
      case 'edit': openForm(en, id); break;
      case 'view': document.getElementById('search-results').hidden = true; openDrawer(en, id); break;
      case 'archive': case 'unarchive': S.setArchived(en, id, act === 'archive'); TA.toast(act === 'archive' ? 'Archived' : 'Unarchived'); if (document.getElementById('dlg-drawer').open) openDrawer(en, id); break;
      case 'delete': {
        const r = S.get(en, id);
        if (await TA.confirmDialog('Delete ' + TA.ENTITIES[en].singular.toLowerCase() + '?', '"' + esc(TA.recordTitle(en, r)) + '" will move to the recycle bin (Data Quality & Evidence → Recycle bin). You can restore it later.', 'Delete', true)) {
          S.softDelete(en, id); TA.closeDialog('dlg-drawer'); TA.toast('Moved to recycle bin');
        }
        break;
      }
      case 'restore': S.restore(en, id); TA.toast('Restored ' + TA.recordTitle(en, S.get(en, id))); break;
      case 'purge': {
        const r = S.get(en, id);
        if (await TA.confirmDialog('Delete permanently?', '"' + esc(TA.recordTitle(en, r)) + '" will be removed permanently. Its prior values remain in the change history and in any backups or snapshots.', 'Delete permanently', true)) S.purge(en, id);
        break;
      }
      case 'sort': { const st = TA.tstate(b.dataset.table); if (st.sort === b.dataset.col) st.dir = -st.dir; else { st.sort = b.dataset.col; st.dir = 1; } render(); break; }
      case 'csv': {
        const rows = b.dataset.table ? TA.tableRowsForExport(b.dataset.table, en) : S.list(en, { archived: true });
        TA.download(new Blob([TA.toCSV(en, rows)], { type: 'text/csv;charset=utf-8' }), en + '-' + TA.todayIso() + '.csv'); break;
      }
      case 'save-narrative': S.setNarrative(id, document.getElementById('narrative').value); TA.toast('Narrative saved'); break;
      case 'draft-narrative': { const ta = document.getElementById('narrative'); ta.value = (ta.value ? ta.value.trim() + '\n\n' : '') + TA.narrativeDraft(id); ta.focus(); TA.toast('Draft inserted – edit and save'); break; }
      case 'trend-type': ui.trendType = b.dataset.type; render(); break;
      case 'pick-restore': document.getElementById('restore-file').click(); break;
      case 'insight-status': S.update('insights', id, { status: b.dataset.status }); TA.toast('Insight ' + b.dataset.status.toLowerCase()); break;
      case 'insight-latest': { const i = S.get('insights', id); const patch = { dataChanged: false }; ['title', 'type', 'observation', 'supportingData', 'method', 'interpretation', 'uncertainty', 'recommendedAction'].forEach(k => { patch[k] = i.latest[k]; }); S.update('insights', id, patch); break; }
      case 'to-action': toAction(en, id); break;
      case 'ev-add': await addEvidence(en, id); break;
      case 'ev-remove': if (await TA.confirmDialog('Remove evidence?', 'The evidence item will be removed from this record. The removal is recorded in the change history.', 'Remove', true)) { S.removeEvidence(en, id, b.dataset.ev); openDrawer(en, id); } break;
      case 'export': await doExport(b.dataset.fmt); break;
      case 'snapshot': {
        const p = curPeriod(); const ps = TA.programmeSummary(p.id);
        const label = document.getElementById('snap-label').value.trim() || ('Snapshot – ' + p.label + ' – ' + TA.fmtDate(TA.todayIso()));
        S.takeSnapshot(label, p.id, { joined: ps.joinedSum, target: ps.targetSum, programmes: ps.rows.map(r => ({ name: r.p.name, target: r.p.target, joined: r.p.joined })) });
        TA.toast('Snapshot saved'); break;
      }
      case 'snap-compare': snapCompare(id); break;
      case 'snap-download': { const s = S.state.snapshots.find(x => x.id === id); TA.download(new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' }), 'snapshot-' + s.ts.slice(0, 10) + '.json'); break; }
      case 'snap-restore': if (await TA.confirmDialog('Restore snapshot?', 'Current data will be replaced by the snapshot. A recovery point is created first.', 'Restore', true)) { S.restoreSnapshot(id); TA.toast('Snapshot restored'); } break;
      case 'snap-delete': if (await TA.confirmDialog('Delete snapshot?', 'This snapshot will be removed.', 'Delete', true)) S.deleteSnapshot(id); break;
      case 'backup': if (await TA.download(new Blob([JSON.stringify(S.backupObject(), null, 2)], { type: 'application/json' }), 'ta-dashboard-backup-' + TA.todayIso() + '.json')) { S.markBackup(); TA.toast('Backup downloaded'); } break;
      case 'restore-confirm': S.restoreBackup(ui.restoreSt.obj); ui.restoreSt = null; TA.toast('Backup restored'); break;
      case 'restore-cancel': ui.restoreSt = null; render(); break;
      case 'recover': if (await TA.confirmDialog('Restore recovery point?', 'Current data will be replaced. Another recovery point is created first.', 'Restore', true)) { S.restoreRecovery(id); TA.toast('Recovery point restored'); } break;
      case 'reset-seed': if (await TA.confirmDialog('Reset to initial reference data?', 'All current records, narratives, history and snapshots are replaced with the initial reference data. A recovery point is created first.', 'Reset', true)) { S.resetToSeed(); TA.toast('Reset complete'); } break;
      case 'save-meta': S.setMeta({ owner: document.getElementById('m-owner').value.trim() || 'Not provided', role: document.getElementById('m-role').value.trim(), org: document.getElementById('m-org').value.trim() }); TA.toast('Profile saved'); break;
      case 'imp-paste': { const txt = document.getElementById('imp-paste').value; if (txt.trim()) startImport(txt, 'Pasted CSV'); break; }
      case 'imp-template': { const en2 = document.getElementById('imp-entity').value; const def = TA.ENTITIES[en2]; TA.download(new Blob(['﻿' + def.fields.filter(f => !f.ro).map(f => f.l).join(',') + '\r\n'], { type: 'text/csv' }), en2 + '-template.csv'); break; }
      case 'imp-run': runImport(); break;
      case 'imp-cancel': ui.importSt = null; render(); break;
    }
  }
  function onChange(e) {
    const t = e.target;
    if (t.id === 'period') { S.setMeta({ selectedPeriodId: t.value }); ui.cmpPeriod = ''; return; }
    if (t.dataset.tblF) { TA.tstate(t.dataset.tblF).filters[t.dataset.field] = t.value; render(); return; }
    if (t.dataset.tblA) { TA.tstate(t.dataset.tblA).archived = t.checked; render(); return; }
    if (t.dataset.act === 'inline-set') {
      const en = t.dataset.entity, id = t.dataset.id, f = t.dataset.field, rec = S.get(en, id);
      const patch = { [f]: t.value };
      if (en === 'projects' && f === 'status') patch.statusAsOf = TA.todayIso();
      const v = TA.validate(en, Object.assign({}, rec, patch), rec);
      if (v.errors.length) { openForm(en, id, null, patch); TA.toast('Complete the required details to save this status'); render(); return; }
      S.update(en, id, patch); TA.toast(TA.recordTitle(en, rec) + ': status set to ' + t.value); return;
    }
    if (t.dataset.act === 'toggle-allper') { ui.showAllPeriods = t.checked; render(); return; }
    if (t.dataset.act === 'toggle-scenario') { ui.showScenario = t.checked; render(); return; }
    if (t.dataset.act === 'toggle-dismissed') { ui.showDismissed = t.checked; render(); return; }
    if (t.dataset.act === 'imp-skipdup') { ui.importSt.skipDup = t.checked; render(); return; }
    if (t.dataset.act === 'cmp-period') { ui.cmpPeriod = t.value; render(); return; }
    if (t.dataset.act === 'trend-metric') { ui.trendMetric = t.value; render(); return; }
    if (t.dataset.act === 'hist-entity') { ui.histEntity = t.value; render(); return; }
    if (t.dataset.rp || t.dataset.rpSec) {
      const rp = reportPrefs();
      if (t.dataset.rpSec) { rp.sections = REPORT_SECTIONS.map(s => s[0]).filter(k => document.querySelector('[data-rp-sec="' + k + '"]').checked); }
      else rp[t.dataset.rp] = t.type === 'checkbox' ? t.checked : t.value;
      S.setMeta({ reportPrefs: rp }); return;
    }
    if (t.dataset.act === 'restore-file' && t.files[0]) {
      const f = t.files[0];
      f.text().then(txt => { let obj = null, errors = []; try { obj = JSON.parse(txt); } catch (err) { errors = ['File is not valid JSON.']; } if (!errors.length) errors = S.validateBackup(obj); ui.restoreSt = { name: f.name, obj, errors }; render(); });
      return;
    }
    if (t.dataset.act === 'imp-entity') { if (ui.importSt) { ui.importSt.entity = t.value; autoMap(); } else ui.importSt = { entity: t.value }; render(); return; }
    if (t.dataset.act === 'imp-file' && t.files[0]) { const f = t.files[0]; f.text().then(txt => startImport(txt, f.name)); return; }
    if (t.dataset.act === 'imp-map') { ui.importSt.map[t.dataset.field] = t.value === '' ? '' : Number(t.value); render(); return; }
  }
  function onInput(e) {
    const t = e.target;
    if (t.dataset.tblQ) { TA.tstate(t.dataset.tblQ).q = t.value; render(); return; }
    if (t.id === 'global-search') runSearch(t.value.trim());
    if (t.dataset.narrative) { const s = document.getElementById('narrative-status'); if (s) s.textContent = 'Unsaved changes'; }
  }

  async function addEvidence(entity, id) {
    const label = document.getElementById('ev-label').value.trim();
    if (!label) { TA.toast('Evidence label is required'); document.getElementById('ev-label').focus(); return; }
    const ev = { label, kind: document.getElementById('ev-kind').value, url: document.getElementById('ev-url').value.trim() || null, note: document.getElementById('ev-note').value.trim() || null };
    const file = document.getElementById('ev-file').files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { TA.toast('File is larger than 2 MB – attach a link instead'); return; }
      ev.dataUrl = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
      ev.fileName = file.name; ev.kind = 'File (stored in browser)';
    }
    S.addEvidence(entity, id, ev);
    TA.toast('Evidence attached');
    openDrawer(entity, id);
  }

  function startImport(text, name) {
    const rows = TA.parseCSV(text);
    if (rows.length < 2) { TA.toast('CSV needs a header row and at least one data row'); return; }
    const entity = document.getElementById('imp-entity').value;
    ui.importSt = { entity, name, headers: rows[0].map(h => h.trim()), rows: rows.slice(1), map: {}, skipDup: true };
    autoMap(); render();
  }
  function autoMap() {
    const st = ui.importSt; if (!st || !st.headers) return;
    const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
    st.map = {};
    TA.ENTITIES[st.entity].fields.forEach(f => { const i = st.headers.findIndex(h => norm(h) === norm(f.k) || norm(h) === norm(f.l)); if (i >= 0) st.map[f.k] = i; });
  }
  function runImport() {
    const st = ui.importSt;
    const prev = importPreview().filter(p => !p.errors.length && !(st.skipDup && p.dups.length));
    S.recoveryPoint('Before importing ' + prev.length + ' ' + TA.ENTITIES[st.entity].label.toLowerCase() + ' from ' + st.name);
    prev.forEach(p => S.add(st.entity, p.data, 'Import: ' + st.name));
    TA.toast('Imported ' + prev.length + ' record(s)');
    ui.importSt = null; render();
  }
  function snapCompare(id) {
    const s = S.state.snapshots.find(x => x.id === id);
    const progs = (s.data.programmes || []).filter(p => !p.deletedAt && p.periodId === s.periodId);
    const cur = TA.programmeSummary(s.periodId);
    const rows = Array.from(new Set(progs.map(p => p.name).concat(cur.rows.map(r => r.p.name))));
    const obsS = (s.data.observations || []).filter(o => !o.deletedAt && o.periodId === s.periodId);
    const html = '<div class="dlg-head"><h3>Snapshot vs current – ' + esc(s.label) + '</h3><button class="btn sm" data-act="close" data-dlg="dlg-form">Close</button></div><div class="dlg-body"><p class="small muted">Snapshot taken ' + TA.fmtDateTime(s.ts) + ' for ' + esc(TA.periodLabel(s.periodId)) + '. Same period and definitions, so values are comparable; differences reflect data updates.</p>' +
      '<div class="table-wrap"><table class="data"><thead><tr><th scope="col">Programme</th><th scope="col" class="num">Target (snapshot)</th><th scope="col" class="num">Target (current)</th><th scope="col" class="num">Joined (snapshot)</th><th scope="col" class="num">Joined (current)</th><th scope="col">Change</th></tr></thead><tbody>' +
      rows.map(n => { const a = progs.find(p => p.name === n), b = cur.rows.find(r => r.p.name === n); return '<tr><td>' + esc(n) + '</td><td class="num">' + TA.fmtInt(a && a.target) + '</td><td class="num">' + TA.fmtInt(b && b.p.target) + '</td><td class="num">' + TA.fmtInt(a && a.joined) + '</td><td class="num">' + TA.fmtInt(b && b.p.joined) + '</td><td>' + (a && b ? esc(TA.deltaText('count', a.joined, b.p.joined)) : 'Added/removed') + '</td></tr>'; }).join('') +
      '</tbody></table></div><h4 style="margin-top:12px">Measures</h4><div class="table-wrap"><table class="data"><thead><tr><th scope="col">Measure</th><th scope="col" class="num">Snapshot</th><th scope="col" class="num">Current</th><th scope="col">Change</th></tr></thead><tbody>' +
      obsS.map(o => { const m = TA.metric(o.metricId) || { name: 'Metric', unit: 'count' }; const c = S.get('observations', o.id); return '<tr><td>' + esc(m.name) + '</td><td class="num">' + esc(TA.fmtVal(o.actualReported, m.unit)) + '</td><td class="num">' + esc(c && !c.deletedAt ? TA.fmtVal(c.actualReported, m.unit) : 'Deleted') + '</td><td>' + (c && !c.deletedAt ? esc(TA.deltaText(m.unit, o.actualReported, c.actualReported)) : '') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    TA.openDialog('dlg-form', html);
  }

  async function doExport(fmt) {
    const status = document.getElementById('export-status');
    if (!libsReady()) { TA.toast('Export libraries not loaded'); return; }
    const rp = reportPrefs();
    if (!rp.sections.length) { TA.toast('Select at least one section'); return; }
    try {
      status.textContent = 'Generating ' + fmt.toUpperCase() + '…';
      const name = await TA.Exports[fmt](rp);
      if (!name) { status.textContent = fmt.toUpperCase() + ' not saved.'; return; }
      status.textContent = 'Generated ' + name + ' (' + TA.fmtDateTime(new Date().toISOString()) + ').';
      S.log('*', null, 'export ' + fmt.toUpperCase() + ' – ' + TA.periodLabel(rp.periodId) + (rp.includeConfidential ? ' (including confidential details)' : ' (confidential details excluded)'), []);
      S.touch();
    } catch (err) { console.error(err); status.textContent = 'Export failed: ' + err.message; }
  }

  /* ---------- Boot ---------- */
  async function boot() {
    TA.initTooltips();
    const info = await S.load();
    TA.syncInsights();
    try { const s = localStorage.getItem('ta-dash.section'); if (s && RENDER[s]) ui.section = s; } catch (e) { /* ignore */ }
    let busy = false;
    S.onChange((evt) => {
      if (evt.saved) { renderTop(); TA.Sync.schedule(); return; }
      if (busy) return; busy = true;
      if (evt.entity === 'actions' && pendingConvert) { const ins = S.get('insights', pendingConvert); pendingConvert = null; if (ins) S.update('insights', ins.id, { status: 'Converted to action' }); }
      if (evt.entity !== 'insights' && TA.syncInsights()) S.scheduleSave();
      busy = false;
      render();
    });
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    document.addEventListener('input', onInput);
    document.getElementById('global-search').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.target.value = ''; document.getElementById('search-results').hidden = true; } });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') S.flush(); });
    window.addEventListener('beforeunload', () => S.flush());
    render();
    if (info.seeded) TA.toast('Loaded initial reference data. Download backups regularly from Settings / Backup.');
    // Data packs are applied after the account copy has loaded, so they never overwrite newer saved data.
    TA.Sync.init(info.seeded).then(() => { if (TA.applyDataPacks) TA.applyDataPacks(); render(); });
    S.scheduleSave();
    window.TA_READY = true;
  }

  Object.assign(TA, { ui, curPeriod, reportPrefs, REPORT_SECTIONS, render, go, openDrawer, openForm });
  document.addEventListener('DOMContentLoaded', boot);
})();
