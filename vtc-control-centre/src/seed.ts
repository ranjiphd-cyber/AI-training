// SYNTHETIC DEMONSTRATION DATA ONLY. No real personal data, inventories, routings or targets.
// Stakeholder names appear only as clearly labelled demo identities for the confirmed roles.
import type pg from 'pg';
import { loadPrincipal } from './auth.ts';
import { makeCtx } from './context.ts';
import * as programmes from './services/programmes.ts';
import * as approvals from './services/approvals.ts';
import * as facilities from './services/facilities.ts';
import * as trainers from './services/trainers.ts';
import * as booking from './services/booking.ts';

const TABLES = ['audit_events', 'trainer_commitments', 'reservations', 'facility_requests', 'approval_decisions', 'requests',
  'session_trainers', 'session_resources', 'sessions', 'programme_institutions', 'programmes', 'trainers', 'resources',
  'policies', 'auth_sessions', 'role_assignments', 'users', 'institutions'];

export async function resetDatabase(db: pg.Pool) {
  await db.query(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`);
  await db.query(`ALTER SEQUENCE programme_code_seq RESTART 1001; ALTER SEQUENCE request_ref_seq RESTART 5001;`);
}

export interface SeedIds { users: Record<string, string>; institutions: Record<string, string>; resources: Record<string, string>; trainers: Record<string, string> }

export async function seedBase(db: pg.Pool): Promise<SeedIds> {
  const ins = async (code: string, name: string, kind: string, status: string, synthetic: boolean, ref: string | null = null) =>
    (await db.query(`INSERT INTO institutions (code, name, kind, approval_status, approval_reference, is_synthetic) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [code, name, kind, status, ref, synthetic])).rows[0].id as string;
  const institutions = {
    SRM: await ins('SRMIST-KTR', 'SRM Institute of Science and Technology, Kattankulathur', 'HOST', 'APPROVED', false, 'CONFIRMED in master build prompt §3'),
    VOLVO: await ins('VOLVO-IN', 'Volvo Group India', 'CORPORATE', 'NOT_APPLICABLE', false),
    TRUST: await ins('VOLVO-CSR', 'Volvo Group CSR Trust', 'TRUST', 'NOT_APPLICABLE', false),
    PARTNER: await ins('SYN-PU-A', 'Synthetic Partner University A (placeholder)', 'PARTNER_UNIVERSITY', 'PENDING_DECISION', true),
  };
  const user = async (key: string, name: string, org: string, inst: string | null) =>
    (await db.query(`INSERT INTO users (user_key, display_name, organisation, institution_id, is_synthetic) VALUES ($1,$2,$3,$4,true) RETURNING id`,
      [key, name, org, inst])).rows[0].id as string;
  const users = {
    gvrao: await user('gv.rao', 'G. V. Rao (demo identity)', 'Volvo Group CSR Trust', institutions.TRUST),
    ranjith: await user('ranjith.tp', 'Ranjith T. P. (demo identity)', 'Volvo Group India — Talent Acquisition', institutions.VOLVO),
    admin: await user('prog.admin', 'Programme Administrator (synthetic)', 'Volvo Group India', institutions.VOLVO),
    spoc: await user('srm.spoc', 'SRM Centre SPOC (placeholder — to be configured)', 'SRM IST', institutions.SRM),
    support: await user('srm.support', 'SRM Support SPOC (placeholder)', 'SRM IST', institutions.SRM),
    trainerA: await user('trainer.a', 'Trainer A — EV Systems (synthetic)', 'Volvo Group India', institutions.VOLVO),
    trainerB: await user('trainer.b', 'Trainer B — Diagnostics (synthetic)', 'Volvo Group India', institutions.VOLVO),
    tech: await user('tech.admin', 'Technical Administrator (synthetic)', 'Volvo Group India — IT', institutions.VOLVO),
    auditor: await user('auditor', 'Read-only Auditor (synthetic)', 'Volvo Group India', institutions.VOLVO),
  };
  const role = (u: string, r: string, type = 'GLOBAL', scope: string | null = null) =>
    db.query(`INSERT INTO role_assignments (user_id, role, scope_type, scope_id) VALUES ($1,$2,$3,$4)`, [u, r, type, scope]);
  await role(users.gvrao, 'VOLVO_APPROVER');
  await role(users.ranjith, 'VOLVO_APPROVER');
  await role(users.ranjith, 'CERTIFICATE_APPROVER');
  await role(users.admin, 'PROGRAMME_ADMIN');
  await role(users.spoc, 'SRM_CENTRE_SPOC', 'INSTITUTION', institutions.SRM);
  await role(users.support, 'SRM_SUPPORT_SPOC', 'INSTITUTION', institutions.SRM);
  await role(users.trainerA, 'TRAINER');
  await role(users.trainerB, 'TRAINER');
  await role(users.tech, 'TECH_ADMIN');
  await role(users.auditor, 'AUDITOR');

  const res = async (code: string, name: string, kind: string, cap: number, mode: string, confirm = true) =>
    (await db.query(`INSERT INTO resources (code, name, kind, owner_institution_id, capacity, allocation_mode, requires_facility_confirmation, is_synthetic)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,true) RETURNING id`, [code, name, kind, institutions.SRM, cap, mode, confirm])).rows[0].id as string;
  const resources = {
    lab: await res('LAB-EV-01', 'EV Powertrain Laboratory (synthetic placeholder)', 'LAB', 24, 'EXCLUSIVE'),
    lab2: await res('LAB-DIAG-02', 'Diagnostics Laboratory (synthetic placeholder)', 'LAB', 30, 'EXCLUSIVE'),
    room: await res('ROOM-SEM-01', 'Seminar Room (synthetic placeholder)', 'ROOM', 60, 'EXCLUSIVE'),
    pool: await res('WS-SIM-POOL', 'Simulation Workstation Pool (synthetic placeholder)', 'WORKSTATION_POOL', 20, 'SHARED'),
    virtual: await res('VIRT-01', 'Virtual Classroom (synthetic placeholder)', 'VIRTUAL', 300, 'SHARED', false),
  };
  const tr = async (u: string, name: string, exp: string[]) =>
    (await db.query(`INSERT INTO trainers (user_id, display_name, organisation, expertise, is_synthetic) VALUES ($1,$2,'Volvo Group India',$3,true) RETURNING id`,
      [u, name, exp])).rows[0].id as string;
  const trainerIds = {
    A: await tr(users.trainerA, 'Trainer A — EV Systems (synthetic)', ['Electric powertrains', 'Battery safety']),
    B: await tr(users.trainerB, 'Trainer B — Diagnostics (synthetic)', ['Vehicle diagnostics', 'CAN bus']),
  };

  // SIMULATION policies — illustrative examples only. They can never govern operational records (see resolvePolicy).
  const pol = (key: string, title: string, def: unknown) =>
    db.query(`INSERT INTO policies (policy_key, provenance, version, status, title, definition, created_by, activated_by, activated_at)
              VALUES ($1,'SIMULATION',1,'ACTIVE',$2,$3,$4,$4,now())`, [key, title, JSON.stringify(def), users.tech]);
  await pol('APPROVAL:TRAINING_REQUEST', 'EXAMPLE ONLY — single step, any one Volvo approver', {
    mode: 'SEQUENTIAL', allow_self_approval: false,
    steps: [{ name: 'Volvo approval (example)', approver_user_ids: [users.gvrao, users.ranjith], required_approvals: 1 }] });
  await pol('APPROVAL:CENTRE_ACCESS', 'EXAMPLE ONLY — parallel, both Volvo approvers', {
    mode: 'PARALLEL', allow_self_approval: false,
    steps: [{ name: 'CSR Trust review (example)', approver_user_ids: [users.gvrao], required_approvals: 1 },
            { name: 'Talent Acquisition review (example)', approver_user_ids: [users.ranjith], required_approvals: 1 }] });
  await pol('BOOKING', 'EXAMPLE ONLY — accepted lead trainer, 15-minute buffer', {
    require_trainer_acceptance: true, minimum_accepted_trainers_per_session: 1, buffer_minutes: 15 });

  return { users, institutions, resources, trainers: trainerIds };
}

/** IST wall-clock helper: day offset from today at HH:MM Asia/Kolkata (UTC+05:30, no DST). */
export function ist(dayOffset: number, hh: number, mm = 0): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset, hh, mm) - 330 * 60000);
  return d.toISOString();
}

export async function seedDemoProgrammes(db: pg.Pool, ids: SeedIds) {
  const as = async (u: string) => makeCtx(db, (await loadPrincipal(db, u))!, 'seed');
  const admin = await as(ids.users.admin);
  const inst = [ids.institutions.SRM];

  // 1) Simulation programme taken all the way to a confirmed booking (shows the full journey and its audit trail).
  const p1 = await programmes.createProgramme(db, admin, { title: 'EV Powertrain Fundamentals (SIMULATION)', technicalDomain: 'Electric vehicles',
    deliveryMode: 'HYBRID', isSimulation: true, institutionIds: inst,
    learningObjectives: ['Explain high-voltage safety principles', 'Identify EV powertrain components'] });
  const s1 = await programmes.addSession(db, admin, p1.id, { title: 'Day 1 — HV safety', startsAt: ist(10, 9, 30), endsAt: ist(10, 13), deliveryMode: 'HYBRID',
    expectedOnsite: 20, expectedOnline: 40, resources: [{ resourceId: ids.resources.lab }, { resourceId: ids.resources.virtual }] });
  const a1 = await trainers.assignTrainer(db, admin, s1.id, ids.trainers.A);
  await trainers.respondAssignment(db, await as(ids.users.trainerA), a1.id, 'ACCEPT');
  await facilities.requestFacilities(db, admin, p1.id);
  const fr1 = (await db.query(`SELECT id FROM facility_requests WHERE programme_id=$1 AND status='PENDING'`, [p1.id])).rows;
  for (const f of fr1) await facilities.respondFacility(db, await as(ids.users.spoc), f.id, { action: 'CONFIRM', note: 'Synthetic confirmation' });
  const r1 = await approvals.submitProgramme(db, admin, p1.id);
  await approvals.decide(db, await as(ids.users.gvrao), r1.id, 'APPROVE');
  await booking.finaliseBooking(db, admin, p1.id);

  // 2) Simulation programme ready to walk through: draft with a session, trainer invited, nothing requested yet.
  const p2 = await programmes.createProgramme(db, admin, { title: 'Vehicle Diagnostics Lab Series (SIMULATION)', technicalDomain: 'Diagnostics',
    deliveryMode: 'ONSITE', isSimulation: true, institutionIds: inst, learningObjectives: ['Use a diagnostic tool to read fault codes'] });
  const s2 = await programmes.addSession(db, admin, p2.id, { title: 'Session 1 — Fault codes', startsAt: ist(14, 10), endsAt: ist(14, 13), deliveryMode: 'ONSITE',
    expectedOnsite: 22, resources: [{ resourceId: ids.resources.lab2 }] });
  await programmes.addSession(db, admin, p2.id, { title: 'Session 2 — CAN bus', startsAt: ist(15, 10), endsAt: ist(15, 13), deliveryMode: 'ONSITE',
    expectedOnsite: 22, resources: [{ resourceId: ids.resources.lab2 }, { resourceId: ids.resources.pool, units: 11 }] });
  await trainers.assignTrainer(db, admin, s2.id, ids.trainers.B);

  // 3) Operational draft — demonstrates the fail-closed block: no AUTHORISED routing exists yet.
  const p3 = await programmes.createProgramme(db, admin, { title: 'Industry Orientation for Faculty (operational draft)', technicalDomain: 'Automotive industry overview',
    deliveryMode: 'ONSITE', isSimulation: false, institutionIds: inst });
  await programmes.addSession(db, admin, p3.id, { title: 'Orientation', startsAt: ist(21, 10), endsAt: ist(21, 12), deliveryMode: 'ONSITE',
    expectedOnsite: 30, resources: [{ resourceId: ids.resources.room }] });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { createPool } = await import('./db.ts');
  const { migrate } = await import('./migrate.ts');
  if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is required'); process.exit(1); }
  if (process.env.APP_ENV === 'production') { console.error('Refusing to seed synthetic data into production.'); process.exit(78); }
  await migrate(process.env.DATABASE_URL);
  const db = createPool(process.env.DATABASE_URL);
  await resetDatabase(db);
  const ids = await seedBase(db);
  await seedDemoProgrammes(db, ids);
  console.log('Seeded SYNTHETIC demo data.');
  await db.end();
}
