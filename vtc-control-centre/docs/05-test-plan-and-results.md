# 05 — Test Plan and Actual Results

**Executed:** 2026-11-06, Node 22.23, PostgreSQL 16.15, local container. `npm run typecheck` clean; `npm test` → **45 tests, 45 passed, 0 failed** (Slice 1: 35, run 4× consecutively with no flakes; import & reports: 10).
**Browser:** full Slice-1 journey executed in headless Chromium (Playwright) to `CONFIRMED`, no page errors or CSP violations; 390 px mobile width with no horizontal scroll.
Status legend: **PASSED** (automated, executed) · **NOT IMPLEMENTED** (feature in a later slice; never reported as passed) · **MANUAL PENDING**.

| # | Scenario | Setup → action → expected | Audit effect | Status |
|---|---|---|---|---|
| 1 | Duplicate participant import | Re-upload of registered person (roll no./email) → DUPLICATE, skipped; repeat inside one file → ERROR; second commit of same job refused | import.preview / import.commit | **PASSED** |
| 2 | Same name, different people | Same name, different roll no. → POSSIBLE_DUPLICATE; commit blocked until uploader chooses; both people then exist | import.resolve_row | **PASSED** |
| 3 | Overlapping trainer assignments | Trainer A confirmed on P-A; assigned to overlapping P-B → validation `TRAINER_DOUBLE_BOOKED`; acceptance 409 | BLOCKED event | **PASSED** |
| 4 | Double-booked laboratory | P-A confirmed; P-B overlaps → SRM confirm 409 `RESOURCE_UNAVAILABLE`; validation error | BLOCKED event | **PASSED** |
| 5 | Room-capacity overflow | 40 on-site in 24-seat lab → submit 409 with `CAPACITY_EXCEEDED` + resolution | BLOCKED event | **PASSED** |
| 6 | Participant in concurrent sessions | — | — | NOT IMPLEMENTED (S2 enrolment) |
| 7 | Different request types, different policies | Training (1-of-2) vs Centre access (parallel, both) → distinct policy IDs and outcomes | SUCCESS events with policy version | **PASSED** |
| 8 | Missing approval configuration | Operational programme submit → 409 `POLICY_NOT_CONFIGURED`, names D-01 and resolver; status stays DRAFT; no request created | BLOCKED event | **PASSED** |
| 9 | SRM declines facility | Decline without reason → 400; with reason → DECLINED, tentative hold released, readiness unmet | SUCCESS | **PASSED** |
| 10 | Alternative facility proposal | Propose lab 2 + new time → accept → session updated → new PENDING (origin ALTERNATIVE) → SRM confirms | SUCCESS chain | **PASSED** |
| 11 | Last-minute postponement | Reopen with reason supersedes approval and releases bookings (postponement workflow itself pending) | SUCCESS | PARTIAL — reopen PASSED; postpone NOT IMPLEMENTED |
| 12 | Trainer withdrawal | Decline after confirmation → 409 `WITHDRAWAL_WORKFLOW_REQUIRED` | BLOCKED | PARTIAL — guard only |
| 13 | Participant substitution | — | — | NOT IMPLEMENTED (S2) |
| 14 | Missing attendance evidence | — | — | NOT IMPLEMENTED (S3) |
| 15 | Certificate criteria not met | — | — | NOT IMPLEMENTED (S4) |
| 16 | Issuance without Ranjith approval blocked | — | — | NOT IMPLEMENTED (S4) |
| 17 | Stale certificate approval | Analogue for approvals PASSED (reopen → booking blocked on `approval`) | — | NOT IMPLEMENTED for certificates (S4) |
| 18 | Cross-institution access blocked | SPOC scoped to partner: list empty, respond 403, programme 404 | DENIED event | **PASSED** |
| 19 | Client-side role manipulation blocked | Forged headers/body/query claiming approver → 403; no decision rows | DENIED | **PASSED** |
| 20 | Two concurrent final bookings | `Promise.all` on two ready programmes, same lab/time → exactly one 200, one 409; one CONFIRMED row | SUCCESS + BLOCKED | **PASSED** |
| 21 | Duplicate certificate generation | Booking analogue PASSED (`ALREADY_CONFIRMED`, no duplicate rows) | — | NOT IMPLEMENTED for certificates (S4) |
| 22 | Duplicate notification job | Facility-request reconcile idempotency PASSED | — | NOT IMPLEMENTED for outbox (S5) |
| 23 | Email provider failure & retry | — | — | NOT IMPLEMENTED (S5) |
| 24 | Cancelled programme with pending invitations | Cancel without reason 400; with reason → invitations WITHDRAWN, holds released, facility requests SUPERSEDED | SUCCESS | **PASSED** |
| 25 | Audit persistence failure | Audit inserts forced to fail → submit 500 “no changes were saved”; programme DRAFT; no request | none (by design) | **PASSED** |
| 26 | Malicious / malformed spreadsheet | Formula cell, non-zip .xlsx, .xlsm, wrong headers, oversized file, zip-bomb directory → all refused (422/413); nothing saved | BLOCKED events | **PASSED** |
| 27 | Unconfigured production email blocked | No email capability exists at all | — | NOT IMPLEMENTED (S5) — trivially no sends |
| 28 | Demo auth in production blocked | `APP_ENV=production AUTH_MODE=demo` → startup refused (exit 78; also verified manually) | — | **PASSED** |
| 29 | Backup restore & integrity | — | — | NOT IMPLEMENTED (ops runbook pending) |
| 30 | Keyboard & screen-reader operation | Semantic landmarks, labels, skip link, focus management, status not colour-only built in | — | MANUAL PENDING (no AT audit run) |

Additional executed tests: end-to-end journey with full history; shared-capacity summing; trainer-readiness block; idempotent booking;
DB exclusion constraint backstop; non-approvers (tech admin, programme admin, SPOC, auditor, trainer) denied; no double decision;
return → revise → resubmit bound to new version; edits blocked in approval; AUTHORISED activation rules (role, reference, four-eyes);
admin cannot route approvals to a non-approver; CSRF; non-synthetic demo login refused; audit append-only; trainer visibility;
security headers; KPIs unavailable-not-zero; facility idempotency; stale facility confirmation after session edit.

Import & report tests also cover: preview saves nothing; error rows never imported; CSV upload; SPOC cannot upload for another institution; unapproved institution blocked; reports scoped per role; exports audited; formula-injection neutralised in XLSX and CSV.
Browser-verified: template download → upload → preview → same-name review → import → Excel report download containing exactly the imported rows.

Defects found by these tests and fixed during the build: (1) SRM responses were audited outside the programme scope and missing from its history; (2) action buttons sent an empty JSON body that the server rejected.

## UAT checklist (for SRM and Volvo users)
- [ ] Each role signs in and sees only its modules and records.
- [ ] Programme admin creates a programme with two sessions (one hybrid) and sees validation explain issues.
- [ ] SRM SPOC confirms one, declines one with reason, proposes an alternative for another.
- [ ] Approver approves / returns with reason; programme admin revises and resubmits.
- [ ] Final booking blocked until all checklist items are met; then succeeds; calendar shows CONFIRMED.
- [ ] Operational programme submission shows the policy-not-configured explanation.
- [ ] Audit search finds each action with actor, version, outcome and correlation ID.
