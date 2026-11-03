// Builds engine inputs from stored data. Shared by dashboards, reviews and exports.
import { AppData, DeliveryResult, GrowthResult, Recruiter, RuleVersion, ScoreInputs } from '../types';
import { classifyMatrix, isLeaverInPeriod, MatrixPosition, scoreDelivery, scoreGrowth } from './scoring';

export interface Period {
  key: string;
  label: string;
  start: string;
  end: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export function periodsFor(year: number, today: string): Period[] {
  const ys = `${year}-01-01`;
  const ye = `${year}-12-31`;
  const ytdEnd = today >= ys && today <= ye ? today : ye;
  const out: Period[] = [{ key: 'YTD', label: today >= ys && today <= ye ? `Year to date (${ytdEnd})` : `Full year ${year}`, start: ys, end: ytdEnd }];
  for (let q = 1; q <= 4; q++) {
    const m1 = (q - 1) * 3 + 1;
    out.push({ key: `Q${q}`, label: `Q${q} ${year}`, start: `${year}-${pad(m1)}-01`, end: `${year}-${pad(m1 + 2)}-${lastDay(year, m1 + 2)}` });
  }
  for (let m = 1; m <= 12; m++) {
    const name = new Date(Date.UTC(year, m - 1, 1)).toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
    out.push({ key: `M${pad(m)}`, label: `${name} ${year}`, start: `${year}-${pad(m)}-01`, end: `${year}-${pad(m)}-${lastDay(year, m)}` });
  }
  return out;
}

/** Latest approved rule version for a year; otherwise the latest draft (results then marked provisional). */
export function activeRule(data: AppData, year: number): RuleVersion | null {
  const rv = data.ruleVersions.filter((r) => r.year === year).sort((a, b) => b.version - a.version);
  return rv.find((r) => r.status === 'approved') ?? rv[0] ?? null;
}

export function buildInputs(data: AppData, r: Recruiter, year: number, period: Period, rule: RuleVersion): ScoreInputs {
  const growth = data.growth.filter((g) => g.recruiterId === r.id && g.year === year).sort((a, b) => (a.period < b.period ? 1 : -1))[0] ?? null;
  const team =
    r.role === 'lead'
      ? data.recruiters.filter((m) => m.id !== r.id && m.team === r.team).map((m) => ({ recruiter: m, offers: data.offers.filter((o) => o.recruiterId === m.id) }))
      : [];
  return {
    recruiter: r,
    periodStart: period.start,
    periodEnd: period.end,
    yearStart: `${year}-01-01`,
    yearEnd: `${year}-12-31`,
    offers: data.offers.filter((o) => o.recruiterId === r.id),
    extraPoints: data.extraPoints,
    growth,
    rule,
    team,
  };
}

export interface Row {
  recruiter: Recruiter;
  delivery: DeliveryResult;
  growth: GrowthResult;
  matrix: MatrixPosition | null;
  leaver: boolean;
}

export function computeAll(data: AppData, year: number, period: Period): { rule: RuleVersion | null; rows: Row[] } {
  const rule = activeRule(data, year);
  if (!rule) return { rule: null, rows: [] };
  const rows = data.recruiters
    .filter((r) => !r.startDate || r.startDate <= period.end)
    .map((r) => {
      const inp = buildInputs(data, r, year, period, rule);
      const delivery = scoreDelivery(inp);
      const growth = scoreGrowth(inp);
      const matrix = delivery.ratingBasis !== null && growth.score !== null ? classifyMatrix(delivery.ratingBasis * 100, growth.score, rule) : null;
      return { recruiter: r, delivery, growth, matrix, leaver: isLeaverInPeriod(r, period.end) };
    });
  return { rule, rows };
}

/** Display name honouring the Show/Hide Names control (presentation only, not access control). */
export function displayName(r: Recruiter, show: boolean, all: Recruiter[]): string {
  if (show) return r.name;
  const idx = [...all].sort((a, b) => a.id.localeCompare(b.id)).findIndex((x) => x.id === r.id);
  return `Recruiter ${String.fromCharCode(65 + (idx % 26))}${idx >= 26 ? Math.floor(idx / 26) : ''}`;
}
