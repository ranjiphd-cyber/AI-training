# 03 — Decision Register (only items that block correct production behaviour)

Every item below currently has a **safe interim behaviour** implemented or designed. Owners are *suggested*.

| ID | Decision | Why needed | Affected action | Safe interim behaviour | Suggested owner |
|---|---|---|---|---|---|
| D-01 | Approval routing for Training requests and for Centre-access requests (who, sequential/parallel, how many) | System must not assume routing | Operational submission | **Blocked** with explanation; simulation sandbox only | G. V. Rao & Ranjith T. P. |
| D-02 | Delegation, escalation, self-approval and in-flight policy-change handling | Approver absence; policy changes | Decisions, escalations | No delegation/escalation; self-approval off; in-flight requests keep their bound version | G. V. Rao & Ranjith T. P. |
| D-03 | Authoritative approved partner-university list and who maintains it | Eligibility (C-04) | Programme scope, enrolment | Only SRM marked APPROVED; synthetic partner shown PENDING | Ranjith T. P. with SRM leadership |
| D-04 | What counts as a “material change” requiring reapproval | Reapproval trigger | Edits after submission | Conservative: any change to title, domain, mode, sessions, times, resources or numbers | Approvers |
| D-05 | Enrolment approval rules and waitlist/substitution policy | Participant flows | Enrolment (S2) | Not built | Programme owner + SRM SPOC |
| D-06 | Identity provider and external-user (SRM, partners, trainers) onboarding; MFA | Production authentication | All sign-in | Demo identities only; server refuses to start in production | Volvo IT security |
| D-07 | Participation and Completion criteria; certificate templates; signatories | Certificate eligibility and issuance | Certificates (S4) | Will block eligibility & issuance; specimen previews only | Ranjith T. P. |
| D-08 | Email provider, sender identity, send-authorisation rules | Communications | Invitations, reminders | Nothing sent; UI states “not sent” | Volvo IT + Talent Acquisition |
| D-09 | Resource inventory, capacities, buffers, trainer-readiness rule for booking | Booking correctness | Final booking | Synthetic inventory; operational booking blocked (no AUTHORISED BOOKING policy) | SRM Centre SPOC + programme owner |
| D-10 | Evidence requirements, retention periods, export rights, RPO/RTO | Evidence, privacy, recovery | Attendance, exports, backup | Audit retained indefinitely; no export; no deletion | Volvo legal/privacy + IT |
| D-11 | Permissions for SRM Support SPOC and institution coordinators; participant-data visibility across institutions | Least privilege | Delegated tasks | Support = view only; coordinators disabled | SRM leadership + Volvo |
| D-12 | Hosting option and data residency | Deployment | Production go-live | Local development only | Volvo IT (see doc 07) |
