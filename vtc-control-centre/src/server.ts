import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import fstatic from '@fastify/static';
import type pg from 'pg';
import type { AppConfig } from './config.ts';
import { AppError } from './errors.ts';
import { demoLogin, logout, resolveSession, safeEqual, SESSION_COOKIE } from './auth.ts';
import { makeCtx, type Ctx } from './context.ts';
import { PERMISSIONS, can, canAnywhere } from './permissions.ts';
import * as programmes from './services/programmes.ts';
import * as approvals from './services/approvals.ts';
import * as facilities from './services/facilities.ts';
import * as booking from './services/booking.ts';
import * as trainers from './services/trainers.ts';
import * as queries from './services/queries.ts';
import * as policies from './services/policies.ts';
import * as participants from './services/participants.ts';
import * as reports from './services/reports.ts';
import { participantTemplate, LIMITS } from './spreadsheet.ts';

declare module 'fastify' {
  interface FastifyRequest { ctx?: Ctx; csrf?: string }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PUBLIC = new Set(['/api/v1/health', '/api/v1/meta', '/api/v1/auth/demo-login']);
const here = path.dirname(fileURLToPath(import.meta.url));

export async function buildServer(cfg: AppConfig, db: pg.Pool) {
  const app = Fastify({
    logger: cfg.appEnv === 'test' ? false : { level: 'info', redact: ['req.headers.cookie', 'req.headers["x-csrf-token"]'] },
    bodyLimit: 256 * 1024,
    genReqId: (req) => {
      const h = req.headers['x-correlation-id'];
      return typeof h === 'string' && UUID.test(h) ? h : crypto.randomUUID();
    },
  });
  await app.register(cookie);
  await app.register(rateLimit, { max: cfg.appEnv === 'test' ? 10000 : 300, timeWindow: '1 minute' });

  app.addHook('onSend', async (req, reply, payload) => {
    reply.header('x-correlation-id', req.id);
    reply.header('content-security-policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    reply.header('x-content-type-options', 'nosniff');
    reply.header('referrer-policy', 'no-referrer');
    reply.header('x-frame-options', 'DENY');
    reply.header('permissions-policy', 'camera=(), microphone=(), geolocation=()');
    if (req.url.startsWith('/api/')) reply.header('cache-control', 'no-store');
    return payload;
  });

  // Authentication + CSRF. Roles are always loaded from the database; nothing the client sends can grant authority.
  app.addHook('preHandler', async (req: FastifyRequest) => {
    const url = req.url.split('?')[0];
    if (!url.startsWith('/api/') || PUBLIC.has(url)) return;
    const s = await resolveSession(db, req.cookies[SESSION_COOKIE]);
    if (!s) throw new AppError(401, 'UNAUTHENTICATED', 'Sign in required.');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const t = req.headers['x-csrf-token'];
      if (typeof t !== 'string' || !safeEqual(t, s.csrf)) throw new AppError(403, 'CSRF_REJECTED', 'Missing or invalid CSRF token.');
    }
    req.ctx = makeCtx(db, s.principal, req.id);
    req.csrf = s.csrf;
  });

  app.setErrorHandler((err: any, req, reply: FastifyReply) => {
    if (err instanceof AppError) {
      return reply.status(err.status).send({ error: { code: err.code, message: err.message, resolution: err.resolution,
        resolver: err.resolver, details: err.details, correlationId: req.id } });
    }
    if (err?.code === '22P02') return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Not found.', correlationId: req.id } });
    if (err?.statusCode === 429) return reply.status(429).send({ error: { code: 'RATE_LIMITED', message: 'Too many requests.', correlationId: req.id } });
    if (err?.validation || err?.statusCode === 400 || err?.statusCode === 415 || err?.statusCode === 413)
      return reply.status(err.statusCode ?? 400).send({ error: { code: 'BAD_REQUEST', message: err.message, correlationId: req.id } });
    req.log.error({ err }, 'unhandled error');
    return reply.status(500).send({ error: { code: 'INTERNAL_ERROR',
      message: 'The action did not complete and no changes were saved. Quote the correlation ID to support.', correlationId: req.id } });
  });

  const ctx = (req: FastifyRequest) => req.ctx!;
  const body = (req: FastifyRequest) => (req.body ?? {}) as any;
  const q = (req: FastifyRequest) => (req.query ?? {}) as Record<string, string | undefined>;
  const id = (req: FastifyRequest) => {
    const v = (req.params as any).id;
    if (!UUID.test(v)) throw new AppError(404, 'NOT_FOUND', 'Not found.');
    return v as string;
  };

  // ---------------------------------------------------------------- session & meta
  app.get('/api/v1/health', async () => {
    await db.query('SELECT 1');
    return { status: 'ok' };
  });
  app.get('/api/v1/meta', async () => {
    const demo = cfg.authMode === 'demo' && cfg.appEnv !== 'production';
    return {
      appEnv: cfg.appEnv, authMode: cfg.authMode, demoEnvironment: demo,
      notices: ['Synthetic demonstration data only.', 'No email or external messages are sent.', 'Simulation policies are illustrative examples, not company policy.'],
      demoIdentities: demo ? (await db.query(
        `SELECT u.user_key, u.display_name, u.organisation, array_agg(DISTINCT ra.role) AS roles FROM users u
           LEFT JOIN role_assignments ra ON ra.user_id=u.id AND ra.revoked_at IS NULL
          WHERE u.is_synthetic AND u.status='ACTIVE' GROUP BY u.id ORDER BY u.display_name`)).rows : [],
    };
  });
  app.post('/api/v1/auth/demo-login', { config: { rateLimit: { max: cfg.appEnv === 'test' ? 10000 : 20, timeWindow: '1 minute' } } }, async (req, reply) => {
    const s = await demoLogin(db, cfg, String(body(req).userKey ?? ''));
    reply.setCookie(SESSION_COOKIE, s.token, { httpOnly: true, sameSite: 'strict', secure: cfg.cookieSecure, path: '/', maxAge: cfg.sessionTtlMinutes * 60 });
    return { ok: true, csrfToken: s.csrf };
  });
  app.post('/api/v1/auth/logout', async (req, reply) => {
    await logout(db, req.cookies[SESSION_COOKIE]);
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  });
  app.get('/api/v1/me', async (req) => {
    const p = ctx(req).principal;
    return { user: { id: p.id, displayName: p.displayName, organisation: p.organisation, isSynthetic: p.isSynthetic, trainerId: p.trainerId },
      roles: p.assignments, permissions: PERMISSIONS.filter((x) => canAnywhere(p, x)), csrfToken: req.csrf,
      canSeeProgrammes: programmes.canSeeAnyProgramme(p) };
  });

  // ---------------------------------------------------------------- dashboard
  app.get('/api/v1/dashboard', async (req) => queries.dashboard(db, ctx(req), q(req).includeSimulation === 'true'));

  // ---------------------------------------------------------------- programmes & sessions
  app.get('/api/v1/programmes', async (req) => programmes.listProgrammes(db, ctx(req), q(req)));
  app.post('/api/v1/programmes', async (req, reply) => reply.status(201).send(await programmes.createProgramme(db, ctx(req), body(req))));
  app.get('/api/v1/programmes/:id', async (req) => queries.programmeDetail(db, ctx(req), id(req)));
  app.put('/api/v1/programmes/:id', async (req) => programmes.updateProgramme(db, ctx(req), id(req), body(req)));
  app.post('/api/v1/programmes/:id/sessions', async (req, reply) => reply.status(201).send(await programmes.addSession(db, ctx(req), id(req), body(req))));
  app.put('/api/v1/sessions/:id', async (req) => programmes.updateSession(db, ctx(req), id(req), body(req)));
  app.delete('/api/v1/sessions/:id', async (req) => programmes.deleteSession(db, ctx(req), id(req)));
  app.get('/api/v1/programmes/:id/validation', async (req) => {
    await programmes.assertVisible(db, ctx(req).principal, id(req));
    return (await import('./services/validation.ts')).validateProgramme(db, id(req));
  });
  app.post('/api/v1/programmes/:id/submit', async (req) => approvals.submitProgramme(db, ctx(req), id(req)));
  app.post('/api/v1/programmes/:id/facility-requests', async (req) => facilities.requestFacilities(db, ctx(req), id(req)));
  app.post('/api/v1/programmes/:id/booking', async (req) => booking.finaliseBooking(db, ctx(req), id(req)));
  app.post('/api/v1/programmes/:id/reopen', async (req) => programmes.reopenProgramme(db, ctx(req), id(req), body(req).reason));
  app.post('/api/v1/programmes/:id/cancel', async (req) => programmes.cancelProgramme(db, ctx(req), id(req), body(req).reason));

  // ---------------------------------------------------------------- approvals
  app.get('/api/v1/requests', async (req) => approvals.listRequests(db, ctx(req), q(req)));
  app.get('/api/v1/requests/:id', async (req) => approvals.getRequest(db, ctx(req), id(req)));
  app.post('/api/v1/requests/:id/decisions', async (req) => approvals.decide(db, ctx(req), id(req), body(req).decision, body(req).reason));
  app.post('/api/v1/requests/:id/withdraw', async (req) => approvals.withdrawRequest(db, ctx(req), id(req), body(req).reason));
  app.post('/api/v1/centre-access-requests', async (req, reply) => reply.status(201).send(await approvals.createCentreAccessRequest(db, ctx(req), body(req))));

  // ---------------------------------------------------------------- SRM facility operations
  app.get('/api/v1/facility-requests', async (req) => facilities.listFacilityRequests(db, ctx(req), q(req)));
  app.post('/api/v1/facility-requests/:id/respond', async (req) => facilities.respondFacility(db, ctx(req), id(req), body(req)));
  app.post('/api/v1/facility-requests/:id/accept-alternative', async (req) => facilities.acceptAlternative(db, ctx(req), id(req), body(req).confirmReapproval === true));

  // ---------------------------------------------------------------- resources & trainers
  app.get('/api/v1/resources', async (req) => queries.listResources(db, ctx(req)));
  app.get('/api/v1/reservations', async (req) => {
    const from = q(req).from ? new Date(q(req).from!) : new Date();
    const to = q(req).to ? new Date(q(req).to!) : new Date(Date.now() + 60 * 86400000);
    if (Number.isNaN(+from) || Number.isNaN(+to)) throw new AppError(400, 'VALIDATION_FAILED', 'from/to must be dates');
    return queries.listReservations(db, ctx(req), from, to);
  });
  app.get('/api/v1/institutions', async () => queries.listInstitutions(db));
  app.get('/api/v1/trainers', async (req) => trainers.listTrainers(db, ctx(req)));
  app.post('/api/v1/sessions/:id/trainers', async (req, reply) => reply.status(201).send(await trainers.assignTrainer(db, ctx(req), id(req), body(req).trainerId, body(req).role)));
  app.get('/api/v1/my/assignments', async (req) => trainers.myAssignments(db, ctx(req)));
  app.post('/api/v1/assignments/:id/respond', async (req) => trainers.respondAssignment(db, ctx(req), id(req), body(req).action, body(req).note));

  // ---------------------------------------------------------------- policy & audit administration
  app.get('/api/v1/policies', async (req) => policies.listPolicies(db, ctx(req)));
  app.post('/api/v1/policies', async (req, reply) => reply.status(201).send(await policies.draftPolicy(db, ctx(req), body(req))));
  app.post('/api/v1/policies/:id/activate', async (req) => policies.activatePolicy(db, ctx(req), id(req), body(req).authorisationReference));
  app.get('/api/v1/audit', async (req) => queries.searchAudit(db, ctx(req), q(req)));

  // ---------------------------------------------------------------- participants & spreadsheet import
  app.get('/api/v1/participants', async (req) => participants.listParticipants(db, ctx(req), q(req)));
  app.get('/api/v1/imports', async (req) => participants.listImports(db, ctx(req)));
  app.get('/api/v1/imports/templates/participants.xlsx', async (req, reply) => {
    if (!canAnywhere(ctx(req).principal, 'participant.upload')) throw new AppError(403, 'FORBIDDEN', 'You may not upload participants.');
    reply.header('content-disposition', 'attachment; filename="vtc-participants-template.xlsx"');
    return reply.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(await participantTemplate());
  });
  app.post('/api/v1/imports/participants', { bodyLimit: Math.ceil(LIMITS.maxBytes * 1.4) + 4096 },
    async (req, reply) => reply.status(201).send(await participants.previewImport(db, ctx(req), body(req))));
  app.get('/api/v1/imports/:id', async (req) => participants.getImport(db, ctx(req), id(req)));
  app.post('/api/v1/imports/:id/rows/:rowId/resolution', async (req) => {
    const rowId = (req.params as any).rowId; if (!UUID.test(rowId)) throw new AppError(404, 'NOT_FOUND', 'Not found.');
    return participants.resolveRow(db, ctx(req), id(req), rowId, body(req).resolution);
  });
  app.post('/api/v1/imports/:id/commit', async (req) => participants.commitImport(db, ctx(req), id(req)));
  app.post('/api/v1/imports/:id/discard', async (req) => participants.discardImport(db, ctx(req), id(req)));

  // ---------------------------------------------------------------- reports (downloads)
  app.get('/api/v1/reports', async (req) => reports.availableReports(ctx(req)));
  app.get('/api/v1/reports/:key', async (req, reply) => {
    const key = String((req.params as any).key);
    const out = await reports.exportReport(db, ctx(req), key, String(q(req).format ?? 'xlsx'));
    reply.header('content-disposition', `attachment; filename="${out.filename}"`);
    return reply.type(out.contentType).send(out.body);
  });

  app.all('/api/*', async () => { throw new AppError(404, 'NOT_FOUND', 'Unknown API route.'); });

  await app.register(fstatic, { root: path.join(here, '..', 'public'), prefix: '/' });
  return app;
}

export { can };
