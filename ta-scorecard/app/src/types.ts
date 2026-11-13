// Domain model. All dates are ISO "YYYY-MM-DD" strings (calendar dates, no time zone).

export type ID = string;
export type Role = 'recruiter' | 'lead';

export interface Recruiter {
  id: ID;
  employeeId: string;
  name: string;
  aliases: string[];
  role: Role;
  team: string;
  jobLevel: string;
  cadence: number | null; // target offers per 10 working days
  targetSG: number | null; // salary grade the target is set at (SG = JL + 2)
  startDate: string | null; // joining date (null = before the year started)
  leaveDate: string | null; // leaving date (null = active)
}

export interface Offer {
  id: ID;
  recruiterId: ID;
  reqId: string;
  candidateRef: string; // reference only, no candidate personal data required
  stream: Stream;
  sg: number | null; // salary grade (SG); JL converted with SG = JL + 2
  reqDate: string | null; // requisition approved date
  offerDate: string;
  doj: string | null; // actual date of joining
  woman: boolean;
  viaVendor: boolean;
  status: OfferStatus;
  batchId: ID | null;
}

export const STREAMS = [
  'Lateral',
  'FTC',
  'Conversion to employment',
  'Campus intern conversion',
  'Internal (IJP)',
  'NATS',
  'GET / PGET',
  'ExcelHER',
  'AICTE / PhD',
  'Intern',
] as const;
export type Stream = (typeof STREAMS)[number];
/** Streams in scope for cycle time, vendor, diversity and decline measures (campus intern conversions count as lateral). */
export const IN_SCOPE: Stream[] = ['Lateral', 'FTC', 'Conversion to employment', 'Campus intern conversion'];
export const OFFER_STATUSES = ['Offered', 'Joined', 'Declined', 'Offer revoked'] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export interface Requisition {
  id: ID;
  recruiterId: ID;
  reqId: string;
  title: string;
  openDate: string;
  status: 'open' | 'closed' | 'on-hold';
  closedDate: string | null;
  batchId: ID | null;
}

export interface ExtraPoint {
  id: ID;
  recruiterId: ID;
  date: string;
  points: number;
  reason: string;
  evidence: string;
  approved: boolean;
}

export const GROWTH_KEYS = ['projects', 'selfDev', 'training', 'behaviours', 'feedback'] as const;
export type GrowthKey = (typeof GROWTH_KEYS)[number];
export const GROWTH_LABELS: Record<GrowthKey, string> = {
  projects: 'Projects',
  selfDev: 'Self-development',
  training: 'Training',
  behaviours: 'Behaviours',
  feedback: 'Stakeholder feedback',
};

export interface GrowthAssessment {
  id: ID;
  recruiterId: ID;
  year: number;
  period: string; // e.g. "2026-Q2" or "2026"
  ratings: Record<GrowthKey, number | null>; // 1–10
  comment: string;
}

export interface Project {
  id: ID;
  recruiterId: ID;
  year: number;
  title: string;
  objective: string;
  status: 'planned' | 'in-progress' | 'completed' | 'dropped';
  outcome: string; // evidence of outcome; free text
}

export interface Training {
  id: ID;
  recruiterId: ID;
  year: number;
  programme: string;
  provider: string;
  startDate: string | null;
  completionDate: string | null;
  status: 'planned' | 'in-progress' | 'completed';
  applicationEvidence: string; // how it was applied on the job
}

export interface Feedback {
  id: ID;
  recruiterId: ID;
  date: string;
  source: string; // stakeholder role, e.g. "Hiring manager — Engineering"
  rating: number | null; // 1–10
  comment: string;
}

export interface CheckIn {
  date: string;
  currentRating: number | null;
  note: string;
}

export interface DevPlan {
  id: ID;
  recruiterId: ID;
  year: number;
  area: string;
  baseline: number | null;
  target: number | null;
  current: number | null;
  evidence: string;
  actions: string;
  owner: string;
  dueDate: string | null;
  trainingSupport: string;
  checkIns: CheckIn[];
  completionEvidence: string;
  status: 'open' | 'completed';
}

export type ReviewType = '10-day' | 'monthly' | 'quarterly' | 'annual';

export interface Review {
  id: ID;
  recruiterId: ID;
  year: number;
  type: ReviewType;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  date: string;
  ruleVersionId: ID;
  snapshot: ReviewSnapshot; // frozen engine inputs + outputs
  finalRating: string | null; // manager-calibrated rating (separate from calculated band)
  calibrationNote: string;
  commentary: string;
  agreedActions: string;
  status: 'draft' | 'approved';
  approvedBy: string | null;
  approvedAt: string | null;
}

export interface ReviewSnapshot {
  takenAt: string;
  inputs: ScoreInputs;
  delivery: DeliveryResult;
  growth: GrowthResult;
}

// ---------- Rule versions (all business parameters live here) ----------

export interface CategoryRule {
  code: string; // category name produced by categorise()
  points: number | null;
  womenBonus: boolean; // women bonus applies to this category
}
export interface ThresholdBand {
  upTo: number | null; // inclusive upper bound; null = "and above"
  points: number | null;
}
export interface RatingBand {
  minPct: number | null; // inclusive lower bound on attainment % (points ÷ target to date × 100)
  label: string;
}

export interface RuleVersion {
  id: ID;
  year: number;
  version: number;
  status: 'draft' | 'approved';
  approvedAt: string | null;
  note: string;
  maxima: { offers: number; cycle: number; vendor: number }; // TA Head 13 Nov 2026: 80 / 5 / 15
  categories: CategoryRule[];
  ftcNoGradePoints: number | null; // FTC offer without a grade
  womenBonus: number | null; // points added per offer to a woman, for categories flagged womenBonus
  declineAdjustment: number | null; // points added per declined offer (negative)
  includeExtraPoints: boolean;
  workingDaysInYear: number | null; // e.g. 254
  holidays: string[]; // excluded from working days elapsed
  leadTeamAverage: boolean; // leads rated on average of own and team attainment
  offersFormula: 'capped-attainment' | null; // offers score = max × min(attainment, 1)
  cycleTime: { bands: ThresholdBand[] }; // calendar days, requisition approved → offer
  vendor: { bands: ThresholdBand[] }; // upTo = vendor % of joiners (0–100)
  ratingBands: RatingBand[];
  roundingDecimals: number | null;
  growthWeights: Record<GrowthKey, number | null>;
  matrix: {
    deliveryLow: number | null; // delivery < low → Low; < high → Medium; else High
    deliveryHigh: number | null;
    growthLow: number | null;
    growthHigh: number | null;
    labels: string[]; // 9 labels: index = growthLevel*3 + deliveryLevel (0=Low)
  };
}

// ---------- Engine I/O ----------

export interface ScoreInputs {
  recruiter: Recruiter;
  periodStart: string;
  periodEnd: string;
  yearStart: string;
  yearEnd: string;
  offers: Offer[];
  extraPoints: ExtraPoint[];
  growth: GrowthAssessment | null;
  rule: RuleVersion;
  team: { recruiter: Recruiter; offers: Offer[] }[]; // for leads: active team members (excl. the lead)
}

export interface TraceLine {
  step: string;
  detail: string;
  value?: number | string;
}

export interface DeliveryResult {
  status: 'scored' | 'blocked' | 'incomplete';
  missing: string[]; // missing rules or inputs
  warnings: string[];
  offersCounted: number;
  offersExcluded: { offerId: ID; reason: string }[];
  weightedPoints: number | null;
  target: number | null; // target to date (pro-rated)
  attainment: number | null; // own points ÷ target to date (fraction)
  teamAttainment: number | null; // leads only
  ratingBasis: number | null; // attainment used for the band
  workingDaysElapsed: number | null;
  avgCycleDays: number | null;
  vendorPct: number | null;
  womenPct: number | null;
  declinePct: number | null;
  components: { offers: number | null; cycle: number | null; vendor: number | null };
  total: number | null;
  band: string | null;
  trace: TraceLine[];
}

export interface GrowthResult {
  status: 'scored' | 'blocked' | 'incomplete';
  missing: string[];
  score: number | null; // weighted mean on 1–10 scale
  trace: TraceLine[];
}

// ---------- Persistence ----------

export interface AuditEvent {
  at: string;
  user: string;
  action: string;
  detail: string;
}

export interface ImportBatch {
  id: ID;
  kind: 'offers' | 'requisitions' | 'recruiters';
  fileName: string;
  at: string;
  rowsRead: number;
  rowsCommitted: number;
  rowsRejected: number;
  status: 'committed' | 'undone';
}

export interface YearRecord {
  year: number;
  status: 'open' | 'closed';
  closedAt: string | null;
}

export interface AppData {
  schemaVersion: 1;
  orgName: string;
  years: YearRecord[];
  recruiters: Recruiter[];
  offers: Offer[];
  requisitions: Requisition[];
  extraPoints: ExtraPoint[];
  growth: GrowthAssessment[];
  projects: Project[];
  training: Training[];
  feedback: Feedback[];
  devPlans: DevPlan[];
  reviews: Review[];
  ruleVersions: RuleVersion[];
  imports: ImportBatch[];
  audit: AuditEvent[];
  retentionYears: number; // 3 — approved
}
