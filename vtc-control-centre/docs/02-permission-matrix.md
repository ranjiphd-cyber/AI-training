# 02 — Role and Permission Matrix (RECOMMENDED)

Enforced in `src/permissions.ts` on the server. Every role assignment carries a **scope**: `GLOBAL`, `INSTITUTION:<id>` or
`PROGRAMME:<id>`. A permission applies only within its assignment’s scope. Object-level checks are added where noted.

Legend: ● granted · ◐ granted with object-level restriction · — not granted

| Permission | Volvo approver | Certificate approver | Programme admin | SRM Centre SPOC | SRM Support SPOC | Trainer | Participant | Institution coordinator | Technical admin | Auditor |
|---|---|---|---|---|---|---|---|---|---|---|
| View dashboard | ● | — | ● | ● | — | — | — | — | ● | ● |
| View programmes | ● | — | ● | ◐ own-institution facilities | ◐ (via facility.view) | ◐ assigned only | — | — | — | ● |
| Create / edit / submit / cancel programme | — | — | ● | — | — | — | — | — | — | — |
| Approve requests | ◐ named in open step of bound policy | — | — | — | — | — | — | — | — | — |
| Create Centre-access request | — | — | ● | — | — | — | — | — | — | — |
| View facility requests | ● | — | ● | ◐ institution | ◐ institution | — | — | — | — | ● |
| Request facilities | — | — | ● | — | — | — | — | — | — | — |
| Confirm facilities | — | — | — | ◐ resources owned by institution | — | — | — | — | — | — |
| Finalise reservations | — | — | ● | — | — | — | — | — | — | — |
| Assign trainers | — | — | ● | — | — | — | — | — | — | — |
| Respond to own trainer invitation | — | — | — | — | — | ◐ own only | — | — | — | — |
| View participants | ● | — | ● | ◐ institution | — | — | — | — | — | ● |
| Upload participants (Excel/CSV) | — | — | — | ◐ institution | delegated (D-11) | — | — | — | — | — |
| Record attendance (S3) | — | — | — | ◐ institution | delegated (D-11) | — | — | — | — | — |
| Approve certificate issuance (S4) | — | ● | — | — | — | — | — | — | — | — |
| Send communications (S5) | — | — | D-08 | — | — | — | — | — | — | — |
| Download reports (interim, pending D-10) | ● | — | ● | ◐ own-institution reports | — | — | — | — | — | ● |
| View audit | ● | — | — | — | — | — | — | — | ● | ● |
| View policies | ● | — | ● | — | — | — | — | — | ● | ● |
| Draft policy | — | — | — | — | — | — | — | — | ● | — |
| Activate AUTHORISED policy | ◐ not the drafter; decision ref required | — | — | — | — | — | — | — | — | — |
| Activate SIMULATION policy | — | — | — | — | — | — | — | — | ● | — |

Notes
- **Institution coordinator** exists but grants nothing until authorised (brief §7).
- **Technical administrator** cannot approve, and cannot route approvals to themselves: activation requires every named approver to hold `VOLVO_APPROVER`.
- **Certificate approver** is held only by Ranjith T. P. No substitute approver may be added without a recorded change to requirement C-06.
- SRM users **do not** see partner-university personal data by default; participant visibility rules are D-11.
- Role assignments are re-read from the database on every request; nothing sent by the browser can grant authority.
