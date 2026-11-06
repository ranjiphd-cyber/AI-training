import { after, before, beforeEach } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { loadConfig } from '../src/config.ts';
import { createPool } from '../src/db.ts';
import { migrate } from '../src/migrate.ts';
import { buildServer } from '../src/server.ts';
import { resetDatabase, seedBase, ist, type SeedIds } from '../src/seed.ts';

export const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgres://vtc:vtc_dev_only@127.0.0.1:5432/vtc_test';
export { ist };

export interface H { app: FastifyInstance; db: ReturnType<typeof createPool>; ids: SeedIds }

export function harness(): H {
  const h = {} as H;
  before(async () => {
    await migrate(TEST_DB, () => {});
    h.db = createPool(TEST_DB);
    h.app = await buildServer(loadConfig({ APP_ENV: 'test', AUTH_MODE: 'demo', DATABASE_URL: TEST_DB }), h.db);
  });
  beforeEach(async () => { await resetDatabase(h.db); h.ids = await seedBase(h.db); });
  after(async () => { await h.app.close(); await h.db.end(); });
  return h;
}

export interface Session { cookie: string; csrf: string }
const sessions = new Map<string, Session>();

export async function login(h: H, userKey: string): Promise<Session> {
  const r = await h.app.inject({ method: 'POST', url: '/api/v1/auth/demo-login', payload: { userKey } });
  if (r.statusCode !== 200) throw new Error(`login ${userKey} failed: ${r.body}`);
  const c = (r.headers['set-cookie'] as string).split(';')[0];
  return { cookie: c, csrf: r.json().csrfToken };
}

export async function api(h: H, who: string, method: string, url: string, payload?: unknown, extraHeaders: Record<string, string> = {}) {
  const s = await login(h, who);
  const r = await h.app.inject({ method: method as any, url, payload: payload as any,
    headers: { cookie: s.cookie, 'x-csrf-token': s.csrf, ...extraHeaders } });
  let body: any; try { body = r.json(); } catch { body = r.body; }
  return { status: r.statusCode, body };
}

/** Creates a programme with one session via the API. */
export async function makeProgramme(h: H, opts: { sim?: boolean; title?: string; start?: string; end?: string; resource?: string; onsite?: number; units?: number; mode?: string } = {}) {
  const p = await api(h, 'prog.admin', 'POST', '/api/v1/programmes', {
    title: opts.title ?? 'Test programme', technicalDomain: 'EV', deliveryMode: opts.mode ?? 'ONSITE', isSimulation: opts.sim ?? true,
    institutionIds: [h.ids.institutions.SRM] });
  if (p.status !== 201) throw new Error(JSON.stringify(p.body));
  const s = await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.body.id}/sessions`, {
    title: 'S1', startsAt: opts.start ?? ist(7, 10), endsAt: opts.end ?? ist(7, 12), deliveryMode: opts.mode ?? 'ONSITE',
    expectedOnsite: opts.onsite ?? 10, resources: [{ resourceId: opts.resource ?? h.ids.resources.lab, units: opts.units }] });
  if (s.status !== 201) throw new Error(JSON.stringify(s.body));
  return { id: p.body.id as string, sessionId: s.body.id as string };
}

/** Drives a simulation programme to APPROVED with SRM confirmation and an accepted trainer. */
export async function readyForBooking(h: H, opts: Parameters<typeof makeProgramme>[1] & { trainer?: 'A' | 'B' } = {}) {
  const p = await makeProgramme(h, opts);
  const t = opts.trainer ?? 'A';
  const a = await api(h, 'prog.admin', 'POST', `/api/v1/sessions/${p.sessionId}/trainers`, { trainerId: h.ids.trainers[t] });
  await api(h, t === 'A' ? 'trainer.a' : 'trainer.b', 'POST', `/api/v1/assignments/${a.body.id}/respond`, { action: 'ACCEPT' });
  await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/facility-requests`);
  const frs = (await h.db.query(`SELECT id FROM facility_requests WHERE programme_id=$1 AND status='PENDING'`, [p.id])).rows;
  for (const f of frs) {
    const r = await api(h, 'srm.spoc', 'POST', `/api/v1/facility-requests/${f.id}/respond`, { action: 'CONFIRM' });
    if (r.status !== 200) throw new Error(JSON.stringify(r.body));
  }
  const sub = await api(h, 'prog.admin', 'POST', `/api/v1/programmes/${p.id}/submit`);
  if (sub.status !== 200) throw new Error(JSON.stringify(sub.body));
  const d = await api(h, 'gv.rao', 'POST', `/api/v1/requests/${sub.body.id}/decisions`, { decision: 'APPROVE' });
  if (d.status !== 200) throw new Error(JSON.stringify(d.body));
  return { ...p, requestId: sub.body.id as string };
}

export async function auditFor(h: H, action: string, outcome?: string) {
  return (await h.db.query(`SELECT * FROM audit_events WHERE action=$1 ${outcome ? 'AND outcome=$2' : ''} ORDER BY id`, outcome ? [action, outcome] : [action])).rows;
}
