import type pg from 'pg';
import type { Ctx } from '../context.ts';
import { block } from '../context.ts';
import { audit } from '../audit.ts';
import { withTx } from '../db.ts';
import { AppError, badRequest, forbidden, notFound } from '../errors.ts';
import { can, canAnywhere } from '../permissions.ts';

type Q = pg.Pool | pg.PoolClient;

export interface ApprovalStep { name: string; approver_user_ids: string[]; required_approvals: number }
export interface ApprovalDefinition { mode: 'SEQUENTIAL' | 'PARALLEL'; allow_self_approval: boolean; steps: ApprovalStep[] }
export interface BookingDefinition {
  require_trainer_acceptance: boolean;
  minimum_accepted_trainers_per_session: number;
  buffer_minutes: number;
}

export const POLICY_KEYS = ['APPROVAL:TRAINING_REQUEST', 'APPROVAL:CENTRE_ACCESS', 'BOOKING'] as const;
export type PolicyKey = (typeof POLICY_KEYS)[number];

export const POLICY_DECISIONS: Record<PolicyKey, { decision: string; owner: string }> = {
  'APPROVAL:TRAINING_REQUEST': { decision: 'D-01 Training-request approval routing', owner: 'G. V. Rao and Ranjith T. P.' },
  'APPROVAL:CENTRE_ACCESS': { decision: 'D-01 Centre-access approval routing', owner: 'G. V. Rao and Ranjith T. P.' },
  BOOKING: { decision: 'D-09 Booking readiness rules (trainer readiness, buffers)', owner: 'Programme owner with SRM Centre SPOC' },
};

export interface PolicyRow {
  id: string; policy_key: PolicyKey; provenance: 'AUTHORISED' | 'SIMULATION'; version: number; status: string;
  title: string; definition: any; authorisation_reference: string | null;
}

export function validateDefinition(key: string, def: any): string[] {
  const errs: string[] = [];
  if (!def || typeof def !== 'object') return ['definition must be an object'];
  if (key.startsWith('APPROVAL:')) {
    if (!['SEQUENTIAL', 'PARALLEL'].includes(def.mode)) errs.push('mode must be SEQUENTIAL or PARALLEL');
    if (typeof def.allow_self_approval !== 'boolean') errs.push('allow_self_approval must be boolean');
    if (!Array.isArray(def.steps) || def.steps.length === 0) errs.push('at least one step is required');
    else def.steps.forEach((s: any, i: number) => {
      if (!s?.name) errs.push(`step ${i + 1}: name required`);
      if (!Array.isArray(s?.approver_user_ids) || s.approver_user_ids.length === 0) errs.push(`step ${i + 1}: approvers required`);
      if (!Number.isInteger(s?.required_approvals) || s.required_approvals < 1) errs.push(`step ${i + 1}: required_approvals must be >= 1`);
      else if (Array.isArray(s?.approver_user_ids) && s.required_approvals > new Set(s.approver_user_ids).size)
        errs.push(`step ${i + 1}: required_approvals exceeds number of distinct approvers`);
    });
  } else if (key === 'BOOKING') {
    if (typeof def.require_trainer_acceptance !== 'boolean') errs.push('require_trainer_acceptance must be boolean');
    if (!Number.isInteger(def.minimum_accepted_trainers_per_session) || def.minimum_accepted_trainers_per_session < 0)
      errs.push('minimum_accepted_trainers_per_session must be an integer >= 0');
    if (!Number.isInteger(def.buffer_minutes) || def.buffer_minutes < 0 || def.buffer_minutes > 240)
      errs.push('buffer_minutes must be an integer 0–240');
  } else errs.push(`unknown policy key ${key}`);
  return errs;
}

/**
 * Resolves the single ACTIVE policy for the key. Simulation subjects may only use SIMULATION policies and
 * operational subjects may only use AUTHORISED policies — an example policy can never govern real records.
 * Returns null when none is configured or the stored definition is invalid (callers must fail closed).
 */
export async function resolvePolicy(q: Q, key: PolicyKey, isSimulation: boolean): Promise<PolicyRow | null> {
  const r = await q.query(
    `SELECT * FROM policies WHERE policy_key = $1 AND provenance = $2 AND status = 'ACTIVE'`,
    [key, isSimulation ? 'SIMULATION' : 'AUTHORISED']);
  if (!r.rowCount) return null;
  const row = r.rows[0] as PolicyRow;
  return validateDefinition(key, row.definition).length ? null : row;
}

export function policyMissingError(key: PolicyKey, isSimulation: boolean): AppError {
  const d = POLICY_DECISIONS[key];
  return new AppError(409, 'POLICY_NOT_CONFIGURED',
    `No ${isSimulation ? 'simulation' : 'authorised'} ${key} policy is active, so this action is blocked. ` +
      'The system never auto-approves or assumes routing.',
    { resolution: `Record decision ${d.decision}; a Technical Administrator drafts the policy and an authorised ` +
        'Volvo approver activates it with the decision reference.', resolver: d.owner });
}

export async function listPolicies(db: pg.Pool, ctx: Ctx) {
  if (!canAnywhere(ctx.principal, 'policy.view')) throw forbidden();
  const r = await db.query(
    `SELECT p.*, cu.display_name AS created_by_name, au.display_name AS activated_by_name
       FROM policies p LEFT JOIN users cu ON cu.id = p.created_by LEFT JOIN users au ON au.id = p.activated_by
      ORDER BY policy_key, provenance, version DESC`);
  const names = await db.query(`SELECT id, display_name FROM users`);
  const nameOf = Object.fromEntries(names.rows.map((u) => [u.id, u.display_name]));
  const configured = POLICY_KEYS.flatMap((k) => (['AUTHORISED', 'SIMULATION'] as const).map((prov) => ({
    policy_key: k, provenance: prov,
    active: r.rows.find((p) => p.policy_key === k && p.provenance === prov && p.status === 'ACTIVE')?.id ?? null,
    decision: POLICY_DECISIONS[k],
  })));
  return { policies: r.rows.map((p) => ({ ...p, approver_names: approverNames(p, nameOf) })), coverage: configured };
}

function approverNames(p: any, nameOf: Record<string, string>) {
  if (!p.policy_key.startsWith('APPROVAL:')) return null;
  return (p.definition.steps ?? []).map((s: any) => (s.approver_user_ids ?? []).map((id: string) => nameOf[id] ?? id));
}

export async function draftPolicy(db: pg.Pool, ctx: Ctx, input: { policyKey: string; provenance: string; title: string; definition: any }) {
  if (!can(ctx.principal, 'policy.draft')) throw forbidden('Only a Technical Administrator may draft policies.');
  if (!POLICY_KEYS.includes(input.policyKey as PolicyKey)) throw badRequest('Unknown policy key.');
  if (!['AUTHORISED', 'SIMULATION'].includes(input.provenance)) throw badRequest('provenance must be AUTHORISED or SIMULATION');
  if (!input.title?.trim()) throw badRequest('title is required');
  const errs = validateDefinition(input.policyKey, input.definition);
  if (errs.length) throw badRequest('Policy definition is invalid.', errs);
  return withTx(db, async (tx) => {
    const v = await tx.query(`SELECT coalesce(max(version),0)+1 AS v FROM policies WHERE policy_key=$1 AND provenance=$2`,
      [input.policyKey, input.provenance]);
    const r = await tx.query(
      `INSERT INTO policies (policy_key, provenance, version, status, title, definition, created_by)
       VALUES ($1,$2,$3,'DRAFT',$4,$5,$6) RETURNING *`,
      [input.policyKey, input.provenance, v.rows[0].v, input.title.trim(), JSON.stringify(input.definition), ctx.principal.id]);
    await audit(tx, ctx, { scope: 'system', action: 'policy.draft', entityType: 'policy', entityId: r.rows[0].id,
      entityVersion: r.rows[0].version, outcome: 'SUCCESS', change: { policyKey: input.policyKey, provenance: input.provenance } });
    return r.rows[0];
  });
}

export async function activatePolicy(db: pg.Pool, ctx: Ctx, policyId: string, authorisationReference?: string) {
  return withTx(db, async (tx) => {
    const r = await tx.query(`SELECT * FROM policies WHERE id = $1 FOR UPDATE`, [policyId]);
    if (!r.rowCount) throw notFound('Policy');
    const pol = r.rows[0];
    const ev = { scope: 'system', action: 'policy.activate', entityType: 'policy', entityId: pol.id, entityVersion: pol.version };
    if (pol.status !== 'DRAFT') await block(ctx, ev, new AppError(409, 'INVALID_STATE', 'Only DRAFT policies can be activated.'));
    if (pol.provenance === 'AUTHORISED') {
      if (!can(ctx.principal, 'policy.activate_authorised'))
        await block(ctx, { ...ev, outcome: 'DENIED' }, forbidden('Only an authorised Volvo approver may activate an AUTHORISED policy.'));
      if (!authorisationReference?.trim())
        await block(ctx, ev, badRequest('An authorisation reference (decision record) is required to activate an AUTHORISED policy.'));
      if (pol.created_by === ctx.principal.id)
        await block(ctx, ev, new AppError(409, 'FOUR_EYES_REQUIRED', 'The person who drafted an AUTHORISED policy cannot also activate it.'));
    } else if (!can(ctx.principal, 'policy.activate_simulation')) {
      await block(ctx, { ...ev, outcome: 'DENIED' }, forbidden());
    }
    if (pol.policy_key.startsWith('APPROVAL:')) {
      const ids = [...new Set(pol.definition.steps.flatMap((s: any) => s.approver_user_ids))];
      const ok = await tx.query(
        `SELECT DISTINCT ra.user_id FROM role_assignments ra JOIN users u ON u.id = ra.user_id
          WHERE ra.user_id = ANY($1::uuid[]) AND ra.role = 'VOLVO_APPROVER' AND ra.revoked_at IS NULL AND u.status='ACTIVE'`, [ids]);
      if (ok.rowCount !== ids.length)
        await block(ctx, ev, badRequest('Every named approver must currently hold the VOLVO_APPROVER role.'));
    }
    const prev = await tx.query(
      `UPDATE policies SET status='RETIRED', retired_at=now()
        WHERE policy_key=$1 AND provenance=$2 AND status='ACTIVE' RETURNING id, version`, [pol.policy_key, pol.provenance]);
    const upd = await tx.query(
      `UPDATE policies SET status='ACTIVE', activated_by=$2, activated_at=now(),
              authorisation_reference=coalesce($3, authorisation_reference) WHERE id=$1 RETURNING *`,
      [pol.id, ctx.principal.id, authorisationReference?.trim() || null]);
    await audit(tx, ctx, { ...ev, outcome: 'SUCCESS', reason: authorisationReference ?? null,
      change: { retired: prev.rows, note: 'In-flight requests remain bound to the policy version they were submitted under.' } });
    return upd.rows[0];
  });
}
