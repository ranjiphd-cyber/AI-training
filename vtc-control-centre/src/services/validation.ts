import type pg from 'pg';

type Q = pg.Pool | pg.PoolClient;

export interface Issue {
  severity: 'ERROR' | 'WARNING';
  code: string;
  message: string;
  sessionId?: string;
  resourceId?: string;
  trainerId?: string;
  resolution?: string;
}

const overlaps = (a1: Date, a2: Date, b1: Date, b2: Date) => a1 < b2 && b1 < a2;
const addMin = (d: Date, m: number) => new Date(d.getTime() + m * 60000);

/**
 * Deterministic programme validation. Pure function of database state; used for preview, at submission and
 * (under row locks, inside the SERIALIZABLE booking transaction) at final booking.
 * Shared-capacity checks are conservative: all overlapping confirmed reservations are summed.
 */
export async function validateProgramme(q: Q, programmeId: string, opts: { bufferMinutes?: number; now?: Date } = {}) {
  const buffer = opts.bufferMinutes ?? 0;
  const now = opts.now ?? new Date();
  const issues: Issue[] = [];
  const prog = (await q.query(`SELECT * FROM programmes WHERE id=$1`, [programmeId])).rows[0];
  const sessions = (await q.query(`SELECT * FROM sessions WHERE programme_id=$1 ORDER BY starts_at`, [programmeId])).rows;
  const sres = (await q.query(
    `SELECT sr.*, r.code, r.name, r.kind, r.capacity, r.allocation_mode, r.status AS resource_status
       FROM session_resources sr JOIN resources r ON r.id = sr.resource_id
       JOIN sessions s ON s.id = sr.session_id WHERE s.programme_id=$1`, [programmeId])).rows;
  const strs = (await q.query(
    `SELECT st.*, t.display_name FROM session_trainers st JOIN trainers t ON t.id = st.trainer_id
       JOIN sessions s ON s.id = st.session_id WHERE s.programme_id=$1 AND st.status IN ('INVITED','ACCEPTED')`, [programmeId])).rows;

  if (!sessions.length) issues.push({ severity: 'ERROR', code: 'NO_SESSIONS', message: 'The programme has no sessions.',
    resolution: 'Add at least one session.' });

  for (const s of sessions) {
    const label = `Session "${s.title}"`;
    if (prog.delivery_mode !== 'HYBRID' && s.delivery_mode !== prog.delivery_mode)
      issues.push({ severity: 'ERROR', code: 'DELIVERY_MODE_MISMATCH', sessionId: s.id,
        message: `${label} is ${s.delivery_mode} but the programme is ${prog.delivery_mode}.`,
        resolution: 'Change the session mode or set the programme to HYBRID.' });
    if (s.starts_at < now) issues.push({ severity: 'ERROR', code: 'SESSION_IN_PAST', sessionId: s.id,
      message: `${label} starts in the past.`, resolution: 'Reschedule the session.' });
    const mine = sres.filter((r) => r.session_id === s.id);
    const physical = mine.filter((r) => r.kind !== 'VIRTUAL');
    const virtual = mine.filter((r) => r.kind === 'VIRTUAL');
    if (s.delivery_mode !== 'ONLINE' && physical.length === 0)
      issues.push({ severity: 'ERROR', code: 'NO_PHYSICAL_RESOURCE', sessionId: s.id,
        message: `${label} is ${s.delivery_mode} but has no room, laboratory or workstation allocated.`,
        resolution: 'Allocate an on-site resource.' });
    if (s.delivery_mode === 'ONLINE' && physical.length > 0)
      issues.push({ severity: 'ERROR', code: 'PHYSICAL_RESOURCE_ON_ONLINE', sessionId: s.id,
        message: `${label} is ONLINE but holds physical resources.`, resolution: 'Remove the physical resources or change the mode.' });
    if (s.delivery_mode !== 'ONSITE' && virtual.length === 0)
      issues.push({ severity: 'WARNING', code: 'NO_VIRTUAL_RESOURCE', sessionId: s.id,
        message: `${label} has online participants but no virtual classroom recorded.` });
    if (s.delivery_mode !== 'ONSITE' && s.expected_online === 0)
      issues.push({ severity: 'WARNING', code: 'NO_ONLINE_PARTICIPANTS', sessionId: s.id,
        message: `${label} is ${s.delivery_mode} but expects no online participants.` });

    for (const r of mine) {
      if (r.resource_status !== 'ACTIVE')
        issues.push({ severity: 'ERROR', code: 'RESOURCE_INACTIVE', sessionId: s.id, resourceId: r.resource_id,
          message: `${r.code} is not active.`, resolution: 'Choose another resource.' });
      const demand = r.kind === 'VIRTUAL' ? s.expected_online : (r.kind === 'ROOM' || r.kind === 'LAB') ? s.expected_onsite : r.units_required;
      if (demand > r.capacity || r.units_required > r.capacity)
        issues.push({ severity: 'ERROR', code: 'CAPACITY_EXCEEDED', sessionId: s.id, resourceId: r.resource_id,
          message: `${label} needs ${Math.max(demand, r.units_required)} places in ${r.code}, capacity ${r.capacity}.`,
          resolution: 'Reduce participants, split the batch, or choose a larger resource.' });

      // Conflicts with other programmes' reservations.
      const p1 = addMin(s.starts_at, -buffer), p2 = addMin(s.ends_at, buffer);
      const others = (await q.query(
        `SELECT rv.status, rv.units, p.code FROM reservations rv JOIN programmes p ON p.id = rv.programme_id
          WHERE rv.resource_id=$1 AND rv.programme_id <> $2 AND rv.status IN ('TENTATIVE','CONFIRMED')
            AND rv.period && tstzrange($3,$4,'[)')`, [r.resource_id, programmeId, p1, p2])).rows;
      const confirmed = others.filter((o) => o.status === 'CONFIRMED');
      if (r.allocation_mode === 'EXCLUSIVE' && confirmed.length)
        issues.push({ severity: 'ERROR', code: 'RESOURCE_DOUBLE_BOOKED', sessionId: s.id, resourceId: r.resource_id,
          message: `${r.code} is already confirmed for ${confirmed.map((o) => o.code).join(', ')} during ${label}` +
            (buffer ? ` (including ${buffer}-minute buffer).` : '.'),
          resolution: 'Choose another time or resource; SRM may propose an alternative.' });
      if (r.allocation_mode === 'SHARED') {
        const used = confirmed.reduce((a, o) => a + o.units, 0);
        if (used + r.units_required > r.capacity)
          issues.push({ severity: 'ERROR', code: 'SHARED_CAPACITY_EXCEEDED', sessionId: s.id, resourceId: r.resource_id,
            message: `${r.code}: ${used} of ${r.capacity} units already confirmed; ${r.units_required} more requested.`,
            resolution: 'Reduce units or reschedule.' });
      }
      const tentative = others.filter((o) => o.status === 'TENTATIVE');
      if (tentative.length)
        issues.push({ severity: 'WARNING', code: 'TENTATIVE_OVERLAP', sessionId: s.id, resourceId: r.resource_id,
          message: `${r.code} is tentatively held by ${tentative.map((o) => o.code).join(', ')} during ${label}. ` +
            'The first programme to complete final booking will secure it.' });
    }

    // Trainer conflicts with confirmed commitments elsewhere.
    for (const t of strs.filter((x) => x.session_id === s.id)) {
      const c = (await q.query(
        `SELECT p.code FROM trainer_commitments tc JOIN programmes p ON p.id = tc.programme_id
          WHERE tc.trainer_id=$1 AND tc.status='CONFIRMED' AND tc.programme_id <> $2 AND tc.period && tstzrange($3,$4,'[)')`,
        [t.trainer_id, programmeId, s.starts_at, s.ends_at])).rows;
      if (c.length) issues.push({ severity: 'ERROR', code: 'TRAINER_DOUBLE_BOOKED', sessionId: s.id, trainerId: t.trainer_id,
        message: `${t.display_name} is already committed to ${c.map((x) => x.code).join(', ')} during ${label}.`,
        resolution: 'Assign another trainer or reschedule.' });
    }
  }

  // Internal conflicts within this programme.
  for (let i = 0; i < sessions.length; i++) for (let j = i + 1; j < sessions.length; j++) {
    const a = sessions[i], b = sessions[j];
    if (!overlaps(addMin(a.starts_at, -buffer), addMin(a.ends_at, buffer), b.starts_at, b.ends_at)) continue;
    for (const ra of sres.filter((r) => r.session_id === a.id)) {
      const rb = sres.find((r) => r.session_id === b.id && r.resource_id === ra.resource_id);
      if (!rb) continue;
      if (ra.allocation_mode === 'EXCLUSIVE' || ra.units_required + rb.units_required > ra.capacity)
        issues.push({ severity: 'ERROR', code: 'INTERNAL_RESOURCE_OVERLAP', sessionId: b.id, resourceId: ra.resource_id,
          message: `Sessions "${a.title}" and "${b.title}" overlap and both use ${ra.code}.`, resolution: 'Separate the sessions.' });
    }
    for (const ta of strs.filter((t) => t.session_id === a.id)) {
      if (strs.some((t) => t.session_id === b.id && t.trainer_id === ta.trainer_id))
        issues.push({ severity: 'ERROR', code: 'TRAINER_OVERLAP', sessionId: b.id, trainerId: ta.trainer_id,
          message: `${ta.display_name} is assigned to overlapping sessions "${a.title}" and "${b.title}".`,
          resolution: 'Assign a different trainer to one session.' });
    }
  }
  return { errors: issues.filter((i) => i.severity === 'ERROR'), warnings: issues.filter((i) => i.severity === 'WARNING') };
}
