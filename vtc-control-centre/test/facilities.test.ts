import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { harness, api, makeProgramme, ist } from './helpers.ts';

const h = harness();
const frOf = async (pid: string, status = 'PENDING') =>
  (await h.db.query(`SELECT * FROM facility_requests WHERE programme_id=$1 AND status=$2`, [pid, status])).rows;

describe('SRM facility confirmation', () => {
  it('facility requests are idempotent and create tentative (non-blocking) holds', async () => {
    const p = await makeProgramme(h);
    const a = await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/facility-requests`);
    const b = await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/facility-requests`);
    assert.equal(a.body.created, 1); assert.equal(b.body.created, 0);
    assert.equal((await h.db.query(`SELECT count(*)::int n FROM reservations WHERE programme_id=$1 AND status='TENTATIVE'`, [p.id])).rows[0].n, 1);
  });

  it('T09 SRM declining: reason required, tentative hold released, booking readiness unmet', async () => {
    const p = await makeProgramme(h);
    await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/facility-requests`);
    const [fr] = await frOf(p.id);
    assert.equal((await api(h, 'srm.spoc', 'POST', `/api/v1/facility-requests/${fr.id}/respond`, { action: 'DECLINE' })).status, 400);
    const d = await api(h, 'srm.spoc', 'POST', `/api/v1/facility-requests/${fr.id}/respond`, { action: 'DECLINE', note: 'Lab maintenance' });
    assert.equal(d.status, 200); assert.equal(d.body.status, 'DECLINED');
    assert.equal((await h.db.query(`SELECT count(*)::int n FROM reservations WHERE programme_id=$1 AND status='TENTATIVE'`, [p.id])).rows[0].n, 0);
    const det = await api(h, 'prog.admin', 'GET', `/api/v1/programmes/${p.id}`);
    assert.equal(det.body.readiness.checks.find((c: any) => c.key === 'facility').met, false);
  });

  it('T10 alternative proposal: accept → session updated → new pending request → SRM confirms', async () => {
    const p = await makeProgramme(h);
    await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/facility-requests`);
    const [fr] = await frOf(p.id);
    const pr = await api(h, 'srm.spoc', 'POST', `/api/v1/facility-requests/${fr.id}/respond`,
      { action: 'PROPOSE_ALTERNATIVE', note: 'Lab 2 is free', altResourceId: h.ids.resources.lab2, altStartsAt: ist(7, 14), altEndsAt: ist(7, 16) });
    assert.equal(pr.status, 200, JSON.stringify(pr.body));
    const acc = await api(h, 'prog.admin', 'POST', `/api/v1/facility-requests/${fr.id}/accept-alternative`, {});
    assert.equal(acc.status, 200, JSON.stringify(acc.body));
    const sess = (await h.db.query(`SELECT * FROM sessions WHERE id=$1`, [p.sessionId])).rows[0];
    assert.equal(sess.starts_at.toISOString(), ist(7, 14));
    const sr = (await h.db.query(`SELECT resource_id FROM session_resources WHERE session_id=$1`, [p.sessionId])).rows;
    assert.deepEqual(sr.map((x) => x.resource_id), [h.ids.resources.lab2]);
    const [n] = await frOf(p.id);
    assert.equal(n.origin, 'ALTERNATIVE');
    assert.equal((await api(h, 'srm.spoc', 'POST', `/api/v1/facility-requests/${n.id}/respond`, { action: 'CONFIRM' })).status, 200);
  });

  it('accepting an alternative after submission requires explicit reapproval and supersedes the request', async () => {
    const p = await makeProgramme(h);
    await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/facility-requests`);
    const sub = await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/submit`);
    const [fr] = await frOf(p.id);
    await api(h, 'srm.spoc', 'POST', `/api/v1/facility-requests/${fr.id}/respond`, { action: 'PROPOSE_ALTERNATIVE', note: 'Use lab 2', altResourceId: h.ids.resources.lab2 });
    const no = await api(h, 'prog.admin', 'POST', `/api/v1/facility-requests/${fr.id}/accept-alternative`, {});
    assert.equal(no.status, 409); assert.equal(no.body.error.code, 'REAPPROVAL_REQUIRED');
    const yes = await api(h, 'prog.admin', 'POST', `/api/v1/facility-requests/${fr.id}/accept-alternative`, { confirmReapproval: true });
    assert.equal(yes.status, 200); assert.equal(yes.body.supersededApproval, true);
    assert.equal((await h.db.query(`SELECT status FROM requests WHERE id=$1`, [sub.body.id])).rows[0].status, 'SUPERSEDED');
  });

  it('editing a session supersedes its now-stale facility request', async () => {
    const p = await makeProgramme(h);
    await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/facility-requests`);
    const [fr] = await frOf(p.id);
    await api(h, 'srm.spoc', 'POST', `/api/v1/facility-requests/${fr.id}/respond`, { action: 'CONFIRM' });
    await api(h, 'prog.admin', 'PUT', `/api/v1/sessions/${p.sessionId}`, { title: 'S1', startsAt: ist(9, 10), endsAt: ist(9, 12), deliveryMode: 'ONSITE',
      expectedOnsite: 10, resources: [{ resourceId: h.ids.resources.lab }] });
    const det = await api(h, 'prog.admin', 'GET', `/api/v1/programmes/${p.id}`);
    assert.equal(det.body.readiness.checks.find((c: any) => c.key === 'facility').met, false, 'old confirmation no longer counts');
    const r = await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/facility-requests`);
    assert.deepEqual([r.body.created, r.body.superseded], [1, 1]);
  });

  it('T24 cancelled programme: pending invitations withdrawn, holds released, facility requests superseded', async () => {
    const p = await makeProgramme(h);
    await api(h, 'prog.admin', 'POST', `/api/v1/sessions/${p.sessionId}/trainers`, { trainerId: h.ids.trainers.A });
    await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/facility-requests`);
    assert.equal((await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/cancel`, {})).status, 400);
    const c = await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/cancel`, { reason: 'Exam schedule clash' });
    assert.equal(c.status, 200);
    assert.equal((await h.db.query(`SELECT status FROM session_trainers WHERE session_id=$1`, [p.sessionId])).rows[0].status, 'WITHDRAWN');
    assert.equal((await frOf(p.id, 'SUPERSEDED')).length, 1);
    assert.equal((await h.db.query(`SELECT count(*)::int n FROM reservations WHERE programme_id=$1 AND status<>'RELEASED'`, [p.id])).rows[0].n, 0);
  });

  it('dashboard shows unavailable CSR metrics as null with a reason, never as zero', async () => {
    const d = await api(h, 'gv.rao', 'GET', '/api/v1/dashboard');
    assert.equal(d.status, 200);
    for (const k of d.body.csr) { assert.equal(k.value, null); assert.ok(k.unavailableReason); assert.ok(k.definition); }
    for (const k of d.body.kpis) assert.ok(k.definition && k.period && k.filters);
  });
});
