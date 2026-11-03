// Editable PowerPoint packs (native text, tables and charts — no screenshots).
// Values come from the same engine results the dashboard uses.
import PptxGenJS from 'pptxgenjs';
import { AppData, GROWTH_KEYS, GROWTH_LABELS, RuleVersion } from '../types';
import { Period, Row } from '../engine/compute';

const C = { green: 'ACC686', cream: 'EBDEBD', orange: 'E89E4A', brown: '9F653C', ink: '2F2118', muted: '6B5A4C', light: 'F7F1E3' };
const F = 'Calibri';
const p1 = (v: number | null | undefined, d = 1) => (v === null || v === undefined ? '—' : String(Number(v.toFixed(d))));
const pc = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${(v * 100).toFixed(1)}%`);

function deck(org: string) {
  const p = new PptxGenJS();
  p.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
  p.author = org;
  p.defineSlideMaster({
    title: 'BODY',
    background: { color: 'FFFFFF' },
    objects: [
      { rect: { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: C.brown } } },
      { rect: { x: 0, y: 7.3, w: 3.33, h: 0.2, fill: { color: C.green } } },
      { rect: { x: 3.33, y: 7.3, w: 3.33, h: 0.2, fill: { color: C.cream } } },
      { rect: { x: 6.66, y: 7.3, w: 3.33, h: 0.2, fill: { color: C.orange } } },
      { rect: { x: 9.99, y: 7.3, w: 3.34, h: 0.2, fill: { color: C.brown } } },
    ],
    slideNumber: { x: 12.6, y: 6.95, fontFace: F, fontSize: 9, color: C.muted },
  });
  return p;
}
function title(s: PptxGenJS.Slide, t: string, sub?: string) {
  s.addText(t, { x: 0.5, y: 0.3, w: 12.3, h: 0.6, fontFace: F, fontSize: 24, bold: true, color: C.ink });
  if (sub) s.addText(sub, { x: 0.5, y: 0.85, w: 12.3, h: 0.35, fontFace: F, fontSize: 12, color: C.muted });
}
const hdr = (cells: string[]) => cells.map((c) => ({ text: c, options: { bold: true, fill: { color: C.light }, color: C.ink } }));
function footer(s: PptxGenJS.Slide, text: string) {
  s.addText(text, { x: 0.5, y: 6.85, w: 11.8, h: 0.35, fontFace: F, fontSize: 9, color: C.muted });
}
function provenance(rule: RuleVersion, period: Period, data: AppData) {
  const latest = data.offers.reduce((m, o) => (o.offerDate > m ? o.offerDate : m), '');
  return `Rule version v${rule.version} (${rule.status}) · ${period.label} (${period.start} → ${period.end}) · latest offer on record ${latest || '—'} · generated ${new Date().toISOString().slice(0, 10)}`;
}

export async function teamPack(data: AppData, rows: Row[], rule: RuleVersion, period: Period, nameOf: (r: Row) => string) {
  const p = deck(data.orgName);
  const s1 = p.addSlide({ masterName: 'BODY' });
  s1.addText('TA Performance Review', { x: 0.8, y: 2.2, w: 11.5, h: 1, fontFace: F, fontSize: 40, bold: true, color: C.brown });
  s1.addText(`${data.orgName} · ${period.label}`, { x: 0.8, y: 3.2, w: 11.5, h: 0.6, fontFace: F, fontSize: 20, color: C.ink });
  s1.addText(provenance(rule, period, data), { x: 0.8, y: 4.0, w: 11.5, h: 0.5, fontFace: F, fontSize: 11, color: C.muted });

  const active = rows.filter((r) => !r.leaver);
  const scored = active.filter((r) => r.delivery.target);
  const tp = scored.reduce((s, r) => s + (r.delivery.weightedPoints ?? 0), 0);
  const tt = scored.reduce((s, r) => s + (r.delivery.target ?? 0), 0);
  const s2 = p.addSlide({ masterName: 'BODY' });
  title(s2, 'Team delivery at a glance', 'Points vs pro-rated target, year to date; leavers excluded');
  const kpis: [string, string][] = [
    ['Team points', p1(tp)],
    ['Target to date', p1(tt)],
    ['Attainment', tt ? pc(tp / tt) : '—'],
    ['People rated', `${active.filter((r) => r.delivery.band).length} of ${active.length}`],
  ];
  kpis.forEach(([k, v], i) => {
    s2.addShape(p.ShapeType.roundRect, { x: 0.5 + i * 3.1, y: 1.4, w: 2.9, h: 1.3, fill: { color: C.light }, line: { color: C.cream }, rectRadius: 0.1 });
    s2.addText(k, { x: 0.6 + i * 3.1, y: 1.5, w: 2.7, h: 0.35, fontFace: F, fontSize: 12, color: C.muted });
    s2.addText(v, { x: 0.6 + i * 3.1, y: 1.85, w: 2.7, h: 0.7, fontFace: F, fontSize: 28, bold: true, color: C.ink });
  });
  const ch = active.filter((r) => r.delivery.ratingBasis !== null);
  if (ch.length)
    s2.addChart(p.ChartType.bar, [{ name: 'Attainment %', labels: ch.map(nameOf), values: ch.map((r) => Number((r.delivery.ratingBasis! * 100).toFixed(1))) }], {
      x: 0.5,
      y: 3.0,
      w: 12.3,
      h: 3.7,
      barDir: 'col',
      chartColors: [C.brown],
      catAxisLabelFontFace: F,
      catAxisLabelFontSize: 10,
      valAxisLabelFontSize: 9,
      showValue: true,
      dataLabelFontSize: 9,
      dataLabelColor: C.ink,
      valAxisTitle: 'Rating basis (%)',
      showValAxisTitle: true,
      valAxisTitleFontSize: 9,
    });
  footer(s2, provenance(rule, period, data));

  const s3 = p.addSlide({ masterName: 'BODY' });
  title(s3, 'Delivery scorecard', `Band from attainment (${rule.ratingBands.map((b) => `${b.label} ≥ ${b.minPct}%`).join(' · ')}); — = no data or rule not set`);
  s3.addTable(
    [
      hdr(['Name', 'Points', 'Target', 'Own %', 'Team %', 'Band', `/100`, 'Req→offer d', 'Vendor %', 'Women %']),
      ...rows.map((r) => [
        nameOf(r) + (r.leaver ? ' (leaver)' : ''),
        p1(r.delivery.weightedPoints, 2),
        p1(r.delivery.target),
        pc(r.delivery.attainment),
        r.recruiter.role === 'lead' ? pc(r.delivery.teamAttainment) : '—',
        r.delivery.band ?? 'Blocked',
        p1(r.delivery.total),
        p1(r.delivery.avgCycleDays, 0),
        p1(r.delivery.vendorPct),
        p1(r.delivery.womenPct),
      ]),
    ].map((row) => row.map((c) => (typeof c === 'string' ? { text: c } : c))),
    { x: 0.5, y: 1.35, w: 12.3, fontFace: F, fontSize: 10, color: C.ink, border: { type: 'solid', pt: 0.5, color: C.cream }, autoPage: true, autoPageRepeatHeader: true },
  );
  footer(s3, provenance(rule, period, data));

  const s4 = p.addSlide({ masterName: 'BODY' });
  title(s4, 'Growth & behaviours (1–10)', 'Kept separate from delivery');
  s4.addTable(
    [
      hdr(['Name', ...GROWTH_KEYS.map((k) => GROWTH_LABELS[k]), 'Growth score', 'Matrix']),
      ...active.map((r) => {
        const g = r.growth;
        const ga = data.growth.filter((x) => x.recruiterId === r.recruiter.id && x.year === rule.year).sort((a, b) => (a.period < b.period ? 1 : -1))[0];
        return [nameOf(r), ...GROWTH_KEYS.map((k) => p1(ga?.ratings[k] ?? null, 0)), p1(g.score, 2), r.matrix?.label ?? '—'].map((t) => ({ text: t }));
      }),
    ],
    { x: 0.5, y: 1.35, w: 12.3, fontFace: F, fontSize: 10, color: C.ink, border: { type: 'solid', pt: 0.5, color: C.cream }, autoPage: true },
  );
  footer(s4, provenance(rule, period, data));
  await p.writeFile({ fileName: `TA_Team_Review_${period.key}_${rule.year}.pptx` });
}

export async function individualPack(data: AppData, row: Row, rule: RuleVersion, period: Period, display: string) {
  const p = deck(data.orgName);
  const r = row.recruiter;
  const d = row.delivery;
  const s1 = p.addSlide({ masterName: 'BODY' });
  title(s1, `${display} — performance review`, `${period.label} · ${r.role === 'lead' ? 'Lead' : 'Recruiter'}${r.team ? ` · ${r.team}` : ''}`);
  const k: [string, string][] = [
    ['Points to date', p1(d.weightedPoints, 2)],
    ['Target to date', p1(d.target)],
    ['Attainment', pc(d.ratingBasis)],
    ['Calculated band', d.band ?? 'Not yet available'],
  ];
  k.forEach(([a, b], i) => {
    s1.addShape(p.ShapeType.roundRect, { x: 0.5 + i * 3.1, y: 1.4, w: 2.9, h: 1.3, fill: { color: C.light }, line: { color: C.cream }, rectRadius: 0.1 });
    s1.addText(a, { x: 0.6 + i * 3.1, y: 1.5, w: 2.7, h: 0.35, fontFace: F, fontSize: 12, color: C.muted });
    s1.addText(b, { x: 0.6 + i * 3.1, y: 1.85, w: 2.7, h: 0.7, fontFace: F, fontSize: 24, bold: true, color: C.ink });
  });
  s1.addTable(
    [
      hdr(['Measure', 'Value']),
      ...([
        ['Offers counted (year to date)', String(d.offersCounted)],
        ['Average requisition → offer (days, in-scope)', p1(d.avgCycleDays, 0)],
        ['Vendor share of joiners', d.vendorPct === null ? '—' : `${p1(d.vendorPct)}%`],
        ['Women share of accepted offers', d.womenPct === null ? '—' : `${p1(d.womenPct)}%`],
        ['Decline rate', d.declinePct === null ? '—' : `${p1(d.declinePct)}%`],
        ['Delivery score (/100)', p1(d.total)],
        ['Growth score (/10)', p1(row.growth.score, 2)],
      ].map(([a, b]) => [{ text: a }, { text: b }])),
    ],
    { x: 0.5, y: 3.0, w: 7.5, fontFace: F, fontSize: 11, color: C.ink, border: { type: 'solid', pt: 0.5, color: C.cream }, colW: [5, 2.5] },
  );
  if (d.missing.length) s1.addText(`Not yet available: ${d.missing.join('; ')}`, { x: 8.3, y: 3.0, w: 4.5, h: 1.2, fontFace: F, fontSize: 10, color: C.muted });
  footer(s1, provenance(rule, period, data));

  const s2 = p.addSlide({ masterName: 'BODY' });
  title(s2, 'How the result was calculated', 'Every step from source records to band');
  s2.addTable([hdr(['Step', 'How', 'Value']), ...d.trace.map((t) => [{ text: t.step }, { text: t.detail }, { text: String(t.value ?? '') }])], {
    x: 0.5,
    y: 1.35,
    w: 12.3,
    colW: [2.5, 8, 1.8],
    fontFace: F,
    fontSize: 10,
    color: C.ink,
    border: { type: 'solid', pt: 0.5, color: C.cream },
    autoPage: true,
  });

  const ga = data.growth.filter((x) => x.recruiterId === r.id && x.year === rule.year).sort((a, b) => (a.period < b.period ? 1 : -1))[0];
  const s3 = p.addSlide({ masterName: 'BODY' });
  title(s3, 'Growth & development', ga ? `Assessment ${ga.period}` : 'No growth assessment recorded yet');
  if (ga && GROWTH_KEYS.some((k2) => ga.ratings[k2] !== null))
    s3.addChart(p.ChartType.bar, [{ name: 'Rating (1–10)', labels: GROWTH_KEYS.map((k2) => GROWTH_LABELS[k2]), values: GROWTH_KEYS.map((k2) => ga.ratings[k2] ?? 0) }], {
      x: 0.5,
      y: 1.4,
      w: 6.2,
      h: 4.2,
      barDir: 'bar',
      chartColors: [C.green],
      valAxisMaxVal: 10,
      valAxisMinVal: 0,
      showValue: true,
      dataLabelFontSize: 10,
      catAxisLabelFontFace: F,
    });
  const plans = data.devPlans.filter((x) => x.recruiterId === r.id && x.year === rule.year);
  s3.addTable(
    [
      hdr(['Development area', 'Baseline → target', 'Actions', 'Due']),
      ...(plans.length ? plans.map((x) => [x.area, `${x.baseline ?? '—'} → ${x.target ?? '—'} (now ${x.current ?? '—'})`, x.actions, x.dueDate ?? '—'].map((t) => ({ text: t }))) : [[{ text: 'No development plan recorded yet' }, { text: '' }, { text: '' }, { text: '' }]]),
    ],
    { x: 7.0, y: 1.4, w: 5.8, fontFace: F, fontSize: 10, color: C.ink, border: { type: 'solid', pt: 0.5, color: C.cream }, autoPage: true },
  );
  const rev = data.reviews.filter((v) => v.recruiterId === r.id && v.year === rule.year).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (rev && (rev.commentary || rev.agreedActions || rev.finalRating)) {
    const s4 = p.addSlide({ masterName: 'BODY' });
    title(s4, 'Manager review', `${rev.type} review · ${rev.periodLabel} · ${rev.status}`);
    s4.addText(
      [
        { text: 'Final rating: ', options: { bold: true } },
        { text: `${rev.finalRating ?? 'not yet set'}\n\n` },
        { text: 'Commentary\n', options: { bold: true } },
        { text: `${rev.commentary || '—'}\n\n` },
        { text: 'Agreed actions\n', options: { bold: true } },
        { text: rev.agreedActions || '—' },
      ],
      { x: 0.5, y: 1.4, w: 12.3, h: 5.2, fontFace: F, fontSize: 13, color: C.ink, valign: 'top' },
    );
  }
  await p.writeFile({ fileName: `TA_Review_${display.replace(/[^\w]+/g, '_')}_${period.key}_${rule.year}.pptx` });
}
