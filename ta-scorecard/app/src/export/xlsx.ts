// Editable Excel workbooks built from the same engine results the dashboard uses.
import * as XLSX from 'xlsx';
import { AppData, GROWTH_KEYS, GROWTH_LABELS, RuleVersion } from '../types';
import { Period, Row } from '../engine/compute';

const r2 = (v: number | null | undefined, d = 2) => (v === null || v === undefined ? null : Number(v.toFixed(d)));

function meta(data: AppData, rule: RuleVersion, period: Period) {
  return XLSX.utils.aoa_to_sheet([
    ['Organisation', data.orgName],
    ['Period', period.label],
    ['From', period.start],
    ['To', period.end],
    ['Rule version', `v${rule.version} (${rule.status})`],
    ['Generated', new Date().toISOString()],
    ['Note', 'Blank cells mean no data or a rule not yet decided — never zero.'],
  ]);
}

export function scorecardWorkbook(data: AppData, rows: Row[], rule: RuleVersion, period: Period, nameOf: (r: Row) => string) {
  const wb = XLSX.utils.book_new();
  const head = ['Name', 'Role', 'Team', 'Leaver', 'Offers YTD', 'Points', 'Target to date', 'Own attainment %', 'Team attainment %', 'Rating basis %', 'Calculated band', `Offers /${rule.maxima.offers}`, `Cycle /${rule.maxima.cycle}`, `Vendor /${rule.maxima.vendor}`, 'Delivery /100', 'Avg req→offer (days)', 'Vendor % joiners', 'Women % accepted', 'Decline %', 'Status', 'Missing'];
  const body = rows.map((r) => {
    const d = r.delivery;
    return [
      nameOf(r),
      r.recruiter.role,
      r.recruiter.team,
      r.leaver ? 'Yes' : 'No',
      d.offersCounted,
      r2(d.weightedPoints),
      r2(d.target),
      d.attainment === null ? null : r2(d.attainment * 100, 1),
      d.teamAttainment === null ? null : r2(d.teamAttainment * 100, 1),
      d.ratingBasis === null ? null : r2(d.ratingBasis * 100, 1),
      d.band,
      d.components.offers,
      d.components.cycle,
      d.components.vendor,
      d.total,
      d.avgCycleDays,
      d.vendorPct,
      d.womenPct,
      d.declinePct,
      d.status,
      d.missing.join('; '),
    ];
  });
  const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
  ws['!cols'] = head.map((h, i) => ({ wch: i === 0 ? 24 : Math.max(10, Math.min(28, h.length + 2)) }));
  ws['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(head.length - 1)}${body.length + 1}` };
  XLSX.utils.book_append_sheet(wb, ws, 'Delivery scorecard');
  const trace = [['Name', 'Step', 'How', 'Value']];
  for (const r of rows) for (const t of r.delivery.trace) trace.push([nameOf(r), t.step, t.detail, String(t.value ?? '')]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trace), 'Calculation trace');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Category', 'Points', 'Women bonus applies'], ...rule.categories.map((c) => [c.code, c.points, c.womenBonus ? 'Yes' : 'No'])]), 'Points rules');
  XLSX.utils.book_append_sheet(wb, meta(data, rule, period), 'About');
  XLSX.writeFile(wb, `TA_Delivery_Scorecard_${period.key}_${rule.year}.xlsx`);
}

export function growthWorkbook(data: AppData, rows: Row[], rule: RuleVersion, period: Period, nameOf: (r: Row) => string) {
  const wb = XLSX.utils.book_new();
  const g = [['Name', 'Period', ...GROWTH_KEYS.map((k) => GROWTH_LABELS[k]), 'Growth score', 'Matrix position', 'Comment']];
  for (const r of rows) {
    const ga = data.growth.filter((x) => x.recruiterId === r.recruiter.id && x.year === rule.year).sort((a, b) => (a.period < b.period ? 1 : -1))[0];
    g.push([nameOf(r), ga?.period ?? '', ...GROWTH_KEYS.map((k) => (ga?.ratings[k] ?? '') as unknown as string), (r.growth.score ?? '') as unknown as string, r.matrix?.label ?? '', ga?.comment ?? '']);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(g), 'Growth');
  const byId = new Map(rows.map((r) => [r.recruiter.id, nameOf(r)]));
  const dp = [['Name', 'Area', 'Baseline', 'Target', 'Current', 'Owner', 'Due', 'Status', 'Actions', 'Completion evidence', 'Check-ins']];
  for (const p of data.devPlans.filter((x) => x.year === rule.year && byId.has(x.recruiterId)))
    dp.push([byId.get(p.recruiterId)!, p.area, String(p.baseline ?? ''), String(p.target ?? ''), String(p.current ?? ''), p.owner, p.dueDate ?? '', p.status, p.actions, p.completionEvidence, p.checkIns.map((c) => `${c.date}: ${c.currentRating ?? '—'} ${c.note}`).join(' | ')]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dp), 'Development plans');
  const tr = [['Name', 'Programme', 'Provider', 'Status', 'Completed', 'Applied on the job']];
  for (const t of data.training.filter((x) => x.year === rule.year && byId.has(x.recruiterId))) tr.push([byId.get(t.recruiterId)!, t.programme, t.provider, t.status, t.completionDate ?? '', t.applicationEvidence]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tr), 'Training');
  const pr = [['Name', 'Project', 'Status', 'Objective', 'Outcome']];
  for (const t of data.projects.filter((x) => x.year === rule.year && byId.has(x.recruiterId))) pr.push([byId.get(t.recruiterId)!, t.title, t.status, t.objective, t.outcome]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pr), 'Projects');
  XLSX.utils.book_append_sheet(wb, meta(data, rule, period), 'About');
  XLSX.writeFile(wb, `TA_Growth_Development_${period.key}_${rule.year}.xlsx`);
}
