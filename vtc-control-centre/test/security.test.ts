import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { harness, api, login, makeProgramme, auditFor, ist } from './helpers.ts';
import { loadConfig, StartupRefusedError } from '../src/config.ts';

const h = harness();

describe('Security invariants', () => {
  it('T28 demo authentication is refused at startup in production', () => {
    assert.throws(() => loadConfig({ APP_ENV: 'production', AUTH_MODE: 'demo', DATABASE_URL: 'x' }), StartupRefusedError);
    assert.throws(() => loadConfig({ APP_ENV: 'production', DATABASE_URL: 'x' }), StartupRefusedError);
    assert.throws(() => loadConfig({ APP_ENV: 'production', AUTH_MODE: 'oidc', DATABASE_URL: 'x' }), /D-06/);
  });

  it('T19 client-side role manipulation is ignored: headers, body and query cannot grant authority', async () => {
    const p = await makeProgramme(h);
    const sub = await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/submit`);
    const forged = await api(h, 'srm.spoc', 'POST', `/api/v1/requests/${sub.body.id}/decisions?role=VOLVO_APPROVER`,
      { decision: 'APPROVE', role: 'VOLVO_APPROVER', roles: ['VOLVO_APPROVER'], userId: h.ids.users.gvrao },
      { 'x-role': 'VOLVO_APPROVER', 'x-user-id': h.ids.users.gvrao });
    assert.equal(forged.status, 403);
    assert.equal((await h.db.query(`SELECT count(*)::int n FROM approval_decisions`)).rows[0].n, 0);
  });

  it('T18 cross-institution access: a SPOC scoped to another institution cannot act on SRM facilities', async () => {
    const u = (await h.db.query(`INSERT INTO users (user_key, display_name, organisation, institution_id, is_synthetic)
                                 VALUES ('partner.spoc','Partner SPOC (synthetic)','Partner',$1,true) RETURNING id`, [h.ids.institutions.PARTNER])).rows[0].id;
    await h.db.query(`INSERT INTO role_assignments (user_id, role, scope_type, scope_id) VALUES ($1,'SRM_CENTRE_SPOC','INSTITUTION',$2)`, [u, h.ids.institutions.PARTNER]);
    const p = await makeProgramme(h);
    await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/facility-requests`);
    const fr = (await h.db.query(`SELECT id FROM facility_requests WHERE programme_id=$1`, [p.id])).rows[0];
    const list = await api(h, 'partner.spoc', 'GET', '/api/v1/facility-requests');
    assert.equal(list.status, 200); assert.equal(list.body.length, 0);
    const r = await api(h, 'partner.spoc', 'POST', `/api/v1/facility-requests/${fr.id}/respond`, { action: 'CONFIRM' });
    assert.equal(r.status, 403);
    assert.equal((await api(h, 'partner.spoc', 'GET', `/api/v1/programmes/${p.id}`)).status, 404);
    assert.equal((await auditFor(h, 'facility.confirm', 'DENIED')).length, 1);
  });

  it('unauthenticated requests are rejected; mutating requests require a valid CSRF token', async () => {
    assert.equal((await h.app.inject({ method: 'GET', url: '/api/v1/programmes' })).statusCode, 401);
    const s = await login(h, 'prog.admin');
    const r = await h.app.inject({ method: 'POST', url: '/api/v1/programmes', headers: { cookie: s.cookie },
      payload: { title: 'x', technicalDomain: 'y', deliveryMode: 'ONSITE' } });
    assert.equal(r.statusCode, 403); assert.equal(r.json().error.code, 'CSRF_REJECTED');
  });

  it('non-synthetic identities cannot use demo login', async () => {
    await h.db.query(`INSERT INTO users (user_key, display_name, organisation, is_synthetic) VALUES ('real.person','Real','Org',false)`);
    const r = await h.app.inject({ method: 'POST', url: '/api/v1/auth/demo-login', payload: { userKey: 'real.person' } });
    assert.equal(r.statusCode, 401);
  });

  it('T25 audit persistence failure: the consequential action does not complete', async () => {
    const p = await makeProgramme(h);
    await h.db.query(`ALTER TABLE audit_events ADD CONSTRAINT test_fail_audit CHECK (false) NOT VALID`);
    try {
      const s = await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/submit`);
      assert.equal(s.status, 500);
      assert.match(s.body.error.message, /no changes were saved/);
      assert.equal((await h.db.query(`SELECT status FROM programmes WHERE id=$1`, [p.id])).rows[0].status, 'DRAFT');
      assert.equal((await h.db.query(`SELECT count(*)::int n FROM requests`)).rows[0].n, 0);
    } finally {
      await h.db.query(`ALTER TABLE audit_events DROP CONSTRAINT test_fail_audit`);
    }
  });

  it('audit events are append-only', async () => {
    await makeProgramme(h);
    await assert.rejects(h.db.query(`UPDATE audit_events SET reason='tampered'`), /append-only/);
    await assert.rejects(h.db.query(`DELETE FROM audit_events`), /append-only/);
  });

  it('trainers see only programmes they are assigned to, and only they can respond to their invitation', async () => {
    const p = await makeProgramme(h);
    const other = await makeProgramme(h, { title: 'Other', start: ist(8, 10), end: ist(8, 12) });
    const a = await api(h, 'prog.admin', 'POST', `/api/v1/sessions/${p.sessionId}/trainers`, { trainerId: h.ids.trainers.A });
    assert.equal((await api(h, 'trainer.a', 'GET', `/api/v1/programmes/${p.id}`)).status, 200);
    assert.equal((await api(h, 'trainer.a', 'GET', `/api/v1/programmes/${other.id}`)).status, 404);
    assert.equal((await api(h, 'trainer.b', 'POST', `/api/v1/assignments/${a.body.id}/respond`, { action: 'ACCEPT' })).status, 403);
  });

  it('security headers are set (CSP, nosniff, frame denial)', async () => {
    const r = await h.app.inject({ method: 'GET', url: '/api/v1/health' });
    assert.match(String(r.headers['content-security-policy']), /default-src 'self'/);
    assert.equal(r.headers['x-content-type-options'], 'nosniff');
    assert.equal(r.headers['x-frame-options'], 'DENY');
  });
});
