# 06 — Implementation Ledger and Roadmap

| Capability | State | Evidence |
|---|---|---|
| Schema, migrations, constraints | Implemented & verified | `db/migrations/001_foundation.sql`; tests |
| Demo authentication + production guard | Implemented & verified | `src/config.ts`, `src/auth.ts`; T28 |
| Enterprise OIDC | **Blocked** (D-06) — startup refuses `AUTH_MODE=oidc` | — |
| Scoped RBAC + object-level checks | Implemented & verified | `src/permissions.ts`; T18, T19 |
| Programmes, sessions, versioning, reopen, cancel | Implemented & verified | `services/programmes.ts` |
| Deterministic validation (capacity, conflicts, modes) | Implemented & verified | `services/validation.ts` |
| Approval engine (sequential/parallel, counts, return, withdraw, stale guard) | Implemented & verified | `services/approvals.ts` |
| Policy drafting/activation (provenance, four-eyes) | Implemented & verified | `services/policies.ts` |
| Delegation / escalation | Pending (D-02) | — |
| SRM facility confirmations & alternatives | Implemented & verified | `services/facilities.ts` |
| Transactional final booking | Implemented & verified | `services/booking.ts`; T20 |
| Trainer invite/accept/decline | Implemented & verified | `services/trainers.ts` |
| Trainer withdrawal, briefs, reminders, appreciation | Pending (S5) | — |
| Recurrence generation, buffers per resource, resource admin UI | Pending | buffer via booking policy only |
| Command Centre KPIs with definitions & drill-down | Implemented | `services/queries.ts` |
| Audit (atomic, append-only, search) | Implemented & verified | T25 |
| UI for 7 modules; 5 honest placeholders | Implemented; browser-verified | `public/` |
| Participant registry & Excel/CSV import | Implemented & verified (enrolment, waitlists, substitutions pending) | `services/participants.ts`, `spreadsheet.ts`; T01, T02, T26 |
| Report downloads (.xlsx/.csv) | Implemented & verified (interim export rights, D-10) | `services/reports.ts` |
| GitHub Codespaces hosting config | Written; **not executed here** (no Docker daemon in build environment) | `.devcontainer/` |
| Attendance, evidence, assessments, feedback | Not started (S3) | |
| Certificates (eligibility, Ranjith approval, issuance, verification) | Not started (S4) | |
| Notification outbox & simulation adapter | Not started (S5) | |
| CSR analytics & exports | Not started (S6) | |
| Backup/restore runbook, retention jobs | Not started | D-10 |
| Formal accessibility & security review | Not performed | |

## Roadmap (proposed)
- **S2 Participants**: registry, CSV/XLSX import with preview, quarantine, duplicate review, eligibility, enrolment, waitlist, substitution, participant clash checks.
- **S3 Attendance & evidence**: SPOC attendance, bulk upload, corrections with reasons, assessments, feedback, delivery verification.
- **S4 Certificates**: versioned Participation & Completion rules, eligibility evaluation, Ranjith T. P. approval bound to evidence/template versions, idempotent issuance, specimen mode, public verification, revocation.
- **S5 Communications**: templates, outbox, simulation adapter, provider adapter once D-08 is decided, reminder relevance checks, trainer withdrawal.
- **S6 CSR reporting**: verified-record metrics, denominators, data-quality notes, formula-safe exports.
- **S7 Production hardening**: OIDC, hosting, backup/restore drills, observability, security and accessibility audits, UAT.
