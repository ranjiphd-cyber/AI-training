import crypto from 'node:crypto';
import type pg from 'pg';
import type { AppConfig } from './config.ts';
import type { Principal, Role } from './permissions.ts';
import { AppError } from './errors.ts';

export const SESSION_COOKIE = 'vtc_session';
const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export async function loadPrincipal(db: pg.Pool | pg.PoolClient, userId: string): Promise<Principal | null> {
  const u = await db.query(
    `SELECT u.id, u.user_key, u.display_name, u.organisation, u.institution_id, u.is_synthetic, t.id AS trainer_id
       FROM users u LEFT JOIN trainers t ON t.user_id = u.id
      WHERE u.id = $1 AND u.status = 'ACTIVE'`, [userId]);
  if (!u.rowCount) return null;
  const r = await db.query(
    `SELECT role, scope_type, scope_id FROM role_assignments
      WHERE user_id = $1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())`, [userId]);
  const row = u.rows[0];
  return {
    id: row.id, userKey: row.user_key, displayName: row.display_name, organisation: row.organisation,
    institutionId: row.institution_id, isSynthetic: row.is_synthetic, trainerId: row.trainer_id,
    assignments: r.rows.map((a) => ({ role: a.role as Role, scopeType: a.scope_type, scopeId: a.scope_id })),
  };
}

/** Demo-only login with isolated synthetic identities. config.ts guarantees this never runs in production. */
export async function demoLogin(db: pg.Pool, cfg: AppConfig, userKey: string) {
  if (cfg.authMode !== 'demo' || cfg.appEnv === 'production') {
    throw new AppError(403, 'DEMO_AUTH_DISABLED', 'Demo authentication is disabled in this environment.');
  }
  const u = await db.query(`SELECT id FROM users WHERE user_key = $1 AND status = 'ACTIVE' AND is_synthetic = true`, [userKey]);
  if (!u.rowCount) throw new AppError(401, 'UNKNOWN_IDENTITY', 'Unknown or disabled demo identity.');
  const token = crypto.randomBytes(32).toString('base64url');
  const csrf = crypto.randomBytes(24).toString('base64url');
  await db.query(
    `INSERT INTO auth_sessions (token_hash, user_id, csrf_token, auth_mode, expires_at)
     VALUES ($1,$2,$3,'demo', now() + make_interval(mins => $4))`,
    [sha256(token), u.rows[0].id, csrf, cfg.sessionTtlMinutes]);
  return { token, csrf, userId: u.rows[0].id as string };
}

export async function resolveSession(db: pg.Pool, token: string | undefined) {
  if (!token) return null;
  const s = await db.query(
    `UPDATE auth_sessions SET last_seen_at = now()
      WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
      RETURNING user_id, csrf_token`, [sha256(token)]);
  if (!s.rowCount) return null;
  const principal = await loadPrincipal(db, s.rows[0].user_id);
  if (!principal) return null;
  return { principal, csrf: s.rows[0].csrf_token as string };
}

export async function logout(db: pg.Pool, token: string | undefined) {
  if (token) await db.query(`UPDATE auth_sessions SET revoked_at = now() WHERE token_hash = $1`, [sha256(token)]);
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a); const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}
