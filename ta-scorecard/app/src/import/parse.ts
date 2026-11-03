// Import helpers: header mapping, value parsing and validation. Pure functions (tested).
import { OFFER_STATUSES, OfferStatus, Recruiter, Stream, STREAMS } from '../types';
import { sgNumber } from '../engine/scoring';

export type Kind = 'offers' | 'requisitions' | 'recruiters';

export interface FieldDef {
  key: string;
  label: string;
  required: boolean;
  synonyms: string[];
}

export const FIELDS: Record<Kind, FieldDef[]> = {
  offers: [
    { key: 'recruiter', label: 'Recruiter (name, alias or employee ID)', required: true, synonyms: ['recruiter', 'recruiter name', 'ta owner', 'owner'] },
    { key: 'reqId', label: 'Req ID', required: true, synonyms: ['req id', 'requisition id', 'req', 'sfid', 'job req id', 'requisition'] },
    { key: 'candidateRef', label: 'Candidate ref / ID', required: false, synonyms: ['candidate id', 'candidate', 'cand', 'candidate ref', 'candidate name', 'name'] },
    { key: 'stream', label: 'Hiring stream', required: true, synonyms: ['stream', 'hiring stream', 'category', 'hiring category', 'type of hiring'] },
    { key: 'sg', label: 'Grade (SG or JL)', required: false, synonyms: ['sg', 'salary grade', 'grade', 'jl', 'job level', 'band'] },
    { key: 'reqDate', label: 'Requisition approved date', required: false, synonyms: ['req date', 'requisition approved date', 'req approved', 'approved date', 'req approval date', 'requisition date'] },
    { key: 'offerDate', label: 'Offer date', required: true, synonyms: ['offer date', 'offer released', 'offer release date', 'date of offer'] },
    { key: 'doj', label: 'Date of joining', required: false, synonyms: ['doj', 'actual doj', 'date of joining', 'joining date', 'joined on'] },
    { key: 'gender', label: 'Gender', required: false, synonyms: ['gender', 'sex'] },
    { key: 'source', label: 'Source (Vendor = vendor)', required: false, synonyms: ['source', 'sourcing channel', 'channel', 'vendor'] },
    { key: 'status', label: 'Status', required: true, synonyms: ['status', 'offer status'] },
  ],
  requisitions: [
    { key: 'recruiter', label: 'Recruiter', required: true, synonyms: ['recruiter', 'recruiter name', 'ta owner', 'owner'] },
    { key: 'reqId', label: 'Req ID', required: true, synonyms: ['req id', 'requisition id', 'req', 'sfid', 'job req id'] },
    { key: 'title', label: 'Position', required: false, synonyms: ['position', 'title', 'job title', 'role'] },
    { key: 'openDate', label: 'Opened / approved date', required: true, synonyms: ['open date', 'approved date', 'req approved', 'opened', 'requisition approved date', 'req date'] },
    { key: 'status', label: 'Status (open / on-hold / closed)', required: false, synonyms: ['status', 'req status'] },
  ],
  recruiters: [
    { key: 'employeeId', label: 'Employee ID', required: true, synonyms: ['employee id', 'emp id', 'id'] },
    { key: 'name', label: 'Name', required: true, synonyms: ['employee name', 'name', 'recruiter'] },
    { key: 'role', label: 'Role (Recruiter / Lead)', required: false, synonyms: ['role', 'type'] },
    { key: 'team', label: 'Team', required: false, synonyms: ['team', 'ta team', 'business area'] },
    { key: 'jobLevel', label: 'Job level', required: false, synonyms: ['job level', 'level', 'grade'] },
    { key: 'cadence', label: 'Cadence (offers / 10 working days)', required: false, synonyms: ['cadence', 'target cadence'] },
    { key: 'targetSG', label: 'Target grade', required: false, synonyms: ['target sg', 'target grade'] },
    { key: 'startDate', label: 'Start date (mid-year)', required: false, synonyms: ['start date', 'joining date', 'start date (if mid-year)'] },
    { key: 'leaveDate', label: 'Leaving date', required: false, synonyms: ['leaving date', 'exit date', 'left on'] },
  ],
};

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase().replace(/[*_]/g, ' ').replace(/\s+/g, ' ');

/** Best-effort automatic header → field mapping. The user confirms or changes it before validation. */
export function autoMap(kind: Kind, headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const used = new Set<string>();
  for (const f of FIELDS[kind]) {
    const exact = headers.find((h) => !used.has(h) && f.synonyms.includes(norm(h)));
    const partial = exact ?? headers.find((h) => !used.has(h) && f.synonyms.some((s) => norm(h).includes(s) && s.length > 2));
    if (partial) {
      map[f.key] = partial;
      used.add(partial);
    }
  }
  return map;
}

/** Dates: Excel serial numbers, YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, or JS Date. Returns null if blank, 'invalid' if unparseable. */
export function parseDate(v: unknown): string | null | 'invalid' {
  if (v === null || v === undefined || v === '' || v === '-') return null;
  const iso = (y: number, m: number, d: number) => {
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return 'invalid' as const;
    return dt.toISOString().slice(0, 10);
  };
  if (v instanceof Date) return isNaN(v.getTime()) ? 'invalid' : iso(v.getFullYear(), v.getMonth() + 1, v.getDate());
  if (typeof v === 'number') {
    if (v < 20000 || v > 80000) return 'invalid';
    return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return iso(+m[3], +m[2], +m[1]); // day first (India / Europe)
  return 'invalid';
}

export function parseStream(v: unknown): Stream | null {
  const s = norm(v);
  if (!s) return null;
  const direct = STREAMS.find((x) => norm(x) === s);
  if (direct) return direct;
  if (s.includes('get') || s.includes('fresher') || s.includes('campus /')) return 'GET / PGET';
  if (s.includes('ijp') || s.includes('internal')) return 'Internal (IJP)';
  if (s.includes('intern') && s.includes('conversion')) return 'Campus intern conversion';
  if (s.includes('conversion')) return 'Conversion to employment';
  if (s.includes('excelher')) return 'ExcelHER';
  if (s.includes('nats')) return 'NATS';
  if (s.includes('aicte') || s.includes('phd')) return 'AICTE / PhD';
  if (s.includes('ftc') || s.includes('fixed term')) return 'FTC';
  if (s.includes('lateral')) return 'Lateral';
  if (s === 'intern' || s === 'internship') return 'Intern';
  return null;
}

export function parseStatus(v: unknown): OfferStatus | null {
  const s = norm(v);
  const hit = OFFER_STATUSES.find((x) => norm(x) === s);
  if (hit) return hit;
  if (s.includes('revok') || s.includes('withdraw') || s.includes('cancel')) return 'Offer revoked';
  if (s.includes('declin') || s.includes('reneg') || s.includes('no show')) return 'Declined';
  if (s.includes('join')) return 'Joined';
  if (s.includes('offer') || s.includes('accept') || s.includes('yet to join')) return 'Offered';
  return null;
}

export function matchRecruiter(v: unknown, all: Recruiter[]): Recruiter | null {
  const s = norm(v);
  if (!s) return null;
  return all.find((r) => norm(r.employeeId) === s || norm(r.name) === s || r.aliases.some((a) => norm(a) === s)) ?? null;
}

export interface Staged {
  row: number; // source row number (1-based, as in the spreadsheet)
  values: Record<string, unknown>;
  record: Record<string, unknown> | null;
  errors: string[];
  warnings: string[];
  duplicate: boolean;
}

export function validateRow(kind: Kind, raw: Record<string, unknown>, rowNo: number, recruiters: Recruiter[]): Staged {
  const errors: string[] = [];
  const warnings: string[] = [];
  const get = (k: string) => raw[k];
  for (const f of FIELDS[kind]) if (f.required && (get(f.key) === undefined || get(f.key) === null || String(get(f.key)).trim() === '')) errors.push(`${f.label} is missing`);
  let record: Record<string, unknown> | null = null;
  const date = (k: string, label: string) => {
    const d = parseDate(get(k));
    if (d === 'invalid') {
      errors.push(`${label} "${get(k)}" is not a date`);
      return null;
    }
    return d;
  };
  if (kind === 'offers') {
    const rec = matchRecruiter(get('recruiter'), recruiters);
    if (get('recruiter') && !rec) errors.push(`Recruiter "${get('recruiter')}" not found (add them or an alias in Recruiter Profiles)`);
    const stream = parseStream(get('stream'));
    if (get('stream') && !stream) errors.push(`Stream "${get('stream')}" not recognised`);
    const status = parseStatus(get('status'));
    if (get('status') && !status) errors.push(`Status "${get('status')}" not recognised`);
    const sg = sgNumber(get('sg'));
    if (get('sg') && sg === null) warnings.push(`Grade "${get('sg')}" not recognised — treated as missing`);
    const reqDate = date('reqDate', 'Requisition date');
    const offerDate = date('offerDate', 'Offer date');
    const doj = date('doj', 'Date of joining');
    if (reqDate && offerDate && reqDate > offerDate) warnings.push('Requisition date is after the offer date');
    if (stream && ['Lateral', 'FTC', 'Conversion to employment', 'Campus intern conversion'].includes(stream) && !reqDate) warnings.push('No requisition date: excluded from cycle time');
    if (status === 'Joined' && !doj) warnings.push('Joined without a date of joining');
    const g = norm(get('gender'));
    const src = norm(get('source'));
    if (!errors.length)
      record = {
        recruiterId: rec!.id,
        reqId: String(get('reqId')).trim(),
        candidateRef: String(get('candidateRef') ?? '').trim(),
        stream,
        sg,
        reqDate,
        offerDate,
        doj,
        woman: g === 'female' || g === 'f' || g === 'woman',
        viaVendor: src.includes('vendor') || src.includes('agency') || src.includes('consultant'),
        status,
      };
  } else if (kind === 'requisitions') {
    const rec = matchRecruiter(get('recruiter'), recruiters);
    if (get('recruiter') && !rec) errors.push(`Recruiter "${get('recruiter')}" not found`);
    const openDate = date('openDate', 'Opened date');
    const st = norm(get('status'));
    const status = !st || st.includes('open') || st.includes('progress') || st.includes('sourcing') ? 'open' : st.includes('hold') ? 'on-hold' : st.includes('clos') || st.includes('fill') ? 'closed' : null;
    if (status === null) errors.push(`Status "${get('status')}" not recognised`);
    if (!errors.length) record = { recruiterId: rec!.id, reqId: String(get('reqId')).trim(), title: String(get('title') ?? ''), openDate, status, closedDate: null };
  } else {
    const startDate = date('startDate', 'Start date');
    const leaveDate = date('leaveDate', 'Leaving date');
    const role = norm(get('role')).includes('lead') ? 'lead' : 'recruiter';
    const cad = get('cadence');
    const cadence = cad === undefined || cad === null || cad === '' ? null : Number(cad);
    if (cadence !== null && !Number.isFinite(cadence)) errors.push('Cadence is not a number');
    const targetSG = sgNumber(get('targetSG'));
    if (!errors.length)
      record = {
        employeeId: String(get('employeeId')).trim(),
        name: String(get('name')).trim(),
        aliases: [],
        role,
        team: String(get('team') ?? ''),
        jobLevel: String(get('jobLevel') ?? ''),
        cadence,
        targetSG,
        startDate,
        leaveDate,
      };
  }
  return { row: rowNo, values: raw, record, errors, warnings, duplicate: false };
}

/** Proposed duplicate keys (D-IMP-02): offers = Req ID + candidate ref; requisitions = Req ID; recruiters = employee ID. */
export function dupKey(kind: Kind, rec: Record<string, unknown>): string {
  if (kind === 'offers') return `${norm(rec.reqId)}|${norm(rec.candidateRef)}`;
  if (kind === 'requisitions') return norm(rec.reqId);
  return norm(rec.employeeId);
}
