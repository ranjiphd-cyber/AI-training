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
    note: 'Pre-filled from agreed rules (TA Head, 18–26 Oct 2026). Blank fields still need a decision.',
    maxima: { offers: 80, cycle: 15, vendor: 5 },
    categories: agreedCategories(),
    ftcNoGradePoints: 2,
    womenBonus: 0.5,
    declineAdjustment: -0.25,
    includeExtraPoints: true,
    workingDaysInYear: 254,
    holidays: [],
    leadTeamAverage: true,
    offersFormula: null, // proposed: 80 × min(attainment, 1) — needs TA Head confirmation
    // Thresholds agreed 18 Oct (strong < 45 days, acceptable ≤ 55); points on the 15-point scale not yet agreed.
    cycleTime: {
      bands: [
        { upTo: 44.99, points: null },
        { upTo: 55, points: null },
        { upTo: null, points: null },
      ],
    },
    // Agreed 18 Oct (5-point component): < 10% → 5, 10–20% → 3, > 20% → 1.
    vendor: {
      bands: [
        { upTo: 9.99, points: 5 },
        { upTo: 20, points: 3 },
        { upTo: null, points: 1 },
      ],
    },
    ratingBands: [
      { minPct: 130, label: 'Exceptional' },
      { minPct: 110, label: 'High' },
      { minPct: 95, label: 'Good' },
      { minPct: 85, label: 'Adequate' },
      { minPct: 0, label: 'Low' },
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
