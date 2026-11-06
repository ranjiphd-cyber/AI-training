import type pg from 'pg';
import type { Ctx } from '../context.ts';
import { block } from '../context.ts';
import { audit } from '../audit.ts';
import { withTx, type Tx } from '../db.ts';
import { AppError, badRequest, forbidden, notFound } from '../errors.ts';
import { can, canAnywhere, institutionScopes, type Principal } from '../permissions.ts';

type Q = pg.Pool | pg.PoolClient;
export const EDITABLE = ['DRAFT', 'RETURNED'];
const MODES = ['ONSITE', 'ONLINE', 'HYBRID'];

/** Object-level visibility: global viewers, assigned trainers, and SPOCs whose institution owns a requested facility. */
export function visibilitySql(p: Principal, alias = 'p', startIndex = 1): { sql: string; params: unknown[] } {
  const g = institutionScopes(p, 'programme.view');
  if (g.global) return { sql: 'TRUE', params: [] };
  const clauses: string[] = []; const params: unknown[] = [];
  let i = startIndex;
  if (p.trainerId) {
    clauses.push(`EXISTS (SELECT 1 FROM session_trainers st JOIN sessions s ON s.id=st.session_id
                  WHERE s.programme_id=${alias}.id AND st.trainer_id=$${i++})`);
    params.push(p.trainerId);
  }
  const f = institutionScopes(p, 'facility.view');
  if (f.global) clauses.push(`EXISTS (SELECT 1 FROM facility_requests fr WHERE fr.programme_id=${alias}.id)`);
  else if (f.ids.length) {
    clauses.push(`EXISTS (SELECT 1 FROM facility_requests fr JOIN resources r ON r.id=fr.resource_id
                  WHERE fr.programme_id=${alias}.id AND r.owner_institution_id = ANY($${i++}::uuid[]))`);
    params.push(f.ids);
  }
  const progScoped = p.assignments.filter((a) => a.scopeType === 'PROGRAMME' && a.scopeId).map((a) => a.scopeId);
  if (progScoped.length) { clauses.push(`${alias}.id = ANY($${i++}::uuid[])`); params.push(progScoped); }
  return { sql: clauses.length ? `(${clauses.join(' OR ')})` : 'FALSE', params };
}

export async function assertVisible(q: Q, p: Principal, programmeId: string) {
  const v = visibilitySql(p, 'p', 2);
  const r = await q.query(`SELECT p.* FROM programmes p WHERE p.id=$1 AND ${v.sql}`, [programmeId, ...v.params]);
  if (!r.rowCount) throw notFound('Programme');
  return r.rows[0];
}

export async function listProgrammes(db: pg.Pool, ctx: Ctx, f: { status?: string; simulation?: string }) {
  const v = visibilitySql(ctx.principal);
  const params: unknown[] = [...v.params];
  let where = v.sql;
  if (f.status) { params.push(f.status); where += ` AND p.status = $${params.length}`; }
  if (f.simulation === 'true' || f.simulation === 'false') { params.push(f.simulation === 'true'); where += ` AND p.is_simulation = $${params.length}`; }
  const r = await db.query(
    `SELECT p.id, p.code, p.title, p.technical_domain, p.delivery_mode, p.status, p.version, p.is_simulation,
            p.updated_at, u.display_name AS owner_name,
            (SELECT min(starts_at) FROM sessions s WHERE s.programme_id=p.id) AS first_session,
            (SELECT count(*)::int FROM sessions s WHERE s.programme_id=p.id) AS session_count
       FROM programmes p JOIN users u ON u.id=p.owner_user_id WHERE ${where} ORDER BY p.updated_at DESC`, params);
  return r.rows;
}

async function lockProgramme(tx: Tx, id: string) {
  const r = await tx.query(`SELECT * FROM programmes WHERE id=$1 FOR UPDATE`, [id]);
  if (!r.rowCount) throw notFound('Programme');
  return r.rows[0];
}

function scopeOf(prog: any) { return `programme:${prog.id}`; }

async function requireEditable(ctx: Ctx, prog: any, action: string) {
  const ev = { scope: scopeOf(prog), action, entityType: 'programme', entityId: prog.id, entityVersion: prog.version };
  if (!can(ctx.principal, 'programme.edit', { programmeId: prog.id }))
    await block(ctx, { ...ev, outcome: 'DENIED' }, forbidden('You may not edit this programme.', 'Programme Administrator'));
  if (!EDITABLE.includes(prog.status))
    await block(ctx, ev, new AppError(409, 'NOT_EDITABLE',
      `Programme is ${prog.status}; material edits are only allowed in DRAFT or RETURNED.`,
      { resolution: prog.status === 'IN_APPROVAL' ? 'Withdraw the submission first.' :
          (prog.status === 'APPROVED' || prog.status === 'CONFIRMED') ? 'Reopen for revision (requires reapproval).' : undefined,
        resolver: 'Programme Administrator' }));
}

export async function bumpVersion(tx: Tx, id: string) {
  await tx.query(`UPDATE programmes SET version = version + 1, updated_at = now() WHERE id=$1`, [id]);
}

export interface ProgrammeInput {
  title: string; technicalDomain: string; description?: string; learningObjectives?: string[];
  deliveryMode: string; isSimulation?: boolean; institutionIds?: string[];
}

function checkProgrammeInput(i: ProgrammeInput) {
  const errs: string[] = [];
  if (!i.title?.trim() || i.title.length > 200) errs.push('title is required (max 200 characters)');
  if (!i.technicalDomain?.trim()) errs.push('technicalDomain is required');
  if (!MODES.includes(i.deliveryMode)) errs.push('deliveryMode must be ONSITE, ONLINE or HYBRID');
  if (i.learningObjectives && (!Array.isArray(i.learningObjectives) || i.learningObjectives.some((o) => typeof o !== 'string')))
    errs.push('learningObjectives must be a list of strings');
  if (errs.length) throw badRequest('Programme details are incomplete.', errs);
}

async function setInstitutions(tx: Tx, programmeId: string, ids: string[]) {
  if (!ids.length) return;
  const ok = await tx.query(`SELECT id, approval_status, name FROM institutions WHERE id = ANY($1::uuid[])`, [ids]);
  if (ok.rowCount !== new Set(ids).size) throw badRequest('Unknown institution in scope.');
  await tx.query(`DELETE FROM programme_institutions WHERE programme_id=$1`, [programmeId]);
  for (const id of new Set(ids)) await tx.query(`INSERT INTO programme_institutions VALUES ($1,$2)`, [programmeId, id]);
}

export async function createProgramme(db: pg.Pool, ctx: Ctx, input: ProgrammeInput) {
  if (!can(ctx.principal, 'programme.create')) throw forbidden('You may not create programmes.', 'Programme Administrator');
  checkProgrammeInput(input);
  return withTx(db, async (tx) => {
    const code = (await tx.query(`SELECT 'VTC-' || nextval('programme_code_seq') AS c`)).rows[0].c;
    const r = await tx.query(
      `INSERT INTO programmes (code, title, technical_domain, description, learning_objectives, delivery_mode,
                               owner_user_id, is_simulation, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$7) RETURNING *`,
      [input.isSimulation ? `SIM-${code}` : code, input.title.trim(), input.technicalDomain.trim(), input.description ?? '',
       input.learningObjectives ?? [], input.deliveryMode, ctx.principal.id, !!input.isSimulation]);
    const prog = r.rows[0];
    await setInstitutions(tx, prog.id, input.institutionIds ?? []);
    await audit(tx, ctx, { scope: scopeOf(prog), action: 'programme.create', entityType: 'programme', entityId: prog.id,
      entityVersion: 1, outcome: 'SUCCESS', change: { code: prog.code, title: prog.title, isSimulation: prog.is_simulation } });
    return prog;
  });
}

export async function updateProgramme(db: pg.Pool, ctx: Ctx, id: string, input: ProgrammeInput) {
  checkProgrammeInput(input);
  return withTx(db, async (tx) => {
    const prog = await lockProgramme(tx, id);
    await requireEditable(ctx, prog, 'programme.update');
    await tx.query(
      `UPDATE programmes SET title=$2, technical_domain=$3, description=$4, learning_objectives=$5, delivery_mode=$6 WHERE id=$1`,
      [id, input.title.trim(), input.technicalDomain.trim(), input.description ?? '', input.learningObjectives ?? [], input.deliveryMode]);
    if (input.institutionIds) await setInstitutions(tx, id, input.institutionIds);
    await bumpVersion(tx, id);
    await audit(tx, ctx, { scope: scopeOf(prog), action: 'programme.update', entityType: 'programme', entityId: id,
      entityVersion: prog.version + 1, outcome: 'SUCCESS',
      change: { before: { title: prog.title, deliveryMode: prog.delivery_mode }, after: { title: input.title, deliveryMode: input.deliveryMode } } });
    return (await tx.query(`SELECT * FROM programmes WHERE id=$1`, [id])).rows[0];
  });
}

export interface SessionInput {
  title: string; startsAt: string; endsAt: string; deliveryMode: string;
  expectedOnsite?: number; expectedOnline?: number;
  resources?: { resourceId: string; units?: number }[];
}

function parseSession(i: SessionInput) {
  const errs: string[] = [];
  const s = new Date(i.startsAt), e = new Date(i.endsAt);
  if (!i.title?.trim()) errs.push('title is required');
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) errs.push('startsAt and endsAt must be ISO-8601 timestamps with offset');
  else if (e <= s) errs.push('endsAt must be after startsAt');
  else if (e.getTime() - s.getTime() > 14 * 3600 * 1000) errs.push('a single session may not exceed 14 hours; use multiple sessions');
  if (!MODES.includes(i.deliveryMode)) errs.push('deliveryMode must be ONSITE, ONLINE or HYBRID');
  const on = i.expectedOnsite ?? 0, off = i.expectedOnline ?? 0;
  if (!Number.isInteger(on) || on < 0 || !Number.isInteger(off) || off < 0) errs.push('expected participants must be non-negative integers');
  if (i.deliveryMode === 'ONLINE' && on > 0) errs.push('ONLINE sessions cannot expect on-site participants');
  if (i.deliveryMode === 'ONSITE' && off > 0) errs.push('ONSITE sessions cannot expect online participants');
  const res = i.resources ?? [];
  if (!Array.isArray(res) || new Set(res.map((r) => r.resourceId)).size !== res.length) errs.push('resources must be unique');
  if (errs.length) throw badRequest('Session details are invalid.', errs);
  return { s, e, on, off, res };
}

async function writeSessionResources(tx: Tx, sessionId: string, res: { resourceId: string; units?: number }[], on: number, off: number) {
  await tx.query(`DELETE FROM session_resources WHERE session_id=$1`, [sessionId]);
  for (const r of res) {
    const rr = await tx.query(`SELECT kind FROM resources WHERE id=$1`, [r.resourceId]);
    if (!rr.rowCount) throw badRequest('Unknown resource.');
    const kind = rr.rows[0].kind;
    const units = r.units ?? (kind === 'VIRTUAL' ? Math.max(off, 1) : Math.max(on, 1));
    if (!Number.isInteger(units) || units < 1) throw badRequest('units must be a positive integer');
    await tx.query(`INSERT INTO session_resources (session_id, resource_id, units_required) VALUES ($1,$2,$3)`, [sessionId, r.resourceId, units]);
  }
}

export async function addSession(db: pg.Pool, ctx: Ctx, programmeId: string, input: SessionInput) {
  const { s, e, on, off, res } = parseSession(input);
  return withTx(db, async (tx) => {
    const prog = await lockProgramme(tx, programmeId);
    await requireEditable(ctx, prog, 'session.create');
    const r = await tx.query(
      `INSERT INTO sessions (programme_id, title, starts_at, ends_at, delivery_mode, expected_onsite, expected_online)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [programmeId, input.title.trim(), s, e, input.deliveryMode, on, off]);
    await writeSessionResources(tx, r.rows[0].id, res, on, off);
    await bumpVersion(tx, programmeId);
    await audit(tx, ctx, { scope: scopeOf(prog), action: 'session.create', entityType: 'session', entityId: r.rows[0].id,
      entityVersion: prog.version + 1, outcome: 'SUCCESS',
      change: { programmeId, title: input.title, startsAt: s, endsAt: e, resources: res.map((x) => x.resourceId) } });
    return r.rows[0];
  });
}

export async function updateSession(db: pg.Pool, ctx: Ctx, sessionId: string, input: SessionInput) {
  const { s, e, on, off, res } = parseSession(input);
  return withTx(db, async (tx) => {
    const cur = await tx.query(`SELECT * FROM sessions WHERE id=$1`, [sessionId]);
    if (!cur.rowCount) throw notFound('Session');
    const prog = await lockProgramme(tx, cur.rows[0].programme_id);
    await requireEditable(ctx, prog, 'session.update');
    await tx.query(`UPDATE sessions SET title=$2, starts_at=$3, ends_at=$4, delivery_mode=$5, expected_onsite=$6, expected_online=$7 WHERE id=$1`,
      [sessionId, input.title.trim(), s, e, input.deliveryMode, on, off]);
    await writeSessionResources(tx, sessionId, res, on, off);
    await bumpVersion(tx, prog.id);
    const b = cur.rows[0];
    await audit(tx, ctx, { scope: scopeOf(prog), action: 'session.update', entityType: 'session', entityId: sessionId,
      entityVersion: prog.version + 1, outcome: 'SUCCESS',
      change: { before: { startsAt: b.starts_at, endsAt: b.ends_at, expectedOnsite: b.expected_onsite }, after: { startsAt: s, endsAt: e, expectedOnsite: on } } });
    return (await tx.query(`SELECT * FROM sessions WHERE id=$1`, [sessionId])).rows[0];
  });
}

export async function deleteSession(db: pg.Pool, ctx: Ctx, sessionId: string) {
  return withTx(db, async (tx) => {
    const cur = await tx.query(`SELECT * FROM sessions WHERE id=$1`, [sessionId]);
    if (!cur.rowCount) throw notFound('Session');
    const prog = await lockProgramme(tx, cur.rows[0].programme_id);
    await requireEditable(ctx, prog, 'session.delete');
    const hist = await tx.query(`SELECT (SELECT count(*) FROM facility_requests WHERE session_id=$1)
                                      + (SELECT count(*) FROM reservations WHERE session_id=$1) AS n`, [sessionId]);
    if (Number(hist.rows[0].n) > 0)
      await block(ctx, { scope: scopeOf(prog), action: 'session.delete', entityType: 'session', entityId: sessionId },
        new AppError(409, 'SESSION_HAS_HISTORY', 'This session has facility-request or reservation history and cannot be deleted.',
          { resolution: 'Edit the session instead; superseded facility requests are retained for audit.', resolver: 'Programme Administrator' }));
    await tx.query(`DELETE FROM session_trainers WHERE session_id=$1`, [sessionId]);
    await tx.query(`DELETE FROM sessions WHERE id=$1`, [sessionId]);
    await bumpVersion(tx, prog.id);
    await audit(tx, ctx, { scope: scopeOf(prog), action: 'session.delete', entityType: 'session', entityId: sessionId,
      entityVersion: prog.version + 1, outcome: 'SUCCESS', change: { title: cur.rows[0].title } });
    return { deleted: true };
  });
}

async function releaseHolds(tx: Tx, programmeId: string, reason: string, statuses: string[]) {
  const r = await tx.query(`UPDATE reservations SET status='RELEASED', released_at=now(), release_reason=$2
                             WHERE programme_id=$1 AND status = ANY($3) RETURNING id`, [programmeId, reason, statuses]);
  await tx.query(`UPDATE trainer_commitments SET status='RELEASED', released_at=now() WHERE programme_id=$1 AND status='CONFIRMED'`, [programmeId]);
  return r.rowCount;
}

/** Material revision after approval/confirmation: supersedes the approval and (if confirmed) releases bookings. */
export async function reopenProgramme(db: pg.Pool, ctx: Ctx, id: string, reason: string) {
  return withTx(db, async (tx) => {
    const prog = await lockProgramme(tx, id);
    const ev = { scope: scopeOf(prog), action: 'programme.reopen', entityType: 'programme', entityId: id, entityVersion: prog.version };
    if (!can(ctx.principal, 'programme.edit', { programmeId: id })) await block(ctx, { ...ev, outcome: 'DENIED' }, forbidden());
    if (!['APPROVED', 'CONFIRMED'].includes(prog.status))
      await block(ctx, ev, new AppError(409, 'INVALID_STATE', `Only APPROVED or CONFIRMED programmes can be reopened (current: ${prog.status}).`));
    if (!reason?.trim()) await block(ctx, ev, badRequest('A reason is required to reopen a programme.'));
    await tx.query(`UPDATE requests SET status='SUPERSEDED', closed_at=now() WHERE programme_id=$1 AND status IN ('APPROVED','IN_REVIEW','RETURNED')`, [id]);
    const released = await releaseHolds(tx, id, `reopened: ${reason}`, ['CONFIRMED']);
    await tx.query(`UPDATE programmes SET status='DRAFT' WHERE id=$1`, [id]);
    await bumpVersion(tx, id);
    await audit(tx, ctx, { ...ev, entityVersion: prog.version + 1, outcome: 'SUCCESS', reason,
      change: { from: prog.status, to: 'DRAFT', confirmedReservationsReleased: released, approval: 'SUPERSEDED — reapproval required' } });
    return { status: 'DRAFT' };
  });
}

export async function cancelProgramme(db: pg.Pool, ctx: Ctx, id: string, reason: string) {
  return withTx(db, async (tx) => {
    const prog = await lockProgramme(tx, id);
    const ev = { scope: scopeOf(prog), action: 'programme.cancel', entityType: 'programme', entityId: id, entityVersion: prog.version };
    if (!can(ctx.principal, 'programme.cancel', { programmeId: id })) await block(ctx, { ...ev, outcome: 'DENIED' }, forbidden());
    if (['CANCELLED', 'REJECTED'].includes(prog.status)) await block(ctx, ev, new AppError(409, 'INVALID_STATE', `Programme is already ${prog.status}.`));
    if (!reason?.trim()) await block(ctx, ev, badRequest('A cancellation reason is required.'));
    await tx.query(`UPDATE requests SET status='WITHDRAWN', closed_at=now() WHERE programme_id=$1 AND status IN ('IN_REVIEW','RETURNED')`, [id]);
    await tx.query(`UPDATE facility_requests SET status='SUPERSEDED' WHERE programme_id=$1 AND status IN ('PENDING','CONFIRMED','ALTERNATIVE_PROPOSED')`, [id]);
    const released = await releaseHolds(tx, id, `cancelled: ${reason}`, ['TENTATIVE', 'CONFIRMED']);
    const invites = await tx.query(`UPDATE session_trainers st SET status='WITHDRAWN', response_note='Programme cancelled'
       FROM sessions s WHERE s.id=st.session_id AND s.programme_id=$1 AND st.status='INVITED' RETURNING st.id`, [id]);
    await tx.query(`UPDATE programmes SET status='CANCELLED', cancelled_reason=$2, updated_at=now() WHERE id=$1`, [id, reason]);
    await audit(tx, ctx, { ...ev, outcome: 'SUCCESS', reason,
      change: { from: prog.status, reservationsReleased: released, pendingInvitationsWithdrawn: invites.rowCount } });
    return { status: 'CANCELLED' };
  });
}

export function canSeeAnyProgramme(p: Principal) {
  return canAnywhere(p, 'programme.view') || !!p.trainerId || canAnywhere(p, 'facility.view');
}
