import type pg from 'pg';
import type { Ctx } from '../context.ts';
import { block } from '../context.ts';
import { audit } from '../audit.ts';
import { withTx, type Tx } from '../db.ts';
import { AppError, badRequest, forbidden, notFound } from '../errors.ts';
import { can, institutionScopes } from '../permissions.ts';
import { bumpVersion } from './programmes.ts';

const ACTIVE_FR = ['PENDING', 'CONFIRMED', 'ALTERNATIVE_PROPOSED'];

/**
 * Brings facility requests in line with the programme's current sessions. Requests whose resource/time no longer
 * match are SUPERSEDED (their tentative holds released); missing ones are created PENDING with a TENTATIVE hold.
 * Idempotent: running it twice creates nothing new.
 */
export async function reconcileFacilityRequests(tx: Tx, ctx: Ctx, prog: any, origin: Record<string, 'ALTERNATIVE'> = {}) {
  const needs = (await tx.query(
    `SELECT s.id AS session_id, s.starts_at, s.ends_at, sr.resource_id, sr.units_required, r.allocation_mode
       FROM sessions s JOIN session_resources sr ON sr.session_id=s.id JOIN resources r ON r.id=sr.resource_id
      WHERE s.programme_id=$1 AND r.requires_facility_confirmation`, [prog.id])).rows;
  const existing = (await tx.query(
    `SELECT * FROM facility_requests WHERE programme_id=$1 AND status = ANY($2)`, [prog.id, ACTIVE_FR])).rows;
  const matches = (fr: any, n: any) => fr.session_id === n.session_id && fr.resource_id === n.resource_id
    && +fr.requested_starts_at === +n.starts_at && +fr.requested_ends_at === +n.ends_at && fr.units === n.units_required;
  let superseded = 0, created = 0;
  for (const fr of existing) {
    if (needs.some((n) => matches(fr, n))) continue;
    await tx.query(`UPDATE facility_requests SET status='SUPERSEDED' WHERE id=$1`, [fr.id]);
    await tx.query(`UPDATE reservations SET status='RELEASED', released_at=now(), release_reason='facility request superseded'
                     WHERE facility_request_id=$1 AND status='TENTATIVE'`, [fr.id]);
    await audit(tx, ctx, { scope: `programme:${prog.id}`, action: 'facility.supersede', entityType: 'facility_request', entityId: fr.id,
      entityVersion: prog.version, outcome: 'SUCCESS', reason: 'Session time, resource or units changed' });
    superseded++;
  }
  for (const n of needs) {
    if (existing.some((fr) => matches(fr, n))) continue;
    const fr = (await tx.query(
      `INSERT INTO facility_requests (programme_id, session_id, resource_id, requested_starts_at, requested_ends_at, units, origin, status, requested_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING',$8) RETURNING *`,
      [prog.id, n.session_id, n.resource_id, n.starts_at, n.ends_at, n.units_required, origin[n.session_id] ?? 'PROGRAMME', ctx.principal.id])).rows[0];
    await tx.query(
      `INSERT INTO reservations (programme_id, session_id, resource_id, period, units, allocation_mode, status, facility_request_id, created_by)
       VALUES ($1,$2,$3,tstzrange($4,$5,'[)'),$6,$7,'TENTATIVE',$8,$9)`,
      [prog.id, n.session_id, n.resource_id, n.starts_at, n.ends_at, n.units_required, n.allocation_mode, fr.id, ctx.principal.id]);
    await audit(tx, ctx, { scope: `programme:${prog.id}`, action: 'facility.request', entityType: 'facility_request', entityId: fr.id,
      entityVersion: prog.version, outcome: 'SUCCESS', change: { resourceId: n.resource_id, sessionId: n.session_id, tentativeHold: true } });
    created++;
  }
  return { created, superseded };
}

export async function requestFacilities(db: pg.Pool, ctx: Ctx, programmeId: string) {
  return withTx(db, async (tx) => {
    const r = await tx.query(`SELECT * FROM programmes WHERE id=$1 FOR UPDATE`, [programmeId]);
    if (!r.rowCount) throw notFound('Programme');
    const prog = r.rows[0];
    const ev = { scope: `programme:${prog.id}`, action: 'facility.request', entityType: 'programme', entityId: prog.id, entityVersion: prog.version };
    if (!can(ctx.principal, 'facility.request', { programmeId })) await block(ctx, { ...ev, outcome: 'DENIED' }, forbidden());
    if (!['DRAFT', 'RETURNED', 'IN_APPROVAL', 'APPROVED'].includes(prog.status))
      await block(ctx, ev, new AppError(409, 'INVALID_STATE', `Facility requests cannot be raised while the programme is ${prog.status}.`));
    return reconcileFacilityRequests(tx, ctx, prog);
  });
}

export async function listFacilityRequests(db: pg.Pool, ctx: Ctx, f: { status?: string; programmeId?: string }) {
  const sc = institutionScopes(ctx.principal, 'facility.view');
  if (!sc.global && !sc.ids.length) throw forbidden();
  const params: unknown[] = []; const where: string[] = [];
  if (!sc.global) { params.push(sc.ids); where.push(`r.owner_institution_id = ANY($${params.length}::uuid[])`); }
  if (f.status) { params.push(f.status); where.push(`fr.status = $${params.length}`); }
  if (f.programmeId) { params.push(f.programmeId); where.push(`fr.programme_id = $${params.length}`); }
  const rows = (await db.query(
    `SELECT fr.*, r.code AS resource_code, r.name AS resource_name, r.capacity, r.owner_institution_id,
            ar.code AS alt_resource_code, p.code AS programme_code, p.title AS programme_title, p.is_simulation,
            s.title AS session_title, s.expected_onsite, u.display_name AS requested_by_name, ru.display_name AS responded_by_name
       FROM facility_requests fr JOIN resources r ON r.id=fr.resource_id JOIN programmes p ON p.id=fr.programme_id
       JOIN sessions s ON s.id=fr.session_id JOIN users u ON u.id=fr.requested_by
       LEFT JOIN users ru ON ru.id=fr.responded_by LEFT JOIN resources ar ON ar.id=fr.alt_resource_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY fr.requested_starts_at`, params)).rows;
  return rows.map((x) => ({ ...x, canRespond: x.status === 'PENDING' && can(ctx.principal, 'facility.respond', { institutionId: x.owner_institution_id }) }));
}

export async function respondFacility(db: pg.Pool, ctx: Ctx, frId: string, input: { action: string; note?: string; altResourceId?: string; altStartsAt?: string; altEndsAt?: string }) {
  return withTx(db, async (tx) => {
    const r = await tx.query(
      `SELECT fr.*, r.owner_institution_id, r.allocation_mode, r.capacity, r.code AS resource_code
         FROM facility_requests fr JOIN resources r ON r.id=fr.resource_id WHERE fr.id=$1 FOR UPDATE OF fr`, [frId]);
    if (!r.rowCount) throw notFound('Facility request');
    const fr = r.rows[0];
    const ev = { scope: `programme:${fr.programme_id}`, action: `facility.${String(input.action).toLowerCase()}`,
      entityType: 'facility_request', entityId: fr.id };
    // Object-level authorisation: SPOC must be scoped to the institution that owns the resource.
    if (!can(ctx.principal, 'facility.respond', { institutionId: fr.owner_institution_id }))
      await block(ctx, { ...ev, outcome: 'DENIED' }, forbidden('You may only respond to facility requests for resources your institution owns.', 'SRM Centre SPOC'));
    if (fr.status !== 'PENDING') await block(ctx, ev, new AppError(409, 'INVALID_STATE', `Facility request is ${fr.status}.`));
    const note = input.note?.trim() || null;
    if (input.action === 'CONFIRM') {
      const clash = await tx.query(
        `SELECT p.code, rv.units FROM reservations rv JOIN programmes p ON p.id=rv.programme_id
          WHERE rv.resource_id=$1 AND rv.status='CONFIRMED' AND rv.programme_id<>$2 AND rv.period && tstzrange($3,$4,'[)')`,
        [fr.resource_id, fr.programme_id, fr.requested_starts_at, fr.requested_ends_at]);
      const used = clash.rows.reduce((a, x) => a + x.units, 0);
      if ((fr.allocation_mode === 'EXCLUSIVE' && clash.rowCount) || (fr.allocation_mode === 'SHARED' && used + fr.units > fr.capacity))
        await block(ctx, ev, new AppError(409, 'RESOURCE_UNAVAILABLE',
          `${fr.resource_code} is already confirmed for ${clash.rows.map((x) => x.code).join(', ')} at this time.`,
          { resolution: 'Decline or propose an alternative resource/time.', resolver: 'SRM Centre SPOC' }));
      await tx.query(`UPDATE facility_requests SET status='CONFIRMED', responded_by=$2, responded_at=now(), response_note=$3 WHERE id=$1`, [fr.id, ctx.principal.id, note]);
    } else if (input.action === 'DECLINE') {
      if (!note) await block(ctx, ev, badRequest('A reason is required to decline a facility request.'));
      await tx.query(`UPDATE facility_requests SET status='DECLINED', responded_by=$2, responded_at=now(), response_note=$3 WHERE id=$1`, [fr.id, ctx.principal.id, note]);
      await tx.query(`UPDATE reservations SET status='RELEASED', released_at=now(), release_reason='facility declined' WHERE facility_request_id=$1 AND status='TENTATIVE'`, [fr.id]);
    } else if (input.action === 'PROPOSE_ALTERNATIVE') {
      if (!note) await block(ctx, ev, badRequest('Explain the proposed alternative.'));
      if (!input.altResourceId && !input.altStartsAt) await block(ctx, ev, badRequest('Propose an alternative resource and/or time.'));
      let altS: Date | null = null, altE: Date | null = null;
      if (input.altStartsAt || input.altEndsAt) {
        altS = new Date(input.altStartsAt!); altE = new Date(input.altEndsAt!);
        if (Number.isNaN(+altS) || Number.isNaN(+altE) || altE <= altS) await block(ctx, ev, badRequest('Alternative start/end times are invalid.'));
      }
      if (input.altResourceId) {
        const ar = await tx.query(`SELECT owner_institution_id, status FROM resources WHERE id=$1`, [input.altResourceId]);
        if (!ar.rowCount || ar.rows[0].status !== 'ACTIVE') await block(ctx, ev, badRequest('Alternative resource is unknown or inactive.'));
        if (!can(ctx.principal, 'facility.respond', { institutionId: ar.rows[0].owner_institution_id }))
          await block(ctx, { ...ev, outcome: 'DENIED' }, forbidden('You may only propose resources your institution owns.'));
      }
      await tx.query(`UPDATE facility_requests SET status='ALTERNATIVE_PROPOSED', responded_by=$2, responded_at=now(), response_note=$3,
                        alt_resource_id=$4, alt_starts_at=$5, alt_ends_at=$6 WHERE id=$1`,
        [fr.id, ctx.principal.id, note, input.altResourceId || null, altS, altE]);
    } else throw badRequest('action must be CONFIRM, DECLINE or PROPOSE_ALTERNATIVE');
    await audit(tx, ctx, { ...ev, outcome: 'SUCCESS', reason: note, change: { institutionId: fr.owner_institution_id, altResourceId: input.altResourceId ?? null, altStartsAt: input.altStartsAt ?? null } });
    return (await tx.query(`SELECT * FROM facility_requests WHERE id=$1`, [fr.id])).rows[0];
  });
}

/** Programme owner accepts an SRM alternative. This is a material change; if under/after approval, reapproval is required. */
export async function acceptAlternative(db: pg.Pool, ctx: Ctx, frId: string, confirmReapproval: boolean) {
  return withTx(db, async (tx) => {
    const fr = (await tx.query(`SELECT * FROM facility_requests WHERE id=$1 FOR UPDATE`, [frId])).rows[0];
    if (!fr) throw notFound('Facility request');
    const prog = (await tx.query(`SELECT * FROM programmes WHERE id=$1 FOR UPDATE`, [fr.programme_id])).rows[0];
    const ev = { scope: `programme:${prog.id}`, action: 'facility.accept_alternative', entityType: 'facility_request', entityId: fr.id, entityVersion: prog.version };
    if (!can(ctx.principal, 'programme.edit', { programmeId: prog.id })) await block(ctx, { ...ev, outcome: 'DENIED' }, forbidden());
    if (fr.status !== 'ALTERNATIVE_PROPOSED') await block(ctx, ev, new AppError(409, 'INVALID_STATE', `Facility request is ${fr.status}.`));
    if (['CONFIRMED', 'CANCELLED', 'REJECTED'].includes(prog.status))
      await block(ctx, ev, new AppError(409, 'INVALID_STATE', `Programme is ${prog.status}. Reopen it for revision before accepting alternatives.`));
    let supersededApproval = false;
    if (['IN_APPROVAL', 'APPROVED'].includes(prog.status)) {
      if (!confirmReapproval)
        await block(ctx, ev, new AppError(409, 'REAPPROVAL_REQUIRED',
          'Accepting this alternative changes the programme after submission; the current approval will be superseded and the programme must be resubmitted.',
          { resolution: 'Repeat the action with confirmReapproval=true.', resolver: 'Programme Administrator' }));
      await tx.query(`UPDATE requests SET status='SUPERSEDED', closed_at=now() WHERE programme_id=$1 AND status IN ('IN_REVIEW','APPROVED')`, [prog.id]);
      await tx.query(`UPDATE programmes SET status='DRAFT' WHERE id=$1`, [prog.id]);
      supersededApproval = true;
    }
    if (fr.alt_starts_at) await tx.query(`UPDATE sessions SET starts_at=$2, ends_at=$3 WHERE id=$1`, [fr.session_id, fr.alt_starts_at, fr.alt_ends_at]);
    if (fr.alt_resource_id && fr.alt_resource_id !== fr.resource_id) {
      const dup = await tx.query(`SELECT 1 FROM session_resources WHERE session_id=$1 AND resource_id=$2`, [fr.session_id, fr.alt_resource_id]);
      if (dup.rowCount) await tx.query(`DELETE FROM session_resources WHERE session_id=$1 AND resource_id=$2`, [fr.session_id, fr.resource_id]);
      else await tx.query(`UPDATE session_resources SET resource_id=$3 WHERE session_id=$1 AND resource_id=$2`, [fr.session_id, fr.resource_id, fr.alt_resource_id]);
    }
    await tx.query(`UPDATE facility_requests SET status='ALTERNATIVE_ACCEPTED' WHERE id=$1`, [fr.id]);
    await tx.query(`UPDATE reservations SET status='RELEASED', released_at=now(), release_reason='alternative accepted' WHERE facility_request_id=$1 AND status='TENTATIVE'`, [fr.id]);
    await bumpVersion(tx, prog.id);
    const updated = (await tx.query(`SELECT * FROM programmes WHERE id=$1`, [prog.id])).rows[0];
    const rec = await reconcileFacilityRequests(tx, ctx, updated, { [fr.session_id]: 'ALTERNATIVE' });
    await audit(tx, ctx, { ...ev, entityVersion: updated.version, outcome: 'SUCCESS',
      change: { altResourceId: fr.alt_resource_id, altStartsAt: fr.alt_starts_at, supersededApproval, newFacilityRequests: rec.created } });
    return { supersededApproval, ...rec };
  });
}
