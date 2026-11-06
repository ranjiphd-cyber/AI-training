# 01 — Blueprint and Requirements

## Executive summary

The Control Centre is the authoritative operational system for the Volvo Group–SRM Vehicle Technology Centre. It replaces
email-and-spreadsheet coordination with workflows in which **every consequential step has an owner, a recorded decision,
server-enforced authority and an audit trail**. Its design principle is *fail closed*: where a company policy has not been
decided, the system blocks and says who must decide — it never guesses, auto-approves or fabricates numbers.

Viewed through a process-improvement lens, the system targets the main sources of defects in training operations:
double bookings (prevented by database constraints), approvals given against an outdated plan (approval bound to a version),
confusion between “room available” and “training approved” (separate states), and CSR figures that cannot be traced to
evidence (metrics computed only from verified records, with drill-down).

## Feature map

| Module | Slice | State |
|---|---|---|
| Command Centre (KPIs with definitions, period, filters, drill-down) | 1 | Implemented (operational KPIs); CSR KPIs shown as *unavailable* |
| Programmes & sessions (draft, edit, versioning, cancel, reopen) | 1 | Implemented — curriculum versions/materials pending (S2) |
| Approval Centre (policy engine) | 1 | Implemented — delegation/escalation pending (S2) |
| Calendar & Resources (tentative/confirmed, conflicts) | 1 | Implemented — recurrence generation, resource admin UI pending |
| SRM Operations (facility confirm/decline/alternative) | 1 | Implemented — roster upload & attendance pending (S2–3) |
| Trainer Operations (invite/accept/decline, conflicts) | 1 | Partial — briefs, reminders, withdrawal, appreciation pending |
| Participant Registry & imports | 2 | Not started |
| Attendance & Learning Evidence | 3 | Not started |
| Certificate Centre | 4 | Not started |
| Communications (outbox) | 5 | Not started |
| CSR Analytics & Reporting | 6 | Not started (shown as unavailable) |
| Administration & Audit (policies, audit search) | 1 | Partial — role admin, retention, backup admin pending |

## Confirmed business rules (preserved verbatim in behaviour)

| ID | Rule | Where enforced |
|---|---|---|
| C-01 | Training and Centre-access requests have different, configurable approval rules | `policies` keyed per request type; `services/policies.ts` |
| C-02 | G. V. Rao and Ranjith T. P. both hold approval capability; routing is configurable | Both seeded with `VOLVO_APPROVER`; routing only from active policy |
| C-03 | SRM SPOC may upload participant records and manage attendance | Permissions `participant.upload`, `attendance.record` granted (features in S2–3) |
| C-04 | SRM and Volvo-approved partner universities are eligible | `institutions.approval_status`; SRM = APPROVED; partner list = D-03 |
| C-05 | Delivery may be on-site, online or hybrid | Programme and session `delivery_mode`; mode-specific validation |
| C-06 | Ranjith T. P. must approve certificates before issuance | `CERTIFICATE_APPROVER` role held only by Ranjith; issuance gate in S4 |
| C-07 | Participation and Completion certificates are both required | S4 design: independent versioned rule sets |
| C-08 | Hosting selected after evaluating security, cost, integration | Unresolved by design — see doc 07 |
| C-09 | Email provider evaluated before implementation | No email adapter; nothing is sent (D-08) |

## Requirements and traceability register

Status: **CONFIRMED** (from the brief), **RECOMMENDED** (our design proposal, not company policy), **UNRESOLVED** (needs a decision).

| ID | Requirement | Status | Source | Implementation | Acceptance test | Outstanding decision |
|---|---|---|---|---|---|---|
| R-01 | Missing mandatory policy blocks the action | CONFIRMED | §5C, §6.1 | `resolvePolicy` → `POLICY_NOT_CONFIGURED` | approvals.test T08 | D-01 |
| R-02 | Submission bound to policy version; in-flight requests keep their version | CONFIRMED / RECOMMENDED (in-flight rule) | §5C | `requests.policy_id`; activation retires old version only | approvals.test T07 | D-02 confirm in-flight handling |
| R-03 | Material changes trigger reapproval | CONFIRMED | §5C | Edits only in DRAFT/RETURNED; version++; reopen supersedes approval | booking.test stale approval; facilities.test reapproval | D-04 define “material” |
| R-04 | Simulation policies never govern operational records | RECOMMENDED | §2.3, §17 | provenance match in `resolvePolicy` | approvals.test | — |
| R-05 | Only named approvers holding the approver role may decide | CONFIRMED | §6.1 | `decide()` checks permission + step membership | approvals.test | D-01 |
| R-06 | Self-approval prohibited by default | RECOMMENDED | — | `allow_self_approval` per policy | approvals.test | D-02 |
| R-07 | Reject/return require a reason | RECOMMENDED | §5C | DB CHECK + service | approvals.test | — |
| R-08 | AUTHORISED policy activation needs approver authority, decision reference, four-eyes | RECOMMENDED | §5K, §6.1 | `activatePolicy` | approvals.test | — |
| R-09 | Final booking requires approval, SRM confirmation, availability, capacity, trainer readiness, no conflicts; re-validated in-transaction | CONFIRMED | §6.2 | `finaliseBooking` (SERIALIZABLE + locks) | booking.test | D-09 readiness rules |
| R-10 | Overlapping confirmed exclusive reservations impossible | CONFIRMED (default) | §6.2 | GiST exclusion constraints | booking.test T04, T20, constraint test | — |
| R-11 | Shared-capacity resources limited by summed units | CONFIRMED | §6.2 | validation (conservative sum) | booking.test | — |
| R-12 | Facility confirmation ≠ training approval ≠ booking | CONFIRMED | §5G | Separate entities and states | facilities.test | — |
| R-13 | Session change invalidates stale facility confirmation | RECOMMENDED | §6.2 | exact-match rule + reconcile | facilities.test | — |
| R-14 | Server-side, scoped permissions; client claims ignored | CONFIRMED | §2.3, §7 | `permissions.ts`, preHandler | security.test T18, T19 | D-11 |
| R-15 | Mandatory audit atomic with business change; failure aborts action | CONFIRMED | §6.5 | `audit()` in same tx | security.test T25 | — |
| R-16 | Blocked/denied attempts are audited | RECOMMENDED | §6.5 | `block()` separate connection | multiple | — |
| R-17 | Audit append-only | RECOMMENDED | §6.5 | trigger | security.test | Revoke TRUNCATE in prod |
| R-18 | Demo authentication impossible in production | CONFIRMED | §8.5 | `loadConfig` guard | security.test T28 | D-06 |
| R-19 | KPIs show definition, period, filters; unavailable ≠ zero | CONFIRMED | §5A | `dashboard()` | facilities.test | — |
| R-20 | Cancellation withdraws pending invitations and releases holds | CONFIRMED | §6.4 | `cancelProgramme` | facilities.test T24 | — |
| R-21 | Times stored as UTC instants; displayed in programme time zone (Asia/Kolkata) | RECOMMENDED | §6.2 | `timestamptz`, `Intl` | partial (IST has no DST) | — |
| R-22 | Administrative access does not confer approval authority | CONFIRMED | §5K | TECH_ADMIN lacks `request.approve` | approvals.test | — |
| R-23 | Certificates require Ranjith T. P.’s recorded approval bound to evidence & template versions | CONFIRMED | §6.3 | Not yet built (S4) | T16, T17 pending | D-07 |
| R-24 | No live email without approved integration | CONFIRMED | §6.4 | No adapter exists; UI states “not sent” | T27 pending (S5) | D-08 |

## Non-functional requirements (RECOMMENDED targets, to be validated)

| Area | Target |
|---|---|
| Accessibility | WCAG 2.2 AA (subject to validation; manual audit not yet performed) |
| Availability | Business-hours critical; RPO ≤ 24 h, RTO ≤ 8 h proposed (D-10) |
| Security | MFA via enterprise IdP; OWASP ASVS L2 as review baseline |
| Performance | Typical page < 1 s at expected scale (hundreds of programmes/yr, thousands of participants) |
| Data residency | To be decided with hosting (D-12) |
