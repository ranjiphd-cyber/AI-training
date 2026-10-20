/* Report model and file generators (PPTX via PptxGenJS, DOCX via docx, PDF via jsPDF).
   All three formats are built from one report model so content, dates, assumptions and sources match. */
(function () {
  'use strict';
  const TA = window.TA;
  const S = () => TA.Store;
  const NAVY = '001433', SLATE = '4A5568', ACCENT = '00819B', AMBER = 'C9820A', LINE = 'DCE2EA';

  /* ---------- Narrative draft (factual, from recorded data) ---------- */
  function narrativeDraft(periodId) {
    const p = TA.period(periodId); if (!p) return '';
    const ps = TA.programmeSummary(periodId);
    const parts = ['[Draft generated from recorded data on ' + TA.fmtDate(TA.todayIso()) + ' – review and edit before use]'];
    if (ps.count) {
      parts.push('Between ' + TA.fmtDate(p.start) + ' and ' + TA.fmtDate(p.end) + ', ' + TA.fmtInt(ps.joinedSum) + ' joiners were recorded across ' + ps.count + ' programmes against combined programme targets of ' + TA.fmtInt(ps.targetSum) +
        (TA.isNum(ps.aggregateAttain) ? ' (' + TA.fmtPct(ps.aggregateAttain) + ' aggregate attainment, recalculated)' : '') + '. ' + ps.metOrAbove + ' of ' + ps.count + ' programmes were at or above target.');
      if (ps.shortfalls.length) parts.push(ps.shortfalls.map(r => r.p.name + ' (' + r.p.joined + ' of ' + r.p.target + ')').join(', ') + (ps.shortfalls.length > 1 ? ' were' : ' was') + ' below target, a combined shortfall of ' + ps.shortfallSum + ' joiners' +
        (ps.overs.length ? '; ' + ps.overs.map(r => r.p.name + ' (+' + r.gap + ')').join(', ') + (ps.overs.length > 1 ? ' were' : ' was') + ' above target. Over-delivery in one programme does not offset programme-specific gaps.' : '.'));
    }
    const obs = S().list('observations').filter(o => o.periodId === periodId && (TA.metric(o.metricId) || {}).role !== 'totalJoined');
    if (obs.length) parts.push('Other reported measures: ' + obs.map(o => { const c = TA.obsCalc(o); return c.m.name.toLowerCase() + ' ' + TA.fmtVal(c.value, c.unit) + (TA.isNum(o.target) ? ' (target ' + TA.fmtVal(o.target, c.unit) + ')' : ''); }).join('; ') + '.' +
      (obs.some(o => !TA.isNum(o.target)) ? ' Targets were not provided for some measures, so attainment is not assessed for them.' : ''));
    const prior = TA.priorPeriod(p);
    parts.push(prior ? 'A comparable prior period (' + prior.label + ') is recorded; see delivery trends.' : 'No comparable prior period is recorded, so no trend is stated.');
    const bt = TA.benefitTotals();
    const vcats = TA.BENEFIT_CATS.filter(c => bt[c].validated);
    parts.push(vcats.length ? 'Validated benefits: ' + vcats.map(c => c.toLowerCase() + ' ' + TA.fmtVal(bt[c].validatedGross, bt[c].unit)).join('; ') + ' (categories reported separately).' : 'No validated financial benefits are recorded.');
    const left = S().list('team').filter(t => t.employmentStatus === 'Left').length;
    if (left) parts.push(left + ' team member(s) have left; replacement hiring status is tracked in actions.');
    const ess = S().list('questions').filter(q => (q.status === 'Open' || q.status === 'Awaiting data owner') && q.priority === 'Essential');
    if (ess.length) parts.push('Open confirmations (' + ess.length + ' essential): ' + ess.map(q => q.title).join('; ') + '.');
    return parts.join('\n\n');
  }

  /* ---------- Report model ---------- */
  function buildModel(rp) {
    const st = S();
    const p = TA.period(rp.periodId);
    const conf = !!rp.includeConfidential;
    const ps = TA.programmeSummary(p.id);
    const m = { title: 'Talent Acquisition India – Performance Review', owner: st.state.meta.owner, role: st.state.meta.role, org: st.state.meta.org,
      preparedBy: rp.preparedBy || st.state.meta.owner, period: p, generatedAt: new Date().toISOString(), confidential: conf, sections: [], sources: new Set(), assumptions: [] };
    m.periodLine = p.label + ' (' + TA.fmtDate(p.start) + ' – ' + TA.fmtDate(p.end) + '; source cut-off ' + TA.fmtDate(p.cutoff) + ')';
    if (p.source) m.sources.add(p.source);
    ps.rows.forEach(r => { if (r.p.source) m.sources.add(r.p.source); });
    const want = (k) => rp.sections.indexOf(k) >= 0;
    const progChart = (rows, title) => {
      const ok = rows.filter(r => TA.isNum(r.p.target) && TA.isNum(r.p.joined));
      return { type: 'chart', title, categories: ok.map(r => r.p.name), series: [{ name: 'Target', values: ok.map(r => r.p.target), color: NAVY }, { name: 'Joined (source-reported)', values: ok.map(r => r.p.joined), color: ACCENT }],
        note: rows.length > ok.length ? (rows.length - ok.length) + ' programme(s) omitted from chart: value not provided.' : null };
    };
    const progTable = (rows) => ({ type: 'table', head: ['Programme', 'Group', 'Target', 'Joined', 'Attainment', 'Gap', 'Status'],
      rows: rows.map(r => [r.p.name, r.p.group || 'Not provided', TA.fmtInt(r.p.target), TA.fmtInt(r.p.joined), TA.fmtPct(r.attain), TA.isNum(r.gap) ? (r.gap > 0 ? '+' : '') + r.gap : 'Not provided', r.status]) });
    const obsList = st.list('observations').filter(o => o.periodId === p.id);
    obsList.forEach(o => { if (o.source) m.sources.add(o.source); });

    if (want('summary')) {
      const kpis = [
        { label: 'Total joined', value: TA.fmtInt(ps.reportedTotal !== null ? ps.reportedTotal : ps.joinedSum), note: (ps.reportedTotal !== null ? 'Source-reported; programme sum ' + TA.fmtInt(ps.joinedSum) : 'Recalculated') },
        { label: 'Combined target', value: ps.allTargets ? TA.fmtInt(ps.targetSum) : 'Not provided', note: 'Recalculated: sum of programme targets' },
        { label: 'Aggregate attainment', value: TA.fmtPct(ps.aggregateAttain), note: 'Recalculated; includes over-target programmes' },
        { label: 'Programmes at/above target', value: ps.count ? ps.metOrAbove + ' of ' + ps.count : 'Not provided', note: 'Recalculated' },
        { label: 'Shortfall (below-target programmes)', value: ps.shortfalls.length ? '−' + ps.shortfallSum : 'None', note: ps.shortfalls.map(r => r.p.name).join(', ') }
      ];
      obsList.filter(o => (TA.metric(o.metricId) || {}).role !== 'totalJoined').forEach(o => { const c = TA.obsCalc(o); kpis.push({ label: c.m.name, value: TA.fmtVal(c.value, c.unit), note: 'Source-reported; target ' + (TA.isNum(o.target) ? TA.fmtVal(o.target, c.unit) : 'not provided') }); });
      const nar = st.state.narratives[p.id];
      const blocks = [{ type: 'kpis', items: kpis }, { type: 'text', label: 'Executive narrative', text: nar && nar.text ? nar.text : 'Executive narrative not written for this period.' }];
      const gaps = ps.shortfalls.map(r => r.p.name + ': ' + r.p.joined + ' of ' + r.p.target + ' (' + TA.fmtPct(r.attain) + ', gap ' + r.gap + ')');
      const conflicts = TA.dataChecks().filter(c => c.severity === 'Conflict');
      if (conflicts.length) gaps.push(conflicts.length + ' data conflict(s) awaiting validation – see appendix.');
      if (gaps.length) blocks.push({ type: 'bullets', label: 'Gaps requiring attention', items: gaps });
      m.sections.push({ key: 'summary', title: 'Executive summary', blocks });
    }
    if (want('trends')) {
      const blocks = [progChart(ps.rows, 'Joined vs target by programme – ' + p.label)];
      const prior = TA.priorPeriod(p);
      const priorPs = prior ? TA.programmeSummary(prior.id) : null;
      const cmpOk = prior && TA.comparability(prior, p).ok;
      if (priorPs && priorPs.count && cmpOk) {
        const priorVals = blocks[0].categories.map(n => { const x = priorPs.rows.find(y => y.p.name.toLowerCase() === n.toLowerCase()); return x && TA.isNum(x.p.joined) ? x.p.joined : null; });
        if (priorVals.every(TA.isNum)) blocks[0].series.push({ name: prior.label, values: priorVals, color: AMBER });
        else blocks.push({ type: 'text', text: 'Prior-period series not charted: some programmes have no value in ' + prior.label + ' (missing is not shown as zero).' });
        blocks.push({ type: 'text', text: TA.programmeSetsMatch(priorPs, ps) ? 'Comparison with ' + prior.label + ': total ' + TA.deltaText('count', priorPs.joinedSum, ps.joinedSum) + '.' : 'Totals not compared with ' + prior.label + ': the periods hold different programme sets.' });
      } else if (prior) blocks.push({ type: 'text', text: 'Prior period ' + prior.label + ' is not comparable: ' + TA.comparability(prior, p).reasons.join(' ') });
      const LYTD = TA.LATERAL_YTD || { periodId: 'per_biz_2026ytd', population: 'Lateral joiners' };
      const lat = (TA.LATERAL_TREND_METRICS || []).map(n => TA.annualWithYtd(n, 'Lateral hiring', 'Lateral joiners', LYTD.periodId, LYTD.population)).filter(x => x && x.points.length >= 2);
      if (lat.length) {
        const cats = lat[0].points.map(p => p.short);
        if (lat.every(s => s.points.map(p => p.short).join() === cats.join())) {
          blocks.push({ type: 'chart', kind: 'line', unit: '%', title: 'Lateral hiring – key parameters (%), 2020–2026 YTD', categories: cats, series: lat.map((s, i) => ({ name: s.metric.name, values: s.points.map(p => TA.round(p.value, 1)), color: [ACCENT, AMBER, '7A5BC4'][i] })),
            note: '2026 is year-to-date (to 14 Oct); compare with full years with care. Sources: Business Review Meeting (Oct) slide (2020–2025); hiring tracker, lateral incl. conversions and FTC (2026 YTD).' });
        }
        lat.forEach(s => s.points.forEach(p => { if (p.obs && p.obs.source) m.sources.add(p.obs.source); }));
      }
      const vol = TA.LATERAL_VOLUME_METRIC ? TA.annualWithYtd(TA.LATERAL_VOLUME_METRIC, 'Lateral hiring', 'Lateral joiners', 'per_biz_2026ytd') : null;
      if (vol && vol.points.length >= 2) {
        blocks.push({ type: 'chart', kind: 'line', unit: 'count', title: 'Lateral hires (number), ' + vol.points[0].short + '–' + vol.points[vol.points.length - 1].short, categories: vol.points.map(p => p.short), series: [{ name: 'Lateral hires', values: vol.points.map(p => p.value), color: NAVY }],
          note: 'Full calendar years; the last point is year-to-date and not comparable with full years.' });
        vol.points.forEach(p => { if (p.obs && p.obs.source) m.sources.add(p.obs.source); });
      }
      const cyc = (TA.LATERAL_CYCLE_METRICS || []).map(n => TA.annualWithYtd(n, 'Lateral hiring', 'Lateral joiners', LYTD.periodId, LYTD.population)).filter(x => x && x.points.length >= 2);
      if (cyc.length && cyc.every(c => c.points.map(p => p.short).join() === cyc[0].points.map(p => p.short).join())) {
        blocks.push({ type: 'chart', kind: 'line', unit: 'days', title: 'Lateral hiring cycle time (days), ' + cyc[0].points[0].short + '–' + cyc[0].points[cyc[0].points.length - 1].short, categories: cyc[0].points.map(p => p.short),
          series: cyc.map((c, i) => ({ name: c.metric.name, values: c.points.map(p => p.value), color: [ACCENT, NAVY][i] })), note: 'Lower is better. 2023–2025 average: 60 days to offer, 107 days to join. The last point is year-to-date from the hiring tracker (lateral incl. conversions and FTC).' });
        cyc.forEach(c => c.points.forEach(p => { if (p.obs && p.obs.source) m.sources.add(p.obs.source); }));
      }
      const trendRows = [];
      TA.availableTrends().forEach(t => { trendRows.push([t.metric.name, t.population || 'Not provided', t.a.period.label + ': ' + TA.fmtVal(t.a.value, t.metric.unit), t.b.period.label + ': ' + TA.fmtVal(t.b.value, t.metric.unit), TA.deltaText(t.metric.unit, t.a.value, t.b.value)]); if (t.b.obs.source) m.sources.add(t.b.obs.source); });
      if (trendRows.length) blocks.push({ type: 'table', label: 'Latest change between comparable periods (descriptive; causes not inferred)', head: ['Measure', 'Population', 'Prior', 'Latest', 'Change'], rows: trendRows });
      else blocks.push({ type: 'text', text: 'Trend: not available. Each measure has a single ' + p.type + ' observation for this scope; no prior-period data has been supplied. Missing periods are not interpolated.' });
      blocks.push({ type: 'commentary', changed: priorPs && priorPs.count && cmpOk && TA.programmeSetsMatch(priorPs, ps) ? 'Total joined ' + TA.deltaText('count', priorPs.joinedSum, ps.joinedSum) + ' vs ' + prior.label + '.' : 'No comparable prior period; position at cut-off shown.',
        matters: ps.shortfalls.length ? ps.shortfallSum + ' joiners short in ' + ps.shortfalls.length + ' programme(s) while the aggregate is ' + TA.fmtPct(ps.aggregateAttain) + '.' : 'No programme shortfalls.',
        follows: 'Confirm target basis (full-year vs YTD) and agree programme-level recovery or re-phasing.' });
      m.sections.push({ key: 'trends', title: 'Delivery trends', blocks });
    }
    if (want('value')) {
      const groups = {};
      ps.rows.forEach(r => { const g = r.p.group || 'Not classified'; groups[g] = groups[g] || { t: 0, j: 0 }; groups[g].t += r.p.target || 0; groups[g].j += r.p.joined || 0; });
      const bt = TA.benefitTotals();
      const blocks = [
        { type: 'table', label: 'Business contribution by programme group (shared business outcome)', head: ['Group', 'Target', 'Joined', 'Share of joiners', 'Attainment'], rows: Object.keys(groups).map(g => [g, String(groups[g].t), String(groups[g].j), TA.fmtPct(TA.pct(groups[g].j, ps.joinedSum)), TA.fmtPct(TA.pct(groups[g].j, groups[g].t))]) },
        { type: 'table', label: 'Financial and non-financial value (categories are not combined)', head: ['Category', 'Records', 'Validated', 'Validated gross', 'Validated net', 'Unvalidated / estimated (not claimed)'],
          rows: TA.BENEFIT_CATS.map(c => [c, String(bt[c].count), String(bt[c].validated), bt[c].validated ? TA.fmtVal(bt[c].validatedGross, bt[c].unit) : '–', bt[c].validated && c !== 'Productivity capacity released' ? (bt[c].netKnown ? TA.fmtINR(bt[c].validatedNet) : 'Not calculable') : '–', bt[c].unvalidatedGross ? TA.fmtVal(bt[c].unvalidatedGross, bt[c].unit) : '–']) },
        ...st.list('breakdowns').filter(bd => bd.dimension === 'Business area').map(bd => ({ type: 'table', label: bd.title + ' – ' + TA.periodLabel(bd.periodId), head: ['Business area', 'Joined', 'Share of joiners', 'Offers released', 'Declined'],
          rows: (bd.rows || []).filter(r => r.joined || r.offers).map(r => { const tot = (bd.rows || []).reduce((s, x) => s + (x.joined || 0), 0); return [r.label, String(r.joined), TA.fmtPct(TA.pct(r.joined, tot)), String(r.offers), String(r.declined)]; }) })),
        { type: 'text', text: st.list('benefits').length ? 'Only validated benefits with approved inputs are counted as verified. Vacancy-duration value is notional.' : 'No benefits or financial inputs have been supplied, so no savings, cost avoidance or capacity release is reported. Reduced vendor usage alone is not a monetary saving.' }
      ];
      const vb = st.list('benefits').map(b => ({ b, c: TA.benefitCalc(b) }));
      if (vb.length) blocks.push({ type: 'table', label: 'Benefit calculations', head: ['Benefit', 'Category', 'Calculation', 'Gross', 'Net', 'Validation'], rows: vb.map(({ b, c }) => [b.title, b.category, c.steps.join('; ') || 'Inputs missing: ' + c.missing.join(', '), TA.isNum(c.gross) ? TA.fmtVal(c.gross, c.unit || 'INR') : 'Not calculable', TA.isNum(c.net) ? TA.fmtINR(c.net) : 'Not calculable', b.validationStatus]) });
      vb.forEach(({ b }) => { if (b.assumptions) m.assumptions.push('Benefit "' + b.title + '": ' + b.assumptions); if (b.unitCostSource) m.sources.add(b.unitCostSource); });
      m.sections.push({ key: 'value', title: 'Business contribution and financial value', blocks });
    }
    if (want('pipeline')) {
      const rows = ps.rows.filter(r => r.p.group === 'Talent-pipeline programme');
      const blocks = rows.length ? [progChart(rows, 'Talent-pipeline programmes – joined vs target'), progTable(rows),
        { type: 'commentary', changed: 'Position at cut-off; no prior period.', matters: rows.filter(r => r.status === 'Below target').map(r => r.p.name + ' ' + r.gap).join(', ') ? 'Below target: ' + rows.filter(r => r.status === 'Below target').map(r => r.p.name + ' (' + r.gap + ')').join(', ') + '. Above target: ' + (rows.filter(r => r.status === 'Above target').map(r => r.p.name + ' (+' + r.gap + ')').join(', ') || 'none') + '.' : 'All pipeline programmes at or above target.', follows: 'Review cohort timing and remaining-year plans for shortfall programmes; confirm whether over-target volumes were requested.' }]
        : [{ type: 'text', text: 'No programmes are classified as talent-pipeline programmes for this period.' }];
      blocks.push({ type: 'text', text: 'Programme grouping is a reporting assumption awaiting confirmation.' });
      const tps = st.list('talentPrograms');
      if (tps.length) {
        blocks.push({ type: 'table', label: 'TA programme calendar 2026 (tracker plan)', head: ['Programme', 'Category', 'Batch', 'Status', 'Owner', 'Responsible', 'Plan (tracker)', 'Scorecard target'],
          rows: tps.map(t => { const sc = TA.scorecardMatch(t); return [t.name, t.category || 'Not provided', t.batch || '–', t.status, t.programOwner || 'Not provided', t.responsible || 'Not provided', TA.isNum(t.expectedNumber) ? String(t.expectedNumber) : 'Not provided', sc ? TA.fmtInt(sc.target) + (TA.isNum(t.expectedNumber) && sc.target !== t.expectedNumber ? ' (differs)' : '') : '–']; }) });
        tps.forEach(t => { if (t.origin && t.origin.indexOf('Import: ') === 0) m.sources.add(t.origin.slice(8)); });
      }
      m.sections.push({ key: 'pipeline', title: 'Talent-pipeline outcomes', blocks });
    }
    if (want('team')) {
      const team = st.list('team', { archived: true });
      const dev = st.list('devItems');
      const devCounts = (items) => ['Planned', 'Ongoing', 'Completed'].map(s => s + ' ' + items.filter(d => d.learningStatus === s).length).join(' · ') + ' · applied at work ' + items.filter(d => /^Applied|^Capability/.test(d.capabilityStage || '')).length + ' · reviewer-validated ' + items.filter(d => d.capabilityStage === 'Capability demonstrated – reviewer validated').length;
      const blocks = [{ type: 'bullets', items: [
        'Team records: ' + team.length + ' (' + team.filter(t => t.employmentStatus === 'Active').length + ' active, ' + team.filter(t => t.employmentStatus === 'Left').length + ' left – history retained, ' + team.filter(t => t.employmentStatus === 'Not provided').length + ' status not provided).',
        'Team development: ' + devCounts(dev.filter(d => d.subject !== 'self')) + '.',
        'TA Head development: ' + devCounts(dev.filter(d => d.subject === 'self')) + '.',
        'Succession readiness assessed for ' + team.filter(t => t.successionReadiness && t.successionReadiness !== 'Not assessed').length + ' of ' + team.length + '; backup coverage recorded for ' + team.filter(t => t.backupCoverage).length + '.'] }];
      if (conf) {
        blocks.push({ type: 'table', label: 'Team members (confidential)', head: ['Name', 'Role', 'Status', 'Business coverage', 'Succession', 'Human review'], rows: team.map(t => [t.name, t.role || 'Not provided', t.employmentStatus, t.businessCoverage || 'Not provided', t.successionReadiness || 'Not assessed', t.humanReviewDate ? TA.fmtDate(t.humanReviewDate) + ' (' + (t.humanReviewBy || '') + ')' : 'Not recorded']) });
        const rr = st.list('recruiterResults');
        if (rr.length) blocks.push({ type: 'table', label: 'Recruiter results (confidential; not a ranking)', head: ['Team member', 'Period', 'Offer target', 'Offers', 'Attainment (reported)', 'Attainment (recalc.)', 'Flag'], rows: rr.map(r => { const c = TA.rrCalc(r); return [TA.member(r.memberId) ? TA.member(r.memberId).name : 'Not provided', TA.periodLabel(r.periodId), TA.fmtInt(r.offerTarget), TA.fmtInt(r.offers), TA.fmtPct(r.offerAttainmentReported), TA.fmtPct(c.offerRecalc), c.offerConflict ? 'Conflict – validation requested' : '']; }) });
        rr.forEach(r => { if (r.source) m.sources.add(r.source); });
      } else blocks.push({ type: 'text', text: 'Individual names and results excluded from this output (confidential). Individual results are not ranked and require human review before use in performance assessments.' });
      m.sections.push({ key: 'team', title: 'Team development', blocks });
    }
    if (want('process')) {
      const prj = st.list('projects');
      prj.forEach(x => { if (x.origin && x.origin.indexOf('Import: ') === 0) m.sources.add(x.origin.slice(8)); });
      const blocks = prj.length ? [{ type: 'table', head: ['Project', 'P&C priority', 'Owner', 'Status', 'Completed to date', 'What remains', 'Planned completion'], rows: prj.map(x => [x.name, x.pillar || 'Not provided', x.owner || 'Not provided', x.status, x.completedToDate || 'Not provided', x.remainingWork || 'Not provided', x.plannedCompletionText || (x.revisedDeadline || x.originalDeadline ? TA.fmtDate(x.revisedDeadline || x.originalDeadline) : 'Not provided')]) },
        { type: 'text', text: 'Project completion is reported separately from benefit realisation. Completed: ' + prj.filter(x => x.status === 'Completed').length + '; benefits validated (full or partial): ' + prj.filter(x => /validated$/.test(x.benefitStatus || '')).length + '.' }]
        : [{ type: 'text', text: 'No process-improvement or strategic projects have been recorded. No project benefits are reported.' }];
      m.sections.push({ key: 'process', title: 'Process-improvement projects and benefits', blocks });
    }
    if (want('feedback')) {
      const fb = st.list('feedback');
      const blocks = fb.length ? [{ type: 'table', head: ['Date', 'Provider', 'Theme', 'Feedback', 'Response type', 'Action', 'Status'], rows: fb.map(f => [TA.fmtDate(f.date), f.confidential && !conf ? 'Confidential provider' : (f.provider + (f.providerRole ? ' (' + f.providerRole + ')' : '')), f.theme, (f.wordingType === 'Exact wording' ? '"' + f.wording + '"' : 'Paraphrase: ' + f.wording), f.commitmentType || 'Not provided', f.agreedAction || 'Not provided', f.closureStatus]) },
        { type: 'text', text: 'Open: ' + fb.filter(f => f.closureStatus === 'Open').length + ' · action completed, validation pending: ' + fb.filter(f => f.closureStatus === 'Action completed; stakeholder validation pending').length + ' · closed with stakeholder validation: ' + fb.filter(f => f.closureStatus === 'Closed – stakeholder validated').length + '.' }]
        : [{ type: 'text', text: 'No leadership feedback has been recorded in the dashboard. Feedback themes are reported only when supported by recorded evidence.' }];
      m.sections.push({ key: 'feedback', title: 'Leadership-feedback response', blocks });
    }
    if (want('priorities')) {
      const dec = st.list('decisions').filter(d => d.status === 'Open');
      const ess = st.list('questions').filter(q => (q.status === 'Open' || q.status === 'Awaiting data owner') && q.priority === 'Essential');
      const acts = st.list('actions').filter(a => ['Completed', 'Cancelled'].indexOf(a.status) < 0);
      const risks = st.list('risks').filter(r => r.status !== 'Closed');
      const blocks = [];
      blocks.push(dec.length ? { type: 'table', label: 'Decisions and support required', head: ['Item', 'Type', 'Requested from', 'Needed by', 'Recommendation (proposal)'], rows: dec.map(d => [d.title, d.type, d.requestedFrom || 'Not provided', TA.fmtDate(d.dueDate), d.recommendation || 'Not provided']) } : { type: 'text', text: 'No decisions or support requests recorded.' });
      if (ess.length) blocks.push({ type: 'bullets', label: 'Essential confirmations requested', items: ess.map(q => q.title + ' – confirm with ' + (q.owner || 'data owner')) });
      if (acts.length) blocks.push({ type: 'table', label: 'Open actions', head: ['Action', 'Owner', 'Due', 'Status'], rows: acts.map(a => [a.title, a.owner || 'Not provided', a.dueDate ? TA.fmtDate(a.dueDate) + (TA.isOverdue(a) ? ' (overdue)' : '') : 'Not provided', a.status]) });
      if (risks.length) blocks.push({ type: 'bullets', label: 'Open risks', items: risks.map(r => r.title + ' (likelihood ' + (r.likelihood || 'Not assessed') + ', impact ' + (r.impact || 'Not assessed') + ')') });
      m.sections.push({ key: 'priorities', title: 'Priorities and decisions required', blocks });
    }
    // Assumptions (always shown)
    m.assumptions.unshift(
      'Attainment, gaps, totals and shares are recalculated from source-reported programme figures; source values are not altered.',
      'Missing values are shown as "Not provided" and excluded from totals; they are not treated as zero.',
      'Whether programme targets are full-year or year-to-date is not confirmed.',
      'Programme grouping (lateral, talent-pipeline, internal mobility) is a reporting assumption.',
      'Recruiter results use their own period (cut-off 12 Oct 2026) and are not reconciled with the business scorecard.',
      'Benefit categories are reported separately; only validated benefits with approved inputs count as verified.',
      'Insights and alerts are produced by transparent rules; no AI service is connected. No causation is inferred.',
      conf ? 'Confidential individual details are INCLUDED – restricted circulation.' : 'Confidential individual details are excluded.');
    m.dataQuality = TA.dataChecks().filter(c => c.severity === 'Conflict' || c.severity === 'Warning').map(c => c.severity + ': ' + (conf ? c.title : anonymise(c.title)));
    m.openQuestions = st.list('questions').filter(q => q.status === 'Open' || q.status === 'Awaiting data owner').map(q => (q.priority ? '[' + q.priority + '] ' : '') + (conf ? q.title : anonymise(q.title)));
    if (!conf) {
      // Final pass: team-member names are replaced wherever they appear (including free text) when confidential details are excluded.
      const walk = (v) => typeof v === 'string' ? anonymise(v) : Array.isArray(v) ? v.map(walk) : (v && typeof v === 'object') ? Object.keys(v).reduce((o, k) => { o[k] = k === 'color' ? v[k] : walk(v[k]); return o; }, {}) : v;
      m.sections = walk(m.sections);
      m.assumptions = walk(m.assumptions);
    }
    m.sources = Array.from(m.sources);
    if (!m.sources.length) m.sources.push('Not provided');
    return m;
  }
  /* Replaces team members' names with "a team member": full names first, then name parts and close variants
     (e.g. "Padmavathy" for Padma, "Kathir" for Kathiresaprabu), so unconfirmed spellings are hidden too. */
  function anonymise(text) {
    let t = text;
    const team = S().list('team', { archived: true }).filter(mb => mb.name);
    const names = (mb) => [mb.name].concat(String(mb.aliases || '').split(',').map(x => x.trim()).filter(Boolean));
    team.forEach(mb => names(mb).sort((a, b) => b.length - a.length).forEach(nm => { t = t.replace(new RegExp('\\b' + nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi'), 'a team member'); }));
    team.forEach(mb => { t = t.replace(new RegExp('\\b' + mb.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi'), 'a team member'); });
    const parts = Array.from(new Set(team.flatMap(mb => names(mb).join(' ').toLowerCase().split(/[^a-z]+/).filter(x => x.length >= 4))));
    t = t.replace(/\b[A-Za-z]+\b/g, (w) => {
      const lw = w.toLowerCase();
      if (lw === 'team' || lw === 'member') return w;
      return parts.some(p => lw.startsWith(p) || (lw.length >= 5 && p.startsWith(lw))) ? 'a team member' : w;
    });
    return t.replace(/a team member( a team member)+/g, 'a team member').replace(/a team member(?: [A-Z]\.?)+(?![A-Za-z])/g, 'a team member');
  }
  const fileBase = (m, ext) => 'TA-India-Performance-' + m.period.label.replace(/[^A-Za-z0-9]+/g, '-').replace(/-+$/, '') + '-' + TA.todayIso() + '.' + ext;
  const footerText = (m) => 'Reporting period: ' + m.periodLine + '  |  Generated: ' + TA.fmtDateTime(m.generatedAt) + '  |  Sources: ' + m.sources.join('; ') + '  |  ' + (m.confidential ? 'CONFIDENTIAL – includes individual details' : 'Individual details excluded');

  /* ---------- PPTX ---------- */
  async function pptx(rp) {
    const m = buildModel(rp);
    const pres = new window.PptxGenJS();
    pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
    pres.author = m.preparedBy; pres.company = m.org; pres.title = m.title + ' – ' + m.period.label;
    const FONT = 'Segoe UI';
    const W = 13.33, X0 = 0.5, CW = W - 1.0, YMAX = 6.75;
    const footer = (slide) => {
      slide.addShape(pres.ShapeType.line, { x: X0, y: 6.88, w: CW, h: 0, line: { color: LINE, width: 0.75 } });
      slide.addText(footerText(m), { x: X0, y: 6.92, w: CW, h: 0.45, fontFace: FONT, fontSize: 8, color: SLATE, valign: 'top', fit: 'shrink' });
    };
    const newSlide = (title, sub) => {
      const s = pres.addSlide();
      s.background = { color: 'FFFFFF' };
      s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.12, fill: { color: NAVY }, line: { color: NAVY } });
      s.addText(title, { x: X0, y: 0.3, w: CW, h: 0.55, fontFace: FONT, fontSize: 24, bold: true, color: NAVY });
      if (sub) s.addText(sub, { x: X0, y: 0.82, w: CW, h: 0.3, fontFace: FONT, fontSize: 11, color: SLATE });
      footer(s);
      return s;
    };
    // Cover
    const c = pres.addSlide();
    c.background = { color: NAVY };
    c.addText(m.title, { x: 0.8, y: 1.8, w: 11.5, h: 0.9, fontFace: FONT, fontSize: 34, bold: true, color: 'FFFFFF' });
    c.addText(m.owner + ' · ' + m.role + ' · ' + m.org, { x: 0.8, y: 2.75, w: 11.5, h: 0.5, fontFace: FONT, fontSize: 16, color: 'D5DDE8' });
    c.addText([{ text: 'Reporting period: ' + m.periodLine, options: { breakLine: true } }, { text: 'Generated: ' + TA.fmtDateTime(m.generatedAt) + ' · Prepared by ' + m.preparedBy, options: { breakLine: true } },
      { text: m.confidential ? 'CONFIDENTIAL – includes individual details. Restricted circulation.' : 'Confidential individual details excluded.', options: { breakLine: true } },
      { text: 'Sources: ' + m.sources.join('; ') }], { x: 0.8, y: 3.6, w: 11.5, h: 1.6, fontFace: FONT, fontSize: 12, color: 'B8C3D3', valign: 'top' });
    c.addShape(pres.ShapeType.rect, { x: 0.8, y: 1.55, w: 1.2, h: 0.08, fill: { color: '3FB6CC' }, line: { color: '3FB6CC' } });

    m.sections.forEach(sec => {
      let s = newSlide(sec.title, m.period.label);
      let y = 1.25;
      const ensure = (h) => { if (y + h > YMAX) { s = newSlide(sec.title + ' (continued)', m.period.label); y = 1.25; } };
      sec.blocks.forEach(b => {
        if (b.type === 'kpis') {
          const per = 5, tw = (CW - 0.2 * (per - 1)) / per, th = 1.0;
          b.items.forEach((k, i) => {
            if (i % per === 0) { ensure(th + 0.15); if (i) y += th + 0.15; }
            const x = X0 + (i % per) * (tw + 0.2);
            s.addShape(pres.ShapeType.rect, { x, y, w: tw, h: th, fill: { color: 'F7FAFC' }, line: { color: LINE, width: 0.75 } });
            s.addText([{ text: k.label, options: { fontSize: 10, color: SLATE, breakLine: true } }, { text: k.value, options: { fontSize: 20, bold: true, color: NAVY, breakLine: true } }, { text: k.note || '', options: { fontSize: 8, color: SLATE } }],
              { x: x + 0.08, y: y + 0.04, w: tw - 0.16, h: th - 0.08, fontFace: FONT, valign: 'top', fit: 'shrink' });
          });
          y += th + 0.25;
        } else if (b.type === 'chart') {
          ensure(3.0);
          if (b.kind === 'line' && b.categories.length) {
            s.addChart(pres.ChartType.line, b.series.map(se => ({ name: se.name, labels: b.categories, values: se.values })), {
              x: X0, y, w: CW, h: 2.85, chartColors: b.series.map(se => se.color), lineSize: 2, lineDataSymbol: 'circle', lineDataSymbolSize: 6, showLegend: true, legendPos: 'b', legendFontSize: 10, legendFontFace: FONT,
              showValue: true, dataLabelFontSize: 8, dataLabelPosition: 't', catAxisLabelFontSize: 10, valAxisLabelFontSize: 9, valGridLine: { color: 'E6EAF0', size: 0.5 },
              showTitle: true, title: b.title, titleFontSize: 12, titleColor: NAVY, titleFontFace: FONT
            });
          } else if (b.categories.length) {
            s.addChart(pres.ChartType.bar, b.series.map(se => ({ name: se.name, labels: b.categories, values: se.values })), {
              x: X0, y, w: CW, h: 2.85, barDir: 'bar', barGrouping: 'clustered', chartColors: b.series.map(se => se.color), showLegend: true, legendPos: 'b', legendFontSize: 10, legendFontFace: FONT,
              showValue: true, dataLabelFontSize: 9, dataLabelColor: '0F1B2D', catAxisLabelFontSize: 10, valAxisLabelFontSize: 9, catAxisLabelFontFace: FONT, valGridLine: { color: 'E6EAF0', size: 0.5 },
              showTitle: true, title: b.title, titleFontSize: 12, titleColor: NAVY, titleFontFace: FONT, catAxisOrientation: 'maxMin'
            });
          } else s.addText('Chart not shown: no programme has both target and joined values.', { x: X0, y, w: CW, h: 0.4, fontFace: FONT, fontSize: 11, color: SLATE });
          y += 2.95;
          if (b.note) { s.addText(b.note, { x: X0, y, w: CW, h: 0.3, fontFace: FONT, fontSize: 9, color: SLATE, italic: true }); y += 0.3; }
        } else if (b.type === 'table') {
          const rows = b.rows.length ? b.rows : [b.head.map((_, i) => i ? '' : 'None recorded')];
          // Estimate each row's wrapped height so long text rows split across slides instead of overflowing.
          const perCell = Math.max(8, Math.floor(CW / b.head.length * 13));
          const rowH = (r) => 0.14 + 0.17 * Math.max(1, ...r.map(v => Math.ceil(String(v).length / perCell)));
          const room = YMAX - 1.25 - (b.label ? 0.35 : 0) - 0.4;
          const chunks = []; let cur = [], used = 0;
          rows.forEach(r => { const h = rowH(r); if (cur.length && used + h > room) { chunks.push(cur); cur = []; used = 0; } cur.push(r); used += h; });
          if (cur.length) chunks.push(cur);
          for (let ci = 0, i = 0; ci < chunks.length; ci++, i += chunks[ci - 1].length) {
            const part = chunks[ci];
            const h = 0.4 + part.reduce((t, r) => t + rowH(r), 0) + (b.label ? 0.35 : 0);
            ensure(Math.min(h, YMAX - 1.25));
            if (b.label) { s.addText(b.label + (i ? ' (continued)' : ''), { x: X0, y, w: CW, h: 0.3, fontFace: FONT, fontSize: 12, bold: true, color: NAVY }); y += 0.35; }
            const head = b.head.map(t => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: { color: NAVY } } }));
            s.addTable([head].concat(part.map(r => r.map(v => ({ text: String(v) })))), { x: X0, y, w: CW, fontFace: FONT, fontSize: 9.5, color: '0F1B2D', border: { type: 'solid', color: LINE, pt: 0.75 }, valign: 'middle', autoPage: false, rowH: 0.3 });
            y += h - (b.label ? 0.35 : 0) + 0.15;
          }
        } else if (b.type === 'commentary') {
          ensure(1.1);
          const cw = (CW - 0.4) / 3;
          [['What changed', b.changed], ['Why it matters', b.matters], ['What follows', b.follows]].forEach(([t, v], i) => {
            s.addText([{ text: t.toUpperCase(), options: { fontSize: 9, bold: true, color: ACCENT, breakLine: true } }, { text: v, options: { fontSize: 10, color: '0F1B2D' } }],
              { x: X0 + i * (cw + 0.2), y, w: cw, h: 1.0, fontFace: FONT, valign: 'top', fit: 'shrink', fill: { color: 'F4F2EE' } });
          });
          y += 1.15;
        } else {
          const items = b.type === 'bullets' ? b.items : String(b.text).split(/\n+/);
          const h = Math.min(YMAX - 1.25, 0.3 + items.reduce((t, it) => t + 0.26 * Math.max(1, Math.ceil(it.length / 150)), 0));
          ensure(h);
          const runs = [];
          if (b.label) runs.push({ text: b.label, options: { bold: true, color: NAVY, fontSize: 12, breakLine: true } });
          items.forEach((it, i) => runs.push({ text: it, options: Object.assign({ fontSize: 11, color: '0F1B2D', breakLine: i < items.length - 1 }, b.type === 'bullets' ? { bullet: true } : {}) }));
          s.addText(runs, { x: X0, y, w: CW, h, fontFace: FONT, valign: 'top', fit: 'shrink', paraSpaceAfter: 4 });
          y += h + 0.15;
        }
      });
    });
    // Appendix: assumptions, sources, data quality
    const a = newSlide('Assumptions, sources and data quality', 'Always included');
    const half = (CW - 0.3) / 2;
    a.addText([{ text: 'Assumptions', options: { bold: true, fontSize: 12, color: NAVY, breakLine: true } }].concat(m.assumptions.map((t, i) => ({ text: t, options: { bullet: true, fontSize: 9.5, breakLine: i < m.assumptions.length - 1 } })))
      .concat([{ text: '', options: { breakLine: true } }, { text: 'Sources', options: { bold: true, fontSize: 12, color: NAVY, breakLine: true } }]).concat(m.sources.map((t, i) => ({ text: t, options: { bullet: true, fontSize: 9.5, breakLine: i < m.sources.length - 1 } }))),
      { x: X0, y: 1.25, w: half, h: 5.4, fontFace: FONT, color: '0F1B2D', valign: 'top', fit: 'shrink' });
    const dq = m.dataQuality.length ? m.dataQuality : ['No conflicts or warnings.'];
    const oq = m.openQuestions.length ? m.openQuestions : ['None.'];
    a.addText([{ text: 'Data-quality conflicts and warnings', options: { bold: true, fontSize: 12, color: NAVY, breakLine: true } }].concat(dq.map((t, i) => ({ text: t, options: { bullet: true, fontSize: 9.5, breakLine: i < dq.length - 1 } })))
      .concat([{ text: '', options: { breakLine: true } }, { text: 'Open questions for confirmation', options: { bold: true, fontSize: 12, color: NAVY, breakLine: true } }]).concat(oq.map((t, i) => ({ text: t, options: { bullet: true, fontSize: 9.5, breakLine: i < oq.length - 1 } }))),
      { x: X0 + half + 0.3, y: 1.25, w: half, h: 5.4, fontFace: FONT, color: '0F1B2D', valign: 'top', fit: 'shrink' });
    const name = fileBase(m, 'pptx');
    const blob = await pres.write({ outputType: 'blob' });
    return (await TA.download(blob, name)) ? name : null;
  }

  /* ---------- DOCX ---------- */
  async function docx(rp) {
    const m = buildModel(rp);
    const D = window.docx;
    const P = (text, o) => new D.Paragraph(Object.assign({ children: [new D.TextRun(Object.assign({ text: String(text), font: 'Segoe UI', size: 21 }, (o && o.run) || {}))], spacing: { after: 120 } }, (o && o.para) || {}));
    const H = (text, level) => new D.Paragraph({ text, heading: level, spacing: { before: 240, after: 120 } });
    const cellP = (t, head) => new D.Paragraph({ children: [new D.TextRun({ text: String(t), bold: !!head, color: head ? 'FFFFFF' : '0F1B2D', font: 'Segoe UI', size: 18 })] });
    const tbl = (head, rows) => new D.Table({ width: { size: 100, type: D.WidthType.PERCENTAGE },
      rows: [new D.TableRow({ tableHeader: true, children: head.map(h => new D.TableCell({ children: [cellP(h, true)], shading: { fill: NAVY, type: D.ShadingType.CLEAR, color: 'auto' } })) })]
        .concat((rows.length ? rows : [head.map((_, i) => i ? '' : 'None recorded')]).map(r => new D.TableRow({ children: r.map(v => new D.TableCell({ children: [cellP(v)] })) }))) });
    const children = [];
    children.push(new D.Paragraph({ children: [new D.TextRun({ text: m.title, bold: true, size: 40, color: NAVY, font: 'Segoe UI' })], spacing: { after: 120 } }));
    children.push(P(m.owner + ' · ' + m.role + ' · ' + m.org, { run: { color: SLATE } }));
    children.push(tbl(['Item', 'Detail'], [['Reporting period', m.periodLine], ['Generated', TA.fmtDateTime(m.generatedAt)], ['Prepared by', m.preparedBy], ['Confidential individual details', m.confidential ? 'INCLUDED – restricted circulation' : 'Excluded'], ['Sources', m.sources.join('; ')]]));
    m.sections.forEach(sec => {
      children.push(H(sec.title, D.HeadingLevel.HEADING_1));
      sec.blocks.forEach(b => {
        if (b.type === 'kpis') children.push(tbl(['Measure', 'Value', 'Basis'], b.items.map(k => [k.label, k.value, k.note || ''])));
        else if (b.type === 'chart') {
          children.push(H(b.title + ' (chart data)', D.HeadingLevel.HEADING_3));
          children.push(tbl([b.kind === 'line' ? 'Year' : 'Programme'].concat(b.series.map(s => s.name)), b.categories.map((c, i) => [c].concat(b.series.map(s => String(s.values[i]))))));
          if (b.note) children.push(P(b.note, { run: { italics: true, color: SLATE } }));
          else children.push(P(''));
        } else if (b.type === 'table') { if (b.label) children.push(H(b.label, D.HeadingLevel.HEADING_3)); children.push(tbl(b.head, b.rows)); children.push(P('')); }
        else if (b.type === 'commentary') { [['What changed', b.changed], ['Why it matters', b.matters], ['What follows', b.follows]].forEach(([t, v]) => children.push(new D.Paragraph({ children: [new D.TextRun({ text: t + ': ', bold: true, font: 'Segoe UI', size: 21 }), new D.TextRun({ text: v, font: 'Segoe UI', size: 21 })], spacing: { after: 80 } }))); }
        else if (b.type === 'bullets') { if (b.label) children.push(H(b.label, D.HeadingLevel.HEADING_3)); b.items.forEach(it => children.push(new D.Paragraph({ children: [new D.TextRun({ text: it, font: 'Segoe UI', size: 21 })], bullet: { level: 0 } }))); }
        else { if (b.label) children.push(H(b.label, D.HeadingLevel.HEADING_3)); String(b.text).split(/\n+/).forEach(t => children.push(P(t))); }
      });
    });
    children.push(H('Assumptions, sources and data quality', D.HeadingLevel.HEADING_1));
    const bl = (arr) => (arr.length ? arr : ['None.']).forEach(t => children.push(new D.Paragraph({ children: [new D.TextRun({ text: t, font: 'Segoe UI', size: 20 })], bullet: { level: 0 } })));
    children.push(H('Assumptions', D.HeadingLevel.HEADING_3)); bl(m.assumptions);
    children.push(H('Sources', D.HeadingLevel.HEADING_3)); bl(m.sources);
    children.push(H('Data-quality conflicts and warnings', D.HeadingLevel.HEADING_3)); bl(m.dataQuality);
    children.push(H('Open questions for confirmation', D.HeadingLevel.HEADING_3)); bl(m.openQuestions);
    const doc = new D.Document({
      creator: m.preparedBy, title: m.title, description: m.periodLine,
      styles: { default: { document: { run: { font: 'Segoe UI' } } }, paragraphStyles: [] },
      sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
        headers: { default: new D.Header({ children: [new D.Paragraph({ children: [new D.TextRun({ text: m.title + ' – ' + m.period.label + (m.confidential ? ' – CONFIDENTIAL' : ''), size: 16, color: SLATE, font: 'Segoe UI' })] })] }) },
        footers: { default: new D.Footer({ children: [new D.Paragraph({ children: [new D.TextRun({ text: footerText(m) + '  |  Page ', size: 14, color: SLATE, font: 'Segoe UI' }), new D.TextRun({ children: [D.PageNumber.CURRENT], size: 14, color: SLATE })] })] }) },
        children }]
    });
    const blob = await D.Packer.toBlob(doc);
    const name = fileBase(m, 'docx');
    return (await TA.download(blob, name)) ? name : null;
  }

  /* ---------- PDF ---------- */
  const pdfSafe = (s) => String(s).replace(/[→]/g, '->').replace(/[−]/g, '-').replace(/[≥]/g, '>=').replace(/[≤]/g, '<=').replace(/[÷]/g, '/').replace(/[✓]/g, 'ok').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x00-\xFF–—•…]/g, '?');
  async function pdf(rp) {
    const m = buildModel(rp);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const PW = doc.internal.pageSize.getWidth(), PH = doc.internal.pageSize.getHeight(), M = 40;
    let y = M;
    const rgb = (hex) => [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
    const newPage = () => { doc.addPage(); y = M; };
    const ensure = (h) => { if (y + h > PH - 50) newPage(); };
    const text = (t, size, opts) => {
      const o = opts || {};
      doc.setFont('helvetica', o.bold ? 'bold' : (o.italic ? 'italic' : 'normal')); doc.setFontSize(size); doc.setTextColor(...rgb(o.color || '0F1B2D'));
      const lines = doc.splitTextToSize(pdfSafe(t), (o.w || PW - 2 * M) - (o.indent || 0));
      lines.forEach(l => { ensure(size * 1.35); doc.text(l, M + (o.indent || 0), y + size); y += size * 1.35; });
      y += o.after === undefined ? 4 : o.after;
    };
    // Cover
    doc.setFillColor(...rgb(NAVY)); doc.rect(0, 0, PW, PH, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(28); doc.text(pdfSafe(m.title), M + 20, 170);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(14); doc.setTextColor(213, 221, 232); doc.text(pdfSafe(m.owner + ' · ' + m.role + ' · ' + m.org), M + 20, 200);
    doc.setFontSize(11); doc.setTextColor(184, 195, 211);
    [('Reporting period: ' + m.periodLine), ('Generated: ' + TA.fmtDateTime(m.generatedAt) + ' · Prepared by ' + m.preparedBy), (m.confidential ? 'CONFIDENTIAL – includes individual details. Restricted circulation.' : 'Confidential individual details excluded.'), ('Sources: ' + m.sources.join('; '))]
      .forEach((l, i) => doc.text(doc.splitTextToSize(pdfSafe(l), PW - 2 * M - 40), M + 20, 250 + i * 22));
    newPage();
    m.sections.forEach((sec, si) => {
      if (si) newPage();
      text(sec.title, 20, { bold: true, color: NAVY, after: 2 }); text(m.period.label, 10, { color: SLATE, after: 10 });
      sec.blocks.forEach(b => {
        if (b.type === 'kpis') {
          const per = 5, gap = 10, tw = (PW - 2 * M - gap * (per - 1)) / per, th = 62;
          b.items.forEach((k, i) => {
            if (i % per === 0) { ensure(th + 10); if (i) y += th + 10; }
            const x = M + (i % per) * (tw + gap);
            doc.setDrawColor(...rgb(LINE)); doc.setFillColor(247, 250, 252); doc.rect(x, y, tw, th, 'FD');
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...rgb(SLATE)); doc.text(doc.splitTextToSize(pdfSafe(k.label), tw - 12)[0], x + 6, y + 13);
            doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...rgb(NAVY)); doc.text(pdfSafe(k.value), x + 6, y + 33);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...rgb(SLATE)); doc.text(doc.splitTextToSize(pdfSafe(k.note || ''), tw - 12).slice(0, 2), x + 6, y + 45);
          });
          y += th + 14;
        } else if (b.type === 'chart' && b.kind === 'line') {
          text(b.title, 11, { bold: true, color: NAVY, after: 2 });
          doc.autoTable({ startY: y, head: [['Measure'].concat(b.categories).map(pdfSafe)], body: b.series.map(se => [se.name].concat(se.values.map(v => b.unit === '%' ? v + '%' : b.unit === 'days' ? v + ' days' : TA.fmtInt(v))).map(pdfSafe)), margin: { left: M, right: M, bottom: 50 },
            styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 4, textColor: rgb('0F1B2D'), lineColor: rgb(LINE), lineWidth: 0.5 }, headStyles: { fillColor: rgb(NAVY), textColor: 255 } });
          y = doc.lastAutoTable.finalY + 6;
          if (b.note) text(b.note, 8.5, { italic: true, color: SLATE });
        } else if (b.type === 'chart') {
          const rowH = 18, labelW = 110, h = 24 + b.categories.length * rowH * Math.max(1, b.series.length * 0.6) + 30;
          ensure(h);
          text(b.title, 11, { bold: true, color: NAVY, after: 4 });
          const max = Math.max(1, ...b.series.flatMap(s => s.values)) * 1.08;
          const plotW = PW - 2 * M - labelW - 60;
          const bh = Math.max(4, (rowH - 4) / b.series.length);
          b.categories.forEach((c, i) => {
            const ry = y + i * rowH;
            doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...rgb('0F1B2D')); doc.text(pdfSafe(c), M + labelW - 6, ry + rowH / 2 + 3, { align: 'right' });
            b.series.forEach((s, j) => {
              const v = s.values[i]; const w = v / max * plotW;
              doc.setFillColor(...rgb(s.color)); doc.rect(M + labelW, ry + 2 + j * bh, Math.max(0.5, w), bh - 1, 'F');
              doc.setFontSize(7.5); doc.text(String(v), M + labelW + w + 3, ry + 2 + j * bh + bh - 2);
            });
          });
          y += b.categories.length * rowH + 6;
          let lx = M + labelW;
          b.series.forEach(s => { doc.setFillColor(...rgb(s.color)); doc.rect(lx, y, 8, 8, 'F'); doc.setFontSize(8.5); doc.setTextColor(...rgb(SLATE)); doc.text(pdfSafe(s.name), lx + 11, y + 7.5); lx += doc.getTextWidth(pdfSafe(s.name)) + 30; });
          y += 18;
          if (b.note) text(b.note, 8.5, { italic: true, color: SLATE });
        } else if (b.type === 'table') {
          if (b.label) text(b.label, 11, { bold: true, color: NAVY, after: 2 });
          doc.autoTable({ startY: y, head: [b.head.map(pdfSafe)], body: (b.rows.length ? b.rows : [b.head.map((_, i) => i ? '' : 'None recorded')]).map(r => r.map(pdfSafe)), margin: { left: M, right: M, bottom: 50 },
            styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 4, textColor: rgb('0F1B2D'), lineColor: rgb(LINE), lineWidth: 0.5 }, headStyles: { fillColor: rgb(NAVY), textColor: 255 }, alternateRowStyles: { fillColor: [247, 250, 252] } });
          y = doc.lastAutoTable.finalY + 12;
        } else if (b.type === 'commentary') {
          [['What changed', b.changed], ['Why it matters', b.matters], ['What follows', b.follows]].forEach(([t, v]) => { text(t.toUpperCase(), 8, { bold: true, color: ACCENT, after: 0 }); text(v, 9.5, { after: 6 }); });
        } else if (b.type === 'bullets') { if (b.label) text(b.label, 11, { bold: true, color: NAVY, after: 2 }); b.items.forEach(it => text('•  ' + it, 10, { indent: 6, after: 2 })); y += 6; }
        else { if (b.label) text(b.label, 11, { bold: true, color: NAVY, after: 2 }); String(b.text).split(/\n+/).forEach(t => text(t, 10)); }
      });
    });
    newPage();
    text('Assumptions, sources and data quality', 20, { bold: true, color: NAVY, after: 10 });
    [['Assumptions', m.assumptions], ['Sources', m.sources], ['Data-quality conflicts and warnings', m.dataQuality.length ? m.dataQuality : ['None.']], ['Open questions for confirmation', m.openQuestions.length ? m.openQuestions : ['None.']]]
      .forEach(([t, arr]) => { text(t, 12, { bold: true, color: NAVY, after: 2 }); arr.forEach(x => text('•  ' + x, 9.5, { indent: 6, after: 1 })); y += 8; });
    const n = doc.getNumberOfPages();
    for (let i = 2; i <= n; i++) {
      doc.setPage(i);
      doc.setDrawColor(...rgb(LINE)); doc.line(M, PH - 38, PW - M, PH - 38);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...rgb(SLATE));
      doc.text(doc.splitTextToSize(pdfSafe(footerText(m)), PW - 2 * M - 60).slice(0, 2), M, PH - 28);
      doc.text('Page ' + i + ' of ' + n, PW - M, PH - 28, { align: 'right' });
    }
    const name = fileBase(m, 'pdf');
    return (await TA.download(doc.output('blob'), name)) ? name : null;
  }

  TA.narrativeDraft = narrativeDraft;
  TA.buildReportModel = buildModel;
  TA.Exports = { pptx, docx, pdf };
})();
