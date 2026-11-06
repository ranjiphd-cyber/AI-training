import type pg from 'pg';
import type { Ctx } from '../context.ts';
import { forbidden } from '../errors.ts';
import { can, canAnywhere } from '../permissions.ts';
import { assertVisible, EDITABLE } from './programmes.ts';
import { bookingReadiness } from './booking.ts';
import { validateProgramme } from './validation.ts';
import { getRequest } from './approvals.ts';
import { listFacilityRequests } from './facilities.ts';

export async function listResources(db: pg.Pool, ctx: Ctx) {
  if (!canAnywhere(ctx.principal, 'resource.view')) throw forbidden();
  return (await db.query(`SELECT r.*, i.name AS owner_name FROM resources r JOIN institutions i ON i.id=r.owner_institution_id ORDER BY r.code`)).rows;
}

export async function listReservations(db: pg.Pool, ctx: Ctx, from: Date, to: Date) {
  if (!canAnywhere(ctx.principal, 'resource.view')) throw forbidden();
  return (await db.query(
    `SELECT rv.id, rv.status, lower(rv.period) AS starts_at, upper(rv.period) AS ends_at, rv.units, r.code AS resource_code, r.name AS resource_name,
            p.code AS programme_code, p.title AS programme_title, p.is_simulation, s.title AS session_title
       FROM reservations rv JOIN resources r ON r.id=rv.resource_id JOIN programmes p ON p.id=rv.programme_id JOIN sessions s ON s.id=rv.session_id
      WHERE rv.status IN ('TENTATIVE','CONFIRMED') AND rv.period && tstzrange($1,$2,'[)') ORDER BY lower(rv.period), r.code`, [from, to])).rows;
}

export async function listInstitutions(db: pg.Pool) {
  return (await db.query(`SELECT id, code, name, kind, approval_status, is_synthetic FROM institutions ORDER BY kind, name`)).rows;
}

export async function programmeHistory(db: pg.Pool, programmeId: string) {
  return (await db.query(
    `SELECT occurred_at, actor_label, action, entity_type, entity_version, outcome, reason, change, correlation_id
       FROM audit_events WHERE scope = $1 OR (entity_type='programme' AND entity_id=$2)
      ORDER BY occurred_at DESC, id DESC LIMIT 200`, [`programme:${programmeId}`, programmeId])).rows;
}

type Action = { key: string; label: string; enabled: boolean; reason?: string };

/** Full detail view model: state, owner, next action, blockers, history, and only the actions this user holds. */
export async function programmeDetail(db: pg.Pool, ctx: Ctx, id: string) {
  const p = ctx.principal;
  const prog = await assertVisible(db, p, id);
  const owner = (await db.query(`SELECT display_name FROM users WHERE id=$1`, [prog.owner_user_id])).rows[0]?.display_name;
  const sessions = (await db.query(`SELECT * FROM sessions WHERE programme_id=$1 ORDER BY starts_at`, [id])).rows;
  const sres = (await db.query(
    `SELECT sr.*, r.code, r.name, r.kind, r.capacity, r.allocation_mode, r.requires_facility_confirmation FROM session_resources sr
       JOIN resources r ON r.id=sr.resource_id JOIN sessions s ON s.id=sr.session_id WHERE s.programme_id=$1`, [id])).rows;
  const strs = (await db.query(
    `SELECT st.*, t.display_name FROM session_trainers st JOIN trainers t ON t.id=st.trainer_id
       JOIN sessions s ON s.id=st.session_id WHERE s.programme_id=$1`, [id])).rows;
  const institutions = (await db.query(
    `SELECT i.id, i.name, i.approval_status FROM programme_institutions pi JOIN institutions i ON i.id=pi.institution_id WHERE pi.programme_id=$1`, [id])).rows;
  const reqRow = (await db.query(`SELECT id FROM requests WHERE programme_id=$1 ORDER BY submitted_at DESC LIMIT 1`, [id])).rows[0];
  const request = reqRow ? await getRequest(db, ctx, reqRow.id) : null;
  let facility: any[] = [];
  try { facility = await listFacilityRequests(db, ctx, { programmeId: id }); } catch { facility = []; }
  const reservations = (await db.query(
    `SELECT rv.id, rv.status, lower(rv.period) AS starts_at, upper(rv.period) AS ends_at, r.code AS resource_code, rv.session_id
       FROM reservations rv JOIN resources r ON r.id=rv.resource_id WHERE rv.programme_id=$1 AND rv.status <> 'RELEASED'`, [id])).rows;
  const validation = await validateProgramme(db, id);
  const readiness = await bookingReadiness(db, prog);
  const editable = EDITABLE.includes(prog.status);
  const actions: Action[] = [];
  const add = (perm: Parameters<typeof can>[1], a: Action) => { if (can(p, perm, { programmeId: id })) actions.push(a); };
  const stateReason = (ok: boolean, why: string) => (ok ? undefined : why);
  add('programme.edit', { key: 'edit', label: 'Edit programme & sessions', enabled: editable, reason: stateReason(editable, `Programme is ${prog.status}; edits require DRAFT or RETURNED.`) });
  add('programme.submit', { key: 'submit', label: 'Submit for approval', enabled: editable && validation.errors.length === 0,
    reason: !editable ? `Programme is ${prog.status}.` : validation.errors.length ? `${validation.errors.length} validation error(s) must be resolved first.` : undefined });
  add('facility.request', { key: 'request_facilities', label: 'Request SRM facility confirmation', enabled: ['DRAFT', 'RETURNED', 'IN_APPROVAL', 'APPROVED'].includes(prog.status) && sessions.length > 0,
    reason: sessions.length === 0 ? 'Add sessions first.' : stateReason(['DRAFT', 'RETURNED', 'IN_APPROVAL', 'APPROVED'].includes(prog.status), `Programme is ${prog.status}.`) });
  add('booking.finalise', { key: 'finalise', label: 'Confirm final booking', enabled: readiness.ready,
    reason: readiness.ready ? undefined : `Unmet: ${readiness.checks.filter((c) => !c.met).map((c) => c.label).join(', ')}.` });
  add('programme.edit', { key: 'reopen', label: 'Reopen for revision (requires reapproval)', enabled: ['APPROVED', 'CONFIRMED'].includes(prog.status),
    reason: stateReason(['APPROVED', 'CONFIRMED'].includes(prog.status), 'Only APPROVED or CONFIRMED programmes can be reopened.') });
  add('programme.cancel', { key: 'cancel', label: 'Cancel programme', enabled: !['CANCELLED', 'REJECTED'].includes(prog.status),
    reason: stateReason(!['CANCELLED', 'REJECTED'].includes(prog.status), `Programme is ${prog.status}.`) });
  if (request?.status === 'IN_REVIEW' && can(p, 'programme.submit', { programmeId: id }))
    actions.push({ key: 'withdraw', label: 'Withdraw submission', enabled: true });
  if (request?.awaitingMe) actions.push({ key: 'decide', label: 'Record approval decision', enabled: true });

  const next = nextAction(prog, validation, readiness, request, facility);
  return { programme: { ...prog, owner_name: owner }, institutions, sessions: sessions.map((s) => ({
      ...s, resources: sres.filter((r) => r.session_id === s.id), trainers: strs.filter((t) => t.session_id === s.id) })),
    request, facilityRequests: facility, reservations, validation, readiness, actions, nextAction: next,
    history: canAnywhere(p, 'audit.view') || can(p, 'programme.edit', { programmeId: id }) ? await programmeHistory(db, id) : null };
}

function nextAction(prog: any, v: any, rd: any, req: any, fr: any[]) {
  switch (prog.status) {
    case 'DRAFT': case 'RETURNED':
      if (v.errors.length) return { owner: 'Programme Administrator', action: `Resolve ${v.errors.length} validation error(s)` };
      return { owner: 'Programme Administrator', action: prog.status === 'RETURNED' ? 'Revise and resubmit' : 'Submit for approval' };
    case 'IN_APPROVAL': return { owner: req?.steps?.filter((s: any) => s.state === 'OPEN').flatMap((s: any) => s.approvers).join(', ') || 'Approvers', action: 'Record approval decision' };
    case 'APPROVED': {
      const unmet = rd.checks.filter((c: any) => !c.met);
      if (!unmet.length) return { owner: 'Programme Administrator', action: 'Confirm final booking' };
      return { owner: unmet[0].resolver ?? 'Programme Administrator', action: `${unmet[0].label}: ${unmet[0].detail}` };
    }
    case 'CONFIRMED': return { owner: '—', action: 'Delivery (attendance & evidence arrive in slice 3)' };
    default: return { owner: '—', action: `No further action (${prog.status})` };
  }
}

export async function searchAudit(db: pg.Pool, ctx: Ctx, f: Record<string, string | undefined>) {
  if (!canAnywhere(ctx.principal, 'audit.view')) throw forbidden();
  const params: unknown[] = []; const where: string[] = [];
  for (const [k, col] of [['action', 'action'], ['outcome', 'outcome'], ['entityType', 'entity_type'], ['entityId', 'entity_id'], ['correlationId', 'correlation_id']] as const)
    if (f[k]) { params.push(f[k]); where.push(`${col} = $${params.length}`); }
  if (f.actor) { params.push(`%${f.actor}%`); where.push(`actor_label ILIKE $${params.length}`); }
  const limit = Math.min(Number(f.limit ?? 100) || 100, 500);
  return (await db.query(`SELECT * FROM audit_events ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC LIMIT ${limit}`, params)).rows;
}

/** KPIs: every value carries its definition, period and filters; unavailable data is null with a reason (never a fake zero). */
export async function dashboard(db: pg.Pool, ctx: Ctx, includeSimulation: boolean) {
  if (!canAnywhere(ctx.principal, 'dashboard.view')) throw forbidden();
  const sim = includeSimulation ? '' : 'AND NOT p.is_simulation';
  const filters = includeSimulation ? 'Operational + simulation records' : 'Operational records only (simulation excluded)';
  const one = async (sql: string, params: unknown[] = []) => Number((await db.query(sql, params)).rows[0].n);
  const by = (await db.query(`SELECT status, count(*)::int AS n FROM programmes p WHERE true ${sim} GROUP BY status`)).rows;
  const status = Object.fromEntries(by.map((r) => [r.status, r.n]));
  const kpi = (key: string, label: string, value: number | null, definition: string, period: string, drill?: string, unavailableReason?: string) =>
    ({ key, label, value, definition, period, filters, drill, unavailableReason });
  const myQueue = (await import('./approvals.ts')).listRequests;
  const awaiting = can(ctx.principal, 'request.approve') ? (await myQueue(db, ctx, { scope: 'awaiting-me' })).filter((r) => includeSimulation || !r.isSimulation).length : null;
  return {
    generatedAt: new Date().toISOString(),
    includeSimulation,
    kpis: [
      kpi('active', 'Active programmes', (status.IN_APPROVAL ?? 0) + (status.APPROVED ?? 0) + (status.CONFIRMED ?? 0),
        'Programmes in IN_APPROVAL, APPROVED or CONFIRMED status.', 'Current state', '#/programmes'),
      kpi('in_approval', 'Awaiting approval', status.IN_APPROVAL ?? 0, 'Programmes with an open training request (IN_REVIEW).', 'Current state', '#/approvals'),
      kpi('awaiting_me', 'Awaiting my decision', awaiting, 'Requests where you are a named approver of an open step and have not decided.', 'Current state', '#/approvals',
        awaiting === null ? 'You do not hold approval authority.' : undefined),
      kpi('facility_pending', 'SRM confirmations outstanding',
        await one(`SELECT count(*) AS n FROM facility_requests fr JOIN programmes p ON p.id=fr.programme_id WHERE fr.status IN ('PENDING','ALTERNATIVE_PROPOSED') ${sim}`),
        'Facility requests PENDING an SRM response or awaiting acceptance of an SRM alternative.', 'Current state', '#/srm'),
      kpi('tentative', 'Tentative holds (next 30 days)',
        await one(`SELECT count(*) AS n FROM reservations rv JOIN programmes p ON p.id=rv.programme_id WHERE rv.status='TENTATIVE' AND rv.period && tstzrange(now(), now()+interval '30 days') ${sim}`),
        'Tentative reservations created by facility requests; they do not block other programmes.', 'Next 30 days', '#/calendar'),
      kpi('confirmed', 'Confirmed reservations (next 30 days)',
        await one(`SELECT count(*) AS n FROM reservations rv JOIN programmes p ON p.id=rv.programme_id WHERE rv.status='CONFIRMED' AND rv.period && tstzrange(now(), now()+interval '30 days') ${sim}`),
        'Resource reservations confirmed through the final-booking transaction.', 'Next 30 days', '#/calendar'),
      kpi('trainer_pending', 'Trainer invitations awaiting response',
        await one(`SELECT count(*) AS n FROM session_trainers st JOIN sessions s ON s.id=st.session_id JOIN programmes p ON p.id=s.programme_id WHERE st.status='INVITED' AND p.status NOT IN ('CANCELLED','REJECTED') ${sim}`),
        'Trainer assignments in INVITED status on live programmes.', 'Current state', '#/trainers'),
      kpi('blocked_7d', 'Blocked or denied actions (7 days)',
        canAnywhere(ctx.principal, 'audit.view') ? await one(`SELECT count(*) AS n FROM audit_events WHERE outcome IN ('BLOCKED','DENIED') AND occurred_at > now()-interval '7 days'`) : null,
        'Audit events with outcome BLOCKED or DENIED — indicates missing policy, permissions or unmet preconditions.', 'Last 7 days', '#/admin',
        canAnywhere(ctx.principal, 'audit.view') ? undefined : 'Requires audit access.'),
    ],
    csr: [
      kpi('unique_participants', 'Unique students & teachers trained', null, 'Distinct verified participants with recorded attendance.', '—', undefined, 'Not available: participant registry and attendance are delivered in slices 2–3.'),
      kpi('training_hours', 'Delivered training hours', null, 'Sum of verified delivered session hours.', '—', undefined, 'Not available: delivery evidence is delivered in slice 3.'),
      kpi('participant_hours', 'Participant-hours', null, 'Σ(attended participants × verified session hours).', '—', undefined, 'Not available: requires verified attendance.'),
      kpi('institutions_served', 'Institutions served', null, 'Distinct institutions with at least one verified attendee.', '—', undefined, 'Not available: requires verified attendance.'),
    ],
    policyCoverage: (await db.query(`SELECT policy_key, provenance FROM policies WHERE status='ACTIVE'`)).rows,
  };
}
