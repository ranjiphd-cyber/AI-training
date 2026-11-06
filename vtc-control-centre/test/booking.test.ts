import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { harness, api, makeProgramme, readyForBooking, auditFor, ist } from './helpers.ts';

const h = harness();

describe('Slice 1 journey and booking integrity', () => {
  it('end-to-end: draft → sessions → validate → submit → approve → SRM confirm → booking → audit', async () => {
    const p = await readyForBooking(h);
    const b = await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/booking`);
    assert.equal(b.status, 200, JSON.stringify(b.body));
    assert.equal(b.body.status, 'CONFIRMED');
    const d = await api(h, 'prog.admin', 'GET', `/api/v1/programmes/${p.id}`);
    assert.equal(d.body.programme.status, 'CONFIRMED');
    const actions = d.body.history.map((e: any) => e.action);
    for (const a of ['programme.create', 'session.create', 'facility.request', 'facility.confirm', 'request.submit', 'request.approve', 'booking.finalise'])
      assert.ok(actions.includes(a), `history contains ${a}`);
  });

  it('T04 double-booked laboratory: second programme cannot confirm overlapping exclusive lab', async () => {
    const a = await readyForBooking(h, { title: 'A' });
    assert.equal((await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${a.id}/booking`)).status, 200);
    // B overlaps A by one hour; SRM cannot confirm the facility now, so B cannot reach readiness.
    const b = await makeProgramme(h, { title: 'B', start: ist(7, 11), end: ist(7, 13) });
    await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${b.id}/facility-requests`);
    const fr = (await h.db.query(`SELECT id FROM facility_requests WHERE programme_id=$1`, [b.id])).rows[0];
    const c = await api(h, 'srm.spoc', 'POST', `/api/v1/facility-requests/${fr.id}/respond`, { action: 'CONFIRM' });
    assert.equal(c.status, 409); assert.equal(c.body.error.code, 'RESOURCE_UNAVAILABLE');
    const v = await api(h, 'prog.admin', 'GET', `/api/v1/programmes/${b.id}/validation`);
    assert.ok(v.body.errors.some((e: any) => e.code === 'RESOURCE_DOUBLE_BOOKED'));
    assert.equal((await auditFor(h, 'facility.confirm', 'BLOCKED')).length, 1);
  });

  it('T20 two concurrent final bookings for the same lab/time: exactly one confirmation', async () => {
    const a = await readyForBooking(h, { title: 'A', trainer: 'A' });
    const b = await readyForBooking(h, { title: 'B', trainer: 'B' });   // both confirmed by SRM before either booked
    const [ra, rb] = await Promise.all([
      api(h, 'prog.admin', 'POST', `/api/v1/programmes/${a.id}/booking`),
      api(h, 'prog.admin', 'POST', `/api/v1/programmes/${b.id}/booking`)]);
    const statuses = [ra.status, rb.status].sort();
    assert.deepEqual(statuses, [200, 409], JSON.stringify([ra.body, rb.body]));
    const n = (await h.db.query(`SELECT count(*)::int AS n FROM reservations WHERE status='CONFIRMED' AND resource_id=$1`, [h.ids.resources.lab])).rows[0].n;
    assert.equal(n, 1);
    const loser = ra.status === 409 ? ra : rb;
    assert.ok(['BOOKING_PRECONDITIONS_UNMET', 'BOOKING_CONFLICT'].includes(loser.body.error.code));
  });

  it('T05 room-capacity overflow blocks submission with an actionable error', async () => {
    const p = await makeProgramme(h, { onsite: 40 });   // lab capacity 24
    const s = await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/submit`);
    assert.equal(s.status, 409); assert.equal(s.body.error.code, 'VALIDATION_FAILED');
    assert.ok(s.body.error.details.some((d: any) => d.code === 'CAPACITY_EXCEEDED' && d.resolution));
    assert.equal((await auditFor(h, 'request.submit', 'BLOCKED')).length, 1);
  });

  it('shared-capacity resource: confirmed units are summed', async () => {
    const a = await readyForBooking(h, { title: 'A', resource: h.ids.resources.pool, units: 15, trainer: 'A' });
    assert.equal((await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${a.id}/booking`)).status, 200);
    const b = await makeProgramme(h, { title: 'B', resource: h.ids.resources.pool, units: 10 });
    const v = await api(h, 'prog.admin', 'GET', `/api/v1/programmes/${b.id}/validation`);
    assert.ok(v.body.errors.some((e: any) => e.code === 'SHARED_CAPACITY_EXCEEDED'));
  });

  it('T03 overlapping trainer assignments are rejected (within programme and against confirmed commitments)', async () => {
    const a = await readyForBooking(h, { title: 'A', trainer: 'A' });
    assert.equal((await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${a.id}/booking`)).status, 200);
    const b = await makeProgramme(h, { title: 'B', resource: h.ids.resources.lab2 });   // same time, different lab
    const as = await api(h, 'prog.admin', 'POST', `/api/v1/sessions/${b.sessionId}/trainers`, { trainerId: h.ids.trainers.A });
    const v = await api(h, 'prog.admin', 'GET', `/api/v1/programmes/${b.id}/validation`);
    assert.ok(v.body.errors.some((e: any) => e.code === 'TRAINER_DOUBLE_BOOKED'));
    const acc = await api(h, 'trainer.a', 'POST', `/api/v1/assignments/${as.body.id}/respond`, { action: 'ACCEPT' });
    assert.equal(acc.status, 409); assert.equal(acc.body.error.code, 'TRAINER_DOUBLE_BOOKED');
  });

  it('booking is blocked when trainer readiness (per simulation booking policy) is unmet', async () => {
    const p = await makeProgramme(h);
    await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/facility-requests`);
    const fr = (await h.db.query(`SELECT id FROM facility_requests WHERE programme_id=$1`, [p.id])).rows[0];
    await api(h, 'srm.spoc', 'POST', `/api/v1/facility-requests/${fr.id}/respond`, { action: 'CONFIRM' });
    const sub = await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/submit`);
    await api(h, 'gv.rao', 'POST', `/api/v1/requests/${sub.body.id}/decisions`, { decision: 'APPROVE' });
    const b = await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/booking`);
    assert.equal(b.status, 409); assert.equal(b.body.error.code, 'BOOKING_PRECONDITIONS_UNMET');
    assert.ok(b.body.error.details.some((c: any) => c.key === 'trainers'));
  });

  it('duplicate final-booking request is idempotent (no duplicate reservations)', async () => {
    const p = await readyForBooking(h);
    assert.equal((await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/booking`)).status, 200);
    const again = await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/booking`);
    assert.equal(again.status, 409); assert.equal(again.body.error.code, 'ALREADY_CONFIRMED');
    assert.equal((await h.db.query(`SELECT count(*)::int n FROM reservations WHERE programme_id=$1 AND status='CONFIRMED'`, [p.id])).rows[0].n, 1);
  });

  it('database exclusion constraint rejects overlapping confirmed reservations even if application checks are bypassed', async () => {
    const p = await makeProgramme(h);
    const ins = `INSERT INTO reservations (programme_id, session_id, resource_id, period, units, allocation_mode, status, created_by)
                 VALUES ($1,$2,$3,tstzrange($4,$5),1,'EXCLUSIVE','CONFIRMED',$6)`;
    await h.db.query(ins, [p.id, p.sessionId, h.ids.resources.lab, ist(7, 10), ist(7, 12), h.ids.users.admin]);
    await assert.rejects(h.db.query(ins, [p.id, p.sessionId, h.ids.resources.lab, ist(7, 11), ist(7, 13), h.ids.users.admin]), (e: any) => e.code === '23P01');
  });

  it('stale approval: reopening an approved programme supersedes approval and blocks booking until reapproved', async () => {
    const p = await readyForBooking(h);
    const r = await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/reopen`, { reason: 'Change of date' });
    assert.equal(r.status, 200);
    const b = await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/booking`);
    assert.equal(b.status, 409);
    assert.ok(b.body.error.details.some((c: any) => c.key === 'approval'));
    const req = (await h.db.query(`SELECT status FROM requests WHERE id=$1`, [p.requestId])).rows[0];
    assert.equal(req.status, 'SUPERSEDED');
  });
});
