import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { harness, api, login, makeProgramme } from './helpers.ts';
import { PARTICIPANT_COLUMNS, inspectZip, safeCell, toCsv } from '../src/spreadsheet.ts';

const h = harness();

async function xlsx(rows: unknown[][], opts: { formulaAt?: [number, number]; header?: string[] } = {}) {
  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Participants');
  ws.addRow(opts.header ?? PARTICIPANT_COLUMNS);
  rows.forEach((r) => ws.addRow(r));
  if (opts.formulaAt) ws.getCell(opts.formulaAt[0], opts.formulaAt[1]).value = { formula: 'HYPERLINK("http://evil","x")' } as any;
  return Buffer.from(await wb.xlsx.writeBuffer());
}
const upload = (who: string, inst: string, buf: Buffer, filename = 'roster.xlsx') =>
  api(h, who, 'POST', '/api/v1/imports/participants', { institutionId: inst, filename, contentBase64: buf.toString('base64') });

describe('Participant spreadsheet import', () => {
  it('preview saves nothing; commit imports valid rows only; errors are listed and never imported', async () => {
    const buf = await xlsx([
      ['Student', 'Priya Raman', 'priya@example.edu', 'RA001', 'Mechanical', 3],
      ['Teacher', 'Dr K Mohan', 'kmohan@example.edu', '', 'EEE', ''],
      ['Robot', 'X', 'not-an-email', '', '', 9],
    ]);
    const p = await upload('srm.spoc', h.ids.institutions.SRM, buf);
    assert.equal(p.status, 201, JSON.stringify(p.body));
    assert.deepEqual(p.body.counts, { VALID: 2, ERROR: 1, DUPLICATE: 0, POSSIBLE_DUPLICATE: 0 });
    assert.equal((await h.db.query(`SELECT count(*)::int n FROM participants`)).rows[0].n, 0, 'preview must not save');
    const d = await api(h, 'srm.spoc', 'GET', `/api/v1/imports/${p.body.jobId}`);
    assert.ok(d.body.rows.find((r: any) => r.status === 'ERROR').messages.length >= 3);
    const c = await api(h, 'srm.spoc', 'POST', `/api/v1/imports/${p.body.jobId}/commit`);
    assert.deepEqual(c.body, { created: 2, skipped: 1 });
    const again = await api(h, 'srm.spoc', 'POST', `/api/v1/imports/${p.body.jobId}/commit`);
    assert.equal(again.status, 409, 'committing twice is refused');
    assert.equal((await h.db.query(`SELECT count(*)::int n FROM participants`)).rows[0].n, 2);
  });

  it('T01 duplicate import: re-uploading the same people skips them (matched on roll number / email) and repeats inside a file are errors', async () => {
    const rows = [['Student', 'Priya Raman', 'priya@example.edu', 'RA001', 'Mech', 3]];
    const j1 = await upload('srm.spoc', h.ids.institutions.SRM, await xlsx(rows));
    await api(h, 'srm.spoc', 'POST', `/api/v1/imports/${j1.body.jobId}/commit`);
    const j2 = await upload('srm.spoc', h.ids.institutions.SRM, await xlsx([...rows, ['Student', 'P. Raman', 'other@example.edu', 'ra001', '', 2]]));
    assert.equal(j2.body.counts.DUPLICATE, 1);
    assert.equal(j2.body.counts.ERROR, 1, 'same roll number twice in one file');
    assert.ok(j2.body.previouslyImportedAt === null);
  });

  it('T02 same name, different people: never merged automatically; uploader must decide, then both can exist', async () => {
    const j1 = await upload('srm.spoc', h.ids.institutions.SRM, await xlsx([['Student', 'Arun Kumar', '', 'RA100', 'Civil', 1]]));
    await api(h, 'srm.spoc', 'POST', `/api/v1/imports/${j1.body.jobId}/commit`);
    const j2 = await upload('srm.spoc', h.ids.institutions.SRM, await xlsx([['Student', 'Arun Kumar', '', 'RA200', 'ECE', 2]]));
    assert.equal(j2.body.counts.POSSIBLE_DUPLICATE, 1);
    const blocked = await api(h, 'srm.spoc', 'POST', `/api/v1/imports/${j2.body.jobId}/commit`);
    assert.equal(blocked.status, 409); assert.equal(blocked.body.error.code, 'REVIEW_REQUIRED');
    const row = (await api(h, 'srm.spoc', 'GET', `/api/v1/imports/${j2.body.jobId}`)).body.rows[0];
    await api(h, 'srm.spoc', 'POST', `/api/v1/imports/${j2.body.jobId}/rows/${row.id}/resolution`, { resolution: 'CREATE' });
    assert.equal((await api(h, 'srm.spoc', 'POST', `/api/v1/imports/${j2.body.jobId}/commit`)).body.created, 1);
    assert.equal((await h.db.query(`SELECT count(*)::int n FROM participants WHERE full_name='Arun Kumar'`)).rows[0].n, 2);
  });

  it('T26 malicious or malformed spreadsheets are refused and audited', async () => {
    const inst = h.ids.institutions.SRM;
    const formula = await upload('srm.spoc', inst, await xlsx([['Student', 'A B', 'a@b.co', 'R1', '', 1]], { formulaAt: [2, 4] }));
    assert.equal(formula.status, 422); assert.match(formula.body.error.message, /Formulas are not accepted/);
    const fake = await upload('srm.spoc', inst, Buffer.from('this is not a zip file'));
    assert.equal(fake.status, 422);
    const xlsm = await upload('srm.spoc', inst, await xlsx([]), 'roster.xlsm');
    assert.equal(xlsm.status, 422);
    const header = await upload('srm.spoc', inst, await xlsx([['x']], { header: ['Name', 'Phone'] }));
    assert.equal(header.status, 422); assert.ok(header.body.error.details.length > 0);
    const big = await upload('srm.spoc', inst, Buffer.alloc(3 * 1024 * 1024, 1), 'big.csv');
    assert.ok([413, 422].includes(big.status));
    assert.ok((await h.db.query(`SELECT count(*)::int n FROM audit_events WHERE action='import.preview' AND outcome='BLOCKED'`)).rows[0].n >= 4);
    assert.equal((await h.db.query(`SELECT count(*)::int n FROM participants`)).rows[0].n, 0);
  });

  it('zip-bomb guard rejects workbooks that declare an unsafe expanded size', () => {
    // Minimal zip: one central-directory entry claiming 100 MB uncompressed.
    const name = Buffer.from('xl/worksheets/sheet1.xml');
    const cd = Buffer.alloc(46 + name.length); cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt32LE(100 * 1024 * 1024, 24); cd.writeUInt16LE(name.length, 28); name.copy(cd, 46);
    const eocd = Buffer.alloc(22); eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 10); eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(0, 16);
    assert.throws(() => inspectZip(Buffer.concat([cd, eocd])), /unsafe size/);
  });

  it('CSV upload works too', async () => {
    const csv = 'Participant type,Full name,Email,Roll or staff number,Department,Year of study\r\nStudent,"Meena, S",meena@example.edu,RA9,Auto,4\r\n';
    const r = await upload('srm.spoc', h.ids.institutions.SRM, Buffer.from(csv), 'roster.csv');
    assert.equal(r.body.counts.VALID, 1);
  });

  it('institution scope: SPOC cannot upload for another institution; unapproved institutions are blocked', async () => {
    const other = await upload('srm.spoc', h.ids.institutions.PARTNER, await xlsx([['Student', 'A B', 'a@b.co', 'R1', '', 1]]));
    assert.equal(other.status, 403);
    await h.db.query(`INSERT INTO role_assignments (user_id, role, scope_type, scope_id) VALUES ($1,'SRM_CENTRE_SPOC','INSTITUTION',$2)`, [h.ids.users.support, h.ids.institutions.PARTNER]);
    const unapproved = await upload('srm.support', h.ids.institutions.PARTNER, await xlsx([['Student', 'A B', 'a@b.co', 'R1', '', 1]]));
    assert.equal(unapproved.status, 409); assert.equal(unapproved.body.error.code, 'INSTITUTION_NOT_APPROVED');
    assert.equal((await api(h, 'trainer.a', 'GET', '/api/v1/participants')).status, 403);
  });
});

describe('Report downloads', () => {
  it('downloads XLSX and CSV with an "About" sheet, and every export is audited', async () => {
    await makeProgramme(h, { title: '=HYPERLINK("http://evil","click")' });
    const s = await login(h, 'prog.admin');
    const x = await h.app.inject({ method: 'GET', url: '/api/v1/reports/programmes?format=xlsx', headers: { cookie: s.cookie } });
    assert.equal(x.statusCode, 200);
    assert.match(String(x.headers['content-disposition']), /vtc-programmes-.*\.xlsx/);
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(x.rawPayload as any);
    assert.deepEqual(wb.worksheets.map((w) => w.name), ['Report', 'About this report']);
    const title = wb.getWorksheet('Report')!.getCell(2, 2).value;
    assert.equal(typeof title, 'string'); assert.ok(String(title).startsWith("'="), 'formula-looking text is neutralised');
    const c = await h.app.inject({ method: 'GET', url: '/api/v1/reports/sessions?format=csv', headers: { cookie: s.cookie } });
    assert.equal(c.statusCode, 200); assert.ok(c.body.startsWith('﻿Programme,'));
    assert.equal((await h.db.query(`SELECT count(*)::int n FROM audit_events WHERE action='report.export' AND outcome='SUCCESS'`)).rows[0].n, 2);
  });

  it('reports respect scope: trainer has none; SPOC sees only own-institution participants; audit export needs global audit access', async () => {
    assert.deepEqual((await api(h, 'trainer.a', 'GET', '/api/v1/reports')).body, []);
    assert.equal((await api(h, 'trainer.a', 'GET', '/api/v1/reports/participants')).status, 403);
    const keys = (await api(h, 'srm.spoc', 'GET', '/api/v1/reports')).body.map((r: any) => r.key);
    assert.ok(keys.includes('participants') && keys.includes('facility') && !keys.includes('audit') && !keys.includes('approvals'));
    assert.equal((await api(h, 'srm.spoc', 'GET', '/api/v1/reports/audit')).status, 403);
    assert.equal((await api(h, 'tech.admin', 'GET', '/api/v1/reports/participants')).status, 403);
  });

  it('safeCell and CSV escaping neutralise injection', () => {
    for (const v of ['=1+1', '+1', '-1', '@SUM(A1)']) assert.ok(String(safeCell(v)).startsWith("'"));
    assert.equal(safeCell(42), 42);
    const csv = toCsv({ title: 't', columns: [{ key: 'a', header: 'A' }], rows: [{ a: '=cmd|" /C calc"!A0' }], about: [] }).toString();
    assert.match(csv, /"'=cmd\|"" \/C calc""!A0"/);
  });
});
