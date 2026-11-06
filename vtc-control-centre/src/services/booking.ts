import type pg from 'pg';
import type { Ctx } from '../context.ts';
import { block } from '../context.ts';
import { audit } from '../audit.ts';
import { withTx } from '../db.ts';
import { AppError, forbidden, notFound } from '../errors.ts';
import { can } from '../permissions.ts';
import { resolvePolicy, POLICY_DECISIONS, type BookingDefinition } from './policies.ts';
import { validateProgramme, type Issue } from './validation.ts';

type Q = pg.Pool | pg.PoolClient;

export interface Check { key: string; label: string; met: boolean; detail: string; resolver?: string; issues?: Issue[] }

/**
 * Final-booking readiness (prompt §6.2). Computed read-only for display and recomputed authoritatively
 * inside the SERIALIZABLE booking transaction after resource and trainer rows are locked.
 */
export async function bookingReadiness(q: Q, prog: any): Promise<{ ready: boolean; checks: Check[]; policy: any }> {
  const checks: Check[] = [];
  const policy = await resolvePolicy(q, 'BOOKING', prog.is_simulation);
  checks.push({ key: 'booking_policy', label: 'Booking policy configured', met: !!policy,
    detail: policy ? `${policy.title} v${policy.version} (${policy.provenance})` :
      `No ${prog.is_simulation ? 'simulation' : 'authorised'} BOOKING policy is active — final booking is blocked.`,
    resolver: policy ? undefined : POLICY_DECISIONS.BOOKING.owner });
  const def = policy?.definition as BookingDefinition | undefined;

  const req = (await q.query(`SELECT * FROM requests WHERE programme_id=$1 AND status='APPROVED' ORDER BY submitted_at DESC LIMIT 1`, [prog.id])).rows[0];
  const approved = !!req && req.subject_version === prog.version && prog.status === 'APPROVED';
  checks.push({ key: 'approval', label: 'Training request approved for current version', met: approved,
    detail: approved ? `${req.reference} approved (programme v${prog.version})` :
      req ? `Approval ${req.reference} covers v${req.subject_version}; programme is v${prog.version}.` : `Programme status is ${prog.status}; no current approval.`,
    resolver: approved ? undefined : 'Authorised Volvo approvers (per configured routing)' });

  const need = (await q.query(
    `SELECT s.id AS session_id, s.title, s.starts_at, s.ends_at, sr.resource_id, sr.units_required, r.code
       FROM sessions s JOIN session_resources sr ON sr.session_id=s.id JOIN resources r ON r.id=sr.resource_id
      WHERE s.programme_id=$1 AND r.requires_facility_confirmation`, [prog.id])).rows;
  const confirmed = (await q.query(`SELECT * FROM facility_requests WHERE programme_id=$1 AND status='CONFIRMED'`, [prog.id])).rows;
  const missing = need.filter((n) => !confirmed.some((c) => c.session_id === n.session_id && c.resource_id === n.resource_id
    && +c.requested_starts_at === +n.starts_at && +c.requested_ends_at === +n.ends_at && c.units === n.units_required));
  checks.push({ key: 'facility', label: 'SRM facility confirmations', met: missing.length === 0,
    detail: missing.length ? `${missing.length} of ${need.length} facility confirmation(s) outstanding: ${missing.map((m) => `${m.code} for "${m.title}"`).join('; ')}`
      : `${need.length} of ${need.length} confirmed by SRM`, resolver: missing.length ? 'SRM Centre SPOC' : undefined });

  const tr = (await q.query(
    `SELECT s.id, s.title, count(st.*) FILTER (WHERE st.status='ACCEPTED')::int AS accepted,
            count(st.*) FILTER (WHERE st.status='INVITED')::int AS invited
       FROM sessions s LEFT JOIN session_trainers st ON st.session_id=s.id WHERE s.programme_id=$1 GROUP BY s.id, s.title`, [prog.id])).rows;
  if (def) {
    const min = def.require_trainer_acceptance ? Math.max(1, def.minimum_accepted_trainers_per_session) : def.minimum_accepted_trainers_per_session;
    const short = tr.filter((t) => t.accepted < min);
    checks.push({ key: 'trainers', label: 'Trainer readiness', met: short.length === 0,
      detail: short.length ? `${short.length} session(s) below ${min} accepted trainer(s): ${short.map((s) => `"${s.title}" (${s.accepted} accepted, ${s.invited} invited)`).join('; ')}`
        : `All sessions have at least ${min} accepted trainer(s)`, resolver: short.length ? 'Trainers / Programme Administrator' : undefined });
  } else checks.push({ key: 'trainers', label: 'Trainer readiness', met: false, detail: 'Cannot evaluate: no booking policy.', resolver: POLICY_DECISIONS.BOOKING.owner });

  const v = await validateProgramme(q, prog.id, { bufferMinutes: def?.buffer_minutes ?? 0 });
  checks.push({ key: 'conflicts', label: 'Availability, capacity and conflicts', met: v.errors.length === 0,
    detail: v.errors.length ? `${v.errors.length} blocking issue(s)` : `No blocking conflicts${def?.buffer_minutes ? ` (buffer ${def.buffer_minutes} min)` : ''}`,
    issues: v.errors, resolver: v.errors.length ? 'Programme Administrator / SRM Centre SPOC' : undefined });

  return { ready: checks.every((c) => c.met), checks, policy };
}

export async function finaliseBooking(db: pg.Pool, ctx: Ctx, programmeId: string) {
  try {
    return await withTx(db, async (tx) => {
      const r = await tx.query(`SELECT * FROM programmes WHERE id=$1 FOR UPDATE`, [programmeId]);
      if (!r.rowCount) throw notFound('Programme');
      const prog = r.rows[0];
      const ev = { scope: `programme:${prog.id}`, action: 'booking.finalise', entityType: 'programme', entityId: prog.id, entityVersion: prog.version };
      if (!can(ctx.principal, 'booking.finalise', { programmeId }))
        await block(ctx, { ...ev, outcome: 'DENIED' }, forbidden('You may not finalise bookings.', 'Programme Administrator'));
      if (prog.status === 'CONFIRMED') await block(ctx, ev, new AppError(409, 'ALREADY_CONFIRMED', 'This programme is already confirmed; no duplicate reservations were created.'));

      // Lock every resource and trainer involved, in a deterministic order, to serialise competing bookings.
      await tx.query(`SELECT id FROM resources WHERE id IN (SELECT sr.resource_id FROM session_resources sr JOIN sessions s ON s.id=sr.session_id
                       WHERE s.programme_id=$1) ORDER BY id FOR UPDATE`, [programmeId]);
      await tx.query(`SELECT id FROM trainers WHERE id IN (SELECT st.trainer_id FROM session_trainers st JOIN sessions s ON s.id=st.session_id
                       WHERE s.programme_id=$1 AND st.status='ACCEPTED') ORDER BY id FOR UPDATE`, [programmeId]);

      const rd = await bookingReadiness(tx, prog);
      if (!rd.ready)
        await block(ctx, ev, new AppError(409, 'BOOKING_PRECONDITIONS_UNMET', 'Final booking is blocked: not all booking conditions are met.',
          { resolution: 'Resolve each unmet condition listed.', details: rd.checks.filter((c) => !c.met) }));
      const buffer = (rd.policy.definition as BookingDefinition).buffer_minutes;

      await tx.query(`UPDATE reservations SET status='RELEASED', released_at=now(), release_reason='superseded by confirmed booking'
                       WHERE programme_id=$1 AND status='TENTATIVE'`, [programmeId]);
      const ins = await tx.query(
        `INSERT INTO reservations (programme_id, session_id, resource_id, period, units, allocation_mode, status, created_by)
         SELECT s.programme_id, s.id, sr.resource_id,
                tstzrange(s.starts_at - make_interval(mins => $2), s.ends_at + make_interval(mins => $2), '[)'),
                sr.units_required, r.allocation_mode, 'CONFIRMED', $3
           FROM sessions s JOIN session_resources sr ON sr.session_id=s.id JOIN resources r ON r.id=sr.resource_id
          WHERE s.programme_id=$1 RETURNING id`, [programmeId, buffer, ctx.principal.id]);
      const tc = await tx.query(
        `INSERT INTO trainer_commitments (programme_id, session_id, trainer_id, period, status)
         SELECT s.programme_id, s.id, st.trainer_id, tstzrange(s.starts_at, s.ends_at, '[)'), 'CONFIRMED'
           FROM sessions s JOIN session_trainers st ON st.session_id=s.id WHERE s.programme_id=$1 AND st.status='ACCEPTED' RETURNING id`, [programmeId]);
      await tx.query(`UPDATE programmes SET status='CONFIRMED', updated_at=now() WHERE id=$1`, [programmeId]);
      await audit(tx, ctx, { ...ev, outcome: 'SUCCESS',
        change: { confirmedReservations: ins.rowCount, trainerCommitments: tc.rowCount, bookingPolicy: `${rd.policy.title} v${rd.policy.version}`, bufferMinutes: buffer } });
      return { status: 'CONFIRMED', reservations: ins.rowCount, trainerCommitments: tc.rowCount };
    }, { isolation: 'SERIALIZABLE' });
  } catch (err: any) {
    if (err?.code === '23P01') {
      // The database exclusion constraint caught a conflict the application checks did not (defence in depth).
      const e = new AppError(409, 'BOOKING_CONFLICT', 'Another booking was confirmed for the same resource or trainer at an overlapping time.',
        { resolution: 'Review availability and choose another time or resource.', resolver: 'Programme Administrator' });
      await block(ctx, { scope: `programme:${programmeId}`, action: 'booking.finalise', entityType: 'programme', entityId: programmeId }, e);
    }
    throw err;
  }
}
