/* Page renderers. Each returns an HTML string; actions are global functions. */

const VIEWS = {};
const pts = (v, max) => v == null ? `<span class="muted">—</span><small> /${max}</small>` : `${fmt(v)}<small> /${max}</small>`;
const pct = v => v == null ? '—' : fmt(v) + '%';
const statusOf = m => statusChip(m.status);
const provChip = () => anyPending() ? `<span data-tip="One or more scoring rules are awaiting stakeholder decision (see Rules &amp; Settings). Scores may change.">${statusChip('prov')}</span>` : '';
const sectionActions = (id, key, extra = '') => `<div class="actions">${extra}<button class="btn sm" onclick="sectionReport('${id}','${key}','pdf')">Download PDF</button><button class="btn sm" onclick="sectionReport('${id}','${key}','xls')">Download Excel</button></div>`;

// ================= MEMBER VIEW =================
VIEWS.me = () => memberView(ui.emp, 'self');
VIEWS.member = () => {
  const list = sortedEmployees();
  if (!ui.member || !emp(ui.member)) ui.member = list[0].id;
  const sel = `<label class="field">Team member <select onchange="ui.member=this.value;render()">${list.map(e => `<option value="${e.id}" ${e.id === ui.member ? 'selected' : ''}>${esc(e.name)} — ${esc(teamName(e.team))} (${esc(roleOf(e).name)}${isFormer(e) ? ', former' : ''})</option>`).join('')}</select></label>`;
  return `<div class="filters">${sel}</div>` + memberView(ui.member, 'head');
};

function memberView(id, viewer) {
  const m = metrics(id), e = m.e, head = viewer === 'head';
  const selfTot = m.selfTotal, mgrTot = m.total;
  const gap = selfTot != null && mgrTot != null ? r1(selfTot - mgrTot) : null;
  const reqs = state.requests.filter(r => r.emp === id && ['Sent', 'Viewed'].includes(r.status));
  const tl = teamLead(e.team);
  let h = `<section class="card"><div class="hdr"><div>
      <h1>${esc(e.name)} <span class="chip">${esc(m.role.name)}</span>${isFormer(e) ? ` <span class="chip st-watch">Former team member${e.end ? ' · left ' + D.nice(e.end) : ''}</span>` : e.end ? ` <span class="chip">Last working day ${D.nice(e.end)}</span>` : ''}${!inReview(e) ? ' <span class="chip">Not in this year\'s evaluation</span>' : ''}</h1>
      ${head && (e.flags || []).length ? `<div class="note warn small"><b>To confirm:</b> ${e.flags.map(esc).join(' · ')}</div>` : ''}
      <dl><div><dt>Team</dt><dd>${esc(teamName(e.team))}</dd></div><div><dt>Business area</dt><dd>${esc(e.area)}</dd></div>
      <div><dt>Job level</dt><dd>${esc(e.level || '—')}</dd></div>${e.jobTitle ? `<div><dt>Job title</dt><dd>${esc(e.jobTitle)}</dd></div>` : ''}<div><dt>Reports to</dt><dd>${isLead(e) ? 'TA Head' : tl && tl.id !== e.id ? esc(tl.name) + ' (TL) · TA Head' : e.leadName ? esc(e.leadName) + ' (TL) · TA Head' : 'TA Head'}</dd></div>
      ${e.joined ? `<div><dt>With the team since</dt><dd>${D.nice(e.joined)}</dd></div>` : ''}
      ${head && e.aliases ? `<div><dt>Also known as</dt><dd class="small">${esc(e.aliases)}</dd></div>` : ''}
      ${e.roleNote ? `<div><dt>Role (org chart)</dt><dd class="small">${esc(e.roleNote)}</dd></div>` : ''}
      ${(e.alsoTeams || []).length ? `<div><dt>Also supports</dt><dd>${e.alsoTeams.map(t => esc(teamName(t))).join(', ')}</dd></div>` : ''}
      <div><dt>Review period</dt><dd>${PERIOD.label}</dd></div><div><dt>Points target</dt><dd>${m.mode === 'support' ? 'Not applicable' : fmt(annualPoints(e)) + ' per year' + (e.ptAnnual != null ? ' (personal target)' : m.mode === 'summary' ? ' (' + fmt(m.own.target) + ' offers × ' + m.ppo + ')' : ' (' + fmt(m.target) + ' offers per 10 days × ' + m.ppo + ')')}${head && m.mode !== 'support' ? ` <button class="btn link small" onclick="pointsTargetDlg('${e.id}')">Edit</button>` : ''} ${m.mode === 'tx' && AREAS[e.area] && AREAS[e.area].status === 'placeholder' ? statusChip('pending', true, 'Placeholder') : ''}</dd></div></dl>
    </div><div class="actions" style="flex-direction:column;align-items:flex-end">
      <div class="actions"><span class="chip">Self ${selfTot == null ? '—' : fmt(selfTot)}</span><span class="chip">TA Head ${mgrTot == null ? '—' : fmt(mgrTot)}</span><span class="chip">Gap ${gap == null ? '—' : (gap > 0 ? '+' : '') + gap}</span></div>
      <div class="actions">${statusOf(m)} ${provChip()} ${state.review[id] && state.review[id].finalised ? statusChip('approved', true, 'Final') : '<span class="chip">Draft</span>'}</div>
      <div class="actions">${head ? `<button class="btn sm" onclick="previewAs('${id}')">See their dashboard</button><button class="btn sm" onclick="newRequestDlg('${id}')">Request input</button>` : ''}<button class="btn sm pri" onclick="openReportBuilder('${id}','annual')">Annual report</button></div>
    </div></div></section>`;
  if (viewer === 'self') {
    const items = [];
    if (reqs.length) items.push(`<a href="#requests">${reqs.length} request(s) need your response</a>`);
    const q4 = (state.assessments[id] || []).find(a => a.period === 'Q4');
    if (!q4 || q4.selfPending) items.push(`<span>Q4 self-assessment due by ${D.nice('2026-12-18')}</span> <button class="btn sm" onclick="selfAssessDlg('${id}')">Start now</button>`);
    const od = (state.idp[id] || []).filter(i => i.status !== 'Completed' && i.due < PERIOD.cutoff).length;
    if (od) items.push(`<span>${od} development action(s) overdue</span>`);
    if (items.length) h += `<div class="alert" role="status"><b>To do:</b> ${items.join(' · ')}</div>`;
  }
  h += `<nav class="secnav" aria-label="Sections"><a href="#s-del" onclick="jump(event,'s-del')">Deliverables</a><a href="#s-beh" onclick="jump(event,'s-beh')">Behaviours</a><a href="#s-proj" onclick="jump(event,'s-proj')">Projects</a><a href="#s-comp" onclick="jump(event,'s-comp')">Competency</a><a href="#s-idp" onclick="jump(event,'s-idp')">Development plan</a><a href="#s-rec" onclick="jump(event,'s-rec')">Recommendations</a>${head ? `<a href="#s-prof" onclick="jump(event,'s-prof')">Profile &amp; history</a>` : ''}</nav>`;

  // score cards
  const delSub = m.mode === 'support' ? 'Not applicable to this role (template pending D-47)' : m.mode === 'summary' && m.deliverables == null ? `${fmt(m.ownDel.raw)} of ${m.ownDel.maxAvail} available · offer score needs offer-level data` : m.isTL ? (state.rules.tlModel === 'TL-A' ? 'TL-A: team goal 35 + own delivery 35' : 'TL-B: team 40 + own 20') : 'Offers 40 · Joining 15 · Cycle 10 · Vendor 5';
  const tlb = m.isTL && state.rules.tlModel === 'TL-B';
  h += `<div class="grid g4" style="margin-bottom:16px">
    <div class="kpi"><div class="lab">Business Deliverables</div><div class="val">${pts(m.deliverables, tlb ? 60 : 70)}</div><div class="sub">${delSub}</div></div>
    <div class="kpi"><div class="lab">${tlb ? 'Leadership effectiveness' : 'Improvement Projects'}</div><div class="val">${tlb ? pts(m.cd.mgr && m.cd.mgr.lead, 20) : pts(m.projects, 15)}</div><div class="sub">${tlb ? 'TA Head assessed' : 'TA Head validated DMAIC · self ' + (m.projectsSelf == null ? '—' : m.projectsSelf)}</div></div>
    <div class="kpi"><div class="lab">Competency Development</div><div class="val">${pts(tlb && m.cdM != null ? r1(m.cdM * 20 / 15) : m.cdM, tlb ? 20 : 15)}</div><div class="sub">Growth 7 · Application 5 · Plan 3 · self ${m.cdS == null ? '—' : m.cdS}</div></div>
    <div class="kpi"><div class="lab">Total (TA Head)</div><div class="val">${pts(m.total, 100)}</div><div class="sub">${m.total == null ? 'Partial: ' + fmt(m.partial) + ' — some pillars not yet scored' : 'Behaviours are coaching-only (not weighted)'}</div></div></div>`;

  // deliverables
  if (m.mode === 'support') h += `<section class="card" id="s-del"><header><h2>Business Deliverables</h2></header><p>Not applicable: <b>${esc(m.role.name)}</b> is a support role without hiring targets. The score covers Improvement Projects and Competency Development (out of 30) until a support-role template is agreed (D-47).</p></section>`;
  else if (m.mode === 'summary') h += summaryDeliverables(m, head);
  else {
  h += `<section class="card" id="s-del"><header><h2>Business Deliverables</h2><span class="tag calc">Calculated</span>${sectionActions(id, 'deliverables', `<button class="btn sm" onclick="offersDlg('${id}')">View offers</button>`)}</header>`;
  if (m.isTL && !m.team) h += `<div class="note warn">No team members are assigned to ${esc(teamName(e.team))} as their primary team, so the team-goal part of the Team Lead scorecard is empty. Assign members in <a href="#setup">Team Setup</a>.</div>`;
  if (m.isTL && m.team) {
    const t = m.team;
    h += `<h3>Team goal achievement <span class="muted small">(${t.members.length} members, TL's own offers excluded · ${statusChip('pending', true, 'Proposed model — D-21/D-23')})</span></h3>
      <div class="grid g5">${kpiOffers(t, null, 'Team offers (closed cycles)')}${kpiPoints(t)}${kpiJR(t, null)}${kpiCT(t, null)}${kpiVendor(t, null)}</div>
      <p class="small muted">Team deliverables score: <b>${fmt(m.teamDel.total)}</b> /70 → contributes ${state.rules.tlModel === 'TL-A' ? '35' : '40'} points max.</p>
      <div class="grid g2">${cadenceChart(t.cycles, { title: pointsBasis() ? 'Team points per 10-day cycle vs combined points target' : 'Team offers per 10-day cycle vs combined target' })}${cumulativeChart(t.cycles, 'Team YTD cumulative offers vs expected')}</div>
      <h3 style="margin-top:14px">Own delivery <span class="muted small">(target ${fmt(m.target)} offers = ${fmt(m.target * m.ppo)} points per 10 working days; ${Math.round(state.rules.tlTargetShare * 100)}% of a team member's target)</span></h3>`;
  }
  const b = m.own, ov = state.overrides.filter(o => o.emp === id);
  h += `<div class="grid g5">${kpiOffers(b, ov, 'Offers (closed cycles)', id, head)}${kpiPoints(b)}${kpiJR(b, ov, id, head)}${kpiCT(b, ov, id, head)}${kpiVendor(b, ov, id, head)}</div>
    <p class="small muted">Own deliverables: <b>${fmt(m.ownDel.total)}</b> /70${m.ownDel.rescaled ? ' (rescaled: a KPI has no data yet — D-06)' : ''}. Eligible working days to cut-off: ${b.days}${e.leave ? ` (excludes ${esc(e.leave[2])} ${D.nice(e.leave[0])}–${D.nice(e.leave[1])} — D-08)` : ''}${e.start ? ` · joined ${D.nice(e.start)}` : ''}.</p>
    <div class="grid g2">${cadenceChart(b.cycles)}${cumulativeChart(b.cycles)}</div>
    <h3 style="margin-top:12px">Hiring mix</h3>${mixTable(b)}</section>`;
  }

  // behaviours
  h += behaviourSection(m, head);
  h += projectSection(m, head, viewer);
  h += competencySection(m, head, viewer);
  h += idpSection(m, head, viewer);
  // recommendations
  const recs = recommendations(id).filter(r => head || r.vis === 'all');
  h += `<section class="card" id="s-rec"><header><h2>Recommendations</h2><span class="tag">Rule-based · advisory</span></header>
    <p class="small muted">Each item separates the <b>FACT</b> from data from the <b>SUGGESTION</b>. Suggestions are for discussion; the TA Head decides.</p>
    ${recs.map(r => `<div class="rec">${r.vis === 'head' ? '<span class="conf">TA Head only — Strictly confidential</span> ' : ''}<b>${esc(r.area)}</b><div class="fact">FACT</div><pre>${esc(r.fact)}</pre><div class="sugg">SUGGESTION</div><div>${esc(r.suggestion)}</div></div>`).join('') || '<p class="empty">No recommendations yet.</p>'}</section>`;
  if (head) h += profileSection(e);
  // comments
  const c = state.comments[id] || {};
  h += `<section class="card"><header><h2>Comments</h2></header><div class="grid g2">
    <div><h4>TA Head comment</h4><p>${esc(c.mgr || '—')}</p>${head ? `<button class="btn sm" onclick="commentDlg('${id}','mgr')">Edit</button>` : ''}</div>
    <div><h4>Employee comment</h4><p>${esc(c.emp || '—')}</p>${!head ? `<button class="btn sm" onclick="commentDlg('${id}','emp')">Edit</button>` : ''}</div></div></section>`;
  return h;
}
function summaryDeliverables(m, head) {
  const b = m.own, sc = b.sc, id = m.e.id, ov = state.overrides.filter(o => o.emp === id);
  const att = b.pointsFormal != null && b.pointsTargetFormal ? b.pointsFormal / b.pointsTargetFormal : null;
  const st = att == null ? 'none' : att >= 1 ? 'good' : att >= .85 ? 'watch' : 'below';
  const streams = sc.streams || {};
  let h = `<section class="card" id="s-del"><header><h2>Business Deliverables</h2><span class="tag">From summary scorecard</span>${sectionActions(id, 'deliverables', head ? `<button class="btn sm pri" onclick="scorecardDlg('${id}')">${b.pointsFormal == null ? 'Enter points' : 'Edit scorecard'}</button>` : '')}</header>
   <div class="note">Source: ${esc(sc.source || 'recruiter scorecard')}, ${D.nice(PERIOD.start)} – ${D.nice(sc.asOf)}. Performance is assessed on <b>weighted points</b> against a <b>points target = offer target × ${m.ppo}</b>. Offer-level data is not loaded, so 10-day cycles are not shown${b.pointsFormal == null ? ' and the <b>weighted points are not yet recorded</b>. Enter them from the ATS points report, or import offer-level data so the dashboard calculates them' : ''}.</div>`;
  if (m.isTL && !m.team) h += `<div class="note warn">No team members are assigned to ${esc(teamName(m.e.team))} as their primary team, so the team-goal part of the Team Lead scorecard is empty. Assign members in <a href="#setup">Team Setup</a>, or change this person's role.</div>`;
  if (m.isTL && m.team) { const t = m.team, ta = t.pointsFormal != null && t.pointsTargetFormal ? t.pointsFormal / t.pointsTargetFormal : null;
    h += `<h3>Team goal (${t.members.length} member${t.members.length === 1 ? '' : 's'}, lead excluded)</h3><div class="grid g4">
     <div class="kpi"><div class="lab">Team points vs points target</div><div class="val">${t.pointsFormal == null ? '—' : fmt(t.pointsFormal)} <small>of ${fmt(t.pointsTargetFormal)}</small></div>${progressBar(t.pointsFormal || 0, t.pointsTargetFormal)}<div class="sub">${ta == null ? 'Needs points for every member' : Math.round(ta * 100) + '%'} · ${t.actualYTD} offers</div></div>
     <div class="kpi"><div class="lab">Team joiners ÷ offers</div><div class="val">${pct(t.jr)}</div></div>
     <div class="kpi"><div class="lab">Team avg offer days</div><div class="val">${fmt(t.ctAvg)}</div><div class="sub">offer-weighted</div></div>
     <div class="kpi"><div class="lab">Team vendor usage</div><div class="val">${pct(t.vendorPct)}</div><div class="sub">offer-weighted</div></div></div><h3 style="margin-top:12px">Own delivery</h3>`; }
  h += `<div class="grid g5">
   <div class="kpi"><div class="lab">Weighted points vs points target</div><div class="val">${b.pointsFormal == null ? '—' : fmt(b.pointsFormal)} <small>of ${fmt(b.pointsTargetFormal)} (pro-rated)</small></div>${progressBar(b.pointsFormal || 0, b.pointsTargetFormal)}
     <div class="sub">${att == null ? 'Points not recorded' : Math.round(att * 100) + '% of pro-rated target'} ${statusChip(st)}</div><div class="sub">Full-year points target ${fmt(b.pointsTargetFull)}</div>
     <div class="sub">Score <b>${fmt((ov.find(o => o.measure === 'offer') || {}).revised ?? b.offer.score)}</b>/40</div>${ovBadge(ov, 'offer')}
     <details><summary>How calculated</summary>Points target = offer target ${sc.target ?? '—'} × ${m.ppo} = ${fmt(b.pointsTargetFull)} per year, pro-rated by working days elapsed (${b.elapsed} of ${b.yearDays})${m.e.end ? ' to leaving date ' + D.nice(m.e.end) : ''} = ${fmt(b.pointsTargetFormal)}. Score = 40 × points ÷ pro-rated points target, capped at 40.</details>${ovBtn(id, 'offer', head)}</div>
   <div class="kpi"><div class="lab">Offers (context)</div><div class="val">${sc.offers} <small>of ${fmt(b.expectedFormal)} pro-rated</small></div><div class="sub">${b.pointsFormal != null && sc.offers ? fmt(b.pointsFormal / sc.offers, 2) + ' points per offer (target assumes ' + m.ppo + ')' : 'Full-year offer target ' + (sc.target ?? '—')}</div><div class="sub">Joiners ${sc.joiners}</div></div>
   ${kpiJR(b, ov, id, head).replace('matured', 'offers').replace('How calculated</summary>', 'How calculated</summary><b>Approximation:</b> joiners ÷ offers from the scorecard, not maturity-adjusted; joiners can include earlier offers. ')}
   ${kpiCT(b, ov, id, head).replace('days avg', 'offer days').replace('Median —', 'Median n/a')}
   ${kpiVendor(b, ov, id, head).replace(/<div class="sub">.* vendor of .* applicable<\/div>/, '<div class="sub">Scorecard figure (excludes campus)</div>')}</div>
   <p class="small muted">Deliverables: <b>${m.ownDel.total != null ? fmt(m.ownDel.total) + ' / 70' : fmt(m.ownDel.raw) + ' of ' + m.ownDel.maxAvail + ' available (points needed for the 40-point score)'}</b>. ${sc.note ? esc(sc.note) : ''}</p>`;
  const rows = ['core', 'nats', 'excelher', 'other'].filter(k => streams[k] != null || (sc.joinStreams || {})[k] != null);
  if (rows.length) h += `<h3>Offers and joiners by stream</h3><div class="tbl-wrap"><table><thead><tr><th>Stream</th><th class="n">Offers</th><th class="n">Joiners</th></tr></thead><tbody>${rows.map(k => `<tr><td>${{ core: 'Core / campus (incl. conversion)', nats: 'NATS', excelher: 'ExcelHER', other: 'Other (interns, PwD, PhD, veterans, SPARK)' }[k]}</td><td class="n">${streams[k] ?? '—'}</td><td class="n">${(sc.joinStreams || {})[k] ?? '—'}</td></tr>`).join('')}</tbody></table></div>`;
  if (sc.tracker) { const t = sc.tracker; h += `<h3 style="margin-top:12px">Lateral and fresher hiring (hiring tracker)</h3><div class="grid g4">
    <div class="kpi"><div class="lab">Offers released</div><div class="val">${t.offers ?? '—'}</div><div class="sub">${esc(t.period || '')}</div></div><div class="kpi"><div class="lab">Joined</div><div class="val">${t.joined ?? '—'}</div></div>
    <div class="kpi"><div class="lab">Declined</div><div class="val">${t.declined ?? '—'}</div></div><div class="kpi"><div class="lab">Pending joining</div><div class="val">${t.pending ?? '—'}</div></div></div>
    <p class="small muted">${esc(t.note || '')}</p>`;
    if (t.mix && t.mix.length) h += `<h4>Weighted points by offer category</h4><div class="tbl-wrap"><table><thead><tr><th>Category</th><th class="n">Offers</th><th class="n">Points each</th><th class="n">Women +0.5</th><th class="n">Points</th></tr></thead><tbody>${t.mix.map(([c, n, base, bonus]) => `<tr><td>${esc(c)}</td><td class="n">${n}</td><td class="n">${fmt(base / n, 1)}</td><td class="n">${fmt(bonus, 1)}</td><td class="n">${fmt(base + bonus, 1)}</td></tr>`).join('')}
      <tr><td><b>Total</b></td><td class="n"><b>${t.offers}</b></td><td></td><td class="n">${fmt(t.pointsBonus, 1)}</td><td class="n"><b>${fmt(t.points, 1)}</b></td></tr></tbody></table></div>
      <p class="small muted">${t.pointsExclDeclined != null ? 'Excluding declined offers: ' + fmt(t.pointsExclDeclined, 1) + ' points. ' : ''}${esc(sc.pointsSource || '')}</p>`; }
  h += `<div class="grid g4" style="margin-top:10px"><div class="kpi"><div class="lab">Days to join</div><div class="val">${sc.joinDays ?? '—'}</div></div><div class="kpi"><div class="lab">Offers declined</div><div class="val">${pct(sc.declinedPct)}</div></div><div class="kpi"><div class="lab">Gender diversity</div><div class="val">${pct(sc.diversityPct)}</div><div class="sub">denominator not stated in source</div></div><div class="kpi"><div class="lab">Referral share</div><div class="val">${pct(sc.referralPct)}</div></div></div></section>`;
  return h;
}
function jump(ev, id) { ev.preventDefault(); const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth' }); }

function ovBadge(ov, k) { const o = ov && ov.find(x => x.measure === k); return o ? `<div class="sub" data-tip="${esc('Original ' + o.original + ' → ' + o.revised + ' · ' + o.reason + ' · ' + o.by + ' ' + o.at)}">⚑ Override: ${o.original} → ${o.revised}</div>` : ''; }
function ovBtn(id, k, head) { return head ? `<button class="btn link small" onclick="overrideDlg('${id}','${k}')">Override…</button>` : ''; }
function kpiOffers(b, ov, label, id, head) {
  const P = pointsBasis();
  const att = P ? (b.pointsTargetFormal && b.pointsFormal != null ? b.pointsFormal / b.pointsTargetFormal : null) : (b.expectedFormal ? b.actualFormal / b.expectedFormal : null);
  const st = att == null ? 'none' : att >= 1 ? 'good' : att >= .85 ? 'watch' : 'below';
  const ppoTxt = b.ppo != null ? b.ppo : state.rules.pointsPerOffer;
  return `<div class="kpi"><div class="lab">${P ? label.replace(/offers/i, 'Points') + ' vs points target' : label}</div>
   <div class="val">${P ? `${fmt(b.pointsFormal)} <small>of ${fmt(b.pointsTargetFormal)} points</small>` : `${b.actualFormal} <small>of ${fmt(b.expectedFormal)} expected</small>`}</div>
   ${progressBar(P ? b.pointsFormal : b.actualFormal, P ? b.pointsTargetFormal : b.expectedFormal, 'Attainment')}<div class="sub">${att == null ? '—' : Math.round(att * 100) + '%'} ${P ? 'points' : 'volume'} · ${statusChip(st)}</div>
   ${P ? `<div class="sub">${b.actualFormal} offers vs ${fmt(b.expectedFormal)} offer target (context only)</div>` : ''}
   <div class="sub">Score <b>${fmt(b.offer.score)}</b>/40 ${b.offer.gated ? '· capped by volume gate' : ''}</div>${ovBadge(ov, 'offer')}
   <details><summary>How calculated</summary>${P ? `Points target = offer target × ${ppoTxt} points per offer (TA Head decision, 18 Oct 2026) = ${fmt(b.expectedFormal)} × ${ppoTxt} = ${fmt(b.pointsTargetFormal)} for closed cycles. Score = 40 × points ÷ points target, capped at 40.` : `Expected = closed cycles × target. Formula ${state.rules.offerFormula}: ${esc(b.offer.how || '')}.`} YTD incl. partial cycle: ${fmt(b.pointsYTD)} points, ${b.actualYTD} offers.</details>${id ? ovBtn(id, 'offer', head) : ''}</div>`;
}
function kpiPoints(b) {
  return `<div class="kpi"><div class="lab">Hiring mix &amp; complexity</div><div class="val">${b.actualYTD ? fmt(b.pointsYTD / b.actualYTD, 2) : '—'} <small>points per offer</small></div><div class="sub">Assumed in target: ${b.ppo != null ? b.ppo : state.rules.pointsPerOffer}</div>
   <div class="sub">YTD ${fmt(b.pointsYTD)} · women bonus ${fmt(b.bonusYTD != null ? b.bonusYTD : 0)}</div><div class="sub">Contribution index ${b.expectedFormal ? fmt(b.pointsFormal / b.expectedFormal, 2) : '—'} <span data-tip="Definition pending (D-04): shown as points ÷ expected offers">ⓘ</span></div>
   <details><summary>How calculated</summary>Per offer: base points + 0.5 women bonus where eligible, from ${esc(POINT_TABLES[state.rules.pointsTable].label)} (D-01: BRD tables conflict).</details></div>`;
}
function kpiJR(b, ov, id, head) {
  const st = b.jr == null ? 'none' : b.jr >= 90 ? 'good' : b.jr >= state.rules.jrException ? 'watch' : 'below';
  return `<div class="kpi"><div class="lab">Joining ratio</div><div class="val">${pct(b.jr)}</div><div class="sub">${b.joined} joined of ${b.matured} matured · ${b.pending != null ? b.pending + ' not yet due' : ''}</div>
   <div class="sub">${statusChip(st)} Score <b>${b.jrScore == null ? '—' : b.jrScore}</b>/15</div>${ovBadge(ov, 'jr')}
   <details><summary>How calculated</summary>Joiners ÷ offers whose expected joining date has passed (cut-off ${D.nice(PERIOD.cutoff)}). Declined ${b.declined != null ? b.declined : '—'} · No-show ${b.noshow != null ? b.noshow : '—'}. Bands ≥90 15 · 85 13 · 80 11 · 75 8 · else 5 (indicative, D-05).</details>${id ? ovBtn(id, 'jr', head) : ''}</div>`;
}
function kpiCT(b, ov, id, head) {
  const st = b.ctAvg == null ? 'none' : b.ctAvg < 45 ? 'good' : b.ctAvg <= 55 ? 'watch' : 'below';
  return `<div class="kpi"><div class="lab">Req-to-offer cycle time</div><div class="val">${fmt(b.ctAvg)} <small>days avg</small></div><div class="sub">Median ${fmt(b.ctMedian)} · ${ctLabel(b.ctAvg)}</div>
   <div class="sub">${statusChip(st, true, ctLabel(b.ctAvg))} Score <b>${b.ctScore == null ? '—' : b.ctScore}</b>/10</div>${ovBadge(ov, 'ct')}
   <details><summary>How calculated</summary>Average of (offer release − requisition created), calendar days (D-07). ${b.ctExcluded ? b.ctExcluded + ' offer(s) excluded by approved exception; originals still shown in offer list.' : 'No approved exclusions.'} &lt;45 = 10 · 45–55 = 7 · &gt;55 = 4.</details>${id ? ovBtn(id, 'ct', head) : ''}</div>`;
}
function kpiVendor(b, ov, id, head) {
  const st = b.vendorPct == null ? 'none' : b.vendorPct < 10 ? 'good' : b.vendorPct <= 20 ? 'watch' : 'below';
  return `<div class="kpi"><div class="lab">Vendor usage</div><div class="val">${pct(b.vendorPct)}</div><div class="sub">${b.vendor} vendor of ${b.applicable} applicable</div>
   <div class="sub">${statusChip(st)} Score <b>${b.vendorScore == null ? '—' : b.vendorScore}</b>/5</div>${ovBadge(ov, 'vendor')}
   <details><summary>How calculated</summary>Vendor offers ÷ applicable offers. Excluded from denominator (assumption, D-11): ${esc(state.rules.vendorExcluded.join(', '))}. &lt;10% = 5 · 10–20% = 3 · &gt;20% = 1.</details>${id ? ovBtn(id, 'vendor', head) : ''}</div>`;
}
function mixTable(b) {
  const rows = Object.entries(b.mix).sort((a, c) => c[1].points - a[1].points);
  if (!rows.length) return '<p class="empty">No offers yet.</p>';
  return `<div class="tbl-wrap"><table><thead><tr><th>Hiring category</th><th class="n">Offers</th><th class="n">Women</th><th class="n">Points / offer</th><th class="n">Women bonus</th><th class="n">Total points</th></tr></thead><tbody>
   ${rows.map(([k, v]) => { const r = POINT_TABLES[state.rules.pointsTable].rows[k] || [0, false]; const conflict = POINT_TABLES.S53.rows[k] && (POINT_TABLES.S53.rows[k][0] !== POINT_TABLES.A3.rows[k][0] || POINT_TABLES.S53.rows[k][1] !== POINT_TABLES.A3.rows[k][1]);
     return `<tr><td>${esc(k)} ${conflict ? '<span data-tip="BRD §5.3 and Appendix A3 disagree for this category (D-01)">' + statusChip('pending', true, 'Rule conflict') + '</span>' : ''}</td><td class="n">${v.n}</td><td class="n">${v.women}</td><td class="n">${r[0]}${r[1] ? ' (+0.5)' : ''}</td><td class="n">${fmt(v.bonus)}</td><td class="n">${fmt(v.points)}</td></tr>`; }).join('')}
   <tr class="grp"><td>Total</td><td class="n">${b.actualYTD}</td><td class="n">${sum(rows.map(r => r[1].women))}</td><td></td><td class="n">${fmt(b.bonusYTD)}</td><td class="n">${fmt(b.pointsYTD)}</td></tr></tbody></table></div>`;
}

function behaviourSection(m, head) {
  const e = m.e, L = m.latest, prev = m.hist.length > 1 ? m.hist[m.hist.length - 2] : null;
  let h = `<section class="card" id="s-beh"><header><h2>Behaviours &amp; areas for improvement</h2><span class="tag">Coaching layer · not weighted</span>
    ${sectionActions(e.id, 'behaviour', head ? `<button class="btn sm pri" onclick="mgrAssessDlg('${e.id}')">Rate next period</button>` : `<button class="btn sm pri" onclick="selfAssessDlg('${e.id}')">Self-assess next period</button>`)}</header>`;
  if (m.inProgress) h += `<div class="note">${esc(m.inProgress.period)} in progress: ${m.inProgress.mgrPending ? 'self-assessment submitted; TA Head rating pending' : 'TA Head rating submitted; self-assessment pending'}. The table shows the last completed period.</div>`;
  if (!L) return h + '<p class="empty">No completed assessments yet.</p></section>';
  h += `<p class="small muted">Latest: <b>${esc(L.period)}</b> (${D.nice(L.date)}). Scale 1 Basic · 2 Developing · 3 Effective · 4 Advanced · 5 Strategic. The gap is a discussion signal, not a judgement.</p>
   <div class="tbl-wrap"><table><thead><tr><th>Competency</th><th class="n">Previous (TA Head)</th><th class="n">Self</th><th class="n">TA Head</th><th class="n">Gap</th><th class="n">Target</th><th>Employee evidence</th><th>TA Head evidence</th></tr></thead><tbody>
   ${COMPETENCIES.map(c => { const hasS = L.self[c] != null; const g = hasS ? L.self[c] - L.mgr[c] : null; const big = hasS && Math.abs(g) > state.rules.gapThreshold;
     return `<tr><td>${esc(c)}</td><td class="n">${prev ? prev.mgr[c] : '—'}</td><td class="n">${hasS ? L.self[c] : '—'}</td><td class="n">${L.mgr[c]}</td><td class="n">${g == null ? '—' : (g > 0 ? '+' : '') + g} ${big ? '<span class="chip st-watch">▲ discuss</span>' : ''}</td><td class="n">${e.targets[c]}${L.mgr[c] < e.targets[c] ? ' <span class="muted">(−' + (e.targets[c] - L.mgr[c]) + ')</span>' : ''}</td><td class="small">${esc(L.selfEvidence[c] || '')}</td><td class="small">${esc(L.mgrEvidence[c] || '')}</td></tr>`; }).join('')}</tbody></table></div>`;
  // areas for improvement
  const afi = deriveAFI(m);
  h += `<h3 style="margin-top:12px">Areas for improvement</h3>${afi.length ? `<div class="tbl-wrap"><table><thead><tr><th>Area</th><th>Evidence</th><th>Expected behaviour</th><th>Action</th><th>Target date</th><th>Status</th></tr></thead><tbody>${afi.map(a => `<tr><td>${esc(a.area)}</td><td class="small">${esc(a.evidence)}</td><td class="small">${esc(a.expected)}</td><td class="small">${esc(a.action)}</td><td>${D.nice(a.due)}</td><td>${esc(a.status)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="empty">None identified.</p>'}
   ${head ? `<button class="btn sm" onclick="afiDlg('${e.id}')">Add observation</button>` : ''}</section>`;
  return h;
}
function deriveAFI(m) {
  const out = [], R = state.rules, b = m.own;
  if (b.missRun >= R.repeatMissN) out.push({ area: 'Delivery consistency', evidence: `${b.missRun} consecutive 10-day cycles below target`, expected: 'Meet cadence each cycle', action: 'Weekly pipeline review with TA Head', due: D.add(PERIOD.cutoff, 30), status: 'Open' });
  if (b.ctAvg != null && b.ctAvg > R.ctBands.acceptable) out.push({ area: 'Cycle time', evidence: `Average ${r1(b.ctAvg)} days`, expected: 'Average below 55 days', action: 'Escalate ageing reqs at day 30', due: D.add(PERIOD.cutoff, 45), status: 'Open' });
  if (m.latest) COMPETENCIES.forEach(c => { if (m.e.targets[c] - m.latest.mgr[c] > R.belowTargetBy) out.push({ area: c, evidence: `TA Head rating ${m.latest.mgr[c]} vs target ${m.e.targets[c]}`, expected: LEVEL_ANCHORS[m.e.targets[c]] + ' level behaviours', action: IDP_LIBRARY[c][2], due: D.add(PERIOD.cutoff, 90), status: 'Open' }); });
  return out.concat(state.afi[m.e.id] || []);
}

function projectSection(m, head, viewer) {
  const e = m.e;
  let h = `<section class="card" id="s-proj"><header><h2>Improvement projects (DMAIC)</h2>${sectionActions(e.id, 'projects', viewer === 'self' ? `<button class="btn sm" onclick="projectDlg('${e.id}')">Add project</button>` : '')}</header>`;
  if (!m.projs.length) return h + '<p class="empty">No projects yet.</p></section>';
  h += `<p class="small muted">Employees update progress; only the TA Head validates stages. Score uses the TA Head's rubric on contributing projects (best one counts — placeholder for D-32).</p>`;
  for (const p of m.projs) {
    const s = p.mgrScore, ss = p.selfScore;
    const stalled = p.stage < 4 && D.diff(PERIOD.cutoff, p.lastValidated) > state.rules.stalledDays;
    h += `<div class="card soft"><header><h3 style="margin:0;margin-right:auto">${esc(p.title)} <span class="muted small">${p.id}</span></h3>${p.contributing ? '<span class="chip st-good">✓ Counts toward 15</span>' : '<span class="chip">Not contributing</span>'}${stalled ? '<span class="chip st-below">✕ Stalled</span>' : ''}</header>
      <p class="small">${esc(p.problem)}</p>${p.reported ? `<p class="small"><b>Reported status:</b> ${esc(p.reported)}${p.planEnd ? ' · planned end ' + D.nice(p.planEnd) : ''}${p.team ? ' · with ' + esc(p.team) : ''}</p>` : ''}${dmaicTracker(p)}
      <div class="grid g4 small"><div><b>Metric</b><br>${esc(p.metric)}</div><div><b>Baseline → Target → Actual</b><br>${p.baseline} → ${p.target} → ${p.actual == null ? '—' : p.actual}</div><div><b>Next action</b><br>${esc(p.nextAction)}</div><div><b>Last validated</b><br>${D.nice(p.lastValidated)}</div></div>
      <div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th></th><th class="n">Discipline /5</th><th class="n">Impact /5</th><th class="n">Control /3</th><th class="n">Learning /2</th><th class="n">Total /15</th></tr></thead><tbody>
      <tr><td>Self</td>${ss ? `<td class="n">${ss.discipline}</td><td class="n">${ss.impact}</td><td class="n">${ss.control}</td><td class="n">${ss.learning}</td><td class="n">${ss.discipline + ss.impact + ss.control + ss.learning}</td>` : '<td colspan="5" class="muted">Not entered</td>'}</tr>
      <tr><td>TA Head</td>${s ? `<td class="n">${s.discipline}</td><td class="n">${s.impact}</td><td class="n">${s.control}</td><td class="n">${s.learning}</td><td class="n"><b>${s.discipline + s.impact + s.control + s.learning}</b></td>` : '<td colspan="5" class="muted">Not yet scored</td>'}</tr></tbody></table></div>
      <div class="actions" style="margin-top:8px">${head ? `<button class="btn sm" onclick="validateStage('${p.id}')" ${p.stage >= 4 ? 'disabled' : ''}>Validate ${p.stage >= 4 ? 'stage' : DMAIC[p.stage + 1]}</button><button class="btn sm" onclick="projectScoreDlg('${p.id}','mgr')">Score</button><button class="btn sm" onclick="toggleContrib('${p.id}')">${p.contributing ? 'Exclude from score' : 'Count toward score'}</button>` : `<button class="btn sm" onclick="projectUpdateDlg('${p.id}')">Update progress</button><button class="btn sm" onclick="projectScoreDlg('${p.id}','self')">Self-score</button>`}</div></div>`;
  }
  return h + '</section>';
}

function competencySection(m, head, viewer) {
  const e = m.e;
  const c = ui.compSel && COMPETENCIES.includes(ui.compSel) ? ui.compSel : COMPETENCIES[0];
  const hist = m.hist;
  const labels = hist.map(a => a.period).concat(['Target']);
  const chart = hist.length ? lineChart([
    { name: 'TA Head rating', cls: 's1', values: hist.map(a => a.mgr[c]).concat([null]) },
    { name: 'Self-rating', cls: 's2 dashed', values: hist.map(a => a.self[c] != null ? a.self[c] : null).concat([null]), marker: 'sq' },
  ], labels, { title: `${c}: baseline → quarterly → current → target`, yMin: 0, yMax: 5, ref: e.targets[c], refLabel: 'Target ' + e.targets[c] }) : emptyChart('Competency trend');
  const cd = m.cd;
  const learn = state.learning.filter(l => l.emp === e.id);
  return `<section class="card" id="s-comp"><header><h2>Competency development</h2>${sectionActions(e.id, 'competency')}</header>
   <div class="grid g2"><div><label class="field">Competency <select onchange="ui.compSel=this.value;render();setTimeout(()=>document.getElementById('s-comp').scrollIntoView(),0)">${COMPETENCIES.map(x => `<option ${x === c ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>${chart}</div>
   <div><h3>Competency Development score</h3><div class="tbl-wrap"><table><thead><tr><th>Dimension</th><th class="n">Self</th><th class="n">TA Head</th><th class="n">Max</th></tr></thead><tbody>
    <tr><td>Demonstrated capability growth</td><td class="n">${cd.self ? cd.self.g : '—'}</td><td class="n">${cd.mgr ? cd.mgr.g : '—'}</td><td class="n">7</td></tr>
    <tr><td>Application of learning</td><td class="n">${cd.self ? cd.self.a : '—'}</td><td class="n">${cd.mgr ? cd.mgr.a : '—'}</td><td class="n">5</td></tr>
    <tr><td>Completion of agreed development plan</td><td class="n">${cd.self ? cd.self.c : '—'}</td><td class="n">${cd.mgr ? cd.mgr.c : '—'}</td><td class="n">3</td></tr>
    ${m.isTL ? `<tr><td>Leadership effectiveness (TL-B only)</td><td class="n">—</td><td class="n">${cd.mgr && cd.mgr.lead != null ? cd.mgr.lead : '—'}</td><td class="n">20</td></tr>` : ''}
    <tr class="grp"><td>Total</td><td class="n">${m.cdS == null ? '—' : m.cdS}</td><td class="n">${m.cdM == null ? '—' : m.cdM}</td><td class="n">15</td></tr></tbody></table></div>
    <p class="small muted">${cd.mgr && cd.mgr.evidence ? 'Evidence: ' + esc(cd.mgr.evidence) : ''} Attendance alone never raises this score (Learn → Apply → Evidence → Assess).</p>
    <button class="btn sm" onclick="compDevDlg('${e.id}','${head ? 'mgr' : 'self'}')">${head ? 'Score' : 'Self-score'}</button></div></div>
   <h3 style="margin-top:12px">Learning &amp; application</h3>
   ${learn.length ? `<div class="tbl-wrap"><table><thead><tr><th>Programme</th><th>Provider</th><th>Skill</th><th>Status</th><th>Application example</th><th>Validated</th><th></th></tr></thead><tbody>${learn.map(l => `<tr><td>${esc(l.programme)}${l.cert ? ' <span class="chip">Certified</span>' : ''}</td><td>${esc(l.provider)}</td><td>${esc(l.skill)}</td><td>${esc(l.status)}</td><td class="small">${l.application ? esc(l.application) : '<span class="muted">No application evidence yet</span>'}</td><td>${l.validated ? statusChip('approved', true, 'Validated') : '<span class="chip">Not yet</span>'}</td><td>${head && !l.validated && l.application ? `<button class="btn sm" onclick="validateLearning('${l.id}')">Validate</button>` : ''}${!head ? `<button class="btn sm" onclick="learningDlg('${e.id}','${l.id}')">Update</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="empty">No learning records.</p>'}
   ${!head ? `<button class="btn sm" onclick="learningDlg('${e.id}')">Add learning</button>` : ''}
   <p class="small muted">Recommended next: ${!m.latest ? 'add a competency assessment to get training and certification suggestions.' : COMPETENCIES.filter(x => m.latest && m.latest.mgr[x] < e.targets[x]).slice(0, 3).map(x => esc(IDP_LIBRARY[x][0]) + (IDP_LIBRARY[x][1] !== '—' ? ' / ' + esc(IDP_LIBRARY[x][1]) : '')).join(' · ') || 'On target in all competencies.'}</p></section>`;
}

function idpSection(m, head, viewer) {
  const e = m.e, items = state.idp[e.id] || [];
  return `<section class="card" id="s-idp"><header><h2>Next-year Individual Development Plan</h2>${sectionActions(e.id, 'idp', head ? `<button class="btn sm" onclick="suggestIDP('${e.id}')">Suggest from gaps</button><button class="btn sm" onclick="idpDlg('${e.id}')">Add item</button>` : '')}</header>
  ${items.length ? `<div class="tbl-wrap"><table><thead><tr><th>Priority</th><th class="n">Current → Target</th><th>Training</th><th>Certification</th><th>Stretch assignment</th><th>Application project</th><th>Evidence of success</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>
   ${items.map((i, k) => `<tr><td>${esc(i.area)}${i.source === 'Suggestion' ? ' <span class="chip st-pending">Suggestion</span>' : ''}</td><td class="n">${i.current} → ${i.target}</td><td class="small">${esc(i.training)}</td><td class="small">${esc(i.cert)}</td><td class="small">${esc(i.stretch)}</td><td class="small">${esc(i.application)}</td><td class="small">${esc(i.evidence)}</td><td>${D.nice(i.due)}</td><td>${esc(i.status)}</td>
   <td>${head ? `<div class="actions">${i.status !== 'Approved' ? `<button class="btn sm" onclick="idpSet('${e.id}',${k},'Approved')">Approve</button>` : ''}<button class="btn sm" onclick="idpDlg('${e.id}',${k})">Edit</button><button class="btn sm" onclick="idpSet('${e.id}',${k},'remove')">Reject</button></div>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="empty">No plan yet. ' + (head ? 'Use “Suggest from gaps” to draft one from validated gaps.' : 'Your TA Head will draft it with you.') + '</p>'}
  <p class="small muted">Suggestions come from validated gaps and the BRD recommendation library. The TA Head approves, edits or rejects each one.</p></section>`;
}

function profileSection(e) {
  const pr = promotion(e.id);
  return `<section class="card" id="s-prof"><header><h2>Profile &amp; rating history</h2><span class="conf">TA Head only</span><button class="btn sm" onclick="profileDlg('${e.id}')">Edit</button></header>
  <div class="grid g4"><div class="kpi"><div class="lab">Current job level</div><div class="val" style="font-size:17px">${esc(e.level || '—')}</div><div class="sub">Since ${D.nice(e.since)}</div></div>
  ${[0, 1, 2].map(i => `<div class="kpi"><div class="lab">Rating ${PERIOD.year - 1 - i}</div><div class="val" style="font-size:17px">${esc(e.ratings[i] || '—')}</div></div>`).join('')}</div>
  <p class="small">Promotion readiness (advisory): <b>${esc(pr.level)}</b> · ${pr.met}/5 criteria met. <a href="#talent">Open Talent &amp; Promotion</a></p></section>`;
}

// ================= TEAM OVERVIEW =================
VIEWS.team = () => teamView(false);
VIEWS.myteam = () => teamView(true);
function teamView(tlMode) {
  const me = tlMode ? emp(ui.emp) : null;
  const teamF = tlMode ? me.team : (ui.teamF || 'all');
  const typeF = ui.typeF || 'all';
  const inTeam = e => teamF === 'all' || e.team === teamF || (e.alsoTeams || []).includes(teamF);
  const list = sortedEmployees().filter(e => inTeam(e) && (typeF === 'all' || e.type === typeF) && !(tlMode && (e.id === me.id || isSupport(e))));
  const ms = list.map(e => metrics(e.id));
  const ex = exceptionsList().filter(x => list.some(e => e.id === x.emp));
  let h = `<div class="pagehead"><div class="grow"><h1>${tlMode ? 'My Team — ' + esc(teamName(teamF)) : 'Team Overview'}</h1><p class="muted">${tlMode ? 'Operational delivery view of your team members. Confidential ratings are not shown (proposed access rule, D-24).' : 'Who is on track, who needs support, and why. Click a row to open the member.'}</p></div>
   ${!tlMode ? `<div class="actions"><button class="btn sm" onclick="teamExcel()">Download Excel</button><button class="btn sm" onclick="openReportBuilder(null,'calibration')">Calibration pack</button></div>` : ''}</div>`;
  if (!tlMode) h += `<div class="filters"><label>Team <select onchange="ui.teamF=this.value;render()"><option value="all">All teams</option>${Object.entries(state.teams).map(([k, t]) => `<option value="${k}" ${teamF === k ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>
     <label>Role <select onchange="ui.typeF=this.value;render()"><option value="all">All roles</option>${Object.entries(state.roles).map(([k, r]) => `<option value="${k}" ${typeF === k ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>
     <button class="btn sm" style="align-self:end" onclick="go('setup')">Assign teams &amp; roles</button></div>`;
  const cnt = k => ms.filter(m => m.status === k).length;
  h += `<div class="grid g5" style="margin-bottom:16px"><div class="kpi"><div class="lab">Members</div><div class="val">${list.length}</div><div class="sub">${list.filter(isLead).length} team lead(s)${list.filter(isFormer).length ? ' · ' + list.filter(isFormer).length + ' former' : ''}</div></div>
   <div class="kpi"><div class="lab">On track (${pointsBasis() ? 'points' : 'volume'})</div><div class="val">${cnt('good')}</div><div class="sub">${statusChip('good')}</div></div>
   <div class="kpi"><div class="lab">Watch</div><div class="val">${cnt('watch')}</div><div class="sub">${statusChip('watch')} 85–99%</div></div>
   <div class="kpi"><div class="lab">Below target</div><div class="val">${cnt('below')}</div><div class="sub">${statusChip('below')} &lt;85%</div></div>
   <div class="kpi"><div class="lab">Open exceptions</div><div class="val">${ex.length}</div><div class="sub">${tlMode ? '' : '<a href="#exceptions">Review</a>'}</div></div></div>`;
  if (tlMode) {
    h += `<section class="card"><div class="tbl-wrap"><table><thead><tr><th>Member</th><th>Area</th><th class="n">Points / target</th><th class="n">Attainment</th><th class="n">Offers</th><th class="n">Joining %</th><th class="n">Avg cycle</th><th class="n">Vendor %</th><th>Status</th></tr></thead><tbody>
      ${ms.map(m => `<tr><td>${esc(m.e.name)}</td><td>${esc(m.e.area)}</td><td class="n">${fmt(m.own.pointsFormal)} / ${fmt(m.own.pointsTargetFormal)}</td><td class="n">${m.att == null ? '—' : Math.round(m.att * 100) + '%'}</td><td class="n">${m.own.actualFormal}</td><td class="n">${pct(m.own.jr)}</td><td class="n">${fmt(m.own.ctAvg)}</td><td class="n">${pct(m.own.vendorPct)}</td><td>${statusOf(m)}</td></tr>`).join('')}</tbody></table></div></section>`;
  } else {
    const row = m => { const g = m.selfTotal != null && m.total != null ? r1(m.selfTotal - m.total) : null;
      const sup = teamF !== 'all' && m.e.team !== teamF ? ' <span class="chip">supports</span>' : '';
      return `<tr class="click" onclick="go('member',{member:'${m.e.id}'})" tabindex="0" onkeydown="if(event.key==='Enter')go('member',{member:'${m.e.id}'})"><td>${esc(m.e.name)}${isFormer(m.e) ? ' <span class="chip st-watch">former</span>' : ''}${sup}<br><span class="muted small">${esc(m.role.name)}${m.mode === 'summary' ? ' · summary scorecard' : ''}</span>${session && session.kind !== 'member' ? ` <button class="btn link small" onclick="event.stopPropagation();previewAs('${m.e.id}')">their dashboard</button>` : ''}</td><td>${esc(teamName(m.e.team))}</td><td>${esc(m.e.area)}</td><td class="n">${m.mode === 'support' ? 'n/a' : m.deliverables == null && m.mode === 'summary' ? '<span class="muted" data-tip="Offer score needs offer-level data">(' + fmt(m.ownDel.raw) + '/30)</span>' : fmt(m.deliverables)}</td><td class="n">${m.projects == null ? '—' : m.projects}</td><td class="n">${m.cdM == null ? '—' : m.cdM}</td><td class="n"><b>${m.total == null ? '<span class="muted" data-tip="Partial — a pillar is not yet scored">(' + fmt(m.partial) + ')</span>' : fmt(m.total)}</b></td><td class="n">${m.selfTotal == null ? '—' : fmt(m.selfTotal)}</td><td class="n">${m.total == null ? '—' : fmt(m.total)}</td><td class="n">${g == null ? '—' : (g > 0 ? '+' : '') + g}</td><td>${statusOf(m)}</td></tr>`; };
    const out = ms.filter(m => !inReview(m.e)), act = ms.filter(m => inReview(m.e));
    const ic = act.filter(m => !m.isTL && !m.isSup), tls = act.filter(m => m.isTL), sups = act.filter(m => m.isSup);
    h += `<section class="card"><header><h2>Team scorecard</h2>${provChip()}</header><div class="tbl-wrap"><table><thead><tr><th>Employee</th><th>Team</th><th>Area</th><th class="n">Deliv. /70</th><th class="n">Proj. /15</th><th class="n">Dev. /15</th><th class="n">Total</th><th class="n">Self</th><th class="n">TA Head</th><th class="n">Gap</th><th>Status</th></tr></thead><tbody>
      ${ic.length ? `<tr class="grp"><td colspan="11">Recruiters &amp; sourcers (${ic.length})</td></tr>` + ic.map(row).join('') : ''}
      ${tls.length ? `<tr class="grp"><td colspan="11">Team leads (${tls.length}) — TL scorecard (${state.rules.tlModel}, proposed)</td></tr>` + tls.map(row).join('') : ''}
      ${sups.length ? `<tr class="grp"><td colspan="11">Support &amp; operations (${sups.length}) — no hiring targets; scored on projects and competency (/30)</td></tr>` + sups.map(row).join('') : ''}
      ${out.length ? `<tr class="grp"><td colspan="11">Not in this year's evaluation (${out.length}) — left the team; hiring history kept, no target or score</td></tr>` + out.map(row).join('') : ''}</tbody></table></div>
      <p class="small muted">Status reflects ${pointsBasis() ? 'weighted points against the points target (offer target × points per offer)' : 'offer volume on closed cycles'}; for team leads, the lower of team and own. Totals in brackets are partial.</p></section>`;
  }
  const hiring = ms.filter(m => !m.isSup && inReview(m.e));
  h += `<div class="grid g2"><section class="card">${hbars(hiring.map(m => ({ label: m.e.name, sub: m.e.area, value: m.att == null ? null : Math.round(m.att * 100), status: m.status, tip: esc(m.e.name) + ': ' + fmt(m.own.pointsFormal) + ' of ' + fmt(m.own.pointsTargetFormal) + ' target points; ' + m.own.actualFormal + ' offers' })).sort((a, b) => (b.value || 0) - (a.value || 0)), { title: pointsBasis() ? 'Points attainment by member (weighted points vs points target)' : 'Volume attainment by member (closed cycles)', ref: 100, refLabel: '100% of target', unit: '%', max: 140 })}</section>
   <section class="card">${cadenceChart(aggregateBlocks(hiring.map(m => m.own), hiring.map(m => m.e)).cycles, { title: 'Combined offers per 10-day cycle vs combined target' })}</section></div>`;
  return h;
}
function teamExcel() {
  const rows = [['Employee ID', 'Name', 'Team', 'Business area', 'Role', 'Deliverables /70', 'Projects /15', 'Competency Dev /15', 'Total', 'Self total', 'Points attainment %', 'Points target', 'Weighted points', 'Offers', 'Offer target', 'Joining %', 'Avg cycle days', 'Vendor %', 'Status']];
  for (const e of sortedEmployees()) { const m = metrics(e.id); rows.push([e.id, e.name, teamName(e.team), e.area, roleOf(e).name, m.deliverables, m.projects, m.cdM, m.total, m.selfTotal, m.att == null ? '' : Math.round(m.att * 100), r1(m.own.pointsTargetFormal), r1(m.own.pointsFormal), m.own.actualFormal, r1(m.own.expectedFormal), r1(m.own.jr), r1(m.own.ctAvg), r1(m.own.vendorPct), STATUS[m.status][1]]); }
  download(`${PERIOD.year}_Team_Scorecard.csv`, toCSV(rows), 'text/csv'); audit('Download', 'Team scorecard', 'CSV');
}

// ================= COMPARE =================
VIEWS.compare = () => {
  const all = sortedEmployees();
  if (!ui.compare.length) ui.compare = all.filter(isRecruiter).slice(0, 4).map(e => e.id);
  ui.compare = ui.compare.filter(id => emp(id));
  const sel = ui.compare.map(metrics);
  const mixed = new Set(sel.map(m => m.role.template)).size > 1 || new Set(sel.map(m => m.mode)).size > 1;
  const metricsRows = [
    ['Business Deliverables /70', m => m.deliverables], ['Improvement Projects /15', m => m.projects], ['Competency Development /15', m => m.cdM], ['Total /100', m => m.total],
    ['Self total', m => m.selfTotal], ['|Delivery (own)'], ['Points target', m => r1(m.own.pointsTargetFormal)], ['Weighted points', m => r1(m.own.pointsFormal)], ['Points attainment %', m => m.att == null ? null : Math.round(m.att * 100)],
    ['Offers', m => m.own.actualFormal], ['Offer target', m => r1(m.own.expectedFormal)], ['Points per offer', m => m.own.actualYTD ? r1(m.own.pointsYTD / m.own.actualYTD) : null],
    ['Joining ratio %', m => r1(m.own.jr)], ['Avg cycle time (days)', m => r1(m.own.ctAvg), true], ['Vendor usage %', m => r1(m.own.vendorPct), true], ['Repeated misses (current run)', m => m.own.missRun, true],
    ['|Competencies (TA Head, latest)'], ...COMPETENCIES.map(c => [c, m => m.latest ? m.latest.mgr[c] : null]),
  ];
  const med = arr => { const v = arr.filter(x => x != null); return v.length ? median(v) : null; };
  const teamMed = {}; metricsRows.forEach(r => { if (r[1]) teamMed[r[0]] = med(state.employees.filter(isRecruiter).map(e => r[1](metrics(e.id)))); });
  let h = `<div class="pagehead"><div class="grow"><h1>Compare members</h1><p class="muted">Select 2–8 members. Use for calibration consistency, not forced ranking; check context (business area, eligible days, role type) first.</p></div>
    <div class="actions"><button class="btn sm" onclick="compareReport('pdf')">Download PDF</button><button class="btn sm" onclick="compareReport('xls')">Download Excel</button></div></div>
    <details class="card" ${ui.compare.length < 2 ? 'open' : ''}><summary><b>Choose members (${ui.compare.length} selected)</b></summary><div class="grid g4" style="margin-top:10px">${Object.keys(state.teams).map(t => `<div><h4>${esc(state.teams[t].name)}</h4>${all.filter(e => e.team === t).map(e => `<label style="display:block"><input type="checkbox" ${ui.compare.includes(e.id) ? 'checked' : ''} onchange="toggleCompare('${e.id}',this.checked)"> ${esc(e.name)} <span class="muted small">${esc(roleOf(e).name)}</span></label>`).join('')}</div>`).join('')}</div></details>`;
  if (mixed) h += `<div class="note warn">This selection mixes scorecard templates (recruiter, team lead, support) or data sources (offer-level vs summary scorecard). Deliverables are not like-for-like; compare projects, competency development and behaviours directly.</div>`;
  if (sel.length < 1) return h;
  h += `<section class="card"><div class="tbl-wrap"><table><thead><tr><th>Measure</th>${sel.map(m => `<th class="n">${esc(m.e.name)}<br><span class="muted">${esc(m.e.area)} · ${esc(m.role.name)}</span></th>`).join('')}<th class="n">IC median</th></tr></thead><tbody>`;
  for (const r of metricsRows) {
    if (!r[1]) { h += `<tr class="grp"><td colspan="${sel.length + 2}">${esc(r[0].slice(1))}</td></tr>`; continue; }
    const vals = sel.map(r[1]); const good = vals.filter(v => v != null); const best = good.length ? (r[2] ? Math.min(...good) : Math.max(...good)) : null;
    h += `<tr><td>${esc(r[0])}</td>${vals.map(v => `<td class="n">${v == null ? '—' : fmt(v)}${v != null && v === best && sel.length > 1 ? ' <span aria-label="best" class="muted">★</span>' : ''}</td>`).join('')}<td class="n muted">${fmt(teamMed[r[0]])}</td></tr>`;
  }
  h += `</tbody></table></div><p class="small muted">★ marks the best value in the selection (lowest for cycle time, vendor % and misses).</p></section>`;
  h += `<div class="grid g2"><section class="card">${hbars(sel.map(m => ({ label: m.e.name, value: m.total != null ? m.total : m.partial, tip: esc(m.e.name) + ': ' + (m.total != null ? 'total ' + m.total : 'partial ' + m.partial) })), { title: 'Total score (TA Head)', max: 100 })}</section>
    <section class="card">${hbars(sel.map(m => ({ label: m.e.name, value: m.att == null ? null : Math.round(m.att * 100), status: m.status })), { title: pointsBasis() ? 'Points attainment %' : 'Volume attainment %', ref: 100, refLabel: 'Target', unit: '%', max: 140 })}</section></div>`;
  return h;
};
function toggleCompare(id, on) { ui.compare = on ? [...new Set([...ui.compare, id])].slice(0, 8) : ui.compare.filter(x => x !== id); render(); }

// ================= EXCEPTIONS =================
VIEWS.exceptions = () => {
  const ex = exceptionsList(); const types = [...new Set(ex.map(x => x.type))];
  const f = ui.exF || 'all'; const list = ex.filter(x => f === 'all' || x.type === f);
  return `<div class="pagehead"><div class="grow"><h1>Exceptions</h1><p class="muted">What needs action. Thresholds marked pending are placeholders until confirmed (D-05, D-16 to D-19).</p></div>
   <div class="actions"><button class="btn sm" onclick="download('${PERIOD.year}_Exceptions.csv', toCSV([['Employee','Team','Exception','Measure','Value','Threshold','Suggested action']].concat(exceptionsList().map(x=>[x.name,teamName(x.team),x.type,x.measure,x.value,x.threshold,x.action]))),'text/csv')">Download Excel</button></div></div>
   <div class="filters"><label>Type <select onchange="ui.exF=this.value;render()"><option value="all">All (${ex.length})</option>${types.map(t => `<option ${t === f ? 'selected' : ''} value="${esc(t)}">${esc(t)} (${ex.filter(x => x.type === t).length})</option>`).join('')}</select></label></div>
   <section class="card"><div class="tbl-wrap"><table><thead><tr><th>Priority</th><th>Employee</th><th>Exception</th><th>Measure</th><th>Value</th><th>Threshold</th><th>Suggested action</th><th></th></tr></thead><tbody>
   ${list.map(x => `<tr><td>${x.sev === 1 ? statusChip('below', true, 'High') : x.sev === 2 ? statusChip('watch', true, 'Medium') : '<span class="chip">Low</span>'}</td><td>${esc(x.name)}<br><span class="muted small">${esc(teamName(x.team))}</span></td><td>${esc(x.type)}</td><td class="small">${esc(x.measure)}</td><td>${esc(x.value)}</td><td class="small">${esc(x.threshold)}</td><td class="small">${esc(x.action)}</td>
   <td>${x.emp ? `<div class="actions"><button class="btn sm" onclick="go('member',{member:'${x.emp}'})">Open</button><button class="btn sm" onclick="newRequestDlg('${x.emp}')">Request input</button></div>` : `<button class="btn sm" onclick="go('import')">Review</button>`}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">No exceptions.</td></tr>'}</tbody></table></div></section>`;
};

// ================= HEATMAP =================
VIEWS.heatmap = () => {
  const mode = ui.hmMode || 'rating';
  const list = sortedEmployees();
  let h = `<div class="pagehead"><div class="grow"><h1>Team capability heatmap</h1><p class="muted">TA Head validated ratings (latest assessment). Use to find team-wide training needs and internal experts. AI does not designate successors.</p></div></div>
   <div class="filters"><div class="tabs" role="tablist"><button role="tab" class="${mode === 'rating' ? 'on' : ''}" onclick="ui.hmMode='rating';render()">Rating (1–5)</button><button role="tab" class="${mode === 'gap' ? 'on' : ''}" onclick="ui.hmMode='gap';render()">Gap to target</button></div></div>
   <section class="card"><div class="tbl-wrap"><table class="hm"><thead><tr><th>Employee</th>${COMP_SHORT.map((c, i) => `<th class="n" title="${esc(COMPETENCIES[i])}">${esc(c)}</th>`).join('')}<th class="n">Gaps</th></tr></thead><tbody>`;
  let team = '';
  for (const e of list) {
    if (e.team !== team) { team = e.team; h += `<tr class="grp"><td colspan="${COMPETENCIES.length + 2}">${esc(teamName(team))}</td></tr>`; }
    const L = metrics(e.id).latest; let gaps = 0;
    h += `<tr><td>${esc(e.name)}${isLead(e) ? ' <span class="muted small">TL</span>' : ''}</td>` + COMPETENCIES.map(c => {
      if (!L) return '<td class="c">—</td>';
      const v = L.mgr[c], t = e.targets[c], g = v - t; if (g < 0) gaps++;
      return mode === 'rating' ? `<td class="c v${v} ${g < 0 ? 'gneg' : ''}" data-tip="${esc(e.name)} · ${esc(c)}<br>TA Head ${v} (${LEVEL_ANCHORS[v]}) · target ${t}${g < 0 ? '<br>▼ below target' : ''}">${v}${g < 0 ? '<span aria-hidden="true">▾</span>' : ''}</td>`
        : `<td class="c ${g < 0 ? 'v' + Math.min(5, 2 - g) : ''}" data-tip="${esc(c)}: ${v} vs target ${t}">${g > 0 ? '+' + g : g}</td>`;
    }).join('') + `<td class="n">${gaps}</td></tr>`;
  }
  const avgRow = COMPETENCIES.map(c => { const v = list.map(e => metrics(e.id).latest).filter(Boolean).map(L => L.mgr[c]); return v.length ? r1(avg(v)) : null; });
  const experts = COMPETENCIES.map(c => list.filter(e => { const L = metrics(e.id).latest; return L && L.mgr[c] >= 4; }).length);
  h += `<tr class="grp"><td>Team average</td>${avgRow.map(v => `<td class="c">${fmt(v)}</td>`).join('')}<td></td></tr><tr class="grp"><td>Internal experts (≥4)</td>${experts.map(v => `<td class="c">${v}</td>`).join('')}<td></td></tr></tbody></table></div>
   <p class="small muted">${mode === 'rating' ? 'Darker = higher rating; the number is always shown. ▾ and an underline mark ratings below the individual target.' : 'Negative numbers are levels below target; darker = larger gap.'}</p></section>`;
  const lowest = COMPETENCIES.map((c, i) => [c, avgRow[i]]).filter(x => x[1] != null).sort((a, b) => a[1] - b[1]).slice(0, 2);
  if (lowest.length) h += `<div class="note"><span class="fact">FACT</span> Lowest team averages: ${lowest.map(l => esc(l[0]) + ' (' + l[1] + ')').join(', ')}. <span class="sugg">SUGGESTION</span> Consider a team-wide programme: ${lowest.map(l => esc(IDP_LIBRARY[l[0]][0])).join('; ')}.</div>`;
  return h;
};

// ================= ANNUAL REVIEW =================
const REVIEW_STEPS = [['cutoff', 'Cut-off frozen'], ['metrics', 'Metrics validated'], ['selfDone', 'Self-assessment'], ['mgrDone', 'TA Head assessment'], ['validated', 'Projects & capability scored'], ['summary', 'Summary drafted'], ['calibrated', 'Calibrated'], ['finalised', 'Final report'], ['empComment', 'Employee comments'], ['idpApproved', 'Next-year IDP']];
function reviewState(id) {
  const r = state.review[id] || {}, m = metrics(id);
  return { cutoff: r.cutoff, metrics: r.metrics, selfDone: r.selfDone, mgrDone: !!m.latest, validated: m.projects != null && m.cdM != null, summary: !!r.summary, calibrated: r.calibrated, finalised: r.finalised, empComment: !!r.empComment, idpApproved: (state.idp[id] || []).some(i => i.status === 'Approved') };
}
VIEWS.review = () => {
  const list = sortedEmployees().filter(inReview);
  const done = list.filter(e => reviewState(e.id).finalised).length;
  let h = `<div class="pagehead"><div class="grow"><h1>Annual review &amp; calibration</h1><p class="muted">Year-end workflow per BRD §12. Points only — mapping to corporate rating categories is pending (D-13).</p></div>
    <div class="actions"><button class="btn sm" onclick="freezeCutoff()">Freeze cut-off for all</button><button class="btn sm pri" onclick="openReportBuilder(null,'calibration')">Calibration pack</button></div></div>
    <div class="grid g2"><section class="card"><h3>Progress</h3><p>${done} of ${list.length} reports final</p>${progressBar(done, list.length, 'Final reports')}</section>
    <section class="card">${histogram(list.filter(isRecruiter).map(e => metrics(e.id).total).filter(v => v != null), { title: 'Distribution of totals — individual contributors' })}</section></div>
    <section class="card"><div class="tbl-wrap"><table><thead><tr><th>Employee</th><th class="n">Total</th>${REVIEW_STEPS.map(s => `<th class="small">${esc(s[1])}</th>`).join('')}<th></th></tr></thead><tbody>
    ${list.map(e => { const rs = reviewState(e.id), m = metrics(e.id); return `<tr><td>${esc(e.name)} <span class="muted small">${esc(roleOf(e).name)}</span></td><td class="n">${m.total == null ? '(' + fmt(m.partial) + ')' : fmt(m.total)}</td>${REVIEW_STEPS.map(s => `<td>${rs[s[0]] ? '<span class="chip st-good" aria-label="done">✓</span>' : '<span class="chip st-none" aria-label="not done">○</span>'}</td>`).join('')}<td><button class="btn sm" onclick="reviewDlg('${e.id}')">Open</button></td></tr>`; }).join('')}</tbody></table></div></section>`;
  return h;
};

// ================= TALENT & PROMOTION =================
VIEWS.talent = () => {
  const list = sortedEmployees().filter(inReview).map(e => ({ e, pr: promotion(e.id), m: metrics(e.id) })).sort((a, b) => a.pr.rank - b.pr.rank || (b.m.total || 0) - (a.m.total || 0));
  return `<div class="pagehead"><div class="grow"><h1>Talent &amp; promotion <span class="conf">Strictly confidential · TA Head only</span></h1>
    <p class="muted">Advisory readiness based on illustrative criteria (pending HR policy, D-30). Not visible to employees, team leads, peers or administrators; never included in employee reports. The TA Head's decision is the only binding field.</p></div>
    <div class="actions"><button class="btn sm" onclick="openReportBuilder(null,'talent')">Download</button></div></div>
   <section class="card"><div class="tbl-wrap"><table><thead><tr><th>Employee</th><th>Job level (time in level)</th><th>Last 3 ratings</th><th class="n">Current score</th><th>Readiness (advisory)</th><th>Reasons</th><th>TA Head decision</th></tr></thead><tbody>
   ${list.map(({ e, pr, m }) => { const d = state.promo[e.id] || {};
     return `<tr><td>${esc(e.name)}<br><span class="muted small">${esc(teamName(e.team))} · ${esc(roleOf(e).name)}${isFormer(e) ? ' · former' : ''}</span></td><td>${esc(e.level || '—')}<br><span class="muted small">${pr.yrs == null ? 'time in level not recorded' : fmt(pr.yrs) + ' yrs'} · next: ${esc(pr.nextLevel)}</span></td>
     <td class="small">${e.ratings.map((r, i) => `${PERIOD.year - 1 - i}: ${esc(r || '—')}`).join('<br>')}</td><td class="n">${m.total == null ? '(' + fmt(m.partial) + ')' : fmt(m.total)}</td>
     <td><span class="chip ${pr.rank === 1 ? 'st-good' : pr.rank === 2 ? 'st-watch' : ''}">${esc(pr.level)}</span><br><span class="small muted">${pr.met}/5 criteria</span></td>
     <td class="small"><details><summary>View reasons</summary>${pr.crit.map(c => `<div>${c.ok ? '✓' : '✕'} ${esc(c.label)}<br><span class="muted">${esc(c.fact)}</span></div>`).join('')}</details></td>
     <td><select aria-label="Decision for ${esc(e.name)}" onchange="setPromo('${e.id}',this.value)"><option value="">— Not decided —</option>${['Recommend for promotion', 'Revisit in 6 months', 'Develop in role', 'Not this cycle'].map(o => `<option ${d.decision === o ? 'selected' : ''}>${o}</option>`).join('')}</select>
     <button class="btn link small" onclick="promoNoteDlg('${e.id}')">${d.note ? 'Edit note' : 'Add note'}</button><button class="btn link small" onclick="profileDlg('${e.id}')">Edit level/ratings</button></td></tr>`; }).join('')}</tbody></table></div></section>
   <div class="note"><b>Criteria used (illustrative):</b> last two P4P ratings High or above · current score ≥ 80 · ≥3 competencies at 4+ · ≥2 years in level · leadership evidence. <b>Ready now</b> = all 5; <b>Ready in 6–12 months</b> = 4, or 3 with strong ratings; <b>Insufficient evidence</b> = fewer than two rating years. Monitor outcomes by team and gender at calibration.</div>`;
};

// ================= REQUESTS / INBOX =================
VIEWS.requests = () => {
  const head = isHead();
  const list = state.requests.filter(r => head || r.emp === ui.emp).sort((a, b) => b.created.localeCompare(a.created));
  let h = `<div class="pagehead"><div class="grow"><h1>${head ? 'Requests to employees' : 'Inbox'}</h1><p class="muted">${head ? 'Ask an employee to confirm imported data, correct it, add evidence or comment. Each request contains only that employee\'s own records. Requests reach people through their personal file; import the responses file they send back.' : 'Requests from your TA Head. You see only your own records. When you are done, use <b>Export my responses</b> (top right) and send the file to your TA Head.'}</p></div>
    ${head ? `<div class="actions"><button class="btn pri" onclick="newRequestDlg()">New request</button>${session && session.kind === 'head' ? '<label class="btn">Import employee responses<input type="file" accept=".json" hidden onchange="importResponsesFile(this.files[0])"></label>' : ''}</div>` : ''}</div>
   <section class="card"><div class="tbl-wrap"><table><thead><tr><th>ID</th>${head ? '<th>Employee</th>' : ''}<th>Type</th><th>Message</th><th>Rows</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>
   ${list.map(r => `<tr><td class="mono">${r.id}</td>${head ? `<td>${esc(emp(r.emp) ? emp(r.emp).name : r.emp)}</td>` : ''}<td>${esc(r.type)}</td><td class="small">${esc(r.msg)}${r.response ? `<div class="note"><b>${esc(r.response.kind)}:</b> ${esc(r.response.text)}${r.response.link ? ' · ' + esc(r.response.link) : ''}<br><span class="muted">${esc(r.response.at)}</span></div>` : ''}${r.decision ? `<div class="small muted">TA Head: ${esc(r.decision)}</div>` : ''}</td><td class="n">${r.rows.length}</td><td>${D.nice(r.due)}</td><td><span class="chip ${r.status === 'Responded' ? 'st-watch' : r.status === 'Closed' ? 'st-good' : ''}">${esc(r.status)}</span></td>
   <td><div class="actions">${head && r.status === 'Responded' ? `<button class="btn sm pri" onclick="decideRequest('${r.id}','Accepted')">Accept</button><button class="btn sm" onclick="decideRequest('${r.id}','Rejected')">Reject</button>` : ''}${!head && ['Sent', 'Viewed'].includes(r.status) ? `<button class="btn sm pri" onclick="respondDlg('${r.id}')">Respond</button>` : ''}<button class="btn sm" onclick="requestRowsDlg('${r.id}')">View rows</button></div></td></tr>`).join('') || `<tr><td colspan="8" class="empty">No requests.</td></tr>`}</tbody></table></div></section>`;
  return h;
};

// ================= TEAM SETUP =================
VIEWS.setup = () => {
  const head = isHead(), admin = ui.role === 'admin', canEdit = head || admin;
  const list = sortedEmployees();
  const teamOpts = cur => Object.entries(state.teams).map(([k, t]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(t.name)}</option>`).join('');
  const roleOpts = cur => Object.entries(state.roles).map(([k, r]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(r.name)}</option>`).join('');
  const areaOpts = (team, cur) => { const a = teamAreas(team); return (a.includes(cur) ? a : [cur, ...a]).map(x => `<option ${x === cur ? 'selected' : ''}>${esc(x)}</option>`).join(''); };
  return `<div class="pagehead"><div class="grow"><h1>Team setup</h1><p class="muted">Assign people to teams and roles, set up teams and their business areas, define roles, and manage workspace data. Every change asks for a reason and is recorded in the audit log.</p></div></div>
  <section class="card"><header><h2>Team members (${list.length})</h2>${head ? `<div class="actions"><button class="btn sm pri" onclick="memberDlg()">Add person</button><button class="btn sm" onclick="go('import',{impDataset:'profile'})">Paste / upload list</button>${session && session.kind === 'head' ? '<button class="btn sm" onclick="packsDlg()">Create personal files</button>' : ''}</div>` : ''}</header>
   <p class="small muted">Change a team, business area or role directly in the table. Use <b>Edit</b> for job level, rating history, start or leaving date, status, other teams supported and notes.</p>
   <div class="tbl-wrap"><table><thead><tr><th>Name</th><th>Team</th><th>Business area</th><th>Role</th><th class="n">Annual points target</th><th>Also supports</th><th>Status</th>${head ? '<th>Job level</th><th>Last 3 ratings</th>' : ''}<th></th></tr></thead><tbody>
   ${list.map(e => `<tr><td>${esc(e.name)}<br><span class="mono muted">${esc(e.id)}</span>${(e.flags || []).length ? `<br><span class="chip st-watch" data-tip="${esc(e.flags.map(esc).join('<br>'))}">▲ ${e.flags.length} to confirm</span>` : ''}</td>
     <td>${canEdit ? `<select aria-label="Team for ${esc(e.name)}" onchange="assignField('${e.id}','team',this.value)">${teamOpts(e.team)}</select>` : esc(teamName(e.team))}</td>
     <td>${canEdit ? `<select aria-label="Business area for ${esc(e.name)}" onchange="assignField('${e.id}','area',this.value)">${areaOpts(e.team, e.area)}</select>` : esc(e.area)}</td>
     <td>${canEdit ? `<select aria-label="Role for ${esc(e.name)}" onchange="assignField('${e.id}','type',this.value)">${roleOpts(e.type)}</select>` : esc(roleOf(e).name)}</td>
     <td class="n">${isSupport(e) ? 'n/a' : fmt(annualPoints(e))}${e.ptAnnual != null ? ' <span class="chip">personal</span>' : ''}${canEdit && !isSupport(e) ? ` <button class="btn link small" onclick="pointsTargetDlg('${e.id}')">Edit</button>` : ''}</td>
     <td class="small">${(e.alsoTeams || []).map(t => esc(teamName(t))).join(', ') || '—'}</td>
     <td>${isFormer(e) ? `<span class="chip st-watch">Former${e.end ? ' · ' + D.nice(e.end) : ''}</span>` : `<span class="chip st-good">Active${e.end ? ' · until ' + D.nice(e.end) : ''}</span>`}${!inReview(e) ? '<br><span class="chip">Not in evaluation</span>' : ''}</td>
     ${head ? `<td class="small">${esc(e.level || '—')}</td><td class="small">${e.ratings.map(r => esc(r || '—')).join(' · ')}</td>` : ''}
     <td>${canEdit ? `<button class="btn sm" onclick="memberDlg('${e.id}')">Edit</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="9" class="empty">No members yet.</td></tr>'}</tbody></table></div></section>
  <div class="grid g2">
  <section class="card"><header><h2>Teams</h2>${canEdit ? '<button class="btn sm" onclick="teamDlg()">Add team</button>' : ''}</header>
   <div class="tbl-wrap"><table><thead><tr><th>Team</th><th>Business areas</th><th>Lead</th><th class="n">People</th><th></th></tr></thead><tbody>
   ${Object.entries(state.teams).map(([k, t]) => { const tl = teamLead(k); const n = state.employees.filter(e => e.team === k).length, sup = state.employees.filter(e => (e.alsoTeams || []).includes(k)).length;
     return `<tr><td>${esc(t.name)}</td><td class="small">${t.areas.map(esc).join(', ') || '—'}</td><td>${tl ? esc(tl.name) + (isFormer(tl) ? ' (former)' : '') : '<span class="muted">—</span>'}</td><td class="n">${n}${sup ? ' + ' + sup + ' supporting' : ''}</td><td>${canEdit ? `<button class="btn sm" onclick="teamDlg('${k}')">Edit</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div></section>
  <section class="card"><header><h2>Roles</h2>${canEdit ? '<button class="btn sm" onclick="roleDlg()">Add role</button>' : ''}</header>
   <div class="tbl-wrap"><table><thead><tr><th>Role</th><th>Scorecard</th><th class="n">Share of area target</th><th class="n">People</th><th></th></tr></thead><tbody>
   ${Object.entries(state.roles).map(([k, r]) => `<tr><td>${esc(r.name)}</td><td class="small">${esc(ROLE_TEMPLATES[r.template])}</td><td class="n">${r.template === 'support' ? 'n/a' : Math.round((r.template === 'lead' ? state.rules.tlTargetShare : r.share) * 100) + '%'}</td><td class="n">${state.employees.filter(e => e.type === k).length}</td><td>${canEdit ? `<button class="btn sm" onclick="roleDlg('${k}')">Edit</button>` : ''}</td></tr>`).join('')}</tbody></table></div>
   <p class="small muted">Team lead share comes from Rules &amp; Settings (D-20). Shares for other roles, such as sourcers, are pending decision (D-48).</p></section></div>
  <section class="card"><header><h2>Business areas &amp; targets</h2><span class="muted small">Per 10 working days · points target = offer target × points per offer</span></header>
   <div class="tbl-wrap"><table><thead><tr><th>Team</th><th>Business area</th><th class="n">Offer target</th><th class="n">Points per offer</th><th class="n">Points target</th><th>Source</th><th></th></tr></thead><tbody>
   ${Object.entries(state.teams).flatMap(([k, t]) => t.areas.map(a => `<tr><td>${esc(t.name)}</td><td>${esc(a)}</td><td class="n">${state.areaTargets[a] == null ? 'n/a' : fmt(areaTarget(a))}</td><td class="n">${state.areaTargets[a] == null ? '' : ppoFor(a) + (state.areaPPO[a] != null ? ' (area)' : '')}</td><td class="n"><b>${state.areaTargets[a] == null ? '' : fmt(areaTarget(a) * ppoFor(a))}</b></td><td>${AREAS[a] ? (AREAS[a].status === 'brd' ? statusChip('brd') : statusChip('pending', true, 'Placeholder — D-15')) : '<span class="chip">Set in workspace</span>'}</td><td>${canEdit ? `<button class="btn sm" onclick="targetDlg('${esc(a)}')">Change</button>` : ''}</td></tr>`)).join('')}</tbody></table></div></section>
  <section class="card"><header><h2>Workspace</h2><span class="chip">${session && session.kind === 'head' ? 'Encrypted · ' + esc(session.email) : 'Demo'}</span></header>
   ${session && session.kind === 'head' ? `<p class="small">Your workspace is <b>encrypted</b> and saved in this browser only. Export an encrypted backup regularly; it opens only with your passphrase.</p>
   <div class="actions"><button class="btn" onclick="exportBackup()">Export encrypted backup</button><label class="btn">Restore backup<input type="file" accept=".json" hidden onchange="restoreBackup(this.files[0])"></label><label class="btn">Apply update file<input type="file" accept=".json" hidden onchange="applyUpdateFile(this.files[0]);this.value=''"></label></div>`
   : '<p class="small">Demo data is fictional and is not saved.</p>'}</section>`;
};

// ================= RULES & SETTINGS =================
VIEWS.admin = () => {
  const R = state.rules, admin = ui.role === 'admin', head = isHead();
  const st = k => { const s = R.status[k]; return s ? (s[0] === 'pending' ? statusChip('pending', true, 'Pending ' + s[1]) : s[0] === 'brd' ? statusChip('brd', true, s[1]) : statusChip('approved', true, 'Approved ' + s[1])) : ''; };
  const decide = k => head && R.status[k] && R.status[k][0] === 'pending' ? `<button class="btn sm" onclick="approveRule('${k}')">Record decision</button>` : '';
  const rows = [
    ['pointsTable', 'Hiring points table', `<select ${admin ? '' : 'disabled'} onchange="setRule('pointsTable',this.value)">${Object.entries(POINT_TABLES).map(([k, v]) => `<option value="${k}" ${R.pointsTable === k ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select>`],
 ['offerFormula', 'Offer Delivery & Complexity formula (40)', `<select ${admin ? '' : 'disabled'} onchange="setRule('offerFormula',this.value)"><option value="P" ${R.offerFormula === 'P' ? 'selected' : ''}>P Points vs points target (offer target × points per offer)</option><option value="O1" ${R.offerFormula === 'O1' ? 'selected' : ''}>O1 Points attainment</option><option value="O2" ${R.offerFormula === 'O2' ? 'selected' : ''}>O2 Volume 28 + complexity 12</option><option value="O3" ${R.offerFormula === 'O3' ? 'selected' : ''}>O3 Banded attainment</option></select>`],
    ['pointsPerOffer', 'Points per offer (default for points target)', `<input type="number" step="0.1" style="width:64px" ${admin ? '' : 'disabled'} value="${R.pointsPerOffer}" onchange="setRule('pointsPerOffer',+this.value)"> points; areas can override in Team Setup`],
    ['gate', 'Volume gate (offer-count floor; 0 = off)', `below <input type="number" step="5" style="width:64px" ${admin ? '' : 'disabled'} value="${R.gate.g * 100}" onchange="setRule('gate.g',this.value/100)">% volume → cap at <input type="number" step="5" style="width:64px" ${admin ? '' : 'disabled'} value="${R.gate.c * 100}" onchange="setRule('gate.c',this.value/100)">% of 40`],
    ['tlModel', 'Team Lead scorecard', `<select ${admin ? '' : 'disabled'} onchange="setRule('tlModel',this.value)"><option value="TL-A" ${R.tlModel === 'TL-A' ? 'selected' : ''}>TL-A: team 35 + own 35, projects 15, competency 15</option><option value="TL-B" ${R.tlModel === 'TL-B' ? 'selected' : ''}>TL-B: team 40 + own 20, leadership 20, competency 20</option></select>`],
    ['tlTargetShare', 'Team Lead own offer target', `<input type="number" step="5" style="width:64px" ${admin ? '' : 'disabled'} value="${R.tlTargetShare * 100}" onchange="setRule('tlTargetShare',this.value/100)">% of a team member's target`],
    ['jrBands', 'Joining ratio bands', R.jrBands.map(b => `≥${b[0]}% → ${b[1]}`).join(' · ')],
    ['jrException', 'Joining ratio exception threshold', `<input type="number" style="width:64px" ${admin ? '' : 'disabled'} value="${R.jrException}" onchange="setRule('jrException',+this.value)">%`],
    ['ctBands', 'Cycle time bands', `&lt;${R.ctBands.strong} = 10 · ${R.ctBands.strong}–${R.ctBands.acceptable} = 7 · &gt;${R.ctBands.acceptable} = 4`],
    ['vendorBands', 'Vendor usage bands', `&lt;${R.vendorBands.low}% = 5 · ${R.vendorBands.low}–${R.vendorBands.high}% = 3 · &gt;${R.vendorBands.high}% = 1`],
    ['vendorExcluded', 'Vendor denominator exclusions', CATEGORIES.map(c => `<label class="small" style="display:inline-block;margin-right:8px"><input type="checkbox" ${admin ? '' : 'disabled'} ${R.vendorExcluded.includes(c) ? 'checked' : ''} onchange="toggleVendorEx('${esc(c)}',this.checked)"> ${esc(c)}</label>`).join('')],
    ['repeatMissN', 'Repeated misses = consecutive cycles', `<input type="number" style="width:64px" ${admin ? '' : 'disabled'} value="${R.repeatMissN}" onchange="setRule('repeatMissN',+this.value)">`],
    ['stalledDays', 'Stalled project = days since validation', `<input type="number" style="width:64px" ${admin ? '' : 'disabled'} value="${R.stalledDays}" onchange="setRule('stalledDays',+this.value)">`],
    ['belowTargetBy', 'Competency materially below target by more than', `<input type="number" style="width:64px" ${admin ? '' : 'disabled'} value="${R.belowTargetBy}" onchange="setRule('belowTargetBy',+this.value)"> level(s)`],
    ['gapThreshold', 'Self vs TA Head gap flagged when more than', `<input type="number" style="width:64px" ${admin ? '' : 'disabled'} value="${R.gapThreshold}" onchange="setRule('gapThreshold',+this.value)"> level(s)`],
  ];
  const conflict = CATEGORIES.map(c => { const a = POINT_TABLES.S53.rows[c], b = POINT_TABLES.A3.rows[c]; const diff = a[0] !== b[0] || a[1] !== b[1];
    return `<tr class="${diff ? 'warn' : ''}"><td>${esc(c)}</td><td class="n">${a[0]}</td><td>${a[1] ? '+0.5' : 'None'}</td><td class="n">${b[0]}</td><td>${b[1] ? '+0.5' : 'None'}</td><td>${diff ? '▲ Conflict' : '—'}</td></tr>`; }).join('');
  return `<div class="pagehead"><div class="grow"><h1>Rules &amp; settings</h1><p class="muted">Rule version <span class="mono">${esc(R.version)}</span>. ${admin ? 'Changes need a reason and are audited; they create a new rule version.' : head ? 'Administrators maintain rules. As TA Head you record decisions on pending items.' : ''} Pending items are placeholders: every score that depends on them is shown as provisional.</p></div></div>
  <section class="card"><div class="tbl-wrap"><table><thead><tr><th>Rule</th><th>Current setting</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r[1])}</td><td>${r[2]}</td><td>${st(r[0])}</td><td>${decide(r[0])}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="card"><header><h2>Hiring points: BRD §5.3 vs Appendix A3</h2>${st('pointsTable')}</header><div class="tbl-wrap"><table><thead><tr><th>Category</th><th class="n">§5.3 base</th><th>§5.3 women bonus</th><th class="n">A3 base</th><th>A3 women bonus</th><th></th></tr></thead><tbody>${conflict}</tbody></table></div>
  <p class="small muted">BRD acceptance tests (SG10 woman 3.5, NATS woman 1.5, AICTE woman 2.0) hold under both tables, so they cannot settle the conflict.</p></section>
  <section class="card"><header><h2>Working-day calendar (sample)</h2>${statusChip('pending', true, 'D-09')}</header><p class="small">${HOLIDAYS.map(h => D.nice(h[0]) + ' ' + esc(h[1])).join(' · ')}</p></section>
  <section class="card"><header><h2>Confidential data access</h2></header><p class="small">Administrators do not see TA Head comments, ratings rationale, rating history or promotion notes. Access needs an approved, time-limited break-glass request (D-27).</p>
   ${admin ? `<button class="btn sm" onclick="breakGlassDlg()">Request break-glass access</button>` : ''}
   ${state.breakGlass.length ? `<table><thead><tr><th>Requested</th><th>Reason</th><th>Status</th><th></th></tr></thead><tbody>${state.breakGlass.map((b, i) => `<tr><td>${esc(b.at)}</td><td>${esc(b.reason)}</td><td>${esc(b.status)}</td><td>${head && b.status === 'Pending' ? `<button class="btn sm" onclick="decideBreakGlass(${i},'Approved for 24h')">Approve 24h</button><button class="btn sm" onclick="decideBreakGlass(${i},'Rejected')">Reject</button>` : ''}</td></tr>`).join('')}</tbody></table>` : ''}</section>`;
};

// ================= AUDIT =================
VIEWS.audit = () => {
  const list = state.audit.filter(a => ui.role !== 'importer' || /Import/.test(a.action));
  return `<div class="pagehead"><div class="grow"><h1>Audit log</h1><p class="muted">Append-only record of imports, amendments, overrides, ratings, rule changes, report versions and access.</p></div><button class="btn sm" onclick="download('Audit_log.csv', toCSV([['When','Who','Action','Object','Detail','Reason']].concat(state.audit.map(a=>[a.at,a.who,a.action,a.object,a.detail,a.reason]))),'text/csv')">Download Excel</button></div>
  <section class="card"><div class="tbl-wrap"><table><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Object</th><th>Detail</th><th>Reason</th></tr></thead><tbody>${list.map(a => `<tr><td class="mono">${esc(a.at)}</td><td>${esc(a.who)}</td><td>${esc(a.action)}</td><td>${esc(a.object)}</td><td class="small">${esc(a.detail)}</td><td class="small">${esc(a.reason)}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">No entries.</td></tr>'}</tbody></table></div></section>`;
};

// ================= GUIDE =================
VIEWS.guide = () => `<div class="pagehead"><div class="grow"><h1>How to use this dashboard</h1></div></div>
 ${session && session.kind === 'member' ? `<section class="card"><h2>Your performance file</h2><ol>
  <li><b>My Performance</b> shows only your own record: points against your points target, joining, cycle time, vendor usage, projects, competencies and development plan.</li>
  <li>Complete your <b>self-assessment</b>, update <b>projects</b> and <b>learning</b>, and answer requests in your <b>Inbox</b>.</li>
  <li>Click <b>Export my responses</b> (top right) and send the file to your TA Head. Changes are not saved in the browser until you export them.</li>
  <li><b>Reports</b> lets you download your own reports.</li></ol></section>`
 : `<section class="card"><h2>Getting started (TA Head)</h2><ol>
  <li>Sign in with <b>${esc(TA_HEAD_EMAIL)}</b> and your passphrase. The workspace is encrypted in this browser.</li>
  <li><b>Team Setup</b>: restore your team file, then add, rename or remove people and set teams, roles and each person's <b>annual points target</b>.</li>
  <li><b>Data Import</b>: paste or upload offers or recruiter scorecards (with weighted points). Review, fix and approve.</li>
  <li><b>Create personal files</b> (Team Setup) for each person and send each passphrase separately. People see only their own performance.</li>
  <li><b>Import employee responses</b> (Requests page) when people send their responses file back.</li>
  <li>Use <b>Member View</b>, <b>Compare</b>, <b>Annual Review</b> and <b>Talent &amp; Promotion</b> for the overall view; <b>Reports</b> for PDF and Excel.</li>
  <li><b>Export an encrypted backup</b> regularly (Team Setup).</li></ol>
  <p class="small muted">"View as" previews what each role sees; it does not change who can open the data.</p></section>`}
 <section class="card"><h2>How performance is assessed</h2><p>Delivery is assessed on <b>weighted hiring points</b> against a <b>points target</b> (offer target × ${state.rules.pointsPerOffer}, or a personal target set by the TA Head). Offer Delivery &amp; Complexity = 40 × points ÷ points target, capped at 40. Scores marked ${statusChip('prov')} depend on rules still awaiting decisions (see <span class="mono">SYSTEM_DESIGN.md</span> §8). Metrics are evidence for discussion, not a substitute for managerial judgement.</p></section>`;
