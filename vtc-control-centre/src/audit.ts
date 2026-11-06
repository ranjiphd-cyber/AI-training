import type pg from 'pg';
import type { Tx } from './db.ts';

export interface Actor { id: string | null; label: string }
export interface AuditCtx { actor: Actor; correlationId: string }

export interface AuditEvent {
  scope: string;
  action: string;
  entityType: string;
  entityId: string;
  entityVersion?: number | null;
  outcome: 'SUCCESS' | 'BLOCKED' | 'DENIED' | 'FAILED';
  reason?: string | null;
  change?: Record<string, unknown>;
}

const SENSITIVE = /pass(word)?|token|secret|cookie|authorization/i;
function redact(obj: Record<string, unknown> = {}): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = SENSITIVE.test(k) ? '[REDACTED]' : v;
  return out;
}

/** Writes an audit event inside the caller's transaction. If this fails, the whole business action rolls back. */
export async function audit(tx: Tx | pg.Pool, ctx: AuditCtx, e: AuditEvent): Promise<void> {
  await tx.query(
    `INSERT INTO audit_events (actor_user_id, actor_label, scope, action, entity_type, entity_id, entity_version,
                               correlation_id, outcome, reason, change)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [ctx.actor.id, ctx.actor.label, e.scope, e.action, e.entityType, e.entityId, e.entityVersion ?? null,
     ctx.correlationId, e.outcome, e.reason ?? null, JSON.stringify(redact(e.change))]);
}
