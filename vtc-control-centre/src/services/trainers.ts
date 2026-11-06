import type pg from 'pg';
import type { Ctx } from '../context.ts';
import { block } from '../context.ts';
import { audit } from '../audit.ts';
import { withTx } from '../db.ts';
import { AppError, badRequest, forbidden, notFound } from '../errors.ts';
import { can, canAnywhere } from '../permissions.ts';

export async function listTrainers(db: pg.Pool, ctx: Ctx) {
  if (!canAnywhere(ctx.principal, 'trainer.view')) throw forbidden();
  return (await db.query(
    `SELECT t.*, (SELECT count(*)::int FROM trainer_commitments tc WHERE tc.trainer_id=t.id AND tc.status='CONFIRMED' AND upper(tc.period) > now()) AS upcoming_commitments
       FROM trainers t ORDER BY display_name`)).rows;
}

export async function assignTrainer(db: pg.Pool, ctx: Ctx, sessionId: string, trainerId: string, role = 'LEAD') {
  if (!['LEAD', 'SUPPORT'].includes(role)) throw badRequest('role must be LEAD or SUPPORT');
  return withTx(db, async (tx) => {
    const s = (await tx.query(`SELECT s.*, p.status AS programme_status, p.version FROM sessions s JOIN programmes p ON p.id=s.programme_id WHERE s.id=$1`, [sessionId])).rows[0];
    if (!s) throw notFound('Session');
    await tx.query(`SELECT 1 FROM programmes WHERE id=$1 FOR UPDATE`, [s.programme_id]);
    const ev = { scope: `programme:${s.programme_id}`, action: 'trainer.assign', entityType: 'session', entityId: sessionId, entityVersion: s.version };
    if (!can(ctx.principal, 'trainer.assign', { programmeId: s.programme_id })) await block(ctx, { ...ev, outcome: 'DENIED' }, forbidden());
    if (['CONFIRMED', 'CANCELLED', 'REJECTED'].includes(s.programme_status))
      await block(ctx, ev, new AppError(409, 'INVALID_STATE', `Trainer assignments cannot change while the programme is ${s.programme_status}.`,
        { resolution: 'Trainer substitution after confirmation is delivered in a later slice; reopen the programme if necessary.' }));
    const t = (await tx.query(`SELECT * FROM trainers WHERE id=$1`, [trainerId])).rows[0];
    if (!t || t.status !== 'ACTIVE') await block(ctx, ev, badRequest('Trainer is unknown or inactive.'));
    const ex = await tx.query(`SELECT id, status FROM session_trainers WHERE session_id=$1 AND trainer_id=$2`, [sessionId, trainerId]);
    let row;
    if (ex.rowCount) {
      if (['INVITED', 'ACCEPTED'].includes(ex.rows[0].status)) await block(ctx, ev, new AppError(409, 'ALREADY_ASSIGNED', 'Trainer is already assigned to this session.'));
      row = (await tx.query(`UPDATE session_trainers SET status='INVITED', role=$2, responded_at=NULL, response_note=NULL WHERE id=$1 RETURNING *`, [ex.rows[0].id, role])).rows[0];
    } else {
      row = (await tx.query(`INSERT INTO session_trainers (session_id, trainer_id, role) VALUES ($1,$2,$3) RETURNING *`, [sessionId, trainerId, role])).rows[0];
    }
    await audit(tx, ctx, { ...ev, outcome: 'SUCCESS', change: { trainerId, role, notification: 'NOT SENT — communications integration not configured (D-08)' } });
    return row;
  });
}

export async function myAssignments(db: pg.Pool, ctx: Ctx) {
  if (!ctx.principal.trainerId) return [];
  return (await db.query(
    `SELECT st.*, s.programme_id, s.title AS session_title, s.starts_at, s.ends_at, s.delivery_mode, p.code AS programme_code, p.title AS programme_title,
            p.status AS programme_status, p.is_simulation
       FROM session_trainers st JOIN sessions s ON s.id=st.session_id JOIN programmes p ON p.id=s.programme_id
      WHERE st.trainer_id=$1 ORDER BY s.starts_at`, [ctx.principal.trainerId])).rows;
}

export async function respondAssignment(db: pg.Pool, ctx: Ctx, assignmentId: string, action: string, note?: string) {
  if (!['ACCEPT', 'DECLINE'].includes(action)) throw badRequest('action must be ACCEPT or DECLINE');
  return withTx(db, async (tx) => {
    const a = (await tx.query(
      `SELECT st.*, s.starts_at, s.ends_at, s.programme_id, p.status AS programme_status FROM session_trainers st
         JOIN sessions s ON s.id=st.session_id JOIN programmes p ON p.id=s.programme_id WHERE st.id=$1 FOR UPDATE OF st`, [assignmentId])).rows[0];
    if (!a) throw notFound('Assignment');
    const ev = { scope: `programme:${a.programme_id}`, action: `trainer.${action.toLowerCase()}`, entityType: 'session_trainer', entityId: a.id };
    // Object-level: only the trainer themself may respond.
    if (!can(ctx.principal, 'trainer.respond_own') || ctx.principal.trainerId !== a.trainer_id)
      await block(ctx, { ...ev, outcome: 'DENIED' }, forbidden('Only the invited trainer may respond to this invitation.'));
    if (a.programme_status === 'CONFIRMED' && action === 'DECLINE')
      await block(ctx, ev, new AppError(409, 'WITHDRAWAL_WORKFLOW_REQUIRED', 'The programme is confirmed; declining now is a withdrawal.',
        { resolution: 'Contact the Programme Administrator; the withdrawal workflow is delivered in a later slice.', resolver: 'Programme Administrator' }));
    if (!['INVITED', 'ACCEPTED'].includes(a.status) || (a.status === 'ACCEPTED' && action === 'ACCEPT'))
      await block(ctx, ev, new AppError(409, 'INVALID_STATE', `Assignment is ${a.status}.`));
    if (action === 'ACCEPT') {
      const c = await tx.query(`SELECT 1 FROM trainer_commitments WHERE trainer_id=$1 AND status='CONFIRMED' AND period && tstzrange($2,$3,'[)')`,
        [a.trainer_id, a.starts_at, a.ends_at]);
      if (c.rowCount) await block(ctx, ev, new AppError(409, 'TRAINER_DOUBLE_BOOKED', 'You are already committed to another confirmed session at this time.'));
    }
    const status = action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED';
    await tx.query(`UPDATE session_trainers SET status=$2, responded_at=now(), response_note=$3 WHERE id=$1`, [a.id, status, note?.trim() || null]);
    await audit(tx, ctx, { ...ev, outcome: 'SUCCESS', reason: note ?? null, change: { from: a.status, to: status } });
    return { status };
  });
}
