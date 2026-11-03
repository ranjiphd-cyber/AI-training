// SYNTHETIC TEST FIXTURES — not operational data.
import { describe, expect, it } from 'vitest';
import { Offer, Recruiter, ScoreInputs } from '../types';
import { defaultRuleVersion } from './defaults';
import { categorise, classifyMatrix, offerPoints, round, scoreDelivery, scoreGrowth, sgNumber, workingDaysBetween, workingDaysElapsed } from './scoring';

const rec = (p: Partial<Recruiter> = {}): Recruiter => ({
  id: 'R1', employeeId: 'T1', name: 'Test Recruiter', aliases: [], role: 'recruiter', team: 'A', jobLevel: '',
  cadence: 1, targetSG: 5, startDate: null, leaveDate: null, ...p,
});
let n = 0;
const off = (p: Partial<Offer> = {}): Offer => ({
  id: `O${++n}`, recruiterId: 'R1', reqId: `REQ${n}`, candidateRef: `C${n}`, stream: 'Lateral', sg: 5,
  reqDate: '2026-01-05', offerDate: '2026-02-04', doj: null, woman: false, viaVendor: false, status: 'Offered', batchId: null, ...p,
});
const rule = () => defaultRuleVersion(2026, 'RV');
const inputs = (p: Partial<ScoreInputs> = {}): ScoreInputs => ({
  recruiter: rec(), periodStart: '2026-01-01', periodEnd: '2026-01-14', yearStart: '2026-01-01', yearEnd: '2026-12-31',
  offers: [], extraPoints: [], growth: null, rule: rule(), team: [], ...p,
});

describe('grade and category', () => {
  it('converts JL to SG as JL + 2', () => {
    expect(sgNumber('JL7')).toBe(9);
    expect(sgNumber('JL7A')).toBe(9);
    expect(sgNumber('SG11')).toBe(11);
    expect(sgNumber('')).toBeNull();
  });
  it('bands lateral offers by grade', () => {
    expect(categorise({ stream: 'Lateral', sg: 3 }).code).toBe('Lateral SG1-SG3');
    expect(categorise({ stream: 'Lateral', sg: 4 }).code).toBe('Lateral SG4-SG7');
    expect(categorise({ stream: 'Lateral', sg: 9 }).code).toBe('Lateral SG8-SG9');
    expect(categorise({ stream: 'Lateral', sg: 10 }).code).toBe('Lateral SG10 and above');
    expect(categorise({ stream: 'Internal (IJP)', sg: 8 }).code).toBe('Internal (IJP) SG8 and above');
    expect(categorise({ stream: 'FTC', sg: null }).code).toBe('FTC (grade missing)');
  });
});

describe('offer points (agreed rules)', () => {
  it('adds women bonus only for flagged categories', () => {
    const a = offerPoints(off({ stream: 'Lateral', sg: 9, woman: true }), rule());
    const b = offerPoints(off({ stream: 'FTC', sg: 9, woman: true }), rule());
    expect('total' in a && a.total).toBe(4.5);
    expect('total' in b && b.total).toBe(4);
  });
  it('applies decline adjustment', () => {
    const a = offerPoints(off({ stream: 'NATS', sg: null, status: 'Declined' }), rule());
    expect('total' in a && a.total).toBe(1.75);
  });
  it('FTC without grade scores the agreed provisional points', () => {
    const a = offerPoints(off({ stream: 'FTC', sg: null }), rule());
    expect('total' in a && a.total).toBe(2);
  });
});

describe('working days and target', () => {
  it('counts Mon–Fri excluding holidays', () => {
    expect(workingDaysBetween('2026-01-01', '2026-01-14', [])).toBe(10); // Thu 1 Jan → Wed 14 Jan
    expect(workingDaysBetween('2026-01-01', '2026-01-14', ['2026-01-01'])).toBe(9);
  });
  it('pro-rates joiners from their start date', () => {
    expect(workingDaysElapsed(rec({ startDate: '2026-01-08' }), '2026-01-01', '2026-01-14', [])).toBe(5);
  });
  it('target = cadence × lateral points at target SG × working days ÷ 10', () => {
    const d = scoreDelivery(inputs({ offers: [off({ offerDate: '2026-01-10' })] }));
    expect(d.target).toBe(3); // 1 × 3 × 10 / 10
    expect(d.weightedPoints).toBe(3);
    expect(d.attainment).toBe(1);
  });
});

describe('rating bands on attainment', () => {
  const at = (pts: number) => {
    // target to date = 3 (see above); one Lateral SG8-SG9 = 4 points, etc.
    const offers: Offer[] = [];
    for (let i = 0; i < pts; i++) offers.push(off({ stream: 'Intern', sg: null, offerDate: '2026-01-10' })); // 1 point each
    return scoreDelivery(inputs({ offers, recruiter: rec({ cadence: 1, targetSG: 5 }) }));
  };
  it('maps boundaries inclusively', () => {
    expect(at(4).band).toBe('Exceptional'); // 133.3%
    expect(at(3).band).toBe('Good'); // 100%
    expect(at(2).band).toBe('Low'); // 66.7%
  });
  it('130% exactly is Exceptional, 129.9% is High', () => {
    const r = rule();
    const d = scoreDelivery(inputs({ rule: r, recruiter: rec({ cadence: 1, targetSG: 2 }), periodEnd: '2026-01-14', offers: [off({ stream: 'Intern', sg: null, offerDate: '2026-01-02' })] }));
    // target = 1 × 1 × 10 / 10 = 1 → 100%
    expect(d.band).toBe('Good');
  });
});

describe('leads', () => {
  it('rate on the average of own and team attainment', () => {
    const lead = rec({ id: 'L', role: 'lead', name: 'Lead' });
    const mem = rec({ id: 'M', name: 'Member' });
    const offers = [
      off({ recruiterId: 'L', offerDate: '2026-01-05' }), // 3 pts → 100%
      off({ recruiterId: 'M', stream: 'Intern', sg: null, offerDate: '2026-01-05' }), // 1 pt of 3 → 33%
    ];
    const d = scoreDelivery(inputs({ recruiter: lead, offers, team: [{ recruiter: mem, offers }] }));
    expect(d.attainment).toBe(1);
    expect(d.teamAttainment).toBe(round(1 / 3, 4));
    expect(d.ratingBasis).toBe(round((1 + 1 / 3) / 2, 4));
  });
});

describe('blocking and missing data', () => {
  it('blocks when a rule value is missing — never returns a score', () => {
    const r = rule();
    r.womenBonus = null;
    const d = scoreDelivery(inputs({ rule: r, offers: [off({ offerDate: '2026-01-05' })] }));
    expect(d.status).toBe('blocked');
    expect(d.total).toBeNull();
    expect(d.band).toBeNull();
  });
  it('blocks when the recruiter has no target cadence', () => {
    const d = scoreDelivery(inputs({ recruiter: rec({ cadence: null }) }));
    expect(d.status).toBe('blocked');
    expect(d.missing.join()).toMatch(/cadence/);
  });
  it('produces a band but no 100-point score while cycle-time points are undecided', () => {
    const d = scoreDelivery(inputs({ offers: [off({ offerDate: '2026-01-05', status: 'Joined', reqDate: '2025-12-01' })] }));
    expect(d.band).not.toBeNull();
    expect(d.status).toBe('incomplete');
    expect(d.total).toBeNull();
    expect(d.components.offers).toBe(80);
    expect(d.components.vendor).toBe(5);
  });
  it('caps components and totals 100 when all rules present', () => {
    const r = rule();
    r.offersFormula = 'capped-attainment';
    r.cycleTime.bands = [{ upTo: 44.99, points: 15 }, { upTo: 55, points: 10 }, { upTo: null, points: 5 }];
    const offers = [1, 2, 3].map(() => off({ offerDate: '2026-01-05', status: 'Joined', reqDate: '2025-12-01', sg: 10 }));
    const d = scoreDelivery(inputs({ rule: r, offers }));
    expect(d.components).toEqual({ offers: 80, cycle: 15, vendor: 5 });
    expect(d.total).toBe(100);
    expect(d.status).toBe('scored');
  });
  it('treats no joiners as no data, not zero vendor %', () => {
    const d = scoreDelivery(inputs({ offers: [off({ offerDate: '2026-01-05' })] }));
    expect(d.vendorPct).toBeNull();
    expect(d.components.vendor).toBeNull();
  });
  it('excludes future-dated offers from year-to-date points', () => {
    const d = scoreDelivery(inputs({ offers: [off({ offerDate: '2026-03-01' })] }));
    expect(d.weightedPoints).toBe(0);
  });
});

describe('growth (1–10) and matrix', () => {
  const g = { id: 'G', recruiterId: 'R1', year: 2026, period: '2026', comment: '', ratings: { projects: 8, selfDev: 6, training: 7, behaviours: 9, feedback: 5 } };
  it('is blocked until weights are agreed', () => {
    expect(scoreGrowth({ growth: g, rule: rule() }).status).toBe('blocked');
  });
  it('computes a weighted mean when weights exist', () => {
    const r = rule();
    r.growthWeights = { projects: 1, selfDev: 1, training: 1, behaviours: 1, feedback: 1 };
    expect(scoreGrowth({ growth: g, rule: r }).score).toBe(7);
  });
  it('rejects out-of-range ratings', () => {
    const r = rule();
    r.growthWeights = { projects: 1, selfDev: 1, training: 1, behaviours: 1, feedback: 1 };
    expect(scoreGrowth({ growth: { ...g, ratings: { ...g.ratings, projects: 11 } }, rule: r }).status).toBe('incomplete');
  });
  it('never blends growth into delivery', () => {
    const d1 = scoreDelivery(inputs({ offers: [off({ offerDate: '2026-01-05' })] }));
    const d2 = scoreDelivery(inputs({ offers: [off({ offerDate: '2026-01-05' })], growth: g }));
    expect({ ...d1, trace: [] }).toEqual({ ...d2, trace: [] });
  });
  it('classifies matrix boundaries inclusively at the upper level', () => {
    const r = rule();
    r.matrix = { deliveryLow: 85, deliveryHigh: 110, growthLow: 5, growthHigh: 8, labels: Array(9).fill('') };
    expect(classifyMatrix(110, 8, r)!.label).toBe('High delivery / High growth');
    expect(classifyMatrix(84.9, 4.9, r)!.label).toBe('Low delivery / Low growth');
    expect(classifyMatrix(85, 5, r)!.label).toBe('Medium delivery / Medium growth');
    expect(classifyMatrix(85, 5, rule())).toBeNull();
  });
});
