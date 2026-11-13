// Pure, deterministic scoring engine. No I/O, no clock, no randomness.
// Every screen, review snapshot and export calls these functions — logic is never duplicated.
//
// Rules implemented are those agreed by the TA Head (see docs/scoring-rules.md for sources).
// Whenever a required rule value is missing (null) the engine returns status "blocked" with
// the list of missing items and NO score. It never invents a value.

import {
  DeliveryResult,
  GROWTH_KEYS,
  GROWTH_LABELS,
  GrowthResult,
  IN_SCOPE,
  Offer,
  Recruiter,
  RuleVersion,
  ScoreInputs,
  ThresholdBand,
  TraceLine,
} from '../types';

// ---------- date helpers (UTC-safe calendar arithmetic on YYYY-MM-DD) ----------

export function toDay(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}
export function fromDay(day: number): string {
  return new Date(day * 86400000).toISOString().slice(0, 10);
}
export function inRange(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= end;
}
/** Calendar days from start to end (end − start). */
export function calendarDays(start: string, end: string): number {
  return toDay(end) - toDay(start);
}
/** Working days (Mon–Fri, excluding holidays) in the inclusive range [from, to]. */
export function workingDaysBetween(from: string, to: string, holidays: string[]): number {
  const hol = new Set(holidays);
  let n = 0;
  for (let d = toDay(from); d <= toDay(to); d++) {
    const wd = new Date(d * 86400000).getUTCDay();
    if (wd !== 0 && wd !== 6 && !hol.has(fromDay(d))) n++;
  }
  return n;
}

export function round(v: number, decimals: number): number {
  const f = 10 ** decimals;
  // Half away from zero, with epsilon to avoid binary floating-point artefacts (e.g. 1.005).
  return (Math.sign(v) * Math.round(Math.abs(v) * f + 1e-9)) / f;
}

/** Salary grade from "SG9", "JL7", "JL7A" or a number. SG = JL + 2 (TA Head rule). */
export function sgNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? Math.trunc(v) : null;
  const t = String(v).toUpperCase().replace(/\s/g, '');
  for (const [pre, add] of [['SG', 0], ['JL', 2]] as const) {
    if (t.startsWith(pre)) {
      const m = t.slice(2).match(/^\d+/);
      if (m) return Number(m[0]) + add;
    }
  }
  const n = Number(t);
  return Number.isFinite(n) && t !== '' ? Math.trunc(n) : null;
}

/** Points category of an offer (mirrors the agreed Points_Rules). */
export function categorise(o: Pick<Offer, 'stream' | 'sg'>): { code: string; note?: string } {
  const sg = o.sg;
  const band = (p: string) =>
    sg! <= 3 ? `${p} SG1-SG3` : sg! <= 7 ? `${p} SG4-SG7` : sg! <= 9 ? `${p} SG8-SG9` : `${p} SG10 and above`;
  switch (o.stream) {
    case 'Lateral':
      return sg ? { code: band('Lateral') } : { code: 'Lateral SG1-SG3', note: 'Grade missing: counted at the lowest lateral band' };
    case 'FTC':
      return sg ? { code: band('FTC') } : { code: 'FTC (grade missing)', note: 'FTC grade missing: provisional points' };
    case 'Internal (IJP)':
      return { code: sg && sg >= 8 ? 'Internal (IJP) SG8 and above' : 'Internal (IJP) up to SG7' };
    default:
      return { code: o.stream };
  }
}

export function isActiveOn(r: Recruiter, iso: string): boolean {
  return (!r.startDate || r.startDate <= iso) && (!r.leaveDate || r.leaveDate >= iso);
}
/** Leavers (leave date on or before period end) are excluded from rankings and person views. */
export function isLeaverInPeriod(r: Recruiter, periodEnd: string): boolean {
  return !!r.leaveDate && r.leaveDate <= periodEnd;
}

function bandPoints(value: number, bands: ThresholdBand[]): { points: number; label: string } {
  const sorted = [...bands].sort((a, b) => (a.upTo ?? Infinity) - (b.upTo ?? Infinity));
  for (const b of sorted) if (b.upTo === null || value <= b.upTo) return { points: b.points!, label: b.upTo === null ? 'top band (open-ended)' : `≤ ${b.upTo}` };
  return { points: 0, label: 'none' }; // unreachable when bands are complete
}
function bandsComplete(bands: ThresholdBand[]): boolean {
  return bands.length > 0 && bands.every((b) => b.points !== null) && bands.filter((b) => b.upTo === null).length === 1;
}

// ---------- points & target ----------

export interface OfferPoints {
  offer: Offer;
  code: string;
  base: number;
  women: number;
  decline: number;
  total: number;
  note?: string;
}

/** Points for one offer, or a missing-rule message. */
export function offerPoints(o: Offer, rule: RuleVersion): OfferPoints | { missing: string } {
  const { code, note } = categorise(o);
  let base: number | null;
  let wb = false;
  if (code === 'FTC (grade missing)') base = rule.ftcNoGradePoints;
  else {
    const c = rule.categories.find((x) => x.code === code);
    if (!c) return { missing: `No points rule for category "${code}"` };
    base = c.points;
    wb = c.womenBonus;
  }
  if (base === null) return { missing: `Points for category "${code}"` };
  const women = wb && o.woman ? rule.womenBonus ?? 0 : 0;
  const decline = o.status === 'Declined' ? rule.declineAdjustment ?? 0 : 0;
  return { offer: o, code, base, women, decline, total: base + women + decline, note };
}

/** Lateral points at the target grade (used for the cadence target). */
export function lateralPointsAt(sg: number, rule: RuleVersion): number | null {
  const code = sg <= 3 ? 'Lateral SG1-SG3' : sg <= 7 ? 'Lateral SG4-SG7' : sg <= 9 ? 'Lateral SG8-SG9' : 'Lateral SG10 and above';
  return rule.categories.find((c) => c.code === code)?.points ?? null;
}

/** Working days the person was employed from the start of the year up to the period end. */
export function workingDaysElapsed(r: Recruiter, yearStart: string, periodEnd: string, holidays: string[]): number {
  const from = r.startDate && r.startDate > yearStart ? r.startDate : yearStart;
  const to = r.leaveDate && r.leaveDate < periodEnd ? r.leaveDate : periodEnd;
  return to < from ? 0 : workingDaysBetween(from, to, holidays);
}

export function missingDeliveryRules(rule: RuleVersion): string[] {
  const m: string[] = [];
  if (rule.womenBonus === null) m.push('Women bonus (points)');
  if (rule.declineAdjustment === null) m.push('Decline adjustment (points)');
  if (rule.workingDaysInYear === null || rule.workingDaysInYear <= 0) m.push('Working days in year');
  if (rule.ratingBands.length === 0 || rule.ratingBands.some((b) => b.minPct === null || !b.label)) m.push('Rating bands (minimum attainment % + label)');
  if (rule.roundingDecimals === null) m.push('Rounding precision');
  return m;
}
export function missingScoreRules(rule: RuleVersion): string[] {
  const m: string[] = [];
  if (rule.offersFormula === null) m.push('Offers & complexity formula (confirm: 80 × min(attainment, 1))');
  if (!bandsComplete(rule.cycleTime.bands)) m.push('Cycle-time points (5-point scale) for each band');
  if (!bandsComplete(rule.vendor.bands)) m.push('Vendor-usage points (15-point scale) for each band');
  return m;
}

interface PersonPoints {
  points: number;
  target: number | null;
  wdElapsed: number;
  rows: OfferPoints[];
  missing: string[];
  notes: string[];
}

function personPoints(r: Recruiter, offers: Offer[], inp: ScoreInputs): PersonPoints {
  const { rule } = inp;
  const rows: OfferPoints[] = [];
  const missing = new Set<string>();
  const notes: string[] = [];
  // Points accrue on offers released from the start of the year up to the period end (year to date).
  for (const o of offers) {
    if (o.recruiterId !== r.id || !inRange(o.offerDate, inp.yearStart, inp.periodEnd)) continue;
    const p = offerPoints(o, rule);
    if ('missing' in p) missing.add(p.missing);
    else {
      rows.push(p);
      if (p.note) notes.push(`${o.reqId || o.id}: ${p.note}`);
    }
  }
  let points = rows.reduce((s, x) => s + x.total, 0);
  if (rule.includeExtraPoints) {
    points += inp.extraPoints
      .filter((e) => e.recruiterId === r.id && e.approved && inRange(e.date, inp.yearStart, inp.periodEnd))
      .reduce((s, e) => s + e.points, 0);
  }
  const wd = workingDaysElapsed(r, inp.yearStart, inp.periodEnd, rule.holidays);
  let target: number | null = null;
  if (r.cadence === null || r.targetSG === null) missing.add(`Target cadence and target grade for ${r.name}`);
  else {
    const lp = lateralPointsAt(r.targetSG, rule);
    if (lp === null) missing.add('Lateral points at target grade');
    else target = (r.cadence * lp * wd) / 10;
  }
  return { points, target, wdElapsed: wd, rows, missing: [...missing], notes };
}

// ---------- delivery ----------

export function scoreDelivery(inp: ScoreInputs): DeliveryResult {
  const { recruiter: r, rule } = inp;
  const trace: TraceLine[] = [];
  const warnings: string[] = [];
  const excluded: DeliveryResult['offersExcluded'] = [];
  const dp = rule.roundingDecimals ?? 2;

  const result: DeliveryResult = {
    status: 'blocked',
    missing: [],
    warnings,
    offersCounted: 0,
    offersExcluded: excluded,
    weightedPoints: null,
    target: null,
    attainment: null,
    teamAttainment: null,
    ratingBasis: null,
    workingDaysElapsed: null,
    avgCycleDays: null,
    vendorPct: null,
    womenPct: null,
    declinePct: null,
    components: { offers: null, cycle: null, vendor: null },
    total: null,
    band: null,
    trace,
  };

  const baseMissing = missingDeliveryRules(rule);
  if (baseMissing.length) {
    result.missing = baseMissing;
    trace.push({ step: 'Blocked', detail: `Missing rules: ${baseMissing.join('; ')}` });
    return result;
  }

  // 1. Points year-to-date
  const mine = inp.offers.filter((o) => o.recruiterId === r.id);
  for (const o of mine) if (!inRange(o.offerDate, inp.yearStart, inp.periodEnd)) excluded.push({ offerId: o.id, reason: 'Offer date outside year-to-date window' });
  const pp = personPoints(r, inp.offers, inp);
  result.offersCounted = pp.rows.length;
  warnings.push(...pp.notes);
  trace.push({ step: 'Source records', detail: `${mine.length} offer record(s); ${pp.rows.length} released ${inp.yearStart} → ${inp.periodEnd}`, value: pp.rows.length });
  const byCode = new Map<string, { n: number; pts: number }>();
  for (const x of pp.rows) {
    const v = byCode.get(x.code) ?? { n: 0, pts: 0 };
    v.n++;
    v.pts += x.base;
    byCode.set(x.code, v);
  }
  for (const [code, v] of byCode) trace.push({ step: 'Category points', detail: `${v.n} × ${code}`, value: round(v.pts, dp) });
  const wSum = pp.rows.reduce((s, x) => s + x.women, 0);
  const dSum = pp.rows.reduce((s, x) => s + x.decline, 0);
  trace.push({ step: 'Women bonus', detail: `${pp.rows.filter((x) => x.women).length} offer(s) × ${rule.womenBonus}`, value: round(wSum, dp) });
  trace.push({ step: 'Decline adjustment', detail: `${pp.rows.filter((x) => x.decline).length} declined × ${rule.declineAdjustment}`, value: round(dSum, dp) });
  if (rule.includeExtraPoints) {
    const pend = inp.extraPoints.filter((e) => e.recruiterId === r.id && !e.approved && inRange(e.date, inp.yearStart, inp.periodEnd));
    if (pend.length) warnings.push(`${pend.length} extra-point entr(ies) awaiting approval are not counted`);
  }
  result.weightedPoints = round(pp.points, dp);
  result.workingDaysElapsed = pp.wdElapsed;
  trace.push({ step: 'Points to date', detail: 'Category points + women bonus + decline adjustment' + (rule.includeExtraPoints ? ' + approved extra points' : ''), value: result.weightedPoints });

  if (pp.missing.length) {
    result.missing = pp.missing;
    trace.push({ step: 'Blocked', detail: pp.missing.join('; ') });
    return result;
  }

  // 2. Target & attainment
  const target = pp.target!;
  result.target = round(target, dp);
  trace.push({
    step: 'Target to date',
    detail: `cadence ${r.cadence} × lateral points at SG${r.targetSG} (${lateralPointsAt(r.targetSG!, rule)}) × ${pp.wdElapsed} working days ÷ 10`,
    value: result.target,
  });
  if (target <= 0) {
    result.missing = ['Target to date is zero (no working days employed in the period)'];
    return result;
  }
  const own = pp.points / target;
  result.attainment = round(own, 4);
  trace.push({ step: 'Own attainment', detail: 'points ÷ target to date', value: `${round(own * 100, 1)}%` });

  let basis = own;
  if (r.role === 'lead' && rule.leadTeamAverage) {
    const members = inp.team.filter((m) => isActiveOn(m.recruiter, inp.periodEnd));
    let tp = 0;
    let tt = 0;
    for (const m of members) {
      const mp = personPoints(m.recruiter, m.offers, inp);
      if (mp.target && mp.target > 0) {
        tp += mp.points;
        tt += mp.target;
      }
    }
    if (tt > 0) {
      result.teamAttainment = round(tp / tt, 4);
      basis = (own + tp / tt) / 2;
      trace.push({ step: 'Team attainment', detail: `${members.length} active team member(s): Σpoints ÷ Σtargets`, value: `${round((tp / tt) * 100, 1)}%` });
      trace.push({ step: 'Rating basis (lead)', detail: 'average of own and team attainment', value: `${round(basis * 100, 1)}%` });
    } else warnings.push('Lead has no active team members with targets — rated on own attainment');
  }
  result.ratingBasis = round(basis, 4);
  const pct = round(basis * 100, 1);
  const band = [...rule.ratingBands].sort((a, b) => b.minPct! - a.minPct!).find((b) => pct >= b.minPct!);
  result.band = band ? band.label : 'Below lowest band';
  trace.push({ step: 'Calculated band', detail: `${pct}% → highest band whose minimum ≤ attainment`, value: result.band });

  // 3. In-scope hiring quality (period offers, in-scope streams)
  const scope = mine.filter((o) => IN_SCOPE.includes(o.stream) && inRange(o.offerDate, inp.periodStart, inp.periodEnd));
  if (scope.length) {
    result.declinePct = round((scope.filter((o) => o.status === 'Declined').length / scope.length) * 100, 1);
    const acc = scope.filter((o) => o.status === 'Joined' || o.status === 'Offered');
    result.womenPct = acc.length ? round((acc.filter((o) => o.woman).length / acc.length) * 100, 1) : null;
  }
  const ct = scope.filter((o) => o.status !== 'Declined' && o.reqDate && o.reqDate <= o.offerDate);
  const badCt = scope.filter((o) => o.reqDate && o.reqDate > o.offerDate).length;
  if (badCt) warnings.push(`${badCt} offer(s) with requisition date after offer date — excluded from cycle time`);
  const noReq = scope.filter((o) => !o.reqDate).length;
  if (noReq) warnings.push(`${noReq} in-scope offer(s) without requisition date — excluded from cycle time`);
  if (ct.length) result.avgCycleDays = round(ct.reduce((s, o) => s + calendarDays(o.reqDate!, o.offerDate), 0) / ct.length, dp);
  const joined = scope.filter((o) => o.status === 'Joined');
  if (joined.length) result.vendorPct = round((joined.filter((o) => o.viaVendor).length / joined.length) * 100, 1);

  // 4. 100-point delivery score (weights from the rule version; default 80 / 5 / 15)
  const sm = missingScoreRules(rule);
  result.components.offers = round(rule.maxima.offers * Math.min(basis, 1), dp);
  trace.push({ step: 'Offers & complexity', detail: `${rule.maxima.offers} × min(${pct}%, 100%)`, value: result.components.offers });
  if (bandsComplete(rule.cycleTime.bands) && result.avgCycleDays !== null) {
    const b = bandPoints(result.avgCycleDays, rule.cycleTime.bands);
    result.components.cycle = Math.min(rule.maxima.cycle, b.points);
    trace.push({ step: 'Cycle time', detail: `average ${result.avgCycleDays} calendar days (req approved → offer, ${ct.length} offer(s)); band ${b.label}`, value: result.components.cycle });
  } else if (result.avgCycleDays === null) trace.push({ step: 'Cycle time', detail: 'No in-scope offers with valid requisition dates in period — no data (not zero)' });
  else trace.push({ step: 'Cycle time', detail: `average ${result.avgCycleDays} calendar days (req approved → offer, ${ct.length} offer(s)); points not yet set`, value: '—' });
  if (bandsComplete(rule.vendor.bands) && result.vendorPct !== null) {
    const b = bandPoints(result.vendorPct, rule.vendor.bands);
    result.components.vendor = Math.min(rule.maxima.vendor, b.points);
    trace.push({ step: 'Vendor usage', detail: `${result.vendorPct}% of ${joined.length} in-scope joiner(s) via vendor; band ${b.label}`, value: result.components.vendor });
  } else if (result.vendorPct === null) trace.push({ step: 'Vendor usage', detail: 'No in-scope joiners in period — no data (not zero)' });

  if (sm.length) {
    result.status = 'incomplete';
    result.missing = sm;
    trace.push({ step: '100-point score', detail: `Not produced — missing rules: ${sm.join('; ')}` });
    return result;
  }
  const c = result.components;
  if (c.cycle === null || c.vendor === null) {
    result.status = 'incomplete';
    result.missing = [c.cycle === null ? 'Cycle-time data in period' : '', c.vendor === null ? 'Joiners in period (for vendor %)' : ''].filter(Boolean);
    trace.push({ step: '100-point score', detail: 'Not produced — a component has no data' });
    return result;
  }
  result.total = round(c.offers! + c.cycle + c.vendor, dp);
  result.status = 'scored';
  trace.push({ step: '100-point delivery score', detail: `${c.offers} + ${c.cycle} + ${c.vendor}`, value: result.total });
  return result;
}

// ---------- growth (1–10 scale; kept strictly separate from delivery) ----------

export function scoreGrowth(inp: Pick<ScoreInputs, 'growth' | 'rule'>): GrowthResult {
  const { growth, rule } = inp;
  const trace: TraceLine[] = [];
  const missing: string[] = [];
  for (const k of GROWTH_KEYS) if (rule.growthWeights[k] === null) missing.push(`Weight for ${GROWTH_LABELS[k]}`);
  const wsum = GROWTH_KEYS.reduce((s, k) => s + (rule.growthWeights[k] ?? 0), 0);
  if (!missing.length && wsum <= 0) missing.push('Growth weights must sum to more than zero');
  if (missing.length) return { status: 'blocked', missing, score: null, trace };
  if (!growth) return { status: 'incomplete', missing: ['No growth assessment recorded for this period'], score: null, trace };
  const absent: string[] = [];
  for (const k of GROWTH_KEYS) {
    const v = growth.ratings[k];
    if (v === null) absent.push(`${GROWTH_LABELS[k]} rating`);
    else if (v < 1 || v > 10) absent.push(`${GROWTH_LABELS[k]} rating out of 1–10 range`);
  }
  if (absent.length) return { status: 'incomplete', missing: absent, score: null, trace };
  let s = 0;
  for (const k of GROWTH_KEYS) {
    const w = rule.growthWeights[k]!;
    s += w * growth.ratings[k]!;
    trace.push({ step: GROWTH_LABELS[k], detail: `${growth.ratings[k]} × weight ${w}`, value: w * growth.ratings[k]! });
  }
  const score = round(s / wsum, rule.roundingDecimals ?? 2);
  trace.push({ step: 'Growth score', detail: `Σ(rating × weight) ÷ ${wsum}`, value: score });
  return { status: 'scored', missing: [], score, trace };
}

// ---------- 3×3 matrix ----------

export interface MatrixPosition {
  deliveryLevel: 0 | 1 | 2;
  growthLevel: 0 | 1 | 2;
  label: string;
}

export function matrixMissing(rule: RuleVersion): string[] {
  const m = rule.matrix;
  const out: string[] = [];
  if (m.deliveryLow === null || m.deliveryHigh === null) out.push('Delivery thresholds for the matrix');
  if (m.growthLow === null || m.growthHigh === null) out.push('Growth thresholds for the matrix');
  if (m.deliveryLow !== null && m.deliveryHigh !== null && m.deliveryLow >= m.deliveryHigh) out.push('Delivery low threshold must be below high');
  if (m.growthLow !== null && m.growthHigh !== null && m.growthLow >= m.growthHigh) out.push('Growth low threshold must be below high');
  return out;
}

/** Delivery axis = attainment % (rating basis × 100); growth axis = growth score (1–10). */
export function classifyMatrix(deliveryPct: number, growth: number, rule: RuleVersion): MatrixPosition | null {
  if (matrixMissing(rule).length) return null;
  const m = rule.matrix;
  const lvl = (v: number, lo: number, hi: number) => (v < lo ? 0 : v < hi ? 1 : 2) as 0 | 1 | 2;
  const d = lvl(deliveryPct, m.deliveryLow!, m.deliveryHigh!);
  const g = lvl(growth, m.growthLow!, m.growthHigh!);
  const L = ['Low', 'Medium', 'High'];
  return { deliveryLevel: d, growthLevel: g, label: m.labels[g * 3 + d] || `${L[d]} delivery / ${L[g]} growth` };
}
