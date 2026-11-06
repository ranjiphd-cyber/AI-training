import crypto from 'node:crypto';
import type pg from 'pg';
import type { Ctx } from '../context.ts';
import { block } from '../context.ts';
import { audit } from '../audit.ts';
import { withTx } from '../db.ts';
import { AppError, badRequest, forbidden, notFound } from '../errors.ts';
import { can, institutionScopes } from '../permissions.ts';
import { parseUpload, PARTICIPANT_COLUMNS } from '../spreadsheet.ts';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const lc = (s: string) => s.trim().toLowerCase();

export function participantScope(ctx: Ctx) {
  const s = institutionScopes(ctx.principal, 'participant.view');
  if (!s.global && !s.ids.length) throw forbidden('You do not have access to participant records.');
  return s;
}

export async function listParticipants(db: pg.Pool, ctx: Ctx, f: { institutionId?: string; q?: string }) {
  const s = participantScope(ctx);
  const params: unknown[] = []; const where: string[] = [];
  if (!s.global) { params.push(s.ids); where.push(`p.institution_id = ANY($${params.length}::uuid[])`); }
  if (f.institutionId) { params.push(f.institutionId); where.push(`p.institution_id = $${params.length}`); }
  if (f.q) { params.push(`%${f.q}%`); where.push(`(p.full_name ILIKE $${params.length} OR p.email ILIKE $${params.length} OR p.external_ref ILIKE $${params.length})`); }
  return (await db.query(
    `SELECT p.id, p.participant_type, p.full_name, p.email, p.external_ref, p.department, p.year_of_study, p.status, p.created_at,
            i.name AS institution_name, i.id AS institution_id
       FROM participants p JOIN institutions i ON i.id = p.institution_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY i.name, p.full_name LIMIT 5000`, params)).rows;
}

export async function previewImport(db: pg.Pool, ctx: Ctx, input: { institutionId: string; filename: string; contentBase64: string }) {
  const ev = { scope: `institution:${input.institutionId}`, action: 'import.preview', entityType: 'import_job', entityId: 'new' };
  if (!input?.institutionId || !input?.filename || !input?.contentBase64) throw badRequest('institutionId, filename and contentBase64 are required.');
  if (!can(ctx.principal, 'participant.upload', { institutionId: input.institutionId }))
    await block(ctx, { ...ev, outcome: 'DENIED' }, forbidden('You may only upload participants for your own institution.', 'SRM Centre SPOC of that institution'));
  const inst = (await db.query(`SELECT * FROM institutions WHERE id=$1`, [input.institutionId])).rows[0];
  if (!inst) throw notFound('Institution');
  if (inst.approval_status !== 'APPROVED')
    await block(ctx, ev, new AppError(409, 'INSTITUTION_NOT_APPROVED', `${inst.name} is not an approved institution, so its participants cannot be registered.`,
      { resolution: 'Record the institution approval (decision D-03).', resolver: 'Ranjith T. P. with SRM leadership' }));
  const buf = Buffer.from(input.contentBase64, 'base64');
  const filename = input.filename.replace(/[^\w.\- ()]/g, '_').slice(0, 120);
  let parsed;
  try { parsed = await parseUpload(filename, buf, PARTICIPANT_COLUMNS); }
  catch (e: any) { if (e instanceof AppError) await block(ctx, { ...ev, reason: `${e.code}: ${e.message}` }, e); throw e; }
  const sha = crypto.createHash('sha256').update(buf).digest('hex');

  // Existing records in this institution (and emails anywhere) for duplicate detection.
  const existing = (await db.query(`SELECT id, full_name, lower(email) AS email, lower(external_ref) AS ref, institution_id FROM participants
                                     WHERE institution_id=$1 OR email IS NOT NULL`, [input.institutionId])).rows;
  const seenRef = new Map<string, number>(), seenEmail = new Map<string, number>(), seenName = new Map<string, number[]>();
  const out: { rowNumber: number; data: any; status: string; messages: string[]; matched: string | null }[] = [];

  for (const r of parsed.rows) {
    const v = r.values; const msgs: string[] = [];
    const typeRaw = lc(v['Participant type']);
    const type = typeRaw === 'student' ? 'STUDENT' : typeRaw === 'teacher' ? 'TEACHER' : null;
    const name = v['Full name'].replace(/\s+/g, ' ').trim();
    const email = v['Email'] ? lc(v['Email']) : '';
    const ref = v['Roll or staff number'].trim();
    const yearTxt = v['Year of study'].trim();
    const year = yearTxt ? Number(yearTxt) : null;
    if (!type) msgs.push('Participant type must be Student or Teacher.');
    if (name.length < 2 || name.length > 200) msgs.push('Full name is required (2–200 characters).');
    if (email && !EMAIL.test(email)) msgs.push('Email is not a valid address.');
    if (!email && !ref) msgs.push('Provide an Email or a Roll or staff number so this person can be identified.');
    if (yearTxt && (!Number.isInteger(year) || year! < 1 || year! > 6)) msgs.push('Year of study must be a whole number from 1 to 6.');
    if (type === 'TEACHER' && yearTxt) msgs.push('Year of study applies to students only.');
    if (ref && seenRef.has(lc(ref))) msgs.push(`Roll or staff number repeats row ${seenRef.get(lc(ref))}.`);
    if (email && seenEmail.has(email)) msgs.push(`Email repeats row ${seenEmail.get(email)}.`);
    const data = { participantType: type, fullName: name, email: email || null, externalRef: ref || null,
      department: v['Department'] || null, yearOfStudy: type === 'STUDENT' ? year : null };
    let status = msgs.length ? 'ERROR' : 'VALID'; let matched: string | null = null;
    if (status === 'VALID') {
      const hit = existing.find((p) => (ref && p.institution_id === input.institutionId && p.ref === lc(ref)) || (email && p.email === email));
      if (hit) { status = 'DUPLICATE'; matched = hit.id; msgs.push(`Already registered as ${hit.full_name}; this row will be skipped.`); }
      else {
        const sameName = existing.find((p) => p.institution_id === input.institutionId && lc(p.full_name) === lc(name));
        const inFile = seenName.get(lc(name));
        if (sameName || inFile) {
          status = 'POSSIBLE_DUPLICATE'; matched = sameName?.id ?? null;
          msgs.push(sameName ? `An existing participant has the same name (${sameName.full_name}) but different identifiers. Decide: new person or skip.`
            : `Same name as row ${inFile![0]} with different identifiers. Decide: new person or skip.`);
        }
      }
    }
    if (ref) seenRef.set(lc(ref), r.rowNumber);
    if (email) seenEmail.set(email, r.rowNumber);
    if (name) seenName.set(lc(name), [...(seenName.get(lc(name)) ?? []), r.rowNumber]);
    out.push({ rowNumber: r.rowNumber, data, status, messages: msgs, matched });
  }

  return withTx(db, async (tx) => {
    const prior = (await tx.query(`SELECT created_at FROM import_jobs WHERE file_sha256=$1 AND institution_id=$2 AND status='COMMITTED' ORDER BY created_at DESC LIMIT 1`, [sha, input.institutionId])).rows[0];
    const job = (await tx.query(
      `INSERT INTO import_jobs (kind, institution_id, filename, file_sha256, file_bytes, status, row_count, uploaded_by)
       VALUES ('PARTICIPANTS',$1,$2,$3,$4,'PREVIEWED',$5,$6) RETURNING *`, [input.institutionId, filename, sha, buf.length, out.length, ctx.principal.id])).rows[0];
    for (const r of out) await tx.query(
      `INSERT INTO import_rows (job_id, row_number, data, status, messages, matched_participant_id) VALUES ($1,$2,$3,$4,$5,$6)`,
      [job.id, r.rowNumber, JSON.stringify(r.data), r.status, r.messages, r.matched]);
    const counts = Object.fromEntries(['VALID', 'ERROR', 'DUPLICATE', 'POSSIBLE_DUPLICATE'].map((s) => [s, out.filter((r) => r.status === s).length]));
    await audit(tx, ctx, { ...ev, entityId: job.id, outcome: 'SUCCESS', change: { filename, sha256: sha, rows: out.length, ...counts } });
    return { jobId: job.id, counts, previouslyImportedAt: prior?.created_at ?? null };
  });
}

async function loadJob(q: pg.Pool | pg.PoolClient, ctx: Ctx, id: string, lock = false) {
  const j = (await q.query(`SELECT j.*, i.name AS institution_name, u.display_name AS uploaded_by_name FROM import_jobs j
     JOIN institutions i ON i.id=j.institution_id JOIN users u ON u.id=j.uploaded_by WHERE j.id=$1 ${lock ? 'FOR UPDATE OF j' : ''}`, [id])).rows[0];
  if (!j) throw notFound('Import');
  if (!can(ctx.principal, 'participant.upload', { institutionId: j.institution_id }) && !can(ctx.principal, 'participant.view', { institutionId: j.institution_id }))
    throw notFound('Import');
  return j;
}

export async function getImport(db: pg.Pool, ctx: Ctx, id: string) {
  const job = await loadJob(db, ctx, id);
  const rows = (await db.query(`SELECT r.*, p.full_name AS matched_name, p.external_ref AS matched_ref FROM import_rows r
     LEFT JOIN participants p ON p.id=r.matched_participant_id WHERE job_id=$1 ORDER BY row_number`, [id])).rows;
  const unresolved = rows.filter((r) => r.status === 'POSSIBLE_DUPLICATE' && !r.resolution).length;
  const willCreate = rows.filter((r) => r.status === 'VALID' || (r.status === 'POSSIBLE_DUPLICATE' && r.resolution === 'CREATE')).length;
  return { job, rows, unresolved, willCreate, canCommit: job.status === 'PREVIEWED' && unresolved === 0 && willCreate > 0
    && can(ctx.principal, 'participant.upload', { institutionId: job.institution_id }) };
}

export async function listImports(db: pg.Pool, ctx: Ctx) {
  const s = institutionScopes(ctx.principal, 'participant.upload');
  const v = institutionScopes(ctx.principal, 'participant.view');
  const global = s.global || v.global; const ids = [...s.ids, ...v.ids];
  if (!global && !ids.length) return [];
  return (await db.query(`SELECT j.id, j.filename, j.status, j.row_count, j.created_count, j.created_at, i.name AS institution_name, u.display_name AS uploaded_by_name
     FROM import_jobs j JOIN institutions i ON i.id=j.institution_id JOIN users u ON u.id=j.uploaded_by
     ${global ? '' : 'WHERE j.institution_id = ANY($1::uuid[])'} ORDER BY j.created_at DESC LIMIT 50`, global ? [] : [ids])).rows;
}

export async function resolveRow(db: pg.Pool, ctx: Ctx, jobId: string, rowId: string, resolution: string) {
  if (!['CREATE', 'SKIP'].includes(resolution)) throw badRequest('resolution must be CREATE or SKIP');
  return withTx(db, async (tx) => {
    const job = await loadJob(tx, ctx, jobId, true);
    if (!can(ctx.principal, 'participant.upload', { institutionId: job.institution_id })) throw forbidden();
    if (job.status !== 'PREVIEWED') throw new AppError(409, 'INVALID_STATE', `This import is ${job.status}.`);
    const r = await tx.query(`UPDATE import_rows SET resolution=$3 WHERE id=$2 AND job_id=$1 AND status='POSSIBLE_DUPLICATE' RETURNING row_number`, [jobId, rowId, resolution]);
    if (!r.rowCount) throw badRequest('Only rows marked as possible duplicates need a decision.');
    await audit(tx, ctx, { scope: `institution:${job.institution_id}`, action: 'import.resolve_row', entityType: 'import_job', entityId: jobId,
      outcome: 'SUCCESS', change: { row: r.rows[0].row_number, resolution } });
    return { ok: true };
  });
}

export async function commitImport(db: pg.Pool, ctx: Ctx, jobId: string) {
  return withTx(db, async (tx) => {
    const job = await loadJob(tx, ctx, jobId, true);
    const ev = { scope: `institution:${job.institution_id}`, action: 'import.commit', entityType: 'import_job', entityId: jobId };
    if (!can(ctx.principal, 'participant.upload', { institutionId: job.institution_id })) await block(ctx, { ...ev, outcome: 'DENIED' }, forbidden());
    if (job.status !== 'PREVIEWED') await block(ctx, ev, new AppError(409, 'ALREADY_CLOSED', `This import is already ${job.status}; nothing was imported twice.`));
    const rows = (await tx.query(`SELECT * FROM import_rows WHERE job_id=$1 ORDER BY row_number`, [jobId])).rows;
    const unresolved = rows.filter((r) => r.status === 'POSSIBLE_DUPLICATE' && !r.resolution);
    if (unresolved.length) await block(ctx, ev, new AppError(409, 'REVIEW_REQUIRED',
      `${unresolved.length} possible duplicate(s) need a decision before importing.`,
      { resolution: 'For each highlighted row choose "New person" or "Skip".', resolver: 'The uploader', details: unresolved.map((r) => `Row ${r.row_number}: ${r.data.fullName}`) }));
    const toCreate = rows.filter((r) => r.status === 'VALID' || (r.status === 'POSSIBLE_DUPLICATE' && r.resolution === 'CREATE'));
    try {
      for (const r of toCreate) {
        const d = r.data;
        await tx.query(`INSERT INTO participants (participant_type, full_name, email, institution_id, external_ref, department, year_of_study, source_import_id, created_by)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [d.participantType, d.fullName, d.email, job.institution_id, d.externalRef, d.department, d.yearOfStudy, jobId, ctx.principal.id]);
      }
    } catch (e: any) {
      if (e?.code === '23505') throw new AppError(409, 'REGISTRY_CHANGED', 'Someone registered one of these people after your preview. Nothing was imported.',
        { resolution: 'Upload the file again to get a fresh preview.' });
      throw e;
    }
    await tx.query(`UPDATE import_jobs SET status='COMMITTED', closed_by=$2, closed_at=now(), created_count=$3 WHERE id=$1`, [jobId, ctx.principal.id, toCreate.length]);
    await audit(tx, ctx, { ...ev, outcome: 'SUCCESS', change: { created: toCreate.length, skipped: rows.length - toCreate.length, semantics: 'all-or-nothing for selected rows' } });
    return { created: toCreate.length, skipped: rows.length - toCreate.length };
  });
}

export async function discardImport(db: pg.Pool, ctx: Ctx, jobId: string) {
  return withTx(db, async (tx) => {
    const job = await loadJob(tx, ctx, jobId, true);
    if (!can(ctx.principal, 'participant.upload', { institutionId: job.institution_id })) throw forbidden();
    if (job.status !== 'PREVIEWED') throw new AppError(409, 'INVALID_STATE', `This import is ${job.status}.`);
    await tx.query(`UPDATE import_jobs SET status='DISCARDED', closed_by=$2, closed_at=now() WHERE id=$1`, [jobId, ctx.principal.id]);
    await audit(tx, ctx, { scope: `institution:${job.institution_id}`, action: 'import.discard', entityType: 'import_job', entityId: jobId, outcome: 'SUCCESS' });
    return { status: 'DISCARDED' };
  });
}
