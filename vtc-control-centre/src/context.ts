import type pg from 'pg';
import type { Principal } from './permissions.ts';
import type { AuditCtx, AuditEvent } from './audit.ts';
import { audit } from './audit.ts';
import { AppError } from './errors.ts';

export interface Ctx extends AuditCtx { principal: Principal; db: pg.Pool }

export function makeCtx(db: pg.Pool, principal: Principal, correlationId: string): Ctx {
  return { db, principal, correlationId, actor: { id: principal.id, label: principal.displayName } };
}

/**
 * Records a BLOCKED/DENIED attempt on a separate connection (so it survives the rollback of the business
 * transaction) and then throws the actionable error. Blocked attempts are never silently swallowed.
 */
export async function block(ctx: Ctx, e: Omit<AuditEvent, 'outcome'> & { outcome?: 'BLOCKED' | 'DENIED' }, err: AppError): Promise<never> {
  try {
    await audit(ctx.db, ctx, { ...e, outcome: e.outcome ?? 'BLOCKED', reason: e.reason ?? `${err.code}: ${err.message}` });
  } catch { /* the action is not performed either way; the original error is surfaced */ }
  throw err;
}
