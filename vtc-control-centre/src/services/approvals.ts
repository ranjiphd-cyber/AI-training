import type pg from 'pg';
import type { Ctx } from '../context.ts';
import { block } from '../context.ts';
import { audit } from '../audit.ts';
import { withTx, type Tx } from '../db.ts';
import { AppError, badRequest, forbidden, notFound } from '../errors.ts';
import { can, canAnywhere } from '../permissions.ts';
import { policyMissingError, resolvePolicy, type ApprovalDefinition, type PolicyKey } from './policies.ts';
import { validateProgramme } from './validation.ts';
import { assertVisible } from './programmes.ts';

type Q = pg.Pool | pg.PoolClient;

async function nextRef(tx: Tx, type: string) {
  const n = (await tx.query(`SELECT nextval('request_ref_seq') AS n`)).rows[0].n;
  return `${type === 'TRAINING_REQUEST' ? 'TR' : 'CA'}-${n}`;
}

/** Steps whose decisions are currently open, derived only from the bound policy version and recorded decisions. */
export function activeSteps(def: ApprovalDefinition, currentStep: number, decisions: { step_index: number; decision: string }[]) {
  const approvals = (i: number) => decisions.filter((d) => d.step_index === i && d.decision === 'APPROVE').length;
  const complete = def.steps.map((s, i) => approvals(i) >= s.required_approvals);
  if (def.mode === 'SEQUENTIAL') return { open: currentStep < def.steps.length ? [currentStep] : [], complete };
  return { open: def.steps.map((_, i) => i).filter((i) => !complete[i]), complete };
}

export async function submitProgramme(db: pg.Pool, ctx: Ctx, programmeId: string) {
  return withTx(db, async (tx) => {
    const r = await tx.query(`SELECT * FROM programmes WHERE id=$1 FOR UPDATE`, [programmeId]);
    if (!r.rowCount) throw notFound('Programme');
    const prog = r.rows[0];
    const ev = { scope: `programme:${prog.id}`, action: 'request.submit', entityType: 'programme', entityId: prog.id, entityVersion: prog.version };
    if (!can(ctx.principal, 'programme.submit', { programmeId }))
      await block(ctx, { ...ev, outcome: 'DENIED' }, forbidden('You may not submit this programme.', 'Programme Administrator'));
    if (!['DRAFT', 'RETURNED'].includes(prog.status))
      await block(ctx, ev, new AppError(409, 'INVALID_STATE', `Programme is ${prog.status}; only DRAFT or RETURNED programmes can be submitted.`));
    const v = await validateProgramme(tx, programmeId);
    if (v.errors.length)
      await block(ctx, ev, new AppError(409, 'VALIDATION_FAILED', `Submission blocked by ${v.errors.length} validation error(s).`,
        { resolution: 'Resolve the listed issues and submit again.', resolver: 'Programme Administrator', details: v.errors }));
    const key: PolicyKey = 'APPROVAL:TRAINING_REQUEST';
    const policy = await resolvePolicy(tx, key, prog.is_simulation);
    if (!policy) await block(ctx, ev, policyMissingError(key, prog.is_simulation));
    await tx.query(`UPDATE requests SET status='SUPERSEDED', closed_at=now() WHERE programme_id=$1 AND status='RETURNED'`, [programmeId]);
    const ref = await nextRef(tx, 'TRAINING_REQUEST');
    const req = (await tx.query(
      `INSERT INTO requests (reference, request_type, programme_id, subject_version, is_simulation, status, policy_id, submitted_by)
       VALUES ($1,'TRAINING_REQUEST',$2,$3,$4,'IN_REVIEW',$5,$6) RETURNING *`,
      [ref, programmeId, prog.version, prog.is_simulation, policy!.id, ctx.principal.id])).rows[0];
    await tx.query(`UPDATE programmes SET status='IN_APPROVAL', updated_at=now() WHERE id=$1`, [programmeId]);
    await audit(tx, ctx, { ...ev, outcome: 'SUCCESS',
      change: { request: ref, policyId: policy!.id, policyVersion: policy!.version, provenance: policy!.provenance, warnings: v.warnings.length } });
    return req;
  });
}

export async function createCentreAccessRequest(db: pg.Pool, ctx: Ctx, input: any) {
  const errs: string[] = [];
  if (!input?.visitorName?.trim()) errs.push('visitorName is required');
  if (!input?.organisation?.trim()) errs.push('organisation is required');
  if (!input?.purpose?.trim()) errs.push('purpose is required');
  const d = new Date(input?.visitDate);
  if (Number.isNaN(d.getTime())) errs.push('visitDate must be a valid date');
  if (errs.length) throw badRequest('Centre access request is incomplete.', errs);
  const isSim = !!input.isSimulation;
  return withTx(db, async (tx) => {
    const ev = { scope: 'centre', action: 'request.submit', entityType: 'centre_access_request', entityId: 'new' };
    if (!can(ctx.principal, 'centre_access.create')) await block(ctx, { ...ev, outcome: 'DENIED' }, forbidden());
    const key: PolicyKey = 'APPROVAL:CENTRE_ACCESS';
    const policy = await resolvePolicy(tx, key, isSim);
    if (!policy) await block(ctx, ev, policyMissingError(key, isSim));
    const ref = await nextRef(tx, 'CENTRE_ACCESS');
    const payload = { visitorName: input.visitorName.trim(), organisation: input.organisation.trim(), purpose: input.purpose.trim(), visitDate: d.toISOString().slice(0, 10) };
    const req = (await tx.query(
      `INSERT INTO requests (reference, request_type, subject_version, payload, is_simulation, status, policy_id, submitted_by)
       VALUES ($1,'CENTRE_ACCESS',1,$2,$3,'IN_REVIEW',$4,$5) RETURNING *`,
      [ref, JSON.stringify(payload), isSim, policy!.id, ctx.principal.id])).rows[0];
    await audit(tx, ctx, { ...ev, entityId: req.id, entityVersion: 1, outcome: 'SUCCESS',
      change: { request: ref, policyId: policy!.id, policyVersion: policy!.version, provenance: policy!.provenance } });
    return req;
  });
}

async function loadRequest(q: Q, id: string, lock = false) {
  const r = await q.query(`SELECT r.*, p.definition, p.version AS policy_version, p.provenance, p.title AS policy_title
                             FROM requests r JOIN policies p ON p.id = r.policy_id WHERE r.id=$1 ${lock ? 'FOR UPDATE OF r' : ''}`, [id]);
  if (!r.rowCount) throw notFound('Request');
  return r.rows[0];
}

export async function decide(db: pg.Pool, ctx: Ctx, requestId: string, decision: string, reason?: string) {
  if (!['APPROVE', 'REJECT', 'RETURN'].includes(decision)) throw badRequest('decision must be APPROVE, REJECT or RETURN');
  return withTx(db, async (tx) => {
    const req = await loadRequest(tx, requestId, true);
    const scope = req.programme_id ? `programme:${req.programme_id}` : 'centre';
    const ev = { scope, action: `request.${decision.toLowerCase()}`, entityType: 'request', entityId: req.id, entityVersion: req.subject_version };
    const def = req.definition as ApprovalDefinition;
    // Authority: the permission AND being named in an open step of the bound policy version AND (re-checked) role.
    if (!can(ctx.principal, 'request.approve', { programmeId: req.programme_id }))
      await block(ctx, { ...ev, outcome: 'DENIED' }, forbidden('You do not hold approval authority.', 'Authorised Volvo approver'));
    if (req.status !== 'IN_REVIEW')
      await block(ctx, ev, new AppError(409, 'INVALID_STATE', `Request is ${req.status}; decisions are only accepted while IN_REVIEW.`));
    if (!def.allow_self_approval && req.submitted_by === ctx.principal.id)
      await block(ctx, { ...ev, outcome: 'DENIED' }, forbidden('The submitter may not decide their own request under this policy.'));
    if (decision !== 'APPROVE' && !reason?.trim())
      await block(ctx, ev, badRequest('A reason is required to reject or return a request.'));
    if (req.programme_id) {
      const p = (await tx.query(`SELECT version, status FROM programmes WHERE id=$1 FOR UPDATE`, [req.programme_id])).rows[0];
      if (p.version !== req.subject_version || p.status !== 'IN_APPROVAL')
        await block(ctx, ev, new AppError(409, 'STALE_REQUEST', 'The programme changed after submission; this request no longer reflects it.',
          { resolution: 'The programme must be resubmitted.', resolver: 'Programme Administrator' }));
    }
    const decisions = (await tx.query(`SELECT step_index, decision, actor_user_id FROM approval_decisions WHERE request_id=$1`, [req.id])).rows;
    const { open } = activeSteps(def, req.current_step, decisions);
    const stepIndex = open.find((i) => def.steps[i].approver_user_ids.includes(ctx.principal.id)
      && !decisions.some((d) => d.step_index === i && d.actor_user_id === ctx.principal.id));
    if (stepIndex === undefined)
      await block(ctx, { ...ev, outcome: 'DENIED' }, forbidden(
        'You are not a named approver for any open step of the policy version bound to this request, or you have already decided.',
        `Approvers named in "${req.policy_title}" v${req.policy_version}`));
    const si = stepIndex as number;
    await tx.query(
      `INSERT INTO approval_decisions (request_id, step_index, actor_user_id, decision, reason, subject_version, policy_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`, [req.id, si, ctx.principal.id, decision, reason?.trim() || null, req.subject_version, req.policy_id]);

    let newStatus = 'IN_REVIEW'; let currentStep = req.current_step;
    if (decision === 'REJECT') newStatus = 'REJECTED';
    else if (decision === 'RETURN') newStatus = 'RETURNED';
    else {
      const after = [...decisions, { step_index: si, decision: 'APPROVE', actor_user_id: ctx.principal.id }];
      const { complete } = activeSteps(def, currentStep, after);
      if (def.mode === 'SEQUENTIAL') { while (currentStep < def.steps.length && complete[currentStep]) currentStep++; }
      if (complete.every(Boolean)) newStatus = 'APPROVED';
    }
    await tx.query(`UPDATE requests SET status=$2, current_step=$3, closed_at = CASE WHEN $2 <> 'IN_REVIEW' THEN now() END WHERE id=$1`,
      [req.id, newStatus, currentStep]);
    if (req.programme_id && newStatus !== 'IN_REVIEW')
      await tx.query(`UPDATE programmes SET status=$2, updated_at=now() WHERE id=$1`,
        [req.programme_id, newStatus === 'APPROVED' ? 'APPROVED' : newStatus === 'REJECTED' ? 'REJECTED' : 'RETURNED']);
    await audit(tx, ctx, { ...ev, outcome: 'SUCCESS', reason: reason ?? null,
      change: { step: def.steps[si].name, stepIndex: si, policyId: req.policy_id, policyVersion: req.policy_version, resultingStatus: newStatus } });
    return { status: newStatus, step: def.steps[si].name };
  });
}

export async function withdrawRequest(db: pg.Pool, ctx: Ctx, requestId: string, reason?: string) {
  return withTx(db, async (tx) => {
    const req = await loadRequest(tx, requestId, true);
    const ev = { scope: req.programme_id ? `programme:${req.programme_id}` : 'centre', action: 'request.withdraw', entityType: 'request', entityId: req.id, entityVersion: req.subject_version };
    const allowed = req.submitted_by === ctx.principal.id || (req.programme_id && can(ctx.principal, 'programme.submit', { programmeId: req.programme_id }));
    if (!allowed) await block(ctx, { ...ev, outcome: 'DENIED' }, forbidden());
    if (req.status !== 'IN_REVIEW') await block(ctx, ev, new AppError(409, 'INVALID_STATE', `Request is ${req.status}.`));
    await tx.query(`UPDATE requests SET status='WITHDRAWN', closed_at=now() WHERE id=$1`, [req.id]);
    if (req.programme_id) await tx.query(`UPDATE programmes SET status='DRAFT', updated_at=now() WHERE id=$1`, [req.programme_id]);
    await audit(tx, ctx, { ...ev, outcome: 'SUCCESS', reason: reason ?? null });
    return { status: 'WITHDRAWN' };
  });
}

async function nameMap(q: Q) {
  const r = await q.query(`SELECT id, display_name FROM users`);
  return Object.fromEntries(r.rows.map((u) => [u.id, u.display_name])) as Record<string, string>;
}

export async function describeRequest(q: Q, req: any, names: Record<string, string>, me?: string) {
  const def = req.definition as ApprovalDefinition;
  const decisions = (await q.query(
    `SELECT d.*, u.display_name AS actor_name FROM approval_decisions d JOIN users u ON u.id=d.actor_user_id
      WHERE request_id=$1 ORDER BY decided_at`, [req.id])).rows;
  const { open, complete } = activeSteps(def, req.current_step, decisions);
  return {
    id: req.id, reference: req.reference, requestType: req.request_type, status: req.status,
    programmeId: req.programme_id, subjectVersion: req.subject_version, payload: req.payload,
    isSimulation: req.is_simulation, submittedAt: req.submitted_at, submittedBy: names[req.submitted_by],
    policy: { id: req.policy_id, title: req.policy_title, version: req.policy_version, provenance: req.provenance, mode: def.mode },
    steps: def.steps.map((s, i) => ({
      name: s.name, requiredApprovals: s.required_approvals,
      approvers: s.approver_user_ids.map((id) => names[id] ?? 'Unknown user'),
      approvals: decisions.filter((d) => d.step_index === i && d.decision === 'APPROVE').length,
      state: req.status !== 'IN_REVIEW' ? (complete[i] ? 'COMPLETE' : 'CLOSED') : complete[i] ? 'COMPLETE' : open.includes(i) ? 'OPEN' : 'WAITING',
    })),
    decisions: decisions.map((d) => ({ actor: d.actor_name, decision: d.decision, reason: d.reason, step: def.steps[d.step_index]?.name, at: d.decided_at })),
    awaitingMe: !!me && req.status === 'IN_REVIEW' && open.some((i) => def.steps[i].approver_user_ids.includes(me)
      && !decisions.some((d) => d.step_index === i && d.actor_user_id === me)),
  };
}

export async function listRequests(db: pg.Pool, ctx: Ctx, f: { scope?: string }) {
  const viewAll = canAnywhere(ctx.principal, 'request.view');
  const mineOnly = !viewAll;
  const r = await db.query(
    `SELECT r.*, p.definition, p.version AS policy_version, p.provenance, p.title AS policy_title, pr.code AS programme_code, pr.title AS programme_title
       FROM requests r JOIN policies p ON p.id=r.policy_id LEFT JOIN programmes pr ON pr.id=r.programme_id
      ${mineOnly ? 'WHERE r.submitted_by = $1' : ''} ORDER BY r.submitted_at DESC LIMIT 200`, mineOnly ? [ctx.principal.id] : []);
  const names = await nameMap(db);
  const out = [];
  for (const row of r.rows) {
    const d = await describeRequest(db, row, names, ctx.principal.id);
    out.push({ ...d, programmeCode: row.programme_code, programmeTitle: row.programme_title });
  }
  return f.scope === 'awaiting-me' ? out.filter((x) => x.awaitingMe) : out;
}

export async function getRequest(db: pg.Pool, ctx: Ctx, id: string) {
  const row = await loadRequest(db, id);
  if (row.programme_id) await assertVisible(db, ctx.principal, row.programme_id);
  else if (!canAnywhere(ctx.principal, 'request.view') && row.submitted_by !== ctx.principal.id) throw notFound('Request');
  return describeRequest(db, row, await nameMap(db), ctx.principal.id);
}
