// Untrusted spreadsheet handling. Uploaded files are data, never code:
// formulas are rejected (never evaluated), macro containers are rejected, zip expansion is bounded,
// and exported text is neutralised against spreadsheet formula injection.
import ExcelJS from 'exceljs';
import { AppError, badRequest } from './errors.ts';

export const LIMITS = { maxBytes: 2 * 1024 * 1024, maxRows: 2000, maxUncompressed: 25 * 1024 * 1024, maxZipEntries: 200 };

export interface ParsedSheet { headers: string[]; rows: { rowNumber: number; values: Record<string, string> }[] }

const reject = (msg: string, details?: unknown) => new AppError(422, 'UNSAFE_OR_INVALID_FILE', msg,
  { resolution: 'Download the template, paste values only (no formulas or macros), save as .xlsx or .csv, and upload again.', details });

/** Reads the zip central directory without decompressing, to bound expansion and detect macro parts. */
export function inspectZip(buf: Buffer) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw reject('The file is not a valid .xlsx workbook.');
  const entries = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  if (entries > LIMITS.maxZipEntries) throw reject('The workbook contains too many internal parts.');
  let total = 0; const names: string[] = [];
  for (let n = 0; n < entries; n++) {
    if (off + 46 > buf.length || buf.readUInt32LE(off) !== 0x02014b50) throw reject('The workbook structure is corrupt.');
    total += buf.readUInt32LE(off + 24);
    const fl = buf.readUInt16LE(off + 28), el = buf.readUInt16LE(off + 30), cl = buf.readUInt16LE(off + 32);
    names.push(buf.subarray(off + 46, off + 46 + fl).toString('utf8'));
    off += 46 + fl + el + cl;
  }
  if (total > LIMITS.maxUncompressed) throw reject('The workbook expands to an unsafe size.');
  if (names.some((x) => /vbaProject\.bin$/i.test(x) || /activeX/i.test(x))) throw reject('Macro-enabled or ActiveX content is not accepted.');
  return { entries, uncompressed: total };
}

function cellText(v: ExcelJS.CellValue, where: string): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    if ('formula' in v || 'sharedFormula' in v) throw reject(`Formulas are not accepted (${where}). Paste values only.`);
    if ('richText' in v) return v.richText.map((t) => t.text).join('').trim();
    if ('text' in v) return String((v as any).text).trim();       // hyperlink cell: take the visible text only
    if ('error' in v) throw reject(`Cell ${where} contains an error value.`);
  }
  return String(v).trim();
}

export function parseCsv(text: string): string[][] {
  const out: string[][] = []; let row: string[] = []; let cur = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; continue; }
    if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); out.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); out.push(row); }
  return out;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Parses an uploaded .xlsx or .csv into header-keyed rows. Headers are matched against `expected` (case/punctuation-insensitive). */
export async function parseUpload(filename: string, buf: Buffer, expected: string[]): Promise<ParsedSheet> {
  if (buf.length === 0) throw reject('The file is empty.');
  if (buf.length > LIMITS.maxBytes) throw reject(`The file is larger than ${LIMITS.maxBytes / 1024 / 1024} MB.`);
  const ext = filename.toLowerCase().split('.').pop();
  let grid: string[][];
  if (ext === 'xlsx') {
    if (buf.readUInt32LE(0) !== 0x04034b50) throw reject('The file is not a genuine .xlsx workbook.');
    inspectZip(buf);
    const wb = new ExcelJS.Workbook();
    try { await wb.xlsx.load(buf as any); } catch { throw reject('The workbook could not be read.'); }
    const ws = wb.getWorksheet('Participants') ?? wb.worksheets[0];
    if (!ws) throw reject('The workbook has no sheets.');
    if (ws.actualRowCount - 1 > LIMITS.maxRows) throw reject(`Too many rows (maximum ${LIMITS.maxRows} per upload).`);
    grid = [];
    ws.eachRow({ includeEmpty: true }, (r, n) => {
      const vals: string[] = [];
      for (let c = 1; c <= Math.max(expected.length, r.cellCount); c++) vals.push(cellText(r.getCell(c).value, `row ${n}, column ${c}`));
      grid[n - 1] = vals;
    });
  } else if (ext === 'csv') {
    const text = buf.toString('utf8').replace(/^﻿/, '');
    if (text.includes('\u0000')) throw reject('The CSV file contains binary data.');
    grid = parseCsv(text);
    if (grid.length - 1 > LIMITS.maxRows) throw reject(`Too many rows (maximum ${LIMITS.maxRows} per upload).`);
  } else throw reject('Only .xlsx and .csv files are accepted (.xls, .xlsm and other formats are refused).');

  const header = (grid[0] ?? []).map((h) => norm(h ?? ''));
  const map: Record<string, number> = {};
  const missing: string[] = [];
  for (const e of expected) { const i = header.indexOf(norm(e)); if (i < 0) missing.push(e); else map[e] = i; }
  if (missing.length) throw reject('The header row does not match the template.', missing.map((m) => `Missing column: ${m}`));
  const rows: ParsedSheet['rows'] = [];
  for (let i = 1; i < grid.length; i++) {
    const g = grid[i]; if (!g) continue;
    const values: Record<string, string> = {};
    for (const e of expected) values[e] = (g[map[e]] ?? '').trim();
    if (Object.values(values).every((v) => v === '')) continue;
    rows.push({ rowNumber: i + 1, values });
  }
  if (!rows.length) throw badRequest('The file has a header row but no data rows.');
  return { headers: expected, rows };
}

/** Neutralise values that a spreadsheet would interpret as a formula (CSV/XLSX injection). */
export function safeCell(v: unknown): string | number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  const s = v instanceof Date ? v.toISOString() : String(v);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

export interface Report { title: string; columns: { key: string; header: string; width?: number }[]; rows: Record<string, unknown>[]; about: [string, string][] }

export async function toXlsx(r: Report): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'VTC Control Centre'; wb.created = new Date();
  const ws = wb.addWorksheet('Report', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = r.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }));
  ws.getRow(1).font = { bold: true };
  for (const row of r.rows) ws.addRow(Object.fromEntries(r.columns.map((c) => [c.key, safeCell(row[c.key])])));
  if (r.columns.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: r.columns.length } };
  const about = wb.addWorksheet('About this report');
  about.columns = [{ width: 28 }, { width: 100 }];
  for (const [k, v] of r.about) about.addRow([k, safeCell(v)]);
  about.getColumn(1).font = { bold: true };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function toCsv(r: Report): Buffer {
  const esc = (v: unknown) => { const s = v === null || v === undefined ? '' : String(safeCell(v)); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines = [r.columns.map((c) => esc(c.header)).join(','), ...r.rows.map((row) => r.columns.map((c) => esc(row[c.key])).join(','))];
  return Buffer.from('﻿' + lines.join('\r\n') + '\r\n', 'utf8');   // BOM so Excel reads UTF-8 names correctly
}

export const PARTICIPANT_COLUMNS = ['Participant type', 'Full name', 'Email', 'Roll or staff number', 'Department', 'Year of study'];

export async function participantTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Participants', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = PARTICIPANT_COLUMNS.map((h) => ({ header: h, width: h === 'Full name' || h === 'Email' ? 32 : 22 }));
  ws.getRow(1).font = { bold: true };
  for (let r = 2; r <= LIMITS.maxRows + 1; r++) {
    ws.getCell(`A${r}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Student,Teacher"'] };
    ws.getCell(`F${r}`).dataValidation = { type: 'whole', operator: 'between', allowBlank: true, formulae: [1, 6] };
  }
  const ins = wb.addWorksheet('Instructions');
  ins.columns = [{ width: 26 }, { width: 90 }];
  [
    ['How to use', 'Fill one row per person on the "Participants" sheet. Do not rename or reorder the header row. Type values only: no formulas.'],
    ['Participant type', 'Required. Student or Teacher.'],
    ['Full name', 'Required. 2 to 200 characters, as it should appear on a certificate.'],
    ['Email', 'Optional, but either Email or Roll or staff number is required so the person can be told apart from others with the same name.'],
    ['Roll or staff number', 'Optional, but see above. Must be unique within your institution.'],
    ['Department', 'Optional, e.g. Mechanical Engineering.'],
    ['Year of study', 'Students only, 1 to 6. Leave blank for teachers.'],
    ['Limits', `Maximum ${LIMITS.maxRows} rows and ${LIMITS.maxBytes / 1024 / 1024} MB per file. Accepted formats: .xlsx or .csv.`],
    ['What happens next', 'You will see a preview. Nothing is saved until you press "Import". Rows with errors are never imported. People already registered are skipped. Same-name matches must be reviewed by you.'],
    ['Example (do not paste)', 'Student | Priya Raman | priya.r@example.edu | RA2211003010123 | Mechanical Engineering | 3'],
    ['Privacy', 'Collect only these fields. Do not add phone numbers, addresses, dates of birth or ID-card numbers.'],
  ].forEach((r) => ins.addRow(r));
  ins.getColumn(1).font = { bold: true };
  return Buffer.from(await wb.xlsx.writeBuffer());
}
