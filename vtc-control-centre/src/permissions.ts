// RECOMMENDED role→permission matrix (see docs/02-permission-matrix.md). Not yet company-approved.
// Enforcement is server-side only; the client receives the resulting action list for display.

export const PERMISSIONS = [
  'dashboard.view',
  'programme.view', 'programme.create', 'programme.edit', 'programme.submit', 'programme.cancel',
  'request.view', 'request.approve', 'centre_access.create',
  'facility.view', 'facility.request', 'facility.respond',
  'booking.finalise',
  'resource.view', 'resource.administer',
  'trainer.view', 'trainer.assign', 'trainer.respond_own',
  'participant.upload', 'attendance.record', 'evidence.correct',
  'certificate.approve_issuance',
  'communication.send', 'export.run',
  'audit.view', 'policy.view', 'policy.draft', 'policy.activate_authorised', 'policy.activate_simulation',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export type Role =
  | 'VOLVO_APPROVER' | 'CERTIFICATE_APPROVER' | 'PROGRAMME_ADMIN' | 'SRM_CENTRE_SPOC' | 'SRM_SUPPORT_SPOC'
  | 'TRAINER' | 'PARTICIPANT' | 'INSTITUTION_COORDINATOR' | 'TECH_ADMIN' | 'AUDITOR';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  VOLVO_APPROVER: ['dashboard.view', 'programme.view', 'request.view', 'request.approve', 'facility.view',
    'resource.view', 'trainer.view', 'audit.view', 'policy.view', 'policy.activate_authorised'],
  // CONFIRMED: Ranjith T. P. is the mandatory certificate-issuance approver. Grants nothing else.
  CERTIFICATE_APPROVER: ['certificate.approve_issuance'],
  PROGRAMME_ADMIN: ['dashboard.view', 'programme.view', 'programme.create', 'programme.edit', 'programme.submit',
    'programme.cancel', 'request.view', 'centre_access.create', 'facility.view', 'facility.request',
    'booking.finalise', 'resource.view', 'trainer.view', 'trainer.assign', 'policy.view'],
  // CONFIRMED: SRM SPOC may upload participant records and manage attendance; coordinates facilities.
  SRM_CENTRE_SPOC: ['dashboard.view', 'facility.view', 'facility.respond', 'resource.view',
    'participant.upload', 'attendance.record'],
  // Delegated permissions only; defaults to view. Further delegation is decision D-11.
  SRM_SUPPORT_SPOC: ['facility.view', 'resource.view'],
  TRAINER: ['trainer.respond_own'],
  PARTICIPANT: [],
  // Disabled until authorised (prompt §7).
  INSTITUTION_COORDINATOR: [],
  // Administrative access never confers business approval authority.
  TECH_ADMIN: ['dashboard.view', 'audit.view', 'policy.view', 'policy.draft', 'policy.activate_simulation',
    'resource.view', 'resource.administer'],
  AUDITOR: ['dashboard.view', 'audit.view', 'programme.view', 'request.view', 'facility.view',
    'resource.view', 'trainer.view', 'policy.view'],
};

export interface RoleAssignment { role: Role; scopeType: 'GLOBAL' | 'INSTITUTION' | 'PROGRAMME'; scopeId: string | null }

export interface Principal {
  id: string;
  userKey: string;
  displayName: string;
  organisation: string;
  institutionId: string | null;
  isSynthetic: boolean;
  assignments: RoleAssignment[];
  trainerId: string | null;
}

export interface Scope { institutionId?: string | null; programmeId?: string | null }

/** True if any active assignment grants the permission within the requested scope. */
export function can(p: Principal, perm: Permission, scope: Scope = {}): boolean {
  return p.assignments.some((a) => {
    if (!ROLE_PERMISSIONS[a.role].includes(perm)) return false;
    if (a.scopeType === 'GLOBAL') return true;
    if (a.scopeType === 'INSTITUTION') return !!scope.institutionId && a.scopeId === scope.institutionId;
    if (a.scopeType === 'PROGRAMME') return !!scope.programmeId && a.scopeId === scope.programmeId;
    return false;
  });
}

/** True if the permission is held in any scope (used for menu visibility and list endpoints, which then filter). */
export function canAnywhere(p: Principal, perm: Permission): boolean {
  return p.assignments.some((a) => ROLE_PERMISSIONS[a.role].includes(perm));
}

export function institutionScopes(p: Principal, perm: Permission): { global: boolean; ids: string[] } {
  let global = false; const ids: string[] = [];
  for (const a of p.assignments) {
    if (!ROLE_PERMISSIONS[a.role].includes(perm)) continue;
    if (a.scopeType === 'GLOBAL') global = true;
    if (a.scopeType === 'INSTITUTION' && a.scopeId) ids.push(a.scopeId);
  }
  return { global, ids };
}

export function hasRole(p: Principal, role: Role): boolean {
  return p.assignments.some((a) => a.role === role);
}
