import type pg from 'pg';
import type { Ctx } from '../context.ts';
import { audit } from '../audit.ts';
import { AppError, forbidden } from '../errors.ts';
import { can, canAnywhere, type Permission } from '../permissions.ts';
import { toCsv, toXlsx, type Report } from '../spreadsheet.ts';
import { visibilitySql } from './programmes.ts';
import { listParticipants } from './participants.ts';
import { listFacilityRequests } from './facilities.ts';

const ist = (d: Date | string | null) => d ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d)) : '';

interface Def { key: string; title: string; description: string; perm: Permission; personalData: boolean;
  columns: Report['columns']; rows: (db: pg.Pool, ctx: Ctx) => Promise<Record<string, unknown>[]> }

export const REPORTS: Def[] = [
  { key: 'programmes', title: 'Programmes', description: 'One row per programme in your scope, with status and session count.', perm: 'programme.view', personalData: false,
    columns: [{ key: 'code', header: 'Code', width: 16 }, { key: 'title', header: 'Title', width: 44 }, { key: 'technical_domain', header: 'Technical domain', width: 24 },
      { key: 'delivery_mode', header: 'Delivery' }, { key: 'status', header: 'Status' }, { key: 'version', header: 'Version', width: 10 },
      { key: 'sessions', header: 'Sessions', width: 10 }, { key: 'first', header: 'First session (IST)', width: 22 }, { key: 'owner', header: 'Owner', width: 30 },
      { key: 'data_class', header: 'Data class', width: 14 }],
    rows: async (db, ctx) => { const v = visibilitySql(ctx.principal);
      return (await db.query(`SELECT p.*, u.display_name AS owner, (SELECT count(*)::int FROM sessions s WHERE s.programme_id=p.id) AS sessions,
        (SELECT min(starts_at) FROM sessions s WHERE s.programme_id=p.id) AS first_at FROM programmes p JOIN users u ON u.id=p.owner_user_id
        WHERE ${v.sql} ORDER BY p.code`, v.params)).rows.map((r) => ({ ...r, first: ist(r.first_at), data_class: r.is_simulation ? 'SIMULATION' : 'OPERATIONAL' })); } },
  { key: 'sessions', title: 'Sessions, resources and trainers', description: 'Every session with times, expected numbers, rooms/labs, trainers and booking state.', perm: 'programme.view', personalData: false,
    columns: [{ key: 'code', header: 'Programme', width: 16 }, { key: 'programme', header: 'Programme title', width: 36 }, { key: 'session', header: 'Session', width: 30 },
      { key: 'start', header: 'Starts (IST)', width: 22 }, { key: 'end', header: 'Ends (IST)', width: 22 }, { key: 'delivery_mode', header: 'Mode' },
      { key: 'expected_onsite', header: 'Expected on-site', width: 12 }, { key: 'expected_online', header: 'Expected online', width: 12 },
      { key: 'resources', header: 'Resources', width: 30 }, { key: 'trainers', header: 'Trainers (status)', width: 44 }, { key: 'booking', header: 'Booking state', width: 16 },
      { key: 'data_class', header: 'Data class', width: 14 }],
    rows: async (db, ctx) => { const v = visibilitySql(ctx.principal);
      return (await db.query(`SELECT p.code, p.title AS programme, p.is_simulation, s.title AS session, s.starts_at, s.ends_at, s.delivery_mode, s.expected_onsite, s.expected_online,
        (SELECT string_agg(r.code || ' (' || sr.units_required || ')', ', ') FROM session_resources sr JOIN resources r ON r.id=sr.resource_id WHERE sr.session_id=s.id) AS resources,
        (SELECT string_agg(t.display_name || ' (' || st.status || ')', ', ') FROM session_trainers st JOIN trainers t ON t.id=st.trainer_id WHERE st.session_id=s.id) AS trainers,
        CASE WHEN EXISTS (SELECT 1 FROM reservations rv WHERE rv.session_id=s.id AND rv.status='CONFIRMED') THEN 'CONFIRMED'
             WHEN EXISTS (SELECT 1 FROM reservations rv WHERE rv.session_id=s.id AND rv.status='TENTATIVE') THEN 'TENTATIVE' ELSE 'NONE' END AS booking
        FROM sessions s JOIN programmes p ON p.id=s.programme_id WHERE ${v.sql} ORDER BY s.starts_at`, v.params)).rows
        .map((r) => ({ ...r, start: ist(r.starts_at), end: ist(r.ends_at), data_class: r.is_simulation ? 'SIMULATION' : 'OPERATIONAL' })); } },
  { key: 'approvals', title: 'Approval requests', description: 'Training and Centre-access requests with the policy version they were decided under.', perm: 'request.view', personalData: false,
    columns: [{ key: 'reference', header: 'Reference', width: 12 }, { key: 'request_type', header: 'Type', width: 18 }, { key: 'subject', header: 'Subject', width: 44 },
      { key: 'status', header: 'Status', width: 14 }, { key: 'policy', header: 'Policy (version, provenance)', width: 50 }, { key: 'submitted', header: 'Submitted (IST)', width: 22 },
      { key: 'submitted_by', header: 'Submitted by', width: 30 }, { key: 'decisions', header: 'Decisions', width: 60 }],
    rows: async (db) => (await db.query(`SELECT r.*, pol.title || ' v' || pol.version || ' (' || pol.provenance || ')' AS policy, u.display_name AS submitted_by,
        coalesce(p.code || ' ' || p.title, (r.payload->>'visitorName') || ', ' || (r.payload->>'organisation') || ', ' || (r.payload->>'visitDate')) AS subject,
        (SELECT string_agg(d.decision || ' by ' || du.display_name || coalesce(': ' || d.reason, ''), '; ' ORDER BY d.decided_at) FROM approval_decisions d JOIN users du ON du.id=d.actor_user_id WHERE d.request_id=r.id) AS decisions
        FROM requests r JOIN policies pol ON pol.id=r.policy_id JOIN users u ON u.id=r.submitted_by LEFT JOIN programmes p ON p.id=r.programme_id ORDER BY r.submitted_at`)).rows
        .map((r) => ({ ...r, submitted: ist(r.submitted_at) })) },
  { key: 'facility', title: 'SRM facility requests', description: 'Facility requests and SRM responses, including declines and alternatives.', perm: 'facility.view', personalData: false,
    columns: [{ key: 'programme', header: 'Programme', width: 16 }, { key: 'session', header: 'Session', width: 30 }, { key: 'resource', header: 'Resource', width: 16 },
      { key: 'start', header: 'Requested start (IST)', width: 22 }, { key: 'end', header: 'Requested end (IST)', width: 22 }, { key: 'status', header: 'Status', width: 22 },
      { key: 'responded_by', header: 'Responded by', width: 30 }, { key: 'response_note', header: 'Response note', width: 40 }],
    rows: async (db, ctx) => (await listFacilityRequests(db, ctx, {})).map((r: any) => ({ ...r, programme: r.programme_code, session: r.session_title,
        resource: r.resource_code, start: ist(r.requested_starts_at), end: ist(r.requested_ends_at), responded_by: r.responded_by_name })) },
  { key: 'participants', title: 'Participant register', description: 'Registered students and teachers in your scope. Contains personal data: handle under your institution’s privacy rules.', perm: 'participant.view', personalData: true,
    columns: [{ key: 'institution_name', header: 'Institution', width: 40 }, { key: 'participant_type', header: 'Type', width: 10 }, { key: 'full_name', header: 'Full name', width: 30 },
      { key: 'email', header: 'Email', width: 32 }, { key: 'external_ref', header: 'Roll or staff number', width: 22 }, { key: 'department', header: 'Department', width: 26 },
      { key: 'year_of_study', header: 'Year', width: 8 }, { key: 'registered', header: 'Registered (IST)', width: 22 }],
    rows: async (db, ctx) => (await listParticipants(db, ctx, {})).map((r) => ({ ...r, registered: ist(r.created_at) })) },
  { key: 'audit', title: 'Audit log (latest 5,000 events)', description: 'Who did what, when, with outcome and correlation ID.', perm: 'audit.view', personalData: true,
    columns: [{ key: 'time', header: 'Time (IST)', width: 22 }, { key: 'actor_label', header: 'Actor', width: 30 }, { key: 'action', header: 'Action', width: 24 },
      { key: 'entity', header: 'Entity', width: 24 }, { key: 'outcome', header: 'Outcome', width: 10 }, { key: 'reason', header: 'Reason', width: 50 }, { key: 'correlation_id', header: 'Correlation ID', width: 38 }],
    rows: async (db) => (await db.query(`SELECT * FROM audit_events ORDER BY id DESC LIMIT 5000`)).rows
      .map((r) => ({ ...r, time: ist(r.occurred_at), entity: `${r.entity_type}${r.entity_version ? ' v' + r.entity_version : ''}` })) },
];

export function availableReports(ctx: Ctx) {
  if (!canAnywhere(ctx.principal, 'export.run')) return [];
  return REPORTS.filter((r) => (r.key === 'approvals' || r.key === 'audit') ? can(ctx.principal, r.perm) : canAnywhere(ctx.principal, r.perm)).map(({ key, title, description, personalData }) => ({ key, title, description, personalData }));
}

export async function exportReport(db: pg.Pool, ctx: Ctx, key: string, format: string) {
  const def = REPORTS.find((r) => r.key === key);
  if (!def) throw new AppError(404, 'NOT_FOUND', 'Unknown report.');
  if (!['xlsx', 'csv'].includes(format)) throw new AppError(400, 'VALIDATION_FAILED', 'format must be xlsx or csv');
  const globalOnly = def.key === 'approvals' || def.key === 'audit';
  const allowed = canAnywhere(ctx.principal, 'export.run') && (globalOnly ? can(ctx.principal, def.perm) : canAnywhere(ctx.principal, def.perm));
  if (!allowed) {
    await audit(db, ctx, { scope: 'reports', action: 'report.export', entityType: 'report', entityId: key, outcome: 'DENIED' });
    throw forbidden('You may not download this report.');
  }
  const rows = await def.rows(db, ctx);
  const generated = new Date();
  const report: Report = { title: def.title, columns: def.columns, rows, about: [
    ['Report', def.title], ['Description', def.description], ['Generated (IST)', ist(generated)], ['Generated by', ctx.principal.displayName],
    ['Rows', String(rows.length)], ['Scope', 'Only records you are authorised to see are included.'],
    ['Data class', 'Check the "Data class" column where present: SIMULATION rows are examples, not operational records.'],
    ['Environment', 'Demonstration build: all seeded data is synthetic.'],
    ['Personal data', def.personalData ? 'Yes. Store securely, share only with authorised people, and delete when no longer needed.' : 'No'],
    ['Correlation ID', ctx.correlationId]] };
  // Export is audited before the file is released; if auditing fails, nothing is returned.
  await audit(db, ctx, { scope: 'reports', action: 'report.export', entityType: 'report', entityId: key, outcome: 'SUCCESS', change: { format, rows: rows.length, personalData: def.personalData } });
  const stamp = generated.toISOString().slice(0, 10);
  return { filename: `vtc-${key}-${stamp}.${format}`, body: format === 'xlsx' ? await toXlsx(report) : toCsv(report),
    contentType: format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8' };
}
