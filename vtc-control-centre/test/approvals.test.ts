import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { harness, api, makeProgramme, auditFor } from './helpers.ts';

const h = harness();

describe('Approval engine', () => {
  it('T08 missing approval configuration: operational submission is blocked, never auto-approved, and audited', async () => {
    const p = await makeProgramme(h, { sim: false });
    const s = await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/submit`);
    assert.equal(s.status, 409);
    assert.equal(s.body.error.code, 'POLICY_NOT_CONFIGURED');
    assert.match(s.body.error.resolution, /D-01/);
    assert.ok(s.body.error.resolver);
    const prog = (await h.db.query(`SELECT status FROM programmes WHERE id=$1`, [p.id])).rows[0];
    assert.equal(prog.status, 'DRAFT');
    assert.equal((await h.db.query(`SELECT count(*)::int n FROM requests`)).rows[0].n, 0);
    assert.equal((await auditFor(h, 'request.submit', 'BLOCKED')).length, 1);
  });

  it('simulation policies can never govern operational records (and vice versa)', async () => {
    const p = await makeProgramme(h, { sim: false });
    // A simulation policy exists for TRAINING_REQUEST, yet the operational programme stays blocked.
    assert.equal((await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/submit`)).body.error.code, 'POLICY_NOT_CONFIGURED');
  });

  it('T07 different request types use different, independently configured policies', async () => {
    const p = await makeProgramme(h);
    const tr = await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/submit`);
    const ca = await api(h, 'prog.admin', 'POST', '/api/v1/centre-access-requests',
      { visitorName: 'Synthetic Visitor', organisation: 'Synthetic Org', purpose: 'Lab visit', visitDate: '2027-01-15', isSimulation: true });
    assert.equal(tr.status, 200); assert.equal(ca.status, 201);
    assert.notEqual(tr.body.policy_id, ca.body.policy_id);
    // Training request (example policy): one approval suffices.
    assert.equal((await api(h, 'ranjith.tp', 'POST', `/api/v1/requests/${tr.body.id}/decisions`, { decision: 'APPROVE' })).body.status, 'APPROVED');
    // Centre access (example policy): parallel, both steps required.
    assert.equal((await api(h, 'ranjith.tp', 'POST', `/api/v1/requests/${ca.body.id}/decisions`, { decision: 'APPROVE' })).body.status, 'IN_REVIEW');
    assert.equal((await api(h, 'gv.rao', 'POST', `/api/v1/requests/${ca.body.id}/decisions`, { decision: 'APPROVE' })).body.status, 'APPROVED');
  });

  it('only named approvers in the bound policy version may decide; technical admin and others are denied', async () => {
    const p = await makeProgramme(h);
    const sub = await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/submit`);
    for (const who of ['tech.admin', 'prog.admin', 'srm.spoc', 'auditor', 'trainer.a']) {
      const d = await api(h, who, 'POST', `/api/v1/requests/${sub.body.id}/decisions`, { decision: 'APPROVE' });
      assert.equal(d.status, 403, `${who} must be denied`);
    }
    assert.equal((await auditFor(h, 'request.approve', 'DENIED')).length, 5);
    assert.equal((await h.db.query(`SELECT status FROM requests WHERE id=$1`, [sub.body.id])).rows[0].status, 'IN_REVIEW');
  });

  it('an approver cannot decide twice on the same step', async () => {
    const ca = await api(h, 'prog.admin', 'POST', '/api/v1/centre-access-requests',
      { visitorName: 'V', organisation: 'O', purpose: 'P', visitDate: '2027-01-15', isSimulation: true });
    assert.equal((await api(h, 'gv.rao', 'POST', `/api/v1/requests/${ca.body.id}/decisions`, { decision: 'APPROVE' })).status, 200);
    assert.equal((await api(h, 'gv.rao', 'POST', `/api/v1/requests/${ca.body.id}/decisions`, { decision: 'APPROVE' })).status, 403);
  });

  it('reject and return require reasons; return allows revision and resubmission bound to the new version', async () => {
    const p = await makeProgramme(h);
    const sub = await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/submit`);
    assert.equal((await api(h, 'gv.rao', 'POST', `/api/v1/requests/${sub.body.id}/decisions`, { decision: 'RETURN' })).status, 400);
    const ret = await api(h, 'gv.rao', 'POST', `/api/v1/requests/${sub.body.id}/decisions`, { decision: 'RETURN', reason: 'Clarify objectives' });
    assert.equal(ret.body.status, 'RETURNED');
    const upd = await api(h, 'prog.admin', 'PUT', `/api/v1/programmes/${p.id}`, { title: 'Revised', technicalDomain: 'EV', deliveryMode: 'ONSITE', learningObjectives: ['x'] });
    assert.equal(upd.status, 200);
    const re = await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/submit`);
    assert.equal(re.status, 200);
    assert.equal(re.body.subject_version, upd.body.version);
    assert.equal((await h.db.query(`SELECT status FROM requests WHERE id=$1`, [sub.body.id])).rows[0].status, 'SUPERSEDED');
  });

  it('edits are blocked while in approval (material change cannot slip past approvers)', async () => {
    const p = await makeProgramme(h);
    await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/submit`);
    const e = await api(h, 'prog.admin', 'PUT', `/api/v1/programmes/${p.id}`, { title: 'Sneaky', technicalDomain: 'EV', deliveryMode: 'ONSITE' });
    assert.equal(e.status, 409); assert.equal(e.body.error.code, 'NOT_EDITABLE');
  });

  it('policy activation: AUTHORISED policy needs approver authority, a decision reference and four-eyes', async () => {
    const def = { mode: 'SEQUENTIAL', allow_self_approval: false, steps: [{ name: 'Step', approver_user_ids: [h.ids.users.gvrao], required_approvals: 1 }] };
    const d = await api(h, 'tech.admin', 'POST', '/api/v1/policies', { policyKey: 'APPROVAL:TRAINING_REQUEST', provenance: 'AUTHORISED', title: 'Test', definition: def });
    assert.equal(d.status, 201);
    assert.equal((await api(h, 'tech.admin', 'POST', `/api/v1/policies/${d.body.id}/activate`, { authorisationReference: 'X' })).status, 403);
    assert.equal((await api(h, 'gv.rao', 'POST', `/api/v1/policies/${d.body.id}/activate`, {})).status, 400);
    const ok = await api(h, 'gv.rao', 'POST', `/api/v1/policies/${d.body.id}/activate`, { authorisationReference: 'DEC-TEST-001' });
    assert.equal(ok.status, 200);
    // Operational submission now routes under the AUTHORISED policy.
    const p = await makeProgramme(h, { sim: false });
    const s = await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/submit`);
    assert.equal(s.status, 200); assert.equal(s.body.policy_id, d.body.id);
  });

  it('policy referencing a non-approver cannot be activated (admin cannot route approvals to themselves)', async () => {
    const def = { mode: 'SEQUENTIAL', allow_self_approval: true, steps: [{ name: 'Step', approver_user_ids: [h.ids.users.tech], required_approvals: 1 }] };
    const d = await api(h, 'tech.admin', 'POST', '/api/v1/policies', { policyKey: 'APPROVAL:TRAINING_REQUEST', provenance: 'SIMULATION', title: 'Bad', definition: def });
    const a = await api(h, 'tech.admin', 'POST', `/api/v1/policies/${d.body.id}/activate`);
    assert.equal(a.status, 400);
  });
});
