import { AppData, CategoryRule, RuleVersion } from '../types';

// Agreed points rules (TA Head, monthly-review Points_Rules, 25 Oct 2026). See docs/scoring-rules.md.
// [points, women bonus applies]
const AGREED: [string, number, boolean][] = [
  ['Lateral SG1-SG3', 1, true],
  ['Lateral SG4-SG7', 3, true],
  ['Lateral SG8-SG9', 4, true],
  ['Lateral SG10 and above', 5, true],
  ['FTC SG1-SG3', 1, false],
  ['FTC SG4-SG7', 3, false],
  ['FTC SG8-SG9', 4, false],
  ['FTC SG10 and above', 5, false],
  ['Conversion to employment', 1, false],
  ['Campus intern conversion', 1, false],
  ['Internal (IJP) up to SG7', 1, false],
  ['Internal (IJP) SG8 and above', 2, false],
  ['NATS', 2, true],
  ['GET / PGET', 2, true],
  ['ExcelHER', 3, false],
  ['AICTE / PhD', 3, false],
  ['Intern', 1, false],
];

export function agreedCategories(): CategoryRule[] {
  return AGREED.map(([code, points, womenBonus]) => ({ code, points, womenBonus }));
}

export function defaultRuleVersion(year: number, id: string): RuleVersion {
  return {
    id,
    year,
    version: 1,
    status: 'draft',
    approvedAt: null,
    note: 'Pre-filled from agreed rules (TA Head, 18 Oct – 13 Nov 2026). Blank fields still need a decision.',
    maxima: { offers: 80, cycle: 15, vendor: 5 }, // TA Head 13 Nov 2026: delivery = 100% of rating (cycle 15, vendor 5)
    categories: agreedCategories(),
    ftcNoGradePoints: 2,
    womenBonus: 0.5,
    declineAdjustment: -0.25,
    includeExtraPoints: true,
    workingDaysInYear: 254,
    holidays: [],
    leadTeamAverage: true,
    offersFormula: 'capped-attainment', // 80 × min(attainment, 1) — confirmed by TA Head 13 Nov 2026
    // Thresholds agreed 18 Oct (strong < 45 days, acceptable ≤ 55); points 15 / 9 / 3 (cycle time weight 15, TA Head 13 Nov 2026).
    cycleTime: {
      bands: [
        { upTo: 44.99, points: 15 },
        { upTo: 55, points: 9 },
        { upTo: null, points: 3 },
      ],
    },
    // Thresholds agreed 18 Oct (< 10%, 10–20%, > 20%); points 5 / 3 / 1 (vendor weight 5, TA Head 13 Nov 2026).
    vendor: {
      bands: [
        { upTo: 9.99, points: 5 },
        { upTo: 20, points: 3 },
        { upTo: null, points: 1 },
      ],
    },
    ratingBands: [
      { minPct: 130, label: 'Exceptional' },
      { minPct: 110, label: 'Exceeds Expectations' },
      { minPct: 95, label: 'Meets Expectations' },
      { minPct: 85, label: 'Developing' },
      { minPct: 0, label: 'Not Meeting Expectations' },
    ],
    roundingDecimals: 2,
    growthWeights: { projects: null, selfDev: null, training: null, behaviours: null, feedback: null },
    matrix: { deliveryLow: null, deliveryHigh: null, growthLow: null, growthHigh: null, labels: Array(9).fill('') },
  };
}

export function emptyData(year: number): AppData {
  return {
    schemaVersion: 1,
    orgName: 'My organisation',
    years: [{ year, status: 'open', closedAt: null }],
    recruiters: [],
    offers: [],
    requisitions: [],
    extraPoints: [],
    growth: [],
    projects: [],
    training: [],
    feedback: [],
    devPlans: [],
    reviews: [],
    ruleVersions: [defaultRuleVersion(year, `RV-${year}-1`)],
    imports: [],
    audit: [],
    retentionYears: 3,
  };
}

/** One-time update of DRAFT rule versions to the 13 Nov 2026 weights (80 / 5 / 15). Approved versions are never changed. */
export function migrate(d: AppData, user: string): boolean {
  let changed = false;
  for (const r of d.ruleVersions) {
    if (r.status !== 'draft' || (r.maxima.offers === 80 && r.maxima.cycle === 5 && r.maxima.vendor === 15)) continue;
    if (!(r.maxima.offers === 80 && r.maxima.cycle === 15 && r.maxima.vendor === 5)) continue; // only the old default
    if (r.cycleTime.bands.some((b) => b.points !== null)) continue; // old default had blank cycle points; the current 80/15/5 has them set
    r.maxima = { offers: 80, cycle: 5, vendor: 15 };
    r.cycleTime.bands = r.cycleTime.bands.map((b) => ({ ...b, points: null }));
    r.vendor.bands = r.vendor.bands.map((b) => ({ ...b, points: null }));
    r.note += ' Weights changed to 80 / 5 / 15 (TA Head, 13 Nov 2026); cycle and vendor points cleared for re-entry on the new scale.';
    d.audit.unshift({ at: new Date().toISOString(), user, action: 'Rule version updated', detail: `${r.year} v${r.version} (draft): delivery weights 80/15/5 → 80/5/15; cycle-time and vendor points cleared` });
    changed = true;
  }
  // Second step (TA Head, 13 Nov 2026): fill still-blank cycle/vendor points and confirm the offers formula on 80/5/15 drafts.
  for (const r of d.ruleVersions) {
    if (r.status !== 'draft' || r.maxima.offers !== 80 || r.maxima.cycle !== 5 || r.maxima.vendor !== 15) continue;
    const cyc = [5, 3, 1];
    const ven = [15, 9, 3];
    const fill = (bands: { upTo: number | null; points: number | null }[], pts: number[]) =>
      bands.length === 3 && bands.every((b) => b.points === null) ? (bands.forEach((b, i) => (b.points = pts[i])), true) : false;
    const parts: string[] = [];
    if (fill(r.cycleTime.bands, cyc)) parts.push('cycle-time points 5/3/1');
    if (fill(r.vendor.bands, ven)) parts.push('vendor points 15/9/3');
    if (r.offersFormula === null) {
      r.offersFormula = 'capped-attainment';
      parts.push('offers formula 80 × min(attainment, 1) confirmed');
    }
    if (parts.length) {
      d.audit.unshift({ at: new Date().toISOString(), user, action: 'Rule version updated', detail: `${r.year} v${r.version} (draft): ${parts.join('; ')} (TA Head, 13 Nov 2026)` });
      changed = true;
    }
  }
  // Fourth step (TA Head, 13 Nov 2026): swap weights to cycle time 15 / vendor usage 5 on drafts still at 80 / 5 / 15.
  for (const r of d.ruleVersions) {
    if (r.status !== 'draft' || r.maxima.offers !== 80 || r.maxima.cycle !== 5 || r.maxima.vendor !== 15) continue;
    r.maxima = { offers: 80, cycle: 15, vendor: 5 };
    const same = (bands: { points: number | null }[], pts: number[]) => bands.length === 3 && bands.every((b, i) => b.points === pts[i]);
    if (same(r.cycleTime.bands, [5, 3, 1])) r.cycleTime.bands.forEach((b, i) => (b.points = [15, 9, 3][i]));
    if (same(r.vendor.bands, [15, 9, 3])) r.vendor.bands.forEach((b, i) => (b.points = [5, 3, 1][i]));
    d.audit.unshift({ at: new Date().toISOString(), user, action: 'Rule version updated', detail: `${r.year} v${r.version} (draft): weights 80/5/15 → 80/15/5 (cycle time 15, vendor usage 5); cycle points 15/9/3, vendor points 5/3/1 (TA Head, 13 Nov 2026)` });
    changed = true;
  }
  // Third step (TA Head, 13 Nov 2026): rename rating bands on draft versions; thresholds unchanged.
  const RENAME: Record<string, string> = { High: 'Exceeds Expectations', Good: 'Meets Expectations', Adequate: 'Developing', Low: 'Not Meeting Expectations' };
  for (const r of d.ruleVersions) {
    if (r.status !== 'draft' || !r.ratingBands.some((b) => RENAME[b.label])) continue;
    r.ratingBands = r.ratingBands.map((b) => ({ ...b, label: RENAME[b.label] ?? b.label }));
    d.audit.unshift({ at: new Date().toISOString(), user, action: 'Rule version updated', detail: `${r.year} v${r.version} (draft): rating bands renamed to Exceptional / Exceeds / Meets Expectations / Developing / Not Meeting Expectations (TA Head, 13 Nov 2026)` });
    changed = true;
  }
  return changed;
}
